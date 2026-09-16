-- Plan 2a · DWA-A-138-1 A138-07: the six Σ-notation producers become row-function formula strings.
-- Same math (Σ over COMPLETE Flächenverzeichnis rows). After this the bridge in src/lib/eval/rewrites.ts is a no-op → delete it.
-- Formulas are byte-identical to A138_07_REGISTER_FORMULAS (src/lib/eval/rewrites.ts); dollar-quoted so the
-- literal single quotes in the if(kind == 'paved', …) row expressions need no SQL escaping.
-- Rollback: scripts/rollback-20260916100000-a138-07-register-equations.sql (prior rows captured from prod 2026-09-16T23:23:45Z).
-- WRITTEN, NOT APPLIED — owner applies with stamp.
BEGIN;
UPDATE equations SET formula = $q$A_C = sum_rows(surface_inventory, area_m2 * c_i)$q$, input_symbols = ARRAY['surface_inventory'] WHERE id = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
UPDATE equations SET formula = $q$C_m = sum_rows(surface_inventory, area_m2 * c_i) / sum_rows(surface_inventory, area_m2)$q$, input_symbols = ARRAY['surface_inventory'] WHERE id = 'a1380702-0000-4000-8000-000000000002';
UPDATE equations SET formula = $q$A_E_ba = sum_rows(surface_inventory, if(kind == 'paved', area_m2, 0))$q$, input_symbols = ARRAY['surface_inventory'] WHERE id = 'a1380702-0000-4000-8000-000000000003';
UPDATE equations SET formula = $q$A_E_nba = sum_rows(surface_inventory, if(kind == 'unpaved', area_m2, 0))$q$, input_symbols = ARRAY['surface_inventory'] WHERE id = 'a1380702-0000-4000-8000-000000000004';
UPDATE equations SET formula = $q$A_C_sealed = sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_i, 0))$q$, input_symbols = ARRAY['surface_inventory'] WHERE id = 'a1380702-0000-4000-8000-000000000005';
UPDATE equations SET formula = $q$A_C_unsealed = sum_rows(surface_inventory, if(kind == 'unpaved', area_m2 * c_i, 0))$q$, input_symbols = ARRAY['surface_inventory'] WHERE id = 'a1380702-0000-4000-8000-000000000006';
COMMIT;
