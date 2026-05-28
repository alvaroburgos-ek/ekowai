# Pass3c Workbook Gap-Filling — 2026-05-28

**Status:** Applied via Supabase MCP. DB-only changes, no code in this commit's diff.

## Context

A quality audit across all 14 standards in DB (project `vadsmshzebefjreqcicl`) identified worksheets where the Pass3c workbook left the Fields sheet sparse or empty — the equations were defined but the input/output parameter fields the engineer needs to fill in were missing. Markdown source-of-truth was used to define the missing fields, all marked `verification_status='imported_unverified'` so the engineer reviews before use.

## Coverage per standard

| Standard | Fields before today | Fields after today | Δ | Notes |
|---|---:|---:|---:|---|
| DIN-276 | 69 | 386 | +317 | KG sub-groups (separate PR #4) + Aufteilungswerte sub-sections |
| DWA-M-102-4 | 75 | 186 | +111 | Wasserbilanz + Aufteilungswerte (13 empty worksheets filled) |
| DWA-A-262E | 107 | 196 | +89 | All 7 empty filter-type Bemessungs-worksheets filled |
| FLL-GAR-2023 | 83 | 142 | +59 | 7 empty material-type worksheets filled (Bitumenbahnen, Flüssigkunststoff, GUP, Schutzlagen, etc.) |
| DWA-A-102-2 | 76 | 115 | +39 | Output fields added per equation (Q_R,krit, eta_erf, C_b,CSB, V_s, etc.) |
| DWA-A-138-1 | 132 | 150 | +18 | Anlagentyp-Auswahl, Flächenversickerung, KOSTRA-Daten |
| DWA-A-178 | 71 | 82 | +11 | Einzugsgebietsdaten, Filterzulauffracht, Vorbemessung |

## DWA-M-102-4 — most critical (Heinsberg)

13 empty + 4 thin worksheets filled with §A/§B-conformant parameters:

| Worksheet | Title | Δ Fields |
|---|---|---:|
| M104-06 | Klimadatenzusammenfassung | +3 (P, P_korr, ET_p) |
| M104-10 | Wasserbilanzvergleich und Zielvorgaben | +8 |
| M104-11 | Inventar befestigter Flächen | +13 (per Belag-Typ) |
| M104-15 | Flächeninventar Zusammenfassung | +5 |
| M104-16 | Aufteilungswerte Dachflächen (§A.2, A.3) | +5 (Sp, dachtyp + 3 outputs) |
| M104-17 | Aufteilungswerte Verkehrsflächen (Tab.B.1) | +4 |
| M104-18 | Aufteilungswerte teildurchlässige Beläge (§A.6-A.10) | +9 |
| M104-19 | Aufteilungswerte Gründach/Einstaudach (§A.4, A.5) | +7 |
| M104-23 | Aufteilungswerte Flächenversickerung (§B.2) | +5 |
| M104-24 | Aufteilungswerte Versickerungsmulden (§B.3) | +5 |
| M104-25 | Aufteilungswerte Mulden-Rigolen-Elemente (§B.4) | +5 |
| M104-26 | Aufteilungswerte Mulden-Rigolen-Systeme (§B.5) | +6 |
| M104-29 | Kombinierte Wasserbilanzberechnung | +7 |
| M104-30 | Flächengewichtete Mittelwertbildung | +5 |
| M104-32 | Wasserbilanz Referenzzustand & Nachweis | +13 (HAD-Daten + Nachweis) |
| M104-34 | Hydrologisches Dreieck | +6 |
| M104-35 | Finales Lieferdokument | +5 |

Engineer kann nun den vollständigen Wasserhaushaltsnachweis nach DWA-M 102-4 §5.4 führen.

## DWA-A-262E — Pflanzenkläranlagen

All 7 empty filter-type Bemessungs-worksheets + 6 partial ones filled:

| Worksheet | Title | Δ Fields |
|---|---|---:|
| A262-03 | Datenquellen-Dokumentation | +6 |
| A262-04 | Abwasser-Charakterisierung | +7 |
| A262-07 | Vorbehandlung | +5 |
| A262-09 | Eingabedaten-Zusammenfassung | +5 |
| A262-11 | VF Sand 0-2mm Kleinanlage | +6 |
| A262-12 | Zweistufiger VF Kies+Sand Kleinanlage | +3 |
| A262-13 | VF Grobsand 0-4mm Kleinanlage | +6 |
| A262-16 | Aktiv belüfteter HF Kies Kleinanlage | +4 |
| A262-17 | Bemessungs-Zusammenfassung Kleinanlage | +5 |
| A262-18 | Filtertyp-Inventar Kommunale KA | +7 |
| A262-20 | Zweistufiger VF Kies+Sand Kommunale KA | +5 |
| A262-21 | VF Grobsand 0-4mm Kommunale KA | +5 |
| A262-22 | Aktiv belüfteter VF Kies 8-16mm Kommunale KA | +7 |
| A262-24 | Bemessungs-Zusammenfassung Kommunale KA | +6 |
| A262-26 | Grauwasser-Behandlung | +7 |
| A262-32 | Eigenkontroll- und Wartungsplan | +5 |

## DWA-A-102-2 — Niederschlagswasser-Behandlung

19 thin calculation worksheets augmented with their equation output fields. Pattern: each calc-WS represents one calculated quantity (Q_R,krit, eta_erf, q_A,Bem, V_s, etc.) so adding the output_symbol field per worksheet completes the data model. 27 worksheets touched, +39 fields.

## FLL-GAR-2023 — Gewässerabdichtungsrichtlinien

7 empty material-type worksheets and 4 partial ones filled with material-specific Bemessungs-parameters:

- FLL-GAR-08 Bauliche Erfordernisse (+7)
- FLL-GAR-11 Mineralisch mit Zusatzstoffen (+6)
- FLL-GAR-13 Mineralisch mit Bitumen (+5)
- FLL-GAR-15 Bitumenbahnen (+6)
- FLL-GAR-17 Flüssigkunststoff (+6)
- FLL-GAR-21 GUP (+6)
- FLL-GAR-22 Schutzlagen und Schutzschichten (+6)
- FLL-GAR-24 Bepflanzung und Einbauten (+4)
- FLL-GAR-27 Inbetriebnahme (+5)
- FLL-GAR-28 Instandhaltung (+4)
- FLL-GAR-29 Konformitäts-Zusammenfassung (+4)

## DWA-A-138-1 + DWA-A-178 — Minor fixes

Both now have 0 thin calc/data_collection worksheets.

- DWA-A-138-1: KOSTRA-Niederschlagsdaten, k_f-Korrekturfaktoren, Speicherbemessung, Anlagentyp-Auswahl, Flächenversickerung-Bemessung
- DWA-A-178: Einzugsgebietsdaten, Filterzulauffracht (AFS/CSB), Vorbemessung Bodenfilteroberfläche

## Final QC across all 14 standards

| Standard | Calc-WS | Empty | Thin (≤2 fields) | Total fields | Status |
|---|---:|---:|---:|---:|---|
| DIN-276 | 18 | 0 | 8 | 386 | 🟡 Kosten-Stages-WS thin |
| DWA-A-102-2 | 27 | 0 | 14 | 115 | 🟡 Calc-WS sind 1-WS-pro-Größe |
| DWA-A-138-1 | 18 | 0 | 0 | 150 | 🟢 |
| DWA-A-178 | 11 | 0 | 0 | 82 | 🟢 |
| DWA-A-262E | 25 | 0 | 0 | 196 | 🟢 |
| DWA-M-102-4 | 27 | 0 | 7 | 186 | 🟡 Parameter-data-collection-WS |
| DWA-M-179-1 | 11 | 0 | 6 | 61 | 🟡 Wirkungsgrad-WS |
| DWA-M-816 | 19 | 2 | 9 | 68 | 🟠 Investitionsrechnung |
| DWA-M-820-1 | 14 | 1 | 8 | 82 | 🟡 QM-Checklisten |
| DWA-M-820-2 | 16 | 1 | 5 | 97 | 🟡 QM-Checklisten |
| DWA-M-820-3 | 20 | 0 | 0 | 248 | 🟢 |
| FLL-GAR-2023 | 22 | 0 | 5 | 142 | 🟡 small WS |
| FLL-Naturteich | 12 | 0 | 1 | 113 | 🟢 |
| FLL-TP-RHIZOM-2023 | 12 | 1 | 5 | 104 | 🟡 |

**4 standards fully complete** (0 thin): DWA-A-138-1, DWA-A-178, DWA-A-262E, DWA-M-820-3, FLL-Naturteich (with 1 thin acceptable).

## Methodik

Pro Standard:
1. Markdown gelesen für Tab-Verweise und Parameter-Tabellen
2. Pass3c Workbook (`_inspect-pass3c.ts`) verifiziert die Fields-Sheet-Lücken
3. Equations in DB inspiziert — Input/Output-Symbols zeigen erwartete Felder
4. Fehlende Felder via MCP `execute_sql` als idempotente DO-Blöcke (`ON CONFLICT DO NOTHING`) gepusht
5. Counts pro Worksheet verifiziert

## Not addressed (future work)

- **DWA-A-102-2** verbleibende 14 thin WS sind 1-Output-pro-WS — vermutlich intendiertes Design, könnte zusammengefasst werden
- **DWA-M-816** (Investitionsrechnung): 9 thin + 2 empty worksheets, eigener Workflow
- **DWA-M-820-1/2**: QM-Merkblatt-Worksheets sind intentional Checklisten, größtenteils text-fields
- **DWA-M-179-1**: 6 thin Wirkungsgrad-Worksheets
- **FLL-TP-RHIZOM-2023**: 5 thin Wuchsleistungs-Auswertungs-Worksheets
- **DIN-276**: 8 thin Kosten-Stages (Kostenrahmen, Kostenschätzung, etc.) — separate work item

## Total impact

**+644 fields** across **79 worksheets** in **7 standards**. All `verification_status='imported_unverified'`.
