# STEP 1 milestone — D-1 corrected + D-2/D-3/D-4 + VC→VA closure (FLL)

Program: the reasoning-map infrastructure run. STEP 0 (doctrine as files) shipped to main
(`e336926`, `c58588b` SR-4). STEP 1 executed strictly sequentially, one subagent per task,
orchestrator-verified each. Branch `feat/fll-revision`. Prod read-only except the one authorized apply.

## Task ledger (all verified independently by the orchestrator)
- **1a diagnostic** (`fll-d1-diagnostic.md`) — OVERTURNED the brief's premise: `project_parameters` is
  key-value (confirmed by orchestrator via information_schema) → **missing-column class structurally
  impossible**; no finding "F-8", no "51 worksheets", no 500s (browser save skips unknown field_id,
  returns ok). Real defect = harness seeder fixture-drift.
- **1b re-run** (`fll-d1-rerun.md`, commit `4304e31`) — seeder→prod parity (FLLNT-10 15→17 etc.),
  gate-symbol parse closed (`missing-column=0` proven), un-runnable chains → VA. Orchestrator re-ran
  the VA test: **7/7 GREEN**.
- **1c D-2/D-3/D-4** (`fll-d2-d3-d4.md`, commit `40cd1b2`) — premises confirmed. APPLIED (authorized):
  two `block` CRs on prod — `REQ-RHZ18-VERDICT`, `REQ-RHZ21-CONFORMITY` (orchestrator confirmed both
  live, severity=block, verbatim TP-Rhizom quote). Highest-severity FLL enforcement gap closed.
- **1d VC→VA + DS lift** (`fll-d1-va-closure.md`, commit `3f9ca0f`) — GAR-17/FLLNT-06/12/13 → VA;
  DS ceiling LIFTED (FLLNT-10 EQ-01 50×, FLLNT-11 EQ-05 150 l/m²) — orchestrator confirmed both
  phrases exist verbatim in the 2017 PDF.

## Final FLL state: **VA 47 / VC 18 / NR 1** (65 worksheets, 100% visited)
- NR (1): **GAR-22 Eq 2b** — `cos β`, trig-blocked, engine unfixed per doctrine. (+ GAR-22 Anhang-2
  informative-normativity ceiling.)
- VC (18): all `R-noeq` data-collection/attestation/terminal sheets — no printed number to assert VA
  against (correct by nature, not a gap).

## SHIPPED to prod (1 authorized apply)
`REQ-RHZ18-VERDICT` + `REQ-RHZ21-CONFORMITY` block gates (both worksheets previously saved
non-conforming verdicts UNBLOCKED). HTTP 201, read-back live, audit_status untouched.

## ALVARO'S RATIFICATION BATCH (staged written-not-applied, per standard)
- **GAR:** GAR-10 nine phantom-field gates (`abdichtungs_art` non-existent) — ruling; GAR-01,
  GAR-22/REQ-23, GAR-12, GAR-13 dead-gate rulings (need own PDF quote + block/warn); **GAR-23 freibord**
  30/15/5 cm + **GAR-07 slope** Tab.1 → SR-2 range→selection enums; GAR-17 §9.9→§6.3 clause-ref
  mismatch finding + `N/mm²` no-source-value.
- **Naturteich:** FLLNT-03 REQ-07 greedy-AND vacuous-PASS fix (mechanical, parenthesization);
  FLLNT-10 EQ-01 / FLLNT-11 EQ-05 modal-verb ("should"/"approximate") **block-vs-warn ruling**.
- **TP-Rhizom:** RHZ-07 twelve §5.9 Tab.2 block CRs (ES-1, each verbatim-quoted); RHZ-02, RHZ-05,
  RHZ-16/REQ-18, RHZ-19 dead-gate rulings.
- **Cross-cutting:** `section_id=NULL` prod quirk (broad — GAR/RHZ/FLLNT) AND overlapping phantom
  enum rows (`type_III`, `emersed`, `submergent`, `vertical_*` — must be **DELETED**, not sectioned);
  PDF page-number convention (printed vs physical) to standardize in the map.

## Residue (honest): cos_beta GAR-22 2b (engine, parked); GAR-22 Anhang informative-normativity.
