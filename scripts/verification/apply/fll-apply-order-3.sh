#!/usr/bin/env bash
# FLL follow-up hint blocks after the re-drive of 2026-10-05 (owner-run; the session never applies migrations). Stops at the first failure.
#   173000 — Naturteich REQ-10 hint on its new sheet FLLNT-04
#   173100 — TP exemption-route items (4 fields, 2 warn gates) + REQ-RHZ21-CONFORMITY title naming both routes
#   173200 — FLL-GAR-03 permit-gate hints (demand an answer, not a Yes)
# Usage (from C:\Users\Ekowai\_wt-g2t):   bash scripts/verification/apply/fll-apply-order-3.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."
step() { echo; echo "=================== $1"; }

step "1 · Naturteich follow-up"
node scripts/apply-migration.mjs scripts/migrations/20261005173000_fll_naturteich_followup_hints.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll_naturteich_followup-hints-20261005.sql   # gates 42 / 42 bilingual

step "2 · TP follow-up"
node scripts/apply-migration.mjs scripts/migrations/20261005173100_fll_tp_rhizom_followup_hints.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll_tp_rhizom_followup-hints-20261005.sql    # fields 170 / 170, gates 30 / 30

step "3 · GAR follow-up"
node scripts/apply-migration.mjs scripts/migrations/20261005173200_fll_gar_followup_hints.sql
node scripts/verification/prod-query.mjs scripts/verification/apply/readback-fll_gar_followup-hints-20261005.sql          # fields 292, gates 44 bilingual

echo; echo "ALL APPLIED."
