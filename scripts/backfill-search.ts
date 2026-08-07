/**
 * Backfill Search Fields
 *
 * Populates tag_names, author_name and search_vector for all existing blog
 * posts via fn_refresh_post_search_fields(), in chunked batches of 1000 ids.
 * Idempotent — safe to re-run any time (e.g., after manual tag edits).
 *
 * Usage:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/backfill-search.ts
 */

import 'dotenv/config'
import { Pool } from 'pg'

const BATCH_SIZE = 1000

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 30_000 })

  try {
    const total = await pool.query(`SELECT count(*)::int AS n FROM blog_posts`)
    const totalPosts: number = total.rows[0].n
    console.log(`[backfill-search] backfilling search fields for ${totalPosts} posts (batches of ${BATCH_SIZE})`)

    let offset = 0
    let processed = 0
    const started = Date.now()

    while (offset < totalPosts) {
      // Deterministic ordering; process one batch of ids per transaction.
      const batch = await pool.query<{ id: string }>(
        `SELECT id FROM blog_posts ORDER BY id LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset]
      )
      if (batch.rows.length === 0) break

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        for (const row of batch.rows) {
          await client.query('SELECT fn_refresh_post_search_fields($1)', [row.id])
        }
        await client.query('COMMIT')
        processed += batch.rows.length
        const pct = ((processed / totalPosts) * 100).toFixed(1)
        console.log(`[backfill-search] ${processed}/${totalPosts} (${pct}%)`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }

      offset += BATCH_SIZE
    }

    const elapsedSec = ((Date.now() - started) / 1000).toFixed(1)
    console.log(`[backfill-search] processed ${processed} posts in ${elapsedSec}s`)

    // Final verification
    const check = await pool.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE search_vector IS NULL)::int AS missing_vector,
        count(*) FILTER (WHERE tag_names IS NULL)::int AS missing_tags,
        count(*) FILTER (WHERE author_name IS NULL OR author_name = '')::int AS missing_author,
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM blog_post_tags pt WHERE pt."postId" = blog_posts.id
        ) AND coalesce(btrim(tag_names), '') = '')::int AS posts_with_tags_but_empty_field
      FROM blog_posts
    `)
    console.log('[backfill-search] verification:', JSON.stringify(check.rows[0]))

    const v = check.rows[0]
    const problems: string[] = []
    if (Number(v.missing_vector) > 0) problems.push(`${v.missing_vector} posts missing search_vector`)
    if (Number(v.missing_tags) > 0) problems.push(`${v.missing_tags} posts with NULL tag_names`)
    if (Number(v.posts_with_tags_but_empty_field) > 0) {
      problems.push(`${v.posts_with_tags_but_empty_field} posts have tags but empty tag_names`)
    }
    if (problems.length > 0) {
      throw new Error(`Backfill incomplete: ${problems.join('; ')}`)
    }
    console.log('[backfill-search] all posts backfilled successfully')

    // Show a sample vector so the output is self-explaining
    const sample = await pool.query(`
      SELECT title, tag_names, author_name, search_vector::text AS vector
      FROM blog_posts
      WHERE search_vector IS NOT NULL
      ORDER BY "publishedAt" DESC NULLS LAST
      LIMIT 1
    `)
    if (sample.rows.length > 0) {
      const s = sample.rows[0]
      console.log('\n[backfill-search] sample post:')
      console.log(`  title:       ${s.title}`)
      console.log(`  tag_names:   ${s.tag_names}`)
      console.log(`  author_name: ${s.author_name}`)
      console.log(`  vector:      ${String(s.vector).slice(0, 300)}...`)
    }
  } finally {
    await pool.end()
  }
}

main()
  .then(() => {
    console.log('[backfill-search] done')
    process.exit(0)
  })
  .catch((err) => {
    console.error('[backfill-search] FAILED:', err.message)
    process.exit(1)
  })
