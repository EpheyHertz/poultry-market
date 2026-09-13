/**
 * Applies the email / subscription system migration idempotently.
 *
 * `prisma migrate deploy` currently fails on an unrelated, pre-existing
 * migration (`20260823150000_add_author_resources`) whose tables were created
 * earlier with `db push`, so Postgres rejects it with 42P07. Rather than
 * rewriting that history, this script executes the additive SQL for the email
 * subscription system directly. Every statement is guarded
 * (`IF NOT EXISTS` / `EXCEPTION WHEN duplicate_object`), so it is safe to run
 * repeatedly.
 *
 *   node scripts/apply-email-subscription-columns.js
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not set (checked .env)');
    process.exit(1);
}

const MIGRATION_FILE = path.join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    '20260912230000_add_email_subscription_system',
    'migration.sql'
);

if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`Migration file not found: ${MIGRATION_FILE}`);
    process.exit(1);
}

const SUBSCRIBER_COLUMNS = [
    'status',
    'verificationTokenHash',
    'verificationSentAt',
    'verificationExpiresAt',
    'verificationCount',
    'verifiedAt',
    'manageTokenHash',
    'topics',
    'allTopics',
    'frequency',
    'unsubscribedAt',
    'resubscribedAt',
    'source',
    'lastEmailSentAt',
    'emailsSent',
    'bounceCount',
];

const NEW_TABLES = ['subscriber_events', 'email_campaigns', 'email_deliveries', 'email_settings'];

const pool = new Pool({ connectionString, connectionTimeoutMillis: 20000 });

(async () => {
    try {
        const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

        // node-postgres uses the simple query protocol for parameter-less
        // queries, which happily runs the whole multi-statement script
        // (including the DO $$ ... $$ blocks) in a single implicit transaction.
        await pool.query(sql);
        console.log('OK  applied 20260912230000_add_email_subscription_system/migration.sql');

        const { rows: columns } = await pool.query(
            `select column_name from information_schema.columns
              where table_name = 'blog_subscribers'
                and column_name = any($1::text[])
              order by column_name`,
            [SUBSCRIBER_COLUMNS]
        );

        const present = columns.map((r) => r.column_name);
        const missing = SUBSCRIBER_COLUMNS.filter((c) => !present.includes(c));

        const { rows: tables } = await pool.query(
            `select table_name from information_schema.tables
              where table_schema = current_schema()
                and table_name = any($1::text[])
              order by table_name`,
            [NEW_TABLES]
        );

        const tablesPresent = tables.map((r) => r.table_name);
        const tablesMissing = NEW_TABLES.filter((t) => !tablesPresent.includes(t));

        const { rows: counts } = await pool.query(
            `select "status"::text as status, count(*)::int as total
               from "blog_subscribers"
              group by "status"
              order by "status"`
        );

        console.log(`\nblog_subscribers columns (${present.length}/${SUBSCRIBER_COLUMNS.length}): ${present.join(', ') || 'none'}`);
        if (missing.length) console.log(`MISSING columns: ${missing.join(', ')}`);

        console.log(`tables (${tablesPresent.length}/${NEW_TABLES.length}): ${tablesPresent.join(', ') || 'none'}`);
        if (tablesMissing.length) console.log(`MISSING tables: ${tablesMissing.join(', ')}`);

        console.log(
            `subscribers by status: ${counts.map((r) => `${r.status}=${r.total}`).join(', ') || 'no subscribers yet'}`
        );

        if (missing.length || tablesMissing.length) {
            process.exitCode = 1;
        } else {
            console.log('\nEmail subscription schema is up to date. Run `npx prisma generate` next.');
        }
    } catch (error) {
        console.error(`FAIL ${error.code || ''} ${error.message}`);
        if (error.position) console.error(`  at character position ${error.position}`);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
