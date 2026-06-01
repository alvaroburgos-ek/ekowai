# Gl. 29 (A138-19) — L_R required for MRE (displayOnly)

`L_R = ((A_C + A_VA)·10⁻⁷·r_D(n) − b·h·k_i − V_M/(D·60·f_Z)) / (b·h·s_R/(D·60·f_Z) + (b+h)·k_i)` — §6.5.2.

Like Gl. 23 but uses (A_C + A_VA) and subtracts V_M/(D·60·f_Z) — the Mulde already provides some storage; the Rigole length only needs to cover the rest.

| Input | Value | Unit |
|---|---:|---|
| A_C, A_VA | 1000, 50 | m² |
| r_D(n) | 130 | l/(s·ha) |
| b_R, h_R | 1.0, 1.0 | m |
| k_i | 5×10⁻⁵ | m/s |
| V_M | 22.051 | m³ (Gl. 14) |
| s_R | 0.317 166 | – |
| D | 30 | min |
| f_Z | 1.2 | – |

```
V_M/(D·60·f_Z) = 22.051/2160 = 0.010 209
num   = 0.013650 − 5×10⁻⁵ − 0.010209 = 0.003 391 m³/s
denom = 0.317166/2160 + 2·5×10⁻⁵   = 2.46836×10⁻⁴ m²/s
L_R   = 0.003391 / 2.46836×10⁻⁴   = 13.738 m
```

**Ref L_R = 13.738 m** (much shorter than the Gl. 23 standalone Rigole length 52.464 m — because the Mulde absorbs much of the inflow). Sibling: m. displayOnly.
