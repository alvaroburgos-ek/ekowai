# Gl. 41 (A138-22) — V_VA Becken


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`V_VA = ((A_C + A_VA) · 10⁻⁷ · r_D(n) − A_S,m · k_i − Q_Dr · 10⁻³) · D · 60 · f_Z · f_A` — §6.8.2.

Variante der Master-Bemessungsgleichung Gl. 8 mit f_A (Abminderungsfaktor) für Becken.

| Input | Value | Unit |
|---|---:|---|
| A_C, A_VA | 1000, 50 | m² |
| r_D(n) | 130 | l/(s·ha) |
| A_S,m | 68.823 529 | m² |
| k_i | 5×10⁻⁵ | m/s |
| Q_Dr | 0 | l/s |
| D | 30 | min |
| f_Z | 1.2 | – |
| f_A | 1.0 | – |

```
(A_C+A_VA)·10⁻⁷·r_D = 0.013 650 m³/s
A_S,m·k_i           = 0.003 441 18 m³/s
Q_Dr·10⁻³           = 0
Net                 = 0.010 208 82 m³/s
· 2160 · 1.0        = 22.051 m³
```

**Ref V_VA = 22.051 m³.** Sibling: m³ — Becken-V_VA auf A138-22 ist ein **eigenes Feld** (kein Collision mit Gl. 8 V_VA auf A138-13). Mit f_A < 1.0 wird das Becken kleiner; engineer-Wahl.
