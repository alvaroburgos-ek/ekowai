-- Rollback for _STAGED_20260724140000_fll_dead_gates_d2.sql
-- Only FIX 1 (FLLNT-03 REQ-07) writes; restore its original greedy-AND condition.
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
UPDATE compliance_requirements
SET condition = 'IF natural_pool_type IN {type_I, type_II} THEN regeneration_area_share > 50 AND IF natural_pool_type == type_III THEN regeneration_area_share > 30'
WHERE id = 'fabaa982-e703-4080-b596-1b19025bd23f';
