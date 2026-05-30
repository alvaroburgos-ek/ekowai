/**
 * THROWAWAY generator (not committed). Mirrors scripts/_pass3c-db.ts but instead of
 * executing Drizzle calls against a live DB, it parses + validates a workbook and emits
 * ONE atomic PL/pgSQL DO block per workbook (data embedded as JSONB) that an operator can
 * run via the Supabase MCP `execute_sql` tool. All ID resolution happens server-side via
 * natural keys, so no client round-trips are needed.
 *
 * Run (tsx is broken in this WSL → tsc + node):
 *   npx tsc scripts/_p3c-gen-sql-tmp.ts --outDir .tmp-p3c --module commonjs \
 *     --moduleResolution node --target es2022 --skipLibCheck --esModuleInterop --resolveJsonModule
 *   node .tmp-p3c/_p3c-gen-sql-tmp.js <out-sql-dir> <file1.xlsx> [file2.xlsx ...]
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { parseWorkbook } from './_pass3c-parsers';
import { validateWorkbook } from './_pass3c-validate';
import type { ParsedWorkbook, EnumValueRow } from './_pass3c-types';

// ---- helpers copied verbatim from _pass3c-db.ts ----
function parseRequired(v: string | null): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === 'yes' || s === 'true' || s === '1' || s === 'required';
}
function parseList(v: string | null): string[] | null {
  if (!v) return null;
  const out = v
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return out;
}
type EnumValuePayload = {
  value: string;
  label_de: string | null;
  label_en: string | null;
  order_index: number;
  regulation_reference: string | null;
};
function groupEnumValues(rows: EnumValueRow[]): Map<string, EnumValuePayload[]> {
  const map = new Map<string, EnumValuePayload[]>();
  for (const r of rows) {
    const arr = map.get(r.enum_name) ?? [];
    arr.push({
      value: r.value,
      label_de: r.label_de,
      label_en: r.label_en,
      order_index: r.order_index,
      regulation_reference: r.regulation_reference,
    });
    map.set(r.enum_name, arr);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.order_index - b.order_index);
  return map;
}

type Payload = {
  standard: { code: string; title_de: string; title_en: string | null; version: string };
  worksheets: Array<{
    code: string; title_de: string; title_en: string | null;
    phase: number | null; archetype: string | null; order_index: number; description: string | null;
  }>;
  sections: Array<{ ws_code: string; code: string | null; title_de: string; order_index: number; parent_code: string | null }>;
  fields: Array<{
    ws_code: string; section_code: string | null; symbol: string; label_de: string; label_en: string | null;
    data_type: string; unit: string | null; is_required: boolean;
    enum_values: EnumValuePayload[] | null; validation_rules: { raw: string } | null;
    clause_reference: string | null; description: string | null; consumer_worksheets: string[] | null;
  }>;
  equations: Array<{
    ws_code: string; equation_number: string; formula: string; input_symbols: string[] | null;
    output_symbol: string | null; clause_reference: string | null; description: string | null;
  }>;
  compliance: Array<{
    ws_code: string; code: string; title_de: string; condition: string;
    description: string | null; clause_reference: string | null;
  }>;
};

function buildPayload(p: ParsedWorkbook): Payload {
  const enumGroups = groupEnumValues(p.enumValues);

  const standard = {
    code: p.standard.standard_code,
    title_de: p.standard.title_de,
    title_en: p.standard.title_en,
    version: p.standard.edition,
  };

  const worksheets = p.worksheets.map((w) => ({
    code: w.worksheet_code,
    title_de: w.title_de,
    title_en: w.title_en,
    phase: w.phase,
    archetype: w.archetype,
    order_index: w.order_index,
    description: w.description,
  }));

  const sections = p.sections.map((s) => ({
    ws_code: s.worksheet_code,
    code: s.section_code,
    title_de: s.title,
    order_index: s.order_index,
    parent_code: s.parent_section_code,
  }));

  const fields = p.fields.map((f) => ({
    ws_code: f.origin_worksheet,
    section_code: f.origin_section,
    symbol: f.symbol,
    label_de: f.label_de,
    label_en: f.label_en,
    data_type: f.data_type,
    unit: f.unit,
    is_required: parseRequired(f.required),
    enum_values: f.data_type === 'enum' ? enumGroups.get(f.symbol) ?? null : null,
    validation_rules: f.validation_rules ? { raw: f.validation_rules } : null,
    clause_reference: f.regulation_reference,
    description: f.description,
    consumer_worksheets: parseList(f.consumer_worksheets),
  }));

  const equations = p.equations.map((row) => ({
    ws_code: row.used_in_worksheet,
    equation_number: row.equation_number,
    formula: row.formula,
    input_symbols: parseList(row.input_symbols),
    output_symbol: row.output_symbol,
    clause_reference: row.regulation_reference,
    description: row.description_de,
  }));

  // compliance: resolve target worksheet exactly like the importer
  const firstPhase1 = p.worksheets.find((w) => w.phase === 1) ?? p.worksheets[0];
  const compliance = p.complianceRequirements.map((cr) => {
    const matchingByPhase = cr.phase != null ? p.worksheets.find((w) => w.phase === cr.phase) : undefined;
    const target = matchingByPhase ?? firstPhase1;
    let condition: string | null = cr.evaluation_expression;
    if (!condition) {
      if (cr.required_field_symbols) {
        condition = cr.required_field_symbols
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((s) => `${s} IS NOT NULL`)
          .join(' AND ');
      } else {
        condition = 'TRUE';
      }
    }
    return {
      ws_code: target.worksheet_code,
      code: cr.requirement_code,
      title_de: cr.title,
      condition: condition || 'TRUE',
      description: cr.description,
      clause_reference: cr.regulation_reference,
    };
  });

  return { standard, worksheets, sections, fields, equations, compliance };
}

function buildSql(payload: Payload): string {
  const json = JSON.stringify(payload);
  // dollar-quote tags chosen so they cannot collide with JSON content
  return `DO $p3c_do$
DECLARE
  v_data jsonb := $p3c_json$${json}$p3c_json$::jsonb;
  v_std uuid;
BEGIN
  -- 1. standard (UPSERT by code)
  INSERT INTO standards (code, title_de, title_en, version)
  SELECT v_data->'standard'->>'code', v_data->'standard'->>'title_de',
         v_data->'standard'->>'title_en', v_data->'standard'->>'version'
  ON CONFLICT (code) DO UPDATE
    SET title_de = excluded.title_de, title_en = excluded.title_en, version = excluded.version;
  SELECT id INTO v_std FROM standards WHERE code = v_data->'standard'->>'code';

  -- 2. worksheet templates (UPSERT by standard_id+code)
  INSERT INTO worksheet_templates (standard_id, code, title_de, title_en, phase, archetype, order_index, description)
  SELECT v_std, w->>'code', w->>'title_de', w->>'title_en',
         (w->>'phase')::int, w->>'archetype', (w->>'order_index')::int, w->>'description'
  FROM jsonb_array_elements(v_data->'worksheets') AS w
  ON CONFLICT (standard_id, code) DO UPDATE
    SET title_de = excluded.title_de, title_en = excluded.title_en, phase = excluded.phase,
        archetype = excluded.archetype, order_index = excluded.order_index, description = excluded.description;

  -- 3. sections: null fields.section_id, wipe + reinsert (no unique constraint on code), resolve parents
  UPDATE fields SET section_id = NULL
   WHERE worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std);
  DELETE FROM worksheet_sections
   WHERE worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std);

  INSERT INTO worksheet_sections (worksheet_template_id, code, title_de, order_index)
  SELECT wt.id, s->>'code', s->>'title_de', (s->>'order_index')::int
  FROM jsonb_array_elements(v_data->'sections') AS s
  JOIN worksheet_templates wt ON wt.standard_id = v_std AND wt.code = s->>'ws_code';

  UPDATE worksheet_sections AS child
     SET parent_section_id = parent.id
  FROM jsonb_array_elements(v_data->'sections') AS s
  JOIN worksheet_templates wt ON wt.standard_id = v_std AND wt.code = s->>'ws_code'
  JOIN worksheet_sections parent ON parent.worksheet_template_id = wt.id AND parent.code = s->>'parent_code'
  WHERE s->>'parent_code' IS NOT NULL
    AND child.worksheet_template_id = wt.id
    AND child.code = s->>'code';

  -- 4. fields (UPSERT by worksheet_template_id+symbol; verification_status NOT touched)
  INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit,
                      is_required, enum_values, validation_rules, clause_reference, description, consumer_worksheets)
  SELECT wt.id,
         (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = wt.id AND ws.code = f->>'section_code' LIMIT 1),
         f->>'symbol', f->>'label_de', f->>'label_en', f->>'data_type', f->>'unit',
         (f->>'is_required')::boolean,
         CASE WHEN jsonb_typeof(f->'enum_values') = 'array' THEN f->'enum_values' ELSE NULL END,
         CASE WHEN jsonb_typeof(f->'validation_rules') = 'object' THEN f->'validation_rules' ELSE NULL END,
         f->>'clause_reference', f->>'description',
         CASE WHEN jsonb_typeof(f->'consumer_worksheets') = 'array'
              THEN ARRAY(SELECT jsonb_array_elements_text(f->'consumer_worksheets')) ELSE NULL END
  FROM jsonb_array_elements(v_data->'fields') AS f
  JOIN worksheet_templates wt ON wt.standard_id = v_std AND wt.code = f->>'ws_code'
  ON CONFLICT (worksheet_template_id, symbol) DO UPDATE
    SET section_id = excluded.section_id, label_de = excluded.label_de, label_en = excluded.label_en,
        data_type = excluded.data_type, unit = excluded.unit, is_required = excluded.is_required,
        enum_values = excluded.enum_values, validation_rules = excluded.validation_rules,
        clause_reference = excluded.clause_reference, description = excluded.description,
        consumer_worksheets = excluded.consumer_worksheets;

  -- 5. equations (UPSERT by worksheet_template_id+equation_number; verification_status preserved)
  INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, clause_reference, description)
  SELECT wt.id, e->>'equation_number', e->>'formula',
         CASE WHEN jsonb_typeof(e->'input_symbols') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(e->'input_symbols')) ELSE NULL END,
         e->>'output_symbol', e->>'clause_reference', e->>'description'
  FROM jsonb_array_elements(v_data->'equations') AS e
  JOIN worksheet_templates wt ON wt.standard_id = v_std AND wt.code = e->>'ws_code'
  ON CONFLICT (worksheet_template_id, equation_number) DO UPDATE
    SET formula = excluded.formula, input_symbols = excluded.input_symbols, output_symbol = excluded.output_symbol,
        clause_reference = excluded.clause_reference, description = excluded.description;

  -- 6. compliance requirements (UPSERT by worksheet_template_id+code)
  INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, description, clause_reference, severity)
  SELECT wt.id, c->>'code', c->>'title_de', c->>'condition', c->>'description', c->>'clause_reference', 'block'
  FROM jsonb_array_elements(v_data->'compliance') AS c
  JOIN worksheet_templates wt ON wt.standard_id = v_std AND wt.code = c->>'ws_code'
  ON CONFLICT (worksheet_template_id, code) DO UPDATE
    SET title_de = excluded.title_de, condition = excluded.condition, description = excluded.description,
        clause_reference = excluded.clause_reference, severity = excluded.severity;
END
$p3c_do$;
`;
}

function sanitize(code: string): string {
  return code.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function main(): Promise<void> {
  const [outDir, ...files] = process.argv.slice(2);
  if (!outDir || files.length === 0) {
    console.error('Usage: node _p3c-gen-sql-tmp.js <out-sql-dir> <file1.xlsx> [...]');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const manifest: Array<Record<string, unknown>> = [];

  for (const file of files) {
    const base = path.basename(file);
    try {
      const parsed = await parseWorkbook(file);
      const errors = validateWorkbook(parsed);
      const counts = {
        standard: parsed.standard.standard_code,
        worksheets: parsed.worksheets.length,
        sections: parsed.sections.length,
        fields: parsed.fields.length,
        equations: parsed.equations.length,
        compliance: parsed.complianceRequirements.length,
      };
      if (errors.length > 0) {
        console.log(`[FAIL] ${base} — ${parsed.standard.standard_code} — ${errors.length} validation error(s)`);
        for (const e of errors.slice(0, 8)) console.log(`        [${e.sheet} row ${e.row}] ${e.message}`);
        if (errors.length > 8) console.log(`        ... and ${errors.length - 8} more`);
        manifest.push({ file: base, ...counts, ok: false, errors: errors.length });
        continue;
      }
      const payload = buildPayload(parsed);
      const code = sanitize(parsed.standard.standard_code);
      const sql = buildSql(payload);
      const sqlPath = path.join(outDir, `${code}.sql`);
      fs.writeFileSync(sqlPath, sql, 'utf8');

      // base64 chunk file for the chunked-MCP staging path (quote-free → no escaping risk)
      const json = JSON.stringify(payload);
      const jsonMd5 = crypto.createHash('md5').update(json, 'utf8').digest('hex');
      const b64 = Buffer.from(json, 'utf8').toString('base64');
      const WRAP = 200;
      const lines: string[] = [];
      for (let i = 0; i < b64.length; i += WRAP) lines.push(b64.slice(i, i + WRAP));
      fs.writeFileSync(path.join(outDir, `${code}.b64`), lines.join('\n') + '\n', 'utf8');

      console.log(
        `[OK]   ${base} — ${parsed.standard.standard_code} — ws:${counts.worksheets} sec:${counts.sections} fld:${counts.fields} eq:${counts.equations} cr:${counts.compliance} → ${code}.b64 (${lines.length} lines, json ${(json.length / 1024).toFixed(0)}KB, md5 ${jsonMd5})`,
      );
      manifest.push({
        file: base, ...counts, ok: true,
        code: parsed.standard.standard_code,
        json_md5: jsonMd5, json_len: json.length, b64_lines: lines.length,
      });
    } catch (err) {
      console.log(`[ERR]  ${base} — ${(err as Error).message}`);
      manifest.push({ file: base, ok: false, error: (err as Error).message });
    }
  }

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\nManifest → ${path.join(outDir, 'manifest.json')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
