/**
 * Plan 3 Task 21 — ISO-59020 seed table: Table 3 "Core circularity indicators"
 * (13 rows, both printed pages) lifted by line range in this session, every cell
 * fragment asserted inside its span, keyed on the prod `selected_core_indicator`
 * tokens, `imported_unverified` (plain-txt = VC; U-1 hyphenations), the
 * SEED_BUILDERS registration and the fallback resolution.
 */
import { describe, it, expect } from 'vitest';
import { iso59020SeedTables, table3AsTable, ISO59020_EDITION, TABLE3_ROWS, CATEGORY_TOKENS, collapse } from '../regulation-tables-seed-iso59020';
import { Q } from '../regulation-tables-quotes-iso59020';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'ISO-59020';
/** prod `selected_core_indicator` enum values, in prod order (captured 2026-09-18, iso59020.prior.json) */
const PROD_TOKENS = [
  'A.2.2_reused_content_inflow', 'A.2.3_recycled_content_inflow', 'A.2.4_renewable_content_inflow',
  'A.3.2_lifetime_relative', 'A.3.3_reused_from_outflow', 'A.3.4_recycled_from_outflow', 'A.3.5_biological_recirculation',
  'A.4.2_renewable_energy', 'A.5.2_water_circular_sources', 'A.5.3_water_quality_discharge', 'A.5.4_water_reuse_ratio',
  'A.6.2_material_productivity', 'A.6.3_resource_intensity_index',
];

function expectWellFormed(t: RegulationTable) {
  const keys = new Set<string>();
  for (const r of t.rows) {
    expect(keys.has(r.row_key), `${t.table_code} duplicate row_key ${r.row_key}`).toBe(false);
    keys.add(r.row_key);
    expect(r.row_key).toBe(t.key_columns.map((c) => r.keys[c]).join('|'));
    expect(r.verbatim_quote.trim().length, `${t.table_code} ${r.row_key} quote`).toBeGreaterThan(0);
    expect(r.verbatim_quote).not.toContain('undefined');
    for (const c of t.value_columns) expect(c.name in r.values, `${t.table_code} ${r.row_key} lacks column ${c.name}`).toBe(true);
  }
  expect(t.standard_code).toBe(STD);
  expect(t.edition).toBe(ISO59020_EDITION);
  expect(t.override_quote?.trim().length ?? 0).toBeGreaterThan(0);
  expect(t.override_quote).not.toContain('undefined');
}

describe('ISO-59020 Plan-3 seed table (Table 3)', () => {
  it('one table in the live set; registered as SEED_BUILDERS.iso59020 (ts 20260917102100); the fallback resolves it; edition 2024; imported_unverified (txt = VC)', () => {
    const tables = iso59020SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TABLE3']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.iso59020).toEqual({ build: iso59020SeedTables, ts: '20260917102100', slugFile: 'iso59020' });
    expect(liveSeedSlugs()).toContain('iso59020');
    expect(resolveRegulationTable(STD, 'TABLE3')?.rows.length).toBe(13);
    expect(ISO59020_EDITION).toBe('2024'); // L8–L9 "First edition" / "2024-05"; prod standards.version '2024 (First edition 2024-05)'
    expect(Q.L7_9).toContain('ISO 59020');
    expect(Q.L7_9).toContain('First edition');
    expect(Q.L7_9).toContain('2024-05');
    for (const t of tables) expect(t.verification_status, t.table_code).toBe('imported_unverified');
    for (const k of Object.keys(Q)) expect((Q as Record<string, string>)[k].trim().length, k).toBeGreaterThan(0);
  });

  it('13 rows keyed EXACTLY on the prod selected_core_indicator tokens in prod order (G-A3 / D-1); category tokens = prod indicator_category; the six Mandatory rows are A.2.2 / A.2.3 / A.2.4 / A.3.3 / A.3.4 / A.3.5 (§7.3.1 "mandatory indicators in Clauses A.2 and A.3")', () => {
    const t = table3AsTable();
    expect(t.key_columns).toEqual(['indicator']);
    expect(t.rows.map((r) => r.keys.indicator)).toEqual(PROD_TOKENS);
    expect(TABLE3_ROWS.map((r) => r.key)).toEqual(PROD_TOKENS);
    expect(t.rows.filter((r) => r.values.mandatory === true).map((r) => r.values.clause)).toEqual(['A.2.2', 'A.2.3', 'A.2.4', 'A.3.3', 'A.3.4', 'A.3.5']);
    expect(t.rows.filter((r) => r.values.mandatory === true)).toHaveLength(6); // the "6" of ISO-59020-04-D5
    expect(t.rows.map((r) => r.values.mandatory_optional)).toEqual(['Mandatory', 'Mandatory', 'Mandatory', 'Optional', 'Mandatory', 'Mandatory', 'Mandatory', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional']);
    expect(t.rows.map((r) => r.values.category_token)).toEqual(['resource_inflow', 'resource_inflow', 'resource_inflow', 'resource_outflow', 'resource_outflow', 'resource_outflow', 'resource_outflow', 'energy', 'water', 'water', 'water', 'economic', 'economic']);
    expect(Object.values(CATEGORY_TOKENS)).toEqual(['resource_inflow', 'resource_outflow', 'energy', 'water', 'economic']); // prod indicator_category enum (captured)
    expect(t.rows.map((r) => r.values.category)).toEqual(['Resource Inflows', 'Resource Inflows', 'Resource Inflows', 'Resource outflows', 'Resource outflows', 'Resource outflows', 'Resource outflows', 'Energy', 'Water', 'Water', 'Water', 'Economic', 'Economic']);
    for (const r of t.rows) expect(String(r.values.name).startsWith(`${r.values.clause} `), r.row_key).toBe(true);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toBe(Q.L1068_1071);
    expect(collapse(Q.L1068_1071)).toContain('shall be quantified and fully balanced with the use of the mandatory indicators in Clauses A.2 and A.3');
    expect(collapse(Q.L1068_1071)).toContain('If a core circularity indicator is not applicable, the organization should explain why and can count the indicator value as zero.');
  });

  it('the printed cells (names, descriptions, principles) — incl. the continued page A.5.2 … A.6.3 (inventory: "not re-verified" → verified here) and the U-1 hyphenations', () => {
    const t = table3AsTable();
    const v = (k: string) => t.rows.find((r) => r.row_key === k)!.values;
    expect(v('A.2.2_reused_content_inflow')).toMatchObject({ name: 'A.2.2 Average reused content of an inflow (X)', description: 'Fraction of input material resources that are reused components and products', principle: 'Retaining resource value' });
    expect(v('A.2.3_recycled_content_inflow')).toMatchObject({ name: 'A.2.3 Average recycled content of an inflow (X)', principle: 'Add resource value' });
    expect(v('A.2.4_renewable_content_inflow')).toMatchObject({ name: 'A.2.4 Average renewable content of an inflow (X)', description: 'Fraction of material resources inflow (X) that is sustainably produced renewable material' });
    expect(v('A.3.2_lifetime_relative')).toMatchObject({ name: 'A.3.2 Average lifetime of product or material relative to industry average', mandatory: false });
    expect(v('A.3.3_reused_from_outflow')).toMatchObject({ name: 'A.3.3 Per cent actual reused products and components derived from outflow (X)', description: 'Fraction of outflow that is reused' });
    expect(v('A.3.4_recycled_from_outflow')).toMatchObject({ name: 'A.3.4 Per cent actual recycled material derived from outflow (X)', principle: 'Recovering resource value' });
    expect(v('A.3.5_biological_recirculation')).toMatchObject({ name: 'A.3.5 Per cent actual recirculation of outflow in the biological cycle', principle: 'Recovers resource value' });
    expect(v('A.4.2_renewable_energy')).toMatchObject({ name: 'A.4.2 Average per cent of energy consumed that is renewable energy', description: 'Fraction of net consumed energy that qualifies as renewable energy, taking into account both energy inflows and energy outflows' });
    expect(v('A.5.2_water_circular_sources')).toMatchObject({ name: 'A.5.2 Per cent water withdrawal from inflow circular sources', principle: 'Maintains a circular flow of resources' });
    expect(v('A.5.3_water_quality_discharge')).toMatchObject({ name: 'A.5.3 Per cent water discharged in accordance with quality requirements', description: 'Per cent (by volume) of total water withdrawn that is discharged in accordance with circularity principles' });
    expect(v('A.5.4_water_reuse_ratio')).toMatchObject({ name: 'A.5.4 Ratio (on-site or internal) water reuse or recirculation', description: 'Reuse cycles of on-site water' });
    expect(v('A.6.2_material_productivity')).toMatchObject({ name: 'A.6.2 Material productivity', description: 'Ratio of revenue generated by total mass of all linear resource inflows', principle: 'Indicates resource reduction' });
    expect(v('A.6.3_resource_intensity_index')).toMatchObject({ name: 'A.6.3 Resource intensity index', description: 'Quantitative measure of economic growth versus total resource use' });
    // U-1: the five line-end hyphenations are printed (asserted here against the spans, joined in the seeded cells)
    // (the hyphenated fragment and its continuation sit on consecutive lines with the neighbouring column's text in between)
    for (const [span, frags] of [
      [Q.L1093_1095, ['sustainably pro-', 'duced renewable material']],
      [Q.L1096_1099, ['industry aver-', 'age for the resource']],
      [Q.L1107_1111, ['Recovers re-', 'source', 'recir-', 'culation']],
      [Q.L1134_1138, ['discharged in ac-', 'cordance with circularity principles']],
    ] as const) for (const f of frags) expect(collapse(span), f).toContain(f);
    // the continued page carries A.5.2 … A.6.3 (L1127 "Table 3 (continued)")
    expect(Q.L1127_1130).toContain('Table 3 (continued)');
    expect(Q.L1081_1148.startsWith(Q.L1081)).toBe(true);
    expect(Q.L1081).toContain('Table 3 — Core circularity indicators');
    const lookup = makeTableLookup(STD);
    expect(lookup('TABLE3', ['A.4.2_renewable_energy'])?.mandatory).toBe(false);
    expect(lookup('TABLE3', ['A.3.5_biological_recirculation'])?.mandatory_optional).toBe('Mandatory');
    expect(lookup('TABLE3', ['A.9.9_nope'])).toBeUndefined();
  });
});
