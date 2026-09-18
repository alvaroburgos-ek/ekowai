/**
 * Plan 3 Task 13 — DIN-276 seed builders: four tables, every row lifted from
 * the transcript (spans by line range, every cell asserted inside its span at
 * build time), Table 1 = the printed KG catalogue (326 rows: 8 / 52 / 266 per
 * level — exactly the 326 prod `kg_*` fields of DIN-276-09 … -16), every
 * `parent_kg` exists, the Table-2 keys drive the created `kg_selector`, and the
 * two OCR-ambiguous tables stay `imported_unverified` (din276-U-1 / U-2). The
 * transcript-wide check is `scripts/regulation-tables/verify-regulation-tables.ts
 * din276 "<transcript>"`.
 */
import { describe, it, expect } from 'vitest';
import { din276SeedTables, table1AsTable, table2AsTable, table3AsTable, table4AsTable, DIN276_EDITION, Q, KG_LEVEL1, STAGE_TOKENS, SONDERKOSTEN_ART, T1_ROWS, T3_ROWS, T4_ROWS } from '../regulation-tables-seed-din276';
import { SEED_BUILDERS } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';
import prior from '../field-configs/din276.prior.json';

const STD = 'DIN-276';
const table = makeTableLookup(STD);
const byKey = <T extends { row_key: string }>(rows: readonly T[], k: string) => rows.find((r) => r.row_key === k)!;

describe('DIN-276 regulation-table seed (Plan 3 Task 13)', () => {
  it('four tables, 671 rows, edition 2018-12 (L1 / L516), registered as din276 with ts 20260917101300; statuses per table', () => {
    const tables = din276SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TABLE1', 'TABLE2', 'TABLE3', 'TABLE4']);
    expect(tables.map((t) => t.rows.length)).toEqual([326, 8, 78, 259]);
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(671);
    expect(DIN276_EDITION).toBe('2018-12');
    expect(Q.L1).toBe('Replacement for DIN 277-3:2005-04, DIN 276-1:2008-12 and DIN 276-4:2009-08');
    expect(Q.L516).toContain('DIN 276:2018-12');
    for (const t of tables) {
      expect(t.standard_code).toBe(STD);
      expect(t.edition).toBe(DIN276_EDITION);
      for (const r of t.rows) expect(r.verbatim_quote.trim().length, `${t.table_code} ${r.row_key}`).toBeGreaterThan(0);
    }
    expect(Object.fromEntries(tables.map((t) => [t.table_code, t.verification_status]))).toEqual({ TABLE1: 'md_verified', TABLE2: 'md_verified', TABLE3: 'imported_unverified', TABLE4: 'imported_unverified' });
    expect(SEED_BUILDERS.din276).toMatchObject({ ts: '20260917101300', slugFile: 'din276' });
    expect(SEED_BUILDERS.din276.build().map((t) => t.table_code)).toEqual(tables.map((t) => t.table_code));
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.table_code).toBe(t.table_code);
  });

  it('TABLE1 (Table 1, L464–L1010): 326 printed KG rows = 8 first-level + 52 second-level + 266 third-level; every parent_kg / kg1 / kg2 resolves; the prod kg_* fields of DIN-276-09 … -16 map 1:1 onto the rows (capture 2026-09-18)', () => {
    const t = table1AsTable();
    expect(t.key_columns).toEqual(['kg']);
    expect(t.value_columns.map((c) => c.name)).toEqual(['designation', 'notes', 'level', 'parent_kg', 'kg1', 'kg2']);
    const byLevel = (n: number) => t.rows.filter((r) => r.values.level === n);
    expect([byLevel(1).length, byLevel(2).length, byLevel(3).length]).toEqual([8, 52, 266]);
    expect(byLevel(1).map((r) => r.row_key)).toEqual([...KG_LEVEL1]);
    const keys = new Set(t.rows.map((r) => r.row_key));
    for (const r of t.rows) {
      const p = r.values.parent_kg;
      if (r.values.level === 1) { expect(p).toBeNull(); expect(r.values.kg2).toBeNull(); } else { expect(keys.has(p as string), `${r.row_key} parent ${p}`).toBe(true); expect(r.values.kg2).toBe(`KG ${(r.values.level === 2 ? r.row_key : (p as string)).slice(3)}`); }
      expect(r.values.kg1).toBe(`KG ${r.row_key.slice(3, 4)}00`);
      expect(/^KG \d{3}$/.test(r.values.kg1 as string)).toBe(true); // never an identifier (string-literal trap, module header)
    }
    // prod ↔ Table 1: every kg_NNN / kg_NN0_total field of the eight KG worksheets is a printed row and vice versa
    const prodKg = Object.keys(prior).filter((k) => /^DIN-276-(09|1[0-6]) kg_/.test(k)).map((k) => k.split(' ')[1].replace(/_total$/, ''));
    expect(prodKg).toHaveLength(326);
    expect(new Set(prodKg).size).toBe(326);
    expect(prodKg.filter((s) => !keys.has(s))).toEqual([]);
    expect([...keys].filter((k) => !prodKg.includes(k))).toEqual([]);
    // printed cells (L464 / L538 / L546 / L1005)
    expect(byKey(t.rows, 'kg_100').values.designation).toBe('Property');
    expect(byKey(t.rows, 'kg_300').values.designation).toBe('Building - Building constructions');
    expect(byKey(t.rows, 'kg_311').values).toMatchObject({ designation: 'Manufacture', level: 3, parent_kg: 'kg_310', kg1: 'KG 300', kg2: 'KG 310' });
    expect(byKey(t.rows, 'kg_311').values.notes).toContain('Soil removal, soil securing and soil application');
    expect(byKey(t.rows, 'kg_800').values.designation).toBe('Financing');
    expect(byKey(t.rows, 'kg_229').values.notes).toBeNull(); // printed blank (L522 "\hline 229 & Miscellaneous for KG 220 & \\\\")
    // a multi-line notes cell keeps the nested tabular in the span and its fragments in `notes`
    const r121 = T1_ROWS.find((r) => r.code === '121')!;
    expect(r121.endLine).toBe(470);
    expect(r121.notes).toContain('The costs of the engineering survey (e.g. site plan, building survey) belong to KG 745.');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('The list is not exhaustive.');
    expect(t.override_quote).toContain('Cost calculations are to be organised according to the cost classification system in Section 5 and Table 1.');
    expect(table('TABLE1', ['kg_311'])).toMatchObject({ level: 3, parent_kg: 'kg_310' });
    // group labels for the row picker: parent KG for level 2 / 3, the first level for level 1
    expect(byKey(t.rows, 'kg_311').group_label).toBe('KG 310 Excavation/earthworks');
    expect(byKey(t.rows, 'kg_310').group_label).toBe('KG 300 Building - Building constructions');
    expect(byKey(t.rows, 'kg_300').group_label).toBe('KG 100–800 (1. Ebene)');
  });

  it('TABLE2 (Table 2, L1030–L1037): the eight first-level KGs with unit m² and GF / GFA / AF; keys = KG_LEVEL1 (the created kg_selector options); anhaltswert (L1022 "It is recommended …")', () => {
    const t = table2AsTable();
    expect(t.rows.map((r) => r.row_key)).toEqual([...KG_LEVEL1]);
    expect(t.value_columns.map((c) => c.name)).toEqual(['unit', 'designation', 'determination']);
    for (const r of t.rows) expect(r.values.unit).toBe('m²');
    expect(byKey(t.rows, 'kg_100').values).toEqual({ unit: 'm²', designation: 'Plot area (GF)', determination: 'Total plot area according to DIN 277-1' });
    expect(byKey(t.rows, 'kg_300').values).toEqual({ unit: 'm²', designation: 'Gross floor area (GFA)', determination: 'Total gross floor area according to DIN 277-1' });
    expect(byKey(t.rows, 'kg_500').values).toEqual({ unit: 'm²', designation: 'Outdoor area (AF)', determination: 'Total outdoor area according to DIN 277-1' });
    expect(t.rows.map((r) => r.values.designation)).toEqual(['Plot area (GF)', 'Plot area (GF)', 'Gross floor area (GFA)', 'Gross floor area (GFA)', 'Outdoor area (AF)', 'Gross floor area (GFA)', 'Gross floor area (GFA)', 'Gross floor area (GFA)']);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe(Q.L1022);
    expect(Q.L1022.startsWith('It is recommended that the quantities and reference units in Table 2 be used')).toBe(true);
    expect(byKey(t.rows, 'kg_100').verbatim_quote).toContain('$\\mathrm{m}^{2}$'); // the printed TeX unit token stays in the span
  });

  it('TABLE3 (Table 3, L1052–L1160): 78 KG 3xx rows; m² / m³ / m units; the three "According to the requirements of the project" blocks (370–379, 381–389, 391–399) carry the block text; row 340 prints an EMPTY unit cell → null, imported_unverified (din276-U-1)', () => {
    const t = table3AsTable();
    expect(t.rows).toHaveLength(78);
    expect(t.rows.map((r) => r.row_key.slice(3)).slice(0, 8)).toEqual(['300', '310', '311', '312', '313', '314', '319', '320']);
    expect(byKey(t.rows, 'kg_311').values).toEqual({ unit: 'm³', designation: 'Excavation space content/ earthwork space content', determination: 'Volume including working areas and embankments' });
    expect(byKey(t.rows, 'kg_333').values).toMatchObject({ unit: 'm', designation: 'Outer support length' });
    expect(byKey(t.rows, 'kg_340').values).toEqual({ unit: null, designation: 'Interior wall area/area of vertical building structures, interior', determination: 'Area of interior walls/area of vertical building structures, interior' });
    expect(T3_ROWS.find((r) => r.code === '340')!.line).toBe(1093);
    expect(byKey(t.rows, 'kg_340').verbatim_quote).toContain('& & Interior wall area'); // U-1: the blank cell as printed
    for (const code of ['370', '371', '379']) expect(byKey(t.rows, `kg_${code}`).values).toEqual({ unit: null, designation: null, determination: 'According to the requirements of the project' });
    for (const code of ['381', '389', '391', '399']) expect(byKey(t.rows, `kg_${code}`).values.determination).toBe('According to the requirements of the project');
    expect(byKey(t.rows, 'kg_380').values).toMatchObject({ unit: 'm²', designation: 'Gross floor area (GFA)' });
    expect(byKey(t.rows, 'kg_390').values).toMatchObject({ unit: 'm²', designation: 'Gross floor area (GFA)' });
    const b = T3_ROWS.find((r) => r.code === '375')!;
    expect([b.spanFrom, b.spanTo]).toEqual([1124, 1133]); // the 370–379 block (L1124–L1133); 381–389 starts L1143, 391–399 L1152
    expect(byKey(t.rows, 'kg_375').verbatim_quote).toBe(byKey(t.rows, 'kg_370').verbatim_quote);
    expect(new Set(t.rows.map((r) => r.values.unit).filter(Boolean))).toEqual(new Set(['m²', 'm³', 'm']));
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.verification_status).toBe('imported_unverified');
  });

  it('TABLE4 (Table 4, L1174–L1541): 259 rows keyed (kg, nr) — 72 printed KG rows (nr "0") + 187 numbered items; units verbatim; the U-2 cells kept as printed; 491–499 "Like KG 490"; kann (L1166 "can be used")', () => {
    const t = table4AsTable();
    expect(t.key_columns).toEqual(['kg', 'nr']);
    expect(t.rows).toHaveLength(259);
    expect(t.rows.filter((r) => r.keys.nr === '0')).toHaveLength(72);
    expect(t.rows.filter((r) => r.keys.nr !== '0')).toHaveLength(187);
    expect(byKey(t.rows, 'kg_411|0').values).toEqual({ item: 'Sewage systems', unit: null, designation: null, determination: null });
    expect(byKey(t.rows, 'kg_411|1').values).toEqual({ item: 'Sewage pipes', unit: 'm', designation: 'Sewage pipe', determination: 'Length of wastewater pipes' });
    expect(byKey(t.rows, 'kg_411|3').values).toMatchObject({ item: 'Collection and treatment systems', unit: 'St.' });
    expect(byKey(t.rows, 'kg_421|2').values).toMatchObject({ item: 'Heat transfer stations', unit: 'kW' });
    expect(byKey(t.rows, 'kg_431|1').values).toMatchObject({ unit: 'm3/h' }); // printed without a superscript — kept verbatim
    expect(byKey(t.rows, 'kg_442|1').values).toMatchObject({ unit: 'kVA' });
    expect(byKey(t.rows, 'kg_442|3').values).toMatchObject({ unit: 'Ah' });
    expect(byKey(t.rows, 'kg_442|4').values).toMatchObject({ unit: 'kWp' });
    expect(byKey(t.rows, 'kg_443|2').values).toMatchObject({ unit: 'kvar' });
    expect(byKey(t.rows, 'kg_444|1').values).toMatchObject({ unit: 'm²', designation: 'Gross floor area (GFA)' });
    expect(byKey(t.rows, 'kg_458|3').values).toMatchObject({ item: 'Toll systems, toll payment', unit: 'St.' }); // printed "3 ) Toll systems" (OCR space)
    // din276-U-2: printed-blank / odd cells kept as printed
    expect(byKey(t.rows, 'kg_440|0').values).toEqual({ item: 'Electrical systems', unit: null, designation: 'Electrical system for heavy current', determination: null }); // L1287
    expect(byKey(t.rows, 'kg_458|6').values).toEqual({ item: 'Transport telematics', unit: null, designation: 'Function of transport telematics', determination: 'Number of functions for traffic telematics' }); // L1375
    expect(byKey(t.rows, 'kg_474|3').values).toMatchObject({ unit: 'm.' }); // L1450
    expect(T4_ROWS.find((r) => r.code === '440' && r.nr === '0')!.line).toBe(1287);
    expect(T4_ROWS.find((r) => r.code === '458' && r.nr === '6')!.line).toBe(1375);
    expect(T4_ROWS.find((r) => r.code === '474' && r.nr === '3')!.line).toBe(1450);
    expect(byKey(t.rows, 'kg_490|0').values).toMatchObject({ unit: 'm²', designation: 'Gross floor area (GFA)' });
    for (const code of ['491', '495', '499']) expect(byKey(t.rows, `kg_${code}|0`).values).toEqual({ item: expect.any(String), unit: null, designation: null, determination: 'Like KG 490' });
    expect(new Set(t.rows.map((r) => r.values.unit).filter(Boolean))).toEqual(new Set(['m', 'St.', 'kW', 'm²', 'm3/h', 'kVA', 'Ah', 'kWp', 'kvar', 'm.']));
    expect(t.override_policy).toBe('kann');
    expect(t.override_quote).toBe(Q.L1166);
    expect(Q.L1166).toContain('can be used for cost group 400');
    expect(t.verification_status).toBe('imported_unverified');
    expect(table('TABLE4', ['kg_411', '1'])).toMatchObject({ unit: 'm' });
    expect(table('TABLE4', ['kg_411', '9'])).toBeUndefined();
  });

  it('tokens: the five stage tokens and the five Sonderkosten kinds are identifiers that never collide with a matrix / Sonderkosten column key (string-literal trap)', () => {
    expect([...STAGE_TOKENS]).toEqual(['kr', 'ksch', 'kber', 'ka', 'kf']);
    expect([...SONDERKOSTEN_ART]).toEqual(['bausubstanz', 'beigestellt', 'besondere', 'prognose', 'risiko']);
    expect(Q.L286).toBe('\\subsection*{4.3.2 Cost framework}');
    expect([Q.L298, Q.L324, Q.L343]).toEqual(['\\subsection*{4.3.3 Cost estimate}', '\\subsection*{4.3.5 Cost estimate}', '\\subsection*{4.3.6 Cost estimate}']); // din276-J-3: three stages translated alike
  });
});
