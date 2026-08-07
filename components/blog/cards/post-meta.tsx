'use client';

import Image from 'next/image';
import { format } from 'date-fns';
import { BadgeCheck, Clock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCompactNumber, getAuthorAvatar, getAuthorName, type BlogCardPost } from './types';

interface AuthorInlineProps {
  post: BlogCardPost;
  /** Avatar diameter in pixels. */
  size?: number;
  /** Use light text for dark overlays (e.g. FeaturedCard gradient). */
  light?: boolean;
  className?: string;
}

/** Author avatar + name with a verified badge, used across card variants. */
export function AuthorInline({ post, size = 32, light = false, className }: AuthorInlineProps) {
  const name = getAuthorName(post);
  const avatar = getAuthorAvatar(post);
  const verified = post.authorIsVerified || post.author?.isVerified;


  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <div
        className="relative flex-shrink-0 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-white dark:ring-slate-900"
        style={{ width: size, height: size }}
      >
        {avatar ? (
          <Image src={avatar} alt={name} fill sizes={`${size}px`} className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span
        className={cn(
          'flex items-center gap-1 truncate text-sm font-medium',
          light ? 'text-white' : 'text-gray-800 dark:text-slate-200'
        )}
      >
        <span className="truncate">{name}</span>
        {verified && (
          <BadgeCheck
            className={cn('h-3.5 w-3.5 flex-shrink-0', light ? 'text-emerald-300' : 'text-emerald-500')}
            aria-label="Verified author"
          />
        )}
      </span>

    </div>
  );
}

interface PostMetaProps {
  post: BlogCardPost;
  /** Toggle individual pieces of metadata. */
  showDate?: boolean;
  showReadingTime?: boolean;
  showViews?: boolean;
  className?: string;
}

/**
 * Compact metadata row: "Aug 5 · 6 min read · 1.2k views".
 * Dots are decorative and hidden from assistive tech.
 */
export function PostMeta({
  post,
  showDate = true,
  showReadingTime = true,
  showViews = true,
  className,
}: PostMetaProps) {
  const items: React.ReactNode[] = [];

  if (showDate && post.publishedAt) {
    items.push(
      <time key="date" dateTime={new Date(post.publishedAt).toISOString()}>
        {format(new Date(post.publishedAt), 'MMM d, yyyy')}
      </time>
    );
  }
  if (showReadingTime && post.readingTime) {
    items.push(
      <span key="read" className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {post.readingTime} min read
      </span>
    );
  }
  if (showViews && typeof post.views === 'number') {
    items.push(
      <span key="views" className="inline-flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" aria-hidden />
        {formatCompactNumber(post.views)} views
      </span>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-slate-400', className)}>
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 && <span aria-hidden className="text-gray-300 dark:text-slate-600">·</span>}
          {item}
        </span>
      ))}
    </div>
  );
}
