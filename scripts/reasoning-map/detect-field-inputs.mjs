/**
 * Field-input detector (understanding pass for the "guideline options -> selection"
 * workstream). Reads a rich active-field dump and classifies every field by what
 * input it SHOULD be, extracting option candidates from the field's own
 * description/source_quote where the guideline text enumerates them.
 *
 * HEURISTIC + SURFACING ONLY — it never converts anything. Extracted options are
 * candidates for PDF verification (SR-1: options must be quoted from the standard's
 * own page, never invented). Output drives the review + conversion step.
 *
 * Usage: node scripts/reasoning-map/detect-field-inputs.mjs <fields-rich.json> <out.json> <out.md>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , IN, OUT_JSON, OUT_MD] = process.argv;
const rows = JSON.parse(readFileSync(IN, 'utf8'));

// json fields already wired to a structured editor (not placeholders):
// bespoke editors + everything configured in selection-fields.ts (read live so
// this stays accurate as configs are added).
const BESPOKE = ['surface_inventory', 'r_D_n_table', 'risk_register', 'risk_mitigation_plan'];
let CONFIGURED = [];
try {
  const sf = readFileSync('src/lib/eval/selection-fields.ts', 'utf8');
  const block = sf.slice(sf.indexOf('SELECTION_CONFIGS'));
  CONFIGURED = [...block.matchAll(/^ {2}([a-z_][a-z0-9_]*): \{/gm)].map((m) => m[1]);
} catch { /* selection-fields.ts not found — fall back to bespoke only */ }
const WIRED = new Set([...BESPOKE, ...CONFIGURED]);

const OPT_LABEL = /(\bart\b|typ|kategorie|klasse|verfahren|methode|auswahl|rechtsgrundlage|grund|kriterium|stufe|option|variante|zustand|status|phase|gruppe|klassifiz)/i;
const REGISTER_HINT = /(list|liste|register|inventar|verzeichnis|members|mitglieder|tagebuch|targets|ziele|katalog|elements|species|programm|plan)/i;
const CHECKLIST_HINT = /(applicable|anwendbar|geltend|selected|_set\b|_flags\b|phases|lph|groups|kostengruppen|bases|grundlagen|criteria|kriterien|standards|normen|quellen|sources)/i;
const DOC_HINT = /(dokument|nachweis)/i;

/** An item is a plausible OPTION (short label), not a prose fragment. */
function looksLikeOption(x) {
  if (x.length < 2 || x.length > 40) return false;          // options are short labels
  if (/^\d/.test(x)) return false;                          // clause-number leak (6.2, 6.10)
  if (/\($/.test(x) || /^[a-z]/.test(x) === false && /[()]/.test(x)) return false; // truncated parens
  if (/§|\(\d|\d\)|\bTab(elle)?\.|\bBild\b/i.test(x)) return false; // clause/table refs = prose
  if (/\b(shall|should|may|from|selected|depends|description|basis|whose|which|apply|include|provided|z\.\s?b\.|e\.\s?g|etc|address|conditions|prior|purpose|origin|full)\b/i.test(x)) return false; // verb-y/prose
  if ((x.match(/\s/g) || []).length > 4) return false;      // too many words = a sentence
  return true;
}

/** Pull an enumerated option set out of a text blob, or [] if it isn't a clean list.
 * Conservative: EVERY produced item must look like a short label (looksLikeOption),
 * else the whole field is treated as prose (no false-positive option list). */
function extractOptions(text) {
  if (!text) return [];
  const t = String(text).trim();
  let parts = [];
  if (t.split(/[;\n]/).length >= 3) parts = t.split(/[;\n]/);
  else if (/(•|▪|\b[a-z]\)\s|\b\d+\.\s|\b\d+\)\s)/.test(t)) parts = t.split(/(?:•|▪|\b[a-z]\)\s|\b\d+[.)]\s)/);
  else if (t.split(' / ').length >= 3) parts = t.split(' / ');
  else if (t.split(/,\s/).length >= 3 && t.length <= 90) parts = t.split(/,\s/); // short comma list only
  else return [];
  const opts = parts
    .map((x) => x.replace(/\s+/g, ' ').replace(/^[-–•\s]+|[.;,\s]+$/g, '').trim())
    .filter((x) => x.length >= 2 && !/^\d+$/.test(x));
  if (opts.length < 2) return [];
  // reject the whole set unless (nearly) all items look like real options
  const good = opts.filter(looksLikeOption);
  if (good.length < 2 || good.length < opts.length - 1) return [];
  return [...new Set(good)].slice(0, 25);
}

function classify(r) {
  const dt = r.data_type;
  const label = `${r.label_de || r.label_en || ''}`;
  const desc = `${r.description || ''}`;
  const quote = `${r.source_quote || ''}`;
  const hay = `${r.symbol} ${label}`;
  if (dt === 'number' || dt === 'date') return { category: 'typed-ok', widget: dt };
  if (dt === 'boolean') return { category: 'boolean-ok', widget: 'boolean (ja/nein)' };
  if (dt === 'enum') {
    const ev = r.enum_values;
    const has = Array.isArray(ev) ? ev.length > 0 : !!ev && typeof ev === 'object';
    return has ? { category: 'enum-ok', widget: 'dropdown' } : { category: 'enum-missing', widget: 'dropdown (needs enum_values)' };
  }
  if (dt === 'json') {
    if (WIRED.has(r.symbol)) return { category: 'json-wired', widget: 'structured editor (wired)' };
    let sub;
    if (DOC_HINT.test(hay) && !REGISTER_HINT.test(hay)) sub = 'document';
    else if (CHECKLIST_HINT.test(hay)) sub = 'checklist';
    else if (REGISTER_HINT.test(hay)) sub = 'register';
    else sub = 'review';
    const widget = sub === 'document' ? 'document-upload' : sub === 'checklist' ? 'multi-select checklist' : sub === 'register' ? 'repeatable register' : 'review';
    return { category: 'json-placeholder', subtype: sub, widget };
  }
  if (dt === 'text') {
    const optsQ = extractOptions(quote);
    const opts = optsQ.length >= 2 ? optsQ : extractOptions(desc);
    if (opts.length >= 2) return { category: 'text-selection-candidate', widget: 'enum/checklist', options: opts, evidence: optsQ.length >= 2 ? 'source_quote' : 'description' };
    if (OPT_LABEL.test(label) || OPT_LABEL.test(r.symbol)) return { category: 'text-option-label', widget: 'enum? (verify PDF)' };
    return { category: 'text-freeform', widget: 'text' };
  }
  return { category: 'other', widget: dt };
}

const out = rows.map((r) => {
  const c = classify(r);
  return { std: r.std, ws: r.ws, symbol: r.symbol, data_type: r.data_type, label: r.label_de || r.label_en || '', clause: r.clause_reference || '', ...c };
});

// ── Cross-field "smells" (structural, need per-worksheet context) ──────────────
// A) count-without-register: a hand-entered "Anzahl X" number whose worksheet has
//    NO json register → X can be many; should be a register with a derived count.
// B) attestation-without-detail: a boolean that only ASSERTS a structured thing
//    exists (risk register present, plan documented …) while the detail lives
//    elsewhere or nowhere → consider adding the structured field so the detail is
//    captured (and, when it references another standard, reuse that editor).
const COUNT_SYM = /(_count\b|_anzahl\b|_size\b|_number\b|anzahl_)/i;
const COUNT_LABEL = /(anzahl|number of|count of|menge der)/i;
const ATTEST_SYM = /(_present\b|_vorhanden\b|_exists\b|_defined\b|_documented\b|_dokumentiert\b|_complete\b|_erstellt\b|_erfasst\b|_list_present\b)/i;
const STRUCT_LABEL = /(register|liste|list|plan|matrix|katalog|inventar|verzeichnis|programm|kriterien|criteria|maßnahmen|measures|ziele|targets|beteiligte|stakeholder|risiken|risks|normen|standards|dokument)/i;

const wsHasJson = new Set();
const wsBoolCount = new Map(); // `${std}|${ws}` -> number of boolean/enum fields (enumerated items)
for (const r of rows) {
  const k = `${r.std}|${r.ws}`;
  if (r.data_type === 'json') wsHasJson.add(k);
  if (r.data_type === 'boolean' || r.data_type === 'enum') wsBoolCount.set(k, (wsBoolCount.get(k) || 0) + 1);
}

// Statistical / measurement counts (sample size n, Probenanzahl, …) are genuine
// NUMBERS that feed formulas — they must NOT become registers. A count is a
// list-candidate only when it denotes documentable items, not a sample size.
const STAT_COUNT = /(\bn\b|_n\b|^n$|probe|sample|teilprobe|messung|naht|stichprobe|analys|_count_.*(sample|probe)|number_of_samples|probenanzahl)/i;
const LIST_COUNT = /(nachtr|änderung|maßnahm|mitglied|beteilig|dokument|nachweis|genehmig|auflage|mangel|abweichung|kriteri|risik|alternativ|variant|position|einspr|stakeholder|komponent)/i;
const countCandidates = rows
  .filter((r) => r.data_type === 'number' && (COUNT_SYM.test(r.symbol) || COUNT_LABEL.test(`${r.label_de || ''}`)))
  .map((r) => {
    const hay = `${r.label_de || ''} ${r.symbol}`;
    const statistical = STAT_COUNT.test(hay) && !LIST_COUNT.test(hay);
    // A count over already-enumerated items (worksheet has ≥4 boolean/enum fields,
    // e.g. legal domains, stakeholder groups) is a DERIVED aggregate over fixed
    // fields, NOT a variable list → not a register candidate.
    const overEnumerated = (wsBoolCount.get(`${r.std}|${r.ws}`) || 0) >= 4;
    return { std: r.std, ws: r.ws, symbol: r.symbol, label: r.label_de || r.label_en || '', clause: r.clause_reference || '', wsHasRegister: wsHasJson.has(`${r.std}|${r.ws}`), statistical, overEnumerated, listCandidate: LIST_COUNT.test(hay) && !statistical && !overEnumerated };
  });

const attestCandidates = rows
  .filter((r) => r.data_type === 'boolean' && ATTEST_SYM.test(r.symbol) && STRUCT_LABEL.test(`${r.label_de || ''} ${r.symbol}`))
  .map((r) => ({ std: r.std, ws: r.ws, symbol: r.symbol, label: r.label_de || r.label_en || '', clause: r.clause_reference || '', wsHasRegister: wsHasJson.has(`${r.std}|${r.ws}`) }));

writeFileSync(OUT_JSON, JSON.stringify({ fields: out, countCandidates, attestCandidates }, null, 1));

// ---- summary counts ----
const counts = {};
for (const o of out) counts[o.category] = (counts[o.category] || 0) + 1;

const actionable = out.filter((o) => ['json-placeholder', 'text-selection-candidate', 'text-option-label', 'enum-missing'].includes(o.category));
const byStd = {};
for (const o of actionable) (byStd[o.std] ||= []).push(o);

const L = [];
L.push('---');
L.push('title: "AUDIT — Field-input detection (understanding pass)"');
L.push(`created: 2026-08-01`);
L.push('tags: [type/reasoning-map, node/audit, pattern/structured-register, status/active]');
L.push('status: active');
L.push('node_type: audit');
L.push('method: heuristic detector over live field dump (re-executable)');
L.push('pattern: "[[STRUCTURED-REGISTER-STANDARDIZATION]]"');
L.push('---');
L.push('');
L.push('# Field-input detection — understanding pass');
L.push('');
L.push('What input each active field SHOULD be, so we can convert free-text/placeholder fields to');
L.push('selections where the guideline gives options. Heuristic + surfacing only — extracted options');
L.push('are CANDIDATES for PDF verification (SR-1), never auto-applied. Regenerate:');
L.push('`node scripts/reasoning-map/detect-field-inputs.mjs <fields-rich.json> <out.json> <out.md>`.');
L.push('');
L.push('## Corpus totals');
L.push('| category | meaning | count |');
L.push('|---|---|---|');
const ORDER = ['typed-ok', 'boolean-ok', 'enum-ok', 'enum-missing', 'json-wired', 'json-placeholder', 'text-selection-candidate', 'text-option-label', 'text-freeform', 'other'];
const MEAN = {
  'typed-ok': 'number/date — fine as typed input',
  'boolean-ok': 'yes/no — already a selection',
  'enum-ok': 'dropdown with options — correct',
  'enum-missing': 'dropdown missing its options',
  'json-wired': 'structured editor already built',
  'json-placeholder': '"Phase 2" placeholder → needs a structured widget',
  'text-selection-candidate': 'free text but the field text ENUMERATES options → convert',
  'text-option-label': 'free text, option-like label → review the PDF',
  'text-freeform': 'genuinely open text — leave',
  other: 'other',
};
for (const k of ORDER) if (counts[k]) L.push(`| ${k} | ${MEAN[k]} | ${counts[k]} |`);
L.push(`| **total** | | ${out.length} |`);
L.push('');
L.push('**Actionable now:** `json-placeholder` (build structured widgets) + `text-selection-candidate`');
L.push('(field text already lists the options) are the highest-signal, lowest-doubt conversions.');
L.push('');

// text-selection-candidates first (highest signal — options already in the text)
const tsc = out.filter((o) => o.category === 'text-selection-candidate');
L.push(`## Text fields whose own text enumerates options (${tsc.length}) — convert to enum/checklist`);
L.push('These already carry a candidate option list in their description/source_quote. Verify against');
L.push('the PDF, then populate enum_values / a checklist.');
L.push('');
{
  const b = {};
  for (const o of tsc) (b[o.std] ||= []).push(o);
  for (const std of Object.keys(b).sort()) {
    L.push(`### ${std}`);
    for (const o of b[std]) {
      L.push(`- \`${o.symbol}\` (${o.ws}) — ${o.label} · [${o.evidence}] options: ${o.options.map((x) => `\`${x}\``).join(', ')}`);
    }
    L.push('');
  }
}

// json placeholders
const jph = out.filter((o) => o.category === 'json-placeholder');
L.push(`## JSON placeholder fields (${jph.length}) — build a structured widget`);
L.push('| standard | worksheet | field | label | → widget |');
L.push('|---|---|---|---|---|');
for (const o of jph.sort((a, b) => a.std.localeCompare(b.std))) L.push(`| ${o.std} | ${o.ws} | \`${o.symbol}\` | ${o.label} | ${o.widget} |`);
L.push('');

// option-label text (review)
const tol = out.filter((o) => o.category === 'text-option-label');
L.push(`## Text fields with option-like labels (${tol.length}) — PDF review pass`);
L.push('Label suggests a fixed option set but the field text does not enumerate it. Read the printed');
L.push('page: if the guideline lists options → convert; if open prose → leave as text.');
L.push('');
{
  const b = {};
  for (const o of tol) (b[o.std] ||= []).push(o.symbol);
  for (const std of Object.keys(b).sort()) L.push(`- **${std}** (${b[std].length}): ${b[std].slice(0, 12).map((x) => `\`${x}\``).join(', ')}${b[std].length > 12 ? ' …' : ''}`);
}
L.push('');

// ── count-without-register smell (split: list-candidate vs statistical) ───────
const listCounts = countCandidates.filter((c) => c.listCandidate && !c.wsHasRegister);
const statCounts = countCandidates.filter((c) => c.statistical);
L.push(`## Count → register candidates (${listCounts.length} actionable of ${countCandidates.length} count-like)`);
L.push('A count that documents a LIST of items (measures, changes, members, alternatives…) should be a');
L.push('register + derived count — **but only after** checking it is not an equation/gate input.');
L.push(`**Excluded: ${statCounts.length} statistical/measurement counts** (sample size n, Probenanzahl,`);
L.push('Nahtanzahl…) — these are genuine NUMBERS that feed formulas and MUST stay numeric.');
L.push('| standard | worksheet | field | label |');
L.push('|---|---|---|---|');
for (const c of listCounts.sort((a, b) => a.std.localeCompare(b.std))) {
  L.push(`| ${c.std} | ${c.ws} | \`${c.symbol}\` | ${c.label} |`);
}
L.push('');

// ── attestation-without-detail smell ─────────────────────────────────────────
L.push(`## Attestation-without-detail (${attestCandidates.length}) — booleans asserting a structured thing`);
L.push('A yes/no that only asserts a register/list/plan exists. Consider adding the structured field so');
L.push('the DETAIL is captured (keep the boolean if it feeds a block gate). When the thing is specified');
L.push('by another standard the worksheet references, reuse that editor (add the same symbol) rather than');
L.push('re-encoding — cf. 820-2-10 risk_register ← DWA-M 820-1 Anhang A.');
L.push('| standard | worksheet | field | label | ws has register? |');
L.push('|---|---|---|---|---|');
for (const c of attestCandidates.sort((a, b) => a.std.localeCompare(b.std))) {
  L.push(`| ${c.std} | ${c.ws} | \`${c.symbol}\` | ${c.label} | ${c.wsHasRegister ? 'yes' : 'no'} |`);
}
L.push('');

writeFileSync(OUT_MD, L.join('\n') + '\n');
console.log('categories:', JSON.stringify(counts));
console.log(`actionable: json-placeholder=${jph.length} text-selection=${tsc.length} text-option-label=${tol.length} enum-missing=${counts['enum-missing'] || 0}`);
console.log(`smells: count→register=${listCounts.length} actionable (+${statCounts.length} statistical kept-numeric, of ${countCandidates.length}) · attestation-without-detail=${attestCandidates.length}`);
console.log(`wrote ${OUT_JSON} + ${OUT_MD}`);
