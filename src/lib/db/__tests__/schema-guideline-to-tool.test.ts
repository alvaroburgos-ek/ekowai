import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTableColumns } from 'drizzle-orm';
import { fields, worksheetSections, regulationTables, regulationTableRows } from '../schema';

describe('guideline-to-tool schema (additive)', () => {
  it('fields gains widget / ui_config / lookup / visible_when, all nullable', () => {
    const c = getTableColumns(fields);
    expect(c.widget.name).toBe('widget');
    expect(c.uiConfig.name).toBe('ui_config');
    expect(c.lookup.name).toBe('lookup');
    expect(c.visibleWhen.name).toBe('visible_when');
    for (const k of ['widget', 'uiConfig', 'lookup', 'visibleWhen'] as const) expect(c[k].notNull).toBe(false);
  });
  it('worksheet_sections gains visible_when', () => {
    expect(getTableColumns(worksheetSections).visibleWhen.name).toBe('visible_when');
  });
  it('regulation_tables / regulation_table_rows exist with the contract columns', () => {
    const t = getTableColumns(regulationTables);
    for (const k of ['standardCode', 'edition', 'tableCode', 'titleDe', 'keyColumns', 'valueColumns', 'overridePolicy', 'verificationStatus'] as const) expect(t[k]).toBeDefined();
    const r = getTableColumns(regulationTableRows);
    for (const k of ['tableId', 'rowKey', 'keys', 'values', 'labelDe', 'verbatimQuote', 'orderIndex'] as const) expect(r[k]).toBeDefined();
    expect(r.verbatimQuote.notNull).toBe(true);
  });
  it('the schema migration renames the LEGACY prod regulation_tables BEFORE creating the Plan-1 table; the rollback refuses while the new table holds rows and renames back (plan1-D-3-1)', () => {
    const dir = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
    const up = readFileSync(join(dir, '20260911100000_guideline_to_tool_schema.sql'), 'utf8');
    const guard = up.indexOf("column_name = 'standard_code'");
    const rename = up.indexOf('ALTER TABLE public.regulation_tables RENAME TO regulation_tables_legacy_v1;');
    const create = up.indexOf('CREATE TABLE IF NOT EXISTS regulation_tables (');
    expect(guard).toBeGreaterThan(-1);
    expect(rename).toBeGreaterThan(guard);
    expect(create).toBeGreaterThan(rename);
    expect(up).toContain('RENAME CONSTRAINT regulation_tables_pkey TO regulation_tables_legacy_v1_pkey');
    expect(up).toContain('RENAME CONSTRAINT regulation_tables_standard_id_fkey TO regulation_tables_legacy_v1_standard_id_fkey');
    expect(up).toMatch(/AND NOT EXISTS \(SELECT 1 FROM information_schema\.columns WHERE table_schema = 'public' AND table_name = 'regulation_tables' AND column_name = 'standard_code'\)/);
    const down = readFileSync(join(dir, 'rollback-20260911100000_guideline_to_tool_schema.sql'), 'utf8');
    expect(down).toMatch(/RAISE EXCEPTION 'regulation_tables \(Plan-1 shape\) still holds % rows/);
    expect(down.indexOf('RAISE EXCEPTION')).toBeLessThan(down.indexOf('DROP TABLE IF EXISTS public.regulation_tables;'));
    expect(down).toContain('ALTER TABLE public.regulation_tables_legacy_v1 RENAME TO regulation_tables;');
    expect(down).toContain('RENAME CONSTRAINT regulation_tables_legacy_v1_pkey TO regulation_tables_pkey');
  });
});
