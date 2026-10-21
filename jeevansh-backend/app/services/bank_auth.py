"""Authentication helpers for blood-bank staff endpoints."""
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import JWT_ALGORITHM, JWT_SECRET

bearer_scheme = HTTPBearer(auto_error=False)


def create_bank_access_token(bank_id: str, bank_name: str) -> str:
    if not JWT_SECRET or len(JWT_SECRET) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Bank authentication is not configured. Set JWT_SECRET to a random secret of at least 32 characters.",
        )
    now = datetime.now(timezone.utc)
    payload = {
        "sub": bank_id,
        "bank_id": bank_id,
        "bank_name": bank_name,
        "role": "blood_bank",
        "type": "bank_access",
        "iat": now,
        "exp": now + timedelta(hours=8),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def require_bank_staff(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Blood-bank login required", headers={"WWW-Authenticate": "Bearer"})
    if not JWT_SECRET or len(JWT_SECRET) < 32:
        raise HTTPException(status_code=503, detail="Bank authentication is not configured; set a strong JWT_SECRET")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Bank session expired. Please log in again.", headers={"WWW-Authenticate": "Bearer"})
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid bank access token", headers={"WWW-Authenticate": "Bearer"})
    if payload.get("type") != "bank_access" or payload.get("role") != "blood_bank" or not payload.get("bank_id"):
        raise HTTPException(status_code=403, detail="Blood-bank staff access required")
    return payload
