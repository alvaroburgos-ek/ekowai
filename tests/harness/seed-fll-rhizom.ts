/**
 * GENERIC full-project fixture for FLL-TP-RHIZOM-2023
 * (Technische Prüfbestimmungen zur Bestimmung der Rhizomfestigkeit von
 *  Gewässerabdichtungen; standard id d0a661ab-c448-4c97-baf1-fd860fd9adca on prod
 *  `vadsmshzebefjreqcicl`).
 *
 * Unlike seed-plt-hs01.ts / seed-facilities.ts (which hand-build exactly the few
 * 138 worksheets a single calculation chain touches), this seeder stands up the
 * WHOLE standard from a committed manifest so a verify agent can drive ANY of the
 * 21 worksheets' chains through the REAL saveWorksheet path against the embedded
 * PG. It seeds, directly via postgres.js (postgres role — the same role `db`
 * uses):
 *   - profile + org + org_members (BYPASS_AUTH user is an internal member)
 *   - project + FLL-TP-RHIZOM-2023 standard + project_standards link
 *   - all 21 worksheet_templates (FLLTP-RHZ-01 … -21), each with its sections,
 *     ALL active fields (149 total), equations (the 3 on FLLTP-RHZ-13), and
 *     compliance_requirements (21 block-severity gates)
 *   - one worksheet_instance per template attached to the project
 *   - one project_parameters row per field, seeded with a type-appropriate
 *     DEFAULT so every field is present and a save that changes any subset drives
 *     the real UPSERT + audit + (where applicable) derived-materialize path.
 *
 * PROVENANCE (SR-1): the structure (worksheet/section/field/equation/compliance
 * shapes, symbols, enum_values, conditions) is a verbatim read-only snapshot of
 * the live FLL-TP-RHIZOM-2023 encoding in prod, captured 2026-07-23 into
 * ./fll-tp-rhizom-manifest.json. NO scalar in this seeder is a source-verified
 * REGULATION value — the per-field defaults are inert placeholders chosen only so
 * the row exists and the save path runs. A verify agent that needs a
 * source-attested input MUST quote it from the FLL-TP-Rhizomfestigkeit PDF this
 * run and drive it in via saveWorksheet; it must NOT treat any default here as a
 * verified figure. See DOCTRINE SR-1/SR-2/SR-3.
 *
 * Section-less fields: several prod fields carry section_id = NULL (e.g. all of
 * FLLTP-RHZ-10, the attest_* fields, the 12/18/24-month roll-ups, all of
 * FLLTP-RHZ-21). The schema allows fields.section_id NULL, so those are seeded
 * with a null section — matching prod exactly.
 *
 * cos_beta / trig: FLL-TP-RHIZOM has no trig-bearing equations (its only 3
 * equations are the FLLTP-RHZ-13 arithmetic means + ratio), so the known
 * math-function engine gap does not apply here.
 */
import type postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── manifest types (shape of fll-tp-rhizom-manifest.json) ────────────────────
type ManifestField = {
  sec: string | null;
  symbol: string;
  label_de: string;
  data_type: string;
  unit: string | null;
  enum_values: unknown | null;
  is_required: boolean;
  order_index: number;
};
type ManifestEquation = {
  equation_number: string;
  formula: string;
  output_symbol: string | null;
};
type ManifestCompliance = {
  code: string;
  title_de: string;
  condition: string;
  severity: string;
};
type ManifestWorksheet = {
  code: string;
  title_de: string;
  sections: { code: string; title_de: string; order_index: number }[];
  fields: ManifestField[] | null;
  equations: ManifestEquation[] | null;
  compliance: ManifestCompliance[] | null;
};
type Manifest = {
  standard: { code: string; title_de: string; version: string };
  worksheets: ManifestWorksheet[];
};

export const FLL_RHIZOM_STANDARD_CODE = 'FLL-TP-RHIZOM-2023';

/** Per-worksheet handle the verify agent uses to address a chain. */
export type SeededWorksheet = {
  code: string;
  templateId: string;
  instanceId: string;
  /** symbol → field id (drive saveWorksheet with values keyed by field id). */
  fieldIds: Record<string, string>;
  /** symbol → data_type (so the driver can pick the right FieldValue.type). */
  fieldTypes: Record<string, string>;
};

export type SeededRhizomFixture = {
  projectId: string;
  userId: string;
  orgId: string;
  standardId: string;
  /** ordered by worksheet code, FLLTP-RHZ-01 … -21. */
  worksheets: SeededWorksheet[];
  /** by worksheet code, for direct lookup. */
  byCode: Record<string, SeededWorksheet>;
  /** counts, for a smoke assertion. */
  counts: { worksheets: number; fields: number; equations: number; compliance: number };
};

/** Load the committed structural manifest. */
export function loadRhizomManifest(): Manifest {
  const raw = readFileSync(join(__dirname, 'fll-tp-rhizom-manifest.json'), 'utf8');
  return JSON.parse(raw) as Manifest;
}

/** Inert, type-appropriate default so every field has a project_parameters row.
 * These are NOT source-verified regulation values — see file header. */
function defaultParamColumns(f: ManifestField): Record<string, unknown> {
  switch (f.data_type) {
    case 'number':
      return { value_number: '0' };
    case 'boolean':
      return { value_boolean: false };
    case 'date':
      return { value_date: '2026-01-01' };
    case 'enum': {
      const first =
        Array.isArray(f.enum_values) && f.enum_values.length > 0
          ? ((f.enum_values[0] as { value?: string }).value ?? null)
          : null;
      return { value_enum: first };
    }
    case 'json':
      return { value_json: null };
    case 'text':
    default:
      return { value_text: '' };
  }
}

export async function seedFllRhizom(
  sql: postgres.Sql,
  userId: string,
): Promise<SeededRhizomFixture> {
  const manifest = loadRhizomManifest();

  // ── principal + project ────────────────────────────────────────────────────
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'harness-fll-rhizom@test.local')
            ON CONFLICT (id) DO NOTHING`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('Harness FLL Rhizom Org', ${'harness-rhizom-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'FLL-TP-RHIZOM-HS-01', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version)
    VALUES (${manifest.standard.code}, ${manifest.standard.title_de}, ${manifest.standard.version}) RETURNING id`;
  await sql`INSERT INTO project_standards (project_id, standard_id, status)
            VALUES (${proj.id}, ${std.id}, 'active')`;

  let fieldCount = 0;
  let equationCount = 0;
  let complianceCount = 0;
  const worksheets: SeededWorksheet[] = [];
  const byCode: Record<string, SeededWorksheet> = {};

  for (const ws of manifest.worksheets) {
    // template
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de)
      VALUES (${std.id}, ${ws.code}, ${ws.title_de}) RETURNING id`;

    // sections (code → id)
    const sectionIdByCode: Record<string, string> = {};
    for (const s of ws.sections ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO worksheet_sections (worksheet_template_id, code, title_de, order_index)
        VALUES (${t.id}, ${s.code}, ${s.title_de}, ${s.order_index}) RETURNING id`;
      if (s.code) sectionIdByCode[s.code] = row.id;
    }

    // fields (symbol → id); section may be null (matches prod)
    const fieldIds: Record<string, string> = {};
    const fieldTypes: Record<string, string> = {};
    for (const f of ws.fields ?? []) {
      const sectionId = f.sec ? (sectionIdByCode[f.sec] ?? null) : null;
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields
          (worksheet_template_id, section_id, symbol, label_de, data_type, unit, is_required, enum_values, active, order_index)
        VALUES (
          ${t.id}, ${sectionId}, ${f.symbol}, ${f.label_de}, ${f.data_type}, ${f.unit},
          ${f.is_required}, ${f.enum_values ? sql.json(f.enum_values as unknown as import('postgres').JSONValue) : null}, true, ${f.order_index}
        ) RETURNING id`;
      fieldIds[f.symbol] = row.id;
      fieldTypes[f.symbol] = f.data_type;
      fieldCount++;
    }

    // equations
    for (const e of ws.equations ?? []) {
      await sql`
        INSERT INTO equations (worksheet_template_id, equation_number, formula, output_symbol)
        VALUES (${t.id}, ${e.equation_number}, ${e.formula}, ${e.output_symbol})`;
      equationCount++;
    }

    // compliance_requirements
    for (const c of ws.compliance ?? []) {
      await sql`
        INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
        VALUES (${t.id}, ${c.code}, ${c.title_de}, ${c.condition}, ${c.severity})`;
      complianceCount++;
    }

    // instance
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id)
      VALUES (${proj.id}, ${t.id}) RETURNING id`;

    // one defaulted project_parameters row per field
    for (const f of ws.fields ?? []) {
      await sql`
        INSERT INTO project_parameters ${sql({
          project_id: proj.id,
          field_id: fieldIds[f.symbol],
          source_worksheet_instance_id: inst.id,
          entered_by: userId,
          source_type: 'entered',
          ...defaultParamColumns(f),
        })}`;
    }

    const seeded: SeededWorksheet = {
      code: ws.code,
      templateId: t.id,
      instanceId: inst.id,
      fieldIds,
      fieldTypes,
    };
    worksheets.push(seeded);
    byCode[ws.code] = seeded;
  }

  return {
    projectId: proj.id,
    userId,
    orgId: org.id,
    standardId: std.id,
    worksheets,
    byCode,
    counts: {
      worksheets: worksheets.length,
      fields: fieldCount,
      equations: equationCount,
      compliance: complianceCount,
    },
  };
}
