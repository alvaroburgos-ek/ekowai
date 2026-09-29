#!/usr/bin/env node
// READ-ONLY dump of one standard's live encoding as JSON: worksheets + sections, fields (with enum values, widget,
// ui_config, lookup, visible_when), equations, compliance requirements, regulation tables + rows.
// Usage: node scripts/verification/dump-standard-encoding.mjs <standard_code> <out_file.json>
// Auth: DATABASE_URL_PROD from .env.local (never printed). READ ONLY transaction.
// Purpose: the "encoding" side of a source→encoding coverage walk (bidirectional coverage rule) — re-executable.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envText = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
const m = envText.match(/^DATABASE_URL_PROD=(.+)$/m);
if (!m) {
  console.error('DATABASE_URL_PROD not found in .env.local');
  process.exit(1);
}
const url = m[1].trim().replace(/^"|"$/g, '');
const [code, outFile] = process.argv.slice(2);
if (!code || !outFile) {
  console.error('usage: dump-standard-encoding.mjs <standard_code> <out_file.json>');
  process.exit(1);
}
const sql = postgres(url, { max: 1, prepare: false, connection: { default_transaction_read_only: 'on' } });
try {
  const doc = await sql.begin('read only', async (tx) => {
    const [std] = await tx`select id, code, title_de, title_en, version from standards where code = ${code}`;
    if (!std) throw new Error(`standard ${code} not found`);
    const worksheets = await tx`
      select id, code, title_de, title_en, order_index from worksheet_templates where standard_id = ${std.id} order by order_index, code`;
    const sections = await tx`
      select ws.id, w.code as worksheet, ws.parent_section_id, ws.code, ws.title_de, ws.title_en, ws.order_index, ws.visible_when
      from worksheet_sections ws join worksheet_templates w on w.id = ws.worksheet_template_id
      where w.standard_id = ${std.id} order by w.code, ws.order_index`;
    const fields = await tx`
      select f.id, w.code as worksheet, f.section_id, f.symbol, f.label_de, f.label_en, f.data_type, f.unit, f.is_required,
             f.enum_values, f.validation_rules, f.clause_reference, f.description, f.order_index, f.verification_status,
             f.source_anchor, f.active, f.default_value, f.widget, f.ui_config, f.lookup, f.visible_when
      from fields f join worksheet_templates w on w.id = f.worksheet_template_id
      where w.standard_id = ${std.id} order by w.code, f.order_index, f.symbol`;
    const equations = await tx`
      select e.id, w.code as worksheet, e.equation_number, e.formula, e.output_symbol, e.output_unit, e.input_symbols,
             e.clause_reference
      from equations e join worksheet_templates w on w.id = e.worksheet_template_id
      where w.standard_id = ${std.id} order by w.code, e.equation_number`;
    const gates = await tx`
      select cr.id, w.code as worksheet, cr.code, cr.title_de, cr.title_en, cr.description, cr.suggestion, cr.severity,
             cr.condition, cr.clause_reference
      from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id
      where w.standard_id = ${std.id} order by w.code, cr.code`;
    const tables = await tx`
      select t.id, t.table_code, t.title_de, t.clause_reference, t.page_ref, t.key_columns, t.value_columns, t.override_policy,
             (select json_agg(json_build_object('row_key', r.row_key, 'keys', r.keys, 'group_label', r.group_label,
                'label_de', r.label_de, 'row_values', r.row_values, 'verbatim_quote', r.verbatim_quote) order by r.order_index)
              from regulation_table_rows r where r.table_id = t.id) as rows
      from regulation_tables t where t.standard_code = ${code} order by t.table_code`;
    return { dumped_at: new Date().toISOString(), standard: std, worksheets, sections, fields, equations, gates, tables };
  });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(doc, null, 1), 'utf8');
  console.log(`${code}: ${doc.worksheets.length} worksheets, ${doc.sections.length} sections, ${doc.fields.length} fields (${doc.fields.filter((f) => f.active).length} active), ${doc.equations.length} equations, ${doc.gates.length} gates, ${doc.tables.length} tables → ${outFile}`);
} finally {
  await sql.end();
}
