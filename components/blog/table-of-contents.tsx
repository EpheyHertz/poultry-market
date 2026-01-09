'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

export default function TableOfContents({ content, className }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);

  // Extract headings from markdown content
  useEffect(() => {
    const extractHeadings = () => {
      const headingRegex = /^(#{1,3})\s+(.+)$/gm;
      const extracted: TOCItem[] = [];
      let match;

      while ((match = headingRegex.exec(content)) !== null) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-');
        
        extracted.push({ id, text, level });
      }

      setHeadings(extracted);
    };

    extractHeadings();
  }, [content]);

  // Track active heading based on scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0.1
      }
    );

    // Observe all heading elements
    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Element exists, scroll to it
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveId(id);
    } else {
      // Element not loaded yet - dispatch event to load all content
      // Then scroll to the heading after content is loaded
      const loadAllEvent = new CustomEvent('loadAllBlogContent', { 
        detail: { targetHeadingId: id } 
      });
      window.dispatchEvent(loadAllEvent);
      
      // Wait for content to load, then scroll
      const checkAndScroll = () => {
        const targetElement = document.getElementById(id);
        if (targetElement) {
          const yOffset = -100;
          const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          setActiveId(id);
        } else {
          // Content still loading, check again
          setTimeout(checkAndScroll, 100);
        }
      };
      
      // Start checking after a short delay to allow content to load
      setTimeout(checkAndScroll, 200);
    }
  }, []);

  // Don't render if there are fewer than 3 headings
  if (headings.length < 3) {
    return null;
  }

  return (
    <div className={cn('mb-6 sm:mb-8', className)}>
      <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 dark:from-emerald-950/30 dark:via-slate-900/80 dark:to-teal-950/20 overflow-hidden shadow-sm">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-semibold text-sm sm:text-base text-gray-800 dark:text-slate-200">
              Table of Contents
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-500 hidden sm:inline">
              ({headings.length} sections)
            </span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-slate-400" />
          </motion.div>
        </button>

        {/* Expandable Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <nav className="px-4 pb-4 sm:px-5 sm:pb-5">
                <ul className="space-y-0.5">
                  {headings.map((heading, index) => (
                    <li
                      key={`${heading.id}-${index}`}
                      style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                    >
                      <button
                        onClick={() => scrollToHeading(heading.id)}
                        className={cn(
                          'text-left w-full py-2 px-3 rounded-lg transition-all text-sm leading-snug flex items-start gap-2 group',
                          activeId === heading.id
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium'
                            : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200'
                        )}
                      >
                        <ChevronRight className={cn(
                          'h-3.5 w-3.5 mt-0.5 flex-shrink-0 transition-transform',
                          activeId === heading.id 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-gray-400 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-500'
                        )} />
                        <span className="line-clamp-2">{heading.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
