-- =====================================================================
-- Pile-12: the two §-backed prohibitions from §5.1.1 + §5.2.1 that the
-- filled-project verification found missing in production.
--
-- Extracted from _pile7-coverage-must-haves.sql (a broader sweep that
-- bundled prohibitions, dimensioning bounds, and new fields together).
-- This file contains ONLY the rows that match the strict "§-backed
-- prohibition" criterion ("nicht zulässig" verbatim in the source):
--
--   §1  ONE new field — direct_gw_injection (boolean) on A138-02.
--       Required for the COV-02 condition to have a symbol to read.
--   §2  TWO new compliance_requirements rows:
--         A138-REQ-COV-01 — Zone I infiltration prohibition (§5.1.1 L713-714)
--         A138-REQ-COV-02 — direct GW injection prohibition (§5.2.1 L779)
--
-- Both severity = 'block'. Both attached to the worksheet that owns the
-- input symbol (COV-01 → A138-01, COV-02 → A138-02).
--
-- The other COV rows in Pile-7 (COV-03 Bankett geometric, COV-04..13
-- dimensioning bounds + soft warnings) are NOT in this file — they are
-- legitimate but they are not strict prohibitions and they require
-- additional new fields (AC_AS_ratio, bbz_kf_long_term, erf_k_f_FS,
-- freibord_*) which broaden the review surface. They stay tracked in
-- Pile-7 for a later application slice.
--
-- IDEMPOTENT — all three INSERTs use `WHERE NOT EXISTS (... symbol/code)`
-- guards. Re-applying after a prior success is a no-op.
-- =====================================================================


-- ============= §1 — NEW FIELD direct_gw_injection (A138-02) =============

-- Required by COV-02. Without this field, the condition
-- `direct_gw_injection == false` is `pending` (engineer can't answer it).
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
  'Pile-12 2026-06-02: Attestation field required by §5.2.1 prohibition. Compliance row A138-REQ-COV-02 (block) checks direct_gw_injection == false.',
  NOW(), 'claude-code-2026-06-02', TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-02'
  AND NOT EXISTS (
    SELECT 1 FROM fields ff WHERE ff.worksheet_template_id = wt.id AND ff.symbol = 'direct_gw_injection'
  );


-- ============= §2 — COMPLIANCE REQUIREMENTS (two block prohibitions) =============

-- A138-REQ-COV-01 — Wasserschutzgebiete Zone I (§5.1.1 L713-714).
-- Source verbatim (data/norm-text/DWA-A-138-1.md L714):
--   "Das Versickern von gesammeltem Niederschlagswasser ist in der Regel
--    in Zone I nicht zulässig und in Zone II und III stark eingeschränkt."
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
  'Pile-12 2026-06-02: Verbatim L713-714 prohibition; severity=block.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-01'
  AND NOT EXISTS (
    SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-01'
  );

-- A138-REQ-COV-02 — Brunnen-Verbot (§5.2.1 L779).
-- Source verbatim (data/norm-text/DWA-A-138-1.md L779):
--   "Das Einleiten von Niederschlagswasser direkt in das Grundwasser,
--    zum Beispiel über Brunnen, ist nicht zulässig. Abweichungen hiervon
--    sind im Einzelfall mit der Wasserbehörde zu klären."
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
  'Pile-12 2026-06-02: Verbatim L779 prohibition; severity=block.',
  NOW(), 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-02'
  AND NOT EXISTS (
    SELECT 1 FROM compliance_requirements c WHERE c.worksheet_template_id = wt.id AND c.code = 'A138-REQ-COV-02'
  );


-- ============= Smoke checks =============

SELECT 'direct_gw_injection field exists' AS check_label,
       COUNT(*) AS n
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND f.symbol = 'direct_gw_injection';

SELECT c.code, c.condition, c.severity, wt.code AS attached_to_worksheet
FROM compliance_requirements c
JOIN worksheet_templates wt ON wt.id = c.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND c.code IN ('A138-REQ-COV-01','A138-REQ-COV-02')
ORDER BY c.code;
