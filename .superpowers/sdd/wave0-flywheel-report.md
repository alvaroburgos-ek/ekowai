# Wave-0 FLYWHEEL reconciliation report

Date: 2026-07-24 · Author: Alvaro (leadership@ekowai.com) · Prod `vadsmshzebefjreqcicl` read-only
(NO prod writes). Governs: `docs/verification-doctrine.md` (SR-1..4, flywheel).

## Purpose

The first Wave-0 corpus validation reported **ERRORS = 4021**. A large fraction were two
generation/validator-convention ARTIFACTS, not real defects. This pass fixed them, re-validated the
whole swept corpus, and produced trustworthy real-defect counts so the triage table can be trusted
before Alvaro orders Wave 1.

## Before / after (raw, findings-array = exit signal)

| metric | before | after |
|---|---|---|
| **ERRORS** | **4021** | **3345** |
| WARNINGS | 1029 | 1029 |

Per-check ERROR deltas (findings-array counts):

| check | before | after | note |
|---|---|---|---|
| `2b.va-build-resolves` | 665 | **0** | Fix #1 — placeholder builds blanked |
| `1.links-resolve` | 1363 | **1352** | Fix #2 — 11 path-style cross-map links now resolve |
| `2.cr-db-has-node` | 1274 | 1274 | real (orphan DB CR rows) |
| `6.eq-classifiable` | 423 | 423 | real |
| `8.norm-input-ref-has-page` | 77 | 77 | real |
| `1.cr-fired-or-dead` | 75 | 75 | real (dead gates, #22/F-4 family) |
| `8.norm-input-ref-consumed` | 66 | 66 | real |
| `1.eq-produces` | 33 | 33 | real |
| `2.fixed-has-page` | 30 | 30 | real |
| `2.cr-node-has-db` | 10 | 10 | real |
| `1.va-has-page` | 5 | 5 | real |

**Note on the "~2726 / ~1330 / ~792" premise numbers.** Those were the validator's per-check `fail`
COUNTERS, which double-count — `bumpCheck` fires once per wikilink occurrence and the parser pushes
duplicate wikilink entries (once from the typed-link line, once from the general `matchAll`). The
findings ARRAY (= process exit code) is the trustworthy signal and is ~half each counter (e.g.
link-resolve counter 2726 ⇄ 1363 findings; va-build counter 1330 ⇄ 665 findings; ws-has-section
counter 792 ⇄ 396 findings).

## The two fixes applied

### Fix #1 — Placeholder builds → `""` (flywheel)
Script: `scripts/reasoning-map/blank-wave0-builds.mjs`. Wave-0 PDF-VA nodes should carry
`provenance_build: ""` (VA justified by `source_page`; the `2b` check exempts empty). Some carried
non-commit placeholder strings — 39 distinct values incl. `read-only-wave0`, `read-only-generated`,
`prod-vadsmshzebefjreqcicl-read-only`, `wave0-map-only`, and `pdftotext -layout …` page descriptions.
Corpus-wide, every non-commit `provenance_build` on the Wave-0 maps was blanked to `""` (2154 files
touched). The **6 pre-Wave-0 maps** (`DWA-A-138-1`, `FLL-GAR-2023`, `FLL-Naturteich-2017`,
`FLL-TP-RHIZOM-2023`, `DIN-18130-1`, `DWA-A-102-2`) carry REAL git-commit builds and were skipped
entirely (0 of the 665 offending nodes were on them; verified). Result: **665 → 0**.

### Fix #2 — Cross-map link resolution (flywheel + doctrine addition)
File: `scripts/reasoning-map/validate.mjs` (new `linkResolves()` helper + wired into check
`1.links-resolve`). A path-style target `[[A/B]]` now resolves iff map dir `A` exists AND node `B`
exists in it (or `B` is `_index`/`_template-node`); local (non-path) targets resolve as before; only
truly-unresolvable targets are flagged. `KNOWN_BUILDS = gitCommitsExist()` is UNCHANGED. Cleared 11
false path-style danglers (`[[DWA-M-229-1/_index]]`, `[[DWA-A-138-1/_index]]`,
`[[ISO-59004/doc-iso-59004-pdf-missing]]`, `[[FLL-GAR-2023/dp-gar-22-anhang-informative]]`, …), all
verified to point at nodes that genuinely exist. Recorded as a flywheel addition in the doctrine's
validator-rule list.

### 5-known-errors proof — STILL exits 6 (guard against over-exemption)
Fixtures copy of the 4 seed-target maps (clean baseline exit 0), then
`seed-known-errors.mjs` → `validate.mjs --maps fixtures`:

```
Seeded 5 defects into fixtures copy:
  (a) dangling link  -> DWA-A-138-1/eq-gl2-a138-07: references [[doc-this-node-does-not-exist]]
  (b) VA w/o build   -> FLL-GAR-2023/cr-gar-req-08: provenance_build=deadbee (no such commit)
  (c) dead CR        -> FLL-Naturteich-2017/cr-fllnt-req-seeded-dead: no fired_by / no gated_by
  (d) missing page   -> FLL-TP-RHIZOM-2023/eq-rhz-13-eq1: source_page blanked (still VA)
  (e) DB orphan      -> DWA-A-138-1/cr-a138-req-02 DELETED (A138-REQ-02 still in snapshot)
  ...
  ERRORS = 6   WARNINGS = 3
PROOF EXIT = 6
  [ERROR] 1.links-resolve · DWA-A-138-1 · eq-gl2-a138-07 — dangling wikilink -> [[doc-this-node-does-not-exist]]
  [ERROR] 2.cr-db-has-node · DWA-A-138-1 · A138-REQ-02 — DB CR A138-REQ-02 has NO map node (orphan DB row)
  [ERROR] 2b.va-build-resolves · FLL-GAR-2023 · cr-gar-req-08 — VA cites build 'deadbee' … no resolvable commit
  [ERROR] 1.cr-fired-or-dead · FLL-Naturteich-2017 · cr-fllnt-req-seeded-dead — CR has neither fired_by nor gated_by
  [ERROR] 1.va-has-page · FLL-TP-RHIZOM-2023 · eq-rhz-13-eq1 — provenance VA but no source_page
```

Exit **6** (defect (c) legitimately raises 2 errors: dead-gate + orphan-node; a+b+d+e = 4). The
seeded dangling link `[[doc-this-node-does-not-exist]]` (non-path-style) is STILL caught — the
resolver refinement did NOT over-exempt real danglers.

## `ws-has-section` verdict (~792 counter / 396 findings, WARN-only)

**Mostly a UTF-8-BOM generation artifact; a small genuine residue.** The check builds `sectionOwners`
from section nodes' `owner_worksheet` frontmatter. On the affected maps the section nodes EXIST and
carry the correct `owner_worksheet` — but the files begin with a UTF-8 BOM (`EF BB BF`), which breaks
`parseFrontmatter`'s `^---` anchor, so `owner_worksheet` is never read → every DB worksheet appears
section-less. Confirmed on the section files of VSME (40), DWA-A-262E (33), DWA-M-816, DWA-M-187,
DWA-M-179-1, VDI-2163, etc. — all BOM-prefixed. GENUINELY section-less maps: **DWA-A-272E** (thin
12-node map) and **ISO-5667-6** (no source PDF — the known acquisition gap; zero `section-*` files).
Verdict: ~90% artifact (BOM), ~2 genuine. Left as WARN and NOT mass-fixed — it does not affect the
ERROR total, and stripping BOMs corpus-wide is a separate encoding-hygiene pass (the BOM also causes
the `â€"`/`Ã¼` mojibake in titles).

## Real defect signal (post-reconciliation)

The trustworthy **3345 ERRORS** decompose into real defect classes:
- **1352** dangling LOCAL wikilinks — maps reference sibling `field-/cr-/doc-/dp-/eq-` nodes that were
  never emitted (generation-completeness gap; distinct from the cross-map artifact just fixed).
- **1274** orphan DB CR rows (`2.cr-db-has-node`) — DB `compliance_requirement` with no map node;
  CR-node coverage gap, concentrated in the ISO/circularity cluster (ISO-59014 54, DIN-14021 50,
  ISO-9001 48, ISO-59004 44, DWA-A-222 43…).
- **423** equation non-classifiability (`6.eq-classifiable`).
- **143** normative-as-input-reference gaps (77 no source_page + 66 no consumed_by).
- **75** dead gates (`1.cr-fired-or-dead`; #22/F-4 non-enforcement family).
- **33 / 30 / 10 / 5** eq-produces / fixed-has-page / orphan CR node / VA-without-page.

## Tiering + acquisition — UNCHANGED

The two artifacts were structural noise, not tier-moving defects. Tier assignments (~12 harness-ready
/ ~43 fix-first / 11 acquisition-blocked) and the acquisition ranking (KOSTRA-DWD-2020 → DIN 1986-100
→ ISO 14040, + the ISO-590xx own-PDF gaps) are unchanged. See `wave0-TRIAGE-TABLE.md`.

## Artifacts

- `scripts/reasoning-map/blank-wave0-builds.mjs` — the build-blanking pass (idempotent; skips the 6
  pre-Wave-0 maps).
- `scripts/reasoning-map/validate.mjs` — `linkResolves()` cross-map refinement.
- `docs/verification-doctrine.md` — flywheel validator-link rule recorded in the defect-class list.
- `baseline.json` / `after.json` — machine-readable before/after finding sets (regenerable via
  `validate.mjs --json`).
