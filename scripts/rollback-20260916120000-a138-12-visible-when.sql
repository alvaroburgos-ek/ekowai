-- ROLLBACK for scripts/migrations/20260916120000_a138_12_visible_when.sql
-- Sets the two DWA-A-138-1 A138-12 ASM visibility rules back to NULL. Prior value of both rows is NULL
-- by construction (the forward migration only fills rows WHERE visible_when IS NULL), so no capture needed.
-- NOT a forward migration: lives in scripts/ so it is never auto-applied. Idempotent + re-runnable.
--
-- CODE note: with visible_when NULL again, LEGACY_VISIBLE_WHEN (src/lib/compliance/visibility.ts) supplies
-- the identical rules in the form and on every server consumer — behaviour is unchanged either way.
BEGIN;
UPDATE fields f SET visible_when = NULL
  FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1' AND f.symbol = 'soil_bodenart_tab13';
UPDATE fields f SET visible_when = NULL
  FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE f.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1' AND f.symbol = 'a_s_m_provenance';
COMMIT;
