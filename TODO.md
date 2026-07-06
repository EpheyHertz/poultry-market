# TODO

- [ ] Update `lib/email.ts` to send all emails using Resend
  - [ ] Remove nodemailer + multi-Gmail account logic
  - [ ] Use `RESEND_API_KEY` for authentication
  - [ ] Use `EMAIL_FROM` for from address
  - [ ] Keep exported `sendEmail` / `sendReminderEmail` / `sendNotifyEmail` / `sendAdminEmail` / `sendOnboardingEmail` / `sendBlogEmail` stable

- [ ] Update env var documentation (if repo has env example)
- [ ] Run lint/build/tests

