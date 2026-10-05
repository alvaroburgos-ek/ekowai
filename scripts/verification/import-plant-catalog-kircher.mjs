#!/usr/bin/env node
/**
 * Plant reference catalogue · Kircher importer (CLI).
 *
 * Reads "Kircher Plant List.xlsx" with exceljs and writes a STAGED SQL block + an import report OUTSIDE the repo
 * (default: the vault folder …/fll-wizard-test/_parts/plant-catalog/). The book's rows are NOT committed to git and
 * NOT applied here; licence_status is always 'pending' until the owner clears the licence.
 *
 * Usage (from the repo root):
 *   node scripts/verification/import-plant-catalog-kircher.mjs [--xlsx <path>] [--out <dir>] [--legend <json>]
 *                                                              [--title "<book title>"] [--edition "<edition>"]
 * The pure mapping lives in plant-catalog-kircher-map.mjs (tested). This file only does I/O.
 */
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  COLUMN_NAMES, buildSeedSql, dedupeRecords, histogram, mapRow,
} from './plant-catalog-kircher-map.mjs';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const xlsxPath = opt('--xlsx', 'C:/Users/Ekowai/Desktop/FLL Guidelines PDF/Kircher Plant List.xlsx');
const outDir = opt('--out', 'C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/fll-wizard-test/_parts/plant-catalog');
const legendPath = opt('--legend', null);
const title = opt('--title', '<BOOK TITLE — owner input>');
const edition = opt('--edition', '<EDITION — owner input>');
const sourceRef = `Kircher, ${title}, ${edition}`;

if (path.resolve(outDir).toLowerCase().startsWith(path.resolve(process.cwd()).toLowerCase())) {
  console.error(`refusing to write the book data inside the repo (${outDir}) — the Kircher rows stay outside git`);
  process.exit(2);
}
const legend = legendPath ? JSON.parse(fs.readFileSync(legendPath, 'utf8')) : null;

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(xlsxPath);
const ws = wb.worksheets[0];
const header = [];
for (let c = 1; c <= 13; c++) header.push(ws.getRow(2).getCell(c).value);

const items = [], unmapped = [], skipped = [];
let scanned = 0;
for (let r = 3; r <= ws.rowCount; r++) {
  const row = ws.getRow(r);
  const cells = [];
  let any = false;
  for (let c = 1; c <= 13; c++) { const v = row.getCell(c).value; cells.push(v); if (v != null) any = true; }
  if (!any) continue;
  scanned++;
  const { record, unmapped: u } = mapRow(cells, { legend, rowNumber: r });
  unmapped.push(...u);
  if (!record) { skipped.push(r); continue; }
  items.push({ record, rowNumber: r });
}
const { unique, identical, conflicts } = dedupeRecords(items);
const records = unique.map((it) => it.record);

fs.mkdirSync(outDir, { recursive: true });
const generatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
const sql = buildSeedSql(records, { sourceRef, generatedAt, xlsxName: path.basename(xlsxPath), legendUsed: !!legend });
fs.writeFileSync(path.join(outDir, 'kircher-seed.sql'), sql, 'utf8');

const count = (key) => histogram(records.map((r) => r[key]));
const fmtHist = (h) => h.map(([k, v]) => `| \`${k}\` | ${v} |`).join('\n');
const byReason = histogram(unmapped.map((u) => `${u.column}: ${u.reason}`));
const report = `# Kircher import report — ${generatedAt}

Generator: \`scripts/verification/import-plant-catalog-kircher.mjs\` · source: \`${path.basename(xlsxPath)}\` (sheet "${ws.name}", header row 2, data from row 3)
Output: \`kircher-seed.sql\` (STAGED, outside git, licence_status \`pending\`, source_ref "${sourceRef}") · legend: ${legend ? `\`${path.basename(legendPath)}\`` : 'none (owner input pending)'}

## Row counts

| metric | value |
|---|---|
| sheet rowCount (exceljs, incl. trailing formatted rows) | ${ws.rowCount} |
| data rows with any value (row ≥ 3) | ${scanned} |
| rows without a species name (skipped) | ${skipped.length}${skipped.length ? ` — rows ${skipped.join(', ')}` : ''} |
| identical duplicate rows collapsed | ${identical.length} |
| same species, differing cells (first kept, later dropped) | ${conflicts.length} |
| **records in kircher-seed.sql** | **${records.length}** |

Header row as read: ${header.map((h) => `"${String(h ?? '').replace(/\s+/g, ' ')}"`).join(' · ')}
Column mapping: ${COLUMN_NAMES.map((c, i) => `${i + 1}→${c}`).join(', ')}

## Depth-zone code histogram (column 5, after date→code recovery)

| code | rows |
|---|---|
${fmtHist(count('depth_zone_code'))}

depth_min_cm / depth_max_cm: ${legend ? 'from the legend where the code is listed' : 'NULL for every row (legend missing)'} · plant_group: ${fmtHist(count('plant_group')).replace(/\n/g, ' ')}

## Light (column 2 → darkest tolerated level)

| light | rows |
|---|---|
${fmtHist(count('light'))}

## Planting codes (column 12, split on commas) — legend is an owner input

| code | rows |
|---|---|
${fmtHist(histogram(records.flatMap((r) => r.planting_codes)))}

## Unmapped / lossy cells (${unmapped.length})

| column: reason | cells |
|---|---|
${fmtHist(byReason)}

${unmapped.filter((u) => u.column === 'height_cm' || u.column === 'light').map((u) => `- row ${u.row} · ${u.column} · \`${u.raw}\` — ${u.reason}`).join('\n') || '- (none besides depth-zone legend gaps)'}

## Duplicates

${identical.length ? identical.map((d) => `- identical: ${d.name} (rows ${d.rows.join(', ')})`).join('\n') : '- no identical duplicates'}
${conflicts.length ? conflicts.map((d) => `- CONFLICT (first kept): ${d.name} — kept row ${d.kept}, dropped row ${d.dropped}`).join('\n') : '- no conflicting duplicates'}

## Owner inputs still needed

1. Book title + edition for source_ref (currently "${sourceRef}").
2. Depth-zone legend (code → min/max cm and, where the book says so, the plant group) → re-run with \`--legend <json>\`.
3. Growth-habit legend (the "[Icon]" column lost its icons in the export — no value recoverable from the sheet).
4. Planting-code legend (${histogram(records.flatMap((r) => r.planting_codes)).length} distinct codes).
5. Licence answer — until then every row stays \`pending\` and invisible to the API.
`;
fs.writeFileSync(path.join(outDir, 'kircher-import-report.md'), report, 'utf8');
console.log(`rows scanned ${scanned} · records ${records.length} · identical dupes ${identical.length} · conflicts ${conflicts.length} · unmapped cells ${unmapped.length}`);
console.log(`wrote ${path.join(outDir, 'kircher-seed.sql')} and kircher-import-report.md`);
