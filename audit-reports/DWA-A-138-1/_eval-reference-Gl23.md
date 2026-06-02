# Gl. 23 (A138-18) — L_R Rigole, required (displayOnly)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`L_R = (A_C·10⁻⁷·r_D(n) − b·h·k_i − Q_Dr·10⁻³) / (b·h·s_R/(D·60·f_Z) + (b+h)·k_i)` — §6.4.2.

| Input | Value | Unit |
|---|---:|---|
| A_C | 1000 | m² |
| r_D(n) | 130 | l/(s·ha) |
| b_R, h_R | 1.0, 1.0 | m |
| k_i | 5×10⁻⁵ | m/s |
| Q_Dr | 0 | l/s |
| s_R | 0.317 166 | – |
| D | 30 | min |
| f_Z | 1.2 | – |

```
num   = 0.013 − 5×10⁻⁵ − 0       = 0.012 950 m³/s
denom = 0.317166/2160 + 2·5×10⁻⁵ = 1.46836×10⁻⁴ + 1×10⁻⁴ = 2.46836×10⁻⁴ m²/s
L_R   = 0.012 950 / 2.46836×10⁻⁴ = 52.464 m
```

**Ref L_R = 52.464 m.** Sibling: m, same field as engineer-input L_R. displayOnly so the engineer's value isn't clobbered.
