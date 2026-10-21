"""Authenticated blood-bank review and final donor approval endpoints."""
import logging
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.models.bank_review import BankReviewDecision
from app.services.bank_auth import require_bank_staff
from app.services.qr_service import generate_donation_token, generate_qr_image_base64
from app.services.whatsapp_service import send_text_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/banks", tags=["blood-bank review"])


def _id_or_400(value: str, label: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {label} ID")


async def _donor_summary(db, request_id: str, donor_id: str, distance_km=None):
    try:
        donor = await db.donors.find_one({"_id": ObjectId(donor_id)})
    except Exception:
        donor = None
    if not donor:
        return None
    invitation = await db.donor_invitations.find_one({"request_id": request_id, "donor_id": donor_id})
    return {
        "id": str(donor["_id"]),
        "name": donor.get("name", "Donor"),
        "phone": donor.get("phone"),
        "blood_type": donor.get("blood_type"),
        "city": donor.get("city"),
        "distance_km": distance_km,
        "preliminary_screening_status": invitation.get("status") if invitation else None,
    }


@router.get("/review-queue")
async def get_review_queue(bank=Depends(require_bank_staff)):
    """List requests awaiting blood-bank review and their active potential matches."""
    db = get_db()
    cursor = db.requests.find({"status": "ready_for_review"}).sort("ready_for_review_at", 1).limit(100)
    items = []
    async for request in cursor:
        request_id = str(request["_id"])
        entries_cursor = db.shortlist_entries.find({"request_id": request_id, "status": "active"}).sort("qualified_at", 1)
        donors = []
        async for entry in entries_cursor:
            donor = await _donor_summary(db, request_id, entry.get("donor_id", ""), entry.get("distance_km"))
            if donor:
                donors.append(donor)
        items.append({
            "request_id": request_id,
            "blood_type": request.get("blood_type"),
            "hospital_name": request.get("hospital_name"),
            "location_text": request.get("location_text"),
            "units": request.get("units", 1),
            "patient_age": request.get("patient_age"),
            "patient_gender": request.get("patient_gender"),
            "status": request.get("status"),
            "created_at": request.get("created_at"),
            "ready_for_review_at": request.get("ready_for_review_at"),
            "potential_donors": donors,
        })
    return {"bank_id": bank["bank_id"], "count": len(items), "requests": items,
            "note": "Potential matches only. Blood-bank staff must assess medical eligibility before donation."}


@router.post("/requests/{request_id}/decision")
async def decide_request(request_id: str, payload: BankReviewDecision, bank=Depends(require_bank_staff)):
    """Approve one shortlisted donor or reject the request, with an audit event."""
    db = get_db()
    request_oid = _id_or_400(request_id, "request")
    request = await db.requests.find_one({"_id": request_oid})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if request.get("status") != "ready_for_review":
        raise HTTPException(status_code=409, detail=f"Request is not awaiting review (current status: {request.get('status')})")

    now = datetime.utcnow()
    decision_note = (payload.note or "").strip() or None
    event = {
        "request_id": request_id,
        "actor_type": "blood_bank",
        "actor_id": bank["bank_id"],
        "actor_name": bank.get("bank_name"),
        "action": "approve_donor" if payload.decision == "approve" else "reject_request",
        "old_status": request.get("status"),
        "new_status": "approved_by_blood_bank" if payload.decision == "approve" else "rejected_by_blood_bank",
        "note": decision_note,
        "created_at": now,
    }

    if payload.decision == "approve":
        donor_id = payload.donor_id or ""
        try:
            donor_oid = ObjectId(donor_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid donor ID")
        entry = await db.shortlist_entries.find_one({"request_id": request_id, "donor_id": donor_id, "status": "active"})
        if not entry:
            raise HTTPException(status_code=404, detail="Donor is not an active potential match for this request")
        donor = await db.donors.find_one({"_id": donor_oid})
        if not donor:
            raise HTTPException(status_code=404, detail="Donor record not found")

        token = generate_donation_token(donor_id=donor_id, request_id=request_id, donor_name=donor.get("name", "Donor"))
        frontend_url = __import__("os").getenv("PUBLIC_FRONTEND_URL", "https://jeevansh.netlify.app/").rstrip("/")
        verify_url = f"{frontend_url}/verify/{token}"
        qr_base64 = generate_qr_image_base64(verify_url)
        accepted_donor = {
            "id": donor_id,
            "name": donor.get("name", "Donor"),
            "phone": donor.get("phone"),
            "blood_type": donor.get("blood_type"),
            "distance_km": entry.get("distance_km"),
            "accepted_at": now,
            "approved_at": now,
            "approved_by_bank": bank["bank_id"],
        }
        # Conditional update is the single-winner guard against concurrent bank decisions.
        updated = await db.requests.update_one(
            {"_id": request_oid, "status": "ready_for_review"},
            {"$set": {
                "status": "approved_by_blood_bank",
                "accepted_donor": accepted_donor,
                "shortlisted_donors": [accepted_donor],
                "approved_donor_id": donor_id,
                "approved_by_bank": bank["bank_id"],
                "approved_by_bank_name": bank.get("bank_name"),
                "approved_at": now,
                "approval_note": decision_note,
                "donation_token": token,
                "approval_verify_url": verify_url,
            }},
        )
        if not updated.modified_count:
            raise HTTPException(status_code=409, detail="Another reviewer already changed this request. Refresh the queue.")
        await db.shortlist_entries.update_many(
            {"request_id": request_id, "status": "active", "donor_id": {"$ne": donor_id}},
            {"$set": {"status": "not_selected", "reviewed_at": now, "reviewed_by_bank": bank["bank_id"]}},
        )
        await db.shortlist_entries.update_one(
            {"request_id": request_id, "donor_id": donor_id, "status": "active"},
            {"$set": {"status": "approved_by_blood_bank", "reviewed_at": now, "reviewed_by_bank": bank["bank_id"]}},
        )
        await db.donor_invitations.update_one(
            {"request_id": request_id, "donor_id": donor_id},
            {"$set": {"status": "approved_by_blood_bank", "reviewed_at": now, "reviewed_by_bank": bank["bank_id"]}},
        )
        event["donor_id"] = donor_id
        event["donor_name"] = donor.get("name")
        await db.request_events.insert_one(event)

        # Best-effort WhatsApp notice. It may fail if Meta's free-form service window has closed.
        notification = "not_sent"
        if donor.get("phone"):
            try:
                await send_text_message(
                    donor["phone"],
                    f"Jeevansh update: the blood bank has selected you as a potential donor for {request.get('hospital_name') or 'the listed hospital'}. Please contact/visit the blood bank for medical eligibility assessment. This message is not medical clearance or confirmation that donation has occurred.",
                )
                notification = "sent_or_simulated"
            except Exception:
                logger.exception("Unable to send bank approval notice for request %s", request_id)
                notification = "failed_or_service_window_closed"
        await db.request_events.update_one(
            {"request_id": request_id, "action": "approve_donor", "created_at": now},
            {"$set": {"donor_notification_status": notification}},
        )
        return {
            "success": True,
            "decision": "approve",
            "request_id": request_id,
            "status": "approved_by_blood_bank",
            "approved_donor": {"id": donor_id, "name": donor.get("name"), "blood_type": donor.get("blood_type")},
            "approved_by_bank": bank["bank_id"],
            "approved_at": now,
            "donation_verify_url": verify_url,
            "qr_image_base64": qr_base64,
            "donor_notification_status": notification,
            "note": "This is blood-bank selection approval, not medical clearance. Complete the normal clinical eligibility assessment before donation.",
        }

    updated = await db.requests.update_one(
        {"_id": request_oid, "status": "ready_for_review"},
        {"$set": {
            "status": "rejected_by_blood_bank",
            "rejected_by_bank": bank["bank_id"],
            "rejected_by_bank_name": bank.get("bank_name"),
            "rejected_at": now,
            "rejection_note": decision_note,
        }},
    )
    if not updated.modified_count:
        raise HTTPException(status_code=409, detail="Another reviewer already changed this request. Refresh the queue.")
    await db.shortlist_entries.update_many(
        {"request_id": request_id, "status": "active"},
        {"$set": {"status": "rejected_by_blood_bank", "reviewed_at": now, "reviewed_by_bank": bank["bank_id"]}},
    )
    await db.donor_invitations.update_many(
        {"request_id": request_id, "status": "needs_review"},
        {"$set": {"status": "rejected_by_blood_bank", "reviewed_at": now, "reviewed_by_bank": bank["bank_id"]}},
    )
    await db.request_events.insert_one(event)
    return {"success": True, "decision": "reject", "request_id": request_id,
            "status": "rejected_by_blood_bank", "rejected_by_bank": bank["bank_id"], "rejected_at": now}
