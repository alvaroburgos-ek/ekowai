-- ============================================================================
-- Migration: DWA-A-102-2 DATA-track gate-enforcement + provenance fix
-- File:      20260708240000_dwa_a_102_2_gate_enforcement.sql
-- Standard:  DWA-A-102-2/BWK-A 3-2 (Dezember 2020, korrigierte Fassung Aug 2022)
-- Status:    WRITTEN-NOT-APPLIED. Do NOT auto-apply. Read-only DB was used to author.
--
-- Apply:     node scripts/apply-migration.mjs scripts/migrations/20260708240000_dwa_a_102_2_gate_enforcement.sql
-- Rollback:  see "-- ROLLBACK" block at the foot of this file (commented; run manually).
--
-- ----------------------------------------------------------------------------
-- SUMMARY
-- Implements the render-confirmed DWA-A-102-2 FIX-DRAFT
-- (Obsidian: encoding-audit-2026-07-01/DEEP-DWA-A-102-2.md + _matrix.md,
--  COMPLIANCE GAP LIST). Source PDF: DWA-A_102-2 (3).pdf (poppler-rendered).
-- Ordered SEV-1 -> SEV-3.
--
--   SEV-1  [G7 | REQ-24 undefined m_min_required]  (patterns P-6b, P-8, P-4)
--     REQ-24 `m >= m_min_required`, severity=block, was DEAD for two reasons:
--       (a) WRONG WORKSHEET. REQ-24 (the Mindestmischverhältnis-Nachweis) was
--           attached to A1022-34 ("Nachweis: Stoffabtrag AFS63 (Trennsystem)"),
--           whose only fields are nachweis_AFS_tr_*. Neither `m` nor
--           `m_min_required` exists on A1022-34. evaluate.ts resolves symbols
--           worksheet-locally -> the gate can never see either operand -> it
--           silently never enforces. Both symbols live on A1022-36
--           ("Nachweis: Mindestmischverhältnis m"). -> REQ-24 re-homed to A1022-36.
--       (b) BARE-SYMBOL RHS. `m >= m_min_required` -> evaluate.ts coerces the
--           bare identifier `m_min_required` on a comparison RHS to a STRING
--           LITERAL (evaluate.ts L241-247/L364), so the numeric compare silently
--           ALWAYS-FAILS. -> rewritten to the subtraction form
--               `m - m_min_required >= 0`
--           which routes through acompare (field - field >= numeric-literal).
--     The audit called m_min_required "undefined"; in the DB the FIELD exists
--     (A1022-36) but is UNPRODUCED: equations Gl.22/Gl.23 were mis-encoded with
--     output_symbol=`m` (they are minimum-requirement inequalities, NOT
--     producers of the mean `m` — that is B.13/Gl.24). So `m_min_required` was
--     dangling. FIX: retag Gl.22/Gl.23 output_symbol `m` -> `m_min_required`
--     (they ARE the piecewise producer of the minimum), resolving both the
--     dangling-symbol AND the C9 multi-producer-of-`m` defect. The mean-`m`
--     producers B.13 (A1022-23) / Gl.24 (A1022-33) are left as the sole owners
--     of `m`. Render-confirmed §7.3.4.2, PDF p.53:
--        m >= 7                       für  C_T,aM,CSB <= 600 mg/l   (22)
--        m >= (C_T,aM,CSB - 180)/60   für  C_T,aM,CSB > 600 mg/l    (23)
--     and the "muss/ist zu überprüfen" mandate (PDF p.53, "Mindestmischverhältnis":
--     "Für jedes Regenüberlaufbecken ist zu überprüfen, ob … ein
--      Mindestmischverhältnis m nach Gl. (22) eingehalten wird.") -> severity
--     stays 'block'. Note: Gl.22/23 are piecewise (`if …`) -> ENGINE-blocked
--     for auto-compute (E1/piecewise), but the field is now the declared output
--     of a faithful, provenance-tagged producer and the GATE grammar enforces.
--
--   SEV-2 F1  [F2 | Gl.10 q_A,b -> q_A_Bem]  ⇒ REVERSED — LEFT UNFIXED (FALSE ALARM)
--     The audit (DEEP §6.2, line 44) graded Gl.10's denominator symbol as a HIGH
--     wrong-symbol defect: source `q_A,b` vs DB `q_A_Bem`. RENDER DISPROVES IT.
--     PDF p.42 (§6.2.3, rendered PNG + pdftotext, both read) prints Gl.(10)
--     verbatim as:
--        A_RKB = 3,6 · Q_Bem,Tr / q_A,Bem   in m²   (10)
--     with the `mit:` legend: "q_A,Bem  m/h  Oberflächenbeschickung bei
--     Bemessungszufluss (Bemessungswert, siehe 6.2.2)". The DB's Gl.10
--     (`A_RKB = 3.6 * Q_Bem_Tr / q_A_Bem`) is FAITHFUL. `q_A,b` (Gl.9, PDF p.41,
--     "maßgebende Oberflächenbeschickung im Bestand") is a DISTINCT quantity for
--     retrofit estimation — it does NOT appear in Gl.10. reverse-Trap-6: PDF
--     wins. The DB is correct; changing it to q_A_b would INTRODUCE an error.
--     -> NOT touched. Only its NULL source_quote is backfilled (SEV-3).
--
--   SEV-2 F2  [F3 | Tab.6 constants mis-attributed]  (patterns P-2/P-3, P-11/P-13)
--     Equations T6.H1/T6.H2/T6.V/T6.Vs (A1022-29/30 — the RÜB storage-volume
--     sizing chain) carry clause_reference="Tabelle 6". RENDER-CONFIRMED WRONG:
--     PDF p.53 shows "Tabelle 6: Zahlenbeispiel zur Ermittlung des erforderlichen
--     Gesamtspeichervolumens" — a NUMERICAL example — with footnote
--     "*) Die Tabelle steht als Berechnungshilfe „Ermittlung Gesamtspeichervolumen"
--        … unter DWAdirekt … „Publikationen/Zusatzdateien" zur Verfügung."
--     The constants 4000 / 25 / 0,551 / 36,8 / 13,5 / 0,5 appear NOWHERE in the
--     A-102-2 PDF (whole-doc pdftotext grep = 0 hits). The CSB storage-volume
--     Zielfunktion is explicitly "aus Arbeitsblatt ATV-A 128:1992 … abgeleitet"
--     (PDF p.49/p.53, render-confirmed). ⇒ these formulas are NOT VA-from-A-102-2:
--     their home is the Berechnungshilfe/Zusatzdatei, deriving from ATV-A 128:1992.
--     FIX (provenance only — NUMERIC VALUES UNTOUCHED, per FIX-DRAFT):
--       clause_reference "Tabelle 6" -> honest Berechnungshilfe/Zusatzdatei +
--       ATV-A 128:1992 attribution; verification_status -> needs_engineer_review
--       (cannot be VA-graded without ATV-A 128 / the Berechnungshilfe internals,
--        which are NOT on disk — source-blocked, so NOT re-graded VC/VA either;
--        NR is the honest grade); honest source_quote naming the mis-attribution.
--     T6.a_f is EXCLUDED — it is the Max-form of B.10 and IS genuine A-102-2
--     content (only its NULL source_quote is backfilled, SEV-3).
--
--   SEV-3 P1  [P1 | NULL source_quote backfill]  (patterns P-2/P-3)
--     source_quote is NULL on ALL 62 A-102-2 equations (A1022-P0 batch finding).
--     This migration backfills ONLY the render-confirmed rows it touches or cites
--     (Gl.9, Gl.10, Gl.12, Gl.22, Gl.23, Gl.24, B.13, T6.a_f) + REQ-24, each with
--     the verbatim printed equation/mandate + exact anchor. The remaining ~54
--     NULL-quote equations are LEFT for the standard-wide P1 backfill (not
--     fabricated here). verification_status of the backfilled A-102-2-native rows
--     is set to verified_against_standard (render-confirmed VA) EXCEPT the Tab.6
--     provenance rows (NR, above) and the REG-Bild4 regression (untouched, VC).
--
-- Patterns applied: P-6b (state/threshold gate), P-8 (worksheet-local single
--   source), P-4 (check row), P-2/P-3 (provenance-tagged rows), P-11/P-13
--   (keyed-table provenance / governing-dimension fidelity — see P-13 note).
-- Grammar verified vs src/lib/compliance/evaluate.ts: `m - m_min_required >= 0`
--   parses as acompare (abin '-' over two aref, op '>=', numeric-literal RHS 0);
--   NO bare-symbol-RHS always-fail is introduced (the ONLY RHS is the literal 0).
--
-- LEFT-UNFIXED (out of scope / reported, not touched):
--   * F1 (Gl.10 symbol) — REVERSED to FALSE ALARM by render (above). DB correct.
--   * ENGINE-blocked: Gl.22/23 piecewise `if …`, and the T6/Max/ln/Sum equation
--     bodies do not auto-compute under the current 138-only engine (needs E1 +
--     E2 function support). Gate grammar is fixed here; equation AUTO-COMPUTE is
--     ENGINE-track, not DATA. Tagged, not "fixed".
--   * F2-content (§6.2 RKB path): Gl.10 uses q_A,Bem (Bild-4 new-design loading,
--     whose REG-Bild4 regression -8,333·ln(η)-1,6629 is Zusatzdatei/VC, not
--     main-standard). Faithful to Gl.10 as printed; the design-branch choice
--     (q_A,Bem vs the retrofit q_A,b of Gl.9) is an engineering decision. -> for-Alvaro.
--   * C9 residue (e_0 Gl.15/17/18 as producers; Q_Dr Gl.26/28; Q_M B.5; dup
--     main-vs-annex a_R_AFS63 / C_e_CSB / m) — single-source retagging is a
--     separate structural pass (SEV-4), not this gate/provenance migration.
--   * Other non-enforcing gates (REQ-04 `==`+arithmetic, REQ-06/07/08 chained
--     AND / IF-THEN, REQ-28 `==` string) — grammar cleanups, separate item.
--   * ~54 remaining NULL source_quote equations — standard-wide P1 backfill.
--
-- P-13 note: Tab.6 is NOT a keyed regulation_tables lookup for A-102-2
-- (0 regulation_tables rows for this standard); H1/H2/V/Vs are ENCODED AS
-- EQUATIONS, and this migration only re-attributes their provenance — it does
-- not re-key any lookup. No governing-dimension re-key risk here. (The genuine
-- A-102-2 lookups — Tab.4 AFS63 Rechenwerte, Tab.A.1 Flächenkategorien — are
-- untouched by this migration.)
-- ============================================================================

DO $$
DECLARE
  v_standard_id   uuid;
  v_wt_34         uuid;   -- A1022-34 (current, WRONG home of REQ-24)
  v_wt_36         uuid;   -- A1022-36 (correct home: m + m_min_required)
  v_req24_id      uuid;
  v_gl22_id       uuid;
  v_gl23_id       uuid;
  v_mmr_field_id  uuid;
  -- render-confirmed condition (subtraction form; only RHS is numeric literal 0)
  v_req24_cond    constant text := 'm - m_min_required >= 0';
  v_req24_quote   constant text :=
    'Mindestmischverhältnis: Für jedes Regenüberlaufbecken ist zu überprüfen, ob '
    || 'im langjährigen Mittel ein Mindestmischverhältnis m nach Gl. (22) '
    || 'eingehalten wird. Liegt die mittlere CSB-Konzentration im '
    || 'Trockenwetterabfluss über 600 mg/l, ist das Mindestmischverhältnis m nach '
    || 'Gl. (23) zu erhöhen.  m ≥ 7 für C_T,aM,CSB ≤ 600 mg/l (22); '
    || 'm ≥ (C_T,aM,CSB − 180)/60 für C_T,aM,CSB > 600 mg/l (23).';
  v_src_file      constant text := 'DWA-A_102-2 (3).pdf';
BEGIN
  ----------------------------------------------------------------------------
  -- Resolve the standard.
  ----------------------------------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-A-102-2';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DWA-A-102-2 not found';
  END IF;

  ----------------------------------------------------------------------------
  -- Resolve the two worksheets involved in the REQ-24 re-home.
  ----------------------------------------------------------------------------
  SELECT id INTO v_wt_34 FROM worksheet_templates
   WHERE standard_id = v_standard_id AND code = 'A1022-34';
  IF v_wt_34 IS NULL THEN
    RAISE EXCEPTION 'Worksheet A1022-34 (DWA-A-102-2) not found';
  END IF;

  SELECT id INTO v_wt_36 FROM worksheet_templates
   WHERE standard_id = v_standard_id AND code = 'A1022-36';
  IF v_wt_36 IS NULL THEN
    RAISE EXCEPTION 'Worksheet A1022-36 (DWA-A-102-2) not found';
  END IF;

  ----------------------------------------------------------------------------
  -- Resolve REQ-24 (currently on A1022-34). Must exist.
  ----------------------------------------------------------------------------
  SELECT id INTO v_req24_id FROM compliance_requirements
   WHERE worksheet_template_id = v_wt_34 AND code = 'REQ-24';
  -- Idempotency: if a prior run already re-homed it, pick it up on A1022-36.
  IF v_req24_id IS NULL THEN
    SELECT id INTO v_req24_id FROM compliance_requirements
     WHERE worksheet_template_id = v_wt_36 AND code = 'REQ-24';
  END IF;
  IF v_req24_id IS NULL THEN
    RAISE EXCEPTION 'REQ-24 (DWA-A-102-2) not found on A1022-34 or A1022-36';
  END IF;

  ----------------------------------------------------------------------------
  -- Resolve the m_min_required field + Gl.22/Gl.23 producers (all on A1022-36).
  ----------------------------------------------------------------------------
  SELECT id INTO v_mmr_field_id FROM fields
   WHERE worksheet_template_id = v_wt_36 AND symbol = 'm_min_required';
  IF v_mmr_field_id IS NULL THEN
    RAISE EXCEPTION 'Field m_min_required (DWA-A-102-2 / A1022-36) not found';
  END IF;

  SELECT id INTO v_gl22_id FROM equations
   WHERE worksheet_template_id = v_wt_36 AND equation_number = '22';
  IF v_gl22_id IS NULL THEN
    RAISE EXCEPTION 'Gl.22 (DWA-A-102-2 / A1022-36) not found';
  END IF;

  SELECT id INTO v_gl23_id FROM equations
   WHERE worksheet_template_id = v_wt_36 AND equation_number = '23';
  IF v_gl23_id IS NULL THEN
    RAISE EXCEPTION 'Gl.23 (DWA-A-102-2 / A1022-36) not found';
  END IF;

  --==========================================================================
  -- SEV-1 (a) — Re-home REQ-24 A1022-34 -> A1022-36 (worksheet-local lookup).
  -- FIX-DRAFT: "[G7 | SEV1 | DATA] REQ-24 undefined m_min_required; gate non-enforcing"
  --   · pattern P-8 (single-source, worksheet-local) · §7.3.4.2 (PDF p.53).
  --==========================================================================
  UPDATE compliance_requirements
     SET worksheet_template_id = v_wt_36
   WHERE id = v_req24_id
     AND worksheet_template_id IS DISTINCT FROM v_wt_36;

  --==========================================================================
  -- SEV-1 (b) — Fix REQ-24 grammar + backfill provenance (idempotent/converging).
  -- FIX-DRAFT: "[G7 | SEV1 | DATA] REQ-24 …" · pattern P-6b/P-4 · §7.3.4.2 (PDF p.53).
  -- `m >= m_min_required` (bare-symbol RHS -> string-literal -> always-fail)
  --   -> `m - m_min_required >= 0` (acompare; only literal RHS is 0). severity=block.
  --==========================================================================
  UPDATE compliance_requirements
     SET condition        = v_req24_cond,
         severity         = 'block',
         clause_reference = '§7.3.4.2 Gl. (22)/(23)',
         source_file      = v_src_file,
         source_anchor    = '§7.3.4.2 „Mindestmischverhältnis" Gl. (22)/(23) (PDF p.53)',
         source_quote     = v_req24_quote,
         description      =
           'Für jedes Regenüberlaufbecken muss das mittlere Mischverhältnis m das '
           || 'Mindestmischverhältnis m_min_required einhalten: m ≥ 7 (falls '
           || 'C_T,aM,CSB ≤ 600 mg/l) bzw. m ≥ (C_T,aM,CSB − 180)/60 (falls > 600 '
           || 'mg/l). m_min_required wird durch Gl. (22)/(23) erzeugt.',
         audit_notes      =
           'REQ-24 fix 2026-07-08: (a) von A1022-34 (falsches Blatt, ohne m/'
           || 'm_min_required) nach A1022-36 verschoben; (b) Grammatik '
           || '`m >= m_min_required` -> `m - m_min_required >= 0` (bare-symbol-RHS '
           || 'always-fail behoben, evaluate.ts L241-247). Render-confirmed §7.3.4.2 '
           || 'PDF p.53.'
   WHERE id = v_req24_id
     AND (condition IS DISTINCT FROM v_req24_cond
          OR source_quote IS DISTINCT FROM v_req24_quote);

  --==========================================================================
  -- SEV-1 (c) — Retag Gl.22/Gl.23 output_symbol `m` -> `m_min_required`.
  -- FIX-DRAFT: "[G7 | SEV1 | DATA] REQ-24 …" + C9 (m multi-producer) · P-4 · §7.3.4.2 (PDF p.53).
  -- Gl.22/23 are the piecewise producer of the MINIMUM (m_min_required), not of
  -- the mean m (that is B.13/Gl.24). This populates the previously-dangling field
  -- and removes the rival `m` owners. Formula/const 7/180/60 UNCHANGED (VA).
  --==========================================================================
  UPDATE equations
     SET output_symbol       = 'm_min_required',
         verification_status = 'verified_against_standard',
         clause_reference    = '§7.3.4.2 Gl. (22)',
         source_file         = v_src_file,
         source_anchor       = '§7.3.4.2 Gl. (22) (PDF p.53)',
         source_quote        =
           'm ≥ 7   für   C_T,aM,CSB ≤ 600 mg/l   (22)',
         audit_notes         =
           'Retag 2026-07-08: output_symbol m -> m_min_required (Gl.22 ist die '
           || 'Mindest-Anforderung, kein Produzent des mittleren m). Render-confirmed '
           || '§7.3.4.2 PDF p.53. Konstante 7 unverändert (VA). ENGINE-blocked: '
           || 'piecewise `if` rechnet unter der aktuellen Engine nicht auto.'
   WHERE id = v_gl22_id
     AND output_symbol IS DISTINCT FROM 'm_min_required';

  UPDATE equations
     SET output_symbol       = 'm_min_required',
         verification_status = 'verified_against_standard',
         clause_reference    = '§7.3.4.2 Gl. (23)',
         source_file         = v_src_file,
         source_anchor       = '§7.3.4.2 Gl. (23) (PDF p.53)',
         source_quote        =
           'm ≥ (C_T,aM,CSB − 180) / 60   für   C_T,aM,CSB > 600 mg/l   (23)',
         audit_notes         =
           'Retag 2026-07-08: output_symbol m -> m_min_required (Gl.23 ist die '
           || 'erhöhte Mindest-Anforderung bei C_T,aM,CSB > 600 mg/l). '
           || 'Render-confirmed §7.3.4.2 PDF p.53. Konstanten 180/60 unverändert (VA). '
           || 'ENGINE-blocked: piecewise `if` rechnet nicht auto.'
   WHERE id = v_gl23_id
     AND output_symbol IS DISTINCT FROM 'm_min_required';

  --==========================================================================
  -- SEV-1 (d) — Backfill m_min_required field provenance (idempotent/converging).
  -- FIX-DRAFT: "[G7 | SEV1 | DATA] REQ-24 …" · P-2/P-3 · §7.3.4.2 (PDF p.53).
  --==========================================================================
  UPDATE fields
     SET clause_reference = '§7.3.4.2 Gl. (22)/(23)',
         unit             = '-',
         source_file      = v_src_file,
         source_anchor    = '§7.3.4.2 „Mindestmischverhältnis" Gl. (22)/(23) (PDF p.53)',
         source_quote     = v_req24_quote,
         description      =
           'Mindestmischverhältnis (dimensionslos): 7 (falls C_T,aM,CSB ≤ 600 mg/l) '
           || 'bzw. (C_T,aM,CSB − 180)/60 (falls > 600 mg/l). Erzeugt durch '
           || 'Gl. (22)/(23); geprüft in REQ-24.',
         verification_status = 'verified_against_standard'
   WHERE id = v_mmr_field_id
     AND source_quote IS DISTINCT FROM v_req24_quote;

  --==========================================================================
  -- SEV-2 F2 [F3] — Correct Tab.6 storage-volume provenance (VALUES UNTOUCHED).
  -- FIX-DRAFT: "[F3 | SEV2 | DATA] Tab.6 constants mis-attributed to ATV-A 128"
  --   · patterns P-2/P-3, P-11/P-13 · PDF p.53 (Tab.6 = Zahlenbeispiel + Berechnungshilfe footnote),
  --   PDF p.49/p.53 (ATV-A 128:1992 CSB-Zielfunktion). Whole-doc grep of
  --   4000/25/0,551/36,8/13,5 = 0 hits -> not printed in A-102-2.
  -- Re-attributes clause_reference + provenance; sets verification_status NR
  -- (cannot VA/VC-verify without ATV-A 128 / Berechnungshilfe = source-blocked).
  -- Applies to T6.H1, T6.H2, T6.V, T6.Vs only. T6.a_f EXCLUDED (genuine A-102-2,
  -- = Max-form of B.10 -> handled in SEV-3 backfill below).
  --==========================================================================
  UPDATE equations e
     SET clause_reference    = 'Berechnungshilfe „Ermittlung Gesamtspeichervolumen" (Zusatzdatei) '
                               || '— CSB-Zielfunktion abgeleitet aus ATV-A 128:1992',
         verification_status = 'needs_engineer_review',
         source_file         = 'DWA-A-102-2 Berechnungshilfe / Zusatzdatei (nicht auf Datenträger)',
         source_anchor       = 'ATV-A 128:1992 (Speichervolumen-Zielfunktion) / DWA Berechnungshilfe',
         source_quote        =
           'PROVENIENZ-KORREKTUR: Diese Speichervolumen-Formel steht NICHT im '
           || 'Arbeitsblatt DWA-A 102-2. Tabelle 6 (PDF p.53) ist ein '
           || '„Zahlenbeispiel …", das laut Fußnote *) auf die Berechnungshilfe '
           || '„Ermittlung Gesamtspeichervolumen" (DWAdirekt/Zusatzdateien) verweist. '
           || 'Die Konstanten (4000/25/0,551/36,8/13,5/0,5) kommen im gesamten '
           || 'A-102-2-PDF nicht vor; die CSB-bezogene Zielsetzung ist „aus '
           || 'Arbeitsblatt ATV-A 128:1992 … abgeleitet" (PDF p.49/p.53). '
           || 'Zahlenwerte unverändert; Grade NR bis ATV-A 128 / Berechnungshilfe '
           || 'vorliegt (source-blocked).',
         audit_notes         =
           'F3 fix 2026-07-08: clause_reference von "Tabelle 6" korrigiert '
           || '(Tab.6 = Zahlenbeispiel + Berechnungshilfe-Verweis, PDF p.53). '
           || 'Formeln stammen aus der Berechnungshilfe/Zusatzdatei (ATV-A 128:1992 '
           || 'abgeleitet), NICHT VA-from-A-102-2. Numerik NICHT verändert.'
   FROM worksheet_templates wt
   WHERE e.worksheet_template_id = wt.id
     AND wt.standard_id = v_standard_id
     AND e.equation_number IN ('T6.H1','T6.H2','T6.V','T6.Vs')
     AND e.clause_reference IS DISTINCT FROM
         ('Berechnungshilfe „Ermittlung Gesamtspeichervolumen" (Zusatzdatei) '
          || '— CSB-Zielfunktion abgeleitet aus ATV-A 128:1992');

  --==========================================================================
  -- SEV-3 [P1] — Backfill NULL source_quote for render-confirmed A-102-2 eqs.
  -- FIX-DRAFT: "[P1 | SEV3 | DATA] NULL source_quote" · P-2/P-3. VA only.
  -- Only rows this migration touches or cites; each verbatim from the PDF.
  --==========================================================================

  -- Gl.9 (A1022-15) — q_A,b, PDF p.41 §6.2.2.
  UPDATE equations e
     SET source_quote     = 'q_A,b = q_A,max · 15 / r_krit   in m/h   (9)   '
                            || 'mit: q_A,b m/h maßgebende Oberflächenbeschickung im Bestand.',
         source_file      = v_src_file,
         source_anchor    = '§6.2.2 Gl. (9) (PDF p.41)',
         verification_status = 'verified_against_standard'
   FROM worksheet_templates wt
   WHERE e.worksheet_template_id = wt.id AND wt.standard_id = v_standard_id
     AND wt.code = 'A1022-15' AND e.equation_number = '9'
     AND e.source_quote IS NULL;

  -- Gl.10 (A1022-18) — A_RKB, PDF p.42 §6.2.3. (F1 vindicated: q_A,Bem is correct.)
  UPDATE equations e
     SET source_quote     = 'A_RKB = 3,6 · Q_Bem,Tr / q_A,Bem   in m²   (10)   '
                            || 'mit: A_RKB m² sedimentationswirksame Oberfläche des '
                            || 'Regenklärbeckens; Q_Bem,Tr l/s Bemessungszufluss (Anh. B, B.2.1); '
                            || 'q_A,Bem m/h Oberflächenbeschickung bei Bemessungszufluss '
                            || '(Bemessungswert, siehe 6.2.2).',
         source_file      = v_src_file,
         source_anchor    = '§6.2.3 Gl. (10) (PDF p.42) — Nenner q_A,Bem (render-confirmed)',
         verification_status = 'verified_against_standard'
   FROM worksheet_templates wt
   WHERE e.worksheet_template_id = wt.id AND wt.standard_id = v_standard_id
     AND wt.code = 'A1022-18' AND e.equation_number = '10'
     AND e.source_quote IS NULL;

  -- Gl.12 (A1022-18) — A_eff, PDF p.43 §6.3.
  UPDATE equations e
     SET source_quote     = 'A_eff = 3,6 · Q_Bem,Tr / q_A,max   in m²   (12)',
         source_file      = v_src_file,
         source_anchor    = '§6.3 Gl. (12) (PDF p.43)',
         verification_status = 'verified_against_standard'
   FROM worksheet_templates wt
   WHERE e.worksheet_template_id = wt.id AND wt.standard_id = v_standard_id
     AND wt.code = 'A1022-18' AND e.equation_number = '12'
     AND e.source_quote IS NULL;

  -- Gl.24 (A1022-33) — mean m, PDF p.54 §7.3.4.2.
  UPDATE equations e
     SET source_quote     = 'm = (Q_R,e + Q_R,Tr) / Q_T,aM   (24)   '
                            || '— bauwerksbezogene Abschätzung des mittleren Mischverhältnisses m.',
         source_file      = v_src_file,
         source_anchor    = '§7.3.4.2 Gl. (24) (PDF p.54)',
         verification_status = 'verified_against_standard'
   FROM worksheet_templates wt
   WHERE e.worksheet_template_id = wt.id AND wt.standard_id = v_standard_id
     AND wt.code = 'A1022-33' AND e.equation_number = '24'
     AND e.source_quote IS NULL;

  -- B.13 (A1022-23) — mean m (annex = canonical producer), §B.3.3.6.
  UPDATE equations e
     SET source_quote     = 'm = (Q_R,e + Q_R,Tr) / Q_T,aM   (B.13)   '
                            || '— mittleres Mischverhältnis (Anhang B, B.3.3.6).',
         source_file      = v_src_file,
         source_anchor    = '§B.3.3.6 Gl. (B.13) (PDF p.88)',
         verification_status = 'verified_against_standard'
   FROM worksheet_templates wt
   WHERE e.worksheet_template_id = wt.id AND wt.standard_id = v_standard_id
     AND wt.code = 'A1022-23' AND e.equation_number = 'B.13'
     AND e.source_quote IS NULL;

  -- T6.a_f (A1022-21) — genuine A-102-2 (Max-form of B.10). Provenance only.
  UPDATE equations e
     SET source_quote     = 'a_f = Max{0,50 + 50/(t_f + 100); 0,885}   '
                            || '(Max-Form der zweizweigigen Gl. B.10, §B.3.3.4). '
                            || 'Genuine A-102-2-Größe (nicht Tabelle-6-Zahlenbeispiel).',
         clause_reference = '§B.3.3.4 Gl. (B.10) (Max-Form)',
         source_file      = v_src_file,
         source_anchor    = '§B.3.3.4 Gl. (B.10) (PDF p.87) — Max-Form',
         verification_status = 'verified_against_standard'
   FROM worksheet_templates wt
   WHERE e.worksheet_template_id = wt.id AND wt.standard_id = v_standard_id
     AND wt.code = 'A1022-21' AND e.equation_number = 'T6.a_f'
     AND e.source_quote IS NULL;

  RAISE NOTICE 'DWA-A-102-2 gate-enforcement migration applied: REQ-24 re-homed A1022-34->A1022-36 + grammar fixed; Gl.22/23 -> m_min_required; Tab.6 H1/H2/V/Vs provenance corrected (NR); 6 eqs + REQ-24 + m_min_required source_quote backfilled. Gl.10 q_A,Bem confirmed correct (F1 false alarm) - untouched.';
END $$;

-- ============================================================================
-- ROLLBACK (run manually if needed — restores the pre-migration state):
--
-- DO $$
-- DECLARE
--   v_standard_id uuid; v_wt_34 uuid; v_wt_36 uuid;
-- BEGIN
--   SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-A-102-2';
--   SELECT id INTO v_wt_34 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A1022-34';
--   SELECT id INTO v_wt_36 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'A1022-36';
--
--   -- REQ-24: move back to A1022-34, restore original condition, null the backfill.
--   UPDATE compliance_requirements
--      SET worksheet_template_id = v_wt_34,
--          condition = 'm >= m_min_required',
--          clause_reference = '2.5.4',
--          source_file = NULL, source_anchor = NULL,
--          source_quote = 'Fuer das Fangbecken und das Durchlaufbecken ist ein Mindestmischverhaeltnis $\mathrm{m} \geq 7$ massgebend, da die CSB-Konzentration im Trockenwetterabfluss $C_{T, C S B}$ an diesem Bauwerken den Referenzwert von $600 \mathrm{mg} / \mathrm{l}$ nicht ueberschreitet.',
--          description = 'For every RÜB: m ≥ 7 (if C_T,aM,CSB ≤ 600) or m ≥ (C_T,aM,CSB − 180) / 60 (if > 600).',
--          audit_notes = NULL
--    WHERE worksheet_template_id IN (v_wt_34, v_wt_36) AND code = 'REQ-24';
--
--   -- Gl.22/23: restore output_symbol=m, IW status, original clause/quote null.
--   UPDATE equations SET output_symbol='m', verification_status='imported_unverified',
--          clause_reference='Section 7.3.4.2', source_file=NULL, source_anchor=NULL,
--          source_quote=NULL, audit_notes=NULL
--    WHERE worksheet_template_id=v_wt_36 AND equation_number='22';
--   UPDATE equations SET output_symbol='m', verification_status='imported_unverified',
--          clause_reference='Section 7.3.4.2', source_file=NULL, source_anchor=NULL,
--          source_quote=NULL, audit_notes=NULL
--    WHERE worksheet_template_id=v_wt_36 AND equation_number='23';
--
--   -- m_min_required field: restore original clause/description, null backfill.
--   UPDATE fields SET clause_reference='Gl. 22/23', unit='1', source_file=NULL,
--          source_anchor=NULL, source_quote=NULL, description='7 oder berechnet',
--          verification_status='imported_unverified'
--    WHERE worksheet_template_id=v_wt_36 AND symbol='m_min_required';
--
--   -- Tab.6 H1/H2/V/Vs: restore clause_reference='Tabelle 6', IW, null backfill.
--   UPDATE equations e SET clause_reference='Tabelle 6', verification_status='imported_unverified',
--          source_file=NULL, source_anchor=NULL, source_quote=NULL, audit_notes=NULL
--    FROM worksheet_templates wt
--    WHERE e.worksheet_template_id=wt.id AND wt.standard_id=v_standard_id
--      AND e.equation_number IN ('T6.H1','T6.H2','T6.V','T6.Vs');
--
--   -- SEV-3 backfilled eqs: null source_quote/anchor/file, restore IW.
--   UPDATE equations e SET source_quote=NULL, source_anchor=NULL, source_file=NULL,
--          verification_status='imported_unverified'
--    FROM worksheet_templates wt
--    WHERE e.worksheet_template_id=wt.id AND wt.standard_id=v_standard_id
--      AND ( (wt.code='A1022-15' AND e.equation_number='9')
--         OR (wt.code='A1022-18' AND e.equation_number IN ('10','12'))
--         OR (wt.code='A1022-33' AND e.equation_number='24')
--         OR (wt.code='A1022-23' AND e.equation_number='B.13')
--         OR (wt.code='A1022-21' AND e.equation_number='T6.a_f') );
--   UPDATE equations e SET clause_reference='Tabelle 6'
--    FROM worksheet_templates wt
--    WHERE e.worksheet_template_id=wt.id AND wt.standard_id=v_standard_id
--      AND wt.code='A1022-21' AND e.equation_number='T6.a_f';
-- END $$;
-- ============================================================================
