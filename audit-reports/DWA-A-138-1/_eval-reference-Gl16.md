# Eval-Reference — DWA-A 138-1, A138-17, Gl. 16 (A_S,m Mulde)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`A_S,m = (A_C · 10⁻⁷ · r_D(n)) / (h_M / (D · 60 · f_Z) + k_i)` — Muldenversickerung, §6.3.2.

| Input | Value | Unit |
|---|---:|---|
| A_C | 1 000 | m² |
| r_D(n) | 130 | l/(s·ha) |
| h_M | 0.30 | m |
| D | 30 | min |
| f_Z | 1.2 | – |
| k_i | 5 × 10⁻⁵ | m/s |

```
Numerator   = 1000 · 10⁻⁷ · 130              = 0.013        m/s · ha
D · 60 · f_Z = 30 · 60 · 1.2                  = 2 160        s
h_M / 2160   = 0.30 / 2160                    = 1.388 … × 10⁻⁴
+ k_i        = 1.388 … × 10⁻⁴ + 5 × 10⁻⁵      = 1.888 … × 10⁻⁴
A_S,m        = 0.013 / 1.888 … × 10⁻⁴         = 68.823 529 …
```

**Reference A_S,m = 68.824 m²** (precision ±0.001).

### Inheritance
- A_C ← A138-10 (inherited)
- r_D(n) ← A138-10 generic `r_D_n` (alias: r_D_n → r_D_n; relies on inheritance for A138-17)
- h_M ← A138-17 (own)
- D ← A138-10 generic `D_min` (engineer-chosen Dauerstufe)
- f_Z ← A138-08 (inherited)
- k_i ← A138-11 (inherited)

### Unit guard
A_C: m², r_D(n): l/(s·ha), h_M: m, D: min, f_Z: dimensionless, k_i: m/s. Any drift → manual_required.
