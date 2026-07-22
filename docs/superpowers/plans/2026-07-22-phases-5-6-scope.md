# DWA-A-138-1 Phases 5–6 (A138-24…28) — Scope + Build Plan + Ratification Bundle

**Status:** SCOPING ONLY — no code. Guideline (DWA-A 138-1) is ground truth; every claim cites §/Gl/Tab.
Source: `Desktop/Guidelines/DWA-A-138-1/DWA-A_138-1_WD (5).md` (+ `.pdf`). Prod encoding read from Supabase `vadsmshzebefjreqcicl` 2026-07-22 (read-only, Management-API).
Precedent: `.superpowers/sdd/phase4-progress.md` — server volume-materialize + `displayOnly` on required eqs; `phase_N_gate_result` = ENGINEER-ENTERED enum gated by a `block` REQ; `facilitySummaryInputs` aggregation; embedded-PG real-save-path harness (`tests/harness/`).

Worksheet phases (DB `phase` column): A138-24/25 = Phase 5; A138-26/27/28 = Phase 6.
Standard's own spine: §5.3.3 Bemessung → §5.3.4 Überflutungsnachweis → §7.4 Dokumentation → §8 Betrieb. **There is NO operation/Betrieb (§8) worksheet in 24–28** — the encoded scope stops at documentation + final sign-off. §8 (Betrieb/Wartung/Betriebshandbuch) is *unencoded*; not in this scope, flagged below as a coverage note only.

---

## 1. Per-worksheet scope (24–28)

### A138-24 — "Kombinierte Ergebnis-Zusammenstellung" (Phase 5, archetype `summary`)
- **Role (cited):** Results compilation — preliminary→final parameter roll-up. Fields are the *final* design values: `A_C_final`, `q_S_AC_final`, `Q_S_final`, `V_VA_final`, `design_basis_final` (einfaches_verfahren / nachweisverfahren, §5.3.3.2/.3), `facility_type_final` (7 types §6.2–6.8), `kostra_design_T_n`, `flood_check_required_final`, `geometry_final_summary`, `compilation_completion_date`.
- **Equations owned:** NONE. Pure display/compile worksheet. `q_S_AC_final` / `Q_S_final` / `V_VA_final` are the FINAL values, echoing the Phase-3/4 outputs; no local Gl.
- **Materialize:** None inherently. BUT the "final" scalars mirror the summary-layer values persisted by the A138-23 aggregator (Phase-4 F/G1 fix). If A138-24 is to auto-inherit them (not re-enter), it needs a **read-by-reference wiring** (single-source invariant), not a materialize. See build plan; likely an aggregator/inherit-field job → in-layer.
- **Compliance:** A138-REQ-20 (`block`, `attest_a138_24_a138_req_20 == True`, clause 5.3.3.7). Attestation gate — engineer confirms the compilation. Source quote (§5.3.3.7): "…die Bemessungsgrößen sind vom Planer zusammenzustellen und zu verifizieren." **Match: OK.** Attestation-style block is consistent with A138-15 REQ-18 precedent.
- **Gate-wiring:** none (no phase gate on 24).

### A138-25 — "Bemessungs-Eignungsprüfung" (Phase 5, archetype `verification`)
- **Role (cited):** FINAL adequacy re-check of Gl.9 `q_S,AC ≥ 2 l/(s·ha)` with the *final* A_S,m. Fields: `design_adequacy_result` (enum PASS/FAIL/NA), `qsac_value_verified` (number), `qsac_geq_2_check`, `f_Z_appropriate_check`, `mhgw_clearance_ge_1m_check`, `qf_validation_complete` (booleans), `verification_completion_date`, `verification_notes`.
- **Equations owned:** NONE encoded. The Gl.9 re-verification (`q_S,AC = (k_i·A_S,m·1000 + Q_Dr)/AC·10⁴ ≥ 2`, §5.3.3.7) is described in the worksheet `description` but is not a stored equation row; `qsac_value_verified` is an entered/echoed number. **FINDING S1 (minor):** Gl.9 is the governing adequacy formula (already an owned eq on A138-10/Phase-3 REQ-15) but A138-25 has no equation + `design_adequacy_result` is a bare entered enum with no derived-recommendation companion. Phase-4 precedent (D3) attaches a *recommended verdict + reasons* to entered gates; A138-25 has neither. → ratification Q (R2).
- **Materialize:** none (echoes q_S,AC; the value is a Phase-3 output). If a recommended `design_adequacy_result` is wanted, that's an aggregator+2-field job like A138-23 (in-layer).
- **Compliance:** A138-REQ-21 (`block`, `design_adequacy_result == 'PASS'`, §5.3.3.7). Source: Gl.9 `q_S,AC ≥ 2`. **DIVERGENCE FINDING S2:** the condition hard-requires `== 'PASS'`, but the enum has a legitimate `NA` value (e.g. drossel-only / Nachweisverfahren cases). A `NA` result → gate FAILS (block). Phase-4 REQ-21 (Gl.25) precedent made the analogous gate *applicability-conditioned* (N/A → pending, not fail). If `NA` is a real design outcome here, `== 'PASS'` over-blocks. → ratification Q (R2b): should be `design_adequacy_result IN {PASS, NA}` (mirroring the flood REQ-23 `IN {PASS, NA}` shape) unless NA is disallowed at final adequacy. Source is ambiguous → ratify, don't guess.
- **Gate-wiring:** none (verification, not a phase gate).

### A138-26 — "Überflutungsnachweis" (Phase 6, archetype `verification`)
- **Role (cited):** Flood-retention proof V_Rück per **Gl.10**, triggered when **AC > 800 m²** (§5.3.4.1, DIN 1986-100). Source verbatim (line 1498): "…muss ein Überflutungsnachweis nach DIN 1986-100 erbracht werden, wenn der Rechenwert AC … größer als 800 m² ist." Default frequency n=0,033/a (T_n=30a); T_n=100a if >70% roof/non-floodable (line 1528).
- **Equation owned:** **Gl.10** (`V_Rueck = ((r_D(T_n_Ue)·(Σ(A_E_b_a·C_S)+A_VA)/10000) − (Q_S+Q_Dr))·D·60/1000 − V_VA ≥ 0`), §5.3.4. Iterative over D; negative → V_Rück=0 (source line 1528 Anmerkung). Fields: `V_Rueck`, `r_D_30`, `A_E_b_a_flood`, `C_S`, `A_VA`? (A_VA not a stored field — see gap), `Q_S_flood`, `Q_Dr_flood`, `D_flood_min`, `T_n_Ue`, `flood_check_result` (enum).
- **Materialize:** **YES — Gl.10 is the Phase-4 pattern.** V_Rück is a client-uncomputable swept value (iterative over D, KOSTRA r_D(30)) → same server-materialize + `displayOnly` treatment as the facility volumes (F/G1). Client eval of Gl.10 can't resolve the swept D → would write null → clobber (Finding-H class). **BUILD REQ:** server-materialize V_Rueck + mark Gl.10 `displayOnly`; prove through real-save-path harness (STANDING RULE, phase4-progress 2026-07-20).
- **Field-home gap FINDING S3:** Gl.10 consumes `A_VA` (überregnete Fläche der Anlage) but A138-26 has NO `A_VA` field (fields list has A_E_b_a_flood, C_S, Q_S_flood, Q_Dr_flood, D_flood_min, T_n_Ue, r_D_30, V_Rueck only). A_VA must resolve cross-worksheet (inherit) or the eq is dead. Verify makeGateLookup/inherit resolves A_VA; if not → field-home re-encode. Also `V_VA` term → inherits from the facility summary (V_VA_final on A138-24 / A138-23). Confirm at build (in-layer if inherit resolves; re-encode if not).
- **Compliance (4 block rows):**
  - REQ-22 (`IF flood_check_trigger == TRUE THEN V_Rueck IS NOT NULL`, §5.3.4.1). Applicability-guarded (AC≤800 → not triggered → pending). **Match: OK**, correct modal reading (conditional block, like Phase-4 REQ-22 shape). BUT trigger symbol `flood_check_trigger` — verify it's derived from `A_C > 800` somewhere; if no producer, the guard never fires. **FINDING S4:** confirm `flood_check_trigger` has a home/producer (AC>800 test). Likely needs a derived boolean (`flaeche > 800`) — in-layer aggregator or a Gl-less computed field.
  - REQ-23 (`flood_check_result IN {PASS, NA}`, §5.3.4). **Match: OK** — verdict gate; NA when AC≤800.
  - REQ-24 (`attest_a138_26_a138_req_24 == True`, 5.3.4.1). Attestation "schadloser Verbleib". Quote matches (line 1530). **OK.**
  - REQ-26 (`attest_a138_26_a138_req_26 == True`, 5.3.4.1). Title = "Approvals collected per Section L". **DIVERGENCE FINDING S5 (encoding bug):** the stored `source_quote` for REQ-26 is the **Gl.10 D-iteration Anmerkung** ("Die Ermittlung der maßgeblichen Dauerstufe D … iterativ …; V_Rück=0 gesetzt") — which is about D-iteration, NOT about approvals/Section L. Title↔quote↔clause mismatch. The quote was mis-pasted at encode time. → ratification/re-encode item R4 (fix the source_quote, or re-scope the requirement to what it actually attests).
  - **REQ-25 is NOT on A138-26** — it lives on A138-01 (attest 5.1). No gap, just noting the non-contiguous numbering (REQ-25/27/29 are all A138-01 attestations).
- **Gate-wiring:** none (verification). Feeds A138-28 final verdict.

### A138-27 — "Abweichungsanalyse und Design Review" (Phase 6, archetype `verification`)
- **Role (cited):** Deviation analysis + design review. Documents prelim↔final deltas + residual risk. Fields: `preliminary_vs_final_A_C_dev_pct`, `preliminary_vs_final_storage_dev_pct`, `qsac_deviation_from_threshold`, `qsac_deviation_from_threshold`, `design_review_status` (enum), `design_review_reviewer`, `design_review_date`, `design_review_comments`, `corrective_actions_required` (bool), `corrective_actions_description`.
- **Source basis:** WEAKEST source anchoring of the five. There is no dedicated §"deviation analysis" clause; the closest source support is §7.4 Dokumentation (line 2315: plan, maintenance/operating notes, approvals, "von der zuständigen Person … erstellt") + the general iterative-design ethos. **FINDING S6:** A138-27 is a *good-practice* review worksheet with no hard modal ("muss") source clause — consistent with it carrying **ZERO compliance requirements** (confirmed: no REQ rows). This is correct/defensible (no over-encoding of a soft requirement). No gate. No materialize (all entered/echoed deltas).
- **Equations owned:** NONE. Deviation percentages are entered or could be derived (final−prelim)/prelim — currently entered numbers. Optional: derive the 3 dev_pct fields (in-layer aggregator) — nice-to-have, not source-mandated.
- **Compliance:** NONE. **Match: OK** (no "muss" clause).
- **Gate-wiring:** none.

### A138-28 — "Abschließende Nachweiszusammenstellung" (Phase 6, archetype `verification`) — CAPSTONE
- **Role (cited):** Final compliance checklist + sign-off. Fields: `final_compliance_verdict` (enum), `final_signoff_engineer`, `final_signoff_date`, `final_documentation_complete`, `permitting_documentation_ready`, plus **four phase-complete booleans**: `data_collection_phase_complete` (P2), `general_calc_phase_complete` (P3), `facility_design_phase_complete` (P4), `verification_phase_complete` (P5). Source for the capstone = §7.4 Dokumentation (Betriebshandbuch, Pläne, Genehmigungen) + §1/§5/§6 as the compliance scope.
- **Equations owned:** NONE.
- **Materialize:** none numeric. BUT the four phase-complete booleans + the verdict SHOULD be *derived from the real phase gates* (see gate-wiring — the core finding).
- **Compliance:** A138-REQ-30 (`block`, `final_compliance_verdict IS NOT NULL`, §1/§5/§6). **DIVERGENCE FINDING S7 (the user-flagged one):** REQ-30 is a **bare presence check** — it blocks only if the verdict is left null. It does NOT require the four prior phase gates (`phase_2/3/4_gate_result`) to be SET/PASS, nor even that the four phase-complete booleans are true. A final sign-off that can be recorded while Phase-2/3/4 gates are unset/FAIL contradicts the gated-phase architecture (REQ-09/16/19 each block *entry* to the next phase; the capstone should block *final sign-off* until all gates resolved). This is the "all-gates-SET at A138-28" gap the user flagged.
- **Gate-wiring FINDING S8 (structural):** There is **NO `phase_5_gate_result` field** anywhere in the standard (gate fields exist only at A138-09/14/23 for P2/P3/P4). A138-28's four `*_phase_complete` booleans are **ENGINEER-ENTERED booleans NOT wired to the actual `phase_N_gate_result` enums** — an engineer can tick `verification_phase_complete=true` while `phase_4_gate_result` is FAIL/unset. So the capstone is decoupled from the gate chain it's meant to close. → ratification R3 (the all-gates predicate) + a decision on whether P5 needs its own gate or folds into REQ-30.

---

## 2. Build plan (patterns; in-layer vs re-encode/importer/prod)

**In-layer (code in this repo, same Phase-4 patterns, no prod re-encode):**
1. **A138-26 Gl.10 V_Rück server-materialize + `displayOnly`** (Finding S3/H-class). Mirrors facilityVolumeMaterialize; RED-first through `tests/harness/` real saveWorksheet (embedded-PG). Confirm `A_VA`/`V_VA` inherit-resolve (S3) and `flood_check_trigger`=`AC>800` producer (S4) before wiring; both likely a derived-boolean + scoped inherit = in-layer.
2. **A138-24/25 final-value inherit + optional recommended verdicts.** A138-24 inherits the A138-23 summary finals by reference (single-source invariant — no re-enter). Optional A138-25 recommended `design_adequacy_result` + reasons companion (D3 pattern) = aggregator + (if persisted) 2 new fields (fields = prod re-encode; the *recommendation logic* is in-layer).
3. **A138-28 derived phase-gate roll-up + final-verdict predicate (pending ratification R3).** Read the real `phase_2/3/4_gate_result` (scoped cross-worksheet reads) + P5 adequacy; drive a recommended `final_compliance_verdict` + reasons; the REQ-30 predicate change is a prod compliance_requirements UPDATE (below).
4. **A138-27 optional derived dev_pct** (nice-to-have; skip unless wanted).

**Needs prod apply / re-encode / importer (batched, gated — NOT applied autonomously):**
- **MRS V_MR field add on A138-20** (Milestone-1 carry; re-encode = new field via importer/mgmt SQL). See R1.
- **REQ-30 condition rewrite** (all-gates predicate) — prod `compliance_requirements` UPDATE. See R3.
- **REQ-21 condition relax to `IN {PASS, NA}`** if ratified (S2b). Prod UPDATE. See R2b.
- **REQ-26 source_quote fix** (S5) — prod `compliance_requirements` UPDATE (quote↔title mismatch). See R4.
- **New A138-25 recommendation fields** (if R2 approves persisting them) — prod field add.
- **Possible `phase_5_gate_result` field** on A138-25 or A138-28 (if R3 opts for an explicit P5 gate) — prod field add.
- **Workbook-sync:** fold ALL of the above into the Pass3c workbook sheets (source-of-truth) before the next full A138 re-import (same debt class as the Phase-4 close-out WORKBOOK-SYNC item).
- **Code-allocation rule (binding, phase4-progress):** any new REQ-NN must inventory the WHOLE standard first — current max is REQ-33; next free = **REQ-34**.

---

## 3. RATIFICATION BUNDLE (one consolidated batch — needs the user)

Each item: source citation · proposed decision · recommended option.

**R1 — MRS storage remap + V_MR re-encode (Milestone-1 carry).**
- Source: §6.6.2 (line 2023) "Die Bemessung von Mulden-Rigolen-Systemen … erfolgt … analog zur Bemessung von Mulden-Rigolen-Elementen (siehe 6.5.2)." MRE storage = V_MR = V_M+V_R (Gl.26). Gl.30 V_MÜ = *Überlaufvolumen* (overflow), NOT storage. Confirmed A138-20 has only `V_MUE`, no `V_MR`.
- Decision needed: (a) **reverse** the 2026-07-15-ratified `mrs → V_MUE` mapping; (b) **re-encode** a `V_MR` field on A138-20 (prod field add) + materialize V_MR = V_M+V_R (scoped sum, mirroring the MRE Gl.26 build).
- **Recommended:** APPROVE both — the current mapping is provably wrong vs source (mrs governing storage is V_MR, not the overflow). This is a source-correctness fix, not a preference.

**R2 — A138-25 final adequacy: recommended verdict + reasons (D3 parity).**
- Source: Gl.9 §5.3.3.7 (final `q_S,AC ≥ 2`). Phase-4 D3 precedent attaches a recommended verdict + explained reasons to entered gates.
- Decision: attach a recommended `design_adequacy_result` + `..._reasons` (derived from the Gl.9 re-check), engineer confirms an *explained* recommendation. Requires 2 new persisted A138-25 fields (prod re-encode) if persisted, else render-only.
- **Recommended:** APPROVE, PERSISTED (same rationale as Phase-4: a compliance recommendation belongs on the PDF/audit trail).

**R2b — REQ-21 over-block on NA (divergence S2).**
- Source: Gl.9; enum has legit `NA`. Current `design_adequacy_result == 'PASS'` fails a valid NA outcome. Phase-4 REQ-21 (Gl.25) and flood REQ-23 both use applicability-conditioned `IN {…, NA}`.
- Decision: relax to `design_adequacy_result IN {PASS, NA}` (NA passes the block, is not a failure) — UNLESS NA is disallowed at *final* adequacy (source ambiguous).
- **Recommended:** relax to `IN {PASS, NA}` IF NA is a real outcome here; else keep `== 'PASS'` and remove NA from the enum. **Ratify which.**

**R3 — A138-28 all-gates-SET final-verdict predicate (the user-flagged item; S7+S8).**
- Source: gated-phase architecture — REQ-09 (`phase_2_gate_result IN {PASS,CONDITIONAL}`), REQ-16 (P3), REQ-19 (P4) each block phase entry; §7.4 capstone documentation is the terminal gate. Current REQ-30 = bare `final_compliance_verdict IS NOT NULL`.
- Proposed predicate (recommended): replace REQ-30 with a conjunction —
  `final_compliance_verdict IN {PASS, CONDITIONAL} AND phase_2_gate_result IN {PASS,CONDITIONAL} AND phase_3_gate_result IN {PASS,CONDITIONAL} AND phase_4_gate_result IN {PASS,CONDITIONAL} AND design_adequacy_result IN {PASS,NA} AND flood_check_result IN {PASS,NA}`
  (i.e. final sign-off blocked until every phase gate + P5 adequacy + flood proof is resolved-positive). Grammar note: the current `evaluate.ts` supports `IN {…}` and `AND`; a 6-way `AND` conjunction must be confirmed parseable (Phase-4 verified brace-`IN`; chained `AND` needs a parse check — if unsupported, split into per-symbol block rows REQ-30a…f, each `IN {PASS,…}`).
- Sub-decision: does Phase 5 need its OWN `phase_5_gate_result` enum (parity with P2/P3/P4), or does the A138-28 conjunction over `design_adequacy_result`+`flood_check_result` suffice? **Recommended:** NO separate P5 gate field — fold P5 into the A138-28 conjunction (adequacy+flood already carry PASS/FAIL/NA), which keeps the "all gates SET at the capstone" without adding a mid-workflow lock (consistent with the Phase-4 finding that unset gates stay non-blocking mid-flow, hard-blocking only at final sign-off). Also wire the four `*_phase_complete` booleans to DERIVE from the real gate enums (not free-entered) so they can't disagree with the gates.
- **Recommended overall:** APPROVE the conjunction predicate; implement as split per-symbol block rows if the chained-AND grammar isn't supported (verify at build). Prod `compliance_requirements` change → gated apply.

**R4 — REQ-26 source_quote↔title mismatch (encoding bug S5).**
- Source: REQ-26 title "Approvals collected per Section L" / clause 5.3.4.1, but stored `source_quote` is the Gl.10 D-iteration Anmerkung (wrong paste).
- Decision: fix the `source_quote` to the actual approvals/Section-L clause, OR re-scope REQ-26 to what it genuinely attests. Requires confirming what "Section L" + 5.3.4.1 approvals the worksheet intends.
- **Recommended:** correct the `source_quote` (prod UPDATE) to the true clause; if no approvals clause exists at 5.3.4.1, re-point REQ-26 to §7.4 Dokumentation (Genehmigungen und Erlaubnisse, line 2315). **Ratify the target clause.**

**R5 — field-home gaps to confirm at build (may become re-encodes):**
- A138-26 `A_VA` (Gl.10 input, no local field — S3) and `flood_check_trigger` producer (S4). If they don't inherit/derive → field-home re-encode. **Recommended:** confirm inherit-resolution first; escalate to re-encode only if unresolved (mirrors the Milestone-1 in-layer-vs-re-encode discipline).

**Coverage note (NOT a ratification item):** §8 Betrieb/Wartung/Betriebshandbuch (§8.1–8.3, Anh. E operating tables) is *unencoded* — no worksheet in 24–28 covers operation/maintenance. The encoded scope legitimately ends at documentation/sign-off (§7.4). Flag only: if an operation-phase worksheet is ever wanted, it's a NEW worksheet, out of Phases 5–6 as scoped.

---

## Findings index
- **S2/R2b — REQ-21 `== 'PASS'` over-blocks legit NA** (divergence; ratify).
- **S5/R4 — REQ-26 source_quote is the wrong clause** (encoding bug; hard finding, prod fix).
- **S7+S8/R3 — A138-28 REQ-30 is a bare presence check; no `phase_5_gate_result`; phase-complete booleans decoupled from the real gates** (the user-flagged all-gates-SET gap; hard finding).
- **S3/S4/R5 — A138-26 Gl.10 needs `A_VA` + `flood_check_trigger` homes** (confirm inherit vs re-encode).
- **R1 — MRS mrs→V_MUE mapping is wrong per §6.6.2; A138-20 lacks V_MR** (carried; source-correctness, ratify + re-encode).
