#!/usr/bin/env bash
# FLL coverage wave — runs the apply order of vault 12_APPLY-ORDER-coverage-wave.md in one go (owner-run; the session's
# auto-mode classifier refuses this batch). Stops at the first failure. Each apply is one transaction; read-backs are read-only.
# Usage (from C:\Users\Ekowai\_wt-g2t):   bash scripts/verification/apply/fll-apply-order.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."
B="C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/fll-wizard-test/_baseline"
mkdir -p "$B"
step() { echo; echo "=================== $1"; }

step "0 · pre-apply snapshots (read-only)"
for s in FLL-Naturteich FLL-GAR-2023 FLL-TP-RHIZOM-2023; do
  node scripts/verification/dump-standard-encoding.mjs "$s" "$B/$(date +%F)_pre-apply_encoding_$s.json" | tail -1
done

step "1 · staged fixes from the walk (source-settled)"
node scripts/apply-migration.mjs scripts/verification/apply/hygiene-stray-enum-token-fields-2.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-hygiene-3.sql
node scripts/apply-migration.mjs scripts/verification/apply/fix-fllnt15-field-order.sql
node scripts/apply-migration.mjs scripts/verification/apply/fix-flltp-rhz-density-gates.sql
node scripts/apply-migration.mjs scripts/verification/apply/fix-fll-gar-gamma-a.sql
node scripts/apply-migration.mjs scripts/verification/apply/fix-fllnt-register-notes.sql

step "2 · additive blocks (new optional fields, tables, equations)"
node scripts/apply-migration.mjs scripts/migrations/20260929200000_fll_gar_2023_tables_coverage_block1.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-gar-tables-block1.sql
node scripts/apply-migration.mjs scripts/migrations/20260929210000_fll_gar_2023_fields_coverage_block2a.sql
node scripts/apply-migration.mjs scripts/migrations/20260929220000_fll_naturteich_fields_coverage_block3a.sql
node scripts/apply-migration.mjs scripts/migrations/20260929230000_fll_tp_rhizom_fields_coverage_block4a.sql
node scripts/apply-migration.mjs scripts/migrations/20260930100000_fll_gar_2023_widgets_coverage_block5a.sql

step "3 · gate blocks (your run ratifies the proposals as written in 12_APPLY-ORDER-coverage-wave.md)"
node scripts/apply-migration.mjs scripts/migrations/20260929210100_fll_gar_2023_gates_coverage_block2b.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-gar-coverage-block2.sql
node scripts/apply-migration.mjs scripts/migrations/20260929220100_fll_naturteich_gates_coverage_block3b.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-naturteich-coverage-block3.sql
node scripts/apply-migration.mjs scripts/migrations/20260929230100_fll_tp_rhizom_gates_coverage_block4b.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-tp-rhizom-coverage-block4.sql
node scripts/apply-migration.mjs scripts/migrations/20260930100100_fll_gar_2023_gates_coverage_block5b.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-gar-coverage-block5.sql

step "done — all FLL blocks applied"
