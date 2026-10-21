from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime
from typing import Any
from app.models.donor import BloodType

class BloodRequestCreate(BaseModel):
    blood_type: BloodType
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    units: int = Field(1, ge=1, le=10)
    hospital_name: Optional[str] = None
    location_text: Optional[str] = None
    # Stable client-generated key makes POST retries/React StrictMode idempotent.
    client_request_id: Optional[str] = Field(default=None, min_length=8, max_length=100)

    @model_validator(mode="before")
    @classmethod
    def accept_geojson_coordinates(cls, value: Any) -> Any:
        """Accept frontend locationCoordinates GeoJSON as well as latitude/longitude."""
        if not isinstance(value, dict):
            return value
        data = dict(value)
        location_coordinates = data.get("locationCoordinates")
        if isinstance(location_coordinates, dict):
            coordinates = location_coordinates.get("coordinates")
            if isinstance(coordinates, (list, tuple)) and len(coordinates) >= 2:
                data.setdefault("longitude", coordinates[0])
                data.setdefault("latitude", coordinates[1])
        return data

class BloodRequestResponse(BaseModel):
    id: str
    blood_type: str
    status: str
    alerted_donors: int
    created_at: datetime
    matched_donors: list = []
    accepted_donor: Optional[dict] = None