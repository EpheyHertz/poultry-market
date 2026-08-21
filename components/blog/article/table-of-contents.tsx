'use client';

/**
 * TableOfContents (§6)
 *
 * The heading list is generated on the server from the rendered Markdown
 * (`extractHeadings`, which uses the same github-slugger that rehype-slug
 * uses) so ids always resolve — nothing is hand-maintained.
 *
 * Desktop: sticky "On this page" panel with the active section highlighted
 * via IntersectionObserver.
 * Mobile: a collapsible `On this page ▼` disclosure.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArticleHeading } from '@/lib/blog/article/content';

interface TableOfContentsProps {
    headings: ArticleHeading[];
    /** `sidebar` = sticky desktop panel, `mobile` = collapsible disclosure. */
    variant?: 'sidebar' | 'mobile';
    className?: string;
    /** Minimum headings required before the TOC is worth showing. */
    minHeadings?: number;
}

/** Offset for the sticky navbar so anchored headings aren't hidden under it. */
const SCROLL_OFFSET = 96;

export function TableOfContents({
    headings,
    variant = 'sidebar',
    className,
    minHeadings = 3,
}: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);

    const items = useMemo(
        () => headings.filter((heading) => heading.id && heading.text),
        [headings],
    );

    // Track which section is currently in view (§6 "highlight the section").
    useEffect(() => {
        if (!items.length || typeof window === 'undefined') return;

        const elements = items
            .map((item) => document.getElementById(item.id))
            .filter((element): element is HTMLElement => Boolean(element));

        if (!elements.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // Prefer the topmost heading currently intersecting.
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

                if (visible.length) {
                    setActiveId(visible[0].target.id);
                    return;
                }

                // Nothing intersecting: keep the last heading above the fold.
                const above = elements
                    .filter((element) => element.getBoundingClientRect().top < SCROLL_OFFSET)
                    .pop();
                if (above) setActiveId(above.id);
            },
            { rootMargin: `-${SCROLL_OFFSET}px 0px -65% 0px`, threshold: [0, 1] },
        );

        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [items]);

    const handleClick = useCallback(
        (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
            const target = document.getElementById(id);
            if (!target) return; // let the browser handle the raw anchor

            event.preventDefault();
            const top = target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
            window.scrollTo({ top, behavior: 'smooth' });
            // Keep the URL shareable without triggering a second jump.
            window.history.replaceState(null, '', `#${id}`);
            setActiveId(id);
            setIsOpen(false);
        },
        [],
    );

    if (items.length < minHeadings) return null;

    const links = (
        <nav aria-label="Table of contents">
            <ul className="space-y-0.5 text-sm">
                {items.map((heading) => {
                    const isActive = activeId === heading.id;
                    return (
                        <li key={heading.id}>
                            <a
                                href={`#${heading.id}`}
                                onClick={(event) => handleClick(event, heading.id)}
                                aria-current={isActive ? 'location' : undefined}
                                className={cn(
                                    'block border-l-2 py-1.5 pr-2 leading-snug transition-colors duration-150',
                                    heading.level === 2 ? 'pl-3' : heading.level >= 3 ? 'pl-6' : 'pl-3 font-medium',
                                    isActive
                                        ? 'border-emerald-500 bg-emerald-50/60 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-100',
                                )}
                            >
                                {heading.text}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );

    if (variant === 'mobile') {
        return (
            <div
                className={cn(
                    'overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
                    className,
                )}
            >
                <button
                    type="button"
                    onClick={() => setIsOpen((open) => !open)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <List className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        On this page
                    </span>
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200',
                            isOpen && 'rotate-180',
                        )}
                        aria-hidden="true"
                    />
                </button>

                {isOpen && (
                    <div className="border-t border-gray-100 px-2 pb-3 pt-2 dark:border-gray-800">
                        {links}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn('', className)}>
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <List className="h-3.5 w-3.5" aria-hidden="true" />
                On this page
            </p>
            <div className="max-h-[60vh] overflow-y-auto pr-1">{links}</div>
        </div>
    );
}

export default TableOfContents;
