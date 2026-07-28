#!/usr/bin/env node
/**
 * Generate reasoning-map nodes for orphan DB compliance_requirements — CR rows that exist in
 * prod but have no map node (validator `2.cr-db-has-node`). A wave-0 generation gap: those
 * maps were built without CR nodes. The map is meant to be the single truthful mirror of
 * prod, so a CR in prod with no node is genuine map-incompleteness.
 *
 * HONESTY CONTRACT — this generator MIRRORS, it never invents:
 *  - every field comes from the DB row (code, condition, severity, clause_reference,
 *    source_quote, worksheet); nothing is synthesised.
 *  - provenance is CONSERVATIVE and never VA: VC when the row carries a substantive
 *    source_quote (verified against the encoding, NOT against a rendered PDF this session),
 *    EV when it does not. A later per-standard wave lifts VC→VA by reading the PDF.
 *  - crCode is written verbatim as an authoritative frontmatter field (validate.mjs prefers
 *    it over title-regex), so irregular codes (COMP-18, C363-23, CR-M732-04) match cleanly.
 *  - node_type = reference-only when the condition is a non-gating placeholder
 *    (manual/manual_check/prose), else compliance_requirement.
 *  - gated_by:: links to the section node whose owner_worksheet matches the CR's worksheet,
 *    when one exists (graph completeness; not required to clear the error).
 *
 * Only writes nodes that are ABSENT. Idempotent: re-running creates nothing new.
 *
 * Usage:
 *   node generate-cr-nodes.mjs --std ISO-9001 [--dry-run]
 *   node generate-cr-nodes.mjs --all [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REF = 'vadsmshzebefjreqcicl';
const MAPS = 'C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps';
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const onlyStd = (() => { const i = argv.indexOf('--std'); return i >= 0 ? argv[i + 1] : null; })();
const doAll = argv.includes('--all');
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(2); }
if (!onlyStd && !doAll) { console.error('need --std <code> or --all'); process.exit(2); }

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

// Map DB standard code -> map directory name (they match except the FLL-Naturteich alias).
const DIR_ALIAS = { 'FLL-Naturteich': 'FLL-Naturteich-2017' };
const dirFor = (code) => DIR_ALIAS[code] || code;

const stdFilter = onlyStd ? `and s.code = '${onlyStd}'` : '';
const rows = await query(`
  select s.code as std, c.code as cr, c.condition, c.severity, c.clause_reference,
         c.source_quote, w.code as ws, w.title_de as ws_title
  from compliance_requirements c
  join worksheet_templates w on w.id = c.worksheet_template_id
  join standards s on s.id = w.standard_id
  where true ${stdFilter}
  order by s.code, c.code;`);

// group by standard
const byStd = new Map();
for (const r of rows) {
  if (!byStd.has(r.std)) byStd.set(r.std, []);
  byStd.get(r.std).push(r);
}

const esc = (s) => String(s == null ? '' : s).replace(/"/g, "'").replace(/\r?\n/g, ' ').trim();
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const NONGATING = /^(manual|manual_check|manual_check_against|n\/?a|prose|-|)$/i;

let totCreated = 0, totSkipped = 0, totNoDir = 0;
const perStd = [];

for (const [std, crs] of byStd) {
  const dir = join(MAPS, dirFor(std));
  if (!existsSync(dir)) { totNoDir += crs.length; perStd.push(`${std}: NO MAP DIR (${crs.length} CRs)`); continue; }
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));

  // existing CR codes already present. MUST mirror validate.mjs's detection or we create
  // duplicates: older nodes carry the code only in their title (no crCode: frontmatter) and
  // use varied filenames. Detect by (a) explicit crCode: frontmatter, then (b) the same
  // title-regex family the validator uses.
  const present = new Set();
  const sectionByWs = new Map();
  // MUST stay identical to validate.mjs extractCrCode (broadened suffix classes), or
  // present-detection diverges from what the validator matches and we regenerate dups.
  function codeFromTitle(title) {
    let m = title.match(/([A-Z0-9]+(?:-[A-Z0-9]+)*-CR-[A-Za-z0-9-]+)/); if (m) return m[1];
    m = title.match(/(A138-REQ-[A-Za-z0-9-]+|REQ-[A-Za-z0-9-]+)/); if (m) return m[1];
    m = title.match(/\bCR-[0-9]+[a-z]?\b/); if (m) return m[0];
    m = title.match(/\b(COMP-[0-9]+|C[0-9]+-[0-9]+|CR-[A-Z][0-9]+-[0-9]+)\b/); if (m) return m[1];
    return null;
  }
  for (const f of files) {
    const t = readFileSync(join(dir, f), 'utf8').slice(0, 2000);
    if (!/node\/compliance_requirement/.test(t)) {
      const ow0 = t.match(/^owner_worksheet:\s*(.+)$/m);
      if ((/node\/section/.test(t) || f.startsWith('section-')) && ow0) sectionByWs.set(ow0[1].trim(), f.replace(/\.md$/, ''));
      continue;
    }
    const cc = t.match(/^crCode:\s*(.+)$/m);
    if (cc) { present.add(cc[1].trim()); continue; }
    const tt = t.match(/^title:\s*"?(.+?)"?\s*$/m);
    const code = tt ? codeFromTitle(tt[1]) : codeFromTitle(f);
    if (code) present.add(code);
  }

  let created = 0, skipped = 0;
  for (const cr of crs) {
    if (present.has(cr.cr)) { skipped++; continue; }
    const nodeType = NONGATING.test((cr.condition || '').trim()) ? 'reference-only' : 'compliance_requirement';
    const hasQuote = cr.source_quote && cr.source_quote.replace(/[^a-z0-9]/gi, '').length >= 12;
    const prov = hasQuote ? 'VC' : 'EV';
    const fname = `cr-${slug(std)}-${slug(cr.cr)}.md`;
    if (existsSync(join(dir, fname))) { skipped++; continue; }
    const sect = sectionByWs.get(cr.ws);
    const quoteBlock = cr.source_quote
      ? `\n**Source quote (as encoded — VC, not PDF-verified this pass):**\n> ${esc(cr.source_quote).slice(0, 600)}\n`
      : `\n**Source quote.** None stored — provenance EV; a per-standard wave lifts this to VA by reading the printed clause.\n`;
    const body = `---
title: "${std} ${cr.cr} — ${esc(cr.ws_title).slice(0, 60)}"
created: 2026-07-28
tags: [type/reasoning-map, std/${slug(std)}, node/compliance_requirement, status/active]
status: active
source_document: ${std}
owner_worksheet: ${cr.ws}
provenance: ${prov}
provenance_date: 2026-07-28
verification_method: db-mirror
data_class: engineer_input
severity: ${esc(cr.severity) || 'warn'}
crCode: ${cr.cr}
node_type: ${nodeType}
clause_reference: "${esc(cr.clause_reference)}"
ratification_status: unratified
generated: cr-node-backfill-2026-07-28
---
# ${std} ${cr.cr}

**What it is.** Compliance requirement **${cr.cr}** on worksheet **${cr.ws}**
(${esc(cr.ws_title)}), severity \`${esc(cr.severity) || 'warn'}\`, clause ${esc(cr.clause_reference) || '(none)'}.
Condition (as encoded): \`${esc(cr.condition).slice(0, 200) || '(none)'}\`.

**Provenance.** DB-MIRROR node (generated 2026-07-28 to close a wave-0 map-completeness gap:
the CR existed in prod with no map node). Faithfully mirrors the prod row; nothing invented.
Grade **${prov}** — ${hasQuote ? 'the encoding carries a source_quote (verified vs the encoding, not the rendered PDF)' : 'no source_quote stored'}.
${quoteBlock}${sect ? `\n### Typed links\n- \`gated_by::\` [[${sect}]]\n` : ''}`;
    if (!dryRun) writeFileSync(join(dir, fname), body, 'utf8');
    created++;
  }
  totCreated += created; totSkipped += skipped;
  perStd.push(`${std}: +${created} created, ${skipped} present`);
}

console.log(`${dryRun ? 'DRY RUN — ' : ''}created ${totCreated}, present ${totSkipped}, no-dir ${totNoDir}`);
for (const l of perStd) console.log('  ' + l);
