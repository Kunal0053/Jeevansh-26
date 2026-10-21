from datetime import datetime, timedelta
from typing import List, Dict, Optional
from app.database import get_db
from app.services.compatibility import get_compatible_donor_types
import os

DONATION_GAP_DAYS = 90

async def find_nearby_donors(
    patient_blood_type: str,
    latitude: float,
    longitude: float,
    radius_km: float = 15,
    limit: int = 20,
    inner_radius_km: float = 0,
    exclude_donor_ids: Optional[list[str]] = None,
    require_whatsapp_opt_in: bool = False,
) -> List[Dict]:
    """Find compatible available donors in an outer-minus-inner radius band.

    Uses an aggregation $geoNear stage, avoiding the $near/$or query limitation.
    """
    from bson import ObjectId

    db = get_db()
    compatible_types = get_compatible_donor_types(patient_blood_type)
    cutoff_date = datetime.utcnow() - timedelta(days=DONATION_GAP_DAYS)
    excluded_oids = []
    for value in (exclude_donor_ids or []):
        try:
            excluded_oids.append(ObjectId(value))
        except Exception:
            continue

    match = {
        "blood_type": {"$in": compatible_types},
        "is_available": True,
        "$or": [
            {"last_donated_at": None},
            {"last_donated_at": {"$lt": cutoff_date}},
        ],
    }
    if excluded_oids:
        match["_id"] = {"$nin": excluded_oids}
    if require_whatsapp_opt_in:
        match["whatsapp_opt_in"] = True

    # Test-only restriction is disabled by default. Enable it explicitly only
    # when intentionally testing with a single donor:
    # ENABLE_TEST_DONOR_FILTER=true and TEST_DONOR_PHONE=+91...
    if os.getenv("ENABLE_TEST_DONOR_FILTER", "false").strip().lower() == "true":
        test_donor_phone = os.getenv("TEST_DONOR_PHONE", "").strip()
        if test_donor_phone:
            match["phone"] = test_donor_phone
    pipeline = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [longitude, latitude]},
                "key": "location",
                "distanceField": "distance_meters",
                "maxDistance": radius_km * 1000,
                "minDistance": inner_radius_km * 1000,
                "spherical": True,
                "query": match,
            }
        },
        {"$limit": limit},
    ]
    print("GEO SEARCH ORIGIN (longitude, latitude):", [longitude, latitude])
    print("GEO SEARCH RADIUS KM:", radius_km, "INNER RADIUS KM:", inner_radius_km)
    print("TEST DONOR FILTER ENABLED:", os.getenv("ENABLE_TEST_DONOR_FILTER", "false").strip().lower() == "true")
    print("MATCH FILTER:", match)
    cursor = db.donors.aggregate(pipeline)
    donors = []
    async for doc in cursor:
        donors.append({
            "id": str(doc["_id"]),
            "name": doc.get("name", "Donor"),
            "phone": doc["phone"],
            "blood_type": doc["blood_type"],
            "total_donations": doc.get("total_donations", 0),
            "distance_km": round(float(doc.get("distance_meters", 0)) / 1000, 2),
            "last_donated_at": doc.get("last_donated_at"),
        })

    print("DONORS FOUND:", len(donors), donors)

    return donors


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import radians, sin, cos, asin, sqrt
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 6371.0 * 2 * asin(sqrt(min(1.0, a)))
