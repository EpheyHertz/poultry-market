/**
 * Quick database reachability check.
 *
 * Diagnoses PrismaClientKnownRequestError / ETIMEDOUT reports by testing the
 * raw pg connection independently of Next.js and Prisma.
 *
 *   node scripts/db-ping.js
 */

require('dotenv').config();

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not set (checked .env)');
    process.exit(1);
}

// Report where we are connecting without leaking the password.
try {
    const parsed = new URL(connectionString);
    console.log(`host=${parsed.hostname} port=${parsed.port || 5432} db=${parsed.pathname.slice(1)}`);
} catch {
    console.log('DATABASE_URL could not be parsed as a URL');
}

const started = Date.now();
const pool = new Pool({ connectionString, connectionTimeoutMillis: 15000 });

pool
    .query('select count(*)::int as posts from blog_posts')
    .then((result) => {
        console.log(`OK in ${Date.now() - started}ms → blog_posts=${result.rows[0].posts}`);
        return pool.end();
    })
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`FAIL in ${Date.now() - started}ms → ${error.code || ''} ${error.message}`);
        process.exit(1);
    });
