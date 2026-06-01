-- =====================================================================
-- Pile-7: DWA-A 138-1 coverage must-haves (items A, B, C, D, E, H, J, K, L, M, N + soft F)
--
-- WHY: closes the 11 hard compliance gaps + 1 soft warning identified in
--   audit-reports/DWA-A-138-1/_coverage-sweep-2026-05-29.md and confirmed
--   in scope by the engineer. Source quotes are in the per-row source_quote
--   column — verify against `data/norm-text/DWA-A-138-1.md` before merge.
--
-- WHAT: three sections, all ADDITIVE (no DROP, no ALTER on existing
--   columns, IF NOT EXISTS guarded via WHERE NOT EXISTS subselect):
--     §1  New fields (8)
--     §2  New compliance_requirements rows (block: 13, warn: 6)
--     §3  validation_rules UPDATEs on existing fields (informational hints)
--
-- SEVERITY POLICY (matches existing A138-REQ-* rows):
--   - severity = 'block' → prohibition or hard dimensioning bound;
--     gates Feasibility/Approval semantics.
--   - severity = 'warn'  → recommended target; not gating.
--
-- DEFERRED (per scope confirmation): G (Zentralanlage Beckenbreite),
--   I (Zisternen-Anrechenbarkeit). Backlog: O–X.
-- =====================================================================


-- ============= §1 — NEW FIELDS (additive, NOT EXISTS guarded) =============

-- B. §5.2.1 L779 Brunnen-Verbot — boolean attestation field.
INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT wt.id, 'direct_gw_injection', 'Direkte GW-Einleitung (Brunnen)',
  'Direct GW injection (well)', NULL, 'boolean', TRUE,
  '§5.2.1', 'Wird Niederschlagswasser direkt in das Grundwasser (z. B. über Brunnen) eingeleitet? §5.2.1 verbietet dies; Ausnahmen nur im Einzelfall mit Wasserbehörde.',
  15, 'derived_from_structural_mapping', 'match',
  'DWA-A_138-1_WD (5).md', '§5.2.1 L779',
  'Das Einleiten von Niederschlagswasser direkt in das Grundwasser, zum Beispiel über Brunnen, ist nicht zulässig.',
  'Pile-7 2026-06-02: Attestation field required by §5.2.1 prohibition. Compliance row A138-REQ-COV-02 (block) checks direct_gw_injection == false.',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-02'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'direct_gw_injection'
  );

-- C. §5.2.1 L781 Bankett-Versickerung Mindestabstand 1 m — trigger boolean + clearance number.
INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT wt.id, 'bankett_versickerung_active', 'Bankett-Versickerung vorgesehen',
  'Bankett (road verge) infiltration planned', NULL, 'boolean', FALSE,
  '§5.2.1', 'Wird breitflächige Versickerung von Straßenabflüssen über das Bankett mit nachfolgender paralleler Mulde oder geneigter Böschung vorgesehen? Triggert den Mindestabstand-1m-Check (A138-REQ-COV-03).',
  16, 'derived_from_structural_mapping', 'match',
  'DWA-A_138-1_WD (5).md', '§5.2.1 L781',
  'Erfolgt eine breitflächige Versickerung von Straßenabflüssen über das Bankett mit nachfolgender paralleler Mulde oder geneigter Böschung, sollte der Mindestabstand von 1 m zwischen dem MHGW und dem jeweils tiefer liegenden Fahrbahnrand eingehalten werden.',
  'Pile-7 2026-06-02: Guard for Bankett-Versickerung clearance compliance row.',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-02'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'bankett_versickerung_active'
  );

INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT wt.id, 'bankett_clearance_to_mhgw', 'Abstand MHGW ↔ Fahrbahnrand (Bankett)',
  'Clearance MHGW ↔ road edge (Bankett)', 'm', 'number', FALSE,
  '§5.2.1', 'Vertikaler Abstand zwischen MHGW und dem jeweils tiefer liegenden Fahrbahnrand bei Bankett-Versickerung. §5.2.1: Mindestens 1 m.',
  17, 'derived_from_structural_mapping', 'match',
  'DWA-A_138-1_WD (5).md', '§5.2.1 L781',
  'der Mindestabstand von 1 m zwischen dem MHGW und dem jeweils tiefer liegenden Fahrbahnrand eingehalten werden.',
  'Pile-7 2026-06-02: Numeric clearance for Bankett-Versickerung. Compliance row A138-REQ-COV-03 guards via bankett_versickerung_active.',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-02'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'bankett_clearance_to_mhgw'
  );

-- D. §5.2.3.2 Tab. 6 AC/A_S,m — engineer-entered ratio on Mulde.
INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT wt.id, 'AC_AS_ratio', 'Verhältnis AC / A_S,m',
  'Ratio AC / A_S,m', NULL, 'number', FALSE,
  '§5.2.3.2, Tab. 6', 'Hydraulisches Flächenbelastungs-Verhältnis Rechenwert A_C zu mittlerer Versickerungsfläche A_S,m. Tab. 6 Obergrenze je BK (II/III): bei BBZ ≥ 20 cm bzw. ≥ 30 cm.',
  25, 'derived_from_structural_mapping', 'match',
  'DWA-A_138-1_WD (5).md', '§5.2.3.2 L920-926, Tab. 6',
  'AC/A_S,m ≤ 30 bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a (BK II, ≥20cm); ≤ 50 bei ≥30cm. AC/A_S,m ≤ 15 (BK III, ≥20cm); ≤ 30 bei ≥30cm.',
  'Pile-7 2026-06-02: Tab. 6 ratio gate. Engineer enters or computes from inherited A_C / A_S_m. Compliance rows A138-REQ-COV-04a..d enforce the per-BK + per-thickness ceilings.',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-17'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'AC_AS_ratio'
  );

-- L. §6.5.1 L1895 + Tab. 14 L2256 BBZ k_f langjährig ≥ 1·10⁻⁵.
INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT wt.id, 'bbz_kf_long_term', 'k_f BBZ langjähriger Betrieb',
  'k_f BBZ long-term operation', 'm/s', 'number', FALSE,
  '§6.5.1, Tab. 14', 'Durchlässigkeitsbeiwert der bewachsenen Bodenzone nach langjährigem Betrieb. §6.5.1 fordert ≥ 1·10⁻⁵ m/s für MRE; Tab. 14 weist denselben Richtwert ("ca. 1·10⁻⁵") für Versickerungsfläche/Mulde/MRE/MRS/Becken aus.',
  35, 'derived_from_structural_mapping', 'match',
  'DWA-A_138-1_WD (5).md', '§6.5.1 L1895; Tab. 14 L2256',
  'Ein Durchlässigkeitsbeiwert nach langjährigem Betrieb von k_f ≥ 1·10⁻⁵ m/s für die bewachsene Bodenzone sowie die Anforderungen nach 5.2.3.2 sind einzuhalten.',
  'Pile-7 2026-06-02: Long-term operational k_f for BBZ. Compliance row A138-REQ-COV-10 (block).',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'bbz_kf_long_term'
  );

-- M. §6.7.2 L2169 erf. k_f,FS upper bound (GW-Schutz) — engine writes Gl. 39 output here.
INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT wt.id, 'erf_k_f_FS', 'Erforderliche Filterdurchlässigkeit erf. k_f,FS',
  'Required filter permeability erf. k_f,FS', 'm/s', 'number', FALSE,
  '§6.7.2, Gl. 39', 'Berechnetes Minimum für die Filterdurchlässigkeit erf. k_f,FS aus Gl. (39). §6.7.2 L2169 fordert: erf. k_f,FS ≤ 1·10⁻³ m/s (Grundwasserschutz).',
  45, 'derived_from_structural_mapping', 'match',
  'DWA-A_138-1_WD (5).md', '§6.7.2 L2169',
  'Zum Schutz des Grundwassers darf die erforderliche Durchlässigkeit der Filterschicht erf. k_f,FS einen Wert von 1·10⁻³ m/s nicht überschreiten.',
  'Pile-7 2026-06-02: Gl. 39 already in whitelist (A138-21:39); previously had no write-back target. This field is the target. Compliance row A138-REQ-COV-11 (block) enforces ≤ 1·10⁻³.',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-21'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'erf_k_f_FS'
  );

-- N. Tab. 14 Freibord Becken ≥ 35 cm.
INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT wt.id, 'freibord_B', 'Freibord Becken',
  'Freeboard Basin', 'cm', 'number', FALSE,
  'Tab. 14', 'Vertikaler Abstand höchster Wasserspiegellage zu Böschungsoberkante (Freibord). Tab. 14: Becken ≥ 35 cm.',
  60, 'derived_from_structural_mapping', 'match',
  'DWA-A_138-1_WD (5).md', 'Tab. 14 L2258',
  'Freibord Überlauf … Becken: ≥ 35 (cm). Anmerkung (2): Abstand zwischen der höchsten Wasserspiegellage und der Böschungsoberkante.',
  'Pile-7 2026-06-02: Becken-Freibord field. Compliance row A138-REQ-COV-12 (block).',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-22'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'freibord_B'
  );

-- N. Tab. 14 Freibord MRE ≥ 10 cm.
INSERT INTO fields (
  worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required,
  clause_reference, description, order_index, verification_status, audit_status,
  source_file, source_anchor, source_quote, audit_notes, audited_at, audited_by, active
)
SELECT wt.id, 'freibord_MRE', 'Freibord MRE-Überlauf',
  'Freeboard MRE overflow', 'cm', 'number', FALSE,
  'Tab. 14', 'Vertikaler Abstand höchster Wasserspiegellage zu Böschungs-/Überlaufkante des Mulden-Rigolen-Elements. Tab. 14: MRE ≥ 10 cm.',
  60, 'derived_from_structural_mapping', 'match',
  'DWA-A_138-1_WD (5).md', 'Tab. 14 L2258',
  'Freibord Überlauf … (MRE-Spalte) ≥ 10 (cm). Anmerkung (2): Abstand zwischen höchster Wasserspiegellage und Böschungsoberkante.',
  'Pile-7 2026-06-02: MRE-Freibord field. Compliance row A138-REQ-COV-13 (block).',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-19'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'freibord_MRE'
  );


-- ============= §2 — COMPLIANCE REQUIREMENTS (block + warn) =============

-- A. §5.1.1 L713-714 Wasserschutzgebiete Zone I unzulässig (BLOCKER).
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-01',
  'Wasserschutzgebiete Zone I — Versickerung unzulässig',
  'Water Protection Zone I — infiltration not permitted',
  'water_protection_zone != zone_I',
  '§5.1.1 (Wasserschutzgebiete) L713-714', 'block',
  'In Wasserschutzgebieten Zone I ist die Versickerung von gesammeltem Niederschlagswasser in der Regel nicht zulässig (§5.1.1). Diese Regel gilt vor jeder weiteren Bemessung — sie blockiert die Feasibility.',
  'Standort prüfen; Wasserschutzgebietsverordnung der zuständigen Behörde konsultieren. Bei Lage in Zone I ist eine alternative Bewirtschaftung (Ableitung, oberirdische Behandlung) zu wählen.',
  'match', 'DWA-A_138-1_WD (5).md', '§5.1.1 L713-714',
  'Das Versickern von gesammeltem Niederschlagswasser ist in der Regel in Zone I nicht zulässig und in Zone II und III stark eingeschränkt.',
  'Pile-7 2026-06-02: Verbatim L713-714 prohibition; severity=block per scope decision.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-01'
  AND NOT EXISTS (
    SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-01'
  );

-- B. §5.2.1 L779 Brunnen-Verbot (BLOCKER).
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-02',
  'Direkte GW-Einleitung (Brunnen) unzulässig',
  'Direct GW injection (well) not permitted',
  'direct_gw_injection == false',
  '§5.2.1 L779', 'block',
  'Niederschlagswasser darf nicht direkt in das Grundwasser eingeleitet werden (z. B. über Brunnen). Abweichungen nur im Einzelfall mit der Wasserbehörde abzustimmen.',
  'Konzept überarbeiten: oberflächige oder bodenpassagebasierte Versickerung wählen. Falls ein konkreter Einzelfall mit Behördenabstimmung vorliegt, separates Genehmigungsdokument hinterlegen.',
  'match', 'DWA-A_138-1_WD (5).md', '§5.2.1 L779',
  'Das Einleiten von Niederschlagswasser direkt in das Grundwasser, zum Beispiel über Brunnen, ist nicht zulässig. Abweichungen hiervon sind im Einzelfall mit der Wasserbehörde zu klären.',
  'Pile-7 2026-06-02: Verbatim L779 prohibition; severity=block.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-02'
  AND NOT EXISTS (
    SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-02'
  );

-- C. §5.2.1 L781 Bankett-Versickerung ≥ 1 m MHGW↔Fahrbahnrand (BLOCKER, guarded by trigger).
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-03',
  'Bankett-Versickerung: Mindestabstand 1 m MHGW ↔ Fahrbahnrand',
  'Bankett infiltration: clearance ≥ 1 m MHGW ↔ road edge',
  'IF bankett_versickerung_active == true THEN bankett_clearance_to_mhgw >= 1.0',
  '§5.2.1 L781', 'block',
  'Bei breitflächiger Versickerung von Straßenabflüssen über das Bankett ist der Mindestabstand 1 m zwischen MHGW und tiefer liegendem Fahrbahnrand zwingend.',
  'Höhenlage prüfen; Querprofil/Geländeprofil anpassen, sodass MHGW mindestens 1 m unter dem tiefsten Fahrbahnrand verbleibt.',
  'match', 'DWA-A_138-1_WD (5).md', '§5.2.1 L781',
  'Erfolgt eine breitflächige Versickerung von Straßenabflüssen über das Bankett mit nachfolgender paralleler Mulde oder geneigter Böschung, sollte der Mindestabstand von 1 m zwischen dem MHGW und dem jeweils tiefer liegenden Fahrbahnrand eingehalten werden.',
  'Pile-7 2026-06-02: Guarded by bankett_versickerung_active (only fires when bankett is in scope); severity=block when triggered.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-02'
  AND NOT EXISTS (
    SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-03'
  );

-- D. Tab. 6 AC/A_S,m per BK + BBZ thickness (4 rows, all BLOCKER, all guarded).
-- Note: bbz_thickness is in metres (field unit m); thresholds in cm → 0.20 / 0.30 m.
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-04a',
  'Tab. 6 AC/A_S,m ≤ 30 bei BK II + BBZ ≥ 20 cm (< 30 cm)',
  'Tab. 6 AC/A_S,m ≤ 30 at BK II with BBZ ≥ 20 cm (< 30 cm)',
  'IF belastungskategorie == BK_II AND bbz_thickness < 0.30 THEN AC_AS_ratio <= 30',
  '§5.2.3.2, Tab. 6', 'block',
  'Tab. 6 Obergrenze für hydraulische Flächenbelastung: BK II mit BBZ-Mindestmächtigkeit 20 cm (< 30 cm) ⇒ AC/A_S,m ≤ 30.',
  'BBZ-Mächtigkeit auf ≥ 30 cm erhöhen ⇒ Limit steigt auf 50; oder A_S,m vergrößern.',
  'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.2 Tab. 6 L920',
  'AC/A_S,m ≤ 30 bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a (BK II, ≥20 cm BBZ-Spalte)',
  'Pile-7 2026-06-02: Tab. 6 BK-II row at the 20-cm-thickness column.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-17'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-04a');

INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-04b',
  'Tab. 6 AC/A_S,m ≤ 50 bei BK II + BBZ ≥ 30 cm',
  'Tab. 6 AC/A_S,m ≤ 50 at BK II with BBZ ≥ 30 cm',
  'IF belastungskategorie == BK_II AND bbz_thickness >= 0.30 THEN AC_AS_ratio <= 50',
  '§5.2.3.2, Tab. 6', 'block',
  'Tab. 6 Obergrenze für hydraulische Flächenbelastung: BK II mit BBZ ≥ 30 cm ⇒ AC/A_S,m ≤ 50.',
  'A_S,m vergrößern oder A_C reduzieren (Teilflächen umlenken).',
  'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.2 Tab. 6 L920',
  'AC/A_S,m ≤ 50 bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a (BK II, ≥30 cm BBZ-Spalte)',
  'Pile-7 2026-06-02: Tab. 6 BK-II row at the 30-cm-thickness column.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-17'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-04b');

INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-04c',
  'Tab. 6 AC/A_S,m ≤ 15 bei BK III + BBZ ≥ 20 cm (< 30 cm)',
  'Tab. 6 AC/A_S,m ≤ 15 at BK III with BBZ ≥ 20 cm (< 30 cm)',
  'IF belastungskategorie == BK_III AND bbz_thickness < 0.30 THEN AC_AS_ratio <= 15',
  '§5.2.3.2, Tab. 6', 'block',
  'Tab. 6 Obergrenze für hydraulische Flächenbelastung: BK III mit BBZ-Mindestmächtigkeit 20 cm (< 30 cm) ⇒ AC/A_S,m ≤ 15.',
  'BBZ-Mächtigkeit auf ≥ 30 cm erhöhen ⇒ Limit steigt auf 30; oder A_S,m deutlich vergrößern.',
  'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.2 Tab. 6 L924',
  'AC/A_S,m ≤ 15 bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a (BK III, ≥20 cm BBZ-Spalte)',
  'Pile-7 2026-06-02: Tab. 6 BK-III row at the 20-cm-thickness column.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-17'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-04c');

INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-04d',
  'Tab. 6 AC/A_S,m ≤ 30 bei BK III + BBZ ≥ 30 cm',
  'Tab. 6 AC/A_S,m ≤ 30 at BK III with BBZ ≥ 30 cm',
  'IF belastungskategorie == BK_III AND bbz_thickness >= 0.30 THEN AC_AS_ratio <= 30',
  '§5.2.3.2, Tab. 6', 'block',
  'Tab. 6 Obergrenze für hydraulische Flächenbelastung: BK III mit BBZ ≥ 30 cm ⇒ AC/A_S,m ≤ 30.',
  'A_S,m vergrößern oder A_C reduzieren.',
  'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.2 Tab. 6 L924',
  'AC/A_S,m ≤ 30 bei Mulden-Rigole: Überlauf in Rigole mit n_M max. 1/a (BK III, ≥30 cm BBZ-Spalte)',
  'Pile-7 2026-06-02: Tab. 6 BK-III row at the 30-cm-thickness column.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-17'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-04d');

-- E. §5.2.3.2 + Tab. 14 BBZ-Mindestmächtigkeit ≥ 20 cm (universal lower bound, BLOCKER).
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-05',
  'BBZ-Mindestmächtigkeit ≥ 20 cm',
  'BBZ minimum thickness ≥ 20 cm',
  'bbz_thickness >= 0.20',
  '§5.2.3.2 Tab. 6, Tab. 14 L2255', 'block',
  'Bewachsene Bodenzone: Mindestmächtigkeit 20 cm (nach Setzung) per Tab. 6 und Tab. 14. Werte unter 20 cm sind nicht zulässig.',
  'BBZ-Schichtdicke nach Setzung auf ≥ 20 cm bringen. Filterstabilität zur folgenden Bodenschicht beachten.',
  'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.2 + Tab. 14 L2255',
  'Mindestmächtigkeit bewachsene Bodenzone ≥ 20 cm. Die jeweilige Mindestmächtigkeit der bewachsenen Bodenzone nach Tabelle 6 ist nach Setzung der Schicht (nach Abschluss der Baumaßnahme) einzuhalten.',
  'Pile-7 2026-06-02: Universal ≥20cm lower bound (Tab. 14 Spalte). Field unit m → threshold 0.20.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-05');

-- F. §5.2.3.3 Tab. 7 η-Soll per BK (SOFT WARNING, 6 rows).
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-06a',
  'Tab. 7 η_AFS63 ≥ 40 % bei BK I',
  'Tab. 7 η_AFS63 ≥ 40 % at BK I',
  'IF belastungskategorie == BK_I THEN eta_AFS63 >= 40',
  '§5.2.3.3 Tab. 7 L985', 'warn',
  'Tab. 7 Sollwert: η_AFS63 ≥ 40 % bei BK I.',
  'Vorbehandlungsanlage mit höherer Reinigungsleistung wählen oder Bemessungs-/Betriebsannahmen prüfen.',
  'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.3 Tab. 7 L985',
  'η_AFS63 = 40 % (BK I-Spalte)',
  'Pile-7 2026-06-02: Soft target per scope decision (severity=warn).',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-06a');

INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-06b',
  'Tab. 7 η_gelöst ≥ 50 % bei BK I',
  'Tab. 7 η_dissolved ≥ 50 % at BK I',
  'IF belastungskategorie == BK_I THEN eta_geloest >= 50',
  '§5.2.3.3 Tab. 7 L985', 'warn',
  'Tab. 7 Sollwert: η für gelöste Stoffe (Cu, Zn) ≥ 50 % bei BK I.',
  'Behandlungsanlage prüfen.', 'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.3 Tab. 7 L985',
  'η_gelöst = 50 % (BK I-Spalte) — Referenzparameter Kupfer und Zink',
  'Pile-7 2026-06-02: Soft target.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-06b');

INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-06c',
  'Tab. 7 η_AFS63 ≥ 70 % bei BK II',
  'Tab. 7 η_AFS63 ≥ 70 % at BK II',
  'IF belastungskategorie == BK_II THEN eta_AFS63 >= 70',
  '§5.2.3.3 Tab. 7 L1002', 'warn',
  'Tab. 7 Sollwert: η_AFS63 ≥ 70 % bei BK II.',
  'Behandlungsanlage prüfen.', 'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.3 Tab. 7 L1002',
  'η_AFS63 = 70 % (BK II-Spalte)',
  'Pile-7 2026-06-02: Soft target.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-06c');

INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-06d',
  'Tab. 7 η_gelöst ≥ 65 % bei BK II',
  'Tab. 7 η_dissolved ≥ 65 % at BK II',
  'IF belastungskategorie == BK_II THEN eta_geloest >= 65',
  '§5.2.3.3 Tab. 7 L1002', 'warn',
  'Tab. 7 Sollwert: η für gelöste Stoffe ≥ 65 % bei BK II.',
  'Behandlungsanlage prüfen.', 'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.3 Tab. 7 L1002',
  'η_gelöst = 65 % (BK II-Spalte)',
  'Pile-7 2026-06-02: Soft target.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-06d');

INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-06e',
  'Tab. 7 η_AFS63 ≥ 80 % bei BK III',
  'Tab. 7 η_AFS63 ≥ 80 % at BK III',
  'IF belastungskategorie == BK_III THEN eta_AFS63 >= 80',
  '§5.2.3.3 Tab. 7 L1006', 'warn',
  'Tab. 7 Sollwert: η_AFS63 ≥ 80 % bei BK III.',
  'Behandlungsanlage prüfen.', 'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.3 Tab. 7 L1006',
  'η_AFS63 = 80 % (BK III-Spalte)',
  'Pile-7 2026-06-02: Soft target.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-06e');

INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-06f',
  'Tab. 7 η_gelöst ≥ 75 % bei BK III',
  'Tab. 7 η_dissolved ≥ 75 % at BK III',
  'IF belastungskategorie == BK_III THEN eta_geloest >= 75',
  '§5.2.3.3 Tab. 7 L1006', 'warn',
  'Tab. 7 Sollwert: η für gelöste Stoffe ≥ 75 % bei BK III.',
  'Behandlungsanlage prüfen.', 'match', 'DWA-A_138-1_WD (5).md', '§5.2.3.3 Tab. 7 L1006',
  'η_gelöst = 75 % (BK III-Spalte)',
  'Pile-7 2026-06-02: Soft target.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-06f');

-- H. §5.3.3.7 L1446 f_Z range 1.1–1.2 + Sonderfall 1.2 bei q_S,AC ≤ 5 (BLOCKER, two rows).
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-07a',
  'Zuschlagsfaktor f_Z im Bereich [1,1; 1,2]',
  'Safety factor f_Z in [1.1; 1.2]',
  'f_Z >= 1.1 AND f_Z <= 1.2',
  '§5.3.3.7 L1446', 'block',
  'DWA-A 138-1 §5.3.3.7 empfiehlt f_Z zwischen 1,1 und 1,2. Werte außerhalb dieses Bereichs sind nicht zulässig.',
  'f_Z im zulässigen Bereich wählen (typisch 1,1; 1,2 nur in Sonderfällen).',
  'match', 'DWA-A_138-1_WD (5).md', '§5.3.3.7 L1446',
  'Je nach Risikomaß gemäß Arbeitsblatt DWA-A 117 werden Zuschlagsfaktoren zwischen 1,1 und 1,2 empfohlen.',
  'Pile-7 2026-06-02: Range bound on f_Z.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-08'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-07a');

INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-07b',
  'f_Z = 1,2 erforderlich bei q_S,AC ≤ 5 l/(s·ha)',
  'f_Z = 1.2 required when q_S,AC ≤ 5 l/(s·ha)',
  'IF q_S_AC <= 5 THEN f_Z >= 1.2',
  '§5.3.3.7 L1446', 'block',
  'Sonderfall: bei kleiner spezifischer Versickerungs-/Abflussleistung q_S,AC ≤ 5 l/(s·ha) ist f_Z = 1,2 erforderlich.',
  'f_Z auf 1,2 setzen oder Anlagengeometrie so anpassen, dass q_S,AC > 5 wird.',
  'match', 'DWA-A_138-1_WD (5).md', '§5.3.3.7 L1446',
  'Insbesondere bei kleinen spezifischen Versickerungs-/Abflussleistungen bezogen auf AC (q_S,AC ≤ 5 l/(s·ha)) wird ein Zuschlagsfaktor f_Z = 1,2 erforderlich.',
  'Pile-7 2026-06-02: Guarded special case; severity=block when guard fires.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-08'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-07b');

-- J. §6.3.1 + Tab. 14 h_max ≤ 30 cm Mulde (BLOCKER). h_M unit is m → threshold 0.30.
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-08',
  'Muldeneinstau h_M ≤ 30 cm',
  'Mulde max impoundment h_M ≤ 30 cm',
  'h_M <= 0.30',
  '§6.3.1 L1659, Tab. 14 L2257', 'block',
  'Der maximale Bemessungseinstau der Mulde h_max ist auf 30 cm zu begrenzen (§6.3.1; Tab. 14 i. d. R. ≤ 30 cm).',
  'h_M reduzieren oder Geometrie anpassen.',
  'match', 'DWA-A_138-1_WD (5).md', '§6.3.1 L1659 + Tab. 14 L2257',
  'Der maximale Bemessungseinstau der Mulde h_max ist in der Regel auf 30 cm zu begrenzen.',
  'Pile-7 2026-06-02: h_M in m; threshold 0.30. Existing field h_M (m, A138-17).',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-17'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-08');

-- K. §6.3.2 + Tab. 14 t_E ≤ 84 h Mulde (BLOCKER). Field unit h.
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-09',
  'Entleerungszeit Mulde t_E ≤ 84 h (n=1/a)',
  'Mulde drain time t_E ≤ 84 h (n=1/a)',
  't_E <= 84',
  '§6.3.2 L1740, Tab. 14 L2260', 'block',
  'Aus vegetationstechnischer Sicht ist t_E ≤ 84 h bei n=1/a einzuhalten. Tab. 14 normiert dies (Mulde/MRE/MRS/Becken).',
  'A_S,m vergrößern oder k_i (Bodenwahl/-aufbereitung) erhöhen.',
  'match', 'DWA-A_138-1_WD (5).md', '§6.3.2 L1740 + Tab. 14 L2260',
  'Aus vegetationstechnischer Sicht ist bei oberirdischen Versickerungsanlagen eine Entleerungszeit von ≤ 84 Stunden für n = 1/a bei geeigneter Bepflanzung in der Regel unkritisch.',
  'Pile-7 2026-06-02: t_E in h, threshold 84.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-17'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-09');

-- L. §6.5.1 + Tab. 14 BBZ k_f langjährig ≥ 1·10⁻⁵ (BLOCKER).
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-10',
  'BBZ k_f langjähriger Betrieb ≥ 1·10⁻⁵ m/s',
  'BBZ k_f long-term ≥ 1·10⁻⁵ m/s',
  'bbz_kf_long_term >= 1e-5',
  '§6.5.1 L1895, Tab. 14 L2256', 'block',
  'BBZ-Durchlässigkeit muss im langjährigen Betrieb ≥ 1·10⁻⁵ m/s bleiben (§6.5.1 für MRE; Tab. 14 für VF/Mulde/MRE/MRS/Becken).',
  'Wartungs-/Erneuerungskonzept für die BBZ definieren; Bodenpassagen mit geringerer Durchlässigkeit konstruktiv anpassen.',
  'match', 'DWA-A_138-1_WD (5).md', '§6.5.1 L1895 + Tab. 14 L2256',
  'Ein Durchlässigkeitsbeiwert nach langjährigem Betrieb von k_f ≥ 1·10⁻⁵ m/s für die bewachsene Bodenzone sowie die Anforderungen nach 5.2.3.2 sind einzuhalten.',
  'Pile-7 2026-06-02: New field bbz_kf_long_term (A138-06).',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-06'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-10');

-- M. §6.7.2 L2169 erf. k_f,FS ≤ 1·10⁻³ (BLOCKER, Grundwasserschutz).
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-11',
  'erf. k_f,FS ≤ 1·10⁻³ m/s (Grundwasserschutz)',
  'Required k_f,FS ≤ 1·10⁻³ m/s (GW protection)',
  'erf_k_f_FS <= 1e-3',
  '§6.7.2 L2169, Gl. 39', 'block',
  'Zum Schutz des Grundwassers darf die per Gl. (39) erforderliche Filterdurchlässigkeit erf. k_f,FS den Wert 1·10⁻³ m/s nicht überschreiten.',
  'Schachtgeometrie (d_a, d_i, h_S) anpassen oder Bodenwahl ändern, sodass die rechnerisch erforderliche Filterdurchlässigkeit ≤ 1·10⁻³ m/s wird.',
  'match', 'DWA-A_138-1_WD (5).md', '§6.7.2 L2169',
  'Zum Schutz des Grundwassers darf die erforderliche Durchlässigkeit der Filterschicht erf. k_f,FS einen Wert von 1·10⁻³ m/s nicht überschreiten.',
  'Pile-7 2026-06-02: erf_k_f_FS field added on A138-21; Gl. 39 already whitelisted — engine writes computed value to this field.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-21'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-11');

-- N. Tab. 14 Freibord Becken ≥ 35 cm (BLOCKER).
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-12',
  'Freibord Becken ≥ 35 cm',
  'Freeboard Basin ≥ 35 cm',
  'freibord_B >= 35',
  'Tab. 14 L2258', 'block',
  'Tab. 14 fordert für Versickerungsbecken einen Freibord (höchste Wasserspiegellage zu Böschungsoberkante) von ≥ 35 cm.',
  'Beckenhöhe bzw. Beckenkante so wählen, dass der Freibord ≥ 35 cm beträgt.',
  'match', 'DWA-A_138-1_WD (5).md', 'Tab. 14 L2258',
  'Freibord Überlauf … Becken: ≥ 35 (cm).',
  'Pile-7 2026-06-02: New field freibord_B on A138-22.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-22'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-12');

-- N. Tab. 14 Freibord MRE ≥ 10 cm (BLOCKER).
INSERT INTO compliance_requirements (
  worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity,
  description, suggestion, audit_status, source_file, source_anchor, source_quote,
  audit_notes, audited_at, audited_by
)
SELECT wt.id, 'A138-REQ-COV-13',
  'Freibord MRE ≥ 10 cm',
  'Freeboard MRE ≥ 10 cm',
  'freibord_MRE >= 10',
  'Tab. 14 L2258', 'block',
  'Tab. 14 fordert für den Muldenüberlauf im MRE einen Freibord von ≥ 10 cm.',
  'Höhenlage des Überlaufs anpassen.',
  'match', 'DWA-A_138-1_WD (5).md', 'Tab. 14 L2258',
  'Freibord Überlauf … (MRE-Spalte) ≥ 10 (cm).',
  'Pile-7 2026-06-02: New field freibord_MRE on A138-19.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-19'
  AND NOT EXISTS (SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-13');


-- ============= §3 — validation_rules UPDATEs (informational hints) =============
-- Always-safe upserts of jsonb; preserves existing non-null engineer-set values
-- when present (UPDATE only if currently NULL or contains placeholder text).

UPDATE fields f SET validation_rules = '{"raw":"min: 1.1, max: 1.2 — DWA-A 138-1 §5.3.3.7 L1446"}'::jsonb
FROM worksheet_templates wt, standards s
WHERE f.worksheet_template_id = wt.id AND wt.standard_id = s.id
  AND s.code = 'DWA-A-138-1' AND wt.code = 'A138-08' AND f.symbol = 'f_Z'
  AND (f.validation_rules IS NULL OR f.validation_rules->>'raw' IS NULL OR f.validation_rules->>'raw' = '');

UPDATE fields f SET validation_rules = '{"raw":"max: 0.30 — DWA-A 138-1 §6.3.1 L1659"}'::jsonb
FROM worksheet_templates wt, standards s
WHERE f.worksheet_template_id = wt.id AND wt.standard_id = s.id
  AND s.code = 'DWA-A-138-1' AND wt.code = 'A138-17' AND f.symbol = 'h_M'
  AND (f.validation_rules IS NULL OR f.validation_rules->>'raw' IS NULL OR f.validation_rules->>'raw' = '');

UPDATE fields f SET validation_rules = '{"raw":"max: 84 — DWA-A 138-1 §6.3.2 L1740"}'::jsonb
FROM worksheet_templates wt, standards s
WHERE f.worksheet_template_id = wt.id AND wt.standard_id = s.id
  AND s.code = 'DWA-A-138-1' AND wt.code = 'A138-17' AND f.symbol = 't_E'
  AND (f.validation_rules IS NULL OR f.validation_rules->>'raw' IS NULL OR f.validation_rules->>'raw' = '');

UPDATE fields f SET validation_rules = '{"raw":"min: 0.20 — DWA-A 138-1 Tab. 14 L2255"}'::jsonb
FROM worksheet_templates wt, standards s
WHERE f.worksheet_template_id = wt.id AND wt.standard_id = s.id
  AND s.code = 'DWA-A-138-1' AND wt.code = 'A138-06' AND f.symbol = 'bbz_thickness'
  AND (f.validation_rules IS NULL OR f.validation_rules->>'raw' IS NULL OR f.validation_rules->>'raw' = '');


-- ============= Smoke checks =============

SELECT 'fields added' AS label, COUNT(*) AS n FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND f.symbol IN (
  'direct_gw_injection','bankett_versickerung_active','bankett_clearance_to_mhgw',
  'AC_AS_ratio','bbz_kf_long_term','erf_k_f_FS','freibord_B','freibord_MRE'
);

SELECT 'compliance rows added' AS label, COUNT(*) AS n FROM compliance_requirements c
JOIN worksheet_templates wt ON wt.id = c.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND c.code LIKE 'A138-REQ-COV-%';

SELECT c.code, c.severity, c.condition
FROM compliance_requirements c
JOIN worksheet_templates wt ON wt.id = c.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND c.code LIKE 'A138-REQ-COV-%'
ORDER BY c.code;
