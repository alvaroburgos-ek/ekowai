-- DWA-M 1200-3 (Bewässerungstagebuch) + FLL-Naturteich (equipment/plants) selection widgets.
-- Description-only documentation; editors read the json carrier. FLL source PDF is not in the
-- library → option lists NOT seeded (never invented). Apply/rollback per header convention.
DO $$
DECLARE v_1200 uuid; v_fll uuid;
BEGIN
  SELECT id INTO v_1200 FROM standards WHERE code = 'DWA-M-1200-3';
  SELECT id INTO v_fll  FROM standards WHERE code = 'FLL-Naturteich';

  IF v_1200 IS NOT NULL THEN
    UPDATE fields SET description = 'Bewässerungstagebuch (§4.2, Tab. 2), schlagbezogen: je Bewässerungsgabe Start/Ende, Empfehlung + reale Gabe (mm), Fläche (ha), Wasserverbrauch total + davon aufbereitet (m³), Kommentar.'
      WHERE symbol = 'bewaesserungstagebuch'
        AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_1200)
        AND description IS DISTINCT FROM 'Bewässerungstagebuch (§4.2, Tab. 2), schlagbezogen: je Bewässerungsgabe Start/Ende, Empfehlung + reale Gabe (mm), Fläche (ha), Wasserverbrauch total + davon aufbereitet (m³), Kommentar.';
    RAISE NOTICE 'DWA-M-1200-3 bewaesserungstagebuch enriched';
  END IF;

  IF v_fll IS NOT NULL THEN
    UPDATE fields f SET description = d.descr
    FROM (VALUES
      ('equipment_elements_list', 'Register der Anlagenausstattung (§8.3): Element + Typ/Hersteller + Bemerkung. FLL-Quelle nicht in der Bibliothek — Auswahllisten nicht vorbelegt (Freitext, nicht erfunden).'),
      ('plant_species_list', 'Register der Pflanzenliste (§10.4): Pflanzenart + Zone/Beckentyp + Anzahl/Bemerkung. FLL-Quelle nicht in der Bibliothek — Listen nicht vorbelegt (Freitext, nicht erfunden).')
    ) AS d(symbol, descr)
    WHERE f.symbol = d.symbol
      AND f.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id = v_fll)
      AND f.description IS DISTINCT FROM d.descr;
    RAISE NOTICE 'FLL-Naturteich registers enriched';
  END IF;
END $$;
