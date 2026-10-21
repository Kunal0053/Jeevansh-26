# Frontend workflow changes

- Donor dashboard now loads selected requests and shows an individual QR code, backup token, hospital, and current stage.
- Bank dashboard shows the live request shortlist and candidate stages, with a shortcut to the staff QR/token scanner.
- Bank scanner now verifies donor identity first and then offers separate medical-screening Confirmed/Rejected actions.
- Request status page displays the shortlisted donors and their current stage.
- The public `/verify/:token` screen describes identity verification rather than claiming that a donation is completed.

Run `npm ci`, `npm run build`, and `npm run lint` before deployment.
