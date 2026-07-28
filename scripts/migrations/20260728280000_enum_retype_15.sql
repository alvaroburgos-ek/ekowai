-- USER-AUTHORIZED re-type — 13 fields mis-typed as 'enum' with no printed option list get re-typed to
-- their true type so they render as working inputs instead of a dead dropdown. Basis: 7-agent verbatim
-- source extraction (workflow wj1nyz2en) confirmed each guideline prints NO discrete option set for
-- these fields. NEVER invents options — it corrects the field TYPE.
--
--   -> TEXT (12): categorical/descriptive fields with no closed printed list (free entry is the honest
--      working state): gewaesserart, system_planungsphase, feasibility_determination, optimisation_target,
--      data_source_type, successive_supervision_interval, post_treatment, vergabeverfahren_used,
--      pflanzen_initial_zustand, preferred_variant, investment_decision, qa_minimum_frequency.
--   -> NUMBER (1): data_completeness_score (a completeness score/metric, not a category).
--   LEFT AS-IS (2, ambiguous, sheet V): duration_method (name=method vs agent=computed value),
--      evap_method (likely a real 2-option method enum to POPULATE, not downgrade).
--
-- enum_values cleared to null on re-type. Guarded to current data_type='enum'.
-- Rollback: scripts/rollback-20260728280000-enum-retype.sql
DO $$
DECLARE v int := 0; t int := 0;
BEGIN
  UPDATE fields SET data_type='text', enum_values=NULL
   WHERE data_type='enum' AND id IN (
     'f1289ec5-adb3-4e8e-84ed-9f896afbea08','d929eabd-475f-402a-81b6-09eeddb045b2',
     'fb6e1ae3-4432-4df5-a3a6-7f31d97a64ff','cad666d3-03f3-4856-9316-4a4a6730b176',
     '7643060f-6a5e-484b-ae9f-bba7fd9e6c4f','118d561d-2848-49a4-95c4-47714f2e1b83',
     'c2bb7f92-2b1f-4895-bbf0-7d3969ec3666','19cb9a0a-71e3-4e75-b1ac-88862ceb0fb5',
     'b8eeaad3-3437-4f90-9ddf-d9a036deb215','e0d88da3-87b8-4b54-9be1-5736e380b89b',
     '8b1fa526-1b1f-4b7c-b260-62eebf05e344','9ee02f74-41df-4110-a248-234e2e4e288e');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v; RAISE NOTICE '-> text: % rows', v;

  UPDATE fields SET data_type='number', enum_values=NULL
   WHERE data_type='enum' AND id = '83804e04-978c-40db-85c5-eb6f3360de88';
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v; RAISE NOTICE '-> number: % rows', v;

  IF t <> 13 THEN RAISE EXCEPTION 'expected 13 re-types, got % (prod not in expected state)', t; END IF;
  RAISE NOTICE 'enum re-type: % fields', t;
END $$;
