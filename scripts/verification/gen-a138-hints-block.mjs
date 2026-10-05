#!/usr/bin/env node
// Generates the STAGED hint block for DWA-A 138-1 from the authored hint JSON files (never applies anything).
// Usage: node scripts/verification/gen-a138-hints-block.mjs <inventory.json> <hints-A.json> [hints-B.json ...]
// Writes: scripts/migrations/20261005110000_a138_field_equation_hints.sql (+ rollback-… restoring today's descriptions)
//         and scripts/verification/apply/readback-a138-hints-20261005.sql
// Format of a stored hint: "<German>\n[EN] <English>" (src/lib/eval/hint-text.ts).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [invPath, ...hintPaths] = process.argv.slice(2);
if (!invPath || hintPaths.length === 0) { console.error('usage: gen-a138-hints-block.mjs <inventory.json> <hints.json...>'); process.exit(1); }
const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
const hints = {};
for (const p of hintPaths) {
  const h = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const [ws, v] of Object.entries(h)) hints[ws] = v;
}
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const compose = (de, en) => {
  const d = (de ?? '').trim(), e = (en ?? '').trim();
  if (!d && !e) return null;
  if (!e) return d;
  if (!d) return '[EN] ' + e;
  return `${d}\n[EN] ${e}`;
};
const up = [], down = [], stats = { fields: 0, equations: 0, missingFields: [], missingEquations: [], tooLong: [] };
for (const [ws, w] of Object.entries(inv)) {
  const h = hints[ws];
  for (const f of w.fields) {
    const hf = h?.fields?.[f.symbol];
    if (!hf || (!hf.de && !hf.en)) { stats.missingFields.push(`${ws}.${f.symbol}`); continue; }
    const text = compose(hf.de, hf.en);
    if (text.length > 1400) stats.tooLong.push(`${ws}.${f.symbol} (${text.length})`);
    up.push(`UPDATE fields f SET description = ${q(text)} FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-A-138-1' AND w.code = ${q(ws)} AND f.symbol = ${q(f.symbol)};`);
    down.push(`UPDATE fields f SET description = ${f.description == null ? 'NULL' : q(f.description)} FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-A-138-1' AND w.code = ${q(ws)} AND f.symbol = ${q(f.symbol)};`);
    stats.fields++;
  }
  for (const e of w.equations) {
    const he = h?.equations?.[e.no];
    if (!he || (!he.de && !he.en)) { stats.missingEquations.push(`${ws}.${e.no}`); continue; }
    const text = compose(he.de, he.en);
    if (text.length > 1400) stats.tooLong.push(`${ws}.Gl.${e.no} (${text.length})`);
    up.push(`UPDATE equations e SET description = ${q(text)} FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE e.worksheet_template_id = w.id AND s.code = 'DWA-A-138-1' AND w.code = ${q(ws)} AND e.equation_number = ${q(e.no)};`);
    down.push(`UPDATE equations e SET description = NULL FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE e.worksheet_template_id = w.id AND s.code = 'DWA-A-138-1' AND w.code = ${q(ws)} AND e.equation_number = ${q(e.no)};`);
    stats.equations++;
  }
}
const header = `-- DWA-A 138-1 · engineer hints on every field and equation (hint wave 2026-10-05). Each description now carries a German
-- hint and an English part after the marker "[EN] " (src/lib/eval/hint-text.ts; the form renders the part of the page locale).
-- Content authored from the English study book (verified against the printed PDF 2026-09-29) and the German transcript;
-- every number/limit/clause in a hint is traceable to those sources (authoring JSON with a source string per hint kept in the vault).
-- SAFETY: text only (fields.description, equations.description); no field, equation, gate, value or severity changes.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005110000_a138_field_equation_hints.sql
-- Rollback (restores the descriptions of 2026-10-05 before this block): scripts/migrations/rollback-20261005110000_a138_field_equation_hints.sql
BEGIN;
`;
fs.writeFileSync(path.join(root, 'scripts/migrations/20261005110000_a138_field_equation_hints.sql'), header + up.join('\n') + '\nCOMMIT;\n');
fs.writeFileSync(path.join(root, 'scripts/migrations/rollback-20261005110000_a138_field_equation_hints.sql'), `-- ROLLBACK for 20261005110000_a138_field_equation_hints.sql — restores the pre-block descriptions (snapshot of 2026-10-05).\nBEGIN;\n${down.join('\n')}\nCOMMIT;\n`);
fs.writeFileSync(path.join(root, 'scripts/verification/apply/readback-a138-hints-20261005.sql'), `-- Read-back after the hint block: counts of bilingual descriptions (expected fields ${stats.fields}, equations ${stats.equations}).\nselect 'fields' as kind, count(*) filter (where f.description like '%' || chr(10) || '[EN] %') as bilingual, count(*) filter (where f.active) as active\nfrom fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'DWA-A-138-1'\nunion all\nselect 'equations', count(*) filter (where e.description like '%' || chr(10) || '[EN] %'), count(*)\nfrom equations e join worksheet_templates w on w.id = e.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'DWA-A-138-1';\n`);
console.log(JSON.stringify(stats, null, 1));
