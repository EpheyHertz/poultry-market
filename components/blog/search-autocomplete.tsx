'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Flame,
  FolderOpen,
  History,
  Search,
  Tag,
  TrendingUp,
  User,
} from 'lucide-react';

/**
 * SearchAutocomplete — typeahead dropdown for the blog search box .
 *
 * Debounces keystrokes, fetches typed suggestions from
 * GET /api/blog/search/suggest and renders an accessible dropdown.
 *
 * The parent owns the input element (so its styling stays untouched) and:
 *   1. renders <SearchAutocomplete /> inside the same relative container,
 *   2. forwards the input's onKeyDown via the imperative handle,
 *   3. reports focus state via the `inputFocused` prop.
 *
 * Arrow keys navigate, Enter/Tab select, Escape closes.
 */

export interface Suggestion {
  text: string;
  type: 'title' | 'tag' | 'category' | 'author' | 'popular' | 'trending' | 'recent';
  count?: number;
}

export interface SearchAutocompleteHandle {
  /** Forward the input's keydown event so the dropdown can navigate. */
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

interface SearchAutocompleteProps {
  /** current input value (parent-owned) */
  query: string;
  /** called when the user picks a suggestion */
  onSelect: (suggestion: Suggestion) => void;
  /** whether the parent input is focused (dropdown closes on blur) */
  inputFocused: boolean;
}

/** 250 ms debounce keeps suggest traffic inside the 60/min rate limit. */
const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

const TYPE_META: Record<Suggestion['type'], { icon: React.ElementType; label: string }> = {
  title: { icon: BookOpen, label: 'Article' },
  tag: { icon: Tag, label: 'Tag' },
  category: { icon: FolderOpen, label: 'Category' },
  author: { icon: User, label: 'Author' },
  popular: { icon: Flame, label: 'Popular' },
  trending: { icon: TrendingUp, label: 'Trending' },
  recent: { icon: History, label: 'Recent' },
};

const SearchAutocomplete = forwardRef<SearchAutocompleteHandle, SearchAutocompleteProps>(
  function SearchAutocomplete({ query, onSelect, inputFocused }, ref) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const requestIdRef = useRef(0);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const close = useCallback(() => {
      setOpen(false);
      setActiveIndex(-1);
    }, []);

    // Fetch suggestions whenever the query changes (debounced, race-safe).
    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const trimmed = query.trim();
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        close();
        return;
      }

      debounceRef.current = setTimeout(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const requestId = ++requestIdRef.current;

        try {
          const params = new URLSearchParams({ q: trimmed, limit: '8' });
          const res = await fetch(`/api/blog/search/suggest?${params.toString()}`, {
            signal: controller.signal,
          });
          // Drop stale responses (only the newest request may render).
          if (requestId !== requestIdRef.current) return;
          if (!res.ok) {
            setSuggestions([]);
            return;
          }
          const data: { suggestions?: Suggestion[] } = await res.json();
          if (requestId !== requestIdRef.current) return;
          const next = data.suggestions ?? [];
          setSuggestions(next);
          if (next.length > 0) {
            setOpen(true);
            setActiveIndex(-1);
          } else {
            close();
          }
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return;
          // Suggestions are best-effort; never surface failures.
        }
      }, DEBOUNCE_MS);

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [query, close]);

    // Close on outside interaction (mouse/touch).
    useEffect(() => {
      if (!open) return;
      const handlePointerDown = (e: PointerEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          close();
        }
      };
      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [open, close]);

    // Close when the input loses focus.
    useEffect(() => {
      if (!inputFocused) close();
    }, [inputFocused, close]);

    const select = useCallback(
      (s: Suggestion) => {
        onSelect(s);
        close();
      },
      [onSelect, close]
    );

    // Keyboard handling forwarded from the parent input.
    useImperativeHandle(
      ref,
      () => ({
        handleKeyDown(e: React.KeyboardEvent) {
          if (!open || suggestions.length === 0) {
            if (e.key === 'Escape') close();
            return;
          }
          switch (e.key) {
            case 'ArrowDown':
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % suggestions.length);
              break;
            case 'ArrowUp':
              e.preventDefault();
              setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
              break;
            case 'Enter':
            case 'Tab':
              if (activeIndex >= 0 && activeIndex < suggestions.length) {
                e.preventDefault();
                select(suggestions[activeIndex]);
              } else if (e.key === 'Enter') {
                close();
              }
              break;
            case 'Escape':
              e.preventDefault();
              close();
              break;
            default:
              break;
          }
        },
      }),
      [open, suggestions, activeIndex, select, close]
    );

    const visible = open && suggestions.length > 0 && inputFocused;

    return (
      <div ref={containerRef}>
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-gray-900/10 dark:shadow-black/40"
              role="listbox"
              aria-label="Search suggestions"
            >
              <ul className="max-h-80 overflow-y-auto py-1">
                {suggestions.map((s, index) => {
                  const meta = TYPE_META[s.type] ?? TYPE_META.title;
                  const Icon = meta.icon;
                  const active = index === activeIndex;
                  return (
                    <li
                      key={`${s.type}-${s.text}-${index}`}
                      role="option"
                      aria-selected={active}
                    >
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(e) => {
                          // Prevent the input blur from closing the dropdown
                          // before the pick registers.
                          e.preventDefault();
                          select(s);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${active
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                          }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-slate-500" />
                        <span className="flex-1 truncate font-medium">{s.text}</span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
                          {typeof s.count === 'number' && s.count > 0 && <span>{s.count}</span>}
                          <span className="hidden sm:inline">{meta.label}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center gap-2 border-t border-gray-100 dark:border-slate-800 px-4 py-2 text-[11px] text-gray-400 dark:text-slate-500">
                <Search className="h-3 w-3" />
                <span>↑↓ to navigate · Enter to search</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

export default SearchAutocomplete;
