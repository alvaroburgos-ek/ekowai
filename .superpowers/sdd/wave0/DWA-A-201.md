# Wave-0 triage — DWA-A-201 (Abwasserteichanlagen)

- **Standard id:** `353e4f03-8f29-46c1-b617-31bd3561d231` (DWA-A 201, August 2005, korr. Dez 2011)
- **PDF:** `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-201\dwa_a_201 (1).pdf` — pdfStatus=**text**, offset **0** (printed = physical; verified p.8→8, p.9→9, p.10→10, p.12→12).
- **Map:** `Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-201\` (67 nodes + _index).
- **Nodes:** 67 — sections 21, equations 20 (F-17 gap), CR 14, tables 2, documents 5, decision-points 5.
- **Provenance:** VA 48 / VC 5 / NR 8 / EV 6. **belowVA = 19.**

## Findings (by class)
1. **greedy-AND (1)** — CR-006 (`IF vorstufe THEN A_EW>=8 AND IF !vorstufe THEN A_EW>=10`): no-settling `>=10` branch is a dead branch → vacuous PASS for `absetz_vorstufe=false`. Same class as FLL-Naturteich REQ-07.
2. **mis-owned / phantom-field gate (3)** — CR-006, CR-007, CR-009 attached to **A201-08** but gate on symbols owned by A201-10 / A201-11 / A201-14 respectively → symbols never resolve on the owner sheet → gates dead.
3. **verdict-as-producer / #22 (1)** — CR-010 THEN `dichtung_erforderlich == true` reads a hand-enterable boolean verdict; the derived answer `sealing_required` (F-18) is ignored.
4. **standard-fixed-as-editable-input (1)** — `k_f_sealing_threshold` (1e-8) + `k_f_polishing_threshold` (1e-7) are the fixed §5.8 constants (Tab.§5.8, p.14) leaked into A201-15 as UI-editable `engineer_input` fields (validator inv. #3).
5. **range-as-producer / SR-2 (2)** — F-14 `P_R between 1 and 3` emitted as scalar; CR-007/CR-009 enforce ranges (P_R 1-3, h/t_R schoenung 1-2) as silent pass-bands; Tab.§7 range rows.
6. **inequality/verdict-as-producer equation class (12)** — F-01,03,04,06,07,08,10,11,12,13,15,16,18,19,20 name an LHS/boolean as `output_symbol` of a `>=`/`<=`; arithmetic engine returns the RHS threshold, declared output never produced (displayOnly required).
7. **F-4 var-vs-var non-enforcement (1)** — CR-014 `BSB5_ablauf<=BSB5_grenzwert AND CSB_ablauf<=CSB_grenzwert`; both grenzwert operands are empty engineer_input fields (AbwV limits not encoded) → vacuously satisfiable.
8. **duplicate output_symbol / single-source (1)** — `A_EW_unbelueftet` produced by both F-07 (>=10) and F-08 (>=8); conditional not modelled in the equation.
9. **numbering gap (1)** — equation F-17 absent from the encoding (F-16 → F-18).

## Below-VA list (19)
- **NR (8):** section-a201-16 (§6 ATV-A 128), section-a201-20 (§8.9 AbwV limit), cr-a201-011 (ATV-A 128), cr-a201-014 (AbwV), doc-atv-a-128, doc-din-en-12255-3, doc-dwa-a-198, doc-abwv.
- **VC (5):** eq-a201-f05 (0,3 l/d line not isolated), cr-a201-002 (EW<=5000 no source_quote), cr-a201-012 (DIN 18130-1 "drei Proben" not wired), cr-a201-013 (§8.2/§8.5 minima no source_quote), dp-a201-phantom-fields.
- **EV (6):** section-a201-04, -06, -07, -13, -17, -21 (data-collection / summary sheets, no printed scalar).

## Dead gates (4)
CR-006, CR-007, CR-009 (mis-owned → non-firing), CR-014 (var-vs-var, both operands empty → cannot fail). CR-006 is doubly dead (mis-owned + greedy-AND). CR-011/CR-012 excluded (attestation gates).

## Missing-doc dependencies
- **Out-of-library (in_library:false):** ATV-A 128, DIN EN 12255-3, DWA-A 198, AbwV Anhang 1.
- **In-library (resolves):** DIN-18130-1 (confirmed encoded standard).

## Tier
**fix-first** — source-rich, offset-0 PDF fully readable, 48/67 VA; but 4 non-firing gates + 1 greedy-AND dead branch are structural defects to repair before a harness run. Not acquisition-blocked (only genuine gate blocked on a not-in-library doc is CR-011/CR-014 attestation/limit; DIN 18130-1 is in-library).
