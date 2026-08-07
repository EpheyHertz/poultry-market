-- ============================================================
-- Migration: add_search_engine
-- Phase 1 + Phase 8 database foundation for the hybrid blog
-- search / recommendation engine (PostgreSQL-native only).
--
-- Contents:
--   1.  Extensions (pg_trgm, unaccent) + immutable wrappers
--   2.  Denormalized search columns on blog_posts
--   3.  Trigger-maintained search_vector (weighted tsvector)
--   4.  Chained sync triggers (post tags, tag rename, author rename)
--   5.  Indexes (GIN full-text + trigram + listing indexes)
--   6.  search_queries analytics table (final Phase 8.7 shape)
--   7.  search_synonyms / search_synonym_words + seed
--   8.  search_configuration (DB-tunable ranking weights) + seed
--   9.  search_boost_rules + seed
--   10. domain_concepts / blog_post_concepts + poultry glossary seed
--   11. Materialized views for query intelligence + unique indexes
--
-- Everything is idempotent where possible so the apply script
-- can be safely re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extensions & helpers
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Immutable wrapper around unaccent() so it can be used in
-- expression indexes and immutable contexts (standard pattern).
CREATE OR REPLACE FUNCTION f_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$;

-- Human-readable label for a blog category enum value.
-- Accepts text so it never depends on the enum type name.
CREATE OR REPLACE FUNCTION category_label(cat text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT CASE cat
    WHEN 'FARMING_TIPS'        THEN 'Farming Tips'
    WHEN 'POULTRY_HEALTH'      THEN 'Poultry Health'
    WHEN 'FEED_NUTRITION'      THEN 'Feed Nutrition'
    WHEN 'EQUIPMENT_GUIDES'    THEN 'Equipment Guides'
    WHEN 'MARKET_TRENDS'       THEN 'Market Trends'
    WHEN 'SUCCESS_STORIES'     THEN 'Success Stories'
    WHEN 'INDUSTRY_NEWS'       THEN 'Industry News'
    WHEN 'SEASONAL_ADVICE'     THEN 'Seasonal Advice'
    WHEN 'BEGINNER_GUIDES'     THEN 'Beginner Guides'
    WHEN 'ADVANCED_TECHNIQUES' THEN 'Advanced Techniques'
    ELSE coalesce(cat, '')
  END;
$$;

-- ------------------------------------------------------------
-- 2. Denormalized search columns
-- ------------------------------------------------------------
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tag_names text;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ------------------------------------------------------------
-- 3. Trigger-maintained search vector
--    Weights: A=title(english), B=tags(simple),
--    C=excerpt+author+category label(english), D=content(english)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION rebuild_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tag_names := coalesce(
    (SELECT string_agg(t.name, ' ')
       FROM blog_post_tags pt
       JOIN blog_tags t ON t.id = pt."tagId"
      WHERE pt."postId" = NEW.id),
    '');
  NEW.author_name := coalesce(
    (SELECT "displayName" FROM author_profiles WHERE id = NEW."authorProfileId"),
    (SELECT name FROM users WHERE id = NEW."authorId"),
    '');
  NEW.search_vector :=
    setweight(to_tsvector('english', f_unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('simple',  f_unaccent(coalesce(NEW.tag_names, ''))), 'B') ||
    setweight(to_tsvector('english', f_unaccent(
        coalesce(NEW.excerpt, '') || ' ' ||
        coalesce(NEW.author_name, '') || ' ' ||
        category_label(NEW.category::text))), 'C') ||
    setweight(to_tsvector('english', f_unaccent(coalesce(NEW.content, ''))), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_search_vector ON blog_posts;
CREATE TRIGGER trg_blog_posts_search_vector
  BEFORE INSERT OR UPDATE OF title, excerpt, content, category,
                             "authorId", "authorProfileId"
  ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION rebuild_search_vector();

-- ------------------------------------------------------------
-- 4. Chained sync triggers
-- ------------------------------------------------------------

-- Rebuild all three search fields for one post from current data.
-- Used by chained triggers below AND by the backfill script.
-- Updates tag_names/author_name/search_vector only, which are NOT
-- in the main trigger's column list, so no trigger recursion.
CREATE OR REPLACE FUNCTION fn_refresh_post_search_fields(p_post_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH src AS (
    SELECT bp.id AS pid,
      coalesce(
        (SELECT string_agg(t.name, ' ')
           FROM blog_post_tags pt
           JOIN blog_tags t ON t.id = pt."tagId"
          WHERE pt."postId" = bp.id),
        '') AS new_tags,
      coalesce(
        (SELECT "displayName" FROM author_profiles WHERE id = bp."authorProfileId"),
        (SELECT name FROM users WHERE id = bp."authorId"),
        '') AS new_author,
      bp.title AS new_title,
      bp.excerpt AS new_excerpt,
      bp.content AS new_content,
      bp.category AS new_category
    FROM blog_posts bp
    WHERE bp.id = p_post_id
  )
  UPDATE blog_posts bp
  SET tag_names     = src.new_tags,
      author_name   = src.new_author,
      search_vector =
        setweight(to_tsvector('english', f_unaccent(coalesce(src.new_title, ''))), 'A') ||
        setweight(to_tsvector('simple',  f_unaccent(src.new_tags)), 'B') ||
        setweight(to_tsvector('english', f_unaccent(
            coalesce(src.new_excerpt, '') || ' ' ||
            src.new_author || ' ' ||
            category_label(src.new_category::text))), 'C') ||
        setweight(to_tsvector('english', f_unaccent(coalesce(src.new_content, ''))), 'D')
  FROM src
  WHERE bp.id = src.pid;
END;
$$;

-- 4a. Tag added/removed on a post -> rebuild that post.
CREATE OR REPLACE FUNCTION fn_post_tags_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM fn_refresh_post_search_fields(NEW."postId");
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM fn_refresh_post_search_fields(OLD."postId");
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_post_tags_changed ON blog_post_tags;
CREATE TRIGGER trg_blog_post_tags_changed
  AFTER INSERT OR DELETE ON blog_post_tags
  FOR EACH ROW
  EXECUTE FUNCTION fn_post_tags_changed();

-- 4b. Tag renamed -> rebuild every post carrying that tag.
CREATE OR REPLACE FUNCTION fn_blog_tags_name_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM fn_refresh_post_search_fields(pt."postId")
  FROM (
    SELECT DISTINCT pt2."postId"
    FROM new_table nt
    JOIN old_table ot ON ot.id = nt.id
    JOIN blog_post_tags pt2 ON pt2."tagId" = nt.id
    WHERE ot.name IS DISTINCT FROM nt.name
  ) pt;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_tags_name_changed ON blog_tags;
CREATE TRIGGER trg_blog_tags_name_changed
  AFTER UPDATE ON blog_tags
  REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_blog_tags_name_changed();

-- 4c. users.name changed -> rebuild that user's posts.
CREATE OR REPLACE FUNCTION fn_users_name_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM fn_refresh_post_search_fields(bp.id)
  FROM blog_posts bp
  JOIN new_table nt ON nt.id = bp."authorId"
  JOIN old_table ot ON ot.id = nt.id
  WHERE ot.name IS DISTINCT FROM nt.name;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_name_changed ON users;
CREATE TRIGGER trg_users_name_changed
  AFTER UPDATE ON users
  REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_users_name_changed();

-- 4d. author_profiles."displayName" changed -> rebuild those posts.
CREATE OR REPLACE FUNCTION fn_author_display_name_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM fn_refresh_post_search_fields(bp.id)
  FROM blog_posts bp
  JOIN new_table nt ON nt.id = bp."authorProfileId"
  JOIN old_table ot ON ot.id = nt.id
  WHERE ot."displayName" IS DISTINCT FROM nt."displayName";
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_author_profiles_display_name_changed ON author_profiles;
CREATE TRIGGER trg_author_profiles_display_name_changed
  AFTER UPDATE ON author_profiles
  REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_author_display_name_changed();

-- ------------------------------------------------------------
-- 5. Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_blog_posts_search_vector
  ON blog_posts USING gin (search_vector);

CREATE INDEX IF NOT EXISTS idx_blog_posts_title_trgm
  ON blog_posts USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_blog_posts_title_unaccent_trgm
  ON blog_posts USING gin ((f_unaccent(lower(title))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_blog_posts_excerpt_trgm
  ON blog_posts USING gin (excerpt gin_trgm_ops)
  WHERE status IN ('PUBLISHED', 'APPROVED');

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at_public
  ON blog_posts ("publishedAt" DESC)
  WHERE status IN ('PUBLISHED', 'APPROVED');

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_category_published
  ON blog_posts (status, category, "publishedAt" DESC);

-- ------------------------------------------------------------
-- 6. Query intelligence (created with FINAL Phase 8.7 shape)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS search_queries (
  id                    text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  query                 text NOT NULL,
  normalized            text NOT NULL,
  filters_json          jsonb,
  sort                  text,
  result_count          int NOT NULL DEFAULT 0,
  no_results            boolean NOT NULL DEFAULT false,
  user_id               text,
  session_id            text,
  ip_hash               text,
  referrer              text,
  response_ms           int,
  search_duration_ms    int,
  clicked_post_id       text,
  clicked_position      int,
  time_to_click_ms      int,
  opened_related_id     text,
  autocomplete_used     boolean NOT NULL DEFAULT false,
  did_you_mean_shown    boolean NOT NULL DEFAULT false,
  did_you_mean_used     boolean NOT NULL DEFAULT false,
  source                text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_normalized_created
  ON search_queries (normalized, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at
  ON search_queries (created_at);
CREATE INDEX IF NOT EXISTS idx_search_queries_normalized_trgm
  ON search_queries USING gin (normalized gin_trgm_ops);

-- ------------------------------------------------------------
-- 7. Synonym engine (database-driven; no hardcoded synonyms)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS search_synonyms (
  id text PRIMARY KEY,
  name text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_synonym_words (
  id text PRIMARY KEY,
  "synonymId" text NOT NULL REFERENCES search_synonyms(id) ON DELETE CASCADE,
  word text NOT NULL,
  UNIQUE ("synonymId", word)
);

CREATE INDEX IF NOT EXISTS idx_synonym_words_word
  ON search_synonym_words (word);

-- Seed: "cheap" price group
INSERT INTO search_synonyms (id, name)
VALUES ('syngrp_cheap', 'cheap-price-group')
ON CONFLICT (id) DO NOTHING;

INSERT INTO search_synonym_words (id, "synonymId", word)
VALUES
  ('synw_cheap_1', 'syngrp_cheap', 'cheap'),
  ('synw_cheap_2', 'syngrp_cheap', 'budget'),
  ('synw_cheap_3', 'syngrp_cheap', 'affordable'),
  ('synw_cheap_4', 'syngrp_cheap', 'economical'),
  ('synw_cheap_5', 'syngrp_cheap', 'low cost')
ON CONFLICT ("synonymId", word) DO NOTHING;

-- ------------------------------------------------------------
-- 8. Configurable ranking (admin-tunable without deploys)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS search_configuration (
  key text PRIMARY KEY,
  value numeric NOT NULL,
  description text,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO search_configuration (key, value, description) VALUES
  -- Composite ranking weights (see SEARCH_IMPLEMENTATION_PLAN.md §4)
  ('ftsWeight',          3.0, 'Multiplier for full-text ts_rank_cd score'),
  ('titleWeight',        1.5, 'Multiplier for title trigram/lexical similarity'),
  ('tagWeight',          1.0, 'Multiplier for tag overlap bonus'),
  ('categoryWeight',     0.6, 'Bonus for matching category filter/term'),
  ('excerptWeight',      0.8, 'Multiplier for excerpt match bonus'),
  ('contentWeight',      0.5, 'Multiplier for content-only match bonus'),
  ('authorWeight',       0.4, 'Bonus for matching author name'),
  ('freshnessWeight',    0.5, 'Multiplier for recency decay bonus'),
  ('popularityWeight',   0.5, 'Multiplier for log-scaled viewCount popularity'),
  ('trigramWeight',      1.0, 'Multiplier for fuzzy trigram similarity score'),
  ('phraseWeight',       1.5, 'Bonus when query appears as an exact phrase'),
  ('exactMatchWeight',   2.0, 'Bonus for exact title match'),
  ('featuredWeight',     0.3, 'Bonus for featured posts'),
  ('manualBoostWeight',  0.4, 'Default weight scale for manual boost rules'),
  -- Cache TTLs (seconds)
  ('cacheTtlSearchSec',       300, 'Search result page cache TTL'),
  ('cacheTtlAutocompleteSec',  60, 'Autocomplete cache TTL'),
  ('cacheTtlRelatedSec',      600, 'Related posts cache TTL'),
  ('cacheTtlSuggestionsSec',  900, 'Suggestions/popular cache TTL'),
  -- Thresholds & limits
  ('trigramSimThreshold',  0.3, 'Minimum trigram similarity for fuzzy candidates'),
  ('fuzzyMatchThreshold',  0.4, 'Minimum similarity to accept did-you-mean term'),
  ('relatedMinScore',     0.05, 'Minimum related-post score to include a result'),
  ('candidateLimit',       200, 'Max candidates in related-posts candidate generation'),
  ('maxBoostTotal',        1.0, 'Cap on summed boost-rule weights (fraction)')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 9. Search boost rules (keyword boosts with date windows)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS search_boost_rules (
  id text PRIMARY KEY,
  keyword text NOT NULL,
  weight numeric NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  "startDate" timestamptz,
  "endDate" timestamptz,
  reason text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boost_rules_keyword_trgm
  ON search_boost_rules USING gin (keyword gin_trgm_ops);

INSERT INTO search_boost_rules (id, keyword, weight, enabled, reason) VALUES
  ('boostrule_dayoldchicks', 'day old chicks', 0.25, true, 'High commercial demand for day-old chicks content'),
  ('boostrule_vaccination',  'vaccination',    0.15, true, 'Core poultry-health priority topic'),
  ('boostrule_sponsored',    'sponsored',      0.40, true, 'Example manual boost (disable if unused)')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 10. Domain concepts (poultry knowledge graph)
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE concept_type AS ENUM (
    'DISEASE', 'VACCINE', 'MEDICINE', 'FEED_TYPE', 'BREED',
    'PRODUCTION_SYSTEM', 'EQUIPMENT', 'AGE_GROUP', 'PRACTICE', 'HEALTH_TOPIC'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS domain_concepts (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type concept_type NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_post_concepts (
  "postId" text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  "conceptId" text NOT NULL REFERENCES domain_concepts(id) ON DELETE CASCADE,
  PRIMARY KEY ("postId", "conceptId")
);

CREATE INDEX IF NOT EXISTS idx_post_concepts_concept
  ON blog_post_concepts ("conceptId");

-- Seed glossary (Kenyan poultry domain)
INSERT INTO domain_concepts (id, name, type, aliases) VALUES
  -- Diseases
  ('concept_newcastle',       'Newcastle Disease',            'DISEASE', ARRAY['newcastle','ranikhet disease','nd','newcastle disease virus']),
  ('concept_gumboro',         'Gumboro Disease',              'DISEASE', ARRAY['gumboro','infectious bursal disease','ibd']),
  ('concept_coccidiosis',     'Coccidiosis',                  'DISEASE', ARRAY['cocci','coccidia']),
  ('concept_mareks',          'Marek''s Disease',             'DISEASE', ARRAY['mareks','marek disease']),
  ('concept_crd',             'Chronic Respiratory Disease',  'DISEASE', ARRAY['crd','mycoplasma','mycoplasma gallisepticum']),
  ('concept_fowl_pox',        'Fowl Pox',                     'DISEASE', ARRAY['pox','fowlpox']),
  ('concept_avian_influenza', 'Avian Influenza',              'DISEASE', ARRAY['bird flu','avian flu','ai']),
  -- Vaccines
  ('concept_newcastle_vaccine','Newcastle Vaccine',           'VACCINE', ARRAY['lasota','hb1','nd vaccine','newcastle vaccine']),
  ('concept_gumboro_vaccine', 'Gumboro Vaccine',              'VACCINE', ARRAY['ibd vaccine','gumboro vaccine']),
  ('concept_mareks_vaccine',  'Marek''s Vaccine',             'VACCINE', ARRAY['mareks vaccine']),
  ('concept_fowl_pox_vaccine','Fowl Pox Vaccine',             'VACCINE', ARRAY['pox vaccine']),
  -- Medicines
  ('concept_amprolium',       'Amprolium',                    'MEDICINE', ARRAY['anticoccidial']),
  ('concept_multivitamins',   'Multivitamins',                'MEDICINE', ARRAY['multivitamin','vitamins','electrolytes']),
  -- Feed types
  ('concept_starter_mash',    'Starter Mash',                 'FEED_TYPE', ARRAY['starter feed','chick starter','chick mash']),
  ('concept_grower_mash',     'Grower Mash',                  'FEED_TYPE', ARRAY['grower feed','growers mash']),
  ('concept_layer_mash',      'Layer Mash',                   'FEED_TYPE', ARRAY['layer feed','layers mash','laying mash']),
  -- Breeds
  ('concept_broiler',         'Broiler',                      'BREED', ARRAY['broilers','broiler chicken','meat chicken']),
  ('concept_layer',           'Layer',                        'BREED', ARRAY['layers','layer chicken','egg laying chicken']),
  ('concept_kienyeji',        'Kienyeji',                     'BREED', ARRAY['kienyeji chicken','indigenous chicken','local chicken','improved kienyeji','kuroiler']),
  -- Production systems
  ('concept_battery_cage',    'Battery Cage System',          'PRODUCTION_SYSTEM', ARRAY['battery cage','cage system','cages']),
  ('concept_deep_litter',     'Deep Litter System',           'PRODUCTION_SYSTEM', ARRAY['deep litter']),
  ('concept_free_range',      'Free Range System',            'PRODUCTION_SYSTEM', ARRAY['free range','free-range']),
  -- Equipment
  ('concept_brooder',         'Brooder',                      'EQUIPMENT', ARRAY['brooding box','artificial brooder','heat source']),
  ('concept_feeders',         'Feeders',                      'EQUIPMENT', ARRAY['feeder','chicken feeder']),
  ('concept_drinkers',        'Drinkers',                     'EQUIPMENT', ARRAY['drinker','waterer','chicken drinker']),
  -- Age groups
  ('concept_chick',           'Chick',                        'AGE_GROUP', ARRAY['chicks','day old chick','day-old chicks','day old chicks']),
  ('concept_pullet',          'Pullet',                       'AGE_GROUP', ARRAY['pullets','young hen']),
  ('concept_point_of_lay',    'Point of Lay',                 'AGE_GROUP', ARRAY['point-of-lay','pol','point of lay hens']),
  -- Practices
  ('concept_brooding',        'Brooding',                     'PRACTICE', ARRAY['brooding management','brooding period']),
  ('concept_vaccination',     'Vaccination',                  'PRACTICE', ARRAY['vaccination schedule','vaccination program','vaccinate']),
  ('concept_beak_trimming',   'Beak Trimming',                'PRACTICE', ARRAY['debeaking','beak trim']),
  -- Health topics
  ('concept_biosecurity',     'Biosecurity',                  'HEALTH_TOPIC', ARRAY['biosecurity measures','farm biosecurity']),
  ('concept_deworming',       'Deworming',                    'HEALTH_TOPIC', ARRAY['dewormer','worms','parasite control'])
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 11. Materialized views for query intelligence
--     Each has a unique index so REFRESH ... CONCURRENTLY works.
-- ------------------------------------------------------------

-- 11a. Trending searches: last 24h growth vs prior 24h
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_trending_searches AS
SELECT
  normalized,
  count(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS recent_count,
  count(*) FILTER (WHERE created_at >= now() - interval '48 hours'
                     AND created_at <  now() - interval '24 hours') AS prior_count,
  ((count(*) FILTER (WHERE created_at >= now() - interval '24 hours')) + 1)::numeric
    / ((count(*) FILTER (WHERE created_at >= now() - interval '48 hours'
                           AND created_at < now() - interval '24 hours')) + 1)::numeric AS growth_score
FROM search_queries
WHERE created_at >= now() - interval '48 hours'
GROUP BY normalized
HAVING count(*) FILTER (WHERE created_at >= now() - interval '24 hours') >= 2;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_trending_searches_normalized
  ON mv_trending_searches (normalized);

-- 11b. Popular search terms (30 days, results-bearing queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_search_terms AS
SELECT
  normalized,
  count(*) AS search_count,
  avg(result_count)::int AS avg_results,
  max(created_at) AS last_searched_at
FROM search_queries
WHERE created_at >= now() - interval '30 days'
  AND result_count > 0
GROUP BY normalized
ORDER BY search_count DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_popular_search_terms_normalized
  ON mv_popular_search_terms (normalized);

-- 11c. Popular tags (post counts + views on public posts)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_tags AS
SELECT
  t.id AS tag_id,
  t.name,
  t.slug,
  count(pt."postId")::int AS post_count,
  coalesce(sum(bp."viewCount"), 0)::int AS total_views
FROM blog_tags t
JOIN blog_post_tags pt ON pt."tagId" = t.id
JOIN blog_posts bp ON bp.id = pt."postId"
                  AND bp.status IN ('PUBLISHED', 'APPROVED')
GROUP BY t.id, t.name, t.slug
ORDER BY post_count DESC, total_views DESC;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_popular_tags_tag_id
  ON mv_popular_tags (tag_id);

-- 11d. Popular categories
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_categories AS
SELECT
  category,
  count(*)::int AS post_count,
  coalesce(sum("viewCount"), 0)::int AS total_views
FROM blog_posts
WHERE status IN ('PUBLISHED', 'APPROVED')
GROUP BY category;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_popular_categories_category
  ON mv_popular_categories (category);

-- 11e. Popular authors (keyed by authorProfileId, falling back to authorId)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_authors AS
SELECT
  coalesce(bp."authorProfileId", bp."authorId") AS author_id,
  count(bp.id)::int AS post_count,
  coalesce(sum(bp."viewCount"), 0)::int AS total_views,
  coalesce(sum(bp.likes), 0)::int AS total_likes
FROM blog_posts bp
WHERE bp.status IN ('PUBLISHED', 'APPROVED')
GROUP BY coalesce(bp."authorProfileId", bp."authorId");

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_popular_authors_author_id
  ON mv_popular_authors (author_id);

-- 11f. Popular related articles (recommendation click-through)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_related_articles AS
SELECT
  opened_related_id AS post_id,
  count(*)::int AS open_count,
  max(created_at) AS last_opened_at
FROM search_queries
WHERE opened_related_id IS NOT NULL
GROUP BY opened_related_id
ORDER BY open_count DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_popular_related_articles_post_id
  ON mv_popular_related_articles (post_id);
