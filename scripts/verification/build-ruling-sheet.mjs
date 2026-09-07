#!/usr/bin/env node
// Consolidates every *-STAGED-rulings.sql into ONE owner sign-off sheet (markdown), per the doctrine's
// "deliver them as ONE consolidated file with verbatim evidence per item so he can sign in a sitting".
// Each staged file's blocks are extracted with their evidence comments; the SQL stays in the per-standard
// file (this sheet is for reading and ticking, not for executing).
// Usage: node scripts/verification/build-ruling-sheet.mjs <out.md>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
if (!out) { console.error('usage: build-ruling-sheet.mjs <out.md>'); process.exit(1); }

const files = fs.readdirSync(here).filter((f) => f.endsWith('-STAGED-rulings.sql')).sort();
const order = fs.existsSync(path.join(here, 'md-packs.order.txt'))
  ? fs.readFileSync(path.join(here, 'md-packs.order.txt'), 'utf8').split('\n')
      .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split(/\s+/)[1])
  : [];
const codeOf = (f) => {
  const slug = f.replace('-STAGED-rulings.sql', '');
  return order.find((c) => c && c.toLowerCase().replace(/[^a-z0-9]/g, '') === slug.replace(/[^a-z0-9]/g, '')) ?? slug.toUpperCase();
};

const L = [];
L.push(`---`, `title: "Ruling sheet — md-verification pass (all standards)"`,
  `created: ${new Date().toISOString().slice(0, 10)}`,
  `tags: [project/ekowai-wizard, type/decision-batch, status/awaiting-signature]`, `status: awaiting-signature`, `---`, ``);
L.push(`# Ruling sheet — one sitting, one file`, ``);
L.push(`Every block below is a call the doctrine forbids the machine from making: a severity, a required-flag,`,
  `a re-home, a deletion, a range choice or a normative ambiguity. The evidence sits with each block in the`,
  `per-standard file named in its heading; the SQL there is commented out until you mark it RATIFIED.`,
  `Nothing in this sheet has been applied. Verification evidence (the quotes themselves) was applied`,
  `separately and is reversible with each pack's rollback file.`, ``);

let total = 0;
const rows = [];
const bodies = [];
for (const f of files) {
  const code = codeOf(f);
  const text = fs.readFileSync(path.join(here, f), 'utf8');
  const lines = text.split('\n');
  // A block starts at a comment line naming its id. Agents across the pass used several id styles:
  // S-1 / R-01 / A-3 / B-2 / C-7 / D-1 / E-4 / F-2 / G, and some used bare "1." numbering.
  // Accept all of them, or 21 of the 52 standards' rulings silently drop out of this sheet.
  // Four heading shapes occur across the 52 files, all with the tick-box in a different place:
  //   -- S-1 · title            -- R-01: title            -- 1. title
  //   -- ☐ RATIFIED  S1-01  title                  (tick first, then id)
  //   -- BLOCK 1 — title  ☐ RATIFIED ______        (tick trailing)
  //   -- 1.1  [ ] RATIFIED — title                 (dotted id, bracket tick)
  const BLOCK_ID = new RegExp(
    '^--\\s*(?:' +
      '(?:[☐\\[(][ xX]?[\\])]?\\s*RATIFIED\\s+)?' +                       // optional leading tick
      '(?:\\*\\*)?(?:BLOCK\\s+)?' +
      '([A-Z]{1,2}[0-9]?-?[0-9]{1,3}(?:[.\\-][0-9]{1,3})?[a-z]?|[0-9]{1,2}(?:\\.[0-9]{1,2})?)' +
      ')\\s*(?:\\*\\*)?\\s*(?:[·:.)\\-–—]|\\s)\\s*(.+?)\\s*$');
  // ONE TICK-BOX = ONE BLOCK. Anchoring on the marker line (rather than scanning a window around a
  // heading) is the only rule that holds across all four heading shapes without double-counting:
  // a window lookahead lets neighbouring list items borrow the same tick.
  const TICK = /[☐\[(][ xX]?[\])]?\s*RATIFIED/i;
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('--') || !TICK.test(lines[i])) continue;
    // File preambles explain the tick-box rather than offer a decision; they are not blocks. Match the
    // explanatory words anywhere on the line, not only after the word RATIFIED.
    if (/\b(marker|tick|box|only after|before the|un-?comment|may be executed|nothing in this file)\b/i.test(lines[i])) continue;
    // Title: what is left of this line once id + tick are stripped; if that is empty, use the nearest
    // preceding non-separator comment line (the "BLOCK n — title" / heading-above-tick shapes).
    let id = null;
    let title = lines[i].replace(/^--\s*/, '').replace(TICK, ' ').replace(/[☐\[(][ xX]?[\])]?\s*(REJECTED|DEFER)/gi, ' ')
      .replace(/_{2,}/g, ' ').replace(/\s{2,}/g, ' ').trim().replace(/^[·:.)\-–—\s]+/, '');
    const idm = title.match(/^(?:\*\*)?(?:BLOCK\s+)?([A-Z]{1,2}[0-9]?-?[0-9]{1,3}(?:[.\-][0-9]{1,3})?[a-z]?|[0-9]{1,2}(?:\.[0-9]{1,2})?)(?:\*\*)?\s*[·:.)\-–—]?\s*(.*)$/);
    if (idm) { id = idm[1]; title = idm[2].trim(); }
    for (let j = i - 1; j >= 0 && j >= i - 3 && title.length < 4; j--) {
      const prev = lines[j].replace(/^--\s*/, '').replace(TICK, ' ').replace(/_{2,}/g, ' ').trim();
      if (!prev || /^[=\-]{3,}$/.test(prev)) continue;
      const pm = prev.match(/^(?:\*\*)?(?:BLOCK\s+)?([A-Z]{1,2}[0-9]?-?[0-9]{1,3}(?:[.\-][0-9]{1,3})?[a-z]?|[0-9]{1,2}(?:\.[0-9]{1,2})?)(?:\*\*)?\s*[·:.)\-–—]?\s*(.*)$/);
      if (pm && pm[2].trim().length >= 4) { id ??= pm[1]; title = pm[2].trim(); } else if (prev.length >= 4) { title = prev; }
    }
    if (title.length < 4) continue;
    const detail = [];
    for (let j = i + 1; j < lines.length && detail.length < 3; j++) {
      if (TICK.test(lines[j]) || /^--\s*[=\-]{3,}\s*$/.test(lines[j])) break;
      const d = lines[j].replace(/^--\s?/, '').trim();
      if (!d) break;
      if (!/^(update|insert|delete|select)\b/i.test(d)) detail.push(d);
    }
    blocks.push({ id: (id ?? String(blocks.length + 1)).toUpperCase(), title: title.replace(/\s*draft-edition:.*/i, '').slice(0, 200),
      detail: detail.join(' ').slice(0, 300), draft: /draft-edition/i.test(lines.slice(i, i + 6).join(' ')), ratified: true });
  }
  if (!blocks.length) continue;
  total += blocks.length;
  rows.push(`| ${code} | ${blocks.length} | ${blocks.filter((b) => b.draft).length ? 'draft edition — escalate only' : ''} | \`${f}\` |`);
  bodies.push({ code, f, blocks });
}

L.push(`## Overview — ${total} blocks across ${bodies.length} standards`, ``,
  `| Standard | Blocks | Note | File |`, `|---|--:|---|---|`, ...rows, ``);
for (const b of bodies) {
  L.push(`## ${b.code}`, ``, `Source: \`scripts/verification/${b.f}\``, ``);
  for (const x of b.blocks) {
    L.push(`- **${x.id} · ${x.title}**${x.draft ? ' *(draft edition — escalate, do not apply)*' : ''}  `);
    if (x.detail) L.push(`  ${x.detail}  `);
    L.push(`  ☐ RATIFIED  ☐ REJECTED  ☐ DEFER`);
  }
  L.push(``);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, L.join('\n'));
console.log(`${total} ruling blocks from ${bodies.length} standards -> ${out}`);
