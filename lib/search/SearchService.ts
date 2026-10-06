/**
 * SearchService — Blog Search & Hybrid Lexical Search
 *
 * PostgreSQL/Prisma only.
 *
 * Search strategy:
 *
 *  1. Exact phrase search
 *  2. All-term search
 *  3. Any-term search
 *  4. Title + tag search
 *  5. Category search
 *  6. PostgreSQL Full-Text Search (optional enhancement)
 *  7. PostgreSQL trigram fuzzy search
 *  8. Published-post fallback
 *
 * No embeddings.
 * No external AI search API.
 *
 * The Prisma search path is the authoritative path because it uses the
 * actual Prisma schema rather than assuming physical PostgreSQL table names.
 *
 * Raw SQL is used only for optional FTS/trigram enhancements.
 */

import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/seo';

import type {
  BlogSearchResult,
  SearchBlogsParams,
  SemanticSearchParams,
  SemanticSearchResult,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

const RRF_K = 60;

const FTS_CANDIDATE_LIMIT = 40;
const TRIGRAM_CANDIDATE_LIMIT = 30;

const TRIGRAM_SIMILARITY_THRESHOLD = 0.12;

const MIN_TERM_LENGTH = 2;

/**
 * Conservative stopword list.
 *
 * We remove words that usually carry little search meaning, but deliberately
 * keep domain words such as "can", "do", "does", "feed", "farm", etc.
 */
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'how',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'our',
  'she',
  'that',
  'the',
  'their',
  'then',
  'there',
  'these',
  'they',
  'this',
  'to',
  'was',
  'we',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'will',
  'with',
  'you',
  'your',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampLimit(limit?: number): number {
  if (
    limit === undefined ||
    limit === null ||
    !Number.isFinite(limit)
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    Math.max(1, Math.floor(limit)),
    MAX_LIMIT,
  );
}

/**
 * Build the public URL for a blog post.
 */
function buildPostUrl(
  slug: string,
  authorUsername: string | null,
  authorName: string | null,
): string {
  const authorPath =
    authorUsername ||
    (authorName
      ? authorName.replace(/\s+/g, '-').toLowerCase()
      : 'author');

  return `${SITE_URL}/blog/${authorPath}/${slug}`;
}

/**
 * Normalize and tokenize a search query.
 *
 * Unicode-aware so we do not unnecessarily destroy non-English terms.
 */
function tokenize(query: string): string[] {
  return Array.from(
    new Set(
      query
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .replace(/[-]+/g, ' ')
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(
          (term) =>
            term.length >= MIN_TERM_LENGTH &&
            !STOPWORDS.has(term),
        ),
    ),
  );
}

/**
 * Escape a term before putting it into a PostgreSQL tsquery.
 */
function escapeTsQueryTerm(term: string): string {
  return term
    .replace(/\\/g, '')
    .replace(/[':!*&|()]/g, '');
}

/**
 * Build PostgreSQL tsquery.
 */
function buildTsQueryFromTerms(
  terms: string[],
  mode: 'and' | 'or',
): string {
  const safeTerms = terms
    .map(escapeTsQueryTerm)
    .filter(Boolean);

  if (safeTerms.length === 0) {
    return '';
  }

  const separator = mode === 'and' ? ' & ' : ' | ';

  return safeTerms
    .map((term) => `${term}:*`)
    .join(separator);
}

/**
 * Safely describe unknown errors.
 */
function describeError(
  error: unknown,
): {
  message: string;
  code?: string;
} {
  if (error && typeof error === 'object') {
    const e = error as {
      message?: string;
      code?: string;
    };

    return {
      message: e.message ?? String(error),
      code: e.code,
    };
  }

  return {
    message: String(error),
  };
}

// ---------------------------------------------------------------------------
// Prisma select
// ---------------------------------------------------------------------------

const searchSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  category: true,
  publishedAt: true,

  authorProfile: {
    select: {
      username: true,
    },
  },

  author: {
    select: {
      name: true,
    },
  },

  tags: {
    select: {
      tag: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type SearchPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string;
  publishedAt: Date | null;

  authorProfile: {
    username: string | null;
  } | null;

  author: {
    name: string | null;
  } | null;

  tags: Array<{
    tag: {
      name: string;
    };
  }>;
};

interface RawFtsRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  rank: number;
  author_username: string | null;
  author_name: string | null;
}

interface RawTrigramRow extends RawFtsRow {
  sim: number;
}

// ---------------------------------------------------------------------------
// Raw FTS SQL
//
// IMPORTANT:
//
// This is intentionally an enhancement only.
//
// If your physical table names differ, this search tier will fail safely
// without breaking the Prisma search tiers.
//
// The Prisma searches remain the primary retrieval mechanism.
// ---------------------------------------------------------------------------

const FTS_SQL = `
  SELECT
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,

    ts_rank_cd(
      setweight(
        to_tsvector(
          'english',
          coalesce(bp.title, '')
        ),
        'A'
      )
      ||
      setweight(
        to_tsvector(
          'english',
          coalesce(
            (
              SELECT string_agg(bt.name, ' ')
              FROM blog_post_tags bpt
              JOIN blog_tags bt
                ON bt.id = bpt."tagId"
              WHERE bpt."postId" = bp.id
            ),
            ''
          )
        ),
        'B'
      )
      ||
      setweight(
        to_tsvector(
          'english',
          coalesce(bp.excerpt, '')
        ),
        'C'
      )
      ||
      setweight(
        to_tsvector(
          'english',
          coalesce(bp.content, '')
        ),
        'D'
      ),
      to_tsquery('english', $1)
    ) AS rank,

    ap.username AS author_username,
    u.name AS author_name

  FROM blog_posts bp

  LEFT JOIN author_profiles ap
    ON ap.id = bp."authorProfileId"

  LEFT JOIN users u
    ON u.id = bp."authorId"

  WHERE bp.status = 'PUBLISHED'

    AND (
      setweight(
        to_tsvector(
          'english',
          coalesce(bp.title, '')
        ),
        'A'
      )
      ||
      setweight(
        to_tsvector(
          'english',
          coalesce(
            (
              SELECT string_agg(bt.name, ' ')
              FROM blog_post_tags bpt
              JOIN blog_tags bt
                ON bt.id = bpt."tagId"
              WHERE bpt."postId" = bp.id
            ),
            ''
          )
        ),
        'B'
      )
      ||
      setweight(
        to_tsvector(
          'english',
          coalesce(bp.excerpt, '')
        ),
        'C'
      )
      ||
      setweight(
        to_tsvector(
          'english',
          coalesce(bp.content, '')
        ),
        'D'
      )
    )
    @@ to_tsquery('english', $1)

  ORDER BY rank DESC

  LIMIT $2
`;

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export interface SearchProbeResult {
  ok: boolean;
  error?: string;
  errorCode?: string;
}

export interface SearchDiagnosticsReport {
  timestamp: string;

  totalPosts: number;

  postsByStatus: Record<string, number>;

  samplePublishedTitles: string[];

  rawTableProbe: SearchProbeResult;

  prismaClientProbe: SearchProbeResult;

  trigramExtensionProbe: SearchProbeResult;

  searchTests?: Array<{
    query: string;
    results: number;
  }>;
}

// ---------------------------------------------------------------------------
// SearchService
// ---------------------------------------------------------------------------

export class SearchService {
  // =========================================================================
  // PUBLIC: Normal blog search
  // =========================================================================

  async searchBlogs(
    params: SearchBlogsParams,
  ): Promise<BlogSearchResult[]> {
    const limit = clampLimit(params.limit);

    const rawQuery = params.query?.trim();

    if (!rawQuery) {
      return [];
    }

    const terms = tokenize(rawQuery);

    try {
      /**
       * Exact phrase first.
       *
       * This is intentionally kept because it produces the most intuitive
       * result for searches such as:
       *
       * "sick chicks"
       * "egg shell defects"
       * "poultry feeding"
       */
      const exactPosts = await prisma.blogPost.findMany({
        where: {
          status: 'PUBLISHED',

          OR: [
            {
              title: {
                contains: rawQuery,
                mode: 'insensitive',
              },
            },

            {
              excerpt: {
                contains: rawQuery,
                mode: 'insensitive',
              },
            },

            {
              content: {
                contains: rawQuery,
                mode: 'insensitive',
              },
            },

            {
              tags: {
                some: {
                  tag: {
                    name: {
                      contains: rawQuery,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          ],
        },

        select: searchSelect,

        take: limit,

        orderBy: {
          publishedAt: 'desc',
        },
      });

      if (exactPosts.length > 0) {
        return exactPosts.map((post) =>
          this.toBlogSearchResult(post),
        );
      }

      /**
       * If exact phrase search did not work, use individual terms.
       */
      if (terms.length > 0) {
        const posts = await prisma.blogPost.findMany({
          where: {
            status: 'PUBLISHED',

            OR: terms.flatMap((term) => [
              {
                title: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },

              {
                excerpt: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },

              {
                content: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },

              {
                tags: {
                  some: {
                    tag: {
                      name: {
                        contains: term,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                },
              },
            ]),
          },

          select: searchSelect,

          take: limit,

          orderBy: {
            publishedAt: 'desc',
          },
        });

        return posts.map((post) =>
          this.toBlogSearchResult(post),
        );
      }

      return [];
    } catch (error) {
      this.logSearchError('blog search', error);
      return [];
    }
  }

  // =========================================================================
  // PUBLIC: Semantic / AI retrieval
  // =========================================================================

  async semanticSearch(
    params: SemanticSearchParams,
  ): Promise<SemanticSearchResult[]> {
    const limit = clampLimit(params.limit);

    const rawQuery = params.query?.trim();

    if (!rawQuery) {
      return [];
    }

    const terms = tokenize(rawQuery);

    console.info(
      `[SearchService] Starting search ` +
        `query="${rawQuery}" ` +
        `terms=[${terms.join(', ')}]`,
    );

    /**
     * We deliberately run multiple retrieval strategies.
     *
     * One strategy failing must never turn the entire request into zero
     * results.
     */
    const [
      exactResults,
      allTermsResults,
      anyTermsResults,
      titleTagResults,
      categoryResults,
      ftsResults,
    ] = await Promise.all([
      this.searchExactPhrase(
        rawQuery,
        Math.max(limit * 3, 10),
      ),

      this.searchAllTerms(
        terms,
        Math.max(limit * 3, 10),
      ),

      this.searchAnyTerm(
        terms,
        Math.max(limit * 4, 15),
      ),

      this.searchTitleAndTags(
        terms,
        Math.max(limit * 3, 10),
      ),

      this.searchCategory(
        terms,
        rawQuery,
        Math.max(limit * 2, 10),
      ),

      this.fullTextSearch(
        terms,
        FTS_CANDIDATE_LIMIT,
      ),
    ]);

    console.info(
      `[SearchService] Retrieval results ` +
        `exact=${exactResults.length} ` +
        `allTerms=${allTermsResults.length} ` +
        `anyTerms=${anyTermsResults.length} ` +
        `titleTags=${titleTagResults.length} ` +
        `category=${categoryResults.length} ` +
        `fts=${ftsResults.length}`,
    );

    /**
     * Fuzzy search is intentionally attempted whenever the normal retrieval
     * is weak.
     *
     * The old implementation only ran this when EVERYTHING was zero.
     *
     * That was too restrictive.
     */
    let fuzzyResults: SemanticSearchResult[] = [];

    const strongestNormalResultCount = Math.max(
      exactResults.length,
      allTermsResults.length,
      titleTagResults.length,
    );

    if (
      strongestNormalResultCount < Math.min(limit, 5) ||
      anyTermsResults.length === 0
    ) {
      fuzzyResults = await this.trigramFallbackSearch(
        rawQuery,
        Math.max(TRIGRAM_CANDIDATE_LIMIT, limit * 2),
      );
    }

    console.info(
      `[SearchService] Fuzzy results=${fuzzyResults.length}`,
    );

    const resultLists = [
      exactResults,
      allTermsResults,
      anyTermsResults,
      titleTagResults,
      categoryResults,
      ftsResults,
      fuzzyResults,
    ].filter((list) => list.length > 0);

    /**
     * If we have no specialized matches, do NOT immediately return [].
     *
     * If there are published articles, return useful candidates instead.
     */
    if (resultLists.length === 0) {
      console.warn(
        `[SearchService] All search strategies returned zero ` +
          `for query="${rawQuery}". Running published fallback.`,
      );

      return this.publishedPostsFallback(limit);
    }

    /**
     * RRF merges the different retrieval lists.
     */
    let fused = this.reciprocalRankFusion(resultLists);

    /**
     * Apply an additional relevance pass.
     *
     * RRF tells us how consistently a document appeared across retrieval
     * methods. This second pass gives more importance to direct textual
     * relevance.
     */
    fused = await this.applyRelevanceRanking(
      fused,
      rawQuery,
      terms,
    );

    /**
     * Safety fallback.
     *
     * If something unusual happened and fusion produced nothing, return
     * published content instead of a hard zero.
     */
    if (fused.length === 0) {
      return this.publishedPostsFallback(limit);
    }

    return fused.slice(0, limit);
  }

  // =========================================================================
  // EXACT PHRASE
  // =========================================================================

  private async searchExactPhrase(
    query: string,
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    if (!query) {
      return [];
    }

    try {
      const posts = await prisma.blogPost.findMany({
        where: {
          status: 'PUBLISHED',

          OR: [
            {
              title: {
                contains: query,
                mode: 'insensitive',
              },
            },

            {
              excerpt: {
                contains: query,
                mode: 'insensitive',
              },
            },

            {
              content: {
                contains: query,
                mode: 'insensitive',
              },
            },

            {
              tags: {
                some: {
                  tag: {
                    name: {
                      contains: query,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          ],
        },

        select: searchSelect,

        take: limit,

        orderBy: {
          publishedAt: 'desc',
        },
      });

      return posts.map((post) =>
        this.toSemanticResult(post),
      );
    } catch (error) {
      this.logSearchError(
        'exact phrase search',
        error,
      );

      return [];
    }
  }

  // =========================================================================
  // ALL TERMS
  // =========================================================================

  private async searchAllTerms(
    terms: string[],
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    if (terms.length === 0) {
      return [];
    }

    try {
      const posts = await prisma.blogPost.findMany({
        where: {
          status: 'PUBLISHED',

          AND: terms.map((term) => ({
            OR: [
              {
                title: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },

              {
                excerpt: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },

              {
                content: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },

              {
                tags: {
                  some: {
                    tag: {
                      name: {
                        contains: term,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                },
              },
            ],
          })),
        },

        select: searchSelect,

        take: limit,

        orderBy: {
          publishedAt: 'desc',
        },
      });

      return posts.map((post) =>
        this.toSemanticResult(post),
      );
    } catch (error) {
      this.logSearchError(
        'all-terms search',
        error,
      );

      return [];
    }
  }

  // =========================================================================
  // ANY TERM
  // =========================================================================

  private async searchAnyTerm(
    terms: string[],
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    if (terms.length === 0) {
      return [];
    }

    try {
      const OR = terms.flatMap((term) => [
        {
          title: {
            contains: term,
            mode: 'insensitive' as const,
          },
        },

        {
          excerpt: {
            contains: term,
            mode: 'insensitive' as const,
          },
        },

        {
          content: {
            contains: term,
            mode: 'insensitive' as const,
          },
        },

        {
          tags: {
            some: {
              tag: {
                name: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },
            },
          },
        },
      ]);

      const posts = await prisma.blogPost.findMany({
        where: {
          status: 'PUBLISHED',
          OR,
        },

        select: searchSelect,

        take: limit,

        orderBy: {
          publishedAt: 'desc',
        },
      });

      return posts.map((post) =>
        this.toSemanticResult(post),
      );
    } catch (error) {
      this.logSearchError(
        'any-term search',
        error,
      );

      return [];
    }
  }

  // =========================================================================
  // TITLE + TAG SEARCH
  // =========================================================================

  private async searchTitleAndTags(
    terms: string[],
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    if (terms.length === 0) {
      return [];
    }

    try {
      const posts = await prisma.blogPost.findMany({
        where: {
          status: 'PUBLISHED',

          OR: terms.flatMap((term) => [
            {
              title: {
                contains: term,
                mode: 'insensitive' as const,
              },
            },

            {
              tags: {
                some: {
                  tag: {
                    name: {
                      contains: term,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
            },
          ]),
        },

        select: searchSelect,

        take: limit,

        orderBy: {
          publishedAt: 'desc',
        },
      });

      return posts.map((post) =>
        this.toSemanticResult(post),
      );
    } catch (error) {
      this.logSearchError(
        'title/tag search',
        error,
      );

      return [];
    }
  }

  // =========================================================================
  // CATEGORY
  // =========================================================================

  private async searchCategory(
    terms: string[],
    rawQuery: string,
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    const category = this.matchCategory(
      terms,
      rawQuery,
    );

    if (!category) {
      return [];
    }

    try {
      const posts = await prisma.blogPost.findMany({
        where: {
          status: 'PUBLISHED',

          category: category as any,
        },

        select: searchSelect,

        take: limit,

        orderBy: {
          publishedAt: 'desc',
        },
      });

      return posts.map((post) =>
        this.toSemanticResult(post),
      );
    } catch (error) {
      this.logSearchError(
        'category search',
        error,
      );

      return [];
    }
  }

  // =========================================================================
  // FULL TEXT SEARCH
  // =========================================================================

  private async fullTextSearch(
    terms: string[],
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    if (terms.length === 0) {
      return [];
    }

    const andQuery = buildTsQueryFromTerms(
      terms,
      'and',
    );

    const orQuery = buildTsQueryFromTerms(
      terms,
      'or',
    );

    if (!andQuery && !orQuery) {
      return [];
    }

    const run = async (
      tsQuery: string,
    ): Promise<RawFtsRow[]> => {
      if (!tsQuery) {
        return [];
      }

      return prisma.$queryRawUnsafe<RawFtsRow[]>(
        FTS_SQL,
        tsQuery,
        limit,
      );
    };

    const [andSettled, orSettled] =
      await Promise.allSettled([
        run(andQuery),
        run(orQuery),
      ]);

    if (andSettled.status === 'rejected') {
      this.logSearchError(
        'PostgreSQL FTS AND',
        andSettled.reason,
      );
    }

    if (orSettled.status === 'rejected') {
      this.logSearchError(
        'PostgreSQL FTS OR',
        orSettled.reason,
      );
    }

    const andResults =
      andSettled.status === 'fulfilled'
        ? andSettled.value.map(
            (row) => this.mapFtsRow(row),
          )
        : [];

    if (andResults.length > 0) {
      return andResults;
    }

    return orSettled.status === 'fulfilled'
      ? orSettled.value.map(
          (row) => this.mapFtsRow(row),
        )
      : [];
  }

  // =========================================================================
  // TRIGRAM FUZZY SEARCH
  // =========================================================================

  private async trigramFallbackSearch(
    query: string,
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    if (!query) {
      return [];
    }

    try {
      /**
       * We intentionally search:
       *
       * title
       * excerpt
       * content
       *
       * rather than title/excerpt only.
       *
       * This gives much better recovery for unusual queries.
       */
      const results =
        await prisma.$queryRawUnsafe<RawTrigramRow[]>(
          `
          SELECT
            bp.id,
            bp.title,
            bp.slug,
            bp.excerpt,

            GREATEST(
              similarity(
                coalesce(bp.title, ''),
                $1
              ),

              similarity(
                coalesce(bp.excerpt, ''),
                $1
              ),

              similarity(
                coalesce(bp.content, ''),
                $1
              )
            ) AS sim,

            ap.username AS author_username,
            u.name AS author_name

          FROM blog_posts bp

          LEFT JOIN author_profiles ap
            ON ap.id = bp."authorProfileId"

          LEFT JOIN users u
            ON u.id = bp."authorId"

          WHERE bp.status = 'PUBLISHED'

            AND (
              similarity(
                coalesce(bp.title, ''),
                $1
              ) > $2

              OR similarity(
                coalesce(bp.excerpt, ''),
                $1
              ) > $2

              OR similarity(
                coalesce(bp.content, ''),
                $1
              ) > $2
            )

          ORDER BY sim DESC

          LIMIT $3
          `,
          query,
          TRIGRAM_SIMILARITY_THRESHOLD,
          limit,
        );

      return results.map((row) => ({
        id: row.id,

        title: row.title,

        slug: row.slug,

        excerpt: row.excerpt,

        url: buildPostUrl(
          row.slug,
          row.author_username,
          row.author_name,
        ),

        score:
          Math.round(
            Number(row.sim) * 1000,
          ) / 1000,
      }));
    } catch (error) {
      /**
       * pg_trgm may not be installed.
       *
       * That must NEVER break search.
       */
      this.logSearchError(
        'trigram fuzzy search',
        error,
      );

      return [];
    }
  }

  // =========================================================================
  // RELEVANCE RANKING
  // =========================================================================

  private async applyRelevanceRanking(
    results: SemanticSearchResult[],
    query: string,
    terms: string[],
  ): Promise<SemanticSearchResult[]> {
    if (results.length === 0) {
      return [];
    }

    /**
     * We need the original post text to calculate stronger relevance.
     *
     * Fetch only the candidate IDs.
     */
    const ids = results.map(
      (result) => result.id,
    );

    try {
      const posts = await prisma.blogPost.findMany({
        where: {
          id: {
            in: ids,
          },

          status: 'PUBLISHED',
        },

        select: {
          id: true,
          title: true,
          excerpt: true,
          content: true,
          category: true,

          tags: {
            select: {
              tag: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      const postMap = new Map(
        posts.map((post) => [
          post.id,
          post,
        ]),
      );

      const normalizedQuery =
        query.toLowerCase();

      const normalizedTerms =
        terms.map((term) =>
          term.toLowerCase(),
        );

      const ranked = results.map(
        (result, index) => {
          const post = postMap.get(
            result.id,
          );

          if (!post) {
            return {
              result,
              score:
                result.score +
                1 / (index + 1),
            };
          }

          const title =
            post.title.toLowerCase();

          const excerpt =
            (post.excerpt ?? '').toLowerCase();

          const content =
            post.content.toLowerCase();

          const category =
            post.category.toLowerCase();

          const tags = post.tags
            .map((item) =>
              item.tag.name.toLowerCase(),
            )
            .join(' ');

          let score = result.score;

          /**
           * Exact phrase in title is extremely strong.
           */
          if (title.includes(normalizedQuery)) {
            score += 100;
          }

          /**
           * Exact phrase in tags.
           */
          if (tags.includes(normalizedQuery)) {
            score += 70;
          }

          /**
           * Exact phrase in excerpt.
           */
          if (excerpt.includes(normalizedQuery)) {
            score += 45;
          }

          /**
           * Individual term matches.
           */
          for (const term of normalizedTerms) {
            if (title.includes(term)) {
              score += 20;
            }

            if (tags.includes(term)) {
              score += 15;
            }

            if (excerpt.includes(term)) {
              score += 8;
            }

            if (category.includes(term)) {
              score += 10;
            }

            if (content.includes(term)) {
              score += 3;
            }
          }

          return {
            result,
            score,
          };
        },
      );

      ranked.sort(
        (a, b) =>
          b.score - a.score,
      );

      const maxScore =
        ranked.length > 0
          ? ranked[0].score
          : 1;

      return ranked.map(
        ({ result, score }) => ({
          ...result,

          score:
            Math.round(
              (score / maxScore) * 1000,
            ) / 1000,
        }),
      );
    } catch (error) {
      /**
       * Ranking is an enhancement.
       *
       * If ranking fails, return the already retrieved results.
       */
      this.logSearchError(
        'relevance ranking',
        error,
      );

      return results;
    }
  }

  // =========================================================================
  // RRF
  // =========================================================================

  private reciprocalRankFusion(
    resultLists: SemanticSearchResult[][],
  ): SemanticSearchResult[] {
    const scoreMap = new Map<
      string,
      {
        result: SemanticSearchResult;
        rrfScore: number;
      }
    >();

    for (const list of resultLists) {
      list.forEach(
        (result, index) => {
          const rrfScore =
            1 /
            (RRF_K + index + 1);

          const existing =
            scoreMap.get(result.id);

          if (existing) {
            existing.rrfScore +=
              rrfScore;
          } else {
            scoreMap.set(
              result.id,
              {
                result,
                rrfScore,
              },
            );
          }
        },
      );
    }

    const sorted =
      Array.from(
        scoreMap.values(),
      ).sort(
        (a, b) =>
          b.rrfScore -
          a.rrfScore,
      );

    const maxScore =
      sorted.length > 0
        ? sorted[0].rrfScore
        : 1;

    return sorted.map(
      ({
        result,
        rrfScore,
      }) => ({
        ...result,

        score:
          Math.round(
            (rrfScore /
              maxScore) *
              1000,
          ) / 1000,
      }),
    );
  }

  // =========================================================================
  // PUBLISHED FALLBACK
  // =========================================================================

  private async publishedPostsFallback(
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    try {
      const posts =
        await prisma.blogPost.findMany({
          where: {
            status: 'PUBLISHED',
          },

          select: searchSelect,

          take: limit,

          orderBy: {
            publishedAt: 'desc',
          },
        });

      return posts.map(
        (post, index) => ({
          ...this.toSemanticResult(
            post,
          ),

          score:
            Math.round(
              (1 / (index + 1)) *
                1000,
            ) / 1000,
        }),
      );
    } catch (error) {
      this.logSearchError(
        'published-post fallback',
        error,
      );

      return [];
    }
  }

  // =========================================================================
  // CATEGORY MATCHING
  // =========================================================================

  private matchCategory(
    terms: string[],
    rawQuery: string,
  ): string | null {
    const categories = [
      'FARMING_TIPS',
      'POULTRY_HEALTH',
      'FEED_NUTRITION',
      'EQUIPMENT_GUIDES',
      'MARKET_TRENDS',
      'SUCCESS_STORIES',
      'INDUSTRY_NEWS',
      'SEASONAL_ADVICE',
      'BEGINNER_GUIDES',
      'ADVANCED_TECHNIQUES',
    ];

    const normalizedFull =
      rawQuery
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    const exact =
      categories.find(
        (category) =>
          category ===
          normalizedFull,
      );

    if (exact) {
      return exact;
    }

    const termSet =
      new Set(terms);

    let best:
      | {
          category: string;
          overlap: number;
        }
      | null = null;

    for (const category of categories) {
      const words =
        category
          .toLowerCase()
          .split('_');

      let overlap = 0;

      for (const word of words) {
        if (termSet.has(word)) {
          overlap++;
        }
      }

      if (
        overlap > 0 &&
        (!best ||
          overlap >
            best.overlap)
      ) {
        best = {
          category,
          overlap,
        };
      }
    }

    return (
      best?.category ??
      null
    );
  }

  // =========================================================================
  // RESULT CONVERTERS
  // =========================================================================

  private toSemanticResult(
    post: SearchPost,
  ): SemanticSearchResult {
    return {
      id: post.id,

      title: post.title,

      slug: post.slug,

      excerpt: post.excerpt,

      url: buildPostUrl(
        post.slug,
        post.authorProfile
          ?.username ?? null,
        post.author?.name ??
          null,
      ),

      score: 0,
    };
  }

  private toBlogSearchResult(
    post: SearchPost,
  ): BlogSearchResult {
    return {
      id: post.id,

      title: post.title,

      slug: post.slug,

      excerpt: post.excerpt,

      category: post.category,

      tags: post.tags.map(
        (item) =>
          item.tag.name,
      ),

      publishedAt:
        post.publishedAt
          ? post.publishedAt.toISOString()
          : null,

      url: buildPostUrl(
        post.slug,
        post.authorProfile
          ?.username ?? null,
        post.author?.name ??
          null,
      ),
    };
  }

  private mapFtsRow(
    row: RawFtsRow,
  ): SemanticSearchResult {
    return {
      id: row.id,

      title: row.title,

      slug: row.slug,

      excerpt: row.excerpt,

      url: buildPostUrl(
        row.slug,
        row.author_username,
        row.author_name,
      ),

      score:
        Math.round(
          Number(row.rank) *
            1000,
        ) / 1000,
    };
  }

  // =========================================================================
  // ERROR LOGGING
  // =========================================================================

  private logSearchError(
    strategy: string,
    error: unknown,
  ): void {
    const {
      message,
      code,
    } = describeError(error);

    console.error(
      `[SearchService] ${strategy} failed ` +
        `(code=${code ?? 'n/a'}): ${message}`,
    );
  }

  // =========================================================================
  // DIAGNOSTICS
  // =========================================================================

  async diagnoseSearchHealth(): Promise<SearchDiagnosticsReport> {
    try {
      const [
        totalPosts,
        byStatusRaw,
        samples,
      ] = await Promise.all([
        prisma.blogPost.count(),

        prisma.blogPost.groupBy({
          by: ['status'],
          _count: {
            _all: true,
          },
        }),

        prisma.blogPost.findMany({
          where: {
            status: 'PUBLISHED',
          },

          select: {
            title: true,
          },

          take: 5,

          orderBy: {
            publishedAt: 'desc',
          },
        }),
      ]);

      const postsByStatus:
        Record<string, number> =
        {};

      for (
        const row of
          byStatusRaw as unknown as Array<{
            status: string;
            _count: {
              _all: number;
            };
          }>
      ) {
        postsByStatus[
          row.status
        ] =
          row._count._all;
      }

      const [
        rawTableProbe,
        prismaClientProbe,
        trigramExtensionProbe,
      ] = await Promise.all([
        this.probe(() =>
          prisma.$queryRawUnsafe(
            `SELECT 1 FROM blog_posts LIMIT 1`,
          ),
        ),

        this.probe(() =>
          prisma.blogPost.findFirst(),
        ),

        this.probe(() =>
          prisma.$queryRawUnsafe(
            `SELECT similarity('a', 'a')`,
          ),
        ),
      ]);

      /**
       * These tests use the SAME public search implementation that the API
       * uses. This makes the diagnostic considerably more useful.
       */
      const testQueries = [
        'poultry',
        'chicken',
        'egg',
        'feeding',
        'health',
        'sick chicks',
      ];

      const searchTests =
        await Promise.all(
          testQueries.map(
            async (query) => {
              try {
                const results =
                  await this.semanticSearch(
                    {
                      query,
                      limit: 5,
                    },
                  );

                return {
                  query,
                  results:
                    results.length,
                };
              } catch {
                return {
                  query,
                  results: 0,
                };
              }
            },
          ),
        );

      return {
        timestamp:
          new Date().toISOString(),

        totalPosts,

        postsByStatus,

        samplePublishedTitles:
          samples.map(
            (sample) =>
              sample.title,
          ),

        rawTableProbe,

        prismaClientProbe,

        trigramExtensionProbe,

        searchTests,
      };
    } catch (error) {
      const {
        message,
        code,
      } = describeError(error);

      console.error(
        `[SearchService] Search diagnostics failed ` +
          `(code=${code ?? 'n/a'}): ${message}`,
      );

      throw error;
    }
  }

  private async probe(
    fn: () => Promise<unknown>,
  ): Promise<SearchProbeResult> {
    try {
      await fn();

      return {
        ok: true,
      };
    } catch (error) {
      const {
        message,
        code,
      } = describeError(error);

      return {
        ok: false,
        error: message,
        errorCode: code,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const searchService =
  new SearchService();