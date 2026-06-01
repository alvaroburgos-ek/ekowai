# Eval-Reference — DWA-A 138-1, A138-18, Gl. 23 (L_R Rigole, required)

`L_R = (A_C · 10⁻⁷ · r_D(n) − b_R · h_R · k_i − Q_Dr · 10⁻³) / (b_R · h_R · s_R / (D · 60 · f_Z) + (b_R + h_R) · k_i)` — §6.4.2.

Erforderliche Rigolen-Länge aus der Bemessungsgleichung. **displayOnly** — der Engineer trägt L_R als Iterationsgröße ein; das Ergebnis dient als Sizing-Hilfe.

| Input | Value | Unit | Origin |
|---|---:|---|---|
| A_C | 1 000 | m² | A138-10 |
| r_D(n) | 130 | l/(s·ha) | A138-04 / A138-18 |
| b_R | 1.0 | m | A138-18 |
| h_R | 1.0 | m | A138-18 |
| k_i | 5 × 10⁻⁵ | m/s | A138-11 |
| Q_Dr | 0 | l/s | A138-20 |
| s_R | 0.317 166 | – | A138-18 (Gl. 21, wired) |
| D | 30 | min | A138-10 |
| f_Z | 1.2 | – | A138-08 |

```
Numerator
  A_C · 10⁻⁷ · r_D                     = 1000 · 10⁻⁷ · 130           = 0.013 000     m³/s
  b_R · h_R · k_i                      = 1 · 1 · 5 × 10⁻⁵            = 0.000 050     m³/s
  Q_Dr · 10⁻³                          = 0                            = 0             m³/s
  num                                  = 0.013 − 0.00005 − 0          = 0.012 950     m³/s

Denominator
  b_R · h_R · s_R / (D · 60 · f_Z)     = 0.317 166 / 2 160            = 1.468 36 × 10⁻⁴   m²/s
  (b_R + h_R) · k_i                    = 2 · 5 × 10⁻⁵                 = 1.0 × 10⁻⁴        m²/s
  denom                                = 2.468 36 × 10⁻⁴             m²/s

L_R = num / denom                      = 0.012 950 / 2.468 36 × 10⁻⁴ = 52.464         m
```

**Reference L_R = 52.464 m** (precision ±0.001).

### Unit guard
A_C in m²; r_D(n) in l/(s·ha); b_R, h_R in m; k_i in m/s; Q_Dr in l/s; s_R dimensionless; D in min; f_Z dimensionless.

### Sibling-unit check
Numerator m³/s, denominator m²/s → L_R in **m** matches the A138-18 L_R field unit. `displayOnly` so the engineer's L_R input isn't clobbered.

### Reading the result
With the engineer's initial L_R=10: Gl. (19) says "you need 25.812 m³ of storage", Gl. (20) says "your Rigole holds only 3.172 m³", Gl. (23) says "L_R should be **52.464 m**". Engineer updates L_R; at L_R=52.464 the balance closes (both Gl. (19) and (20) yield ≈ 16.64 m³).
