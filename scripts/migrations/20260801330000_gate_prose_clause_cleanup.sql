-- ─────────────────────────────────────────────────────────────────────────────
-- Gate clause-reference cleanup — prose subsection-title → clean §-clause
-- ─────────────────────────────────────────────────────────────────────────────
-- 16 gates carried a full subsection TITLE in clause_reference (e.g. "5.4.3
-- Verlaengerung einer Einleitungserlaubnis nicht beantragt") instead of a clause
-- number. Normalise to the leading §-clause (the title stays available in the
-- gate description). Cosmetic/data-quality; no condition or enforcement change.
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801330000_gate_prose_clause_cleanup.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801330000-gate-prose-clause.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  UPDATE compliance_requirements
     SET clause_reference = '§' || substring(clause_reference from '^([0-9]+(\.[0-9]+)*)')
   WHERE clause_reference ~ '\s\w+\s\w+\s\w+\s\w+\s\w+'
     AND clause_reference !~ '^\s*(§|Sec|Tab|Bild|Anh|Anl|Art|DIN|ISO|EU|RL)'
     AND clause_reference ~ '^[0-9]';
  -- preserve the one dual reference (4.3.4 / 4.5)
  UPDATE compliance_requirements SET clause_reference = '§4.3.4 / §4.5'
   WHERE id = 'cd8e9cb7-2f0a-4353-be40-77d5bc8b321d' AND clause_reference = '§4.3.4';
  RAISE NOTICE 'gate prose clause_references normalized to §-clauses';
END $$;
