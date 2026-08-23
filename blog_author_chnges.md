Redesign and improve the Poultry Market Kenya author profile system and the author presentation across the blog.

The goal is to make authors look credible and professional while giving them a meaningful reason to use Poultry Market as a publishing platform.

Do NOT make the application feel like a completely different product. Preserve the existing Poultry Market Kenya visual language, navigation, typography, colors, spacing, buttons, cards, theme system, and overall branding.

The author experience should feel like a natural extension of the existing blog.

## 1. First inspect the existing implementation

Before changing anything, inspect:

* Current author data model
* Author profile page
* Blog post author relationships
* Author card
* Blog article header
* Blog listing cards
* Authentication/user system
* Existing social/profile fields
* Existing image/avatar handling
* Existing database schema
* Existing API routes
* Existing blog submission/editing system

Reuse existing infrastructure wherever possible.

Do not create duplicate author systems.

---

# 2. Author Profile Information

Expand the author profile to support professional creator information.

An author should be able to have:

* Display name
* Username / author slug
* Profile photo
* Professional title
* Short bio
* Long bio / about section
* Location
* Email
* Website
* Social links
* Affiliate links
* Areas of expertise
* Poultry categories/topics they write about
* Joined date
* Number of published articles
* Optional verification status

Example:

```text id="x8m2qa"
Ephey Nyaga
Poultry Farming & Technology Writer

Kenya

Helping poultry farmers use practical technology,
better management systems and reliable farming knowledge.

12 articles · 8 min average read
```

Do not display unnecessary personal information.

---

# 3. Email

Add an email field to the author's profile.

Important:

Do not expose an author's private account/login email by default.

Support two concepts:

* Account email — private
* Public contact email — explicitly opted into by the author

The author should control whether their public email is displayed.

When enabled, show:

```text id="q2d8az"
Email author
```

Use a mailto link only when the author has explicitly enabled public contact.

Do not expose private authentication emails.

---

# 4. Social Links

Allow authors to add professional social links.

Support common platforms such as:

* Facebook
* Instagram
* X
* LinkedIn
* YouTube
* TikTok
* WhatsApp
* Website

Do not hard-code the visual design around one social network.

Create a reusable social-link component.

Example:

```text id="7h2k9m"
Follow Ephey

[Facebook] [Instagram] [X] [LinkedIn] [YouTube]
```

Use recognizable icons but keep them subtle.

Do not turn the author profile into a social-media dashboard.

---

# 5. Custom Social Links

Where possible, support a generic:

```text id="j7k2pl"
Platform
URL
Display label
```

This allows future platforms without requiring a database redesign.

Validate URLs.

Only allow safe HTTP/HTTPS URLs.

Normalize URLs where appropriate.

---

# 6. Affiliate Links

Add a dedicated section for author affiliate/recommended links.

This is an important part of the platform because authors should have an incentive to publish on Poultry Market Kenya.

Authors should be able to add products/services/resources they recommend.

Example:

```text id="p3k8az"
Recommended by Ephey

Farm Management Resources

[Product image]

Poultry Vaccination Guide
Practical guide for poultry farmers.

View recommendation →
```

Affiliate links should support:

* Title
* Description
* URL
* Image
* Optional merchant/platform name
* Optional affiliate disclosure
* Display order
* Active/inactive status

Do not expose raw affiliate URLs unnecessarily.

---

# 7. Affiliate Disclosure

This is important.

If an author earns commission from a link, clearly disclose it.

Example:

```text id="4kz9ws"
Some links may be affiliate links. If you purchase through
them, the author may earn a commission at no additional cost
to you.
```

Make this disclosure subtle but visible.

Do not hide affiliate relationships.

---

# 8. Affiliate Link Security

Never trust arbitrary affiliate URLs from users.

Validate:

* Protocol
* URL format
* Allowed schemes
* No javascript:
* No data:
* No malformed URLs

External affiliate links should use appropriate attributes such as:

```text id="2m4q8z"
rel="sponsored noopener noreferrer"
```

Use `sponsored` for paid/affiliate links where appropriate.

---

# 9. Author Profile Page Layout

Create a professional editorial author page.

Desktop:

```text id="9a7m2x"
--------------------------------------------------
| Avatar     Name                                 |
|            Professional title                   |
|            Location                             |
|            Bio                                  |
|            Social links                         |
|            Email                                |
--------------------------------------------------

Articles by [Author]

--------------------------------------------------
| Article | Article | Article                    |
--------------------------------------------------

Recommended resources

--------------------------------------------------
| Affiliate/recommended cards                     |
--------------------------------------------------
```

Do not make it resemble LinkedIn.

It should feel like an author page on a professional publication.

---

# 10. Author Header

Create a strong but simple author header.

Include:

* Avatar
* Name
* Professional title
* Bio
* Social links
* Public email if enabled
* Published article count
* Optional follower count if the platform already supports followers

Example:

```text id="c2v9kd"
[Avatar]

Ephey Nyaga
Poultry Technology Writer

12 published articles

Helping farmers use technology to improve poultry
management and productivity.

Facebook · Instagram · LinkedIn · YouTube
Email author
```

Avoid oversized hero graphics.

The author's expertise and content should remain the focus.

---

# 11. Author Expertise

Allow authors to specify areas of expertise.

Examples:

* Poultry Health
* Broiler Farming
* Layer Farming
* Poultry Nutrition
* Farm Management
* Poultry Business
* Technology

Display these as clean tags.

Do not make them look like generic hashtags.

---

# 12. Author's Articles

The author profile should prominently display their published articles.

Add:

```text id="0n5f4a"
Latest articles
```

Use the existing Poultry Market article-card system.

Do not create an entirely new card design.

Support:

* Pagination
* Cursor pagination if already used
* Category filtering
* Search if appropriate

Do not show unpublished/draft articles publicly.

---

# 13. Author Information on Blog Articles

The author information must appear consistently on individual blog posts.

At the top of the article:

```text id="j9s3qk"
[Avatar]

By Ephey Nyaga
Poultry Technology Writer

Published Aug 22, 2026 · 8 min read
```

Make the author name clickable.

Clicking it should open:

```text
/blog/author/[authorSlug]
```

or whatever canonical author route already exists.

Do not create inconsistent author URLs.

---

# 14. Author Card After Article

At the end of the article, create a premium author card.

Example:

```text id="m4w7qa"
--------------------------------------------------
| Avatar | Written by                             |
|        | Ephey Nyaga                            |
|        | Poultry Technology Writer              |
|        |                                        |
|        | Short bio...                            |
|        |                                        |
|        | [View profile] [Follow]                |
|        | Facebook Instagram LinkedIn             |
--------------------------------------------------
```

Include:

* Avatar
* Name
* Title
* Short bio
* Social links
* Follow button if supported
* View profile
* Public email if enabled

This should integrate naturally with the article.

---

# 15. Affiliate Links on Blog Articles

Do not overload every article with affiliate cards.

Affiliate recommendations should appear in appropriate places:

### Author profile

Full recommended resources section.

### Article

Only show relevant author recommendations when appropriate.

Example:

```text id="j6k2rx"
Recommended resources

Poultry Vaccination Guide
Recommended by Ephey

View resource →
```

Do not show unrelated affiliate products simply because the author has them in their profile.

---

# 16. Author Social Links on Blog Pages

The author's social links should also be available from:

* Article author header
* Author card
* Author profile

However, avoid displaying the same large collection of icons three times on one page.

Use responsive/context-aware presentation.

For example:

Article header:

```text id="q1n5av"
By Ephey Nyaga · 8 min read
```

Author card:

```text id="v4k8sa"
[Facebook] [Instagram] [LinkedIn] [YouTube]
```

Author profile:

Full social section.

---

# 17. Follow System

If `FollowButton` already exists, integrate it into the author experience.

Do not create a second follow system.

The author profile should show:

```text id="m7x3da"
Follow
```

Use the existing backend functionality.

If follower counts already exist, display them professionally.

Example:

```text id="9p2zsk"
1,248 followers
```

Do not fabricate follower counts.

---

# 18. Author Stats

Show useful publishing statistics.

Possible:

```text id="q8s1az"
12 Articles
4.8K Total Views
1.2K Followers
```

Only display metrics that actually exist in the backend.

Do not create fake engagement statistics.

If total author views are calculated, make sure they exclude duplicate/inflated view events according to the new article-view tracking system.

---

# 19. Verification

If the platform already has a verified-author concept, display it subtly.

Example:

```text id="x3m8qp"
Ephey Nyaga ✓
```

Do not introduce verification simply as a visual badge without an actual verification mechanism.

If verification does not currently exist, leave the data model ready for future implementation but don't fake verification.

---

# 20. Author SEO

Each author profile should have proper SEO.

Generate:

* Unique title
* Meta description
* Canonical URL
* Open Graph metadata
* Author structured data where appropriate
* Breadcrumb structured data
* Profile image metadata

Example:

```text id="b7k4mz"
Ephey Nyaga — Poultry Market Kenya

Poultry technology and farming writer sharing practical
knowledge on poultry health, management and technology.
```

Do not duplicate metadata across authors.

---

# 21. Author URL Structure

Use a stable canonical URL.

Preferred:

```text id="7n4qxa"
/blog/author/ephey-nyaga
```

or adapt to the existing project's canonical routing.

Do not create multiple URL formats for the same author.

If an old author URL exists, redirect it to the canonical URL.

---

# 22. Mobile Author Experience

Mobile is extremely important.

The author profile should become:

```text id="v6n8pq"
[Avatar]

Ephey Nyaga
Poultry Technology Writer

Bio...

12 articles

[Follow]

Facebook Instagram LinkedIn

Articles by Ephey

[Article]
[Article]
[Article]

Recommended resources
[Resource]
```

Avoid horizontal overflow.

Social icons should have sufficiently large tap targets.

Affiliate cards should become full-width.

---

# 23. Dark Mode

The author profile must work with the existing theme system.

Do not introduce a separate author-page theme.

Ensure:

* Cards
* Borders
* Text
* Social icons
* Affiliate cards
* Article cards
* Buttons

all work correctly in dark mode.

---

# 24. Design Language

Use the existing Poultry Market Kenya design system.

Do NOT create:

* LinkedIn-style profile pages
* Instagram-style profiles
* Completely different colors
* Huge gradient backgrounds
* Excessive glassmorphism
* Excessive animations
* Social-media dashboard layouts

The author page should look like:

"An expert author writing for a professional agricultural publication."

Not:

"A social network."

---

# 25. Database Design

Before adding fields, inspect the existing schema.

Prefer extending the existing author/user/profile model rather than creating duplicate tables.

If database changes are necessary, group author-related information logically.

Potential structure:

Author profile:

```text
bio
professionalTitle
location
website
publicEmail
showPublicEmail
avatar
```

Social links:

```text
platform
url
label
displayOrder
```

Affiliate resources:

```text
title
description
url
image
merchant
disclosure
active
displayOrder
```

Do not implement this exact schema blindly. Adapt it to the existing Prisma architecture.

Do not duplicate fields already present.

---

# 26. Author Dashboard

If authors can edit their profiles, add a professional profile-management section to their existing dashboard.

Sections:

```text
Profile
Social Links
Recommended Resources
Public Contact
Preview
```

Allow authors to preview how their profile will appear publicly.

For social links:

```text
+ Add social link
```

For affiliate resources:

```text
+ Add recommended resource
```

Allow:

* Edit
* Delete
* Reorder
* Enable/disable

---

# 27. Affiliate Motivation

The platform should subtly communicate the benefit to authors.

For example in the author dashboard:

```text
Build your audience on Poultry Market Kenya

Publish useful poultry content, grow your readership,
and share resources you recommend with your audience.
```

Do not make the platform look like an affiliate-marketing site.

The primary value proposition remains publishing and reaching poultry audiences.

---

# 28. Analytics

Where existing analytics infrastructure supports it, track:

* Author profile views
* Social-link clicks
* Public-email clicks
* Affiliate-link clicks
* Follow clicks
* Article clicks from author profile
* Recommended-resource impressions/clicks

Do not introduce a new analytics database if the existing `trackEvent()` infrastructure is sufficient.

Use meaningful event names.

Example:

```text id="n4s7xa"
author_profile_view
author_social_click
author_email_click
author_affiliate_click
author_follow
author_article_click
```

Do not track sensitive information.

---

# 29. Affiliate Click Tracking

Affiliate clicks should be measurable.

Where appropriate, record:

```text id="p7m2vk"
author
resource
article/profile source
timestamp
```

Prefer existing analytics infrastructure if sufficient.

Do not expose private tracking data publicly.

Do not modify the destination URL in a way that breaks affiliate attribution.

---

# 30. Performance

Author profiles should remain fast.

Use:

* Optimized avatar images
* Lazy loading for article images
* Server rendering where appropriate
* Cached author article queries
* Minimal client-side JavaScript
* Existing image infrastructure

Do not load unnecessary social-media SDKs simply because an author has a social link.

A social link is just a link.

---

# 31. Accessibility

Ensure:

* Social icons have accessible labels
* Email button has an accessible name
* Affiliate links have meaningful labels
* Images have alt text
* Keyboard navigation works
* Focus states are visible
* Color contrast meets accessibility requirements
* Buttons are sufficiently large on mobile

Do not rely on icons alone to communicate meaning.

---

# 32. Empty States

If an author has no:

* Social links
* Affiliate resources
* Bio
* Articles

the page should still look professional.

Do not display empty boxes.

For example:

If there are no affiliate resources, simply omit the section.

If there are no social links, don't show an empty social container.

---

# 33. Security

Validate all user-controlled fields.

Especially:

* Email
* Website
* Social URLs
* Affiliate URLs
* Display names
* Bios
* Image URLs

Sanitize rendered content.

Prevent:

* javascript URLs
* malicious HTML
* unsafe redirects
* XSS through profile fields
* unsafe affiliate destinations

Never trust URLs simply because they are entered by an authenticated author.

---

# 34. Final Integration

The same author data should power:

```text
Author Profile
        ↓
Blog Article Header
        ↓
Author Card
        ↓
Blog Listing Card
        ↓
Author Articles
        ↓
Social Links
        ↓
Recommended Resources
```

Do not create separate hard-coded author information for each location.

There should be one source of truth.

---

# 35. Final Quality Standard

The finished author experience should communicate:

> "This is a credible person publishing useful information on a serious poultry platform."

It should provide authors with real value:

* Professional identity
* Audience growth
* Social discovery
* Public contact
* Article portfolio
* Recommended resources
* Affiliate opportunities
* Author analytics

while keeping the Poultry Market Kenya brand consistent.

Before finishing, test:

1. Author with complete profile
2. Author with minimal profile
3. Author without social links
4. Author with multiple social links
5. Author with public email enabled
6. Author with public email disabled
7. Author with affiliate resources
8. Author without affiliate resources
9. Multiple affiliate resources
10. Affiliate URL validation
11. Social URL validation
12. Author profile on mobile
13. Author profile on tablet
14. Author profile on desktop
15. Dark mode
16. Article author header
17. Article author card
18. Author article listing
19. Follow button
20. Social click analytics
21. Affiliate click analytics
22. SEO metadata
23. Canonical author URLs
24. Accessibility
25. No duplicate author records/data
26. No broken existing blog functionality

Do not remove existing blog features while implementing this.

The final result should feel like a polished **professional author/publisher ecosystem inside Poultry Market Kenya**, not a separate social network.
