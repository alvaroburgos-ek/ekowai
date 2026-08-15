-- ============================================================================
-- Migration: DWA-A-125 DATA-track gate-enforcement + Tab.2 P-11 completion
-- File:      20260708250000_dwa_a_125_gate_enforcement.sql
-- Standard:  DWA-A-125 "Rohrvortrieb und verwandte Verfahren" (pipe jacking)
--            (Dezember 2008, korrigierte Fassung September 2020)
-- Status:    WRITTEN-NOT-APPLIED. Do NOT auto-apply. Read-only DB used to author.
--
-- Apply:     node scripts/apply-migration.mjs scripts/migrations/20260708250000_dwa_a_125_gate_enforcement.sql
-- Rollback:  see "-- ROLLBACK" block at the foot of this file (commented; run manually).
--            Includes: DELETE FROM regulation_tables WHERE standard_id=<a125> AND table_id='A125-Tab2'
--                      AND variant_value IN (<the 7 em-dash rows>).
--
-- ----------------------------------------------------------------------------
-- SUMMARY
-- Implements the render-confirmed DWA-A-125 FIX-DRAFT
--   (Obsidian: encoding-audit-2026-07-01/DEEP-DWA-A-125.md, COMPLIANCE GAP LIST).
-- Source PDF: 'DWA DIN Scribd/DWA-A-125/DWA-A-125.pdf' (IMAGE-ONLY, poppler-rendered
--   at 150/300/400 dpi; NO OCR / reverse-Trap-6). Leaf↔printed offset +2:
--   Tab.1 printed p19 = leaf 21; Tab.2 p20 = leaf 22; Tab.10 p48 = leaf 50 — all
--   RE-RENDERED and confirmed cell-by-cell for this migration.
-- Ordered SEV-1 -> SEV-4.
--
--   *** IMPORTANT DIVERGENCE FROM THE WORK ORDER (state-of-DB correction) ***
--   The work order framed this as the FIRST migration to CREATE regulation_tables
--   rows, with Tab.2 "unstored" (S9). THE DB DISPROVES THAT: DWA-A-125 already has
--   40 regulation_tables rows — A125-Tab1 (3), A125-Tab2 (21), A125-Tab3 (3),
--   A125-Tab5 (5), A125-Tab10 (8), all verification_status=verified_against_standard.
--   So Tab.1, Tab.10 AND Tab.2 are ALREADY stored and (for the present values)
--   render-correct. The REAL Tab.2 defect is narrower and is a P-11 rule violation:
--   the 4 DN-tier × 7 Werkstoff matrix has 28 cells but only 21 rows exist — the
--   7 "—" (nicht anwendbar) cells were OMITTED. P-11 requires the no-value cells to
--   be materialised EXPLICITLY (value_text='—', value_numeric=NULL, comparison=NULL),
--   never dropped. This migration therefore INSERTs exactly those 7 missing em-dash
--   cells (SEV-1 below) rather than re-creating the table. The 21 present rows are
--   left untouched (already VA + correct).
--
--   SEV-1  [S9 / P-11 | Tab.2 "—" cells omitted]  (pattern P-11: explicit no-value cells)
--     A125-Tab2 (Rechtwinkligkeit-Grenzwert rechtwinkligkeit_zul, keyed
--     variant_dimension='DN|Werkstoff') stores only the 21 numeric cells; the 7
--     em-dash cells are missing. Render-confirmed matrix (Tab.2, printed p20/leaf 22):
--       DN\Werkstoff | Beton/Stahlbeton/Stahlfaserbeton | Steinzeug | Stahl |
--                      Gusseisen duktil | GFK | Polymerbeton | PE/PP/PVC-U
--       <=300        | 4,0 | 1,0 | 1,6 | 1,0 | 1,0 | 1,0 | 1,0
--       >300<=1000   | 6,0 | 1,0 | 1,6 | 2,0 | 1,0 | 1,5 | 2,0
--       >1000<=2800  | 8,0 | 1,0 | 1,6 | 3,0 | 1,0 | 3,0 | —        <-- PE/PP/PVC-U = —
--       >2800        | 10,0| —   | —   | —   | —   | —   | —        <-- only Beton has a value
--     => 7 "—" cells to add (all render-confirmed on leaf 22 at 400 dpi):
--         >1000<=2800 | PE/PP/PVC-U
--         >2800       | Steinzeug, Stahl, Gusseisen duktil, GFK, Polymerbeton, PE/PP/PVC-U
--     Each inserted with value_text='—', value_numeric=NULL, comparison=NULL, and the
--     SAME variant_value spelling the existing 21 rows use, so the (DN,Werkstoff)
--     resolver sees an explicit "nicht anwendbar" instead of a missing row.
--     Idempotent: per-row NOT EXISTS on (table_id, variant_value) — a whole-table
--     NOT EXISTS guard would be WRONG here (TAB-2 already exists with 21 rows and
--     would skip the fix). value_numeric on the 21 present rows is NOT touched.
--
--   SEV-1  [S9 + symbol-RHS | CR-002 grammar]  (pattern P-6b; evaluate.ts bare-symbol-RHS)
--     CR-002 condition `delta_a <= rechtwinkligkeit_zul`. `rechtwinkligkeit_zul` is a
--     bare identifier on a comparison RHS -> evaluate.ts (src/lib/compliance/evaluate.ts
--     L241-247 + operandToLiteral L364) coerces it to a STRING LITERAL, so the numeric
--     compare silently ALWAYS-FAILS (never enforces). Field-vs-field MUST use the
--     subtraction form. FIX: `delta_a - rechtwinkligkeit_zul <= 0` (routes through
--     acompare: abin '-' over two aref, op '<=', numeric-literal RHS 0). severity stays
--     block. Both symbols live on A125-02 (delta_a, rechtwinkligkeit_zul) -> resolvable
--     worksheet-locally. rechtwinkligkeit_zul is populated from the A125-Tab2
--     (DN,Werkstoff) lookup at runtime; with the 7 em-dash cells added it now resolves
--     for every (DN,Werkstoff) combination. Render source: §5.2.3.2 Eq.(1)
--     Δa = a_max − a_min + Tab.2 (leaf 22).
--
--   SEV-1  [G9 | CR-001 DN>1200 unconstrained]  (pattern P-6a compound gate)
--     CR-001 `(DN<=800 AND baulaengentoleranz<=5) OR (DN>800 AND DN<=1200 AND
--     baulaengentoleranz<=8) OR (DN>1200)`. The third arm `OR (DN>1200)` lets ANY
--     DN>1200 pipe PASS with no tolerance check. Tab.1 (render-confirmed p19/leaf 21)
--     prescribes +25 / −10 mm for DN>1200. FIX: replace `OR (DN>1200)` with
--     `OR (DN>1200 AND baulaengentoleranz<=25 AND baulaengentoleranz>=-10)`. The
--     <=800 (±5) and >800<=1200 (±8) arms are kept intact. All RHS are numeric
--     literals -> pure acompare/compare, no bare-symbol-RHS introduced. severity=block.
--
--   SEV-2  [G9/G5 | CR-008 tolerances>0, not actual<=Tab.10]  (pattern P-6b; "sollten"->warn)
--     CR-008 `abweichung_vertikal_zul > 0 AND abweichung_horizontal_zul > 0` only
--     gates that the TOLERANCES are positive — it never compares the ACTUAL deviation
--     to the Tab.10 limit, so a pipe that misses its Soll-Lage still passes. FIX:
--     enforce actual <= zul in subtraction form:
--       `abweichung_vertikal_ist - abweichung_vertikal_zul <= 0
--        AND abweichung_horizontal_ist - abweichung_horizontal_zul <= 0`
--     The `_ist` fields do NOT exist -> INSERT abweichung_vertikal_ist +
--     abweichung_horizontal_ist on A125-04 (same section as the _zul fields).
--     SEVERITY: Tab.10 text (render-confirmed p48/leaf 50) reads "… gelten aus
--     betrieblichen … Gründen und sollten nicht überschritten werden" — "sollten"
--     (should), NOT "muss". Per P-6a a sollte -> severity='warn'. So CR-008 is
--     FLIPPED block->warn and FLAGGED for Alvaro (was block; the mandate is a should).
--     Tab.10 limits themselves are already stored (A125-Tab10, keyed DN|Richtung);
--     the resolver wiring of abweichung_*_zul from that lookup is a picker-layer item,
--     NOT this migration — noted below.
--
--   SEV-4  [S1 | R_min 200-factor scope note]  (documentation only — value UNCHANGED)
--     E2 `R_min = 200 * D_a` (§7.1.6) is VA-faithful but the 200 factor is, verbatim
--     (render-confirmed p48/leaf 50), "eine erste grobe Abschätzung … bei 3,00 m
--     langen Vortriebsrohren". It is length-conditional + a rough estimate, NOT a
--     universal constant. FIX: attach a suggestion/audit_note documenting the scope.
--     The formula and the 200 value are NOT changed.
--
-- Patterns applied: P-11 (explicit no-value cells; DN×Werkstoff key), P-13 (governing
--   dimension = DN × Werkstoff, render-confirmed), P-6a/P-6b (enforcing gates,
--   muss->block / sollte->warn), P-2/P-3 (provenance-tagged rows), P-8 (worksheet-local
--   single source — CR-002 operands both on A125-02, CR-008 both on A125-04).
-- Grammar verified vs src/lib/compliance/evaluate.ts:
--   * `delta_a - rechtwinkligkeit_zul <= 0`  -> acompare(abin '-' aref,aref; '<=' ; 0)
--   * CR-001 arms                            -> compare/acompare, all numeric-literal RHS
--   * `abweichung_vertikal_ist - abweichung_vertikal_zul <= 0 AND …horizontal…`
--                                            -> acompare AND acompare, numeric-literal RHS 0
--   NO bare-symbol-RHS always-fail is introduced (every comparison RHS is a literal).
--
-- P-13 note (Tab.2 governing key): Tab.2's own printed row/column headers (leaf 22)
--   index the Rechtwinkligkeit limit on DN-tier (row) × Werkstoff (column). The stored
--   A125-Tab2 key `variant_dimension='DN|Werkstoff'` matches the table's own headers —
--   the 138-audit finding is CONFIRMED against the rendered page. Counter-example check:
--   the tolerance is NOT monotone in DN alone (e.g. at DN>2800 only Beton has a value,
--   the other 6 materials are "—"), so DN cannot be the sole key — Werkstoff is a real,
--   non-redundant second axis. No coarser key would be faithful.
--
-- LEFT-UNFIXED (out of scope / reported, not touched):
--   * CR-008 block->warn FLIP is a severity change driven by "sollten" — FLAGGED
--     for Alvaro to confirm (some houses treat Tab.10 as contractually binding = block).
--   * abweichung_*_zul resolver wiring from A125-Tab10 (DN|Richtung lookup) is a
--     picker/resolver-layer task; the _zul fields stay user/lookup-filled. This
--     migration only adds the actual<=zul gate + the _ist inputs. (for-Alvaro)
--   * abweichung_hoehe_seite (A125-06, §7.2.6) is a separate measured-deviation field
--     from the A125-04 Lage-/Zielgenauigkeit check — NOT merged here.
--   * ENGINE: E1 (delta_a) + E2 (R_min) are arithmetic-computable but auto-compute is
--     an ENGINE-track (138-only engine) item, not DATA. Gate grammar is fixed here.
--   * The other 4 A125 tables (Tab1/Tab3/Tab5/Tab10) — checked complete; no omitted
--     cells found (Tab1 3/3, Tab10 8/8 vs render). Not touched.
-- ============================================================================

DO $$
DECLARE
  v_standard_id   uuid;
  v_wt_02         uuid;   -- A125-02 (CR-001, CR-002; delta_a, DN, baulaengentoleranz, rechtwinkligkeit_zul, rohrwerkstoff)
  v_wt_04         uuid;   -- A125-04 (CR-008; abweichung_*_zul; section for _ist inserts)
  v_cr001_id      uuid;
  v_cr002_id      uuid;
  v_cr008_id      uuid;
  v_e2_id         uuid;   -- R_min equation
  v_sec_04        uuid;   -- section that holds the abweichung_*_zul fields on A125-04
  v_src_file      constant text := 'DWA-A-125.md';
  v_src_pdf       constant text := 'DWA DIN Scribd/DWA-A-125/DWA-A-125.pdf';

  -- Render-confirmed target conditions -------------------------------------
  v_cr001_cond constant text :=
    '(DN<=800 AND baulaengentoleranz<=5) OR '
    || '(DN>800 AND DN<=1200 AND baulaengentoleranz<=8) OR '
    || '(DN>1200 AND baulaengentoleranz<=25 AND baulaengentoleranz>=-10)';
  v_cr002_cond constant text := 'delta_a - rechtwinkligkeit_zul <= 0';
  v_cr008_cond constant text :=
    'abweichung_vertikal_ist - abweichung_vertikal_zul <= 0 AND '
    || 'abweichung_horizontal_ist - abweichung_horizontal_zul <= 0';

  -- Tab.2 em-dash cell quote (render-confirmed context) --------------------
  v_tab2_quote constant text :=
    'Tabelle 2: Zulässige Abweichung von der Rechtwinkligkeit [in mm] (gerendert '
    || 'p20/leaf 22, 400 dpi). Zeile >1000 ≤2800: PE/PP/PVC-U = „—"; Zeile >2800: '
    || 'Steinzeug/Stahl/Gusseisen (duktil)/GFK/Polymerbeton/PE·PP·PVC-U = „—" (nur '
    || 'Beton/Stahlbeton/Stahlfaserbeton = 10,0). „—" = keine Anforderung / nicht '
    || 'anwendbar für diese DN-/Werkstoff-Kombination.';
BEGIN
  ----------------------------------------------------------------------------
  -- Resolve the standard + the two worksheets involved.
  ----------------------------------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-A-125';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DWA-A-125 not found';
  END IF;

  SELECT id INTO v_wt_02 FROM worksheet_templates
   WHERE standard_id = v_standard_id AND code = 'A125-02';
  IF v_wt_02 IS NULL THEN
    RAISE EXCEPTION 'Worksheet A125-02 (DWA-A-125) not found';
  END IF;

  SELECT id INTO v_wt_04 FROM worksheet_templates
   WHERE standard_id = v_standard_id AND code = 'A125-04';
  IF v_wt_04 IS NULL THEN
    RAISE EXCEPTION 'Worksheet A125-04 (DWA-A-125) not found';
  END IF;

  ----------------------------------------------------------------------------
  -- Resolve the three compliance requirements (worksheet-scoped to avoid the
  -- cross-standard CR-001/002/008 code collision).
  ----------------------------------------------------------------------------
  SELECT id INTO v_cr001_id FROM compliance_requirements
   WHERE worksheet_template_id = v_wt_02 AND code = 'CR-001';
  IF v_cr001_id IS NULL THEN
    RAISE EXCEPTION 'CR-001 (DWA-A-125 / A125-02) not found';
  END IF;

  SELECT id INTO v_cr002_id FROM compliance_requirements
   WHERE worksheet_template_id = v_wt_02 AND code = 'CR-002';
  IF v_cr002_id IS NULL THEN
    RAISE EXCEPTION 'CR-002 (DWA-A-125 / A125-02) not found';
  END IF;

  SELECT id INTO v_cr008_id FROM compliance_requirements
   WHERE worksheet_template_id = v_wt_04 AND code = 'CR-008';
  IF v_cr008_id IS NULL THEN
    RAISE EXCEPTION 'CR-008 (DWA-A-125 / A125-04) not found';
  END IF;

  ----------------------------------------------------------------------------
  -- Resolve the section that owns the abweichung_*_zul fields on A125-04
  -- (the _ist fields go into the same section).
  ----------------------------------------------------------------------------
  SELECT section_id INTO v_sec_04 FROM fields
   WHERE worksheet_template_id = v_wt_04 AND symbol = 'abweichung_vertikal_zul';
  IF v_sec_04 IS NULL THEN
    RAISE EXCEPTION 'Field abweichung_vertikal_zul (DWA-A-125 / A125-04) not found';
  END IF;

  --==========================================================================
  -- SEV-1 (a) — Tab.2 P-11 completion: INSERT the 7 omitted "—" cells.
  -- FIX-DRAFT item 1 [S9 | P-11] · rendered Tab.2 p20/leaf 22.
  -- Idempotent per-row (NOT EXISTS on table_id+variant_value). variant_value
  -- spelling MIRRORS the existing 21 rows exactly (DN-tier|Werkstoff).
  --==========================================================================
  INSERT INTO regulation_tables
    (standard_id, table_id, table_name, row_number, parameter_label, parameter_symbol,
     variant_dimension, variant_value, value_text, value_numeric, unit, comparison,
     clause_reference, verification_status, source_quote, source_file)
  SELECT v_standard_id, 'A125-Tab2',
         'Tabelle 2: Zulaessige Abweichung von der Rechtwinkligkeit [mm]',
         d.row_number, d.parameter_label, 'rechtwinkligkeit_zul',
         'DN|Werkstoff', d.variant_value, '—', NULL, 'mm', NULL,
         '§5.2.3.2 Tab.2', 'verified_against_standard', v_tab2_quote, v_src_file
    FROM (VALUES
      -- (row_number continues after the 21 existing rows)
      (22, 'Rechtwinkligkeit PE/PP/PVC-U',      '>1000 <=2800|PE/PP/PVC-U'),
      (23, 'Rechtwinkligkeit Steinzeug',        '>2800|Steinzeug'),
      (24, 'Rechtwinkligkeit Stahl',            '>2800|Stahl'),
      (25, 'Rechtwinkligkeit Gusseisen duktil', '>2800|Gusseisen duktil'),
      (26, 'Rechtwinkligkeit GFK',              '>2800|GFK'),
      (27, 'Rechtwinkligkeit Polymerbeton',     '>2800|Polymerbeton'),
      (28, 'Rechtwinkligkeit PE/PP/PVC-U',      '>2800|PE/PP/PVC-U')
    ) AS d(row_number, parameter_label, variant_value)
   WHERE NOT EXISTS (
     SELECT 1 FROM regulation_tables rt
      WHERE rt.standard_id = v_standard_id
        AND rt.table_id    = 'A125-Tab2'
        AND rt.variant_value = d.variant_value
   );

  --==========================================================================
  -- SEV-1 (b) — CR-002 grammar: bare-symbol-RHS -> subtraction form.
  -- FIX-DRAFT item 2 [S9 + symbol-RHS] · P-6b · §5.2.3.2 Eq.(1)+Tab.2 (leaf 22).
  --==========================================================================
  UPDATE compliance_requirements
     SET condition    = v_cr002_cond,
         severity     = 'block',
         source_file  = v_src_pdf,
         source_anchor= '§5.2.3.2 Eq.(1) Δa=a_max−a_min + Tab.2 (gerendert p20/leaf 22)',
         source_quote =
           'Die Anforderungen gemäß Tabelle 2 gelten sinngemäß auch für '
           || 'Vortriebsrohre mit nicht planmäßig rechtwinkligen Stirnflächen. '
           || 'Δa = a_max − a_min (1). Der werkstoff-/DN-abhängige Grenzwert nach '
           || 'Tab.2 darf nicht überschritten werden.',
         audit_notes  =
           'CR-002 fix 2026-07-08: Grammatik `delta_a <= rechtwinkligkeit_zul` -> '
           || '`delta_a - rechtwinkligkeit_zul <= 0` (bare-symbol-RHS always-fail '
           || 'behoben, evaluate.ts L241-247/L364). rechtwinkligkeit_zul wird aus '
           || 'A125-Tab2 (DN|Werkstoff) aufgelöst; mit den 7 „—"-Zellen (SEV-1a) '
           || 'auflösbar für alle Kombinationen. Render-confirmed §5.2.3.2 / Tab.2.'
   WHERE id = v_cr002_id
     AND condition IS DISTINCT FROM v_cr002_cond;

  --==========================================================================
  -- SEV-1 (c) — CR-001 DN>1200: enforce Tab.1 +25/−10.
  -- FIX-DRAFT item 3 [G9] · P-6a · Tab.1 (gerendert p19/leaf 21).
  --==========================================================================
  UPDATE compliance_requirements
     SET condition    = v_cr001_cond,
         severity     = 'block',
         source_file  = v_src_pdf,
         source_anchor= '§5.2.3.1 Tab.1 „Baulängentoleranzen" (gerendert p19/leaf 21)',
         source_quote =
           'Tabelle 1: Baulängentoleranzen [mm]. DN ≤ 800: ± 5; DN > 800 bis 1200: '
           || '± 8; DN > 1200: + 25 / − 10. Baulängentoleranzen nach Tab.1 dürfen '
           || 'nicht überschritten werden (Ausnahme geschweißte Verbindungen).',
         audit_notes  =
           'CR-001 fix 2026-07-08: dritter Arm `OR (DN>1200)` (bedingungslos bestanden) '
           || '-> `OR (DN>1200 AND baulaengentoleranz<=25 AND baulaengentoleranz>=-10)` '
           || '(Tab.1 +25/-10, render-confirmed p19/leaf 21). ≤800 (±5) und >800≤1200 '
           || '(±8) Arme unverändert. Alle RHS numerische Literale.'
   WHERE id = v_cr001_id
     AND condition IS DISTINCT FROM v_cr001_cond;

  --==========================================================================
  -- SEV-2 (d) — CR-008: add abweichung_*_ist inputs + enforce actual<=Tab.10.
  -- FIX-DRAFT item 4 [G9/G5] · P-6b · Tab.10 (gerendert p48/leaf 50).
  -- Tab.10 text = "sollten nicht überschritten werden" (should) -> severity=warn.
  --==========================================================================

  -- (d1) INSERT abweichung_vertikal_ist (idempotent).
  INSERT INTO fields
    (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit,
     is_required, order_index, clause_reference, description, verification_status,
     source_file, source_anchor, source_quote)
  SELECT v_wt_04, v_sec_04, 'abweichung_vertikal_ist',
         'Gemessene vertikale Abweichung von Soll-Lage (Ist)',
         'Measured vertical deviation from target position (actual)',
         'number', 'mm', true, 1, '§7.1.7',
         'Gemessene vertikale Ist-Abweichung von der Soll-Lage; wird gegen den '
         || 'Tab.10-Grenzwert abweichung_vertikal_zul geprüft (CR-008).',
         'imported_unverified', v_src_pdf,
         '§7.1.7 „Lage- und Zielgenauigkeit" / Tab.10 (gerendert p48/leaf 50)',
         'Tabelle 10: Maximale Abweichung in [mm] von der Soll-Lage für '
         || 'Abwasserleitungen und -kanäle (vertikal). Die Ist-Abweichung darf den '
         || 'DN-abhängigen Tab.10-Grenzwert nicht überschreiten.'
   WHERE NOT EXISTS (
     SELECT 1 FROM fields f
      WHERE f.worksheet_template_id = v_wt_04 AND f.symbol = 'abweichung_vertikal_ist'
   );

  -- (d2) INSERT abweichung_horizontal_ist (idempotent).
  INSERT INTO fields
    (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit,
     is_required, order_index, clause_reference, description, verification_status,
     source_file, source_anchor, source_quote)
  SELECT v_wt_04, v_sec_04, 'abweichung_horizontal_ist',
         'Gemessene horizontale Abweichung von Soll-Lage (Ist)',
         'Measured horizontal deviation from target position (actual)',
         'number', 'mm', true, 1, '§7.1.7',
         'Gemessene horizontale Ist-Abweichung von der Soll-Lage; wird gegen den '
         || 'Tab.10-Grenzwert abweichung_horizontal_zul geprüft (CR-008).',
         'imported_unverified', v_src_pdf,
         '§7.1.7 „Lage- und Zielgenauigkeit" / Tab.10 (gerendert p48/leaf 50)',
         'Tabelle 10: Maximale Abweichung in [mm] von der Soll-Lage für '
         || 'Abwasserleitungen und -kanäle (horizontal). Die Ist-Abweichung darf den '
         || 'DN-abhängigen Tab.10-Grenzwert nicht überschreiten.'
   WHERE NOT EXISTS (
     SELECT 1 FROM fields f
      WHERE f.worksheet_template_id = v_wt_04 AND f.symbol = 'abweichung_horizontal_ist'
   );

  -- (d3) Rewrite CR-008 to actual<=zul (subtraction form) + block->warn ("sollten").
  UPDATE compliance_requirements
     SET condition    = v_cr008_cond,
         severity     = 'warn',
         source_file  = v_src_pdf,
         source_anchor= '§7.1.7 „Lage- und Zielgenauigkeit" / Tab.10 (gerendert p48/leaf 50)',
         source_quote =
           'Die in Tabelle 10 aufgeführten Werte der maximalen Abweichung von der '
           || 'Soll-Lage gelten aus betrieblichen Gründen und sollten nicht '
           || 'überschritten werden. Tabelle 10: DN<600 vertikal ±20 / horizontal ±25; '
           || 'DN≥600 bis ≤1000 ±25 / ±40; DN>1000 bis <1400 ±30 / ±100; DN≥1400 ±50 / ±200.',
         description  =
           'Die gemessenen Ist-Abweichungen von der Soll-Lage (vertikal/horizontal) '
           || 'sollten die DN-abhängigen Tab.10-Grenzwerte nicht überschreiten.',
         audit_notes  =
           'CR-008 fix 2026-07-08: `abweichung_vertikal_zul>0 AND '
           || 'abweichung_horizontal_zul>0` (prüfte nur, dass Toleranzen positiv sind) '
           || '-> `abweichung_vertikal_ist - abweichung_vertikal_zul <= 0 AND '
           || 'abweichung_horizontal_ist - abweichung_horizontal_zul <= 0` (Ist<=zul, '
           || 'Subtraktionsform). _ist-Felder neu angelegt (d1/d2). SEVERITY block->warn: '
           || 'Tab.10-Text ist „sollten" (nicht „muss"), render-confirmed p48/leaf 50 '
           || '(P-6a). FLAG für Alvaro: ggf. vertraglich bindend = block. zul-Felder '
           || 'werden (noch) manuell/über A125-Tab10 gefüllt (Resolver = picker-layer, '
           || 'nicht in dieser Migration).'
   WHERE id = v_cr008_id
     AND condition IS DISTINCT FROM v_cr008_cond;

  --==========================================================================
  -- SEV-4 (e) — R_min S1 scope note (E2 value UNCHANGED; documentation only).
  -- FIX-DRAFT item 5 [S1] · §7.1.6 (gerendert p48/leaf 50).
  --==========================================================================
  SELECT e.id INTO v_e2_id FROM equations e
   WHERE e.worksheet_template_id IN (
           SELECT id FROM worksheet_templates WHERE standard_id = v_standard_id)
     AND e.output_symbol = 'R_min';
  IF v_e2_id IS NULL THEN
    RAISE EXCEPTION 'Equation R_min (DWA-A-125) not found';
  END IF;

  UPDATE equations
     SET audit_notes =
           'S1 scope note 2026-07-08: Der Faktor 200 in R_min = 200·D_a ist laut '
           || '§7.1.6 (render-confirmed p48/leaf 50) „eine erste grobe Abschätzung … '
           || 'bei 3,00 m langen Vortriebsrohren" — längenabhängig und eine grobe '
           || 'Abschätzung, KEINE universelle Konstante. Für abweichende Baulängen / '
           || 'Fügekonstruktionen ist der Mindestradius gesondert zu ermitteln. Formel '
           || 'und Wert 200 UNVERÄNDERT (VA-treu als Mindestradius-Untergrenze für 3,00 m Rohre).'
   WHERE id = v_e2_id
     AND (audit_notes IS NULL OR audit_notes NOT LIKE '%S1 scope note 2026-07-08%');

  RAISE NOTICE 'DWA-A-125 gate-enforcement migration applied: Tab.2 +7 em-dash cells (P-11); CR-002 subtraction form; CR-001 DN>1200 +25/-10 enforced; CR-008 actual<=Tab.10 + 2 _ist fields + block->warn (sollten); R_min S1 scope note. Tab.1/Tab.10 already stored+correct - untouched.';
END $$;

-- ============================================================================
-- ROLLBACK (run manually if needed — restores the pre-migration state):
--
-- DO $$
-- DECLARE
--   v_standard_id uuid; v_wt_02 uuid; v_wt_04 uuid; v_e2_id uuid;
-- BEGIN
--   SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-A-125';
--   SELECT id INTO v_wt_02 FROM worksheet_templates WHERE standard_id=v_standard_id AND code='A125-02';
--   SELECT id INTO v_wt_04 FROM worksheet_templates WHERE standard_id=v_standard_id AND code='A125-04';
--
--   -- SEV-1a: delete the 7 inserted Tab.2 em-dash rows.
--   DELETE FROM regulation_tables
--    WHERE standard_id = v_standard_id AND table_id = 'A125-Tab2'
--      AND variant_value IN (
--        '>1000 <=2800|PE/PP/PVC-U',
--        '>2800|Steinzeug','>2800|Stahl','>2800|Gusseisen duktil',
--        '>2800|GFK','>2800|Polymerbeton','>2800|PE/PP/PVC-U');
--
--   -- SEV-1b: CR-002 back to bare-symbol-RHS form.
--   UPDATE compliance_requirements
--      SET condition='delta_a <= rechtwinkligkeit_zul', severity='block',
--          clause_reference='§5.2.3.2', source_file=NULL, source_anchor=NULL,
--          source_quote=NULL, audit_notes=NULL
--    WHERE worksheet_template_id=v_wt_02 AND code='CR-002';
--
--   -- SEV-1c: CR-001 back to unconstrained DN>1200 arm.
--   UPDATE compliance_requirements
--      SET condition='(DN<=800 AND baulaengentoleranz<=5) OR (DN>800 AND DN<=1200 AND baulaengentoleranz<=8) OR (DN>1200)',
--          severity='block', clause_reference='§5.2.3.1', source_file=NULL,
--          source_anchor=NULL, source_quote=NULL, audit_notes=NULL
--    WHERE worksheet_template_id=v_wt_02 AND code='CR-001';
--
--   -- SEV-2d: CR-008 back to tolerances>0 (block); drop the _ist fields.
--   UPDATE compliance_requirements
--      SET condition='abweichung_vertikal_zul > 0 AND abweichung_horizontal_zul > 0',
--          severity='block', clause_reference='§7.1.7', source_file=NULL,
--          source_anchor=NULL, source_quote=NULL,
--          description='Maximale Abweichungen von der Soll-Lage (vertikal/horizontal) nach Tab.10 sollten nicht ueberschritten werden.',
--          audit_notes=NULL
--    WHERE worksheet_template_id=v_wt_04 AND code='CR-008';
--   DELETE FROM fields WHERE worksheet_template_id=v_wt_04
--     AND symbol IN ('abweichung_vertikal_ist','abweichung_horizontal_ist');
--
--   -- SEV-4e: strip the R_min S1 scope note.
--   SELECT e.id INTO v_e2_id FROM equations e
--    WHERE e.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v_standard_id)
--      AND e.output_symbol='R_min';
--   UPDATE equations SET audit_notes=NULL WHERE id=v_e2_id;
-- END $$;
-- ============================================================================
