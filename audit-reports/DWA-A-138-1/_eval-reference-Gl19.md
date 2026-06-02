# Eval-Reference — DWA-A 138-1, A138-18, Gl. 19 (V_R Rigole, required)

`V_R = (A_C · 10⁻⁷ · r_D(n) − ((b_R + h_R) · L_R + b_R · h_R) · k_i − Q_Dr · 10⁻³) · D · 60 · f_Z` — §6.4.2.

Erforderliches Rigolen-Speichervolumen. **Primärer Schreibwert** für V_R auf A138-18.

| Input | Value | Unit | Origin |
|---|---:|---|---|
| A_C | 1 000 | m² | A138-10 |
| r_D(n) | 130 | l/(s·ha) | A138-04 / A138-18 |
| b_R | 1.0 | m | A138-18 |
| h_R | 1.0 | m | A138-18 |
| L_R | 10 | m | A138-18 (engineer initial guess) |
| k_i | 5 × 10⁻⁵ | m/s | A138-11 |
| Q_Dr | 0 | l/s | A138-20 |
| D | 30 | min | A138-10 |
| f_Z | 1.2 | – | A138-08 |

```
A_C · 10⁻⁷ · r_D                         = 1000 · 10⁻⁷ · 130     = 0.013 000  m³/s
((b_R + h_R) · L_R + b_R · h_R)          = 2·10 + 1               = 21         m²
· k_i                                    = 21 · 5 × 10⁻⁵         = 0.001 050  m³/s
Q_Dr · 10⁻³                              = 0                     = 0          m³/s
Net rate                                 = 0.013 − 0.00105 − 0   = 0.011 950  m³/s
· D · 60 · f_Z                           = · 2 160               = 25.812     m³
```

**Reference V_R = 25.812 m³** (precision ±0.001).

### Unit guard
A_C in m²; r_D(n) in l/(s·ha); b_R, h_R, L_R in m; k_i in m/s; Q_Dr in l/s; D in min; f_Z dimensionless.

### Sibling-unit check — Gl. 18 trap does NOT bite here
The embedded `((b_R+h_R)·L_R + b_R·h_R) · k_i` is **m³/s** (m²·m/s) and is subtracted from `A_C·10⁻⁷·r_D` which is also m³/s. Arithmetic internally consistent. The same expression standalone is Gl. (18), parked because its wizard Q_S field is labelled l/s — that's a field-unit problem, not a formula problem. Gl. 19 doesn't write Q_S; it uses the dimensionally-correct m³/s form inline.

### Reading the result
With L_R=10: required 25.812 m³, geometric (Gl. 20) only 3.172 m³ → Rigole far too short. Gl. (23) computes the required L_R = 52.464 m.
