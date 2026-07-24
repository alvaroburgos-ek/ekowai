#!/usr/bin/env node
/**
 * export-encoding-snapshot.mjs — pull the live encoding of the four reasoning-map
 * standards to a deterministic on-disk SNAPSHOT so `validate.mjs` can cross-check
 * "map vs reality" WITHOUT any network access at validation time.
 *
 * Read path = Supabase Management API `POST /v1/projects/<ref>/database/query`
 * (SELECT-only), the exact helper pattern in scripts/phase4/_mgmt-apply.mjs.
 * $SUPABASE_ACCESS_TOKEN is read from env and NEVER printed. Prod ref is the
 * doctrine's `vadsmshzebefjreqcicl`. No writes are ever issued.
 *
 * Output: scripts/reasoning-map/snapshot/encoding-snapshot.json — one entry per
 * standard code with { standard, worksheets, fields, equations, compliance,
 * enum_values } arrays. Committed so the validator is re-runnable off it.
 *
 * ── HOW TO REFRESH THE SNAPSHOT ─────────────────────────────────────────────
 *   1. Ensure $SUPABASE_ACCESS_TOKEN is set (personal access token, never echoed).
 *   2. node scripts/reasoning-map/export-encoding-snapshot.mjs
 *   3. Commit the regenerated snapshot/encoding-snapshot.json.
 *   Re-running the validator afterwards will surface DRIFT vs the committed maps.
 * ────────────────────────────────────────────────────────────────────────────
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REF = 'vadsmshzebefjreqcicl';
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'snapshot');

// The four standards the maps cover (code -> live standard id).
const STANDARDS = {
  'DWA-A-138-1': '5d64c48d-4cca-48d9-99f0-d1348082f0da',
  'FLL-GAR-2023': 'b252ce89-6efc-4081-9684-8560b72651ed',
  'FLL-Naturteich-2017': 'c11f0e54-fef3-4552-be7b-f6eb50b468da',
  'FLL-TP-RHIZOM-2023': 'd0a661ab-c448-4c97-baf1-fd860fd9adca',
  'DIN-18130-1': '4a53393a-e875-446f-b153-f47a402a4370',
  'DWA-A-102-2': 'b52680be-e0df-4313-b5b5-a08bdbb82773',
};

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN not set — cannot export snapshot.');
  process.exit(2);
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 500)}`);
  }
  return res.json();
}

// One consolidated read per standard — returns a single JSON object with the
// whole encoding tree so the snapshot is assembled deterministically.
function treeSql(stdId) {
  const s = `'${stdId}'`;
  return `
select json_build_object(
  'standard',   (select row_to_json(x) from (select id, code, title_de, title_en, version from standards where id = ${s}) x),
  'worksheets', (select coalesce(json_agg(row_to_json(w) order by w.order_index), '[]'::json)
                   from (select id, code, standard_id, title_de, phase, archetype, order_index
                           from worksheet_templates where standard_id = ${s}) w),
  'fields',     (select coalesce(json_agg(row_to_json(f)), '[]'::json)
                   from (select f.id, f.symbol, f.data_type, f.worksheet_template_id, f.section_id,
                                f.verification_status, f.owner, f.consumer_worksheets, f.enum_values,
                                f.default_value, f.validation_rules
                           from fields f
                           join worksheet_templates w on w.id = f.worksheet_template_id
                          where w.standard_id = ${s}) f),
  'equations',  (select coalesce(json_agg(row_to_json(e)), '[]'::json)
                   from (select e.id, e.equation_number, e.output_symbol, e.input_symbols,
                                e.formula, e.clause_reference, e.verification_status,
                                e.worksheet_template_id
                           from equations e
                           join worksheet_templates w on w.id = e.worksheet_template_id
                          where w.standard_id = ${s}) e),
  'compliance', (select coalesce(json_agg(row_to_json(c)), '[]'::json)
                   from (select c.id, c.code, c.condition, c.severity, c.clause_reference,
                                c.requires_attestation, c.audit_status, c.worksheet_template_id
                           from compliance_requirements c
                           join worksheet_templates w on w.id = c.worksheet_template_id
                          where w.standard_id = ${s}) c),
  'enum_values',(select coalesce(json_agg(json_build_object(
                          'field_id', f.id, 'symbol', f.symbol, 'enum_values', f.enum_values)), '[]'::json)
                   from fields f
                   join worksheet_templates w on w.id = f.worksheet_template_id
                  where w.standard_id = ${s} and f.enum_values is not null)
) as tree;`;
}

const out = { exported_at: new Date().toISOString(), project_ref: REF, standards: {} };

for (const [code, id] of Object.entries(STANDARDS)) {
  const rows = await query(treeSql(id));
  const tree = rows[0]?.tree ?? rows[0]?.json_build_object;
  if (!tree || !tree.standard) throw new Error(`no encoding returned for ${code} (${id})`);
  out.standards[code] = tree;
  const c = tree;
  console.log(
    `${code}: worksheets=${c.worksheets.length} fields=${c.fields.length} ` +
      `equations=${c.equations.length} compliance=${c.compliance.length} enum_fields=${c.enum_values.length}`,
  );
}

mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'encoding-snapshot.json');
writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(`\nwrote ${outFile}`);
