from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException
from app.database import get_db
from app.services.qr_service import generate_donation_token, generate_qr_image_base64
from app.config import PUBLIC_FRONTEND_URL

async def accept_request(donor_id: str, request_id: str, channel: str = "dashboard") -> dict:
    """
    Handles the core logic of a donor accepting a request.
    Called by the Dashboard API (now) and the WhatsApp Webhook (future).
    """
    db = get_db()

    # 1. Validate IDs
    try:
        donor_oid = ObjectId(donor_id)
        request_oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Donor or Request ID format")

    # 2. Verify Request exists and is still active
    blood_request = await db.requests.find_one({"_id": request_oid})
    if not blood_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if blood_request.get("status") in ["donor_found", "completed"]:
        raise HTTPException(status_code=400, detail="This request has already been accepted or completed")

    # 3. Verify Donor exists
    donor = await db.donors.find_one({"_id": donor_oid})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")

    # 4. Generate the QR Token
    token = generate_donation_token(
        donor_id=str(donor["_id"]),
        request_id=request_id,
        donor_name=donor["name"],
    )
    
    # URL for the frontend to render (if needed)
    verify_url = f"{PUBLIC_FRONTEND_URL}/verify/{token}"
    qr_base64 = generate_qr_image_base64(verify_url)

    # 5. Update the Request Document
    now = datetime.utcnow()
    await db.requests.update_one(
        {"_id": request_oid},
        {
            "$set": {
                "status": "donor_found",
                "accepted_donor": {
                    "id": str(donor["_id"]),
                    "name": donor["name"],
                    "phone": donor["phone"],
                    "blood_type": donor["blood_type"],
                    "accepted_at": now,
                    "channel": channel  # Tracks if they accepted via 'dashboard' or 'whatsapp'
                },
                "donation_token": token,
            }
        },
    )

    # 6. Return the data needed by the UI
    return {
        "success": True,
        "message": f"{donor['name']} has accepted the request.",
        "donor": {
            "id": str(donor["_id"]),
            "name": donor["name"],
            "phone": donor["phone"],
            "blood_type": donor["blood_type"],
        },
        "token": token,
        "verify_url": verify_url,
        "qr_image_base64": qr_base64,
    }