# Eval-Reference — DWA-A 138-1, A138-17, Gl. 15 (V_M Mulde, geometric)

`V_M = A_S,m · h_M` — §6.3.2.

Geometrisches Mulden-Volumen. **displayOnly** — Vergleichsgröße zur Gl. (14)-Anforderung; Gl. 14 ist primärer Schreiber.

| Input | Value | Unit | Origin |
|---|---:|---|---|
| A_S,m | 68.823 529 | m² | A138-17 (Gl. 16, wired) |
| h_M | 0.30 | m | A138-17 (engineer) |

V_M = 68.823 529 · 0.30 = **20.647 m³** (precision ±0.001).

### Unit guard
A_S,m in m²; h_M in m. Mismatch → manual_required.

### Sibling-unit check
Output V_M in **m³** — same field as Gl. (14). `displayOnly` prevents store race.

### Reading the result
With these inputs: Gl. (14) requires 22.051 m³; Gl. (15) geometric is 20.647 m³ → insufficient by 1.404 m³ (≈ the direct rain on the Mulde via A_VA). Engineer enlarges A_S,m or h_M.
