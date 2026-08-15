-- Angebots-Engine (Slice E1 — margin-first, internal-only).
-- Additive only: two calibration columns on orgs (mirroring the letterhead
-- columns) + offers/offer_positions. Margin is computed in the app and never
-- persisted; the client-facing PDF shows positions + Festpreis only.
-- STAGED — written, not applied.

-- Org-level calibration (nullable → margin verdict is "amber" until set).
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS internal_hourly_rate numeric;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS target_margin_pct    numeric;

CREATE TABLE IF NOT EXISTS offers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            text NOT NULL,
  status           text NOT NULL DEFAULT 'draft',
  festpreis_eur    numeric NOT NULL,
  valid_until      date,
  bearbeitungszeit text,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offers_project_idx ON offers (project_id);

CREATE TABLE IF NOT EXISTS offer_positions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id          uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  position          text NOT NULL,
  estimated_hours   numeric NOT NULL,
  external_cost_eur numeric NOT NULL DEFAULT 0,
  order_index       integer NOT NULL DEFAULT 0,
  note              text
);

CREATE INDEX IF NOT EXISTS offer_positions_offer_idx ON offer_positions (offer_id);

ALTER TABLE offers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_positions ENABLE ROW LEVEL SECURITY;

-- Org-scoped via project; mirrors effort_entries RLS
-- (source: supabase/migrations/20260801200000_effort_entries.sql).
DROP POLICY IF EXISTS "offers_all_org" ON offers;
CREATE POLICY "offers_all_org"
  ON offers FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

-- Positions inherit the offer's project scope (join through offers).
DROP POLICY IF EXISTS "offer_positions_all_org" ON offer_positions;
CREATE POLICY "offer_positions_all_org"
  ON offer_positions FOR ALL TO authenticated
  USING (offer_id IN (
    SELECT o.id FROM offers o
    JOIN projects p ON p.id = o.project_id
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (offer_id IN (
    SELECT o.id FROM offers o
    JOIN projects p ON p.id = o.project_id
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

-- Table-level grants for PostgREST roles (RLS governs rows; mirrors
-- supabase/migrations/20260520130000_grants.sql).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offers          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offers          TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offer_positions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offer_positions TO service_role;
