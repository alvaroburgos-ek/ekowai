-- DWA-M 1200-1 (indicator chemicals Tab. 19) + DWA-A 272E (criteria_social Table 6) → checklists.
-- Description-only. Options verified against the printed tables (SR-1).
DO $$
DECLARE v1 uuid; v2 uuid;
BEGIN
  SELECT id INTO v1 FROM standards WHERE code='DWA-M-1200-1';
  SELECT id INTO v2 FROM standards WHERE code='DWA-A-272E';
  IF v1 IS NOT NULL THEN
    UPDATE fields f SET description=d.descr FROM (VALUES
      ('indikatorchemikalien_kat1','Mehrfachauswahl der überwachten Indikatorchemikalien Kategorie 1 (einfach entfernbar), Tab. 19 / RL (EU) 2024/3019: Amisulprid, Carbamazepin, Citalopram, Clarithromycin, Diclofenac, Hydrochlorothiazid, Metoprolol, Venlafaxin, Valsartansäure.'),
      ('indikatorchemikalien_kat2','Mehrfachauswahl der überwachten Indikatorchemikalien Kategorie 2 (moderat entfernbar), Tab. 19 / RL (EU) 2024/3019: Benzotriazol, 4- und 5-Methylbenzotriazol, Gabapentin, Candesartan, Irbesartan.')
    ) AS d(symbol,descr) WHERE f.symbol=d.symbol
      AND f.worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v1)
      AND f.description IS DISTINCT FROM d.descr;
    RAISE NOTICE '1200-1 chemicals enriched';
  END IF;
  IF v2 IS NOT NULL THEN
    UPDATE fields SET description='Mehrfachauswahl der sozialen Bewertungskriterien (§7.2, Table 6, Hauptziel 4): Akzeptanz, qualifizierte Arbeitsplätze, Umweltbewusstsein.'
      WHERE symbol='criteria_social' AND worksheet_template_id IN (SELECT id FROM worksheet_templates WHERE standard_id=v2)
      AND description IS DISTINCT FROM 'Mehrfachauswahl der sozialen Bewertungskriterien (§7.2, Table 6, Hauptziel 4): Akzeptanz, qualifizierte Arbeitsplätze, Umweltbewusstsein.';
    RAISE NOTICE '272E criteria_social enriched';
  END IF;
END $$;
