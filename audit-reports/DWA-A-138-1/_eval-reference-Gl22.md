# Gl. 22 (A138-18) — s_R thin-wall (displayOnly)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`s_R = (s_F / (b·h)) · (b·h + az · (π·d²/4) · ((1/s_F) − 1))` — §6.4.2.

Thin-wall alternative to Gl. 21 (d_a ≈ d_i ≈ d). Algebraically identical to Gl. 21 when d_a = d_i.

| Input | Value | Unit |
|---|---:|---|
| s_F | 0.30 | – |
| b_R, h_R | 1.0, 1.0 | m |
| az | 1 | – |
| d → d_i (alias) | 0.184 | m |

```
(π·d²/4)          = π·0.033856/4 = 0.026 590
(1/s_F − 1)       = 3.333 − 1   = 2.333 333
az · 0.026 590 · 2.333 333       = 0.062 044
b·h + 0.062 044                  = 1.062 044
× s_F/(b·h) (0.30)               = 0.318 613
```

**Ref s_R = 0.318 613.** Sibling: dimensionless, same field as Gl. 21. displayOnly — Gl. 21 primär.
