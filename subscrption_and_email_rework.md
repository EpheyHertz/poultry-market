You are working on the existing Poultry Market Kenya application.

Your task is to **audit, repair, redesign, and productionize the entire email/subscription experience** while preserving the existing application architecture, authentication, database, email provider, blog system, and existing business logic wherever possible.

This is NOT a request to create a separate email application.

The goal is to make Poultry Market's email system feel like a professional SaaS/newsletter platform with:

* Reliable email subscriptions
* Email verification
* Resend verification
* Subscription preferences
* Topic-based blog subscriptions
* Automatic blog emails
* Different email experiences for subscribers vs normal users
* Professional admin email management
* Manual sending and resending from the admin dashboard
* Proper unsubscribe/preferences management
* Robust error handling
* No duplicate emails
* No broken or confusing subscription states
* Good dark/light mode support
* Mobile-responsive UI

IMPORTANT:
Before changing anything, inspect the EXISTING implementation thoroughly.

Find and understand:

1. Existing email subscription database models
2. Existing user/subscriber models
3. Existing Clerk authentication
4. Existing blog publishing system
5. Existing email provider configuration
6. Existing Resend/Nodemailer/email utilities
7. Existing scheduled jobs/cron/background workers
8. Existing blog notification logic
9. Existing admin dashboard
10. Existing unsubscribe functionality
11. Existing email verification implementation
12. Existing environment variables
13. Existing API routes/server actions
14. Existing subscription UI/components

Do NOT create duplicate models or duplicate email infrastructure if equivalent functionality already exists.

Use the existing architecture and improve it.

==================================================
PHASE 1 — FULL EMAIL SYSTEM AUDIT
=================================

First inspect the complete email flow from:

USER ENTERS EMAIL
→ SUBSCRIPTION CREATED
→ VERIFICATION EMAIL
→ VERIFICATION LINK
→ VERIFIED SUBSCRIBER
→ PREFERENCES
→ BLOG PUBLISHED
→ AUTOMATIC EMAIL
→ UNSUBSCRIBE / PREFERENCES

Identify why the current subscription system is not working.

Check for:

* Database errors
* Incorrect verification token handling
* Expired tokens
* Incorrect callback URLs
* Incorrect domain configuration
* Email provider failures
* Resend API failures
* Incorrect environment variables
* Duplicate subscription records
* Case-sensitive email comparison
* Incorrect subscription status
* Broken verification routes
* Incorrect redirect logic
* Server/client component problems
* Race conditions
* Cron failures
* Blog publishing integration failures
* Emails being sent to unverified users
* Emails being sent to unsubscribed users
* Duplicate blog notifications
* Incorrect unsubscribe links
* Missing preference handling

Do not simply patch symptoms.

Find the actual cause and fix the system at its architectural level.

==================================================
PHASE 2 — PROFESSIONAL SUBSCRIPTION EXPERIENCE
==============================================

Redesign the subscription experience to feel trustworthy and professional.

The subscription form should allow a visitor to enter:

Email address

Then show a clean state depending on the subscriber's status.

Possible states:

1. NEW EMAIL

Display:

"Check your inbox"

Explain that a verification email has been sent.

Provide:

"Resend verification email"

and

"Change email"

2. EMAIL EXISTS BUT IS NOT VERIFIED

THIS IS VERY IMPORTANT.

If a user enters an email address that already exists in the subscription database but has NOT been verified:

DO NOT create another subscription.

DO NOT show a generic "already subscribed" error.

Instead:

Recognize the existing unverified subscription.

Allow the user to continue with verification.

Display something like:

"This email is already registered but hasn't been verified yet."

Then provide:

"Resend verification email"

The user should be able to continue normally.

3. ALREADY VERIFIED

If the email is already verified:

Do NOT create a duplicate.

Show:

"You're already subscribed."

Then provide:

"Manage preferences"

4. PREVIOUSLY UNSUBSCRIBED

If the email previously subscribed but unsubscribed:

Allow the user to resubscribe.

Do not create unnecessary duplicate records.

Restore the subscription appropriately while respecting audit history.

==================================================
PHASE 3 — VERIFICATION SYSTEM
=============================

Build a robust verification system.

Verification emails must contain:

* Professional Poultry Market branding
* Clear subject
* Short explanation
* Verification CTA
* Expiration information
* Support/contact information
* Preferences/manage subscription link where appropriate

Verification tokens must be:

* Cryptographically secure
* Single-use
* Expirable
* Stored safely
* Invalidated after successful verification

Do not store raw sensitive tokens if the existing architecture allows hashed tokens instead.

Add protection against:

* Token reuse
* Expired tokens
* Token guessing
* Excessive resend requests
* Email enumeration
* Duplicate subscriptions

Implement a sensible resend cooldown/rate limit.

Example:

A user can request another verification email, but repeated requests should not result in unlimited email abuse.

The UI should clearly communicate when the user can resend.

==================================================
PHASE 4 — SUBSCRIBER PREFERENCES
================================

Add a professional subscription preferences system.

Users should be able to select what they want to receive.

Example categories:

* Poultry Farming
* Poultry Health & Diseases
* Poultry Feeding
* Poultry Business & Markets
* Poultry Management
* Poultry Technology & AI
* Poultry News
* Beginner Poultry Farming
* Commercial Poultry Farming
* Poultry Market Updates

Use the categories that fit the EXISTING blog taxonomy.

DO NOT create duplicate taxonomy systems if the blog already has categories/tags.

Preferences should be stored in the database.

Allow users to:

* Subscribe
* Unsubscribe
* Select topics
* Change topics
* Change email preferences
* Manage frequency where supported

Possible frequency options:

* Important updates
* New blogs
* Weekly digest

Do not implement complicated scheduling if the existing architecture cannot support it reliably.

Keep the system maintainable.

==================================================
PHASE 5 — PROFESSIONAL SUBSCRIBER EMAILS
========================================

There must be a clear distinction between:

A. Transactional emails
B. Subscriber emails
C. User/account emails
D. Admin/manual emails

TRANSACTIONAL EMAILS:

Examples:

* Email verification
* Password/account-related emails where applicable
* Important system notifications

These should not be treated as marketing/newsletter emails.

SUBSCRIBER EMAILS:

These are content emails.

Examples:

* New blog notification
* Weekly poultry digest
* Topic-specific blog notification
* Important Poultry Market updates

USER EMAILS:

Authenticated users can receive relevant platform/account communications.

ADMIN EMAILS:

Admins should be able to manually send approved communications.

==================================================
PHASE 6 — AUTOMATIC BLOG EMAILS
===============================

Connect the email system properly to the existing blog publishing system.

When a blog is published:

Determine whether the blog should trigger subscriber notification.

Do NOT automatically send emails for every internal draft/update.

Only published content should qualify.

Use subscriber preferences.

Example:

A subscriber selected:

Poultry Health

When a new Poultry Health blog is published:

That subscriber receives the email.

A subscriber who did not select that topic should not receive it, unless they selected a broader category such as "All blogs".

Prevent duplicate sends.

Create an email-delivery record or equivalent mechanism if the existing database architecture supports it.

The system must know:

* Which blog was emailed
* Which subscriber received it
* When it was sent
* Whether delivery succeeded
* Whether it failed
* Whether it was retried

This is important for reliability.

==================================================
PHASE 7 — EMAIL DESIGN
======================

Redesign all Poultry Market emails professionally.

Use a consistent email design system.

Every email should have:

* Poultry Market logo/branding
* Professional typography
* Clear hierarchy
* Strong CTA
* Short readable sections
* Responsive layout
* Footer
* Manage preferences link
* Unsubscribe link where legally/appropriately required
* Poultry Market website link

Blog emails should include:

* Blog title
* Featured image where available
* Short excerpt
* Topic/category
* Author where appropriate
* "Read the full article" CTA
* Optional related content

Do NOT send the entire article by default.

The email should drive readers back to Poultry Market.

Use absolute production URLs, not localhost URLs.

==================================================
PHASE 8 — ADMIN EMAIL DASHBOARD
===============================

Create/rework the existing admin email page.

DO NOT create a completely separate admin application.

Integrate into the current admin dashboard.

The admin email page should provide:

EMAIL OVERVIEW

Display:

* Total subscribers
* Verified subscribers
* Unverified subscribers
* Unsubscribed users
* Active subscribers
* Recent email activity
* Failed deliveries
* Emails sent

SUBSCRIBER MANAGEMENT

Allow admins to:

* Search by email
* Filter by status
* Filter by topic
* View subscriber
* View verification status
* View preferences
* Resend verification
* Manually subscribe/unsubscribe where appropriate
* View subscription history

Do not expose unnecessary private information.

==================================================
PHASE 9 — ADMIN COMPOSE EMAIL
=============================

Add a professional email composer.

Admin should be able to select:

Audience:

* All verified subscribers
* Subscribers by topic
* Selected subscribers
* Users where appropriate

Email type:

* Newsletter
* Blog announcement
* Important update
* Custom announcement

Fields:

* Subject
* Preview text
* Content
* CTA
* Optional image
* Optional blog/article link

Provide:

Preview

Send test email

Send

For large audiences, NEVER send hundreds/thousands of emails synchronously in a single HTTP request.

Use the existing queue/background/scheduled architecture where available.

If a queue exists, use it.

If a queue does not exist, implement the simplest reliable background processing mechanism supported by the existing application.

Do not introduce unnecessary infrastructure.

==================================================
PHASE 10 — RESEND / SEND AGAIN
==============================

Admins need the ability to resend emails.

Examples:

* Resend verification email
* Resend failed email
* Resend a previous campaign where appropriate

Do NOT blindly duplicate messages.

Show clear confirmation before sending.

For failed emails:

Allow:

"Retry failed"

For verification:

"Resend verification"

For campaigns:

"Duplicate campaign" or equivalent if appropriate.

Maintain delivery records.

==================================================
PHASE 11 — EMAIL HISTORY
========================

Add an email activity/history section.

Admins should see:

* Subject
* Email type
* Audience
* Sent date
* Number of recipients
* Successful sends
* Failed sends
* Status

Statuses can include:

* Draft
* Queued
* Sending
* Sent
* Partially failed
* Failed

Allow opening an email campaign to inspect its details.

==================================================
PHASE 12 — UNSUBSCRIBE & PREFERENCES
====================================

Every subscriber email should provide a professional footer.

Include:

"Manage email preferences"

"Unsubscribe"

Do not make unsubscribe difficult.

The unsubscribe page should allow:

* Unsubscribe from all emails
* Keep selected topics
* Change preferences

Example:

"You're receiving this because you subscribed to Poultry Market updates."

Then:

[Manage preferences]

[Unsubscribe from all]

After unsubscribing:

Show a professional confirmation page.

Allow the user to resubscribe later.

==================================================
PHASE 13 — DATABASE DESIGN
==========================

Before creating migrations, inspect the current schema.

Reuse existing models.

Only add fields/models where genuinely required.

The system may require concepts such as:

Subscriber

Subscription status

Verification token

Verification expiry

Topics/preferences

Email campaigns

Email delivery records

But DO NOT blindly create all of these if equivalent tables already exist.

Normalize email addresses consistently.

For example:

* Trim whitespace
* Lowercase for lookup/comparison

Use unique constraints to prevent duplicate subscriptions.

Add indexes for:

* Email
* Verification status
* Subscription status
* Topic preferences
* Campaign status
* Delivery status

Use database transactions where necessary.

==================================================
PHASE 14 — SECURITY
===================

This is a production email system.

Implement:

* Rate limiting
* Verification token expiry
* Secure token generation
* Authorization for admin functions
* Admin-only email sending
* Input validation
* HTML sanitization
* Protection against header injection
* Protection against duplicate sends
* Protection against email enumeration where appropriate
* CSRF protection where applicable
* Audit logging for administrative email actions

Never expose email-provider API keys to the client.

All email provider credentials remain server-side environment variables.

==================================================
PHASE 15 — EMAIL PROVIDER
=========================

Inspect the existing email provider implementation.

If the application already uses Resend, keep Resend unless there is a concrete technical reason not to.

Do not introduce another email provider simply because it exists.

Verify:

* API key
* Sender domain
* From address
* Reply-to
* Production domain
* DNS requirements
* Error handling
* API response handling

Centralize email sending into a reliable server-side service if the current implementation is fragmented.

Example conceptual structure:

email/
service
templates
verification
newsletter
blog-notification
preferences
unsubscribe

But follow the project's actual architecture rather than forcing this exact structure.

==================================================
PHASE 16 — AUTOMATION
=====================

The automation should work like this:

BLOG PUBLISHED
↓
Determine blog category/topics
↓
Find active verified subscribers
↓
Match subscriber preferences
↓
Create email delivery jobs
↓
Send emails through email provider
↓
Record success/failure
↓
Retry appropriate failures
↓
Update campaign/delivery status

Do not perform the entire operation inside the blog publishing HTTP request if that could cause timeouts.

Publishing a blog must remain fast.

Email sending should happen asynchronously whenever possible.

==================================================
PHASE 17 — ADMIN CONTROLS
=========================

Add admin controls for:

* Enable/disable automatic blog emails
* Enable/disable specific email types
* Configure default sender information
* View email statistics
* Retry failed emails
* Resend verification
* Manage campaigns
* Manage subscribers
* Review email templates

Do not expose provider secrets.

==================================================
PHASE 18 — FRONTEND UX
======================

The UI should be polished.

Support:

* Dark mode
* Light mode
* Mobile
* Desktop
* Loading states
* Empty states
* Error states
* Success states
* Toasts where appropriate
* Accessible forms
* Disabled buttons during requests
* Clear validation

Avoid ugly technical messages such as:

"409 Conflict"

"Unique constraint failed"

Instead translate technical failures into professional user-facing messages.

Example:

"This email is already registered. If you haven't verified it yet, you can request a new verification email."

==================================================
PHASE 19 — DO NOT BREAK EXISTING SYSTEMS
========================================

Preserve:

* Clerk authentication
* Existing users
* Existing blogs
* Existing author system
* Existing blog categories
* Existing admin authorization
* Existing email provider
* Existing database
* Existing production URLs
* Existing subscription data

Do not perform destructive migrations.

Do not delete existing subscriber records.

Do not create duplicate user systems.

Do not create a second blog taxonomy.

Do not create a second email provider.

Do not create unnecessary microservices.

==================================================
PHASE 20 — TESTING
==================

After implementation, test the complete lifecycle.

TEST 1:

New email

→ subscribe

→ verification email

→ click verification

→ verified

TEST 2:

Existing unverified email

→ enter email

→ system recognizes it

→ resend verification

→ verify successfully

TEST 3:

Existing verified email

→ enter email

→ no duplicate

→ manage preferences

TEST 4:

Unsubscribed email

→ resubscribe

→ preferences restored

TEST 5:

Select Poultry Health

→ publish Poultry Health blog

→ subscriber receives notification

TEST 6:

Subscriber does not select Poultry Health

→ publish Poultry Health blog

→ subscriber does NOT receive topic-specific notification

TEST 7:

Admin sends campaign

→ campaign queued

→ emails sent

→ delivery records created

TEST 8:

Email failure

→ delivery marked failed

→ admin can retry

TEST 9:

Unsubscribe

→ click unsubscribe

→ subscription disabled

→ future automated emails excluded

TEST 10:

Admin resend verification

→ new verification email generated

→ previous token invalidated/handled safely

==================================================
FINAL REQUIREMENT
=================

Before finishing:

1. Inspect the current implementation.
2. Explain what was causing the existing subscription system to fail.
3. Implement the fix.
4. Implement the professional subscription UX.
5. Implement verification + resend.
6. Implement topic preferences.
7. Implement automatic blog notifications.
8. Implement unsubscribe/preferences management.
9. Implement the professional admin email page.
10. Implement email history/delivery tracking.
11. Implement safe retry/resend.
12. Ensure asynchronous sending so blog publishing does not timeout.
13. Preserve existing architecture wherever possible.
14. Run lint/type checks/tests.
15. Check all production URLs and environment-variable usage.
16. Do not leave TODO placeholders.
17. Do not fabricate functionality that the existing infrastructure cannot support.
18. Keep the implementation production-ready but simple.

MOST IMPORTANT:

The system must behave like a trustworthy professional platform.

A subscriber should never wonder:

"Did my subscription work?"

An admin should never wonder:

"Who received this email?"

And publishing a blog should never become slow or timeout because the application is waiting for email delivery.
