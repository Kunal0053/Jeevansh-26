from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI, DATABASE_NAME

client: AsyncIOMotorClient = None
db = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DATABASE_NAME]

    # Create 2dsphere index on donor locations (CRITICAL for geo-search)
    await db.donors.create_index([("location", "2dsphere")])
    await db.donors.create_index("phone", unique=True)
    await db.requests.create_index("created_at")

    print(f"✅ Connected to MongoDB: {DATABASE_NAME}")

async def close_db():
    global client
    if client:
        client.close()
        print("❌ MongoDB connection closed")

def get_db():
    return db