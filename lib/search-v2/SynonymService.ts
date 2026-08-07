/**
 * SynonymService — DB-driven synonym expansion (§12.2).
 *
 * No hardcoded synonyms in TypeScript. Groups live in search_synonyms /
 * search_synonym_words and are loaded into an in-memory Map<word, siblings>
 * with a 5-minute TTL, busted when an admin mutates the tables.
 *
 * Expansion applies in RECALL mode only — the recall tsquery ORs the query
 * terms with their synonyms over the `simple` dictionary. The precision
 * (AND) path and trigram matching never expand.
 */

import { prisma } from '@/lib/prisma';

const SYNONYM_TTL_MS = 5 * 60_000;

let cache: { map: Map<string, string[]>; loadedAt: number } | null = null;

/** Lowercase + collapse whitespace; used to normalize words on read and write. */
export function normalizeWord(word: string): string {
  return word.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function loadMap(force: boolean): Promise<Map<string, string[]>> {
  if (!force && cache && Date.now() - cache.loadedAt < SYNONYM_TTL_MS) {
    return cache.map;
  }

  const groups = await prisma.searchSynonym.findMany({ include: { words: true } });

  const map = new Map<string, string[]>();
  for (const group of groups) {
    const words = group.words.map((w) => normalizeWord(w.word));
    if (words.length < 2) continue; // a one-word group expands to nothing
    for (const word of words) {
      // siblings = every other word in the group
      map.set(word, words.filter((w) => w !== word));
    }
  }

  cache = { map, loadedAt: Date.now() };
  return map;
}

export const SynonymService = {
  /** word → sibling words for every group that word belongs to. */
  async getMap(force = false): Promise<Map<string, string[]>> {
    return loadMap(force);
  },

  /**
   * Return the expansion set for a query: original tokens plus any synonym
   * siblings found in the DB. Used to build the recall tsquery.
   */
  async expandTerms(terms: string[], force = false): Promise<string[]> {
    const map = await loadMap(force);
    const out = new Set<string>();
    for (const t of terms) {
      const norm = normalizeWord(t);
      if (!norm) continue;
      out.add(norm);
      const siblings = map.get(norm);
      if (siblings) for (const s of siblings) out.add(s);
    }
    return Array.from(out);
  },

  /** Admin mutation hook — force a reload on next access. */
  invalidate(): void {
    cache = null;
  },
};
