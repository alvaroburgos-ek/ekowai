# Eval-Reference — DWA-A 138-1, A138-17, Gl. 14 (V_M Mulde, required)

`V_M = ((A_C + A_VA) · 10⁻⁷ · r_D(n) − A_S,m · k_i) · D · 60 · f_Z` — §6.3.2.

Erforderliches Mulden-Speichervolumen aus der Zufluss-Versickerungs-Bilanz. **Primärer Schreibwert** für V_M auf A138-17.

| Input | Value | Unit | Origin |
|---|---:|---|---|
| A_C | 1 000 | m² | A138-10 |
| A_VA | 50 | m² | A138-10 |
| r_D(n) | 130 | l/(s·ha) | A138-04 / A138-10 |
| A_S,m | 68.823 529 | m² | A138-17 (Gl. 16, wired) |
| k_i | 5 × 10⁻⁵ | m/s | A138-11 |
| D | 30 | min | A138-10 |
| f_Z | 1.2 | – | A138-08 |

```
(A_C + A_VA) · 10⁻⁷ · r_D    = 1050 · 10⁻⁷ · 130           = 0.013 650    m³/s
A_S,m · k_i                  = 68.823 529 · 5 × 10⁻⁵       = 0.003 441 18 m³/s
Net rate                     = 0.013 650 − 0.003 441 18    = 0.010 208 82 m³/s
· D · 60 · f_Z               = · 30 · 60 · 1.2 = · 2 160   = 22.051        m³
```

**Reference V_M = 22.051 m³** (precision ±0.001).

### Unit guard
A_C, A_VA, A_S,m in m²; r_D(n) in l/(s·ha); k_i in m/s; D in min; f_Z dimensionless.

### Sibling-unit check
Output V_M in **m³** matches the A138-17 V_M field unit AND matches Gl. (15)'s output. Inflow term `(A_C+A_VA)·10⁻⁷·r_D` uses the same conversion-and-ha-to-m² pattern as Gl. 8 / Gl. 19 (10⁻⁴ ha→m² × 10⁻³ l→m³ = 10⁻⁷). Internally consistent.
