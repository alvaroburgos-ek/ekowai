-- SOURCE-SETTLED — DWA-M-205: dead attestation gates == 'ja'/'nein' on BOOLEAN fields (verified) ->
-- == True/False. String-vs-boolean always-failed; now evaluate. Scoped to DWA-M-205.
-- Rollback: scripts/rollback-20260731140000-m205.sql (documented: reverse True->'ja' etc.)
DO $$
DECLARE v int:=0; s205 uuid:=(SELECT id FROM standards WHERE code='DWA-M-205');
BEGIN
  UPDATE compliance_requirements c SET condition =
      replace(replace(c.condition, '== ''ja''','== True'), '== ''nein''','== False')
  FROM worksheet_templates w
  WHERE c.worksheet_template_id=w.id AND w.standard_id=s205
    AND (c.condition LIKE '%== ''ja''%' OR c.condition LIKE '%== ''nein''%');
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'DWA-M-205 gate fixes: % rows', v;
END $$;
