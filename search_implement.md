# ROLE

You are a Principal PostgreSQL Search Engineer and Senior Next.js Architect.

Your task is to redesign my existing blog search and recommendation engine using ONLY PostgreSQL, Prisma, and Next.js.

Technology Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM

IMPORTANT

Do NOT use

- Pinecone
- ChromaDB
- Weaviate
- Qdrant
- Elasticsearch
- Meilisearch
- Typesense
- pgvector
- external AI search engines
- vector databases

The entire search and recommendation system must rely only on PostgreSQL's native capabilities.

The architecture should, however, be modular enough that semantic/vector search can be plugged in later without changing the public API.

────────────────────────────────────────

# GOAL

Create a production-quality hybrid search engine comparable to Medium, Hashnode, Dev.to, and large blogging platforms.

The search should understand user intent using PostgreSQL's built-in search features instead of simple keyword matching.

Searching

vaccination schedule

should return

Chicken vaccination guide

Broiler vaccination timetable

Vaccination programme

Searching

cheap feed

should also return

Affordable poultry feed

Low-cost chicken feed

Budget feed

without relying on external vector databases.

────────────────────────────────────────

# SEARCH ENGINE

Combine multiple PostgreSQL search strategies.

## 1. Full Text Search

Use

- tsvector
- tsquery
- plainto_tsquery
- websearch_to_tsquery
- phraseto_tsquery
- ts_rank
- ts_rank_cd

Create generated search vectors.

Do NOT use LIKE as the primary search.

────────────────────────────────────────

## 2. Trigram Search

Enable

pg_trgm

Use

similarity()

word_similarity()

%

<->

Handle

- typos
- misspellings
- partial words
- fuzzy matching

Example

vaccnation

must find

vaccination

────────────────────────────────────────

## 3. Accent Removal

Enable

unaccent

Searching

café

should match

cafe

────────────────────────────────────────

## 4. Weighted Search

Weight search fields differently.

Title = Highest

Tags = Very High

Category = High

Excerpt = Medium

Content = Lower

Author = Medium

────────────────────────────────────────

## 5. Exact Match Bonus

If the title exactly matches the search,

increase ranking.

────────────────────────────────────────

## 6. Phrase Match Bonus

If the exact phrase exists in the title,

boost heavily.

────────────────────────────────────────

## 7. Prefix Matching

Searching

vacc

should find

vaccination

vaccines

vaccinating

────────────────────────────────────────

## 8. Synonym Support

Create a reusable synonym system.

Example

cheap

affordable

budget

low-cost

economical

should all produce similar results.

The synonym dictionary should be configurable.

────────────────────────────────────────

## 9. Ranking Formula

Design one final score using

Full Text Rank

Trigram Similarity

Exact Match

Phrase Match

Title Weight

Tag Weight

Category Weight

Popularity

Freshness

Manual Boosts

Return a final relevance score.

────────────────────────────────────────

# FILTER ENGINE

Build reusable filters.

Support

Category

Multiple Categories

Tags

Multiple Tags

Author

Country

Language

Featured

Trending

Popular

Reading Time

Date Range

Published After

Published Before

Minimum Views

Maximum Views

Minimum Likes

Maximum Likes

Sort

Newest

Oldest

Most Relevant

Trending

Most Viewed

Most Shared

Alphabetical

────────────────────────────────────────

# SEARCH SUGGESTIONS

Implement autocomplete.

Suggestions should come from

Titles

Popular searches

Tags

Categories

Authors

Trending searches

Recent searches

────────────────────────────────────────

# DID YOU MEAN

Use trigram similarity to suggest corrections.

Example

vaccnation

↓

Did you mean vaccination?

────────────────────────────────────────

# SEARCH HIGHLIGHTING

Return snippets showing where matches occurred.

Highlight matching words.

────────────────────────────────────────

# RELATED POSTS ENGINE

One of the most important features.

When a reader opens a blog,

recommend highly related articles.

Do NOT recommend random posts.

Calculate a relationship score.

Signals should include

Shared Tags

Category similarity

Title similarity

Full Text similarity

Trigram similarity

Shared keywords

Publication freshness

Popularity

Reading time similarity

Exclude

Current article

Drafts

Hidden posts

Deleted posts

Poor matches

Return Top 5 or Top 10.

Each recommendation should include

relationshipScore

reasons

Example

Matched Tags

Same Poultry Health Topic

High Title Similarity

Common Keywords

High PostgreSQL Full Text Rank

────────────────────────────────────────

# SEARCH API

Create

GET /api/blog/search

Support

q

cursor

limit

category

tags

author

sort

dateFrom

dateTo

featured

language

country

minViews

maxViews

readingTime

Return

{
  "results": [],
  "filters": {},
  "suggestions": [],
  "didYouMean": "",
  "relatedSearches": [],
  "nextCursor": null,
  "totalResults": 0,
  "searchTimeMs": 0
}

────────────────────────────────────────

# RELATED POSTS API

GET

/api/blog/{slug}/related

Return

{
  "relatedPosts": [
    {
      "id": "",
      "slug": "",
      "title": "",
      "excerpt": "",
      "featuredImage": "",
      "relationshipScore": 0.97,
      "reasons": [
        "Shared Tags",
        "High Title Similarity",
        "Category Match",
        "Keyword Match"
      ]
    }
  ]
}

────────────────────────────────────────

# DATABASE

Improve the Prisma schema.

Create

Generated search vectors

GIN indexes

GIN trigram indexes

Partial indexes

Composite indexes

Expression indexes

Enable

pg_trgm

unaccent

Optimize for millions of posts.

────────────────────────────────────────

# PERFORMANCE

Target

<100 ms searches

Support

100K+

1M+

10M+

Avoid

LIKE scans

Sequential scans

N+1 queries

Repeated ranking calculations

Optimize every query.

────────────────────────────────────────

# SERVICE ARCHITECTURE

Create reusable services.

SearchService

RankingService

FilterService

SuggestionService

RelatedPostsService

SearchAnalyticsService

SearchQueryBuilder

Each service should have one responsibility.

────────────────────────────────────────

# SEARCH ANALYTICS

Track

Search queries

Popular searches

No-result searches

CTR

Opened recommendations

Trending filters

Search duration

────────────────────────────────────────

# TESTING

Provide

Unit tests

Integration tests

Performance benchmarks

Ranking tests

Recommendation tests

────────────────────────────────────────

# OUTPUT

Generate production-ready code.

Include

1. Prisma schema updates

2. PostgreSQL migrations

3. SQL indexes

4. Search service

5. Ranking algorithm

6. Related posts engine

7. Filter engine

8. API routes

9. Utility functions

10. Tests

11. Performance improvements

12. Security considerations

13. Architecture explanation

The implementation must be clean, modular, scalable, and production-ready while using ONLY PostgreSQL native search capabilities.