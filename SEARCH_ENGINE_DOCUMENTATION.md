# Search Engine Documentation

Living record of the hybrid blog search & recommendation engine
(PostgreSQL / Prisma / Next.js only — no vector DB). One entry per phase /
sub-phase, covering the decision and why it improves relevance,
recommendation quality, scalability, and maintainability.

Master plan: `SEARCH_IMPLEMENTATION_PLAN.md` (repo root).

---

## Phase 1 — Database Foundation (completed)

### What shipped

| Artifact | Location |
|---|---|
| Baseline migration `0_init` | `prisma/migrations/0_init/migration.sql` (resolved, not executed) |
| Search migration | `prisma/migrations/20260803115226_add_search_engine/migration.sql` |
| Apply script | `scripts/apply-search-migrations.ts` (transactional, verified, supports `--dry-run`) |
| Backfill script | `scripts/backfill-search.ts` (chunked 1000, idempotent) |
| Prisma models | `SearchQuery`, `SearchSynonym`, `SearchSynonymWord`, `SearchConfiguration`, `SearchBoostRule`, `DomainConcept`, `BlogPostConcept` + read-only `tagNames`/`authorName`/`searchVector` on `BlogPost` |

### Key decisions

1. **Trigger-maintained `search_vector`** (not a generated column). Generated
   columns cannot join across tables; triggers can pull tags, author names and
   category labels into one weighted tsvector, transactionally, with zero
   application code. Weights: **A** title (english), **B** tags (simple dict —
   keeps literals exact), **C** excerpt + author + category label (english),
   **D** content (english); `unaccent()` everywhere via immutable `f_unaccent()`
   wrapper so it works in expression indexes.
2. **Chained sync triggers**: `blog_post_tags` insert/delete, `blog_tags`
   rename, `users.name` and `author_profiles."displayName"` updates all rebuild
   affected vectors in the same transaction. Verified live (rename → rebuild →
   restore).
3. **Denormalized `tag_names` / `author_name`** on `blog_posts` — lets the
   trigram/lexical tiers run without joins.
4. **`search_queries` created in its FINAL Phase 8.7 shape** (click position,
   time-to-click, did-you-mean flags, source) so analytics never needs a second
   migration.
5. **All Phase 8 DB objects landed now** (synonyms + seed group `cheap`,
   `search_configuration` with 23 tunable keys, boost rules with 3 seeded
   examples, 33-entry poultry concept glossary, 6 materialized views with
   unique indexes for `REFRESH ... CONCURRENTLY`) — behavior-neutral until the
   consuming services exist.
6. **Migration strategy for a `db push`-born database**: `migrate diff` →
   `resolve --applied 0_init` → hand-written SQL applied through pg Pool →
   `resolve --applied` for the search migration. No destructive step ever ran
   against the live DB.

### Indexes

`idx_blog_posts_search_vector` (GIN tsvector), `idx_blog_posts_title_trgm`,
`idx_blog_posts_title_unaccent_trgm`, partial `idx_blog_posts_excerpt_trgm`,
`idx_blog_posts_published_at_public`, `idx_blog_posts_status_category_published`,
plus trigram/btree indexes on `search_queries` and `search_boost_rules`.

### Verification results (exit criteria)

- Backfill: 98/98 posts — 0 missing vectors, 0 missing tag_names/author_name.
- Tag rename trigger: vectors for all 28 affected posts rebuilt in-transaction;
  rename-back restored them (tested with `poultry farming`).
- GIN usage proven: with `enable_seqscan=off` the planner uses
  `idx_blog_posts_search_vector` and `idx_blog_posts_title_unaccent_trgm`
  (Bitmap Index Scan). At current size (98 rows) seq scan is legitimately
  cheaper; the indexes will take over automatically as the table grows.
- Behavior-neutral: existing `ILIKE`-style listing search still returns the
  same results; no application route was modified in this phase.
- Migration history clean: `0_init` + `20260803115226_add_search_engine`
  applied; `prisma migrate status` = up to date.

### Known operational notes

- Neon compute may sleep; the apply/backfill scripts set
  `connectionTimeoutMillis: 30s` and callers should warm with `SELECT 1`.
- Enum arguments need explicit `::text` casts into `category_label(text)`
  (fixed in both `rebuild_search_vector()` and `fn_refresh_post_search_fields()`).
- Materialized views are empty until the hourly cron (Phase 8C) runs the first
  `REFRESH`; suggestion services must fall back to live aggregates until then.

---

## Phase 2 — Core Search Services + API (completed)

### What shipped

- `lib/search-v2/` strategy-based engine (no app routes touched except the new
  search endpoint):
  - `types.ts`, `strategies/types.ts` — full type surface + strategy contracts.
  - `ConfigService` — `search_configuration` weights/thresholds/TTLs with 60s cache.
  - `SynonymService` — bidirectional synonym map with 5-min cache.
  - `BoostRuleService` — keyword boosts from `search_boost_rules` (date-gated, capped).
  - `FilterService` — validates/filters/sort/cursor encode-decode; rejects
    `language`/`country` with a clear message.
  - `RankingService` — §4 score formula as SQL fragments + ORDER BY and
    keyset-cursor fragments for all 7 sorts.
  - `SnippetService` — `ts_headline` snippet/highlighted-title expressions.
  - `SearchQueryBuilder` — ONE parameterized statement per search: mode ladder
    in a CTE (websearch → plainto → prefix:* → synonym recall → trigram),
    filters, scoring, keyset pagination, facets + totalResults.
  - `strategies/PostgresFtsSearchStrategy`, `strategies/SqlRankingStrategy`,
    `registry.ts` — swappable engine seam (§12.14).
  - `SearchService` — orchestrator: parse → config/synonyms → search → rank →
    cursor → envelope → fire-and-forget `search_queries` analytics row.
- `app/api/blog/search/route.ts` — `GET` endpoint, rate-limited (30/min),
  `Cache-Control: no-store`, 400 on validation errors, 429 on rate limit.
- `scripts/test-search-v2.ts` — integration test (5 acceptance queries,
  browse/sort/cursor, validation errors, latency gate).

### Verification results (exit criteria)

- All 5 acceptance queries pass: `"vaccination schedule"` (fts, 31 total),
  `"vaccnation"` typo (trigram fallback, 30 total), `"café"` accent folding
  (fts), `"vacc"` prefix (fts, 48 total), `"cheap feed"` synonym expansion (fts).
- Cursor pagination: no duplicate ids across pages; `nextCursor` present when
  more results exist.
- Validation: unsupported `language` param rejected with a clear message.
- Latency: server-side p95 = **13.6ms** (< 100ms target). Wall-clock from this
  dev machine is RTT-dominated (a bare `SELECT 1` takes 300–1300ms); production
  compute is colocated with the pool.
- `npm run type-check` clean.

---

## Phase 3 — Suggestions, DidYouMean, Analytics (completed)

### What shipped

- `lib/search-v2/SuggestionService.ts` — typed autocomplete engine behind
  `GET /api/blog/search/suggest`:
  - Seven UNION ALL sources, each parenthesized (Postgres requires parens for
    per-branch `ORDER BY`/`LIMIT`): title prefix (`LIKE` on folded query) +
    title fuzzy (`word_similarity >= trigramSimThreshold`), category labels
    (live via `category_label`), tags, authors, popular, trending, recent.
  - Caps: titles 5, categories 3, tags 4, authors 3, popular 4, trending 3,
    recent 3. Recent is **session-scoped** (`WHERE session_id = $3` and only
    added when a `sid` param is provided — no cross-session leakage).
  - `UNION ALL` does not preserve branch order, so display priority is
    re-established in JS (`TYPE_PRIORITY`: title → category → tag → author →
    popular → trending → recent) with dedupe by normalized text and self-match
    exclusion (seed `seen` with the query).
  - In-memory cache keyed `query::limit::sid`, TTL `ttls.autocompleteSec`
    (min 1s), pruned past 500 entries; `invalidate()` hook. Empty/too-long
    queries raise `SearchValidationError`.
  - Matview-backed sources (tags, popular) carry live-aggregate fallbacks
    guarded by `NOT EXISTS (SELECT 1 FROM mv)` since cron refresh is Phase 8C;
    trending is matview-only by design (needs historical deltas).
- `app/api/blog/search/suggest/route.ts` — GET, force-dynamic, rate limit
  `blog-suggest:${identifier}` 60/min, validates `q`/`limit`/optional `sid`,
  no-store caching, 400/429/500 handling.
- `lib/search-v2/DidYouMeanService.ts` — correction engine:
  - Candidate corpus is **results-backed only**: all tag names, distinct
    category labels from public posts, popular search terms (matview + live
    fallback with `result_count > 0` and `HAVING count(*) >= 2`), trending terms.
  - Scores `word_similarity(folded query, folded candidate)` with SQL-side
    self-match exclusion (`fold('lower(candidate)') <> fold('$1::text')`);
    threshold 0.5 applied in JS (strict `>`); ties broken by shorter candidate
    (`ORDER BY sim DESC, length(candidate) ASC`) for determinism.
  - Caches corrections including `null`; `MIN_QUERY_LENGTH = 3`; `invalidate()`.
- `lib/search-v2/SearchService.ts` — wiring:
  - didYouMean runs **only for weak queries** (`total === 0` or mode
    `trigram`) and never breaks the search response (try/catch).
  - `searchTimeMs` measured after the didYouMean await; envelope carries
    `didYouMean`, `queryId`, `suggestions: []` (served by /suggest) and
    `relatedSearches: []` (Phase 4).
  - Inline logging replaced by `SearchAnalyticsService.logSearchQuery`
    (fire-and-forget, `.catch(console.error)`).
- `lib/search-v2/SearchAnalyticsService.ts`:
  - `logSearchQuery({queryId, filters, resultCount, responseMs,
    didYouMeanShown, autocompleteUsed?})` → `search_queries` row.
  - `recordClick(input)` resolves target by `queryId` (findUnique) else
    normalized query fallback (latest `source: results` row); maps
    `related` → `openedRelatedId`, `didYouMean` → `didYouMeanUsed` +
    `clickedPostId`, `results` → `clickedPostId` (+`clickedPosition`);
    records `timeToClickMs`; never throws, returns false when unresolvable.
- `app/api/blog/search/click/route.ts` — POST, force-dynamic, rate limit
  `blog-search-click:${identifier}` 30/min, zod-validated body
  (`queryId|query` required, `postId`, `source` enum, `position` 0–500,
  `timeToClickMs` ≤ 1h), always `{ok:true}` after validation.
- `scripts/test-search-v2.ts` extended with 13 Phase 3 checks.

### Verification results (exit criteria)

- Typo query `vaccnation` returns fuzzy results (10, trigram) **and**
  non-empty `didYouMean` = `"Vaccination"`; correct query
  `vaccination schedule` returns no correction. ✅
- Queries logged: typo row has `did_you_mean_shown = true`, clean row false;
  both rows found by `queryId`. ✅
- Click attribution verified end-to-end: `recordClick` by queryId persisted
  `clicked_post_id`. ✅
- Suggestions: `suggest('vacc', 8)` → 6 typed entries (title, tag, popular),
  no duplicates, no self-match. ✅
- Full integration suite (Phase 2 + 3): **ALL CHECKS PASSED**; server-side
  p95 latency 17.6ms (< 100ms). `npm run type-check` clean.

### Key decisions

- Corrections only come from corpus entries that themselves return results —
  avoids suggesting terms that produce a second zero-result search.
- The self-match bug ("vaccnation" corrected to itself because the typo was a
  stored popular term with sim=1.0) was fixed by moving exclusion into SQL
  rather than client-side filtering.
- Analytics inserts are fire-and-forget: search latency is never coupled to
  analytics write failures; the test suite allows ~1.5s settle before asserting.
- Retention: `search_queries` rows are purged after **90 days** — the purge
  cron ships in Phase 8C with matview refresh.

### Key decisions

- The mode ladder is decided inside a single CTE (`ladder`); each EXISTS probe
  runs exactly once (hits subquery), then `effective_tq` is derived from the
  chosen mode. One round trip per search (§2).
- SQL parameter refs are pre-rendered with the `$` sigil (`$1::text` etc.) —
  a missing sigil silently compares against literal `1` and broke trigram
  recall (fixed before exit).
- `author_name` (snake_case, Phase 1 column) is the author display source in
  SQL; `blog_posts` has no `"authorName"` column.
- Facet tag regex must be `'\\s+'` in JS template literals so Postgres
  receives `\s+`.
- p95 gate uses `EXPLAIN (ANALYZE)` execution time; wall-clock reported
  informationally (cross-region RTT from dev is not a code signal).

### Known operational notes

- Run the integration test with:
  `TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"node"}'`
  and `TS_NODE_BASEURL='.'` (tsconfig has no `baseUrl`, required by
  tsconfig-paths to resolve `@/` aliases).
- `search_queries` rows are written fire-and-forget; analytics failures are
  logged and never break a search.

---

## Phase 4 — Related Posts Engine (completed)

### What shipped

- `lib/search-v2/strategies/HybridRecommendationStrategy.ts` — the §7/§12.9
  recommendation engine (registry id `hybrid-postgres-related`):
  - **Two-step candidate generation** (§12.9): `buildRelatedQuery` produces a
    single parameterized SQL statement — a `cand` CTE that UNIONs tag-overlap
    neighbours, same-category posts, trigram-title neighbours
    (`fold(title) % fold($3::text)`), and the top-20 popularity leaders,
    then `LIMIT $2` (default 200) before exact scoring. This keeps the
    expensive exact-similarity math off the full table.
  - **Sub-scores** computed in SQL: tag Jaccard (`tag_overlap` / candidate
    tags / source tags), same-category flag, title trigram similarity,
    FTS similarity (`ts_rank_cd` of the source title against the candidate
    `search_vector`), keyword Jaccard, freshness proximity
    (`exp(-days/180)`), and views/read-time proximity.
  - Keyword Jaccard uses **unnest subqueries**, not array operators —
    `text[] & text[]` does not exist in Postgres; intersection is
    `SELECT count(*) FROM unnest(s.lexemes) x WHERE x = ANY(...)` and the
    union uses `count(DISTINCT u)` over the concatenated arrays.
  - **Weighted relationship score** (§7): `0.35*tagJaccard +
    0.20*sameCategory + 0.15*titleTrigram + 0.15*FTSsim + 0.05*keywords +
    0.05*freshness + 0.05*popularity`. Every weight is runtime-tunable via
    `search_configuration` keys (`relatedTagWeight`, `relatedCategoryWeight`,
    `relatedTitleSimWeight`, `relatedFtsWeight`, `relatedKeywordsWeight`,
    `relatedFreshnessWeight`, `relatedPopularityWeight`) with the §7
    defaults as fallback (`DEFAULT_RELATED_WEIGHTS`).
  - **Reasons**: `buildReasons(row)` emits human labels when sub-scores
    clear thresholds — shared tags always, shared category always,
    `titleSim >= 0.4` ("Similar title…"), `ftsSim >= 0.05`,
    `keywordJaccard >= 0.15`; falls back to `"Recommended Reading"`.
  - Source post excluded, non-public excluded, results below
    `relatedMinScore` (default 0.05) dropped, sorted by score desc then
    `publishedAt` desc, sliced to the requested limit. Display extras
    (`featuredImage`, `readingTime`, `views`, `likes`, `authorName`) ride
    alongside the `RelatedCandidate` contract fields.
- `lib/search-v2/RelatedPostsService.ts` — orchestration + caching:
  - `findRelated(slug, limit?)`: validates slug, clamps limit to
    `DEFAULT_LIMIT = 6` / `MAX_LIMIT = 12` (400 on non-integer/out-of-range),
    404 (`SearchValidationError`) when the post is missing or not in
    `PUBLIC_STATUSES`, delegates to the registry's `related` strategy.
  - In-memory TTL cache keyed `${slug}::${limit}`, TTL `ttls.relatedSec`
    (default 600s), max 500 entries (LRU-ish prune). `invalidate(slug?)`
    clears one key or the whole cache; `pruneCache()` drops oldest entries.
- `lib/search-v2/relatedTypes.ts` — `RelatedPostItem`,
  `RelatedEnvelope {relatedPosts, engine, relatedTimeMs}` matching the §8
  contract, re-exporting `RelatedCandidate`.
- `lib/search-v2/registry.ts` — `SearchEngineBundle.related` is now a
  required `RecommendationStrategy`; `ensureDefaultEngine()` installs the
  hybrid strategy.
- `app/api/blog/[slug]/related/route.ts` — new canonical endpoint: GET,
  force-dynamic, rate limit `blog-related:${identifier}` 30/min, `limit`
  query param validation (400), no-store caching, 404/429/500 handling.
- `app/api/blog/posts/related/route.ts` — legacy route rewritten as a thin
  delegate: resolves the source post from `exclude` (id), calls
  `RelatedPostsService.findRelated`, enriches the related ids with the
  legacy `LEGACY_SELECT` shape (`{posts, total}` with author/tags include),
  and falls back to newest public posts on any failure — preserving the
  historical contract byte-for-byte for existing clients.
- **Cache invalidation hooks** (§7 "invalidated on publish"):
  - `app/api/blog/posts/[slug]/approve/route.ts` — after the status
    update, `RelatedPostsService.invalidate()` (whole cache; the post is
    affected both as source and as candidate). Fire-and-forget in try/catch
    so it never breaks the approval flow.
  - `app/api/blog/posts/[slug]/route.ts` (PATCH) — same whole-cache
    invalidation after content edits, since title/tags may change and the
    slug itself can be regenerated on title change.
- `scripts/test-search-v2.ts` extended with the Phase 4 block (9 checks).

### Verification results (exit criteria)

- Full integration suite (Phases 2 + 3 + 4): **ALL CHECKS PASSED**;
  server-side p95 latency 13.3ms (< 100ms). ✅
- Envelope carries the `hybrid-postgres-related` engine id. ✅
- Source post is excluded from its own related list; scores sorted desc. ✅
- Every result exposes a non-empty `reasons[]` and the §8 display shape
  (`relationshipScore` + display fields). ✅
- **Shared-tag outranking verified**: a post sharing tags with the source
  outranks into the result set ahead of unrelated candidates. ✅
- Cache correctness: second call with same `slug:limit` returns the cached
  envelope (object identity); unknown slug → 404; invalid limit → 400. ✅
- `npm run type-check` clean. ✅

### Key decisions

- Candidate generation stays a **single round trip** (§2): the UNION of
  candidate sources and all exact-scoring sub-scores live in one CTE
  statement, capped by `candidateLimit` (200) before the weighted scoring —
  the full table is never scored.
- Keyword overlap uses `unnest` subqueries because Postgres has no `&`/`|`
  operators for `text[]`; the naive `array & array` attempt fails to parse.
- Reasons are threshold-gated so labels only surface when a signal is
  genuinely strong; the fallback keeps the array non-empty per §8.
- Legacy `/api/blog/posts/related` keeps its exact `{posts, total}` shape
  and its newest-posts fallback — existing UI keeps working while the new
  engine powers it under the hood.
- Invalidation is coarse-grained (whole cache) on status/content changes
  because a mutated post is both a potential source and a candidate; the
  600s TTL bounds staleness in any case.
- `category` comparisons type as the Prisma `BlogPostCategory` enum; the
  legacy route uses an explicit `LegacyPostRow` interface because Prisma
  payload-type extraction (`findMany<{select: typeof X}>`) does not parse.

### Known operational notes

- ts-node target is below ES2020 — **BigInt literals (`0n`) are not
  allowed** in scripts/SQL helpers; cast counts to `::int` and type as
  `number`.
- The six matviews are still empty; related scoring reads live tables only
  (cron refresh ships in Phase 8C).
- Weight tuning at runtime: update the `related*Weight` keys in
  `search_configuration`; no redeploy needed.

