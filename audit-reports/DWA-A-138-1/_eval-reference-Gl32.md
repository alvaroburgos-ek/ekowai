# Gl. 32 (A138-20) — L_R MRS, required (displayOnly)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`L_R = ((A_C + A_VA)·10⁻⁷·r_D(n) − b·h·k_i − V_M/(D·60·f_Z) − Q_Dr·10⁻³) / (b·h·s_R/(D·60·f_Z) + (b+h)·k_i)` — §6.6.2.

Like Gl. 29 but with Q_Dr (Drossel).

| Input | Value | Unit |
|---|---:|---|
| A_C, A_VA | 1000, 50 | m² |
| r_D(n) | 130 | l/(s·ha) |
| b_R, h_R | 1.0, 1.0 | m |
| k_i | 5×10⁻⁵ | m/s |
| V_M | 22.051 | m³ |
| Q_Dr | 0 | l/s |
| s_R | 0.317 166 | – |
| D, f_Z | 30, 1.2 | min, – |

```
num   = 0.013650 − 5×10⁻⁵ − 0.010209 − 0 = 0.003 391 m³/s
denom = 2.46836×10⁻⁴ m²/s (same as Gl. 29)
L_R   = 13.738 m
```

**Ref L_R = 13.738 m** (with Q_Dr = 0; matches Gl. 29). Mit Q_Dr > 0 verringert sich der Zähler — kürzere Rigole oder Verletzung der Bilanz. Sibling: m, same L_R field. displayOnly.
