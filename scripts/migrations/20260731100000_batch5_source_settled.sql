-- SOURCE-SETTLED (full-treatment batch 5).
-- (A) ISO-14064-1 Q-CAT/Q-TOT/Q-EL output_unit -> 't CO2Aeq' (matches §6.3 "in Tonnen CO2aeq" and the
--     existing field units of E_co2e_gas/E_co2e_total; CO2Aeq spelling kept consistent with fields).
-- (B) ISO-14064-2 EQ-02/EQ-03: strip the natural-language tail ("over project/baseline SSRs") that is
--     not part of the formula (SUM still hits the engine gap but the string is now clean). Mechanical.
-- (C) ISO-14064-2 title_en + section title_en hygiene (English title_de; NOTE per compliance-block.tsx
--     the EN locale already falls back to title_de, so this is data hygiene not a render fix).
-- Rollback: scripts/rollback-20260731100000-batch5.sql
DO $$
DECLARE v int := 0; s642 uuid := (SELECT id FROM standards WHERE code='ISO-14064-2');
BEGIN
  UPDATE equations SET output_unit='t CO2Aeq'
   WHERE id IN ('7ac8363d-19a8-4106-94e4-c1b0abe174e2','1b725e27-bceb-438e-80cc-35ef7960d4e7','4e81dbbd-4211-48b7-8991-02aaf039c3e2')
     AND output_unit IS NULL;
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'ISO-14064-1 units: %', v;
  UPDATE equations SET formula='E_project = SUM(ssr_emission_co2e)'
   WHERE id='a6559b54-578c-4ba8-b224-37345a1269fe' AND formula='E_project = SUM(ssr_emission_co2e) over project SSRs';
  UPDATE equations SET formula='E_baseline = SUM(ssr_emission_co2e)'
   WHERE id='a7d36f0e-158e-4ef9-8c48-918ead93fa85' AND formula='E_baseline = SUM(ssr_emission_co2e) over baseline SSRs';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'ISO-14064-2 strips done';
  UPDATE compliance_requirements c SET title_en=c.title_de FROM worksheet_templates w
   WHERE c.worksheet_template_id=w.id AND w.standard_id=s642 AND c.title_en IS NULL AND c.title_de IS NOT NULL AND c.title_de<>'' AND c.title_de !~ '[äöüßÄÖÜ]';
  UPDATE worksheet_sections sec SET title_en=sec.title_de FROM worksheet_templates w
   WHERE sec.worksheet_template_id=w.id AND w.standard_id=s642 AND sec.title_en IS NULL AND sec.title_de IS NOT NULL AND sec.title_de<>'' AND sec.title_de !~ '[äöüßÄÖÜ]';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'ISO-14064-2 title_en hygiene done';
END $$;
