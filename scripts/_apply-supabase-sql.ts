import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const files = process.argv.slice(2);
if (files.length === 0) throw new Error('Usage: tsx _apply-supabase-sql.ts <file.sql> [...]');

async function main() {
  const sql = postgres(url!, { prepare: false });
  try {
    for (const f of files) {
      console.log(`Applying ${f}...`);
      await sql.unsafe(readFileSync(f, 'utf8'));
    }
    console.log('Done.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
