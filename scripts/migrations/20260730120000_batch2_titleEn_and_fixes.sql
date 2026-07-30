-- SOURCE-SETTLED (full-treatment batch 2) — English-UI title backfill + two gate fixes.
--
-- (A) title_en BACKFILL. The encoder stored the CRs' ENGLISH titles in the title_de column and left
--     title_en NULL, so compliance-block.tsx renders a BLANK gate title in the English locale. Fix =
--     copy title_de -> title_en (the English text already exists; nothing translated or invented).
--     SCOPED to the 10 ISO standards whose title_de is VERIFIED English in-session (batch-1/2 + 3-run),
--     with an umlaut guard so no German-orthography row is ever copied into title_en. Other standards
--     (German/Spanish title_de) are handled per-guideline as each is treated — NOT swept here.
--
-- (B) ISO-59020 CR-020: warn gate mis-homed on ISO-59020-04 (Indicator-Selection ws) but encodes the
--     §A.4.2 renewable-energy-share indicator whose fields live on ISO-59020-07 -> re-home. Empty/warn
--     class per settled splits -> source-settled (zero enforcement change).
-- (C) ISO-5667-1 CR-020 clause_reference '17' -> '§14' (the requirement text is §14 Introduccion, not
--     §17; verified on the printed page) + add '§' prefix; and § prefix on CR-003/004/005/007/025.
-- Rollback: scripts/rollback-20260730120000-batch2.sql
DO $$
DECLARE v int := 0;
BEGIN
  -- (A) title_en backfill, scoped + umlaut-guarded
  UPDATE compliance_requirements c SET title_en = c.title_de
  FROM worksheet_templates w, standards s
  WHERE c.worksheet_template_id = w.id AND w.standard_id = s.id
    AND s.code IN ('ISO-14002-2','ISO-59010','ISO-59014','ISO-5667-1','ISO-59020','ISO-59032',
                   'ISO-14019-1','ISO-14015','ISO-14033','ISO-59004')
    AND c.title_en IS NULL AND c.title_de IS NOT NULL AND c.title_de <> ''
    AND c.title_de !~ '[äöüßÄÖÜ]';
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'title_en backfilled: % CRs', v;

  -- (B) ISO-59020 CR-020 warn re-home ws04 -> ws07
  UPDATE compliance_requirements SET worksheet_template_id = (
     SELECT w.id FROM worksheet_templates w JOIN standards s ON s.id=w.standard_id
     WHERE s.code='ISO-59020' AND w.code='ISO-59020-07')
   WHERE id = (SELECT c.id FROM compliance_requirements c JOIN worksheet_templates w ON w.id=c.worksheet_template_id
               JOIN standards s ON s.id=w.standard_id WHERE s.code='ISO-59020' AND c.code='CR-020')
     AND worksheet_template_id = (SELECT w.id FROM worksheet_templates w JOIN standards s ON s.id=w.standard_id
               WHERE s.code='ISO-59020' AND w.code='ISO-59020-04');
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'ISO-59020 CR-020 re-home: %', v;

  -- (C) ISO-5667-1 clause fixes
  UPDATE compliance_requirements c SET clause_reference='§14'
   FROM worksheet_templates w, standards s
   WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code='ISO-5667-1' AND c.code='CR-020' AND c.clause_reference='17';
  UPDATE compliance_requirements c SET clause_reference='§'||c.clause_reference
   FROM worksheet_templates w, standards s
   WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code='ISO-5667-1'
     AND c.code IN ('CR-003','CR-004','CR-005','CR-007','CR-025') AND c.clause_reference !~ '^§' AND c.clause_reference<>'';
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'ISO-5667-1 § prefixes: %', v;
END $$;
