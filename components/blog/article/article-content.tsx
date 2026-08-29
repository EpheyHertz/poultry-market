'use client';

/**
 * ArticleContent (§4, §5, §13, §17, §23, §28)
 *
 * Thin wrapper that owns the measured element (`id="article-content"`, used by
 * ReadingProgress and the analytics scroll math) and wires the Markdown
 * renderer to the analytics context. All parsing/rendering lives in
 * MarkdownRenderer — this component only handles layout concerns.
 *
 * In-content slots sit **between** Markdown segments that were split on real
 * content-block boundaries by `planRelatedInserts` on the server, so a card can
 * never land inside a paragraph, list, table, code fence or embed. When only one
 * segment is provided the body renders in a single piece and no slot is shown.
 */

import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { useArticleAnalytics } from './article-analytics';
import MarkdownRenderer from './markdown-renderer';

interface ArticleContentProps {
    /**
     * Markdown pieces in document order (from `planRelatedInserts().segments`).
     * A single entry means "render the body untouched".
     */
    segments: string[];
    /** Element id measured by ReadingProgress / ArticleAnalytics. */
    id?: string;
    /**
     * One entry per boundary between segments (`segments.length - 1` entries).
     * `null`/`undefined` leaves that boundary empty.
     */
    inlineSlots?: Array<ReactNode | null>;
    className?: string;
}

export function ArticleContent({
    segments,
    id = 'article-content',
    inlineSlots = [],
    className,
}: ArticleContentProps) {
    const analytics = useArticleAnalytics();

    const rendererProps = {
        onExternalLinkClick: analytics.trackExternalLink,
        onVideoPlay: analytics.trackVideoPlay,
    };

    const pieces = segments.length ? segments : [''];

    // NOTE: MarkdownRenderer applies `.article-prose` to its own wrapper, so this
    // container stays style-free — it only exists as the measurement target.
    return (
        <div id={id} className={cn('w-full', className)}>
            {pieces.map((segment, index) => {
                const slot = index < pieces.length - 1 ? inlineSlots[index] : null;

                return (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={index} className="contents">
                        <MarkdownRenderer content={segment} {...rendererProps} />
                        {slot ? <div className="not-prose my-10">{slot}</div> : null}
                    </div>
                );
            })}
        </div>
    );
}

export default ArticleContent;
