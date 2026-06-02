# Gl. 40 (A138-21) — h_S Schacht, filter-limited form (displayOnly)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`h_S = (A_C·10⁻⁷·r_D(n) − (π·d_i²/4)·k_f,FS) · 4·D·60·f_Z / (d_i²·π)` — §6.7.2.

Alternative h_S-Berechnung wenn die Filterschicht (k_f,FS) limitiert. Engineer wechselt zu Gl. 40 wenn k_f anstehender Boden > 10⁻³ m/s.

| Input | Value | Unit |
|---|---:|---|
| A_C | 100 | m² |
| r_D(n) | 130 | l/(s·ha) |
| d_i | 0.8 | m |
| k_f,FS | 1×10⁻³ | m/s |
| D, f_Z | 30, 1.2 | min, – |

```
num    = 0.001300 − (π·0.64/4)·1×10⁻³  = 0.001300 − 5.027×10⁻⁴ = 7.973×10⁻⁴ m³/s
· 4·D·60·f_Z (8640)                     = 6.889
÷ d_i²·π (2.011)                        = 3.425 m
```

**Ref h_S = 3.425 m.** Sibling: m, same h_S field as Gl. 37. **displayOnly** — Gl. 37 primär (Standard-Form); Gl. 40 als Vergleichsgröße im Filter-limitierten Fall.
