-- SOURCE-SETTLED (full-treatment batch 28, FINAL PRIOR re-touch) — DWA-A-102-2. VSME = 0 auto-applies.
-- DWA-A-102-2 (German, Weißdruck): only the 2 UNAMBIGUOUS capital-function normalizations apply — the
-- source itself writes German "Max(a; b)" which the engine (SUPPORTED_FUNCTIONS={min,max}, ',' separator)
-- rejects as manual_required("Funktionsaufruf Max(...) wird nicht unterstützt"). Lowercase + semicolon->comma
-- is a pure engine-grammar normalization (reproduction: manual->computes). These two rows carry NO piecewise
-- 'if' tail and NO unit-variant ambiguity:
--   (1) T6.a_f (id 6e412ae9): "a_f = Max(0.5 + 50 / (t_f + 100); 0.885)" -> "a_f = max(0.5 + 50 / (t_f + 100), 0.885)"
--       (max-form is the exact clean equivalent of the printed piecewise a_f: hyperbola crosses 0.885 at t_f=30).
--   (2) T6.Vs (id a928532e): "V_s = Max(H1 / (e_0 + 6) - H2; V_S_min)" -> "V_s = max(H1 / (e_0 + 6) - H2, V_S_min)".
-- HELD as RULINGS (NOT this migration): eta_erf Gl.6 (two unit-variants -/% -> field-unit choice); a_R_AFS63
-- 21b/B.23b (Min + trailing "if b_R_a_AFS63>478" -> needs 21a+21b combination); ALL piecewise-if->min/max
-- reformulations (a_c_CSB, a_h, a_f B.10 dup, r_krit, a_R 21a, m Gl.22/23) = structure reformulation; Gl.14
-- compound-LHS split; Gl.18 chained-relational e_0; Gl.B.21 a_a floor-constraint; Gl.B.5 bare-comparison
-- tautology; SUM/ln engine gaps; unmaterialized Tab.4/B.1; 25 CR clause mis-numbering; REG-Bild4 provenance.
-- VSME (English EFRAG, Weißdruck): 7 block CRs mis-homed on B01.000 (fields on B03/B06/B07/B09) = block-mishome
-- RULINGS (enforcement-location changes, held per campaign convention); title_de/label_de English-mis-store
-- (translation, 40 ws + 143 fields); issued_year NULL->2024; shall->warn modal-consistency. 0 applied.
-- Rollback: scripts/rollback-20260801140000-batch28.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE equations SET formula='a_f = max(0.5 + 50 / (t_f + 100), 0.885)'
   WHERE id='6e412ae9-f9e5-462b-9cfb-8b5bdc854d3b' AND formula='a_f = Max(0.5 + 50 / (t_f + 100); 0.885)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'A102-2 T6.a_f Max->max: %', v;
  UPDATE equations SET formula='V_s = max(H1 / (e_0 + 6) - H2, V_S_min)'
   WHERE id='a928532e-5aee-425a-afd1-e0044656039e' AND formula='V_s = Max(H1 / (e_0 + 6) - H2; V_S_min)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'A102-2 T6.Vs Max->max: %', v;
END $$;
