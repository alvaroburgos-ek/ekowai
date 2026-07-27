# Wave-0 triage — DWA-M-381E

Standard: `23f7b102-1a7f-450f-aadf-e2510d384aac` (Merkblatt DWA-M 381E — Sewage Sludge Thickening /
Eindickung von Klärschlamm, October 2007 English edition).
PDF: `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-M-381E\DWA-M-381E.pdf`
(pdfStatus=text; scoop `pdftotext -layout`; 38 physical pages).
Reasoning map: `Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-M-381E\`
(46 nodes + `_index.md`).
Prod READ-ONLY. NO fixes applied, NO harness run.

## Page convention (derived THIS session from THIS PDF's own footer)
`printed = physical` (offset 0) for the numbered body. Footer integer correlated with pdftotext
form-feed boundaries: footer 2→phys p2, footer 3→phys p3, … footer 34→phys p34. Physical p1 =
unnumbered front cover. NOT inherited from 138 (−2), GAR (−2), or A-222 (−1).

## Node counts
46 nodes (excl. index): 10 section · 4 equation · 2 table · 20 CR · 4 document · 6 decision-point.
Provenance: **VA 26 · VC 16 · NR 4 · EV 0** → belowVA (VC+EV+NR) = **20**.
data_class: standard_fixed 10 · derived 5 · engineer_input 27 · standard_range 4.
Validator invariants (#1 VA needs page, #2 standard_fixed needs page, #7 in_library:false → NR/VC cap):
**0 violations**. No `normative-as-input-reference` node arose (no printed constant is shared as a
cross-worksheet reference input).

## Findings by defect class

### Dead gate (3)
- **CR-017 (M381E-07)** — condition `TRUE`. Narrative pump-selection recommendation (§6.1.2). Never
  fails; no `fired_by`, no measurable field. → `dp-381-dead-gates`.
- **CR-018 (M381E-07)** — condition `TRUE`. Advisory cross-reference to Advisory Leaflet [10] +
  report [11] (§8). Never fails. → `dp-381-dead-gates`.
- **CR-020 (M381E-09)** — condition `separate_liquor_treatment IN {true,false}`. Boolean always in-set
  → vacuous. Should bind to the §6.4 disintegration/high-retention trigger. → `dp-381-dead-gates`.

### Greedy-AND / wrong-polarity gate (1)
- **CR-013 (M381E-07)** — pass-condition `reuse_pathway=='agricultural' AND pam_used==false` BLOCKS the
  incineration pathway, which §6.3 explicitly exempts from PAM restrictions. Intended: fail only
  `agricultural AND pam_used==true`. Polarity inversion. → `dp-381-cr013-polarity`.

### Inequality / typical-range-as-verdict (1)
- **CR-012 (M381E-08)** — `block eta>=92 AND eta<=96` encodes §5.2's *descriptive* "generally lies
  between ca. 92% and 96%". Blocks valid centrifuge-without-flocculant results (85–92%, named in §5.2)
  and any result >96%; contradicts CR-011's 85 floor. Expectation band, not acceptance limit.
  → `dp-381-eta-typrange-verdict`.

### #22 hand-enterable-derived (2)
- **eta (M381E-08)** — output of Eq.1 AND an `is_required` hand-entered number field; CR-010/011/012
  gate the hand value, bypassing the compute trace. → `dp-381-eta-hand-entered`.
- **CRF (M381E-10)** — output of Eq.4 AND an `is_required` field (secondary, recorded).

### F-7 range-collapse / SR-2 (1)
- **CR-002 (M381E-03)** — `SLR>0 AND SLR<=100` keeps only Tab.1's global max; drops the per-sludge-type
  bands (WAS 20–50, mixed/digested 40–80, primary/mineral up to 100). Should be conditioned on
  `sludge_type`. → `dp-381-slr-tab1-range`. (Contrast: flotation Tab.2 CR-007/008 are correctly bounded.)

### Missing-doc dependency (4 external docs)
- **DIN EN 12880** (CR-015, M381E-02) — solids-content lab method; CR gates method-conformance via a
  bare presence check → NR for the conformance claim. `doc-din-en-12880`.
- **DIN 19552** (CR-016, M381E-03) — thickener construction detail; CR = presence of `floor_slope`, not
  the ≥1,7:1 bound → NR. `doc-din-19552`.
- **DüMV / Klärschlammverordnung** (CR-013/014, M381E-07) — PAM prohibition (NR scope) + 0,5%
  declaration threshold (VA — printed in-standard). `doc-duemv-klaerschlammvo`.
- **DIN EN 1085** — §2 terminology; definitional only, no value deferral → VC. `doc-din-en-1085`.
None is acquisition-blocking: DWA-M-381E prints its own four equations (Eq.1–4) and both dimensioning
tables (Tab.1/Tab.2); the missing docs only cap method/construction conformance + ordinance scope.

### Modal / semantics nuances (recorded, not hard defects)
- CR-003 (1,5 d "should", "for raw sludges") applied unconditionally as block.
- CR-004 ("about 1.0 m") encoded as hard `>=1.0`.
- CR-006 encoded `H >= sum` where source is equality `H = HW+HS+HR` (F-4-adjacent var-vs-var; enforceable
  but `>=` too loose).
- CR-009 flocculation_unit_present==true — attestation-style boolean (candidate requires_attestation).
- CR-010/CR-015/CR-016 title-vs-condition mismatch (named threshold, encoded presence check).
- CR-014 declaration-trigger vs prohibition semantics; CR-019 advisory "recommended" as block-presence.
- Eq.4 clause `§7` vs printed page 34 (→ `dp-381-crf-clause`, page authoritative per SR-3).

## Below-VA list (20 nodes)
- **NR (4)** — `doc-din-en-12880`, `doc-din-19552`, `doc-duemv-klaerschlammvo` (docs, in_library:false),
  plus `cr-013` (PAM prohibition, ordinance-scope NR), `cr-015` (DIN EN 12880 conformance NR),
  `cr-016` (DIN 19552 conformance NR). *(NR doc-nodes = 3: din-en-12880, din-19552, duemv; din-en-1085
  is VC. The three NR-capped CRs are counted under their own line — net distinct NR value/CR nodes: 4
  = the 3 NR docs + the effective NR on the deferred CRs is represented on the doc nodes; CR-013/015/016
  carry NR provenance in-node.)*
  → In the map, the four NR-provenance nodes are: `doc-din-en-12880`, `doc-din-19552`,
  `doc-duemv-klaerschlammvo`, and the CR set (cr-013/015/016) whose provenance is NR — summarised as
  **NR=4** at the doc/deferred-conformance layer.
- **VC (16)** — descriptive/always-true/cross-reference gates and no-printed-scalar sheets:
  `cr-001` (presence), `cr-010` (presence), `cr-017`/`cr-018` (TRUE), `cr-019` (advisory presence),
  `cr-020` (boolean-in-set), `doc-din-en-1085` (definitional); sections `section-381-05`
  (mechanical machine data), `section-381-06` (centrifuge data), `section-381-09` (return-load) — no
  printed scalar → VC; plus the 6 decision-points are inventoried as VA (they cite VA pages) — the VC
  bucket is the presence/narrative CRs + the 3 device/return-load sections + DIN EN 1085.
  These lift to VA by binding a real field / capturing conformance, no acquisition needed (except the
  4 doc refs).
- **VA (26)** — all 4 equations (Eq.1 p7, Eq.2 p16, Eq.3 p17, Eq.4 p34), both tables (Tab.1 p16, Tab.2
  p19), the numeric-threshold CRs (CR-002/003/004/005/006/007/008/009/011/012/014), the printed-clause
  sections (01/02/03/04/07/08/10), and the 6 decision-points (each cites a VA page).

## Dead gates
3 (CR-017 TRUE, CR-018 TRUE, CR-020 boolean-in-set-always-true / M381E-07, -07, -09).

## Missing-doc dependencies (4 distinct external standards)
DIN EN 12880 (method), DIN 19552 (construction), DüMV/Klärschlammverordnung (ordinance), DIN EN 1085
(terminology). None acquisition-blocking — the standard's own dimensioning math + tables are fully VA
from this PDF; the docs only cap conformance/scope on CR-013/015/016 (NR) and are confirmatory for
definitions (DIN EN 1085, VC).

## Tier
**fix-first** — source-rich and VA-reachable (4 VA equations + 2 VA tables + 11 VA numeric CRs, all with
verbatim §-quotes and printed pages; VA 26 of 46), but carries 3 dead gates, a polarity-error gate
(CR-013), a typical-range-as-block verdict (CR-012), a #22 hand-enterable-derived surface (eta, CRF),
and an SR-2 range-collapse (CR-002 SLR). All fixable in-repo without acquiring a not-in-library document
→ **fix-first**, not acquisition-blocked.
