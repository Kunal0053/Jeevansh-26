from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.database import get_db
from app.models.request import BloodRequestCreate
from app.services.workflow_service import start_progressive_search

router = APIRouter(prefix="/api/requests", tags=["requests"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_request(payload: BloodRequestCreate):
    """Create a request and start the persistent progressive-geofencing workflow."""
    db = get_db()
    client_key = payload.client_request_id

    # If the same form submission is retried (including React StrictMode's
    # development Effect replay), return the original request instead of
    # creating another MongoDB document or starting another donor workflow.
    if client_key:
        existing = await db.requests.find_one({"client_request_id": client_key})
        if existing:
            return _request_response(existing)

    now = datetime.utcnow()
    request_doc = {
        "blood_type": payload.blood_type,
        "location": {"type": "Point", "coordinates": [payload.longitude, payload.latitude]},
        "location_text": payload.location_text,
        "patient_age": payload.patient_age,
        "patient_gender": payload.patient_gender,
        "units": payload.units,
        "hospital_name": payload.hospital_name,
        "status": "searching",
        "alerted_donors": 0,
        "matched_donor_ids": [],
        "accepted_donor": None,
        "shortlisted_donors": [],
        "created_at": now,
    }
    if client_key:
        request_doc["client_request_id"] = client_key
    try:
        result = await db.requests.insert_one(request_doc)
    except DuplicateKeyError:
        # Another concurrent POST with this same key won the insert race.
        existing = await db.requests.find_one({"client_request_id": client_key}) if client_key else None
        if existing:
            return _request_response(existing)
        raise HTTPException(status_code=409, detail="Duplicate request submission. Please retry.")

    request_id = str(result.inserted_id)
    try:
        await start_progressive_search(request_id)
    except Exception:
        # Request remains persisted. The workflow worker/operator can recover it.
        await db.requests.update_one({"_id": result.inserted_id}, {"$set": {"workflow_start_error_at": datetime.utcnow()}})
        raise HTTPException(status_code=503, detail="Request was saved, but donor matching could not start. Please retry status check or contact support.")

    latest = await db.requests.find_one({"_id": result.inserted_id})
    return _request_response(latest)


def _request_response(request_doc: dict) -> dict:
    workflow = request_doc.get("workflow", {})
    return {
        "id": str(request_doc["_id"]),
        "blood_type": request_doc["blood_type"],
        "status": request_doc.get("status", "searching"),
        "alerted_donors": request_doc.get("alerted_donors", 0),
        "matched_donors": [],
        "created_at": request_doc.get("created_at"),
        "accepted_donor": request_doc.get("accepted_donor"),
        "target_shortlist_size": workflow.get("target_shortlist_size", 3),
        "current_radius_km": workflow.get("current_radius_km", 0),
    }


@router.get("/{request_id}/status")
async def get_request_status(request_id: str):
    db = get_db()
    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID")
    request_doc = await db.requests.find_one({"_id": oid})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")
    workflow = request_doc.get("workflow", {})
    shortlist = request_doc.get("shortlisted_donors", [])
    return {
        "id": str(request_doc["_id"]),
        "blood_type": request_doc["blood_type"],
        "status": request_doc["status"],
        "alerted_donors": request_doc.get("alerted_donors", 0),
        "accepted_donor": request_doc.get("accepted_donor"),
        "shortlist_count": len(shortlist),
        # Public status endpoint intentionally omits donor phone numbers until
        # a blood-bank-approved handoff is implemented.
        "shortlisted_donors": [
            {"id": item.get("id"), "name": item.get("name", "Potential donor"), "blood_type": item.get("blood_type"), "distance_km": item.get("distance_km"), "status": item.get("status", "selected")}
            for item in shortlist
        ],
        "target_shortlist_size": workflow.get("target_shortlist_size", 3),
        "current_radius_km": workflow.get("current_radius_km", 0),
        "created_at": request_doc["created_at"],
    }


@router.get("/{request_id}/donor-info")
async def get_donor_info_for_patient(request_id: str):
    """Return donor contact details only for donors available in the shortlist."""
    db = get_db()
    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID")
    request_doc = await db.requests.find_one({"_id": oid})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")

    # Legacy single-donor response remains for older frontend consumers.
    accepted = request_doc.get("accepted_donor")
    if accepted:
        return {"status": request_doc["status"], "donor": {"name": accepted["name"], "phone": accepted["phone"], "blood_type": accepted["blood_type"]}}

    shortlist = request_doc.get("shortlisted_donors", [])
    return {
        "status": request_doc["status"],
        "donor": shortlist[0] if shortlist else None,
        "donors": shortlist,
        "note": "Potential matches only. Final eligibility and donation must be confirmed by the blood bank.",
    }
