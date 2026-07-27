# STEP 2 / task 2a — FLL-GAR-2023 reasoning map (report)

**Built:** `…\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\FLL-GAR-2023\`
(`_index.md` + 84 node notes). Reuses the DWA-A-138-1 canonical template VERBATIM.
**Generated from artifacts only:** prod `vadsmshzebefjreqcicl` (standard
`b252ce89-6efc-4081-9684-8560b72651ed`) + rendered GAR PDF (scoop `pdftotext -layout`) +
STEP-1 deliverables (commit `3f9ca0f`). No prod writes. Doctrine `verification-doctrine.md` read in full.

## Node counts (84 total)
- **type:** section 29 · equation 4 · table 8 · compliance_requirement 30 · document 2 · decision-point 11
- **provenance (node-level):** VA 50 · VC 14 · NR 20
- **data_class:** standard_fixed 46 · derived 22 · engineer_input 9 · standard_range 7
- **worksheet-level grade** (mirrored in the 29 section nodes, from closure §3): **VA 18 / VC 10 / NR 1** (GAR-27).

## Invariant #1 (every VA node has a source_page) — CONFIRMED
Scripted check over all 84 nodes: **0 violations** (VA-without-page) and **0** invariant-#2 violations
(standard_fixed-without-page, excluding the two `in_library:false` document nodes that defer out-of-library).
Raw: `for f in *.md; prov==VA && source_page empty → print` returned empty. Link check: **86/86 wikilink
targets resolve** (only external target = the shared DWA-A-138-1 template, intentional).

## Page convention verified this session
GAR footer offset = **`printed = physical − 2`** (same as 138): physical p.30→printed 28,
p.31→29, p.32→30 (raw form-feed footer split, see below). Tab.1 slope = physical p.31 = **printed p.29**.

## DIN-1986-100 NR-capped set (the GAR-27 C-class)
**2 nodes** cap at NR via `references:: [[doc-din-1986-100]]`: [[eq-gar-gl1-qnot]] and [[section-gar-27]].
GAR's sole sizing eq `Q_NOT = (r_5_100 − r_5_5·C)·(A/10000)` draws `r_5,5`/`r_5,100` **"nach DIN 1986-100"**
(printed p.132, Anhang 1 informativ; Düsseldorf worked ex. r_5,5=316, r_5,100=607, A=800, C=1). Second
out-of-library doc = **`doc-eta-abp-mvvtb`** (per-product approval; GAR-17 Flüssigkunststoff thickness upper
branch `max(2,0 mm, ETA-Wert)` — the 2,0 mm constant is VA, the ETA branch is NR).

## range_choice / decision-point nodes generated (11 DPs)
- **range_choice (SR-2):** `dp-gar-23-freibord-range` (30/15/5 cm, verbatim §4.5 p.117) · `dp-gar-07-slope-range` (Tab.1 per-material p.29). 7 standard_range nodes total.
- **gate-topology / dead-gate:** `dp-gar-10-phantom-gates` (nine `abdichtungs_art` gates REQ-12..22) · `dp-gar-01-crosssheet-gates` · `dp-gar-22-req23-deadgate` · `dp-gar-12-beton-gate` · `dp-gar-13-asphalt-gate`.
- **clause / modal / normativity:** `dp-gar-17-clause-ref` (§9.9→§6.3 + N/mm²) · `dp-gar-19-soll-modal` · `dp-gar-22-anhang-informative` · `dp-gar-06-baugrund-attest`.
- **cos_beta:** GAR-22 Gl.2b = its own residue node [[eq-gar-gl2b-mindestauflast]], NR (trig-blocked), engine unfixed.

## Where the 138 template needed EXTENDING (next FLL maps + validator MUST know)
1. **NEW document class:** ETA/abP per-product approval (`in_library:false` whose "table" is inherently
   per-project, not a general library row). Validator must accept it.
2. **data_class mix inverts:** standard_fixed dominates (46/84) — GAR is a material-threshold standard, not
   a calc standard. Only 4 equations total.
3. **range_choice heavy** (7 nodes / 2 SR-2 DPs), as the 138 index predicted.
4. **Cross-worksheet gate topology is a NEW dominant finding class** (nine GAR-10 phantom gates + GAR-01/22
   cross-sheet). Encoded via `fired_by::` → owning worksheet + a DP. **The validator needs a "gate condition
   symbol not owned by the gated worksheet → NR/finding" check**; Naturteich & TP-Rhizom will hit it too
   (FLLNT-06, RHZ-05/16/19 are the same shape per M2).
5. **"formula source-VA, evaluation NR"** (cos β) is distinct from a document-NR — validator should not treat
   the quotable-but-uncomputable equation as a source gap.
6. **Informative-Anhang ceiling** (Anhang 1 & 2 both "(informativ)") — validator must not force printed-but-
   informative numbers to VA; they sit VC-illustrative pending a normativity ruling.

## Raw (sample)
**PDF footer offset (form-feed split of physical p.30-32 render):**
```
LAST: 28   (physical p.30)
LAST: 29   (physical p.31 — Tab.1 slope)
LAST: 30   (physical p.32)
```
**GAR Tab.1 slope (physical p.31 / printed p.29), verbatim rows:**
```
4  Ortbeton (ohne Schalung)   ≤ 1:2   ≤ 50 %
6  Gussasphalt                ≤ 1:5   ≤ 20 %
10 Kunststoff- und Elastomerbahnen  ≤ 1:1,5  ≤ 66 %
11 Abdichtungen mit Flüssigkunststoffen  ≤ 1:1  ≤ 100 %
```
**GAR-27 Gl.1 rainfall (physical p.134 / printed p.132, Anhang 1 informativ):**
```
… (r5,5) … (r5,100), notwendig … nach DIN 1986-100:
Für Düsseldorf gilt: r5,5 = 316 l/(s*ha) und r5,100 = 607 l/(s*ha), Abflusswirksame Fläche = 800 m², C = 1
Q NOT = [(r5,100 – (r5,5 * C)] * (A / 10.000)
```
**Prod equations (all 4) — read-only:**
```
FLL-GAR-22 2a  g_prime = gamma_D_prime * d_D                                    (Anhang 2 informativ)
FLL-GAR-22 2b  g_prime >= (Delta_u*gamma_A - (gamma_F'*d_F + gamma_Di'*d_Di)) / cos(beta)   (NR — cos β)
FLL-GAR-22 2c  Delta_u = (Delta_h_W + z_a) * gamma_w                            (Anhang 2 informativ)
FLL-GAR-27 1   Q_NOT = (r_5_100 - r_5_5 * C) * (A / 10000)                      (Anhang 1 informativ; NR — DIN 1986-100)
```
**Prod CR count:** 30 (`compliance_requirements` for standard b252ce89…); worksheets 29; fields per query.

## Note on framing drift (findings → EXACT prod nodes, not the M2 functional labels)
The M2/STEP-1 prose referred to worksheets by function; the prod artifacts differ and the map follows PROD:
- the "nine phantom gates" are **REQ-12..22 on GAR-10** (not a separate sheet);
- the freibord gate is **REQ-23 on GAR-22** reading **GAR-23** fields (not "GAR-23's gate");
- the slope gate is **REQ-08 on GAR-07**. Attached each finding to the prod-actual node.
```
