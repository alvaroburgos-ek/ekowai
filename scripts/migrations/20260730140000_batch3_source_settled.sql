-- SOURCE-SETTLED (full-treatment batch 3).
-- (A) ISO-5667-10 Eq1/Eq2: strip the encoder-added natural-language iteration tail ("for k = 1, 2,
--     ..., number_of_samples") that is NOT part of the printed formula and whose stray '=' makes the
--     arithmetic parser throw a hard ERROR. Removing it leaves the verbatim printed formula; proven to
--     compute (Eq1->14.6, Eq2->15.6) via the real evaluateFormula. Prose moved to description scope.
-- (B) ISO-5667-10 Eq3: output_unit='ml' per the printed 'Vn: volumen de la muestra (ml)' (folio 14).
-- (C) ISO-5667-13 CR-003/018/022 clause_reference: add the '§' prefix used by every sibling.
-- (D) title_en backfill for ISO-5667-10 / ISO-5667-13 / ISO-14050 (English title_de mis-stored,
--     title_en NULL -> blank English UI). Umlaut-guarded; nothing translated.
-- Rollback: scripts/rollback-20260730140000-batch3.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE equations SET formula='sampling_day_k = A + (365 * k) / number_of_samples'
   WHERE id='ba1bf923-06cc-46aa-aab2-40f0dfa7ae22'
     AND formula='sampling_day_k = A + (365 * k) / number_of_samples   for k = 1, 2, ..., number_of_samples';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'Eq1 strip: %', v;
  UPDATE equations SET formula='sampling_week_k = A + (52 * k) / number_of_samples'
   WHERE id='c7908fa3-c685-4d8d-a7cd-57e134794a85'
     AND formula='sampling_week_k = A + (52 * k) / number_of_samples   for k = 1, 2, ..., number_of_samples';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'Eq2 strip: %', v;
  UPDATE equations SET output_unit='ml' WHERE id='6a587ea8-30d9-4eb9-ad5a-b8d8fd60228d' AND output_unit IS NULL;
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'Eq3 unit: %', v;

  UPDATE compliance_requirements SET clause_reference='§2'   WHERE id='6d2f13bc-8b7f-4288-a7c9-f85703042b83' AND clause_reference='2';
  UPDATE compliance_requirements SET clause_reference='§6.4' WHERE id='76cb80aa-3db0-44cf-a76e-1db8ff836416' AND clause_reference='6.4';
  UPDATE compliance_requirements SET clause_reference='§8'   WHERE id='2e3d5ff6-abe8-4774-94fd-d47ed0850cba' AND clause_reference='8';

  UPDATE compliance_requirements c SET title_en=c.title_de
   FROM worksheet_templates w, standards s
   WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id
     AND s.code IN ('ISO-5667-10','ISO-5667-13','ISO-14050')
     AND c.title_en IS NULL AND c.title_de IS NOT NULL AND c.title_de<>'' AND c.title_de !~ '[äöüßÄÖÜ]';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'title_en backfill: %', v;

  UPDATE worksheet_sections sec SET title_en=sec.title_de
   FROM worksheet_templates w, standards s
   WHERE sec.worksheet_template_id=w.id AND w.standard_id=s.id
     AND s.code IN ('ISO-5667-10','ISO-5667-13','ISO-14050')
     AND sec.title_en IS NULL AND sec.title_de IS NOT NULL AND sec.title_de<>'' AND sec.title_de !~ '[äöüßÄÖÜ]';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'section title_en: %', v;
END $$;
