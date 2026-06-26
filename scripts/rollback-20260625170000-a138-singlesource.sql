-- ROLLBACK for supabase/migrations/20260625170000_a138_singlesource_consolidation.sql
-- Restores A138-10 as the sole A_C/C_m producer and reverts A138-07.
-- Captured from prod (vadsmshzebefjreqcicl) 2026-06-26, pre-cutover.
-- NOT a forward migration: lives in scripts/ so it is never auto-applied.
-- DB-only rollback; the CODE rollback is separate: re-add 'A138-10:2' to the
-- whitelist (drop the four 'A138-07:2/2c/2d/2e' keys) and redeploy the previous build.
-- Idempotent + re-runnable.
DO $$
DECLARE
  ws07 uuid;
  ws10 uuid;
  a_c_consumers text[] := ARRAY['A138-13','A138-16','A138-17','A138-18','A138-19','A138-20','A138-21','A138-22','A138-26'];
BEGIN
  SELECT wt.id INTO ws07 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-07';
  SELECT wt.id INTO ws10 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-10';
  IF ws07 IS NULL OR ws10 IS NULL THEN
    RAISE EXCEPTION 'rollback: template not found (ws07=% ws10=%)', ws07, ws10;
  END IF;

  -- 1. Re-insert the 4 A138-10 equations deleted by the forward migration (captured originals).
  INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status) VALUES
    ('1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3', ws10, '2',  'A_C = Σ_i (A_E,i · C_i)   [aus Flächenverzeichnis A138-07, Einzelquelle]', ARRAY['surface_inventory'], 'A_C', NULL, '§5.3.3.5', 'Bemessungswert A_C', 'needs_engineer_review'),
    ('d1a38110-0000-0000-0000-000000000001', ws10, '2a', 'ΣSealed = Σ_befestigt (A_E,i · C_i)', ARRAY['surface_inventory'], 'A_C_sealed', 'm²', '§5.3.3.5', 'Reduzierte befestigte Fläche (Anzeige, abgeleitet aus Flächenverzeichnis)', 'needs_engineer_review'),
    ('d1a38110-0000-0000-0000-000000000002', ws10, '2b', 'ΣUnsealed = Σ_unbefestigt (A_E,i · C_i)', ARRAY['surface_inventory'], 'A_C_unsealed', 'm²', '§5.3.3.5', 'Reduzierte unbefestigte Fläche (Anzeige, abgeleitet)', 'needs_engineer_review'),
    ('d1a38110-0000-0000-0000-000000000003', ws10, '2c', 'C_m = A_C / Σ_i A_E,i', ARRAY['surface_inventory'], 'C_m', NULL, '§5.3.3.5', 'Mittlerer Abflussbeiwert (Anzeige, abgeleitet)', 'needs_engineer_review')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Re-activate A138-10 producer fields + restore their consumer arrays.
  UPDATE fields SET active=true, consumer_worksheets=a_c_consumers
    WHERE worksheet_template_id=ws10 AND symbol='A_C';
  UPDATE fields SET active=true, consumer_worksheets=NULL
    WHERE worksheet_template_id=ws10 AND symbol IN ('C_m','sub_areas_A138_10');

  -- 3. Revert A138-07 Gl.2 output back to A_C_preliminary (output_unit left as-is; harmless once code rolled back).
  UPDATE equations SET output_symbol='A_C_preliminary'
    WHERE id='b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';

  -- 4. Remove the A138-07 producer fields/equations added by the forward migration.
  DELETE FROM equations WHERE id IN (
    'a1380702-0000-4000-8000-000000000002',
    'a1380702-0000-4000-8000-000000000003',
    'a1380702-0000-4000-8000-000000000004');
  UPDATE fields SET active=false, consumer_worksheets=NULL
    WHERE worksheet_template_id=ws07 AND symbol IN ('A_C','C_m','A_E_ba','A_E_nba');
END $$;
