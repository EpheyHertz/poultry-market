# TODO

## Email sending via Resend: Fix & Verify

- [ ] Confirm Resend integration code path(s): `lib/email.ts` `sendEmail()` + all API routes using it (e.g. `app/api/admin/emails/route.ts`).
- [ ] Fix/robustify env var handling: ensure missing `MAIL_DOMAIN`, `ADMIN_GMAIL_USER`, or `RESEND_API_KEY` returns actionable errors.
- [ ] Add a dedicated Resend connectivity test endpoint/script (safe `to` + subject) that returns detailed error from Resend.
- [ ] Add an admin UI/CLI hook to trigger the connectivity test.
- [ ] Run `scripts/test-blog-emails.ts` (or equivalent) to validate outbound email.
- [ ] Validate final send flow end-to-end and ensure API returns `success:false` when Resend fails.

