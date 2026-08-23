Extend the existing author-profile system to support affiliate/recommended resources with automatic URL validation and professional preview cards.

The existing author-profile implementation is already centralized and working. Build this feature on top of that foundation.

Do not create a separate affiliate platform or change the overall Poultry Market Kenya design language.

## 1. Affiliate Resource Management

Add a "Recommended Resources" section to the author's dashboard.

Authors should be able to:

* Add a resource
* Paste an affiliate URL
* Validate the URL
* Preview the destination
* Edit the title/description if needed
* Upload/choose an image if automatic metadata is unavailable
* Enable/disable the resource
* Delete the resource
* Reorder resources

Example:

```text
Recommended Resources

[ + Add resource ]

Resource URL
https://www.amazon.com/...

[Check link]

Preview
---------------------------------------
| Product image                       |
|                                     |
| Product title                       |
| Short description                   |
| Amazon                              |
|                                     |
| View recommendation →               |
---------------------------------------

[Save resource]
```

---

# 2. Support Amazon

Amazon links must be recognized automatically.

Support common Amazon URL formats, including:

```text
https://www.amazon.com/...
https://www.amazon.co.uk/...
https://www.amazon.de/...
https://www.amazon.co.ke/...
https://amzn.to/...
```

Do not assume every Amazon URL is an affiliate link.

Treat the URL as an author's external recommendation and allow the author to specify whether it is an affiliate link.

---

# 3. Support Other Affiliate Platforms

Do not hard-code the system around Amazon.

The architecture should support other merchants and affiliate networks.

Examples may include:

* Amazon
* Jumia
* eBay
* AliExpress
* Shopify stores
* Direct merchant websites
* Other affiliate networks

The system should identify the destination domain.

Example:

```text
amazon.com
jumia.co.ke
ebay.com
example-store.com
```

Do not require a new code change every time an author adds a different merchant.

---

# 4. URL Security

Never blindly accept a user-provided URL.

Only allow:

```text
http://
https://
```

Reject:

```text
javascript:
data:
file:
ftp:
```

Normalize URLs before storing them.

Prevent:

* XSS
* Open redirects
* Malicious URL schemes
* Localhost URLs
* Private network destinations
* Internal service URLs

Do not expose an unrestricted URL-fetching proxy.

---

# 5. Affiliate URL Validation

When the author pastes a URL, perform a server-side validation.

The system should check:

1. Is the URL syntactically valid?
2. Is the scheme HTTP/HTTPS?
3. Is the destination safe?
4. Does the URL resolve?
5. What is the final destination after redirects?
6. What domain does it belong to?
7. Can metadata be extracted?

Example response:

```text
✓ Valid URL

Amazon
Product page detected

Destination:
amazon.com

Preview available
```

If invalid:

```text
Unable to validate this URL.

Please check that you entered a valid
HTTP or HTTPS URL.
```

---

# 6. Redirect Handling

Affiliate URLs commonly redirect.

For example:

```text
amzn.to → amazon.com/product/...
```

The validator should safely follow redirects where appropriate.

However:

* Limit redirect count
* Revalidate every redirect target
* Block private/internal IPs
* Block localhost
* Enforce HTTP/HTTPS
* Enforce timeout
* Do not follow dangerous schemes

Never allow a redirect chain to bypass SSRF protection.

---

# 7. Product / Website Metadata

After validation, attempt to retrieve metadata from the destination.

Look for:

```text
og:title
og:description
og:image
og:site_name
og:type
```

Also support useful fallback metadata where available.

For Amazon or other product pages, use:

* Product title
* Product image
* Description
* Merchant/domain

Do not scrape aggressively or bypass website protections.

If metadata is unavailable, allow the author to manually provide:

* Title
* Description
* Image

---

# 8. Preview Card

Generate a professional preview card.

Example:

```text
┌──────────────────────────────────────┐
│                                      │
│        PRODUCT IMAGE                 │
│                                      │
├──────────────────────────────────────┤
│ Amazon                               │
│                                      │
│ Automatic Poultry Feeder             │
│                                      │
│ Recommended equipment for poultry    │
│ farmers.                             │
│                                      │
│ View recommendation →                │
└──────────────────────────────────────┘
```

The card should use the existing Poultry Market card design language.

Do not make it resemble an Amazon advertisement.

It should look like:

**"Recommended by this author"**

rather than:

**"Buy this product from Amazon."**

---

# 9. Merchant Identification

Show the merchant/domain subtly.

Examples:

```text
Amazon
```

```text
Jumia
```

```text
example-store.com
```

If the merchant cannot be reliably identified, display the domain.

Do not fabricate merchant names.

---

# 10. Affiliate Disclosure

If the author marks the link as an affiliate link, display a small disclosure.

Example:

```text
Affiliate link
```

or:

```text
Some links may earn the author a commission at no
additional cost to you.
```

Keep this professional and unobtrusive.

The disclosure should be visible before/around the outbound link.

---

# 11. Link Attributes

Affiliate outbound links should use:

```html
rel="sponsored noopener noreferrer"
```

where appropriate.

External non-affiliate links should use appropriate security attributes.

Do not accidentally add `sponsored` to ordinary editorial references.

---

# 12. Where Affiliate Cards Appear

Affiliate resources should appear in:

### Author profile

Create:

```text
Recommended by [Author]
```

with a grid/list of resources.

### Article author card

Do NOT show a large affiliate section here.

Instead optionally show:

```text
Recommended resources →
```

### Article body

Only show an affiliate card when the article specifically references the resource or the author has deliberately associated the resource with that article.

Do not automatically insert affiliate cards into every article.

---

# 13. Article-Specific Recommendations

Allow an author to optionally associate a recommended resource with specific articles.

Example:

Article:

```text
Best Poultry Feeders for Small Farms
```

Recommended:

```text
Automatic Poultry Feeder
Amazon
```

But another article:

```text
How to Vaccinate Chickens
```

should not automatically show that feeder.

This prevents irrelevant affiliate content.

---

# 14. Author Dashboard

Add a clean interface:

```text
Profile
Social Links
Expertise
Recommended Resources
```

Recommended Resources:

```text
+ Add recommendation

---------------------------------------
Automatic Poultry Feeder
Amazon
✓ Active

[Edit] [Disable] [Delete]
---------------------------------------

Poultry Health Guide
example.com
✓ Active

[Edit] [Disable] [Delete]
---------------------------------------
```

Allow drag/reorder if practical.

---

# 15. Automatic Preview While Adding

The best UX should be:

```text
Paste URL
     ↓
Check link
     ↓
Validate
     ↓
Fetch metadata
     ↓
Show preview
     ↓
Author confirms
     ↓
Save
```

Do not require the author to manually enter the title if metadata is available.

However, allow editing the generated title and description before saving.

---

# 16. Caching

Do not fetch the same external page repeatedly.

Cache preview metadata for approximately 24 hours.

Reuse the existing link-preview infrastructure from the article redesign.

Do not create duplicate link-preview implementations.

If a generic `LinkPreview` service already exists, extend it rather than creating another one.

---

# 17. SSRF Protection

This is mandatory.

The server-side metadata fetcher must:

* Allow only HTTP/HTTPS
* Block localhost
* Block loopback
* Block private IPv4 ranges
* Block private IPv6 ranges
* Block link-local addresses
* Block cloud metadata endpoints
* Validate DNS resolution
* Revalidate redirect destinations
* Limit response size
* Set a short timeout
* Limit redirects
* Rate-limit preview requests

Do not allow the preview endpoint to become an arbitrary server-side request proxy.

---

# 18. Response Size

Do not download entire websites.

Limit metadata fetches to a reasonable response size, such as approximately 512 KB.

Abort the request when the limit is exceeded.

Only the initial HTML required for metadata should be processed.

---

# 19. Preview Images

Use `og:image` where available.

Validate the image URL.

Do not blindly proxy arbitrary images through the application.

If the image cannot be loaded safely:

Use a Poultry Market fallback image or merchant/domain placeholder.

The card must never have a broken-image appearance.

---

# 20. Amazon-Specific Considerations

Do not depend on scraping Amazon pages aggressively.

Amazon may:

* block automated requests
* return incomplete metadata
* change page structure
* require JavaScript
* restrict automated access

Therefore:

1. Attempt safe OG metadata retrieval.
2. If metadata is available, use it.
3. If unavailable, show a clean Amazon/domain card.
4. Allow the author to manually provide title/image/description.
5. Never attempt to bypass Amazon protections.

Do not build the feature around fragile Amazon HTML selectors.

---

# 21. Affiliate Link Normalization

Preserve affiliate tracking parameters.

Do NOT strip parameters blindly.

For example:

```text
?tag=author-20
```

may be essential to affiliate attribution.

Only remove clearly unnecessary tracking parameters if there is a deliberate allowlist/normalization policy.

Default behavior should be to preserve the author's affiliate URL.

---

# 22. Click Tracking

Use the existing `trackEvent()` infrastructure.

Track:

```text
affiliate_resource_click
```

Include non-sensitive context such as:

```text
resourceId
authorId
articleId
merchant/domain
placement
```

Possible placement values:

```text
author_profile
article
author_card
```

Do not create a new analytics database if the existing analytics system is sufficient.

Do not send the affiliate URL itself to analytics if unnecessary.

---

# 23. SEO

Affiliate/resource cards should not interfere with article SEO.

Do not create indexable duplicate pages for every affiliate resource.

Outbound links should remain normal external links.

Do not create thousands of internal pages solely for affiliate URLs.

---

# 24. Performance

The author profile must remain fast.

Do not fetch affiliate URLs while rendering the public author page.

Preview metadata should already be stored/cached after the author adds the resource.

Public pages should use stored metadata:

```text
title
description
image
domain
merchant
```

rather than making a request to Amazon or another merchant every time a visitor opens the author profile.

This is critical.

---

# 25. Database Changes

The current implementation explicitly avoided database migrations because the existing schema did not contain affiliate-resource fields.

Now that this feature is being added, create a proper migration rather than trying to store affiliate data in unrelated fields.

Use the existing Prisma architecture.

Prefer a dedicated model such as:

```text
AuthorResource
```

or an equivalent name that fits the existing schema.

Potential fields:

```text
id
authorId
title
description
url
domain
merchant
imageUrl
isAffiliate
affiliateDisclosure
active
displayOrder
createdAt
updatedAt
```

If article-specific recommendations are required, use a proper relationship rather than storing article IDs in a text field.

Before implementing, inspect the current schema and adapt names/types to existing conventions.

---

# 26. Do Not Duplicate Authors

Resources must belong to the existing author/profile system.

Do not create:

```text
AffiliateAuthor
```

or another author model.

Use the existing author identity.

---

# 27. Professional Public Design

On the author profile:

```text
Recommended resources

Resources selected by Ephey for poultry
farmers and readers.

┌──────────────────────┐
│      IMAGE           │
│                      │
│ Poultry Feeder       │
│ Amazon               │
│ Recommended resource │
│                      │
│ View recommendation →│
└──────────────────────┘
```

Use the same:

* Border radius
* Typography
* Shadows
* spacing
* buttons
* dark mode
* responsive behavior

as the rest of Poultry Market.

Do not introduce a new visual system.

---

# 28. Mobile

On mobile:

```text
Recommended resources

┌─────────────────────┐
│ Image               │
│                     │
│ Product title       │
│ Amazon              │
│ Description         │
│                     │
│ View recommendation │
└─────────────────────┘
```

Cards should be full-width or use a clean two-column layout where appropriate.

Never cause horizontal overflow.

---

# 29. Empty States

If an author has no recommendations:

Do not display an empty section.

Simply omit:

```text
Recommended resources
```

until the author adds their first resource.

---

# 30. Final Acceptance Tests

Test at minimum:

### Amazon

* Amazon direct URL
* Amazon affiliate URL
* `amzn.to` URL
* Redirected Amazon URL
* Missing Amazon metadata

### Other merchants

* Normal ecommerce URL
* Affiliate-network URL
* Direct merchant URL
* URL with tracking parameters

### Security

* localhost
* private IP
* malformed URL
* javascript URL
* data URL
* redirect to private IP
* redirect chain
* oversized response
* timeout

### UI

* Valid preview
* Missing image
* Missing description
* Missing title
* Long title
* Long description
* Dark mode
* Mobile
* Desktop

### Integration

* Author profile
* Article author card
* Article-specific recommendation
* Affiliate disclosure
* Click tracking
* Existing social links
* Existing follow functionality

The final result should allow an author to paste an Amazon or other affiliate URL, verify it, see exactly how the recommendation will look, and publish it as a polished Poultry Market recommendation card — while keeping the platform looking like a professional poultry publication rather than an affiliate marketplace.
