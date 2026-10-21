"""Password hashing and JWT authentication for donor accounts."""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from bson import ObjectId

from app.config import JWT_SECRET, JWT_ALGORITHM
from app.database import get_db

PASSWORD_ITERATIONS = 310_000
TOKEN_LIFETIME_HOURS = 24
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt_hex, digest_hex = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        calculated = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        ).hex()
        return hmac.compare_digest(calculated, digest_hex)
    except (ValueError, TypeError):
        return False


def create_donor_token(donor_id: str) -> str:
    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Donor login is unavailable until JWT_SECRET is configured in the backend .env file.",
        )
    now = datetime.now(timezone.utc)
    payload = {
        "sub": donor_id,
        "role": "donor",
        "iat": now,
        "exp": now + timedelta(hours=TOKEN_LIFETIME_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_donor(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please log in to access this resource.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials or not JWT_SECRET:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        donor_id = payload.get("sub")
        if payload.get("role") != "donor" or not donor_id:
            raise unauthorized
        donor_oid = ObjectId(donor_id)
    except (jwt.PyJWTError, ValueError, TypeError):
        raise unauthorized
    db = get_db()
    donor = await db.donors.find_one({"_id": donor_oid})
    if not donor:
        raise unauthorized
    return donor


def public_donor(donor: dict) -> dict:
    location = donor.get("location") or {}
    coordinates = location.get("coordinates") or [None, None]
    return {
        "id": str(donor["_id"]),
        "name": donor.get("name", "Donor"),
        "phone": donor.get("phone", ""),
        "blood_type": donor.get("blood_type", ""),
        "city": donor.get("city"),
        "latitude": coordinates[1] if len(coordinates) > 1 else None,
        "longitude": coordinates[0] if len(coordinates) > 0 else None,
        "is_available": donor.get("is_available", True),
        "whatsapp_opt_in": donor.get("whatsapp_opt_in", False),
        "total_donations": donor.get("total_donations", 0),
        "last_donated_at": donor.get("last_donated_at"),
        "created_at": donor.get("created_at"),
    }
