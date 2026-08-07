'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import MarkdownExcerpt from '@/components/blog/markdown-excerpt';
import HighlightedText from '@/components/blog/highlighted-text';
import BlogImage from './blog-image';
import { AuthorInline, PostMeta } from './post-meta';
import { CategoryBadge, EngagementStats } from './category-badge';
import { getPostUrl, type BlogCardPost } from './types';

/** Common card link wrapper with tracking support. */
interface CardLinkProps {
  post: BlogCardPost;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  className?: string;
}

function CardLink({ post, onClick, children, className }: CardLinkProps) {
  const href = getPostUrl(post);
  return (
    <Link href={href} onClick={onClick} className={cn('block', className)} prefetch={false}>
      {children}
    </Link>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// FEATURED CARD — Large hero card with 16:9 image, gradient overlay, metadata badge
// ────────────────────────────────────────────────────────────────────────────────

interface FeaturedCardProps {
  post: BlogCardPost;
  onClick?: (e: React.MouseEvent) => void;
  priority?: boolean;
}

export function FeaturedCard({ post, onClick, priority = false }: FeaturedCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative h-full"
    >
      <CardLink post={post} onClick={onClick} className="h-full">
        <div className="blog-card-featured h-full overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
          {/* Image + Gradient Overlay. Stretches to match the side column so the
              featured block never leaves dead space beneath it on desktop. */}
          <div className="relative h-full min-h-[16rem] sm:min-h-[20rem] lg:min-h-[24rem] overflow-hidden">
            <BlogImage
              src={post.featuredImage}
              alt={post.title}
              className="h-full w-full"
              priority={priority}
              zoom
            />
            
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
            
            {/* Category badge (top-left) */}
            {post.category && (
              <div className="absolute top-4 left-4 z-10">
                <CategoryBadge
                  post={post}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-lg"
                />
              </div>
            )}
            
            {/* Date badge (top-right) */}
            {post.publishedAt && (
              <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-lg">
                <PostMeta post={post} showReadingTime={false} showViews={false} className="text-white" />
              </div>
            )}
            
            {/* Content overlay (bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 line-clamp-2 group-hover:text-emerald-300 transition-colors">
                {post.highlightedTitle ? (
                  <HighlightedText text={post.highlightedTitle} />
                ) : (
                  post.title
                )}
              </h2>
              
              <div className="hidden sm:block mb-4">
                {post.snippet ? (
                  <div className="text-gray-200 text-sm lg:text-base line-clamp-2">
                    <HighlightedText text={post.snippet} />
                  </div>
                ) : (
                  <MarkdownExcerpt
                    content={post.excerpt}
                    clampLines={2}
                    className="text-gray-200 text-sm lg:text-base"
                  />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <AuthorInline post={post} size={36} light />

                <span className="hidden sm:inline-flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all">
                  Read Article
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardLink>
    </motion.article>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// HORIZONTAL CARD — Image left, content right. Used for "Latest Articles" section.
// ────────────────────────────────────────────────────────────────────────────────

interface HorizontalCardProps {
  post: BlogCardPost;
  onClick?: (e: React.MouseEvent) => void;
}

export function HorizontalCard({ post, onClick }: HorizontalCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group"
    >
      <CardLink post={post} onClick={onClick}>
        <div className="blog-card flex flex-col sm:flex-row gap-5 p-5 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
          {/* Image (left on desktop, top on mobile) */}
          <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0 rounded-xl overflow-hidden">
            <BlogImage
              src={post.featuredImage}
              alt={post.title}
              className="h-full w-full"
              sizes="(max-width: 640px) 100vw, 192px"
              zoom
              rounded="rounded-xl"
            />
          </div>
          
          {/* Content (right) */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="space-y-3">
              {/* Category */}
              {post.category && (
                <CategoryBadge post={post} showIcon={false} />
              )}
              
              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {post.highlightedTitle ? (
                  <HighlightedText text={post.highlightedTitle} />
                ) : (
                  post.title
                )}
              </h3>
              
              {/* Excerpt */}
              <div className="hidden md:block">
                {post.snippet ? (
                  <div className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2">
                    <HighlightedText text={post.snippet} />
                  </div>
                ) : (
                  <MarkdownExcerpt
                    content={post.excerpt}
                    clampLines={2}
                    className="text-sm"
                  />
                )}
              </div>
            </div>
            
            {/* Meta */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <AuthorInline post={post} size={28} />
              <PostMeta post={post} showDate={false} />
            </div>
          </div>
        </div>
      </CardLink>
    </motion.article>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// COMPACT CARD — Small vertical card for category grids. Image top, minimal content.
// ────────────────────────────────────────────────────────────────────────────────

interface CompactCardProps {
  post: BlogCardPost;
  onClick?: (e: React.MouseEvent) => void;
}

export function CompactCard({ post, onClick }: CompactCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group"
    >
      <CardLink post={post} onClick={onClick}>
        <div className="blog-card overflow-hidden rounded-xl bg-white dark:bg-slate-900 h-full flex flex-col">
          {/* Image */}
          <div className="relative h-40 overflow-hidden">
            <BlogImage
              src={post.featuredImage}
              alt={post.title}
              className="h-full w-full"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              zoom
            />
            
            {post.category && (
              <div className="absolute top-2 left-2">
                <CategoryBadge post={post} showIcon className="text-xs" />
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="p-4 flex-1 flex flex-col">
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 line-clamp-2 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {post.highlightedTitle ? (
                <HighlightedText text={post.highlightedTitle} />
              ) : (
                post.title
              )}
            </h3>
            
            <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100 dark:border-slate-800">
              <PostMeta post={post} showDate={false} showViews={false} />
              <EngagementStats post={post} />
            </div>
          </div>
        </div>
      </CardLink>
    </motion.article>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// MINI CARD — Tiny sidebar card for trending posts. Thumbnail + title only.
// ────────────────────────────────────────────────────────────────────────────────

interface MiniCardProps {
  post: BlogCardPost;
  rank?: number;
  onClick?: (e: React.MouseEvent) => void;
}

export function MiniCard({ post, rank, onClick }: MiniCardProps) {
  return (
    <CardLink post={post} onClick={onClick}>
      <div className="group flex gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
        {/* Rank badge */}
        {rank && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {rank}
          </div>
        )}
        
        {/* Thumbnail */}
        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
          <BlogImage
            src={post.featuredImage}
            alt={post.title}
            className="h-full w-full"
            sizes="64px"
            zoom={false}
            rounded="rounded-lg"
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 line-clamp-2 mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {post.title}
          </h4>
          <PostMeta post={post} showReadingTime={false} showDate={false} className="text-xs" />
        </div>
      </div>
    </CardLink>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// GRID CARD — Standard grid card. Image top, balanced content. Default for most grids.
// ────────────────────────────────────────────────────────────────────────────────

interface GridCardProps {
  post: BlogCardPost;
  onClick?: (e: React.MouseEvent) => void;
}

export function GridCard({ post, onClick }: GridCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group h-full"
    >
      <CardLink post={post} onClick={onClick}>
        <div className="blog-card overflow-hidden rounded-2xl bg-white dark:bg-slate-900 h-full flex flex-col">
          {/* Image */}
          <div className="relative aspect-video overflow-hidden">
            <BlogImage
              src={post.featuredImage}
              alt={post.title}
              className="h-full w-full"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              zoom
            />
            
            {post.category && (
              <div className="absolute top-3 left-3">
                <CategoryBadge post={post} />
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="p-5 flex-1 flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 line-clamp-2 mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {post.highlightedTitle ? (
                <HighlightedText text={post.highlightedTitle} />
              ) : (
                post.title
              )}
            </h3>
            
            {post.snippet ? (
              <div className="text-sm text-gray-600 dark:text-slate-400 line-clamp-3 mb-4">
                <HighlightedText text={post.snippet} />
              </div>
            ) : (
              <MarkdownExcerpt
                content={post.excerpt}
                clampLines={3}
                className="mb-4"
              />
            )}
            
            {/* Meta (pushed to bottom) */}
            <div className="mt-auto pt-4 space-y-3 border-t border-gray-100 dark:border-slate-800">
              <AuthorInline post={post} />
              <div className="flex items-center justify-between">
                <PostMeta post={post} showDate={false} />
                <EngagementStats post={post} />
              </div>
            </div>
          </div>
        </div>
      </CardLink>
    </motion.article>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// EXPORTS — All card variants available for import
// ────────────────────────────────────────────────────────────────────────────────

export { BlogImage, AuthorInline, PostMeta, CategoryBadge, EngagementStats };
export type { BlogCardPost };
