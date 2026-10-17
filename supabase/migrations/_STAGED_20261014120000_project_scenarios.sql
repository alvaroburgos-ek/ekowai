-- What-if cases („Fälle") — Phase A1 (spec docs/superpowers/specs/2026-10-14-what-if-cases-design.md).
-- Additive only: three NEW tables; no existing table is altered. Safe to apply before or after the code deploy —
-- the code treats a missing table (42P01) as "Fälle nicht eingerichtet".
-- RLS mirrors project_parameters (supabase/migrations/20260626193000_access_control_foundation.sql):
-- org members read, owner/admin/engineer write. The app's `db` (postgres role) bypasses RLS; the server actions
-- check resolveProjectAccess (internal) like saveWorksheet does.
-- STAGED — not applied (the _STAGED_ prefix keeps `supabase db push` / drizzle away from it; rename on the owner's go).
-- Apply: node scripts/apply-migration.mjs supabase/migrations/_STAGED_20261014120000_project_scenarios.sql
-- Rollback: supabase/migrations/_STAGED_rollback-20261014120000_project_scenarios.sql
CREATE TABLE IF NOT EXISTS public.project_scenarios (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name              text NOT NULL,
  reason            text,
  sort_order        integer NOT NULL,
  include_in_report boolean NOT NULL DEFAULT false,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  archived_at       timestamptz,
  CONSTRAINT project_scenarios_slot_range CHECK (sort_order BETWEEN 1 AND 6)
);
CREATE INDEX IF NOT EXISTS project_scenarios_project_idx ON public.project_scenarios (project_id);
-- At most one ACTIVE case per slot ⇒ with the slot range at most 6 active cases (race-safe).
CREATE UNIQUE INDEX IF NOT EXISTS project_scenarios_active_slot_unique
  ON public.project_scenarios (project_id, sort_order) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_scenario_overrides (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id            uuid NOT NULL REFERENCES public.project_scenarios(id) ON DELETE CASCADE,
  field_id               uuid NOT NULL REFERENCES public.fields(id),
  value                  jsonb NOT NULL,
  base_value_at_creation jsonb,
  note                   text NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_scenario_overrides_scenario_field_unique UNIQUE (scenario_id, field_id)
);

CREATE TABLE IF NOT EXISTS public.project_scenario_settings (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  enabled    boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_scenario_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_scenario_settings ENABLE ROW LEVEL SECURITY;

-- project_scenarios + project_scenario_settings: same four policies as project_parameters.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_scenarios','project_scenario_settings']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select_internal', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete_engineer', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR SELECT TO authenticated
      USING (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid()))
    $f$, t || '_select_internal', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR INSERT TO authenticated
      WITH CHECK (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
    $f$, t || '_insert_engineer', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR UPDATE TO authenticated
      USING (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
      WITH CHECK (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
    $f$, t || '_update_engineer', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR DELETE TO authenticated
      USING (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
    $f$, t || '_delete_engineer', t);
  END LOOP;
END $$;

-- project_scenario_overrides: scoped through its case's project.
DROP POLICY IF EXISTS project_scenario_overrides_select_internal ON public.project_scenario_overrides;
CREATE POLICY project_scenario_overrides_select_internal ON public.project_scenario_overrides FOR SELECT TO authenticated
  USING (scenario_id IN (
    SELECT s.id FROM project_scenarios s JOIN projects p ON p.id = s.project_id
    JOIN org_members om ON om.org_id = p.org_id WHERE om.user_id = auth.uid()));
DROP POLICY IF EXISTS project_scenario_overrides_write_engineer ON public.project_scenario_overrides;
CREATE POLICY project_scenario_overrides_write_engineer ON public.project_scenario_overrides FOR ALL TO authenticated
  USING (scenario_id IN (
    SELECT s.id FROM project_scenarios s JOIN projects p ON p.id = s.project_id
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
  WITH CHECK (scenario_id IN (
    SELECT s.id FROM project_scenarios s JOIN projects p ON p.id = s.project_id
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenarios TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenario_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenario_overrides TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenario_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_scenario_settings TO service_role;
