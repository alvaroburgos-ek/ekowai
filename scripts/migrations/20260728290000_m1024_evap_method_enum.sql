-- SOURCE-SETTLED — DWA-M-102-4 evap_method: populate the 2-option evaporation-method enum VERBATIM.
-- §C.1 "Wahl des Berechnungsansatzes" (Anhang C, p.38) presents exactly two calculation approaches,
-- confirmed by the formal subsection headings C.4.1 "Landnutzungsarten im BAGLUVA-Verfahren" and
-- C.4.2 "Landnutzungsarten im vereinfachten Verfahren". Read in-session. clause_reference corrected
-- from the unreliable §4.2 to the real §C.1. Nothing invented — the two methods are printed headings.
-- Rollback: scripts/rollback-20260728290000-m1024-evap-method.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE fields SET
    clause_reference = 'Anhang C, C.1 (Wahl des Berechnungsansatzes)',
    enum_values = '[
      {"value":"bagluva_verfahren","label_de":"BAGLUVA-Verfahren","label_en":"BAGLUVA method (Bagrov/Glugla, model GWneu)","order_index":1,"regulation_reference":"Anhang C, C.1 / C.4.1 (S. 38, 43)"},
      {"value":"vereinfachtes_verfahren","label_de":"Vereinfachtes Verfahren","label_en":"Simplified method (Tab. C.3)","order_index":2,"regulation_reference":"Anhang C, C.1 / C.3 / C.4.2 (S. 38-39, 43)"}
    ]'::jsonb
  WHERE id = 'ef0a6f17-0da2-46ee-9070-5de5e7703c8f' AND data_type='enum' AND (enum_values IS NULL OR jsonb_array_length(enum_values)=0);
  GET DIAGNOSTICS v = ROW_COUNT;
  IF v <> 1 THEN RAISE EXCEPTION 'evap_method: expected 1 row, got %', v; END IF;
  RAISE NOTICE 'evap_method: 2-option enum populated';
END $$;
