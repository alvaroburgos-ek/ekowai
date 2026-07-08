-- scripts/rollback-20260708120000-a138_asm_single_source.sql
-- Rollback for 20260708120000_a138_asm_single_source.sql (DWA-A 138-1 B2, A_S,m single-source).
-- WRITTEN-NOT-APPLIED. Break-glass only: read the forward migration first.
-- NOTE: deleting a_s_m_determination_method removes ALL its param rows, including any
--       non-'direct' values a user set post-migration. This is inherent to full-field rollback.
DO $$
DECLARE ws12 uuid; ws22 uuid; asm_field uuid;
BEGIN
  SELECT wt.id INTO ws12 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1' AND wt.code='A138-12';
  SELECT wt.id INTO ws22 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-138-1' AND wt.code='A138-22';
  SELECT id INTO asm_field FROM fields WHERE worksheet_template_id=ws12 AND symbol='a_s_m_determination_method' LIMIT 1;
  IF asm_field IS NOT NULL THEN DELETE FROM project_parameters WHERE field_id=asm_field; END IF;
  DELETE FROM fields WHERE worksheet_template_id=ws12 AND symbol IN ('a_s_m_determination_method','a_s_m_provenance','a_s_m_needs_reconfirmation','soil_bodenart_tab13');
  -- (step 5 consumer append was a no-op: A138-13/A138-22 pre-existed → nothing to reverse).
  UPDATE fields SET active=true WHERE worksheet_template_id=ws22 AND symbol='A_S_m_Becken';
END $$;
