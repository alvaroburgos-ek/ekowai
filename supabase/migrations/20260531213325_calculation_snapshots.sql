-- Calculation snapshots: frozen captures of a worksheet instance's parameters,
-- equation outputs, and compliance verdicts taken at workflow transition points
-- (`submit_for_review`, `approve`). Supports the engineer-facing review-diff UI
-- (feat/calc-diff-viewer) — engineers approving a calculation need to see WHAT
-- changed since the last approved version, and recomputing from audit_log is
-- both lossy (audit_log captures field-level edits, not equation/compliance
-- verdicts) and fragile (re-running the engine on historical inputs requires
-- the worksheet template to be unchanged, which is not guaranteed).
--
-- Design decisions (see PR for full rationale):
--   * Additive only — no existing table is altered or dropped.
--   * `parameters`, `equation_outputs`, `compliance_results` are JSONB so the
--     shape can evolve without an enum migration; the diff utility tolerates
--     unknown keys (fields that existed in the old snapshot but not the new
--     one, e.g. because the worksheet template changed).
--   * `trigger` is a checked text (not pgEnum) for the same reason — easier to
--     add `manual` snapshots later without an enum-value migration.
--   * RLS mirrors `approval_events` / `project_parameters`: org-scoped via the
--     project. INSERT + SELECT only — snapshots are append-only; no UPDATE or
--     DELETE policy is declared, so the engineer's frozen record cannot be
--     altered after the fact.
--   * `equation_outputs` stores the three-state engine verdict (`kind`,
--     `value`, `formula`, `substituted`, `manualRequiredReason`) — the diff UI
--     surfaces `manual_required → computed` (or vice-versa) as a transition
--     state, NOT as "value changed from null to X".
--
-- Rollback (manual, only if a regression demands removing the table):
--   DROP TABLE IF EXISTS calculation_snapshots;

BEGIN;

CREATE TABLE IF NOT EXISTS calculation_snapshots (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_instance_id   uuid NOT NULL REFERENCES worksheet_instances(id) ON DELETE CASCADE,
  project_id              uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  taken_at                timestamptz NOT NULL DEFAULT now(),
  -- auth.users(id) — kept FK-less to match the project's existing pattern for
  -- user-author columns (e.g. approval_events.actor_id, audit_log.actor_id).
  taken_by_user_id        uuid,
  trigger                 text NOT NULL CHECK (trigger IN ('submit_for_review', 'approve', 'manual')),
  -- { [fieldId]: { type, value, unit, citationSources } } — exhaustive over
  -- every field on the worksheet (own + inherited) that has a stored value.
  parameters              jsonb NOT NULL,
  -- { [equationNumber]: { kind, value, formula, substituted, manualRequiredReason } }
  equation_outputs        jsonb NOT NULL,
  -- { [requirementId]: 'pass' | 'fail' | 'open' }
  -- 'open' covers both `pending` (missing inputs) and `manual` (unparseable
  -- condition) from the evaluator — flatten so the diff UI has a single
  -- "open" state to render.
  compliance_results      jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS calculation_snapshots_instance_taken_idx
  ON calculation_snapshots (worksheet_instance_id, taken_at DESC);

CREATE INDEX IF NOT EXISTS calculation_snapshots_project_taken_idx
  ON calculation_snapshots (project_id, taken_at DESC);

-- RLS: org-scoped via project. INSERT + SELECT only (append-only).
ALTER TABLE calculation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calculation_snapshots_insert_org"
  ON calculation_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "calculation_snapshots_select_org"
  ON calculation_snapshots FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Deliberately NO update / delete policies — snapshots are immutable.

COMMIT;
