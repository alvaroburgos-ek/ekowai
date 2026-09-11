import { describe, it, expect } from 'vitest';
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
});
