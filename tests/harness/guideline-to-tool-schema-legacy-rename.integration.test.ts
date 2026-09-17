/**
 * Plan 3 Task 4 fix round 1 (sign-off plan1-D-3-1) — reproduction check for the Plan-1 schema migration's
 * legacy-table rename on embedded Postgres: prod carries a LEGACY `regulation_tables` (per-cell shape, no
 * `standard_code`); the migration must rename it to `regulation_tables_legacy_v1` (rows, pkey, fkey and indexes
 * renamed, data untouched), then create the Plan-1 table; a second run is a no-op; the rollback refuses while the
 * Plan-1 table holds rows, and otherwise drops the Plan-1 tables and renames the legacy table back.
 *
 * "Broken before": on a DB with the legacy table, the seed INSERT fails (column standard_code does not exist);
 * "computes after": the same INSERT succeeds once the migration ran.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startHarness, type Harness } from './embedded-pg';

const DIR = join(__dirname, '..', '..', 'supabase', 'migrations');
const UP = readFileSync(join(DIR, '20260911100000_guideline_to_tool_schema.sql'), 'utf8');
const DOWN = readFileSync(join(DIR, 'rollback-20260911100000_guideline_to_tool_schema.sql'), 'utf8');

let h: Harness;
beforeAll(async () => {
  h = await startHarness();
  // The harness applies the Drizzle DDL (Plan-1 shape). Rebuild prod's state: no Plan-1 tables, the LEGACY table
  // with prod's constraint/index names (read-only capture 2026-09-17: regulation_tables_pkey,
  // regulation_tables_standard_id_fkey, regulation_tables_std_idx, regulation_tables_table_idx; RLS on, 0 policies).
  await h.sql.unsafe(`
    DROP TABLE IF EXISTS regulation_table_rows; DROP TABLE IF EXISTS regulation_tables;
    CREATE TABLE regulation_tables (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), standard_id uuid NOT NULL REFERENCES standards(id), table_id text NOT NULL,
      table_name text, row_number int, parameter_label text, parameter_symbol text, variant_dimension text, variant_value text,
      value_text text, value_numeric numeric, unit text, comparison text, clause_reference text,
      verification_status text NOT NULL DEFAULT 'imported_unverified', source_quote text, source_file text, audit_status text, created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX regulation_tables_std_idx ON regulation_tables(standard_id);
    CREATE INDEX regulation_tables_table_idx ON regulation_tables(table_id);
    ALTER TABLE regulation_tables ENABLE ROW LEVEL SECURITY;
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-M-277E', 'Merkblatt DWA-M 277', 'October 2017') ON CONFLICT DO NOTHING;
    INSERT INTO regulation_tables (standard_id, table_id, table_name, row_number, parameter_label, variant_value, value_text)
      SELECT id, 'TBL-2', 'Table 2', 1, 'Water volume', 'shower', '10-50' FROM standards WHERE code = 'DWA-M-277E';
    DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF; END $$;
  `);
}, 120_000);
afterAll(async () => { await h?.stop(); });

const tables = async () => (await h.sql<{ table_name: string }[]>`select table_name from information_schema.tables where table_schema = 'public' and table_name like 'regulation_table%' order by 1`).map((r) => r.table_name);
const cons = async (t: string) => (await h.sql<{ conname: string }[]>`select conname from pg_constraint where conrelid = ${'public.' + t}::regclass and contype in ('p','f','u') order by 1`).map((r) => r.conname);
const idx = async (t: string) => (await h.sql<{ indexname: string }[]>`select indexname from pg_indexes where tablename = ${t} order by 1`).map((r) => r.indexname);
const SEED_INSERT = `INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, key_columns, value_columns, override_policy) VALUES ('DWA-M-277E', '2017-10', 'TABLE5', 'x', ARRAY['application'], '[]'::jsonb, 'anhaltswert')`;

describe('20260911100000 — legacy regulation_tables rename (plan1-D-3-1)', () => {
  it('broken before: the Plan-3 seed INSERT fails on the legacy table', async () => {
    await expect(h.sql.unsafe(SEED_INSERT)).rejects.toThrow(/standard_code/);
  });

  it('forward: renames the legacy table + pkey/fkey/indexes, creates the Plan-1 tables, keeps the legacy rows; idempotent on re-run', async () => {
    await h.sql.unsafe(UP);
    expect(await tables()).toEqual(['regulation_table_rows', 'regulation_tables', 'regulation_tables_legacy_v1']);
    expect(await cons('regulation_tables_legacy_v1')).toEqual(['regulation_tables_legacy_v1_pkey', 'regulation_tables_legacy_v1_standard_id_fkey']);
    expect(await idx('regulation_tables_legacy_v1')).toEqual(['regulation_tables_legacy_v1_pkey', 'regulation_tables_legacy_v1_std_idx', 'regulation_tables_legacy_v1_table_idx']);
    const legacy = await h.sql`select variant_value, value_text from regulation_tables_legacy_v1`;
    expect(legacy).toEqual([{ variant_value: 'shower', value_text: '10-50' }]);
    const cols = (await h.sql<{ column_name: string }[]>`select column_name from information_schema.columns where table_name = 'regulation_tables' order by ordinal_position`).map((r) => r.column_name);
    expect(cols).toEqual(['id', 'standard_code', 'edition', 'table_code', 'title_de', 'clause_reference', 'page_ref', 'key_columns', 'value_columns', 'override_policy', 'override_quote', 'verification_status', 'created_at']);
    expect(await cons('regulation_tables')).toEqual(['regulation_tables_pkey', 'regulation_tables_standard_code_edition_table_code_key']); // no collision with the renamed legacy names
    // computes after: the seed INSERT now lands
    await h.sql.unsafe(SEED_INSERT);
    expect((await h.sql`select count(*)::int as n from regulation_tables`)[0].n).toBe(1);
    // re-run: the guard sees standard_code and does nothing
    await h.sql.unsafe(UP);
    expect(await tables()).toEqual(['regulation_table_rows', 'regulation_tables', 'regulation_tables_legacy_v1']);
    expect((await h.sql`select count(*)::int as n from regulation_tables_legacy_v1`)[0].n).toBe(1);
  });

  it('rollback: refuses while the Plan-1 table holds rows; after the seed rollback it drops the Plan-1 tables and renames the legacy table back', async () => {
    await expect(h.sql.unsafe(DOWN)).rejects.toThrow(/still holds 1 rows/);
    expect(await tables()).toEqual(['regulation_table_rows', 'regulation_tables', 'regulation_tables_legacy_v1']);
    await h.sql.unsafe(`DELETE FROM regulation_tables`);
    await h.sql.unsafe(DOWN);
    expect(await tables()).toEqual(['regulation_tables']);
    expect(await cons('regulation_tables')).toEqual(['regulation_tables_pkey', 'regulation_tables_standard_id_fkey']);
    expect(await idx('regulation_tables')).toEqual(['regulation_tables_pkey', 'regulation_tables_std_idx', 'regulation_tables_table_idx']);
    expect(await h.sql`select variant_value from regulation_tables`).toEqual([{ variant_value: 'shower' }]);
    // a second rollback on the legacy-only state refuses loudly instead of touching the legacy table
    await expect(h.sql.unsafe(DOWN)).rejects.toThrow(/legacy shape/);
  });
});
