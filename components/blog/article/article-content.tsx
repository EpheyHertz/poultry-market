'use client';

/**
 * ArticleContent (§4, §5, §13, §17, §23, §28)
 *
 * Thin wrapper that owns the measured element (`id="article-content"`, used by
 * ReadingProgress and the analytics scroll math) and wires the Markdown
 * renderer to the analytics context. All parsing/rendering lives in
 * MarkdownRenderer — this component only handles layout concerns.
 *
 * In-content slots are inserted after real section boundaries, computed by
 * `splitMarkdownForInserts`. When the article is too short (or has no usable
 * boundary) the body renders in one piece and the slots move to the end, so a
 * recommendation is never dropped entirely.
 */

import { useMemo, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { splitMarkdownForInserts } from '@/lib/blog/article/content';

import { useArticleAnalytics } from './article-analytics';
import MarkdownRenderer from './markdown-renderer';

interface ArticleContentProps {
    content: string;
    /** Element id measured by ReadingProgress / ArticleAnalytics. */
    id?: string;
    /**
     * Elements rendered between sections, in order. Fewer slots than provided
     * may be used when the article has too few section boundaries.
     */
    inlineSlots?: ReactNode[];
    className?: string;
}

export function ArticleContent({
    content,
    id = 'article-content',
    inlineSlots,
    className,
}: ArticleContentProps) {
    const analytics = useArticleAnalytics();

    const slots = useMemo(
        () => (inlineSlots ?? []).filter(Boolean) as ReactNode[],
        [inlineSlots],
    );

    const segments = useMemo(
        () => (slots.length ? splitMarkdownForInserts(content, slots.length) : null),
        [content, slots.length],
    );

    const rendererProps = {
        onExternalLinkClick: analytics.trackExternalLink,
        onVideoPlay: analytics.trackVideoPlay,
    };

    // NOTE: MarkdownRenderer applies `.article-prose` to its own wrapper, so this
    // container stays style-free — it only exists as the measurement target.
    if (!segments) {
        return (
            <div id={id} className={cn('w-full', className)}>
                <MarkdownRenderer content={content} {...rendererProps} />
                {slots.map((slot, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={index} className="not-prose mt-10">
                        {slot}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div id={id} className={cn('w-full', className)}>
            {segments.map((segment, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={index} className="contents">
                    <MarkdownRenderer content={segment} {...rendererProps} />
                    {/* One slot after each segment except the last. */}
                    {index < segments.length - 1 && slots[index] ? (
                        <div className="not-prose my-10">{slots[index]}</div>
                    ) : null}
                </div>
            ))}
            {/* Any slot the split could not place still renders at the end. */}
            {slots.slice(Math.max(0, segments.length - 1)).map((slot, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={`tail-${index}`} className="not-prose mt-10">
                    {slot}
                </div>
            ))}
        </div>
    );
}

export default ArticleContent;
