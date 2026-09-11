-- ============================================================================
-- OPTIONS sweep — TRANCHE 3 (SEEDED-BUT-EXTENSIBLE, non-exhaustive lists)
-- Date authored: 2026-08-01/02 session · STAGED, NOT APPLIED, NOT COMMITTED
-- Ruling: lists the standard prints as EXPLICITLY NON-exhaustive must NOT
--         become closed enums (tranche-1 residue). Instead:
--           · single-pick  => SUGGESTED-TEXT (data_type stays 'text',
--             enum_values seeded => <datalist> suggestions, free entry allowed)
--           · multi-pick   => EXTENSIBLE CHECKLIST (data_type 'json' +
--             enum_values seeded + validation_rules.extensible = true =>
--             seeded checkboxes + "Eigener Eintrag…" free additions)
--         Suggestions VERBATIM from the printed source only (SR-1/SR-3).
-- Widget:  src/components/worksheet/dynamic-field.tsx
--           text branch  => datalist when enum_values populated (this session)
--           json branch  => custom entries when validationRules.extensible
-- Sources located THIS session in the paged scratchpad extracts
-- (a138-paged.txt, m12003-paged.txt), printed-page references below.
-- Guards: each UPDATE requires id AND symbol AND current data_type='text'
--         (all 4 rows verified data_type='text', enum_values NULL,
--          validation_rules NULL via read-only prod lookup this session);
--         exactly 1 row each (4 UPDATEs total).
-- Rollback: scripts/rollback-options-sweep-tranche3.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- NON-EXHAUSTIVENESS BASIS (DWA-A 138-1, §6.1, gedruckte S. 52 — verbatim):
--   "In Abschnitt 6 werden für ausgewählte Anlagen systemspezifische
--    Bemessungsvorgaben dokumentiert und als Bemessungsgleichungen zur
--    Verfügung gestellt. Die im Bild 7 dargestellten Versickerungsanlagen
--    bilden das große Spektrum möglicher Anlagen in der Praxis nicht
--    vollständig ab. Variationen und Kombinationen von Versickerungsanlagen
--    sind möglich."
-- => the Anlagentyp spectrum is open; a closed enum would misencode it.
-- Seeded suggestions = the seven §6.2–6.8 type headings (verbatim, this
-- session, a138-paged.txt): 6.2 Versickerungsfläche (S. 53) ·
-- 6.3 Versickerungsmulde (S. 55) · 6.4 Rigole (S. 57) ·
-- 6.5 Mulden-Rigolen-Element (S. 61) · 6.6 Mulden-Rigolen-System (S. 65) ·
-- 6.7 Versickerungsschacht (S. 67) · 6.8 Versickerungsbecken (S. 70).
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 1) DWA-A-138-1 · A138-15 · a138_anlagentyp_gewaehlt  (single choice)
-- SUGGESTED-TEXT: data_type STAYS 'text' (free entry preserved — the chosen
-- type may be a Variation/Kombination not printed in §6); enum_values seeds
-- the datalist suggestions only. No value restriction is introduced.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  enum_values = '[
    {"value":"versickerungsflaeche","label_de":"Versickerungsfläche","label_en":null,"order_index":1,"regulation_reference":"§6.2"},
    {"value":"versickerungsmulde","label_de":"Versickerungsmulde","label_en":null,"order_index":2,"regulation_reference":"§6.3"},
    {"value":"rigole","label_de":"Rigole","label_en":null,"order_index":3,"regulation_reference":"§6.4"},
    {"value":"mulden_rigolen_element","label_de":"Mulden-Rigolen-Element","label_en":null,"order_index":4,"regulation_reference":"§6.5"},
    {"value":"mulden_rigolen_system","label_de":"Mulden-Rigolen-System","label_en":null,"order_index":5,"regulation_reference":"§6.6"},
    {"value":"versickerungsschacht","label_de":"Versickerungsschacht","label_en":null,"order_index":6,"regulation_reference":"§6.7"},
    {"value":"versickerungsbecken","label_de":"Versickerungsbecken","label_en":null,"order_index":7,"regulation_reference":"§6.8"}
  ]'::jsonb
WHERE id = '922e0c09-7372-43da-b258-baa729f95942'
  AND symbol = 'a138_anlagentyp_gewaehlt' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 2) DWA-A-138-1 · A138-15 · a138_anlagentyp_kandidaten  (several candidates)
-- EXTENSIBLE CHECKLIST: data_type 'text' -> 'json'; same seven seeded types;
-- validation_rules.extensible=true lets the engineer append candidates the
-- standard itself declares possible ("Variationen und Kombinationen …
-- sind möglich", §6.1 S. 52 — e.g. the printed variation examples Tiefbeete,
-- „Raingarden", Tunnelelemente, Tiefbeete mit Rigole, S. 52).
-- Merge idiom preserves any pre-existing validation_rules keys (currently
-- NULL per prod lookup) via COALESCE(...,'{}') || …
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'json',
  enum_values = '[
    {"value":"versickerungsflaeche","label_de":"Versickerungsfläche","label_en":null,"order_index":1,"regulation_reference":"§6.2"},
    {"value":"versickerungsmulde","label_de":"Versickerungsmulde","label_en":null,"order_index":2,"regulation_reference":"§6.3"},
    {"value":"rigole","label_de":"Rigole","label_en":null,"order_index":3,"regulation_reference":"§6.4"},
    {"value":"mulden_rigolen_element","label_de":"Mulden-Rigolen-Element","label_en":null,"order_index":4,"regulation_reference":"§6.5"},
    {"value":"mulden_rigolen_system","label_de":"Mulden-Rigolen-System","label_en":null,"order_index":5,"regulation_reference":"§6.6"},
    {"value":"versickerungsschacht","label_de":"Versickerungsschacht","label_en":null,"order_index":6,"regulation_reference":"§6.7"},
    {"value":"versickerungsbecken","label_de":"Versickerungsbecken","label_en":null,"order_index":7,"regulation_reference":"§6.8"}
  ]'::jsonb,
  validation_rules = COALESCE(validation_rules, '{}'::jsonb) || '{"extensible": true}'::jsonb
WHERE id = 'd52ed064-0a8f-47da-a2e1-e9fa40eae0a9'
  AND symbol = 'a138_anlagentyp_kandidaten' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 3+4) DWA-M-1200-3 · M12003-05 + M12003-06 · kultur_typ
-- ("Bewässerte Kulturart", description "Konkrete Kulturart inkl.
--  Verwertungsweg", clause_reference '§6 / Tab. 12'; the field exists on BOTH
--  worksheets per prod lookup — both rows seeded identically.)
-- NON-EXHAUSTIVENESS BASIS (DWA-M 1200-3 Entwurf Juli 2025, Tabelle 12
-- header note, gedruckte S. 46 = PDF-Seite 46 — verbatim):
--   "Tabelle 12: Beschreibung der Systembestandteile für Verteilung,
--    Speicherung und Aufbringung (Hinweis zur Nutzung: Die Listung ist nicht
--    erschließend. Es können sowohl zusätzliche Aspekte notwendig werden oder
--    hier aufgeführte gegebenenfalls nicht nötig sein. Das ist zu prüfen.)"
-- SUGGESTED-TEXT: data_type STAYS 'text'. The only concrete
-- Kulturart-inkl.-Verwertungsweg entries Tab. 12 prints are the two "z. B."
-- examples in the Verteilungsgebiet row (S. 46 — verbatim):
--   "Verwertungswege der zu bewässernden Pflanzen (z. B. Kartoffeln:
--    Speise- oder Stärkekartoffeln; Mais: Biogas oder Futtermittel)"
-- => 2 suggestions, seeded exactly as printed (see residue for what was NOT
--    seeded and why).
-- ----------------------------------------------------------------------------
UPDATE fields SET
  enum_values = '[
    {"value":"kartoffeln_speise_oder_staerke","label_de":"Kartoffeln: Speise- oder Stärkekartoffeln","label_en":null,"order_index":1,"regulation_reference":"Tab. 12 (S. 46)"},
    {"value":"mais_biogas_oder_futtermittel","label_de":"Mais: Biogas oder Futtermittel","label_en":null,"order_index":2,"regulation_reference":"Tab. 12 (S. 46)"}
  ]'::jsonb
WHERE id = '6713e298-ea48-463c-a430-5d967318f749'
  AND symbol = 'kultur_typ' AND data_type = 'text';

UPDATE fields SET
  enum_values = '[
    {"value":"kartoffeln_speise_oder_staerke","label_de":"Kartoffeln: Speise- oder Stärkekartoffeln","label_en":null,"order_index":1,"regulation_reference":"Tab. 12 (S. 46)"},
    {"value":"mais_biogas_oder_futtermittel","label_de":"Mais: Biogas oder Futtermittel","label_en":null,"order_index":2,"regulation_reference":"Tab. 12 (S. 46)"}
  ]'::jsonb
WHERE id = '8048c039-8877-41e9-b526-14647ef70bc7'
  AND symbol = 'kultur_typ' AND data_type = 'text';

-- Expect exactly 4 rows updated in total (1 per statement).
COMMIT;

-- Post-apply verification (read-only):
-- SELECT f.symbol, f.data_type, jsonb_array_length(f.enum_values) AS n_options,
--        f.validation_rules->>'extensible' AS extensible
-- FROM fields f WHERE f.id IN (
--   '922e0c09-7372-43da-b258-baa729f95942',
--   'd52ed064-0a8f-47da-a2e1-e9fa40eae0a9',
--   '6713e298-ea48-463c-a430-5d967318f749',
--   '8048c039-8877-41e9-b526-14647ef70bc7');
-- Expected: gewaehlt text/7/null · kandidaten json/7/true ·
--           kultur_typ (x2) text/2/null.
