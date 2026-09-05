#!/usr/bin/env node
// READ-ONLY: generate the per-standard FORM GUIDE (Ausfüllhilfe) from prod — one markdown file per standard:
// worksheet by worksheet, every field with unit / allowed values / required / what the guideline says
// (verification_quote) / which equations and gates use it. Equations and gates are listed per worksheet
// with their verbatim source quote. Regenerate any time; the DB is the source of truth.
// Usage: node scripts/verification/export-form-guide.mjs <STANDARD_CODE> <out.md> [--lang de|en]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const [code, out, ...rest] = process.argv.slice(2);
if (!code || !out) { console.error('usage: export-form-guide.mjs <STANDARD_CODE> <out.md> [--lang de|en]'); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const m = fs.readFileSync(path.join(root, '.env.local'), 'utf8').match(/^DATABASE_URL_PROD=(.+)$/m);
if (!m) { console.error('DATABASE_URL_PROD missing'); process.exit(1); }
const sql = postgres(m[1].trim().replace(/^"|"$/g, ''), {
  prepare: false, max: 1, ssl: 'require',
  connection: { default_transaction_read_only: 'on', statement_timeout: '60000' },
});

const OK = new Set(['verified_against_standard', 'engineer_verified', 'corrected']);
const EXEMPT = new Set(['inferred_from_worksheet']);
const esc = (s) => (s == null ? '' : String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' '));
const short = (s, n = 420) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s);

try {
  const d = await sql.begin('read only', async (tx) => {
    const [std] = await tx`select id, code, title_de, title_en, version, issued_year from standards where code = ${code}`;
    if (!std) throw new Error(`standard ${code} not found`);
    const ws = await tx`select id, code, order_index, phase, archetype, title_de, description from worksheet_templates where standard_id = ${std.id} order by order_index`;
    const fields = await tx`select f.*, wt.code as ws from fields f join worksheet_templates wt on wt.id = f.worksheet_template_id where wt.standard_id = ${std.id} and coalesce(f.active, true) order by wt.order_index, f.order_index, f.symbol`;
    const eqs = await tx`select e.*, wt.code as ws from equations e join worksheet_templates wt on wt.id = e.worksheet_template_id where wt.standard_id = ${std.id} order by wt.order_index, e.equation_number`;
    const gates = await tx`select c.*, wt.code as ws from compliance_requirements c join worksheet_templates wt on wt.id = c.worksheet_template_id where wt.standard_id = ${std.id} order by wt.order_index, c.code`;
    const maint = await tx`select title, category, interval_text, clause_reference, source_quote from maintenance_schedules where standard_id = ${std.id} and coalesce(active, true) order by category, title`;
    return { std, ws, fields, eqs, gates, maint };
  });

  // symbol → producers/consumers
  const producedBy = new Map(); const consumedBy = new Map(); const gatedBy = new Map();
  for (const e of d.eqs) {
    if (e.output_symbol) (producedBy.get(e.output_symbol) ?? producedBy.set(e.output_symbol, []).get(e.output_symbol)).push(e.equation_number);
    for (const s of e.input_symbols ?? []) (consumedBy.get(s) ?? consumedBy.set(s, []).get(s)).push(e.equation_number);
  }
  const symbols = new Set(d.fields.map((f) => f.symbol));
  for (const g of d.gates) {
    const toks = (g.condition ?? '').match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
    for (const t of new Set(toks)) if (symbols.has(t)) (gatedBy.get(t) ?? gatedBy.set(t, []).get(t)).push(g.code);
  }

  const nF = d.fields.length, nV = d.fields.filter((f) => OK.has(f.verification_status)).length, nX = d.fields.filter((f) => EXEMPT.has(f.verification_status)).length;
  const L = [];
  L.push(`---`, `title: "Form guide — ${d.std.code} (${esc(d.std.title_de)})"`, `created: ${new Date().toISOString().slice(0, 10)}`, `tags: [project/ekowai-wizard, type/form-guide, standard/${d.std.code.toLowerCase()}]`, `status: active`, `generated_from: prod ${new Date().toISOString()}`, `---`, ``);
  L.push(`# Form guide · ${d.std.code}`, ``, `**${esc(d.std.title_de)}**${d.std.title_en ? ` · ${esc(d.std.title_en)}` : ''} · edition ${esc(d.std.version)}${d.std.issued_year ? ` (${d.std.issued_year})` : ''}`, ``);
  L.push(`Generated from the production Wizard database. Every row is what the form asks for; the "Guideline says" column is the verbatim sentence the field was verified against (blank = not yet verified — the finalize gate will list it). Fill the worksheets in order; a worksheet can be approved when every **required** field has a value and every **block** gate passes.`, ``);
  L.push(`| Worksheets | Fields | Verified | App-only (exempt) | Open | Equations | Block gates | Warn gates |`, `|---|---|---|---|---|---|---|---|`);
  L.push(`| ${d.ws.length} | ${nF} | ${nV} | ${nX} | ${nF - nV - nX} | ${d.eqs.length} | ${d.gates.filter((g) => g.severity === 'block').length} | ${d.gates.filter((g) => g.severity === 'warn').length} |`, ``);

  L.push(`## Path through the standard`, ``, `| # | Worksheet | Phase | Kind | Fields (required) | Equations | Block gates |`, `|---|---|---|---|---|---|---|`);
  for (const w of d.ws) {
    const fs_ = d.fields.filter((f) => f.ws === w.code);
    L.push(`| ${w.order_index} | **${w.code}** ${esc(w.title_de)} | ${w.phase ?? ''} | ${w.archetype ?? ''} | ${fs_.length} (${fs_.filter((f) => f.is_required).length}) | ${d.eqs.filter((e) => e.ws === w.code).length} | ${d.gates.filter((g) => g.ws === w.code && g.severity === 'block').length} |`);
  }
  L.push(``);

  for (const w of d.ws) {
    const fs_ = d.fields.filter((f) => f.ws === w.code);
    const es_ = d.eqs.filter((e) => e.ws === w.code);
    const gs_ = d.gates.filter((g) => g.ws === w.code);
    L.push(`## ${w.code} · ${esc(w.title_de)}`, ``);
    if (w.description) L.push(`> ${esc(w.description)}`, ``);
    if (fs_.length) {
      L.push(`### Fields`, ``, `| Field | Enter | Unit | Required | Allowed values | Clause | Guideline says | Used by |`, `|---|---|---|---|---|---|---|---|`);
      for (const f of fs_) {
        const ev = Array.isArray(f.enum_values) ? f.enum_values.map((v) => `\`${v.value}\` ${esc(v.label_de ?? v.label_en ?? '')}`).join('; ') : '';
        const used = [...(producedBy.get(f.symbol) ?? []).map((x) => `← ${x}`), ...(consumedBy.get(f.symbol) ?? []).map((x) => `→ ${x}`), ...(gatedBy.get(f.symbol) ?? []).map((x) => `⛔ ${x}`)].join(' ');
        const status = OK.has(f.verification_status) ? '' : EXEMPT.has(f.verification_status) ? '*(app-only)* ' : `*(${f.verification_status})* `;
        L.push(`| \`${f.symbol}\` | **${esc(f.label_de)}** | ${esc(f.unit ?? '')} | ${f.is_required ? '✔' : ''} | ${ev} | ${esc(f.clause_reference ?? '')} | ${status}${esc(short(f.verification_quote))} | ${used} |`);
      }
      L.push(``);
    }
    if (es_.length) {
      L.push(`### Equations`, ``, `| No. | Formula | Output | Clause | Source says |`, `|---|---|---|---|---|`);
      for (const e of es_) L.push(`| ${esc(e.equation_number)} | \`${esc(e.formula)}\` | \`${esc(e.output_symbol ?? '')}\`${e.output_unit ? ` [${esc(e.output_unit)}]` : ''} | ${esc(e.clause_reference ?? '')} | ${esc(short(e.verification_quote ?? e.source_quote))} |`);
      L.push(``);
    }
    if (gs_.length) {
      L.push(`### Compliance gates`, ``, `| Gate | Severity | Condition | Clause | Source says |`, `|---|---|---|---|---|`);
      for (const g of gs_) L.push(`| ${esc(g.code)}${g.requires_attestation ? ' (attest)' : ''} | ${g.severity} | \`${esc(g.condition)}\` | ${esc(g.clause_reference ?? '')} | ${esc(short(g.source_quote))} |`);
      L.push(``);
    }
  }
  if (d.maint.length) {
    L.push(`## Maintenance duties (Wartungsplan library)`, ``, `| Duty | Category | Interval | Clause | Source says |`, `|---|---|---|---|---|`);
    for (const x of d.maint) L.push(`| ${esc(x.title)} | ${esc(x.category ?? '')} | ${esc(x.interval_text ?? '')} | ${esc(x.clause_reference ?? '')} | ${esc(short(x.source_quote))} |`);
    L.push(``);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, L.join('\n'));
  console.log(`${d.std.code}: ${d.ws.length} worksheets, ${nF} fields (${nV} verified, ${nX} exempt, ${nF - nV - nX} open), ${d.eqs.length} equations, ${d.gates.length} gates -> ${out}`);
} finally { await sql.end(); }
