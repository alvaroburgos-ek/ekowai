# Eval-Reference — DWA-A 138-1, A138-13, Gl. 8 (V_VA — master sizing)


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

**Purpose:** Hand-calculated reference for the master sizing equation. V_VA is iterated across the KOSTRA duration table; the engine is correct only if it returns the **same maximum V_VA** AND **names the same governing D** as the hand calc.

## Equation row in DB

- Worksheet: `A138-13` — V_VA + Prüfung
- equation_number: `8`
- equation_id: `69f31e6e-a755-4246-af10-ae46668b5c86`
- output_symbol: `V_VA` (m³)
- DB formula (verbatim, will NOT be changed):

  ```
  V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3
  ```

- input_symbols (DB): `[Q_zu, Q_S, Q_Dr, D, f_Z, f_A]`
- Source: §5.3.3.7 Gl. (8)

## Iteration semantics

Q_zu is not an independent scalar — it is fixed by Gl. (3):

```
Q_zu = r_D(n) · (A_C + A_VA) · 10⁻⁴     l/s
```

So iterating Gl. (8) across the KOSTRA table means substituting **each row's `(D, r_D(n))` pair** into the combined formula:

```
V_VA(D) = (r_D(n) · (A_C + A_VA) · 10⁻⁴ − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³
```

The governing duration is the D that produces the largest V_VA. The standard (§5.3.3.7) calls for this iteration as the standard sizing approach.

## Concrete inputs (Heinsberg-like, BK I/II)

### Scalar inputs

| Symbol | Value | Unit | Source worksheet (in project flow) |
|---|---:|---|---|
| A_C | 1000 | m² | A138-10 (Bemessungswert) |
| A_VA | 50 | m² | A138-10 |
| Q_S | 5 | l/s | A138-12 (Q_S = k_i · A_S · 10³ with k_i=5×10⁻⁵, A_S=100 m²) |
| Q_Dr | 0 | l/s | engineer input (no Drossel in this scenario) |
| f_Z | 1.2 | – | A138-08 (Zuschlagsfaktor) |
| f_A | 1.0 | – | A138-08 (Abminderungsfaktor) |

So `A_C + A_VA = 1050 m²` and `Q_zu(r_D) = r_D · 1050 · 10⁻⁴ = 0.105 · r_D  [l/s]`.

### KOSTRA r_D(n) table for n = 0.1/a (10-year return), Heinsberg-like

| D (min) | r_D(n) (l/(s·ha)) |
|---:|---:|
| 5 | 300 |
| 10 | 230 |
| 15 | 195 |
| 30 | 130 |
| 60 | 80 |
| 120 | 50 |

## Hand calc — V_VA(D) per row

For each row: `V_VA = (Q_zu − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³` with Q_zu = 0.105·r_D, Q_S=5, Q_Dr=0, f_Z=1.2, f_A=1.0.

| D (min) | r_D (l/(s·ha)) | Q_zu (l/s) | Q_zu − Q_S − Q_Dr (l/s) | × D · 60 (l) | × f_Z · f_A | × 10⁻³ → **V_VA (m³)** |
|---:|---:|---:|---:|---:|---:|---:|
| 5 | 300 | 31.50 | 26.50 |  7 950 |  9 540 | **9.540** |
| 10 | 230 | 24.15 | 19.15 | 11 490 | 13 788 | **13.788** |
| 15 | 195 | 20.475 | 15.475 | 13 927.5 | 16 713 | **16.713** |
| **30** | **130** | **13.65** | **8.65** | **15 570** | **18 684** | **18.684 ← MAX** |
| 60 | 80 | 8.40 | 3.40 | 12 240 | 14 688 | **14.688** |
| 120 | 50 | 5.25 | 0.25 | 1 800 | 2 160 | **2.160** |

### Acceptance answer

- **Maximum V_VA = 18.684 m³**
- **Governing D = 30 min**
- Precision: ±0.001 m³ (the table arithmetic is exact; floating-point noise should be far below this).

Engineering sanity: for a 1 ha-class catchment with k_i ≈ 5×10⁻⁵ m/s, the governing duration typically lands between 15 and 30 min — short bursts have high intensity but little volume; long bursts have lots of volume but the soil infiltrates it all. ✓

## Wizard inputs to enter on the preview

### Scalar fields (same-symbol-inherited from upstream worksheets in a real project)

A_C=1000, A_VA=50, Q_S=5, Q_Dr=0, f_Z=1.2, f_A=1.0.

### KOSTRA table — `r_D_n_table` carrier on A138-04 (six rows above).

**Expected engine state:** `computed`, displayed result reads **`V_VA = 18,684 m³ (D = 30 min)`** — both the maximum AND the governing duration must be surfaced. Per-row contributions visible in the substituted-inputs panel.

## Negative tests

1. **Empty / incomplete KOSTRA table.** Add a row with D set but `r_D` left blank → `manual_required` naming the incomplete row, NO number, store cleared.
2. **Wrong unit on the table column.** If the table's r_D unit is somehow not `l/(s·ha)` (e.g. m/s or mm/h), the engine must `manual_required` per the unit guard — same fail-loud rule as the d_i/mm guard for Gl. 21. No silent miscompute.

## Acceptance gates

| # | Assertion | Expected |
|---:|---|---|
| 1 | Engine returns max V_VA across the 6 rows | **18.684 m³** ± 0.001 |
| 2 | Engine names the governing D | **30 min** |
| 3 | Substituted map surfaces all 6 row contributions | 6 entries |
| 4 | Incomplete row → manual_required, no number, store cleared | ✓ |
| 5 | Wrong-unit r_D → manual_required, no number | ✓ |
| 6 | Missing scalar (e.g. f_Z) → manual_required, missing=['f_Z'] | ✓ |

## Out of scope

- Other A138-13 equations.
- Wiring cross-worksheet symbol propagation (A_C, A_VA, Q_S, Q_Dr, f_Z, f_A from upstream worksheets in production). The engine + Harness prove the algorithm; production form integration is a follow-up.
- Editing the DB formula string.
- Merge to main.
