# Eval-Reference — DWA-A 138-1, A138-16, Gl. 11 (Bilanz-Check)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`(A_C + A_S) · r_D(n) · 10⁻⁷ = A_S · k_i` — Wasserbilanz §6.2.2.

This is the source's identity from which Gl. (12) is derived. The engine wires it as a **balance-check aggregator**, not a producing equation: it verifies that the engineer's A_S choice satisfies the source's identity within ±1 % relative tolerance.

| Input | Value | Unit |
|---|---:|---|
| A_C | 1 000 | m² |
| A_S | 351.3514 | m² (from Gl. 12, see _eval-reference-Gl12.md) |
| r_D(n) | 130 | l/(s·ha) |
| k_i | 5 × 10⁻⁵ | m/s |

LHS = (1 000 + 351.3514) · 130 · 10⁻⁷ = 1 351.3514 · 130 · 10⁻⁷ = **0.017 568 m³/s**
RHS = 351.3514 · 5 × 10⁻⁵ = **0.017 568 m³/s**
Residuum LHS − RHS = **≈ 0** (within rounding) → relative deviation < 1 % → `computed`.

### Negative
If A_S is set to 100 (not from Gl. 12), residual becomes ~14 % of scale → `manual_required` with `Bilanz weicht zu stark ab`.

Symbol alias: the formula's `r_D(n)` (normalised to `r_D_n`) reads the A138-16 local field `r_D_n_used` via `profile.symbolAliases`.
