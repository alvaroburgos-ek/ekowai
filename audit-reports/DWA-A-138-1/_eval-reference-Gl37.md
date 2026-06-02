# Gl. 37 (A138-21) — h_S Schacht, required


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`h_S = (A_C·10⁻⁷·r_D(n) − (π·d_a²/4)·k_i) / (π·d_i²/(4·D·60·f_Z) + d_a·π·k_i/2)` — §6.7.2.

| Input | Value | Unit |
|---|---:|---|
| A_C | 100 | m² |
| r_D(n) | 130 | l/(s·ha) |
| d_a | 1.0 | m |
| d_i | 0.8 | m |
| k_i | 5×10⁻⁵ | m/s |
| D, f_Z | 30, 1.2 | min, – |

```
num   = 0.001 300 − (π·1/4)·5×10⁻⁵ = 0.001 300 − 3.927×10⁻⁵ = 0.001 261 m³/s
denom = π·0.64/(4·2160) + 1·π·5×10⁻⁵/2
      = π·0.64/8640 + π·2.5×10⁻⁵
      = 2.327×10⁻⁴ + 7.854×10⁻⁵
      = 3.113×10⁻⁴ m²/s
h_S   = 0.001 261 / 3.113×10⁻⁴ = 4.050 m
```

**Ref h_S = 4.050 m.** Sibling: m, matches h_S field. Primary writer (Gl. 40 displayOnly).
