# Wave-0 triage — DWA-M-760 (Merkblatt DWA-M 760, Fetthaltiges Abwasser, April 2025)

standard_id: d4ba3b80-7b06-4c28-8a5c-4b48e50fb5be
pdf: C:\Users\Ekowai\Desktop\Guidelines\DWA-M-760\DWA-M_760_WD.pdf  (pdfStatus=text, 145 phys pages)
page offset (this pdf, from footer): printed = physical_1based − 2. Anchors verified:
  §5.2 Dichte 0,85–0,95 → p.27 · Tab.3 Grenzwerte → p.25 · §7.1 Fettfracht 2–6 g → p.33 ·
  §8.2 H2S AGW 5/10 ppm → p.11 · DIN ISO 11349 → p.19. NS sizing formula NOT in-doc.
map: Obsidian .../reasoning-maps/DWA-M-760/ (_index.md + 13 node files)
encoding: 25 worksheets · 3 distinct equations (6 rows) · 12 distinct CR codes (21 rows) · fields.

## Node totals
nodeCount = 74  (section 25, equation 3, table 5, CR 12, document 9, decision-point 20)
provenance: VA 24 · VC 10 · NR 12 · EV 28
data_class: standard_fixed 22 · engineer_input 21 · derived 5 · normative-as-input-reference 6 · n/a 20
belowVA (VC+NR+EV) = 50

## Findings by class
- phantom-field gate (7): REQ-02 `verwendete_normen`; REQ-07(M760-06) `q_spitz`,
  `anzahl_mahlzeiten`; REQ-12(M760-24) `invest_kosten`,`betriebskosten_a`,
  `entsorgungskosten_a`,`energieverbrauch`. All verified 0 rows in fields.
- duplicate-CR-code / multi-producer (8): REQ-05,06,07,08,09,10,11,12 each materialized on
  two worksheets with differing condition+clause. See dp-req-code-collisions.
- cross-worksheet gate (2): REQ-07(M760-06) on c_csb_roh/c_lipophil_roh (own M760-07/09);
  REQ-09(M760-18) on ns_fettabscheider/bauform_fa (own M760-09/13/15, none on M760-18).
- inequality/verdict-as-producer (1): EQ-M760-02 `ns_fettabscheider >= NS` stored with
  output_symbol NS_eff (a boolean verdict encoded as a scalar producer). F-4.
- #22 hand-enterable-derived (3): NS, NS_eff, F_fett_haus all exist as engineer-editable
  number fields while being derived/verdict outputs.
- greedy-AND block gate (2): REQ-04 (6 limits in one AND), REQ-10 (3 intervals in one AND).
- non-grammar operator: REQ-02 `IS NOT EMPTY`, plus widespread `IS NOT NULL` / `==`
  chains — confirm against supported condition grammar (likely NON_PARSING at evaluate.ts).

## Dead gates (5)
`manual`-condition CR copies that never machine-fire: REQ-M760-03 (M760-01),
REQ-M760-06 (M760-05 copy), REQ-M760-07 (M760-01 copy), REQ-M760-09 (M760-09 copy),
REQ-M760-12 (M760-11 copy). (phantom-field gates are separately non-enforcing but not
double-counted here.)

## Below-VA list (why each is not VA)
- All 3 equations except EQ-03: EQ-01 (NS) NR = DIN EN 1825-2 not in library; EQ-02
  (NS_eff) NR = consumes NS + inequality-as-producer.
- section-m760-15 (sizing hub) NR = DIN EN 1825-2.
- 21 engineer_input fields EV (project data, no printed number) across data-collection
  worksheets M760-02..09, verification worksheets M760-19..24.
- 12 doc-dependent nodes NR (out-of-library, see missing docs).
- VC (10): registration/summary worksheets (M760-01,02,03,10,25) + enum verdict CRs whose
  clause is confirmed in markdown/JSON but not re-read page-by-page as a table.

## Missing-doc dependencies (out-of-library, in_library:false) — 0 rows in prod
DIN EN 1825-1, DIN EN 1825-2, DIN 4040-100, DIN EN 12056-4, DIN ISO 11349, DIN 19901,
DWA-M-115-1/-2/-3, DWA-M-154, DWA-M-167-3, DWA-M-168.
Highest leverage: DIN EN 1825-2 (governs the entire NS sizing chain; the NS formula is not
printed in M760 → no verbatim quote possible from M760 itself).

## Tier
acquisition-blocked — sizing chain (M760-15, EQ-01/02) gated on DIN EN 1825-2 (not in
library). Secondary fix-first work (duplicate-REQ ownership, phantom-field gates,
inequality-as-producer, greedy-AND) required before any harness run. Threshold/
characterisation VA nodes (Tab.3 p.25, §5.2 p.27, §7.1 p.33, §8.2 p.11) are individually
harness-ready.

NO fixes applied. NO prod writes. Read-only generation.
