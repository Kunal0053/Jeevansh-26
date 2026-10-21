# Jeevansh Backend

FastAPI + MongoDB backend for Jeevansh, including progressive geofencing and a Meta WhatsApp Cloud API adapter.

## 1. Local setup

```bash
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env  # Windows; use cp .env.example .env on macOS/Linux
uvicorn app.main:app --reload
```

Set `MONGODB_URI` and `JWT_SECRET` in `.env`. MongoDB must be reachable. On startup, the app creates the donor 2dsphere index and workflow indexes.

## 2. WhatsApp setup (starts in mock mode)

Keep `WHATSAPP_ENABLED=false` until Meta setup is complete. In the Meta Developer dashboard, add the WhatsApp product and use **WhatsApp > API Setup** to obtain a test phone number, Phone Number ID, access token, and WABA. Add your own number as a test recipient.

Configure these variables in `.env`:

- `WHATSAPP_ENABLED=true`
- `WHATSAPP_ACCESS_TOKEN=...`
- `WHATSAPP_PHONE_NUMBER_ID=...`
- `WHATSAPP_VERIFY_TOKEN=...` (a long random string you choose)
- `WHATSAPP_APP_SECRET=...` (the Meta app secret; used to validate webhook signatures)
- `WHATSAPP_API_VERSION=v23.0` (change to a currently supported version in your Meta app if needed)
- `WHATSAPP_ALERT_TEMPLATE_NAME=jeevansh_blood_request`
- `WHATSAPP_TEMPLATE_LANGUAGE=en_US`

Never commit `.env` or expose the access token in frontend code. Use a permanent/system-user token for production and rotate credentials if they are exposed.

## 3. Create the alert template in WhatsApp Manager

Create and get approval for a template named `jeevansh_blood_request` (or set a different name in `.env`) with language matching `WHATSAPP_TEMPLATE_LANGUAGE`.

Suggested body, with exactly three text placeholders:

> Jeevansh blood request: A patient needs {{1}} blood near {{2}}. Approximate distance: {{3}}. Can you help? Please respond using the buttons. This is a request for coordination, not medical clearance.

Add two **Quick Reply** buttons in this order:

1. `Accept`
2. `Reject`

The backend sends dynamic payloads for these buttons (`ACCEPT:<request_id>` and `REJECT:<request_id>`). Ensure the approved template has two Quick Reply buttons in the same order. Meta may require example values during template submission.

Business-initiated donor alerts must use an approved template. Free-form screening questions are sent after the donor replies, during the open user-initiated service window.

## 4. Configure webhook

Deploy the backend to a public HTTPS URL. In Meta's WhatsApp webhook configuration, set the callback URL to:

`https://YOUR_BACKEND_HOST/api/webhook/whatsapp`

Use the exact same `WHATSAPP_VERIFY_TOKEN` value as the verification token. Subscribe to the `messages` webhook field. Set `WHATSAPP_APP_SECRET` so POST webhook signatures are verified. Local development can use a secure HTTPS tunnel.

## 5. Donor consent

Donor registration now accepts `whatsapp_opt_in` (default `false`). The progressive alert workflow only selects donors who explicitly opted in. Example registration field:

```json
{
  "name": "Test Donor",
  "phone": "+919876543210",
  "blood_type": "O+",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "whatsapp_opt_in": true
}
```

Only set this to `true` after obtaining and recording the donor's explicit consent. Existing donors remain opted out until consent is collected and recorded.

## 6. Progressive geofencing behaviour

- Default radius bands: 0–5, 5–10, 10–25, 25–50, and 50–100 km (`RADIUS_BANDS_KM`).
- A batch has a persisted response deadline (`RESPONSE_WINDOW_SECONDS`, default 180 seconds).
- The worker expands when fewer than `TARGET_SHORTLIST_SIZE` (default 3) potential donors pass the preliminary questions.
- Each donor is invited at most once per request. Notification outbox jobs are persisted and retried.
- The shortlist means potential matches pending human/blood-bank confirmation, not medically cleared donors.
- Donor distance ranking uses the request coordinates supplied by the requester (the requester's current GPS location), not the blood bank's coordinates. The workflow waits for the active radius batch response window to close before selecting the nearest qualified donors.
- If all bands are exhausted, the request is escalated rather than claiming success.

## 7. API endpoints

Existing routes remain:

- `POST /api/requests`
- `GET /api/requests/{request_id}/status`
- `GET /api/requests/{request_id}/donor-info`
- `POST /api/donors/register`
- `GET /api/health`

WhatsApp webhook:

- `GET /api/webhook/whatsapp` — Meta verification
- `POST /api/webhook/whatsapp` — incoming messages and status events

## Production notes

The included worker uses a MongoDB-backed polling loop to make jobs survive a single-process restart. For a multi-instance deployment, move the worker to a dedicated process/queue with durable leases, metrics, dead-letter handling and alerting. Configure explicit `CORS_ORIGINS`, authentication/authorization for requester and donor APIs, retention policies for sensitive screening data, and secure bank/operator workflows before public launch. The existing demo bank credentials and demo-login endpoint are not production-safe.

## Donor account API (phone + password)

The donor account endpoints now store a PBKDF2-SHA256 password hash (never the raw password) and issue a signed bearer token after login.

- `POST /api/donors/register` — includes `password` (minimum 8 characters), plus `name`, `phone`, `blood_type`, `latitude`, `longitude`; `city` and `whatsapp_opt_in` are optional.
- `POST /api/donors/login` — JSON `{ "phone": "+91XXXXXXXXXX", "password": "your-password" }`; returns `token`, `token_type`, and the donor profile.
- `GET /api/donors/me` — current donor profile; requires `Authorization: Bearer <token>`.
- `PATCH /api/donors/me/availability` — JSON `{ "is_available": true }`; requires bearer token.
- `GET /api/donors/me/pending-requests`, `GET /api/donors/me/certificates`, and `GET /api/donors/me/certificates/{cert_id}` require the same bearer token. The donor ID is derived from the token rather than accepted from the caller.
- `POST /api/donors/me/accept/{request_id}` requires the same bearer token.

### Setup

1. Copy `.env.example` to `.env` and set your real `MONGODB_URI`.
2. Set `JWT_SECRET` to a long random secret (at least 32 random characters). For example, generate one locally with Python: `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
3. Restart the backend after changing `.env`.

Existing donor records created before this change have no password hash and cannot log in until their password is set through a trusted admin/migration process. They should not be able to claim an existing phone number again because duplicate phone registration is blocked. The frontend must send `password` at registration and call `POST /api/donors/login`; it must store the returned token and send it as a Bearer token for protected `/me` endpoints. The old demo-login endpoint has been removed.
