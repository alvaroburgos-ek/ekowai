#!/usr/bin/env node
// Turns TICKED ruling blocks into a runnable pack, so ratifying is "tick the box, run one command".
//
// A staged block looks like:
//     -- S-3 · GATE REQ-30 CAN NEVER PASS.   [X] RATIFIED  [ ] REJECTED  [ ] DEFER
//     -- evidence ...
//     -- update public.compliance_requirements set ... where id='...';
//     -- rollback: update public.compliance_requirements set ... where id='...';
//
// This reads every *-STAGED-rulings.sql, keeps only blocks whose RATIFIED box is ticked (x, X or a
// checked box glyph), un-comments their SQL, and writes ONE pack plus ONE rollback. The output is fed
// to apply-pack.mjs, which supplies the transaction — so, exactly as for the verification packs, the
// generated file must never contain transaction control, and this script refuses to emit any.
//
// Usage:
//   node scripts/verification/extract-ratified.mjs                 # report what is ticked, write nothing
//   node scripts/verification/extract-ratified.mjs --write         # write ratified-pack.sql + rollback
// Then:
//   node scripts/verification/apply-pack.mjs scripts/verification/ratified-pack.sql --dry-run
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const write = process.argv.includes('--write');

const TICK_ANY = /[☐☑☒\[(]\s*([ xX✓])?\s*[\])]?\s*RATIFIED/i;
const TICK_SET = /(?:☑|☒|[\[(]\s*[xX✓]\s*[\])])\s*RATIFIED/i;   // a box that has actually been marked
const TXN = /^\s*(begin|commit|rollback|start\s+transaction|end)\b/i;
const SQL_START = /^(update|insert|delete|with)\b/i;

const files = fs.readdirSync(here).filter((f) => f.endsWith('-STAGED-rulings.sql')).sort();
const packs = [];
const rolls = [];
const report = [];
let ticked = 0, withSql = 0, noSql = [];

for (const f of files) {
  const lines = fs.readFileSync(path.join(here, f), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('--') || !TICK_ANY.test(lines[i])) continue;
    if (/\b(marker|tick|box|only after|before the|un-?comment|may be executed|nothing in this file)\b/i.test(lines[i])) continue;
    if (!TICK_SET.test(lines[i])) continue;                       // untouched box -> not ratified
    ticked++;
    const title = lines[i].replace(/^--\s*/, '').replace(/[☐☑☒\[(]\s*[ xX✓]?\s*[\])]?\s*(RATIFIED|REJECTED|DEFER)/gi, ' ')
      .replace(/_{2,}/g, ' ').replace(/\s{2,}/g, ' ').trim();
    // Collect this block's commented SQL, stopping at the next ticked/unticked box or a separator rule.
    const sql = [], back = [], body_all = [];
    let mode = 'sql';
    for (let j = i + 1; j < lines.length; j++) {
      if (TICK_ANY.test(lines[j]) || /^--\s*[=\-]{3,}\s*$/.test(lines[j])) break;
      body_all.push(lines[j].replace(/^--\s?/, ''));
      let body = lines[j].replace(/^--\s?/, '');
      // "rollback: update ..." carries the statement on the SAME line as its label, so switch mode and
      // keep the remainder rather than dropping the line — otherwise every inverse is silently lost.
      const rb = body.match(/^\s*rollback\b[^:]*:\s*(.*)$/i);
      if (rb) { mode = 'back'; body = rb[1]; if (!body.trim()) continue; }
      const bucket = () => (mode === 'back' ? back : sql);
      if (SQL_START.test(body.trim())) bucket().push(body.trimEnd());
      else if (bucket().length && /^\s+\S/.test(body)) bucket().push(body.trimEnd());
    }
    // Scan the WHOLE block body, not just the statements collected above: a bare `commit;` matches no
    // SQL-start pattern, so checking only the collected list would drop it silently instead of refusing.
    // Silent is not good enough here — this is the defect that once wrote 171 rows to production.
    const offenders = [...body_all, ...sql, ...back].filter((s) => TXN.test(s));
    if (offenders.length) {
      console.error(`REFUSED: ${f} block "${title.slice(0, 60)}" carries transaction control. Fix the staged file.`);
      process.exit(2);
    }
    if (!sql.length) { noSql.push(`${f}: ${title.slice(0, 90)}`); continue; }
    withSql++;
    packs.push(`-- ${f} · ${title.slice(0, 150)}`, ...sql, '');
    if (back.length) rolls.push(`-- ${f} · ${title.slice(0, 150)}`, ...back, '');
    report.push(`${f.replace('-STAGED-rulings.sql', '')}: ${title.slice(0, 100)}`);
  }
}

console.log(`ticked blocks: ${ticked}   with SQL: ${withSql}   ratified but no SQL to run: ${noSql.length}`);
for (const r of report) console.log(`  + ${r}`);
if (noSql.length) {
  console.log('\nRatified, but the block carries no SQL (observation-only, or the SQL needs a value from you):');
  for (const n of noSql) console.log(`  ! ${n}`);
}
if (!write) { console.log('\n(report only — pass --write to generate the pack)'); process.exit(0); }
if (!packs.length) { console.log('\nNothing ticked yet; no pack written.'); process.exit(0); }

const hdr = (what) => [`-- ${what} — generated from the ticked blocks of the STAGED ruling files.`,
  `-- Generated ${new Date().toISOString().slice(0, 19).replace('T', ' ')} by extract-ratified.mjs. Do not hand-edit;`,
  `-- re-tick the staged file and regenerate. Contains no transaction control: apply-pack.mjs supplies it.`, ''];
fs.writeFileSync(path.join(here, 'ratified-pack.sql'), [...hdr('Ratified rulings'), ...packs].join('\n'));
fs.writeFileSync(path.join(here, 'rollback-ratified-pack.sql'), [...hdr('Rollback for the ratified rulings'), ...rolls].join('\n'));
console.log(`\nwrote ratified-pack.sql (${packs.filter((l) => SQL_START.test(l)).length} statements) and rollback-ratified-pack.sql (${rolls.filter((l) => SQL_START.test(l)).length}).`);
console.log('Next: node scripts/verification/apply-pack.mjs scripts/verification/ratified-pack.sql --dry-run');
