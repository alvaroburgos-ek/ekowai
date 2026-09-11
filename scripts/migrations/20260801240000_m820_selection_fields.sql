-- ─────────────────────────────────────────────────────────────────────────────
-- DWA-M 820-1 · remaining 7 worksheets · guideline-options-as-selection
-- ─────────────────────────────────────────────────────────────────────────────
-- These json fields are now rendered by config-driven structured widgets
-- (checklist / structured register) per selection-fields.ts. This migration only
-- documents the structure in each field description (the editors read the json
-- carrier regardless). No field is deprecated: `bewertungskommission_size` feeds
-- block gate REQ-09 (VgV §58) and stays; `schluesselpersonal_count` is unrelated.
-- Options/columns are guideline-grounded; §124 GWB grounds are a declared-grounds
-- register (external law, not fabricated). Author-only.
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801240000_m820_selection_fields.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801240000-m820-selection-fields.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_std uuid;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code = 'DWA-M-820-1';
  IF v_std IS NULL THEN RAISE EXCEPTION 'DWA-M-820-1 not found'; END IF;

  UPDATE fields f SET description = d.descr
  FROM (VALUES
    ('applicable_legal_bases', 'Mehrfachauswahl anwendbarer Rechtsgrundlagen (§7.1–7.4, Anhang B): AEUV, VRL, GWB, VgV, UVgO, VOL/A, BHO, LHO, GemO, Landesvergabegesetze, HOAI, BGB; eigene Ergänzung möglich. Auswahl abhängig vom EU-Schwellenwert.'),
    ('exclusion_124_gwb_selected', 'Register der vom Auftraggeber gewählten fakultativen Ausschlussgründe (§124 GWB, Anh. E.1.2): je Grund + „vorab bekannt gemacht“. Die konkreten §124-Gründe stehen im Gesetz (extern, nicht im Merkblatt abgedruckt) — nicht erfunden.'),
    ('award_criteria_list', 'Register der Zuschlagskriterien (Anhang E.2): Kriterium (Schlüsselpersonal, Örtl. Bauüberwachung, Organisation der Aufgabenverteilung, Projektorganisation, Analyse der Aufgabenstellung, Dokumentation, Preis) + Gewichtung (%) + Anmerkung; Anzahl abgeleitet.'),
    ('stakeholder_list', 'Beteiligten-Matrix (§5.1–5.6, Bild 5): je Beteiligtem eine Zeile — Beteiligter, Rolle/Funktion, Verantwortung, Kommunikationsweg.'),
    ('alternatives_considered', 'Register geprüfter Alternativen (§4.1, §6.3): Alternative, Beschreibung, Bewertung/Ergebnis.'),
    ('quality_targets_konzept', 'Register Qualitätsziele Konzept (Bild 2): Qualitätsziel + Anforderung/Kriterium.'),
    ('quality_targets_projekt', 'Register Qualitätsziele Projekt (Bild 3): Qualitätsziel + Anforderung/Kriterium.'),
    ('bewertungskommission_members', 'Register der Bewertungskommission (§8.4): Name, Funktion/Rolle, Sachverstand, stimmberechtigt. Anzahl (bewertungskommission_size, REQ-09) bleibt separat erfasst.')
  ) AS d(symbol, descr)
  WHERE f.symbol = d.symbol
    AND f.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_std)
    AND f.description IS DISTINCT FROM d.descr;

  RAISE NOTICE 'M820-1 selection-field descriptions enriched';
END $$;
