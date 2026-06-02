# Gl. 10 (A138-26) — V_Rück flood-check


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`V_Rück = ((r_D(T_n,Ü) · (SUM(A_E,b,a · C_S) + A_VA) / 10000) − (Q_S + Q_Dr)) · D · 60 / 1000  −  V_VA   ≥ 0` — §5.3.4.

Aggregator path with **its own carrier** `sub_areas_A138_26` (additive schema from Pile-5) and the flood-event runoff coefficient `C_S` per row. **Strictly different** from `sub_areas_A138_10` because C_S ≠ C (Tab. 9 flood vs design event); the engine refuses to silently fall back, so the design-event carrier cannot be used here.

## Worst-case flood test inputs

Large paved catchment, 30-year storm at the 30-min duration that governed the regular V_VA design.

| Input | Value | Unit | Origin |
|---|---:|---|---|
| Sub-areas (flood) | `[{ paved 5000 m², C_S=1.0 }]` | — | A138-26 own carrier |
| A_VA | 50 | m² | A138-10 |
| r_D(T_n,Ü) | 130 | l/(s·ha) | A138-26 own `r_D_30` field |
| Q_S | 5 | l/s | A138-12 |
| Q_Dr | 0 | l/s | A138-20 |
| D | 30 | min | A138-04 |
| V_VA | 22.051 | m³ | A138-13 (Gl. 8) |

## Hand calc

```
Σ A_E,b,a · C_S           = 5000 · 1.0                = 5 000.000 m²
+ A_VA                                                = 5 050.000 m²
÷ 10 000  (ha)                                        =     0.505  ha
× r_D(T_n,Ü)              = 0.505 · 130                =    65.650 l/s   (flood inflow)
− (Q_S + Q_Dr)            = 65.650 − 5                 =    60.650 l/s   (net)
× D · 60                  = 60.650 · 1 800             = 109 170 l
÷ 1 000  (m³)                                         =   109.170 m³
− V_VA                    = 109.170 − 22.051           =    87.119 m³
```

**Reference V_Rück = +87.119 m³** → flood retention **required**. Engineer needs to add 87 m³ of additional flood storage beyond V_VA (or redesign for a smaller flood-relevant catchment).

## Acceptance gates

- ✅ Computed (not manual_required) when all 6 scalars present and ≥1 complete flood-row.
- ✅ V_Rück = +87.119 m³ ± 0.001 for the worst-case inputs.
- ✅ Per-row contribution visible in `substituted`: 5 000 = 5000·1.0.

## Fail-loud cases (tested)

1. **Missing scalar** (e.g. V_VA = null) → `manual_required` naming it.
2. **Empty carrier** → `manual_required` (engineer must declare flood sub-areas; cannot silently re-use design-C).
3. **Incomplete row** (area or C_S null) → `manual_required` naming the row.
4. **Wrong unit on `r_D_30`** (e.g. `mm/h`) → `manual_required` with unit conflict.

## Smaller-storm safe case (positive design check)

With D=5 min, r_D=300 l/(s·ha), 600 m²·C_S=1.0:
- Inflow = 300·0.065 = 19.5 l/s, net 14.5 l/s, volume 4.35 m³, V_Rück = 4.35 − 22.051 = **−17.701 m³**. Negative → design has more storage than needed. ✓

## Note on flood C_S vs design C

The DB has a Pile-5 INSERT for `sub_areas_A138_26` (separate field from `sub_areas_A138_10`). Both carriers share the same shape (`rows: [{ area_m2, kind, ...}]`) but the flood carrier uses **`c_S`** instead of `c`. Tab. 9 gives flood C_S = 1.0 for fully paved at the worst case; the design-event C may be 0.5–0.9 for the same surface. Mixing them up understates flood retention by 10–100 % depending on coefficients.
