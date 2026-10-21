import hashlib
import hmac
import logging
from datetime import datetime

from fastapi import APIRouter, Query, Request, HTTPException
from fastapi.responses import PlainTextResponse
from app.config import WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_ENABLED
from app.database import get_db
from app.services.workflow_service import handle_donor_action, handle_screening_reply

router = APIRouter(prefix="/api/webhook", tags=["webhook"])
logger = logging.getLogger(__name__)


@router.get("/whatsapp")
async def verify_webhook(
    hub_mode: str = Query(default=None, alias="hub.mode"),
    hub_challenge: str = Query(default=None, alias="hub.challenge"),
    hub_verify_token: str = Query(default=None, alias="hub.verify_token"),
):
    if WHATSAPP_VERIFY_TOKEN and hub_mode == "subscribe" and hmac.compare_digest(hub_verify_token or "", WHATSAPP_VERIFY_TOKEN):
        return PlainTextResponse(content=hub_challenge or "")
    return PlainTextResponse(content="Verification failed", status_code=403)


def _verify_signature(raw_body: bytes, signature_header: str | None) -> bool:
    if not WHATSAPP_APP_SECRET:
        # Fail closed for real traffic; local mock mode does not receive Meta webhooks.
        return not WHATSAPP_ENABLED
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    digest = hmac.new(WHATSAPP_APP_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest("sha256=" + digest, signature_header)


def _extract_action(message: dict) -> tuple[str | None, str | None]:
    interactive = message.get("interactive") or {}
    button_reply = interactive.get("button_reply") or {}
    if button_reply.get("id"):
        return button_reply["id"], None
    if button_reply.get("title"):
        return button_reply["title"], None
    # Template quick-reply payloads can arrive as button.payload.
    button = message.get("button") or {}
    if button.get("payload"):
        return button["payload"], None
    text = (message.get("text") or {}).get("body")
    return None, text


@router.post("/whatsapp")
async def receive_webhook(request: Request):
    raw_body = await request.body()
    if not _verify_signature(raw_body, request.headers.get("x-hub-signature-256")):
        raise HTTPException(status_code=401, detail="Invalid WhatsApp webhook signature")
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    db = get_db()
    handled = 0
    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for message in value.get("messages", []) or []:
                message_id = message.get("id")
                if message_id:
                    try:
                        await db.webhook_events.insert_one({"event_id": message_id, "event_type": "incoming_message", "received_at": datetime.utcnow()})
                    except Exception:
                        # Duplicate webhook delivery: event already recorded.
                        continue
                phone = message.get("from")
                action_id, text_body = _extract_action(message)
                try:
                    action_text = (action_id or "").strip()
                    if action_text.startswith("SCREEN:"):
                        # SCREEN:YES:<request_id>:<step> or SCREEN:NO:<request_id>:<step>
                        parts = action_text.split(":")
                        if len(parts) == 4 and parts[1].upper() in {"YES", "NO"}:
                            await handle_screening_reply(phone, parts[1].upper(), parts[2], int(parts[3]))
                            handled += 1
                            continue
                    if ":" in action_text:
                        action, request_id = action_text.split(":", 1)
                        if action.upper() in {"ACCEPT", "REJECT"} and request_id:
                            await handle_donor_action(phone, action.upper(), request_id)
                            handled += 1
                            continue
                    if text_body:
                        normalized = text_body.strip().upper()
                        # Text fallback works only when the donor has one active session.
                        if normalized in {"YES", "NO", "Y", "N"}:
                            await handle_screening_reply(phone, normalized)
                            handled += 1
                except Exception:
                    logger.exception("Failed to process incoming WhatsApp message id=%s", message_id)
                    # Return 200 so a poison event does not cause an endless retry loop;
                    # the event and server logs are available for operator review.
    return {"status": "ok", "handled": handled}
