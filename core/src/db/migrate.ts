/**
 * Programmatic Drizzle migration runner. Used by `bun run db:migrate` and
 * by CI before tests.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  console.log('[migrate] running migrations against', url);
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('[migrate] done');

  await sql.end();
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
