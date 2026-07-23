-- =============================================================================
-- 20260723_r3_req30_all_gates_warn — RATIFIED R3 (A138-28 REQ-30)
-- =============================================================================
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
--
-- User ratification (2026-07-23): REQ-30 on A138-28 is the final overall
-- compliance gate. Source basis: the standard RECOMMENDS ("wird empfohlen")
-- that all phase gates be satisfied → WARN, not BLOCK. The condition is
-- upgraded from a bare "final_compliance_verdict IS NOT NULL" to the explicit
-- all-gates conjunction so the recommendation is meaningful.
--
--   severity : block -> warn
--   condition: final_compliance_verdict IS NOT NULL
--              -> phase_2_gate_result IN {PASS, CONDITIONAL}
--                 AND phase_3_gate_result IN {PASS, CONDITIONAL}
--                 AND phase_4_gate_result IN {PASS, CONDITIONAL}
--                 AND final_compliance_verdict IS NOT NULL
--
-- Grammar note: evaluate.ts supports AND-conjunction of IN {…} clauses plus a
-- trailing IS NOT NULL predicate (brace-style IN verified live on REQ-19).
--
-- SCOPING: matched on (worksheet A138-28 + code A138-REQ-30 + standard
-- DWA-A-138-1) so no other row is touched. Idempotent (re-run is a no-op once
-- the target values are set). audit_status is NOT modified.
-- Rollback: rollback-20260723_r3_req30_all_gates_warn.sql
-- =============================================================================
UPDATE compliance_requirements cr
SET severity  = 'warn',
    condition = 'phase_2_gate_result IN {PASS, CONDITIONAL} AND phase_3_gate_result IN {PASS, CONDITIONAL} AND phase_4_gate_result IN {PASS, CONDITIONAL} AND final_compliance_verdict IS NOT NULL'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'DWA-A-138-1'
WHERE cr.worksheet_template_id = wt.id
  AND wt.code = 'A138-28'
  AND cr.code = 'A138-REQ-30';
