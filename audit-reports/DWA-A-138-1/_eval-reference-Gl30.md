# Gl. 30 (A138-20) — V_MUE Muldenüberlauf-Volumen


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`V_MUE = ((A_C + A_VA) · r_D(n_R) · 10⁻⁷ − A_S,m · k_i) · D · 60 · f_Z − V_M` — §6.5.2 / §6.6.2.

Volumen, das über den Muldenüberlauf in die Rigole abgegeben wird (= ges. Bedarf abzgl. tatsächlicher Mulde).

| Input | Value | Unit |
|---|---:|---|
| A_C, A_VA | 1000, 50 | m² |
| r_D(n_R) → r_D(n) | 130 | l/(s·ha) (alias) |
| A_S,m | 68.823 529 | m² (Gl. 16) |
| k_i | 5×10⁻⁵ | m/s |
| D | 30 | min |
| f_Z | 1.2 | – |
| V_M | 15 | m³ (engineer-chosen, kleiner als Gl. 14 Anforderung) |

```
(A_C+A_VA)·r_D·10⁻⁷   = 0.013 650 m³/s
A_S,m·k_i              = 0.003 441 18 m³/s
Net                    = 0.010 208 82 m³/s
· 2160                 = 22.051 m³
− V_M                  = 22.051 − 15 = 7.051 m³
```

**Ref V_MUE = 7.051 m³** (Überlaufmenge in die Rigole). Sibling: m³ — eigenes Feld auf A138-20, kein Collision mit V_M/V_R. Wenn engineer V_M = V_M_required setzt, V_MUE = 0.
