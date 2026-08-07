'use client';

import React from 'react';

/**
 * HighlightedText — renders server-produced `<mark>…</mark>` snippets safely.
 *
 * The v2 snippet/title highlighter (SnippetService) emits only `<mark>` tags
 * around matched terms. This component splits on those exact markers and
 * lets React escape everything else — no dangerouslySetInnerHTML, so no
 * other tag or attribute can ever be injected.
 */
interface HighlightedTextProps {
  text: string;
  className?: string;
}

export default function HighlightedText({ text, className }: HighlightedTextProps) {
  if (!text) return null;

  const parts = text.split(/(<mark>|<\/mark>)/);
  const nodes: React.ReactNode[] = [];
  let insideMark = false;

  parts.forEach((part, i) => {
    if (part === '<mark>') {
      insideMark = true;
      return;
    }
    if (part === '</mark>') {
      insideMark = false;
      return;
    }
    if (!part) return;
    nodes.push(
      insideMark ? (
        <mark key={i} className="search-mark">
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  });

  return <span className={className}>{nodes}</span>;
}
