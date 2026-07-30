-- SOURCE-SETTLED — worksheet_sections.title_en backfill (same English-UI gap as CR title_en): English
-- section titles are stored in title_de with title_en NULL. Copy for the 10 verified-English ISO
-- standards, umlaut-guarded. Nothing translated. Rollback: scripts/rollback-20260730130000-section-titleEn.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE worksheet_sections sec SET title_en = sec.title_de
  FROM worksheet_templates w, standards s
  WHERE sec.worksheet_template_id = w.id AND w.standard_id = s.id
    AND s.code IN ('ISO-14002-2','ISO-59010','ISO-59014','ISO-5667-1','ISO-59020','ISO-59032',
                   'ISO-14019-1','ISO-14015','ISO-14033','ISO-59004')
    AND sec.title_en IS NULL AND sec.title_de IS NOT NULL AND sec.title_de <> ''
    AND sec.title_de !~ '[äöüßÄÖÜ]';
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'section title_en backfilled: %', v;
END $$;
