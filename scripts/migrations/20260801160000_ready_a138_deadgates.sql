-- READY-TO-USE cleanup (Wizard roadmap Stage 1/priority) — DWA-A-138-1 dead warn placeholders.
-- The corpus-ready-to-use harness flagged 5 dead gates on the priority standard DWA-A-138-1:
-- A138-REQ-10..14 carry non-parsing prose conditions ("verify Gl. 2" / "Gl. 3" / "Gl. 5/6" / "Gl. 4" /
-- "Gl. 8 iterated") that evaluateCondition returns 'manual' for → they never enforce and render as a
-- BROKEN gate. All are severity=warn (non-blocking), and the underlying Gl.2/3/4/5/6/8 compute as
-- separate equation rows. Empty the dead condition so each renders as a CLEAN manual-review item
-- (dead-manual → clean-manual; zero enforcement change — warn was and stays non-blocking). Rule-14
-- dead-condition-clear class (the 'manual'-token sweep missed the "verify Gl. N" phrasing).
-- Rollback: scripts/rollback-20260801160000-ready-a138.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE compliance_requirements c SET condition=''
   FROM worksheet_templates w, standards s
   WHERE c.worksheet_template_id=w.id AND w.standard_id=s.id AND s.code='DWA-A-138-1'
     AND c.code IN ('A138-REQ-10','A138-REQ-11','A138-REQ-12','A138-REQ-13','A138-REQ-14')
     AND c.severity='warn'
     AND c.condition IN ('verify Gl. 2','verify Gl. 3','verify Gl. 5/6','verify Gl. 4','verify Gl. 8 iterated');
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'A138 dead warn placeholders cleared: %', v;
END $$;
