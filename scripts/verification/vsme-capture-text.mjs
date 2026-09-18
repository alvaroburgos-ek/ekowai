#!/usr/bin/env node
// READ-ONLY full-text capture for VSME (Plan 3 Task 24). Same mechanics as scripts/verification/prod-query.mjs
// (DATABASE_URL_PROD from .env.local at runtime, NEVER printed; READ ONLY transaction) but writes FULL cells (no
// 120-char truncation) to src/lib/eval/field-configs/vsme.text.prior.json — the only quotable VSME text (grade EV).
// Usage: node scripts/verification/vsme-capture-text.mjs   (committed so the capture is re-executable — R-1)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envText = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
const m = envText.match(/^DATABASE_URL_PROD=(.+)$/m);
if (!m) { console.error('DATABASE_URL_PROD not found in .env.local'); process.exit(1); }
const url = m[1].trim().replace(/^"|"$/g, '');
const sql = postgres(url, { prepare: false, max: 1, ssl: 'require',
  connection: { default_transaction_read_only: 'on', statement_timeout: '60000' } });
const Q = {
  standard: `select id, code, version, title_de, title_en from standards where code = 'VSME'`,
  worksheets: `select w.id, w.code, w.title_de, w.title_en, w.order_index from worksheet_templates w join standards s on s.id = w.standard_id where s.code = 'VSME' order by w.code`,
  sections: `select w.code as worksheet, ws.id, ws.code, ws.title_de, ws.title_en, ws.order_index, ws.parent_section_id from worksheet_sections ws join worksheet_templates w on w.id = ws.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'VSME' order by w.code, ws.order_index`,
  fields: `select w.code as worksheet, f.id, f.symbol, f.label_de, f.label_en, f.data_type, f.unit, f.is_required, f.clause_reference, f.description, f.consumer_worksheets, f.order_index, f.verification_status, f.verification_quote, f.source_quote, f.active, f.default_value, f.xbrl_element_id, ws.code as section_code, case when f.enum_values is null then null else jsonb_array_length(f.enum_values) end as enum_count
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id left join worksheet_sections ws on ws.id = f.section_id where s.code = 'VSME' order by w.code, f.order_index, f.symbol`,
  requirements: `select w.code as worksheet, cr.id, cr.code, cr.title_de, cr.title_en, cr.condition, md5(cr.condition) as condition_md5, cr.clause_reference, cr.severity, cr.description, cr.suggestion, cr.source_quote, cr.requires_attestation
from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'VSME' order by w.code, cr.code`,
  equations: `select w.code as worksheet, e.id, e.equation_number, e.formula, md5(e.formula) as formula_md5, e.formula_latex, e.input_symbols, e.output_symbol, e.output_unit, e.clause_reference, e.description, e.verification_status, e.verification_quote, e.source_quote
from equations e join worksheet_templates w on w.id = e.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'VSME' order by w.code, e.equation_number`,
  stored: `select count(*)::int as n from project_parameters pp join fields f on f.id = pp.field_id join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'VSME'`,
  instances: `select count(*)::int as n from worksheet_instances wi join worksheet_templates w on w.id = wi.worksheet_template_id join standards s on s.id = w.standard_id where s.code = 'VSME'`,
};
const out = { _meta: { command: 'node scripts/verification/vsme-capture-text.mjs', captured_at: new Date().toISOString(), standard: 'VSME', source: 'prod (READ ONLY transaction, DATABASE_URL_PROD from .env.local)' } };
try {
  await sql.begin('read only', async (tx) => {
    for (const [k, q] of Object.entries(Q)) {
      try { out[k] = await tx.unsafe(q); } catch (e) { out[k] = { error: String(e.message || e).split('\n')[0] }; }
    }
  });
} finally { await sql.end(); }
const file = path.join(root, 'src', 'lib', 'eval', 'field-configs', 'vsme.text.prior.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
const n = (k) => (Array.isArray(out[k]) ? out[k].length : `ERR ${out[k]?.error}`);
console.log(`wrote ${path.relative(root, file)}: worksheets ${n('worksheets')}, sections ${n('sections')}, fields ${n('fields')}, requirements ${n('requirements')}, equations ${n('equations')}, stored parameters ${JSON.stringify(out.stored)}, instances ${JSON.stringify(out.instances)}`);
