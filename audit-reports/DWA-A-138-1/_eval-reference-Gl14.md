# Gl. 14 (A138-17) — V_M Mulde, required


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`V_M = ((A_C + A_VA) · 10⁻⁷ · r_D(n) − A_S,m · k_i) · D · 60 · f_Z` — §6.3.2.

| Input | Value | Unit |
|---|---:|---|
| A_C | 1000 | m² |
| A_VA | 50 | m² |
| r_D(n) | 130 | l/(s·ha) |
| A_S,m | 68.823 529 | m² (Gl. 16) |
| k_i | 5×10⁻⁵ | m/s |
| D | 30 | min |
| f_Z | 1.2 | – |

```
(A_C+A_VA)·10⁻⁷·r_D = 1050·1.3·10⁻⁵ = 0.013650 m³/s
A_S,m·k_i           = 0.003 441 18 m³/s
Net                 = 0.010 208 82 m³/s
· D·60·f_Z (2160)   = 22.051 m³
```

**Ref V_M = 22.051 m³.** Unit guard on all 7 inputs; sibling: m³ matches V_M field on A138-17 and Gl. 15. Inflow term consistent with Gl. 8/19 conversion pattern.
