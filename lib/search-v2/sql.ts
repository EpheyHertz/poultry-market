/**
 * Shared SQL constants for Phase 3 services (suggestions + did-you-mean).
 *
 * Centralized so every service uses the same public-status predicate and
 * accent-folding expression. Raw SQL lives in the service modules next to
 * these constants — all user input is bound as $n parameters.
 */

/** Public blog statuses (decision log #2 / §1). */
export const PUBLIC_STATUSES = `('PUBLISHED','APPROVED')`;

/** Accent-folded, lowercased text (f_unaccent is immutable — indexable). */
export function fold(expr: string): string {
  return `f_unaccent(lower(${expr}))`;
}
