# Meta WhatsApp Cloud API checklist for Jeevansh

1. Sign in at https://developers.facebook.com/apps/ and create a Meta developer app.
2. Add the WhatsApp product and open WhatsApp > API Setup.
3. Copy the test Phone Number ID and temporary access token into local `.env` (never into frontend code or Git).
4. Add your own WhatsApp number as a test recipient and verify that Meta's sample `hello_world` template sends successfully.
5. In WhatsApp Manager, create and submit the `jeevansh_blood_request` template described in README.md. Wait for approval before using it.
6. Deploy FastAPI to a public HTTPS endpoint and configure `/api/webhook/whatsapp` as the callback URL.
7. Set the verification token in Meta to exactly match `WHATSAPP_VERIFY_TOKEN`; subscribe to `messages`.
8. Set `WHATSAPP_APP_SECRET` and test GET verification plus signed POST events.
9. Keep `WHATSAPP_ENABLED=false` until token, phone number ID, approved template, and webhook are ready. Then enable it and test with consenting test donors.
10. Before production, configure a long-lived/system-user access token, appropriate business verification, access controls, privacy notice, donor consent and opt-out handling.

Official docs: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/
