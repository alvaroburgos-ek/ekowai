# Eval-Reference — DWA-A 138-1, A138-10, Gl. 2 (A_C)

> **Iteration 2 (2026-05-29):** The mean-C_m rewrite from iteration 1 is retired in this iteration. The engine now computes Σ(A_i · C_i) directly over per-sub-area rows. The mixed-coefficients case below is the acceptance gate the old rewrite would FAIL. Iteration-1 case retained at the bottom for historical reference only.

**Purpose:** Hand-calculated reference for the formula evaluator. The wizard's engine is correct only if it reproduces these numbers to the stated precision.

**Equation row in DB**

- Worksheet: `A138-10` — Bemessung A_C + Zufluss
- equation_number: `2`
- equation_id: `1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3`
- output_symbol: `A_C` (m²)
- DB formula (verbatim, will NOT be changed):
  ```
  A_C = SUM(A_E_b_a_i * C_i) + SUM(A_E_nb_a_i * C_i)
  ```
- input_symbols (DB): `["A_E_b_a_i", "A_E_nb_a_i", "C_i"]`
- Source: §5.3.3.5 Gl. (2)

**Source semantics**

Gl. 2 sums runoff-coefficient-weighted sub-area contributions:

- `A_E,b,a,i · C_i` — paved sub-area i, befestigt + angeschlossen, with its own runoff coefficient
- `A_E,nb,a,i · C_i` — unpaved sub-area i, nicht befestigt + angeschlossen, with its own runoff coefficient
- A_C — Bemessungswert (m²)

## Wizard data model vs. source formula

The wizard does **not** currently store sub-area arrays. It stores three scalar values, all on worksheet A138-10:

| Wizard field (symbol) | Meaning | Unit |
|---|---|---|
| `A_E_b_a_total` | Gesamtfläche der befestigten, angeschlossenen Sub-Areale | m² |
| `A_E_nb_a_total` | Gesamtfläche der nicht befestigten, angeschlossenen Sub-Areale | m² |
| `C_m` | Mittlerer Abflussbeiwert (area-weighted mean) | – |

The wizard form has no fields for individual `A_E,b,a,i` / `C_i` / `A_E,nb,a,i`. To evaluate Gl. 2 from totals + mean, the evaluator rewrites the SUM-over-i form into a totals-form **transparently**, and the badge displays both the original and the rewritten formula so the engineer can see what happened.

**Rewrite rule (registered for equation id `1a48af79-...`):**

| Source token | Rewritten as |
|---|---|
| `SUM(A_E_b_a_i * C_i)` | `A_E_b_a_total * C_m` |
| `SUM(A_E_nb_a_i * C_i)` | `A_E_nb_a_total * C_m` |

Effective formula evaluated: `A_C = A_E_b_a_total * C_m + A_E_nb_a_total * C_m`

The rewrite is **exact** when `C_m` is the area-weighted mean across both paved and unpaved sub-areas (which is the standard's recommended C-derivation per Tab. 9). If the engineer ever uses a per-category mean instead of a single overall mean, the rewrite over-estimates / under-estimates by the area-weighted gap between the two means — engineer must verify the C_m derivation. Badge surfaces this caveat.

## Iteration 2 — per-sub-area evaluation

The engine now reads from a new field `sub_areas_A138_10` (`data_type='json'`). Each row carries:

```ts
{ id: string; label: string; kind: 'paved' | 'unpaved'; area_m2: number; c: number }
```

A row is "complete" when both `area_m2` and `c` are present and finite. The engine computes:

```
A_C = Σ_{kind=paved}   area_m2 · c   +   Σ_{kind=unpaved}   area_m2 · c
    = Σ_{all rows}     area_m2 · c          (paved + unpaved both contribute)
```

If ANY row is incomplete (missing area or c), or the field is empty, the engine returns `manual_required` — never a partial sum.

### Test case A — Uniform coefficients

All sub-areas share the same C. The old mean-C_m rewrite would also get this right; included to verify both the iteration-2 path AND that the per-area sum reduces to the legacy answer when coefficients are uniform.

| # | Label | kind | A_i (m²) | C_i | A_i · C_i (m²) |
|---:|---|---|---:|---:|---:|
| 1 | Carpark A | paved | 300 | 0.85 | 255 |
| 2 | Carpark B | paved | 200 | 0.85 | 170 |
| 3 | Verge | unpaved | 100 | 0.85 | 85 |
| | | | **600** | (uniform) | **510** |

```
Σ_paved   = 300·0.85 + 200·0.85 = 425
Σ_unpaved = 100·0.85           =  85
A_C       = 425 + 85           = 510 m²
```

**Reference A: `A_C = 510 m²` (precision 0.01).**

For comparison: the old totals-form would give A_E_b_a_total · C_m + A_E_nb_a_total · C_m = 500·0.85 + 100·0.85 = **510 m²** — same. (Expected: when C is uniform, the two approaches agree exactly.)

### Test case B — Mixed coefficients (acceptance gate)

This is the case the old rewrite would silently get **wrong** if the engineer enters an inconsistent C_m. Four sub-areas with realistic Tab. 9 values:

| # | Label | kind | A_i (m²) | C_i | A_i · C_i (m²) |
|---:|---|---|---:|---:|---:|
| 1 | Steiles Steildach | paved | 400 | 0.90 | 360 |
| 2 | Pflaster Hof | paved | 300 | 0.80 | 240 |
| 3 | Kies 5–10 % Neigung | paved | 100 | 0.50 |  50 |
| 4 | Rasen | unpaved | 200 | 0.20 |  40 |
| | | | **1000** | — | **690** |

```
Σ_paved   = 400·0.90 + 300·0.80 + 100·0.50 = 360 + 240 + 50 = 650
Σ_unpaved = 200·0.20                       = 40
A_C       = 650 + 40                       = 690 m²
```

**Reference B (correct, per-area): `A_C = 690 m²` (precision 0.01).**

#### What the old totals-form would have produced

If the engineer entered the totals + a single "mean" C_m chosen reasonably but not area-weighted across both groups (e.g. arithmetic mean of paved coefficients only = (0.9+0.8+0.5)/3 = **0.733**, then applied uniformly):

```
A_C_old = (A_E_b_a_total + A_E_nb_a_total) · C_m
        = (800 + 200) · 0.733
        = 1000 · 0.733
        ≈ 733.33 m²
```

That's **+43.33 m² (+6.3 %) too high** — non-trivial when A_C feeds Q_zu downstream and ultimately storage volume V_VA. The per-area approach removes the engineer's room to pick a misleading mean.

(For full transparency: if the engineer DID compute the area-weighted mean correctly, C_m = 690/1000 = 0.69, then 1000·0.69 = 690 m² — algebraically equivalent. The risk is precisely that engineers often don't, and the old rewrite gave no way to verify which mean was used.)

## Wizard inputs to enter on the preview (case B)

Open A138-10, scroll to the "Teilflächen" sub-area editor, add four rows:

| # | Label | Versiegelung | A (m²) | C |
|---:|---|---|---:|---:|
| 1 | Steildach | befestigt | 400 | 0.90 |
| 2 | Pflaster Hof | befestigt | 300 | 0.80 |
| 3 | Kies 5–10 % | befestigt | 100 | 0.50 |
| 4 | Rasen | unversiegelt | 200 | 0.20 |

**Expected engine state = `computed`, `A_C = 690 m²`.**

## Negative test (missing data)

Delete the `C` value on row 3. The engine must:
- Return `manual_required` with a reason naming the incomplete row.
- NOT display a number for A_C (the badge shows "rechnerisch nicht bestätigt — manuell prüfen").
- Leave the previous A_C value cleared (no stale number).

## Acceptance gate (Iteration 2)

- ✅ Engine reproduces Case A (uniform): `A_C = 510 m²`.
- ✅ Engine reproduces Case B (mixed): `A_C = 690 m²` — and the badge surfaces all four `A_i · C_i` substitutions.
- ✅ Negative case: `manual_required`, no number, no stale value carried forward.

---

## Iteration 1 (historical) — totals + mean C_m rewrite

> Retired 2026-05-29. The single-C_m rewrite is NO LONGER REGISTERED in `src/lib/eval/rewrites.ts` for Gl. 2.

Original test case: 500 m² Asphalt (C=0.90) + 200 m² Pflaster (C=0.80) + 100 m² Rasen (C=0.20).
Hand calc: Σ = 450 + 160 + 20 = **630 m²**. Old wizard equivalents used `A_E_b_a_total=700`, `A_E_nb_a_total=100`, `C_m=0.7875` (area-weighted).
