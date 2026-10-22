"""Persistent progressive-geofencing workflow for Jeevansh.

A lightweight poller uses MongoDB as durable state. Each state transition is
written before external API calls; notification outbox records are retried.
For multi-instance production deployments, use a queue/lease implementation
such as Redis + Celery/ARQ and retain the same idempotency constraints.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import ReturnDocument

from app.config import (
    TARGET_SHORTLIST_SIZE, RESPONSE_WINDOW_SECONDS, SCREENING_WINDOW_SECONDS,
    RADIUS_BANDS_KM, WHATSAPP_ENABLED, WORKER_POLL_SECONDS, PUBLIC_FRONTEND_URL,
)
from app.database import get_db
from app.services.geo_search import find_nearby_donors
from app.services.whatsapp_service import send_donor_alert, send_text_message, send_yes_no_question, normalize_whatsapp_number
from app.services.qr_service import generate_donation_token, generate_qr_image_base64

logger = logging.getLogger(__name__)

# The product requirement is to shortlist at most the three nearest qualified donors.
MAX_SHORTLIST_SIZE = 3

SCREENING_QUESTIONS = [
    "Can you currently travel to the hospital listed in the request? Reply YES or NO.",
    "Is your donor availability information still accurate, and are you willing to be assessed by the blood bank? Reply YES or NO.",
]


def _phone_digits(phone: str) -> str:
    try:
        return normalize_whatsapp_number(phone)
    except ValueError:
        return ""


async def initialize_workflow_indexes():
    db = get_db()
    # A client-generated key protects request creation from duplicate POSTs.
    await db.requests.create_index("client_request_id", unique=True, sparse=True)
    await db.donor_invitations.create_index([("request_id", 1), ("donor_id", 1)], unique=True)
    await db.request_batches.create_index([("request_id", 1), ("batch_index", 1)], unique=True)
    await db.notification_outbox.create_index("event_key", unique=True)
    await db.webhook_events.create_index("event_id", unique=True, sparse=True)
    await db.screening_sessions.create_index([("request_id", 1), ("donor_id", 1)], unique=True)
    await db.shortlist_entries.create_index([("request_id", 1), ("donor_id", 1)], unique=True)
    await db.donors.create_index("whatsapp_phone_digits")


async def start_progressive_search(request_id: str):
    db = get_db()
    request = await db.requests.find_one({"_id": ObjectId(request_id)})
    if not request:
        return
    await db.requests.update_one(
        {"_id": ObjectId(request_id), "status": {"$in": ["searching", "matching"]}},
        {"$set": {
            "status": "matching",
            "workflow": {
                "target_shortlist_size": MAX_SHORTLIST_SIZE,
                "current_batch_index": -1,
                "radius_bands_km": RADIUS_BANDS_KM,
                "next_action_at": datetime.utcnow(),
                "started_at": datetime.utcnow(),
            },
        }},
    )
    await dispatch_next_batch(request_id)


async def _qualified_donors(request_id: str) -> list[dict]:
    db = get_db()
    cursor = db.shortlist_entries.find({"request_id": request_id, "status": "active"}).sort("qualified_at", 1)
    result = []
    async for entry in cursor:
        donor = await db.donors.find_one({"_id": ObjectId(entry["donor_id"])})
        if donor and donor.get("is_available", True):
            result.append({
                "id": entry["donor_id"], "name": donor.get("name", "Donor"),
                "phone": donor.get("phone"), "blood_type": donor.get("blood_type"),
                "distance_km": entry.get("distance_km"),
            })
    # The requester/blood bank should see the three nearest qualified donors,
    # not simply the first three donors who replied. Distance is measured from
    # the request's stored coordinates, which represent the requester's GPS location.
    result.sort(key=lambda item: (item.get("distance_km") is None, item.get("distance_km") if item.get("distance_km") is not None else float("inf")))
    return result


async def _publish_shortlist(request_id: str, qualified: list[dict], limit: int = MAX_SHORTLIST_SIZE) -> bool:
    """Select up to three nearest eligible donors and notify each one."""
    db = get_db()
    request_oid = ObjectId(request_id)
    request = await db.requests.find_one({"_id": request_oid})
    if not request:
        return False
    now = datetime.utcnow()
    chosen = []
    for candidate in qualified[:max(0, min(int(limit), MAX_SHORTLIST_SIZE))]:
        donor_id = candidate.get("id")
        if not donor_id:
            continue
        try:
            donor_oid = ObjectId(donor_id)
        except Exception:
            continue
        donor = await db.donors.find_one({"_id": donor_oid})
        if not donor:
            continue
        token = generate_donation_token(donor_id, request_id, donor.get("name", "Donor"))
        verify_url = f"{PUBLIC_FRONTEND_URL.rstrip('/')}/verify/{token}"
        chosen.append({
            "id": donor_id,
            "name": donor.get("name", "Donor"),
            "phone": donor.get("phone"),
            "blood_type": donor.get("blood_type"),
            "distance_km": candidate.get("distance_km"),
            "status": "selected",
            "token": token,
            "verify_url": verify_url,
            "selected_at": now,
        })

    if not chosen:
        return False
    result = await db.requests.update_one(
        {"_id": request_oid, "status": {"$nin": ["cancelled", "completed", "fulfilled", "expired", "ready_for_review", "donors_shortlisted", "medical_screening", "confirmed"]}},
        {"$set": {"status": "donors_shortlisted", "shortlisted_donors": chosen, "ready_for_review_at": now, "shortlist_published_at": now}},
    )
    if not result.modified_count:
        return False

    for item in chosen:
        await db.shortlist_entries.update_one(
            {"request_id": request_id, "donor_id": item["id"]},
            {"$set": {"status": "selected", "selected_at": now, "token": item["token"], "verify_url": item["verify_url"]}},
        )
        await db.donor_invitations.update_one(
            {"request_id": request_id, "donor_id": item["id"]},
            {"$set": {"status": "selected", "selected_at": now, "token": item["token"]}},
        )
        if not item.get("phone"):
            continue
        message = (
            f"Congratulations {item['name']}! You have been selected as one of the closest eligible preliminary matches for a blood request at "
            f"{request.get('hospital_name') or request.get('location_text') or 'the listed hospital'}. "
            f"Please visit the hospital/blood bank and show this QR/token to authorized staff for identity verification. "
            f"Your verification link/token: {item['verify_url']} . "
            "After identity verification, staff will conduct fitness assessment and required blood tests, then mark your medical screening Confirmed or Rejected. "
            "Identity verification is not medical clearance and does not mean a donation has been completed. Please follow the blood bank's instructions."
        )
        try:
            response = await send_text_message(item["phone"], message)
            await db.shortlist_entries.update_one(
                {"request_id": request_id, "donor_id": item["id"]},
                {"$set": {"selection_notice_status": "sent" if not response.get("simulated") else "simulated", "selection_notice_sent_at": datetime.utcnow()}},
            )
        except Exception as exc:
            logger.exception("Unable to send shortlist confirmation to donor %s", item["id"])
            await db.shortlist_entries.update_one(
                {"request_id": request_id, "donor_id": item["id"]},
                {"$set": {"selection_notice_status": "failed", "selection_notice_error": str(exc)[:300]}},
            )

    await db.notification_outbox.update_many(
        {"request_id": request_id, "status": {"$in": ["pending", "retry"]}},
        {"$set": {"status": "cancelled", "updated_at": now}},
    )
    return True


async def _set_ready_if_target_met(request_id: str) -> bool:
    db = get_db()
    request_oid = ObjectId(request_id)
    request = await db.requests.find_one({"_id": request_oid})
    if not request:
        return False

    # Wait until the active radius batch's response window closes before
    # publishing. This gives nearer invitees a chance to answer, so the final
    # shortlist is based on distance from the requester's coordinates rather
    # than simply the first three donors who happened to respond.
    workflow = request.get("workflow", {})
    next_action_at = workflow.get("next_action_at")
    if request.get("status") == "outreach_active" and next_action_at and next_action_at > datetime.utcnow():
        return False

    qualified = await _qualified_donors(request_id)
    target = MAX_SHORTLIST_SIZE
    if len(qualified) < target:
        return False
    return await _publish_shortlist(request_id, qualified, limit=target)


async def dispatch_next_batch(request_id: str):
    db = get_db()
    request_oid = ObjectId(request_id)
    request = await db.requests.find_one({"_id": request_oid})
    if not request or request.get("status") in {"cancelled", "completed", "fulfilled", "expired"}:
        return
    if await _set_ready_if_target_met(request_id):
        return

    workflow = request.get("workflow", {})
    next_index = int(workflow.get("current_batch_index", -1)) + 1
    if next_index >= len(RADIUS_BANDS_KM):
        # If fewer than three eligible donors exist after all search bands,
        # still let the blood bank review the one or two available candidates.
        qualified = await _qualified_donors(request_id)
        if qualified:
            await _publish_shortlist(request_id, qualified, limit=MAX_SHORTLIST_SIZE)
        else:
            await db.requests.update_one(
                {"_id": request_oid, "status": {"$nin": ["cancelled", "completed", "fulfilled", "expired", "ready_for_review"]}},
                {"$set": {"status": "escalated", "workflow.next_action_at": None, "workflow.escalated_at": datetime.utcnow()}},
            )
        return

    outer = RADIUS_BANDS_KM[next_index]
    inner = RADIUS_BANDS_KM[next_index - 1] if next_index else 0.0
    already = []
    cursor = db.donor_invitations.find({"request_id": request_id}, {"donor_id": 1})
    async for inv in cursor:
        already.append(inv["donor_id"])

    coords = request.get("location", {}).get("coordinates", [None, None])
    if coords[0] is None or coords[1] is None:
        await db.requests.update_one({"_id": request_oid}, {"$set": {"status": "escalated", "workflow.error": "missing_request_location"}})
        return

    donors = await find_nearby_donors(
        patient_blood_type=request["blood_type"], latitude=coords[1], longitude=coords[0],
        radius_km=outer, inner_radius_km=inner, limit=50, exclude_donor_ids=already,
        require_whatsapp_opt_in=True,
    )
    now = datetime.utcnow()
    deadline = now + timedelta(seconds=RESPONSE_WINDOW_SECONDS)
    batch = {
        "request_id": request_id, "batch_index": next_index,
        "inner_radius_km": inner, "outer_radius_km": outer,
        "status": "active" if donors else "empty",
        "created_at": now, "deadline_at": deadline if donors else now,
        "notified_count": len(donors),
    }
    try:
        await db.request_batches.insert_one(batch)
    except Exception:
        # Unique request_id+batch_index means another worker already made it.
        return

    await db.requests.update_one(
        {"_id": request_oid, "status": {"$nin": ["cancelled", "completed", "fulfilled", "expired", "ready_for_review"]}},
        {
            "$set": {
                "status": "outreach_active" if donors else "evaluating",
                "workflow.current_batch_index": next_index,
                "workflow.next_action_at": deadline if donors else now,
                "workflow.current_radius_km": outer,
                "alerted_donors": int(request.get("alerted_donors", 0)) + len(donors),
            },
            "$addToSet": {"matched_donor_ids": {"$each": [d["id"] for d in donors]}},
        },
    )

    for donor in donors:
        invitation = {
            "request_id": request_id, "batch_index": next_index,
            "donor_id": donor["id"], "donor_phone": donor["phone"],
            "status": "queued", "distance_km": donor["distance_km"],
            "created_at": now, "updated_at": now,
        }
        try:
            await db.donor_invitations.insert_one(invitation)
        except Exception:
            continue
        event_key = f"donor-alert:{request_id}:{donor['id']}"
        await db.notification_outbox.update_one(
            {"event_key": event_key},
            {"$setOnInsert": {
                "event_key": event_key, "request_id": request_id, "donor_id": donor["id"],
                "type": "donor_alert", "status": "pending", "attempt_count": 0,
                "next_attempt_at": now, "created_at": now,
            }},
            upsert=True,
        )

    # Empty bands advance immediately. Worker loop caps advancement per tick.
    if not donors:
        await db.requests.update_one({"_id": request_oid}, {"$set": {"workflow.next_action_at": now}})


async def _send_outbox_item(item: dict):
    db = get_db()
    now = datetime.utcnow()
    claimed = await db.notification_outbox.find_one_and_update(
        {"_id": item["_id"], "status": {"$in": ["pending", "retry"]}, "next_attempt_at": {"$lte": now}},
        {"$set": {"status": "sending", "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if not claimed:
        return
    donor = await db.donors.find_one({"_id": ObjectId(claimed["donor_id"])})
    request = await db.requests.find_one({"_id": ObjectId(claimed["request_id"])})
    if not donor or not request or request.get("status") in {"cancelled", "completed", "fulfilled", "expired", "ready_for_review", "donors_shortlisted", "medical_screening", "confirmed", "rejected"}:
        await db.notification_outbox.update_one({"_id": claimed["_id"]}, {"$set": {"status": "cancelled", "updated_at": now}})
        return
    consent = donor.get("whatsapp_opt_in", False)
    if not consent:
        await db.donor_invitations.update_one({"request_id": claimed["request_id"], "donor_id": claimed["donor_id"]}, {"$set": {"status": "skipped_no_consent", "updated_at": now}})
        await db.notification_outbox.update_one({"_id": claimed["_id"]}, {"$set": {"status": "skipped_no_consent", "updated_at": now}})
        return
    coords = request.get("location", {}).get("coordinates", [None, None])
    try:
        from app.services.geo_search import _haversine_km
        distance = _haversine_km(coords[1], coords[0], donor["location"]["coordinates"][1], donor["location"]["coordinates"][0])
        response = await send_donor_alert(
            donor_phone=donor["phone"], blood_type=request["blood_type"],
            hospital=request.get("hospital_name") or request.get("location_text"),
            distance=distance, request_id=claimed["request_id"],
        )
        msg_id = (response.get("messages") or [{}])[0].get("id")
        await db.notification_outbox.update_one({"_id": claimed["_id"]}, {"$set": {"status": "sent" if not response.get("simulated") else "simulated", "provider_message_id": msg_id, "sent_at": now, "updated_at": now}})
        await db.donor_invitations.update_one({"request_id": claimed["request_id"], "donor_id": claimed["donor_id"]}, {"$set": {"status": "sent", "provider_message_id": msg_id, "sent_at": now, "updated_at": now}})
    except Exception as exc:
        attempts = int(claimed.get("attempt_count", 0)) + 1
        if attempts >= 5:
            status = "failed"
            next_at = now
        else:
            status = "retry"
            next_at = now + timedelta(seconds=min(300, 2 ** attempts * 5))
        logger.exception("Unable to send WhatsApp donor alert")
        await db.notification_outbox.update_one({"_id": claimed["_id"]}, {"$set": {"status": status, "last_error": str(exc)[:500], "attempt_count": attempts, "next_attempt_at": next_at, "updated_at": now}})
        await db.donor_invitations.update_one({"request_id": claimed["request_id"], "donor_id": claimed["donor_id"]}, {"$set": {"status": "send_failed" if status == "failed" else "queued", "updated_at": now}})


async def _send_next_screening_question(phone: str, question: str):
    if WHATSAPP_ENABLED:
        await send_text_message(phone, question)
    else:
        logger.info("[SIMULATED WHATSAPP SCREENING] To=%s question=%s", phone, question)


async def _send_screening_prompt(phone: str, question: str, request_id: str, step: int):
    if WHATSAPP_ENABLED:
        await send_yes_no_question(phone, question, request_id, step)
    else:
        logger.info("[SIMULATED WHATSAPP SCREENING] To=%s request=%s step=%s question=%s [YES/NO buttons]", phone, request_id, step, question)


async def handle_donor_action(phone: str, action: str, request_id: str):
    db = get_db()
    phone_digits = _phone_digits(phone)
    donor = await db.donors.find_one({"whatsapp_phone_digits": phone_digits})
    if not donor:
        # Compatibility with existing registrations whose phone field was not normalized.
        async for candidate in db.donors.find({"phone": {"$exists": True}}):
            if _phone_digits(candidate.get("phone", "")) == phone_digits:
                donor = candidate
                await db.donors.update_one({"_id": candidate["_id"]}, {"$set": {"whatsapp_phone_digits": phone_digits}})
                break
    if not donor:
        return
    try:
        request_oid = ObjectId(request_id)
    except Exception:
        return
    request = await db.requests.find_one({"_id": request_oid})
    if not request or request.get("status") in {"cancelled", "completed", "fulfilled", "expired", "escalated", "ready_for_review", "donors_shortlisted", "medical_screening", "confirmed", "rejected"}:
        await _send_next_screening_question(phone, "This blood request is no longer active. Thank you for responding to Jeevansh.")
        return
    invitation = await db.donor_invitations.find_one({"request_id": request_id, "donor_id": str(donor["_id"])})
    if not invitation:
        return

    now = datetime.utcnow()
    action = action.upper()
    if action == "REJECT":
        await db.donor_invitations.update_one(
            {"_id": invitation["_id"], "status": {"$nin": ["rejected", "shortlisted", "withdrawn"]}},
            {"$set": {"status": "rejected", "responded_at": now, "updated_at": now}},
        )
        await db.request_events.insert_one({"request_id": request_id, "event_type": "donor_rejected", "donor_id": str(donor["_id"]), "created_at": now})
        await _send_next_screening_question(phone, "Thank you for responding. We won't send further questions for this request.")
        return

    if action != "ACCEPT":
        return
    if invitation.get("status") in {"accepted", "screening", "needs_review", "rejected", "preliminary_fail", "shortlisted", "withdrawn", "screening_timeout"}:
        return
    await db.donor_invitations.update_one({"_id": invitation["_id"], "status": {"$nin": ["rejected", "preliminary_fail", "shortlisted", "withdrawn"]}}, {"$set": {"status": "accepted", "accepted_at": now, "updated_at": now}})
    existing_session = await db.screening_sessions.find_one({"request_id": request_id, "donor_id": str(donor["_id"])})
    if existing_session:
        return
    session = await db.screening_sessions.find_one_and_update(
        {"request_id": request_id, "donor_id": str(donor["_id"])},
        {"$setOnInsert": {"request_id": request_id, "donor_id": str(donor["_id"]), "phone": donor["phone"], "status": "in_progress", "question_index": 0, "answers": [], "created_at": now, "deadline_at": now + timedelta(seconds=SCREENING_WINDOW_SECONDS)}},
        upsert=True, return_document=ReturnDocument.AFTER,
    )
    await db.donor_invitations.update_one({"_id": invitation["_id"]}, {"$set": {"status": "screening", "updated_at": now}})
    await _send_screening_prompt(phone, "Thanks for responding to Jeevansh. " + SCREENING_QUESTIONS[0], request_id, 0)


async def handle_screening_reply(phone: str, reply: str, request_id: str | None = None, step: int | None = None):
    db = get_db()
    phone_digits = _phone_digits(phone)
    donor = await db.donors.find_one({"whatsapp_phone_digits": phone_digits})
    if not donor:
        async for candidate in db.donors.find({"phone": {"$exists": True}}):
            if _phone_digits(candidate.get("phone", "")) == phone_digits:
                donor = candidate
                break
    if not donor:
        return
    session_query = {"donor_id": str(donor["_id"]), "status": "in_progress"}
    if request_id:
        session_query["request_id"] = request_id
    sessions_cursor = db.screening_sessions.find(session_query).sort("created_at", -1).limit(2)
    sessions = [item async for item in sessions_cursor]
    if not sessions:
        return
    if not request_id and len(sessions) > 1:
        await _send_next_screening_question(phone, "You have more than one active Jeevansh request. Please use the Yes/No buttons on the relevant request message.")
        return
    session = sessions[0]
    if step is not None and int(session.get("question_index", 0)) != step:
        return  # stale/duplicate button from an earlier question
    now = datetime.utcnow()
    answer = (reply or "").strip().upper()
    index = int(session.get("question_index", 0))
    if answer not in {"YES", "NO", "Y", "N"}:
        await _send_screening_prompt(phone, "Please use a Yes or No button so we can record your response.", session["request_id"], index)
        return
    normalized = "YES" if answer in {"YES", "Y"} else "NO"
    answers = list(session.get("answers", []))
    answers.append({"question_index": index, "question": SCREENING_QUESTIONS[index], "answer": normalized, "answered_at": now})
    if normalized == "NO":
        await db.screening_sessions.update_one({"_id": session["_id"]}, {"$set": {"status": "completed_fail", "answers": answers, "completed_at": now}})
        await db.donor_invitations.update_one({"request_id": session["request_id"], "donor_id": session["donor_id"]}, {"$set": {"status": "preliminary_fail", "updated_at": now}})
        await _send_next_screening_question(phone, "Thanks for letting us know. We won't shortlist you for this request. This is only preliminary coordination, not a medical assessment.")
        return
    next_index = index + 1
    if next_index < len(SCREENING_QUESTIONS):
        await db.screening_sessions.update_one({"_id": session["_id"]}, {"$set": {"question_index": next_index, "answers": answers}})
        await _send_screening_prompt(phone, SCREENING_QUESTIONS[next_index], session["request_id"], next_index)
        return

    # Recheck known donation date and donor availability. This is preliminary only.
    last_donated = donor.get("last_donated_at")
    donation_gap_ok = last_donated is None or last_donated <= now - timedelta(days=90)
    availability_ok = donor.get("is_available", True) is True
    if not donation_gap_ok or not availability_ok:
        final_status = "completed_fail"
        invitation_status = "preliminary_fail"
        await _send_next_screening_question(phone, "Thanks. Based on the information available, we can't shortlist you automatically for this request. A blood bank makes the final eligibility decision.")
    else:
        final_status = "completed_needs_review"
        invitation_status = "needs_review"
        await _send_next_screening_question(
            phone,
            "Thanks! Your WhatsApp screening is complete and your response has been recorded. You do not need to log in or accept again on the website. If selected, you will receive a separate WhatsApp confirmation with hospital visit and identity-verification instructions. The blood bank must still confirm medical eligibility; this message is not medical clearance."
        )
    await db.screening_sessions.update_one({"_id": session["_id"]}, {"$set": {"status": final_status, "answers": answers, "completed_at": now}})
    await db.donor_invitations.update_one({"request_id": session["request_id"], "donor_id": session["donor_id"]}, {"$set": {"status": invitation_status, "updated_at": now}})
    if invitation_status == "needs_review":
        request = await db.requests.find_one({"_id": ObjectId(session["request_id"])})
        if request and request.get("status") not in {"cancelled", "completed", "fulfilled", "expired"}:
            await db.shortlist_entries.update_one(
                {"request_id": session["request_id"], "donor_id": session["donor_id"]},
                {"$setOnInsert": {"request_id": session["request_id"], "donor_id": session["donor_id"], "status": "active", "qualified_at": now, "distance_km": next((a.get("distance_km") for a in [await db.donor_invitations.find_one({"request_id": session["request_id"], "donor_id": session["donor_id"]})] if a), None)}},
                upsert=True,
            )
            await _set_ready_if_target_met(session["request_id"])


async def process_due_work():
    db = get_db()
    now = datetime.utcnow()

    # Expire abandoned screening sessions so they never count as shortlisted.
    timed_out = db.screening_sessions.find({"status": "in_progress", "deadline_at": {"$lte": now}}).limit(100)
    async for session in timed_out:
        changed = await db.screening_sessions.update_one(
            {"_id": session["_id"], "status": "in_progress"},
            {"$set": {"status": "timed_out", "completed_at": now}},
        )
        if changed.modified_count:
            await db.donor_invitations.update_one(
                {"request_id": session["request_id"], "donor_id": session["donor_id"], "status": "screening"},
                {"$set": {"status": "screening_timeout", "updated_at": now}},
            )
    # Send a bounded number of outbox messages each poll; MongoDB state survives restarts.
    outbox = db.notification_outbox.find({"status": {"$in": ["pending", "retry"]}, "next_attempt_at": {"$lte": now}}).sort("created_at", 1).limit(50)
    async for item in outbox:
        await _send_outbox_item(item)

    # Recover requests saved before workflow initialization completed.
    recoverable = db.requests.find({"status": "searching", "workflow": {"$exists": False}}).limit(10)
    async for request in recoverable:
        try:
            await start_progressive_search(str(request["_id"]))
        except Exception:
            logger.exception("Unable to recover workflow for request %s", request["_id"])

    due_requests = db.requests.find({
        "status": {"$in": ["matching", "outreach_active", "evaluating"]},
        "workflow.next_action_at": {"$lte": now},
    }).limit(25)
    async for request in due_requests:
        request_id = str(request["_id"])
        if await _set_ready_if_target_met(request_id):
            continue
        # Evaluate the current batch only after its response window. If it is
        # empty, advance immediately. A claim field prevents duplicate workers.
        claimed = await db.requests.find_one_and_update(
            {"_id": request["_id"], "workflow.next_action_at": {"$lte": now}, "workflow.worker_claim_until": {"$not": {"$gt": now}}},
            {"$set": {"workflow.worker_claim_until": now + timedelta(seconds=30), "status": "evaluating"}},
            return_document=ReturnDocument.AFTER,
        )
        if not claimed:
            continue
        try:
            await dispatch_next_batch(request_id)
        finally:
            await db.requests.update_one({"_id": request["_id"]}, {"$unset": {"workflow.worker_claim_until": ""}})


async def worker_loop(stop_event: asyncio.Event):
    while not stop_event.is_set():
        try:
            await process_due_work()
        except Exception:
            logger.exception("Jeevansh workflow worker iteration failed")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=WORKER_POLL_SECONDS)
        except asyncio.TimeoutError:
            pass
