/**
 * ISO 9001:2008 ("Sistemas de gestión de la calidad — Requisitos" / Quality management systems —
 * Requirements) — minimal fixture for the REAL save-path gate-execution proof.
 *
 * SOURCE PRESENT: ISO-9001.md + .pdf + .xlsx are in the library
 * (C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-9001\). This wave is a FULL document
 * comparison. ISO 9001 is a MANAGEMENT-SYSTEM requirements standard: registration / data_collection /
 * verification archetypes, NO calculations. The encoding houses ZERO equations (the Equations tab is
 * header-only by design — a requirements/"debe" standard prints no formulas). There is therefore
 * nothing to symbol-verify: EQ count = 0, confirmed against prod this session (equations rows = 0).
 *
 * EDITION NOTE: the encoder brief assumed the 2015 High-Level Structure (clauses 4–10); the supplied
 * source is ISO 9001:2008 (normative clauses 4–8). Per the verbatim rule the workbook was encoded
 * strictly from the 2008 source. The 7 worksheets are a PDCA decomposition OVER the 2008 clauses.
 *
 * This fixture is the EXECUTION half: it proves each live BLOCK gate enforces through the real save
 * path. Conditions + severities are pulled VERBATIM from prod compliance_requirements (standard
 * ISO-9001 = 38053f8a-773f-47a9-9ebd-29731f4e2def, project vadsmshzebefjreqcicl, this session).
 * Nothing is applied to prod.
 *
 * TOPOLOGY (verbatim from live prod, re-executed this session): 7 worksheet_templates
 * (ISO-9001-01 … -07) mapping the PDCA cycle —
 *   01 Registrierung / Anwendungsbereich / QMS-Dokumentation (§1;§2;§3;§4.1;§4.2.1–4.2.4)
 *   02 Verantwortung der Leitung & Qualitätspolitik (§5.1;§5.2;§5.3;§5.5.1–5.5.3)
 *   03 Planung: Qualitätsziele & QMS-Planung (§5.4.1;§5.4.2)
 *   04 Management der Ressourcen (§6.1;§6.2.2;§6.3;§6.4)
 *   05 Produktrealisierung (§7.1;§7.2.1–7.2.3;§7.3;§7.4.1–7.4.3;§7.5.1–7.5.5;§7.6)
 *   06 Messung, Analyse & Leistungsbewertung (§5.6.1–5.6.3;§8.1;§8.2.1–8.2.4;§8.4)
 *   07 Lenkung nichtkonformer Produkte & Verbesserung (§8.3;§8.5.1–8.5.3)
 * 69 active fields, 0 equations, 48 compliance_requirements. Of the 48, 45 are severity='block' with
 * a non-empty condition (CR-01 … CR-45) and THREE are severity='warn' (CR-46 §2/§3 ISO 9000 terms,
 * CR-47 §0.3 ISO 9004 companion, CR-48 note-to-§8.2.2 ISO 19011 audit guidance). The three warn gates
 * carry the literal condition `TRUE` — they are informative cross-references, never enforced: warn
 * severity is filtered OUT of checkApprovalGate.failingBlockConditions (the approval-gate query is
 * `severity='block'`), and even if driven, `TRUE` parses to a lit(true) ⇒ always-pass. They are NOT
 * part of the block-enforcement proof and are NOT seeded. The fixture seeds all 7 worksheets and the
 * 66 distinct field symbols the 45 block gates read.
 *
 * SINGLE-HOME / NO CROSS-WORKSHEET topology (verified against prod this session): EVERY block gate
 * reads ONLY fields that live on the gate's OWN home worksheet — there are NO cross-worksheet operand
 * reads in ISO-9001. checkApprovalGate's project-wide fallback is therefore never consulted for these
 * gates; each gate resolves entirely from its local symbol map. No symbol name collides across the 7
 * worksheets, so serial tests are independent. (The prompt's "seed cross-worksheet field homes" step
 * is a no-op for this standard, recorded explicitly rather than silently skipped.)
 *
 * GRAMMAR-TRAP AUDIT (this session, against src/lib/compliance/evaluate.ts + prod values —
 * NONE of the 4 known engine traps are present in ISO-9001):
 *   1. bare-ident-RHS `field OP field` under an ORDERING op: NONE. ISO-9001 has ZERO ordering-op
 *      gates (<, <=, >, >=). No numeric comparison gate exists at all (0 equations, 0 numeric fields
 *      read by any gate).
 *   2. `!= null` / `== null` / `!= ''` block gate: NONE. CR-04 (manual_calidad) and CR-13
 *      (representante_direccion) were `... != ''` and were REPAIRED corpus-wide to `IS NOT EMPTY`;
 *      verified in prod this session as `IS NOT EMPTY`. In evaluate.ts, IS NOT EMPTY and IS NOT NULL
 *      parse to the IDENTICAL `exists` node (both keywords accepted; '' treated as absent), so CR-04
 *      and CR-13 reach a definite `fail` when the field is cleared — proven both ways below. ZERO
 *      `!= ''` gates remain (all 48 conditions inspected this session).
 *   3. `IN {Titlecase}` vs lowercase enum: NONE. ISO-9001 has ZERO membership (`IN {...}`) gates. The
 *      one enum field (tratamiento_no_conformidad, §8.3 a–d) is not read by any compliance condition.
 *   4. unparenthesised `IF a THEN b AND IF c THEN d` nested guard: NONE. ISO-9001 has NO IF/THEN guard
 *      and NO OR gate. Every compound gate is a flat left-associative AND-chain (CR-01/03/11 2-way,
 *      CR-19 4-way, CR-09 5-way, CR-26 7-way), parses unambiguously.
 *
 * FIFTH SHAPE — TRUE NO-OP / `boolean IN {true,false}`: NONE. ISO-9001 has no membership gate at all,
 * so the F-4 no-op class does not arise among the BLOCK gates. The only degenerate/definition-as-gate
 * shape is the three WARN cross-reference gates with literal condition `TRUE` (always-pass), reported
 * on the sign-off sheet — but they are severity='warn', outside the block-enforcement path, and not
 * seeded.
 *
 * DEGENERATE / JUDGMENT SHAPES (reported, NOT "fixed"):
 *   - PRESENCE-ONLY / boolean-flag gates: every block gate is either `<flag> == true` (documented/
 *     adopted boolean) or `<field> IS NOT NULL`/`IS NOT EMPTY`. They require the field be ANSWERED,
 *     not substantively correct (e.g. CR-09 collapses the five §5.3 quality-policy criteria into five
 *     booleans; CR-26 collapses the §7.3 design-&-development chain into a 7-way presence check).
 *     Enforcement is real (proven both ways) but semantically weaker than the clause title.
 *   - CR-26/31/32/33 are `IS NOT NULL` on BOOLEAN fields (§7.3, §7.5.2, §7.5.3, §7.5.4 — the
 *     excludable/optional clauses): a boolean set to either true or false satisfies IS NOT NULL; only
 *     an UNSET field fails. Proven both ways (set → pass, cleared → fail).
 *
 * Only rows the harness reads are seeded — NO prod credentials, disposable PG. Nothing is applied
 * to prod.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type DType = 'number' | 'boolean' | 'text' | 'enum' | 'date' | 'json';

/**
 * Fields to seed per worksheet — each gate symbol on exactly ONE home worksheet
 * (symbol + data_type verbatim from prod fields). Only the 66 symbols the 45 block
 * gates read are seeded (the 3 non-gate fields — nombre_organizacion, producto_servicio,
 * alcance_qms, procedimientos_documentados_requeridos, exclusiones_cap7,
 * justificacion_exclusiones, formacion_proporcionada, tratamiento_no_conformidad — are
 * not read by any block condition, so are omitted).
 */
export const ISO9001_FIELDS: Record<string, Array<{ symbol: string; dataType: DType }>> = {
  'ISO-9001-01': [
    { symbol: 'procesos_qms_determinados', dataType: 'boolean' },           // CR-01
    { symbol: 'secuencia_interaccion_procesos', dataType: 'boolean' },       // CR-01
    { symbol: 'procesos_contratados_externamente', dataType: 'text' },       // CR-02
    { symbol: 'politica_calidad_documentada', dataType: 'boolean' },         // CR-03
    { symbol: 'objetivos_calidad_documentados', dataType: 'boolean' },       // CR-03
    { symbol: 'manual_calidad', dataType: 'text' },                          // CR-04 (repaired IS NOT EMPTY)
    { symbol: 'control_documentos', dataType: 'boolean' },                   // CR-05
    { symbol: 'control_registros', dataType: 'boolean' },                    // CR-06
  ],
  'ISO-9001-02': [
    { symbol: 'evidencia_compromiso_direccion', dataType: 'boolean' },       // CR-07
    { symbol: 'enfoque_cliente_asegurado', dataType: 'boolean' },            // CR-08
    { symbol: 'politica_calidad_adecuada', dataType: 'boolean' },            // CR-09
    { symbol: 'politica_compromiso_cumplir_mejorar', dataType: 'boolean' },  // CR-09
    { symbol: 'politica_marco_objetivos', dataType: 'boolean' },             // CR-09
    { symbol: 'politica_comunicada_entendida', dataType: 'boolean' },        // CR-09
    { symbol: 'politica_revisada_adecuacion', dataType: 'boolean' },         // CR-09
    { symbol: 'responsabilidades_autoridades_definidas', dataType: 'boolean' }, // CR-12
    { symbol: 'representante_direccion', dataType: 'text' },                 // CR-13 (repaired IS NOT EMPTY)
    { symbol: 'comunicacion_interna_establecida', dataType: 'boolean' },     // CR-14
  ],
  'ISO-9001-03': [
    { symbol: 'objetivos_calidad_medibles', dataType: 'boolean' },           // CR-10
    { symbol: 'planificacion_qms_realizada', dataType: 'boolean' },          // CR-11
    { symbol: 'integridad_qms_mantenida', dataType: 'boolean' },             // CR-11
  ],
  'ISO-9001-04': [
    { symbol: 'recursos_provistos', dataType: 'boolean' },                   // CR-18
    { symbol: 'competencia_personal_determinada', dataType: 'boolean' },     // CR-19
    { symbol: 'eficacia_acciones_evaluada', dataType: 'boolean' },           // CR-19
    { symbol: 'conciencia_personal', dataType: 'boolean' },                  // CR-19
    { symbol: 'registros_competencia', dataType: 'boolean' },                // CR-19
    { symbol: 'infraestructura_provista', dataType: 'boolean' },             // CR-20
    { symbol: 'ambiente_trabajo_gestionado', dataType: 'boolean' },          // CR-21
  ],
  'ISO-9001-05': [
    { symbol: 'planificacion_realizacion_producto', dataType: 'boolean' },   // CR-22
    { symbol: 'requisitos_producto_determinados', dataType: 'boolean' },     // CR-23
    { symbol: 'revision_requisitos_producto', dataType: 'boolean' },         // CR-24
    { symbol: 'comunicacion_cliente', dataType: 'boolean' },                 // CR-25
    { symbol: 'planificacion_diseno_desarrollo', dataType: 'boolean' },      // CR-26
    { symbol: 'entradas_diseno', dataType: 'boolean' },                      // CR-26
    { symbol: 'resultados_diseno', dataType: 'boolean' },                    // CR-26
    { symbol: 'revision_diseno', dataType: 'boolean' },                      // CR-26
    { symbol: 'verificacion_diseno', dataType: 'boolean' },                  // CR-26
    { symbol: 'validacion_diseno', dataType: 'boolean' },                    // CR-26
    { symbol: 'control_cambios_diseno', dataType: 'boolean' },               // CR-26
    { symbol: 'proceso_compras', dataType: 'boolean' },                      // CR-27
    { symbol: 'informacion_compras', dataType: 'boolean' },                  // CR-28
    { symbol: 'verificacion_productos_comprados', dataType: 'boolean' },     // CR-29
    { symbol: 'control_produccion', dataType: 'boolean' },                   // CR-30
    { symbol: 'validacion_procesos_produccion', dataType: 'boolean' },       // CR-31 (IS NOT NULL on boolean)
    { symbol: 'identificacion_trazabilidad', dataType: 'boolean' },          // CR-32 (IS NOT NULL on boolean)
    { symbol: 'propiedad_cliente', dataType: 'boolean' },                    // CR-33 (IS NOT NULL on boolean)
    { symbol: 'preservacion_producto', dataType: 'boolean' },                // CR-34
    { symbol: 'control_equipos_medicion', dataType: 'boolean' },             // CR-35
  ],
  'ISO-9001-06': [
    { symbol: 'revision_direccion_realizada', dataType: 'boolean' },         // CR-15
    { symbol: 'entradas_revision_direccion', dataType: 'boolean' },          // CR-16
    { symbol: 'resultados_revision_direccion', dataType: 'boolean' },        // CR-17
    { symbol: 'procesos_medicion_planificados', dataType: 'boolean' },       // CR-36
    { symbol: 'seguimiento_satisfaccion_cliente', dataType: 'boolean' },     // CR-37
    { symbol: 'auditoria_interna_programa', dataType: 'boolean' },           // CR-38
    { symbol: 'seguimiento_medicion_procesos', dataType: 'boolean' },        // CR-39
    { symbol: 'seguimiento_medicion_producto', dataType: 'boolean' },        // CR-40
    { symbol: 'analisis_datos', dataType: 'boolean' },                       // CR-42
  ],
  'ISO-9001-07': [
    { symbol: 'control_producto_no_conforme', dataType: 'boolean' },         // CR-41
    { symbol: 'mejora_continua', dataType: 'boolean' },                      // CR-43
    { symbol: 'accion_correctiva', dataType: 'boolean' },                    // CR-44
    { symbol: 'accion_preventiva', dataType: 'boolean' },                    // CR-45
  ],
};

/** Worksheets to instantiate (all 7 — one per PDCA phase; each hosts >=1 block gate). */
export const ISO9001_WORKSHEETS = [
  'ISO-9001-01', 'ISO-9001-02', 'ISO-9001-03', 'ISO-9001-04',
  'ISO-9001-05', 'ISO-9001-06', 'ISO-9001-07',
] as const;

/** All 45 live BLOCK gates (severity='block', non-empty condition), grouped by home worksheet.
 *  Conditions + severities VERBATIM from prod compliance_requirements. CR-46/47/48 are
 *  severity='warn' (condition `TRUE`, informative cross-references) → NOT block gates → omitted. */
export const ISO9001_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  // ISO-9001-01 — Registrierung, Anwendungsbereich & QMS-Dokumentation (§1;§4.1;§4.2.1–4.2.4)
  { ws: 'ISO-9001-01', code: 'ISO-9001-CR-01', cond: 'procesos_qms_determinados == true AND secuencia_interaccion_procesos == true', sev: 'block' },
  { ws: 'ISO-9001-01', code: 'ISO-9001-CR-02', cond: 'procesos_contratados_externamente IS NOT NULL', sev: 'block' },
  { ws: 'ISO-9001-01', code: 'ISO-9001-CR-03', cond: 'politica_calidad_documentada == true AND objetivos_calidad_documentados == true', sev: 'block' },
  { ws: 'ISO-9001-01', code: 'ISO-9001-CR-04', cond: 'manual_calidad IS NOT EMPTY', sev: 'block' }, // REPAIRED from != ''
  { ws: 'ISO-9001-01', code: 'ISO-9001-CR-05', cond: 'control_documentos == true', sev: 'block' },
  { ws: 'ISO-9001-01', code: 'ISO-9001-CR-06', cond: 'control_registros == true', sev: 'block' },
  // ISO-9001-02 — Verantwortung der Leitung & Qualitätspolitik (§5.1;§5.2;§5.3;§5.5.1–5.5.3)
  { ws: 'ISO-9001-02', code: 'ISO-9001-CR-07', cond: 'evidencia_compromiso_direccion == true', sev: 'block' },
  { ws: 'ISO-9001-02', code: 'ISO-9001-CR-08', cond: 'enfoque_cliente_asegurado == true', sev: 'block' },
  { ws: 'ISO-9001-02', code: 'ISO-9001-CR-09', cond: 'politica_calidad_adecuada == true AND politica_compromiso_cumplir_mejorar == true AND politica_marco_objetivos == true AND politica_comunicada_entendida == true AND politica_revisada_adecuacion == true', sev: 'block' },
  { ws: 'ISO-9001-02', code: 'ISO-9001-CR-12', cond: 'responsabilidades_autoridades_definidas == true', sev: 'block' },
  { ws: 'ISO-9001-02', code: 'ISO-9001-CR-13', cond: 'representante_direccion IS NOT EMPTY', sev: 'block' }, // REPAIRED from != ''
  { ws: 'ISO-9001-02', code: 'ISO-9001-CR-14', cond: 'comunicacion_interna_establecida == true', sev: 'block' },
  // ISO-9001-03 — Planung: Qualitätsziele & QMS-Planung (§5.4.1;§5.4.2)
  { ws: 'ISO-9001-03', code: 'ISO-9001-CR-10', cond: 'objetivos_calidad_medibles == true', sev: 'block' },
  { ws: 'ISO-9001-03', code: 'ISO-9001-CR-11', cond: 'planificacion_qms_realizada == true AND integridad_qms_mantenida == true', sev: 'block' },
  // ISO-9001-04 — Management der Ressourcen (§6.1;§6.2.2;§6.3;§6.4)
  { ws: 'ISO-9001-04', code: 'ISO-9001-CR-18', cond: 'recursos_provistos == true', sev: 'block' },
  { ws: 'ISO-9001-04', code: 'ISO-9001-CR-19', cond: 'competencia_personal_determinada == true AND eficacia_acciones_evaluada == true AND conciencia_personal == true AND registros_competencia == true', sev: 'block' },
  { ws: 'ISO-9001-04', code: 'ISO-9001-CR-20', cond: 'infraestructura_provista == true', sev: 'block' },
  { ws: 'ISO-9001-04', code: 'ISO-9001-CR-21', cond: 'ambiente_trabajo_gestionado == true', sev: 'block' },
  // ISO-9001-05 — Produktrealisierung (§7.1;§7.2.1–7.2.3;§7.3;§7.4.1–7.4.3;§7.5.1–7.5.5;§7.6)
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-22', cond: 'planificacion_realizacion_producto == true', sev: 'block' },
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-23', cond: 'requisitos_producto_determinados == true', sev: 'block' },
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-24', cond: 'revision_requisitos_producto == true', sev: 'block' },
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-25', cond: 'comunicacion_cliente == true', sev: 'block' },
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-26', cond: 'planificacion_diseno_desarrollo IS NOT NULL AND entradas_diseno IS NOT NULL AND resultados_diseno IS NOT NULL AND revision_diseno IS NOT NULL AND verificacion_diseno IS NOT NULL AND validacion_diseno IS NOT NULL AND control_cambios_diseno IS NOT NULL', sev: 'block' },
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-27', cond: 'proceso_compras == true', sev: 'block' },
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-28', cond: 'informacion_compras == true', sev: 'block' },
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-29', cond: 'verificacion_productos_comprados == true', sev: 'block' },
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-30', cond: 'control_produccion == true', sev: 'block' },
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-31', cond: 'validacion_procesos_produccion IS NOT NULL', sev: 'block' }, // IS NOT NULL on boolean
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-32', cond: 'identificacion_trazabilidad IS NOT NULL', sev: 'block' },     // IS NOT NULL on boolean
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-33', cond: 'propiedad_cliente IS NOT NULL', sev: 'block' },               // IS NOT NULL on boolean
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-34', cond: 'preservacion_producto == true', sev: 'block' },
  { ws: 'ISO-9001-05', code: 'ISO-9001-CR-35', cond: 'control_equipos_medicion == true', sev: 'block' },
  // ISO-9001-06 — Messung, Analyse & Leistungsbewertung (§5.6.1–5.6.3;§8.1;§8.2.1–8.2.4;§8.4)
  { ws: 'ISO-9001-06', code: 'ISO-9001-CR-15', cond: 'revision_direccion_realizada == true', sev: 'block' },
  { ws: 'ISO-9001-06', code: 'ISO-9001-CR-16', cond: 'entradas_revision_direccion == true', sev: 'block' },
  { ws: 'ISO-9001-06', code: 'ISO-9001-CR-17', cond: 'resultados_revision_direccion == true', sev: 'block' },
  { ws: 'ISO-9001-06', code: 'ISO-9001-CR-36', cond: 'procesos_medicion_planificados == true', sev: 'block' },
  { ws: 'ISO-9001-06', code: 'ISO-9001-CR-37', cond: 'seguimiento_satisfaccion_cliente == true', sev: 'block' },
  { ws: 'ISO-9001-06', code: 'ISO-9001-CR-38', cond: 'auditoria_interna_programa == true', sev: 'block' },
  { ws: 'ISO-9001-06', code: 'ISO-9001-CR-39', cond: 'seguimiento_medicion_procesos == true', sev: 'block' },
  { ws: 'ISO-9001-06', code: 'ISO-9001-CR-40', cond: 'seguimiento_medicion_producto == true', sev: 'block' },
  { ws: 'ISO-9001-06', code: 'ISO-9001-CR-42', cond: 'analisis_datos == true', sev: 'block' },
  // ISO-9001-07 — Lenkung nichtkonformer Produkte & Verbesserung (§8.3;§8.5.1–8.5.3)
  { ws: 'ISO-9001-07', code: 'ISO-9001-CR-41', cond: 'control_producto_no_conforme == true', sev: 'block' },
  { ws: 'ISO-9001-07', code: 'ISO-9001-CR-43', cond: 'mejora_continua == true', sev: 'block' },
  { ws: 'ISO-9001-07', code: 'ISO-9001-CR-44', cond: 'accion_correctiva == true', sev: 'block' },
  { ws: 'ISO-9001-07', code: 'ISO-9001-CR-45', cond: 'accion_preventiva == true', sev: 'block' },
] as const;

export type ISO9001Fixture = {
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

export async function seedISO9001(sql: postgres.Sql, userId: string): Promise<ISO9001Fixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'iso9001-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('ISO9001 Harness Org', ${'iso9001-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'ISO9001-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('ISO-9001', 'ISO 9001 (harness)', 'harness') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldMeta: Record<string, { fieldId: string; dataType: string; ws: string }> = {};
  const symbolHome: Record<string, string> = {};
  const templateByWs: Record<string, string> = {};

  for (const ws of ISO9001_WORKSHEETS) {
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
    for (const f of ISO9001_FIELDS[ws]) {
      // active=true; is_required deliberately FALSE so the per-gate proof isolates the
      // block-CONDITION path (checkApprovalGate's separate missing-required-field list is
      // not what we are proving here). gateBlocks() reads only failingBlockConditions.
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, false, ${oi++})
        RETURNING id`;
      fieldMeta[`${ws}:${f.symbol}`] = { fieldId: row.id, dataType: f.dataType, ws };
      symbolHome[f.symbol] = ws;
    }
  }

  // Seed the 45 live BLOCK gates against their home worksheet templates.
  for (const g of ISO9001_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldMeta, symbolHome };
}
