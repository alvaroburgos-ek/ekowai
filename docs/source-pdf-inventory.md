# Source-PDF Inventory (per standard) — RECORDED PATHS

Binding companion to `docs/verification-doctrine.md` §Source documents. Built 2026-07-27 by an
exhaustive machine-wide sweep: **787 PDFs enumerated** under `C:\Users\Ekowai` (all drives checked;
`E:` empty), matched against the **71 standards in the prod encoding snapshot**
(`vadsmshzebefjreqcicl`, exported 2026-07-24T14:18Z).

**Result: 70 / 71 standards have their own source PDF on this machine. One is genuinely absent.**

Policy (per Alvaro, 2026-07-27): every guideline we work with is already on this computer — **no
external acquisitions**. A "missing" entry means *not yet located*, and is re-searched, never bought.

## Confidence column
- **VERIFIED** — path hand-checked this session (folder listed, file identity confirmed).
- **AUTO** — matched by filename against the standard code. Authoritative enough to open, but the
  first VA claim per standard MUST confirm the file is the standard text (SR-3 requires a PDF page
  ref, so a wrong file surfaces immediately). Promote to VERIFIED on first use.
- **QUESTIONED / SOURCE-ABSENT** — do not treat as a VA source.

## Traps found this sweep (do not repeat)
- `Desktop\Format data\DWA 7xx\*.pdf` are **43 KB structural-mapping instruction stubs**, NOT the
  standards. The authoritative multi-part sets live under `Desktop\Share\Regulations\DWA\`.
- `Anwendungsbeispiel_..._Zusatzdatei.pdf` is the **worked-example companion**, not DWA-A-102-2
  itself — but it IS the `Zusatzdatei-RKB` document that `dp-03-bild4-regression` was waiting on.
- Several folders are mis-named (`ISO 12015` holds ISO 14015; `VDI-2653` holds VDI-2163) — match on
  the FILE, never the folder.

## Per-standard table

| standard | recorded path | confidence | note |
|---|---|---|---|
| ATV-A-704E | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ATV A 704E\ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf` | AUTO | |
| DIN-14021 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-14021\DIN-EN-ISO-14021.pdf` | AUTO | |
| DIN-14071-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-14071-1\DIN-CEN-ISO-14071-1.pdf` | AUTO | |
| DIN-18130-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-18130-1\DIN-18130-1.pdf` | AUTO | |
| DIN-1989-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\DIN-1989-1.pdf` | AUTO | |
| DIN-1989-2 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-2\DIN-1989-2.pdf` | AUTO | |
| DIN-276 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-276\DIN-276.pdf` | AUTO | |
| DIN-EN-16941-2 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-EN-16941-2\DIN-EN-16941-2.pdf` | AUTO | |
| DIN-EN-ISO-14044 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-EN-ISO-14044\DIN-EN-ISO-14044-D.pdf` | AUTO | |
| DVS-2225-4 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DVS-2225-4\DVS-2225-4.pdf` | AUTO | |
| DWA-A-102-2 | `C:\Users\Ekowai\Desktop\Share\Regulations\DWA\DWA 102-2\DWA-A_102-2_Part{1,2,3,4}.pdf` (4-part set) | VERIFIED | per-part page offsets −1/+24/+49/+74 per the doctrine |
| DWA-A-125 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-A-125\DWA-A-125.pdf` | AUTO | |
| DWA-A-131 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-A-131\DWA-A-131.pdf` | **VERIFIED 2026-07-27** | Arbeitsblatt DWA-A 131 "Bemessung von einstufigen Belebungsanlagen", **Juni 2016**, **76 pp**, text-extractable, not encrypted. **CORRECTED:** the auto-match had recorded the sibling `DWA-A-131-WD-Fuer-Belebungsexpert.pdf` — a buyer's variant ("Für Käufer des Belebungsexperts") of only **72 pp**, 4 pages short. Cite the 76-pp file only. |
| DWA-A-138-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).pdf` | **VERIFIED 2026-07-27** | Arbeitsblatt DWA-A 138-1 "Anlagen zur Versickerung von Niederschlagswasser – Teil 1: Planung, Bau, Betrieb", **Oktober 2024**, **104 pp**, text-extractable, not encrypted. **Nachweisverfahren = §5.3.3.3**, TOC p8 → printed p39 = PDF p41 (confirms the −2 offset); Tab.12 Einfaches-vs-Nachweisverfahren at PDF p51. |
| DWA-A-178 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-178\DWA-A_178.pdf` | AUTO | |
| DWA-A-201 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-201\dwa_a_201 (1).pdf` | AUTO | |
| DWA-A-222 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-222\DWA-A_222 (1).pdf` | AUTO | |
| DWA-A-226 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-A-226\DWA-A-226.pdf` | AUTO | |
| DWA-A-262E | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).pdf` | **VERIFIED 2026-07-27** | Standard DWA-A 262E "Principles for Dimensioning, Construction and Operation of Wastewater Treatment Plants with Planted and Unplanted Filters…", **November 2017** (DWA "Check 2024 Approved by Experts"), **76 pp**, text-extractable, not encrypted. Bilingual title block (EN + DE). Carries a DWA per-licensee watermark — strip it from quotes. |
| DWA-A-272E | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-272E\DWA-A_272E (1).pdf` | AUTO | |
| DWA-M-102-4 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-102-4\DWA-M_102-4.pdf` | AUTO | |
| DWA-M-1200-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-1200-1\DWA-M_1200-1_GD.pdf` | AUTO | |
| DWA-M-1200-2 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-1200-2\DWA-M_1200-2_GD.pdf` | AUTO | |
| DWA-M-1200-3 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-1200-3\DWA-M_1200-3_GD.pdf` | AUTO | |
| DWA-M-179-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-179-1\DWA-M_179-1_GD.pdf` | AUTO | |
| DWA-M-187 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-187\DWA-M_187_GD.pdf` | AUTO | |
| DWA-M-205 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-205\DWA-M_205.pdf` | AUTO | |
| DWA-M-229-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-M-229-1\DWA-M-229-1.pdf` | AUTO | |
| DWA-M-229-2 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-M-229-2\DWA-M-229-2.pdf` | AUTO | |
| DWA-M-277E | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).pdf` | AUTO | |
| DWA-M-349 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-M-349\DWA-M-349.pdf` | AUTO | |
| DWA-M-363 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-363\DWA-M_363.pdf` | AUTO | |
| DWA-M-381E | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-M-381E\DWA-M-381E.pdf` | AUTO | |
| DWA-M-708 | `C:\Users\Ekowai\Desktop\Share\Regulations\DWA\DWA 708\DWA-M_708_GD_Part1.pdf .. _Part5  (5-part set)` | VERIFIED | |
| DWA-M-732 | `C:\Users\Ekowai\Desktop\Share\Regulations\DWA\DWA 732\DWA-M_732_Part1.pdf .. _Part2  (2-part set)` | VERIFIED | |
| DWA-M-760 | `C:\Users\Ekowai\Desktop\Share\Regulations\DWA\DWA 760\DWA-M_760_WD_Part1.pdf .. _Part6  (6-part set)` | VERIFIED | |
| DWA-M-816 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-816\DWA-M_816.pdf` | AUTO | |
| DWA-M-820-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-1\DWA-M_820-1.pdf` | AUTO | |
| DWA-M-820-2 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-2\DWA-M_820-2.pdf` | AUTO | |
| DWA-M-820-3 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-3\DWA-M_820-3.pdf` | AUTO | |
| FLL-GAR-2023 | `C:\Users\Ekowai\Desktop\FLL Guidelines PDF\fll_gewaesserabdichtungsrichtlinien_2023__2 (2).pdf` | VERIFIED | |
| FLL-Naturteich-2017 | `C:\Users\Ekowai\Desktop\FLL Guidelines PDF\guidelines_for_the_planning_construction_and_maintenance_of_private_natural_swimming_pools_2017_p (1).pdf` | VERIFIED | |
| FLL-TP-RHIZOM-2023 | `C:\Users\Ekowai\Desktop\FLL Guidelines PDF\fll_tp_rhizomfestigkeit_gewaesserabdichtung_2023 (1).pdf` | VERIFIED | |
| HOAI-2021 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\bayika_hoai_2021.pdf` | AUTO | |
| ISO-14002-2 | `C:\Users\Ekowai\Desktop\Batch guidelines 01072026\ISO 14002-2\ISO 14002-2-2023 (2).pdf` | AUTO | |
| ISO-14004 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14004\ISO-14004.pdf` | AUTO | |
| ISO-14015 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 12015\ISO 14015-2022-BS-EN-ISO-Environmental-Management-Guidelines.pdf` | AUTO | |
| ISO-14019-1 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 14019-1\ISO-14019-1-2026.pdf` | AUTO | |
| ISO-14033 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 14033\ISO-14033-2019.pdf` | AUTO | |
| ISO-14046 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14046\ISO-14046.pdf` | AUTO | |
| ISO-14050 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 14050-2020\ISO-14050-2020-en.pdf` | AUTO | |
| ISO-14064-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14064-1\ISO-14064-1-Deutsch.pdf` | AUTO | |
| ISO-14064-2 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14064-2\ISO-14064-2-2019-en-es.pdf` | AUTO | |
| ISO-14067 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 14067\Iso-14067.pdf` | AUTO | |
| ISO-14097 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 14097\ISO14097-Scoping-Report.pdf` | **QUESTIONED** | Scoping-Report only, not the standard text -> treat as VC until confirmed |
| ISO-46001 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 46001\ISO-46001.pdf` | AUTO | |
| ISO-5667-1 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-1\ISO-5667-1.pdf` | AUTO | |
| ISO-5667-10 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-10\ISO-5667-10.pdf` | AUTO | |
| ISO-5667-13 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-13\ISO-5667-13-2011.pdf` | AUTO | |
| ISO-5667-16 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-16\ISO-5667-16-pdf.pdf` | AUTO | |
| ISO-5667-6 | — | **SOURCE-ABSENT** | no PDF on machine; `.txt` only -> VC ceiling (SR-3) |
| ISO-59004 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59004\ISO_FDIS_59004_N.pdf` | AUTO | |
| ISO-59010 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59010\ISO 59010.pdf` | AUTO | |
| ISO-59014 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59014\ISO-59014-Unlocked.pdf` | AUTO | |
| ISO-59020 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59020\ISO-59020-2024-Circular-Economy-Measuring-and-Assessing-Circularity.pdf` | AUTO | |
| ISO-59032 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59032\ISO-TR-59032-2024-Circular-Economy-Review-of-Existing-Value.pdf` | AUTO | |
| ISO-9001 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-9001\ISO-9001.pdf` | AUTO | |
| VDI-2163 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\VDI-2653\VDI-2163-2006-03.pdf` | AUTO | |
| VDI-3477 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\VDI-3477\VDI-3477-2016-03.pdf` | AUTO | |
| VDI-3814-Blatt-2-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\VDI-3814-Blatt-2-1.pdf` | AUTO | |
| VSME | `C:\Users\Ekowai\Desktop\environmental-reporting service\01_Referenz\250730-recommendation-vsme_en.pdf` | AUTO | |


## THE SOURCE-ABSENT LIST (final, informational — Alvaro)

Encoded standards whose own source could not be located anywhere on this machine, after the
exhaustive pass. These stay **VC-capped per doctrine** and are marked source-absent in the triage
table:

1. **ISO-5667-6** (Sampling rivers/streams, 108 nodes) — no PDF in any location; only
   `Desktop\Ciruclar economy, sustanability and water test\ISO 5667-6\ISO-5667-6-2015.txt`.
   Markdown-only ⇒ **VC ceiling, VA unreachable** (SR-3). Pre-existing known gap; now confirmed
   exhaustively rather than assumed.

**That is the entire list — one standard out of 71.**

Additionally flagged (not source-absent, but not VA-ready):
- **ISO-14097** — only an `ISO14097-Scoping-Report.pdf` is present, which is not the standard text.
  Treat as VC until the standard itself is located.

## NOT-ENCODED, referenced-only documents still unlocated

These are external documents other standards defer to. They are NOT encoded standards and were never
in the corpus; they cap dependent nodes at NR until located:

| document | dependents | unblocks |
|---|---|---|
| **DIN 1986-100** | 7 nodes / 5 std | DWA-A-138-1, FLL-GAR-2023, DWA-M-102-4, DWA-M-179-1, DWA-M-1200-3 |
| **ISO 14040** | 10 / 4 | DIN-14071-1, ISO-59014, DIN-EN-ISO-14044, ISO-14004 |
| **DWA-A 118** (Hydraulische Bemessung) | 8 / 3 | DWA-A-226, DWA-A-138-1, DWA-A-102-2 — live-verified refs: `DWA-A-226.CR-023` §3.2, `DWA-A-226.q_F` §3.2 |
| **DWA-A 117** (Bemessung von Regenrückhalteräumen) | 1 / 1 | DWA-A-138-1 — live-verified ref: field `f_A` §5.3.3.7 "Reduction factor per DWA-A 117". **Acquiring it lifts f_A off its NR cap.** |
| VO (EU) 2020/741 | 7 / 3 | DWA-M-1200-3, DWA-M-708, DWA-M-1200-2 |
| DWA-M 209 | 7 / 2 | DWA-M-229-1, DWA-M-229-2 |
| ISO 14064-3 | 5 / 3 | ISO-14064-2, ISO-14064-1, ISO-14067 |
| ISO 5667-15 | 7 / 1 | ISO-5667-13 |
| EN 1825-2 | 2 / 1 | DWA-M-760 (governing sizing table) |
| AbwV Anhang 3 | 8 / 1 | DWA-M-708 |
| DIN 277-1 | 6 / 1 | DIN-276 |
| HOAI Anlagen 10–15 | 6 / 1 | HOAI-2021 |

## RE-TIERING CONSEQUENCE (Wave-0 triage table is now stale)

The sweep **located the own-PDF for 8 of the 11 TIER-3 acquisition-blocked standards**, plus the two
highest-ranked acquisition documents. Tier 3 collapses from 11 to 3:

- **UNBLOCKED (own PDF found):** ISO-59020 (60 dep — was rank 1), ISO-59014, ISO-59010, ISO-59004,
  ISO-14050 (rank 3), ISO-46001, ISO-14033, ISO-5667-16.
- **KOSTRA-DWD-2020 FOUND** (rank 2, 25 dep) — `Desktop\Blumen Forscheln\KOSTRA_DWD_2020_137089_61b26dc5 (1).pdf`
  (+7 copies). This was the single largest NR block in the corpus (22 nodes on DWA-A-138-1).
- **ATV-DVWK-A 131 FOUND** (rank 4, 15 dep) — `Desktop\Guidelines\DWA DIN Scribd\DWA-A-131\DWA-A-131.pdf`.
  Partially unblocks DWA-A-226 (still needs DWA-A 118) and DWA-M-229-1.
- **DIN 276 FOUND** (rank 6) · **HAD/BfG 2003a FOUND** (rank 9) · **Zusatzdatei-RKB FOUND**.
- **STILL BLOCKED:** ISO-5667-6 (source-absent), DWA-M-760 (EN 1825-2 unlocated),
  DWA-A-226 (DWA-A 118 unlocated).
