# Farm Workspaces and Subscription-Aware Access

## Environment Variables

Set these values for invitation email delivery and app links:

- `DATABASE_URL` - Postgres connection string used by Prisma.
- `JWT_SECRET` - token signing secret for session auth.
- `NEXT_PUBLIC_APP_URL` - public app base URL used in invitation links.
- `NEXTAUTH_URL` - fallback base URL if `NEXT_PUBLIC_APP_URL` is not set.
- `GMAIL_USER` - Gmail sender account for Nodemailer.
- `GMAIL_APP_PASSWORD` - Gmail app password for Nodemailer.
- `REMINDER_GMAIL_USER` - Gmail sender for scheduled farm reminders (e.g. reminder.poultrymarket@gmail.com).
- `REMINDER_GMAIL_APP_PASSWORD` - App password for the reminder sender.
- `NOTIFY_GMAIL_USER` - Gmail sender for farm invitations/notifications (e.g. notify.poultrymarket@gmail.com).
- `NOTIFY_GMAIL_APP_PASSWORD` - App password for the notify sender.
- `ADMIN_GMAIL_USER` - Gmail sender for admin broadcasts (e.g. admin.poultrymarket@gmail.com).
- `ADMIN_GMAIL_APP_PASSWORD` - App password for the admin sender.
- `ONBOARD_GMAIL_USER` - Gmail sender for verification and welcome emails (e.g. onboard.poultrymarket@gmail.com).
- `ONBOARD_GMAIL_APP_PASSWORD` - App password for the onboarding sender.
- `BLOG_GMAIL_USER` - Gmail sender for blog-related emails (e.g. blog.poultrymarket@gmail.com).
- `BLOG_GMAIL_APP_PASSWORD` - App password for the blog sender.
- `EMAIL_FROM_NAME` - optional display name for the default sender.
- `REMINDER_EMAIL_FROM_NAME` - optional display name for the reminder sender.
- `NOTIFY_EMAIL_FROM_NAME` - optional display name for the notify sender.
- `ADMIN_EMAIL_FROM_NAME` - optional display name for the admin sender.
- `ONBOARD_EMAIL_FROM_NAME` - optional display name for the onboarding sender.
- `BLOG_EMAIL_FROM_NAME` - optional display name for the blog sender.
- `SUPPORT_EMAIL` - optional support reply-to address.

## Seeded Roles

Each new farm is created with three built-in roles:

- `Owner` - rank 100, full access, billing and ownership control.
- `Admin` - rank 50, farm management and member invites below own rank.
- `Viewer` - rank 10, read-only access.

Custom roles can be added per farm later and should keep a rank below the inviter's own rank.

## Permission Flow

Use the server-side permission service in `modules/farms/service.ts` and `modules/farms/permissions.ts`.

- `hasPermission` style checks should always happen on the server.
- Client-side checks should only control visibility and button state.
- Farm access is evaluated through the `farm_members` table and the role rank hierarchy.

## Invitation Flow

1. Owner or Admin opens the invite form.
2. The server creates or updates a pending `farm_members` row.
3. A secure token is hashed in the database and embedded in the email link.
4. The invitee opens `/accept-invitation?token=...&farmId=...`.
5. After login, the token is validated and the membership becomes active.

## Subscription Notes

Farms already store subscription-aware fields on the `farms` table:

- `subscriptionPlan`
- `subscriptionStatus`
- `subscriptionEndsAt`
- `billingEmail`
- `billingProvider`
- `billingReference`

This keeps workspace billing separate from the existing user-level subscription model and leaves room for future plan limits at the farm level.

## API Routes

- `POST /api/farms` - create a new farm and seed default roles.
- `GET /api/farms` - list farms the current user belongs to.
- `GET /api/farms/[farmId]` - fetch farm details, current membership, and permissions.
- `PATCH /api/farms/[farmId]` - update farm settings and subscription fields.
- `DELETE /api/farms/[farmId]` - delete a farm.
- `POST /api/farms/[farmId]/invitations` - invite a member by email.
- `GET /api/invitations/[token]` - validate invitation token.
- `POST /api/invitations/[token]/accept` - accept invitation after login.
- `GET /api/farms/[farmId]/members` - list members and assignable roles.
- `PATCH /api/farms/[farmId]/members/[memberId]` - change a member role.
- `DELETE /api/farms/[farmId]/members/[memberId]` - remove a member.

## Next Steps

When you are ready to fully migrate the app, point existing farm dashboard pages at the new farm-scoped APIs and pass the active `farmId` from the switcher into the existing farm pages.
