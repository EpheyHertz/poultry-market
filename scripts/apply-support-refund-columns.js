/**
 * Applies the support-refund columns idempotently.
 *
 * `prisma migrate deploy` currently fails on an unrelated, pre-existing
 * migration (`20260823150000_add_author_resources`) whose tables were created
 * earlier with `db push`, so Postgres rejects it with 42P07. Rather than
 * rewriting that history here, this script applies only the additive columns
 * the in-app refund service needs. It is safe to run repeatedly.
 *
 *   node scripts/apply-support-refund-columns.js
 */

require('dotenv').config();

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not set (checked .env)');
    process.exit(1);
}

const STATEMENTS = [
    `ALTER TABLE "support_transactions" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3)`,
    `ALTER TABLE "support_transactions" ADD COLUMN IF NOT EXISTS "refundReason" TEXT`,
    `ALTER TABLE "support_transactions" ADD COLUMN IF NOT EXISTS "refundedById" TEXT`,
    `CREATE INDEX IF NOT EXISTS "support_transactions_refundedAt_idx" ON "support_transactions"("refundedAt")`,
];

const pool = new Pool({ connectionString, connectionTimeoutMillis: 20000 });

(async () => {
    try {
        for (const sql of STATEMENTS) {
            await pool.query(sql);
            console.log(`OK  ${sql}`);
        }

        const { rows } = await pool.query(
            `select column_name from information_schema.columns
             where table_name = 'support_transactions'
               and column_name in ('refundedAt', 'refundReason', 'refundedById')
             order by column_name`
        );
        console.log(`\nrefund columns present: ${rows.map((r) => r.column_name).join(', ') || 'none'}`);
    } catch (error) {
        console.error(`FAIL ${error.code || ''} ${error.message}`);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
