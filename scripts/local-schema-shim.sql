-- LOCAL DEV ONLY — additive shim that reconciles the local prod-mirror DB to
-- the VSME branch's src/lib/db/schema.ts for app-shell tables. The local DB
-- was restored from a prod dump that predates several schema.ts columns/tables;
-- the app issues full-table `select()`s that fail on any missing column.
--
-- Purely additive (ADD COLUMN / CREATE TABLE, all IF NOT EXISTS) — no drops.
-- Idempotent. NEVER run against prod — prod reconciliation is a separate,
-- human-gated step.
--
--   docker exec -i supabase_db_ekowai-wizard \
--     psql postgresql://postgres:postgres@127.0.0.1:5432/postgres < scripts/local-schema-shim.sql

-- projects: columns added since the prod dump
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- org_members: schema.ts uses joined_at (prod-mirror only had created_at)
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();

-- report_archives: prod-mirror is a legacy shape (file_url/project_id/report_type);
-- schema.ts expects calculation_id/org_id/file_path/sha256/generated_at/generated_by
ALTER TABLE report_archives ADD COLUMN IF NOT EXISTS calculation_id uuid;
ALTER TABLE report_archives ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id);
ALTER TABLE report_archives ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE report_archives ADD COLUMN IF NOT EXISTS sha256 text;
ALTER TABLE report_archives ADD COLUMN IF NOT EXISTS generated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE report_archives ADD COLUMN IF NOT EXISTS generated_by uuid REFERENCES profiles(id);

-- leads: not present in the prod dump at all (landing-page lead capture)
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  phone text,
  topic text NOT NULL,
  message text,
  locale text NOT NULL DEFAULT 'de',
  standard_code text,
  source text NOT NULL DEFAULT 'landing',
  source_path text,
  status text NOT NULL DEFAULT 'new',
  claimed_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  converted_to_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS leads_status_created_idx ON leads(status, created_at);

-- compliance_suggestions: not present in the prod dump
CREATE TABLE IF NOT EXISTS compliance_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES compliance_requirements(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL,
  target_standard_code text,
  target_worksheet_code text,
  suggestion_de text NOT NULL,
  suggestion_en text,
  condition text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
