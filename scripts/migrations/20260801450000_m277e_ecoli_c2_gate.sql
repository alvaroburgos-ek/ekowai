-- DWA-M-277E · Table 4 C2 · E. coli < 1,000/100 ml — MISSING health gate
-- ============================================================================
-- STATUS: APPLIED 2026-08-05 (owner ratified; BLOCK; Table-4 C2 limit verbatim-verified; grammar identical to live sibling REQ-14/15; effect re-queried) — ADDS ONE NEW BLOCK GATE
-- DEFECT (coverage): Table 4 C2 gives limits for Total coliforms (<10,000 → REQ-14),
-- P. aeruginosa (<100 → REQ-15) AND E. coli (<1,000) — but only E. coli has NO gate,
-- though its field (e_coli, M277E-10) + TBL-4 row exist. Mirrors the sibling guard form exactly.
-- SOURCE (verbatim, Table 4, PDF): "E. coli … < 1,000/100 ml" (C2).
--   Apply (on owner ratify): Mgmt-API POST · Rollback: scripts/rollback-20260801450000-m277e-ecoli.sql
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
   WHERE s.code='DWA-M-277E' AND wt.code='M277E-10';
  IF v_ws IS NULL THEN RAISE EXCEPTION 'M277E-10 not found'; END IF;
  INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity, clause_reference, source_quote)
  SELECT v_ws, 'REQ-14E', 'E. coli < 1,000/100 ml (C2)',
         'IF quality_category == C2 THEN e_coli < 1000', 'block', 'Table 4', 'E. coli … < 1,000/100 ml'
   WHERE NOT EXISTS (SELECT 1 FROM compliance_requirements WHERE worksheet_template_id=v_ws AND code='REQ-14E');
  RAISE NOTICE 'M277E-10 E.coli C2 gate added';
END $$;
