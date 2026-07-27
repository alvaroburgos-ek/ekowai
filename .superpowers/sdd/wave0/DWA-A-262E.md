# Wave 0 — MAP+TRIAGE — DWA-A-262E

**Standard:** DWA-A-262E (November 2017) — Grundsätze für Bemessung, Bau und Betrieb von Kläranlagen
mit bepflanzten und unbepflanzten Filtern zur Reinigung häuslichen und kommunalen Abwassers.
**Prod standard_id:** `da886be2-3309-4b2d-bce9-6f1ae2354749` (project `vadsmshzebefjreqcicl`, READ-ONLY).
**PDF:** `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).pdf` — **pdfStatus = text**
(scoop `pdftotext -layout`, extractable). Page offset: **none** — printed page number is in the
running footer; `source_page` read straight off the footer (verified: eq (1) → p.18; permafrost
clause → p.3). NO fixes applied, NO harness run, NO prod writes.
**Reasoning map:** `…/reasoning-maps/DWA-A-262E/` (130 nodes + `_index.md`), 138 template reused verbatim.

## Node totals
- 130 nodes: 33 section · 18 equation · 3 table · 60 CR · 8 document · 8 decision-point.
- Provenance: **VA 102 / VC 20 / NR 8 / EV 0.** data_class: standard_fixed ~46 · derived ~30 ·
  standard_range ~9 · normative-as-input-reference 3 · engineer_input remainder.

## Findings list (by defect class)
1. **DEAD GATE (phantom-field / cross-sheet)** — **REQ-12** (A262-25, block):
   `if wastewater_type == greywater_only then w_s_d >= 75`. Neither operand is a field of A262-25
   (`wastewater_type` owned by A262-02; `w_s_d` owned by A262-04/05). Worksheet-local evaluator
   cannot resolve → gate never fires. → [[dp-req12-dead-gate]]. **This is the 1 counted dead gate.**
2. **DEAD BRANCH (identical-RHS equation pair)** — **Gl.13 / Gl.14** (A262-25): both produce
   `A_F_TKN_red = B_d_TKN / B_A_TKN_zul` under complementary `>=` / `<` conditions → branch test
   inert. Prod `source_quote` NULL (SR-1 gap); the `<` branch likely intends a different RHS.
   → [[dp-eq13-14-dead-branch]]. (Logged, not counted in deadGates — equation, not CR.)
3. **standard_fixed re-enforced as UI-editable equality gate (invariant #3)** — **REQ-03**
   `x_Q_max == 8` (A262-05). "must be set at xQ,max = 8 h/d" (p.18) is a fixed constant but the
   field is UI-editable and re-checked by an == block gate. Also Gl.5 prints `xQmax` (comma dropped).
   → [[dp-req03-fixed-as-gate]].
4. **missing-branch / SR-2 conditional** — **REQ-18a** (A262-29): hard `geomembrane_thickness_mm >= 1.5`
   ignores the standard's weld-free `>= 1.0 mm` small-system branch (p.44; `geomembrane_no_welds`
   field exists). → [[dp-req18a-weld-branch]].
5. **var-vs-var non-enforcement (F-4)** — **REQ-13** `B_d_TKN <= B_A_TKN_zul` (A262-25, warn):
   two derived/input variables, no printed numeric constant. → [[dp-req13-var-vs-var]].
6. **#22 derived value re-gated** — **REQ-11** `f_red >= 0.5` (A262-25, block): `f_red` is the
   derived output of Gl.11, which already embeds `f_red >= 0.5`; CR re-checks the derived floor.
7. **inequality/constraint-as-producer** — **Gl.6** (`Q_M ≥ ΣQ_Dr,RÜB`) and **Gl.8**
   (`Q_M ≥ ΣQ_Dr,RÜ ≥ ΣQ_krit`): constraints encoded as equations (no clean single producer).
8. **verdict-as-input** — `design_parameter_verdict` (A262-31), `compliance_verdict` (A262-33):
   hand-entered enum verdicts consumed by the summary; acceptable as human verdicts, flagged.
9. **attest-only path gate** — **REQ-09** (A262-10), **REQ-10** (A262-18): attestation booleans
   certify the dimensioning path in parallel to child-sheet numeric gates. → [[dp-req09-10-attest]].
10. **modal normativity** — **REQ-07** "usually mT,aM between 0.25 and 1" (p.20).
    → [[dp-req07-modal-usually]].
11. **coverage gap (no gate)** — **A262-21** (VF Grobsand komm.): sizing fields present, no CR,
    while §4.3.3.4 siblings all carry minima. → [[dp-a262-21-no-gate]]. (F-9; not a dead gate — an absent one.)
12. **SR-1 source_quote gap** — prod `equations.source_quote` NULL for **all 18** equations; CRs
    REQ-03 and REQ-12 also NULL. VA reachable only via the text-extractable PDF this session.

## Below-VA list (28 nodes)
- **Sections VC (8):** A262-01, 03, 09, 17, 24, 30, 31, 33 (registration / summary / verification
  sheets with no printed numeric threshold to assert VA against).
- **CRs VC (4):** REQ-02a (scope attestation, no numeric), REQ-09 (path attest), REQ-10 (path attest),
  REQ-12 (dead gate; 75 sources to p.20 but gate itself unresolvable → held VC).
- **Documents NR (8):** doc-atv-a-128, doc-atv-dvwk-a-198, doc-dwa-a-118, doc-dwa-a-272,
  doc-din-4261-1, doc-din-18130-1, doc-din-en-13254, doc-din-en-iso-grain (all `in_library: false`).
- **Decision-points VC (8):** the 8 dp-* nodes above.
- EV: 0.

## Dead gates
- **1 counted:** REQ-12 (phantom-field / cross-sheet, A262-25).
- Adjacent (not counted): Gl.13/14 identical-RHS dead branch; A262-21 absent gate.

## Missing-doc dependencies (out-of-library, dependents cap NR)
ATV-A 128 · ATV-DVWK-A 198:2003 · DWA-A 118 · DWA-A 272:2014 · DIN 4261-1 · DIN 18130-1 ·
DIN EN 13254 · DIN EN ISO (grain-size). None block the standard's own printed thresholds; they cap
only the input/methodology values 262E explicitly defers.

## Tier
**fix-first.** Defects to resolve before harness: 1 true dead gate (REQ-12 relocation/consumer
declaration), the Gl.13/14 dead-branch (needs SR-1 verbatim re-quote of §4.5 before any change),
REQ-18a missing weld-free branch, REQ-03 fixed-as-gate, and the A262-21 coverage gap. None are
acquisition-blocked: every DWA-A-262E *own* threshold is VA from the text PDF; the 8 external refs
cap only deferred inputs (methodology), not the acceptance criteria the harness would exercise.
