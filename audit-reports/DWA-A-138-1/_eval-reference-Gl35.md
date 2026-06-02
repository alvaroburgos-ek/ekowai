# Gl. 35 (A138-21) — V_S Schacht, required


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`V_S = (A_C · 10⁻⁷ · r_D(n) − A_S · k_i) · D · 60 · f_Z` — §6.7.2.

| Input | Value | Unit |
|---|---:|---|
| A_C | 100 | m² (Schacht-Catchment kleiner als Mulde/Rigole) |
| r_D(n) | 130 | l/(s·ha) |
| A_S | 7.147 | m² (Gl. 34) |
| k_i | 5×10⁻⁵ | m/s |
| D, f_Z | 30, 1.2 | min, – |

```
A_C·10⁻⁷·r_D  = 100·130·10⁻⁷    = 0.001 300 m³/s
A_S·k_i       = 7.147·5×10⁻⁵    = 0.000 357 m³/s
Net           = 0.000 943 m³/s
· 2160        = 2.036 m³
```

**Ref V_S = 2.036 m³.** Sibling: m³, matches V_S field on A138-21 (Schacht-spezifisch — kein Collision mit V_VA / V_R). Primary writer (Gl. 36 displayOnly).
