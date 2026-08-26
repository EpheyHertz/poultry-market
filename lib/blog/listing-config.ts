// lib/blog/listing-config.ts
//
// Single source of truth for the blog listing page sizes.
//
// The server component seeds the first page and the client fetches subsequent
// pages from /api/blog/posts. If those two used different limits, the offsets
// would drift and page 2 would repeat or skip posts — so both import from here.

/** Posts per page in the "All Articles" listing. */
export const BLOG_PAGE_SIZE = 12;

/**
 * Maximum featured posts loaded into the Featured rail.
 *
 * The rail scrolls horizontally, so this is a payload guard rather than a
 * display cap: every post returned is reachable by scrolling/swiping.
 */
export const FEATURED_LIMIT = 12;
