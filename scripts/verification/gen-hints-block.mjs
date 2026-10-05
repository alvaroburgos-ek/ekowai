#!/usr/bin/env node
// Generates a STAGED hint block for one standard from the authored hint JSON files (never applies anything).
// Usage: node scripts/verification/gen-hints-block.mjs <STANDARD_CODE> <block_ts> <slug> <inventory.json> <hints.json> [more hints.json …]
//   e.g. gen-hints-block.mjs FLL-GAR-2023 20261005170000 fll_gar inventory-FLL-GAR-2023.json hints-gar-1.json hints-gar-2.json
// Writes: scripts/migrations/<block_ts>_<slug>_hints.sql (+ rollback-… restoring the inventory's descriptions)
//         and scripts/verification/apply/readback-<slug>-hints-<yyyymmdd>.sql
// Hint JSON shape (per worksheet code): { fields: { <symbol>: { de, en, source } }, equations: { <no>: { … } }, gates: { <code>: { … } } }.
// Stored hint format: "<German>\n[EN] <English>" (src/lib/eval/hint-text.ts renders the page locale).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [std, ts, slug, invPath, ...hintPaths] = process.argv.slice(2);
if (!std || !ts || !slug || !invPath || hintPaths.length === 0) {
  console.error('usage: gen-hints-block.mjs <STANDARD_CODE> <block_ts> <slug> <inventory.json> <hints.json...>');
  process.exit(1);
}
const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
const hints = {};
for (const p of hintPaths) {
  const h = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const [ws, v] of Object.entries(h)) {
    hints[ws] ??= { fields: {}, equations: {}, gates: {} };
    Object.assign(hints[ws].fields, v.fields ?? {});
    Object.assign(hints[ws].equations, v.equations ?? {});
    Object.assign(hints[ws].gates, v.gates ?? {});
  }
}
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const compose = (de, en) => {
  const d = (de ?? '').trim(), e = (en ?? '').trim();
  if (!d && !e) return null;
  if (!e) return d;
  if (!d) return '[EN] ' + e;
  return `${d}\n[EN] ${e}`;
};
const where = (ws) => `FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE x.worksheet_template_id = w.id AND s.code = ${q(std)} AND w.code = ${q(ws)}`;
const up = [], down = [];
const stats = { fields: 0, equations: 0, gates: 0, missingFields: [], missingEquations: [], missingGates: [], tooLong: [], unknownKeys: [] };
for (const [ws, w] of Object.entries(inv)) {
  const h = hints[ws];
  for (const f of w.fields) {
    const hf = h?.fields?.[f.symbol];
    if (!hf || (!hf.de && !hf.en)) { stats.missingFields.push(`${ws}.${f.symbol}`); continue; }
    const text = compose(hf.de, hf.en);
    if (text.length > 1400) stats.tooLong.push(`${ws}.${f.symbol} (${text.length})`);
    up.push(`UPDATE fields x SET description = ${q(text)} ${where(ws)} AND x.symbol = ${q(f.symbol)};`);
    down.push(`UPDATE fields x SET description = ${f.description == null ? 'NULL' : q(f.description)} ${where(ws)} AND x.symbol = ${q(f.symbol)};`);
    stats.fields++;
  }
  for (const e of w.equations) {
    const he = h?.equations?.[e.no];
    if (!he || (!he.de && !he.en)) { stats.missingEquations.push(`${ws}.${e.no}`); continue; }
    const text = compose(he.de, he.en);
    if (text.length > 1400) stats.tooLong.push(`${ws}.eq ${e.no} (${text.length})`);
    up.push(`UPDATE equations x SET description = ${q(text)} ${where(ws)} AND x.equation_number = ${q(e.no)};`);
    down.push(`UPDATE equations x SET description = ${e.description == null ? 'NULL' : q(e.description)} ${where(ws)} AND x.equation_number = ${q(e.no)};`);
    stats.equations++;
  }
  for (const g of w.gates) {
    const hg = h?.gates?.[g.code];
    if (!hg || (!hg.de && !hg.en)) { stats.missingGates.push(`${ws}.${g.code}`); continue; }
    const text = compose(hg.de, hg.en);
    if (text.length > 1400) stats.tooLong.push(`${ws}.${g.code} (${text.length})`);
    up.push(`UPDATE compliance_requirements x SET description = ${q(text)} ${where(ws)} AND x.code = ${q(g.code)};`);
    down.push(`UPDATE compliance_requirements x SET description = ${g.description == null ? 'NULL' : q(g.description)} ${where(ws)} AND x.code = ${q(g.code)};`);
    stats.gates++;
  }
  // keys the writers produced that the inventory does not know (typo or stale symbol) — reported, never written
  if (h) {
    const known = { fields: new Set(w.fields.map((f) => f.symbol)), equations: new Set(w.equations.map((e) => e.no)), gates: new Set(w.gates.map((g) => g.code)) };
    for (const kind of ['fields', 'equations', 'gates']) for (const k of Object.keys(h[kind] ?? {})) if (!known[kind].has(k)) stats.unknownKeys.push(`${ws}.${kind}.${k}`);
  }
}
for (const ws of Object.keys(hints)) if (!inv[ws]) stats.unknownKeys.push(`${ws} (worksheet not in inventory)`);
const file = `${ts}_${slug}_hints.sql`;
const day = ts.slice(0, 8);
const header = `-- ${std} · engineer hints on every field, equation and compliance requirement (hint wave ${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}).
-- Each description now carries a German hint and an English part after the marker "[EN] " (src/lib/eval/hint-text.ts; the form
-- renders the part of the page locale; the approval refusal prints the whole text as "Hinweis" for a block gate without its inputs).
-- Content authored from the printed guideline pages (rendered PDF read in the authoring session; the authoring JSON in the vault
-- carries a source string with the printed page per hint); every number / limit / clause in a hint is traceable to those pages.
-- SAFETY: text only (fields.description, equations.description, compliance_requirements.description); no field, equation, gate,
-- value or severity changes. The pre-block descriptions (encoder notes) are restored by the rollback and kept in the inventory JSON.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/${file}
-- Rollback: scripts/migrations/rollback-${file}
BEGIN;
`;
fs.writeFileSync(path.join(root, 'scripts/migrations', file), header + up.join('\n') + '\nCOMMIT;\n');
fs.writeFileSync(path.join(root, 'scripts/migrations', 'rollback-' + file), `-- ROLLBACK for ${file} — restores the pre-block descriptions (inventory snapshot ${day}).\nBEGIN;\n${down.join('\n')}\nCOMMIT;\n`);
const rb = `-- Read-back after ${file}: counts of bilingual descriptions (expected fields ${stats.fields}, equations ${stats.equations}, gates ${stats.gates}).
select 'fields' as kind, count(*) filter (where x.description like '%' || chr(10) || '[EN] %') as bilingual, count(*) filter (where x.active) as total
from fields x join worksheet_templates w on w.id = x.worksheet_template_id join standards s on s.id = w.standard_id where s.code = ${q(std)}
union all
select 'equations', count(*) filter (where x.description like '%' || chr(10) || '[EN] %'), count(*)
from equations x join worksheet_templates w on w.id = x.worksheet_template_id join standards s on s.id = w.standard_id where s.code = ${q(std)}
union all
select 'gates', count(*) filter (where x.description like '%' || chr(10) || '[EN] %'), count(*)
from compliance_requirements x join worksheet_templates w on w.id = x.worksheet_template_id join standards s on s.id = w.standard_id where s.code = ${q(std)};
`;
fs.writeFileSync(path.join(root, 'scripts/verification/apply', `readback-${slug}-hints-${day}.sql`), rb);
console.log(JSON.stringify(stats, null, 1));
