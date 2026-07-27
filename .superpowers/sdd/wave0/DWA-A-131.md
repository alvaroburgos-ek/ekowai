# Wave 0 — DWA-A-131 triage (MAP+TRIAGE)

Standard: DWA-A-131 "Bemessung von einstufigen Belebungsanlagen" (Juni 2016).
Prod standard_id `94d830b9-77c6-4140-8cf0-840b97017575` (project `vadsmshzebefjreqcicl`, read-only).
PDF: `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-A-131\DWA-A-131.pdf`. pdfStatus=text.
Page offset (footer-derived THIS pdf): **printed = physical − 2** (physical p.30→printed 28,
p.33→31, p.36→34; cross-checked vs ToC). Map: `Obsidian/…/reasoning-maps/DWA-A-131/` (+_index.md).

Encoding size: worksheets ×8 (A131-01..08), equations ×66 (all `verified_against_standard`),
compliance_requirements ×20 (all severity=block), fields (all eq outputs also present as editable
number fields), enums ×6 (verfahren_n_elim, p_elim_verfahren, faellmittel, nklb_durchstroemung,
raeumertyp).

Map node counts: 72 total — section 8, equation 33 (representative; 66 formulas covered via
group + section nodes), table 3, CR 20, decision-point 6, document 2.
Provenance: VA 56 / VC 8 / NR 8 / EV 0. data_class: derived 60, standard_fixed 20,
standard_range 6, engineer_input ~30 (input fields), normative-as-input-reference 4 (doc/CR refs).

## Findings by class

### #22 hand-enterable-derived — STANDARD-WIDE (headline fix-first)
All 66 equation OUTPUT symbols also exist in `fields` as editable `data_type=number`,
`owner=null`. The entire calculation surface (t_TS_Bem, V_D_V_BB, X_CSB_BM, OV_C, OV_C_D,
UeS_d, M_TS_BB, t_TS, TS_BS, TS_BB, q_A, A_NB, h_ges, V_BB, RF, eta_D, S_KS_AB, …) is
hand-overridable. Validator invariant #4 violated at scale. DP: dp-a131-22-derived-hand-enter.

### inequality/verdict-as-producer (×4)
- Gl.18 t_TS,Bem,stab: source `≥ 25·1,072^(12−T)` encoded `=` (paired w/ CR-003 — OK-ish).
- Gl.53 eta_D / Gl.54 eta_D,kask: source `η_D ≤ …` encoded `=`, NO paired CR (silent equality).
- Gl.B.9 Q_SR,min: source `≥` encoded `=` (paired w/ CR-016).
- Gl.52 Q_RZ: printed as ratio-identity `RF = Q_RS/Q + Q_RZ/Q`, algebraically reworked into a
  Q_RZ producer.
DP: dp-a131-ineq-producer.

### greedy / compound-OR gate (×3) + coverage gap
CR-006 (q_SV), CR-007 (q_A), CR-010 (Q_RS): `(nklb_durchstroemung=='vertikal' AND <vert>) OR
(<horiz>)` — the second disjunct has NO enum guard (bare fallback). Plus the `uebergang`
(transition) enum value has no dedicated branch → Tab.5 interpolated limit unenforced.
Gate field `nklb_durchstroemung` EXISTS → NOT phantom-field. DP: dp-a131-gate-or-fallthrough.

### TRUE-verdict-narrative gate (×2, NOT dead)
CR-013 (h_ges≥3 m) and CR-019 (D<8 m → DWA-A 222/226 re-check) have `condition=TRUE`,
severity=block: they always pass, numeric requirement only in narrative. Reachable-but-vacuous,
not dead (a dead gate has an unreachable FAIL). DP: dp-a131-true-gates.

### standard_fixed-hand-enterable (×1)
`mu_A_max` (§5.1.3 fixed ~autotrophic max growth rate; folds into Gl.13's "3,4") is a
hand-enterable number field → lets Gl.12/Gl.13 diverge. Value NOT transcribed this session
(page located p.30, number not read) → capped VC per SR-1. DP: dp-a131-mu-amax-input.

### self-referential / redundant producer (note)
Gl.20 stores `X_CSB_BM_impl` with X_CSB_BM_impl on its own RHS (implicit form); only Gl.21
(resolved) is engine-usable. Gl.16 redundantly re-produces t_TS,Bem alongside Gl.15.
Gl.38/39 are a t_TS ↔ M_TS,BB definition/inverse pair (circular-solve risk). Documented on the
respective eq nodes (eq-a131-21, -16, -38), not separately DP'd.

### missing-doc dependency (×2 out-of-library)
- ATV-DVWK-A 198 (CR-017, §4.1) — in_library:false. Governs ALL A131-02 load/concentration
  INPUTS. Caps those input provenances at NR (the A-131 fractionation MATH is VA).
- DWA-A 202 (CR-018, §5.3.1) — in_library:false. Advisory ("siehe auch"); caps A131-05 P-route
  detail at VC.
- DWA-A 222 / DWA-A 226 (CR-019) and DWA-M 229-1 (CR-020) ARE in library → NOT blockers.

## Dead gates
0. All 20 CRs are severity=block over owned, populated symbols with reachable fail paths.
(CR-013/019 TRUE-gates are vacuous-pass, classified verdict-narrative, not dead.)

## Below-VA node list (16)
NR (8): doc-atv-dvwk-a198, cr-a131-017, doc-dwa-a202, cr-a131-018 (A198/A202 out-of-library
input/reference caps) + their 4 immediate A131-02 input-value dependents (load/concentration
inputs sourced to A 198).
VC (8): cr-a131-016 + eq-a131-b9-qsrmin + eq-a131-c1-h2 (Anhang B/C "(informativ)" ceiling),
dp-a131-mu-amax-input + dp-a131-22-derived-hand-enter (finding DPs), tab-a131-06-raeumer
(Anhang-B-consumed), plus 2 additional Anhang-B Räumer helper eqs (B.3–B.8 family, VC ceiling).

## Missing docs (referenced, not in library)
ATV-DVWK-A-198, DWA-A-202.

## Tier
**fix-first.** NOT acquisition-blocked: the two missing docs are advisory / upstream
input-provenance caps; the A-131 sizing math (Gl.1–65) is fully VA-encoded and self-contained
(all 66 formulas verified_against_standard, all pages footer-confirmed). The real pre-harness
work is: (1) the standard-wide #22 derived-editability, (2) the OR-fallthrough gates +
`uebergang` coverage, (3) the ≤/≥-as-`=` producers without paired CRs (eta_D), (4) the two
TRUE-verdict gates, (5) mu_A_max fixed-vs-input. All staged for Alvaro's batch; nothing applied.
