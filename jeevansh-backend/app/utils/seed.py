"""
Run this once to populate 200 donors across Delhi NCR for the demo.
Usage: python -m app.utils.seed
"""
import asyncio
import random
from datetime import datetime, timedelta
from app.database import connect_db, close_db, get_db

BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]

LAT_RANGE = (28.55, 28.75)
LNG_RANGE = (77.10, 77.30)

FIRST_NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Rohit",
               "Neha", "Karan", "Pooja", "Arjun", "Divya", "Suresh", "Meera",
               "Aditya", "Kavya", "Manish", "Ritu", "Sanjay", "Shreya"]

LAST_NAMES = ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Mehta", "Patel",
              "Reddy", "Nair", "Joshi", "Chopra", "Bansal"]


async def seed_donors(count: int = 200):
    db = get_db()
    await db.donors.delete_many({})
    print(f"🗑️  Cleared existing donors")

    donors = []
    for i in range(count):
        lat = random.uniform(*LAT_RANGE)
        lng = random.uniform(*LNG_RANGE)

        is_available = random.random() > 0.2
        last_donated = None
        if random.random() > 0.5:
            days_ago = random.choice([30, 60, 100, 150, 200])
            last_donated = datetime.utcnow() - timedelta(days=days_ago)

        donors.append({
            "name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            "phone": f"+9198{10000000 + i}",
            "blood_type": random.choice(BLOOD_TYPES),
            "location": {
                "type": "Point",
                "coordinates": [lng, lat],
            },
            "city": "Delhi NCR",
            "is_available": is_available,
            "total_donations": random.randint(0, 8),
            "last_donated_at": last_donated,
            "created_at": datetime.utcnow(),
        })

    await db.donors.insert_many(donors)
    print(f"✅ Seeded {count} donors")


async def main():
    await connect_db()
    await seed_donors(200)
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())