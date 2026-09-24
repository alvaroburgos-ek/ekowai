#!/usr/bin/env node
// Task 30 ABSENCE AUDIT (READ-ONLY, throwaway). Amendment O (added after Task 19 shipped a false
// absence claim): every "not printed / absent / does not exist" claim must carry the failing command,
// its empty output AND its exit code. Scans all 29 reports + 29 STAGED files, classifies each claim
// by whether a re-executable command (and an exit code / empty-output marker) sits within +/-WINDOW
// lines, and prints file:line for every claim that carries no command at all. No DB, no writes.
import fs from 'node:fs';
import path from 'node:path';

const SLUGS = ['a138','din1989_1','a262e','m277e','m1200_1','m1200_3','fll_gar','fll_naturteich','m820_3','din18130_1','m205','m187','din276','a178','din16941_2','m1200_2','din1989_2','m820_1','m820_2','iso5667_10','iso59020','iso46001','iso5667_6','vsme','din14021','iso14046','atv_a704e','iso5667_1','iso59004'];
const REPORTS = 'docs/superpowers/specs/2026-09-11-guideline-to-tool/reports';
const STAGED = 'scripts/verification';
const WINDOW = Number(process.env.WINDOW || 10);

// A SOURCE-ABSENCE claim: prose asserting the STANDARD does not print something,
// or that a token does not exist in the prod capture.
const CLAIM = /(not printed|NOT printed|never printed|prints no\b|prints nothing|does not print|do not print|not in the transcript|not in the source|does not occur|does not appear|do(es)? not exist (in|as) (prod|the)|absent from (prod|the (transcript|capture|source|span|table))|no occurrence of|nowhere in the (transcript|span|document)|not a (prod|printed) token|no such token)/;
// Explicitly NOT an absence claim about the source: Postgres/schema talk, and the Plan-1 columns.
const NOISE = /(column .* does not exist|Plan-1 columns do not exist|columns do not exist yet|widget IS NULL|IF NOT EXISTS)/i;
// EVIDENCE: a re-executable command.
const CMD = /(\bgrep\b|\brg\b|Select-String|pdftotext|node scripts\/|pnpm -s tsx|prod-query\.mjs|build-prior-snapshot|capture-text|verify-regulation-tables)/;
// EXIT CODE / EMPTY OUTPUT marker.
const EXIT = /(exit ?(code)? ?1\b|exit=1|\(empty\)|\*\(empty\)\*|no output|\(no output\)|0 rows|returns nothing|\b0 matches\b|→ *$|\| *1 *\|)/i;

const rows = [];
let claims = 0, withCmd = 0, withBoth = 0, noCmd = 0;

function scan(file, slug) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => {
    if (!CLAIM.test(l) || NOISE.test(l)) return;
    claims++;
    const lo = Math.max(0, i - WINDOW), hi = Math.min(lines.length, i + WINDOW + 1);
    const win = lines.slice(lo, hi).join('\n');
    const hasCmd = CMD.test(win);
    const hasExit = EXIT.test(win);
    if (hasCmd) withCmd++;
    if (hasCmd && hasExit) withBoth++;
    if (!hasCmd) { noCmd++; rows.push(`NO-COMMAND\t${slug}\t${file}:${i + 1}\t${l.trim().slice(0, 170)}`); }
    else if (!hasExit) rows.push(`CMD-NO-EXITCODE\t${slug}\t${file}:${i + 1}\t${l.trim().slice(0, 130)}`);
  });
}

for (const s of SLUGS) {
  scan(path.join(REPORTS, `plan-3-${s}.md`), s);
  scan(path.join(STAGED, `${s}-STAGED-plan3-rulings.sql`), s);
}

console.log(`#WINDOW\t${WINDOW}`);
console.log(`#SOURCE_ABSENCE_CLAIMS\t${claims}`);
console.log(`#WITH_COMMAND\t${withCmd}`);
console.log(`#WITH_COMMAND_AND_EXIT_OR_EMPTY\t${withBoth}`);
console.log(`#NO_COMMAND\t${noCmd}`);
console.log('#FINDINGS\tverdict\tslug\tfile:line\ttext');
for (const r of rows) console.log(r);

// --- second pass: of the NO-COMMAND claims, how many at least cite a transcript line / PDF page? ---
let noCmdWithLine = 0, noCmdBare = 0;
const bare = [];
for (const r of rows) {
  if (!r.startsWith('NO-COMMAND')) continue;
  const [, , loc] = r.split('\t');
  const [file, ln] = [loc.slice(0, loc.lastIndexOf(':')), Number(loc.slice(loc.lastIndexOf(':') + 1))];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const lo = Math.max(0, ln - 1 - WINDOW), hi = Math.min(lines.length, ln + WINDOW);
  const win = lines.slice(lo, hi).join('\n');
  if (/\bL\d{2,5}\b|PDF p\.\d+|printed p\.\d+/.test(win)) noCmdWithLine++;
  else { noCmdBare++; bare.push(r); }
}
console.log(`#NO_COMMAND_BUT_CITES_A_TRANSCRIPT_LINE\t${noCmdWithLine}`);
console.log(`#NO_COMMAND_AND_NO_LINE_CITATION\t${noCmdBare}`);
console.log('#BARE_CLAIMS');
for (const b of bare) console.log(b);
