/**
 * Apply Search Engine Migration
 *
 * The existing database was built with `prisma db push` and is baselined with
 * `prisma migrate resolve --applied 0_init`. The search engine migration is
 * hand-written raw SQL (extensions, triggers, materialized views, seeds) that
 * Prisma cannot express, so it is applied here through a plain pg Pool in a
 * single transaction, then recorded with `prisma migrate resolve --applied`.
 *
 * Usage:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/apply-search-migrations.ts [--dry-run]
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Pool } from 'pg'

const MIGRATION_DIR = '20260803115226_add_search_engine'

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const dryRun = process.argv.includes('--dry-run')
  const sqlPath = join(process.cwd(), 'prisma', 'migrations', MIGRATION_DIR, 'migration.sql')
  const sql = readFileSync(sqlPath, 'utf-8')

  console.log(`[apply-search-migrations] ${dryRun ? 'DRY RUN - ' : ''}reading ${sqlPath}`)
  console.log(`[apply-search-migrations] ${sql.length} bytes of SQL`)

  const pool = new Pool({ connectionString })
  const client = await pool.connect()

  try {
    // Guard: refuse to run against the wrong database shape.
    const shape = await client.query(
      `SELECT to_regclass('public.blog_posts') AS blog_posts,
              to_regclass('public.search_queries') AS search_queries`
    )
    if (!shape.rows[0].blog_posts) {
      throw new Error('blog_posts table not found - is DATABASE_URL pointing at the right database?')
    }

    if (dryRun) {
      console.log('[apply-search-migrations] dry run: wrapping in transaction and rolling back')
    }

    await client.query('BEGIN')
    const started = Date.now()
    await client.query(sql)
    const elapsed = Date.now() - started

    // Post-apply verification (runs inside the transaction, before
    // COMMIT/ROLLBACK, so it works for real runs and dry runs alike).
    const verify = await client.query(`
      SELECT
        (SELECT count(*) FROM pg_indexes WHERE indexname = 'idx_blog_posts_search_vector')::int AS fts_index,
        (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_blog_posts_search_vector')::int AS row_trigger,
        (SELECT count(*) FROM search_configuration)::int AS config_rows,
        (SELECT count(*) FROM search_synonym_words)::int AS synonym_words,
        (SELECT count(*) FROM search_boost_rules)::int AS boost_rules,
        (SELECT count(*) FROM domain_concepts)::int AS concepts,
        (SELECT count(*) FROM pg_matviews WHERE matviewname LIKE 'mv_%')::int AS matviews
    `)
    console.log('[apply-search-migrations] verification:', JSON.stringify(verify.rows[0]))

    const v = verify.rows[0]
    const problems: string[] = []
    if (Number(v.fts_index) !== 1) problems.push('GIN search_vector index missing')
    if (Number(v.row_trigger) !== 1) problems.push('search vector row trigger missing')
    if (Number(v.config_rows) < 20) problems.push('search_configuration seed incomplete')
    if (Number(v.synonym_words) < 5) problems.push('synonym seed incomplete')
    if (Number(v.boost_rules) < 3) problems.push('boost rules seed incomplete')
    if (Number(v.concepts) < 30) problems.push('domain glossary seed incomplete')
    if (Number(v.matviews) !== 6) problems.push(`expected 6 materialized views, found ${v.matviews}`)

    if (problems.length > 0) {
      throw new Error(`Verification failed: ${problems.join('; ')}`)
    }

    if (dryRun) {
      await client.query('ROLLBACK')
      console.log(`[apply-search-migrations] DRY RUN OK in ${elapsed}ms - nothing persisted`)
    } else {
      await client.query('COMMIT')
      console.log(`[apply-search-migrations] migration applied in ${elapsed}ms`)
    }
    console.log('[apply-search-migrations] all verification checks passed')
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* already rolled back */
    }
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main()
  .then(() => {
    console.log('[apply-search-migrations] done')
    process.exit(0)
  })
  .catch((err) => {
    console.error('[apply-search-migrations] FAILED:', err.message)
    process.exit(1)
  })
