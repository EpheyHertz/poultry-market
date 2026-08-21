'use client';

/**
 * MarkdownRenderer (§4, §7, §19, §20, §21, §22, §28)
 *
 * Single source of truth for turning article Markdown into polished HTML.
 * Deliberately kept free of page layout so it can be reused anywhere.
 *
 * Pipeline
 *   remark-gfm      → tables, strikethrough, task lists, autolinks
 *   rehype-raw      → author-authored inline HTML
 *   rehype-sanitize → XSS protection (extended schema for our data-* hooks)
 *   rehype-slug     → stable heading ids that match the generated TOC
 *   rehype-highlight→ syntax highlighting classes for code blocks
 *
 * Enhancements layered on top of standard Markdown:
 *   - Standalone YouTube / Facebook / website URLs become rich embeds
 *   - Blockquotes starting with `[!TIP]` etc. become semantic callouts
 *   - Tables get a horizontally scrollable wrapper (no page overflow)
 *   - Internal vs external links are styled and secured differently
 *   - Images render through ArticleImage (lazy, captioned, zoomable)
 */

import React, { memo, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { defaultSchema } from 'hast-util-sanitize';
import {
    AlertCircle,
    ArrowUpRight,
    CheckCircle2,
    Info,
    Lightbulb,
    ShieldAlert,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { classifyUrl, extractStandaloneUrl, parseYouTubeUrl } from '@/lib/blog/article/embeds';
import { ArticleImage } from './article-image';
import { CodeBlock } from './code-block';
import { FacebookEmbed } from './facebook-embed';
import { LinkPreview } from './link-preview';
import { YouTubeEmbed } from './youtube-embed';

/* ------------------------------------------------------------------ *
 * Sanitisation
 * ------------------------------------------------------------------ */

/**
 * Extends the default schema with the attributes our renderer relies on:
 * `data-md-*` styling hooks (used by the legacy editor), heading `id`s from
 * rehype-slug, and highlight.js class names on code elements.
 */
const SANITIZE_SCHEMA = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        '*': [...(defaultSchema.attributes?.['*'] || []), 'id'],
        span: [
            ...(defaultSchema.attributes?.span || []),
            ['data-md-color'],
            ['data-md-gradient'],
            ['className', /^hljs-/],
        ],
        code: [...(defaultSchema.attributes?.code || []), ['className', /^(language|hljs)-/]],
        a: [...(defaultSchema.attributes?.a || []), ['data-md-link'], 'target', 'rel'],
        img: [...(defaultSchema.attributes?.img || []), 'loading', 'title'],
    },
};

const COLOR_STYLES: Record<string, string> = {
    emerald: 'font-semibold text-emerald-600 dark:text-emerald-300',
    sky: 'font-semibold text-sky-600 dark:text-sky-300',
    amber: 'font-semibold text-amber-600 dark:text-amber-300',
    violet: 'font-semibold text-violet-600 dark:text-violet-300',
    rose: 'font-semibold text-rose-600 dark:text-rose-300',
};

const GRADIENT_STYLES: Record<string, string> = {
    sunrise: 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 bg-clip-text text-transparent font-semibold',
    ocean: 'bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-600 bg-clip-text text-transparent font-semibold',
    aurora: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 bg-clip-text text-transparent font-semibold',
    lavender: 'bg-gradient-to-r from-fuchsia-400 via-violet-500 to-indigo-500 bg-clip-text text-transparent font-semibold',
};

/* ------------------------------------------------------------------ *
 * Callouts (§22)
 * ------------------------------------------------------------------ */

type CalloutType = 'NOTE' | 'TIP' | 'WARNING' | 'INFO' | 'SUCCESS' | 'DANGER' | 'IMPORTANT';

const CALLOUT_STYLES: Record<
    CalloutType,
    {
        title: string;
        icon: React.ComponentType<{ className?: string }>;
        wrapper: string;
        iconColor: string;
        accent: string;
    }
> = {
    NOTE: {
        title: 'Note',
        icon: Info,
        wrapper: 'bg-sky-50/80 border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/30',
        iconColor: 'text-sky-600 dark:text-sky-400',
        accent: 'bg-sky-500',
    },
    TIP: {
        title: 'Tip',
        icon: Lightbulb,
        wrapper: 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        accent: 'bg-emerald-500',
    },
    WARNING: {
        title: 'Warning',
        icon: ShieldAlert,
        wrapper: 'bg-amber-50/80 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        accent: 'bg-amber-500',
    },
    INFO: {
        title: 'Info',
        icon: Sparkles,
        wrapper: 'bg-indigo-50/80 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        accent: 'bg-indigo-500',
    },
    SUCCESS: {
        title: 'Success',
        icon: CheckCircle2,
        wrapper: 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        accent: 'bg-emerald-500',
    },
    DANGER: {
        title: 'Important',
        icon: AlertCircle,
        wrapper: 'bg-rose-50/80 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30',
        iconColor: 'text-rose-600 dark:text-rose-400',
        accent: 'bg-rose-500',
    },
    IMPORTANT: {
        title: 'Important',
        icon: AlertCircle,
        wrapper: 'bg-rose-50/80 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30',
        iconColor: 'text-rose-600 dark:text-rose-400',
        accent: 'bg-rose-500',
    },
};

const CALLOUT_PATTERN = /^\s*\[!(NOTE|TIP|WARNING|INFO|SUCCESS|DANGER|IMPORTANT)\]\s*/i;

/** Strip a leading `[!TYPE]` marker from a blockquote and report the type. */
function extractCallout(node: any): CalloutType | null {
    const firstChild = node?.children?.[0];
    if (firstChild?.type !== 'paragraph' || !firstChild.children?.length) return null;

    const textNode = firstChild.children[0];
    if (textNode?.type !== 'text' || typeof textNode.value !== 'string') return null;

    const match = CALLOUT_PATTERN.exec(textNode.value);
    if (!match) return null;

    textNode.value = textNode.value.slice(match[0].length).trimStart();
    if (!textNode.value) firstChild.children.shift();

    return match[1].toUpperCase() as CalloutType;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Read the raw text of a react-markdown children tree. */
function nodeText(children: React.ReactNode): string {
    if (children === null || children === undefined || typeof children === 'boolean') return '';
    if (typeof children === 'string' || typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(nodeText).join('');

    const element = children as { props?: { children?: React.ReactNode } };
    return element?.props?.children ? nodeText(element.props.children) : '';
}

function isInternalHref(href: string): boolean {
    if (!href) return false;
    if (href.startsWith('/') || href.startsWith('#')) return true;

    try {
        const host = new URL(href).hostname.replace(/^www\./, '');
        return host.endsWith('poultrymarketke.vercel.app') || host.endsWith('poultrymarketkenya.com');
    } catch {
        return false;
    }
}

export interface MarkdownRendererProps {
    content: string;
    className?: string;
    /** Turn standalone URLs into embeds/preview cards. Default: true. */
    enableEmbeds?: boolean;
    /** Analytics callbacks (§13) — all optional. */
    onExternalLinkClick?: (url: string) => void;
    onVideoPlay?: (videoId: string) => void;
}

/* ------------------------------------------------------------------ *
 * Renderer
 * ------------------------------------------------------------------ */

function MarkdownRendererBase({
    content,
    className,
    enableEmbeds = true,
    onExternalLinkClick,
    onVideoPlay,
}: MarkdownRendererProps) {
    const components = useMemo<Components>(() => {
        /**
         * A paragraph whose entire content is one URL becomes an embed.
         * Returning `<>{...}</>` (not a <p>) keeps the HTML valid, since
         * figures/divs may not be nested inside a paragraph.
         */
        const renderStandaloneUrl = (url: string) => {
            const kind = classifyUrl(url);

            if (kind === 'youtube' && parseYouTubeUrl(url)) {
                return <YouTubeEmbed url={url} onPlay={onVideoPlay} />;
            }
            if (kind === 'facebook') {
                return <FacebookEmbed url={url} onLoadRequest={onExternalLinkClick} />;
            }
            if (kind === 'website') {
                return <LinkPreview url={url} onOpen={onExternalLinkClick} />;
            }
            return null;
        };

        return {
            /* --- Structure ------------------------------------------------ */
            p({ children, ...props }) {
                if (enableEmbeds) {
                    const text = nodeText(children);
                    const url = extractStandaloneUrl(text);
                    if (url) {
                        const embed = renderStandaloneUrl(url);
                        if (embed) return <>{embed}</>;
                    }
                }
                return <p {...props}>{children}</p>;
            },

            /* --- Links (§7) ------------------------------------------------ */
            a({ href, children, node, ...props }) {
                const url = typeof href === 'string' ? href : '';
                const label = nodeText(children);
                const variant = (props as Record<string, unknown>)['data-md-link'] as string | undefined;

                // A bare autolink on its own line was already handled by `p`;
                // an autolink whose text equals its href inside a sentence is
                // rendered as an inline link, not a card.
                const internal = isInternalHref(url);

                const variantClass =
                    variant === 'button'
                        ? 'not-prose inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white no-underline transition-colors hover:bg-emerald-700'
                        : variant === 'pill'
                            ? 'not-prose inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 no-underline dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : internal
                                ? 'font-medium text-emerald-700 underline decoration-emerald-300 decoration-1 underline-offset-[3px] transition-colors hover:text-emerald-800 hover:decoration-emerald-500 dark:text-emerald-400 dark:decoration-emerald-600 dark:hover:text-emerald-300'
                                : 'font-medium text-emerald-700 underline decoration-dotted decoration-emerald-400 underline-offset-[3px] transition-colors hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300';

                if (internal) {
                    return (
                        <a href={url} className={variantClass} {...props}>
                            {children}
                        </a>
                    );
                }

                return (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        onClick={() => onExternalLinkClick?.(url)}
                        className={cn(variantClass, 'break-words')}
                        {...props}
                    >
                        {children}
                        {variant !== 'button' && variant !== 'pill' && (
                            <ArrowUpRight
                                className="ml-0.5 inline-block h-3 w-3 shrink-0 align-baseline opacity-70"
                                aria-label={`${label} (opens in a new tab)`}
                            />
                        )}
                    </a>
                );
            },

            /* --- Media (§19) ----------------------------------------------- */
            img({ src, alt, title }) {
                return (
                    <ArticleImage
                        src={typeof src === 'string' ? src : undefined}
                        alt={alt}
                        title={title}
                    />
                );
            },

            /* --- Callouts + quotes (§22) ------------------------------------ */
            blockquote({ children, node }) {
                const type = extractCallout(node);

                if (!type) {
                    return (
                        <blockquote className="my-7 border-l-4 border-emerald-500 bg-emerald-50/50 py-1 pl-5 pr-4 italic text-gray-700 dark:bg-emerald-500/5 dark:text-gray-300">
                            {children}
                        </blockquote>
                    );
                }

                const style = CALLOUT_STYLES[type];
                const Icon = style.icon;

                return (
                    <div
                        className={cn(
                            'not-prose relative my-7 overflow-hidden rounded-xl border p-4 pl-5 sm:p-5 sm:pl-6',
                            style.wrapper,
                        )}
                        role="note"
                    >
                        <span className={cn('absolute inset-y-0 left-0 w-1', style.accent)} aria-hidden="true" />
                        <div className="flex items-start gap-3">
                            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.iconColor)} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                                <p className={cn('mb-1 text-xs font-bold uppercase tracking-wider', style.iconColor)}>
                                    {style.title}
                                </p>
                                <div className="space-y-2 text-[15px] leading-relaxed text-gray-700 dark:text-gray-200 [&_a]:font-medium [&_a]:underline [&>p:last-child]:mb-0">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            },

            /* --- Code (§21) -------------------------------------------------- */
            pre({ children }) {
                return <CodeBlock>{children}</CodeBlock>;
            },

            code({ className: codeClassName, children, ...props }) {
                const isBlock = /language-/.test(codeClassName ?? '');

                if (isBlock) {
                    return (
                        <code className={cn(codeClassName, 'font-mono')} {...props}>
                            {children}
                        </code>
                    );
                }

                return (
                    <code
                        className="rounded-[5px] border border-emerald-100 bg-emerald-50 px-[0.4em] py-[0.15em] font-mono text-[0.88em] font-medium text-emerald-800 before:content-none after:content-none dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                        {...props}
                    >
                        {children}
                    </code>
                );
            },

            /* --- Tables (§20) ------------------------------------------------ */
            table({ children }) {
                return (
                    <div className="not-prose my-7 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                        <div className="inline-block min-w-full overflow-hidden rounded-xl border border-gray-200 align-middle dark:border-gray-800">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
                                {children}
                            </table>
                        </div>
                    </div>
                );
            },
            thead({ children }) {
                return <thead className="bg-gray-50 dark:bg-gray-900/60">{children}</thead>;
            },
            tbody({ children }) {
                return (
                    <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950/40">
                        {children}
                    </tbody>
                );
            },
            th({ children }) {
                return (
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        {children}
                    </th>
                );
            },
            td({ children }) {
                return (
                    <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-300">{children}</td>
                );
            },

            /* --- Inline styling hooks --------------------------------------- */
            span({ children, ...props }) {
                const attrs = props as Record<string, unknown>;
                const color = attrs['data-md-color'] as string | undefined;
                const gradient = attrs['data-md-gradient'] as string | undefined;

                if (color && COLOR_STYLES[color]) {
                    return <span className={COLOR_STYLES[color]}>{children}</span>;
                }
                if (gradient && GRADIENT_STYLES[gradient]) {
                    return <span className={GRADIENT_STYLES[gradient]}>{children}</span>;
                }
                return <span {...props}>{children}</span>;
            },

            hr() {
                return (
                    <hr className="my-10 border-0 border-t border-gray-200 dark:border-gray-800" />
                );
            },
        };
    }, [enableEmbeds, onExternalLinkClick, onVideoPlay]);

    if (!content?.trim()) {
        return (
            <p className="text-gray-500 dark:text-gray-400">
                This article does not have any content yet.
            </p>
        );
    }

    return (
        <div className={cn('article-prose', className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                    rehypeRaw,
                    [rehypeSanitize, SANITIZE_SCHEMA],
                    rehypeSlug,
                    [rehypeHighlight, { detect: true, ignoreMissing: true }],
                ]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

export const MarkdownRenderer = memo(MarkdownRendererBase);

export default MarkdownRenderer;
