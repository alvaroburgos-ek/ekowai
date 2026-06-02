# Gl. 19 (A138-18) — V_R Rigole, required


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`V_R = (A_C·10⁻⁷·r_D(n) − ((b_R+h_R)·L_R + b_R·h_R)·k_i − Q_Dr·10⁻³) · D · 60 · f_Z` — §6.4.2.

| Input | Value | Unit |
|---|---:|---|
| A_C | 1000 | m² |
| r_D(n) | 130 | l/(s·ha) |
| b_R, h_R | 1.0, 1.0 | m |
| L_R | 10 | m (engineer init) |
| k_i | 5×10⁻⁵ | m/s |
| Q_Dr | 0 | l/s |
| D | 30 | min |
| f_Z | 1.2 | – |

```
A_C·10⁻⁷·r_D                = 0.013 000 m³/s
((b+h)·L + b·h) · k_i       = 21 · 5×10⁻⁵ = 0.001 050 m³/s
Q_Dr·10⁻³                   = 0
Net                         = 0.011 950 m³/s
· 2160                      = 25.812 m³
```

**Ref V_R = 25.812 m³.** Sibling-unit check: m³ matches V_R field and Gl. 20. The embedded `((b+h)·L+b·h)·k_i` is **m³/s** here (not the l/s magnitude from Gl. 4) — internally consistent. Gl. 18's standalone trap doesn't apply because no l/s field is being written.
