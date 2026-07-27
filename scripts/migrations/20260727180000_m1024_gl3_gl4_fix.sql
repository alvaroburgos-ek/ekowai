-- SOURCE-SETTLED FIX — DWA-M-102-4 Gl.(3) + Gl.(4): formula/field symbol mismatch + self-referential input_symbols
--
-- Class (a) of the SOURCE-SETTLED pre-authorisation: mismatches between a formula and its
-- own declared fields, fully determined by the printed page.
--
-- PRINTED SOURCE (both §5.1, printed p.19 = PDF p.21, rendered and read as image):
--   Gl.(3):  R_D = R_D,o + R_D,z     (true subscripts D,o / D,z)
--   Gl.(4):  R_B = GWN
-- Fields R_D_o and R_D_z EXIST on this standard (underscore convention used everywhere
-- else); Gl.3's own input_symbols already declare them.
--
-- EXECUTION PROOF (real evaluateFormula, run in this session, probes deleted after):
--   Gl.3 stored state:            manual_required "Fehlende Eingaben: R_D"
--   Gl.3 comma-fix ALONE:         manual_required (unchanged — SILENT NO-OP; the
--                                 self-referential R_D in input_symbols short-circuits first)
--   Gl.3 inputs-fix ALONE:        manual_required "Unbekanntes Symbol R_D im Ausdruck"
--   Gl.3 COMBINED fix:            computed value 8 (R_D_o=5, R_D_z=3)   <- broken -> computes
--   Gl.4 stored state:            manual_required "Fehlende Eingaben: R_B"
--   Gl.4 drop self-ref R_B:       computed value 7 (GWN=7)              <- broken -> computes
--
-- The audited "Part A comma fix" for Gl.3 would have shipped as a silent no-op on its own —
-- caught only because the reproduction check is executed, never asserted. Both edits ship
-- together because execution proved each alone insufficient.
--
-- NO fn( calls exist in either formula, so the M104-D-comma FN_LIKE phantom trap (B.2
-- lesson) does not apply — verified by inspection of both formula strings.
--
-- SCOPE: exactly the two rows the audit + adversarial refutation survived. The identical
-- self-ref artifact on other equations (Gl.6/10/12 etc.) is DELIBERATELY not touched —
-- those carry circular structures the auditors themselves held as rulings (sheet G-D8).
--
-- Rollback: scripts/rollback-20260727180000-m1024-gl3-gl4.sql (restores recorded originals)

DO $$
DECLARE
  v_n int := 0;
BEGIN
  -- Gl.(3): fix formula spelling to the row's own declared fields + drop self-ref output
  UPDATE equations
     SET formula = 'R_D = R_D_o + R_D_z',
         input_symbols = ARRAY['R_D_o','R_D_z']::text[]
   WHERE id = 'e59eb085-4e3e-4071-99ce-46e1ca5262a8'
     AND formula = 'R_D = R_D,o + R_D,z';   -- guard: only the known broken state
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Gl.3: % row(s) updated', v_n;

  -- Gl.(4): drop the self-referential output symbol from input_symbols (formula unchanged)
  UPDATE equations
     SET input_symbols = ARRAY['GWN']::text[]
   WHERE id = '3de1904c-874a-4076-aa63-ec3fe2725862'
     AND input_symbols = ARRAY['R_B','GWN']::text[];   -- guard: only the known broken state
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Gl.4: % row(s) updated', v_n;
END $$;
