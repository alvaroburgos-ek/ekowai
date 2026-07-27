# Wave-0 triage — DWA-M-277E

Standard: `DWA-M-277E` (id `4ed1a6f6-52c0-40af-aed2-61b1bfacd8d2`) — Merkblatt DWA-M 277,
English Edition, October 2017 — greywater treatment & reuse.
PDF: `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).pdf` (pdfStatus = **text**).
Page offset (derived this session from THIS PDF's footer): **printed = physical − 2**
(phys 4→2, phys 5→3, phys 6→4).
Reasoning map: `…\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-M-277E\`
(79 nodes + `_index.md`).

## Node roll-up
- nodeCount = **79** (24 section, 5 equation, 6 table, 32 CR, 8 document, 4 decision-point)
- provenance: VA 10 · VC 51 · NR 18 · EV 0
- data_class: standard_fixed 8 · engineer_input 35 · derived 15 · standard_range 12 · normative-as-input-reference 8
- belowVA (VC+NR) = **69**

## VA anchors (page-verified this session)
| node | printed page | verbatim |
|---|---|---|
| [[eq-m277e-03-qgwt]] / [[cr-m277e-req-06]] / [[section-m277e-18]] | 26/28 | "QSW = 875 l/d … since QGW > QSW then QGWT = QSW = 875 l/d" |
| [[eq-m277e-04-qwb]] / [[cr-m277e-req-07]] | 28 | "QWB = 1,625 l/d – 875 l/d = + 750 l/d" |
| [[eq-m277e-05-vbuffer]] / [[cr-m277e-req-19]] | 22 | "recommended that the total buffer volume corresponds to one-day treatment capacity" |
| [[cr-m277e-req-29]] / [[section-m277e-05]] | 13 | "50 m3 usually requires a mere notification (Model Building Code: MBO 2002 § 61 Para. 5c)" |
| [[cr-m277e-req-11]] / [[tab-m277e-04-treatedreq]] | 18 | Table-4 pH-value header row (pH range for treated greywater) |

## Findings by defect class

### Dead gate (calculation-spine equation-string-as-condition) — 4 codes
REQ-04, REQ-05, REQ-06, REQ-07 encode an EQUATION/IDENTITY STRING as the CR `condition`
(`Q_SW = SUM(...)`, `Q_GW = SUM(...)`, `Q_GWT eq MIN(Q_SW,Q_GW)`, `Q_WB == (Q_GW - Q_SW)`),
not an evaluable boolean predicate. They cannot fire a real fail → **dead gates**. REQ-06/07
are the inequality/verdict-as-producer variant (`eq MIN`, derived-vs-derived `==`). Duplicated
onto M277E-14. → [[dp-m277e-calc-spine-dead-gates]]

### Duplicate-CR / multi-owner (single-owner violation) — 32 codes → 63 rows
Same REQ code on multiple worksheets with DIVERGENT condition/severity/attestation/quote.
Confirmed divergences: REQ-20 (attest block+quote on -10 vs `handover_certificate_present AND
user_manual_handed_over` block no-quote on -11); REQ-21 (warn+quote -09 vs block no-quote -19);
REQ-22 (attest -10 vs `maintenance_contract_present` -23; source says "should"); REQ-24 (attest
-03 vs `DIN_19650_class_documented` -06); REQ-26/27 (attestation -09 vs phantom
`automatic_backfeed_present` -19); REQ-28/31 (severity/condition divergence). → [[dp-m277e-req-multiowner]]

### Phantom-field gate — cross-worksheet symbols
Block gates read symbols the gated worksheet does not own and that are not produced there:
M277E-19 REQ-26/27/28 read `automatic_backfeed_present`/`auto_switch_to_backfeed` (owned by
-09/-23); REQ-03 reads `greywater_type` on -03/-14 (owned by -02/-06); REQ-30 reads
`drinking_water_option_available` (owned by -09/-12) on -03/-06; REQ-32 reads `use_category`
(owned by -04/-10) on -03/-06.

### #22 hand-enterable-derived
`Q_SW`, `Q_GW`, `Q_GWT`, `Q_WB`, `V_buffer` declared `derived` (Eq.1-4 / buffer) yet exist as
required, hand-enterable number fields (no `default_value`) on -06/-07/-08/-16/-17/-18/-09/-21.
The min-rule / balance gates then read the hand-entered value. → [[dp-m277e-derived-hand-enterable]]

### F-4 var-vs-var non-enforcement
REQ-19 `V_buffer >= Q_GWT` compares a derived (hand-enterable) value against another derived
value — no independent constant → non-enforcing in the flat grammar. (warn; source is a
recommendation, so warn is correct severity.)

### Greedy-AND / OR-of-AND parse risk
REQ-29 `(cap<=50 AND notify) OR (cap>50 AND auth)` and REQ-03 `(C1 AND type∈{A1,A2}) OR C2`
are OR-of-AND; under the engine's flat greedy-AND/OR grammar (per FLL-Naturteich extension #5)
a branch can vacuously pass. Verify parenthesisation before harness.

### Range → no selection record (F-7 / SR-2)
Table-2/Annex-B source-quality RANGES and Table-4 C1/C2 bands are point-picked
(`quality_category`, per-source `Q_GW_P`, per-application `Q_SW_P`) with no SR-2 selection
record. → [[dp-m277e-ranges]]

## Dead gates (count = 4 codes: REQ-04, REQ-05, REQ-06, REQ-07)
Equation-string-as-condition; no `fired_by` real-fail path. (Materialise as 8 rows: each also on
M277E-14.) These are the harness blockers.

## Below-VA list (69 nodes = 51 VC + 18 NR)
- **NR (18)** — the 8 out-of-library document nodes ([[doc-din-19650]], [[doc-din-en-1717]],
  [[doc-din-1988-300]], [[doc-dvgw-w-406]], [[doc-din-1989-1]], [[doc-abwv-annex-1]],
  [[doc-din-en-806-1988-200]], [[doc-ral-gz-992]]) + the sections/CRs that defer to them
  ([[section-m277e-09]], [[section-m277e-11]], [[section-m277e-12]], [[section-m277e-19]],
  [[section-m277e-23]], [[cr-m277e-req-16]], [[cr-m277e-req-24]], [[cr-m277e-req-25]],
  [[cr-m277e-req-26]], [[cr-m277e-req-27]]).
- **VC (51)** — all six regulation tables (imported_unverified) + every gate/equation reading a
  table value not page-verified this session (REQ-02/03/08/09/10/14/15, Eq.1/Eq.2) + the
  attestation/completeness gates with no printed scalar + engineer-input collection sheets.

## Missing-doc dependencies (out-of-library)
DIN 19650 · DIN EN 1717 · DIN 1988-300 · DVGW W 406 · DIN 1989-1 · AbwV Annex 1 ·
DIN EN 806-2 / DIN 1988-200 · RAL-GZ 992. All govern attestation *detail* only (the M277E gate
is an engineer-signed boolean), so the standard is mappable end-to-end and is NOT
acquisition-blocked — but the fixes above must precede a harness run.

## Tier: **fix-first**
Calculation spine (REQ-04/05/06/07) is non-enforcing (dead gates); derived flow values are
hand-enterable (#22); 32 REQ codes are multi-owned with divergent conditions. Structural
encoding defects to fix before harness. Not acquisition-blocked.

## Notes
- No prod writes. Read-only Supabase MCP + rendered PDF only. Map generated from artifacts.
- `_backup_277e_regulation_tables` exists in prod (from the 34→150-row swap, reconciliation memo);
  live `regulation_tables` for this standard = 150 rows across TBL-1..5 + TBL-B, all
  `imported_unverified`.
