# DIN-276 Cost Stages Fix — 2026-05-28

**Status:** Applied via Supabase MCP. DB-only changes, no app code in this commit's diff.

## Context

After the KG-subgroup fix (PR #4) and Pass3c gap-filling (PR #5), 10 DIN-276 worksheets remained thin/empty — the cost-stages workflow per §4.3 and supporting reference worksheets. Engineer needed structured fields to capture the HOAI-phase-specific Kostenermittlungen.

## Coverage

10 worksheets, **+110 fields** total, all `verification_status='imported_unverified'`.

| Worksheet | Before | After | Clause | HOAI |
|---|---:|---:|---|---|
| DIN-276-04 Grundstücks- & Flurstücksdaten | 1 | 10 | §4.2 KG 100 | — |
| DIN-276-06 Bezugseinheiten-Kompilation | 1 | 8 | Tab.2 / DIN 277-1 | — |
| DIN-276-07 Kostenkennwert-Bibliothek | 1 | 8 | §4.2.7, §3.13 | — |
| DIN-276-17 Kostengruppen-Klassifikationsübersicht | 0 | 10 | §5.4 Tab.1 | — |
| DIN-276-18 Kostenrahmen | 1 | 15 | §4.3.2 | LPH 0 |
| DIN-276-19 Kostenschätzung | 1 | 14 | §4.3.3 | LPH 2 |
| DIN-276-20 Kostenberechnung | 1 | 14 | §4.3.4 | LPH 3 |
| DIN-276-21 Kostenanschlag | 1 | 16 | §4.3.5 | LPH 6/7 |
| DIN-276-22 Kostenfeststellung | 1 | 15 | §4.3.6/.7 | LPH 8/9 |
| DIN-276-23 Gesamtkostenkompilation | 1 | 8 | §3.11, §3.12 | — |

## Pattern per cost-stage worksheet (DIN-276-18 through -22)

Each stage carries:
- **Section C (metadata):** `<stage>_stand_datum`, `<stage>_lph`, `<stage>_planungsdokumente`, `<stage>_bereits_entstandene_kosten` (oder Stage-spezifisch: Bedarfsplanung DIN 18205 für Kostenrahmen, Vergabeeinheiten-Struktur für Kostenanschlag, Abnahmedatum für Kostenfeststellung)
- **Section D (per-KG breakdown):** `<stage>_KG_100`, `<stage>_KG_200`, …, `<stage>_KG_800` (8 Felder, EUR)
- **Section D (total):** `<stage>_gesamt` (Σ KG 100-800, EUR)

So pro Stage stehen Engineer 1./2./3.-Ebenen-Aufgliederung gegen die Stage zur Verfügung, plus Gesamtkosten als Rollup.

## Supporting worksheets

- **DIN-276-04**: Gemarkung, Flur, Flurstücksnummer, GF, Baulasten, GRZ/GFZ — Property cadastral basis for KG 100
- **DIN-276-06**: GF, BGF, AF, BRI, NUF, Nutzungseinheiten — Reference quantities per Tab.2 (DIN 277-1)
- **DIN-276-07**: Kostenkennwert-Quelle (BKI etc.), Datenstand, Regionalfaktor, Preisstand, Gebäudeart, Standard — Cost parameter library per §4.2.7
- **DIN-276-17**: 8 KG-Übersichten + Gesamtkosten + Bauwerkskosten — Project-level summary across DIN-276-09 to -16
- **DIN-276-23**: Quell-Stage (welche Stufe), Gesamtbaukosten, Bauwerkskosten (KG 300+400), Brutto/Netto, MwSt, €/m² BGF Kennwert, Freigabe-Status — Total compilation per §3.11/§3.12

## Total impact (today's full Pass3c quality work)

| Work | Fields added | Worksheets touched |
|---|---:|---:|
| PR #4 DIN-276 KG sub-groups | +317 | 8 |
| PR #5 Pass3c gap-filling (6 standards) | +327 | 71 |
| This commit DIN-276 cost stages | +110 | 10 |
| **Σ** | **+754** | **89** |
