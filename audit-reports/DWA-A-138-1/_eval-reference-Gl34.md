# Gl. 34 (A138-21) — A_S Schacht (Mantel + Sohle)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`A_S = π · d_a² / 4 + π · d_a · h_S / 2` — §6.7.2. d_a in **m** (§6.7.2 L2110 override).

| Input | Value | Unit |
|---|---:|---|
| d_a | 1.0 | m |
| h_S | 4.05 | m |

```
π·d_a²/4    = π·1/4         = 0.785 398
π·d_a·h_S/2 = π·1·4.05/2     = 6.361 725
A_S         = 0.785 + 6.362  = 7.147 m²
```

**Ref A_S = 7.147 m².** Sibling: m², matches A_S field on A138-21 (Schacht-spezifisch). d_a unit guard m per §6.7.2 (no Tab. 2 mm trap because the local list overrides).
