'use client';

/**
 * CodeBlock (§21)
 *
 * Fenced code blocks with a language badge, copy-to-clipboard button and
 * horizontal scrolling. Syntax highlighting itself is applied by
 * `rehype-highlight` in the MarkdownRenderer; the highlight.js token colours
 * are defined in globals.css scoped to `.article-prose pre code` so they work
 * in both light and dark themes without shipping an extra CSS file.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
    /** The `<code>` element produced by react-markdown. */
    children: React.ReactNode;
    className?: string;
}

/** Recursively read the text content of the rendered code node. */
function extractText(node: React.ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');

    const element = node as { props?: { children?: React.ReactNode } };
    if (element?.props?.children) return extractText(element.props.children);
    return '';
}

/** `language-ts` → `ts`; used for the badge only. */
function detectLanguage(node: React.ReactNode): string | null {
    const element = Array.isArray(node) ? node[0] : node;
    const className = (element as { props?: { className?: string } })?.props?.className ?? '';
    const match = /language-([\w+-]+)/.exec(className);
    if (!match) return null;

    const language = match[1].toLowerCase();
    const labels: Record<string, string> = {
        js: 'JavaScript',
        jsx: 'JSX',
        ts: 'TypeScript',
        tsx: 'TSX',
        sh: 'Shell',
        bash: 'Bash',
        py: 'Python',
        md: 'Markdown',
        yml: 'YAML',
    };
    return labels[language] ?? language.toUpperCase();
}

export function CodeBlock({ children, className }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const language = detectLanguage(children);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const handleCopy = useCallback(async () => {
        const text = extractText(children);
        if (!text) return;

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-secure contexts / older browsers.
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            setCopied(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard denied — silently ignore, the code is still selectable.
        }
    }, [children]);

    return (
        <div className="not-prose group/code relative my-7">
            <div className="flex items-center justify-between gap-2 rounded-t-xl border border-b-0 border-gray-800 bg-gray-900 px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {language || 'Code'}
                </span>

                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={copied ? 'Code copied' : 'Copy code to clipboard'}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                    {copied ? (
                        <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            Copy
                        </>
                    )}
                </button>
            </div>

            {/* overflow-x-auto keeps long lines from widening the page (§21, §23). */}
            <pre
                className={cn(
                    'm-0 overflow-x-auto rounded-b-xl border border-gray-800 bg-gray-950 p-4 text-[13.5px] leading-relaxed text-gray-100',
                    className,
                )}
            >
                {children}
            </pre>
        </div>
    );
}

export default CodeBlock;
