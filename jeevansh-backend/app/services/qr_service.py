import jwt
import qrcode
import io
import base64
from datetime import datetime, timedelta
from app.config import JWT_SECRET, JWT_ALGORITHM

# Token expires in 24 hours — plenty of time for a donation
TOKEN_EXPIRY_HOURS = 24


def generate_donation_token(donor_id: str, request_id: str, donor_name: str) -> str:
    """
    Generate a JWT token for a donation.
    This token uniquely identifies (donor, request) pair.
    """
    payload = {
        "donor_id": donor_id,
        "request_id": request_id,
        "donor_name": donor_name,
        "type": "donation_checkin",
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_donation_token(token: str) -> dict:
    """
    Verify a donation token and return its payload.
    Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure.
    """
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    if payload.get("type") != "donation_checkin":
        raise ValueError("Invalid token type")
    return payload


def generate_qr_image_base64(data: str) -> str:
    """
    Generate a QR code image as a base64-encoded PNG.
    The frontend can display it as: <img src="data:image/png;base64,..." />
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_bytes = buffer.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode("utf-8")
    return img_base64