# Blog Search & Recommendation Engine — Implementation Plan

> PostgreSQL-only hybrid search (FTS + trigram + unaccent) with weighted ranking,
> filters, suggestions, did-you-mean, highlighting, related posts, and analytics.
> Modular design with a stable internal API so vector/semantic search can be
> swapped in later.

---

## 1. Current State Assessment (what exists today)

| Area | Current implementation | Gap vs. target |
|---|---|---|
| UI search | `GET /api/blog/posts?search=` → Prisma `contains` (LIKE) on title/content/excerpt | No ranking, no typo tolerance, no filters beyond category/tag |
| External semantic search | `POST /api/external/blogs/search/semantic` → `lib/search/SearchService` (FTS raw SQL + contains + trigram fallback + RRF) | External-only (API key), no filters/cursor/highlight/analytics; trigram only as last resort |
| Related posts | `GET /api/blog/posts/related` → OR(category/tags) ordered by `publishedAt, views` | No relationship score, no reasons, no title/keyword similarity |
| DB | No tsvector column, no GIN/trgm indexes, `pg_trgm`/`unaccent` not provisioned in migrations | Everything recomputed per query |
| Analytics | None | No query logging, no popular/trending/no-result tracking |
| Schema notes | `BlogPost` has `views`, `viewCount`, `likes`, `shareCount`, `estimatedReadTime`, `readingTime` (legacy), `featured`, `category` enum; **no `language`/`country` fields** | Filters referencing language/country need new nullable columns (optional phase) |
| Migrations | Project currently uses `prisma db push` (no `prisma/migrations` history) | Plan introduces a first `prisma migrate` baseline + SQL migrations |

Key files:
- `prisma/schema.prisma` (BlogPost at line ~1395, enums at ~1307)
- `lib/search/{SearchService,types,validation,auth,index}.ts`
- `app/api/blog/posts/route.ts`, `app/api/blog/posts/related/route.ts`
- `app/api/external/blogs/search/semantic/route.ts`
- `app/blog/blog-content.tsx`, `app/blog/mobile-blog-content.tsx`
- `components/blog/related-posts.tsx`

---

## 2. Target Architecture

```
┌────────────────────────────── API layer (Next.js route handlers) ─┐
│  GET /api/blog/search            → SearchService.search()          │
│  GET /api/blog/search/suggest    → SuggestionService               │
│  GET /api/blog/{slug}/related    → RelatedPostsService             │
│  POST /api/blog/search/click     → SearchAnalyticsService (CTR)    │
└────────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────────────────── Service layer (lib/search-v2/) ────────┐
│  SearchService            – orchestrates query → results envelope  │
│  SearchQueryBuilder       – single parameterized SQL + facets      │
│  RankingService           – score formula; weights from DB config  │
│  ConfigService            – loads search_configuration (cached)    │
│  FilterService            – validated filter/sort param parsing    │
│  SynonymService           – DB-driven synonym expansion (cached)   │
│  BoostRuleService         – applies active search_boost_rules      │
│  KeywordExtractionService – poultry domain concept extraction      │
│  SuggestionService        – autocomplete + didYouMean (matviews)   │
│  RelatedPostsService      – 2-step candidates + concept overlap    │
│  FacetService             – category/tag/author/read-time counts   │
│  SearchAnalyticsService   – async query/click logging              │
│  SearchDiagnosticsService – admin health reports                   │
│  SearchCache              – TTL+LRU cache w/ invalidation hooks    │
│  SnippetService           – headline() highlighting                │
│  strategies/              – SearchStrategy | RankingStrategy |     │
│                             RecommendationStrategy (Vector later)  │
└────────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────────────────── Postgres layer ────────────────────────┐
│  blog_posts.search_vector tsvector — TRIGGER-maintained (§3.1)     │
│  GIN(search_vector), GIN trigram (title), partial idx (published)  │
│  search_queries · search_synonyms(+words) · search_configuration   │
│  search_boost_rules · domain_concepts · blog_post_concepts         │
│  6 materialized views refreshed hourly via cron                    │
└────────────────────────────────────────────────────────────────────┘
```

Principles:
- **One SQL round-trip per search** — ranking, filters, highlighting computed in Postgres.
- **Strategy interface** keeps the public API stable; a future `VectorSearchStrategy`
  implements the same interface.
- **Raw SQL lives in dedicated `*.sql.ts` files**, table/column names verified
  against the schema (project uses `@@map` snake_case tables, Prisma-style quoted
  columns like `"authorProfileId"` — matches existing working `SearchService`).
- **Graceful degradation**: if extensions are missing, FTS still works; trigram
  features fail closed with a logged diagnostic (pattern already in codebase).

---

## 3. Database Design

### 3.1 Search vector (trigger-maintained column on `blog_posts`)

> **Decision (Phase 8.1 adopted early):** a `GENERATED STORED` column was
> rejected — generated columns cannot use joins or dynamic data (tags, author
> names, category labels, future metadata). The vector is a plain column kept
> in sync by PostgreSQL triggers: transactional, zero application code, and
> building it this way from Phase 1 avoids a second migration later.

```sql
ALTER TABLE blog_posts ADD COLUMN search_vector tsvector;  -- maintained by trigger

CREATE OR REPLACE FUNCTION rebuild_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.tag_names   := (SELECT string_agg(t.name, ' ')
                      FROM blog_post_tags pt
                      JOIN blog_tags t ON t.id = pt."tagId"
                      WHERE pt."postId" = NEW.id);
  NEW.author_name := coalesce(
    (SELECT "displayName" FROM author_profiles WHERE id = NEW."authorProfileId"),
    (SELECT name FROM users WHERE id = NEW."authorId"), '');
  NEW.search_vector :=
    setweight(to_tsvector('english', unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('simple',  unaccent(coalesce(NEW.tag_names, ''))), 'B') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW.excerpt, '') || ' ' ||
        coalesce(NEW.author_name, '') || ' ' || category_label(NEW.category))), 'C') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW.content, ''))), 'D');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_posts_search_vector
  BEFORE INSERT OR UPDATE OF title, excerpt, content, category,
                             "authorId", "authorProfileId"
  ON blog_posts FOR EACH ROW EXECUTE FUNCTION rebuild_search_vector();
```

Chained triggers keep every input in sync, all inside the mutating transaction:

| Change | Trigger |
|---|---|
| Title / excerpt / content / category edit | row trigger above rebuilds vector |
| Tag added/removed on a post | `blog_post_tags` AI/AD → rebuild for that post |
| Tag renamed | `blog_tags` UPDATE OF name → statement-level rebuild (transition tables) |
| Author renamed | `users.name` / `author_profiles."displayName"` UPDATE → rebuild author's posts |

Weights & dictionaries (see §12.10): **A** = title, **B** = tags (`simple` dict),
**C** = excerpt + author + category label, **D** = content (`english` dict);
`unaccent()` applied everywhere. Category remains a structured filter + bonus too.

### 3.2 Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

### 3.3 Indexes

| Index | Purpose |
|---|---|
| `GIN (search_vector)` | full-text matching |
| `GIN (title gin_trgm_ops)` | trigram fuzzy + prefix on titles |
| `GIN ((unaccent(lower(title))) gin_trgm_ops)` *(expression idx)* | accent-insensitive fuzzy |
| Partial `btree (published_at DESC) WHERE status IN ('PUBLISHED','APPROVED')` | newest-first listing & freshness |
| Composite `(status, category, published_at DESC)` | filtered browsing |
| Partial GIN trigram on `(excerpt)` | optional, only if title trigram insufficient |
| `search_queries (query text, created_at)` + trigram GIN for suggestions | analytics-driven suggestions |

### 3.4 Denormalized search fields (synced triggers)

- `blog_posts.tag_names text` — refreshed by trigger on `blog_post_tags`/`blog_tags`
  INSERT/UPDATE/DELETE; the vector-rebuild trigger (§3.1) chains automatically.
- `blog_posts.author_name text` — refreshed by trigger on `users.name` /
  `author_profiles."displayName"` updates (Phase 8.1 requirement).
- All sync happens inside the mutating transaction — no application code required.

### 3.5 Analytics table

```sql
-- Created with the FINAL Phase 8.7 shape (§12.7) from day one, so the
-- analytics schema never needs a second migration.
CREATE TABLE search_queries (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,  -- or cuid from app
  query         text NOT NULL,
  normalized    text NOT NULL,          -- lowercased/trimmed for aggregation
  filters_json  jsonb,
  sort          text,
  result_count  int  NOT NULL DEFAULT 0,
  no_results    boolean NOT NULL DEFAULT false,
  user_id       text,                   -- nullable (anonymous)
  session_id    text,
  ip_hash       text,
  referrer      text,
  response_ms   int,
  search_duration_ms int,               -- client-reported
  clicked_post_id    text,              -- set by /click endpoint (CTR)
  clicked_position   int,
  time_to_click_ms   int,
  opened_related_id  text,              -- recommendation CTR
  autocomplete_used      boolean NOT NULL DEFAULT false,
  did_you_mean_shown     boolean NOT NULL DEFAULT false,
  did_you_mean_used      boolean NOT NULL DEFAULT false,
  source        text,                   -- results | related | didYouMean
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- idx: (normalized, created_at DESC), (created_at) with retention policy
```

### 3.6 Schema additions (Prisma)

- ~~`language` / `country`~~ — **DEFERRED** (decision: localization phase later).
  The filter engine accepts the params but rejects them with a clear message.
- Prisma models for every raw-SQL table: `SearchQuery`, `SearchSynonym`,
  `SearchSynonymWord`, `SearchConfiguration`, `SearchBoostRule`, `DomainConcept`,
  `BlogPostConcept`.
- Trigger-managed columns mapped read-only: `tagNames`, `authorName`
  (`@default(dbgenerated())`), `searchVector Unsupported("tsvector")?`.
- Keep `readingTime` and prefer `estimatedReadTime` in one accessor.
- **Popularity uses `viewCount`** (decision) — `views` is treated as deprecated;
  no new code may read `views`.

### 3.7 Migration strategy — DECIDED: `migrate diff` → manual apply → `resolve`

The existing DB was built with `prisma db push`, so it already matches the
schema. Strategy (no destructive steps against the live DB):

1. **Baseline**: `prisma migrate diff --from-empty --to-schema-datamodel
   prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql`.
   On the existing DB this is NOT executed — it is recorded with
   `prisma migrate resolve --applied 0_init`.
2. **Search engine migration**: hand-written
   `prisma/migrations/<ts>_add_search_engine/migration.sql` (extensions,
   columns, triggers, indexes, all Phase 8 tables/matviews, seeds). Applied by
   `scripts/apply-search-migrations.ts` through the existing pg Pool, then
   recorded via `prisma migrate resolve --applied`.
3. **Backfill**: `scripts/backfill-search.ts` — chunked batches of 1000 calling
   `fn_rebuild_post_search_fields(id)` (populates `tag_names`, `author_name`,
   `search_vector` for existing posts).

---

## 4. Ranking Formula

> **Phase 8.3:** every weight below lives in the `search_configuration` table and
> is loaded at runtime (60 s cache) — ranking is re-tunable without deploying code.
> Values shown are the seeded defaults.

Final score computed **in SQL** (single query):

```
score =
    3.0 * ts_rank_cd(search_vector, tsquery, normalization 1)   -- FTS base
  + 1.5 * title_similarity                                       -- trigram title vs query
  + 1.0 * GREATEST(word_similarity over tags/category)
  + 2.0 * exact_title_match_bonus       (lower(title) = lower(query))
  + 1.5 * phrase_in_title_bonus         (title ILIKE '%query%' or phraseto_tsquery match)
  + 0.6 * category_name_similarity      (enum label words vs query)
  + 0.4 * author_similarity
  + 0.5 * popularity                    -- log-scaled viewCount/likes/shares
                                          -- (viewCount is canonical; `views` deprecated)
  + 0.5 * freshness                     -- exp decay on published_at
  + search_boost                        -- manual: post.featured +0.3, future per-post boost col
```

- Synonym expansion (Phase 8.2, DB-driven): `plainto_tsquery` built from
  `query OR synonyms(query)`; trigram candidates matched against expanded set.
- Constants shown are seeded defaults in `RankingService`; runtime values come
  from `search_configuration` (§12.3) — unit tests pin explicit values.
- Query parsing ladder: `websearch_to_tsquery` (user-friendly) → fallback
  `plainto_tsquery` → trigram-only mode for nonsense input.
- Prefix support via `:*` prefix terms on the last token (typeahead) and trigram
  `%` operator.

---

## 5. Filter & Sort Engine

`FilterService` validates with zod:
`category[], tags[], author, country, language, featured, trending, popular,
readingTime[min,max], dateFrom, dateTo, minViews, maxViews, minLikes, maxLikes,
sort = relevance|newest|oldest|trending|views|shares|alpha`

- Trending = views in last 7 days (from `blog_post_views`) blended with likes.
- All filters translate to SQL `WHERE` fragments + parameters (never string
  interpolation of user input).
- Cursor pagination: keyset on `(score, published_at, id)` for relevance sort;
  `(published_at, id)` otherwise. Response includes `nextCursor`.

---

## 6. Suggestions, DidYouMean, Highlighting

- **Autocomplete** (`GET /api/blog/search/suggest?q=&limit=`): union of
  1. title prefixes (`title ILIKE q%` via trgm index),
  2. top tag/category names,
  3. popular + trending + recent searches from `search_queries`,
  4. author display names.
  Debounced client-side (300 ms), cached 60 s server-side.
- **DidYouMean**: `word_similarity(query, title/tag)` best candidate with
  similarity > 0.5 and materially better than the query's own hit score.
- **Highlighting**: `ts_headline('english', excerpt/content, tsquery,
  'StartSel=<mark>, StopSel=</mark>, MaxFragments=3')` — returned as
  `snippet` + `highlightedTitle`. Frontend sanitizes to allowed tags only.

---

## 7. Related Posts Engine

`RelatedPostsService.findRelated(slug, limit=6)`:

```
relationshipScore =
    0.35 * jaccard(shared tags)
  + 0.20 * same category
  + 0.15 * trigram title similarity
  + 0.15 * FTS similarity (source post's tsquery vs candidate vector)
  + 0.05 * shared top keywords (top-N tsvector lexemes)
  + 0.05 * freshness proximity
  + 0.05 * popularity + reading-time proximity
```

- Candidates: 200 fast pre-filter via tag/category overlap + trigram on title
  (indexed), then exact scoring on that set.
- Excludes: the post itself, non-PUBLISHED/APPROVED, `ARCHIVED`, score < 0.15.
- Returns `reasons[]` built from which sub-scores fired
  ("Matched Tags", "Same Category", "High Title Similarity", …).
- Cached: 10-minute in-memory cache keyed by `slug:limit` (invalidated on publish).
- **Backward compat**: keep `GET /api/blog/posts/related` working (delegate to
  new service) while adding `GET /api/blog/{slug}/related` per spec.

---

## 8. API Contracts

### GET /api/blog/search
Params: `q, cursor, limit, category, categories, tags, author, sort, dateFrom,
dateTo, featured, language, country, minViews, maxViews, minLikes, maxLikes, readingTime`

```json
{
  "results": [{ "id","slug","title","excerpt","snippet","highlightedTitle",
                "category","tags","author","publishedAt","readingTime",
                "views","likes","score" }],
  "filters": { "applied": {...}, "facets": { "categories": [{name,count}], "tags": [...] } },
  "suggestions": [],
  "didYouMean": "",
  "relatedSearches": [],
  "nextCursor": null,
  "totalResults": 0,
  "searchTimeMs": 12
}
```

### GET /api/blog/search/suggest → `{ "suggestions": [{ "text","type","count"? }] }`
### GET /api/blog/[slug]/related → `{ "relatedPosts": [ { …, "relationshipScore", "reasons": [] } ] }`
### POST /api/blog/search/click → `{ "ok": true }` (body: `queryId|query, postId, source: results|related|didYouMean`)

Security: rate limiting via existing `lib/rate-limit`, zod validation, query
length cap (200 chars), parameterized SQL only, `no-store` headers.

---

## 9. Frontend Integration (final phase)

1. `app/blog/blog-content.tsx` + `mobile-blog-content.tsx`: point search at
   `/api/blog/search` with debounce; render `snippet` with `<mark>` support,
   didYouMean banner, autocomplete dropdown, filter chips (category/tags/date/sort).
2. `components/blog/related-posts.tsx`: consume `/api/blog/[slug]/related`,
   display score-ordered posts (reasons hidden or as tooltip).
3. Click telemetry: send `/click` on result/recommendation open.

---

## 10. Testing Strategy

| Level | Tooling | Coverage |
|---|---|---|
| Unit | Node test runner or vitest (new dev dep) | tokenizer, synonym expansion, ranking formula, filter parsing, cursor encode/decode |
| Integration | scripts hitting a test DB (`scripts/test-search.ts`) | search e2e: "vaccination schedule", "vaccnation" typo, "café", prefix "vacc", synonym "cheap feed" |
| Ranking tests | fixture posts | exact-title > phrase > tag > content ordering |
| Recommendation tests | fixture posts | shared-tag posts outrank random; current post excluded |
| Perf benchmark | `scripts/bench-search.ts` | p50/p95 latency targets: <100 ms @ 100K rows |

---

## 11. Delivery Phases (incremental, feature by feature)

**Phase 1 — Database foundation** *(no behavior change yet)*
- [ ] Migration: extensions, `tag_names`/`author_name` + chained triggers,
      trigger-maintained `search_vector` (§3.1), all indexes, `search_queries`
      (final shape §12.7), `search_synonyms`(+words), `search_configuration`
      (seeded), `search_boost_rules`, `domain_concepts` + `blog_post_concepts`
      (seeded glossary), 6 materialized views — **all Phase 8 DB objects ship
      here so the schema migrates once**
- [ ] Chunked vector backfill script + `diagnose-search` health check update
- ✅ Exit: `EXPLAIN ANALYZE` shows GIN index scans; tag rename rebuilds vectors;
      existing search untouched

**Phase 2 — Core search service v2 + API**
- [ ] `lib/search-v2/`: QueryBuilder, RankingService (weights from
      `search_configuration`), FilterService, SynonymService (DB-driven),
      ConfigService, SnippetService
- [ ] **Strategy interfaces from day one** (decision): `SearchStrategy`,
      `RankingStrategy`, `RecommendationStrategy` + engine registry; the
      Phase 2 services are the first Postgres implementations of them
- [ ] `GET /api/blog/search` with full envelope (results, filters, nextCursor,
      searchTimeMs; suggestions/didYouMean stubbed)
- ✅ Exit: integration script passes the 5 acceptance queries; p95 < 100 ms

**Phase 3 — Suggestions, didYouMean, analytics**
- [ ] SuggestionService (titles/tags/categories/authors/search history)
- [ ] DidYouMean via word_similarity
- [ ] SearchAnalyticsService (async inserts, retention note), `POST /click`
- ✅ Exit: typo query returns correction + fuzzy results; queries logged

**Phase 4 — Related posts engine**
- [ ] RelatedPostsService + reasons; `GET /api/blog/{slug}/related`; legacy route delegates; caching
- ✅ Exit: recommendation tests pass; response matches spec shape

**Phase 5 — Frontend integration**
- [ ] Blog list search UX (autocomplete, highlighting, filters, didYouMean)
- [ ] Related posts component on article page; click telemetry
- ✅ Exit: manual walkthrough of blog search + article page

**Phase 6 — Tests & performance**
- [ ] Unit + integration + benchmark scripts; ranking fixtures
- [ ] `EXPLAIN ANALYZE` audit, index tuning, `pg_stat_statements` check
- ✅ Exit: benchmark report committed

**Phase 7 — Hardening & docs**
- [ ] Rate limits, input caps, error taxonomy, monitoring hooks
- [ ] Architecture doc update (`SEARCH_ENGINE_DOCUMENTATION.md`)
- [ ] Swap-point doc: how to plug a VectorSearchStrategy later

**Phase 8 — Advanced Search Intelligence** *(full design: §12)*
- [ ] 8A DB objects: all tables/triggers/matviews already created in the Phase 1
      migration — 8A is verification only (trigger coverage, backfill integrity,
      matview refresh test)
- [ ] 8B Configurable ranking: ConfigService + BoostRuleService + explainability
      (`debug=1` diagnostics, admin-only in public responses)
- [ ] 8C Domain-aware related posts: KeywordExtractionService + 2-step candidate
      generation (~200 candidates → full scoring)
- [ ] 8D Facets in-query, SearchCache (TTL + invalidation hooks), hourly cron
      matview refresh, SearchDiagnosticsService + **admin API endpoints only**
      (decision: API first, admin UI after the backend is complete)
- [ ] 8E Unit/integration tests, benchmarks, architecture docs
- ✅ Exit: synonym/boost/config changes take effect with no deploy; "Treating
  Newcastle Disease" recommends Newcastle vaccination articles via shared
  concepts; facets arrive in one round trip; admin health report works

---

## 12. Phase 8 — Advanced Search Intelligence (detailed design)

> Scope: advanced intelligence layered onto the core engine (Phases 1–7)
> **without changing the public API**. Everything is PostgreSQL-native,
> DB-configured (admin-tunable without deploys), modular, and tested.

### 12.1 Trigger-based search vector — adopted into Phase 1

See §3.1. Generated columns were rejected because they cannot reference joins
or dynamic data. Trigger maintenance is transactional and unlimited in data
sources (tags, authors, category labels, future metadata). A chunked backfill
(`UPDATE ... FROM (SELECT ...)`, 1000 rows/batch) covers existing posts.

**Why:** relevance (vector always reflects truth), scalability (index-backed,
no per-query recomputation), maintainability (no app code on write paths).

### 12.2 Synonym engine (database-driven)

```sql
CREATE TABLE search_synonyms (
  id text PRIMARY KEY,
  name text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE search_synonym_words (
  id text PRIMARY KEY,
  "synonymId" text NOT NULL REFERENCES search_synonyms(id) ON DELETE CASCADE,
  word text NOT NULL,
  UNIQUE ("synonymId", word)
);
CREATE INDEX idx_synonym_words_word ON search_synonym_words (word);
```

- No hardcoded synonyms in TypeScript. Seed: `cheap` group = cheap, budget,
  affordable, economical, low cost.
- `SynonymService` loads groups into an in-memory `Map<word, groupWords[]>`
  (5-minute TTL; busted on admin mutation).
- Expansion applies in recall mode only (`plainto_tsquery` over expanded terms,
  `simple` dict); AND-precision mode never expands. Trigram matching unaffected.
- Admin CRUD under `/api/admin/search/synonyms` (Phase 8D), ready for a future
  admin UI.

### 12.3 Configurable ranking (`search_configuration`)

```sql
CREATE TABLE search_configuration (
  key text PRIMARY KEY,
  value numeric NOT NULL,
  description text,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
```

- Seeded keys: `ftsWeight, titleWeight, tagWeight, categoryWeight, excerptWeight,
  contentWeight, freshnessWeight, popularityWeight, trigramWeight, phraseWeight,
  exactMatchWeight, featuredWeight, manualBoostWeight` plus cache TTLs and
  similarity thresholds.
- `ConfigService.getWeights()` → typed `RankingWeights`, 60 s in-memory cache.
- Admin endpoint `PATCH /api/admin/search/config` updates values → ranking
  changes ship without a deploy.

### 12.4 Search boost rules

```sql
CREATE TABLE search_boost_rules (
  id text PRIMARY KEY,
  keyword text NOT NULL,
  weight numeric NOT NULL,            -- fraction: 0.25 = +25%
  enabled boolean NOT NULL DEFAULT true,
  "startDate" timestamptz,            -- NULL = open-ended
  "endDate" timestamptz,
  reason text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_boost_rules_keyword_trgm
  ON search_boost_rules USING gin (keyword gin_trgm_ops);
```

- `BoostRuleService` selects rules that are `enabled` and inside their date
  window **and** whose keyword matches the query (tokens or phrase); SQL applies
  `score * (1 + LEAST(sum(weight), maxBoost))`.
- Expired/disabled rules are filtered in SQL, so they're ignored automatically.
- Examples: "day old chicks" +25 %, "vaccination" +15 %, "sponsored" +40 %.
- Diagnostics report `Manual Boost Applied` when `debug=1` (§12.13).

### 12.5 Domain-aware related posts + KeywordExtractionService

```sql
CREATE TYPE concept_type AS ENUM ('DISEASE','VACCINE','MEDICINE','FEED_TYPE',
  'BREED','PRODUCTION_SYSTEM','EQUIPMENT','AGE_GROUP','PRACTICE','HEALTH_TOPIC');

CREATE TABLE domain_concepts (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type concept_type NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE blog_post_concepts (
  "postId" text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  "conceptId" text NOT NULL REFERENCES domain_concepts(id) ON DELETE CASCADE,
  PRIMARY KEY ("postId", "conceptId")
);
CREATE INDEX idx_post_concepts_concept ON blog_post_concepts ("conceptId");
```

- `KeywordExtractionService.extract(title + excerpt + content)` matches concept
  names/aliases (normalized token matching, optional trigram fuzzy ≥ 0.85).
  Runs idempotently on post create/update/publish; reusable by any service.
- Seed glossary: diseases (Newcastle, Gumboro/IBD, coccidiosis, Marek's, CRD),
  vaccines & medicines, feed types (starter/grower/layer mash), breeds (broiler,
  layer, kienyeji), systems (battery cage, deep litter, free range), equipment,
  age groups (chick, pullet, point-of-lay), practices (brooding, vaccination).
- Relationship score re-weighted (sums to 1.0):

| Signal | Weight |
|---|---|
| Shared tags (Jaccard) | 0.25 |
| **Shared domain concepts (Jaccard)** | **0.20** |
| Same category | 0.15 |
| FTS similarity | 0.13 |
| Title trigram similarity | 0.12 |
| Shared top keywords | 0.05 |
| Freshness proximity | 0.05 |
| Popularity + reading-time proximity | 0.05 |

**Why:** "Treating Newcastle Disease" now recommends "Vaccination Schedule
Against Newcastle", "Signs of Newcastle Disease", "Best Vaccines for Newcastle"
— concept overlap captures domain meaning that lexical similarity misses.

### 12.6 Faceted search (single round trip)

`FacetService` wraps the search SQL in `WITH base AS (<filtered + scored rows>)`
then aggregates from `base` in the same statement:

- categories: `GROUP BY category`
- tags: unnest of matched posts' tags, top-N
- authors: top-N by result count
- reading time buckets: `<5`, `5–10`, `>10` minutes

Facets respect all applied filters except the facet's own dimension (standard
faceted-search semantics, documented). Returned in `filters.facets` so the
frontend re-filters without extra queries.

### 12.7 Query intelligence schema

`search_queries` final shape (extends §3.5):

```
query, normalized, filters_json, sort, result_count, no_results,
search_duration_ms, response_ms, session_id, user_id, ip_hash, referrer,
clicked_post_id, clicked_position, time_to_click_ms,
autocomplete_used, did_you_mean_shown, did_you_mean_used,
source (results | related | didYouMean), created_at
```

`POST /api/blog/search/click` accepts `position` and `timeToClick`. These
columns feed the materialized views (§12.8) and future learning signals —
they are collected now even though ranking doesn't consume them yet.

### 12.8 Trending materialized views + hourly refresh

| Materialized view | Source |
|---|---|
| `mv_trending_searches` | last-24h query growth vs prior 24h |
| `mv_popular_search_terms` | top normalized queries, 30 days, results > 0 |
| `mv_popular_tags` | tag post counts + views |
| `mv_popular_categories` | category post counts + views |
| `mv_popular_authors` | author views/likes/post counts |
| `mv_popular_related_articles` | click events with `source = 'related'` |

- Each has a unique index → `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- Refresh + retention pruning runs hourly from
  `GET /api/cron/search/refresh?secret=…` (same secret-guard pattern as the
  existing `app/api/cron/farm/*` routes).
- `SuggestionService` reads matviews first, falls back to live aggregates.

### 12.9 Intelligent candidate generation (formalized)

1. **Candidate SQL (indexed, fast):** UNION of tag overlap, same category,
   trigram `%` on title, and recent popularity leaders → `LIMIT 200` distinct.
2. **Full scoring** only on those candidates (`WHERE id = ANY($1)`), then top-N.

Cost is bounded at O(200) regardless of table size → scales to millions of
posts. This is the Phase 4 engine's execution strategy.

### 12.10 Dictionary optimization

- Title/excerpt/content: `to_tsvector('english', unaccent(text))` → stemming,
  plural handling, stopword removal, accent-insensitive.
- Tags: `to_tsvector('simple', unaccent(text))` → keeps tag literals exact
  (stemming harms tag matching).
- Query side: `unaccent()` user input; synonym expansion uses `simple`.
- Provide an immutable wrapper `f_unaccent()` (standard pattern) so unaccent can
  appear in expression indexes.

### 12.11 Search result cache

`SearchCache` (in-memory LRU + TTL, zero new dependencies):

- Caches: search pages (+facets), autocomplete, related posts, popular/trending.
- Key = hash of normalized params; TTLs read from `search_configuration`.
- Invalidation hooks called from the existing post create/update/approve and
  tag routes: `invalidate({ scope: 'search' | 'related' | 'suggestions',
  tags, category, slug })`.
- Popularity changes are covered by TTL + hourly matview refresh (documented
  approximation).

### 12.12 SearchDiagnosticsService (health monitoring)

`healthReport()` returns: avg/p50/p95 `response_ms`, no-result percentage,
slow-query list, index usage (`pg_stat_user_indexes`), most frequent searches,
most frequent typos (`did_you_mean_used`), search CTR, recommendation CTR, top
related articles, vector-freshness check (% posts with NULL/stale vectors).

- Admin endpoint: `GET /api/admin/search/diagnostics` (existing admin-auth
  pattern). Extends the current `diagnoseSearchHealth()` probes.

### 12.13 Explainability

- With `debug=true`, the QueryBuilder selects per-result sub-scores:
  matched fields, `ftsRank`, `trigramSim`, `exactMatch`, `phraseMatch`,
  `popularity`, `freshness`, `boostRulesApplied`.
- Public API responses strip diagnostics unless `debug=1` **and** the requester
  is an admin; tests and internal tooling always see them.
- Ranking tests assert on diagnostics (e.g., exact-title beats phrase beats tag).

### 12.14 Strategy interfaces (future compatibility)

```ts
// lib/search-v2/strategies/types.ts
interface SearchStrategy {
  readonly id: string;
  search(ctx: SearchContext): Promise<RankedCandidate[]>;
}
interface RankingStrategy {
  rank(candidates: Candidate[], weights: RankingWeights): ScoredResult[];
}
interface RecommendationStrategy {
  related(post: PostRef, limit: number): Promise<RelatedCandidate[]>;
}
```

- An engine registry resolves the active strategy from configuration.
- Today: `PostgresFtsSearchStrategy`, `SqlRankingStrategy`,
  `HybridRecommendationStrategy`. A future pgvector/semantic implementation
  plugs in without changing routes or frontend.
- Vector search is deliberately **not** implemented now — only the seams.

### 12.15 Phase 8 acceptance criteria

- Change a weight / synonym / boost rule in the DB → next search reflects it,
  no deploy.
- "Treating Newcastle Disease" recommends the Newcastle vaccination article with
  reason `Shared Domain Concepts`.
- Searching "vaccination" returns category/tag/author/read-time facet counts in
  the same response.
- Admin diagnostics endpoint returns a health report; public responses expose no
  internal scores.
- Benchmarks: search p95 < 100 ms, related posts p95 < 150 ms at target volume.
- Tests: synonym expansion, boost window expiry, concept extraction, candidate
  generation bounds; integration: cron matview refresh, cache invalidation.

### 12.16 Documentation requirement

Every Phase 8 sub-phase ends with an entry in `SEARCH_ENGINE_DOCUMENTATION.md`
covering the decision and why it improves relevance, recommendation quality,
scalability, and maintainability.

---

## 13. Decisions Log (locked)

| # | Question | Decision |
|---|---|---|
| 1 | Migration baseline | **`prisma migrate diff` → manual apply → `prisma migrate resolve`** (§3.7) |
| 2 | Popularity field | **`viewCount` is canonical**; `views` deprecated, no new readers |
| 3 | Language/country | **Deferred** to a localization phase; filter params rejected with a clear message until then |
| 4 | Admin surface | **API endpoints first**, admin UI built after the backend is complete |
| 5 | Architecture | **Strategy interfaces (`SearchStrategy` / `RankingStrategy` / `RecommendationStrategy`) introduced from the beginning** |
| 6 | Search vector | **Trigger-maintained** (not generated column) — adopted into Phase 1 |

**Standing defaults** (uncontested, changeable later):
- Trigram indexes: **titles only** (excerpt trigram index deferred unless benchmarks demand it).
- `search_queries` retention: **90 days**, pruned by the hourly cron route.
- Cron runner: **secret-guarded Next.js route** (`/api/cron/search/refresh`),
  matching the existing `app/api/cron/farm/*` pattern; schedule via Vercel cron
  or an external scheduler.
