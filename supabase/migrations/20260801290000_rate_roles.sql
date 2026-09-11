-- Role-based rates (cost layer — multiple paid roles per org).
-- Replaces the single-org-rate assumption: each org may define paid roles
-- (Ingenieur, Freelancer, Praktikant, Coach, …) with their own hourly rate.
-- effort_entries and offer_positions gain an optional role_id; margin math
-- resolves position rate ?? orgs.internal_hourly_rate in the app.
-- Additive only. STAGED — written, not applied.

CREATE TABLE IF NOT EXISTS rate_roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            text NOT NULL,
  hourly_rate_eur numeric NOT NULL,
  -- Deactivated roles stay referenced by old rows but leave the pickers.
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_roles_org_name_unique UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS rate_roles_org_idx ON rate_roles (org_id);

-- Optional role link on both consumers (SET NULL keeps the rows when a role
-- is hard-deleted; normal path is active=false, which never breaks links).
ALTER TABLE effort_entries
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES rate_roles(id) ON DELETE SET NULL;
ALTER TABLE offer_positions
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES rate_roles(id) ON DELETE SET NULL;

ALTER TABLE rate_roles ENABLE ROW LEVEL SECURITY;

-- Read: any member of the owning org (mirrors the effort_entries org scoping,
-- org-direct instead of via project).
DROP POLICY IF EXISTS "rate_roles_select_org" ON rate_roles;
CREATE POLICY "rate_roles_select_org"
  ON rate_roles FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
  ));

-- Writes: org owner/admin only (mirrors how setOrgRates gates the org
-- calibration columns in src/lib/actions/offers.ts).
DROP POLICY IF EXISTS "rate_roles_insert_org_admin" ON rate_roles;
CREATE POLICY "rate_roles_insert_org_admin"
  ON rate_roles FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
  ));

DROP POLICY IF EXISTS "rate_roles_update_org_admin" ON rate_roles;
CREATE POLICY "rate_roles_update_org_admin"
  ON rate_roles FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
  ))
  WITH CHECK (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
  ));

DROP POLICY IF EXISTS "rate_roles_delete_org_admin" ON rate_roles;
CREATE POLICY "rate_roles_delete_org_admin"
  ON rate_roles FOR DELETE TO authenticated
  USING (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
  ));

-- Table-level grants for PostgREST roles (RLS governs rows; mirrors
-- supabase/migrations/20260520130000_grants.sql / effort_entries).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_roles TO service_role;
