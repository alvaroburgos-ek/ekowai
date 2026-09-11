-- DWA-A 138-1 · A138-15 · a138_anlagentyp_kandidaten → checklist of the §6
-- Versickerungsanlagen (Blumen Forschel V1.5). Description-only; the ChecklistEditor
-- renders it via SELECTION_CONFIGS. Options = the guideline's own facility types
-- (Bemessung worksheets A138-16…22).
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801370000_a138_anlagentyp_checklist.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801370000-a138-anlagentyp.sql
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1' AND wt.code='A138-15';
  IF v_ws IS NULL THEN RAISE EXCEPTION 'A138-15 not found'; END IF;
  UPDATE fields
     SET clause_reference = COALESCE(clause_reference,'§6'),
         description = 'Mehrfachauswahl der in Betracht kommenden Versickerungsanlagen (§6): Flächen-, Mulden-, Rigolen-/Rohr-, Mulden-Rigolen-Element, Mulden-Rigolen-System, Schacht-/Rohr-, Beckenversickerung. Die Kandidaten werden in A138-16…22 bemessen.'
   WHERE worksheet_template_id = v_ws AND symbol = 'a138_anlagentyp_kandidaten';
  RAISE NOTICE 'A138-15 anlagentyp checklist enriched';
END $$;
