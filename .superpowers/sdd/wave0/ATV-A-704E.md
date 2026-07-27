# Wave-0 triage — ATV-A-704E (Betriebsmethoden für die Abwasseranalytik / Operating Methods for Wastewater Analysis, April 2007)

standard_id: `96347572-1a8c-408d-afa5-6a99edc1b579`
prod: `vadsmshzebefjreqcicl` (READ-ONLY, no writes)
map: `…/reasoning-maps/ATV-A-704E/` (+ `_index.md`)
generated: 2026-07-24, read-only

## PDF status — SCANNED (brief said `missing`; it is a path artifact)
- The brief declared `pdf: missing`. A PDF **exists** at
  `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ATV A 704E\ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf`.
  The doctrine's recorded folder is spelled `Circular economy, sustainability…`; the on-disk
  folder is misspelled `Ciruclar economy, sustanability…` → recorded-path lookup = "missing".
  Per SR-4, used the real file.
- **No text layer.** `pdftotext -layout` → 1 char over 37 pages. `pdftoppm -png` renders fine;
  running footer legible (physical p.6 = two-up spread footed "8 April 2007" / "9 April 2007").
- Consequence (SR-3 + brief's scanned branch): **value / standard_fixed / table nodes cap at
  VC**; read-by-eye VA-lift is feasible but NOT performed in this triage. **No node claims VA.**
  No `source_page` asserted anywhere (would be fabricated from an unmapped two-up spread).

## Node counts (58)
sections 12 · equations 6 · tables 3 · CRs 30 · documents 2 · decision-points 5
provenance: VA 0 / VC 30 / EV 26 / NR 2
data_class: standard_fixed 5 (all VC) · derived 6 · engineer_input 35 · normative-as-input-reference 3 (VC)

## Findings by class
- **cross-sheet gate (F-4 / gate-symbol-not-owned) ×5** [DOMINANT]:
  CR-019 (`deviation_single_pct` ← WS-09 EQ-02), CR-022 (`deviation_equivalency_pct` ← WS-10 EQ-05),
  CR-023 (`deviation_parallel_pct` ← WS-10 EQ-06), CR-025 (`pipette_*` ← WS-11), CR-026
  (`heating_device_deviation` ← WS-11) are all attached to **WS-08** while their condition
  symbols are produced in WS-09/10/11. Worksheet-local evaluator ⇒ FIELD_MISSING / silent
  non-fire. → [[dp-704e-crosssheet-gates]].
- **dead gate (condition="manual", non-firing) ×3**: CR-028 (IGC-Card 11 deviations, warn),
  CR-029 (DIN EN ISO 5667 sampling, warn), CR-030 (DIN 38xxx reference methods, warn). Literal
  "manual" string never evaluates.
- **grammar-suspect warn gate ×1**: CR-013 `training_courses_attended eq true` (warn). `eq true`
  on a boolean is redundant; narrow evaluator grammar. Non-blocking regardless.
- **#22 hand-enterable-derived ×6**: every equation output (`mean_value`, `deviation_single_pct`,
  `calculated_value`, `NSS`, `deviation_equivalency_pct`, `deviation_parallel_pct`) is ALSO a
  standalone `number` field with `is_required=true` → derived result hand-enterable, single-source
  broken.
- **greedy-AND / unspecified band ×1**: CR-025 leaves 0.5 < V < 1.0 mL pipette band unconstrained
  → block gate passes vacuously in that band. → [[dp-704e-pipette-band]].
- **semantic mismatch ×1**: CR-019 title ("multiple-determination MEAN within quality target")
  vs condition (single-value `deviation_single_pct`), and printed IQC-Card 2 target for multiple
  determinations is "random error < 10 %" (spread, not per-value %). → [[dp-704e-cr019-semantics]].
- **inequality/enum/verdict-as-producer**: NONE (clean).
- **phantom-field gate**: NONE — all 21 `attest_…` gate fields verified to exist (SQL join).
- **missing-doc dependency ×2**: [[doc-din-en-iso-5667]], [[doc-din-38xxx]] (both in_library:false;
  gate only warn/manual CRs → block nothing).

## below-VA list (all 58 nodes — zero VA)
- 30 CRs = VC (source_quote = English-translation convenience extraction, not PDF-page-attested; scanned).
- 6 equations = EV (imported_unverified, source_quote null).
- 3 tables = VC (scanned, read-by-eye pending): IQC-Card 2 targets (<10 %/<20 %), IQC-Card 2
  min-frequency, IQC-Card 9 device tolerances (pipette 2 %|1 %, heating ±3 °C, photometer annual).
- 35 engineer_input fields = EV (imported_unverified).
- 2 documents = NR (out-of-library).

## dead gates (count = 3)
CR-028, CR-029, CR-030 (all `condition="manual"`, warn). [If the 5 cross-sheet numeric CRs are
counted as effectively-dead-under-worksheet-local-eval, add CR-019/022/023/025/026 → up to 8;
recorded headline dead=3 = the literal-`manual` set, cross-sheet non-fire tracked separately as
its own F-4 class of 5.]

## missing-doc deps (count = 2)
- DIN EN ISO 5667 (water sampling series) — CR-029 (§4.5 / Literature).
- DIN 38xxx (Deutsche Einheitsverfahren reference methods) — CR-030 (Literature).
Neither blocks anything enforcing (dependents are manual/warn).

## decision-points (Alvaro batch)
dp-704e-crosssheet-gates · dp-704e-pipette-band · dp-704e-cr019-semantics · dp-704e-manual-gates
· dp-704e-quality-target-source

## tier: fix-first
Not acquisition-blocked (standard's own PDF present-but-scanned; the 2 missing docs gate only
non-firing warn CRs). Not harness-ready: 5 cross-sheet block gates silently non-fire, 3 manual
dead gates, 6 #22 hand-enterable outputs, CR-019 semantics + CR-025 band pending rulings. DATA-track
fixes needed before a meaningful harness run.
