-- ROLLBACK for _STAGED_20261014120000_project_scenarios.sql — drops the three case tables (all cases are lost;
-- the real record is untouched because no other table references them). STAGED — not applied.
DROP TABLE IF EXISTS public.project_scenario_overrides;
DROP TABLE IF EXISTS public.project_scenarios;
DROP TABLE IF EXISTS public.project_scenario_settings;
