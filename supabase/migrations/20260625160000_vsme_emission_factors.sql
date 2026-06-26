-- VSME: add emission_factors reference table
-- Versioned UBA emission factors consumed by the CO₂ engine (Plan 3).
-- Read-only after seeding (Plan 2). UNIQUE(uba_id, source_version) prevents
-- accidental duplicate imports of the same UBA dataset version.

CREATE TABLE IF NOT EXISTS emission_factors (
  id              uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uba_id          text          NOT NULL,
  scope           text          NOT NULL,
  category        text          NOT NULL,
  subcategory     text,
  unit            text          NOT NULL,
  kg_co2e         numeric       NOT NULL,
  kg_co2          numeric,
  kg_ch4          numeric,
  kg_n2o          numeric,
  source          text          NOT NULL DEFAULT 'UBA',
  source_version  text          NOT NULL,
  dataset_year    integer       NOT NULL,
  sheet           text
);

ALTER TABLE emission_factors
  ADD CONSTRAINT emission_factors_uba_id_version_unique
  UNIQUE (uba_id, source_version);
