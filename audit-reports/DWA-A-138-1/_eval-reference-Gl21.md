# Eval-Reference — DWA-A 138-1, A138-18, Gl. 21 (s_R)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

**Purpose:** Hand-calculated reference for the Rigole storage-coefficient formula. The engine is correct only if it reproduces this number to the stated precision.

## Equation row in DB

- Worksheet: `A138-18` — Rigole Bemessung
- equation_number: `21`
- equation_id: `069c2b02-8883-48a4-82ce-b21c9ef1fff8`
- output_symbol: `s_R` (dimensionless)
- DB formula (verbatim, will NOT be changed):

  ```
  s_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi/4) * ((d_i^2/s_F) - d_a^2))
  ```

- input_symbols (DB): `[s_F, b_R, h_R, az, d_i, d_a]`
- Source: §6.4.2 Gl. (21)

## Source semantics (DWA-A 138-1, §6.4.2, source lines 1815-1834)

```
s_R = (s_F / (b_R · h_R)) · [b_R · h_R + az · (π/4) · ((1/s_F) · d_i² − d_a²)]   (21)
```

| Symbol | Unit | Bedeutung |
|---|---|---|
| s_R | – | Speicherkoeffizient der Rigole |
| s_F | – | Speicherkoeffizient des Füll- / Fertigteils der Rigole |
| b_R | m | Breite der Rigole |
| h_R | m | Höhe der Rigole |
| az  | – | Anzahl gleichartiger Versickerrohre im Querschnitt der Rigole |
| d_i | **m** | Innendurchmesser des Versickerrohrs |
| d_a | **m** | Außendurchmesser des Versickerrohrs |

`d_i` and `d_a` units come from the local §6.4.2 variable list (source L1831-1832), which **overrides** Tab. 2's universal `mm` — this is the override the Pile-2 audit confirmed. The 1000× unit-error this prevents is the deliberate test target in Step 4.

DB form `(d_i^2/s_F) - d_a^2` is algebraically identical to source form `(1/s_F)·d_i² - d_a²`. Dimensional check: numerator is m² (since 1/s_F is dimensionless and d_i² is m²), denominator s_F is dimensionless, so the bracket is m² + m² = m². Outer factor (s_F / (b_R·h_R)) is m⁻². Product: dimensionless. ✓

## Concrete test inputs (typical Rigole with DN200 Versickerrohr in Kiessand)

| Symbol | Value | Unit |
|---|---:|---|
| s_F | 0.30 | – (typical Kiessand-Porenanteil) |
| b_R | 1.00 | m |
| h_R | 1.00 | m |
| az | 1 | – (one Versickerrohr) |
| d_a | 0.20 | m (DN200 outer) |
| d_i | 0.184 | m (DN200, 8 mm wall) |

## Hand calc — step by step

```
d_i²                = 0.184²                                    = 0.033856   m²
d_a²                = 0.20²                                     = 0.04       m²
d_i²/s_F            = 0.033856 / 0.30                           = 0.112 853 33…    m²
d_i²/s_F − d_a²     = 0.112 853 33… − 0.04                      = 0.072 853 33…    m²
π/4                 = 0.785 398 16…
az · (π/4) · 0.072 853 33…  = 1 · 0.785 398 16… · 0.072 853 33…
                            = 0.057 218 76…    m²

b_R · h_R                                                       = 1.00       m²
b_R·h_R  +  az·(π/4)·((d_i²/s_F) − d_a²)
                    = 1.00 + 0.057 218 76…                      = 1.057 218 76…    m²

s_F / (b_R · h_R)   = 0.30 / 1.00                               = 0.30       (1/m²)

s_R                 = 0.30 · 1.057 218 76…                      = 0.317 165 63…    (–)
```

**Reference answer: `s_R ≈ 0.317 166` (precision ±5×10⁻⁶, ~3.17 % above s_F as expected for one DN200 pipe in a 1 m² Rigole cross-section).**

Engineering sanity: the dominant term is s_F = 0.30 (gravel-fill porosity). The pipe correction adds ~5.7 % within the bracket → s_R is ~5.7 % above s_F. A second pipe (az=2) would roughly double that. Matches the standard's expected order of magnitude.

## Wizard inputs to enter on the preview (positive case)

| Field | Symbol | Value |
|---|---|---|
| Speicherkoeffizient Füllmaterial s_F | `s_F` | 0.30 |
| Breite der Rigole b_R | `b_R` | 1.00 |
| Höhe der Rigole h_R | `h_R` | 1.00 |
| Anzahl Versickerrohre im Querschnitt az | `az` | 1 |
| Innendurchmesser Versickerrohr d_i | `d_i` | 0.184 |
| Außendurchmesser Versickerrohr d_a | `d_a` | 0.20 |

Expected engine state: **`computed`**, `s_R = 0,3172` (de-DE formatting, 4 fraction digits).

## Negative test — the 1000× unit-error guard

Engineer enters d_i in mm (184) instead of m (0.184). The engine MUST:

- Detect that the field carries `unit='mm'` but the equation profile expects `'m'`.
- Return `manual_required` with `unitConflicts: [{ symbol: 'd_i', expected: 'm', actual: 'mm' }]`.
- NOT display a numeric s_R, NOT write a stale 0.3172 into the store.

This is the audit-flagged risk made live: Tab. 2's universal `mm` would silently overflow the formula by a factor of ~10⁶ on the d² term. The engine prevents the engineer from getting away with it.

## Acceptance gates

| # | Assertion | Expected |
|---:|---|---|
| 1 | Engine reproduces s_R with all units `m` | `0.317 166` ± 5×10⁻⁶ |
| 2 | π is auto-injected into eval scope | `pi/4 = 0.7854…` |
| 3 | d_i unit mismatch (`mm` vs expected `m`) | `manual_required` with `unitConflicts` entry, no number |

## Out of scope

- Other A138-18 equations (Gl. 17, 18, 19, 20, 22, 23, 24, 25).
- Other worksheets.
- New math dependency.
- Editing the DB formula string.
- Merge to main.
