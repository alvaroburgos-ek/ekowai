# Gl. 39 (A138-21) — erf_k_f_FS minimum


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`erf_k_f_FS ≥ ((d_a² + 2 · h_S · d_a) / d_i²) · k_i` — §6.7.2.

Mindest-Durchlässigkeit der Filterschicht. Engine berechnet das Minimum (RHS); engineer vergleicht zur tatsächlichen k_f_FS.

| Input | Value | Unit |
|---|---:|---|
| d_a | 1.0 | m |
| h_S | 4.05 | m (Gl. 37) |
| d_i | 0.8 | m |
| k_i | 5×10⁻⁵ | m/s |

```
d_a² + 2·h_S·d_a = 1 + 2·4.05·1     = 9.100
÷ d_i² (0.64)                       = 14.219
· k_i                               = 7.109×10⁻⁴
```

**Ref erf_k_f_FS = 7.109×10⁻⁴ m/s.** Sibling: m/s, matches erf_k_f_FS field. Quelle: Schutz des Grundwassers — k_f_FS darf 10⁻³ m/s nicht überschreiten (§6.7.2 L2169 Quelle).
