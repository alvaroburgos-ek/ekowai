#!/usr/bin/env node
// Triages the staged ruling blocks into severity tiers so the owner can ratify the ones that actually
// stop or corrupt a real project first, instead of reading 833 blocks end to end.
//
// Tier 1 BLOCKS A PROJECT   — a gate no correct entry can satisfy, so a project can never be finalised.
// Tier 2 WRONG NUMBERS      — a unit/factor defect, or a value the guideline never prints, so the Wizard
//                             emits a plausible but wrong figure into a compliance document.
// Tier 3 ENFORCES NOTHING   — a gate that always passes: no false document, but no protection either.
// Tier 4 EVERYTHING ELSE    — severity notes, clause retags, required-flag reviews, quote repairs.
//
// Tiers are assigned from the block's own text, so the classification is auditable against the file.
// Usage: node scripts/verification/triage-rulings.mjs <out.md>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
if (!out) { console.error('usage: triage-rulings.mjs <out.md>'); process.exit(1); }

const order = fs.readFileSync(path.join(here, 'md-packs.order.txt'), 'utf8')
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split(/\s+/)[1]);
const codeOf = (slug) => order.find((c) => c && c.toLowerCase().replace(/[^a-z0-9]/g, '') === slug.replace(/[^a-z0-9]/g, '')) ?? slug.toUpperCase();

// Signatures are deliberately specific. A block matches a tier only if its own words say so.
const TIERS = [
  { n: 1, name: 'Blocks a real project',
    // "can never PASS" = the project is stuck (tier 1). "can never FIRE" = the gate is dead (tier 3).
    // They are opposite consequences and must not share a signature.
    re: /unsatisfiable|can never (?:pass|be satisfied|succeed)|never be satisfied|permanently blocked|blocked forever|no correct entry|cannot pass|unreachable (?:printed )?case|makes .{0,40}unreachable|raw-?(?:wastewater|value).{0,60}effluent|not (?:a member of|in) the enum|uncovered enum|conditional as (?:an? )?(?:unconditional )?conjunction|complement of the printed/i },
  { n: 2, name: 'Produces a wrong number',
    re: /factor[ -]?(?:of[ -]?)?(?:60|24|1000|1\.000|3[.,]6|10\^|3600|10 ?000)|out by a factor|dimensional(?:ly)? (?:impossible|defect|does not close)|does not close dimensional|under-?sizes?|over-?sizes?|kg.{0,25}(?:vs|into|written to).{0,25}(?:tonne|t CO)|invented (?:limit|value|range|threshold|interval)|never prints|appears nowhere|occurs? 0 times|grep.{0,20}0 hits|source-?less threshold|unioning|union of two printed|always zero|structurally zero|consumed by nothing.{0,60}total|never reaches? the total/i },
  { n: 3, name: 'Enforces nothing',
    re: /condition\s*=\s*'?TRUE|no-?op|enforces? nothing|tautolog|presence-?only|IS NOT NULL on a boolean|whole enum domain|entire (?:enum )?domain|always pass|can never fail|strict subset|duplicate gate/i },
];

const files = fs.readdirSync(here).filter((f) => f.endsWith('-STAGED-rulings.sql')).sort();
const TICK = /[☐\[(][ xX]?[\])]?\s*RATIFIED/i;
const found = [[], [], [], []];

for (const f of files) {
  const code = codeOf(f.replace('-STAGED-rulings.sql', ''));
  const lines = fs.readFileSync(path.join(here, f), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('--') || !TICK.test(lines[i])) continue;
    if (/\b(marker|tick|box|only after|before the|un-?comment|may be executed|nothing in this file)\b/i.test(lines[i])) continue;
    // A line that is only a row of sub-option tick-boxes — "(a) ☐ (b) ☐ (c) ☐" — belongs to the block
    // above it; counting it separately would list the same decision twice under a meaningless title.
    if (/^--[\s☐\[\]()a-z0-9.,·:—–-]*$/i.test(lines[i]) && (lines[i].match(/☐/g) ?? []).length > 1
        && !/RATIFIED[^☐]*☐[^☐]*REJECTED/i.test(lines[i])) continue;
    // the block's text = its heading line plus the comment lines under it, up to the next tick
    // Read only this block: from its own heading (one line back at most, and never across a separator)
    // to the next tick-box. A wider window lets a neighbouring block's wording decide this block's tier.
    const chunk = [];
    if (i > 0 && lines[i - 1].startsWith('--') && !/^--\s*[=\-]{3,}/.test(lines[i - 1]) && !TICK.test(lines[i - 1])) {
      chunk.push(lines[i - 1].replace(/^--\s?/, ''));
    }
    for (let j = i; j < lines.length && j < i + 25; j++) {
      if (j > i && (TICK.test(lines[j]) || /^--\s*[=\-]{3,}/.test(lines[j]))) break;
      if (lines[j].startsWith('--')) chunk.push(lines[j].replace(/^--\s?/, ''));
    }
    const text = chunk.join(' ');
    let title = lines[i].replace(/^--\s*/, '').replace(TICK, ' ').replace(/[☐\[(][ xX]?[\])]?\s*(REJECTED|DEFER)/gi, ' ')
      .replace(/_{2,}/g, ' ').replace(/\s{2,}/g, ' ').trim().replace(/^[·:.)\-–—\s]+/, '');
    if (title.length < 4) {
      for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
        const prev = lines[j].replace(/^--\s*/, '').replace(/_{2,}/g, ' ').trim();
        if (prev && !/^[=\-]{3,}$/.test(prev)) { title = prev.replace(TICK, '').trim(); break; }
      }
    }
    // A block that proposes nothing cannot be blocking anything, whatever words it uses to describe the
    // defect it is merely recording. Those belong in tier 4 even when they discuss an unsatisfiable gate.
    const inert = /\b(no SQL|acknowledgement only|no change (?:is )?proposed|observation only|recorded,? not|evidence only|negative result|nothing to do|for the record)\b/i.test(text);
    const tier = inert ? null : TIERS.find((t) => t.re.test(text));
    found[(tier?.n ?? 4) - 1].push({ code, file: f, title: title.slice(0, 190), line: i + 1, inert });
  }
}

// Named by the orchestrator from the per-standard verification reports, not by pattern match. The tiers
// below are a completeness net; this list is the one that must not depend on a regex catching a phrase.
// Several of these are worded in German in their staged file and no English signature would find them.
const HEADLINE = [
  ['ISO-14064-2', 'B-1', 'Project and baseline emissions sum the SAME symbol with no scenario discriminator, so the emission reduction — the standard\'s whole output — computes as zero for every project.'],
  ['DWA-M-732', 'S-5(a)', 'CR-M732-05 compares RAW-wastewater values against EFFLUENT limits. Correctly entered data can never pass; the effluent fields it should read do not exist.'],
  ['DWA-M-179-1', 'S-3', 'REQ-30 requires an operating-instruction status that is not in its own enum. Finalize is permanently blocked on that worksheet.'],
  ['VDI-2163', 'BLOCK 1', 'CR-15 encodes "for NEW plants an initial inspection is required" as a conjunction, so every EXISTING plant is blocked and that enum value can never pass.'],
  ['VDI-3477', 'BLOCK 1', 'CR-19 makes the pre-scrubber limits unconditional, so a plant that legitimately has no pre-scrubber can never comply.'],
  ['HOAI-2021', 'S-2', 'CR-16 blocks every NON-consumer project; the Hinweispflicht applies only when the client IS a consumer.'],
  ['ISO-9001', 'R-02', 'Declared chapter-7 exclusions are recorded but no gate reads them, while 14 chapter-7 gates block unconditionally. A firm that legitimately excludes design can never reach a verdict.'],
  ['DWA-M-381E', 'R-9', 'Thickener area does not close dimensionally and UNDER-SIZES by a factor of 24.'],
  ['DWA-M-229-1', 'S-16', 'Blower flow Gl.(29) is printed per minute but the formula yields per hour — factor 60, propagating into blower power.'],
  ['DWA-M-229-1', 'S-20', 'The intermittent-operation factor f_int is computed and never applied, so SOTR comes out 127 instead of the printed 172 kg/h — plants are under-sized.'],
  ['DWA-A-226', 'S-1 / S-2', 'Two equations are dimensionally wrong: air flow by 1000x, clarifier area by 3.6x. The guideline\'s own worked example proves both.'],
  ['ISO-14064-1', 'E-1 / E-2 / E-4', 'Emission factors in kg written into tonne-declared fields (1000x), and imported-electricity emissions never reach the total.'],
  ['DWA-M-179-1', 'S-12', 'One area in m2, two summary copies in ha — the critical-flow equation is out by 10 000x if a copy is used.'],
  ['DWA-M-760', 'S-11', 'Three separator sizing factors carry descriptions asserting text as verbatim that does not occur in the document at all.'],
  ['DWA-M-349', 'R-2', 'CR-013 enforces an oxygen limit the guideline expressly declines to set, and which contradicts three of its own printed operating points.'],
];

const L = ['---', 'title: "Ruling sheet — what to ratify first"', `created: ${new Date().toISOString().slice(0, 10)}`,
  'tags: [project/ekowai-wizard, type/decision-batch, status/awaiting-signature]', 'status: awaiting-signature', '---', '',
  '# What to ratify first', '',
  'The full sheet has 833 blocks. This is the same set, ordered by what a block actually costs you if it',
  'stays unratified. Tiers come from each block\'s own wording, so you can check the call against the file.',
  'Nothing here is applied. Tick in the full sheet or in the per-standard file; both name the same block.', ''];
L.push('## Start here — the 15 findings that cost you something real', '',
  'Named from the per-standard verification reports rather than by pattern match, because several are',
  'worded in German in their file and no keyword search would surface them. Each names its block id.', '');
for (const [code, id, why] of HEADLINE) {
  L.push(`- **${code} · ${id}** — ${why}  `, '  ☐ RATIFIED  ☐ REJECTED  ☐ DEFER');
}
L.push('', '---', '',
  'The tiers below are a completeness net over all 833 blocks, assigned from each block\'s own wording.',
  'Expect some overlap with the list above, and treat a tier as a reading order, not a verdict.', '');
L.push('| Tier | Meaning | Blocks |', '|---|---|--:|');
for (const t of TIERS) L.push(`| ${t.n} | ${t.name} | ${found[t.n - 1].length} |`);
L.push(`| 4 | Everything else (severity notes, retags, quote repairs, required flags) | ${found[3].length} |`, '');

for (const t of [...TIERS, { n: 4, name: 'Everything else' }]) {
  const rows = found[t.n - 1];
  if (!rows.length) continue;
  L.push(`## Tier ${t.n} — ${t.name} (${rows.length})`, '');
  if (t.n === 4) {
    const byCode = new Map();
    for (const r of rows) byCode.set(r.code, (byCode.get(r.code) ?? 0) + 1);
    L.push('Grouped by standard; read these per standard when you work that standard, not in one sitting.', '',
      '| Standard | Blocks | File |', '|---|--:|---|');
    for (const [c, n] of [...byCode].sort((a, b) => b[1] - a[1])) {
      L.push(`| ${c} | ${n} | \`scripts/verification/${rows.find((r) => r.code === c).file}\` |`);
    }
    L.push('');
    continue;
  }
  for (const r of rows) {
    L.push(`- **${r.code}** — ${r.title}  `, `  \`${r.file}\` line ${r.line} · ☐ RATIFIED  ☐ REJECTED  ☐ DEFER`);
  }
  L.push('');
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, L.join('\n'));
console.log(`tier1=${found[0].length} tier2=${found[1].length} tier3=${found[2].length} tier4=${found[3].length} -> ${out}`);
