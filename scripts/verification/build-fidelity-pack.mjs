#!/usr/bin/env node
// Extracts, from the STAGED ruling files, ONLY the statements that repair fidelity to the source and
// cannot change what the Wizard enforces or computes. Everything else stays staged for the owner.
//
// WHY A SPLIT EXISTS AT ALL. The 833 staged blocks are not one kind of thing. Some are corrections with
// exactly one right answer (a quote that is not the printed sentence; a clause tag pointing at the wrong
// paragraph). Others are decisions the doctrine reserves for the engineer: severity, required-ness,
// condition rewrites, range picks, and the ~50 blocks that offer two mutually exclusive options. Applying
// the second group unreviewed would put an engineer's stamp on a machine's guess, on a compliance tool.
//
// THE TEST, applied per statement, not per block:
//   include  -> every column it writes is in SAFE, and it is an UPDATE
//   exclude  -> it writes any column in ENFORCING, or it is an INSERT (a new gate is a new rule),
//               or it writes `symbol` (renaming a symbol breaks the equations and gates that read it —
//               DIN-18130-1 S-1 documents exactly this hazard for k_f)
// A statement that mixes both classes is excluded whole: there is no safe half.
//
// `unit` is deliberately NOT safe. Changing a unit changes every number computed from that field, and
// one staged block asks for a data-migration pre-check first. It is emitted to a separate pack.
//
// Usage: node scripts/verification/build-fidelity-pack.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = path.dirname(fileURLToPath(import.meta.url));
const write = process.argv.includes('--write');

// Read the REAL column list before trusting any staged statement. One agent wrote
// `where code=... and standard_id=...` against compliance_requirements, which has no standard_id:
// the statement is unrunnable and took the whole transaction down with it on the first dry run.
// Validating identifiers here means a broken staged statement is reported, never shipped.
const root = path.resolve(here, '..', '..');
const envm = fs.readFileSync(path.join(root, '.env.local'), 'utf8').match(/^DATABASE_URL_PROD=(.+)$/m);
if (!envm) { console.error('DATABASE_URL_PROD missing'); process.exit(1); }
const sql0 = postgres(envm[1].trim().replace(/^"|"$/g, ''), { prepare: false, max: 1, ssl: 'require' });
const schema = new Map();
try {
  const rows = await sql0`select table_name, column_name from information_schema.columns
                          where table_schema = 'public'`;
  for (const r of rows) {
    if (!schema.has(r.table_name)) schema.set(r.table_name, new Set());
    schema.get(r.table_name).add(r.column_name);
  }
} finally { await sql0.end(); }

const SAFE = ['source_quote', 'verification_quote', 'clause_reference', 'label_de', 'label_en',
  'description', 'verification_note', 'regulation_reference'];
const ENFORCING = ['severity', 'is_required', 'condition_expression', 'condition', 'active', 'is_active',
  'symbol', 'data_type', 'enum_values', 'formula', 'expression', 'worksheet_template_id', 'verification_status'];
const TXN = /^\s*(begin|commit|rollback|start\s+transaction|end)\b/i;

// Returns the statement text up to and including the first ';' that is NOT inside a quoted string, or
// null if this text does not terminate. Needed because staged statements routinely carry a trailing
// `-- note` after the semicolon, and because quotes themselves contain ';' and '--' characters.
const terminate = (text) => {
  let inStr = false;
  for (let k = 0; k < text.length; k++) {
    const c = text[k];
    if (inStr) {
      if (c === "'") { if (text[k + 1] === "'") k++; else inStr = false; }
      continue;
    }
    if (c === "'") { inStr = true; continue; }
    if (c === '-' && text[k + 1] === '-') return null;   // comment starts before any terminator
    if (c === ';') return text.slice(0, k + 1);
  }
  return null;
};

// columns written by a statement = identifiers immediately before '=' between SET and WHERE
const columnsOf = (stmt) => {
  const m = stmt.match(/\bset\b([\s\S]*?)(?:\bwhere\b|$)/i);
  if (!m) return [];
  const cols = [];
  const re = /(?:^|,)\s*([a-z_][a-z0-9_]*)\s*=/gi;
  let x;
  while ((x = re.exec(m[1]))) cols.push(x[1].toLowerCase());
  return cols;
};

const files = fs.readdirSync(here).filter((f) => f.endsWith('-STAGED-rulings.sql')).sort();
const safeOut = [], unitOut = [];
const stats = { total: 0, safe: 0, unit: 0, enforcing: 0, inserts: 0, mixed: 0, unparsed: 0, badcol: 0 };
const badcols = [];
const toInvert = [];   // statements whose CURRENT values must be captured so the change can be undone
const perFile = [];

for (const f of files) {
  const lines = fs.readFileSync(path.join(here, f), 'utf8').split('\n');
  let nSafe = 0, nUnit = 0;
  for (let i = 0; i < lines.length; i++) {
    const body = lines[i].replace(/^--\s?/, '');
    if (!/^\s*(update|insert)\b/i.test(body)) continue;
    // a statement may wrap: keep appending commented continuation lines until it ends in ';'
    let raw = body.trimEnd();
    let j = i;
    let stmt = terminate(raw);
    while (stmt === null && j + 1 < lines.length && lines[j + 1].startsWith('--')) {
      const nxt = lines[++j].replace(/^--\s?/, '').trimEnd();
      if (/^\s*(update|insert)\b/i.test(nxt) || !nxt.trim()) break;
      raw += ' ' + nxt.trim();
      stmt = terminate(raw);
    }
    stats.total++;
    if (stmt === null) { stats.unparsed++; continue; }             // incomplete -> never guess
    if (TXN.test(stmt)) { console.error(`REFUSED: ${f} line ${i + 1} carries transaction control.`); process.exit(2); }
    if (/^\s*insert\b/i.test(stmt)) { stats.inserts++; continue; }
    const cols = columnsOf(stmt);
    if (!cols.length) { stats.unparsed++; continue; }
    // Some staged statements are sketches, not SQL: "... where symbol in ('w','w_P') and ... (VDI-3477-04);"
    // They terminate in ';' and would pass every other check, then fail at apply time and roll the whole
    // transaction back. A placeholder outside a string literal means the author left it unfinished.
    const outside = stmt.replace(/'(?:[^']|'')*'/g, "''");
    if (/\.\.\.|…|<[a-z_ ]+>/i.test(outside)) { stats.unparsed++; badcols.push(`${f}:${i + 1} incomplete SQL (placeholder left in)`); continue; }
    // Validate every identifier the statement compares against, in SET and WHERE alike, against the
    // live schema of the table it targets. An unknown column aborts the whole transaction at apply time.
    const tbl = (stmt.match(/^\s*update\s+(?:public\.)?([a-z_][a-z0-9_]*)/i) ?? [])[1]?.toLowerCase();
    const known = schema.get(tbl);
    if (!known) { stats.badcol++; badcols.push(`${f}:${i + 1} unknown table "${tbl}"`); continue; }
    // Scan only OUTSIDE string literals. Quoted values here are German prose and gate conditions, full
    // of words that look exactly like column identifiers ("muss", "daten", "wurzelschutz_vorhanden").
    const bare = stmt.replace(/'(?:[^']|'')*'/g, "''");
    const refs = new Set();
    const rre = /(?:^|[\s,(])([a-z_][a-z0-9_]*)\s*(?:=|<>|!=|\bin\b|\bis\b)/gi;
    let rm;
    while ((rm = rre.exec(bare))) refs.add(rm[1].toLowerCase());
    const RESERVED = new Set(['set', 'where', 'and', 'or', 'not', 'update', 'public', 'select', 'from', 'coalesce', 'nullif', 'replace', 'now', 'null', 'true', 'false']);
    const unknown = [...refs].filter((r) => !RESERVED.has(r) && !known.has(r));
    if (unknown.length) {
      stats.badcol++;
      badcols.push(`${f}:${i + 1} ${tbl} has no column ${unknown.join(', ')}`);
      continue;
    }
    const hasEnforcing = cols.some((c) => ENFORCING.includes(c));
    const hasUnit = cols.includes('unit');
    const allSafe = cols.every((c) => SAFE.includes(c) || c === 'unit');
    if (hasEnforcing || !allSafe) { stats.enforcing++; continue; }
    if (hasUnit && cols.some((c) => SAFE.includes(c))) { stats.mixed++; continue; }  // unit + text in one -> owner
    if (hasUnit) { unitOut.push(`-- ${f}:${i + 1}`, stmt, ''); nUnit++; stats.unit++; toInvert.push({ tbl, cols, stmt }); continue; }
    safeOut.push(`-- ${f}:${i + 1}`, stmt, ''); nSafe++; stats.safe++;
    toInvert.push({ tbl, cols, stmt });
    i = j;
  }
  if (nSafe || nUnit) perFile.push(`${f.replace('-STAGED-rulings.sql', '')}: ${nSafe} fidelity, ${nUnit} unit`);
}

console.log(`statements seen: ${stats.total}`);
console.log(`  fidelity-only (quote/clause/label/description) : ${stats.safe}   -> fidelity-pack.sql`);
console.log(`  unit-only                                      : ${stats.unit}   -> unit-pack.sql (needs your nod)`);
console.log(`  touch enforcement / other columns              : ${stats.enforcing}   left staged`);
console.log(`  new rows (INSERT = a new rule)                 : ${stats.inserts}   left staged`);
console.log(`  mixed unit+text in one statement               : ${stats.mixed}   left staged`);
console.log(`  could not parse a complete statement           : ${stats.unparsed}   left staged`);
console.log(`  reference a column that does not exist         : ${stats.badcol}   left staged, BROKEN AS WRITTEN`);
for (const b of badcols) console.log(`      ! ${b}`);
console.log('');
for (const p of perFile) console.log(`  ${p}`);

if (!write) { console.log('\n(report only — pass --write to generate)'); process.exit(0); }

// ---- Build the rollback by reading the CURRENT values of every row each statement will touch. ----
// A generated pack without an undo is not applyable to a compliance tool: these statements overwrite
// quotes and clause tags that were themselves verified evidence. The inverse is captured from prod
// BEFORE anything is applied, and addresses each row by its own id.
const lit = (v) => (v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const sql1 = postgres(envm[1].trim().replace(/^"|"$/g, ''), { prepare: false, max: 1, ssl: 'require' });
const invLines = [];
let invRows = 0;
try {
  await sql1.unsafe('set default_transaction_read_only = on');
  for (const { tbl, cols, stmt } of toInvert) {
    const where = stmt.match(/\bwhere\b([\s\S]*?);\s*$/i)?.[1];
    if (!where) continue;
    const pick = cols.filter((c) => c !== 'verification_note');   // note is appended, not replaced
    if (!pick.length) continue;
    let rows;
    try { rows = await sql1.unsafe(`select id, ${pick.join(', ')} from ${tbl} where ${where}`); }
    catch { invLines.push(`-- could not capture prior values for: ${stmt.slice(0, 100)}`); continue; }
    for (const r of rows) {
      invLines.push(`update public.${tbl} set ${pick.map((c) => `${c}=${lit(r[c])}`).join(', ')} where id='${r.id}';`);
      invRows++;
    }
  }
} finally { await sql1.end(); }
const hdr = (what, note) => [`-- ${what}`, `-- Generated ${new Date().toISOString().slice(0, 19).replace('T', ' ')} by build-fidelity-pack.mjs`,
  `-- from the STAGED ruling files. ${note}`,
  `-- No transaction control: apply-pack.mjs supplies the transaction.`, ''];
fs.writeFileSync(path.join(here, 'fidelity-pack.sql'),
  [...hdr('Fidelity repairs — quotes, clause tags, labels, descriptions.',
    'Cannot change what the Wizard enforces or computes.'), ...safeOut].join('\n'));
fs.writeFileSync(path.join(here, 'unit-pack.sql'),
  [...hdr('Unit corrections.', 'CHANGES COMPUTED VALUES. Check stored values before applying.'), ...unitOut].join('\n'));
fs.writeFileSync(path.join(here, 'rollback-fidelity-pack.sql'),
  [...hdr('Rollback for fidelity-pack.sql AND unit-pack.sql.',
    `Prior values captured from prod at generation time; ${invRows} rows. Addresses rows by id.`), ...invLines].join('\n'));
console.log(`\nwrote fidelity-pack.sql (${stats.safe}), unit-pack.sql (${stats.unit}), rollback-fidelity-pack.sql (${invRows} rows).`);
