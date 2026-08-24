const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to DB');

  console.log('Renaming column "searchVector" to "search_vector"...');
  await client.query('ALTER TABLE blog_posts RENAME COLUMN "searchVector" TO search_vector;');
  console.log('Rename successful.');

  // Query 1: Get columns of blog_posts
  const columnsRes = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'blog_posts';"
  );
  console.log('--- COLUMNS IN blog_posts ---');
  columnsRes.rows.forEach(row => {
    console.log(`- ${row.column_name} (${row.data_type})`);
  });

  await client.end();
}

main().catch(console.error);
