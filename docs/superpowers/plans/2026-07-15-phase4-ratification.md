# Phase-4 Ratification Bundle (Task 0)

> **For the user's individual ratification.** Nothing enforces (Task 5) or wires the predicate (Task 3) until each item below is ratified. Sources are verbatim from `equations.source_quote` / `fields.description` (prod DWA-A-138-1). Where the source gives a bare condition rather than an explicit modal verb (muss/soll/darf), that is stated honestly and the reading is flagged as inference.

## Part D1 — the three facility BLOCK gates

For each: verbatim clause · operator · modal-verb reading · proposed severity · applicability.

### Item 1 — A138-16 Fläche feasibility · `A138-REQ-20`

- **Clause:** §6.2.2 Gl. (13).
- **Verbatim:** "k_i > r_D(n) · 10⁻⁷ … Wenn die Bedingung gemäß GL. (13) nicht erfüllt ist, erhält man ein negatives Ergebnis, weil die Niederschlagsintensität die vorhandene Infiltrationsrate übersteigt."
- **Operator:** strict `>`.
- **Modal-verb reading:** the source states no muss/soll, but names the physical consequence of violation — a **negative** required area (Gl.12 denominator `k_i·10⁷/r_D(n) − 1` ≤ 0). A negative area is not a design that "should" be avoided; it is not a design at all. Reading: **the condition is a hard feasibility precondition**, not advisory.
- **Proposed severity: BLOCK.**
- **Applicability:** unconditional on A138-16 (Fläche). Condition grammar: `k_i > r_D_n_used * 0.0000001` (single comparison, supported by evaluate.ts).

### Item 2 — A138-18 Vollsickerrohr hydraulic capacity · `A138-REQ-21`

- **Clause:** §6.4.2 Gl. (25).
- **Verbatim:** "L_VS · q_VS ≥ r_5(n) · AC · 10⁻⁴ … mit L_VS Gesamtlänge der Vollsickerrohre; r_5(n) Regenspende für D=5 min und Bemessungshäufigkeit n."
- **Operator:** `≥`.
- **Modal-verb reading:** a dimensioning inequality the perforated-pipe length must satisfy for the design storm — if the installed `L_VS·q_VS` is below the `r_5(n)·A_C·10⁻⁴` demand, the pipe cannot pass the inflow (hydraulic under-capacity). Reading: **a design-invalidating capacity requirement**, not an advisory target.
- **Proposed severity: BLOCK.**
- **Applicability:** A138-18 (Rigole) **only when a Vollsickerrohr is used** — the condition references `L_VS`/`q_VS` (perforated-pipe symbols). If the Rigole has no Vollsickerrohr (`L_VS` empty), the gate is not applicable (no false block). **Rider to confirm:** gate applies iff `L_VS` is present/nonzero.

### Item 3 — A138-21 Schacht filter-layer sufficiency · `A138-REQ-22`

- **Clause:** §6.7.2 Gl. (38).
- **Verbatim:** "A_S,FS · k_f,FS ≥ A_S,Schacht · k_i … Schacht-Typ-B-Bedingung: Filterschicht-Versickerungsleistung ≥ Schacht-Versickerungsleistung."
- **Operator:** `≥`.
- **Modal-verb reading:** the source labels it explicitly a **"Schacht-Typ-B-Bedingung"** — the filter layer's infiltration capacity must at least equal the shaft's. For a Typ-B shaft (with filter layer) an insufficient filter defeats the infiltration path. Reading: **a requirement, Typ-B-scoped**.
- **Proposed severity: BLOCK, enum-conditioned on Schacht-Typ = B** (accepted rider). Not evaluated for Typ-A shafts (no filter layer) → no false block.
- **Applicability:** A138-21, gated on the Schacht-type selector = B. Condition `A_S_FS * k_f_FS >= A_S_Schacht * k_i` (single comparison). If the type selector's exact symbol/enum differs, encode as a derived boolean gated on the type (the `facility_meets_qsac` pattern) — mechanism noted at encode time.

## Part D3 — `phase_4_gate_result` predicate (entered enum, recommended verdict)

**Precedent (verified in prod, PLT-HS-01):** `phase_2_gate_result` = `source_type='entered'`, value `CONDITIONAL`. The phase gates (`phase_2/3/4_gate_result`, all `PASS/CONDITIONAL/FAIL`) and A138-02 `feasibility_determination` ("Feasible / Conditional / Not Feasible per Tab. 3") are **engineer sign-offs**, not computed. So `phase_4_gate_result` **stays an entered enum**; A138-23's six support fields auto-derive; the wizard shows a **recommended** verdict the engineer confirms.

**§6 / Tab. 14 anchor for CONDITIONAL:** Tab. 14 governs the above-ground-facility constraints — `freibord` (freeboard), `boeschungsneigung` (slope inclination), and `t_E` (emptying time, "Required ≤ 84 h at n=1/a for vegetation survival", §6.3.2). These are §6 "systemspezifische Bemessungsvorgaben" that a facility can miss while still having a computed storage volume → the natural CONDITIONAL band (dimensioned, but a Tab. 14 vegetation/geometry constraint is not fully met), mirroring Phase-2 CONDITIONAL and A138-02's "Conditional per Tab. 3".

**Proposed recommended-verdict predicate:**

| Verdict | Condition |
|---|---|
| **PASS** | `facility_specific_dimensioning_complete = true` AND `facility_meets_qsac = true` AND all facility BLOCK gates (REQ-20/21/22, where applicable) satisfied AND all applicable Tab. 14 constraints met (t_E ≤ 84 h, freeboard/slope within Tab. 14). |
| **CONDITIONAL** | dimensioning complete AND q_S,AC met AND no BLOCK gate fails, BUT ≥1 applicable **Tab. 14 soft constraint** flags (e.g. t_E > 84 h, or freeboard/slope outside the Tab. 14 recommendation) — passable with the condition noted, per §6/Tab. 14. |
| **FAIL** | `facility_specific_dimensioning_complete = false` (a required sizing output missing) OR any applicable BLOCK gate (REQ-20/21/22) fails. |

The enum remains engineer-set; the engine writes only the **recommended** value + the six support fields. REQ-19 (`phase_4_gate_result IN {PASS, CONDITIONAL}`, block) enforces on the engineer-confirmed value exactly as REQ-09/16 do today.

**Open ratification points:**
1. D1: severity of REQ-20 / REQ-21 / REQ-22 (all proposed BLOCK) — ratify each.
2. D1 riders: REQ-21 applies iff `L_VS` present; REQ-22 gated on Schacht-Typ = B.
3. D3: the entered-enum-with-recommended-verdict model, and the PASS/CONDITIONAL/FAIL predicate above (esp. whether Tab. 14 `t_E`/freeboard/slope drives CONDITIONAL, or CONDITIONAL is reserved for a narrower set).
