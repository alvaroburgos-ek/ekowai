# DWA-A-138-1 Deep Audit Fixes — 2026-05-28

**Status:** Applied via Supabase MCP. DB-only changes, no app code in this commit's diff.

DWA-A-138-1 is the primary infiltration standard for the Heinsberg project. This audit compared the DB state against the markdown `DWA-A_138-1_WD (5).md` (October 2024 edition) and the Pass3c workbook.

## Initial state

28 worksheets, **150 fields**, 41 equations (Gl. 1-41 covering §5.3.3.5/.6/.7, §5.3.4 and §6.2-§6.8).

| Pattern | Worksheets |
|---|---|
| **Empty (0 fields)** | A138-24 (Kombinierte Ergebnis-Zusammenstellung), A138-27 (Abweichungsanalyse) |
| **Thin (1 field, only gate enum)** | A138-09, A138-14, A138-23, A138-25, A138-28 |
| **Thin (3-4 fields)** | A138-03, A138-07, A138-10, A138-15, A138-16, A138-19, A138-26 |

## Gaps identified

### 1. Equation-input symbols missing as scalar fields

Several equations reference symbols that exist only inside the `surface_inventory` json or that have no field at all.

| Worksheet | Equation | Missing scalar | Notes |
|---|---|---|---|
| A138-10 | Gl. 2 (`A_C`) | `A_E_b_a_total`, `A_E_nb_a_total`, `C_m` | per-category in json; scalar totals needed for verification |
| A138-10 | Gl. 3 (`Q_zu`) | `r_D_n`, `D_min` | rainfall intensity at chosen D / n |
| A138-16 | Gl. 13 condition | `k_i_ge_r_check` | `k_i > r_D(n) · 10⁻⁷` boolean |
| A138-17 | Gl. 14 | `A_VA_Mulde`, `b_M`, `L_M` | Mulden-Geometrie |
| A138-18 | Gl. 25 | `r_5_n` | 5-min rainfall for Vollsickerohr-Hydraulik |
| A138-19 | Gl. 26/27 | `V_M_MRE`, `V_R_MRE`, `A_VA_MRE` | volume split + uberregnete Fläche |
| A138-20 | Gl. 30 | `r_D_nR`, `n_R` | Rigolen-Bemessungshäufigkeit + Regenspende |
| A138-21 | Gl. 35-37 | `d_S_innen`, `d_S_aussen`, `r_D_n_S`, `k_i_FS` | Schacht-Geometrie + Filterschicht-Durchlässigkeit |
| A138-22 | Gl. 41 | `A_S_m_Becken`, `A_VA_Becken`, `r_D_n_B`, `n_B` | full Beckenversickerung inputs |
| A138-26 | Gl. 10 | `r_D_30`, `A_E_b_a_flood`, `C_S`, `D_flood_min` | Überflutungsnachweis inputs |

### 2. Empty worksheets needing full build

**A138-24 Kombinierte Ergebnis-Zusammenstellung** — final cross-stage summary tying preliminary A_C from A138-07 to dimensioned facility values from A138-15ff.

**A138-27 Abweichungsanalyse und Design Review** — deviation analysis between preliminary and final values + formal design-review fields.

### 3. Thin summary/verification worksheets

A138-09 / -14 / -23 / -25 / -28 each carry only a single phase-gate enum. Engineer has no way to consolidate the per-phase results inline. Augmented each with phase-level cross-reference outputs + completion metadata + sign-off date/engineer.

## Fixes applied

**+91 fields** net across 16 worksheets, all `verification_status='imported_unverified'`, all idempotent via `ON CONFLICT (worksheet_template_id, symbol) DO NOTHING`.

| Worksheet | Before | After | Δ | Pattern |
|---|---:|---:|---:|---|
| A138-09 Eingangsdaten-Zusammenfassung | 1 | 9 | +8 | data-collection completion checklist |
| A138-10 Bemessungswert A_C und Zufluss | 3 | 8 | +5 | scalar A_E aggregates, r_D_n, D_min |
| A138-14 Zusammenfassung Allgemeine Berechnungen | 1 | 9 | +8 | general-calc consolidated outputs |
| A138-16 Flächenversickerung Bemessung | 4 | 7 | +3 | r_D_n_used, k_i ≥ r condition, D_min |
| A138-17 Muldenversickerung Bemessung | 5 | 9 | +4 | A_VA_Mulde, b_M, L_M, n_M_Bemessung |
| A138-18 Rigole Bemessung | 13 | 16 | +3 | r_D_n_used_R, r_5_n, n_R_Bemessung |
| A138-19 Mulden-Rigolen-Element Bemessung | 4 | 7 | +3 | V_M_MRE, V_R_MRE, A_VA_MRE |
| A138-20 Mulden-Rigolen-System Bemessung | 6 | 9 | +3 | r_D_nR, n_R, Q_zu_total |
| A138-21 Schacht-/Rohrversickerung | 9 | 13 | +4 | d_S_innen, d_S_aussen, r_D_n_S, k_i_FS |
| A138-22 Beckenversickerung Bemessung | 5 | 9 | +4 | A_S_m_Becken, A_VA_Becken, r_D_n_B, n_B |
| A138-23 Anlagen-Zusammenfassung | 1 | 7 | +6 | facility-dimensioning consolidated outputs |
| A138-24 Kombinierte Ergebnis-Zusammenstellung | 0 | 10 | +10 | preliminary↔final compilation |
| A138-25 Bemessungs-Eignungsprüfung | 1 | 8 | +7 | q_S,AC ≥ 2 check, MHGW clearance, completion |
| A138-26 Überflutungsnachweis | 3 | 9 | +6 | r_D_30, A_E_b_a_flood, C_S, D_flood, Q_S_flood, Q_Dr_flood |
| A138-27 Abweichungsanalyse und Design Review | 0 | 9 | +9 | deviation %s, design-review status + reviewer |
| A138-28 Abschließende Nachweiszusammenstellung | 1 | 9 | +8 | phase-complete booleans, final sign-off |

**Total: +91 fields**, **150 → 241 fields**.

## Final state (after fix)

| Metric | Before | After |
|---|---:|---:|
| Total fields | 150 | **241** |
| Empty worksheets | 2 | **0** |
| Worksheets with single-field gate | 5 | **0** |
| Equations missing input scalars | 10 | **0** |

## Methodology

Single transactional MCP `execute_sql` block per worksheet, each with the form:

```sql
DO $$
DECLARE wsid uuid := '<worksheet_template_id>';
BEGIN
  INSERT INTO fields (worksheet_template_id, symbol, label_de, label_en, unit, data_type, is_required, order_index, clause_reference, verification_status)
  VALUES
    (wsid, '<symbol>', '<label_de>', '<label_en>', '<unit>', '<data_type>', <required>, <order>, '<clause>', 'imported_unverified'),
    ...
  ON CONFLICT (worksheet_template_id, symbol) DO NOTHING;
END $$;
```

Verification SELECT after each block confirms expected field count delta.
