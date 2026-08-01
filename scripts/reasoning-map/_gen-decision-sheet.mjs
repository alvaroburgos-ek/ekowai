import { readFileSync, writeFileSync } from 'node:fs';

const snap = JSON.parse(readFileSync('scripts/reasoning-map/snapshot/encoding-snapshot.json', 'utf8'));
const decisions = JSON.parse(readFileSync('scripts/reasoning-map/gate-decisions.json', 'utf8'));
const collisions = JSON.parse(readFileSync('scripts/reasoning-map/gate-rehome-collisions.json', 'utf8'));

// index CRs + fields by (standard, code)/(standard, symbol)
const crIx = new Map();   // `${std}|${crCode}` -> cr row
const fieldIx = new Map(); // `${std}|${symbol}` -> field row
for (const [std, b] of Object.entries(snap.standards)) {
  for (const c of b.compliance ?? []) crIx.set(`${std}|${c.code}`, c);
  for (const f of b.fields ?? []) if (!fieldIx.has(`${std}|${f.symbol}`)) fieldIx.set(`${std}|${f.symbol}`, f);
}
const clip = (s, n = 90) => (s ? String(s).replace(/\s+/g, ' ').slice(0, n) : '');
const cr = (std, code) => crIx.get(`${std}|${code}`) ?? {};

// ---- A. vacuous IS-NOT-NULL-on-boolean: recommend ==True for affirmative/attestation booleans ----
const AFFIRM = /(attest|confirm|erfuel|erfüll|nachgewiesen|dokument|eingehalten|durchgef|erstellt|geprueft|geprüft|bestaetigt|bestätigt|vorhanden|abgeschlossen|freigegeben|genehmig|eingehal|umgesetzt|_ok$|_done$|_present$)/i;
const vac = decisions.filter((d) => d.kind === 'vacuous-isnotnull-boolean');
const vacRows = vac.map((d) => {
  const c = cr(d.code, d.cr);
  const sym = /^\s*([A-Za-z_]\w*)/.exec(c.condition ?? '')?.[1] ?? '';
  const affirmative = AFFIRM.test(sym) || c.requires_attestation === true || /\b(muss|müssen|shall|ist zu|sind zu|has to|must)\b/i.test(c.source_quote ?? '');
  return { std: d.code, cr: d.cr, sev: c.severity, sym, q: clip(c.source_quote, 100), rec: affirmative ? '== True' : 'CONFIRM (true vs presence?)', affirmative };
});

// ---- B. dead-prose: split warn (clear->manual) vs block (decide) ----
const prose = decisions.filter((d) => d.kind === 'dead-prose').map((d) => {
  const c = cr(d.code, d.cr);
  return { std: d.code, cr: d.cr, sev: c.severity, cond: clip(c.condition, 90), q: clip(c.source_quote, 80) };
});

// ---- C. field-missing ----
const fmiss = decisions.filter((d) => d.kind === 'field-missing').map((d) => {
  const c = cr(d.code, d.cr);
  return { std: d.code, cr: d.cr, sev: c.severity, cond: clip(c.condition, 100) };
});

// ---- D. split multi-worksheet: legit summary/verdict vs genuine mis-split ----
const SUMMARY = /(verdict|conformity|konformit|summary|zusammenfass|gesamt|abschluss|final|overall|nachweis|gesamtverif)/i;
const split = decisions.filter((d) => d.kind === 'split-multi-worksheet').map((d) => {
  const c = cr(d.code, d.cr);
  const wsCode = (snap.standards[d.code]?.worksheets ?? []).find((w) => w.id === c.worksheet_template_id)?.code ?? '';
  // A gate whose fields span 3+ worksheets is almost certainly a legitimate summary/verdict gate
  // (it aggregates across the whole project and enforces via the project-wide fallback). A 2-worksheet
  // split is more likely a simple mis-placement to confirm.
  const summ = (d.wsSpan ?? 2) >= 3 || SUMMARY.test(c.code ?? '') || SUMMARY.test(wsCode) || SUMMARY.test(d.detail ?? '');
  return { std: d.code, cr: d.cr, sev: c.severity, ws: wsCode, span: (d.wsSpan ?? 2), cond: clip(c.condition, 80), summ };
});

const L = [];
L.push('---');
L.push('title: "GATE DECISION SHEET — one-pass sign-off"');
L.push('created: 2026-08-01');
L.push('tags: [type/reasoning-map, node/decision-point, project/ekowai-wizard, status/active]');
L.push('---');
L.push('# GATE DECISION SHEET — one-pass sign-off (340 items)');
L.push('');
L.push('These are the gate defects the gate-health harness found across all 71 standards that need YOUR call');
L.push('(applying them blindly would change enforcement wrongly). 224 mechanical re-homes were already applied.');
L.push('**How to sign off:** each item carries my recommendation. For a bulk-approve group, write "APPROVE ALL"');
L.push('at its heading; strike through any single line you disagree with. For DECIDE items, tick the option.');
L.push('When you hand it back I apply exactly what survives, with a rollback.');
L.push('');

// A
const aYes = vacRows.filter((r) => r.affirmative);
const aNo = vacRows.filter((r) => !r.affirmative);
L.push(`## A. Vacuous IS-NOT-NULL-on-boolean (${vacRows.length}) — a block gate on a boolean that passes for true AND false`);
L.push('');
L.push(`### A1. Affirmative / attestation booleans → change condition to \`== True\` (${aYes.length})  ·  **[BULK-APPROVE?]**`);
L.push('| standard | CR | boolean field | sev | source quote | → |');
L.push('|---|---|---|---|---|---|');
for (const r of aYes) L.push(`| ${r.std} | ${r.cr} | \`${r.sym}\` | ${r.sev} | ${r.q} | == True |`);
L.push('');
L.push(`### A2. Ambiguous — could be a data-collection flag (either answer valid) → **CONFIRM intent** (${aNo.length})`);
L.push('| standard | CR | boolean field | sev | source quote | true-required? |');
L.push('|---|---|---|---|---|---|');
for (const r of aNo) L.push(`| ${r.std} | ${r.cr} | \`${r.sym}\` | ${r.sev} | ${r.q} | ☐ ==True  ☐ keep presence |`);
L.push('');

// B
const bWarn = prose.filter((r) => (r.sev ?? '') === 'warn');
const bBlock = prose.filter((r) => (r.sev ?? '') !== 'warn');
L.push(`## B. Dead-prose conditions (${prose.length}) — natural-language conditions that never machine-evaluate`);
L.push('');
L.push(`### B1. WARN placeholders → clear to a clean manual-review item (${bWarn.length})  ·  **[BULK-APPROVE?]**`);
L.push('| standard | CR | prose condition | source quote |');
L.push('|---|---|---|---|');
for (const r of bWarn) L.push(`| ${r.std} | ${r.cr} | ${r.cond} | ${r.q} |`);
L.push('');
L.push(`### B2. BLOCK-severity prose → **DECIDE**: (a) add the real machine rule, (b) downgrade to warn, or (c) clear (${bBlock.length})`);
L.push('| standard | CR | prose condition | source quote | a / b / c |');
L.push('|---|---|---|---|---|');
for (const r of bBlock) L.push(`| ${r.std} | ${r.cr} | ${r.cond} | ${r.q} | ☐a ☐b ☐c |`);
L.push('');

// C
L.push(`## C. Field-missing (${fmiss.length}) — condition references a symbol that is not a field anywhere → **fix symbol or remove gate**`);
L.push('| standard | CR | sev | condition (missing field) | fix |');
L.push('|---|---|---|---|---|');
for (const r of fmiss) L.push(`| ${r.std} | ${r.cr} | ${r.sev} | ${r.cond} | ☐ correct symbol: ____  ☐ remove |`);
L.push('');

// D
const dKeep = split.filter((r) => r.summ);
const dMove = split.filter((r) => !r.summ);
L.push(`## D. Split multi-worksheet gates (${split.length}) — read fields from several worksheets`);
L.push('');
L.push(`### D1. Summary/verdict gates spanning 3+ worksheets → **KEEP** (aggregate project-wide, enforce via fallback) (${dKeep.length})  ·  **[BULK-APPROVE keep?]**`);
L.push('| standard | CR | host ws | span | condition |');
L.push('|---|---|---|---|---|');
for (const r of dKeep) L.push(`| ${r.std} | ${r.cr} | ${r.ws} | ${r.span}ws | ${r.cond} |`);
L.push('');
L.push(`### D2. 2-worksheet splits → confirm intended home or consolidation (${dMove.length})`);
L.push('| standard | CR | host ws | span | condition | decision |');
L.push('|---|---|---|---|---|---|');
for (const r of dMove) L.push(`| ${r.std} | ${r.cr} | ${r.ws} | ${r.span}ws | ${r.cond} | ☐ keep ☐ re-home to: ____ |`);
L.push('');

// E
L.push(`## E. Duplicate-code + re-home collisions (${collisions.length}) — the gate's fields live on a worksheet that ALREADY has a gate with the same code`);
L.push('These are the duplicate-REQ-code overload: same code, different requirement. Recommend renumber the');
L.push('moved gate to a unique code, then re-home. **[BULK-APPROVE renumber+rehome?]**');
L.push('| standard | code | → target worksheet |');
L.push('|---|---|---|');
for (const r of collisions) L.push(`| ${r.code} | ${r.cr} | ${r.toWs} |`);
L.push('');

L.push('---');
L.push(`**Totals:** A ${vacRows.length} (${aYes.length} bulk / ${aNo.length} confirm) · B ${prose.length} (${bWarn.length} bulk / ${bBlock.length} decide) · C ${fmiss.length} · D ${split.length} (${dKeep.length} keep / ${dMove.length} confirm) · E ${collisions.length}.`);
const total = vacRows.length + prose.length + fmiss.length + split.length + collisions.length;
L.push(`Grand total: ${total} items. Bulk-approvable at a stroke: A1(${aYes.length}) + B1(${bWarn.length}) + D1(${dKeep.length}) + E(${collisions.length}) = ${aYes.length + bWarn.length + dKeep.length + collisions.length}.`);

const OUT = 'C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps/_GATE-DECISION-SHEET.md';
writeFileSync(OUT, L.join('\n') + '\n');
console.log(`wrote decision sheet: ${total} items -> ${OUT}`);
console.log(`bulk-approvable: ${aYes.length + bWarn.length + dKeep.length + collisions.length}; individual calls: ${aNo.length + bBlock.length + fmiss.length + dMove.length}`);
