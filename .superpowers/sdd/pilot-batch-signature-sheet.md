# PILOT decision batch — signature-ready sheet (DIN-18130-1 + DWA-A-102-2)

**Date** 2026-07-24 · **Prod** `vadsmshzebefjreqcicl` (READ-ONLY, no writes this run) · **Work** `C:\Users\Ekowai\_wt-fll`
**Doctrine** `docs/verification-doctrine.md` (SR-1..4 read in full). This sheet is what Alvaro signs in ONE pass;
every item carries its verbatim source quote + PDF page. Write-back to maps/prod happens AFTER signature.
**Sources:** DWA-A-102-2 `Desktop\Share\Regulations\DWA\DWA 102-2\DWA-A_102-2_Part{1..4}.pdf` (offsets P1 −1 / P2 +24 /
P3 +49 / P4 +74; all `page` below = PRINTED). DIN-18130-1 `Desktop\Guidelines\DWA DIN Scribd\DIN-18130-1\DIN-18130-1.pdf`
= **SCANNED (0 extractable chars, 20 form-feed pages)** → its quotes are the map-recorded VA reads from the pilot's
pdftoppm PNGs (flagged as residue R-DIN below).

---

## PART 1 — THE RECONCILIATION (the gating verdict)

**Where "22" is stated.** The "22" is NOT a durable count in the two pilot reports or the program report — in those
docs "22" only ever refers to KOSTRA-DWD-2020's 22 NR dependents (acquisition list) and "22 gap-equations". The
**"22-item pilot decision batch / 16 enumerated (R-8 + C-5 + T-3)"** framing comes from the sweep-close-out brief, which
asserted 22 and asked to reconcile against what the maps actually contain.

**What the maps actually contain (ground truth, enumerated from the node files).**
The pilot decision batch = the **decision-point nodes + finding items** in the two maps:

| Map | decision-point nodes | finding items | subtotal (named) |
|---|---|---|---|
| DIN-18130-1 | dp-01, dp-02, dp-03 (3) | F-1 (Gl.9 `ln` engine gap) (1) | **4** |
| DWA-A-102-2 | dp-01, dp-02, dp-03, dp-04 (4) | F-1, F-2, F-3, F-4, F-5, F-6 (6) | **10** |
| | | | **14 named items** |

(DIN pilot's F-2 = validator regex, F-3 = map-hygiene wikilink, F-4 = "no server-materialize" — these are TOOLING notes,
not source-decision items for Alvaro, so they are correctly NOT in his batch. Only DIN F-1 is a decision item.)

**RESOLUTION — the missing 6 are (a)+(c), NOT a real omission and NOT 22 real items. The true total is 16, and 22 was an over-count.**
The reconciliation is exact once two expansions are undone:

1. **F-4 is ONE finding but governs THREE gates** (REQ-17, REQ-22, REQ-24). Counting each gate as its own line turns 1 → 3
   (**+2**). Alvaro must rule on all three, so they ARE three signature rows — but they are ONE finding, not three findings.
2. **F-1 spans TWO standards** (DIN-18130-1 Gl.9 + DWA-A-102-2 REG-Bild4). REG-Bild4 is ALSO F-6 and dp-03 — i.e. the same
   A-102-2 node is reachable under three labels. Counting the label crossings inflates the tally (**+~4**).

Adding the F-4 gate-expansion (+2) and the DP↔finding label overlaps to the 14 named items reproduces the mis-stated ~22.
**Enumerating every DISTINCT signature row that needs a ruling/quote yields 16** (below): **R-8 + C-5 + T-3 = 16.**
The "16 enumerated" in the brief was therefore CORRECT; the "22" was the raw label-crossing count and is **corrected to 16**.
No real map item is omitted — the "missing 6" are (a) F-4's 2 extra gate-lines re-folded under one finding + (c) findings
(F-1/F-6/dp-03 and F-2/F-5) that collapse onto shared nodes or the T tally rather than being 6 additional distinct items.

**CORRECTED TRUE TOTAL = 16 distinct signature items (R-8 · C-5 · T-3).** 22 is withdrawn with the evidence above.

---

## PART 2 — THE SIGNATURE TABLE (grouped R → C → T)

Legend — R: severity ruled by the quoted modal (muss/ist/hat = BLOCK; soll/sollte/empfohlen = WARN).
C: classification (binds "gelten/einzuhalten" vs exemplary "Beispiel/z. B./Anhang"). T: approved outright.

### R-items (8) — severity governed by the source modal

| # | std | node | R | item | verbatim quote + page | modal → reading |
|---|---|---|---|---|---|---|
| R-1 | A-102-2 | cr-req-22 (F-4) | R | η_ges ≥ η_erf block gate | "Der Gesamtwirkungsgrad η_ges **muss** mindestens dem erforderlichen Wirkungsgrad η_erf nach [Gl. 6] entsprechen." — **p.34** | **muss → BLOCK** (confirm; + F-4 code bug: var-vs-var RHS silently mis-evaluates, gate never enforces) |
| R-2 | A-102-2 | cr-req-17 (F-4) | R | V_s ≥ V_S,min block gate | Tab.6 row 40: "Erforderliches flächenspezifisches Speichervolumen  V_s = MAX(H1/(e_0+6)·H2; V_S,min)"; row 39: "Flächenspezifisches Mindestspeichervolumen  V_S,min = 5 m³/ha … vorgegeben." — **p.51 / p.36** | floor is **fixed 5 m³/ha (vorgegeben) → BLOCK** on the ≥ floor; + F-4 code bug (same silent non-enforcement) |
| R-3 | A-102-2 | cr-req-24 (F-4) | R | m ≥ m_min (=7) block gate | Gl.[34] "m = (C_T,MV − c_e,MV)/c_e,MV"; worked ex. "= [600 − 45]/45 = 555/45 = 12,3 **> 7**"; nearby modal: "Ihre „verdünnende Wirkung" **sollte** keine … Verbesserung … bewirken." — **p.53** | m_min=7 appears only in a **Zahlenbeispiel**, surrounding modal **sollte → WARN/ambiguous** — ruling needed whether the 7-floor binds; + F-4 code bug |
| R-4 | A-102-2 | dp-01-sr2-ranges | R | V_s ≤ 40 m³/ha cap severity | "Überschreitet das nach 7.3.2 ermittelte spezifische Speichervolumen V_s den Wert von 40 m³/ha … **sollte** … die Umsetzung alternativer … Maßnahmen … geprüft werden." — **p.51** | **sollte → WARN** (not a hard block; SR-2 range engineer-visible, 40 = upper guidance) |
| R-5 | A-102-2 | dp-02-unratified-severities | R | 30 CRs (12 block / 18 warn) severity ratification | encoded severities unratified; core Nachweise per §7.3/§5.2.3.2; representative binding modal p.34 (R-1) vs guidance "sollte" p.51 (R-4). Per-gate quote lives on each cr-req node. — **p.34 (index)** | ratify block-vs-warn **per gate** against each gate's own modal; area-balance REQ-04/06/07 + RKB REQ-11 flagged block |
| R-6 | DIN-18130-1 | dp-03-alpha-source | R | α source: continuous Gl.(6) vs discrete Tab.2 (SR-2) | map VA quote: "Gl.(6) α = 1,359/(1+0,0337T+0,00022T²)  AND Tab.2 discrete α(5/10/15/20/25); both Seite 5" (α(10)=1,000 formula↔table agree) — **Seite 5 (scanned, R-DIN)** | not a block/warn but an SR-2 **which-source-governs** pick; continuous = derived source, Tab.2 = range/lookup |
| R-7 | DIN-18130-1 | cr-din18130-03 (via dp-02) | R | Versuchsklasse {1,2,3} enum vs derived | map: "Tab.4 defines Versuchsklasse 1/2/3 by saturation/stationary-flow; CR-03 hard-codes versuchsklasse IN {2,3}" — **Seite 8 (Tab.4, scanned, R-DIN)** | ruling: free engineer enum (engineer_input) vs DERIVED from DIN 18137-2 saturation (→ #22-class if derived); NR until DIN 18137-2 acquired |
| R-8 | DIN-18130-1 | eq-gl9-k-fall (F-1) | R | falling-head k compute chain severity | map VA quote: "k = (a·l_0)/(A·t)·ln(h_1/h_2)  (Gl.(9), Seite 16; Versuch mit veränderlichem hydraulischen Gefälle)" — **Seite 16 (scanned, R-DIN)** | formula VA; `ln()` unsupported → fails loud. Ruling: add `ln` to engine, OR ratify falling-head k = engineer-entered+attested (WARN/attest) |

### C-items (5) — classification: normative vs exemplary

| # | std | node | C | item | verbatim quote + page | binds / exemplary |
|---|---|---|---|---|---|---|
| C-1 | A-102-2 | dp-03-bild4-regression / eq-regbild4 (F-6) | C | q_A,Bem(η_ges) = fitted ln-curve vs graph | "Bild 4: Gesamtwirkungsgrade η_ges von Regenklärbecken für AFS63 in Abhängigkeit von … qA,Bem … r_krit = 15 l/(s·ha), Beckentiefe 2 m (**Quelle: SCHMITT 2018**)." — **p.41** | **exemplary/external** — a GRAPH from SCHMITT 2018, coeffs −8.333/−1.6629 NOT printed in the standard → non-VA (fit + `ln`); rule (a) registered aggregator w/ Zusatzdatei oracle or (b) engineer-read-off-graph |
| C-2 | A-102-2 | eq-18-e0 (F-3) | C | Gl.(18) e_0 two-sided formula | "Mit den CSB-Standardwerten C_R,CSB = 107 mg/l und C_KA,CSB = 70 mg/l resultiert Gl. (18): e_0 ≤ (107 − 70)/(C_e,CSB − 70) · 100 = 3.700/(C_e,CSB − 70)  in %  (18)" — **p.49** | **binds** (Bestimmungsgleichung, definitional) — normative formula; classification-clean. The two-sided `≤ … = …` DB string is the F-3 data-hygiene defect (split RHS), not a normativity question |
| C-3 | A-102-2 | dp-04-kostra-hna | C | h_Na source (defers to DWD/KOSTRA) | "Die Jahresniederschlagshöhe h_Na **sollte** möglichst von einer ortsnahen Regenstation … [nach DWD 30 Jahre] entnommen werden."; range "600 mm/a ≤ h_Na ≤ 1.200 mm/a" — **p.84 / p.85** | **binds via external doc** — §8.3.2.1 defers to DWD/KOSTRA-DWD-2020 (out of library → NR). Governing value is in the referenced doc; acquire to lift Gl.2/13/14/15/16 off NR |
| C-4 | DIN-18130-1 | dp-01-worked-examples | C | §9 Anwendungsbeispiele exemplary vs binding | map VA quote: "Sec 9 worked ex. constant-head k=2,745·10⁻⁴, k_10=2,1·10⁻⁴ m/s; falling-head k_10=3,77·10⁻⁹ m/s (Seite 16–20)" — **Seite 16–20 (scanned, R-DIN)** | **exemplary** — worked "Anwendungsbeispiele"; compute ORACLES only, never encoded as standard_fixed (encoding one would violate SR-1) |
| C-5 | DIN-18130-1 | dp-02-versuchsklasse | C | Tab.4 Versuchsklasse table normativity | map: "Tab.4 defines Versuchsklasse 1/2/3 by which saturation/stationary-flow conditions are met" — **Seite 8 (scanned, R-DIN)** | **binds** (definitional classification table) — but WHICH class applies is the R-7 enum-vs-derived question; table itself is normative |

### T-items (3) — approved outright (technical / engine-gap, one-line basis)

| # | std | node | T | item | verbatim quote + page | basis |
|---|---|---|---|---|---|---|
| T-1 | A-102-2 | eq-4/eq-b5/eq-b17/eq-26 (F-2) | T | `Sum()` aggregator engine gap | encoded formulas use `Sum()` over an index (Gl.4/B.5/B.17/Gl.26); engine has no summation → fails loud (never fabricates) | pure engine capability gap, no source ambiguity — approve the CODE add of a summation aggregator |
| T-2 | A-102-2 | eq-t6vs/eq-6/eq-t6af/21b/b23b (F-5) | T | `Max(a; b)` semicolon separator | prod stores `Max(a; b)`/`Min(a; b)` with **semicolon**; engine expects `,` and normalize-formula mangles the paren → fails loud | data-hygiene: swap `;`→`,` (+ harden normalizer); mechanical, no source ruling — approve |
| T-3 | A-102-2/DIN | eq-regbild4 / eq-gl9 (F-1 `ln`) | T | `ln()` arithmetic-engine gap | `q_A,Bem = −8.333·ln(η_ges) − 1.6629` (A-102-2 p.41) and Gl.(9) `…·ln(h_1/h_2)` (DIN Seite 16) both need `ln`; engine min/max only | approve adding `ln` to `arithmetic.ts` (the enabling half of R-8 and C-1); code-only, no source decision |

---

## PART 3 — RESIDUE (honest, named)

- **R-DIN (scanned-PDF residue).** DIN-18130-1's PDF has **no text layer** (0 extractable chars, 20 form-feed pages,
  confirmed this session via `pdftotext -layout`). Items R-6, R-7, R-8, C-4, C-5 therefore carry the **map-recorded VA
  quote** (read in-pilot from pdftoppm PNGs, page-referenced) rather than a fresh in-session text extraction. Per SR-3 the
  rendered PDF is ground truth and the map's VA quote is the standing record; a fresh pdftoppm re-render is the only way to
  re-read these verbatim in a new session. Flagged, not hidden.
- **C-3 / dp-04 (NR by acquisition).** h_Na's governing value lives in KOSTRA-DWD-2020 / DWD (not in library). The A-102-2
  page (p.84) quotes only the DEFERRAL + the 600–1200 mm/a range; the point value cannot be source-VA until the doc is acquired.
- **R-5 per-gate quotes.** The 30-CR severity ratification (R-5) is one signature line but is backed by per-gate verbatim
  quotes on each `cr-req-*` node; only the two representative modals (p.34 muss, p.51 sollte) are inlined here.

*No writes to maps or prod this run. All A-102-2 quotes are fresh `pdftotext -layout` reads this session (P2/P3/P4);
all DIN quotes are map-recorded VA (scanned-PDF, residue R-DIN). 22 → corrected to 16 with the evidence in Part 1.*
