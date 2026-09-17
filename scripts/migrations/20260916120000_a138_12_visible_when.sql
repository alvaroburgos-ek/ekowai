-- Plan 2a · DWA-A-138-1 A138-12: the two hardcoded ASM visibility rules become data.
-- Retires LEGACY_VISIBLE_WHEN in src/lib/compliance/visibility.ts (the TS fallback applies only while
-- fields.visible_when IS NULL, so applying this migration changes nothing the engineer sees — the same
-- rule now comes from the row instead of the code). `=` here is the DSL's equality operator (same as `==`);
-- the `IS NOT NULL` guard reproduces the legacy null-method case exactly (method unset ⇒ both hidden).
-- Rollback: scripts/rollback-20260916120000-a138-12-visible-when.sql (sets both back to NULL).
-- Pin test: scripts/__tests__/a138-12-visible-when-sql.test.ts (SQL rule ≡ legacy rule on every method value).
-- WRITTEN, NOT APPLIED — owner applies with stamp.
BEGIN;
UPDATE fields f SET visible_when = 'a_s_m_determination_method IS NOT NULL AND a_s_m_determination_method = ''soil_estimate'''
  FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1' AND f.symbol = 'soil_bodenart_tab13' AND f.visible_when IS NULL;
UPDATE fields f SET visible_when = 'a_s_m_determination_method IS NOT NULL AND a_s_m_determination_method = ''manual'''
  FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1' AND f.symbol = 'a_s_m_provenance' AND f.visible_when IS NULL;
COMMIT;
