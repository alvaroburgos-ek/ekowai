-- VSME: add human-readable commodity name to emission_factors
-- Enables the "select a commodity (Diesel, Erdgas, Netzstrom…) → factor
-- auto-fills" picker UX. The UBA list keys factors only by code + a generic
-- Level-2 subcategory; the actual commodity label lives in the deeper UBA
-- "Level N" columns (or "Industrielle Bezeichnung" for refrigerants). This
-- column captures it. German-only (the UBA source has no English names).
--
-- Additive + idempotent: nullable column, no backfill required at DDL time —
-- the importer re-populates it on the next (idempotent) UPSERT.

ALTER TABLE emission_factors
  ADD COLUMN IF NOT EXISTS name text;
