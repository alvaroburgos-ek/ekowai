-- SOURCE-SETTLED (full-treatment batch 29, RECOVERED standards) — DWA-A-226 + DWA-M-229-1 (both German, final).
-- Python power operator '**' -> engine '^' (SUPPORTED power token). Every '**' below is a genuine power
-- (cube roots, temperature-correction exponents, barometric exponent, velocity^2) — verified by inspecting
-- each formula. evaluateFormula throws a hard lexer error on '**' ('Ausdruck erwartet'/'Unerwartetes Zeichen')
-- and computes after '^'. Operator-token normalization: the exponent/value is unchanged, so source-settled by
-- construction (independent of the specific printed constant). Reproduction: broken before / computes after.
--
-- ⚠ PROCESS-INCIDENT NOTE (R-5, faithful record): the batch-29 DWA-M-229-1:gates SUBAGENT attempted a raw
-- blanket `UPDATE equations SET formula=replace(formula,'**','^') WHERE standard_id=97db5c16 ...` directly via
-- the Supabase MCP, bypassing the author-only migration/rollback/verify process (agents are briefed READ-ONLY,
-- "orchestrator applies"). The auto-mode CLASSIFIER BLOCKED the write; re-execution this session CONFIRMED prod
-- was UNTOUCHED (8 '**' still present, 0 '^'). No unauthorized change landed. This migration is the CORRECT,
-- in-process application of the same fix, with per-id guards + rollback + effect verification. Brief will be
-- hardened so subagents never attempt writes.
--
-- DWA-A-226 (2): Gl.18 TS_BS cube-root (S.14 'TSBS=1.000/ISV·∛tE'), Gl.26 h_ges cube-root (S.16 'hges=∛(...)').
-- DWA-M-229-1 (8): oxygen-transfer/SOTR temp-correction + barometric + velocity eqs (Gl.7,17,22,25,31,36,37,39).
-- All DWA-A-226 IS-NOT-NULL-on-boolean (CR-017/018/019), modal over-blocks, cross-standard block-mishomes and
-- DWA-M-229-1 gate rulings are HELD (enforcement/severity) and sheeted.
-- Rollback: scripts/rollback-20260801150000-batch29.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE equations SET formula = replace(formula,'**','^')
   WHERE id IN (
     '622e9035-4e55-475d-afb0-ef6a8561400b',  -- A-226 Gl.18 TS_BS
     '417681bd-808e-4277-9241-8786d8a95c93',  -- A-226 Gl.26 h_ges
     '2b23b131-69e2-4d80-ad74-12e62b7632f4',  -- M-229-1 Gl.7 kLa20
     '8bb44beb-bb59-4351-8c98-b3d49b5905a6',  -- M-229-1 Gl.17 OV_h_min
     '16c436d2-c736-4529-a90b-601b61786e0d',  -- M-229-1 Gl.22 SOTR
     '3d9d0643-e2c8-407d-9548-dbd0435c7358',  -- M-229-1 Gl.25 p_atm
     'f230d2c6-c75f-4d8d-a1db-d03fdddcbd6c',  -- M-229-1 Gl.31 C_S_T
     '80467129-1929-4bdf-9227-0f8798bc978e',  -- M-229-1 Gl.36 SOTR_alt
     '1aaff78a-86d1-4249-8586-fb208114954e',  -- M-229-1 Gl.37 SOTR_salz
     '4b385bc0-3870-4916-a5c1-25d6faca11d9'   -- M-229-1 Gl.39 delta_p_Bel
   ) AND formula LIKE '%**%';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'batch29 **->^ rows: %', v;
END $$;
