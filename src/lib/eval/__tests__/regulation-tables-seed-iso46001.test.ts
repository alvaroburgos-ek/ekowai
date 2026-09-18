/**
 * Plan 3 Task 22 — ISO-46001 seed tables: Table A.1 "Areas in which water use
 * can be monitored" (39 rows, both printed pages, the sector ↔ area pairing
 * settled by the per-sector letter sequence) and Table D.1 "Examples of
 * business activity indicators" (ONE row — the only pairing the layout file
 * settles; U-1 … U-23 for the rest), every cell fragment asserted inside its
 * span, `imported_unverified` (raw txt = VC), the SEED_BUILDERS registration and
 * the fallback resolution.
 */
import { describe, it, expect } from 'vitest';
import {
  iso46001SeedTables, tableA1AsTable, tableD1AsTable, ISO46001_EDITION, TABLEA1_SECTORS, TABLEA1_AREAS, TABLEA1_AREA_DATALIST, TABLEA1_SECTOR_NAMES,
  TABLED1_ROWS, TABLED1_SECTOR_COLUMN, TABLED1_INDICATOR_COLUMN, collapse,
} from '../regulation-tables-seed-iso46001';
import { Q } from '../regulation-tables-quotes-iso46001';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'ISO-46001';

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
  expect(t.edition).toBe(ISO46001_EDITION);
  expect(t.override_quote?.trim().length ?? 0).toBeGreaterThan(0);
  expect(t.override_quote).not.toContain('undefined');
}

describe('ISO-46001 Plan-3 seed tables (Table A.1, Table D.1)', () => {
  it('two tables in the live set; registered as SEED_BUILDERS.iso46001 (ts 20260917102200); the fallback resolves both; edition 2019; imported_unverified (raw txt = VC)', () => {
    const tables = iso46001SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TABLEA1', 'TABLED1']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.iso46001).toEqual({ build: iso46001SeedTables, ts: '20260917102200', slugFile: 'iso46001' });
    expect(liveSeedSlugs()).toContain('iso46001');
    expect(resolveRegulationTable(STD, 'TABLEA1')?.rows.length).toBe(39);
    expect(resolveRegulationTable(STD, 'TABLED1')?.rows.length).toBe(1);
    expect(ISO46001_EDITION).toBe('2019'); // L29–L32 "ISO 46001" / "First edition 2019-07"; prod standards.version '2019 (ISO 46001:2019, First edition, 2019-07; BS ISO 46001:2019)'
    expect(collapse(Q.L29_32)).toBe('BS ISO 46001:2019 ISO 46001 First edition 2019-07');
    for (const t of tables) expect(t.verification_status, t.table_code).toBe('imported_unverified');
    for (const t of tables) expect(t.override_policy, t.table_code).toBe('anhaltswert'); // informative catalogues (L888 "can be significant … can be beneficial"; L1192 "Examples")
    for (const k of Object.keys(Q)) expect((Q as Record<string, string>)[k].trim().length, k).toBeGreaterThan(0);
    expect(collapse(Q.L888)).toContain('Table A.1 indicates areas within business activities where water use can be significant, and in which monitoring can be beneficial');
  });

  it('TABLEA1: 39 rows = 8 printed sectors × their lettered areas (6 / 7 / 4 / 4 / 4 / 5 / 7 / 2); the letter sequence restarts at (a) per sector (the pairing rule); the merged raw lines serve two cells; sector 8 is two printed fragments', () => {
    const t = tableA1AsTable();
    expect(t.key_columns).toEqual(['area']);
    expect(t.rows).toHaveLength(39);
    expect(TABLEA1_SECTORS.map((s) => s.token)).toEqual(['industries', 'hotels', 'tertiary_institutions', 'hospitals', 'workers_dormitories', 'construction_sites', 'sports_recreation', 'offices_retail_other']);
    const perSector = TABLEA1_SECTORS.map((s) => t.rows.filter((r) => r.values.sector_token === s.token).length);
    expect(perSector).toEqual([6, 7, 4, 4, 4, 5, 7, 2]);
    for (const s of TABLEA1_SECTORS) expect(t.rows.filter((r) => r.values.sector_token === s.token).map((r) => r.values.letter)).toEqual('abcdefg'.slice(0, perSector[TABLEA1_SECTORS.indexOf(s)]).split('').map((l) => `(${l})`));
    // the merged raw lines: "(f) Toilet (a) Guestroom" (L917) closes Industries and opens Hotels, etc.
    const byKey = (k: string) => t.rows.find((r) => r.row_key === k)!;
    expect(byKey('industries_f')).toMatchObject({ values: { description: 'Toilet', sector: 'Industries' }, verbatim_quote: Q.L917 });
    expect(byKey('hotels_a')).toMatchObject({ values: { description: 'Guestroom', sector: 'Hotels' }, verbatim_quote: Q.L917 });
    expect(collapse(Q.L917)).toBe('(f) Toilet (a) Guestroom');
    expect(byKey('hotels_g')).toMatchObject({ values: { description: 'Swimming pool' }, verbatim_quote: Q.L931 });
    expect(byKey('tertiary_institutions_a')).toMatchObject({ values: { description: 'Cooling tower' }, verbatim_quote: Q.L931 });
    expect(byKey('tertiary_institutions_d')).toMatchObject({ values: { description: 'Swimming pool' }, verbatim_quote: Q.L938 });
    expect(byKey('hospitals_d')).toMatchObject({ values: { description: 'Cold water inlet to hot water supply or boiler' }, verbatim_quote: Q.L946 });
    expect(byKey('workers_dormitories_d')).toMatchObject({ values: { description: 'Washing area' }, verbatim_quote: Q.L952 });
    expect(byKey('construction_sites_a')).toMatchObject({ values: { description: 'Construction activity', sector: 'Construction sites and concrete batching plants' }, verbatim_quote: Q.L952 });
    expect(byKey('sports_recreation_a')).toMatchObject({ values: { description: 'Cooling tower', sector: 'Sports and recreational facilities and tourist attractions' }, verbatim_quote: Q.L976 });
    expect(byKey('offices_retail_other_b')).toMatchObject({ values: { description: 'Toilet', sector: 'Offices or retail buildings, or any other building not mentioned in items 1 to 7', sector_no: '8.' }, verbatim_quote: Q.L988 });
    expect(collapse(Q.L988)).toBe('8. Offices or retail buildings, or any other building (a) Cooling tower not mentioned in items 1 to 7 (b) Toilet'); // the raw line interleaves the two-line sector cell with its areas
    expect(TABLEA1_SECTOR_NAMES.tertiary_institutions).toBe('Tertiary institutions, prisons, or military or defence installations');
    expect(TABLEA1_SECTOR_NAMES.workers_dormitories).toBe("Workers' dormitories");
    expect(t.rows.map((r) => r.group_label)).toEqual(TABLEA1_AREAS.map((a) => TABLEA1_SECTOR_NAMES[a.sector]));
    // every "(x) area" fragment sits on the raw line the row quotes; both pages (L971 "Table A.1 (continued)")
    for (const a of TABLEA1_AREAS) expect(collapse(a.quote), `${a.sector} ${a.letter}`).toContain(`${a.letter} ${a.area}`);
    expect(collapse(Q.L971)).toBe('Table A.1 (continued)');
    expect(Q.L899_988.startsWith(Q.L899)).toBe(true);
    expect(collapse(Q.L899)).toBe('Table A.1 -- Areas in which water use can be monitored');
    // the datalist for significant_uses.activity: 24 distinct printed areas in print order
    expect(TABLEA1_AREA_DATALIST).toHaveLength(24);
    expect(TABLEA1_AREA_DATALIST.slice(0, 7)).toEqual(['Process', 'Cooling tower', 'Boiler', 'Scrubber', 'Cooking area or kitchen', 'Toilet', 'Guestroom']);
    expect(new Set(TABLEA1_AREA_DATALIST).size).toBe(24);
    const lookup = makeTableLookup(STD);
    expect(lookup('TABLEA1', ['hotels_e'])?.description).toBe('Laundry');
    expect(lookup('TABLEA1', ['hotels_h'])).toBeUndefined();
  });

  it('TABLED1: ONE row — Wafer fabrication → Number of units produced (the first cells of both raw column dumps, layout L2238); the 24 sectors and 24 indicator cells of the two column dumps are printed but NOT paired (U-1 … U-23); the select driver offers only the seeded key', () => {
    const t = tableD1AsTable();
    expect(t.key_columns).toEqual(['sector']);
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0]).toMatchObject({ row_key: 'wafer_fabrication', keys: { sector: 'wafer_fabrication' }, values: { sector_label: 'Wafer fabrication', indicator_text: 'Number of units produced' }, verbatim_quote: Q.L1194_1202 });
    expect(TABLED1_ROWS).toHaveLength(1);
    expect(TABLED1_SECTOR_COLUMN).toHaveLength(24);
    expect(TABLED1_INDICATOR_COLUMN).toHaveLength(24);
    expect(collapse(Q.L1194_1200).startsWith('Industry sector Wafer fabrication Semiconductor Electronics')).toBe(true);
    expect(collapse(Q.L1202_1216).startsWith('Business activity indicator(s) Number of units produced Number of units produced Number of units produced Volume or mass of products')).toBe(true);
    expect(collapse(Q.L1194_1200).endsWith('Hotels Prisons')).toBe(true);
    expect(collapse(Q.L1202_1216).endsWith('Number of staff and inmates and visitors (calculate the full-time equivalent for visitors)')).toBe(true);
    // the two column dumps are SEPARATE (the raw file prints all 24 sectors before the first indicator) — nothing but row 1 is a settled pair
    expect(collapse(Q.L1192_1216).indexOf('Prisons')).toBeLessThan(collapse(Q.L1192_1216).indexOf('Number of units produced'));
    for (const s of TABLED1_SECTOR_COLUMN) expect(collapse(Q.L1194_1200), s).toContain(s);
    for (const c of TABLED1_INDICATOR_COLUMN) expect(collapse(Q.L1202_1216), c).toContain(c);
    expect(t.override_quote).toBe(`${Q.L1192} — ${Q.L545_546}`);
    expect(collapse(Q.L1192)).toBe('Table D.1 -- Examples of business activity indicators for industry sectors');
    expect(collapse(Q.L545_546)).toContain('The organization shall identify specific business activity indicator(s) appropriate for monitoring and measuring water efficiency performance.');
    expect(collapse(Q.L545_546)).toContain('Annex D gives examples of business activity indicator(s).');
    const lookup = makeTableLookup(STD);
    expect(lookup('TABLED1', ['wafer_fabrication'])?.indicator_text).toBe('Number of units produced');
    expect(lookup('TABLED1', ['hotels'])).toBeUndefined(); // not seeded (U-23)
  });
});
