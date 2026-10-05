#!/usr/bin/env bash
# FLL readiness + guideline re-read + hint wave (2026-10-05) — runs the nine staged blocks in the right order (owner-run; the
# session never applies migrations). Stops at the first failure. Each apply is one transaction; read-backs are read-only.
# Vault notes: 18 (TP conditional), 19 (NT readiness), 20 (GAR readiness), 21 (guideline rulings), 23 (hint blocks).
# Usage (from C:\Users\Ekowai\_wt-g2t):   bash scripts/verification/apply/fll-apply-order-2.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."
B="C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/fll-wizard-test/_baseline"
mkdir -p "$B"
step() { echo; echo "=================== $1"; }

step "0 · pre-apply snapshots (read-only)"
for s in FLL-Naturteich FLL-GAR-2023 FLL-TP-RHIZOM-2023; do
  node scripts/verification/dump-standard-encoding.mjs "$s" "$B/$(date +%F)_pre-apply-2_encoding_$s.json" | tail -1
done

step "1 · readiness-run fixes (notes 18, 19, 20)"
node scripts/apply-migration.mjs scripts/migrations/20261005120000_fll_tp_rhizom_conditional_fields.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-tp-conditional-20261005.sql
node scripts/apply-migration.mjs scripts/migrations/20261005130000_fll_naturteich_readiness_fixes.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-naturteich-readiness-20261005.sql
node scripts/apply-migration.mjs scripts/migrations/20261005140000_fll_gar_readiness_fixes.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-gar-readiness-20261005.sql

step "2 · guideline-settled blocks (note 21)"
node scripts/apply-migration.mjs scripts/migrations/20261005150000_fll_naturteich_tab1_operator.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-naturteich-tab1-20261005.sql
node scripts/apply-migration.mjs scripts/migrations/20261005150000_fll_gar_anhang2_and_edge_fields.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-gar-anhang2-20261005.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-tp-exemption-20261005.sql
node scripts/apply-migration.mjs scripts/migrations/20261005160000_fll_tp_rhizom_exemption_route.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll-tp-exemption-20261005.sql

step "3 · hint blocks (note 23; GAR after 140000)"
node scripts/apply-migration.mjs scripts/migrations/20261005170000_fll_tp_rhizom_hints.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll_tp_rhizom-hints-20261005.sql
node scripts/apply-migration.mjs scripts/migrations/20261005171000_fll_naturteich_hints.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll_naturteich-hints-20261005.sql
node scripts/apply-migration.mjs scripts/migrations/20261005172000_fll_gar_hints.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll_gar-hints-20261005.sql

echo; echo "ALL APPLIED — tell the session: re-drive the affected FLL cases (notes 19–23)."
