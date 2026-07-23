/**
 * FLL-GAR-27-shaped fixture for the FLL revision real-save-path harness.
 *
 * Seeds (directly via postgres.js, as the postgres role) exactly the rows the
 * FLL-GAR Notüberlauf calculation (Anhang 1, Gl. 1) needs to drive Q_NOT through
 * the REAL saveWorksheet path:
 *   - profile + org + org_members (so BYPASS_AUTH user is an internal member)
 *   - project + FLL-GAR-2023 standard
 *   - worksheet template FLL-GAR-27 (Inbetriebnahme + Notüberlauf) with the
 *     equation-consumed fields (A, C, r_5_100, r_5_5, Q_NOT) AND the two
 *     encode-time DECOY twins (A_einzugsflaeche, C_abflusswert) that the A/C
 *     inverted-tag scan flags — kept so the harness models the real prod row
 *     shape (both twins carry saved values on the live project f7249ae1…).
 *   - equation Gl. 1 · Q_NOT = (r_5_100 − r_5_5·C)·(A/10000)
 *   - project_parameters for the inputs.
 *
 * SOURCE PROVENANCE OF THE SCALARS (verified 2026-07-23, read-only, against the
 * live FLL-GAR-2023 encoding + the real project f7249ae1-bbda-415f-ac83-
 * 991a282d2c8b in prod `vadsmshzebefjreqcicl`):
 *   - equation id / formula: prod `equations` row (id 02387918-…), verbatim.
 *   - A = 263, r_5_100 = 317, r_5_5 = 142  → the live project's entered inputs.
 *   - C: the live equation-consumed field `C` (id d6f02425-…) holds 0.83, which
 *     yields the WRONG derived Q_NOT = 5.237382 currently persisted on the live
 *     project. The CORRECT abflussbeiwert is 0.82 — it is present but stranded in
 *     the DECOY field `C_abflusswert` (id 34d5b6f0-…). With C = 0.82 the chain
 *     yields Q_NOT = 5.274728 (KNOWN ITEM #1 target). See fll-m1-report.md.
 *
 * The FLL-GAR PDF itself does NOT tabulate C (it defers to DIN 1986-100 for the
 * Abflussbeiwert; §… L1591-1603). C = 0.82 is a DIN-1986-100 runoff coefficient,
 * NOT an FLL-GAR value — recorded as such in the report's ratification bundle.
 */
import type postgres from 'postgres';

// Verified FLL-GAR-2023 equation id (prod `equations`).
export const GAR_GL1_QNOT_EQ = '02387918-c243-4a7e-b38d-993c65f79754'; // Q_NOT = (r_5_100 - r_5_5*C)*(A/10000)
export const GAR_GL1_FORMULA = '(r_5_100 - r_5_5 * C) * (A / 10000)';

/**
 * Live FLL-GAR-27 inputs from project f7249ae1… (read-only source-verified).
 * C_CORRECT (0.82) is the fix target; C_WRONG (0.83) is the currently-persisted
 * equation-consumed value that produces the wrong Q_NOT.
 */
export const GAR27 = {
  A: 263,
  r_5_100: 317,
  r_5_5: 142,
  C_CORRECT: 0.82, // → Q_NOT = 5.274728  (KNOWN ITEM #1 target)
  C_WRONG: 0.83,   // → Q_NOT = 5.237382  (currently persisted on the live project)
};

/** Q_NOT for a given C, computed in-test so the assertion cannot drift from the
 *  formula. Mirrors the DB equation exactly. */
export function expectedQNot(C: number): number {
  return (GAR27.r_5_100 - GAR27.r_5_5 * C) * (GAR27.A / 10000);
}

export type SeededGar27Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  gar27InstanceId: string;
  // equation-consumed fields
  aFieldId: string;
  cFieldId: string;
  r5100FieldId: string;
  r55FieldId: string;
  qNotFieldId: string;
  // decoy twins (A/C inverted-tag shape)
  aEinzugsflaecheFieldId: string;
  cAbflusswertFieldId: string;
};

export async function seedFllGar27(
  sql: postgres.Sql,
  userId: string,
): Promise<SeededGar27Fixture> {
  // ── principal + project ──────────────────────────────────────────────────
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'harness-fll@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('Harness FLL Org', ${'harness-fll-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'FLL-GAR-HS-01', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('FLL-GAR-2023', 'FLL-Gewässerabdichtungsrichtlinien', 'harness') RETURNING id`;

  const [t] = await sql<{ id: string }[]>`
    INSERT INTO worksheet_templates (standard_id, code, title_de)
    VALUES (${std.id}, 'FLL-GAR-27', 'Inbetriebnahme + Notüberlauf') RETURNING id`;
  const [section] = await sql<{ id: string }[]>`
    INSERT INTO worksheet_sections (worksheet_template_id, code, title_de)
    VALUES (${t.id}, 'S-FLL-GAR-27', 'Notüberlauf (Anhang 1)') RETURNING id`;
  const [inst] = await sql<{ id: string }[]>`
    INSERT INTO worksheet_instances (project_id, worksheet_template_id)
    VALUES (${proj.id}, ${t.id}) RETURNING id`;

  const mkField = async (symbol: string, label: string, dataType: string, unit: string | null, oi: number) => {
    const [f] = await sql<{ id: string }[]>`
      INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, unit, active, order_index)
      VALUES (${t.id}, ${section.id}, ${symbol}, ${label}, ${dataType}, ${unit}, true, ${oi}) RETURNING id`;
    return f.id;
  };

  // equation-consumed fields
  const aFieldId = await mkField('A', 'Flaeche (Notentwaesserung)', 'number', 'm^2', 61);
  const cFieldId = await mkField('C', 'Abflussbeiwert', 'number', '-', 62);
  const r5100FieldId = await mkField('r_5_100', 'Regenspende r_5,100', 'number', 'l/(s·ha)', 80);
  const r55FieldId = await mkField('r_5_5', 'Regenspende r_5,5', 'number', 'l/(s·ha)', 90);
  const qNotFieldId = await mkField('Q_NOT', 'Notüberlauf-Abfluss Q_NOT', 'number', 'l/s', 100);
  // decoy twins (A/C inverted-tag shape — present on the live row, unconsumed)
  const aEinzugsflaecheFieldId = await mkField('A_einzugsflaeche', 'Einzugsfläche A', 'number', 'm²', 60);
  const cAbflusswertFieldId = await mkField('C_abflusswert', 'Abflussbeiwert C', 'number', null, 70);

  await sql`
    INSERT INTO equations (id, worksheet_template_id, equation_number, formula, output_symbol)
    VALUES (${GAR_GL1_QNOT_EQ}, ${t.id}, '1', ${GAR_GL1_FORMULA}, 'Q_NOT')`;

  const insParam = async (fieldId: string, cols: Record<string, unknown>) => {
    await sql`
      INSERT INTO project_parameters ${sql({
        project_id: proj.id,
        field_id: fieldId,
        source_worksheet_instance_id: inst.id,
        entered_by: userId,
        source_type: 'entered',
        ...cols,
      })}`;
  };

  // ── persisted inputs (mirrors the live project's entered values) ──
  await insParam(aFieldId, { value_number: String(GAR27.A) });
  await insParam(r5100FieldId, { value_number: String(GAR27.r_5_100) });
  await insParam(r55FieldId, { value_number: String(GAR27.r_5_5) });
  // The decoy twins carry saved values on the live row (A mirrored; the correct
  // C=0.82 stranded in C_abflusswert). Seed them for row-shape fidelity.
  await insParam(aEinzugsflaecheFieldId, { value_number: String(GAR27.A) });
  await insParam(cAbflusswertFieldId, { value_number: String(GAR27.C_CORRECT) });
  // NOTE: the equation-consumed `C` and the derived `Q_NOT` are NOT pre-seeded —
  // the test drives them through saveWorksheet so the assertion exercises the
  // real save path, not a pre-baked row.

  return {
    projectId: proj.id,
    userId,
    standardId: std.id,
    gar27InstanceId: inst.id,
    aFieldId,
    cFieldId,
    r5100FieldId,
    r55FieldId,
    qNotFieldId,
    aEinzugsflaecheFieldId,
    cAbflusswertFieldId,
  };
}
