# STEP-2 · pilot 1 (SIMPLE) — DIN-18130-1 full map→drives→harness cycle

**Date** 2026-07-24 · **Prod** `vadsmshzebefjreqcicl` (read-only) · **Work** `C:\Users\Ekowai\_wt-fll`
**Map** `…/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps/DIN-18130-1/`
**Doctrine** `docs/verification-doctrine.md` (SR-1..4, EV/VC/VA/NR, data_class, PDF pipeline) — read in full.

## The pick + reasoning (Step 0, artifact-driven)
Queried prod for every never-harnessed standard (all except DWA-A-138-1 + the 3 FLL). Ranked the real
(non-test-junk) standards by equation+CR count:

| std | ws | eq | cr | PDF? | note |
|---|---|---|---|---|---|
| ISO-14050 | 13 | **0** | 6 | — | terminology; **0 eq → cannot demonstrate equation VA** |
| **DIN-18130-1** | 5 | **8** | 7 | **yes** | permeability lab method; self-contained Darcy chains |
| DIN-1989-1 | 6 | 4 | 14 | yes | bigger CR surface |

**PICKED DIN-18130-1** — smallest eq+cr (15) among standards that *have equations* (ISO-14050 has fewer
CRs but 0 equations, so no compute chain could reach VA). Reachable PDF at
`Desktop/Guidelines/DWA DIN Scribd/DIN-18130-1/DIN-18130-1.pdf`. Decisive property: it is a
**self-contained lab method** — k = f(measured quantities) via Darcy's law, every equation input an
`engineer_input` lab measurement, **no external governing table in the k chain** (contrast DWA-A-138's
`r_D(n)` → KOSTRA cap). So its 8 equation chains are VA-reachable end-to-end — the ideal simple pilot.

## Map generated (Step 1) — 29 nodes + index/template
Reused `DWA-A-138-1/_template-node.md` VERBATIM. Generated from prod encoding (std
`4a53393a-…`) + the RENDERED PDF only. The PDF has **no text layer** (`pdftotext` → form-feeds only), so
every quote was read from `pdftoppm` PNGs. **Page convention: printed = physical (offset 0)** —
verified "Seite 3/5/6/8/16" in the running header. Nodes: 5 section · 8 equation · 4 table · 7 CR ·
2 document · 3 decision-point.

### before → after map state (by provenance)
| provenance | at generation | after harness | data_class |
|---|---|---|---|
| VA | 26 | 26 (7 eq now harness-attested, not just pure-PDF) | derived 19 |
| VC | 2 (doc-dwa-a-138, dp-01, dp-02*) | 2 | standard_fixed 6 |
| NR | 1 (doc-din-18137-2) | 1 | standard_range 2 |

(*dp-02 VC; dp-03 is VA.) The harness did not move nodes VA→ higher (they were already pure-PDF VA per
SR-3); it **upgraded 7 equation nodes from pure-PDF VA to harness-attested VA** (compute proven through
real code) and **confirmed the Gl.9 gap**.

## Validator = the WORK PLAN (Step 2)
Registered DIN-18130-1 in `STANDARD_DIRS` + the snapshot exporter; refreshed the snapshot
(`export-encoding-snapshot.mjs`; DIN-18130-1: ws=5 eq=8 cr=7). First run surfaced exactly the plan:

1. **[ERROR] dangling wikilink** `doc-dwa-a-138 → [[DWA-A-138-1/_index]]` — cross-map path is not a node
   here. → FIXED (made prose).
2. **CR cross-truth would orphan all 7 CRs** — the validator's `extractCrCode` only matched `…REQ-NN`,
   not the DIN family `…-CR-NN`. → FIXED (extended regex to capture `<STD>-CR-NN` first). After the fix
   all 7 CRs matched DB both directions.
3. below-VA query returned exactly 4 nodes — all legitimately capped (doc-din-18137-2 NR;
   doc-dwa-a-138 VC transfer; dp-01/dp-02 VC decision-points). No spurious below-VA node.

**Final validator: ERRORS = 0** for DIN-18130-1 (2 residual WARNs are pre-existing DWA-A-138
`balance`/`condition` relational placeholders, not DIN). All checks green:
cr-db↔node, ws-has-section, eq-classifiable, va-has-page, links-resolve, 2b.va-build-resolves.

## Map-drives-harness (Step 3) — the demonstration
The map's 8 equation nodes + 7 CR nodes drove the harness (NOT hand-picked): seeded a minimal
DIN-18130-1 project (`seed-din18130-1.ts`: calc ws-04 with all 8 equations + input/output fields, summary
ws-05, the 7 block CRs — formulas/conditions VERBATIM from prod) on a disposable embedded Postgres, and
ran `din18130-verify.integration.test.ts`:

- **7 equation chains** (Gl.1,2,3,4,6,7,8) computed through the REAL `evaluateFormula`, each asserted
  against the value its verbatim PDF formula yields. Gl.(6)'s α at T=10 = 1.359/1.359 = **1.000**, which
  **cross-checks Tab.2's discrete α(10)=1,000** on rendered Seite 5 (formula ↔ table agreement).
- **k round-trips through the REAL `saveWorksheet`** → persisted, read back = 2.0e-5, `source_type=derived`
  (confirmed via REAL `derivedOutputSymbols` that Q,v,i,k,k_10,h are derived, never `entered`).
- **All 7 CRs** fired through REAL `evaluateCondition` in pass AND fail states.

### raw vitest
```
 ✓ Gl.(1) Q = V_w/t  [PDF Seite 3]
 ✓ Gl.(2) v = Q/A  [PDF Seite 3]
 ✓ Gl.(3) i = h/l  [PDF Seite 3]
 ✓ Gl.(4) k = v/i  [PDF Seite 3, DARCY]
 ✓ Gl.(6) k_10 …  [PDF Seite 5] — α(T=10) cross-checks Tab.2 = 1,000
 ✓ Gl.(7) h = h_0(γ_w−γ_org)/γ_w  [PDF Seite 5]
 ✓ Gl.(8) k = Q·l/(A·h)  [PDF Seite 16] constant-head
 ✓ Gl.(9) k = …·ln(h_1/h_2)  [PDF Seite 16] falling-head — ENGINE GAP: ln() unsupported
 ✓ classifies equation outputs as derived via REAL derivedOutputSymbols
 ✓ persists constant-head k through REAL saveWorksheet and reads it back (derived)
 ✓ CR-01 … ✓ CR-02 … ✓ CR-03 … ✓ CR-04 … ✓ CR-05 … ✓ CR-06 … ✓ CR-07
 Test Files  1 passed (1) · Tests  17 passed (17)
```

## Findings list
- **F-1 (engine gap, real):** Gl.(9) falling-head `k=(a·l₀)/(A·t)·ln(h₁/h₂)` uses `ln()`, which the
  in-tree arithmetic engine (`src/lib/eval/arithmetic.ts`, only min/max) cannot evaluate → returns
  non-computed (fail-loud, no fabricated value — doctrine-aligned). The falling-head permeability compute
  chain is **not engine-executable**. Formula transcription is VA; the compute chain is staged.
- **F-2 (validator gap, fixed):** `extractCrCode` did not recognise the `<STD>-CR-NN` code family →
  would have orphaned every non-REQ standard's CRs. Generalised.
- **F-3 (map hygiene, fixed):** cross-map `[[…/_index]]` wikilinks dangle; cross-standard references must
  be prose or a `document` node, never a foreign-map path.
- **F-4 (no server materialize for generic standards):** unlike DWA-A-138, saveWorksheet has no
  materialize topology for DIN-18130-1 — its equations evaluate client-side and write back as `derived`.
  The harness proves the evaluator + the derived-classification + the persistence, which is the correct
  scope for a non-138 standard.

## Decision batch for Alvaro (unratified — never guessed)
- **dp-01-worked-examples** — §9 numeric worked examples (k=2,745e-4/k_10=2,1e-4; falling-head
  k_10=3,77e-9): exemplary, NOT normative. Confirm they are compute ORACLES only, never encoded values.
- **dp-02-versuchsklasse** — Versuchsklasse {1,2,3}: free engineer enum, or DERIVED from saturation
  (DIN 18137-2) + stationary-flow proof? Needs the DIN 18137-2 row (out of library → NR).
- **dp-03-alpha-source** — α in Gl.(6): continuous closed-form vs discrete Tab.2 lookup (both on Seite 5).
  Which governs the persisted α? (SR-2 range/lookup selection.)
- **Missing document:** DIN 18137-2 (`in_library:false`, 1 dependent) — acquire to lift dp-02 off NR.
- **F-1 ruling:** add `ln` to the arithmetic engine (or register a falling-head aggregator) so Gl.(9)'s
  compute chain becomes VA, OR ratify that falling-head k is engineer-entered + attested.

## HONEST assessment — did the map+suite tell the system what to verify & how?
**Largely yes, and this is the encouraging result.** Given ONLY the prod encoding + the PDF:
- The map's **node list mechanically produced the harness plan** — the 8 equation nodes said which
  chains to run and which PDF page each value checks against; the 7 CR nodes said which gates to fire.
  No chat input chose the assertions; they fell out of `requires::/produces::` + `source_page`.
- The **validator mechanically produced the work plan** — the dangling link and the CR-code-family gap
  were found by the machine, not by me reading. The below-VA + acquisition-list queries named the
  residue (NR doc, VC decision-points) without human judgement.
- The **data_class + SR rules did the classifying** — engineer_input measurements vs derived outputs vs
  standard_fixed tables vs standard_range α came straight from the doctrine, and the decision-points were
  auto-flagged as "ambiguous → Alvaro", never guessed.

**Where human/chat input still had to fill gaps (the roadmap for iteration 2):**
1. **PDF page assignment for a scanned PDF is not yet automated.** The PDF has no text layer, so I had to
   render pages and *read them by eye* to (a) fix the page offset and (b) get verbatim quotes. The map
   generator cannot yet self-source `source_page` from an image PDF — a human rendered+read. → Next: an
   OCR/vision pass that emits page-number candidates the map generator consumes.
2. **The "which equations are engine-executable" check is not in the validator.** The Gl.9 `ln` gap was
   found by the *harness at runtime*, not predicted by the map. → Next: a static check that cross-references
   each equation's formula tokens against the engine's supported-function set, so the map flags
   compute-gaps BEFORE the harness runs.
3. **Synthetic test inputs were chosen by me.** The map says WHAT to assert (formula ↔ PDF) but not WHICH
   input tuple to feed. I picked clean numbers (and used T=10 deliberately to cross-check Tab.2). → Next:
   derive input tuples from the field data_types + any PDF worked-example ranges (as oracles, per dp-01),
   so input selection is also map-driven.
4. **Decision-point authoring still needs a human to spot the ambiguity.** dp-01/02/03 required reading
   the PDF to notice "range vs fixed", "exemplary vs normative". → Next: heuristics (modal verbs, a value
   appearing both as formula and table, "Beispiel"/"Anhang" headers) to pre-propose decision-points.

**Bottom line:** for a self-contained, text-clean standard the map+suite would be nearly autonomous. The
two things that still required me were (a) reading a scanned PDF and (b) predicting the engine-capability
gap — both are addressable and are the concrete backlog for the complex pilot (DWA-A-102-2) and beyond.

## Artifacts
- Map: `reasoning-maps/DIN-18130-1/` (31 files incl. _index/_template).
- Harness: `tests/harness/{seed-din18130-1.ts,_harness-env-din18130.ts,din18130-verify.integration.test.ts}`.
- Validator: `scripts/reasoning-map/validate.mjs` (STANDARD_DIRS + CR-code-family regex),
  `export-encoding-snapshot.mjs` (+DIN-18130-1), refreshed `snapshot/encoding-snapshot.json`.
