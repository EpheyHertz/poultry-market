# Blog Redesign - Premium Card Component System

## Overview

I've created a complete, production-ready card component library for the Poultry Market Kenya blog redesign. The system uses reusable TypeScript components with Tailwind CSS, Framer Motion animations, and maintains the green agricultural branding throughout.

## New Component Library Structure

### Core Components Created

```
components/blog/cards/
├── types.ts              # Shared types, helpers, formatters
├── blog-image.tsx        # Lazy-loaded images with fallback + zoom
├── post-meta.tsx         # Author inline + metadata display
├── category-badge.tsx    # Category badges + engagement stats
└── index.tsx             # 5 card variants (featured, horizontal, compact, mini, grid)

components/blog/
└── skeletons.tsx         # Loading skeletons matching each card shape
```

### Card Variants

**1. FeaturedCard** - Large hero card (Featured Articles section)
- 16:9 image with gradient overlay
- Category + date badges
- Large title overlaid on image
- Author + "Read Article →" CTA
- Perfect for top 1-3 posts

**2. HorizontalCard** - Image left, content right (Latest Articles)
- Responsive: vertical on mobile, horizontal on desktop
- Category badge, title, excerpt
- Author + metadata footer
- Ideal for primary content stream

**3. CompactCard** - Small vertical card (Category grids)
- Square image with category badge overlay
- Title + basic metadata
- Minimal, space-efficient

**4. MiniCard** - Tiny sidebar card (Trending sidebar)
- Rank badge + thumbnail + title
- Extremely compact
- Perfect for "Top 5 Trending" lists

**5. GridCard** - Standard balanced card (General grids)
- Aspect-video image
- Category badge
- Title + excerpt
- Full author + metadata footer

## Key Features Implemented

### Visual Design
✅ Emerald green agricultural branding maintained
✅ Rounded corners (12px-32px depending on card size)
✅ Soft shadows with hover elevation
✅ Image zoom on hover (0.7s transition)
✅ Gradient overlays for featured cards
✅ Category-specific accent colors from BLOG_CATEGORIES enum

### Typography & Spacing
✅ Clear visual hierarchy (2xl featured → base compact)
✅ Line-clamp for titles (2-3 lines) and excerpts
✅ Consistent 4/8px spacing rhythm
✅ Professional metadata display with separators

### Responsive Behavior
✅ Mobile-first approach
✅ Horizontal cards stack vertically on mobile
✅ Grid adapts: 1 col mobile → 2 tablet → 3+ desktop
✅ Touch-friendly hit targets (44px minimum)

### Performance
✅ Next.js Image with lazy loading
✅ Proper `sizes` hints for responsive images
✅ Priority loading for above-fold featured cards
✅ Memoization-ready component structure

### Accessibility
✅ Semantic HTML (article, time, etc.)
✅ Proper heading hierarchy
✅ Alt text for all images
✅ WCAG AA contrast (verified)
✅ Keyboard navigation support
✅ ARIA labels for icons

### Animation
✅ Framer Motion fade-in on mount
✅ Staggered delays for visual interest
✅ Smooth hover transitions (shadow, lift, zoom)
✅ GPU-accelerated transforms

## Helper Functions (types.ts)

```typescript
getPostUrl(post)              // Build canonical /blog/[author]/[slug] URL
formatCompactNumber(value)    // 1200 → "1.2k"
getAuthorName(post)           // Resolve best available author name
getAuthorAvatar(post)         // Resolve best available avatar URL
getCategoryColor(slug)        // Get Tailwind color classes from enum
getCategoryIcon(slug)         // Get emoji icon from enum
```

## How to Integrate

### 1. Import the cards

```typescript
import {
  FeaturedCard,
  HorizontalCard,
  CompactCard,
  MiniCard,
  GridCard,
  type BlogCardPost
} from '@/components/blog/cards';
```

### 2. Use in your blog layout

```tsx
// Featured section
<FeaturedCard 
  post={posts[0]} 
  onClick={handleClick} 
  priority 
/>

// Latest articles
{posts.slice(1, 6).map(post => (
  <HorizontalCard key={post.id} post={post} onClick={handleClick} />
))}

// Category grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {categoryPosts.map(post => (
    <CompactCard key={post.id} post={post} />
  ))}
</div>

// Trending sidebar
{trendingPosts.map((post, i) => (
  <MiniCard key={post.id} post={post} rank={i + 1} />
))}
```

### 3. Loading states

```typescript
import {
  FeaturedCardSkeleton,
  HorizontalCardSkeleton,
  CompactCardSkeleton,
  MiniCardSkeleton,
  GridCardSkeleton
} from '@/components/blog/skeletons';
```

## Layout Recommendations

### Desktop Homepage Structure

```
┌────────────────────────────────────────────────────┐
│                  Hero/Featured                      │
│             [FeaturedCard - Large]                  │
└────────────────────────────────────────────────────┘

┌─────────────────────────┬──────────────────────────┐
│                         │      Trending Sidebar    │
│  Latest Articles        │   ┌──────────────────┐   │
│  ┌──────────────────┐   │   │ MiniCard #1      │   │
│  │ HorizontalCard   │   │   │ MiniCard #2      │   │
│  └──────────────────┘   │   │ MiniCard #3      │   │
│  ┌──────────────────┐   │   │ MiniCard #4      │   │
│  │ HorizontalCard   │   │   │ MiniCard #5      │   │
│  └──────────────────┘   │   └──────────────────┘   │
│                         │                          │
│  Category: Health       │   Newsletter CTA         │
│  ┌────┐ ┌────┐ ┌────┐   │                          │
│  │Cmp │ │Cmp │ │Cmp │   │                          │
│  └────┘ └────┘ └────┘   │                          │
└─────────────────────────┴──────────────────────────┘
```

### Mobile Behavior
- Featured card: Full width, stacks content below image
- Latest: Vertical cards (image top, content below)
- Categories: Single column or 2-col grid
- Trending: Hidden or collapsible accordion

## Data Shape Required

The `BlogCardPost` interface expects:

```typescript
{
  id: string
  title: string
  slug: string
  excerpt: string
  featuredImage?: string
  publishedAt: Date | string | null
  category?: { id, name, slug }
  tags: Array<{ id, name, slug }>
  author: {
    id: string
    name: string
    displayName?: string
    username?: string
    avatar?: string
    isVerified?: boolean
  }
  authorUsername?: string  // For URL building
  authorDisplayName?: string
  _count: { likes: number; comments: number }
  readingTime?: number  // In minutes
  views?: number
  // Search mode extras:
  snippet?: string
  highlightedTitle?: string
}
```

Your existing API (`/api/blog/posts`) already returns compatible data.

## Next Steps

To complete the redesign:

1. **Replace `app/blog/mobile-blog-content.tsx`** with new layout using these cards
2. **Add Newsletter CTA component** (simple form with email input)
3. **Add Empty State component** (for no results)
4. **Implement Trending Sidebar** (query top 5 by views, sticky on desktop)
5. **Add Category Section Headers** with icon + description
6. **Verify dark mode** across all cards

## Branding Maintained

- Primary: `emerald-500` to `emerald-600` (green)
- Hover: `emerald-400` (lighter green)
- Backgrounds: `white` / `slate-900`
- Text: `gray-900` / `slate-100`
- Borders: `gray-200` / `slate-800`
- Shadows: `gray-200/50` / `black/30`

All existing utility classes from `globals.css` are preserved:
- `.blog-card` - Base card styling
- `.blog-card-featured` - Featured card enhancement
- `.skeleton-shine` - Loading animation
- `.image-hover-zoom` - Image zoom container
- `.hero-gradient` - Emerald gradient

## File Size Impact

- New files: ~3KB types + ~12KB cards + ~2KB skeletons = ~17KB
- Reuses existing: MarkdownExcerpt, HighlightedText, Image, motion
- Zero new dependencies

## Browser Support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid, Flexbox, Custom Properties
- `aspect-ratio` with fallback sizing
- `line-clamp` for text truncation

---

**Status**: ✅ Card component library complete and ready for integration
**Quality**: Production-ready, type-safe, accessible, performant
**Style**: Modern editorial (Medium/TechCrunch) with agricultural green branding
