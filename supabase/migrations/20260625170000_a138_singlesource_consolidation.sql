-- supabase/migrations/20260625170000_a138_singlesource_consolidation.sql
-- A138-07 becomes the single producer of A_C/C_m/A_E_ba/A_E_nba; A138-10 retires
-- its Gl.2/2a/2b/2c + sub_areas. Idempotent. Never touches verification_status.
DO $$
DECLARE
  ws07 uuid;
  ws10 uuid;
  sec07 uuid;
  consumers text[] := ARRAY['A138-10','A138-13','A138-16','A138-17','A138-18','A138-19','A138-20','A138-21','A138-22','A138-26'];
BEGIN
  SELECT wt.id INTO ws07 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-07';
  SELECT wt.id INTO ws10 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='DWA-A-138-1' AND wt.code='A138-10';
  SELECT section_id INTO sec07 FROM fields WHERE worksheet_template_id=ws07 AND symbol='surface_inventory';

  -- 1. Repoint A138-07 Gl.2 output A_C_preliminary -> A_C.
  UPDATE equations SET output_symbol='A_C', output_unit='m²'
    WHERE id='b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';

  -- 2. New A138-07 producer fields (number). A_C/C_m carry the 9 consumers.
  INSERT INTO fields (id, worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, consumer_worksheets, order_index, active)
  VALUES
    ('a1380700-0000-4000-8000-000000000001', ws07, sec07, 'A_C',     'Befestigte, abflusswirksame Fläche A_C', 'Effective area A_C', 'number', 'm²', false, consumers, 90, true),
    ('a1380700-0000-4000-8000-000000000002', ws07, sec07, 'C_m',     'Mittlerer Abflussbeiwert C_m',          'Mean runoff coeff C_m', 'number', '-', false, consumers, 91, true),
    ('a1380700-0000-4000-8000-000000000003', ws07, sec07, 'A_E_ba',  'Σ befestigte Fläche A_E,b,a',           'Σ paved area',  'number', 'm²', false, NULL, 92, true),
    ('a1380700-0000-4000-8000-000000000004', ws07, sec07, 'A_E_nba', 'Σ unbefestigte Fläche A_E,nb,a',        'Σ unpaved area','number', 'm²', false, NULL, 93, true)
  ON CONFLICT (id) DO UPDATE SET consumer_worksheets=EXCLUDED.consumer_worksheets, active=true;

  -- 3. New A138-07 equations for C_m / A_E_ba / A_E_nba (Gl.2 already exists).
  INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference)
  VALUES
    ('a1380702-0000-4000-8000-000000000002', ws07, '2c', 'C_m = A_C / A_E', ARRAY['surface_inventory'], 'C_m', '-', '§5.3.3.5'),
    ('a1380702-0000-4000-8000-000000000003', ws07, '2d', 'A_E_ba = Σ A_E,i (befestigt)', ARRAY['surface_inventory'], 'A_E_ba', 'm²', '§5.3.3.5'),
    ('a1380702-0000-4000-8000-000000000004', ws07, '2e', 'A_E_nba = Σ A_E,i (unbefestigt)', ARRAY['surface_inventory'], 'A_E_nba', 'm²', '§5.3.3.5')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Retire A138-10 duplicate producers: delete Gl.2/2a/2b/2c equations.
  DELETE FROM equations WHERE id IN (
    '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3',
    'd1a38110-0000-0000-0000-000000000001',
    'd1a38110-0000-0000-0000-000000000002',
    'd1a38110-0000-0000-0000-000000000003');

  -- 5. Deactivate A138-10's A_C/C_m/sub_areas fields (so A_C/C_m are produced once;
  --    A138-10 inherits A_C/C_m from A138-07). Preserves any stored values.
  UPDATE fields SET active=false, consumer_worksheets=NULL
    WHERE worksheet_template_id=ws10 AND symbol IN ('A_C','C_m','sub_areas_A138_10');
END $$;
