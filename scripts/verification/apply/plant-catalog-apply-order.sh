#!/usr/bin/env bash
# Plant reference catalogue (2026-10-05) — schema, guideline seed, picker wiring. Owner-run; the session never applies migrations.
# PRECONDITION: the build with the catalog_pick column type must be live on prod (deployed by the session before this runner is used).
# Stops at the first failure. The Kircher rows are NOT part of this runner (licence pending; block kept outside git).
# Usage (from C:\Users\Ekowai\_wt-g2t):   bash scripts/verification/apply/plant-catalog-apply-order.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."
step() { echo; echo "=================== $1"; }

step "1 · schema plant_catalog (DDL, RLS read for authenticated)"
node scripts/apply-migration.mjs supabase/migrations/_STAGED_20261005180000_plant_catalog.sql

step "2 · guideline seed (30 Tab.-29 species + TP § 1 test species = 34 rows)"
node scripts/apply-migration.mjs scripts/migrations/20261005181000_plant_catalog_guideline_seed.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-plant-catalog.sql

step "3 · picker wiring (FLLNT-12 and FLL-GAR-24 species column → catalog_pick)"
node scripts/apply-migration.mjs scripts/migrations/20261005182000_plant_picker_wiring.sql
node scripts/verification/prod-query.mjs --sql "select w.code, f.symbol, (select c->>'type' from jsonb_array_elements(f.ui_config->'columns') c where c->>'key' = 'art') as art_type from fields f join worksheet_templates w on w.id = f.worksheet_template_id where f.symbol in ('plant_species_list','pflanzenarten')"

echo; echo "ALL APPLIED — tell the session: check the picker on FLLNT-12 (NT-B2) and FLL-GAR-24 (GAR-B4) in the browser."
