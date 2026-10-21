# Jeevansh Frontend - Phases 1, 2 and 3

## Included
- Donor registration now requires a password and confirmation, calls the real `/api/donors/register` endpoint, and requests browser geolocation instead of using fixed Delhi coordinates.
- WhatsApp alert consent is explicit and optional.
- Donor login uses phone + password through `/api/donors/login`; the fake login fallback has been removed.
- Donor API requests use the returned bearer token.
- Dashboard data comes from the authenticated donor profile, pending requests and certificates APIs. Availability can be updated through `/api/donors/me/availability`.
- Accepting a pending request displays the QR returned by the backend and persists it locally so refresh does not immediately hide it.
- Blood-bank scanner uses the existing authenticated `/api/donations/verify` endpoint after an explicit confirmation. Demo localStorage token scanning and non-existent scan/approve API calls were removed.
- `/verify/:token` route is enabled. If opened while not signed in as a bank, the token is saved locally and bank login sends the user to the scanner.

## Backend expected
This frontend is intended to pair with the `jeevansh-backend-phone-password` backend package previously supplied. Keep its donor auth endpoints and donation verification endpoint available.

Required `.env` frontend setting for a non-local deployment:
`VITE_API_URL=https://your-backend-domain/api`

For local development, the default remains `http://localhost:8000/api`.

## Important limitations of the current backend contract
- The current backend does not expose a donor-side endpoint to retrieve a QR generated later by blood-bank approval of a WhatsApp-screened donor. This frontend displays/persists the QR returned when the donor accepts a dashboard request. A durable server-side QR endpoint is still needed for the separate WhatsApp-screening -> blood-bank-approval path.
- The backend has no donor reject endpoint, so the donor dashboard intentionally does not display a reject action.
- Blood-bank dashboard stock charts remain demo/static; they are outside phases 1-3 and require a real inventory API/data source.
- Location access is required during registration because the backend donor registration schema requires coordinates. The city text field is descriptive only; it does not geocode an address.
- Old donor accounts without `password_hash` cannot use password login until a password is set through a secure migration/reset process.
