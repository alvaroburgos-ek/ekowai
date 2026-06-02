# Eval-Reference — DWA-A 138-1, A138-16, Gl. 12 (A_S Flächenversickerung)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`A_S = A_C / (k_i · 10⁷ / r_D(n) − 1)` — erforderliche Versickerungsfläche §6.2.2.

| Input | Value | Unit |
|---|---:|---|
| A_C | 1 000 | m² |
| k_i | 5 × 10⁻⁵ | m/s |
| r_D(n) | 130 | l/(s·ha) |

```
k_i · 10⁷       = 5 × 10⁻⁵ · 10⁷         = 500
k_i · 10⁷ / r_D = 500 / 130               = 3.846 153 846 …
− 1                                       = 2.846 153 846 …
A_S = 1000 / 2.846 153 846 …              = 351.351 351 351 …
```

**Reference A_S = 351.351 m²** (precision ±0.001).

### Inheritance + alias
- A_C ← A138-10 (inherited)
- k_i ← A138-11 (inherited)
- r_D(n) ← A138-16's local `r_D_n_used` (via `profile.symbolAliases.r_D_n = 'r_D_n_used'`)

### Unit guard
A_C must be m², k_i must be m/s, r_D(n) must be l/(s·ha). Any drift → manual_required. Tested with k_i in mm/s.
