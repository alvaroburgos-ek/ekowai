-- SOURCE-SETTLED (full-treatment batch 24) — DWA-A-272E (Weißdruck) + DWA-M-820-3 (Weißdruck, Feb 2026).
-- DWA-A-272E: ONE inline-unit-annotation strip. RULE-7 (id 995ac439) formula "Q_flush_avg = 33 l/(E*d)"
--   embeds the unit in the RHS -> arithmetic parser throws "Unerwartetes Token am Ende des Ausdrucks"
--   (engine reproduction this batch: as-is=error, "33"=computed 33). Strip inline unit -> formula "33",
--   set output_unit "l/(E*d)" (matching the Q_flush_avg field's own unit). Value 33 verbatim: Table 5
--   NOTE 3 (printed p.21) "The average flushing water requirement is given in BDEW (2011) as 33 l/(E d)."
--   Broken-before/computes-after. No other DWA-A-272E fix is source-settled (6 field-missing inert gates,
--   RULE-8/9/10/11 engine gaps, modal over-blocks, duplicate codes = all rulings).
-- DWA-M-820-3: ZERO source-settled — all defects are enforcement-changing rulings (8 phase-goal block
--   mis-homes, all()/wildcard/Python-colon parse-fails, "all"-field-missing, REQ-30 content mix-up).
-- Rollback: scripts/rollback-20260801110000-batch24.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE equations SET formula='Q_flush_avg = 33', output_unit='l/(E*d)'
   WHERE id='995ac439-647a-46e2-a23f-9383caa592ed' AND formula='Q_flush_avg = 33 l/(E*d)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'A272E RULE-7 unit strip: %', v;
END $$;
