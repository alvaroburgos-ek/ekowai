/**
 * GENERIC full-project FLL-GAR-2023 fixture for the embedded-PG real-save-path
 * harness.
 *
 * Unlike seed-fll-gar27.ts (a hand-shaped single-worksheet fixture for the
 * Notüberlauf Q_NOT chain), this seeder replays the ENTIRE FLL-GAR-2023 guideline
 * tree — all 29 worksheets, every section, every field (with enum_values /
 * validation_rules), every equation and every compliance_requirement — from a
 * static snapshot of prod (`vadsmshzebefjreqcicl`, standard id
 * b252ce89-6efc-4081-9684-8560b72651ed) captured read-only via the Management
 * API (see _build-fll-snapshot.mjs → fll-gar-snapshot.ts).
 *
 * It stands up ONE project inside the shared harness PG with a worksheet_instance
 * for EACH of the 29 templates, and seeds a project_parameters default for every
 * field (typed by the field's data_type), so a verify agent can drive ANY
 * worksheet's chain through the REAL saveWorksheet path against the embedded PG.
 *
 * PROVENANCE / DOCTRINE NOTES:
 *   - The prod UUIDs (template / section / field / equation / requirement ids)
 *     are preserved VERBATIM so the topology (equation ids, consumer_worksheets
 *     cross-references) is byte-identical to prod. The verify agent can therefore
 *     reference e.g. GAR-27 Gl.1 by its real id.
 *   - The per-field seeded DEFAULTS are NOT source claims. A number defaults to 0,
 *     a boolean to false, an enum to its first option, etc. — purely so every
 *     field is present and non-empty. Any value a verify agent actually asserts on
 *     MUST be re-entered/driven through saveWorksheet and source-verified per SR-1.
 *     Where the standard gives a RANGE (SR-2), do NOT treat the seeded enum-first
 *     default as the answer — surface the range as a decision item.
 *   - Only columns present in the app Drizzle schema (src/lib/db/schema.ts) are
 *     written; the embedded harness applies THAT schema (no prod-only audit_* /
 *     requires_attestation columns).
 *   - NO prod access at test time. NO writes to prod. Everything replays into the
 *     disposable embedded Postgres and is torn down with the harness.
 */
import type postgres from 'postgres';
import { FLL_GAR_SNAPSHOT } from './fll-gar-snapshot';

export const FLL_GAR_STANDARD_ID = FLL_GAR_SNAPSHOT.standard.id;

/** Per-worksheet handle exposed to the verify agent. */
export type SeededWorksheet = {
  code: string;
  title_de: string;
  templateId: string;
  instanceId: string;
  /** symbol -> field id (every field of the worksheet). */
  fields: Record<string, string>;
};

export type SeededFllGarFixture = {
  projectId: string;
  orgId: string;
  userId: string;
  standardId: string;
  /** worksheet code (e.g. 'FLL-GAR-27') -> handle. */
  worksheets: Record<string, SeededWorksheet>;
  /** Total counts, for smoke assertions. */
  counts: {
    worksheets: number;
    sections: number;
    fields: number;
    equations: number;
    compliance: number;
    parameters: number;
  };
};

/** A typed default per data_type so every field is present + non-empty. These are
 *  seed placeholders, NOT source-verified values (see doctrine note above). */
function defaultParamCols(
  sql: postgres.Sql,
  dataType: string,
  enumValues: unknown,
): Record<string, unknown> {
  switch (dataType) {
    case 'number':
      return { value_number: '0' };
    case 'boolean':
      return { value_boolean: false };
    case 'date':
      return { value_date: '2024-01-01' };
    case 'enum': {
      const first = Array.isArray(enumValues) && enumValues.length
        ? (enumValues[0] as { value?: string }).value
        : null;
      // Enum with no options → leave enum null (honest "not configured"); still
      // insert the row so the field is present.
      return first ? { value_enum: first } : {};
    }
    case 'json':
      return { value_json: sql.json({}) };
    case 'text':
    default:
      return { value_text: '' };
  }
}

export async function seedFllGar(
  sql: postgres.Sql,
  userId: string,
): Promise<SeededFllGarFixture> {
  const snap = FLL_GAR_SNAPSHOT;

  // ── principal + org + project ────────────────────────────────────────────
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'harness-fll-gar@test.local')
            ON CONFLICT (id) DO NOTHING`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug)
    VALUES ('Harness FLL-GAR Org', ${'harness-fll-gar-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)})
    RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by)
    VALUES (${org.id}, 'FLL-GAR-2023 full-project', ${userId}) RETURNING id`;

  // ── standard (verbatim prod id) ──────────────────────────────────────────
  const st = snap.standard;
  await sql`
    INSERT INTO standards (id, code, title_de, title_en, version, issued_year)
    VALUES (${st.id}, ${st.code}, ${st.title_de}, ${st.title_en ?? null}, ${st.version}, ${st.issued_year ?? null})`;
  await sql`
    INSERT INTO project_standards (project_id, standard_id, status)
    VALUES (${proj.id}, ${st.id}, 'active')`;

  // ── templates (verbatim ids) ─────────────────────────────────────────────
  for (const t of snap.templates) {
    await sql`
      INSERT INTO worksheet_templates (id, standard_id, code, title_de, title_en, phase, archetype, order_index, description)
      VALUES (${t.id}, ${st.id}, ${t.code}, ${t.title_de}, ${t.title_en ?? null},
              ${t.phase ?? null}, ${t.archetype ?? null}, ${t.order_index ?? 0}, ${t.description ?? null})`;
  }

  // ── sections (verbatim ids; snapshot is flat — no parent refs) ───────────
  for (const s of snap.sections) {
    await sql`
      INSERT INTO worksheet_sections (id, worksheet_template_id, parent_section_id, code, title_de, title_en, order_index)
      VALUES (${s.id}, ${s.worksheet_template_id}, ${s.parent_section_id ?? null},
              ${s.code ?? null}, ${s.title_de}, ${s.title_en ?? null}, ${s.order_index ?? 0})`;
  }

  // ── fields (verbatim ids; enum_values / validation_rules as jsonb) ───────
  for (const f of snap.fields) {
    await sql`
      INSERT INTO fields (id, worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit,
                          is_required, enum_values, validation_rules, clause_reference, description,
                          consumer_worksheets, order_index, active, default_value, owner, xbrl_element_id)
      VALUES (${f.id}, ${f.worksheet_template_id}, ${f.section_id ?? null}, ${f.symbol}, ${f.label_de},
              ${f.label_en ?? null}, ${f.data_type}, ${f.unit ?? null}, ${f.is_required ?? false},
              ${f.enum_values ? sql.json(f.enum_values) : null},
              ${f.validation_rules ? sql.json(f.validation_rules) : null},
              ${f.clause_reference ?? null}, ${f.description ?? null},
              ${f.consumer_worksheets ?? null}, ${f.order_index ?? 0}, ${f.active ?? true},
              ${f.default_value ? sql.json(f.default_value) : null}, ${f.owner ?? null}, ${f.xbrl_element_id ?? null})`;
  }

  // ── equations (verbatim ids + formulas; incl. the trig-blocked GAR-22 Gl.2b) ─
  for (const e of snap.equations) {
    await sql`
      INSERT INTO equations (id, worksheet_template_id, equation_number, formula, formula_latex,
                             input_symbols, output_symbol, output_unit, clause_reference, description)
      VALUES (${e.id}, ${e.worksheet_template_id}, ${e.equation_number}, ${e.formula}, ${e.formula_latex ?? null},
              ${e.input_symbols ?? null}, ${e.output_symbol ?? null}, ${e.output_unit ?? null},
              ${e.clause_reference ?? null}, ${e.description ?? null})`;
  }

  // ── compliance_requirements (verbatim ids + conditions + severities) ─────
  for (const c of snap.compliance) {
    await sql`
      INSERT INTO compliance_requirements (id, worksheet_template_id, code, title_de, title_en,
                                           condition, description, clause_reference, severity, suggestion)
      VALUES (${c.id}, ${c.worksheet_template_id}, ${c.code}, ${c.title_de}, ${c.title_en ?? null},
              ${c.condition}, ${c.description ?? null}, ${c.clause_reference ?? null}, ${c.severity}, ${c.suggestion ?? null})`;
  }

  // ── one worksheet_instance per template + build the code->handle lookup ──
  const fieldsByTemplate = new Map<string, { id: string; symbol: string; data_type: string; enum_values: unknown }[]>();
  for (const f of snap.fields) {
    const arr = fieldsByTemplate.get(f.worksheet_template_id) ?? [];
    arr.push({ id: f.id, symbol: f.symbol, data_type: f.data_type, enum_values: f.enum_values });
    fieldsByTemplate.set(f.worksheet_template_id, arr);
  }

  const worksheets: Record<string, SeededWorksheet> = {};
  let paramCount = 0;

  for (const t of snap.templates) {
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id)
      VALUES (${proj.id}, ${t.id}) RETURNING id`;

    const fieldMap: Record<string, string> = {};
    for (const f of fieldsByTemplate.get(t.id) ?? []) {
      fieldMap[f.symbol] = f.id;
      // Seed a typed default project_parameter so every field is present.
      await sql`
        INSERT INTO project_parameters ${sql({
          project_id: proj.id,
          field_id: f.id,
          source_worksheet_instance_id: inst.id,
          entered_by: userId,
          source_type: 'entered',
          ...defaultParamCols(sql, f.data_type, f.enum_values),
        })}`;
      paramCount++;
    }

    worksheets[t.code] = {
      code: t.code,
      title_de: t.title_de,
      templateId: t.id,
      instanceId: inst.id,
      fields: fieldMap,
    };
  }

  return {
    projectId: proj.id,
    orgId: org.id,
    userId,
    standardId: st.id,
    worksheets,
    counts: {
      worksheets: snap.templates.length,
      sections: snap.sections.length,
      fields: snap.fields.length,
      equations: snap.equations.length,
      compliance: snap.compliance.length,
      parameters: paramCount,
    },
  };
}
