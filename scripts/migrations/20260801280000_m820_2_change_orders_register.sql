-- ─────────────────────────────────────────────────────────────────────────────
-- DWA-M 820-2 · 820-2-21 · Bauänderungen/Nachträge as a register (there can be many)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds a `change_orders` json field rendered by the structured register
-- (selection-fields.ts): one row per change with Kostenwirkung/Terminwirkung/
-- Entscheidung/Status. Count + volume are DERIVED (footer), so the hand-entered
-- `aenderungs_anordnungen_count` + `aenderungs_volumen_eur` are deprecated
-- (nothing consumes them — verified). §5.6.4/§5.6.5.
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801280000_m820_2_change_orders_register.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801280000-m820-2-change-orders.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_ws uuid;
BEGIN
  SELECT wt.id INTO v_ws FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
  WHERE s.code = 'DWA-M-820-2' AND wt.code = '820-2-21';
  IF v_ws IS NULL THEN RAISE EXCEPTION '820-2-21 not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws AND symbol = 'change_orders') THEN
    INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type,
                        is_required, clause_reference, description, order_index, verification_status, active)
    VALUES (v_ws, NULL, 'change_orders', 'Bauänderungen / Nachträge',
            'Construction changes / change orders', 'json', false, '§5.6.4, §5.6.5',
            'Register der Bauänderungen/Nachträge (§5.6.4/§5.6.5): je Änderung Beschreibung, Datum, Kostenwirkung (€), Terminwirkung, Entscheidung, Status. Anzahl und Volumen werden abgeleitet.',
            5, 'imported_unverified', true);
  END IF;

  UPDATE fields
     SET active = false,
         description = COALESCE(description, '')
                    || ' [deaktiviert 2026-08-01: aus dem Bauänderungs-Register abgeleitet (Anzahl/Volumen), nicht händisch erfasst.]'
   WHERE worksheet_template_id = v_ws
     AND symbol IN ('aenderungs_anordnungen_count', 'aenderungs_volumen_eur')
     AND active = true;

  RAISE NOTICE '820-2-21 change_orders register added; count/volume deprecated';
END $$;
