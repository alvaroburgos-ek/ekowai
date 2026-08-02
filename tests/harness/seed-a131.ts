/**
 * DWA-A 131 ("Bemessung von einstufigen Belebungsanlagen", Arbeitsblatt DWA-A 131,
 * Juni 2016) — minimal fixture for the REAL save-path gate-execution-proof harness.
 *
 * SOURCE STATUS: the DWA-A-131 source PDF is NOT in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\ has no DWA-A-131 folder — confirmed this
 * session). This is therefore an ENFORCEMENT proof only — it proves each live BLOCK
 * gate that CAN take a violating state enforces BOTH ways through the real save path.
 * It does NOT and cannot verify any threshold against a source, because there is none.
 * The conditions are pulled verbatim from prod compliance_requirements (standard
 * DWA-A-131 = 94d830b9-77c6-4140-8cf0-840b97017575, project vadsmshzebefjreqcicl,
 * this session); no threshold is asserted to be "correct".
 *
 * PROOF MANDATE: A-131's gate enforcement is claimable ONLY by EXECUTION. This
 * fixture drives the standard's live BLOCK gates (every compliance_requirement with
 * severity='block' + a non-empty condition) through the REAL `saveWorksheet` (values
 * persist to project_parameters) and the REAL `checkApprovalGate` (the
 * engineer-approve enforcement read path that replays each block condition against
 * the saved values). Each drivable gate is demonstrated BOTH ways — a state that
 * PASSES it and a state that VIOLATES it, reaching a definite `fail` — so a gate that
 * fires but never enforces (the F-4 lesson) cannot hide.
 *
 * TOPOLOGY (verbatim from prod): 8 worksheet_templates (A131-01 … A131-08), 162
 * active fields, 78 equations, 20 compliance_requirements — ALL 20 are
 * severity='block' with a non-empty condition. The fixture seeds all 8 worksheets;
 * each gate symbol is homed on exactly ONE worksheet (single-home topology, mirrors
 * prod fields), so the project-wide fallback in checkApprovalGate resolves every
 * cross-worksheet operand without conflict.
 *
 * DRIVABILITY SPLIT (20 block gates):
 *   - 15 gates carry a real condition and are driven BOTH ways.
 *   - 5 gates have condition literally `TRUE` (CR-013, CR-017, CR-018, CR-019,
 *     CR-020) — documentary attestation gates. `TRUE` is a tautology: it parses to a
 *     boolean-true literal that always evaluates `pass`, so NO violating state exists
 *     and it can never appear in failingBlockConditions. They are proven "always-pass,
 *     never blocks" (a real property of the enforcement path) and LOGGED as
 *     not-both-ways-drivable by construction. This is not a coverage gap in the gate —
 *     it is the gate's own semantics.
 *
 * CROSS-WORKSHEET FALLBACK (load-bearing): CR-010 lives on A131-06 and reads Q_RS
 * (home A131-06, local) and Q_M (home A131-02) — Q_M resolves via the conflict-free
 * project-wide fallback. This is also the gate that exercises the F-4 fix (see below).
 *
 * KNOWN STANDING RISK — CR-010 bare-symbol RHS (checked this session):
 *   CR-010 = "(nklb_durchstroemung == 'vertikal' AND Q_RS <= Q_M) OR
 *             (Q_RS <= 0.75 * Q_M)".
 *   The sub-term `Q_RS <= Q_M` is an ORDERING compare with a BARE-IDENTIFIER RHS.
 *   Under the legacy string-literal-RHS semantics this stringified `Q_M` to the
 *   symbol NAME "Q_M", so `Number("120") <= "Q_M"` → non-numeric → always false →
 *   the gate SILENTLY NEVER ENFORCED (always failed regardless of values). The F-4
 *   fix in evaluate.ts (parseComparison: an ordering op with an `aref` RHS routes to
 *   the numeric `acompare` path, resolving Q_M via lookup) covers exactly this shape.
 *   The CR-010 both-ways drive below is the EXECUTION proof: the passing state
 *   (Q_RS=90, Q_M=100, second disjunct 90<=75 FALSE) passes ONLY if `Q_RS <= Q_M`
 *   evaluates numerically to true — a string-coerced RHS would keep it blocked.
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod
 * enum values — NONE of the 4 known engine traps are present in A-131):
 *   1. bare-ident-RHS `field == field` / `field != field` (string-coerces): NONE.
 *      Every `==` RHS is a quoted enum string ('vertikal'); there is no `!=` gate.
 *      The only bare-ident RHS is under an ORDERING op (CR-010 `Q_RS <= Q_M`), which
 *      the F-4 fix routes to numeric acompare — proven both-ways below.
 *   2. `!= null` / `== null` block gate (never definite-fail): NONE. A-131 has no
 *      existence gate at all.
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. A-131 has no membership gate.
 *      The enum-equality compares target 'vertikal' — the EXACT lowercase prod enum
 *      value of nklb_durchstroemung — so no case trap.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. A-131 has no
 *      IF/THEN gate; conditional logic is expressed as fully-parenthesised OR-of-ANDs
 *      (CR-006/007/010), which parse unambiguously.
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG.
 * Nothing is applied to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). A131-01 and A131-05 host no gates
 * and no gate-operand fields, but are instantiated so the project topology matches.
 */
export const A131_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'A131-01': [
    // no gate operands homed here
  ],
  'A131-02': [
    { symbol: 'T', dataType: 'number' },
    { symbol: 'Q_M', dataType: 'number' }, // read cross-worksheet by CR-010 (fallback)
  ],
  'A131-03': [
    { symbol: 'PF', dataType: 'number' },
    { symbol: 't_TS_Bem', dataType: 'number' },
    { symbol: 'V_D_V_BB', dataType: 'number' },
  ],
  'A131-04': [
    { symbol: 'x_iter', dataType: 'number' },
  ],
  'A131-05': [
    // no gate operands homed here
  ],
  'A131-06': [
    { symbol: 'nklb_durchstroemung', dataType: 'enum' },
    { symbol: 'q_SV', dataType: 'number' },
    { symbol: 'q_A', dataType: 'number' },
    { symbol: 'ISV', dataType: 'number' },
    { symbol: 'VSV', dataType: 'number' },
    { symbol: 'Q_RS', dataType: 'number' },
    { symbol: 'TS_BB', dataType: 'number' },
    { symbol: 'RV', dataType: 'number' },
    { symbol: 'Q_SR', dataType: 'number' },
    { symbol: 'TS_RS', dataType: 'number' },
    { symbol: 'Q_K', dataType: 'number' },
    { symbol: 'TS_BS', dataType: 'number' },
  ],
  'A131-07': [
    { symbol: 't_T', dataType: 'number' },
  ],
  'A131-08': [
    { symbol: 'S_KS_AB', dataType: 'number' },
  ],
};

/** Worksheets to instantiate (all 8 — gate homes + field homes). */
export const A131_WORKSHEETS = [
  'A131-01', 'A131-02', 'A131-03', 'A131-04',
  'A131-05', 'A131-06', 'A131-07', 'A131-08',
] as const;

/** All 20 live BLOCK gates (non-empty condition), grouped by home worksheet.
 *  Conditions + severities verbatim from prod compliance_requirements.
 *  `drivable:false` marks the `TRUE` tautology gates (no violating state exists). */
export const A131_GATES: ReadonlyArray<{
  ws: string; code: string; cond: string; sev: Sev; drivable: boolean;
}> = [
  // A131-02 — Belastungsdaten und CSB-Fraktionierung
  { ws: 'A131-02', code: 'CR-001', cond: 'T >= 8 AND T <= 20', sev: 'block', drivable: true },
  { ws: 'A131-02', code: 'CR-017', cond: 'TRUE', sev: 'block', drivable: false },
  // A131-03 — Erforderliches Schlammalter
  { ws: 'A131-03', code: 'CR-002', cond: 'PF >= 1.5', sev: 'block', drivable: true },
  { ws: 'A131-03', code: 'CR-003', cond: 't_TS_Bem >= 20', sev: 'block', drivable: true },
  { ws: 'A131-03', code: 'CR-004', cond: 'V_D_V_BB >= 0.2 AND V_D_V_BB <= 0.6', sev: 'block', drivable: true },
  { ws: 'A131-03', code: 'CR-018', cond: 'TRUE', sev: 'block', drivable: false },
  // A131-04 — Denitrifikationsvolumen und Schlammproduktion C
  { ws: 'A131-04', code: 'CR-005', cond: 'x_iter <= 1', sev: 'block', drivable: true },
  // A131-06 — Bemessung der Nachklaerung
  { ws: 'A131-06', code: 'CR-006', cond: "(nklb_durchstroemung == 'vertikal' AND q_SV <= 650) OR (q_SV <= 500)", sev: 'block', drivable: true },
  { ws: 'A131-06', code: 'CR-007', cond: "(nklb_durchstroemung == 'vertikal' AND q_A <= 2.0) OR (q_A <= 1.6)", sev: 'block', drivable: true },
  { ws: 'A131-06', code: 'CR-008', cond: 'ISV >= 50 AND ISV <= 200', sev: 'block', drivable: true },
  { ws: 'A131-06', code: 'CR-009', cond: 'VSV < 600', sev: 'block', drivable: true },
  { ws: 'A131-06', code: 'CR-010', cond: "(nklb_durchstroemung == 'vertikal' AND Q_RS <= Q_M) OR (Q_RS <= 0.75 * Q_M)", sev: 'block', drivable: true },
  { ws: 'A131-06', code: 'CR-011', cond: 'TS_BB > 1.0', sev: 'block', drivable: true },
  { ws: 'A131-06', code: 'CR-012', cond: 'RV >= 0.5', sev: 'block', drivable: true },
  { ws: 'A131-06', code: 'CR-013', cond: 'TRUE', sev: 'block', drivable: false },
  { ws: 'A131-06', code: 'CR-016', cond: 'Q_SR >= (Q_RS * TS_RS - Q_K * TS_BB) / TS_BS', sev: 'block', drivable: true },
  { ws: 'A131-06', code: 'CR-019', cond: 'TRUE', sev: 'block', drivable: false },
  { ws: 'A131-06', code: 'CR-020', cond: 'TRUE', sev: 'block', drivable: false },
  // A131-07 — Bemessung der Belebung
  { ws: 'A131-07', code: 'CR-014', cond: 't_T >= 2', sev: 'block', drivable: true },
  // A131-08 — Nachweise und Zusammenstellung
  { ws: 'A131-08', code: 'CR-015', cond: 'S_KS_AB >= 1.5', sev: 'block', drivable: true },
] as const;

export type A131Fixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code → worksheet_instance id */
  instances: Record<string, string>;
  /** "ws:symbol" → { fieldId, dataType, ws } — for the save helper */
  fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }>;
  /** symbol → home worksheet code (single-home topology) */
  symbolHome: Record<string, string>;
};

export async function seedA131(sql: postgres.Sql, userId: string): Promise<A131Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'a131-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('A131 Harness Org', ${'a131-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'A131-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('DWA-A-131', 'DWA-A 131 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of A131_WORKSHEETS) {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de)
      VALUES (${std.id}, ${ws}, ${ws + ' (harness)'}) RETURNING id`;
    templateByWs[ws] = t.id;
    const [sec] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_sections (worksheet_template_id, code, title_de)
      VALUES (${t.id}, ${'S-' + ws}, ${'S-' + ws}) RETURNING id`;
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id)
      VALUES (${proj.id}, ${t.id}) RETURNING id`;
    instances[ws] = inst.id;

    let oi = 1;
    for (const f of A131_FIELDS[ws]) {
      // active=true; is_required deliberately FALSE so the per-gate proof isolates
      // the block-CONDITION path (checkApprovalGate's separate missing-required-field
      // list is not what we are proving here).
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 20 live BLOCK gates against their home worksheet templates.
  for (const g of A131_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
