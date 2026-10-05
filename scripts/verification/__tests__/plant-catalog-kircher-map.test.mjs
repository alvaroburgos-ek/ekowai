/**
 * Kircher importer — pure mapping. Fixture: SYNTHETIC rows of exactly the sheet's shape (13 cells; Dates for the
 * Excel-converted range codes, emoji light sets, "[Icon]" growth habit, textual heights, comma-separated codes).
 * No book content is committed (review L-3): species names, notes and regions below are invented placeholders.
 */
import { describe, it, expect } from 'vitest';
import {
  recoverRangeCode, parseNameCell, mapLight, mapHeight, mapGrowthHabit, splitCodes, mapPlantGroup, mapDepth, mapRow,
  dedupeRecords, recordToValues, buildSeedSql, KIRCHER_COLUMNS,
} from '../plant-catalog-kircher-map.mjs';

const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
// shape of a sun-only row with a two-part date code and a plain integer height
const ROW_A = ['Testus primus\n\nFirst Test Plant', '🌕', 100, '-', D(2026, 4, 3), '[Icon]', '++', 3, 7, '4a-9b', 'Region A, Region B', 'AAA, BBB, x/y', 'synthetic note one'];
// textual depth code, partial shade
const ROW_B = ['Testus secundus\n\nSecond Test Plant', '🌗 🌕', 30, '-', '(1) 2 3', '[Icon]', '+', 3, 6, '7b-10', 'Region C', 'BBB, c/g', 'synthetic note two'];
// bloom text, a note with an embedded double-quoted phrase and an apostrophe
const ROW_C = ['Testus tertius\n\nThird Test Plant', '🌗 🌕', 90, 'Jun-Aug (White)', D(2026, 4, 3), '[Icon]', '++', 3, 6, '5a-9a', 'Region D, Region E!', 'AAA, c/b', 'looks like "Someone\'s Garden" in bloom'];
// three-part date code (1-2-3), shade, two common names
const ROW_D = ['Testus quartus\n\nFourth Plant, Also Fourth', '🌑 🌗 🌕', 110, 'Apr-Jun (White)', D(2003, 2, 1), '[Icon]', '+', 2, 8, '8a-12', 'Region F', 'BBB, CCC, d, m', 'synthetic note four'];
// height "-", USDA zones as a Date
const ROW_E = ['Testus quintus (sextus)\n\nFifth Test Plant', '🌗 🌕', '-', '-', D(2026, 4, 3), '[Icon]', '+++', 3, 7, D(2026, 11, 6), 'Region G, Region H', 'AAA, BBB, m', 'synthetic note five!'];

describe('recoverRangeCode — Excel date → range code', () => {
  it('two-part codes (current-year dates): 3-4, 1-2, 2-3, 4-5', () => {
    expect(recoverRangeCode(D(2026, 4, 3))).toBe('3-4');
    expect(recoverRangeCode(D(2026, 2, 1))).toBe('1-2');
    expect(recoverRangeCode(D(2026, 3, 2))).toBe('2-3');
    expect(recoverRangeCode(D(2026, 5, 4))).toBe('4-5');
  });
  it('three-part codes (two-digit year dates): 1-2-3, 2-3-4, 3-4-5', () => {
    expect(recoverRangeCode(D(2003, 2, 1))).toBe('1-2-3');
    expect(recoverRangeCode(D(2004, 3, 2))).toBe('2-3-4');
    expect(recoverRangeCode(D(2005, 4, 3))).toBe('3-4-5');
  });
  it('USDA zone dates recover the same way ("6-11"); numbers and strings pass through; empty → null', () => {
    expect(recoverRangeCode(D(2026, 11, 6))).toBe('6-11');
    expect(recoverRangeCode(2)).toBe('2');
    expect(recoverRangeCode(' (1) 2 3 ')).toBe('(1) 2 3');
    expect(recoverRangeCode(null)).toBeNull();
    expect(recoverRangeCode('')).toBeNull();
    expect(recoverRangeCode({ richText: [{ text: '4 ' }, { text: '(5)' }] })).toBe('4 (5)');
  });
});

describe('cell mappers', () => {
  it('splits species and common name on the line break', () => {
    expect(parseNameCell(ROW_A[0])).toEqual({ scientific_name: 'Testus primus', common_name_en: 'First Test Plant' });
    expect(parseNameCell('Only name')).toEqual({ scientific_name: 'Only name', common_name_en: null });
  });
  it('light = darkest tolerated level; foreign text → unknown', () => {
    expect(mapLight('🌕')).toEqual({ light: 'sun', known: true });
    expect(mapLight('🌗 🌕')).toEqual({ light: 'partial', known: true });
    expect(mapLight('🌑 🌗 🌕')).toEqual({ light: 'shade', known: true });
    expect(mapLight('sunny')).toEqual({ light: 'unknown', known: false });
    expect(mapLight(null)).toEqual({ light: 'unknown', known: false });
  });
  it('height: integers only; "-" → null silently; other text → null + raw kept', () => {
    expect(mapHeight(100)).toEqual({ height_cm: 100, raw: null });
    expect(mapHeight('-')).toEqual({ height_cm: null, raw: null });
    expect(mapHeight('120 (180)')).toEqual({ height_cm: null, raw: '120 (180)' });
    expect(mapHeight('~ 5')).toEqual({ height_cm: null, raw: '~ 5' });
  });
  it('growth habit "[Icon]" → null; planting codes split on commas', () => {
    expect(mapGrowthHabit('[Icon]')).toBeNull();
    expect(mapGrowthHabit('creeping')).toBe('creeping');
    expect(splitCodes('AAA, BBB, x/y')).toEqual(['AAA', 'BBB', 'x/y']);
    expect(splitCodes('-')).toEqual([]);
  });
  it('plant_group / depth only via the legend — never guessed', () => {
    expect(mapPlantGroup('3-4', ['AAA'], null)).toEqual({ plant_group: 'other', via: null });
    expect(mapDepth('3-4', null)).toEqual({ depth_min_cm: null, depth_max_cm: null });
    const legend = { depth_zones: { '3-4': { min_cm: 20, max_cm: 60, plant_group: 'marsh_medium_high' } }, planting_codes: { AAA: { plant_group: 'marsh_small' } } };
    expect(mapPlantGroup('3-4', ['AAA'], legend)).toEqual({ plant_group: 'marsh_medium_high', via: 'depth_zone 3-4' });
    expect(mapPlantGroup('1', ['AAA'], legend)).toEqual({ plant_group: 'marsh_small', via: 'planting_code AAA' });
    expect(mapPlantGroup('1', ['BBB'], { depth_zones: { '1': { plant_group: 'not_a_group' } } })).toEqual({ plant_group: 'other', via: null });
    expect(mapDepth('3-4', legend)).toEqual({ depth_min_cm: 20, depth_max_cm: 60 });
  });
});

describe('mapRow — five synthetic rows of the sheet shape', () => {
  it('row A: full record, date code recovered, legend gap reported', () => {
    const { record, unmapped } = mapRow(ROW_A, { rowNumber: 3 });
    expect(record).toMatchObject({
      scientific_name: 'Testus primus', common_name_en: 'First Test Plant', plant_group: 'other', depth_zone_code: '3-4',
      depth_min_cm: null, depth_max_cm: null, light: 'sun', height_cm: 100, bloom: null, hardiness_zones: '4a-9b',
      water_hardness: '3', nitrogen_demand: '7', origin_regions: 'Region A, Region B', planting_codes: ['AAA', 'BBB', 'x/y'],
      aggressive_rhizome: false, aggressive_source: null, common_name_de: null,
    });
    expect(record.notes).toBe('synthetic note one · Koexistenz (Buch): ++');
    expect(unmapped).toEqual([{ row: 3, column: 'depth_zone', raw: '3-4', reason: 'legend missing — depth_min/max null, plant_group other' }]);
  });
  it('row B: textual depth code kept verbatim, partial shade', () => {
    const { record } = mapRow(ROW_B, { rowNumber: 5 });
    expect(record).toMatchObject({ depth_zone_code: '(1) 2 3', light: 'partial', height_cm: 30, planting_codes: ['BBB', 'c/g'] });
  });
  it('row C: bloom text kept; row D: three-part code 1-2-3, shade, both common names joined', () => {
    expect(mapRow(ROW_C, { rowNumber: 9 }).record).toMatchObject({ bloom: 'Jun-Aug (White)', depth_zone_code: '3-4', light: 'partial' });
    expect(mapRow(ROW_D, { rowNumber: 212 }).record).toMatchObject({
      scientific_name: 'Testus quartus', common_name_en: 'Fourth Plant, Also Fourth', depth_zone_code: '1-2-3', light: 'shade', water_hardness: '2', nitrogen_demand: '8',
    });
  });
  it('row E: "-" height → null without an unmapped entry; USDA date → "6-11"', () => {
    const { record, unmapped } = mapRow(ROW_E, { rowNumber: 214 });
    expect(record).toMatchObject({ height_cm: null, hardiness_zones: '6-11', bloom: null, planting_codes: ['AAA', 'BBB', 'm'] });
    expect(record.notes).toContain('synthetic note five!');
    expect(record.notes).toContain('Koexistenz (Buch): +++');
    expect(unmapped.map((u) => u.column)).toEqual(['depth_zone']);
  });
  it('a non-integer height is kept in notes and reported', () => {
    const { record, unmapped } = mapRow([...ROW_A.slice(0, 2), '120 (180)', ...ROW_A.slice(3)], { rowNumber: 99 });
    expect(record.height_cm).toBeNull();
    expect(record.notes).toContain('Höhe (Buch): 120 (180)');
    expect(unmapped.some((u) => u.column === 'height_cm')).toBe(true);
  });
  it('a row without a species name yields no record', () => {
    expect(mapRow([null, '🌕', 10], { rowNumber: 7 }).record).toBeNull();
  });
});

describe('dedupe + SQL emission', () => {
  it('identical duplicates collapse, differing duplicates keep the first and are listed', () => {
    const a = mapRow(ROW_A, { rowNumber: 3 }).record;
    const b = mapRow(ROW_A, { rowNumber: 50 }).record;
    const c = { ...mapRow(ROW_A, { rowNumber: 70 }).record, height_cm: 80 };
    const r = dedupeRecords([{ record: a, rowNumber: 3 }, { record: b, rowNumber: 50 }, { record: c, rowNumber: 70 }]);
    expect(r.unique).toHaveLength(1);
    expect(r.identical).toEqual([{ name: 'Testus primus', rows: [3, 50] }]);
    expect(r.conflicts).toEqual([{ name: 'Testus primus', kept: 3, dropped: 70 }]);
  });
  it('VALUES tuple: pending licence, reference_book, aggressive false, quotes escaped, array literal', () => {
    const rec = mapRow(ROW_C, { rowNumber: 9 }).record;
    const v = recordToValues(rec, 'Kircher, <BOOK TITLE — owner input>, <EDITION — owner input>');
    expect(v.startsWith("('Testus tertius', 'Third Test Plant', 'other', '3-4', NULL, NULL, 'partial', 90, 'Jun-Aug (White)', '5a-9a', '3', '6',")).toBe(true);
    expect(v).toContain("ARRAY['AAA', 'c/b']::text[]");
    expect(v).toContain('"Someone\'\'s Garden"');
    expect(v.endsWith("false, NULL, 'reference_book', 'Kircher, <BOOK TITLE — owner input>, <EDITION — owner input>', 'pending')")).toBe(true);
    expect(v.split(', ').length).toBeGreaterThanOrEqual(KIRCHER_COLUMNS.length);
  });
  it('the staged block carries the licence gate and an ON CONFLICT upsert', () => {
    const sql = buildSeedSql([mapRow(ROW_A, {}).record], { sourceRef: 'Kircher, T, E', generatedAt: 'now', xlsxName: 'x.xlsx', legendUsed: false });
    expect(sql).toContain("INSERT INTO plant_catalog (" + KIRCHER_COLUMNS.join(', ') + ")");
    expect(sql).toContain('LICENCE GATE');
    expect(sql).toContain('ON CONFLICT (scientific_name, source_kind) DO UPDATE');
    expect(sql).not.toContain('licence_status = EXCLUDED.licence_status'); // a re-run never un-clears or clears a licence
  });
});
