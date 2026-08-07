'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Mail, BookOpen, Flame, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MiniCard } from '@/components/blog/cards';
import { MiniCardSkeleton } from '@/components/blog/skeletons';
import type { BlogCardPost } from '@/components/blog/cards/types';

// ────────────────────────────────────────────────────────────────────────────────
// SECTION HEADER — Consistent title styling for each blog section
// ────────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, icon, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-4', className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-2 shadow-lg shadow-emerald-500/30 text-white">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// FILTER CHIPS — Animated category filters above article list
// ────────────────────────────────────────────────────────────────────────────────

export interface FilterChip {
  label: string;
  value: string;
  icon?: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
}

export function FilterChips({ chips, selected, onSelect, className }: FilterChipsProps) {
  return (
    <div
      className={cn(
        'featured-scroll -mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0',
        className
      )}
      role="tablist"
      aria-label="Filter articles by category"
    >
      {chips.map((chip) => {
        const active = selected === chip.value;
        return (
          <motion.button
            key={chip.label}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(chip.value)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex flex-shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
              active
                ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500'
            )}
          >
            {chip.icon && <span aria-hidden>{chip.icon}</span>}
            <span className="whitespace-nowrap">{chip.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// TRENDING SIDEBAR — Sticky ranked list of trending posts
// ────────────────────────────────────────────────────────────────────────────────

interface TrendingSidebarProps {
  posts: BlogCardPost[];
  loading?: boolean;
  onPostClick?: (e: React.MouseEvent, post: BlogCardPost) => void;
  className?: string;
}

export function TrendingSidebar({ posts, loading, onPostClick, className }: TrendingSidebarProps) {
  return (
    <aside className={cn('lg:sticky lg:top-24', className)}>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" aria-hidden />
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Trending Posts</h3>
        </div>
        <div className="space-y-1">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <MiniCardSkeleton key={i} />)
            : posts
                .slice(0, 5)
                .map((post, i) => (
                  <MiniCard
                    key={post.id}
                    post={post}
                    rank={i + 1}
                    onClick={onPostClick ? (e) => onPostClick(e, post) : undefined}
                  />
                ))}
          {!loading && posts.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-slate-400">
              No trending posts yet.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// NEWSLETTER CTA — Email capture with agricultural gradient
// ────────────────────────────────────────────────────────────────────────────────

interface NewsletterCTAProps {
  onSubscribe?: (email: string) => Promise<void> | void;
  className?: string;
}

export function NewsletterCTA({ onSubscribe, className }: NewsletterCTAProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;
    setStatus('loading');
    try {
      await onSubscribe?.(email.trim());
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('idle');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-8 sm:p-10 text-white shadow-xl',
        className
      )}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-1/2 -right-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/2 -left-1/4 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <Mail className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="mb-2 text-2xl font-bold sm:text-3xl">Stay ahead of the flock</h2>
        <p className="mb-6 text-sm text-emerald-50 sm:text-base">
          Get expert poultry farming tips, market trends, and industry news delivered to your inbox.
        </p>

        {status === 'success' ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-3 backdrop-blur-sm">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            <span className="font-medium">You&apos;re subscribed! Check your inbox.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <Input
              id="newsletter-email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 flex-1 border-0 bg-white text-gray-900 shadow-lg placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-white"
            />
            <Button
              type="submit"
              disabled={status === 'loading'}
              className="h-12 bg-white px-6 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              {status === 'loading' ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                'Subscribe'
              )}
            </Button>
          </form>
        )}
        <p className="mt-3 text-xs text-emerald-100">No spam. Unsubscribe anytime.</p>
      </div>
    </motion.section>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// EMPTY STATE — Professional empty/no-results messaging
// ────────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  variant?: 'no-posts' | 'no-results' | 'no-category';
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

const EMPTY_CONTENT: Record<
  NonNullable<EmptyStateProps['variant']>,
  { icon: React.ReactNode; title: string; description: string }
> = {
  'no-posts': {
    icon: <BookOpen className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />,
    title: 'No articles yet',
    description: 'Check back soon — fresh poultry insights are on the way.',
  },
  'no-results': {
    icon: <Search className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />,
    title: 'No matching articles',
    description: 'Try a different search term or clear your filters to see all posts.',
  },
  'no-category': {
    icon: <Sparkles className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />,
    title: 'Nothing in this category',
    description: 'This category has no published articles yet. Explore other topics.',
  },
};

export function EmptyState({ variant = 'no-posts', onAction, actionLabel, className }: EmptyStateProps) {
  const content = EMPTY_CONTENT[variant];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900',
        className
      )}
    >
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-500/20 dark:to-emerald-600/20">
        {content.icon}
      </div>
      <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-slate-100">{content.title}</h3>
      <p className="mx-auto mb-6 max-w-md text-sm text-gray-600 dark:text-slate-400">{content.description}</p>
      {onAction && actionLabel && (
        <Button onClick={onAction} className="btn-premium rounded-full px-8">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
