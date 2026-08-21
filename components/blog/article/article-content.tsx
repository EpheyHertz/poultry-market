'use client';

/**
 * ArticleContent (§4, §5, §13, §17, §23, §28)
 *
 * Thin wrapper that owns the measured element (`id="article-content"`, used by
 * ReadingProgress and the analytics scroll math) and wires the Markdown
 * renderer to the analytics context. All parsing/rendering lives in
 * MarkdownRenderer — this component only handles layout concerns.
 *
 * The optional mid-article slot is inserted after a real section boundary,
 * computed once on the server by `splitMarkdownForMidInsert`.
 */

import { useMemo, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { splitMarkdownForMidInsert } from '@/lib/blog/article/content';

import { useArticleAnalytics } from './article-analytics';
import MarkdownRenderer from './markdown-renderer';

interface ArticleContentProps {
    content: string;
    /** Element id measured by ReadingProgress / ArticleAnalytics. */
    id?: string;
    /** Rendered once, after a meaningful section, when the article is long enough. */
    midSlot?: ReactNode;
    className?: string;
}

export function ArticleContent({
    content,
    id = 'article-content',
    midSlot,
    className,
}: ArticleContentProps) {
    const analytics = useArticleAnalytics();

    const split = useMemo(
        () => (midSlot ? splitMarkdownForMidInsert(content) : null),
        [content, midSlot],
    );

    const rendererProps = {
        onExternalLinkClick: analytics.trackExternalLink,
        onVideoPlay: analytics.trackVideoPlay,
    };

    // NOTE: MarkdownRenderer applies `.article-prose` to its own wrapper, so this
    // container stays style-free — it only exists as the measurement target.
    return (
        <div id={id} className={cn('w-full', className)}>
            {split ? (
                <>
                    <MarkdownRenderer content={split.before} {...rendererProps} />
                    <div className="not-prose my-10">{midSlot}</div>
                    <MarkdownRenderer content={split.after} {...rendererProps} />
                </>
            ) : (
                <>
                    <MarkdownRenderer content={content} {...rendererProps} />
                    {midSlot ? <div className="not-prose mt-10">{midSlot}</div> : null}
                </>
            )}
        </div>
    );
}

export default ArticleContent;
