"""Meta WhatsApp Cloud API adapter for Jeevansh.

Business-initiated donor alerts use an approved template. Free-form screening
questions are sent only after a donor has replied and opened the service window.
"""
import logging
import re
from typing import Any

import httpx

from app.config import (
    WHATSAPP_ENABLED,
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_API_VERSION,
    WHATSAPP_ALERT_TEMPLATE_NAME,
    WHATSAPP_TEMPLATE_LANGUAGE,
)

logger = logging.getLogger(__name__)


def normalize_whatsapp_number(phone: str) -> str:
    """Return an international phone number as digits only (E.164 without +)."""
    value = re.sub(r"[^0-9]", "", phone or "")
    if not value:
        raise ValueError("Donor phone number is empty")
    # Numbers should be stored in international format, e.g. +919876543210.
    if len(value) < 10 or len(value) > 15:
        raise ValueError("Phone number must include its country code")
    return value


def _api_url() -> str:
    return f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages"


async def _post_message(payload: dict[str, Any]) -> dict[str, Any]:
    if not WHATSAPP_ENABLED:
        logger.info("WhatsApp disabled; would send message type=%s", payload.get("type"))
        return {"simulated": True, "messages": [{"id": "simulated"}]}
    if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        raise RuntimeError("WhatsApp is enabled but access token or phone number ID is missing")

    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(_api_url(), headers=headers, json=payload)
        if response.is_error:
            logger.error("WhatsApp API error status=%s body=%s", response.status_code, response.text[:1000])
            response.raise_for_status()
        return response.json()


async def send_donor_alert(
    donor_phone: str,
    blood_type: str,
    hospital: str | None,
    distance: float,
    request_id: str,
) -> dict[str, Any]:
    """Send an approved template alert with request-specific quick-reply IDs.

    Configure the approved template with body parameters {{1}} blood group,
    {{2}} hospital, {{3}} distance. Add two QUICK_REPLY buttons whose button
    indexes are 0 (Accept) and 1 (Reject); their payloads are supplied here.
    """
    to = normalize_whatsapp_number(donor_phone)
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "template",
        "template": {
            "name": WHATSAPP_ALERT_TEMPLATE_NAME,
            "language": {"code": WHATSAPP_TEMPLATE_LANGUAGE},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": blood_type},
                        {"type": "text", "text": (hospital or "Nearby hospital")[:100]},
                        {"type": "text", "text": f"{distance:.1f}"},
                    ],
                },
                {
                    "type": "button",
                    "sub_type": "quick_reply",
                    "index": "0",
                    "parameters": [{"type": "payload", "payload": f"ACCEPT:{request_id}"}],
                },
                {
                    "type": "button",
                    "sub_type": "quick_reply",
                    "index": "1",
                    "parameters": [{"type": "payload", "payload": f"REJECT:{request_id}"}],
                },
            ],
        },
    }
    return await _post_message(payload)


async def send_text_message(phone: str, text: str) -> dict[str, Any]:
    """Send a free-form message within an open WhatsApp service window."""
    to = normalize_whatsapp_number(phone)
    return await _post_message({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"preview_url": False, "body": text[:4000]},
    })


async def send_yes_no_question(phone: str, text: str, request_id: str, step: int) -> dict[str, Any]:
    """Send request-specific interactive screening buttons to avoid ambiguous YES/NO replies."""
    to = normalize_whatsapp_number(phone)
    return await _post_message({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": text[:1024]},
            "action": {"buttons": [
                {"type": "reply", "reply": {"id": f"SCREEN:YES:{request_id}:{step}", "title": "Yes"}},
                {"type": "reply", "reply": {"id": f"SCREEN:NO:{request_id}:{step}", "title": "No"}},
            ]},
        },
    })
