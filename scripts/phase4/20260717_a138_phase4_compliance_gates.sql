-- =============================================================================
-- WRITTEN-NOT-APPLIED
-- Apply at: Phase-4 import gate (manual gated apply after review)
-- Migration: 20260717_a138_phase4_compliance_gates
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
-- =============================================================================
--
-- Adds THREE block-severity compliance gates for DWA-A-138-1 Phase 4:
--
--   A138-REQ-20  A138-16 Fläche    §6.2.2 Gl.(13)  k_i > r_D(n)·10⁻⁷
--   A138-REQ-21  A138-18 Rigole    §6.4.2 Gl.(25)  L_VS·q_VS ≥ r_5(n)·A_C·10⁻⁴
--   A138-REQ-22  A138-21 Schacht   §6.7.2 Gl.(38)  A_S,FS·k_f,FS ≥ A_S,Schacht·k_i  (Typ B only)
--
-- =============================================================================
-- MIGRATION-REVIEW CHECKLIST
-- [x] All literal values are type-correct (numeric: 0.0000001, 0.0001; strings quoted)
-- [x] ON CONFLICT target matches the unique index:
--     compliance_requirements_worksheet_template_id_code_key (worksheet_template_id, code)
-- [x] audit_status is NOT set in the INSERT values → defaults to NULL on new rows
-- [x] ON CONFLICT SET clause does NOT touch audit_status (preserved for existing rows)
-- [x] worksheet_template_id resolved via correlated subquery (code + standard_id), never hardcoded
-- [x] Symbols verified live in prod (see task-5-report.md):
--       REQ-20: k_i (cross-ws from A138-11), r_D_n_used (local A138-16)
--       REQ-21: L_VS, q_VS, r_5_n (local A138-18), A_C (cross-ws from A138-07)
--       REQ-22: A_S_FS, k_f_FS, A_S_Schacht (local A138-21), k_i (cross-ws A138-11),
--               shaft_type enum with values typ_A / typ_B (local A138-21)
-- [x] Absent-input behaviour verified: pending (non-blocking) — gives REQ-21 applicability for free
-- [x] IF/THEN guard confirmed supported by evaluator (evaluate.ts:guard node)
-- [x] No inbound FK from project_parameters to compliance_requirements (rollback is safe)
-- =============================================================================

DO $$
DECLARE
  v_standard_id  uuid;
  v_wt_16        uuid;
  v_wt_18        uuid;
  v_wt_21        uuid;
BEGIN
  -- Resolve the standard ID once
  SELECT id INTO v_standard_id
  FROM standards
  WHERE code = 'DWA-A-138-1'
  LIMIT 1;

  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DWA-A-138-1 not found — apply after standard import';
  END IF;

  -- Resolve worksheet template IDs
  SELECT id INTO v_wt_16 FROM worksheet_templates
  WHERE standard_id = v_standard_id AND code = 'A138-16' LIMIT 1;

  SELECT id INTO v_wt_18 FROM worksheet_templates
  WHERE standard_id = v_standard_id AND code = 'A138-18' LIMIT 1;

  SELECT id INTO v_wt_21 FROM worksheet_templates
  WHERE standard_id = v_standard_id AND code = 'A138-21' LIMIT 1;

  IF v_wt_16 IS NULL THEN RAISE EXCEPTION 'Worksheet template A138-16 not found'; END IF;
  IF v_wt_18 IS NULL THEN RAISE EXCEPTION 'Worksheet template A138-18 not found'; END IF;
  IF v_wt_21 IS NULL THEN RAISE EXCEPTION 'Worksheet template A138-21 not found'; END IF;

  -- -------------------------------------------------------------------------
  -- REQ-20: A138-16 Fläche — Infiltrationsfähigkeit §6.2.2 Gl.(13)
  --
  -- Condition:  k_i > r_D_n_used * 0.0000001
  -- Symbols:
  --   k_i         — cross-worksheet (owner: A138-11, consumer: A138-16)
  --   r_D_n_used  — local field on A138-16
  -- Applicability: UNCONDITIONAL — if either symbol is absent the evaluator
  --   returns `pending` (non-blocking), so the gate only fires once both are set.
  -- -------------------------------------------------------------------------
  INSERT INTO compliance_requirements (
    worksheet_template_id,
    code,
    title_de,
    title_en,
    condition,
    severity,
    clause_reference,
    source_quote,
    requires_attestation
  ) VALUES (
    v_wt_16,
    'A138-REQ-20',
    'Infiltrationsfähigkeit k_i > r_D(n)·10⁻⁷ (Gl. 13)',
    'Infiltration feasibility k_i > r_D(n)·10⁻⁷ (Eq. 13)',
    'k_i > r_D_n_used * 0.0000001',
    'block',
    '§6.2.2 Gl.(13)',
    'k_i > r_D(n) · 10⁻⁷ … Wenn die Bedingung gemäß GL. (13) nicht erfüllt ist, erhält man ein negatives Ergebnis, weil die Niederschlagsintensität die vorhandene Infiltrationsrate übersteigt.',
    false
  )
  ON CONFLICT (worksheet_template_id, code) DO UPDATE SET
    title_de        = EXCLUDED.title_de,
    title_en        = EXCLUDED.title_en,
    condition       = EXCLUDED.condition,
    severity        = EXCLUDED.severity,
    clause_reference = EXCLUDED.clause_reference,
    source_quote    = EXCLUDED.source_quote,
    requires_attestation = EXCLUDED.requires_attestation
  -- audit_status intentionally NOT updated (preserves existing review state)
  ;

  -- -------------------------------------------------------------------------
  -- REQ-21: A138-18 Rigole — Vollsickerrohr hydraulische Kapazität §6.4.2 Gl.(25)
  --
  -- Condition:  L_VS * q_VS >= r_5_n * A_C * 0.0001
  -- Symbols:
  --   L_VS    — local field on A138-18 (Gesamtlänge Vollsickerrohre)
  --   q_VS    — local field on A138-18 (spezifischer Wasseraustritt)
  --   r_5_n   — local field on A138-18 (Regenspende D=5 min)
  --   A_C     — cross-worksheet (owner: A138-07, consumer: A138-18)
  -- Applicability: "only when Vollsickerrohr exists" — L_VS is only entered
  --   when Vollsickerrohre are planned. When absent, the evaluator returns
  --   `pending` (non-blocking), giving the applicability guard for free without
  --   requiring an explicit IF/THEN wrapper. Documented here, not encoded.
  -- -------------------------------------------------------------------------
  INSERT INTO compliance_requirements (
    worksheet_template_id,
    code,
    title_de,
    title_en,
    condition,
    severity,
    clause_reference,
    source_quote,
    requires_attestation
  ) VALUES (
    v_wt_18,
    'A138-REQ-21',
    'Vollsickerrohr hydraulische Kapazität L_VS·q_VS ≥ r_5(n)·A_C·10⁻⁴ (Gl. 25)',
    'Fully perforated pipe hydraulic capacity L_VS·q_VS ≥ r_5(n)·A_C·10⁻⁴ (Eq. 25)',
    'L_VS * q_VS >= r_5_n * A_C * 0.0001',
    'block',
    '§6.4.2 Gl.(25)',
    'L_VS · q_VS ≥ r_5(n) · AC · 10⁻⁴ … L_VS Gesamtlänge der Vollsickerrohre; r_5(n) Regenspende für D=5 min und Bemessungshäufigkeit n.',
    false
  )
  ON CONFLICT (worksheet_template_id, code) DO UPDATE SET
    title_de        = EXCLUDED.title_de,
    title_en        = EXCLUDED.title_en,
    condition       = EXCLUDED.condition,
    severity        = EXCLUDED.severity,
    clause_reference = EXCLUDED.clause_reference,
    source_quote    = EXCLUDED.source_quote,
    requires_attestation = EXCLUDED.requires_attestation
  -- audit_status intentionally NOT updated
  ;

  -- -------------------------------------------------------------------------
  -- REQ-22: A138-21 Schacht — Filterschicht-Suffizienz §6.7.2 Gl.(38) — Typ B only
  --
  -- Condition:  IF shaft_type == typ_B THEN A_S_FS * k_f_FS >= A_S_Schacht * k_i
  -- Symbols:
  --   shaft_type   — local enum field on A138-21 (values: typ_A, typ_B)
  --   A_S_FS       — local field on A138-21
  --   k_f_FS       — local field on A138-21
  --   A_S_Schacht  — local field on A138-21
  --   k_i          — cross-worksheet (owner: A138-11, consumer: A138-21)
  -- Applicability mechanism: IF/THEN guard (evaluate.ts `guard` node).
  --   When shaft_type != typ_B → guard is false → vacuous PASS (gate does not fire).
  --   When shaft_type == typ_B → body is evaluated; absent k_i → pending (non-blocking).
  --   When shaft_type is absent → guard is pending → gate is pending (non-blocking).
  -- This faithfully encodes "Schacht-Typ = B ONLY" using the supported IF/THEN grammar.
  -- -------------------------------------------------------------------------
  INSERT INTO compliance_requirements (
    worksheet_template_id,
    code,
    title_de,
    title_en,
    condition,
    severity,
    clause_reference,
    source_quote,
    requires_attestation
  ) VALUES (
    v_wt_21,
    'A138-REQ-22',
    'Filterschicht-Suffizienz A_S,FS·k_f,FS ≥ A_S,Schacht·k_i (Gl. 38, Typ B)',
    'Filter layer sufficiency A_S,FS·k_f,FS ≥ A_S,Schacht·k_i (Eq. 38, Type B only)',
    'IF shaft_type == typ_B THEN A_S_FS * k_f_FS >= A_S_Schacht * k_i',
    'block',
    '§6.7.2 Gl.(38)',
    'A_S,FS · k_f,FS ≥ A_S,Schacht · k_i … Schacht-Typ-B-Bedingung: Filterschicht-Versickerungsleistung ≥ Schacht-Versickerungsleistung.',
    false
  )
  ON CONFLICT (worksheet_template_id, code) DO UPDATE SET
    title_de        = EXCLUDED.title_de,
    title_en        = EXCLUDED.title_en,
    condition       = EXCLUDED.condition,
    severity        = EXCLUDED.severity,
    clause_reference = EXCLUDED.clause_reference,
    source_quote    = EXCLUDED.source_quote,
    requires_attestation = EXCLUDED.requires_attestation
  -- audit_status intentionally NOT updated
  ;

END $$;
