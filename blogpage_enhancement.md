Redesign the individual Poultry Market Kenya blog/article page into a professional editorial/news-style reading experience.

Do not simply change colors or spacing. Review the existing article page architecture and improve the entire reading experience, content rendering, tracking, recommendations, and responsive behavior.

## 1. Overall Editorial Layout

The article page should feel comparable to a professional publication rather than a basic CMS blog.

Desktop layout:

* Main article content: approximately 680–760px
* Right sidebar: approximately 280–340px
* Large whitespace between content and sidebar
* Sticky sidebar where appropriate
* Center the article container
* Avoid overly wide paragraphs

Structure:

```text
--------------------------------------------------
| Breadcrumbs                                     |
|                                                 |
| Category                                        |
| LARGE ARTICLE TITLE                             |
| Excerpt                                         |
| Author • Date • Reading time • Views            |
|                                                 |
| Featured Image                                  |
--------------------------------------------------
|                                                 |
| Article Content                    | Sidebar    |
|                                   |            |
|                                   | On this    |
|                                   | page       |
|                                   |            |
|                                   | Recommended|
|                                   | articles   |
--------------------------------------------------
| Recommended Articles                            |
--------------------------------------------------
```

On mobile:

```text
Breadcrumb
Category
Title
Excerpt
Author / metadata
Featured image
Reading progress
Article
Recommended posts
```

Do not allow the sidebar to make the article content too narrow on desktop.

---

# 2. Article Header

Create a premium article header.

Display:

* Category badge
* H1 title
* Short excerpt
* Author
* Author avatar
* Published date
* Last updated date if available
* Estimated reading time
* View count
* Share button
* Featured image

Example metadata:

```text
Poultry Health

5 Common Diseases Affecting Broilers in Kenya

Learn how to identify...
 
Ephey Nyaga
Published Aug 21, 2026
8 min read · 2,481 views
```

The title should have strong editorial typography.

Desktop H1 should be large but not excessively oversized.

Mobile typography must be optimized for smaller screens.

---

# 3. Reading Progress Bar

Add a thin reading-progress indicator at the top of the viewport.

It should:

* Start at 0%
* Reach 100% when the reader reaches the end of the article
* Update smoothly while scrolling
* Work on desktop, tablet and mobile
* Not interfere with navigation

Use the actual article content container to calculate progress rather than simply using the entire document height.

---

# 4. Better Markdown Rendering

The current Markdown renderer should be upgraded significantly.

Markdown must render professionally.

Support:

* H1–H6
* Paragraphs
* Bold
* Italics
* Strikethrough
* Ordered lists
* Unordered lists
* Nested lists
* Blockquotes
* Inline code
* Code blocks
* Tables
* Horizontal rules
* Images
* Links
* YouTube links
* Facebook links
* Embedded content
* Captions
* Footnotes if supported

Do not display raw Markdown syntax to users.

For example:

```markdown
## Signs of Newcastle Disease

**Important:** Early detection is critical.

> Farmers should isolate sick birds immediately.
```

must become visually polished HTML.

---

# 5. Typography and Readability

Prioritize reading comfort.

Article text should have:

* 17–19px desktop body text
* 16–18px mobile body text
* Approximately 1.65–1.85 line height
* Comfortable paragraph spacing
* Maximum content width around 680–760px
* Strong heading hierarchy
* Proper spacing before and after headings

Avoid:

* Extremely long lines
* Tiny text
* Excessive bold text
* Huge empty spaces
* Dense walls of text

Use readable typography suitable for long-form content.

---

# 6. Headings and Table of Contents

Automatically generate a table of contents from article headings.

Desktop:

Create a sticky "On this page" sidebar.

Example:

```text
ON THIS PAGE

Introduction
Common symptoms
Disease prevention
Treatment options
When to contact a vet
Conclusion
```

Highlight the section currently visible in the viewport.

Mobile:

Use a collapsible:

```text
On this page ▼
```

Do not manually maintain the table of contents. Generate it from the rendered Markdown headings.

---

# 7. Links Inside Articles

Improve normal links significantly.

Internal links should be visually identifiable but not distracting.

External links should:

* Open safely in a new tab where appropriate
* Use `rel="noopener noreferrer"` when required
* Clearly indicate external destinations where appropriate

Do not make every link look like a button.

---

# 8. Website Link Previews

When Markdown contains a URL to a website, create a rich link preview when possible.

For example:

```text
https://example.com/article
```

should not necessarily appear as a long ugly URL.

Instead render something like:

```text
┌─────────────────────────────────────┐
│ Website                              │
│ Example.com                          │
│ Article title                        │
│ Short description                    │
│                                     │
│ example.com →                        │
└─────────────────────────────────────┘
```

If Open Graph metadata can safely be retrieved server-side, use:

* `og:title`
* `og:description`
* `og:image`
* `og:site_name`
* favicon/domain

If metadata cannot be fetched, gracefully fall back to a clean URL card.

Do not make page rendering depend entirely on external metadata requests.

Cache preview metadata where appropriate.

---

# 9. YouTube Support

Detect YouTube URLs inside Markdown.

Examples:

```text
https://www.youtube.com/watch?v=...
https://youtu.be/...
```

Instead of displaying the raw URL, render a professional responsive YouTube preview.

Use:

* YouTube thumbnail
* Play button
* Video title if available
* Responsive 16:9 aspect ratio

The video should not break the article layout.

Avoid loading unnecessary third-party JavaScript until the user interacts with the video where practical.

If privacy-enhanced YouTube embedding is appropriate, use it.

---

# 10. Facebook Link Preview

Detect Facebook URLs.

If an article contains a Facebook post/video/page URL, render a professional Facebook preview where technically possible.

If the Facebook embed cannot be loaded because of Facebook restrictions, show a graceful fallback:

```text
Facebook
View this post on Facebook →
```

Never leave a large broken embed area.

---

# 11. Social Sharing

Add a compact share interface.

Support:

* Facebook
* WhatsApp
* X
* Copy link

On desktop:

Place sharing controls near the article header or as a floating share rail.

On mobile:

Use a compact share row.

The share buttons should not dominate the reading experience.

---

# 12. View Tracking

Implement reliable article view tracking.

Do NOT simply increment views every time the page loads.

A view should be counted after meaningful engagement, for example:

* User remains on the article for several seconds
* Or reaches a meaningful scroll threshold

Prevent obvious duplicate counting from rapid refreshes.

Track at least:

```text
article_id
timestamp
session identifier / anonymous identifier
referrer
device type
```

Respect privacy requirements and avoid collecting unnecessary personal information.

Display:

```text
2,481 views
```

in the article metadata.

Use a human-friendly formatter:

```text
999
1.2K
12.4K
1.2M
```

Do not expose internal analytics identifiers to users.

---

# 13. Reading Analytics

If the existing backend supports analytics, track useful engagement metrics such as:

* Article view
* Scroll depth
* 25% read
* 50% read
* 75% read
* 90% read
* Article completion
* Share click
* External link click
* Recommended article click

Do not send an event for every tiny scroll movement.

Throttle/debounce scroll tracking.

Keep analytics lightweight so they do not negatively affect page performance.

---

# 14. Reading Time

Calculate reading time from the actual article content.

Do not hardcode it.

Use an appropriate words-per-minute calculation.

For example:

```text
8 min read
```

The calculation should exclude:

* Navigation
* Sidebar
* Related posts
* Metadata

Only article content should contribute to reading time.

---

# 15. Recommended Articles

This is extremely important.

Recommended posts MUST NOT contain the current article.

For example:

```text
Current article:
How to Prevent Newcastle Disease

Recommended:
How to Vaccinate Broilers
How to Improve Broiler Feed Conversion
Common Poultry Diseases
```

Never:

```text
How to Prevent Newcastle Disease
How to Prevent Newcastle Disease
```

Filter recommendations by the current article ID.

---

# 16. Intelligent Recommendations

Recommendations should preferably be based on:

1. Same category
2. Related tags
3. Similar topics
4. Recently published content
5. Popular articles

Use a scoring system if possible.

Example:

```text
score =
category_match
+ tag_overlap
+ topic_similarity
+ popularity
+ freshness
```

Do not recommend the same article multiple times.

Remove duplicate IDs before rendering.

If there are insufficient related articles, gracefully fall back to latest articles.

---

# 17. Recommended Article Placement

Use recommendations in multiple appropriate locations.

### Sidebar

Show 3–5 compact recommended posts.

### After the article

Show 3 larger recommended cards.

### Optional mid-article recommendation

After a meaningful section, show one related article.

Do not interrupt the reader too aggressively.

Every recommendation must exclude the current article.

---

# 18. Recommended Card Design

Create different card variants rather than reusing the homepage card everywhere.

Sidebar:

```text
[thumbnail]

How to Improve Egg Production
5 min read
```

Bottom:

```text
------------------------------------
| image                            |
| Poultry Health                   |
| How to Prevent Common Diseases   |
| Short description                |
| 6 min read · 2.1K views          |
------------------------------------
```

Include:

* Image
* Category
* Title
* Short excerpt where appropriate
* Reading time
* Views

---

# 19. Article Images

Markdown images should be rendered professionally.

Support:

```markdown
![Description](image-url)
```

Render with:

* Responsive width
* Proper aspect ratio
* Rounded corners
* Lazy loading below the fold
* High-quality image handling
* Alt text
* Optional caption

Never allow oversized images to break the article container.

Clicking an image can optionally open a larger view.

---

# 20. Tables

Markdown tables should be responsive.

On mobile, do not allow the entire page to overflow horizontally.

Use a horizontally scrollable table container.

Example:

```text
| Feed | Age | Protein |
|------|-----|---------|
| Starter | 0–4 weeks | 22% |
```

should become a properly styled table.

---

# 21. Code Blocks

If technical articles contain code:

* Syntax highlighting
* Copy button
* Horizontal scrolling on mobile
* Proper spacing
* Dark/light theme compatibility

Do not let long code lines break the page.

---

# 22. Blockquotes / Important Information

Create polished callout styles.

Support semantic callouts such as:

```text
Important
Tip
Warning
Note
```

For example:

```text
┌─────────────────────────────────────┐
│ IMPORTANT                           │
│ Always isolate visibly sick birds.  │
└─────────────────────────────────────┘
```

These should be visually distinct but consistent with the Poultry Market brand.

---

# 23. Mobile Experience

Treat mobile as a first-class experience.

Requirements:

* No horizontal page overflow
* Comfortable 16–18px article text
* Large enough tap targets
* Sticky reading progress
* Collapsible table of contents
* Responsive images
* Responsive embeds
* Easy sharing
* Recommended posts stacked vertically
* No desktop sidebar
* No cramped metadata

Test at approximately:

```text
320px
375px
390px
430px
768px
1024px
1440px+
```

---

# 24. Tablet / Medium Screens

Do not treat tablet as either desktop or mobile.

For approximately 768–1100px:

* Keep article readable
* Reduce sidebar width
* Potentially move recommendations below the article
* Maintain comfortable margins
* Prevent cramped two-column layouts

The article should remain easy to read.

---

# 25. SEO

Preserve and improve SEO.

Ensure:

* One correct H1
* Semantic headings
* Canonical URL
* Article structured data
* Author information
* Published date
* Modified date
* Featured image metadata
* Breadcrumb structured data
* Open Graph metadata
* Twitter/X metadata

Do not create duplicate metadata.

Ensure article URLs remain stable.

---

# 26. Performance

The redesign must not make the article slower.

Use:

* Next.js Image
* Lazy loading
* Dynamic imports where appropriate
* Lazy third-party embeds
* Cached external preview metadata
* Minimal client-side JavaScript
* Server rendering where appropriate

Avoid loading Facebook/YouTube scripts for articles that do not contain those embeds.

---

# 27. Error Handling

External embeds and previews can fail.

Never show broken UI.

Examples:

YouTube fails:

```text
Unable to load video
Watch on YouTube →
```

Website metadata fails:

```text
example.com
Open website →
```

Facebook fails:

```text
View this content on Facebook →
```

Images fail:

Show a clean fallback image.

---

# 28. Architecture

Keep the implementation modular.

Create reusable components such as:

```text
ArticleHeader
ArticleContent
MarkdownRenderer
YouTubeEmbed
FacebookEmbed
LinkPreview
TableOfContents
ReadingProgress
ShareButtons
ArticleAnalytics
RecommendedPosts
RecommendedPostCard
ArticleSidebar
```

Do not put the entire article page into one huge component.

Keep Markdown parsing/rendering separate from the page layout.

---

# 29. Important Recommendation Logic

Before displaying recommended articles:

```text
currentArticleId !== recommendedArticle.id
```

Then:

* Remove duplicates
* Rank by relevance
* Limit the number returned
* Fill remaining slots with latest posts if necessary

The current article should NEVER appear in its own recommendations.

---

# 30. Final UX Goal

The final page should feel like a professional digital publication focused on poultry farming.

It should be:

* Editorial
* Clean
* Fast
* Highly readable
* SEO-friendly
* Mobile-first
* Data-driven
* Visually polished
* Professional

Most importantly, the article should feel pleasant to read for 5–15 minutes.

Do not redesign the page as a generic SaaS dashboard.

Preserve Poultry Market Kenya's existing branding and backend functionality where possible. Inspect the existing implementation first and reuse existing APIs, article data models, authentication, image infrastructure, and analytics infrastructure instead of unnecessarily replacing working systems.

Before finishing, test:

1. Markdown rendering
2. YouTube URLs
3. Facebook URLs
4. External website URLs
5. Images
6. Tables
7. Long titles
8. Long articles
9. Mobile layout
10. Tablet layout
11. Desktop layout
12. Reading progress
13. View counting
14. Duplicate view prevention
15. Recommended posts
16. Current article exclusion
17. Empty recommendations
18. Failed embeds
19. Failed images
20. SEO metadata

The result should be production-ready, not merely a visual mockup.
