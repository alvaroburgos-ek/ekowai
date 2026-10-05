-- Plant reference catalogue (non-normative reference layer) — 2026-10-05.
-- Species picker behind the FLL plant registers (FLLNT-12 plant_species_list, FLL-GAR-24 pflanzenarten).
-- Every row carries its provenance (source_kind / source_ref / licence_status). The catalogue never changes a gate,
-- never fills an FLL field by itself; the picker writes only the scientific name into the register's own text cell.
-- Reference-book rows (Kircher) stay licence_status = 'pending' and are invisible to the API until the owner clears them.
-- Drizzle model: src/lib/db/schema.ts `plantCatalog`.
-- RLS mirrors the other reference tables (regulation_tables, emission_factors): read for authenticated, writes only service role.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs supabase/migrations/20261005180000_plant_catalog.sql
-- Rollback: supabase/migrations/rollback-20261005180000_plant_catalog.sql
-- Read-back: node scripts/verification/prod-query.mjs scripts/verification/apply/readback-plant-catalog.sql
CREATE TABLE IF NOT EXISTS plant_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scientific_name text NOT NULL,
  common_name_de text,
  common_name_en text,
  plant_group text NOT NULL DEFAULT 'other'
    CHECK (plant_group IN ('submerged','floating_leaved','marsh_small','marsh_medium_high','bank_terrestrial','other')),
  depth_zone_code text,
  depth_min_cm integer,
  depth_max_cm integer,
  light text NOT NULL DEFAULT 'unknown' CHECK (light IN ('sun','partial','shade','unknown')),
  height_cm integer,
  bloom text,
  hardiness_zones text,
  water_hardness text,
  nitrogen_demand text,
  origin_regions text,
  planting_codes text[],
  notes text,
  aggressive_rhizome boolean NOT NULL DEFAULT false,
  aggressive_source text,
  source_kind text NOT NULL CHECK (source_kind IN ('guideline','reference_book')),
  source_ref text NOT NULL,
  licence_status text NOT NULL DEFAULT 'pending' CHECK (licence_status IN ('guideline','cleared','pending')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plant_catalog_name_source_unique UNIQUE (scientific_name, source_kind),
  CONSTRAINT plant_catalog_depth_order CHECK (depth_min_cm IS NULL OR depth_max_cm IS NULL OR depth_min_cm <= depth_max_cm)
);
CREATE INDEX IF NOT EXISTS plant_catalog_group_idx ON plant_catalog (plant_group);
CREATE INDEX IF NOT EXISTS plant_catalog_name_idx ON plant_catalog (lower(scientific_name));

ALTER TABLE plant_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plant_catalog_read_authenticated ON plant_catalog;
CREATE POLICY plant_catalog_read_authenticated ON plant_catalog FOR SELECT TO authenticated USING (true);
-- No INSERT/UPDATE/DELETE policies: only the service role / table owner writes (seeds via apply-migration.mjs).
