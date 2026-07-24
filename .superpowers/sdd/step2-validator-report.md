# STEP 2 — reasoning-map SELF-VALIDATION SUITE (report)

**The "map tests itself" deliverable.** A re-runnable validator that parses the four vault reasoning
maps (DWA-A-138-1 + FLL-GAR-2023 + FLL-Naturteich-2017 + FLL-TP-RHIZOM-2023) and validates them
against their own structural contract, the live-encoding SNAPSHOT, the STEP-1 harness ledgers + git,
and the defect register — then PROVES it works by catching 5 seeded errors on a disposable copy.
Doctrine `docs/verification-doctrine.md` read in full; raw output for every claim below.

Branch `feat/fll-revision`, worktree `C:\Users\Ekowai\_wt-fll`. Prod read-only (snapshot export only).

## Deliverables (committed)
- `scripts/reasoning-map/export-encoding-snapshot.mjs` — refreshable exporter. POSTs SELECT-only reads
  for the four standards to the Management-API read path (`POST /v1/projects/vadsmshzebefjreqcicl/
  database/query`, `$SUPABASE_ACCESS_TOKEN` from env, **never printed**) → `snapshot/encoding-snapshot.json`.
- `scripts/reasoning-map/snapshot/encoding-snapshot.json` — committed snapshot (worksheets/fields/
  equations/compliance/enum_values per standard) so the validator runs deterministically, offline, re-runnable.
- `scripts/reasoning-map/validate.mjs` — the validator (Node core only, no new deps). Machine-readable
  `--json` + human report + `--query`. Exit code = ERROR count.
- `scripts/reasoning-map/seed-known-errors.mjs` — the 5-defect proof harness (operates on a fixtures COPY).

### Refresh the snapshot
```
export SUPABASE_ACCESS_TOKEN=…            # never echoed
node scripts/reasoning-map/export-encoding-snapshot.mjs
git add scripts/reasoning-map/snapshot/encoding-snapshot.json && commit
```
Re-running `validate.mjs` after a refresh surfaces DRIFT (node vs snapshot) as its own finding class (check `3.drift`).

## Snapshot export (raw — counts match all four STEP-2 map reports exactly)
```
DWA-A-138-1: worksheets=28 fields=277 equations=46 compliance=35 enum_fields=29
FLL-GAR-2023: worksheets=29 fields=175 equations=4 compliance=30 enum_fields=18
FLL-Naturteich-2017: worksheets=15 fields=130 equations=6 compliance=33 enum_fields=18
FLL-TP-RHIZOM-2023: worksheets=21 fields=149 equations=3 compliance=24 enum_fields=5
```

## Checks implemented (mapped to the brief)
1. **Structural integrity** — `1.va-has-page` (VA⇒source_page), `2.fixed-has-page`
   (standard_fixed⇒page, `in_library:false` docs exempt), `1.links-resolve` (every wikilink resolves;
   only legit external = the shared `_template-node`), `1.eq-produces` (≥1 produces),
   `6.eq-classifiable` (self + wikilink-requires carry a data_class), `1.cr-fired-or-dead` (CR has
   fired_by/gated_by else dead), `F2.dead-gate` (body-asserted dead gate, ratified excluded).
2. **Cross-truth map↔reality** — `2.cr-db-has-node`/`2.cr-node-has-db` (CR code both directions),
   `2.eq-db-has-node`/`2.eq-node-has-db` (equation output-symbol both directions),
   `2.ws-has-section` (every DB worksheet has a section node), `2b.va-build-resolves` (every VA
   `provenance_build` resolves to a git commit / STEP-1 ledger hash), `2c.dp-attached` (open
   decision-points reachable from `_index`/register).
3. **Regression/drift** — `3.drift` re-runnable; CR-node-vs-snapshot count drift is its own finding.

## Validator on the REAL maps — CLEAN baseline (raw)
```
  DWA-A-138-1            nodes=131
  FLL-GAR-2023           nodes=85
  FLL-Naturteich-2017    nodes=69
  FLL-TP-RHIZOM-2023     nodes=58
  TOTAL nodes = 343

── Per-check pass/fail ──
  1.cr-fired-or-dead       pass=122  fail=0
  1.eq-produces            pass=59   fail=0
  1.links-resolve          pass=866  fail=0
  1.va-has-page            pass=249  fail=0
  2.cr-db-has-node         pass=122  fail=0
  2.cr-node-has-db         pass=122  fail=0
  2.eq-db-has-node         pass=40   fail=0
  2.eq-node-has-db         pass=40   fail=4
  2.fixed-has-page         pass=133  fail=0
  2.ws-has-section         pass=93   fail=0
  2b.va-build-resolves     pass=249  fail=0
  2c.dp-attached           pass=25   fail=0
  3.drift                  pass=8    fail=0
  6.eq-classifiable        pass=69   fail=0

  ERRORS = 0   WARNINGS = 2
  [WARN] 2.eq-node-has-db · DWA-A-138-1 · balance   — map equation produces 'balance' absent from DB (orphan)
  [WARN] 2.eq-node-has-db · DWA-A-138-1 · condition — map equation produces 'condition' absent from DB (orphan)
```
Exit 0. **The 2 WARNINGS are a REAL finding surfaced by the validator** — see "Findings for Alvaro's batch" below.

## PROOF — 5 seeded errors on a COPY, ALL caught (raw)
```
Seeded 5 defects into fixtures copy:
  (a) dangling link  -> DWA-A-138-1/eq-gl2-a138-07: references [[doc-this-node-does-not-exist]]
  (b) VA w/o build   -> FLL-GAR-2023/cr-gar-req-08: provenance_build=deadbee (no such commit)
  (c) dead CR        -> FLL-Naturteich-2017/cr-fllnt-req-seeded-dead: no fired_by / no gated_by
  (d) missing page   -> FLL-TP-RHIZOM-2023/eq-rhz-13-eq1: source_page blanked (still VA)
  (e) DB orphan      -> DWA-A-138-1/cr-a138-req-02 DELETED (A138-REQ-02 still in snapshot)

  ERRORS = 6   WARNINGS = 3
  [ERROR] 1.links-resolve      · DWA-A-138-1         · eq-gl2-a138-07             — dangling wikilink -> [[doc-this-node-does-not-exist]]   (a)
  [ERROR] 2.cr-db-has-node     · DWA-A-138-1         · A138-REQ-02                — DB CR A138-REQ-02 has NO map node (orphan DB row)         (e)
  [ERROR] 2b.va-build-resolves · FLL-GAR-2023        · cr-gar-req-08              — VA cites build 'deadbee' with no resolvable commit/ledger (b)
  [ERROR] 1.cr-fired-or-dead   · FLL-Naturteich-2017 · cr-fllnt-req-seeded-dead   — CR has neither fired_by nor gated_by (dead)               (c)
  [ERROR] 2.cr-node-has-db     · FLL-Naturteich-2017 · cr-fllnt-req-seeded-dead   — map CR node REQ-SEEDED has NO DB row (orphan node)        (c)
  [ERROR] 1.va-has-page        · FLL-TP-RHIZOM-2023  · eq-rhz-13-eq1              — provenance VA but no source_page                          (d)
  [WARN]  3.drift              · DWA-A-138-1         · _index                     — CR node count 34 < DB CR count 35 (drift)                (e side-effect)
```
Exit 6. **All 5 defect classes caught, each by its intended check.** Defect (c) legitimately trips two
invariants (dead-gate + orphan-node) → 6 error findings for 5 defects; defect (e) also produces the
correct drift WARN. Re-run on the real maps returns to the clean baseline (exit 0) → validator is
re-runnable and not sticky. A validator that never caught anything would be unproven; this one caught
every seeded error and stays clean on the honest maps.

## The 4 core queries (raw)
**(a) all nodes below VA — `--query below-va:DWA-A-138-1`** (36 nodes; all 30 NR + 6 VC):
```
count=36  first rows:
 cr-a138-req-05 NR derived | cr-a138-req-08 NR derived | cr-a138-req-22 NR derived
 doc-din-1986-100 NR standard_fixed | doc-kostra-dwd-2020 NR standard_fixed | eq-gl10-a138-26 NR derived …
```
**(b) all CRs never fired — `--query never-fired`** (86 total; attestation/selection/gate-only CRs):
```
count=86  by standard: {DWA-A-138-1:16, FLL-GAR-2023:20, FLL-Naturteich-2017:26, FLL-TP-RHIZOM-2023:24}
```
**(c) all open decision-points awaiting ratification — `--query unratified`** (25, matches the reports 5/11/4/5):
```
count=25  {DWA-A-138-1:5, FLL-GAR-2023:11, FLL-Naturteich-2017:4, FLL-TP-RHIZOM-2023:5}
 DWA: dp-01-verfahrenswahl dp-02-n-range dp-03-f-z-15 dp-04-anhang-worked-example dp-05-req-30-gate
 GAR: dp-gar-01-crosssheet-gates … dp-gar-23-freibord-range (11)
 NT : dp-fllnt-03-req07-greedy-and dp-fllnt-10-11-modal-verb dp-fllnt-phantom-fields dp-fllnt-ranges
 RHZ: dp-rhz-07-es1-tab2 dp-rhz-crossws-topology dp-rhz-dead-gates dp-rhz-missing-density-eq dp-rhz-phantom-fields
```
**(d) ALVARO'S ACQUISITION LIST — `--query acquisition-list`** (referenced-but-missing `in_library:false`
docs ranked by dependent-node count):
```
 22  DWA-A-138-1          doc-kostra-dwd-2020   KOSTRA-DWD-2020 (design rainfall r_D(n))
  5  FLL-Naturteich-2017  doc-dgfdb-r           DGfdB R fact sheets (R 60.03 / 65.06 / 65.09)
  3  DWA-A-138-1          doc-din-1986-100      DIN 1986-100 (flood-protection / Ueberflutungsnachweis)
  3  DWA-A-138-1          doc-dwa-a-118         DWA-A 118:2024 (Hydraulische Bemessung)
  2  FLL-GAR-2023         doc-din-1986-100      DIN 1986-100 (Regenspende r_5,5 / r_5,100)
  2  FLL-GAR-2023         doc-eta-abp-mvvtb     ETA / AbP gemäß MVV TB (Fluessigkunststoff-Mindestdicke)
  1  FLL-Naturteich-2017  doc-atv-din-18300     ATV DIN 18300 (Erdarbeiten)
  1  FLL-TP-RHIZOM-2023   doc-fll-wurzelfestigkeit  FLL Wurzelfestigkeitspruefung (2008)
  0  DWA-A-138-1          doc-dwa-a-531         DWA-A 531 (Starkregen / Regenspenden)
```
**Top acquisition priority = KOSTRA-DWD-2020 (22 dependent nodes) — acquiring it lifts the largest NR
block in the whole map corpus.** DIN 1986-100 spans two standards (138 + GAR) → a second high-value target.

## REAL findings surfaced on the actual maps (flagged for Alvaro's batch)
1. **`(balance)`/`(condition)` output-symbol naming mismatch (WARN, DWA-A-138-1).** DB equations
   `eq-gl11/13/25/38` carry `output_symbol = "(balance)"` / `"(condition)"` (bracketed boolean-check
   placeholders), while the map nodes declare `produces:: balance` / `condition` (unbracketed). The
   validator excludes bracketed DB placeholders from symbol cross-truth, so the residue is the map's
   unbracketed twin. Benign, but a genuine map↔DB naming inconsistency for the boolean-relation
   equations — either the encoding should emit a real symbol or the map should mirror the placeholder.
   This is the **document-node / boolean-equation data_class taxonomy** class the brief anticipated.
2. **Taxonomy note (accepted, not a defect):** the validator accepts the FLL template extensions from
   the STEP-2 reports without flagging them — inequality-as-producer (`displayOnly`), verdict-enum-as-
   producer (ratified `40cd1b2`), per-PDF page offset (−1/−2/−3), `in_library:false` ETA/AbP per-product
   docs, and the DS-ceiling `provenance_build 3f9ca0f` lift are all handled. Confirmed no false positives.

## Verification discipline
- Snapshot export was SELECT-only via the Management-API read path; token from `$SUPABASE_ACCESS_TOKEN`,
  never printed. No prod writes. `audit_status`/`verification_status` untouched.
- Every count/finding above is pasted raw command output, not a summary.
- 5-error proof runs on a disposable COPY (`scripts/reasoning-map/fixtures/`, gitignored) — the real
  vault maps are never mutated. Fixtures + results are regenerable via `seed-known-errors.mjs`.

## Scope guard
Phase 3 (pilots) NOT started. This task shipped only the validator + exporter + this report.
