#!/usr/bin/env node
// Task 30 close-out helper (READ-ONLY, throwaway): build the sign-off class index and
// cross-check it against the 29 STAGED files. Prints TSV to stdout. No DB, no writes.
import fs from 'node:fs';
import path from 'node:path';

const SHEET = 'docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md';
const STAGED_DIR = 'scripts/verification';
const SLUGS = ['a138','din1989_1','a262e','m277e','m1200_1','m1200_3','fll_gar','fll_naturteich','m820_3','din18130_1','m205','m187','din276','a178','din16941_2','m1200_2','din1989_2','m820_1','m820_2','iso5667_10','iso59020','iso46001','iso5667_6','vsme','din14021','iso14046','atv_a704e','iso5667_1','iso59004'];
// longest-slug-first so din1989_1 is not eaten by a shorter prefix
const SLUG_RE = SLUGS.slice().sort((a, b) => b.length - a.length).join('|');

const sheet = fs.readFileSync(SHEET, 'utf8').split(/\r?\n/);
const headRe = new RegExp(`^###\\s+((?:${SLUG_RE}))-([A-Z])-(\\d+)\\b`);
const sheetIds = new Map(); // id -> line no
const sheetOrder = [];
sheet.forEach((l, i) => {
  const m = l.match(headRe);
  if (m) {
    const id = `${m[1]}-${m[2]}-${m[3]}`;
    if (!sheetIds.has(id)) { sheetIds.set(id, i + 1); sheetOrder.push(id); }
  }
});

// STAGED block ids: a comment line starting the block, `-- <slug>-<L>-<n> ·` or `-- <slug>-<L>-<n> `
const stagedIds = new Map(); // id -> file:line
const stagedFiles = new Map();
for (const slug of SLUGS) {
  const f = path.join(STAGED_DIR, `${slug}-STAGED-plan3-rulings.sql`);
  stagedFiles.set(slug, fs.existsSync(f) ? f : null);
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  const re = new RegExp(`^--\\s+(${slug}-[A-Z]-\\d+)(?:\\b|\\s|·)`);
  lines.forEach((l, i) => {
    const m = l.match(re);
    if (m && !stagedIds.has(m[1])) stagedIds.set(m[1], `${f}:${i + 1}`);
  });
}

const CLASSES = ['G','R','D','S','C','M','J','U','P','E','F','X','I','O','T'];
const perSlug = new Map();
for (const slug of SLUGS) perSlug.set(slug, Object.fromEntries(CLASSES.map(c => [c, 0])));
const otherClasses = new Map();
for (const id of sheetOrder) {
  const m = id.match(new RegExp(`^(${SLUG_RE})-([A-Z])-\\d+$`));
  const [, slug, cls] = m;
  if (!perSlug.has(slug)) continue;
  if (CLASSES.includes(cls)) perSlug.get(slug)[cls]++;
  else otherClasses.set(cls, (otherClasses.get(cls) || 0) + 1);
}

console.log('#SHEET_TOTAL\t' + sheetIds.size);
console.log('#STAGED_TOTAL\t' + stagedIds.size);
console.log('#UNKNOWN_CLASS_LETTERS\t' + JSON.stringify([...otherClasses.entries()]));
console.log('#INDEX');
console.log(['slug', ...CLASSES, 'total', 'staged_blocks', 'staged_file'].join('\t'));
let grand = 0;
for (const slug of SLUGS) {
  const row = perSlug.get(slug);
  const tot = CLASSES.reduce((a, c) => a + row[c], 0);
  grand += tot;
  const nStaged = [...stagedIds.keys()].filter(k => k.startsWith(slug + '-')).length;
  console.log([slug, ...CLASSES.map(c => row[c]), tot, nStaged, stagedFiles.get(slug) || 'MISSING'].join('\t'));
}
console.log(['TOTAL', ...CLASSES.map(c => SLUGS.reduce((a, s) => a + perSlug.get(s)[c], 0)), grand, stagedIds.size, ''].join('\t'));

console.log('#STAGED_NOT_ON_SHEET');
for (const [id, loc] of stagedIds) if (!sheetIds.has(id)) console.log(`${id}\t${loc}`);
console.log('#SHEET_REFERENCING_STAGED_BUT_NO_BLOCK');
// a sheet block whose body names its own STAGED file but whose id has no block there
const bodyBySlugId = new Map();
{
  let cur = null;
  const buf = [];
  const flush = () => { if (cur) bodyBySlugId.set(cur, buf.join('\n')); buf.length = 0; };
  for (const l of sheet) {
    const m = l.match(headRe);
    if (m) { flush(); cur = `${m[1]}-${m[2]}-${m[3]}`; continue; }
    if (l.startsWith('## ') || l.startsWith('### ')) { flush(); cur = null; continue; }
    if (cur) buf.push(l);
  }
  flush();
}
for (const [id, body] of bodyBySlugId) {
  const slug = id.split(/-[A-Z]-\d+$/)[0];
  const namesStaged = new RegExp(`${slug}-STAGED-plan3-rulings\\.sql`).test(body) || /STAGED file/i.test(body);
  if (namesStaged && !stagedIds.has(id)) console.log(`${id}\t${SHEET}:${sheetIds.get(id)}`);
}
