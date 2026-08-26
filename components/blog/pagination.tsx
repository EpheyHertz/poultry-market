'use client';

// components/blog/pagination.tsx
//
// Blog listing pagination.
//
// Design notes:
//  - Every control is still a real <Link> with a crawlable `href` (plus
//    rel="prev"/"next"), so Googlebot can walk the archive and users can
//    middle-click / ctrl-click a page into a new tab.
//  - When `onPageChange` is supplied the click is intercepted and handled
//    client-side instead, so changing pages never re-runs the blog Server
//    Component (no full page reload / flash). Modified clicks are left alone
//    so "open in new tab" keeps working.
//  - `isLoading` freezes the control set while a page fetch is in flight,
//    which is what prevents duplicate/simultaneous pagination requests.
//  - Mobile collapses to "← Prev  2 / 12  Next →"; sm+ shows numbered pages.

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  /** Preserved in generated hrefs so pagination keeps the active filter. */
  category?: string;
  sort?: string;
  /** Provide to handle pagination client-side (recommended). */
  onPageChange?: (page: number) => void;
  /** True while a page transition is in flight — blocks further clicks. */
  isLoading?: boolean;
  /** Page currently being fetched; rendered with a spinner. */
  pendingPage?: number | null;
  className?: string;
}

const CONTROL_BASE =
  'inline-flex h-9 min-w-[2.25rem] items-center justify-center gap-1 rounded-md border px-2 text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

const CONTROL_IDLE =
  'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-gray-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-slate-700 dark:hover:text-emerald-300';

const CONTROL_ACTIVE =
  'border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-500/30 dark:border-emerald-500 dark:bg-emerald-500 dark:text-white';

const CONTROL_DISABLED =
  'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600';

interface PageControlProps {
  page: number;
  href: string;
  label: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  rel?: 'prev' | 'next';
  onSelect?: (page: number) => void;
  className?: string;
}

function PageControl({
  page,
  href,
  label,
  children,
  active,
  disabled,
  rel,
  onSelect,
  className,
}: PageControlProps) {
  if (disabled) {
    return (
      <span
        aria-label={label}
        aria-disabled="true"
        className={cn(CONTROL_BASE, CONTROL_DISABLED, className)}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      rel={rel}
      prefetch={false}
      scroll={false}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={(e) => {
        if (!onSelect) return;
        // Let the browser handle new-tab / new-window intents.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onSelect(page);
      }}
      className={cn(CONTROL_BASE, active ? CONTROL_ACTIVE : CONTROL_IDLE, className)}
    >
      {children}
    </Link>
  );
}

export function BlogPagination({
  currentPage,
  totalPages,
  category,
  sort,
  onPageChange,
  isLoading = false,
  pendingPage = null,
  className,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (category) params.set('category', category);
    if (sort && sort !== 'latest') params.set('sort', sort);
    const qs = params.toString();
    return qs ? `/blog?${qs}` : '/blog';
  };

  // Windowed page list: always keep the first/last page reachable and show a
  // small window around the current page so the row never overflows.
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const showPages = 5;

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (safePage <= 3) {
      pages.push(2, 3, 4, '...', totalPages);
    } else if (safePage >= totalPages - 2) {
      pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push('...', safePage - 1, safePage, safePage + 1, '...', totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();
  const isFirst = safePage <= 1;
  const isLast = safePage >= totalPages;
  const displayPage = pendingPage ?? safePage;

  return (
    <nav
      className={cn(
        'flex items-center justify-center gap-1 sm:gap-2',
        // Freezing pointer events is what stops a second request from being
        // fired while the current page is still loading.
        isLoading && 'pointer-events-none select-none opacity-80',
        className
      )}
      aria-label="Blog pagination"
      aria-busy={isLoading || undefined}
    >
      {/* Previous — disabled on the first page */}
      <PageControl
        page={safePage - 1}
        href={buildUrl(safePage - 1)}
        label="Previous page"
        rel="prev"
        disabled={isFirst}
        onSelect={onPageChange}
        className="px-2.5"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        <span className="sm:hidden">Prev</span>
      </PageControl>

      {/* Compact indicator (mobile only) */}
      <span className="flex items-center gap-1.5 px-3 text-sm font-medium tabular-nums text-gray-600 dark:text-slate-300 sm:hidden">
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" aria-hidden />}
        <span>
          {displayPage} / {totalPages}
        </span>
      </span>

      {/* Numbered pages (sm and up) */}
      <span className="hidden items-center gap-1 sm:flex sm:gap-2">
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-9 w-9 items-center justify-center text-sm font-medium text-gray-400 dark:text-slate-600"
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === safePage;
          const isPending = pendingPage === pageNum;

          return (
            <PageControl
              key={pageNum}
              page={pageNum}
              href={buildUrl(pageNum)}
              label={`Page ${pageNum}`}
              active={isActive}
              onSelect={onPageChange}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                pageNum
              )}
            </PageControl>
          );
        })}
      </span>

      {/* Next — disabled on the last page */}
      <PageControl
        page={safePage + 1}
        href={buildUrl(safePage + 1)}
        label="Next page"
        rel="next"
        disabled={isLast}
        onSelect={onPageChange}
        className="px-2.5"
      >
        <span className="sm:hidden">Next</span>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </PageControl>
    </nav>
  );
}
