-- Retire the redundant A138-07 `A_C_preliminary` field.
-- The consolidation (20260625170000) repointed A138-07 Gl. 2 output
-- A_C_preliminary -> A_C, leaving A_C_preliminary orphaned: no equation produces
-- it, yet is_required=true → it blocked approval as a "missing required input".
-- Nothing references it (verified: no equation input/output, no compliance
-- condition). It is NOT made derived (that would re-create the double-production
-- the consolidation eliminated) — it is retired. Idempotent.
DO $$
DECLARE ws07 uuid;
BEGIN
  SELECT wt.id INTO ws07 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-07';
  IF ws07 IS NULL THEN RAISE EXCEPTION 'A138-07 template not found'; END IF;
  UPDATE fields SET active=false, is_required=false, consumer_worksheets=NULL
    WHERE worksheet_template_id=ws07 AND symbol='A_C_preliminary';
END $$;
