-- Maintenance schedules (library-level — verbatim maintenance duties per
-- standard). Standard-scoped reference data like standards/fields, NOT
-- project-scoped: each row is one maintenance/inspection duty a guideline
-- prescribes, with the VERBATIM printed interval wording (SR-1 quote + page
-- in source_quote). The table ships EMPTY — rows are seeded exclusively by
-- the extraction pack from the standard's own text, never by hand. Projects
-- inherit duties via their attached standards; due-state is computed
-- app-side against the Monitoring-Journal (src/lib/monitoring/schedule.ts).
-- Additive only — no existing table is touched.
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id      uuid NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
  -- Short duty title, e.g. "Sichtkontrolle der Mulde".
  title            text NOT NULL,
  -- Same six-value vocabulary as monitoring_entries.category:
  -- 'laborbericht' | 'messung' | 'begehung' | 'wartung' | 'foto' |
  -- 'sonstiges' — validated app-side (src/lib/actions/monitoring-core.ts).
  category         text NOT NULL,
  -- VERBATIM printed interval wording, e.g. "halbjährlich".
  interval_text    text NOT NULL,
  -- Numeric interpretation of interval_text in months; NULL when the source
  -- prints no fixed number (e.g. "bei Bedarf").
  interval_months  numeric,
  -- Clause/table the duty comes from, e.g. "Abschn. 6.2".
  clause_reference text,
  -- SR-1: verbatim quote from the standard's own text + page ref.
  source_quote     text NOT NULL,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_schedules_standard_idx
  ON maintenance_schedules (standard_id);

ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Library reference data (like standards/emission_factors): authenticated
-- users may read; writes are service-role only (the extraction pack). No
-- INSERT/UPDATE/DELETE policy is created, so client writes are denied.
-- (Mirrors supabase/migrations/20260625161000_vsme_emission_factors_rls.sql.)
DROP POLICY IF EXISTS "maintenance_schedules_read_authenticated" ON maintenance_schedules;
CREATE POLICY "maintenance_schedules_read_authenticated"
  ON maintenance_schedules FOR SELECT TO authenticated USING (true);

-- Table-level grants for PostgREST roles (RLS governs rows; mirrors
-- supabase/migrations/20260520130000_grants.sql). authenticated gets SELECT
-- only — the write path is the service-role extraction pack.
GRANT SELECT ON TABLE public.maintenance_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.maintenance_schedules TO service_role;
