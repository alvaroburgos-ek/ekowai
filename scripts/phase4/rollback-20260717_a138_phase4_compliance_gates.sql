-- =============================================================================
-- WRITTEN-NOT-APPLIED
-- Rollback for: 20260717_a138_phase4_compliance_gates
-- Deletes the 3 block compliance gates added in the forward migration.
-- Safe to run multiple times (idempotent DELETE by code).
--
-- No delete-order concern: compliance_requirements has no inbound foreign key
-- from project_parameters (confirmed via information_schema FK query 2026-07-17).
-- compliance_deviations may reference compliance_requirements — if that FK
-- exists with ON DELETE RESTRICT, delete deviations first; check before applying.
-- =============================================================================

DELETE FROM compliance_requirements
WHERE code IN ('A138-REQ-31', 'A138-REQ-32', 'A138-REQ-33');
