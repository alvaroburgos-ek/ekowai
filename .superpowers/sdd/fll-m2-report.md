# FLL M2 Verification — Synthesis Report

**Run:** M2 worksheet-level verification of the three FLL standards live on prod (Supabase `vadsmshzebefjreqcicl`), branch `feat/fll-revision`, worktree `_wt-fll`.
**Sources:** 65 per-worksheet detail JSONs in `.superpowers/sdd/fll-m2/` + ledger `fll-m2-ledger.md`.
**Doctrine:** SR-1 (verbatim-only), SR-2 (surface ranges, never auto-pick), SR-3 (rendered PDF = ground truth), findings-over-fixes (everything staged written-not-applied; prod read-only). Nothing was written to prod in this run.

---

## 1. Coverage Table

Prod worksheet-template counts (verified live this run): FLL-GAR-2023 = **29**, FLL-Naturteich = **15**, FLL-TP-RHIZOM-2023 = **21** → **65 total**. Every template has a detail JSON → **100 % worksheet coverage, zero un-visited worksheets.**

| Standard | Worksheets visited / total | Chains run / attempted | Checks passed | Findings | Residue | Decisions |
|---|---|---|---|---|---|---|
| FLL-GAR-2023 | 29 / 29 | 56 / 57 | 153 | 54 | 63 | 84 |
| FLL-Naturteich | 15 / 15 | 26 / 34 | 119 | 27 | 37 | 37 |
| FLL-TP-RHIZOM-2023 | 21 / 21 | 46 / 46 | 149 | 45 | 47 | 55 |
| **GRAND TOTAL** | **65 / 65** | **128 / 137** | **421** | **126** | **147** | **176** |

Notes on the numbers:
- **Checks** are the per-worksheet check tally from the ledger (deduped: the ledger lists `FLL-GAR-21` twice — counted once).
- **Chains run/attempted**: the "attempted" denominator counts every chain object present in a detail JSON. The 9-chain shortfall (137 attempted → 128 run) is **NOT** a coverage gap — every shortfall is a chain that *could not be run because no computable/seedable path exists* (0-equation data-collection worksheets, un-seeded gate drivers), each logged as residue and, where a fix would enable it, as a decision. See §4.
- Chain shortfall breakdown (chains-not-run): GAR-17 (0/1); Naturteich FLLNT-01, -03, -04, -08, -14 (each 0/1), FLLNT-06 (3/4), FLLNT-09 (2/3), FLLNT-13 (1/2). RHZ = 0 shortfall (46/46).

**Coverage gap statement:** No worksheet was skipped. The only "gaps" are *un-runnable chains* within visited worksheets (all catalogued as residue), never an unvisited worksheet.

---

## 2. Findings Catalogue (grouped by standard)

Severity legend: HIGH = enforcement-defeating (dead/vacuous/misplaced gate, wrong-operand). MEDIUM = un-enforced source threshold / wrong clause anchor / duplicate-source / derivation gap. LOW/INFO/provenance = metadata, unit, label, or documentation-only.

Grade convention (SR-3): a finding whose quote is confirmed on the layout-preserved `pdftotext` extraction is **VA-grade**; findings resting only on the searchable markdown convenience text are flagged **VC** (see §4 residue R-markdown items). Unless a finding is listed in §4 as VC, its verbatim anchor was located in the `-layout` extraction this run (VA).

### 2.1 FLL-GAR-2023 (54 findings) — HIGH (3), MEDIUM (11), rest low/info/provenance

**HIGH**
- **GAR-01/F1** — `gate-topology / vacuous-block-gate (CR-006)`. Both block gates (REQ-02 `lbo_genehmigung_erforderlich IS NOT NULL`, REQ-03 `whg_einleitung_genehmigung IS NOT NULL`) test symbols that are fields of **FLL-GAR-03**, not GAR-01. Worksheet-local evaluator → never fire on GAR-01. *(VA — verified via prod field-owner join.)*
- **GAR-10/F1-DISCRIMINATOR-MISSING** — 9 of 11 gates (REQ-12,13,14,15,16,17,18,20,22) are shaped `IF abdichtungs_art == <material> THEN…`, but `abdichtungs_art` is **not a field on GAR-10**. Missing guard symbol → all 9 resolve `pending`, never fire. Only REQ-19/REQ-21 (attestation) can ever fire. CR-006 at scale. Quote: *"test 'FINDING — guarded gates are PENDING' PASS; field list has no abdichtungs_art symbol."*
- **GAR-10/F2-CROSS-WORKSHEET-FIELDS** — the same gate conditions reference `mz_durchlaessigkeit_kf`, `bauteildicke_cm`, `bentonit_type`, `peeh_dichte_g_cm3`, `feinkornanteil_063_pct` etc., **none of which are GAR-10 fields** — they belong to other material worksheets.

**MEDIUM**
- **GAR-04/F1** — REQ-06 ice-pressure gate does not parse (`if …: prose`) → always MANUAL, and `severity='warn'` → never enforced. Sec.4.4 ice-pressure protection captured but never checked.
- **GAR-12/F1** — 0 compliance_requirements despite Tab.6 hard minima `w/z<=0,60`, `Z>=280 kg/m³`, `fck>=C25/30`. Candidate gates driven PASS+FAIL through the REAL evaluator → fully evaluable, simply not encoded. Quote: `GAR.txt Tab.6 L2484-2489`.
- **GAR-13/F-1** — Asphaltbeton watertightness `Hohlraumgehalt <= 3 Vol.-%` + `Schichtdicke >= 40 mm` are captured but unguarded (0 gates). PDF: *"Asphaltbeton gilt als wasserdicht, wenn … Schichtdicke von mind. 40 mm … und … Hohlraumgehalt ≤ 3 Vol.-% aufweist."*
- **GAR-13/F-2** — 5 of 6 fields cite non-existent clause `§9.5` (chapter 9 has only 9.1/9.2/9.3.x); correct anchor is Sec.5.4.
- **GAR-17/F1-clause-ref-nonexistent** — all 6 Flüssigkunststoff fields cite `§9.9` which does not exist; content lives at §6.3/§6.3.1/Tab.23.
- **GAR-17/F2-haftung-unit-no-source-value** — `fk_haftung_untergrund` typed `N/mm²` but the standard gives only a *qualitative* bond requirement; a numeric threshold is implied that the source never prints.
- **GAR-19/F1** — `verzinkung_dicke_um >= 100 µm` (unlegiert) is validation-rule text only, no gate; note standard uses "soll" → any gate should be `warn` (SR-2 decision).
- **GAR-21/F1-clause-ref-9.13-nonexistent** — all 6 GUP fields cite a non-existent §9.13.
- **GAR-22/F-01** — `label-provenance-mismatch (PDF wins, SR-3)`: field LABELS contradict Anhang-2 symbol legend (`d_D`/`gamma_D_prime`/`g'` are the **Auflast**, encoded as "Dichtung"). Quote: `GAR.txt L6534 'dD  Dicke der Auflast [m]'`.
- **GAR-22/F-02** — `dead-gate`: REQ-23 references `freibord_zu_gelaende_cm`/`freibord_zu_bauwerk_cm`, neither a field on GAR-22; can never fire.
- **GAR-23/F-1** — freibord minima (`>=5`; `>=30`, reducible to `>=15` with adapted fastening) encoded ONLY as dead `validation_rules.raw` strings; PROVEN live a `3 cm` fail-state saved unblocked.
- **GAR-27/F1 & F2** — duplicate catchment-area field (`A` vs `A_einzugsflaeche`) and duplicate `C` field (`C` vs `C_abflusswert`); the `*_…` twins are dead w.r.t. equation Gl.1 (single-source violation).

**Notable LOW/INFO (GAR):** GAR-02/F-02 `gewaesser_in_scope` declared-derived but has no producer; GAR-07/F-3 `gefaelle_percent=120` persists (field validation is UI-only, save accepts out-of-range); GAR-08/F1+F2 fields are generic scaffold + wrong `§6` clause; GAR-11 F1-F4 (0 gates on a worksheet with Tab.3/Tab.5 thresholds, enum-as-freetext, single `mz_dicke` under-models two-layer spec); GAR-28/F-1 duplicate inspection-interval fields, F-2 `§16` is a FORM_TEMPLATE artifact.
GAR-22/F-03 is a **source-side** defect (PDF misprints `z_a` unit `[kN/m²]`; encoding correctly uses `[m]` — PDF wrong, encoding right).

### 2.2 FLL-Naturteich (27 findings) — HIGH (1), MEDIUM (4)

**HIGH**
- **FLLNT-03/F1-REQ07-DEAD-BRANCH** — REQ-07 condition `IF type∈{I,II} THEN share>50 AND IF type==III THEN share>30` parses (greedy AND) as `IF (I∨II) THEN (share>50 AND (IF III THEN share>30))`. For a **Type-III** pool the outer guard is false → whole gate **vacuously PASSES** → the `>30 %` regeneration-area rule is never evaluated. Live-proven with `type_III`.

**MEDIUM**
- **FLLNT-03/F2-ORPHAN-FIELD-type_III** — a Pass3c mis-parse leaked the enum token `type_III` into the Fields sheet as a spurious 5th "field".
- **FLLNT-06/F1** — 6 of 8 gates on FLLNT-06 (Flächenplanung) read symbols entered on **FLLNT-07** (construction); worksheet-local evaluation → pending on the planning sheet.
- **FLLNT-09/FLLNT09-F1** — `phantom-fields`: four enum-VALUE tokens (`emersed`, `submergent`, `vertical_continuous_overflow`, `vertical_no_overflow`) materialized as rows in the fields table (no section, wrong data_types).
- **FLLNT-14/F1** — `gate-over-enforces-source`: REQ-27 turns a "should"/conditional maintenance-contract obligation into an unconditional `must`.

**Notable LOW/INFO (Naturteich):** FLLNT-05/F1 unit `mg/kg` drops the "as P" qualifier (PDF: `mg P/kg`); FLLNT-06/F2 EQ-PUWS is an encoder-synthesized (non-verbatim) equation; FLLNT-08/F2 `service_description_provided` is an ungated block-candidate; FLLNT-09/F2 horizontal-filter path vacuously passes REQ-20/21; FLLNT-12/F1 quote-scope mismatch; FLLNT-13/F2 REQ-26 accepts-with-defects, F3 the verbatim "3 working days" notice rule is un-gated.
FLLNT-10/-11 are the DS-ceiling equations — see §4.

### 2.3 FLL-TP-RHIZOM-2023 (45 findings) — HIGH (6), MEDIUM (9)

**HIGH**
- **RHZ-02/FND-RHZ02-1** — block gate `wachstumshemmende_wirkstoffe != null` can never return `fail` (true→pass, false→pass, absent→pending) and the field `is_required=true` → always present. Dead gate, proven live.
- **RHZ-02/FND-RHZ02-2** — block gate `mehrschichtprodukt == false OR (schutzschicht_definition != null)` cannot return `fail` in any reachable state (evaluate.ts maps NULL/'' to missing → `!= null` never satisfiably false).
- **RHZ-05/FIND-RHZ05-1** — REQ-06 apparatus gate hosted on **RHZ-04** but every condition symbol (`gefaess_innenmass_*`, `anzahl_pruefgefaesse`, `widerlager_dicke_mm`…) lives only on **RHZ-05** → vacuous under worksheet-local lookup.
- **RHZ-07/F-01** — all 16 fields carry source-attested §5.7/§5.9-Tab.2 acceptance limits, yet **0 compliance_requirements** exist; an out-of-spec Gießwasser/Düngemittel passes silently (e.g. `Nitrat <= 50,0 mg/l`, `pH ∈ [6,0; 9,0]` unenforced).
- **RHZ-16/F1** — `wrong-operand`: REQ-18 references `dichte_relativ_prozent` (a **RHZ-13** field) instead of the 24-month `relativ_prozent_24mon`; project-wide fallback silently resolves the wrong (6-month) value into the 24-month endpoint gate.
- **RHZ-18/F1** — worksheet titled "Bewertung Rhizomfestigkeit (Gate)" holds the whole-standard pass/fail verdict `pruefergebnis_rhizomfest` but carries **0 compliance_requirements**; live saves of `nicht_rhizomfest` and `vorzeitig_abgebrochen` both returned `save.ok=true`. The "(Gate)" is vacuous.
- **RHZ-19/F1** — REQ-22's 4 §10 extension-condition symbols map to **RHZ-20**; live evaluator returned pending/missing for all 4.

**MEDIUM**
- **RHZ-06/F-1** — a "verification" worksheet with 0 gates: the 7 Tab.1 Sollbereiche (pH 6,0-7,5; N ≤50; P2O5 ≤25; K2O ≤100; …) are free-text only; `pH=8.0 / Salz=2.0` persisted clean live.
- **RHZ-08/F-1** — saveWorksheet **persists an out-of-enum** `testpflanze_art='typha_latifolia'` (only `phragmites_australis` is legal); no server-side enum-membership check. Quote: `RHZ-08 bad-enum save.ok: true error: null`.
- **RHZ-12/F-1 & F-2** — two misplaced/vacuous gates (CR-006).
- **RHZ-13/F1** — `producer-consumer-disconnect`: EQ-1 produces `bestandsdichte_p_avg` but REQ-15's ≥80 leg reads a separate hand-entered twin `bestandsdichte_p_avg_6mon`.
- **RHZ-14/F1 & F2** — relative-density (`ØP1–P8/ØK1–K3×100`, Tab.3) not encoded as an equation (free-entered `42` persisted where `86,667` is correct); 0 gates enforce the ≥120 / ≥80 % / test-abort rule.
- **RHZ-16/F2** — same missing-equation / hand-entered derived value (24-month).
- **RHZ-21/F2** — terminal conformity/signature worksheet with 0 gates: nothing enforces `pruefer_signatur_eingeholt=true` or a non-null final verdict before approval.

**Notable LOW/INFO (RHZ):** RHZ-01 (REQ-01 dead gate, `§8` mis-cite, all provenance NULL); RHZ-03/F1 cross-worksheet producer with only-vacuous consumer; RHZ-08/F-2 fixed "9 x 9" container encoded as free text; RHZ-11 enum-null-option; RHZ-15 F1-F6 (single-source, unenforced verdict, missing ≥160 gate, NULL provenance, `§Wuchsleistung` non-canonical clause, unit omission); RHZ-17/F1 Durchdringung-in-Arbeitsunterbrechungsfuge un-encoded; RHZ-20/F1 §10 "jedoch nur wenn" all-four-conditions extension rule unenforced.

---

## 3. ALVARO'S DECISION BATCH

Every item below needs a human ruling or an SR-2 range-selection. **None auto-decided, none skipped, none applied to prod.** 176 decision items were logged across the run; they cluster into the classes below. Each staged migration note is written-not-applied and batched for a single controlled apply pass.

### 3.A SR-2 range / threshold picks (never auto-picked)
1. **GAR-06/D2** — §4.6 gives quantitative bearing-capacity criteria `Ev2 >= 45 MPa`, `Ev2/Ev1 <= 2,5`, `DPr >= 97 %`. Keep the single boolean `baugrund_tragfaehig` (engineer attests) **OR** add numeric fields + a gate. *Ruling needed.*
2. **GAR-23/DI-1** — §4.8 building-case freeboard: **30 cm default, reducible to >=15 cm only with "angepasste Randbefestigungen."** The "adapted fastening" condition is not captured, so a valid 15 cannot be distinguished from a non-compliant one. Pick: enforce 30, or model the conditional 15. *Do not auto-pick.*
3. **GAR-19/D1** — galvanisation `>=100 µm`: standard says "soll" (should) not "muss." Gate as `block` or `warn`? *Ruling needed.*
4. **RHZ-06** / **RHZ-15/F3** / **RHZ-14/F2** — Tab.1 Sollbereiche and the ≥160 / ≥120 / ≥80 % density thresholds are source-firm but unenforced; decide whether each becomes a `block` gate, a `warn`, or a range-validation.
5. **GAR-07/F-1** — Tab.1 material-specific slope limits (1:1…1:5 / 20–100 %) — enforce per-material or leave manual?

### 3.B Staged clause-reference / provenance corrections (PDF-attested, written-not-applied)
6. **GAR-06/D1** — `setzungen_zu_erwarten`: `Sec.9.1` → `Sec.9.2` (verbatim source is §9.2, GAR.txt 5816-5819).
7. **GAR-03/F-GAR03-1,-2** — `lbo_/whg_genehmigung`: `Sec.4.2` → `Sec.4.1` (the LBO/WHG basis is §4.1).
8. **GAR-08/F2** — `§6` → §4.4 on all 7 fields.
9. **GAR-13/F-2** — `§9.5` → Sec.5.4 (5 fields).
10. **GAR-17/F1** — `§9.9` → §6.3/§6.3.1/Tab.23 (6 fields).
11. **GAR-21/F1** — `§9.13` → GUP source clause (6 fields).
12. **GAR-28/F-2** — `§16` → Abschnitt 13 (Instandhaltung, 4 fields).
13. **RHZ-01 / RHZ-02/F-3** — report/manufacturer fields cite `§8 (Auswertung)`; content is under §9 (Prüfbericht) / §6 (Probenahme). Retag.
14. **RHZ-15/F5** — `§Wuchsleistung` → `§3.7` (4 fields).
15. **Backfill `source_quote`** (many worksheets flagged `imported_unverified` with NULL provenance: GAR-03, GAR-13, GAR-19, RHZ-01, RHZ-09, RHZ-15…). Verbatim anchors now exist in the detail JSONs.

### 3.C Gate-topology / enforcement rulings (HIGH-severity, need a call)
16. **GAR-01/F1, GAR-10/F1+F2, RHZ-05, RHZ-16/F1** — misplaced / cross-worksheet gates: **move the gate to the worksheet that owns the fields**, or **add the discriminator field** (e.g. `abdichtungs_art` on GAR-10), or confirm reliance on the project-wide fallback is intended.
17. **RHZ-02/FND-1+2, RHZ-18, RHZ-21, RHZ-07** — dead/absent block gates on verdict / acceptance / final-conformity worksheets. Author enforcing gates? (RHZ-18/RHZ-21 gate the whole-standard pass/fail — highest priority.)
18. **FLLNT-03/F1** — fix the greedy-AND parse so the Type-III `>30 %` regeneration rule actually evaluates (split REQ-07 into two requirements).
19. **GAR-12/F1, GAR-13/F-1, FLLNT-13/F3** — author the fully-evaluable-but-unencoded threshold gates (Tab.6 concrete minima; Hohlraumgehalt≤3 %; 3-working-days notice).

### 3.D Data-model / single-source rulings
20. **GAR-27/F1+F2** — consolidate the duplicate area (`A` vs `A_einzugsflaeche`) and `C` (`C` vs `C_abflusswert`) fields to one source each.
21. **RHZ-13, RHZ-14, RHZ-15, RHZ-16** — introduce the relative-density equation (`ØP/ØK×100`) as a single registered producer instead of free-entered twins.
22. **GAR-11 enum-as-freetext, RHZ-08 fixed "9x9"/species, RHZ-11 enum-null** — convert source-closed option sets to source-locked enums.
23. **FLLNT-14/F1** — is REQ-27 meant to be unconditional (over-enforces the source "should")?

### 3.E DS-ceiling lift decision (see §4)
24. **FLLNT-11/F3** — the "NIE VA" ceiling on the DS equations (FLLNT-10 EQ-01, FLLNT-11 EQ-05) rested on "no PDF." A rendered PDF (2017 EN translation, `guidelines_for_..._natural_swimming_pools_2017`) **is now available**. **Decision: re-verify EQ-01/EQ-05 against the rendered PDF to lift them from the DS ceiling to VA**, or keep the ceiling.

---

## 4. Honest Residue (named, with WHY)

147 residue items were logged. They fall into the named classes below.

**R-DS — Naturteich DS ceiling (the doctrine-named item).**
FLLNT-10 EQ-01 and FLLNT-11 EQ-05 carry the equation-profiles note **`⚠ DS (kein PDF, DS-Decke, NIE VA)`** — a standing "Design-Storm / DS-Decke, never VA" ceiling asserting these equations can never reach VA because no rendered PDF backed them.
- FLLNT-11/F3 finds this ceiling is now **stale**: a rendered PDF (2017 EN translation) *does* exist, so the "kein PDF → NIE VA" premise no longer holds. **WHY still residue:** it was not re-verified against that PDF this run → the equations remain **VC** (markdown-derived) until a page-level re-render confirms them. Surfaced as decision 3.E-24. Both equations are additionally **inequality-as-producer** (`>=` with the LHS as `output_symbol`), correctly neutralized via `displayOnly:true` — recorded so the mitigation is not removed.

**R-trig — cos_beta / trig-blocked equation (engine gap, doctrine says do NOT fix).**
Exactly **one** genuine trig-blocked equation across all 65 worksheets: **GAR-22 Eq 2b** `g_prime >= (Δu*γ_A − (γ_F'*d_F + γ_Di'*d_Di)) / cos(beta)` (residue GAR-22/R-01). The arithmetic engine (`src/lib/eval/arithmetic.ts`) implements only min/max — no cos/sin/tan. The Mindestauflast-vs-uplift check **cannot be auto-evaluated → remains an engineer-manual check.** Engine NOT fixed per doctrine. (The ~21 other "trig" residue mentions are explicit **N/A** notes on 0-equation worksheets, recorded for completeness only — no trig math there.)

**R-markdown — markdown-only / VC-tier verifications (SR-3).**
Quotes read from the searchable `pdftotext`/markdown convenience extracts rather than a freshly re-rendered PDF page, hence **VC** until PDF-page-confirmed: **GAR-17/R3** (used `pdf/GAR.txt`), **FLLNT-06/R1** (`Naturteich.txt`), **FLLNT-12/R2**, **FLLNT-13/R3** (§11.1 "3 working days", §12.4 repairs). Everything else was confirmed on the `-layout` extraction and treated VA. RHZ-08/R-1 explicitly confirms **no** VC values on that sheet (both PDF-VA).

**R-noeq — un-runnable / no-computable-chain (the chain shortfall from §1).**
0-equation data-collection or attestation worksheets have no formula to drive; only a persistence round-trip is possible (logged VC). GAR-05, -06, -15, -16, -17, -18, -20 and Naturteich FLLNT-07, -08 etc. carry this. **WHY residue not gap:** there is no numeric ground truth to assert VA against — expected for data_collection.

**R-seeder — un-seeded gate drivers (fixture gaps, not prod defects).**
The harness seeder omits fields that prod has, so some gates could not be driven end-to-end through the REAL `saveWorksheet` and were fired against the real evaluator with a synthetic lookup instead: **FLLNT-13/R2** (`attest_fllnt_13_req_28` not seeded → REQ-28), **FLLNT-12/F2** (`attest_fllnt_12_req_25`), **FLLNT-10** SCHEMA-DRIFT (prod 17 fields incl. `F_filter`/`h_filter`; seeder 15), **FLLNT-11/R2** (`swimming_area_m2` on RHZ-10 in seeder vs FLLNT-11 in prod). Each has a written-not-applied seeder-fix decision (e.g. FLLNT-13/D1).

**R-serverengine — FLL equations are not server-computed (structural).**
FLLNT-11/R1: the server materialize path (`materialize-asm` / `basin-governing` / `tab6-loading`) is **DWA-A-138/basin-only**; FLL-Naturteich equations are NOT server-materialized, so EQ-04/EQ-05 outputs are client-computed. Chains were driven by writing the derived output directly. Structural limitation, logged, not fixed.

**R-informative — non-normative source.**
GAR-22/R-03: Anhang 2 (the whole Flächengewichtsberechnung) is labelled "(informativ)" in the standard (GAR.txt L318/L6476/L6514) → all three equations inherit informative status; no printed worked example exists (R-02) so chains 2a/2c are VC illustrative.

---

## 5. Raw Output Excerpts (backing the headline claims)

**Prod worksheet counts (live, this run):**
```
FLL-GAR-2023        standard b252ce89-…  template_count 29
FLL-Naturteich      standard c11f0e54-…  template_count 15
FLL-TP-RHIZOM-2023  standard d0a661ab-…  template_count 21
```

**Ledger totals (deduped; GAR-21 listed twice, counted once):**
```
FLL-GAR-2023:       ws=29 chainsRan=56 checks=153 findings=54 residue=63 decisions=84
FLL-Naturteich:     ws=15 chainsRan=26 checks=119 findings=27 residue=37 decisions=37
FLL-TP-RHIZOM-2023: ws=21 chainsRan=46 checks=149 findings=45 residue=47 decisions=55
GRAND: ws=65 checks=421 findings=126 residue=147 decisions=176   (DUP in ledger: FLL-GAR-2023::FLL-GAR-21)
```

**cos_beta-blocked equation (GAR-22 Eq 2b), verbatim from detail JSON:**
```
"formula":"g_prime >= (Delta_u * gamma_A - (gamma_F_prime * d_F + gamma_Di_prime * d_Di)) / cos(beta)"
R-01: "arithmetic engine implements only min/max, no cos/sin/tan. Trig-blocked per doctrine — engine NOT fixed.
       The Mindestauflast check against uplift cannot be auto-evaluated; remains an engineer-manual check"
```

**DS ceiling note (FLLNT-10 EQ-01 / FLLNT-11 EQ-05):**
```
F3 (provenance, SEV-2): STALE 'NIE VA' CEILING. equation-profiles notes … declare
  '⚠ DS (kein PDF, DS-Decke, NIE VA)'. A render PDF (2017 English translation) IS now [available]
```

**Enum-bypass proof (RHZ-08):**
```
RHZ-08 bad-enum save.ok: true  error: null / persisted testpflanze_art: "typha_latifolia"
```

**RHZ-18 vacuous "(Gate)" proof:**
```
compliance_requirements query for worksheet_template c2ead780-… returned [].
Live FAIL/ABORT saves ('nicht_rhizomfest', 'vorzeitig_abgebrochen') both returned save.ok=true.
```

**Sample passing harness chain (GAR-06):**
```
✓ drives the data-collection fields through the REAL saveWorksheet and persists them 454ms
✓ re-save with opposite booleans overwrites (no post-approval lock on data-collection) 9ms
Test Files 1 passed (1) · Tests 3 passed (3)
```

---
*Data-integrity note: `FLLNT-13.json` had a missing `}` in its residue array (malformed JSON); repaired in place to parse. `FLLTP-RHZ-02.json` stores `worksheet` as an object (vs string elsewhere) — normalized on `.code` during synthesis. Both are file-shape quirks, not verification findings.*
