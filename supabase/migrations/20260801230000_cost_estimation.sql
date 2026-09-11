-- Parametrische Kostenschätzung (Slice E2 — the CLIENT's build cost).
-- Additive only: cost_items (org unit-price catalog, ships EMPTY — prices grow
-- from real sources only, never invented; source + price_date NOT NULL),
-- cost_estimates (contingency structural: NOT NULL default 10), estimate
-- lines (frozen price copies), contractor_bids (E3 feedback loop).
-- STAGED — written, not applied.

CREATE TABLE IF NOT EXISTS cost_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  position         text NOT NULL,
  unit             text,
  price_low_eur    numeric,
  price_likely_eur numeric,
  price_high_eur   numeric,
  -- Provenance is NOT optional: a price without source + date cannot exist.
  source           text NOT NULL,
  price_date       date NOT NULL,
  din276_group     text,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  active           boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS cost_items_org_idx ON cost_items (org_id);

CREATE TABLE IF NOT EXISTS cost_estimates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  standard_code   text,
  title           text NOT NULL,
  -- Contingency is structural (default 10 %, app-bounded 5–15). It can never
  -- be NULL; below 5 % the app and the PDF render a warning.
  contingency_pct numeric NOT NULL DEFAULT 10,
  -- Approve-snapshot the quantities came from (version-lock; no FK to keep
  -- snapshot retention independent of estimates).
  snapshot_id     uuid,
  status          text NOT NULL DEFAULT 'draft',
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cost_estimates_project_idx ON cost_estimates (project_id);

CREATE TABLE IF NOT EXISTS cost_estimate_lines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id      uuid NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
  cost_item_id     uuid REFERENCES cost_items(id) ON DELETE SET NULL,
  position         text NOT NULL,
  quantity         numeric NOT NULL,
  unit             text,
  source_symbol    text,
  -- Frozen copy of the catalog prices at add time (the catalog moves on;
  -- an issued estimate must not drift underneath the client).
  price_low_eur    numeric NOT NULL,
  price_likely_eur numeric NOT NULL,
  price_high_eur   numeric NOT NULL,
  din276_group     text,
  order_index      integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS cost_estimate_lines_estimate_idx
  ON cost_estimate_lines (estimate_id);

CREATE TABLE IF NOT EXISTS contractor_bids (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id uuid REFERENCES cost_estimates(id) ON DELETE SET NULL,
  bidder      text NOT NULL,
  position    text,
  amount_eur  numeric NOT NULL,
  bid_date    date,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contractor_bids_project_idx ON contractor_bids (project_id);

ALTER TABLE cost_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_estimates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_estimate_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_bids     ENABLE ROW LEVEL SECURITY;

-- cost_items: org-scoped directly (the catalog belongs to the org, not to a
-- project). Mirrors the org-membership idiom of the offers migration
-- (source: supabase/migrations/20260801220000_offer_engine.sql).
DROP POLICY IF EXISTS "cost_items_all_org" ON cost_items;
CREATE POLICY "cost_items_all_org"
  ON cost_items FOR ALL TO authenticated
  USING (org_id IN (
    SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (org_id IN (
    SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
  ));

-- cost_estimates: org-scoped via project (mirrors offers RLS).
DROP POLICY IF EXISTS "cost_estimates_all_org" ON cost_estimates;
CREATE POLICY "cost_estimates_all_org"
  ON cost_estimates FOR ALL TO authenticated
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

-- Lines inherit the estimate's project scope (join through cost_estimates;
-- mirrors offer_positions RLS).
DROP POLICY IF EXISTS "cost_estimate_lines_all_org" ON cost_estimate_lines;
CREATE POLICY "cost_estimate_lines_all_org"
  ON cost_estimate_lines FOR ALL TO authenticated
  USING (estimate_id IN (
    SELECT e.id FROM cost_estimates e
    JOIN projects p ON p.id = e.project_id
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (estimate_id IN (
    SELECT e.id FROM cost_estimates e
    JOIN projects p ON p.id = e.project_id
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

-- contractor_bids: org-scoped via project (mirrors cost_estimates).
DROP POLICY IF EXISTS "contractor_bids_all_org" ON contractor_bids;
CREATE POLICY "contractor_bids_all_org"
  ON contractor_bids FOR ALL TO authenticated
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

-- Table-level grants for PostgREST roles (RLS governs rows; mirrors
-- supabase/migrations/20260520130000_grants.sql).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cost_items          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cost_items          TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cost_estimates      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cost_estimates      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cost_estimate_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cost_estimate_lines TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contractor_bids     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contractor_bids     TO service_role;
