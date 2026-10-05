/**
 * Plant reference catalogue · Kircher importer — the PURE mapping (no I/O, no exceljs).
 * Consumed by import-plant-catalog-kircher.mjs (CLI) and tested in
 * __tests__/plant-catalog-kircher-map.test.mjs with a fixture typed from the xlsx.
 *
 * Source sheet ("Kircher Plant List.xlsx", Sheet1): header row 2, data from row 3, 13 columns:
 *   1 species/cultivar + common name in ONE cell separated by line breaks
 *   2 sun/shade tolerance as emoji 🌕 (sun) 🌗 (partial shade) 🌑 (shade)
 *   3 mean maximum height cm        4 blooming month & colour          5 depth zone code
 *   6 growth habit ("[Icon]" only — the icon did not survive the export → null)
 *   7 estimated level of coexistence (no catalogue column → kept in notes)
 *   8 water hardness (terrestrials: pH)   9 demands in nitrogen   10 proposed USDA hardiness zones
 *  11 natural distribution              12 planting area / plant type / themes (comma-separated codes)
 *  13 description / notes
 *
 * Excel turned range codes like "3-4" into DATES ("3-4" → 3 April of the current year; "1-2-3" → 1 Feb 2003).
 * `recoverRangeCode` reverses that from day / month (/ year) — in columns 5, 8, 9 and 10 alike.
 *
 * Never-invent rules: depth_min / depth_max stay null (the book's zone legend is an owner input — pass it as
 * `legend.depth_zones`); plant_group is 'other' unless the legend maps the row's exact depth code or planting code;
 * a non-numeric height is NOT parsed into a number (kept verbatim in notes and listed as unmapped);
 * licence_status is always 'pending' and source_ref carries the owner's placeholders until filled.
 */

export const LIGHT = Object.freeze({ SUN: '🌕', PARTIAL: '🌗', SHADE: '🌑' });
export const PLANT_GROUPS = Object.freeze(['submerged', 'floating_leaved', 'marsh_small', 'marsh_medium_high', 'bank_terrestrial', 'other']);
export const COLUMN_NAMES = Object.freeze([
  'species_common', 'light', 'height_cm', 'bloom', 'depth_zone', 'growth_habit', 'coexistence',
  'water_hardness', 'nitrogen', 'usda_zones', 'distribution', 'planting_codes', 'notes',
]);

/**
 * Reverse Excel's date auto-conversion of a range code. A Date whose year is ≥ 2020 came from a two-part code
 * "d-m" (Excel assumed the current year); a Date in 2000–2019 came from a three-part code "d-m-y" (two-digit year).
 * Numbers become their decimal string, strings are trimmed, null/undefined stay null.
 */
export function recoverRangeCode(v) {
  if (v == null) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    const d = v.getUTCDate(), m = v.getUTCMonth() + 1, y = v.getUTCFullYear();
    return y >= 2020 ? `${d}-${m}` : `${d}-${m}-${y - 2000}`;
  }
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null;
  if (typeof v === 'object' && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim() || null;
  if (typeof v === 'object' && 'result' in v) return recoverRangeCode(v.result);
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** "Acorus calamus\n\nSweet Flag" → { scientific_name: 'Acorus calamus', common_name_en: 'Sweet Flag' }. */
export function parseNameCell(v) {
  const s = recoverRangeCode(v);
  if (!s) return { scientific_name: null, common_name_en: null };
  const parts = s.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  return { scientific_name: parts[0] ?? null, common_name_en: parts.length > 1 ? parts.slice(1).join(' / ') : null };
}

/**
 * The darkest light level the book marks as tolerated: 🌑 ⇒ 'shade', else 🌗 ⇒ 'partial', else 🌕 ⇒ 'sun'.
 * Every observed cell is a contiguous set that includes 🌕, so this single value is lossless for the filter
 * "tolerates at least this much shade". Anything else ⇒ 'unknown' (reported as unmapped by the caller).
 */
export function mapLight(v) {
  const s = recoverRangeCode(v);
  if (!s) return { light: 'unknown', known: false };
  const tokens = s.split(/\s+/).filter(Boolean);
  const allowed = new Set(Object.values(LIGHT));
  if (!tokens.every((t) => allowed.has(t))) return { light: 'unknown', known: false };
  if (tokens.includes(LIGHT.SHADE)) return { light: 'shade', known: true };
  if (tokens.includes(LIGHT.PARTIAL)) return { light: 'partial', known: true };
  if (tokens.includes(LIGHT.SUN)) return { light: 'sun', known: true };
  return { light: 'unknown', known: false };
}

/** Integer heights only; "-", "~ 5", "120 (180)", "10 (>60cm: ?)" are NOT numbers → null + the raw text for notes. */
export function mapHeight(v) {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return { height_cm: v, raw: null };
  const s = recoverRangeCode(v);
  if (!s || s === '-') return { height_cm: null, raw: null };
  if (/^\d+$/.test(s)) return { height_cm: Number(s), raw: null };
  return { height_cm: null, raw: s };
}

/** The export lost the icon: "[Icon]" (or empty) ⇒ null; any other text is kept verbatim. */
export function mapGrowthHabit(v) {
  const s = recoverRangeCode(v);
  if (!s || /^\[icon\]$/i.test(s)) return null;
  return s;
}

/** "HBS, TWL, m/c" → ['HBS', 'TWL', 'm/c']; "-" / empty → []. */
export function splitCodes(v) {
  const s = recoverRangeCode(v);
  if (!s || s === '-') return [];
  return s.split(',').map((t) => t.trim()).filter(Boolean);
}

/**
 * plant_group from the row ITSELF, never guessed: only an owner-supplied legend maps a depth code or a planting
 * code to a group. Without a legend entry the group is 'other'. `legend` shape (owner input, JSON):
 *   { depth_zones: { "<code>": { min_cm, max_cm, plant_group? } }, planting_codes: { "<code>": { plant_group?, label? } } }
 */
export function mapPlantGroup(depthCode, plantingCodes, legend) {
  const z = legend?.depth_zones?.[depthCode ?? ''];
  if (z?.plant_group && PLANT_GROUPS.includes(z.plant_group)) return { plant_group: z.plant_group, via: `depth_zone ${depthCode}` };
  for (const c of plantingCodes ?? []) {
    const p = legend?.planting_codes?.[c];
    if (p?.plant_group && PLANT_GROUPS.includes(p.plant_group)) return { plant_group: p.plant_group, via: `planting_code ${c}` };
  }
  return { plant_group: 'other', via: null };
}

/** depth_min/max only from the legend's exact code entry; otherwise null. */
export function mapDepth(depthCode, legend) {
  const z = legend?.depth_zones?.[depthCode ?? ''];
  const ok = (n) => typeof n === 'number' && Number.isFinite(n);
  if (z && ok(z.min_cm) && ok(z.max_cm) && z.min_cm <= z.max_cm) return { depth_min_cm: z.min_cm, depth_max_cm: z.max_cm };
  return { depth_min_cm: null, depth_max_cm: null };
}

/**
 * One sheet row (array of 13 raw cell values, index 0 = column 1) → catalogue record + the cells that could not be
 * mapped losslessly (`unmapped`: [{ column, raw, reason }]). `rowNumber` is only carried into the report.
 */
export function mapRow(cells, { legend = null, rowNumber = null } = {}) {
  const unmapped = [];
  const note = (column, raw, reason) => unmapped.push({ row: rowNumber, column, raw: String(raw), reason });
  const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13] = cells;
  const name = parseNameCell(c1);
  if (!name.scientific_name) return { record: null, unmapped: [{ row: rowNumber, column: 'species_common', raw: String(c1 ?? ''), reason: 'no species name' }] };
  const light = mapLight(c2);
  if (!light.known && c2 != null) note('light', c2, 'not one of 🌕 / 🌗 / 🌑 sets');
  const height = mapHeight(c3);
  if (height.raw) note('height_cm', c3, 'not an integer — kept in notes');
  const depthCode = recoverRangeCode(c5);
  const growth = mapGrowthHabit(c6);
  const coexistence = recoverRangeCode(c7);
  const plantingCodes = splitCodes(c12);
  const group = mapPlantGroup(depthCode, plantingCodes, legend);
  const depth = mapDepth(depthCode, legend);
  if (depthCode && !legend?.depth_zones?.[depthCode]) note('depth_zone', depthCode, 'legend missing — depth_min/max null, plant_group other');
  const extras = [];
  if (height.raw) extras.push(`Höhe (Buch): ${height.raw}`);
  if (growth) extras.push(`Wuchsform (Buch): ${growth}`);
  if (coexistence) extras.push(`Koexistenz (Buch): ${coexistence}`);
  const bookNotes = recoverRangeCode(c13);
  const notes = [bookNotes, ...extras].filter(Boolean).join(' · ') || null;
  const record = {
    scientific_name: name.scientific_name,
    common_name_de: null,
    common_name_en: name.common_name_en,
    plant_group: group.plant_group,
    plant_group_via: group.via,
    depth_zone_code: depthCode,
    depth_min_cm: depth.depth_min_cm,
    depth_max_cm: depth.depth_max_cm,
    light: light.light,
    height_cm: height.height_cm,
    bloom: recoverRangeCode(c4) === '-' ? null : recoverRangeCode(c4),
    hardiness_zones: recoverRangeCode(c10),
    water_hardness: recoverRangeCode(c8),
    nitrogen_demand: recoverRangeCode(c9),
    origin_regions: recoverRangeCode(c11),
    planting_codes: plantingCodes,
    notes,
    aggressive_rhizome: false,
    aggressive_source: null,
  };
  return { record, unmapped };
}

const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const n = (v) => (v == null ? 'NULL' : String(v));
const arr = (a) => (!a || a.length === 0 ? 'NULL' : `ARRAY[${a.map(q).join(', ')}]::text[]`);

export const KIRCHER_COLUMNS = Object.freeze([
  'scientific_name', 'common_name_en', 'plant_group', 'depth_zone_code', 'depth_min_cm', 'depth_max_cm', 'light', 'height_cm',
  'bloom', 'hardiness_zones', 'water_hardness', 'nitrogen_demand', 'origin_regions', 'planting_codes', 'notes',
  'aggressive_rhizome', 'aggressive_source', 'source_kind', 'source_ref', 'licence_status',
]);

/** One VALUES tuple for the staged block (source_kind reference_book, licence_status pending — always). */
export function recordToValues(r, sourceRef) {
  return `(${[
    q(r.scientific_name), q(r.common_name_en), q(r.plant_group), q(r.depth_zone_code), n(r.depth_min_cm), n(r.depth_max_cm), q(r.light),
    n(r.height_cm), q(r.bloom), q(r.hardiness_zones), q(r.water_hardness), q(r.nitrogen_demand), q(r.origin_regions), arr(r.planting_codes),
    q(r.notes), 'false', 'NULL', q('reference_book'), q(sourceRef), q('pending'),
  ].join(', ')})`;
}

/**
 * Duplicate handling: the sheet repeats some species cells. Identical records collapse (counted); records that share
 * the scientific name but differ elsewhere keep the FIRST occurrence and are listed as conflicts (never merged).
 */
export function dedupeRecords(items) {
  const byName = new Map();
  const identical = [], conflicts = [];
  for (const it of items) {
    const key = it.record.scientific_name;
    const prev = byName.get(key);
    if (!prev) { byName.set(key, it); continue; }
    const a = JSON.stringify({ ...prev.record, plant_group_via: null }), b = JSON.stringify({ ...it.record, plant_group_via: null });
    if (a === b) identical.push({ name: key, rows: [prev.rowNumber, it.rowNumber] });
    else conflicts.push({ name: key, kept: prev.rowNumber, dropped: it.rowNumber });
  }
  return { unique: [...byName.values()], identical, conflicts };
}

export function histogram(values) {
  const m = new Map();
  for (const v of values) { const k = v == null ? '(empty)' : String(v); m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** The staged SQL block (outside git). */
export function buildSeedSql(records, { sourceRef, generatedAt, xlsxName, legendUsed }) {
  const head = `-- Plant reference catalogue · KIRCHER seed (reference_book, licence_status 'pending') — generated ${generatedAt}
-- Generator: scripts/verification/import-plant-catalog-kircher.mjs over "${xlsxName}" (header row 2, data from row 3).
-- source_ref = "${sourceRef}" — the owner fills the <…> placeholders (book title, edition) before this block is applied.
-- Legend used: ${legendUsed ? 'YES (depth zones / planting codes from the owner legend)' : 'NO — depth_min/max NULL, plant_group other for every row'}.
-- LICENCE GATE: rows stay invisible to the API (licence_status 'pending') until the owner changes them to 'cleared' AFTER the reuse
-- of the book data is licence-cleared. This file lives OUTSIDE the repo and is NOT committed. Nothing here changes a gate or an FLL value.
-- Rows: ${records.length}. Idempotent (ON CONFLICT (scientific_name, source_kind) DO UPDATE).
-- ORDER: apply AFTER supabase/migrations/20261005180000_plant_catalog.sql. Apply (owner, after licence): node scripts/apply-migration.mjs <this file>
-- Rollback: DELETE FROM plant_catalog WHERE source_kind = 'reference_book' AND source_ref = ${q(sourceRef)};
BEGIN;
INSERT INTO plant_catalog (${KIRCHER_COLUMNS.join(', ')}) VALUES
`;
  const body = records.map((r) => '  ' + recordToValues(r, sourceRef)).join(',\n');
  const tail = `
ON CONFLICT (scientific_name, source_kind) DO UPDATE SET
  common_name_en = EXCLUDED.common_name_en, plant_group = EXCLUDED.plant_group, depth_zone_code = EXCLUDED.depth_zone_code,
  depth_min_cm = EXCLUDED.depth_min_cm, depth_max_cm = EXCLUDED.depth_max_cm, light = EXCLUDED.light, height_cm = EXCLUDED.height_cm,
  bloom = EXCLUDED.bloom, hardiness_zones = EXCLUDED.hardiness_zones, water_hardness = EXCLUDED.water_hardness,
  nitrogen_demand = EXCLUDED.nitrogen_demand, origin_regions = EXCLUDED.origin_regions, planting_codes = EXCLUDED.planting_codes,
  notes = EXCLUDED.notes, source_ref = EXCLUDED.source_ref;
COMMIT;
`;
  return head + body + tail;
}
