-- ─────────────────────────────────────────────────────────────────────────────
-- DWA-M 820-2 · 820-2-11 (Bedarfsplanung LPH 0) · gate/field faithfulness fix
-- ─────────────────────────────────────────────────────────────────────────────
-- §5.2 has exactly three problem-subsections: 5.2.2 (Randbedingungen), 5.2.3
-- (vorausschauende Maßnahmenplanung), 5.2.4 (Geänderter Bedarf aus
-- Gebietsentwicklungen). Defects found:
--   • §5.2.4 has NO field — REQ-23 wrongly reused `forward_planning_done`.
--   • REQ-32 is mis-homed (lot-wise procurement is a Vergabe-phase topic, not
--     §5.2 Bedarfsplanung), has an EMPTY condition, a redundant §5.2.4 prose
--     clause, and enforces nothing.
-- Fix: add the §5.2.4 field, repoint REQ-23 to it with a clean §-clause, and
-- remove the broken mis-homed REQ-32 (reversible; its lot-award requirement is
-- to be re-encoded on the correct 820-2 procurement worksheet — sign-off note).
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801320000_m820_2_11_bedarfsplanung_gates.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801320000-m820-2-11-bedarfsplanung-gates.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE s.code = 'DWA-M-820-2' AND wt.code = '820-2-11';
  IF v_ws IS NULL THEN RAISE EXCEPTION '820-2-11 not found'; END IF;

  -- 1. §5.2.4 field.
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws AND symbol = 'changed_needs_recognised') THEN
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type,
                        is_required, clause_reference, description, order_index, verification_status, active)
    VALUES (v_ws, NULL, 'changed_needs_recognised', 'Geänderter Bedarf aus Gebietsentwicklungen erkannt',
            'Changed needs from area developments recognised', 'boolean', false, '§5.2.4',
            'Geänderter Bedarf aus Gebietsentwicklungen wird rechtzeitig erkannt und berücksichtigt (§5.2.4).',
            25, 'imported_unverified', true);
  END IF;

  -- 2. Repoint REQ-23 to the §5.2.4 field with a clean clause.
  UPDATE compliance_requirements
     SET condition = 'changed_needs_recognised == true', clause_reference = '§5.2.4'
   WHERE id = 'c267f75d-f29e-4443-b029-275783b2eebb' AND code = 'REQ-23';

  -- 3. Remove the broken, mis-homed REQ-32.
  DELETE FROM compliance_requirements WHERE id = 'e677668c-d15e-498e-97c9-dcee5ce54bec' AND code = 'REQ-32';

  RAISE NOTICE '820-2-11 fixed: §5.2.4 field added, REQ-23 repointed, broken REQ-32 removed';
END $$;
