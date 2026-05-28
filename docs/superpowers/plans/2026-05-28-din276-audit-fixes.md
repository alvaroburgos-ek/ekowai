# DIN-276 Audit Fixes — 2026-05-28

**Status:** Applied via Supabase MCP. DB-only changes, no app code in this commit's diff.

Follow-up to deep field-level audit. Findings and fixes:

## Fixes applied

### 1. Removed 9 duplicate fields

Pre-existing Pass3c fields semantically overlapped with the explicit fields added today. Engineer would see two fields for the same value. Removed the originals (json-containers or generic `*_total` symbols), kept the new explicit fields.

| Worksheet | Removed | Kept |
|---|---|---|
| DIN-276-04 | `plot_area_GF` (unit `m^2`) | `grundstuecksflaeche_GF` (`m²`) |
| DIN-276-06 | `reference_unit_register` (json) | `BU_GF`, `BU_GFA`, `BU_AF`, `BU_BRI`, `BU_NUF`, `BU_NUE` |
| DIN-276-07 | `cost_parameter_library` (json) | 7 explicit `KKW_*` fields |
| DIN-276-18 | `kostenrahmen_total` | `KR_gesamt` |
| DIN-276-19 | `kostenschaetzung_total` | `KSch_gesamt` |
| DIN-276-20 | `kostenberechnung_total` | `KBer_gesamt` |
| DIN-276-21 | `kostenanschlag_total` | `KA_gesamt` |
| DIN-276-22 | `kostenfeststellung_total` | `KF_gesamt` |
| DIN-276-23 | `total_construction_costs` | `GK_total` |

Pre-check confirmed 0 `project_parameters` references on all 9 → safe DELETE.

Equation IDENT-01 in DIN-276-23 was re-pointed from `total_construction_costs` → `GK_total` (output_symbol + formula) before the DELETE.

### 2. Unit notation standardised: `m^2`/`m^3` → `m²`/`m³`

Mixed notation across DIN-276 (caret notation in some pre-existing Pass3c fields vs. unicode superscript in today's additions). Single `UPDATE` to standardise — affected DIN-276-04, -05, -24 fields. Final state: 0 caret-units remaining.

### 3. Improved `clause_reference` precision in DIN-276-04

Previously generic "§4.2, KG 100". Now:

| Field | Old | New |
|---|---|---|
| `gemarkung` | `§4.2, KG 100` | `§4.2.5, §5.4 Tab.1 KG 100` |
| `flur` | `§4.2, KG 100` | `§4.2.5, §5.4 Tab.1 KG 100` |
| `flurstuecksnummer` | `§4.2, KG 100` | `§4.2.5, §5.4 Tab.1 KG 100` |
| `grundstuecksflaeche_GF` | `Tab.2 KG 100` | `§6.2 Tab.2, §5.4 Tab.1 KG 100` |
| `baulasten_vorhanden` | `§4.2` | `§4.2.5` |
| `eigentumsverhaeltnisse` | `§4.2` | `§4.2.5` |
| `baurecht_grundlage` | `§4.2` | `§4.2.5` |
| `bebaubarkeit_GRZ` | `§4.2` | `§4.2.5 (BauNVO §19)` |
| `bebaubarkeit_GFZ` | `§4.2` | `§4.2.5 (BauNVO §20)` |

### 4. Added 15 §4.2 fields per cost-stage worksheet

Per audit gap: §4.2.11 Beigestellte Leistungen / §4.2.13 Prognostizierte Kosten / §4.2.14 Risikobehaftete Kosten missing per stage. Added 3 fields × 5 stages (DIN-276-18 to -22) in Section D, order_index 300/310/320:

| Symbol pattern | Label | Unit | Clause |
|---|---|---|---|
| `<stage>_eigenleistung_anteil` | Beigestellte Leistungen (Eigenleistung) | EUR | §4.2.11 |
| `<stage>_prognose_anteil` | Prognostizierte Kosten | EUR | §4.2.13 |
| `<stage>_risiko_anteil` | Risikobehaftete Kosten | EUR | §4.2.14 |

`<stage>` ∈ {`KR`, `KSch`, `KBer`, `KA`, `KF`}.

## Final state

| Metric | Before | After |
|---|---:|---:|
| DIN-276 total fields | 521 | 527 |
| Duplicate fields | 9 | **0** |
| Caret unit-notations | 7 | **0** |
| Fields w/ precise §4.2 ref | 0 | 15 (§4.2.11/13/14) + 9 (§4.2.5 in DIN-276-04) |
| Empty worksheets | 0 | 0 |

Net: −9 duplicates +15 new fields = +6 fields, large quality improvement.

## Per-worksheet impact (focus set)

| Worksheet | Before | After | Δ |
|---|---:|---:|---:|
| DIN-276-04 Grundstücks- & Flurstücksdaten | 10 | 9 | −1 (duplicate removed) |
| DIN-276-05 Flächen- & Volumenmengen | 4 | 4 | 0 (units fixed only) |
| DIN-276-06 Bezugseinheiten | 8 | 7 | −1 (json container removed) |
| DIN-276-07 Kostenkennwert-Bibliothek | 8 | 7 | −1 (json container removed) |
| DIN-276-17 KG-Klassifikationsübersicht | 10 | 10 | 0 |
| DIN-276-18 Kostenrahmen | 15 | 17 | +2 (−1 dup +3 §4.2.x) |
| DIN-276-19 Kostenschätzung | 14 | 16 | +2 |
| DIN-276-20 Kostenberechnung | 14 | 16 | +2 |
| DIN-276-21 Kostenanschlag | 16 | 18 | +2 |
| DIN-276-22 Kostenfeststellung | 15 | 17 | +2 |
| DIN-276-23 Gesamtkostenkompilation | 8 | 7 | −1 (duplicate removed, equation re-pointed) |
| DIN-276-24 Kostenkennwert-Analyse | 7 | 7 | 0 (units fixed only) |

## Methodology

Single transactional MCP `execute_sql` block performed:
1. `UPDATE equations` re-point IDENT-01 output_symbol + formula
2. `DELETE FROM fields WHERE symbol IN (...)` for 9 duplicates
3. `UPDATE fields SET unit = CASE m^2 → m², m^3 → m³, EUR/m^2 → EUR/m², EUR/m^3 → EUR/m³`
4. `UPDATE fields SET clause_reference = CASE` per DIN-276-04 symbol
5. Verification SELECT confirming 0 duplicates, 0 caret units

Followed by a separate DO block for the 15 §4.2.x inserts (idempotent ON CONFLICT).
