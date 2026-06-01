# Eval-Reference — DWA-A 138-1, A138-18, Gl. 22 (s_R, thin-wall alternative)

`s_R = (s_F / (b_R · h_R)) · (b_R · h_R + az · (π · d² / 4) · ((1 / s_F) − 1))` — §6.4.2.

Speicherkoeffizient der Rigole für dünnwandige Versickerrohre (d_a ≈ d_i ≈ d). **Algebraisch identisch** zu Gl. (21) mit d_a = d_i. **displayOnly** — Gl. (21) ist primärer Schreiber für s_R.

| Input | Value | Unit | Origin |
|---|---:|---|---|
| s_F | 0.30 | – | A138-18 |
| b_R | 1.0 | m | A138-18 |
| h_R | 1.0 | m | A138-18 |
| az | 1 | – | A138-18 |
| d (aliased → d_i) | 0.184 | m | A138-18 (`d_i` field; engineer responsible for d_a ≈ d_i) |

```
(π · d² / 4)                 = π · 0.184² / 4              = 0.026 613
((1/s_F) − 1)                = (1/0.30) − 1                = 2.333 333
az · 0.026 613 · 2.333 333   = 1 · 0.062 094                = 0.062 094
b_R · h_R + 0.062 094        = 1 + 0.062 094               = 1.062 094
s_F / (b_R · h_R)            = 0.30 / 1                    = 0.300 000
× 1.062 094                  = 0.30 · 1.062 094            = 0.318 628
```

**Reference s_R = 0.318 628** (precision ±0.000 1; with these inputs, identical to Gl. (21) using d_a = d_i = 0.184).

### Unit guard
s_F, az dimensionless; b_R, h_R, d in m. Mismatch → manual_required (and the d_i source field is m per the §6.4.2 L1831 override).

### Sibling-unit check
Output s_R **dimensionless** — same field as Gl. (21). `displayOnly` keeps Gl. (21) as the primary writer. The symbolAlias `d → d_i` maps the formula's single-diameter parameter to the wizard's inner-diameter field; engineer using Gl. (22) accepts the thin-wall assumption.
