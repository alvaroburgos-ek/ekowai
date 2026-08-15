-- ============================================================================
-- Migration: DWA-M-229-1 DATA-track gate-enforcement + formula fidelity fix
-- File:      20260708200000_dwa_m_229_1_gate_enforcement.sql
-- Standard:  DWA-M-229-1 (Belüftung / Durchmischung, September 2017, korr. Feb. 2021)
-- Status:    WRITTEN-NOT-APPLIED. Do NOT auto-apply. Read-only DB was used to author.
--
-- Apply:     node scripts/apply-migration.mjs scripts/migrations/20260708200000_dwa_m_229_1_gate_enforcement.sql
-- Rollback:  see "-- ROLLBACK" block at the foot of this file (commented; run manually).
--
-- ----------------------------------------------------------------------------
-- SUMMARY
-- This migration implements the render-confirmed DWA-M-229-1 FIX-DRAFT
-- (Obsidian: encoding-audit-2026-07-01/DEEP-DWA-M-229-1.md, COMPLIANCE GAP LIST).
-- Two source-verified (VA) fixes, ordered SEV-1 → SEV-2:
--
--   SEV-1  [G6 | CR-018 inverted]  (pattern P-6c)
--     CR-018 condition was `beckenform == 'kreisringbecken'` used as a *block*
--     condition. That BLOCKS every non-Kreisring design (a rectangular tank can
--     never satisfy beckenform=='kreisringbecken' → gate fails → project blocked),
--     while it lets a Kreisring tank pass with NO Dämpfungsplanken check at all.
--     The source (§6.2.3.2, p.55, render-confirmed) says: "In Kreisringbecken …
--     sind daher grundsätzlich Dämpfungsplanken einzubauen." → the requirement
--     applies ONLY IF the tank is a Kreisringbecken, and then MANDATES
--     Dämpfungsplanken. Rewritten to the canonical implication form
--         (NOT beckenform == 'kreisringbecken') OR daempfungsplanken == true
--     which enforces under evaluate.ts (parenthesised NOT/OR, boolean == true,
--     string-literal RHS on the equality). "sind … einzubauen" = muss ⇒ severity
--     stays 'block'. A new boolean consequent field `daempfungsplanken` is added
--     (idempotently) because no such field existed.
--
--   SEV-2  [F1 | F-BD spurious ×100]  (pattern P-2/P-3; A138-18 scale-factor shape)
--     Equation Gl.(9) BD had formula `BD = a_ges / A_BB * 100`. The rendered
--     source (§3.2.9, p.15, render-confirmed) prints the equation as
--         BD = (n_Bel · a_Bel) / A_BB      (–)      (9)
--     i.e. DIMENSIONLESS, with NO ×100. (The "50 %–80 %" nearby is the active
--     fraction of the perforated surface — a *different* quantity — and the "%"
--     that appears in the Kurzzeichen legend is a legend-only convention, not the
--     equation.) The spurious ×100 makes encoded BD 100× the standard's value.
--     Fixed: formula → `BD = a_ges / A_BB`, output_unit → '-', source_anchor
--     aligned to the render-confirmed dimensionless form. (`a_ges` is the total
--     gassing area = n_Bel·a_Bel, so the numerator is faithful; the C3 symbol
--     relabel a_ges↔n_Bel·a_Bel is out of scope and left as-is.)
--
-- Patterns applied: P-6c (implication gate), P-2/P-3 (provenance-tagged eq).
-- Grammar verified against src/lib/compliance/evaluate.ts: NOT/OR/parens,
-- `== true`, and string-literal-RHS equality are all supported; no symbol-RHS
-- always-fail introduced (RHS of the equality is the quoted literal
-- 'kreisringbecken', and the consequent is `daempfungsplanken == true`).
--
-- LEFT-UNFIXED (out of scope for this DATA migration — reported, not touched):
--   * F-fint (consumer-wiring): Gl.20/21/22 don't multiply OV_h by f_int
--     (Gl.18). Faithful formulas, a wiring gap — needs an engineering decision
--     (verify §4.3.1/§4.3.2), NOT a data edit here.  → for-Alvaro.
--   * Presence-only gates (~11: CR-008 "ab 600 m", CR-009/010 "Druckverlust
--     begrenzen", CR-011/014/019/021/024/025/026/028/029): each only tests
--     `X IS NOT NULL`. Turning them into real limit checks requires
--     source-confirmed thresholds that are NOT printed as single numeric limits
--     — must NOT invent. → for-Alvaro / NR.
--   * `==` / chained-AND gates (CR-017/020/023/027, CR-001/005 …): grammar-valid
--     under evaluate.ts (parenthesised AND, numeric-literal RHS, `== true`,
--     `== <number>`) → they DO enforce. Not "fixed".
--   * IW-provenance eqs (OV_h_max_Prog heading-only, rho_s empty $$, P_K /
--     p_2_abs truncated cells): inferred-by-physics, not verbatim-cited. Leaving
--     verification_status as-is; no render-verbatim capture available to promote
--     to VA without guessing. → NR.
--   * C3 symbol variants (V_DN↔V_D, m_z↔m_Z, q_L_Bel_erf↔q_L,Bel, a_ges↔n_Bel·a_Bel):
--     same-quantity relabels; cosmetic, not enforcement-affecting. → NR.
--
-- P-13 note: DWA-M-229-1's Anhang A/C/D quantities are encoded as EQUATIONS +
-- fields, not as keyed `regulation_tables` lookups (0 rows for this standard).
-- No gate/fix in this migration reads a keyed table, so no re-keying risk. The
-- only lookup-adjacent value touched is Gl.9 (a formula, not a table). P-13 N/A.
-- ============================================================================

DO $$
DECLARE
  v_standard_id  uuid;
  v_wt_cr018     uuid;   -- worksheet holding CR-018 + beckenform (M2291-01)
  v_wt_bd        uuid;   -- worksheet holding Gl.9 BD (M2291-04)
  v_cr018_id     uuid;
  v_bd_eq_id     uuid;
  v_beckenform   uuid;   -- existing beckenform field (for section placement)
  v_section_id   uuid;
  v_next_oi      integer;
  v_new_formula  constant text := 'BD = a_ges / A_BB';
  v_new_cond     constant text :=
    '(NOT beckenform == ''kreisringbecken'') OR daempfungsplanken == true';
BEGIN
  ------------------------------------------------------------------------------
  -- Resolve the standard.
  ------------------------------------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-M-229-1';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DWA-M-229-1 not found';
  END IF;

  ------------------------------------------------------------------------------
  -- Resolve worksheets by code.
  ------------------------------------------------------------------------------
  SELECT id INTO v_wt_cr018
    FROM worksheet_templates
   WHERE standard_id = v_standard_id AND code = 'M2291-01';
  IF v_wt_cr018 IS NULL THEN
    RAISE EXCEPTION 'Worksheet M2291-01 (DWA-M-229-1) not found';
  END IF;

  SELECT id INTO v_wt_bd
    FROM worksheet_templates
   WHERE standard_id = v_standard_id AND code = 'M2291-04';
  IF v_wt_bd IS NULL THEN
    RAISE EXCEPTION 'Worksheet M2291-04 (DWA-M-229-1) not found';
  END IF;

  ------------------------------------------------------------------------------
  -- Resolve the CR-018 gate (must exist).
  ------------------------------------------------------------------------------
  SELECT id INTO v_cr018_id
    FROM compliance_requirements
   WHERE worksheet_template_id = v_wt_cr018 AND code = 'CR-018';
  IF v_cr018_id IS NULL THEN
    RAISE EXCEPTION 'CR-018 (DWA-M-229-1 / M2291-01) not found';
  END IF;

  ------------------------------------------------------------------------------
  -- Resolve the BD / Gl.9 equation (must exist).
  ------------------------------------------------------------------------------
  SELECT id INTO v_bd_eq_id
    FROM equations
   WHERE worksheet_template_id = v_wt_bd
     AND output_symbol = 'BD'
     AND equation_number = '9';
  IF v_bd_eq_id IS NULL THEN
    RAISE EXCEPTION 'Gl.9 BD equation (DWA-M-229-1 / M2291-04) not found';
  END IF;

  -- --------------------------------------------------------------------------
  -- SEV-1 — [G6] Add consequent field `daempfungsplanken` (idempotent).
  -- FIX-DRAFT: "[G6 | SEV1 | DATA] CR-018 inverted" · pattern P-6c · §6.2.3.2 (PDF p.15/15 header, clause p.55).
  -- Placed in the same section as `beckenform` (its antecedent) on M2291-01.
  ------------------------------------------------------------------------------
  SELECT id, section_id INTO v_beckenform, v_section_id
    FROM fields
   WHERE worksheet_template_id = v_wt_cr018 AND symbol = 'beckenform';
  -- Fallback: first section of the worksheet if beckenform has no section.
  IF v_section_id IS NULL THEN
    SELECT id INTO v_section_id
      FROM worksheet_sections
     WHERE worksheet_template_id = v_wt_cr018
     ORDER BY order_index
     LIMIT 1;
  END IF;

  SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_next_oi
    FROM fields WHERE worksheet_template_id = v_wt_cr018;

  IF NOT EXISTS (
    SELECT 1 FROM fields
     WHERE worksheet_template_id = v_wt_cr018 AND symbol = 'daempfungsplanken'
  ) THEN
    INSERT INTO fields (
      worksheet_template_id, section_id, symbol, label_de, label_en,
      data_type, is_required, clause_reference, description,
      order_index, active, verification_status,
      source_file, source_anchor, source_quote
    ) VALUES (
      v_wt_cr018, v_section_id, 'daempfungsplanken',
      'Dämpfungsplanken eingebaut (Kreisringbecken)',
      'Damping baffles installed (annular tank)',
      'boolean', false, '§6.2.3.2',
      'In Kreisringbecken sind grundsätzlich Dämpfungsplanken einzubauen '
        || '(§6.2.3.2). Konsequent-Feld für CR-018.',
      v_next_oi, true, 'imported_unverified',
      'DWA-M-229-1.md',
      '§6.2.3.2 (PDF p.55) — Dämpfungsplanken in Kreisringbecken',
      'In Kreisringbecken werden gelegentlich Wellenbildungen an der Oberfläche '
        || 'sowie hydraulische Schwingungen beobachtet, die zu Schädigungen der '
        || 'Walzenbelüfter führen können. In diesen Becken sind daher '
        || 'grundsätzlich Dämpfungsplanken einzubauen. Bild 10 verdeutlicht ihre '
        || 'Anordnung im Becken.'
    );
  END IF;

  ------------------------------------------------------------------------------
  -- SEV-1 — [G6] Un-invert CR-018 to the implication form (idempotent/converging).
  -- FIX-DRAFT: "[G6 | SEV1 | DATA] CR-018 inverted (blocks all non-Kreisring)" · P-6c · §6.2.3.2 (PDF p.55).
  -- severity stays 'block' ("sind … einzubauen" = muss).
  ------------------------------------------------------------------------------
  UPDATE compliance_requirements
     SET condition = v_new_cond,
         description =
           'Nur in Kreisringbecken: es sind grundsätzlich Dämpfungsplanken '
           || 'einzubauen (§6.2.3.2). Bedingtes Erfordernis — für alle anderen '
           || 'Beckenformen nicht anwendbar (vacuously erfüllt). '
           || '(Dämpfungsfläche ca. 1,5–2 % der Beckenoberfläche, ca. 25 cm '
           || 'unter Wasserspiegel bei ET=30 cm.)'
   WHERE id = v_cr018_id
     AND condition IS DISTINCT FROM v_new_cond;

  -- --------------------------------------------------------------------------
  -- SEV-2 — [F1] Remove spurious ×100 from Gl.9 BD (idempotent/converging).
  -- FIX-DRAFT: "[F1 | SEV2 | DATA] F-BD spurious x100 vs dimensionless Gl.9" · P-2/P-3 · §3.2.9 (PDF p.15).
  -- Render-confirmed: BD = (n_Bel · a_Bel)/A_BB  (–)  (9)  — dimensionless, no ×100.
  ------------------------------------------------------------------------------
  UPDATE equations
     SET formula = v_new_formula,
         output_unit = '-',
         source_anchor =
           '§3.2.9 Gl. (9) (PDF p.15) — BD = (n_Bel·a_Bel)/A_BB, Einheit (–), '
           || 'dimensionslos; kein ×100 in der Quelle',
         audit_notes =
           'F-BD fix 2026-07-08: entfernt spurioses ×100 (Quelle Gl.9 = '
           || 'dimensionslos (–), render-confirmed §3.2.9 p.15). '
           || 'Numerator a_ges = n_Bel·a_Bel (gesamte begaste Fläche).'
   WHERE id = v_bd_eq_id
     AND formula IS DISTINCT FROM v_new_formula;

  RAISE NOTICE 'DWA-M-229-1 gate-enforcement migration applied (CR-018 un-inverted, Gl.9 ×100 removed, daempfungsplanken field ensured).';
END $$;

-- ============================================================================
-- ROLLBACK (run manually if needed — restores the pre-migration state):
--
-- DO $$
-- DECLARE
--   v_standard_id uuid;
--   v_wt_cr018 uuid; v_wt_bd uuid;
-- BEGIN
--   SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-M-229-1';
--   SELECT id INTO v_wt_cr018 FROM worksheet_templates
--     WHERE standard_id = v_standard_id AND code = 'M2291-01';
--   SELECT id INTO v_wt_bd FROM worksheet_templates
--     WHERE standard_id = v_standard_id AND code = 'M2291-04';
--
--   UPDATE compliance_requirements
--      SET condition = 'beckenform == ''kreisringbecken''',
--          description = 'In Kreisringbecken sind grundsaetzlich Daempfungsplanken einzubauen (Daempfungsflaeche ca. 1,5-2 % der Beckenoberflaeche, ca. 25 cm unter Wasserspiegel bei ET=30 cm).'
--    WHERE worksheet_template_id = v_wt_cr018 AND code = 'CR-018';
--
--   UPDATE equations
--      SET formula = 'BD = a_ges / A_BB * 100',
--          output_unit = NULL,
--          source_anchor = 'DWA-M-229-1.md:L420 §3.2.9 (·100-Form Tab.A.2)',
--          audit_notes = NULL
--    WHERE worksheet_template_id = v_wt_bd AND output_symbol = 'BD' AND equation_number = '9';
--
--   DELETE FROM fields
--    WHERE worksheet_template_id = v_wt_cr018 AND symbol = 'daempfungsplanken';
-- END $$;
-- ============================================================================
