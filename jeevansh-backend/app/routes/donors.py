from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.donor import DonorRegister
from app.services.geo_search import find_nearby_donors
from app.services.acceptance_service import accept_request
from app.services.qr_service import generate_qr_image_base64
from app.services.whatsapp_service import normalize_whatsapp_number
from app.services.donor_auth import (
    create_donor_token,
    get_current_donor,
    hash_password,
    public_donor,
    verify_password,
)

router = APIRouter(prefix="/api/donors", tags=["donors"])


class DonorLogin(BaseModel):
    phone: str = Field(..., min_length=10, max_length=16)
    password: str = Field(..., min_length=8, max_length=128)


class DonorAvailabilityUpdate(BaseModel):
    is_available: bool


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_donor(payload: DonorRegister):
    db = get_db()
    try:
        phone_digits = normalize_whatsapp_number(payload.phone)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    existing = await db.donors.find_one({
        "$or": [
            {"phone": payload.phone},
            {"whatsapp_phone_digits": phone_digits},
        ]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A donor with this phone number already exists. Please log in instead.",
        )

    now = datetime.utcnow()
    donor_doc = {
        "name": payload.name.strip(),
        "phone": payload.phone,
        "whatsapp_phone_digits": phone_digits,
        "password_hash": hash_password(payload.password),
        "whatsapp_opt_in": payload.whatsapp_opt_in,
        "whatsapp_opt_in_at": now if payload.whatsapp_opt_in else None,
        "whatsapp_consent_version": "jeevansh-whatsapp-consent-v1" if payload.whatsapp_opt_in else None,
        "blood_type": payload.blood_type,
        "location": {
            "type": "Point",
            "coordinates": [payload.longitude, payload.latitude],
        },
        "city": payload.city.strip() if payload.city else None,
        "location_label": payload.location_label.strip() if payload.location_label else None,
        "age": payload.age,
        "weight": payload.weight,
        "gender": payload.gender,
        "is_available": True,
        "total_donations": 0,
        "last_donated_at": payload.last_donated_at,
        "created_at": now,
    }

    try:
        result = await db.donors.insert_one(donor_doc)
    except Exception as exc:
        # The unique phone index can reject simultaneous duplicate registrations.
        if exc.__class__.__name__ == "DuplicateKeyError":
            raise HTTPException(status_code=409, detail="A donor with this phone number already exists. Please log in instead.")
        raise

    return {
        "success": True,
        "donor_id": str(result.inserted_id),
        "message": f"Welcome, {payload.name}! " + (
            "You'll receive WhatsApp alerts for nearby requests."
            if payload.whatsapp_opt_in else "WhatsApp alerts are off until you opt in."
        ),
    }


@router.post("/login")
async def donor_login(payload: DonorLogin):
    db = get_db()
    try:
        phone_digits = normalize_whatsapp_number(payload.phone)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    donor = await db.donors.find_one({"whatsapp_phone_digits": phone_digits})
    if not donor:
        # Compatibility for older records created before phone normalization was stored.
        candidates = db.donors.find({"phone": {"$exists": True}})
        async for candidate in candidates:
            try:
                if normalize_whatsapp_number(candidate.get("phone", "")) == phone_digits:
                    donor = candidate
                    await db.donors.update_one(
                        {"_id": candidate["_id"]},
                        {"$set": {"whatsapp_phone_digits": phone_digits}},
                    )
                    break
            except ValueError:
                continue

    # Same message for unknown number and wrong password to avoid account enumeration.
    if not donor or not donor.get("password_hash") or not verify_password(payload.password, donor["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone number or password.")

    token = create_donor_token(str(donor["_id"]))
    return {"success": True, "token": token, "token_type": "bearer", "donor": public_donor(donor)}


@router.get("/me")
async def get_my_profile(donor: dict = Depends(get_current_donor)):
    return {"donor": public_donor(donor)}


@router.patch("/me/availability")
async def update_my_availability(payload: DonorAvailabilityUpdate, donor: dict = Depends(get_current_donor)):
    db = get_db()
    await db.donors.update_one({"_id": donor["_id"]}, {"$set": {"is_available": payload.is_available, "availability_updated_at": datetime.utcnow()}})
    updated = await db.donors.find_one({"_id": donor["_id"]})
    return {"success": True, "donor": public_donor(updated)}


@router.get("/count")
async def donor_count():
    db = get_db()
    return {"total_donors": await db.donors.count_documents({})}


@router.post("/search")
async def search_donors(blood_type: str, latitude: float, longitude: float, radius_km: float = 15):
    donors = await find_nearby_donors(blood_type, latitude, longitude, radius_km)
    return {"count": len(donors), "donors": donors}


@router.get("/me/pending-requests")
async def get_pending_requests(donor: dict = Depends(get_current_donor)):
    donor_id = str(donor["_id"])
    db = get_db()
    cursor = db.requests.find({
        "status": {"$in": ["searching", "matching", "outreach_active", "evaluating", "expanding"]},
        "matched_donor_ids": donor_id,
    }).sort("created_at", -1)
    requests = []
    async for doc in cursor:
        requests.append({
            "id": str(doc["_id"]),
            "blood_type": doc["blood_type"],
            "hospital_name": doc.get("hospital_name", "Unknown"),
            "units": doc.get("units", 1),
            "created_at": doc["created_at"],
        })
    return {"count": len(requests), "requests": requests}


@router.post("/me/accept/{request_id}")
async def donor_accepts_request(request_id: str, donor: dict = Depends(get_current_donor)):
    return await accept_request(str(donor["_id"]), request_id, channel="dashboard")


@router.get("/me/selected-requests")
async def get_selected_requests(donor: dict = Depends(get_current_donor)):
    """Return only this authenticated donor's shortlist entries and their own QR tokens."""
    db = get_db()
    donor_id = str(donor["_id"])
    cursor = db.requests.find({"shortlisted_donors.id": donor_id}).sort("shortlist_published_at", -1).limit(20)
    items = []
    async for req in cursor:
        candidate = next((item for item in req.get("shortlisted_donors", []) if item.get("id") == donor_id), None)
        if not candidate:
            continue
        token = candidate.get("token")
        verify_url = candidate.get("verify_url")
        items.append({
            "request_id": str(req["_id"]),
            "blood_type": req.get("blood_type"),
            "hospital_name": req.get("hospital_name") or req.get("location_text") or "Hospital details pending",
            "request_status": req.get("status"),
            "donor_status": candidate.get("status", "selected"),
            "distance_km": candidate.get("distance_km"),
            "selected_at": candidate.get("selected_at"),
            "identity_verified_at": candidate.get("identity_verified_at"),
            "medical_decision_at": candidate.get("medical_decision_at"),
            "medical_note": candidate.get("medical_note"),
            "token": token,
            "verify_url": verify_url,
            "qr_image_base64": generate_qr_image_base64(verify_url) if verify_url else None,
        })
    return {"count": len(items), "requests": items}


@router.get("/me/certificates")
async def get_donor_certificates(donor: dict = Depends(get_current_donor)):
    db = get_db()
    cursor = db.donations.find({"donor_id": str(donor["_id"])}).sort("verified_at", -1)
    certs = []
    async for doc in cursor:
        request_doc = None
        request_id = doc.get("request_id")
        if request_id:
            try:
                request_doc = await db.requests.find_one({"_id": ObjectId(request_id)})
            except Exception:
                request_doc = None
        certs.append({
            "id": str(doc["_id"]),
            "donor_name": doc.get("donor_name"),
            "blood_type": doc.get("blood_type"),
            "request_id": request_id,
            "verified_at": doc.get("verified_at") or doc.get("completed_at") or doc.get("created_at"),
            "hospital_name": (request_doc or {}).get("hospital_name") or (request_doc or {}).get("location_text"),
        })
    return {"count": len(certs), "certificates": certs}


@router.get("/me/certificates/{cert_id}")
async def get_single_certificate(cert_id: str, donor: dict = Depends(get_current_donor)):
    db = get_db()
    try:
        oid = ObjectId(cert_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid certificate ID")
    doc = await db.donations.find_one({"_id": oid, "donor_id": str(donor["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Certificate not found")
    request_doc = None
    request_id = doc.get("request_id")
    if request_id:
        try:
            request_doc = await db.requests.find_one({"_id": ObjectId(request_id)})
        except Exception:
            request_doc = None
    return {
        "id": str(doc["_id"]),
        "donor_name": doc.get("donor_name"),
        "blood_type": doc.get("blood_type"),
        "request_id": request_id,
        "verified_at": doc.get("verified_at") or doc.get("completed_at") or doc.get("created_at"),
        "hospital_name": (request_doc or {}).get("hospital_name") or (request_doc or {}).get("location_text"),
        "bank_id": doc.get("bank_id"),
    }
