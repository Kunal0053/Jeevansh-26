# Jeevansh workflow changes

## New donor journey
1. Requester coordinates remain the origin used for donor distance ranking.
2. After the progressive WhatsApp screening closes, the backend ranks eligible donors by distance and selects up to three.
3. Each selected donor gets an individual time-limited QR/JWT token and a WhatsApp message with hospital instructions.
4. The authenticated donor dashboard also displays that donor's own QR/token under **WhatsApp-selected requests**.
5. Authorized blood-bank staff scan/paste the token. This records **identity verification only** and changes the donor stage to `identity_verified`; it does not create a donation log, increment donation count, or complete the request.
6. After fitness assessment and blood tests, staff choose **Confirmed** or **Rejected** in the scanner screen. The request remains `medical_screening` while selected donors are still pending, becomes `confirmed` if all candidates have a terminal decision and at least one is confirmed, or `rejected` if all are rejected.

## API changes
- `GET /api/donors/me/selected-requests`: authenticated donor's own selected requests and QR data.
- `GET /api/banks/review-queue`: includes shortlisted and medical-screening requests/candidate stages.
- `POST /api/donations/verify`: staff-only identity verification; no donation completion side effects.
- `POST /api/donations/medical-decision`: staff-only per-donor medical screening outcome. Body: `{ "request_id": "...", "donor_id": "...", "decision": "approve" | "reject", "note": "optional" }`.

## Configuration
- Set `JWT_SECRET` to a strong secret before using QR tokens outside local development.
- Set `PUBLIC_FRONTEND_URL` to the deployed frontend origin so WhatsApp verification links point to the correct site.
- Set `CORS_ORIGINS` to the deployed frontend origin(s).
- WhatsApp selection messages use the current free-form text sender; since donors have just replied to screening, this should generally be within the WhatsApp customer-service window. Meta credentials and delivery still need a live test.

## Validation performed
- Python source compilation passed.
- Modified JavaScript/JSX files parsed successfully with Babel parser.
- Full Vite production build could not run in this environment because the uploaded `node_modules` did not contain the Linux Rolldown native optional binding. Run `npm ci` in the frontend folder on your development machine, then `npm run build` and `npm run lint`.
- MongoDB and live Meta WhatsApp end-to-end behavior were not exercised here.

## Important scope note
`confirmed` means the blood bank marked the donor's medical screening as confirmed. It does not create a donation-history entry or increase `total_donations`; that should happen only after a separate staff action records that blood collection actually occurred.
