// lib/ads-config.ts
//
// Central AdSense configuration. Ads are ONLY rendered on the blog index
// (/blog) and individual blog post pages (/blog/[authorName]/[slug]).
//
// Slot IDs come from env vars so they can be swapped without a code change.
// If a slot ID is absent the corresponding <AdSlot> renders nothing at all —
// no empty box, no console noise, no layout shift.

export const ADSENSE_CLIENT = 'ca-pub-7786183795346128';

/**
 * Ad placements. Add the matching env var in `.env` once the unit has been
 * created in the AdSense dashboard (Ads → By ad unit → Display ads).
 */
export const AD_SLOTS = {
  /** Leaderboard below the category filters on /blog */
  blogTop: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BLOG_TOP || '',
  /** In-feed unit injected into the "Latest Articles" list on /blog */
  blogInline: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BLOG_INLINE || '',
  /** Sticky rectangle under Trending Posts on /blog (desktop only) */
  blogSidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BLOG_SIDEBAR || '',
  /** Responsive unit before the newsletter CTA on /blog */
  blogBottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BLOG_BOTTOM || '',
  /** In-content unit after the article body on a blog post */
  postInline: process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_INLINE || '',
  /** Unit at the foot of a blog post, before related posts */
  postBottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_BOTTOM || '',
} as const;

export type AdSlotName = keyof typeof AD_SLOTS;

/** Reserved heights (px) keep Cumulative Layout Shift at zero. */
export const AD_MIN_HEIGHT: Record<AdSlotName, number> = {
  blogTop: 100,
  blogInline: 120,
  blogSidebar: 250,
  blogBottom: 100,
  postInline: 250,
  postBottom: 250,
};
