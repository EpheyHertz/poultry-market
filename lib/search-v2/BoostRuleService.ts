/**
 * BoostRuleService — applies active search_boost_rules (§12.4).
 *
 * Rules are matched against the query (case-insensitive substring on the
 * normalized query), must be enabled and inside their optional date window.
 * The total weight is capped by `maxBoostTotal` from search_configuration.
 * Expired/disabled rules are ignored automatically.
 *
 * Cached for 60 s (the rule set is tiny); busted on admin mutation.
 */

import { prisma } from '@/lib/prisma';

const CACHE_TTL_MS = 60_000;

interface ActiveRule {
  keyword: string;
  weight: number;
}

let cache: { rules: ActiveRule[]; loadedAt: number } | null = null;

async function loadRules(force: boolean): Promise<ActiveRule[]> {
  if (!force && cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.rules;
  }

  const now = new Date();
  const rows = await prisma.searchBoostRule.findMany({
    where: {
      enabled: true,
      OR: [
        { startDate: null },
        { startDate: { lte: now } },
      ],
    },
  });

  const rules: ActiveRule[] = rows
    .filter((r) => r.endDate === null || r.endDate >= now)
    .map((r) => ({ keyword: r.keyword.toLowerCase().trim(), weight: Number(r.weight) }));

  cache = { rules, loadedAt: Date.now() };
  return rules;
}

export const BoostRuleService = {
  /**
   * Sum of boost weights whose keyword appears in the normalized query.
   * Returns 0 when there is no query or no matching rule.
   */
  async getBoostForQuery(normalizedQuery: string, maxBoost: number, force = false): Promise<number> {
    if (!normalizedQuery) return 0;
    const rules = await loadRules(force);
    let total = 0;
    for (const rule of rules) {
      if (rule.keyword && normalizedQuery.includes(rule.keyword)) {
        total += rule.weight;
      }
    }
    return Math.min(total, maxBoost);
  },

  /** Names of rules that matched — used for debug explainability (§12.13). */
  async getMatchingKeywords(normalizedQuery: string, force = false): Promise<string[]> {
    if (!normalizedQuery) return [];
    const rules = await loadRules(force);
    return rules
      .filter((r) => r.keyword && normalizedQuery.includes(r.keyword))
      .map((r) => r.keyword);
  },

  invalidate(): void {
    cache = null;
  },
};
