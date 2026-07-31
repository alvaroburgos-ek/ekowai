-- SOURCE-SETTLED (full-treatment batch 19) — DWA-A-125 + DWA-M-179-1.
-- DWA-A-125: ZERO clean auto-applies. Every finding is a ruling (3 bare-symbol-RHS always-fail gates
-- permanently false-blocking A125-02/06; CR-001 DN>1200 unconditional-pass; ueberschnitt>=20 inversion
-- whose correct fix is a choice; modal over-blocks; CR-015 over-broad) OR needs OCR re-extraction the
-- image-only scan makes costly. All sheeted. Equations 2/2 faithful.
--
-- DWA-M-179-1: ONE Gl.13-class source-settled fix (structural, zero-interpretation, DB-verifiable):
-- (A) equation "Bild 4 regression" (id d929851f…) formula references a_AFS63 / b_AFS63, but NO such
--     fields exist on the worksheet — the declared fields ARE regression_a_AFS63 / regression_b_AFS63,
--     and the equation's OWN input_symbols array already lists {q_A_max,regression_a_AFS63,
--     regression_b_AFS63}. Both independent declarations agree on the regression_ prefix; only the
--     formula string is out of sync. Align it. (Confirmed in-session: fields regression_a_AFS63,
--     regression_b_AFS63, q_A_max exist; a_AFS63/b_AFS63 do not.) NOTE: the equation uses exp(), an
--     engine gap (SUPPORTED_FUNCTIONS={min,max}), so it stays manual_required after the fix — no
--     computed-value change; this only repairs the formula-vs-declared-field inconsistency.
-- All 7 phantom fields (II/III/sedimentation/filtration_oberflaeche/fall_4/vollstrom/ready), 4 block
-- mishomes, REQ-30 ==ready→final, 3 modal over-blocks, A_b_a m²/ha unit split, unmaterialized Tab.4/5 +
-- Bild-3/4 = RULINGS (phantom deletion is destructive; the rest are enforcement/choice). All sheeted.
-- Rollback: scripts/rollback-20260731210000-batch19.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE equations
     SET formula='eta_BV = regression_a_AFS63 * exp(-regression_b_AFS63 * q_A_max)'
   WHERE id='d929851f-c55d-4e97-a849-1aa614decbf0'
     AND formula='eta_BV = a_AFS63 * exp(-b_AFS63 * q_A_max)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M179-1 Bild-4 formula symbol align: %', v;
END $$;
