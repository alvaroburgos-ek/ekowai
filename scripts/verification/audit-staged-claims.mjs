#!/usr/bin/env node
// Audits the STAGED ruling files against production, to find claims that are not true.
//
// WHY. Every pack's QUOTES were spot-checked against the source before it was applied. The
// staged RULINGS were not: they are an agent's prose about production data — "this gate has
// an empty condition", "this field's unit is mg/l", "these two gates are duplicates". Those
// are factual, and therefore checkable. An owner is being asked to sign 833 of them; a claim
// that does not hold is worse than no claim, because it costs the reader their trust in the
// rest of the sheet.
//
// WHAT IS CHECKED, mechanically and read-only:
//   1. every UUID cited resolves to a row in fields / compliance_requirements / equations
//   2. a UUID cited inside a standard's file belongs to THAT standard
//   3. every gate code cited (CR-…, REQ-…) exists for that standard
//   4. claims of the shape "empty condition" / "condition = 'TRUE'" match the live row
//   5. claims of the shape "severity=block" / "is_required=true" match the live row
//
// What it deliberately does NOT check: whether a proposed change is a good idea. That is the
// owner's ruling. This only asks whether the sheet's statements of fact are true.
//
// Usage: node scripts/verification/audit-staged-claims.mjs [--json <out>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx > -1 ? process.argv[jsonIdx + 1] : null;

const m = fs.readFileSync(path.join(root, '.env.local'), 'utf8').match(/^DATABASE_URL_PROD=(.+)$/m);
if (!m) { console.error('DATABASE_URL_PROD missing'); process.exit(1); }
const sql = postgres(m[1].trim().replace(/^"|"$/g, ''), { prepare: false, max: 1, ssl: 'require' });

const order = fs.readFileSync(path.join(here, 'md-packs.order.txt'), 'utf8')
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split(/\s+/));
const codeForSlug = new Map(order.map(([file, code]) => [file.replace('-md-verification-pack.sql', ''), code]));

const findings = [];
try {
  await sql.unsafe('set default_transaction_read_only = on');

  // --- load prod once ------------------------------------------------------
  const fieldRows = await sql`
    select f.id, f.symbol, f.unit, f.is_required, f.data_type, s.code as std
    from public.fields f
    join public.worksheet_templates w on w.id = f.worksheet_template_id
    join public.standards s on s.id = w.standard_id`;
  const gateRows = await sql`
    select c.id, c.code, c.condition, c.severity, c.source_quote, s.code as std
    from public.compliance_requirements c
    join public.worksheet_templates w on w.id = c.worksheet_template_id
    join public.standards s on s.id = w.standard_id`;
  const eqRows = await sql`
    select e.id, s.code as std
    from public.equations e
    join public.worksheet_templates w on w.id = e.worksheet_template_id
    join public.standards s on s.id = w.standard_id`;

  // A staged file legitimately cites more than fields/gates/equations: its header names the
  // standard's own id, re-home blocks name worksheet templates, section moves name sections.
  // Checking only the first three produced 458 false "does not exist" errors on the first run.
  const otherRows = await sql`
    select id, 'standard' as kind, code as std from public.standards
    union all select w.id, 'worksheet_template', s.code
      from public.worksheet_templates w join public.standards s on s.id = w.standard_id
    union all select sec.id, 'worksheet_section', s.code
      from public.worksheet_sections sec
      join public.worksheet_templates w on w.id = sec.worksheet_template_id
      join public.standards s on s.id = w.standard_id`;

  const byId = new Map();
  for (const r of fieldRows) byId.set(r.id, { kind: 'field', ...r });
  for (const r of gateRows) byId.set(r.id, { kind: 'gate', ...r });
  for (const r of eqRows) byId.set(r.id, { kind: 'equation', ...r });
  for (const r of otherRows) if (!byId.has(r.id)) byId.set(r.id, r);
  // Gate codes are stored prefixed with the standard ("VDI-3814-2-1-CR-01") but the staged
  // files cite the short form ("CR-01"). Index both, or the audit reports 775 phantom
  // "code not found" warnings that are only its own literal-mindedness.
  const gateByStdCode = new Map();
  for (const r of gateRows) {
    gateByStdCode.set(`${r.std}|${r.code}`, r);
    const short = String(r.code).match(/((?:CR|REQ)-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)$/)?.[1];
    if (short && !gateByStdCode.has(`${r.std}|${short}`)) gateByStdCode.set(`${r.std}|${short}`, r);
  }

  const files = fs.readdirSync(here).filter((f) => f.endsWith('-STAGED-rulings.sql')).sort();
  for (const f of files) {
    const slug = f.replace('-STAGED-rulings.sql', '');
    const std = codeForSlug.get(slug);
    const lines = fs.readFileSync(path.join(here, f), 'utf8').split('\n');

    // A block that PROPOSES new gates numbers them beyond what exists — DIN-EN-16941-2 has 19
    // and its sheet proposes CR-20…CR-25. The trigger word ("Proposal:") sits on the heading
    // line, not on each numbered line, so a same-line test called 181 legitimate proposals
    // "codes that do not exist". Carry the context for a few lines instead.
    const proposalUntil = [];
    let carry = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/\b(proposal|propose[sd]?|new gate|add gate|insert|missing gate|neue?s? gate|anlegen|without a gate|no gate|specs? for|would read|→\s*(CR|REQ)-)/i.test(lines[i])) carry = i + 14;
      if (/^--\s*[=\-]{3,}/.test(lines[i])) carry = -1;   // a separator ends the proposal block
      proposalUntil[i] = i <= carry;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const at = `${f}:${i + 1}`;
      // A CORRECTION note records a bad id on purpose so it stays visible to the reader; it
      // spans several lines. Flagging any of them would make the audit accuse its own fix.
      if (/\bCORRECTION\b/i.test(line)) { carry = Math.max(carry, i + 6); continue; }
      if (i <= carry && /\bCORRECTION\b/i.test(lines.slice(Math.max(0, i - 6), i).join(' '))) continue;

      // 1 + 2. UUID resolves, and belongs to this standard
      for (const id of line.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []) {
        const row = byId.get(id);
        if (!row) { findings.push({ at, std, sev: 'ERROR', what: `id ${id} does not exist in fields, gates or equations` }); continue; }
        if (std && row.std !== std) {
          findings.push({ at, std, sev: 'ERROR', what: `id ${id} is a ${row.kind} of ${row.std}, not ${std}` });
        }
      }

      // 3. gate code exists for this standard. Only trust a code that looks like a citation,
      //    not a word that happens to match — require it to be delimited.
      if (std) {
        for (const code of line.match(/\b(?:CR|REQ)-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\b/g) ?? []) {
          if (!gateByStdCode.has(`${std}|${code}`)) {
            // a code may legitimately be proposed as NEW — either on this line or under a
            // "Proposal:" heading a few lines above it
            if (/\b(new|add|insert|propose|missing|neue?|anlegen)\b/i.test(line)) continue;
            if (proposalUntil[i]) continue;
            findings.push({ at, std, sev: 'WARN', what: `gate code ${code} not found for ${std}` });
          }
        }
      }
    }

    // 4 + 5. property claims — checked per gate code mentioned on the line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const at = `${f}:${i + 1}`;
      if (!std) continue;
      // A staged line often mentions a gate WITHOUT asserting the property named on the same
      // line — "none (CR-005 is empty-string)", "every gate except CR-015", "worse than CR-013
      // because IT is block", "adds nothing CR-010 does not already enforce". Naively pairing a
      // code with a nearby keyword produced 8 false accusations on the first run, two of them
      // against lines that state the sheet is RIGHT. So: skip lines that report an absence or
      // compare against another gate, and require the code to sit immediately before the claim.
      if (/\bnone\b|\bNONE\b|\bexcept\b|\bworse than\b|\bbetter than\b|\bsubset of\b|\balready\b|\bunlike\b|\bwhereas\b|\bvs\.?\b/i.test(line)) continue;
      const codes = [...new Set(line.match(/\b(?:CR|REQ)-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\b/g) ?? [])];
      if (codes.length !== 1) continue;              // ambiguous line, skip rather than guess
      // Prefer the id if the line carries one: gate CODES are not unique per standard
      // (DWA-A-222 has two rows coded CR-033, one empty and one not), so a code-only lookup
      // can accuse a sheet that was precise enough to cite the id.
      const idOnLine = (line.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? [])
        .map((x) => byId.get(x)).find((r) => r && r.kind === 'gate');
      const g = idOnLine ?? gateByStdCode.get(`${std}|${codes[0]}`);
      if (!g) continue;
      const claimIdx = line.search(/empty condition|condition\s*=|block gate|severity\s*=|source_quote/i);
      const codeIdx = line.indexOf(codes[0]);
      if (!idOnLine && (codeIdx < 0 || claimIdx < 0 || claimIdx < codeIdx || claimIdx - codeIdx > 80)) continue;
      const cond = (g.condition ?? '').trim();

      if (/\bempty condition\b|condition\s*=\s*''|leere?\s+Bedingung/i.test(line) && cond !== '') {
        findings.push({ at, std, sev: 'ERROR', what: `${codes[0]} claimed to have an empty condition; live condition is "${cond.slice(0, 60)}"` });
      }
      if (/condition\s*=\s*'?TRUE'?/i.test(line) && cond.toUpperCase() !== 'TRUE') {
        findings.push({ at, std, sev: 'ERROR', what: `${codes[0]} claimed condition='TRUE'; live condition is "${cond.slice(0, 60)}"` });
      }
      if (/\bblock gate\b|severity\s*=\s*'?block/i.test(line) && g.severity !== 'block') {
        findings.push({ at, std, sev: 'ERROR', what: `${codes[0]} called a block gate; live severity is "${g.severity}"` });
      }
      if (/\bno source_quote\b|source_quote\s*(is|=)\s*NULL/i.test(line) && g.source_quote != null && String(g.source_quote).trim() !== '') {
        findings.push({ at, std, sev: 'ERROR', what: `${codes[0]} claimed to have no source_quote; live row has one` });
      }
    }
  }
} finally { await sql.end(); }

const errors = findings.filter((f) => f.sev === 'ERROR');
const warns = findings.filter((f) => f.sev === 'WARN');
console.log(`claims audit: ${errors.length} ERROR, ${warns.length} WARN`);
for (const f of errors.slice(0, 60)) console.log(`  ERROR ${f.at}  ${f.what}`);
if (errors.length > 60) console.log(`  … ${errors.length - 60} more errors`);
const warnByStd = new Map();
for (const w of warns) warnByStd.set(w.std, (warnByStd.get(w.std) ?? 0) + 1);
for (const [s, n] of [...warnByStd].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  WARN  ${s}: ${n} gate code(s) cited that do not exist`);
}
if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify(findings, null, 2));
  console.log(`\nfull list -> ${jsonOut}`);
}
