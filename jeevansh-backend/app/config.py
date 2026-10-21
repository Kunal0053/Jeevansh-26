import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "jeevansh")

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Official Meta WhatsApp Cloud API settings.
WHATSAPP_ENABLED = os.getenv("WHATSAPP_ENABLED", "false").lower() == "true"
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v23.0")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET", "")
WHATSAPP_ALERT_TEMPLATE_NAME = os.getenv("WHATSAPP_ALERT_TEMPLATE_NAME", "jeevansh_blood_request")
WHATSAPP_TEMPLATE_LANGUAGE = os.getenv("WHATSAPP_TEMPLATE_LANGUAGE", "en_US")
PUBLIC_FRONTEND_URL = os.getenv("PUBLIC_FRONTEND_URL", "http://localhost:5173").rstrip("/")

# Workflow controls. Values can be changed in the deployment environment.
TARGET_SHORTLIST_SIZE = int(os.getenv("TARGET_SHORTLIST_SIZE", "3"))
RESPONSE_WINDOW_SECONDS = int(os.getenv("RESPONSE_WINDOW_SECONDS", "180"))
SCREENING_WINDOW_SECONDS = int(os.getenv("SCREENING_WINDOW_SECONDS", "300"))
WORKER_POLL_SECONDS = float(os.getenv("WORKER_POLL_SECONDS", "3"))
RADIUS_BANDS_KM = [float(x.strip()) for x in os.getenv("RADIUS_BANDS_KM", "5,10,25,50,100").split(",") if x.strip()]

if not RADIUS_BANDS_KM or any(r <= 0 for r in RADIUS_BANDS_KM) or RADIUS_BANDS_KM != sorted(set(RADIUS_BANDS_KM)):
    RADIUS_BANDS_KM = [5.0, 10.0, 25.0, 50.0, 100.0]
