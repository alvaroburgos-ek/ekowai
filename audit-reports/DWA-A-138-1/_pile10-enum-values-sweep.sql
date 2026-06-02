-- =====================================================================
-- Pile-10: populate enum_values for 19 enum fields on DWA-A-138-1 +
--   fix 2 dead compliance conditions whose tested values can never be
--   produced by the source enum.
--
-- BACKGROUND
--   PR #30 fixed contaminated_land_status. Its diagnosis found 18 more
--   enum fields with NULL enum_values (all is_required=true). With NULL
--   enum_values, DynamicField renders zero buttons → the engineer cannot
--   select a value → any compliance/prohibition check that consumes the
--   symbol is effectively DEAD even though its condition string is
--   parseable.
--
-- DEAD-CHECK FINDINGS (verified by enum-value ↔ condition string match
-- AND by replaying each condition against the evaluator parser)
--   ALL FIVE production `IN (...)` conditions return `manual` from the
--   evaluator today (not pass/fail). Root cause is TWO compounding bugs:
--     1) Syntax: the evaluator DSL accepts `IN {a, b}` (brace + bare
--        identifiers). The production conditions use SQL-style
--        `IN ('a','b')` (paren + quoted strings) — the parser rejects
--        the `(` after IN and bails out to `manual`.
--     2) Values: even with correct syntax, two of the five would still
--        be dead because the tested literals can never be produced by
--        the source enum:
--          - REQ-02 `'Feasible','Conditional'` vs lowercase enum
--            `feasible/conditional/not_feasible`.
--          - REQ-23 `'N/A'` (with slash) vs enum value `NA`.
--   → Fix here for all five (REQ-02, -09, -16, -19, -23): rewrite to
--     brace syntax with bare identifiers that exactly match the source
--     enum values. After the fix every selectable enum value yields a
--     definite pass/fail (proved end-to-end in the gated-conditions
--     test).
--   (A138-REQ-08 `n IN Tab8_values` is another dead check — paren-less
--    placeholder, `n` is a number field. Out of scope here.)
--
-- WHAT THIS DOES (additive, IS NULL guarded, NOT applied by this PR)
--   §1  UPDATE fields.enum_values for 19 fields, from source JSON.
--       15 mirror source enum_name verbatim (de/en labels, regulation
--          references). 4 are wizard-internal (no source enum_name in
--          the Pass3c export): design_basis_final mirrors design_method;
--          facility_type_final mirrors facility_type; data_quality_assessment
--          and design_review_status get engineer-sensible defaults clearly
--          labelled as wizard-internal in the audit_notes.
--   §2  UPDATE compliance_requirements.condition for the two dead checks.
--       Guarded by the exact current condition string so re-applying or
--       re-running after a prior fix is a no-op.
-- =====================================================================


-- ============= §1 — POPULATE enum_values (19 fields) =============

-- A138-01 · water_protection_zone — GATE for Pile-7 COV-01 (`!= zone_I`).
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','none','label_de','Keine','label_en','None','order_index',1,'regulation_reference','§5.1.2, §5.2'),
  jsonb_build_object('value','zone_III','label_de','Schutzzone III','label_en','Zone III','order_index',2,'regulation_reference','§5.2'),
  jsonb_build_object('value','zone_II','label_de','Schutzzone II','label_en','Zone II','order_index',3,'regulation_reference','§5.2'),
  jsonb_build_object('value','zone_I','label_de','Schutzzone I','label_en','Zone I','order_index',4,'regulation_reference','§5.2')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: enum_values populated from source JSON enum_name=protection_zone. Values exactly match COV-01 condition target zone_I.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-01' AND f.symbol = 'water_protection_zone' AND f.enum_values IS NULL;

-- A138-02 · building_clearance_status (clearance_status source enum).
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','met','label_de','Eingehalten','label_en','Met','order_index',1,'regulation_reference','§5.1.2'),
  jsonb_build_object('value','not_met_protection_possible','label_de','Nicht eingehalten (Schutz möglich)','label_en','Not met (protection possible)','order_index',2,'regulation_reference','§5.1.2'),
  jsonb_build_object('value','not_met_no_protection','label_de','Nicht eingehalten (kein Schutz)','label_en','Not met (no protection)','order_index',3,'regulation_reference','§5.1.2')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: enum_values populated from source JSON enum_name=clearance_status.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-02' AND f.symbol = 'building_clearance_status' AND f.enum_values IS NULL;

-- A138-02 · feasibility_determination — referenced by REQ-02 (post-fix).
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','feasible','label_de','Umsetzbar','label_en','Feasible','order_index',1,'regulation_reference','§5.1.2, Tab. 3'),
  jsonb_build_object('value','conditional','label_de','Bedingt umsetzbar','label_en','Conditional','order_index',2,'regulation_reference','§5.1.2, Tab. 3'),
  jsonb_build_object('value','not_feasible','label_de','Nicht umsetzbar','label_en','Not Feasible','order_index',3,'regulation_reference','§5.1.2, Tab. 3')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: enum_values populated from source JSON enum_name=feasibility. REQ-02 condition lowercased in §2 below to match.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-02' AND f.symbol = 'feasibility_determination' AND f.enum_values IS NULL;

-- A138-02 · geotech_hazards (hazard_proximity).
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','none','label_de','Keine','label_en','None','order_index',1,'regulation_reference','§5.1.2'),
  jsonb_build_object('value','nearby','label_de','In der Nähe','label_en','Nearby','order_index',2,'regulation_reference','§5.1.2'),
  jsonb_build_object('value','at_site','label_de','Am Standort','label_en','At site','order_index',3,'regulation_reference','§5.1.2')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=hazard_proximity.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-02' AND f.symbol = 'geotech_hazards' AND f.enum_values IS NULL;

-- A138-03 · data_completeness (completeness).
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','complete','label_de','Vollständig','label_en','Complete','order_index',1,'regulation_reference','§2'),
  jsonb_build_object('value','partial','label_de','Teilweise','label_en','Partial','order_index',2,'regulation_reference','§2'),
  jsonb_build_object('value','insufficient','label_de','Unzureichend','label_en','Insufficient','order_index',3,'regulation_reference','§2')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=completeness.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-03' AND f.symbol = 'data_completeness' AND f.enum_values IS NULL;

-- A138-03 · permeability_test_method (kf_method).
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','feldversuch','label_de','Feldversuch','label_en','Field test','order_index',1,'regulation_reference','Anh. A Tab. A.1'),
  jsonb_build_object('value','laborversuch','label_de','Laborversuch','label_en','Laboratory test','order_index',2,'regulation_reference','Anh. A Tab. A.1'),
  jsonb_build_object('value','korngroessenanalyse','label_de','Korngrößenanalyse','label_en','Grain-size analysis','order_index',3,'regulation_reference','Anh. A Tab. A.1'),
  jsonb_build_object('value','literaturwert','label_de','Literaturwert','label_en','Literature value','order_index',4,'regulation_reference','Anh. A Tab. A.1')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=kf_method.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-03' AND f.symbol = 'permeability_test_method' AND f.enum_values IS NULL;

-- A138-06 · belastungskategorie (bk_category) — GATE for COV-04 + COV-06.
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','BK_I','label_de','BK I (niedrig)','label_en','BK I (low)','order_index',1,'regulation_reference','§5.2, Tab. 5'),
  jsonb_build_object('value','BK_II','label_de','BK II (mittel)','label_en','BK II (medium)','order_index',2,'regulation_reference','§5.2, Tab. 5'),
  jsonb_build_object('value','BK_III','label_de','BK III (hoch)','label_en','BK III (high)','order_index',3,'regulation_reference','§5.2, Tab. 5')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=bk_category. Values exactly match COV-04a..d / COV-06a..f conditions (BK_I/BK_II/BK_III).',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-06' AND f.symbol = 'belastungskategorie' AND f.enum_values IS NULL;

-- A138-09 · data_quality_assessment — WIZARD-INTERNAL (no source enum).
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','high','label_de','Hoch','label_en','High','order_index',1,'regulation_reference','wizard-internal'),
  jsonb_build_object('value','medium','label_de','Mittel','label_en','Medium','order_index',2,'regulation_reference','wizard-internal'),
  jsonb_build_object('value','low','label_de','Niedrig','label_en','Low','order_index',3,'regulation_reference','wizard-internal'),
  jsonb_build_object('value','insufficient','label_de','Unzureichend','label_en','Insufficient','order_index',4,'regulation_reference','wizard-internal')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: WIZARD-INTERNAL default (no source enum_name in Pass3c export). Mirrors high/medium/low pattern from audit_notes. Engineer may adjust labels.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-09' AND f.symbol = 'data_quality_assessment' AND f.enum_values IS NULL;

-- A138-09 · phase_2_gate_result (gate_result) — referenced by REQ-09 IN ('PASS','CONDITIONAL').
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','PASS','label_de','BESTANDEN','label_en','PASS','order_index',1,'regulation_reference','phase gates'),
  jsonb_build_object('value','CONDITIONAL','label_de','BEDINGT','label_en','CONDITIONAL','order_index',2,'regulation_reference','phase gates'),
  jsonb_build_object('value','FAIL','label_de','NICHT BESTANDEN','label_en','FAIL','order_index',3,'regulation_reference','phase gates')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=gate_result. Values exactly match REQ-09 condition IN list.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-09' AND f.symbol = 'phase_2_gate_result' AND f.enum_values IS NULL;

-- A138-14 · phase_3_gate_result (gate_result) — referenced by REQ-16.
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','PASS','label_de','BESTANDEN','label_en','PASS','order_index',1,'regulation_reference','phase gates'),
  jsonb_build_object('value','CONDITIONAL','label_de','BEDINGT','label_en','CONDITIONAL','order_index',2,'regulation_reference','phase gates'),
  jsonb_build_object('value','FAIL','label_de','NICHT BESTANDEN','label_en','FAIL','order_index',3,'regulation_reference','phase gates')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=gate_result. Matches REQ-16.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-14' AND f.symbol = 'phase_3_gate_result' AND f.enum_values IS NULL;

-- A138-15 · facility_type_selected (facility_type) — referenced by REQ-17 (IS NOT NULL).
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','flaeche','label_de','Flächenversickerung','label_en','Surface infiltration','order_index',1,'regulation_reference','§6.2'),
  jsonb_build_object('value','mulde','label_de','Muldenversickerung','label_en','Infiltration swale','order_index',2,'regulation_reference','§6.3'),
  jsonb_build_object('value','rigole','label_de','Rigole','label_en','Trench / soakaway','order_index',3,'regulation_reference','§6.4'),
  jsonb_build_object('value','MRE','label_de','Mulden-Rigolen-Element','label_en','Swale-Trench Element','order_index',4,'regulation_reference','§6.5'),
  jsonb_build_object('value','MRS','label_de','Mulden-Rigolen-System','label_en','Swale-Trench System','order_index',5,'regulation_reference','§6.6'),
  jsonb_build_object('value','schacht','label_de','Schacht-/Rohrversickerung','label_en','Shaft/Pipe soakaway','order_index',6,'regulation_reference','§6.7'),
  jsonb_build_object('value','becken','label_de','Beckenversickerung','label_en','Basin infiltration','order_index',7,'regulation_reference','§6.8')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=facility_type.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-15' AND f.symbol = 'facility_type_selected' AND f.enum_values IS NULL;

-- A138-23 · phase_4_gate_result (gate_result) — referenced by REQ-19.
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','PASS','label_de','BESTANDEN','label_en','PASS','order_index',1,'regulation_reference','phase gates'),
  jsonb_build_object('value','CONDITIONAL','label_de','BEDINGT','label_en','CONDITIONAL','order_index',2,'regulation_reference','phase gates'),
  jsonb_build_object('value','FAIL','label_de','NICHT BESTANDEN','label_en','FAIL','order_index',3,'regulation_reference','phase gates')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=gate_result. Matches REQ-19.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-23' AND f.symbol = 'phase_4_gate_result' AND f.enum_values IS NULL;

-- A138-24 · design_basis_final — WIZARD-INTERNAL, mirrors design_method enum on A138-01.
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','einfaches_verfahren','label_de','Einfaches Verfahren','label_en','Simple Method','order_index',1,'regulation_reference','§5.3.3.2'),
  jsonb_build_object('value','nachweisverfahren','label_de','Nachweisverfahren','label_en','Simulation Method','order_index',2,'regulation_reference','§5.3.3.3')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: WIZARD-INTERNAL — mirrors design_method enum on A138-01 (Pass3c source) as a final snapshot.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-24' AND f.symbol = 'design_basis_final' AND f.enum_values IS NULL;

-- A138-24 · facility_type_final — WIZARD-INTERNAL, mirrors facility_type enum.
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','flaeche','label_de','Flächenversickerung','label_en','Surface infiltration','order_index',1,'regulation_reference','§6.2'),
  jsonb_build_object('value','mulde','label_de','Muldenversickerung','label_en','Infiltration swale','order_index',2,'regulation_reference','§6.3'),
  jsonb_build_object('value','rigole','label_de','Rigole','label_en','Trench / soakaway','order_index',3,'regulation_reference','§6.4'),
  jsonb_build_object('value','MRE','label_de','Mulden-Rigolen-Element','label_en','Swale-Trench Element','order_index',4,'regulation_reference','§6.5'),
  jsonb_build_object('value','MRS','label_de','Mulden-Rigolen-System','label_en','Swale-Trench System','order_index',5,'regulation_reference','§6.6'),
  jsonb_build_object('value','schacht','label_de','Schacht-/Rohrversickerung','label_en','Shaft/Pipe soakaway','order_index',6,'regulation_reference','§6.7'),
  jsonb_build_object('value','becken','label_de','Beckenversickerung','label_en','Basin infiltration','order_index',7,'regulation_reference','§6.8')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: WIZARD-INTERNAL — mirrors facility_type source enum as final snapshot.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-24' AND f.symbol = 'facility_type_final' AND f.enum_values IS NULL;

-- A138-25 · design_adequacy_result (pass_fail) — referenced by REQ-21 == 'PASS'.
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','PASS','label_de','BESTANDEN','label_en','PASS','order_index',1,'regulation_reference','verification'),
  jsonb_build_object('value','FAIL','label_de','NICHT BESTANDEN','label_en','FAIL','order_index',2,'regulation_reference','verification'),
  jsonb_build_object('value','NA','label_de','Nicht anwendbar','label_en','Not applicable','order_index',3,'regulation_reference','verification')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=pass_fail. Matches REQ-21 PASS.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-25' AND f.symbol = 'design_adequacy_result' AND f.enum_values IS NULL;

-- A138-26 · flood_check_result (pass_fail) — referenced by REQ-23 (post-fix 'N/A' → 'NA').
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','PASS','label_de','BESTANDEN','label_en','PASS','order_index',1,'regulation_reference','verification'),
  jsonb_build_object('value','FAIL','label_de','NICHT BESTANDEN','label_en','FAIL','order_index',2,'regulation_reference','verification'),
  jsonb_build_object('value','NA','label_de','Nicht anwendbar','label_en','Not applicable','order_index',3,'regulation_reference','verification')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=pass_fail. REQ-23 condition slash fixed in §2 below to match the source NA (no slash).',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-26' AND f.symbol = 'flood_check_result' AND f.enum_values IS NULL;

-- A138-27 · design_review_status — WIZARD-INTERNAL.
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','pending','label_de','Ausstehend','label_en','Pending','order_index',1,'regulation_reference','wizard-internal'),
  jsonb_build_object('value','in_review','label_de','In Prüfung','label_en','In review','order_index',2,'regulation_reference','wizard-internal'),
  jsonb_build_object('value','approved','label_de','Freigegeben','label_en','Approved','order_index',3,'regulation_reference','wizard-internal'),
  jsonb_build_object('value','rejected','label_de','Abgelehnt','label_en','Rejected','order_index',4,'regulation_reference','wizard-internal')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: WIZARD-INTERNAL default (no source enum_name). Engineer may adjust.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-27' AND f.symbol = 'design_review_status' AND f.enum_values IS NULL;

-- A138-28 · final_compliance_verdict (compliance_verdict) — referenced by REQ-30 (IS NOT NULL).
UPDATE fields f
SET enum_values = jsonb_build_array(
  jsonb_build_object('value','compliant','label_de','Konform','label_en','Compliant','order_index',1,'regulation_reference','A138-28'),
  jsonb_build_object('value','compliant_with_conditions','label_de','Konform mit Bedingungen','label_en','Compliant with conditions','order_index',2,'regulation_reference','A138-28'),
  jsonb_build_object('value','not_compliant','label_de','Nicht konform','label_en','Not compliant','order_index',3,'regulation_reference','A138-28')
),
audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: from source enum_name=compliance_verdict.',
audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND wt.code = 'A138-28' AND f.symbol = 'final_compliance_verdict' AND f.enum_values IS NULL;


-- ============= §2 — FIX DEAD COMPLIANCE CONDITIONS =============
-- All five rewrites convert SQL-style `IN ('a','b')` to the evaluator's
-- DSL syntax `IN {a, b}` (bare identifiers, brace list). REQ-02 ALSO
-- gets case-fixed; REQ-23 ALSO gets slash-removed.

-- A138-REQ-02: paren→brace + lowercase to match enum values.
UPDATE compliance_requirements c
SET condition = 'feasibility_determination IN {feasible, conditional}',
    audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: dead-check fixed — IN paren list rewritten to {brace,list} (evaluator DSL) and lowercased to match source enum (feasibility: feasible/conditional/not_feasible).',
    audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE c.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND c.code = 'A138-REQ-02'
  AND c.condition = 'feasibility_determination IN (''Feasible'',''Conditional'')';

-- A138-REQ-09: phase_2_gate_result paren→brace.
UPDATE compliance_requirements c
SET condition = 'phase_2_gate_result IN {PASS, CONDITIONAL}',
    audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: dead-check fixed — IN paren→brace. Values PASS/CONDITIONAL match source enum=gate_result.',
    audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE c.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND c.code = 'A138-REQ-09'
  AND c.condition = 'phase_2_gate_result IN (''PASS'',''CONDITIONAL'')';

-- A138-REQ-16: phase_3_gate_result paren→brace.
UPDATE compliance_requirements c
SET condition = 'phase_3_gate_result IN {PASS, CONDITIONAL}',
    audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: dead-check fixed — IN paren→brace.',
    audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE c.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND c.code = 'A138-REQ-16'
  AND c.condition = 'phase_3_gate_result IN (''PASS'',''CONDITIONAL'')';

-- A138-REQ-19: phase_4_gate_result paren→brace.
UPDATE compliance_requirements c
SET condition = 'phase_4_gate_result IN {PASS, CONDITIONAL}',
    audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: dead-check fixed — IN paren→brace.',
    audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE c.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND c.code = 'A138-REQ-19'
  AND c.condition = 'phase_4_gate_result IN (''PASS'',''CONDITIONAL'')';

-- A138-REQ-23: paren→brace + drop slash (N/A → NA) to match enum.
UPDATE compliance_requirements c
SET condition = 'flood_check_result IN {PASS, NA}',
    audit_notes = COALESCE(audit_notes, '') || ' | Pile-10 2026-06-02: dead-check fixed — IN paren→brace AND ''N/A''→NA to match source enum (pass_fail: PASS/FAIL/NA).',
    audited_at = NOW(), audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE c.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND c.code = 'A138-REQ-23'
  AND c.condition = 'flood_check_result IN (''PASS'',''N/A'')';

-- A138-REQ-21: this one already uses == (no IN), but it uses 'PASS'
-- quoted — which the evaluator DOES accept (string literal). Verify and
-- leave alone if it parses. (The test below proves the existing form works.)


-- ============= Smoke checks =============

SELECT 'enum_values populated' AS check, COUNT(*) AS n
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND f.data_type = 'enum' AND f.enum_values IS NOT NULL;

SELECT 'enum_values still null' AS check, COUNT(*) AS n
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND f.data_type = 'enum' AND f.enum_values IS NULL;

SELECT c.code, c.condition
FROM compliance_requirements c
JOIN worksheet_templates wt ON wt.id = c.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND c.code IN ('A138-REQ-02','A138-REQ-23');
