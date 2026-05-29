# DWA-A-138-1 Audit Progress — COMPLETE + ALL Pile-1/2 Fixes Applied

**Campaign tag:** `claude-code-2026-05-29`
**Source file:** `DWA-A_138-1_WD (5).md`
**Status:** ✅ **AUDIT + REMEDIATION COMPLETE.** 28/28 worksheets, 312/312 rows. Pile-1 (12 anchor fixes) + Pile-2 (4 deprecations, 2 Wizard-internal reclassifications, 2 unit re-audits) all applied 2026-05-29. **0 mismatches remaining.**

## Final tally — all groups applied

**312 rows audited — 241 match, 0 mismatch, 71 not_found.**

| Table | match | mismatch | not_found | audited |
|---|--:|--:|--:|--:|
| fields | 181 | 0 | 60 | 241 / 241 |
| compliance_requirements | 19 | 0 | 11 | 30 / 30 |
| equations | 41 | 0 | 0 | 41 / 41 |
| **Σ** | **241** | **0** | **71** | **312 / 312** |

Match-Rate **77,2 %**, Mismatch-Rate **0,0 %**, Not-Found-Rate **22,8 %**.

### Delta from original audit tally (Pile-0 → today)

| Δ | match | mismatch | not_found |
|---|--:|--:|--:|
| Pile-0 audit (initial classification) | 227 | 20 | 65 |
| Pile-1 §4.x → valid-anchor (12 rows: mismatch → match) | +12 | -12 | 0 |
| Pile-2 Group 2 deprecate (4 rows: mismatch → not_found, `active=false`) | 0 | -4 | +4 |
| Pile-2 Group 3 Wizard-internal (2 rows: mismatch → not_found, NULL anchor) | 0 | -2 | +2 |
| Pile-2 Group 4 d_a/d_i (2 rows: mismatch → match, audit error corrected) | +2 | -2 | 0 |
| **Net Pile-1 + Pile-2** | **+14** | **-20** | **+6** |
| **Pile-3 final state** | **241** | **0** | **71** |

### What changed in the DB

- **Schema:** added column `fields.active boolean DEFAULT true` (additive, no migration breakage).
- **Group 1 (12 rows):** clause_reference §4.x → valid anchor; audit_status → match; verification_status → verified_against_standard.
- **Group 2 (4 rows):** `a138_k_f_geo` / `a138_korrekturfaktor` / `a138_speichertyp` / `a138_A_u` → `active=false`, verification_status `needs_engineer_review`, audit_status `not_found`. Grep-clean: no production-code reads, no DB equation/condition refs.
- **Group 3 (2 rows):** `a138_V_Sp_vorhanden` / `a138_anlagentyp_kandidaten` → clause_reference NULL, verification_status `inferred_from_worksheet`, audit_status `not_found`.
- **Group 4 (2 rows):** `d_a` / `d_i` (A138-18 Rigole) → audit_status `match`, verification_status `verified_against_standard`. Audit error in Pile-0 corrected: §6.4.2 L1831-1832 locally defines d_i/d_a as `m` for Rigole context (dimensionally consistent with b_R/h_R · m in Gl. 21), parallel to §6.7.2 Schacht L2110/2142. DB unit `m` is source-correct; Tab. 2's universal `mm` is overridden in both §6.x.y contexts that actually use these symbols.

SQL idempotency-guarded in `_pile2-applied.sql`.

### Known standard-internal quirk to document

DWA-A 138-1 has an internal table-vs-text inconsistency: Tab. 2 (L580-581) defines d_a/d_i universally as `mm`, but every §6.x.y that *actually uses* these symbols (§6.4.2 Rigole L1831-1832, §6.7.2 Schacht L2110/2142) locally redefines them as `m`. The local override is dimensionally necessary for the equations to balance (b_R, h_R, L_R, h_S all in m). Engineers reading Tab. 2 without §6.x context risk a 1000× unit error. **Recommendation for engineering review:** note this in the EKOWAI engineer-onboarding for DWA-A 138-1.

> **Hinweis zur STEP-0-Schätzung (343):** Die Vorab-Schätzung 256 fields + 57 equations + 30 CR = 343 war pessimistisch. Tatsächlich sind es 241 fields + 41 equations + 30 CR = **312**. Die Differenz von -31 liegt vollständig bei equations (41 statt 57) — manche WS hatten weniger Gleichungen als angenommen.

## Per-WS Übersicht

| WS | eq | cr | fld | total | match | mismatch | not_found |
|---|--:|--:|--:|--:|--:|--:|--:|
| A138-01 Projektregistrierung | — | 5/5 | 19/19 | 24 | 7 | 0 | 17 |
| A138-02 Standortbewertung | — | — | 12/12 | 12 | 12 | 0 | 0 |
| A138-03 Datenquellen-Doku | — | — | 3/3 | 3 | 2 | 0 | 1 |
| A138-04 Niederschlagsdaten | — | 8/8 | 6/6 | 14 | 10 | 4 | 0 |
| A138-05 Boden-/Hydro | — | — | 7/7 | 7 | 7 | 0 | 0 |
| A138-06 Wasserqualität | — | — | 11/11 | 11 | 11 | 0 | 0 |
| A138-07 Flächeninventar | — | — | 3/3 | 3 | 3 | 0 | 0 |
| A138-08 Bemessung-Parameter | — | — | 8/8 | 8 | 3 | 0 | 5 |
| A138-09 Eingangsdaten-Σ | — | — | 9/9 | 9 | 0 | 0 | 9 |
| A138-10 A_C + Zufluss | 2/2 | 7/7 | 8/8 | 17 | 16 | 0 | 1 |
| A138-11 k_i + f_K | 2/2 | — | 6/6 | 8 | 4 | 4 | 0 |
| A138-12 Q_S + A_S,m | 2/2 | — | 8/8 | 10 | 10 | 0 | 0 |
| A138-13 V_VA + Prüfung | 3/3 | — | 6/6 | 9 | 5 | 4 | 0 |
| A138-14 Σ Berechnungen | — | — | 9/9 | 9 | 5 | 0 | 4 |
| A138-15 Anlagentyp-Auswahl | — | 3/3 | 4/4 | 7 | 4 | 3 | 0 |
| A138-16 Flächenversickerung | 3/3 | — | 7/7 | 10 | 7 | 3 | 0 |
| A138-17 Mulde | 3/3 | — | 9/9 | 12 | 12 | 0 | 0 |
| A138-18 Rigole | 9/9 | — | 16/16 | 25 | 23 | 2 | 0 |
| A138-19 MRE | 4/4 | — | 7/7 | 11 | 11 | 0 | 0 |
| A138-20 MRS | 4/4 | — | 9/9 | 13 | 13 | 0 | 0 |
| A138-21 Schacht | 7/7 | — | 13/13 | 20 | 20 | 0 | 0 |
| A138-22 Becken | 1/1 | — | 9/9 | 10 | 10 | 0 | 0 |
| A138-23 Anlagen-Σ | — | — | 7/7 | 7 | 3 | 0 | 4 |
| A138-24 Komb. Ergebnis | — | 2/2 | 10/10 | 12 | 9 | 0 | 3 |
| A138-25 Bemessungs-Eignung | — | — | 8/8 | 8 | 5 | 0 | 3 |
| A138-26 Überflutung | 1/1 | 5/5 | 9/9 | 15 | 12 | 0 | 3 |
| A138-27 Abweichungsanalyse | — | — | 9/9 | 9 | 0 | 0 | 9 |
| A138-28 Abschl. Nachweis | — | — | 9/9 | 9 | 2 | 0 | 7 |
| **Σ** | **41/41** | **30/30** | **241/241** | **312** | **227** | **20** | **65** |

## Patterns confirmed across full 28-WS Audit

### Pattern 1 — Invalide §4.x-clause_references (Pass3c-Onboarding-Artefakt)

§4 hat in der Quelle nur Subsections **4.1 / 4.2 / 4.3**. Es gibt **kein** §4.4 / §4.5 / §4.6 / §4.7 / §4.8.

**18 mismatches in 5 WS:**
- A138-04: 4 × §4.4
- A138-11: 4 × §4.5 (k_f-Felder)
- A138-13: 4 × §4.6 (Speicher-Felder)
- A138-15: 3 × §4.7 (Anlagentyp-Felder)
- A138-16: 3 × §4.8 (A_u-Felder)

Konzept jeweils real, Anker durchgängig invalide. **Empfohlene Action:** Pass3c-Korrektur der §4.x-Anker auf korrekte §5.3.x / §6.x.y.

### Pattern 2 — Unit-Mismatch d_a/d_i in Rigole-Kontext

A138-18 Rigole: DB hat d_a/d_i in **m**, Tab. 2 spezifiziert **mm**. 2 mismatches.

**Wichtig:** In A138-21 (Schacht) ist d_a/d_i explizit als m definiert (§6.7.2 Z.2110/2142) — **source-internal context-spezifische Unit-Differenzierung**. A138-21 matched korrekt mit m. Nur A138-18 (Rigole) ist falsch, weil dort Tab. 2 (universal) gilt.

### Pattern 3 — §5.1.2 off-by-section → tatsächlich §5.1.1

§5.1.2 ist nur "Überprüfung Umsetzbarkeit" mit Tab. 3 Verweis. Inhalt (Grundwasserflurabstand, Bodenbelastungen, Wasserschutzgebiete, Beschaffenheit Untergrund, Hangneigung) liegt in **§5.1.1**. Pro Row dokumentiert in audit_notes, **keine** Mismatch-Klassifikation gewählt (Konzept real, Anker leicht off-by-section).

### Pattern 4 — Wizard-Bookkeeping = not_found

Wizard-internal Phase-Gates, Timestamps, Engineer-Namen, Review-Status, Onboarding-Stammdaten und engineer-verified Compilation-Checks sind im Standard nicht source-defined. **65 not_found total** verteilt auf:
- A138-01: 17 (Projekt-Onboarding)
- A138-08: 5 (Anlagentyp-Default-Bookkeeping)
- A138-09: 9 (Eingangsdaten-Summary, alle Wizard)
- A138-14: 4
- A138-23: 4 (Phase-4-Gate, Footprint, Timestamps)
- A138-24: 3
- A138-25: 3 (qf_validation, Timestamps)
- A138-26: 3 CR (REQ-24/26/30)
- A138-27: 9 (komplett Wizard, kein source-defined Feld)
- A138-28: 7 (Phase-Gates + Endabnahme)
- Diverse: 1 (REQ-25 Datenquellen-Engineer-Verify in A138-10)

### Pattern 5 — Cross-Reference via Tabelle (OCR-Caveat)

Tab. 3, 5, 6, 7, 8, 9, 10, 11, A.1 sind multi-cell mit Mathpix-OCR-Risiko. Alle Verweise als `verified_via_cross_reference` getaggt.

### Pattern 6 (neu im Final-Block) — "internal"-Marker mit imaginärer Section

A138-REQ-26 (A138-26) hat `clause_reference="internal"` und referenziert eine **"Section L"**, die in DWA-A 138-1 nicht existiert (Standard nutzt keine Buchstaben-Section-Anker). Erster expliziter Wizard-internal-Marker mit imaginärer Source-Referenz im Audit.

## Equations — 41/41 verbatim match

Alle Gleichungen aus §5.3.3.5..7 + §6.2.2–6.8.2 verbatim verifiziert mit LaTeX→ASCII-Normalisierung (\\cdot→·, π→pi, A_{C}→A_C, ≥→>=, deutsche Tausenderpunkte 1.000/10.000 → 1000/10000). Inklusive korrekter Koeffizienten, 10^x-Exponenten, ≥-Caps und algebraischer Identitäten.

**Equation-Verteilung pro WS:**
- A138-10: 2 (Gl. 1+2 A_C)
- A138-11: 2 (k_i, f_K)
- A138-12: 2 (Q_S, A_S,m)
- A138-13: 3 (V_VA-Vorbemessung)
- A138-16: 3 (Flächenversickerung)
- A138-17: 3 (Gl. 11+12+13 Mulde §6.3.2)
- A138-18: 9 (Gl. 17–25 Rigole §6.4.2)
- A138-19: 4 (Gl. 26–29 MRE §6.5.2)
- A138-20: 4 (Gl. 30–33 MRS §6.5.2+§6.6.2)
- A138-21: 7 (Gl. 34–40 Schacht §6.7.2)
- A138-22: 1 (Gl. 41 Becken §6.8.2)
- A138-26: 1 (Gl. 10 V_Rück Überflutung §5.3.4.1)
- §5.3.3.5..7 + §6.2.2: aufgeteilt über A138-10..14

## Compliance Requirements — 19 match, 11 not_found

| Match | Anchor |
|---|---|
| A138-REQ-01..08, 16..19, 21..23 | §5.x / Gl. 9 / Gl. 10 |

| Not_found | Grund |
|---|---|
| REQ-09, 15, 20, 24, 25, 26, 27, 28, 29, 30, 31 | Wizard-Gates / "engineer-verified" / internal-Marker |

## Files

- 28 Per-WS Reports: `A138-01.md` … `A138-28.md`
- This file: `_PROGRESS.md` (final state)

## Resumability

**Nicht relevant — Audit komplett.** Bei künftiger Re-Audit-Kampagne neuen Tag wählen (z.B. `claude-code-2026-Q4`), der Skip-Filter ist `WHERE audited_by='<tag>' AND audited_at IS NOT NULL`.
