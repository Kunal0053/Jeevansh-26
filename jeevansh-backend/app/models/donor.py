from datetime import datetime, date
from typing import Optional, Literal, Any

from pydantic import BaseModel, Field, field_validator, model_validator

BloodType = Literal["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]


class DonorRegister(BaseModel):
    """Accepts the API's snake_case fields and the current React form payload.

    GPS coordinates are required. GeoJSON coordinates are always [longitude, latitude].
    """
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=16)
    password: str = Field(..., min_length=8, max_length=128)
    blood_type: BloodType
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    city: Optional[str] = None
    location_label: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=18, le=120)
    weight: Optional[float] = Field(default=None, ge=1, le=500)
    gender: Optional[str] = Field(default=None, max_length=30)
    last_donated_at: Optional[datetime] = None
    whatsapp_opt_in: bool = False

    @model_validator(mode="before")
    @classmethod
    def normalize_frontend_payload(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        data = dict(value)

        # Current frontend uses camelCase names; preserve compatibility with API clients.
        aliases = {
            "bloodType": "blood_type",
            "whatsappOptIn": "whatsapp_opt_in",
            "lastDonated": "last_donated_at",
        }
        for source, target in aliases.items():
            if target not in data and source in data:
                data[target] = data[source]

        # Accept the GPS GeoJSON object sent by the updated registration component.
        location_coordinates = data.get("locationCoordinates")
        if isinstance(location_coordinates, dict):
            coordinates = location_coordinates.get("coordinates")
            if isinstance(coordinates, (list, tuple)) and len(coordinates) >= 2:
                data.setdefault("longitude", coordinates[0])
                data.setdefault("latitude", coordinates[1])

        # Keep a human-readable label separately from coordinates. It is not used for geo-search.
        if "location_label" not in data and isinstance(data.get("location"), str):
            label = data["location"].strip()
            if label and label.lower() not in {"current location", "use current location"}:
                data["location_label"] = label
                data.setdefault("city", label)

        last_donated = data.get("last_donated_at")
        if isinstance(last_donated, date) and not isinstance(last_donated, datetime):
            data["last_donated_at"] = datetime.combine(last_donated, datetime.min.time())
        elif isinstance(last_donated, str) and last_donated.strip():
            # HTML date inputs submit YYYY-MM-DD. Store that as midnight UTC-naive.
            try:
                data["last_donated_at"] = datetime.combine(date.fromisoformat(last_donated[:10]), datetime.min.time())
            except ValueError:
                pass
        elif last_donated == "":
            data["last_donated_at"] = None

        # Empty optional form values should be treated as absent.
        for field in ("age", "weight", "gender"):
            if data.get(field) == "":
                data[field] = None
        if data.get("age") is not None:
            try:
                data["age"] = int(data["age"])
            except (TypeError, ValueError):
                pass
        if data.get("weight") is not None:
            try:
                data["weight"] = float(data["weight"])
            except (TypeError, ValueError):
                pass
        return data

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        cleaned = "".join(ch for ch in v if ch.isdigit() or ch == "+")
        if cleaned.startswith("00"):
            cleaned = "+" + cleaned[2:]
        return cleaned


class DonorResponse(BaseModel):
    id: str
    name: str
    phone: str
    blood_type: str
    distance_km: Optional[float] = None
    total_donations: int = 0
