# Wave 0 — DWA-M-732 triage (Abwasser aus Brauereien)

- Standard id: `ed52f0d0-f044-4121-ad11-79e602aedecf` (prod `vadsmshzebefjreqcicl`, READ-ONLY)
- PDF: `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-732\DWA-M_732.pdf` — pdfStatus **text** (born-digital,
  `pdftotext -layout` clean; console mojibake display-only). Page offset derived THIS session from the
  footer index (`September 2010  N`), not inherited: printed page = footer integer; a clause at
  text-line X belongs to the first footer line > X.
- Map: `Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps/DWA-M-732/` (_index + 55 nodes).
- Encoding shape: 22 worksheet_templates, 3 equations, 15 compliance_requirements, 90+ fields, 2 enums.

## Node totals
- nodeCount = 55 (22 section, 3 equation, 4 table, 15 CR, 5 document, 6 decision-point)
- provenance: VA 22 / VC 20 / EV 8 / NR 5
- data_class: standard_fixed 16 / engineer_input 27 / derived 5 / standard_range 5 / normative-as-input-reference 2

## VA anchor pages proven this session (verbatim)
- §3 Betriebsklassifikation → printed **p.13** ("Großbrauereien … >1 Mio. hl … Mittelständische …
  50.000 bis 1.000.000 … Kleinstbrauereien … bis zu 5.000 … Übrige … 5.000 bis 50.000")
- §1 Anwendungsbereich → printed **p.8** ("gelten in der Regel für mittelständische und Großbrauereien;
  Gasthausbrauereien werden nicht erfasst")
- §2 Symbolverzeichnis `EW = EGW + EZ` → printed **p.11**
- §7.3 pH 6,5–10,0 / Temp < 35 °C + Tab.13 (100/200/50) + Tab.14 (110/25/10*/18*/2**) → printed **p.25**
- §7.4.1.2 Neutralisation 22,2 mmol CO2/g BSB5; 60–70 % → printed **p.26**
- §7.4.2.2.1 BTS,BSB 0,05–0,08 kg BSB5/(kg TS·d) → printed **p.27**
- §8.5 TA-Lärm WR~400/WA~250/MI~150 m; 15 dB(A) nachts; §8.4 Olfaktometrie DIN EN 13725 → printed **p.45**

## Findings by defect class
### phantom-field gate (1)
- **CR-M732-13** (EDTA-Vermeidung, warn, on M732-03): condition reads `reinigungsmittel_edta_frei`
  and `edta_substitutionsplan` — NEITHER exists in the M-732 field set. Gate cannot be satisfied by
  user data. → dp-m732-optional-gate-inputs.

### dead gate / vacuous-pass (1, plus contributors)
- **CR-M732-15** (TA-Lärm, block, on M732-15): every input `is_required:false`; all-null makes each
  `gebiet != 'WR' OR …` guard true → AND passes vacuously = effectively DEAD (no reachable fail on
  empty data). Also a var-vs-var (F-4) compare inside it.

### F-4 var-vs-var non-enforcement (1)
- **CR-M732-15**: `immissionsrichtwert_nacht <= immissionsrichtwert_tag - 15` — two optional engineer
  inputs; null on either → no enforcement.

### greedy-AND / dropped-qualifier over-enforcement (1)
- **CR-M732-05** (Anhang 11 AbwV, block, on M732-08): enforces NH4-N≤10 / Nges≤18 / Pges≤2
  unconditionally, dropping Tab.14 footnotes ("bei Te≥12 °C und Nges≥100 kg/d"; "bei Pges≥20 kg/d").

### #22 hand-enterable-derived feeding a gate (1)
- **CR-M732-04** branches on `EW` (derived by Gl-M732-01) but the EW field is hand-enterable +
  unmaterialized. → dp-m732-04-ew-derived-in-gate.

### soft-modal / example-as-hard-gate (verdict/normativity) (3)
- **CR-M732-01** — applicability gate as `block`, verdict inverted (passes when in-scope); soft "in
  der Regel"; source_quote NULL + no source_page. → dp-m732-01-applicability-verdict.
- **CR-M732-02 / CR-M732-03** — pH/Temp limits carry a dropped modal precondition ("Sofern DWA-M
  115-2 angewendet wird"); values still VA (reprinted p.25).
- **CR-M732-15** — "z. B."/"ca." example distances encoded as hard block. → dp-m732-15-ta-laerm-example-modal.

### cross-sheet CR-ownership drift (1)
- **CR-M732-14 / CR-M732-15** (§8.4/§8.5 emissions) hosted on M732-15 (Beispielanlage Neutralisation
  summary), not the emissions worksheet M732-22; their fields also live on M732-15. → dp-m732-15-cr-ownership.

### SR-1 verbatim residue (2)
- **CR-M732-07** 50 %-elimination threshold: no source_quote, not verbatim-confirmed this session → VC.
- **CR-M732-01** source_quote NULL / no source_page.

## Below-VA value/gate nodes (33)
- NR (5): CR-M732-14 (DIN EN 13725, method not in library); doc-din-en-13725; + 3 doc nodes that are
  out-of-library but whose values are reprinted in M-732 (doc-dwa-m-115-2, doc-anhang-11-abwv,
  doc-dwa-m-115-1 carry `in_library:false`; only DIN-EN-13725 truly caps a live gate at NR).
- VC (20): CR-M732-01, CR-M732-07, CR-M732-15, eq-m732-03-nco2-neutral, tab-m732-15-talaerm,
  section-m732-15, sections 01/04/06/09/10/13/16/17/18/19/20/22, doc-ta-laerm-1998.
- EV (8): sections 05/07/14 + routine data-collection/verification sheets with no printed number and
  no gate to assert VA against.

## Dead gates
- deadGates = 1 (CR-M732-15 — no reachable fail on empty/optional inputs; vacuous AND).
  (CR-M732-13 phantom-field is a *broken* gate rather than a classic dead gate — counted under
  phantom-field, not deadGates.)

## Missing-doc dependencies (out of library)
- DIN EN 13725 — **value-blocking** (CR-M732-14 caps NR). Acquisition-relevant.
- DWA-M 115-2, Anhang 11 AbwV, TA Lärm 1998, DWA-M 115-1 — referenced but the operative values are
  **reprinted in M-732's own tables** (Tab.13/Tab.14/§8.5) → attribution only, NOT value-blocking.

## Tier
**fix-first** — the encoding is largely VA-reachable (Tab.13/14, pH/Temp, CO2, Schlammbelastung all
VA from this PDF, offset proven), so it is NOT acquisition-blocked (DIN EN 13725 caps only 1 CR).
But there are concrete pre-harness defects to fix: 1 phantom-field gate (CR-13), 1 dead/vacuous gate
(CR-15), 1 greedy-AND over-enforcement (CR-05), 1 #22 derived-in-gate (CR-04), plus 3 modal/verdict
rulings and 1 CR-ownership re-home. These should be resolved (or batched to Alvaro) before the harness.
