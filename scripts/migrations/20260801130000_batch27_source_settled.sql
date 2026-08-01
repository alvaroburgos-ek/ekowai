-- SOURCE-SETTLED (full-treatment batch 27, PRIOR RE-TOUCH) — DWA-M-102-4 (März 2022, Weißdruck).
-- DWA-A-138-1 (the GOLD COPY) re-checked in the same batch: 46/46 equations faithful, ZERO source-settled
-- defects, no re-catch — class library confirmed converged on the reference standard. Nothing applied there.
--
-- DWA-M-102-4: 6 structural source-settled fixes (all engine-reproduction proven, PDF-independent):
-- (A) Gl.10/11/12 carry an inline '[mm/a]' unit token INSIDE the formula string -> evaluateFormula throws a
--     hard lexer error 'Unerwartetes Zeichen "["' (never evaluates). Strip the annotation to output_unit
--     ='mm/a'. Source p.22 prints 'in mm/a' as a NOTE, not part of the RHS (txt lines 1161/1178/1180). The
--     self-references (P_korr=…·P_korr…, Z=…·Z…) are the standard's own control identities (a_F+g_F+v_F=1,
--     a_A+g_A+v_A=1) and are FAITHFUL — left intact; P_korr/Z stay in input_symbols since they are on the RHS.
-- (B) NEW CLASS: Gl.1/5/6 list their OWN output symbol inside input_symbols though it is absent from the RHS
--     -> the resolver pushes it onto 'missing' and returns manual_required('Fehlende Eingaben: <output>'),
--     blocking computation until the user supplies the very value being computed. Remove the self-output
--     from input_symbols. Zero source interpretation (RHS printed verbatim: Gl.1 P_korr=R+ETa; Gl.5 RD=R−GWN;
--     Gl.6 P_korr=RD+GWN+ETa). Candidate validator rule: output-symbol-in-own-input-list.
-- All FIELD_MISSING gate re-homes (REQ-03/18/13/22), modal-severity (REQ-03 'ca.800', REQ-17 central §5.3.3
-- Nachweis), abs()/tol + prose engine-gap conditions, unmaterialized Tab.C.3/C.7 = RULINGS (sheeted).
-- Rollback: scripts/rollback-20260801130000-batch27.sql
DO $$
DECLARE v int := 0;
BEGIN
  -- (A) inline-unit strips
  UPDATE equations SET formula='P_korr = a_F * P_korr + g_F * P_korr + v_F * P_korr', output_unit='mm/a'
   WHERE id='84363b16-16cc-45b5-a983-6d9b2c2dfc65'
     AND formula='P_korr = a_F * P_korr + g_F * P_korr + v_F * P_korr   [mm/a]';
  UPDATE equations SET formula='Z = a_F * P_korr', output_unit='mm/a'
   WHERE id='6da086d8-b051-465f-bf45-7763f8b2fa01' AND formula='Z = a_F * P_korr   [mm/a]';
  UPDATE equations SET formula='Z = a_A * Z + g_A * Z + v_A * Z', output_unit='mm/a'
   WHERE id='2ab13f2f-5182-47dc-a0b7-1fec3330dbe9' AND formula='Z = a_A * Z + g_A * Z + v_A * Z   [mm/a]';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M102-4 inline-unit strips (last): %', v;

  -- (B) self-output removed from input_symbols
  UPDATE equations SET input_symbols='{R,ET_a}'
   WHERE id='681fdcea-c1f6-472d-9efb-1300e5bf1d4a' AND input_symbols='{P_korr,R,ET_a}';
  UPDATE equations SET input_symbols='{R,GWN}'
   WHERE id='c8a7ab70-c4db-4b17-bf96-2ee0f1ca4858' AND input_symbols='{R,GWN,R_D}';
  UPDATE equations SET input_symbols='{R_D,GWN,ET_a}'
   WHERE id='5cc33383-81ef-4d43-a5e8-02e6111bd7ac' AND input_symbols='{P_korr,R_D,GWN,ET_a}';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M102-4 self-input removals (last): %', v;
END $$;
