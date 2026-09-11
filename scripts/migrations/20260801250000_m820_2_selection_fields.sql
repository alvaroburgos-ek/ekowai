-- ─────────────────────────────────────────────────────────────────────────────
-- DWA-M 820-2 · guideline-options-as-selection (11 json fields)
-- ─────────────────────────────────────────────────────────────────────────────
-- These json fields now render via config-driven structured widgets
-- (selection-fields.ts): HOAI-phase checklists, Projektsteuerung checklist,
-- and registers for goals/stakeholders/standards/permits/software/TOM. This
-- migration only documents the structure in each description (editors read the
-- json carrier regardless). No behavioural change; no field deprecated.
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801250000_m820_2_selection_fields.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801250000-m820-2-selection-fields.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_std uuid;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code = 'DWA-M-820-2';
  IF v_std IS NULL THEN RAISE EXCEPTION 'DWA-M-820-2 not found'; END IF;

  UPDATE fields f SET description = d.descr
  FROM (VALUES
    ('included_hoai_phases', 'Mehrfachauswahl der beauftragten HOAI-Leistungsphasen (§1): LPH 0 Bedarfsplanung … LPH 9 Objektbetreuung.'),
    ('lph_completed', 'Mehrfachauswahl der abgeschlossenen Leistungsphasen (§5.3/§5.4): LPH 0 … LPH 9, je Freigabe nach Abschluss.'),
    ('projektsteuerung_scope', 'Mehrfachauswahl der Handlungsbereiche der Projektsteuerung (§4.1, §4.3–4.7): Projektorganisation, Termin-, Kosten-, Vertrags-, Qualitäts-, Risikomanagement.'),
    ('project_goals', 'Register der Projektziele (§2.1, DIN 18205 Tab. A.2): Kategorie (funktional/technisch, soziokulturell/gestalterisch, wirtschaftlich/terminlich, ökologisch) + Ziel + Anforderung.'),
    ('stakeholders_list', 'Beteiligten-Register (§3, Bild 1): Beteiligter, Rolle, Verantwortung, Kommunikationsweg.'),
    ('applicable_din_standards', 'Register geltender DIN-Normen (§6.2): Norm + Titel + Geltungsbereich.'),
    ('applicable_dwa_standards', 'Register geltender DWA-/ATV-Regelwerke (§6.2): Regelwerk + Titel + Geltungsbereich.'),
    ('client_guidelines', 'Register der Auftraggeber-Richtlinien (§6.1/§6.2): Richtlinie + Beschreibung.'),
    ('permit_inventory_complete', 'Genehmigungsinventur (§5.4.1): Genehmigung + Rechtsbereich (Wasser-/Bau-/Umwelt-/Naturschutzrecht/Sonstige) + Status.'),
    ('software_products_defined', 'Register eingesetzter Software (§8.2.1): Software + Einsatzzweck.'),
    ('data_security_measures', 'Register technischer/organisatorischer Maßnahmen — TOM (§8.8, DSGVO/BSI): Art (technisch/organisatorisch) + Maßnahme.')
  ) AS d(symbol, descr)
  WHERE f.symbol = d.symbol
    AND f.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std)
    AND f.description IS DISTINCT FROM d.descr;

  RAISE NOTICE 'DWA-M-820-2 selection-field descriptions enriched';
END $$;
