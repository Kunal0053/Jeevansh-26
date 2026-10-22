from fastapi import APIRouter, HTTPException, status, Header
from datetime import datetime
from bson import ObjectId
import jwt as jose_jwt

from app.database import get_db
from app.models.donation import (
    BankLoginRequest, BankDecisionRequest,
    DonationVerifyRequest,
    DonationResponse,
)
from app.services.qr_service import verify_donation_token, generate_donation_token, generate_qr_image_base64
from app.config import JWT_SECRET, JWT_ALGORITHM, PUBLIC_FRONTEND_URL
from app.services.whatsapp_service import send_text_message
from datetime import timedelta

router = APIRouter(tags=["donations"])

BANK_CREDENTIALS = {
    "bank-1": {"password": "city123", "name": "City Hospital Blood Bank"},
    "bank-2": {"password": "redcross123", "name": "Red Cross Society"},
    "bank-3": {"password": "govt123", "name": "Govt Medical College Blood Bank"},
}

@router.post("/api/banks/login")
async def bank_login(payload: BankLoginRequest):
    bank = BANK_CREDENTIALS.get(payload.bank_id)
    if not bank or bank["password"] != payload.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bank ID or password")
    if not JWT_SECRET:
        raise HTTPException(status_code=503, detail="Bank login is unavailable until JWT_SECRET is configured")

    now = datetime.utcnow()
    token = jose_jwt.encode(
        {"sub": payload.bank_id, "type": "bank_access", "iat": now, "exp": now + timedelta(hours=8)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
    return {"success": True, "token": token, "bank": {"id": payload.bank_id, "name": bank["name"]}}


def _bank_from_authorization(authorization: str | None) -> dict:
    if not JWT_SECRET:
        raise HTTPException(status_code=503, detail="Bank authentication is not configured")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bank access token required")
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = jose_jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired bank access token")
    bank_id = claims.get("sub")
    if claims.get("type") != "bank_access" or bank_id not in BANK_CREDENTIALS:
        raise HTTPException(status_code=403, detail="Bank access required")
    return {"id": bank_id, "name": BANK_CREDENTIALS[bank_id]["name"]}


@router.get("/api/banks/review-queue")
async def bank_review_queue(authorization: str | None = Header(default=None)):
    bank = _bank_from_authorization(authorization)
    db = get_db()
    cursor = db.requests.find({"status": {"$in": ["ready_for_review", "donors_shortlisted", "medical_screening", "confirmed"]}}).sort("ready_for_review_at", 1).limit(100)
    items = []
    async for req in cursor:
        candidates = []
        for candidate in req.get("shortlisted_donors", []):
            candidates.append({
                "id": candidate.get("id"),
                "name": candidate.get("name", "Potential donor"),
                "blood_type": candidate.get("blood_type"),
                "distance_km": candidate.get("distance_km"),
                "status": candidate.get("status", "selected"),
            })
        items.append({
            "id": str(req["_id"]), "blood_type": req.get("blood_type"),
            "hospital_name": req.get("hospital_name"), "location_text": req.get("location_text"),
            "units": req.get("units", 1), "created_at": req.get("created_at"),
            "shortlist_count": len(candidates), "candidates": candidates, "status": req.get("status"),
        })
    return {"bank_id": bank["id"], "count": len(items), "requests": items}


@router.post("/api/banks/requests/{request_id}/decision")
async def bank_request_decision(request_id: str, payload: BankDecisionRequest, authorization: str | None = Header(default=None)):
    bank = _bank_from_authorization(authorization)
    db = get_db()
    try:
        request_oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID")
    req = await db.requests.find_one({"_id": request_oid})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.get("status") != "ready_for_review":
        raise HTTPException(status_code=409, detail=f"Request is not awaiting review (current status: {req.get('status')})")

    now = datetime.utcnow()
    if payload.decision == "reject":
        result = await db.requests.update_one(
            {"_id": request_oid, "status": "ready_for_review"},
            {"$set": {"status": "rejected_by_blood_bank", "bank_review": {"bank_id": bank["id"], "decision": "reject", "note": payload.note, "decided_at": now}}},
        )
        if not result.modified_count:
            raise HTTPException(status_code=409, detail="Request was already reviewed")
        return {"success": True, "decision": "reject", "status": "rejected_by_blood_bank"}

    if not payload.donor_id:
        raise HTTPException(status_code=422, detail="donor_id is required to approve a candidate")
    candidate = next((item for item in req.get("shortlisted_donors", []) if item.get("id") == payload.donor_id), None)
    if not candidate:
        raise HTTPException(status_code=400, detail="Selected donor is not in this request's shortlist")
    try:
        donor_oid = ObjectId(payload.donor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid donor ID")
    donor = await db.donors.find_one({"_id": donor_oid})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")

    token = generate_donation_token(str(donor["_id"]), request_id, donor.get("name", "Donor"))
    verify_url = f"{PUBLIC_FRONTEND_URL}/verify/{token}"
    accepted_donor = {"id": str(donor["_id"]), "name": donor.get("name", "Donor"), "phone": donor.get("phone"), "blood_type": donor.get("blood_type"), "accepted_at": now, "channel": "whatsapp_screening", "approved_by_bank": bank["id"]}
    result = await db.requests.update_one(
        {"_id": request_oid, "status": "ready_for_review"},
        {"$set": {"status": "approved_by_blood_bank", "accepted_donor": accepted_donor, "donation_token": token, "bank_review": {"bank_id": bank["id"], "decision": "approve", "note": payload.note, "decided_at": now}}},
    )
    if not result.modified_count:
        raise HTTPException(status_code=409, detail="Request was already reviewed")
    return {"success": True, "decision": "approve", "status": "approved_by_blood_bank", "donor": {"name": accepted_donor["name"], "phone": accepted_donor["phone"], "blood_type": accepted_donor["blood_type"]}, "donation_verify_url": verify_url, "qr_image_base64": generate_qr_image_base64(verify_url)}
@router.get("/donations/public-qr/{token}")
async def get_public_donation_qr(token: str):
    payload = verify_donation_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired donation token"
        )

    donor_id = payload.get("donor_id")
    request_id = payload.get("request_id")

    try:
        donor_oid = ObjectId(donor_id)
        request_oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token data")

    db = get_db()
    donor = await db.donors.find_one({"_id": donor_oid})
    request = await db.requests.find_one({"_id": request_oid})

    if not donor or not request:
        raise HTTPException(status_code=404, detail="Donor or request not found")

    if request.get("status") in {
        "completed", "cancelled", "expired", "rejected",
        "rejected_by_blood_bank"
    }:
        raise HTTPException(status_code=400, detail="Donation request is no longer active")

    return {
        "success": True,
        "donor_name": donor.get("name", "Donor"),
        "qr_image_base64": generate_qr_image_base64(
            f"{PUBLIC_FRONTEND_URL.rstrip('/')}/verify/{token}"
        ),
        "message": "Show this QR to authorized blood-bank staff."
    }

@router.post("/api/donations/verify", response_model=DonationResponse)
async def verify_donation(payload: DonationVerifyRequest, authorization: str | None = Header(default=None)):
    """Verify the identity of a selected donor; this is NOT donation completion."""
    bank = _bank_from_authorization(authorization)
    if payload.bank_id and payload.bank_id != bank["id"]:
        raise HTTPException(status_code=403, detail="You can only verify donors for your signed-in bank")
    db = get_db()
    try:
        decoded = verify_donation_token(payload.token)
    except jose_jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="QR code has expired")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or malformed QR code")

    donor_id = decoded.get("donor_id")
    request_id = decoded.get("request_id")
    try:
        donor_oid, request_oid = ObjectId(donor_id), ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="QR token contains invalid IDs")

    blood_request = await db.requests.find_one({"_id": request_oid})
    donor = await db.donors.find_one({"_id": donor_oid})
    if not blood_request or not donor:
        raise HTTPException(status_code=404, detail="Request or donor not found")

    candidate = next((item for item in blood_request.get("shortlisted_donors", []) if item.get("id") == donor_id), None)
    if not candidate or candidate.get("token") != payload.token:
        raise HTTPException(status_code=403, detail="This donor is not selected for this request, or the token is not the current token")
    if blood_request.get("status") in {"completed", "cancelled", "expired", "rejected", "rejected_by_blood_bank"}:
        raise HTTPException(status_code=409, detail=f"This request is no longer active (status: {blood_request.get('status')})")

    now = datetime.utcnow()
    # Only the matching selected donor entry is changed; the request stays open for medical screening.
    updated = await db.requests.update_one(
        {"_id": request_oid, "shortlisted_donors": {"$elemMatch": {"id": donor_id, "token": payload.token}}},
        {"$set": {
            "shortlisted_donors.$.status": "identity_verified",
            "shortlisted_donors.$.identity_verified_at": now,
            "shortlisted_donors.$.verified_by_bank": bank["id"],
            "status": "medical_screening",
            "medical_screening_started_at": blood_request.get("medical_screening_started_at") or now,
        }},
    )
    if not updated.modified_count and candidate.get("status") != "identity_verified":
        raise HTTPException(status_code=409, detail="Could not record identity verification. Refresh and try again.")
    await db.shortlist_entries.update_one(
        {"request_id": request_id, "donor_id": donor_id},
        {"$set": {"status": "identity_verified", "identity_verified_at": now, "verified_by_bank": bank["id"]}},
    )
    await db.donor_invitations.update_one(
        {"request_id": request_id, "donor_id": donor_id},
        {"$set": {"status": "identity_verified", "identity_verified_at": now, "verified_by_bank": bank["id"]}},
    )
    return DonationResponse(
        success=True,
        message=f"Identity verified for {donor['name']}. Request remains open for medical screening; this is not a completed donation.",
        donor_name=donor.get("name"),
        blood_type=donor.get("blood_type"),
        request_id=request_id,
        verified_at=now,
        donor_id=donor_id,
        stage="identity_verified",
    )


@router.post("/api/donations/medical-decision")
async def medical_decision(payload: BankDecisionRequest, authorization: str | None = Header(default=None)):
    """Record the blood bank's screening decision after identity verification and clinical assessment."""
    bank = _bank_from_authorization(authorization)
    if not payload.donor_id:
        raise HTTPException(status_code=422, detail="donor_id is required")
    db = get_db()
    request_id = getattr(payload, "request_id", None)
    if not request_id:
        raise HTTPException(status_code=422, detail="request_id is required")
    try:
        request_oid = ObjectId(request_id)
        donor_oid = ObjectId(payload.donor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request or donor ID")
    req = await db.requests.find_one({"_id": request_oid})
    donor = await db.donors.find_one({"_id": donor_oid})
    if not req or not donor:
        raise HTTPException(status_code=404, detail="Request or donor not found")
    candidate = next((item for item in req.get("shortlisted_donors", []) if item.get("id") == payload.donor_id), None)
    if not candidate:
        raise HTTPException(status_code=404, detail="Donor is not selected for this request")
    if candidate.get("status") != "identity_verified":
        raise HTTPException(status_code=409, detail="Verify the donor's identity before recording a medical decision")

    now = datetime.utcnow()
    final_status = "confirmed" if payload.decision == "approve" else "rejected"
    result = await db.requests.update_one(
        {"_id": request_oid, "shortlisted_donors": {"$elemMatch": {"id": payload.donor_id, "status": "identity_verified"}}},
        {"$set": {
            "shortlisted_donors.$.status": final_status,
            "shortlisted_donors.$.medical_decision_at": now,
            "shortlisted_donors.$.medical_decision_by_bank": bank["id"],
            "shortlisted_donors.$.medical_note": payload.note,
        }},
    )
    if not result.modified_count:
        raise HTTPException(status_code=409, detail="Medical decision already recorded or donor status changed")
    latest_request = await db.requests.find_one({"_id": request_oid})
    donor_stages = [item.get("status", "selected") for item in latest_request.get("shortlisted_donors", [])]
    pending_stages = {"selected", "identity_verified"}
    if any(stage in pending_stages for stage in donor_stages):
        request_stage = "medical_screening"
    elif any(stage == "confirmed" for stage in donor_stages):
        request_stage = "confirmed"
    else:
        request_stage = "rejected"
    await db.requests.update_one(
        {"_id": request_oid, "status": {"$nin": ["completed", "cancelled", "expired"]}},
        {"$set": {"status": request_stage, "medical_decision_at": now}},
    )
    await db.shortlist_entries.update_one(
        {"request_id": request_id, "donor_id": payload.donor_id},
        {"$set": {"status": final_status, "medical_decision_at": now, "medical_decision_by_bank": bank["id"], "medical_note": payload.note}},
    )
    await db.donor_invitations.update_one(
        {"request_id": request_id, "donor_id": payload.donor_id},
        {"$set": {"status": final_status, "medical_decision_at": now, "medical_decision_by_bank": bank["id"]}},
    )
    try:
        decision_text = "CONFIRMED" if final_status == "confirmed" else "REJECTED"
        await send_text_message(
            donor.get("phone", ""),
            f"Jeevansh update: the blood bank has marked your medical screening for request {request_id} as {decision_text}. Please follow the blood bank staff's instructions. This status is not a record that blood collection has been completed."
        )
    except Exception:
        # The medical decision is saved even if WhatsApp notification delivery fails.
        import logging
        logging.getLogger(__name__).exception("Unable to notify donor about medical decision")
    return {"success": True, "request_id": request_id, "donor_id": payload.donor_id, "status": final_status, "message": "Medical screening result recorded. Identity verification alone does not complete a donation."}

@router.get("/api/donations/history")
async def donation_history(bank_id: str = None, limit: int = 50):
    db = get_db()
    query = {}
    if bank_id:
        query["bank_id"] = bank_id

    cursor = db.donations.find(query).sort("verified_at", -1).limit(limit)
    donations = []
    async for doc in cursor:
        donations.append({
            "id": str(doc["_id"]),
            "donor_name": doc.get("donor_name"),
            "blood_type": doc.get("blood_type"),
            "bank_id": doc.get("bank_id"),
            "verified_at": doc.get("verified_at"),
        })
    return {"count": len(donations), "donations": donations}

@router.post("/api/donations/complete")
async def complete_donation(payload: BankDecisionRequest, authorization: str | None = Header(default=None)):
    """Record actual blood collection after medical screening is confirmed."""
    bank = _bank_from_authorization(authorization)
    request_id = getattr(payload, "request_id", None)
    donor_id = payload.donor_id
    if not request_id or not donor_id:
        raise HTTPException(status_code=422, detail="request_id and donor_id are required")
    try:
        request_oid, donor_oid = ObjectId(request_id), ObjectId(donor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request or donor ID")
    db = get_db()
    req = await db.requests.find_one({"_id": request_oid})
    donor = await db.donors.find_one({"_id": donor_oid})
    if not req or not donor:
        raise HTTPException(status_code=404, detail="Request or donor not found")
    candidate = next((item for item in req.get("shortlisted_donors", []) if item.get("id") == donor_id), None)
    if not candidate or candidate.get("status") != "confirmed":
        raise HTTPException(status_code=409, detail="Medical screening must be confirmed before completing a donation")
    if req.get("status") == "completed":
        raise HTTPException(status_code=409, detail="This request has already been completed")
    now = datetime.utcnow()
    updated = await db.requests.update_one(
        {"_id": request_oid, "status": "confirmed", "shortlisted_donors": {"$elemMatch": {"id": donor_id, "status": "confirmed"}}},
        {"$set": {"status": "completed", "completed_at": now, "completed_by_bank": bank["id"], "completed_donor_id": donor_id, "shortlisted_donors.$.donation_completed_at": now, "shortlisted_donors.$.status": "completed"}},
    )
    if not updated.modified_count:
        raise HTTPException(status_code=409, detail="Request status changed or donation was already completed. Refresh and try again.")
    await db.donors.update_one({"_id": donor_oid}, {"$inc": {"total_donations": 1}, "$set": {"last_donated_at": now}})
    await db.donations.insert_one({"request_id": request_id, "donor_id": donor_id, "donor_name": donor.get("name", "Donor"), "blood_type": donor.get("blood_type"), "bank_id": bank["id"], "completed_at": now, "recorded_by": bank["id"]})
    return {"success": True, "request_id": request_id, "donor_id": donor_id, "status": "completed", "completed_at": now, "message": "Donation completion recorded successfully."}
