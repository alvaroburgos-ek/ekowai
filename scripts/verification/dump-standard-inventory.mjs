#!/usr/bin/env node
// READ-ONLY inventory of one standard for the hint pipeline: per worksheet its active fields, equations and compliance
// requirements with the descriptions as stored today (the rollback of a hint block restores exactly these texts).
// Usage: node scripts/verification/dump-standard-inventory.mjs <STANDARD_CODE> <out.json>
// Auth: DATABASE_URL_PROD from .env.local, read at runtime, NEVER printed. Read-only transaction (default_transaction_read_only=on).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [code, out] = process.argv.slice(2);
if (!code || !out) { console.error('usage: dump-standard-inventory.mjs <STANDARD_CODE> <out.json>'); process.exit(1); }
const envText = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
const m = envText.match(/^DATABASE_URL_PROD=(.+)$/m);
if (!m) { console.error('DATABASE_URL_PROD not found in .env.local'); process.exit(1); }
const url = m[1].trim().replace(/^"|"$/g, '');
const sql = postgres(url, { prepare: false, max: 1, ssl: 'require', connection: { default_transaction_read_only: 'on', statement_timeout: '60000' } });

try {
  const ws = await sql`select w.id, w.code, w.title_de, w.title_en, w.phase, w.order_index
    from worksheet_templates w join standards s on s.id = w.standard_id where s.code = ${code} order by w.phase, w.order_index, w.code`;
  const inv = {};
  for (const w of ws) {
    const fields = await sql`select f.symbol, f.label_de, f.label_en, f.unit, f.data_type, f.is_required, f.clause_reference, f.description,
        f.widget, f.enum_values, f.visible_when, f.consumer_worksheets, coalesce(sec.code, null) as section
      from fields f left join worksheet_sections sec on sec.id = f.section_id
      where f.worksheet_template_id = ${w.id} and f.active order by f.order_index, f.symbol`;
    const equations = await sql`select e.equation_number, e.formula, e.output_symbol, e.input_symbols, e.description, e.clause_reference
      from equations e where e.worksheet_template_id = ${w.id} order by e.equation_number`;
    const gates = await sql`select cr.code, cr.title_de, cr.title_en, cr.condition, cr.severity, cr.clause_reference, cr.description, cr.suggestion
      from compliance_requirements cr where cr.worksheet_template_id = ${w.id} order by cr.code`;
    inv[w.code] = {
      title: w.title_de,
      title_en: w.title_en,
      phase: w.phase,
      fields: fields.map((f) => ({
        symbol: f.symbol, label_de: f.label_de, label_en: f.label_en, unit: f.unit, type: f.data_type, required: f.is_required,
        clause: f.clause_reference, description: f.description, widget: f.widget, section: f.section,
        visible_when: f.visible_when ?? null, consumers: f.consumer_worksheets ?? null,
        enum: Array.isArray(f.enum_values) ? f.enum_values.map((e) => ({ value: e.value, label_de: e.label_de ?? null, label_en: e.label_en ?? null })) : null,
      })),
      equations: equations.map((e) => ({ no: e.equation_number, formula: e.formula, output: e.output_symbol, inputs: e.input_symbols, clause: e.clause_reference, description: e.description })),
      gates: gates.map((g) => ({ code: g.code, title_de: g.title_de, title_en: g.title_en, condition: g.condition, severity: g.severity, clause: g.clause_reference, description: g.description, suggestion: g.suggestion })),
    };
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(inv, null, 1));
  const n = (k) => Object.values(inv).reduce((a, w) => a + w[k].length, 0);
  console.log(`${code}: ${ws.length} worksheets, ${n('fields')} fields, ${n('equations')} equations, ${n('gates')} gates → ${out}`);
} finally {
  await sql.end();
}
