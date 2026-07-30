-- SOURCE-SETTLED (full-treatment batch 4). All scoped by standard code + symbol/number (no ids needed).
-- (A) ATV-A-704E: clause_reference 'IGC-Card' -> 'IQC-Card' on all equations (letter typo; printed cards
--     titled 'IQC-Card N' verbatim; 'IGC' appears nowhere). No value/enforcement change.
-- (B) ATV-A-704E EQ output_unit='%': deviation_equivalency_pct (IQC-Card 6 col-8 '%', folio 45),
--     deviation_parallel_pct (IQC-Card 7 col-10 '%', folio 47).
-- (C) ISO-46001 C.3/C.5 output_unit='%': printed formula ends 'x100 %', clause names 'recycling rate (%)' (folio p.35).
-- (D) ISO-5667-16 §11.2 Eq.(2): resolve the un-encoded identifier 'log_e2' to the constant ln(2)=0.6931
--     (printed 'CT50 = loge2 / k2', folio 18). Rewrites to a computable numeric constant.
-- (E) title_en + section title_en backfill for ATV-A-704E and ISO-5667-16 (English title_de mis-stored),
--     umlaut-guarded, nothing translated.
-- Rollback: scripts/rollback-20260730150000-batch4.sql
DO $$
DECLARE v int := 0;
  atv uuid := (SELECT id FROM standards WHERE code='ATV-A-704E');
  s46 uuid := (SELECT id FROM standards WHERE code='ISO-46001');
  s16 uuid := (SELECT id FROM standards WHERE code='ISO-5667-16');
BEGIN
  UPDATE equations e SET clause_reference = replace(e.clause_reference,'IGC-Card','IQC-Card')
   FROM worksheet_templates w WHERE e.worksheet_template_id=w.id AND w.standard_id=atv AND e.clause_reference LIKE '%IGC-Card%';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'ATV IGC->IQC: %', v;

  UPDATE equations e SET output_unit='%' FROM worksheet_templates w
   WHERE e.worksheet_template_id=w.id AND w.standard_id=atv AND e.output_symbol IN ('deviation_equivalency_pct','deviation_parallel_pct') AND e.output_unit IS NULL;
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'ATV eq units: %', v;

  UPDATE equations e SET output_unit='%' FROM worksheet_templates w
   WHERE e.worksheet_template_id=w.id AND w.standard_id=s46 AND e.equation_number IN ('C.3','C.5') AND e.output_unit IS NULL;
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'ISO-46001 C.3/C.5 units: %', v;

  UPDATE equations e SET formula = replace(e.formula,'log_e2','0.6931') FROM worksheet_templates w
   WHERE e.worksheet_template_id=w.id AND w.standard_id=s16 AND e.formula LIKE '%log_e2%';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'ISO-5667-16 log_e2->0.6931: %', v;

  UPDATE compliance_requirements c SET title_en=c.title_de FROM worksheet_templates w, standards s
   WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code IN ('ATV-A-704E','ISO-5667-16')
     AND c.title_en IS NULL AND c.title_de IS NOT NULL AND c.title_de<>'' AND c.title_de !~ '[äöüßÄÖÜ]';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'title_en backfill: %', v;

  UPDATE worksheet_sections sec SET title_en=sec.title_de FROM worksheet_templates w, standards s
   WHERE sec.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code IN ('ATV-A-704E','ISO-5667-16')
     AND sec.title_en IS NULL AND sec.title_de IS NOT NULL AND sec.title_de<>'' AND sec.title_de !~ '[äöüßÄÖÜ]';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'section title_en: %', v;
END $$;
