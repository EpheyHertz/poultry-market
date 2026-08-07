/**
 * SnippetService — ts_headline configuration for result highlighting (§6).
 *
 * `snippet` = ts_headline over excerpt (fallback: content, then title).
 * `highlightedTitle` = ts_headline over the title.
 * Markers are <mark>…</mark>; the frontend renders only that tag.
 *
 * Expressions assume the QueryBuilder aliases: `f` = blog_posts row,
 * `c.effective_tq` = chosen tsquery (NULL in trigram/browse modes).
 */

import type { SearchMode } from './types';

export const HEADLINE_CONFIG =
  'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, ' +
  'ShortWord=3, HighlightAll=FALSE, MaxFragments=3, FragmentDelimiter=" … "';

export const HEADLINE_FALLBACK =
  'StartSel=<mark>, StopSel=</mark>, HighlightAll=TRUE';

export const SnippetService = {
  /** SQL expression for the snippet column. */
  snippetExpr(): string {
    return (
      `CASE ` +
      `WHEN c.effective_tq IS NULL THEN f.excerpt ` +
      `WHEN coalesce(f.excerpt, '') <> '' THEN ts_headline('english', f_unaccent(coalesce(f.excerpt, '')), c.effective_tq, '${HEADLINE_CONFIG}') ` +
      `WHEN coalesce(f.content, '') <> '' THEN ts_headline('english', f_unaccent(coalesce(f.content, '')), c.effective_tq, '${HEADLINE_CONFIG}') ` +
      `ELSE ts_headline('english', f_unaccent(coalesce(f.title, '')), c.effective_tq, '${HEADLINE_FALLBACK}') ` +
      `END`
    );
  },

  /** SQL expression for the highlightedTitle column. */
  highlightedTitleExpr(): string {
    return (
      `CASE WHEN c.effective_tq IS NULL THEN f.title ` +
      `ELSE ts_headline('english', f_unaccent(coalesce(f.title, '')), c.effective_tq, '${HEADLINE_FALLBACK}') ` +
      `END`
    );
  },

  /** Whether highlighting applies at all for this mode. */
  appliesTo(mode: SearchMode): boolean {
    return mode === 'fts' || mode === 'recall';
  },
};
