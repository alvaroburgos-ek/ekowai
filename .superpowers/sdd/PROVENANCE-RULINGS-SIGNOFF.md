# Provenance-backfill RULINGS — owner sign-off sheet (2026-08-03)

Consolidated from the equation + block-gate `source_quote` backfill (759 quotes across 71 standards).
**Nothing here was applied** — each item is evidence-only (the quote is in prod; the gate/equation is unchanged).
Each needs an owner ruling because it changes a value, a severity, or an enforcement shape (the three stops).
Grouped by action type, highest-consequence first.

## A. UNSUPPORTED / INVENTED gate thresholds — verify or remove (SAFETY-relevant first)
A gate enforcing a number the source does not contain. Fixing changes enforcement → owner call.
- **DWA-M-732 CR-M732-01** — `ausstoss_jahr >= 50000`. **No tonnage threshold exists anywhere in §1** (whole-doc search: 0 hits). Source applicability is qualitative ("mittelständische und Großbrauereien", "Gasthausbrauereien nicht erfasst"). The `>=50000` leg is invented; the enum leg is fine.
- **DWA-M-760 REQ-M760-10** — `entleerintervall_d <= 30`. Source prints "**monatlich**", no "30 Tage" figure. 30 d is an encoder proxy.
- **DWA-M-102-4 REQ-03** — `A_E_k_b >= 800` hard block, but source is "**ca.** 800 m²" (Relevanzgrenze) under a "**sollte**" modal.
- **FLL-GAR-2023 REQ-29** — `inspektion_intervall_jahr <= 1` hard block, but source prints "(**z. B.** mindestens einmal im Jahr)" — an example, not a mandated max.
- **DWA-M-179-1 REQ-01** (Gelbdruck) — `A_b_a <= 5000` hard block, source "**üblicherweise** bis 5.000 m²".
- **ISO-5667-13 CR-017** — `n_sp 4..30` block, source "**should** lie between 4 and 30".

## B. SEVERITY — block gates resting on non-mandatory text (should / soll / descriptive)
Whole documents or large fractions are block-gated on advisory language. Candidates for block→warn.
- **ISO-14002-2** — **all 13** block gates rest on "should"; the requirement body has **zero normative "shall"** (only Foreword boilerplate).
- **DWA-M-820-2** — **all 43** gates (advisory Merkblatt; Vorwort declares application voluntary).
- **DWA-M-820-3** — **all 13** (advisory; QE-checklist explicitly optional/extensible).
- **DWA-A-222** (binding Arbeitsblatt, so notable) — ~8 gates on "sollte"/"empfohlen": CR-006, 008, 010, 011, 019, 026, 040, 022.
- **DWA-M-277E** — REQ-32 (laundry⇒C2 "strongly recommended"), REQ-21-2/22/26-2/27-2/28-2, REQ-17-2 (mixed), REQ-29 (>50 m³ branch unsourced).
- **DWA-A-272E** (binding) — many gates on permissive "can/may/there is potential": COMP-02/11/13/27/29/31/32/33/34.
- **DWA-A-201** (binding) — CR-002 "in der Regel nicht", CR-008 "bewährt haben sich".
- **ATV-A-704E** — CR-019/022/023 "should" (soft).
- **DWA-M-1200-1/-2/-3** (Gelbdruck) — CR-013 "empfohlen"; REQ-07/11 "bevorzugt"/"sollten"; CR-17-2/18-2 "sollte".
- **DWA-M-708** (Gelbdruck) — REQ-708-14 descriptive ("wird unterschieden"), not imperative.
- **DWA-A-262E** — REQ-12 block on "greywater production **can be set at** ≥ 75".
- **DWA-M-760** — REQ-M760-09 Bauform selection descriptive; dimensioning delegated to DIN EN 1825.
- **DWA-M-816** — REQ-04 "in der Regel"; **DWA-M-102-4** REQ-04 kf "in der Regel"; **DWA-A-138-1** REQ-09 kf "in der Regel".

## C. NO-OP / enforcement-shape gates (fire but never enforce, or wrong semantics)
- **ISO-14019-1 CR-024** — `assurance_conclusion IN {…}` enumerates the **entire** §6.2.2 domain → tautology, never fails.
- **ISO-14002-2 CR-007** — `significant_aspect IS NOT NULL` on a **boolean** field → passes for true OR false; enforces "answered", not "significant".
- **ISO-14019-1 CR-010, CR-011** — Confidentiality §4.6 / Integrity §4.7 are present-indicative principles with **no "shall"** → block gates with no requirement to anchor (left NR). Re-anchor to a "shall" clause or reclassify below block.

## D. COVERAGE / enum under-inclusion
- **ISO-5667-16 CR-020** — `dilution_water_type IN {3 types}` but §9.1 permits **5** ("…ground or surface water shall be used") → gate would reject 2 legitimately-permitted types.
- **ISO-5667-10 CR-016** — enforces only the 30-min (24 h-composite) limit; §7.2.1's **≤5-min (2 h-composite)** limit is unenforced.
- **DWA-M-1200-3 CR-06** — storage-class mismatch (gate allows any `geschlossen`; source Tab.3 limits to Güteklassen A,B; open-storage C-1/C-2 vs printed C,D).
- **DWA-A-222 CR-016 / CR-012** — hardcode one column of Tab.6 / use the permissive small-plant bound; under/over-cover the table.

## E. CLAUSE-REFERENCE corrections (metadata only — safe to fix, but still your call)
- **DWA-M-820-1** REQ-16 → §8.10.2.4 (not §8.7); REQ-20 → §8.10.3.1 (not §8.10.3.4).
- **DWA-M-1200-1** CR-011 → Flächenverzeichnis is §7.2 (not §7.4); CR-013 → §4.3.4 (not §5.2).
- **DWA-M-816** REQ-02 → ARBF attestation lives in §1 (not §3.1).
- **DWA-A-102-2** REQ-03 → "Bilanzgebiet" defined in §5.1.
- **DWA-A-272E** COMP-35 → plant-related planning is §9.1(9), not §10 (also the standing NR).
- **DWA-M-187** (Gelbdruck) REQ-06 → `Ab,a < 1 ha` is §5.5.2.

## F. EQUATION rulings (from the equation backfill)
- **ATV-A-704E `deviation_single_pct`** — encoded `100*(single − mean)/mean`, but IQC-Card 3 col.9 prints the **greatest difference of the single values ÷ mean** (max-spread). Different metric. (Confirmed on p.29 by orchestrator's own read.)
- **ISO-5667-6 `l`** (mixing distance) — engine `error` (comma-decimals `0,13`); and `2*g` should be **`2*√g`** — the standard's own worked example (83 m / 683 m) reproduces only with √g. Both rest on OCR + are computed-value changes → ruling / PDF-acquisition.
- **ISO-5667-16 `CT_50`** — printed `logₑ2 / k₂`; encoding materializes `0.6931` (4-dp truncation). Engine supports `ln(2)/k_2` exactly.
- **DWA-M-816 `RBW_t`** — encoded output `RBW_t` where the standard prints `RBW_{t−1}` (prior-year book value); RHS identical, subscript differs (Gl.9 + 10a).
- **FLL-Naturteich `splash_water_tank_volume`** — reference area includes submerged wall area the source (§10.3.1) excludes → over-sizes tank.
- **VSME market-based Scope-2 (EQ-B03-mkt*)** — rest on the VSME XBRL taxonomy, not §30 prose (which is location-based only). Provenance nuance for the map.
- **DWA-A-102-2 `q_A_Bem` (A1022-17)** — Bild-4 curve-fit, **no printed equation** → legitimate NR (source_quote left null; wants a `derived_from` note).

## G. Separate not-yet-done step (owner-gated by nature)
**Provenance-grade LIFT.** Every quote above is now in prod, but `verification_status` still reads `imported_unverified`.
Lifting quote-backed items to VA (and VC where OCR/markdown-only) would flip the UI "verified" badge — an enforcement-adjacent
display change, so it was deliberately NOT done. This is the natural next owner-ratified pass once these rulings are reviewed.
