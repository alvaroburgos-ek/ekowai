-- ROLLBACK for scripts/migrations/20260916100000_a138_07_register_equations.sql
-- Restores the six DWA-A-138-1 A138-07 producer equations to their pre-Plan-2a formula text.
-- NOT a forward migration: lives in scripts/ so it is never auto-applied. Idempotent + re-runnable.
--
-- Prior values captured READ-ONLY from prod (Supabase vadsmshzebefjreqcicl) on 2026-09-16T23:23:45Z via
--   node scripts/verification/prod-query.mjs <file.sql>   (main checkout; read-only transaction)
--   select id, equation_number, formula, input_symbols, output_symbol from equations where id in (…six ids…) order by id;
-- Column types verified in the same session: formula text, input_symbols text[].
--
-- CODE rollback (separate, before deploying): the rewrite bridge in src/lib/eval/rewrites.ts keeps evaluating
-- these six ids through the register formulas regardless of the stored text, so restoring the rows alone
-- only changes the "source formula" line the engineer sees. Reverting the engine = git revert of the
-- Task 6 commit (aggregators + formula.ts registers).
BEGIN;
UPDATE equations SET formula = 'A_C_preliminary = Σ_i (A_E,i · C_i)',   input_symbols = ARRAY['surface_inventory'] WHERE id = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0'; -- eq 2,  output A_C
UPDATE equations SET formula = 'C_m = A_C / A_E',                       input_symbols = ARRAY['surface_inventory'] WHERE id = 'a1380702-0000-4000-8000-000000000002'; -- eq 2c, output C_m
UPDATE equations SET formula = 'A_E_ba = Σ A_E,i (befestigt)',          input_symbols = ARRAY['surface_inventory'] WHERE id = 'a1380702-0000-4000-8000-000000000003'; -- eq 2d, output A_E_ba
UPDATE equations SET formula = 'A_E_nba = Σ A_E,i (unbefestigt)',       input_symbols = ARRAY['surface_inventory'] WHERE id = 'a1380702-0000-4000-8000-000000000004'; -- eq 2e, output A_E_nba
UPDATE equations SET formula = 'A_C_sealed = Σ_i (A_E,b,a,i · C_i)',    input_symbols = ARRAY['surface_inventory'] WHERE id = 'a1380702-0000-4000-8000-000000000005'; -- eq 2f, output A_C_sealed
UPDATE equations SET formula = 'A_C_unsealed = Σ_i (A_E,nb,a,i · C_i)', input_symbols = ARRAY['surface_inventory'] WHERE id = 'a1380702-0000-4000-8000-000000000006'; -- eq 2g, output A_C_unsealed
COMMIT;
