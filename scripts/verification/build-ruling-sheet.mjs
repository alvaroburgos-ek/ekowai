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
  // A block starts at a comment line naming S-<n>; its heading text runs to the end of that comment line.
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^--\s*(S-[0-9]+[a-z]?)\s*[·:.\-]\s*(.+?)\s*$/i);
    if (!m) continue;
    // collect following comment lines until the first blank-ish separator or the next block
    const detail = [];
    for (let j = i + 1; j < lines.length && detail.length < 6; j++) {
      if (/^--\s*S-[0-9]+/i.test(lines[j])) break;
      if (/^--\s*=+\s*$/.test(lines[j])) break;
      const d = lines[j].replace(/^--\s?/, '').trim();
      if (d && !d.startsWith('update ') && !d.startsWith('--')) detail.push(d);
      if (detail.length && !d) break;
    }
    const ratified = /☐\s*RATIFIED/i.test(lines.slice(i, i + 12).join(' '));
    blocks.push({ id: m[1].toUpperCase(), title: m[2].replace(/\s*draft-edition:.*/i, '').trim(), detail: detail.slice(0, 3).join(' ').slice(0, 300), draft: /draft-edition/i.test(lines.slice(i, i + 12).join(' ')), ratified });
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
