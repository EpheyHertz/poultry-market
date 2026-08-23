/**
 * Shared view-model for the editorial article page.
 *
 * The server page maps the Prisma row into this shape once, so every client
 * component (header, content, sidebar, analytics) consumes a small, stable,
 * serialisable object instead of the full database record. This keeps the
 * server/client boundary cheap (§26) and prevents internal fields from leaking
 * into the browser payload (§12).
 */

import type { AuthorSocialLink } from '@/lib/author-profile';
import type { AuthorResourceView } from '@/lib/author-resources';

export interface ArticleAuthorView {
    /** users.id — used by FollowButton. */
    id: string;
    /** author_profiles.id — used by SupportButton. */
    profileId: string | null;
    name: string;
    /** author_profiles.username — used to build /author/{username}. */
    username: string | null;
    avatarUrl: string | null;
    bio: string | null;
    tagline: string | null;
    /**
     * "Poultry Technology Writer" — composed from occupation/company (falling
     * back to the tagline) by `buildProfessionalTitle`, so the byline, the
     * author card and the profile page all show the same title.
     */
    professionalTitle: string | null;
    isVerified: boolean;
    followers: number;
    posts: number;
    /** Public profile href, or null when the author has no public profile. */
    href: string | null;
    /**
     * Already validated http(s) links (`buildAuthorSocialLinks`). Empty array
     * means the author has none, so the social row is omitted entirely.
     */
    socialLinks: AuthorSocialLink[];
    /** Set only when the author explicitly opted in to a public contact email. */
    contactEmail: string | null;
    /**
     * True when the author has at least one active recommended resource, so the
     * author card can link to that section without rendering a whole grid
     * inside the article (ext §12).
     */
    hasResources: boolean;
}


export interface ArticleTagView {
    id: string;
    name: string;
    slug: string;
}

export interface ArticleView {
    id: string;
    slug: string;
    title: string;
    /** Raw Markdown. Rendered by MarkdownRenderer, never shown verbatim (§4). */
    content: string;
    /** Short editorial standfirst shown under the H1 (§2). */
    excerpt: string | null;
    category: string;
    categoryLabel: string;
    categoryIcon: string | null;
    categoryHref: string;
    featuredImage: string | null;
    /** ISO strings — safe to pass across the server/client boundary. */
    publishedAt: string | null;
    updatedAt: string | null;
    /** True only when the update is meaningfully later than publication (§2). */
    showUpdatedAt: boolean;
    /** Minutes, derived from the actual content (§14). */
    readingTime: number;
    views: number;
    likes: number;
    commentCount: number;
    tags: ArticleTagView[];
    author: ArticleAuthorView;
    /**
     * Only the resources the author *deliberately attached to this article*
     * (via AuthorResourceArticle). Never the author's whole catalogue — an
     * unrelated recommendation must not appear here (ext §12, §13).
     *
     * Already-stored metadata only: public pages never fetch merchants at
     * render time (ext §24).
     */
    resources: AuthorResourceView[];
    /** Absolute canonical URL (§25) — also used by the share buttons (§11). */
    canonicalUrl: string;
    /** In-app href for breadcrumbs / recommendations. */
    href: string;
}
