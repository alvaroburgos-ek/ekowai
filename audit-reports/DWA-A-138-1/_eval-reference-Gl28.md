# Gl. 28 (A138-19) — V_MR required (MRE Bemessung)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`V_MR = ((A_C + A_VA) · 10⁻⁷ · r_D(n) − ((b_R + h_R) · L_R + b_R · h_R) · k_i) · D · 60 · f_Z` — §6.5.2.

| Input | Value | Unit |
|---|---:|---|
| A_C | 1000 | m² |
| A_VA | 50 | m² |
| r_D(n) | 130 | l/(s·ha) |
| b_R, h_R | 1.0, 1.0 | m |
| L_R | 10 | m |
| k_i | 5×10⁻⁵ | m/s |
| D | 30 | min |
| f_Z | 1.2 | – |

```
(A_C+A_VA)·10⁻⁷·r_D     = 1050·1.3·10⁻⁵   = 0.013 650 m³/s
((b+h)·L+b·h)·k_i       = 21·5×10⁻⁵       = 0.001 050 m³/s
Net                                          = 0.012 600 m³/s
· 2160                                       = 27.216 m³
```

**Ref V_MR = 27.216 m³.** Sibling: m³ matches V_MR field; primary writer (Gl. 26/27 displayOnly). Structurally analogous to Gl. 19 but uses (A_C+A_VA) instead of just A_C — MRE captures direct rain on the Mulde-surface part of the unit.
