'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { defaultSchema } from 'hast-util-sanitize';
import { AlertCircle, CheckCircle2, Info, Lightbulb, ShieldAlert, Sparkles, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// ================================
// Types
// ================================

interface ChunkedMarkdownContentProps {
  content: string;
  className?: string;
  accentColor?: string;
  initialChunkSize?: number;      // Characters to show initially (default: 1500)
  chunkSize?: number;             // Characters per additional chunk (default: 2000)
  enableChunking?: boolean;       // Whether to enable chunking (default: true on mobile)
}

interface ContentChunk {
  id: number;
  content: string;
  isLast: boolean;
}

// ================================
// Constants
// ================================

const DEFAULT_INITIAL_CHUNK = 1500;  // ~300-400 words initially
const DEFAULT_CHUNK_SIZE = 2000;     // ~400-500 words per chunk
const MIN_CONTENT_FOR_CHUNKING = 2000; // Don't chunk small content

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

// ================================
// Helper Functions
// ================================

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

/**
 * Split markdown content into chunks at natural break points
 * Preserves markdown structure by splitting at paragraph/heading boundaries
 * IMPORTANT: Never splits in the middle of images, links, or code blocks
 */
function splitContentIntoChunks(
  content: string, 
  initialSize: number, 
  chunkSize: number
): ContentChunk[] {
  if (!content || content.length <= initialSize) {
    return [{ id: 0, content, isLast: true }];
  }

  const chunks: ContentChunk[] = [];
  let remaining = content;
  let chunkId = 0;
  let currentChunkSize = initialSize;

  while (remaining.length > 0) {
    if (remaining.length <= currentChunkSize) {
      // Last chunk
      chunks.push({ id: chunkId, content: remaining, isLast: true });
      break;
    }

    // Find a good break point (end of paragraph, heading, or list item)
    let breakPoint = currentChunkSize;
    
    // Look for double newline (paragraph break) within 200 chars of target
    const searchStart = Math.max(0, currentChunkSize - 200);
    const searchEnd = Math.min(remaining.length, currentChunkSize + 200);
    const searchArea = remaining.substring(searchStart, searchEnd);
    
    // Priority: paragraph break > heading > list item > sentence
    const paragraphBreak = searchArea.lastIndexOf('\n\n');
    const headingBreak = searchArea.lastIndexOf('\n#');
    const listBreak = searchArea.lastIndexOf('\n- ');
    const sentenceBreak = searchArea.lastIndexOf('. ');
    
    if (paragraphBreak !== -1) {
      breakPoint = searchStart + paragraphBreak + 2; // After the double newline
    } else if (headingBreak !== -1) {
      breakPoint = searchStart + headingBreak + 1; // Before the heading
    } else if (listBreak !== -1) {
      breakPoint = searchStart + listBreak + 1; // Before the list item
    } else if (sentenceBreak !== -1) {
      breakPoint = searchStart + sentenceBreak + 2; // After the sentence
    }

    // Ensure we don't create empty chunks
    if (breakPoint <= 0) {
      breakPoint = currentChunkSize;
    }

    // CRITICAL: Ensure we don't break in the middle of markdown elements
    // Check for unclosed image/link syntax around the break point
    const candidateChunk = remaining.substring(0, breakPoint);
    
    // Check for unclosed image: ![...](...)
    const lastImageStart = candidateChunk.lastIndexOf('![');
    const lastImageEnd = candidateChunk.lastIndexOf(')');
    if (lastImageStart > lastImageEnd || (lastImageStart !== -1 && lastImageEnd === -1)) {
      // We're in the middle of an image - find where it ends
      const imageEndMatch = remaining.substring(breakPoint).match(/^[^\)]*\)/);
      if (imageEndMatch) {
        breakPoint += imageEndMatch[0].length;
      }
    }
    
    // Check for unclosed link: [...](...) 
    const lastLinkStart = candidateChunk.lastIndexOf('[');
    const lastLinkBracket = candidateChunk.lastIndexOf('](');
    if (lastLinkStart !== -1 && lastLinkBracket !== -1 && lastLinkStart < lastLinkBracket) {
      // Might be in a link - check if it's closed
      const afterLink = candidateChunk.substring(lastLinkBracket);
      if (!afterLink.includes(')')) {
        const linkEndMatch = remaining.substring(breakPoint).match(/^[^\)]*\)/);
        if (linkEndMatch) {
          breakPoint += linkEndMatch[0].length;
        }
      }
    }
    
    // Check for unclosed code block (```)
    const codeBlockMatches = candidateChunk.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      // Odd number of ```, we're inside a code block
      const codeBlockEnd = remaining.substring(breakPoint).indexOf('```');
      if (codeBlockEnd !== -1) {
        breakPoint += codeBlockEnd + 3;
      }
    }

    const chunk = remaining.substring(0, breakPoint).trim();
    if (chunk) {
      chunks.push({ id: chunkId, content: chunk, isLast: false });
      chunkId++;
    }
    
    remaining = remaining.substring(breakPoint).trim();
    currentChunkSize = chunkSize; // Use standard chunk size after first chunk
  }

  return chunks;
}

// ================================
// Content Cache (Simple in-memory cache)
// ================================

const contentCache = new Map<string, ContentChunk[]>();

function getCachedChunks(
  content: string, 
  initialSize: number, 
  chunkSize: number
): ContentChunk[] {
  const cacheKey = `${content.length}-${initialSize}-${chunkSize}-${content.substring(0, 100)}`;
  
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey)!;
  }
  
  const chunks = splitContentIntoChunks(content, initialSize, chunkSize);
  
  // Limit cache size to prevent memory issues
  if (contentCache.size > 50) {
    const firstKey = contentCache.keys().next().value;
    contentCache.delete(firstKey);
  }
  
  contentCache.set(cacheKey, chunks);
  return chunks;
}

// ================================
// Memoized Markdown Renderer
// ================================

interface MarkdownChunkProps {
  content: string;
  accentColor: string;
  accentSoft: string;
}

const MarkdownChunk = memo(function MarkdownChunk({ 
  content, 
  accentColor, 
  accentSoft 
}: MarkdownChunkProps) {
  return (
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
                  background: accentColor,
                  boxShadow: `0 12px 30px -18px ${accentColor}`,
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
                  color: accentColor,
                  borderColor: accentColor,
                  backgroundColor: accentSoft,
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
                  color: accentColor,
                  textDecorationColor: accentColor,
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
              style={{ color: accentColor }}
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
        img: ({ src, alt }) => {
          // Use a figure element for better semantics and layout stability
          return (
            <figure className="my-8 not-prose">
              <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
                <Image
                  src={src || ''}
                  alt={alt || ''}
                  width={1280}
                  height={720}
                  className="h-auto w-full object-cover"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 800px"
                  style={{ aspectRatio: '16/9' }}
                />
              </div>
              {alt && (
                <figcaption className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                  {alt}
                </figcaption>
              )}
            </figure>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

// ================================
// Main Component
// ================================

export default function ChunkedMarkdownContent({
  content,
  className,
  accentColor,
  initialChunkSize = DEFAULT_INITIAL_CHUNK,
  chunkSize = DEFAULT_CHUNK_SIZE,
  enableChunking = true,
}: ChunkedMarkdownContentProps) {
  const [loadedChunks, setLoadedChunks] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastChunkRef = useRef<HTMLDivElement>(null);

  // Memoize accent colors
  const resolvedAccent = accentColor || '#059669';
  const resolvedAccentSoft = `${resolvedAccent}20`;

  // Get cached chunks
  const chunks = useMemo(() => {
    if (!content) return [];
    
    // Don't chunk small content or if chunking is disabled
    if (!enableChunking || content.length < MIN_CONTENT_FOR_CHUNKING) {
      return [{ id: 0, content, isLast: true }];
    }
    
    return getCachedChunks(content, initialChunkSize, chunkSize);
  }, [content, initialChunkSize, chunkSize, enableChunking]);

  // Get visible chunks
  const visibleChunks = useMemo(() => {
    return chunks.slice(0, loadedChunks);
  }, [chunks, loadedChunks]);

  // Check if there's more content to load
  const hasMoreContent = loadedChunks < chunks.length;

  // Calculate remaining content info
  const remainingChunks = chunks.length - loadedChunks;
  const estimatedRemainingWords = useMemo(() => {
    if (!hasMoreContent) return 0;
    const remainingContent = chunks.slice(loadedChunks).map(c => c.content).join('');
    return Math.round(remainingContent.split(/\s+/).length);
  }, [chunks, loadedChunks, hasMoreContent]);

  // Load more content handler with scroll position preservation
  const handleLoadMore = useCallback(() => {
    if (!hasMoreContent || isLoading) return;
    
    setIsLoading(true);
    
    // Store the position of the load more button before adding content
    const buttonRect = loadMoreRef.current?.getBoundingClientRect();
    const scrollY = window.scrollY;
    
    // Small delay for smooth animation
    requestAnimationFrame(() => {
      setTimeout(() => {
        setLoadedChunks(prev => Math.min(prev + 1, chunks.length));
        setIsLoading(false);
        
        // Maintain visual position - the user should see the newly loaded content
        // without the page jumping unexpectedly
        if (buttonRect && loadMoreRef.current) {
          const newButtonRect = loadMoreRef.current.getBoundingClientRect();
          const diff = newButtonRect.top - buttonRect.top;
          if (Math.abs(diff) > 50) {
            // Only adjust if there's significant movement
            window.scrollTo({
              top: scrollY + diff - 100, // Scroll up a bit to show new content
              behavior: 'smooth'
            });
          }
        }
      }, 100);
    });
  }, [hasMoreContent, isLoading, chunks.length]);

  // Load all remaining content
  const handleLoadAll = useCallback(() => {
    if (!hasMoreContent || isLoading) return;
    
    setIsLoading(true);
    
    // Store scroll position
    const scrollY = window.scrollY;
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        setLoadedChunks(chunks.length);
        setIsLoading(false);
        
        // Don't adjust scroll for load all - user wants to see everything
      }, 150);
    });
  }, [hasMoreContent, isLoading, chunks.length]);

  // Reset loaded chunks when content changes
  useEffect(() => {
    setLoadedChunks(1);
  }, [content]);

  if (!content) {
    return null;
  }

  return (
    <div
      ref={contentRef}
      className={cn(
        'markdown-content prose prose-lg max-w-none prose-slate dark:prose-invert prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-300 prose-code:text-emerald-600 dark:prose-code:text-emerald-300 prose-strong:text-slate-900 dark:prose-strong:text-white',
        'prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:shadow-lg dark:prose-pre:bg-slate-950',
        className
      )}
    >
      {/* Render visible chunks */}
      {visibleChunks.map((chunk, index) => (
        <motion.div
          key={chunk.id}
          initial={index === 0 ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <MarkdownChunk
            content={chunk.content}
            accentColor={resolvedAccent}
            accentSoft={resolvedAccentSoft}
          />
        </motion.div>
      ))}

      {/* Load More Section */}
      <AnimatePresence>
        {hasMoreContent && (
          <motion.div
            ref={loadMoreRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative mt-8 pt-8 z-10"
          >
            {/* Gradient fade effect - non-interactive */}
            <div 
              className="absolute -top-20 inset-x-0 h-24 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-slate-900 dark:via-slate-900/95" 
              style={{ pointerEvents: 'none' }}
              aria-hidden="true"
            />
            
            {/* Load more content */}
            <div className="relative flex flex-col items-center gap-4 text-center z-20">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-xs font-medium">
                  <ChevronDown className="h-3.5 w-3.5" />
                  {remainingChunks} more section{remainingChunks !== 1 ? 's' : ''} 
                  <span className="text-gray-400 dark:text-slate-500">
                    (~{estimatedRemainingWords} words)
                  </span>
                </span>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="btn-premium rounded-full px-6 py-2.5 text-sm font-semibold"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Continue Reading
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                
                {remainingChunks > 1 && (
                  <Button
                    onClick={handleLoadAll}
                    disabled={isLoading}
                    variant="outline"
                    className="rounded-full px-5 py-2.5 text-sm font-medium border-gray-300 dark:border-slate-700"
                  >
                    Load All
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Tap to continue reading the full article
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export a hook for checking if chunking should be enabled
export function useChunkingPreference(): boolean {
  const [shouldChunk, setShouldChunk] = useState(true);
  
  useEffect(() => {
    // Enable chunking on mobile/tablet devices
    const checkDevice = () => {
      const isMobile = window.innerWidth < 768;
      const isSlowConnection = (navigator as any)?.connection?.effectiveType === '2g' || 
                               (navigator as any)?.connection?.effectiveType === 'slow-2g';
      setShouldChunk(isMobile || isSlowConnection);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return shouldChunk;
}
