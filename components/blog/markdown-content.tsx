'use client';

import React from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { defaultSchema } from 'hast-util-sanitize';
import { AlertCircle, CheckCircle2, Info, Lightbulb, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type MarkdownContentProps = {
  content: string;
  className?: string;
  accentColor?: string;
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

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span || []),
      ['data-md-color'],
      ['data-md-gradient'],
    ],
    a: [
      ...(defaultSchema.attributes?.a || []),
      ['data-md-link'],
    ],
  },
};

type CalloutType = 'NOTE' | 'TIP' | 'WARNING' | 'INFO' | 'SUCCESS' | 'DANGER';

const CALLOUT_STYLES: Record<CalloutType, {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  accent: string;
}> = {
  NOTE: {
    title: 'Note',
    icon: Info,
    className: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/40 text-sky-900 dark:text-sky-100',
    accent: 'bg-sky-500/70',
  },
  TIP: {
    title: 'Tip',
    icon: Lightbulb,
    className: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-100',
    accent: 'bg-emerald-500/70',
  },
  WARNING: {
    title: 'Warning',
    icon: ShieldAlert,
    className: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/40 text-amber-900 dark:text-amber-100',
    accent: 'bg-amber-500/70',
  },
  INFO: {
    title: 'Info',
    icon: Sparkles,
    className: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/40 text-indigo-900 dark:text-indigo-100',
    accent: 'bg-indigo-500/70',
  },
  SUCCESS: {
    title: 'Success',
    icon: CheckCircle2,
    className: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-100',
    accent: 'bg-emerald-500/70',
  },
  DANGER: {
    title: 'Important',
    icon: AlertCircle,
    className: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/40 text-rose-900 dark:text-rose-100',
    accent: 'bg-rose-500/70',
  },
};

function extractCallout(node: any): { type: CalloutType | null; cleaned: any } {
  if (!node?.children?.length) {
    return { type: null, cleaned: node };
  }

  const firstChild = node.children[0];
  if (firstChild?.type !== 'paragraph' || !firstChild.children?.length) {
    return { type: null, cleaned: node };
  }

  const textNode = firstChild.children[0];
  if (textNode?.type !== 'text' || typeof textNode.value !== 'string') {
    return { type: null, cleaned: node };
  }

  const match = textNode.value.match(/^\s*\[!(NOTE|TIP|WARNING|INFO|SUCCESS|DANGER)\]\s*/i);
  if (!match) {
    return { type: null, cleaned: node };
  }

  const type = match[1].toUpperCase() as CalloutType;
  const remainder = textNode.value.slice(match[0].length);
  textNode.value = remainder.trimStart();

  if (!textNode.value) {
    firstChild.children.shift();
  }

  return { type, cleaned: node };
}

export default function MarkdownContent({ content, className, accentColor }: MarkdownContentProps) {
  if (!content) {
    return null;
  }

  const resolvedAccent = accentColor || '#059669';
  const resolvedAccentSoft = `${resolvedAccent}20`;

  return (
    <div
      className={cn(
        'markdown-content prose prose-lg max-w-none prose-slate dark:prose-invert prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-300 prose-code:text-emerald-600 dark:prose-code:text-emerald-300 prose-strong:text-slate-900 dark:prose-strong:text-white',
        'prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:shadow-lg dark:prose-pre:bg-slate-950',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-white mt-10 mb-6">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white mt-10 mb-5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white mt-8 mb-4">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-4 space-y-2 pl-6 text-slate-700 dark:text-slate-200 marker:text-emerald-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 space-y-2 pl-6 text-slate-700 dark:text-slate-200 marker:text-emerald-500">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-base">{children}</li>
          ),
          blockquote: ({ node, children }) => {
            const { type } = extractCallout(node);

            if (type) {
              const config = CALLOUT_STYLES[type];
              const Icon = config.icon;

              return (
                <div
                  className={cn(
                    'relative my-6 rounded-2xl border px-5 py-4 shadow-sm transition-colors',
                    config.className
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                    <span className={cn('h-2 w-2 rounded-full', config.accent)} aria-hidden />
                    <Icon className="h-4 w-4" />
                    <span>{config.title}</span>
                  </div>
                  <div className="mt-3 space-y-3 text-sm sm:text-base leading-relaxed">
                    {children}
                  </div>
                </div>
              );
            }

            return (
              <blockquote className="my-6 border-l-4 border-emerald-500/80 bg-emerald-500/10 dark:bg-emerald-500/5 px-5 py-4 italic text-slate-700 dark:text-slate-200">
                {children}
              </blockquote>
            );
          },
          code: ({ children }) => (
            <code className="rounded bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <div className="my-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 shadow-lg">
              <div className="flex items-center gap-1 bg-slate-900/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-red-500/70" />
                <span className="h-2 w-2 rounded-full bg-amber-500/70" />
                <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                <span className="ml-2">code</span>
              </div>
              <pre className="overflow-x-auto px-4 py-5 text-sm leading-7">
                {children}
              </pre>
            </div>
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-700 dark:text-slate-200">
                  {children}
                </table>
              </div>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-slate-900/60 text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/50">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">{children}</td>
          ),
          hr: () => (
            <hr className="my-10 border-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
          ),
          a: ({ href, children, node }: { href?: string; children: React.ReactNode; node?: any }) => {
            const linkVariant = (node?.properties?.['data-md-link'] as string) || 'accent';
            if (linkVariant === 'button') {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                  style={{
                    background: resolvedAccent,
                    boxShadow: `0 12px 30px -18px ${resolvedAccent}`,
                  }}
                >
                  {children}
                </a>
              );
            }

            if (linkVariant === 'pill') {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    color: resolvedAccent,
                    borderColor: resolvedAccent,
                    backgroundColor: resolvedAccentSoft,
                  }}
                >
                  {children}
                </a>
              );
            }

            if (linkVariant === 'underline') {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline-offset-8 decoration-[0.2rem]"
                  style={{
                    color: resolvedAccent,
                    textDecorationColor: resolvedAccent,
                  }}
                >
                  {children}
                </a>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold transition-colors hover:underline"
                style={{ color: resolvedAccent }}
              >
                {children}
              </a>
            );
          },
          span: ({ node, children }: { node?: any; children: React.ReactNode }) => {
            const colorKey = node?.properties?.['data-md-color'] as string | undefined;
            const gradientKey = node?.properties?.['data-md-gradient'] as string | undefined;

            if (gradientKey && GRADIENT_STYLES[gradientKey]) {
              return <span className={GRADIENT_STYLES[gradientKey]}>{children}</span>;
            }

            if (colorKey && COLOR_STYLES[colorKey]) {
              return <span className={COLOR_STYLES[colorKey]}>{children}</span>;
            }

            return <span>{children}</span>;
          },
          img: ({ src, alt }) => (
            <span className="block my-8">
              <Image
                src={src || ''}
                alt={alt || ''}
                width={1280}
                height={720}
                className="h-auto w-full rounded-2xl border border-slate-200 object-cover shadow-md dark:border-slate-800"
              />
            </span>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
