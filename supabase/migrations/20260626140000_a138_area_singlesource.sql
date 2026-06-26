-- supabase/migrations/20260626140000_a138_area_singlesource.sql
-- A138-07 area single-source consolidation.
-- (1) Register A138-10 as consumer of A138-07's existing area totals A_E_ba/A_E_nba.
-- (2) Add A138-07 producer fields + equations for the reduced-area split A_C_sealed/A_C_unsealed.
-- (3) Deactivate A138-10's four duplicate fields (no producing eq, no consumer -- verified).
-- Mirrors 20260625170000. Idempotent. Does NOT touch A138-26 (flood-event A_E_b_a_flood is a distinct quantity).
DO $$
DECLARE
  ws07 uuid;
  ws10 uuid;
  sec07 uuid;
BEGIN
  SELECT wt.id INTO ws07 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-07';
  SELECT wt.id INTO ws10 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-10';
  IF ws07 IS NULL OR ws10 IS NULL THEN
    RAISE EXCEPTION 'A138 area consolidation: worksheet template not found (ws07=% ws10=%)', ws07, ws10;
  END IF;

  -- Section to attach the new producer fields to: reuse the section of the existing A_E_ba field.
  SELECT section_id INTO sec07 FROM fields WHERE worksheet_template_id=ws07 AND symbol='A_E_ba' LIMIT 1;

  -- (1) Register A138-10 as consumer of the existing area totals (currently consumer_worksheets=null).
  UPDATE fields SET consumer_worksheets = ARRAY['A138-10']
    WHERE worksheet_template_id=ws07 AND symbol IN ('A_E_ba','A_E_nba');

  -- (2) Producer fields for the reduced-area split (A138-07 owns them; A138-10 consumes).
  -- ON CONFLICT (id) is deliberate: A_C_sealed/A_C_unsealed are brand-new symbols on A138-07 with pre-assigned stable UUIDs.
  INSERT INTO fields (id, worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, consumer_worksheets, order_index, active)
  VALUES
    ('a1380700-0000-4000-8000-000000000005', ws07, sec07, 'A_C_sealed',   'Reduzierte Fläche befestigt Σ(A_E,b·C)',    'Reduced sealed area Σ(A_E,b·C)',    'number', 'm²', false, ARRAY['A138-10'], 95, true),
    ('a1380700-0000-4000-8000-000000000006', ws07, sec07, 'A_C_unsealed', 'Reduzierte Fläche unbefestigt Σ(A_E,nb·C)', 'Reduced unsealed area Σ(A_E,nb·C)', 'number', 'm²', false, ARRAY['A138-10'], 96, true)
  ON CONFLICT (id) DO UPDATE SET consumer_worksheets=EXCLUDED.consumer_worksheets, active=true, label_de=EXCLUDED.label_de;

  -- (2b) Equations Gl. 2f / 2g producing the split from surface_inventory.
  INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference)
  VALUES
    ('a1380702-0000-4000-8000-000000000005', ws07, '2f', 'A_C_sealed = Σ_i (A_E,b,a,i · C_i)',    ARRAY['surface_inventory'], 'A_C_sealed',   'm²', '§5.3.3.5'),
    ('a1380702-0000-4000-8000-000000000006', ws07, '2g', 'A_C_unsealed = Σ_i (A_E,nb,a,i · C_i)', ARRAY['surface_inventory'], 'A_C_unsealed', 'm²', '§5.3.3.5')
  ON CONFLICT (id) DO NOTHING;

  -- (3) Deactivate A138-10's duplicate local fields (now inherited from A138-07).
  UPDATE fields SET active=false, is_required=false, consumer_worksheets=NULL
    WHERE worksheet_template_id=ws10 AND symbol IN ('A_E_b_a_total','A_E_nb_a_total','A_C_sealed','A_C_unsealed');
END $$;
