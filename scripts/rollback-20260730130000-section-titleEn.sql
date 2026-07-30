DO $$ BEGIN
  UPDATE worksheet_sections sec SET title_en=NULL FROM worksheet_templates w, standards s
   WHERE sec.worksheet_template_id=w.id AND w.standard_id=s.id
     AND s.code IN ('ISO-14002-2','ISO-59010','ISO-59014','ISO-5667-1','ISO-59020','ISO-59032','ISO-14019-1','ISO-14015','ISO-14033','ISO-59004');
END $$;
