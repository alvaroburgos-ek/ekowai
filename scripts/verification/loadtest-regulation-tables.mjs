// Disposable embedded-Postgres load test for a regulation_tables migration: NO prod, NO credentials.
// Boots a throwaway PG 18 (same mechanism as tests/harness/embedded-pg.ts), creates the two tables with the prod DDL,
// applies the migration twice (idempotency), checks declared columns/keys/order_index, optionally applies the rollback.
// Usage: node scripts/verification/loadtest-regulation-tables.mjs <migration.sql> [<rollback.sql>]
import EmbeddedPostgres from 'embedded-postgres';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import postgres from 'postgres';

const [migration, rollback] = process.argv.slice(2);
const dataDir = mkdtempSync(join(tmpdir(), 'ekowai-loadtest-'));
const port = 50000 + (process.pid % 12000);
const pg = new EmbeddedPostgres({
  databaseDir: dataDir, user: 'postgres', password: 'postgres', port, persistent: false,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});
await pg.initialise();
await pg.start();
const sql = postgres(`postgres://postgres:postgres@127.0.0.1:${port}/postgres`, { max: 1, prepare: false });
try {
  // DDL mirrors prod (information_schema + pg_constraint read 2026-09-29).
  await sql.unsafe(`
    CREATE TABLE regulation_tables (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      standard_code text NOT NULL, edition text NOT NULL, table_code text NOT NULL,
      title_de text NOT NULL, clause_reference text, page_ref text,
      key_columns text[] NOT NULL, value_columns jsonb NOT NULL,
      override_policy text NOT NULL CHECK (override_policy IN ('locked','anhaltswert','kann','messwert')),
      override_quote text, verification_status text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (standard_code, edition, table_code));
    CREATE TABLE regulation_table_rows (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      table_id uuid NOT NULL REFERENCES regulation_tables(id) ON DELETE CASCADE,
      row_key text NOT NULL, keys jsonb NOT NULL, group_label text, label_de text NOT NULL,
      order_index integer NOT NULL, row_values jsonb NOT NULL, verbatim_quote text NOT NULL,
      UNIQUE (table_id, row_key));`);
  const run = async (file) => {
    const text = readFileSync(file, 'utf8');
    await sql.unsafe(text);
  };
  await run(migration);
  const counts = await sql`select t.table_code, t.page_ref, count(r.id)::int n, array_length(t.key_columns,1) kc, jsonb_array_length(t.value_columns) vc
     from regulation_tables t left join regulation_table_rows r on r.table_id=t.id group by t.id order by t.table_code`;
  console.table(counts);
  // idempotency: run twice, counts must not change
  await run(migration);
  const again = await sql`select count(*)::int tables, (select count(*)::int from regulation_table_rows) rows from regulation_tables`;
  console.log('after second run:', again[0]);
  // every row_values key must be declared in value_columns; every keys key must be in key_columns
  const bad = await sql`select t.table_code, r.row_key, k.key
     from regulation_tables t join regulation_table_rows r on r.table_id=t.id, jsonb_object_keys(r.row_values) k(key)
     where not exists (select 1 from jsonb_array_elements(t.value_columns) v where v->>'name' = k.key)`;
  console.log('undeclared row_values keys:', bad.length, bad.slice(0, 5));
  const badk = await sql`select t.table_code, r.row_key, k.key
     from regulation_tables t join regulation_table_rows r on r.table_id=t.id, jsonb_object_keys(r.keys) k(key)
     where not (k.key = any(t.key_columns))`;
  console.log('undeclared keys:', badk.length, badk.slice(0, 5));
  const dupOrder = await sql`select t.table_code, r.order_index, count(*) from regulation_tables t join regulation_table_rows r on r.table_id=t.id group by 1,2 having count(*)>1`;
  console.log('duplicate order_index:', dupOrder.length, dupOrder);
  const sample = await sql`select t.table_code, r.row_key, r.label_de, r.row_values from regulation_tables t join regulation_table_rows r on r.table_id=t.id where t.table_code in ('TAB2','TAB23','TAB29','TAB21') and r.order_index in (0,11,13) order by 1,2`;
  for (const s of sample) console.log(s.table_code, s.row_key, '|', s.label_de, '|', JSON.stringify(s.row_values).slice(0, 200));
  if (rollback) {
    await run(rollback);
    const after = await sql`select count(*)::int tables, (select count(*)::int from regulation_table_rows) rows from regulation_tables`;
    console.log('after rollback:', after[0]);
  }
} finally {
  await sql.end();
  await pg.stop();
  rmSync(dataDir, { recursive: true, force: true });
}
