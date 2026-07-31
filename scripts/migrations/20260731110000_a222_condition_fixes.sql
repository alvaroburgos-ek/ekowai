-- SOURCE-SETTLED — DWA-A-222 condition literal fixes. The attestation fields are BOOLEAN (verified),
-- so `field == 'ja'` (string vs boolean) ALWAYS FAILS (dead gate); correct to `== True`. `== 'nein'`
-- -> `== False`. GK is an enum with values gk_1..gk_5, so `GK == '1'` -> `GK == 'gk_1'` (value mismatch).
-- Scoped to DWA-A-222 conditions; only rows containing the patterns are touched.
-- Rollback: scripts/rollback-20260731110000-a222.sql
DO $$
DECLARE v int := 0; s222 uuid := (SELECT id FROM standards WHERE code='DWA-A-222');
BEGIN
  UPDATE compliance_requirements c SET condition =
      replace(replace(replace(replace(replace(replace(replace(c.condition,
        '== ''ja''','== True'), '== ''nein''','== False'),
        'GK == ''1''','GK == ''gk_1'''), 'GK == ''2''','GK == ''gk_2'''),
        'GK == ''3''','GK == ''gk_3'''), 'GK == ''4''','GK == ''gk_4'''), 'GK == ''5''','GK == ''gk_5''')
  FROM worksheet_templates w
  WHERE c.worksheet_template_id=w.id AND w.standard_id=s222
    AND (c.condition LIKE '%== ''ja''%' OR c.condition LIKE '%== ''nein''%' OR c.condition LIKE '%GK == ''%');
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'DWA-A-222 condition fixes: % rows', v;
END $$;
