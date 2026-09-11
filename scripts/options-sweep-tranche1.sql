-- ============================================================================
-- OPTIONS-AS-SELECTION sweep — TRANCHE 1 (text -> enum, data-only)
-- Date authored: 2026-08-01/02 session · STAGED, NOT APPLIED, NOT COMMITTED
-- Ruling: fixed guideline options => selection widget, never free text;
--         options VERBATIM from the printed standard only (SR-1/SR-3).
-- Pattern: Obsidian _schema/STRUCTURED-REGISTER-STANDARDIZATION.md
-- Audit:   Obsidian reasoning-maps/_AUDIT-guideline-options-as-selection.md
-- Every option list below was located this session in the local source
-- (pdftotext -layout / paged extract), with printed-page references.
-- Guards: each UPDATE requires the field's id AND current data_type='text';
--         affects exactly 1 row each (11 UPDATEs total).
-- Rollback: scripts/rollback-options-sweep-tranche1.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) DWA-M-102-4 · M104-16 · dachtyp  (id bfff… see guard)
-- Source: DWA-M 102-4/BWK-M 3-4, Tabelle A.1 "Aufteilungswerte für Flächen",
-- gedruckte S. 27 (PDF-Seite 29 of DWA-M_102-4.pdf), rows with
-- Berechnungsansatz A.2/A.3 (§A.2 S. 28, §A.3 S. 28):
--   "Steildach (alle Materialien)" | "Flachdach (glatt)" | "Flachdach (rau)" |
--   "Flachdach (Kies)" | "Asphalt, fugenloser Beton" | "Pflaster mit dichten Fugen"
-- Value tokens preserved from the field's prior description.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"steildach","label_de":"Steildach (alle Materialien)","label_en":null,"order_index":1,"regulation_reference":"Tab. A.1; §A.2"},
    {"value":"flachdach_glatt","label_de":"Flachdach (glatt)","label_en":null,"order_index":2,"regulation_reference":"Tab. A.1; §A.2"},
    {"value":"flachdach_rau","label_de":"Flachdach (rau)","label_en":null,"order_index":3,"regulation_reference":"Tab. A.1; §A.3"},
    {"value":"flachdach_kies","label_de":"Flachdach (Kies)","label_en":null,"order_index":4,"regulation_reference":"Tab. A.1; §A.3"},
    {"value":"asphalt_beton","label_de":"Asphalt, fugenloser Beton","label_en":null,"order_index":5,"regulation_reference":"Tab. A.1; §A.3"},
    {"value":"pflaster_dichte_fugen","label_de":"Pflaster mit dichten Fugen","label_en":null,"order_index":6,"regulation_reference":"Tab. A.1; §A.3"}
  ]'::jsonb
WHERE id = 'b4ea85df-22e0-4d93-a70d-da62af6393d1'
  AND symbol = 'dachtyp' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 2) DWA-M-102-4 · M104-17 · ableitungstyp
-- Source: Tabelle B.1 "Aufteilungswerte für Anlagen zur Bewirtschaftung von
-- Niederschlagswasser", gedruckte S. 33 (PDF-Seite 35), rows "Ableitung":
--   "Rohr, Rinne, steiler Graben" (1/0/0) |
--   "Flache Gräben mit Bewuchs (Fläche des Grabens A_Graben > 2 % der
--    angeschlossenen, abflusswirksamen befestigten Fläche A_b,a)" (0,7/0,1/0,2)
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"rohr_rinne_steiler_graben","label_de":"Rohr, Rinne, steiler Graben","label_en":null,"order_index":1,"regulation_reference":"Tab. B.1"},
    {"value":"flacher_graben_bewuchs","label_de":"Flache Gräben mit Bewuchs","label_en":null,"order_index":2,"regulation_reference":"Tab. B.1"}
  ]'::jsonb
WHERE id = '34d11bfa-4978-4c0c-98c3-60d2ad870f17'
  AND symbol = 'ableitungstyp' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 3) DWA-M-102-4 · M104-18 · belagstyp
-- Source: Anhang A section headings §A.6–A.10 (gedruckte S. 29–31) +
-- Tabelle A.1 (S. 27):
--   A.6 "Teildurchlässige Flächenbeläge (Fugenanteil 2 % bis 5 %)"
--   A.7 "Teildurchlässige Flächenbeläge (Fugenanteil 6 % bis 10 %)"
--   A.8 "Teildurchlässige Flächenbeläge (Poren- und Sickersteine, Schotterrasen, Kies)"
--   A.9 "Rasengittersteine"
--   A.10 "Deckschichten ohne Bindemittel (wassergebundene Decke)"
-- Value tokens preserved from the field's prior description.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"fugen_2_5","label_de":"Teildurchlässige Flächenbeläge (Fugenanteil 2 % bis 5 %)","label_en":null,"order_index":1,"regulation_reference":"§A.6"},
    {"value":"fugen_6_10","label_de":"Teildurchlässige Flächenbeläge (Fugenanteil 6 % bis 10 %)","label_en":null,"order_index":2,"regulation_reference":"§A.7"},
    {"value":"porensteine","label_de":"Teildurchlässige Flächenbeläge (Poren- und Sickersteine, Schotterrasen, Kies)","label_en":null,"order_index":3,"regulation_reference":"§A.8"},
    {"value":"rasengittersteine","label_de":"Rasengittersteine","label_en":null,"order_index":4,"regulation_reference":"§A.9"},
    {"value":"wassergebundene_decke","label_de":"Deckschichten ohne Bindemittel (wassergebundene Decke)","label_en":null,"order_index":5,"regulation_reference":"§A.10"}
  ]'::jsonb
WHERE id = '0aa3ad89-ea91-4da0-8f01-6509f542fce2'
  AND symbol = 'belagstyp' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 4) DWA-M-102-4 · M104-19 · gd_typ
-- Source: Tabelle A.1 (S. 27) rows "Gründach" (A.4) / "Einstaudach" (A.5);
-- §A.4 "Gründächer" (S. 28-29), §A.5 "Einstaudächer" (S. 29).
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"gruendach","label_de":"Gründach","label_en":null,"order_index":1,"regulation_reference":"Tab. A.1; §A.4"},
    {"value":"einstaudach","label_de":"Einstaudach","label_en":null,"order_index":2,"regulation_reference":"Tab. A.1; §A.5"}
  ]'::jsonb
WHERE id = '49a690f1-13d2-49eb-8c0e-d219d18c2608'
  AND symbol = 'gd_typ' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 5) DWA-M-102-4 · M104-32 · ermittlungsverfahren
-- Source: §5.2.1 (S. 20): "Die Referenzgrößen können vorzugsweise gemäß 5.2.2
-- bestimmt werden oder je nach Verfügbarkeit der Daten und Modelle auch nach
-- 5.2.3 bis 5.2.5." — closed set of the four printed methods:
--   5.2.2 "Ermittlung mit dem WaSiG-Verfahren" (S. 20)
--   5.2.3 "Ermittlung mit Wasserhaushaltsmodellen" (S. 20)
--   5.2.4 "Ermittlung mit dem Verfahren GWneu" (S. 20)
--   5.2.5 "Ermittlung mit dem Hydrologischen Atlas von Deutschland" (S. 21)
-- Value tokens preserved from the field's prior description.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"wasig","label_de":"Ermittlung mit dem WaSiG-Verfahren","label_en":null,"order_index":1,"regulation_reference":"§5.2.2"},
    {"value":"wasserhaushaltsmodell","label_de":"Ermittlung mit Wasserhaushaltsmodellen","label_en":null,"order_index":2,"regulation_reference":"§5.2.3"},
    {"value":"gwneu","label_de":"Ermittlung mit dem Verfahren GWneu","label_en":null,"order_index":3,"regulation_reference":"§5.2.4"},
    {"value":"had","label_de":"Ermittlung mit dem Hydrologischen Atlas von Deutschland","label_en":null,"order_index":4,"regulation_reference":"§5.2.5"}
  ]'::jsonb
WHERE id = 'f0593f31-6ab3-4f6b-840a-d41b83b94e7c'
  AND symbol = 'ermittlungsverfahren' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 6) DWA-A-262E · A262-07 · vorbehandlung_typ
-- Source: Standard DWA-A 262E (official ENGLISH edition — printed labels are
-- English; no German print locally, so label_de stays NULL, never invented).
-- §4.2 "Dimensioning of Pretreatment", subsections (printed pp. 21–25,
-- PDF pages 23–27 of DWA-A_262E (2).pdf):
--   4.2.2 "Multicompartment Septic Tank" (p. 21)
--   4.2.3 "Rotting Tank" (p. 21)
--   4.2.4 "Settling Ponds" (p. 22)
--   4.2.5 "Imhoff Tank" (p. 22)
--   4.2.6 "Raw Wastewater Filter" (p. 23)
--   4.2.7 "Aerated Settling Pond" (p. 25)
-- NOTE: prior description tokens (mehrkammergrube|rechen_sieb|sandfang|
-- dreikammer_absetzbecken) did NOT match the printed list and are replaced.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"multicompartment_septic_tank","label_de":null,"label_en":"Multicompartment Septic Tank","order_index":1,"regulation_reference":"§4.2.2"},
    {"value":"rotting_tank","label_de":null,"label_en":"Rotting Tank","order_index":2,"regulation_reference":"§4.2.3"},
    {"value":"settling_ponds","label_de":null,"label_en":"Settling Ponds","order_index":3,"regulation_reference":"§4.2.4"},
    {"value":"imhoff_tank","label_de":null,"label_en":"Imhoff Tank","order_index":4,"regulation_reference":"§4.2.5"},
    {"value":"raw_wastewater_filter","label_de":null,"label_en":"Raw Wastewater Filter","order_index":5,"regulation_reference":"§4.2.6"},
    {"value":"aerated_settling_pond","label_de":null,"label_en":"Aerated Settling Pond","order_index":6,"regulation_reference":"§4.2.7"}
  ]'::jsonb
WHERE id = 'a20766d0-9ac6-48ae-937a-8209e2bf9044'
  AND symbol = 'vorbehandlung_typ' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 7) DWA-A-262E · A262-17 · filtertyp_gewaehlt_KA  (small WWTS, worksheet
-- "Bemessungs-Zusammenfassung Kleinanlage")
-- Source: printed main-biological-stage filters for SMALL systems,
-- §4.3.1.2–4.3.1.6 + §4.3.2 (printed pp. 25–27):
--   4.3.1.2 "Vertical Filter with Sand 0 mm to 2 mm" (p. 25)
--   4.3.1.3 "Two-stage Vertical Filter with Fine Gravel 2 mm to 8 mm and Coarse Sand 0 mm to 4 mm" (p. 26)
--   4.3.1.4 "Vertical Filter with Coarse Sand 0 mm to 4 mm" (p. 26)
--   4.3.1.5 "Actively Aerated Vertical Filter with Gravel 8 mm to 16 mm" (p. 26)
--   4.3.1.6 "Two-layer Filter Trench with Fine Gravel 2 mm to 8 mm and Coarse Sand 0 mm to 4 mm" (p. 27)
--   4.3.2   "Actively Aerated Horizontal Filter with 8 mm to 16 mm Gravel as the
--            Main Biological Treatment Step in Small Wastewater Treatment Systems" (p. 27)
-- clause_reference sharpened from '§4.3' to the true source clauses.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"vf_sand_0_2","label_de":null,"label_en":"Vertical Filter with Sand 0 mm to 2 mm","order_index":1,"regulation_reference":"§4.3.1.2"},
    {"value":"vf_two_stage_fine_gravel_coarse_sand","label_de":null,"label_en":"Two-stage Vertical Filter with Fine Gravel 2 mm to 8 mm and Coarse Sand 0 mm to 4 mm","order_index":2,"regulation_reference":"§4.3.1.3"},
    {"value":"vf_coarse_sand_0_4","label_de":null,"label_en":"Vertical Filter with Coarse Sand 0 mm to 4 mm","order_index":3,"regulation_reference":"§4.3.1.4"},
    {"value":"vf_aerated_gravel_8_16","label_de":null,"label_en":"Actively Aerated Vertical Filter with Gravel 8 mm to 16 mm","order_index":4,"regulation_reference":"§4.3.1.5"},
    {"value":"two_layer_filter_trench","label_de":null,"label_en":"Two-layer Filter Trench with Fine Gravel 2 mm to 8 mm and Coarse Sand 0 mm to 4 mm","order_index":5,"regulation_reference":"§4.3.1.6"},
    {"value":"hf_aerated_gravel_8_16","label_de":null,"label_en":"Actively Aerated Horizontal Filter with 8 mm to 16 mm Gravel","order_index":6,"regulation_reference":"§4.3.2"}
  ]'::jsonb,
  clause_reference = '§4.3.1–§4.3.2'
WHERE id = '19a58a32-8ca5-4105-803d-2657509c3fb2'
  AND symbol = 'filtertyp_gewaehlt_KA' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 8) DWA-A-262E · A262-18 · filter_type_KomKA  (worksheet "Filtertyp-Inventar -
-- Kommunale KA")
-- Source: §4.3.3 "Vertical Flow Filters as the Main Biological Treatment Step
-- in Municipal Wastewater Treatment Plants", subsections (printed pp. 28–31):
--   4.3.3.2 "Vertical Filter with Sand 0 mm to 2 mm" (p. 28)
--   4.3.3.3 "Two-stage Vertical Filters with Fine Gravel 2 mm to 8 mm and Coarse Sand 0 mm to 4 mm" (p. 29)
--   4.3.3.4 "Vertical Filter with Coarse Sand 0 mm to 4 mm" (p. 30)
--   4.3.3.5 "Actively Aerated Vertical Filter with Gravel 8 mm to 16 mm" (p. 30)
--   4.3.3.6 "Vertical Filter with Lava Sand 0 mm to 4 mm" (p. 31)
-- AUDIT FIX: stored clause_reference '§4.3.4-4.3.6' was WRONG (those sections
-- are seasonal operation / greywater / downstream polishing) -> '§4.3.3'.
-- NOTE: prior description implied a 6th option "HF Kies belüftet"; the printed
-- municipal main-stage list (§4.3.3) contains vertical filters only — the
-- horizontal aerated filter is printed for SMALL systems (§4.3.2). Not carried.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"vf_sand_0_2","label_de":null,"label_en":"Vertical Filter with Sand 0 mm to 2 mm","order_index":1,"regulation_reference":"§4.3.3.2"},
    {"value":"vf_two_stage_fine_gravel_coarse_sand","label_de":null,"label_en":"Two-stage Vertical Filters with Fine Gravel 2 mm to 8 mm and Coarse Sand 0 mm to 4 mm","order_index":2,"regulation_reference":"§4.3.3.3"},
    {"value":"vf_coarse_sand_0_4","label_de":null,"label_en":"Vertical Filter with Coarse Sand 0 mm to 4 mm","order_index":3,"regulation_reference":"§4.3.3.4"},
    {"value":"vf_aerated_gravel_8_16","label_de":null,"label_en":"Actively Aerated Vertical Filter with Gravel 8 mm to 16 mm","order_index":4,"regulation_reference":"§4.3.3.5"},
    {"value":"vf_lava_sand_0_4","label_de":null,"label_en":"Vertical Filter with Lava Sand 0 mm to 4 mm","order_index":5,"regulation_reference":"§4.3.3.6"}
  ]'::jsonb,
  clause_reference = '§4.3.3'
WHERE id = '083bba88-c0a0-48a4-93dc-339b86290a7c'
  AND symbol = 'filter_type_KomKA' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 9) DWA-A-262E · A262-24 · filtertyp_KomKA  (worksheet "Bemessungs-
-- Zusammenfassung Kommunale KA") — same printed list as (8), §4.3.3.2–4.3.3.6
-- (pp. 28–31). clause_reference sharpened '§4.3' -> '§4.3.3'.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"vf_sand_0_2","label_de":null,"label_en":"Vertical Filter with Sand 0 mm to 2 mm","order_index":1,"regulation_reference":"§4.3.3.2"},
    {"value":"vf_two_stage_fine_gravel_coarse_sand","label_de":null,"label_en":"Two-stage Vertical Filters with Fine Gravel 2 mm to 8 mm and Coarse Sand 0 mm to 4 mm","order_index":2,"regulation_reference":"§4.3.3.3"},
    {"value":"vf_coarse_sand_0_4","label_de":null,"label_en":"Vertical Filter with Coarse Sand 0 mm to 4 mm","order_index":3,"regulation_reference":"§4.3.3.4"},
    {"value":"vf_aerated_gravel_8_16","label_de":null,"label_en":"Actively Aerated Vertical Filter with Gravel 8 mm to 16 mm","order_index":4,"regulation_reference":"§4.3.3.5"},
    {"value":"vf_lava_sand_0_4","label_de":null,"label_en":"Vertical Filter with Lava Sand 0 mm to 4 mm","order_index":5,"regulation_reference":"§4.3.3.6"}
  ]'::jsonb,
  clause_reference = '§4.3.3'
WHERE id = 'f656b0e7-7f64-4fb5-9820-b121fe8131b1'
  AND symbol = 'filtertyp_KomKA' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 10) DWA-A-138-1 · A138-23 · facility_type_dimensioned
-- Source: DWA-A 138-1, Abschnitt 6 — the standard prints system-specific
-- Bemessung ONLY for these seven Versickerungsanlagen (§6.1 S. 52: "In
-- Abschnitt 6 werden für ausgewählte Anlagen systemspezifische
-- Bemessungsvorgaben dokumentiert…"); a DIMENSIONED type is therefore one of:
--   6.2 "Versickerungsfläche" (S. 53)   6.3 "Versickerungsmulde" (S. 55)
--   6.4 "Rigole" (S. 57)                6.5 "Mulden-Rigolen-Element" (S. 61)
--   6.6 "Mulden-Rigolen-System" (S. 65) 6.7 "Versickerungsschacht" (S. 67)
--   6.8 "Versickerungsbecken" (S. 70)
-- (Verified in paged PDF extract a138-paged.txt, pages S052–S070.)
-- NOTE: the SELECTION-stage fields a138_anlagentyp_gewaehlt/_kandidaten are
-- deliberately NOT converted — §6.1 (S. 52) states the printed spectrum is
-- non-exhaustive ("bilden … nicht vollständig ab; Variationen und
-- Kombinationen … sind möglich"), so those need seeded+extensible widgets.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"versickerungsflaeche","label_de":"Versickerungsfläche","label_en":null,"order_index":1,"regulation_reference":"§6.2"},
    {"value":"versickerungsmulde","label_de":"Versickerungsmulde","label_en":null,"order_index":2,"regulation_reference":"§6.3"},
    {"value":"rigole","label_de":"Rigole","label_en":null,"order_index":3,"regulation_reference":"§6.4"},
    {"value":"mulden_rigolen_element","label_de":"Mulden-Rigolen-Element","label_en":null,"order_index":4,"regulation_reference":"§6.5"},
    {"value":"mulden_rigolen_system","label_de":"Mulden-Rigolen-System","label_en":null,"order_index":5,"regulation_reference":"§6.6"},
    {"value":"versickerungsschacht","label_de":"Versickerungsschacht","label_en":null,"order_index":6,"regulation_reference":"§6.7"},
    {"value":"versickerungsbecken","label_de":"Versickerungsbecken","label_en":null,"order_index":7,"regulation_reference":"§6.8"}
  ]'::jsonb,
  clause_reference = '§6.2–6.8'
WHERE id = '1537f2e7-7812-4e9b-9694-74cb596990a0'
  AND symbol = 'facility_type_dimensioned' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 11) DWA-M-229-2 · M2292-03 · stoerung_typ
-- Source: DWA-M 229-2, §4.4.1 "Betriebsstörungen bei der Druckbelüftung",
-- subsections 4.4.1.2–4.4.1.8 (printed S. 27–28; §4.4.1.2–4.4.1.4 verified on
-- PDF page 29 of DWA-M-229-2.pdf):
--   4.4.1.2 "Ausfall von einzelnen Drucklufterzeugern" (S. 27)
--   4.4.1.3 "Ausfall von Belüftern" (S. 27)
--   4.4.1.4 "Schäden an Rohrleitungen" (S. 27)
--   4.4.1.5 "Stromausfall" (S. 28)
--   4.4.1.6 "Ausfall der Messtechnik" (S. 28)
--   4.4.1.7 "Unerwartete Frachtstöße" (S. 28)
--   4.4.1.8 "Stilllegung von Becken" (S. 28)
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'enum',
  enum_values = '[
    {"value":"ausfall_drucklufterzeuger","label_de":"Ausfall von einzelnen Drucklufterzeugern","label_en":null,"order_index":1,"regulation_reference":"§4.4.1.2"},
    {"value":"ausfall_beluefter","label_de":"Ausfall von Belüftern","label_en":null,"order_index":2,"regulation_reference":"§4.4.1.3"},
    {"value":"schaeden_rohrleitungen","label_de":"Schäden an Rohrleitungen","label_en":null,"order_index":3,"regulation_reference":"§4.4.1.4"},
    {"value":"stromausfall","label_de":"Stromausfall","label_en":null,"order_index":4,"regulation_reference":"§4.4.1.5"},
    {"value":"ausfall_messtechnik","label_de":"Ausfall der Messtechnik","label_en":null,"order_index":5,"regulation_reference":"§4.4.1.6"},
    {"value":"frachtstoss","label_de":"Unerwartete Frachtstöße","label_en":null,"order_index":6,"regulation_reference":"§4.4.1.7"},
    {"value":"beckenstilllegung","label_de":"Stilllegung von Becken","label_en":null,"order_index":7,"regulation_reference":"§4.4.1.8"}
  ]'::jsonb
WHERE id = '6a19f3c4-b5dc-40a9-bff1-33feefab2986'
  AND symbol = 'stoerung_typ' AND data_type = 'text';

-- Expect exactly 11 rows updated in total (1 per statement).
COMMIT;
