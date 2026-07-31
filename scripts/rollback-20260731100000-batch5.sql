DO $$ DECLARE s642 uuid:=(SELECT id FROM standards WHERE code='ISO-14064-2'); BEGIN
  UPDATE equations SET output_unit=NULL WHERE id IN ('7ac8363d-19a8-4106-94e4-c1b0abe174e2','1b725e27-bceb-438e-80cc-35ef7960d4e7','4e81dbbd-4211-48b7-8991-02aaf039c3e2');
  UPDATE equations SET formula='E_project = SUM(ssr_emission_co2e) over project SSRs' WHERE id='a6559b54-578c-4ba8-b224-37345a1269fe';
  UPDATE equations SET formula='E_baseline = SUM(ssr_emission_co2e) over baseline SSRs' WHERE id='a7d36f0e-158e-4ef9-8c48-918ead93fa85';
  UPDATE compliance_requirements c SET title_en=NULL FROM worksheet_templates w WHERE c.worksheet_template_id=w.id AND w.standard_id=s642;
  UPDATE worksheet_sections sec SET title_en=NULL FROM worksheet_templates w WHERE sec.worksheet_template_id=w.id AND w.standard_id=s642;
END $$;
