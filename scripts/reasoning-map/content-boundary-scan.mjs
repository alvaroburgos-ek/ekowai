#!/usr/bin/env node
/**
 * content-boundary-scan.mjs — Content Boundary Rule, case-2 detector.
 *
 * Flags every node whose source anchor names a standard OTHER than its own while
 * carrying NO `references::` edge — i.e. cross-standard content with unattributed
 * provenance. Reported, never auto-fixed: telling a legitimate printed reproduction
 * from an over-expansion requires reading the printed page (SR-3).
 *
 * Rule: reasoning-maps/_schema/CONTENT-BOUNDARY-RULE.md
 * Usage: node scripts/reasoning-map/content-boundary-scan.mjs [--maps <dir>] [--verbose]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const MAPS = arg('--maps') ||
  'C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps';
const verbose = argv.includes('--verbose');

// Standard-designator patterns. Deliberately conservative: only well-formed
// designators count, so prose numbers ("5 l/(s·ha)") never trip the scan.
const DESIGNATOR = /\b(?:DWA|ATV|ATV-DVWK)[-\s]?[AM][-\s]?\d{3,4}(?:-\d)?[E]?\b|\bDIN(?:\s+EN)?(?:\s+ISO)?[-\s]\d{3,5}(?:-\d+)?\b|\bISO(?:\/[A-Z]{2,3})?[-\s]\d{4,5}(?:-\d+)?\b|\bEN[-\s]\d{3,5}(?:-\d+)?\b|\bVDI[-\s]\d{3,4}\b|\bDVS[-\s]\d{4}(?:-\d)?\b|\bKOSTRA[-\s]?DWD\b|\bHOAI\b/gi;

const norm = (s) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();

// Standard-alias table. A standard's own variant designations are NOT foreign
// designators. Without this the scan reports a standard citing itself (real cases:
// DIN-14021 prints as "DIN EN ISO 14021"; ATV-A-704E as "DWA-A 704E"). Each entry is
// verified against that standard's own printed title block.
const ALIASES = {
  'DIN-14021': ['DIN EN ISO 14021', 'ISO 14021'],
  'DIN-14071-1': ['ISO/TS 14071', 'ISO 14071', 'DIN CEN ISO/TS 14071'],
  'DIN-EN-ISO-14044': ['ISO 14044', 'EN ISO 14044'],
  'ATV-A-704E': ['DWA-A 704E', 'DWA-A 704', 'ATV-A 704'],
  'ISO-59032': ['ISO/TR 59032'],
  'FLL-Naturteich-2017': ['FLL-Naturteich'],
  'DWA-A-138-1': ['DWA-A 138'],
  'DWA-A-102-2': ['DWA-A 102'],
  'DWA-M-102-4': ['DWA-M 102'],
  'VDI-3814-Blatt-2-1': ['VDI 3814'],
  'DIN-18130-1': ['DIN 18130'],
  'DIN-1989-1': ['DIN 1989'],
  'DIN-1989-2': ['DIN 1989'],
  'ISO-14002-2': ['ISO 14002'],
  'DWA-M-1200-1': ['DWA-M 1200'],
  'DWA-M-1200-2': ['DWA-M 1200'],
  'DWA-M-1200-3': ['DWA-M 1200'],
  'DWA-M-820-1': ['DWA-M 820'],
  'DWA-M-820-2': ['DWA-M 820'],
  'DWA-M-820-3': ['DWA-M 820'],
  'DWA-M-229-1': ['DWA-M 229'],
  'DWA-M-229-2': ['DWA-M 229'],
  'ISO-5667-1': ['ISO 5667'], 'ISO-5667-6': ['ISO 5667'],
  'ISO-5667-10': ['ISO 5667'], 'ISO-5667-13': ['ISO 5667'], 'ISO-5667-16': ['ISO 5667'],
  'ISO-14064-1': ['ISO 14064'], 'ISO-14064-2': ['ISO 14064'],
};

function frontmatter(txt) {
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (k) fm[k[1]] = k[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

const stds = readdirSync(MAPS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  .map((d) => d.name);

const violations = [];
let scanned = 0, withEdge = 0;

for (const std of stds) {
  const dir = join(MAPS, std);
  const selfKeys = new Set([
    norm(std),
    norm(std.replace(/-\d{4}$/, '')),
    ...(ALIASES[std] || []).map(norm),
  ]);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    // document nodes ARE the reference mechanism — exempt by construction
    if (f.startsWith('doc-')) continue;
    const txt = readFileSync(join(dir, f), 'utf8');
    const fm = frontmatter(txt);
    scanned++;

    const anchors = [fm.source_document, fm.clause_reference, fm.source_anchor]
      .filter(Boolean).join(' | ');
    if (!anchors) continue;

    const hits = [...new Set((anchors.match(DESIGNATOR) || []).map((h) => h.trim()))]
      .filter((h) => {
        const n = norm(h);
        for (const k of selfKeys) if (n.includes(k) || k.includes(n)) return false;
        return true;
      });
    if (!hits.length) continue;

    const hasEdge = /references::/.test(txt);
    if (hasEdge) { withEdge++; continue; }

    violations.push({ std, node: f.replace(/\.md$/, ''), foreign: hits.join(', '),
      anchor: anchors.slice(0, 90), provenance: fm.provenance || '?' });
  }
}

const byStd = {};
for (const v of violations) (byStd[v.std] ||= []).push(v);

console.log(`CONTENT BOUNDARY SCAN — case 2 (cross-standard anchor, no reference edge)`);
console.log(`maps=${stds.length}  nodes scanned=${scanned}  ` +
            `cross-standard WITH edge=${withEdge} (ok)  VIOLATIONS=${violations.length}\n`);
const order = Object.keys(byStd).sort((a, b) => byStd[b].length - byStd[a].length);
for (const s of order) {
  console.log(`${s}  (${byStd[s].length})`);
  for (const v of byStd[s]) {
    console.log(`    ${v.node.padEnd(30)} -> ${v.foreign.padEnd(26)} [${v.provenance}]`);
    if (verbose) console.log(`        anchor: ${v.anchor}`);
  }
}
console.log(`\nTOTAL case-2 violations = ${violations.length} across ${order.length} standards`);
process.exit(0);
