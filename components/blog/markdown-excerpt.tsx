import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

type MarkdownExcerptProps = {
  content?: string | null;
  className?: string;
  clampLines?: 1 | 2 | 3 | 4 | 5 | 6;
};

const CLAMP_CLASS: Record<NonNullable<MarkdownExcerptProps['clampLines']>, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
};

const baseMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="m-0 text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-300">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-gray-800 dark:text-gray-100 font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-gray-700 italic">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="m-0 pl-4 list-disc space-y-1 text-sm sm:text-base text-gray-600 dark:text-gray-300">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="m-0 pl-4 list-decimal space-y-1 text-sm sm:text-base text-gray-600 dark:text-gray-300">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="m-0 border-l-4 border-emerald-500/70 bg-emerald-50/80 dark:bg-emerald-500/10 px-3 py-2 rounded-md text-sm sm:text-base text-gray-700 dark:text-gray-200 italic shadow-sm">
      {children}
    </blockquote>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-slate-900/5 dark:bg-slate-900/70 px-1.5 py-0.5 text-[0.75rem] font-semibold text-emerald-700 dark:text-emerald-300">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="m-0 rounded-lg bg-slate-900/5 dark:bg-slate-900/70 px-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200 shadow-inner">
      {children}
    </pre>
  ),
};

export function MarkdownExcerpt({ content, className, clampLines = 2 }: MarkdownExcerptProps) {
  if (!content || !content.trim()) {
    return null;
  }

  const clampClass = clampLines ? CLAMP_CLASS[clampLines] : undefined;

  return (
    <div
      className={cn(
        'relative overflow-hidden text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed prose prose-sm max-w-none prose-emerald',
        clampClass,
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={baseMarkdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownExcerpt;
