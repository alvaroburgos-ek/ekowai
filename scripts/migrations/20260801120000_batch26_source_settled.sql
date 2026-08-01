-- SOURCE-SETTLED (full-treatment batch 26, PRIOR RE-TOUCH) — DWA-A-178 + DWA-M-277E (both Weißdruck/final).
-- Continuous-improvement re-run: neither standard had its equations touched by the earlier mandate; these
-- are all NEW catches for this campaign's classes. Reproduction proven (broken before / computes after).
--
-- (A) DWA-A-178 Gl.13 eta_F (id 18a6351e): formula references VQ_DR_RBF_zu which is NOT a declared symbol
--     (declared input + field = VQ_Dr_RBF). evaluateFormula -> "Unbekanntes Symbol VQ_DR_RBF_zu" (never
--     computes). Gl.13-class formula-vs-declared-field alignment: VQ_DR_RBF_zu -> VQ_Dr_RBF. Source p.31
--     Gl.(13) defines no such symbol; VQ_Dr,RBF (Gl.12 mit-list) is the only drossel-outflow volume.
--     BEFORE=manual_required, AFTER=computed 0.75 (agent reproduction). Unblocks A178-15 eta_F.
--
-- (B) DWA-M-277E worked-example rows: CHAINED-EQUALITY ("A = expr = result") + PHANTOM input_symbols (the
--     all-numeric example formula references none of the declared symbols) -> engine error/manual, never
--     computes. Reduce each to the single verbatim-arithmetic RHS + clear phantom input_symbols; the
--     printed example values (875 / 1375 / 1625 / 750) are reproduced. Plus the V_buffer inline-unit "d"
--     token strip. Source §9.2-§9.4 p.25-27 verbatim. Each row x2 (duplicated across two worksheets).
--     NOT touched (rulings): Eq.(1)/(2) SUM (engine gap), Eq.(3)/(4) + Ex.9.4 min-collapse (representation),
--     QWB (already faithful), modal over-blocks, duplicate-REQ codes, E.coli/UV coverage gaps.
-- Rollback: scripts/rollback-20260801120000-batch26.sql
DO $$
DECLARE v int := 0;
BEGIN
  -- (A) DWA-A-178 Gl.13
  UPDATE equations SET formula='eta_F = ((C_RBF_zu * VQ_Dr_RBF) - (B_RBF_ab * 1000)) / (C_RBF_zu * VQ_RBF_zu)'
   WHERE id='18a6351e-31f7-448f-9e0f-a74bd6fbdfcf'
     AND formula='eta_F = ((C_RBF_zu * VQ_DR_RBF_zu) - (B_RBF_ab * 1000)) / (C_RBF_zu * VQ_RBF_zu)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'A178 Gl.13 eta_F symbol: %', v;

  -- (B) DWA-M-277E V_buffer inline-unit strip (x2)
  UPDATE equations SET formula='V_buffer = Q_GWT * 1', output_unit='l'
   WHERE id IN ('0b9966ea-64bc-43ae-b410-476a19b5f4ea','4df4256f-4098-4b6f-94bd-e5c67276d3a8')
     AND formula='V_buffer = Q_GWT * 1 d';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M277E V_buffer: %', v;

  -- Ex. 9.2 Q_SW (x2)
  UPDATE equations SET formula='Q_SW = 25*33 + 60*150/180', input_symbols='{}', output_unit='l/d'
   WHERE id IN ('4cc17e46-f898-42b9-9836-2184a12f3c5f','89340a0c-143a-4a2c-bba4-872906416e66')
     AND formula='Q_SW = 25*33 + 60*150/180 = 825 + 50 = 875 (l/d)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M277E Ex.9.2 Q_SW: %', v;

  -- Ex. 9.3-A1 Q_GW (two divergent source strings -> one canonical)
  UPDATE equations SET formula='Q_GW = 25*40 + 25*15', input_symbols='{}', output_unit='l/d'
   WHERE id='7e6180be-2e90-4172-ac9c-cf23fb533edb' AND formula='Q_GW = 25*40 + 25*15 = 1375 (l/d)';
  UPDATE equations SET formula='Q_GW = 25*40 + 25*15', input_symbols='{}', output_unit='l/d'
   WHERE id='8e434536-7820-4038-9691-bb37b6a9a653' AND formula='Q_GW = 25*40 + 25*15 = 1000 + 375 = 1375 (l/d)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M277E Ex.9.3-A1 Q_GW (row2): %', v;

  -- Ex. 9.3-A2 Q_GW (x2)
  UPDATE equations SET formula='Q_GW = 25*40 + 25*15 + 25*10', input_symbols='{}', output_unit='l/d'
   WHERE id IN ('9a24e0c9-12da-473e-8a7c-220fce1f4129','dd0ccdaf-8fa5-4b04-973f-45604e1184df')
     AND formula='Q_GW = 25*40 + 25*15 + 25*10 = 1625 (l/d)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M277E Ex.9.3-A2 Q_GW: %', v;

  -- Ex. 9.4-WB Q_WB (x2)
  UPDATE equations SET formula='Q_WB = 1625 - 875', input_symbols='{}', output_unit='l/d'
   WHERE id IN ('66da37aa-60cd-4ee9-8bc2-6a1c030dff2e','8ed7e9e9-b247-482a-924c-d1e7f5a435fd')
     AND formula='Q_WB = 1625 - 875 = +750 (l/d)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M277E Ex.9.4-WB Q_WB: %', v;
END $$;
