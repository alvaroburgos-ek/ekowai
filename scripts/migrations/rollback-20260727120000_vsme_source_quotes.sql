-- ============================================================================
-- Rollback: 20260727120000_vsme_source_quotes.sql (VSME source_quote backfill)
-- Status:   Companion rollback for a WRITTEN-NOT-APPLIED migration. Only run this
--           if the forward migration was actually applied to the target DB.
--
-- Scope: NULLs out source_quote on every VSME row touched by the forward
-- migration, scoped identically (standard code 'VSME'), across all three
-- tables. Nothing else is touched — verification_status is untouched by both
-- the forward migration and this rollback.
-- ============================================================================

UPDATE fields f
   SET source_quote = NULL
  FROM worksheet_templates wt, standards s
 WHERE f.worksheet_template_id = wt.id
   AND wt.standard_id = s.id
   AND s.code = 'VSME'
   AND f.source_quote IS NOT NULL;

UPDATE equations eq
   SET source_quote = NULL
  FROM worksheet_templates wt, standards s
 WHERE eq.worksheet_template_id = wt.id
   AND wt.standard_id = s.id
   AND s.code = 'VSME'
   AND eq.source_quote IS NOT NULL;

UPDATE compliance_requirements cr
   SET source_quote = NULL
  FROM worksheet_templates wt, standards s
 WHERE cr.worksheet_template_id = wt.id
   AND wt.standard_id = s.id
   AND s.code = 'VSME'
   AND cr.source_quote IS NOT NULL;
