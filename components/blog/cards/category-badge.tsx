import { cn } from '@/lib/utils';
import { getCategoryColor, getCategoryIcon, type BlogCardPost } from './types';

interface CategoryBadgeProps {
  post: BlogCardPost;
  className?: string;
  /** Show the emoji icon (if defined for this category). */
  showIcon?: boolean;
}

/**
 * Category badge with accent colors from the enum. Optionally shows the
 * category's emoji icon.
 */
export function CategoryBadge({ post, className, showIcon = true }: CategoryBadgeProps) {
  if (!post.category) return null;

  const colorClass = getCategoryColor(post.category.slug);
  const icon = getCategoryIcon(post.category.slug);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all',
        colorClass,
        className
      )}
    >
      {showIcon && icon && <span aria-hidden>{icon}</span>}
      <span>{post.category.name}</span>
    </span>
  );
}

interface EngagementStatsProps {
  post: BlogCardPost;
  className?: string;
}

/**
 * Compact engagement stats: likes and comments count, no icons.
 * Formatted as "42 · 12" (likes · comments).
 */
export function EngagementStats({ post, className }: EngagementStatsProps) {
  const likes = post._count?.likes ?? 0;
  const comments = post._count?.comments ?? 0;

  return (
    <div className={cn('flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400', className)}>
      <span title={`${likes} likes`}>{likes} ♥</span>
      <span aria-hidden className="text-gray-300 dark:text-slate-600">·</span>
      <span title={`${comments} comments`}>{comments} 💬</span>
    </div>
  );
}
