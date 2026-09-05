#!/usr/bin/env node
// READ-ONLY: export the active fields (+ equations, block gates) of one standard to JSON for a
// verification pass.  Usage: node scripts/verification/export-fields.mjs <STANDARD_CODE> <out.json>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const [code, out] = process.argv.slice(2);
if (!code || !out) { console.error('usage: export-fields.mjs <STANDARD_CODE> <out.json>'); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const m = fs.readFileSync(path.join(root, '.env.local'), 'utf8').match(/^DATABASE_URL_PROD=(.+)$/m);
if (!m) { console.error('DATABASE_URL_PROD missing'); process.exit(1); }
const sql = postgres(m[1].trim().replace(/^"|"$/g, ''), {
  prepare: false, max: 1, ssl: 'require',
  connection: { default_transaction_read_only: 'on', statement_timeout: '60000' },
});
try {
  const data = await sql.begin('read only', async (tx) => {
    const std = await tx`select id, code, version from standards where code = ${code}`;
    if (!std.length) throw new Error(`standard ${code} not found`);
    const sid = std[0].id;
    const worksheets = await tx`select id, code, order_index, phase, archetype, title_de from worksheet_templates where standard_id = ${sid} order by order_index`;
    const fields = await tx`select f.id, wt.code as ws, f.symbol, f.label_de, f.data_type, f.unit, f.is_required, f.enum_values, f.clause_reference, f.description, f.verification_status, f.verification_quote, f.source_quote, f.source_anchor, f.order_index
      from fields f join worksheet_templates wt on wt.id = f.worksheet_template_id
      where wt.standard_id = ${sid} and coalesce(f.active, true) order by wt.order_index, f.order_index`;
    const equations = await tx`select e.id, wt.code as ws, e.equation_number, e.formula, e.output_symbol, e.input_symbols, e.clause_reference, e.verification_status, e.source_quote, e.verification_quote
      from equations e join worksheet_templates wt on wt.id = e.worksheet_template_id where wt.standard_id = ${sid} order by wt.order_index, e.equation_number`;
    const gates = await tx`select c.id, wt.code as ws, c.code, c.severity, c.condition, c.clause_reference, c.source_quote, c.requires_attestation
      from compliance_requirements c join worksheet_templates wt on wt.id = c.worksheet_template_id where wt.standard_id = ${sid} order by wt.order_index, c.code`;
    return { standard: std[0], worksheets, fields, equations, gates };
  });
  fs.writeFileSync(out, JSON.stringify(data, null, 1));
  console.log(`${code}: ${data.worksheets.length} worksheets, ${data.fields.length} fields, ${data.equations.length} equations, ${data.gates.length} gates -> ${out}`);
} finally { await sql.end(); }
