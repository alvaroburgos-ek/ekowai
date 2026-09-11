-- ─────────────────────────────────────────────────────────────────────────────
-- DIN 276 + DWA-M 277E · guideline-options-as-selection
-- ─────────────────────────────────────────────────────────────────────────────
-- json fields now render via config-driven widgets (selection-fields.ts).
-- Description-only documentation; editors read the json carrier regardless.
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801260000_din276_277e_selection_fields.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801260000-din276-277e-selection-fields.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_din uuid; v_277 uuid;
BEGIN
  SELECT id INTO v_din FROM standards WHERE code = 'DIN-276';
  SELECT id INTO v_277 FROM standards WHERE code = 'DWA-M-277E';

  IF v_din IS NOT NULL THEN
    UPDATE fields f SET description = d.descr
    FROM (VALUES
      ('applicable_cost_groups', 'Mehrfachauswahl der anwendbaren Kostengruppen (§5): KG 100 Grundstück, 200 Vorbereitende Maßnahmen, 300 Baukonstruktionen, 400 Technische Anlagen, 500 Außenanlagen, 600 Ausstattung/Kunstwerke, 700 Baunebenkosten, 800 Finanzierung.'),
      ('planning_stage_active', 'Mehrfachauswahl der aktiven Kostenermittlungsstufe(n) (§4.3): Kostenrahmen, Kostenschätzung, Kostenberechnung, Kostenanschlag, Kostenfeststellung.'),
      ('special_cost_flags', 'Mehrfachauswahl besonderer Kostenarten (§4.2.10–4.2.14): vorhandene Bausubstanz, beigestellte Leistungen, besondere Kosten, prognostizierte Kosten, risikobehaftete Kosten.'),
      ('input_documents_register', 'Register kostenrelevanter Eingangsunterlagen (§4.2.5): Dokument + Stand + Bemerkung.')
    ) AS d(symbol, descr)
    WHERE f.symbol = d.symbol
      AND f.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_din)
      AND f.description IS DISTINCT FROM d.descr;
    RAISE NOTICE 'DIN-276 selection fields enriched';
  END IF;

  IF v_277 IS NOT NULL THEN
    UPDATE fields
      SET description = 'Mehrfachauswahl der angeschlossenen Grauwasserquellen (§5, Tab. 2): Dusche, Badewanne, Handwaschbecken, Waschmaschine, Küchenspüle, Geschirrspüler. Typ A gering belastet (ohne Küche/Waschmaschine), Typ B höher belastet.'
      WHERE symbol = 'source_set'
        AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_277)
        AND description IS DISTINCT FROM 'Mehrfachauswahl der angeschlossenen Grauwasserquellen (§5, Tab. 2): Dusche, Badewanne, Handwaschbecken, Waschmaschine, Küchenspüle, Geschirrspüler. Typ A gering belastet (ohne Küche/Waschmaschine), Typ B höher belastet.';
    RAISE NOTICE 'DWA-M-277E source_set enriched';
  END IF;
END $$;
