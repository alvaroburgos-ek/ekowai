# Eval-Reference — DWA-A 138-1, A138-18, Gl. 20 (V_R Rigole, geometric)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`V_R = b_R · h_R · L_R · s_R` — §6.4.2.

Geometrisches Rigolen-Volumen. **displayOnly** — Vergleichsgröße zur Gl. (19)-Anforderung; Gl. 19 ist primärer Schreiber für V_R.

| Input | Value | Unit | Origin |
|---|---:|---|---|
| b_R | 1.0 | m | A138-18 |
| h_R | 1.0 | m | A138-18 |
| L_R | 10 | m | A138-18 (engineer iteration var) |
| s_R | 0.317 166 | – | A138-18 (Gl. 21, wired) |

V_R = 1 · 1 · 10 · 0.317 166 = **3.172 m³** (precision ±0.001).

### Unit guard
b_R, h_R, L_R in m; s_R dimensionless. Mismatch → manual_required.

### Sibling-unit check
- Output V_R in **m³** matches the V_R field unit on A138-18 and matches Gl. (19)'s output unit.
- Same field name as Gl. (19); `displayOnly` prevents race on the store.
- s_R reads the value produced by Gl. (21) (wired in PR #19) — natural data flow.

### Reading the result
This 3.172 m³ is for L_R=10 m (an engineer's initial guess). The Gl. (19) requirement is 25.812 m³. Engineer increases L_R; at L_R = 52.464 m (the Gl. (23) result) both Gl. (19) and Gl. (20) yield ≈ 16.64 m³ and the design balances.
