# Author Profile System — Implementation Notes

Implements `blog_author_chnges.md` against the **existing** Poultry Market Kenya
infrastructure. No parallel author system was created, no existing blog feature
was removed, and nothing was faked.

`§n` below refers to the numbered sections of `blog_author_chnges.md`.

---

## 1. What already existed (inspected before writing anything, §1)

| Concern | Existing implementation |
| --- | --- |
| Data model | `AuthorProfile` (1:1 with `User`), `BlogPost.authorProfileId`, `Follow`, `AuthorWallet` |
| Canonical route | `/author/[username]` |
| Legacy route | `app/blog/author/[id]` — already `permanentRedirect`s to the canonical URL (§21) |
| Follow system | `components/blog/follow-button.tsx` + `/api/blog/follow` (§17) |
| Article cards | `components/blog/blog-card.tsx` → `GridCard` (§12) |
| Analytics | `trackEvent()` from `components/analytics/google-analytics` (§28) |
| Images | `next/image` + Cloudinary via `/api/upload` (§30) |
| Verification | Real `AuthorProfile.isVerified` column, set by the platform — never self-granted (§19) |

Every author field the spec asks for **already had a column**, so **no Prisma
migration was required** for anything shipped here:

```
displayName username bio tagline avatarUrl coverImageUrl website location
occupation company expertise[] twitterHandle linkedinUrl githubUsername
facebookUrl instagramHandle youtubeChannel isPublic isVerified showEmail
allowComments emailOnComment emailOnFollow totalViews totalLikes totalPosts
```

---

## 2. One source of truth — `lib/author-profile.ts` (new, §34)

Dependency-free so both server components and client components import it.

- `getAuthorProfileHref(username)` — the single canonical `/author/{username}` builder (§21).
- `sanitizeExternalUrl()` — http(s) only; rejects `javascript:`, `data:`, `mailto:` and
  malformed hosts; upgrades bare hosts to `https://` (§8, §33).
- `buildAuthorSocialLinks()` — accepts a **handle or a full URL** per platform, normalises
  to `facebook.com/x`, `instagram.com/x`, `x.com/x`, `linkedin.com/in/x`, `youtube.com/@x`,
  `github.com/x` + website, validates, de-duplicates, returns `[]` when nothing is valid (§4, §5, §32).
- `resolveAuthorContactEmail({ showEmail, email })` — returns `null` unless the author
  explicitly opted in **and** the address is well-formed. The private account email is
  never returned otherwise (§3).
- `buildProfessionalTitle(occupation, company)` — `"Role at Org"` fallback chain (§2).
- `formatAuthorStat()` (`1,248` / `4.8K` / `1.2M`), `formatJoinedLabel()` (§18).
- Write-path validators used by the API: `normalizeAuthorSocialInput`,
  `normalizeAuthorWebsiteInput`, `normalizeAuthorExpertise` (≤ 8 tags, ≤ 40 chars,
  de-duplicated, `<>` stripped), `normalizeAuthorText` (§33).

Logic that had been duplicated across four files now lives here only.

---

## 3. Reusable social links — `components/author/author-social-links.tsx` (new, §4, §16)

One component, three presentations, no per-network layout:

- `variant="icon"` (profile / author card) and `variant="text"` (compact footer).
- `size="md"` = 44×44 tap targets, `size="sm"` = 36×36 (§22).
- `aria-label="{Author} on {Platform}"`, visible focus ring, never icon-only meaning (§31).
- `target="_blank" rel="noopener noreferrer nofollow"`.
- Returns `null` for an empty list — no empty container is ever rendered (§32).
- Optional `onLinkClick(platform, href)` so each surface can attribute its own analytics.

No social SDK is loaded — a social link is just a link (§30).

---

## 4. Public author profile — `app/author/[username]/`

**`page.tsx` (server)**
- `getAuthorProfile = cache(...)`: profile + user + wallet + **published** posts only (§12).
- `generateMetadata`: unique title/description per author, canonical URL, `og:type=profile`,
  profile image metadata, `robots: noindex` for missing/private profiles (§20).
- JSON-LD `@graph`: `ProfilePage` + `Person` (`sameAs`, `jobTitle`, `knowsAbout`) +
  `BreadcrumbList`; uses `SITE_URL` (a previously hardcoded Vercel URL was removed) (§20).
- `notFound()` when the profile is missing or `isPublic === false`.

**`public-author-profile.tsx` (client)**
- Editorial layout: existing `PublicNavbar`, `max-w-6xl`, flat `rounded-2xl border` header —
  no hero gradient, no glassmorphism, no LinkedIn cover-photo styling (§9, §24).
- Avatar (`next/image`, 112px) or initials fallback; plain `<h1>`; subtle `BadgeCheck` with
  `sr-only "Verified author"` shown **only** when the real `isVerified` column is true (§19).
- Professional title → location · joined → bio → expertise tags (§10, §11).
- Actions: existing `FollowButton`, opt-in "Email author" mailto, Share, `Support author`
  (only when a wallet is enabled). Owner sees "Edit profile" instead of Follow.
- Stats `<dl>` shows only real backend numbers — posts, views, likes, followers (§18).
- Articles: maps to the **existing** `GridCard`, 9 per page, category `FilterChip`s,
  Prev/Next pagination, dashed empty state (§12).
- Analytics: `author_profile_view`, `author_social_click`, `author_email_click`,
  `author_follow`, `author_article_click` (§28).

---

## 5. Author information on articles

- **`components/blog/article/article-header.tsx`** — byline is `By {name}` (a link to the
  canonical profile) + verified tick + the professional title line; no socials here (§13, §16).
- **`components/blog/article/article-shell.tsx`** — the end-of-article `AuthorCard` is now a
  flat bordered card (gradient removed) with avatar, name, role line, 3-line bio, real
  stats, `FollowButton`, "View profile", `SupportButton`, and a bordered row containing
  `AuthorSocialLinks size="sm"` + `Email {firstName}` — the row is omitted entirely when the
  author has neither (§14, §32). Each action reports analytics with
  `source: 'article_author_card'`.
- **`app/blog/[authorName]/[slug]/page.tsx`** — the post query now selects the author's
  social/contact columns and builds `professionalTitle`, `socialLinks`, `contactEmail` and
  `href` through `lib/author-profile.ts`, so the article header, author card and `Person`
  JSON-LD all read from the same derived object (§34).

---

## 6. Write path — `app/api/author/profile/route.ts` (§33)

- `SOCIAL_FIELDS` / `TEXT_FIELDS` tables drive both `POST` and `PATCH`, so a field is
  validated in exactly one place.
- Every author-controlled value is normalised before it reaches Prisma: display name
  (2–80), bio (≤ 2000), tagline/location/occupation/company (≤ 120), website and avatar
  (absolute http(s) only), expertise (≤ 8 clean tags), each social value (handle or safe
  http(s) link). Invalid input returns `400` with a specific message instead of being stored.
- `isVerified: false` is written explicitly on create — verification can never be self-granted (§19).
- `showEmail` is documented as the §3 opt-in.
- **Bug fixed:** `GET` returned raw columns (`twitterHandle`, …) while the dashboard form
  reads `socialLinks.twitter`, so saved social links never repopulated the edit form. A
  `toSocialLinks()` mapper now makes the response round-trip through the same keys the
  form submits.

---

## 7. Author dashboard — `components/author/author-profile-form.tsx` (§26)

Added to the existing form, in its existing visual language:

- **Professional Title** (`tagline`, ≤ 120) in *Basic Information*, with copy explaining
  where it appears.
- **Areas of Expertise** in *Professional Information* — type + Enter/comma or click a
  suggestion (`Poultry Health`, `Broiler Farming`, `Layer Farming`, `Poultry Nutrition`,
  `Farm Management`, `Poultry Business`, `Technology`), removable badges with
  `aria-label="Remove {tag}"`, live `n/8` counter matching the server cap.
- **YouTube** and **GitHub** inputs alongside the existing four, plus a note that a handle
  or a full URL both work.
- **Public Contact Email** switch — **off by default**, with copy stating the account email
  is never published unless enabled (§3).

---

## 8. Verified against the spec's test list

Covered by the implementation: complete profile, minimal profile, no socials, many socials,
public email on/off, URL validation (social + website + avatar), mobile/tablet/desktop
layout, dark mode, article header, article author card, author article listing + pagination
+ category filter, follow button, social/email/follow/article analytics, SEO metadata,
canonical author URLs, accessibility (labels, focus states, 44px targets), no duplicate
author records, and no removed blog functionality.

---

## 9. NOT implemented — needs a Prisma migration (your call)

These spec sections have **no existing columns**, and this project has no
`prisma migrate` script (only `0_init` and `20260803115226_add_search_engine` exist), so
they were deliberately left out rather than half-built or faked:

| Spec | Needs |
| --- | --- |
| §6, §7, §8, §15 | `AuthorAffiliateResource` table (`title, description, url, image, merchant, disclosure, active, displayOrder`) + dashboard CRUD + profile/article sections + disclosure copy |
| §5 | `AuthorSocialLink` table (`platform, url, label, displayOrder`) for arbitrary/custom platforms and reordering — the six typed columns are used today |
| §3 | A dedicated `publicEmail` column. Today the opt-in reveals the **account** email; a separate public address needs its own column |
| §28, §29 | Server-side counters for author-profile views and affiliate clicks. GA `trackEvent()` is wired up; a DB-backed table is not |

Say the word and I'll write the migration plus the affiliate/custom-link UI on top of the
same `lib/author-profile.ts` foundation.
