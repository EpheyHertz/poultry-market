'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  category?: string;
  className?: string;
}

export function BlogPagination({
  currentPage,
  totalPages,
  category,
  className,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (category) {
      params.set('category', category);
    }
    return `/blog?${params.toString()}`;
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5; // Max number of page buttons to show

    if (totalPages <= showPages) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near start
        pages.push(2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end
        pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Middle
        pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav
      className={cn('flex items-center justify-center gap-1 sm:gap-2', className)}
      aria-label="Blog pagination"
    >
      {/* Previous button */}
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1)}
          rel="prev"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-sm font-medium text-gray-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600"
          aria-hidden="true"
        >
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {/* Page numbers */}
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
        const isActive = pageNum === currentPage;

        return (
          <Link
            key={pageNum}
            href={buildUrl(pageNum)}
            aria-label={`Page ${pageNum}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
              isActive
                ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            {pageNum}
          </Link>
        );
      })}

      {/* Next button */}
      {currentPage < totalPages ? (
        <Link
          href={buildUrl(currentPage + 1)}
          rel="next"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-sm font-medium text-gray-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600"
          aria-hidden="true"
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
