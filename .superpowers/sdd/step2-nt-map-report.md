# STEP 2 / task 2b — FLL-Naturteich-2017 reasoning map (report)

**Built:** `…\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\FLL-Naturteich-2017\`
(`_index.md` + 68 node notes). Reuses the DWA-A-138-1 canonical template VERBATIM and follows the
FLL-GAR-2023 map's conventions VERBATIM (node types, frontmatter, typed-links, document-node taxonomy,
decision-point handling).
**Generated from artifacts only:** prod `vadsmshzebefjreqcicl` (standard
`c11f0e54-fef3-4552-be7b-f6eb50b468da`) + rendered Naturteich-2017 PDF (scoop `pdftotext -layout`) +
STEP-1 deliverables (commit `3f9ca0f`). No prod writes. Doctrine `verification-doctrine.md` read in full.

## Node counts (68 total, excl. index)
- **type:** section 15 · equation 6 · table 8 · compliance_requirement 33 · document 2 · decision-point 4
- **provenance (node-level):** VA 58 · VC 8 · NR 2
- **data_class:** standard_fixed 43 · engineer_input 15 · derived 6 · standard_range 4

## Worksheet-level VA/VC/NR (mirrors the STEP-1 Naturteich share — CONFIRMED)
**VA 11 / VC 4 / NR 0** (15 worksheets), identical to `fll-d1-va-closure.md` §3 Naturteich block.
The four VC sheets = FLLNT-04 (water-quality data-collection), -07 (construction data-collection),
-08 (equipment/services), -15 (terminal summary) — all `R-noeq`, no printed number to assert VA
against. **No Naturteich worksheet is NR** (no trig-blocked equation — that is GAR-22's alone).
Node-level 58/8/2 is finer-grained: most CR/table/equation nodes are individually page-cited VA; the
8 node-VC are completeness/attestation gates with no scalar (REQ-02/05/13) + the VC sections' state;
the 2 node-NR are the two `in_library:false` document nodes.

## Value-node invariant #1 — CONFIRMED (0 violations)
Scripted check over all 68 nodes: **0 VA-without-source_page** and **0 standard_fixed-without-page**
(excluding the two `in_library:false` document nodes that legitimately defer out-of-library). Two VA
section sheets (FLLNT-01, -02) initially tripped #1 — corrected by citing the printed page of their
governing clause (§1.1 p.8 for REQ-01; §8.1.5 p.39 for REQ-05), matching how GAR's VA sections carry a
page. **Wikilinks: 0 broken** across all files (only external target = the shared DWA-A-138-1 template,
intentional, same as GAR). The `_index.md` carries `provenance: VA` with no page — index is a map-level
node, exempt, IDENTICAL to the GAR `_index.md` convention (verified for parity).

## DS-ceiling VA nodes (LIFTED this program)
- [[eq-fllnt-10-eq01]] — 50×-Regel, verbatim *"amount to at least 50-times the surfaces of the pool
  that are exposed to light and submerged"*, **printed p.82** (Appendix 5 informative), `provenance_build: 3f9ca0f`, `displayOnly:true`.
- [[eq-fllnt-11-eq05]] — 150 l/m², verbatim *"at least 150 l per square metre"*, **printed p.54**
  (§10.3.1), `provenance_build: 3f9ca0f`, `displayOnly:true`.
Both retain `displayOnly` (inequality-as-producer; the engine returns the numeric RHS threshold, never
the declared boolean/LHS). Their enforcing gates [[cr-fllnt-req-22]] / [[cr-fllnt-req-33]] carry the
producer-starvation + wrong-reference-surface findings.

## Decision-points generated (4 — Alvaro's batch, never guessed)
1. [[dp-fllnt-03-req07-greedy-and]] — FLLNT-03 REQ-07 greedy-AND vacuous-PASS (Type-III `>30 %` dead
   branch); mechanical parenthesisation fix staged (written-not-applied).
2. [[dp-fllnt-10-11-modal-verb]] — FLLNT-10 EQ-01 ("should … at least 50-times", informative annex) +
   FLLNT-11 EQ-05 ("Approximate value … at least 150 l") block-vs-warn / normativity ruling.
3. [[dp-fllnt-ranges]] — SR-2 range surfaces: `grain_specific_surface` (Tab.15), hydrobot/filter
   Tab.10-12 water-column & substrate bands, plant density §10.4.3, overflow tolerance ±1/±2 mm.
4. [[dp-fllnt-phantom-fields]] — (A) DELETE phantom enum-value-as-field rows (`type_III`, `emersed`,
   `submergent`, `vertical_continuous_overflow`, `vertical_no_overflow`); (B) FLLNT-06→FLLNT-07
   cross-worksheet gate placement (6 gates); (C) FLLNT-14 REQ-27 over-enforces the source "should".

## THIS PDF's page-offset (verified — DIFFERS from 138/GAR)
**`printed = physical − 3`** (NOT the `−2` of DWA-A-138-1 and FLL-GAR-2023). Verified by page-range
`pdftotext` probes against the PDF's own footer: physical p.57 → printed **54** (the 150 l/m² text),
physical p.85 → printed **82** (the 50× rule). Every `source_page` in the map is a PRINTED number.
Table pages taken from the standard's own printed ToC (Tab.1→22, 7→32, 8→33, 9→34, 10→47, 11→50,
12→52, 13→62).

## NEW template extensions the RHZ map + validator MUST know
1. **Per-PDF page offset** — the offset is document-specific (`−3` here vs `−2` for 138/GAR). The
   validator/RHZ map must DERIVE the offset from each document's own footer, never inherit `−2`.
2. **Inequality-as-producer equation class** — EQ-01 & EQ-05 declare a boolean/LHS `output_symbol` on a
   `>=` formula; the engine strips the LHS and returns the numeric RHS, so the declared output is never
   engine-produced (both `displayOnly:true`). This is **source-VA but producer-starved** — distinct
   from GAR's "formula source-VA, evaluation NR (cos β)". Validator needs a "derived output is the
   LHS/boolean of an inequality → displayOnly required + gate is attestation-fed" check. RHZ verdict
   gates (RHZ-18/21) are the same shape.
3. **DS-ceiling provenance_build tag** — two VA nodes carry `provenance_build: 3f9ca0f` because their
   VA was won by a program commit lifting a *stale markdown ceiling*, not first-pass encoding. Validator
   must accept a VA authorised by page-ref PLUS a lift commit.
4. **Greedy-AND vacuous-pass gate (NEW, not in GAR)** — FLLNT-03 REQ-07's unparenthesised chained
   `IF…THEN… AND IF…THEN…` makes the second branch dead. Validator needs an "unparenthesised chained
   IF/THEN under greedy parseOr" detector.
5. **Phantom enum-value-as-field DELETE class** — enum VALUES leaked into `fields` as section-less rows;
   unlike GAR's null-section quirk (sectioned), these must be **DELETED**. Validator must distinguish
   "orphan enum token → delete" from "real field missing a section → section".
6. **Cross-worksheet gate topology** (as GAR extension #2 predicted) — FLLNT-06 gates read FLLNT-07
   fields; FLLNT-03 REQ-09/10/11 read FLLNT-04/05; FLLNT-09 REQ-33 reads FLLNT-06's `pool_underwater_surface`.
   Modelled as findings on the gated CR nodes + [[dp-fllnt-phantom-fields]]. Same check GAR flagged.

## Raw (sample) — prod rows + pdftotext excerpts

**Prod worksheet / equation / CR counts (live, read-only, 2026-07-24):**
```
worksheet_templates (FLL-Naturteich) = 15
equations                            = 6   (EQ-PUWS, EQ-01, EQ-02, EQ-03, EQ-04, EQ-05)
compliance_requirements              = 33  (REQ-01..REQ-33, contiguous, all count=1)
```

**Page-offset probe (this PDF's own footer):**
```
physical p.57 -> printed 54   (§10.3.1 "150 l per square metre")
physical p.85 -> printed 82   (Appendix 5 "50-times" rule)
=> offset printed = physical - 3
```

**DS quote #1 — FLLNT-10 EQ-01 (50×-Regel, printed p.82 / physical p.85):**
```
"The outer grain surfaces of the filter material in the filter body that can be [colo]nized should,
 as experience shows, amount to at least 50-times the surfaces of the pool that ..."
 [worked example on same page: "95 m² x 50 = 4750 m²"]
```

**DS quote #2 — FLLNT-11 EQ-05 (150 l/m², printed p.54 / physical p.57):**
```
"Approximate value for the dimensioning of the water reservoir[.] The usable volume of the splash
 water tank must be dimensioned so that at least 150 l per square metre can be provided to the
 inundated water surface."
```

**Prod equations (all 6) — read-only:**
```
FLLNT-06 EQ-PUWS  pool_underwater_surface = pool_ground_area_m2 + pool_submerged_wall_area_m2   (App.5 Ex.2; verified_against_standard)
FLLNT-10 EQ-01    filter_colonized_surface_actual >= 50 * pool_underwater_surface   (out=filter_50x_rule_met; inequality-as-producer; VA p.82)
FLLNT-10 EQ-02    filter_colonized_surface_actual = grain_specific_surface * F_filter * h_filter   (VA p.82, 600x15x0.7=6300)
FLLNT-10 EQ-03    filter_volume_required = (pool_underwater_surface * 50) / grain_specific_surface   (VA p.82, 4750/600≈8)
FLLNT-11 EQ-04    overflow_edge_length = 0.01 * swimming_area_m2   (VA p.57, 30->0.3)
FLLNT-11 EQ-05    splash_water_tank_volume >= 150 * pool_underwater_surface   (inequality-as-producer; VA p.54; wrong-ref-surface finding)
```

**External-doc references (→ document nodes, in_library:false, NR):**
```
§10.3.1 / §10.5 : "Please refer to DGfdB R ..." + "DGfdB R 60.03 ... 65.06 ... 65.09"   -> doc-dgfdb-r
§9.1            : "ATV DIN 18300 – Ground work"                                          -> doc-atv-din-18300
```

## Validation performed
- Invariant #1 (VA ⇒ source_page): 0 violations. Invariant #2 (standard_fixed ⇒ source_page, excl
  in_library:false): 0 violations. Wikilinks: 0 broken (68 node basenames + 1 intentional external
  template ref). Index exemption matches GAR parity.
- Prod read-only throughout; no writes; `audit_status`/`verification_status` untouched.

## Build ONLY Naturteich — DONE. TP-Rhizom map is task 2c (not built here).
