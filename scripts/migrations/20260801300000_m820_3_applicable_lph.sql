-- DWA-M 820-3 · applicable_lph → HOAI-phase checklist (LPH 0–9). Description-only.
DO $$
DECLARE v_std uuid;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code='DWA-M-820-3';
  IF v_std IS NULL THEN RAISE EXCEPTION 'DWA-M-820-3 not found'; END IF;
  UPDATE fields SET description='Mehrfachauswahl der beauftragten Leistungsphasen (§1): LPH 0 Bedarfsplanung … LPH 9 Objektbetreuung (HOAI/AHO).'
   WHERE symbol='applicable_lph' AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_std)
     AND description IS DISTINCT FROM 'Mehrfachauswahl der beauftragten Leistungsphasen (§1): LPH 0 Bedarfsplanung … LPH 9 Objektbetreuung (HOAI/AHO).';
  RAISE NOTICE 'DWA-M-820-3 applicable_lph enriched';
END $$;
