/**
 * Kircher importer — pure mapping. Fixture: five rows typed from "Kircher Plant List.xlsx" (sheet rows 3, 5, 9, 212, 214)
 * exactly as exceljs returns them (Dates for the Excel-converted range codes, strings otherwise).
 */
import { describe, it, expect } from 'vitest';
import {
  recoverRangeCode, parseNameCell, mapLight, mapHeight, mapGrowthHabit, splitCodes, mapPlantGroup, mapDepth, mapRow,
  dedupeRecords, recordToValues, buildSeedSql, KIRCHER_COLUMNS,
} from '../plant-catalog-kircher-map.mjs';

const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
// row 3
const ACORUS = ['Acorus calamus\n\nSweet Flag', '🌕', 100, '-', D(2026, 4, 3), '[Icon]', '++', 3, 7, '4a-9b', 'E-As, Eu, N-Am', 'HBS, TWL, m/c', 'inconspicuous flower heads, medicinal plant, but poisonous if ingested in quantity'];
// row 5
const ACORUS_GRAM = ['Acorus gramineus\n\nJapanese Sweet Flag', '🌗 🌕', 30, '-', '(1) 2 3', '[Icon]', '+', 3, 6, '7b-10', 'E-As', 'TWL, c/g', 'evergreen leaves, inconspicuous flowers, good ground cover'];
// row 9
const ALISMA = ['Alisma lanceolatum\n\nLanceleaf Water Plantain', '🌗 🌕', 90, 'Jun-Aug (White)', D(2026, 4, 3), '[Icon]', '++', 3, 6, '5a-9a', 'Eur to C-As, N-Af, N-Am!, NZ!, Au!', 'HBS, c/b', 'inflorescences appear like "Baby\'s Breath" on most healthy Alisma, narrow leaves'];
// row 212
const ZANTEDESCHIA = ['Zantedeschia aethiopica\n\nCalla Lily, Arum Lily', '🌑 🌗 🌕', 110, 'Apr-Jun (White)', D(2003, 2, 1), '[Icon]', '+', 2, 8, '8a-12', 'S-Af', 'TWL, Tailford, d, m', 'evergreen if kept moist and warm, leaves die back in cold temperatures and drought'];
// row 214 — height "-", USDA zones as a Date
const ZIZANIA = ['Zizania latifolia (caduciflora)\n\nManchurian Wild Rice', '🌗 🌕', '-', '-', D(2026, 4, 3), '[Icon]', '+++', 3, 7, D(2026, 11, 6), 'As, USA', 'HBS, TWL, m', 'very rampant grower, used as vegetable in Asia. Import into the USA prohibited!'];

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
    expect(parseNameCell(ACORUS[0])).toEqual({ scientific_name: 'Acorus calamus', common_name_en: 'Sweet Flag' });
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
    expect(splitCodes('HBS, TWL, m/c')).toEqual(['HBS', 'TWL', 'm/c']);
    expect(splitCodes('-')).toEqual([]);
  });
  it('plant_group / depth only via the legend — never guessed', () => {
    expect(mapPlantGroup('3-4', ['HBS'], null)).toEqual({ plant_group: 'other', via: null });
    expect(mapDepth('3-4', null)).toEqual({ depth_min_cm: null, depth_max_cm: null });
    const legend = { depth_zones: { '3-4': { min_cm: 20, max_cm: 60, plant_group: 'marsh_medium_high' } }, planting_codes: { HBS: { plant_group: 'marsh_small' } } };
    expect(mapPlantGroup('3-4', ['HBS'], legend)).toEqual({ plant_group: 'marsh_medium_high', via: 'depth_zone 3-4' });
    expect(mapPlantGroup('1', ['HBS'], legend)).toEqual({ plant_group: 'marsh_small', via: 'planting_code HBS' });
    expect(mapPlantGroup('1', ['TWL'], { depth_zones: { '1': { plant_group: 'not_a_group' } } })).toEqual({ plant_group: 'other', via: null });
    expect(mapDepth('3-4', legend)).toEqual({ depth_min_cm: 20, depth_max_cm: 60 });
  });
});

describe('mapRow — five rows typed from the xlsx', () => {
  it('row 3 Acorus calamus: full record, date code recovered, legend gap reported', () => {
    const { record, unmapped } = mapRow(ACORUS, { rowNumber: 3 });
    expect(record).toMatchObject({
      scientific_name: 'Acorus calamus', common_name_en: 'Sweet Flag', plant_group: 'other', depth_zone_code: '3-4',
      depth_min_cm: null, depth_max_cm: null, light: 'sun', height_cm: 100, bloom: null, hardiness_zones: '4a-9b',
      water_hardness: '3', nitrogen_demand: '7', origin_regions: 'E-As, Eu, N-Am', planting_codes: ['HBS', 'TWL', 'm/c'],
      aggressive_rhizome: false, aggressive_source: null, common_name_de: null,
    });
    expect(record.notes).toBe('inconspicuous flower heads, medicinal plant, but poisonous if ingested in quantity · Koexistenz (Buch): ++');
    expect(unmapped).toEqual([{ row: 3, column: 'depth_zone', raw: '3-4', reason: 'legend missing — depth_min/max null, plant_group other' }]);
  });
  it('row 5 Acorus gramineus: textual depth code kept verbatim, partial shade', () => {
    const { record } = mapRow(ACORUS_GRAM, { rowNumber: 5 });
    expect(record).toMatchObject({ depth_zone_code: '(1) 2 3', light: 'partial', height_cm: 30, planting_codes: ['TWL', 'c/g'] });
  });
  it('row 9 Alisma: bloom text kept; row 212 Zantedeschia: three-part code 1-2-3, shade', () => {
    expect(mapRow(ALISMA, { rowNumber: 9 }).record).toMatchObject({ bloom: 'Jun-Aug (White)', depth_zone_code: '3-4', light: 'partial' });
    expect(mapRow(ZANTEDESCHIA, { rowNumber: 212 }).record).toMatchObject({
      scientific_name: 'Zantedeschia aethiopica', common_name_en: 'Calla Lily, Arum Lily', depth_zone_code: '1-2-3', light: 'shade', water_hardness: '2', nitrogen_demand: '8',
    });
  });
  it('row 214 Zizania: "-" height → null without an unmapped entry; USDA date → "6-11"', () => {
    const { record, unmapped } = mapRow(ZIZANIA, { rowNumber: 214 });
    expect(record).toMatchObject({ height_cm: null, hardiness_zones: '6-11', bloom: null, planting_codes: ['HBS', 'TWL', 'm'] });
    expect(record.notes).toContain('Import into the USA prohibited!');
    expect(record.notes).toContain('Koexistenz (Buch): +++');
    expect(unmapped.map((u) => u.column)).toEqual(['depth_zone']);
  });
  it('a non-integer height is kept in notes and reported', () => {
    const { record, unmapped } = mapRow([...ACORUS.slice(0, 2), '120 (180)', ...ACORUS.slice(3)], { rowNumber: 99 });
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
    const a = mapRow(ACORUS, { rowNumber: 3 }).record;
    const b = mapRow(ACORUS, { rowNumber: 50 }).record;
    const c = { ...mapRow(ACORUS, { rowNumber: 70 }).record, height_cm: 80 };
    const r = dedupeRecords([{ record: a, rowNumber: 3 }, { record: b, rowNumber: 50 }, { record: c, rowNumber: 70 }]);
    expect(r.unique).toHaveLength(1);
    expect(r.identical).toEqual([{ name: 'Acorus calamus', rows: [3, 50] }]);
    expect(r.conflicts).toEqual([{ name: 'Acorus calamus', kept: 3, dropped: 70 }]);
  });
  it('VALUES tuple: pending licence, reference_book, aggressive false, quotes escaped, array literal', () => {
    const rec = mapRow(ALISMA, { rowNumber: 9 }).record;
    const v = recordToValues(rec, 'Kircher, <BOOK TITLE — owner input>, <EDITION — owner input>');
    expect(v.startsWith("('Alisma lanceolatum', 'Lanceleaf Water Plantain', 'other', '3-4', NULL, NULL, 'partial', 90, 'Jun-Aug (White)', '5a-9a', '3', '6',")).toBe(true);
    expect(v).toContain("ARRAY['HBS', 'c/b']::text[]");
    expect(v).toContain('"Baby\'\'s Breath"');
    expect(v.endsWith("false, NULL, 'reference_book', 'Kircher, <BOOK TITLE — owner input>, <EDITION — owner input>', 'pending')")).toBe(true);
    expect(v.split(', ').length).toBeGreaterThanOrEqual(KIRCHER_COLUMNS.length);
  });
  it('the staged block carries the licence gate and an ON CONFLICT upsert', () => {
    const sql = buildSeedSql([mapRow(ACORUS, {}).record], { sourceRef: 'Kircher, T, E', generatedAt: 'now', xlsxName: 'x.xlsx', legendUsed: false });
    expect(sql).toContain("INSERT INTO plant_catalog (" + KIRCHER_COLUMNS.join(', ') + ")");
    expect(sql).toContain('LICENCE GATE');
    expect(sql).toContain('ON CONFLICT (scientific_name, source_kind) DO UPDATE');
    expect(sql).not.toContain('licence_status = EXCLUDED.licence_status'); // a re-run never un-clears or clears a licence
  });
});
