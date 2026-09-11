-- ============================================================================
-- OPTIONS-AS-SELECTION sweep — TRANCHE 2 (multi-select CHECKLIST shape)
-- Date authored: 2026-08-01 session · STAGED, NOT APPLIED, NOT COMMITTED
-- Ruling: guideline supplies a fixed set of options where SEVERAL may apply
--         => multi-select checklist (json data_type + populated enum_values),
--         never free text; options VERBATIM from the printed source (SR-1/SR-3).
-- Widget:  src/components/worksheet/dynamic-field.tsx json branch renders a
--          checkbox list when enum_values is populated; the selection persists
--          as a JSON string array via project_parameters.value_json.
-- Pattern: Obsidian _schema/STRUCTURED-REGISTER-STANDARDIZATION.md
-- Audit:   Obsidian reasoning-maps/_AUDIT-guideline-options-as-selection.md
-- Every option list below was located THIS session in the local sources
-- (pdftotext -layout via PowerShell), with printed-page references.
-- Guards: each UPDATE requires the field's id AND symbol AND current
--         data_type='text' (all 5 fields are text today); exactly 1 row each.
-- Rollback: scripts/rollback-options-sweep-tranche2.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) DWA-M-1200-1 · M12001-10 · indikatorchemikalien_kat1
-- Source: DWA-M 1200-1 (Entwurf, Juli 2025), Tabelle 19 "Liste empfohlener
-- Indikatorchemikalien für den Nachweis einer weitergehenden Spurenstoff-
-- entfernung", gedruckte S. 66-67 (PDF-Seite 67 of DWA-M_1200-1_GD.pdf),
-- column "Kategorie 1: einfach entfernbar" — 9 substances verbatim:
--   Amisulprid | Carbamazepin | Citalopram | Clarithromycin | Diclofenac |
--   Hydrochlorothiazid | Metoprolol | Venlafaxin | Valsartansäure
-- (The prior field description shortened "Valsartansäure" to "Valsartans" —
--  printed name is "Valsartansäure".)
-- Several substances are selected for a plant's monitoring set => checklist.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'json',
  enum_values = '[
    {"value":"amisulprid","label_de":"Amisulprid","label_en":null,"order_index":1,"regulation_reference":"Tab. 19 Kat. 1"},
    {"value":"carbamazepin","label_de":"Carbamazepin","label_en":null,"order_index":2,"regulation_reference":"Tab. 19 Kat. 1"},
    {"value":"citalopram","label_de":"Citalopram","label_en":null,"order_index":3,"regulation_reference":"Tab. 19 Kat. 1"},
    {"value":"clarithromycin","label_de":"Clarithromycin","label_en":null,"order_index":4,"regulation_reference":"Tab. 19 Kat. 1"},
    {"value":"diclofenac","label_de":"Diclofenac","label_en":null,"order_index":5,"regulation_reference":"Tab. 19 Kat. 1"},
    {"value":"hydrochlorothiazid","label_de":"Hydrochlorothiazid","label_en":null,"order_index":6,"regulation_reference":"Tab. 19 Kat. 1"},
    {"value":"metoprolol","label_de":"Metoprolol","label_en":null,"order_index":7,"regulation_reference":"Tab. 19 Kat. 1"},
    {"value":"venlafaxin","label_de":"Venlafaxin","label_en":null,"order_index":8,"regulation_reference":"Tab. 19 Kat. 1"},
    {"value":"valsartansaeure","label_de":"Valsartansäure","label_en":null,"order_index":9,"regulation_reference":"Tab. 19 Kat. 1"}
  ]'::jsonb
WHERE id = '3c207bbb-8024-42e8-9cf3-060d624d1318'
  AND symbol = 'indikatorchemikalien_kat1' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 2) DWA-M-1200-1 · M12001-10 · indikatorchemikalien_kat2
-- Source: same Tabelle 19, gedruckte S. 66-67 (PDF-Seite 67), column
-- "Kategorie 2: moderat entfernbar" — 5 substances verbatim:
--   Benzotriazol | 4- und 5-Methylbenzotriazol | Gabapentin | Candesartan |
--   Irbesartan
-- Printed ANMERKUNG (*): "Gabapentin wurde aufgrund der höheren Relevanz für
-- eine Wasserwiederverwendung zu den empfohlenen Indikatorchemikalien nach
-- (EU) 2024/3019 ergänzt." (footnote only; not encoded as an option).
-- (The prior field description wrote "4-/5-Methylbenzotriazol" — printed name
--  is "4- und 5-Methylbenzotriazol".)
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'json',
  enum_values = '[
    {"value":"benzotriazol","label_de":"Benzotriazol","label_en":null,"order_index":1,"regulation_reference":"Tab. 19 Kat. 2"},
    {"value":"methylbenzotriazol_4_5","label_de":"4- und 5-Methylbenzotriazol","label_en":null,"order_index":2,"regulation_reference":"Tab. 19 Kat. 2"},
    {"value":"gabapentin","label_de":"Gabapentin","label_en":null,"order_index":3,"regulation_reference":"Tab. 19 Kat. 2"},
    {"value":"candesartan","label_de":"Candesartan","label_en":null,"order_index":4,"regulation_reference":"Tab. 19 Kat. 2"},
    {"value":"irbesartan","label_de":"Irbesartan","label_en":null,"order_index":5,"regulation_reference":"Tab. 19 Kat. 2"}
  ]'::jsonb
WHERE id = '3f842ab6-fb0f-4578-ad7c-666c8f18f279'
  AND symbol = 'indikatorchemikalien_kat2' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 3) DWA-M-820-2 · 820-2-15 (Planungsphasen-Zusammenfassung) · lph_completed
-- Source LPH 1-9 names: HOAI 2021, § 43 Abs. 1 "Leistungsbild Ingenieurbauwerke"
-- (local source bayika_hoai_2021.pdf, rendered "- Seite 28 -" = PDF-Seite 28):
--   "1. für die Leistungsphase 1 (Grundlagenermittlung) ...
--    2. ... 2 (Vorplanung) ... 3. ... 3 (Entwurfsplanung) ...
--    4. ... 4 (Genehmigungsplanung) ... 5. ... 5 (Ausführungsplanung) ...
--    6. ... 6 (Vorbereitung der Vergabe) ... 7. ... 7 (Mitwirkung bei der
--    Vergabe) ... 8. ... 8 (Bauoberleitung) ... 9. ... 9 (Objektbetreuung)"
--   (Ingenieurbauwerke is the HOAI Leistungsbild governing the water-
--    infrastructure projects DWA-M 820 addresses; LPH 8 is printed
--    "Bauoberleitung" there, not the § 34 building term.)
-- Source LPH 0: DWA-M 820-2 (April 2023), gedruckte S. 3 (PDF-Seite 5):
--   "... über alle Phasen hinweg, d. h. von der Bedarfsplanung (LPH 0) bis
--    zur Objektbetreuung (LPH 9) ..." — the standard's own project scope
--    starts at LPH 0, so a completed-phases checklist includes it.
-- Multiple phases can be completed => checklist.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'json',
  enum_values = '[
    {"value":"lph_0","label_de":"LPH 0 — Bedarfsplanung","label_en":null,"order_index":1,"regulation_reference":"DWA-M 820-2 S. 3"},
    {"value":"lph_1","label_de":"LPH 1 — Grundlagenermittlung","label_en":null,"order_index":2,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_2","label_de":"LPH 2 — Vorplanung","label_en":null,"order_index":3,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_3","label_de":"LPH 3 — Entwurfsplanung","label_en":null,"order_index":4,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_4","label_de":"LPH 4 — Genehmigungsplanung","label_en":null,"order_index":5,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_5","label_de":"LPH 5 — Ausführungsplanung","label_en":null,"order_index":6,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_6","label_de":"LPH 6 — Vorbereitung der Vergabe","label_en":null,"order_index":7,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_7","label_de":"LPH 7 — Mitwirkung bei der Vergabe","label_en":null,"order_index":8,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_8","label_de":"LPH 8 — Bauoberleitung","label_en":null,"order_index":9,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_9","label_de":"LPH 9 — Objektbetreuung","label_en":null,"order_index":10,"regulation_reference":"HOAI 2021 § 43 Abs. 1"}
  ]'::jsonb
WHERE id = '294b6b7d-1008-4294-8b2f-0f7d89ea110f'
  AND symbol = 'lph_completed' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 4) DWA-M-820-3 · M8203-01 (Projektregistrierung) · applicable_lph
-- Field description: "Leistungsphasen covered (LPH 0-9 per HOAI / AHO)."
-- Source LPH 1-9 names: HOAI 2021 § 43 Abs. 1 (bayika_hoai_2021.pdf,
--   "- Seite 28 -" = PDF-Seite 28) — same verbatim list as (3) above.
-- Source LPH 0: DWA-M 820-3 (Februar 2026), gedruckte S. 3 (PDF-Seite 5):
--   "... von der Bedarfsplanung (LPH 0) bis zur Objektbetreuung (LPH 9),
--    inklusive Inbetriebnahme und Übergabe an den Betrieb."
-- (No richer AHO LPH-0 breakdown is printed in any local source — see residue.)
-- Multiple phases can be in scope => checklist.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'json',
  enum_values = '[
    {"value":"lph_0","label_de":"LPH 0 — Bedarfsplanung","label_en":null,"order_index":1,"regulation_reference":"DWA-M 820-3 S. 3"},
    {"value":"lph_1","label_de":"LPH 1 — Grundlagenermittlung","label_en":null,"order_index":2,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_2","label_de":"LPH 2 — Vorplanung","label_en":null,"order_index":3,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_3","label_de":"LPH 3 — Entwurfsplanung","label_en":null,"order_index":4,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_4","label_de":"LPH 4 — Genehmigungsplanung","label_en":null,"order_index":5,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_5","label_de":"LPH 5 — Ausführungsplanung","label_en":null,"order_index":6,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_6","label_de":"LPH 6 — Vorbereitung der Vergabe","label_en":null,"order_index":7,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_7","label_de":"LPH 7 — Mitwirkung bei der Vergabe","label_en":null,"order_index":8,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_8","label_de":"LPH 8 — Bauoberleitung","label_en":null,"order_index":9,"regulation_reference":"HOAI 2021 § 43 Abs. 1"},
    {"value":"lph_9","label_de":"LPH 9 — Objektbetreuung","label_en":null,"order_index":10,"regulation_reference":"HOAI 2021 § 43 Abs. 1"}
  ]'::jsonb
WHERE id = '9940ec2a-d4fe-4dd7-a9c4-c4d05fee10c4'
  AND symbol = 'applicable_lph' AND data_type = 'text';

-- ----------------------------------------------------------------------------
-- 5) DWA-A-272E · A272E-13 (Definition der Bewertungskriterien) · criteria_social
-- Source: DWA-A 272E (June 2014), Table 6 "Criteria list for the assessment of
-- sanitation systems", section "4 Social objectives" on the "Table 6 (End)"
-- page, printed p. 24 (source is the official English edition — label_en
-- verbatim, label_de not printed => null). Verbatim rows (sub-objective —
-- criterion; the doubled ")" in "cf. 5a))" is printed like that):
--   a) Acceptance:
--      "end-user convenience/well-being (ease of operation and handling)"
--      "perceived safety (also in case of disasters, extreme events; cf. 5a)"
--   b) Creation of qualified jobs:
--      "number of jobs created (international competitiveness; cf. 5a))"
--   c) Creation of environmental awareness:
--      "environmentally aware approach to water, energy, resources"
-- Several criteria may be selected for an assessment => checklist.
-- ----------------------------------------------------------------------------
UPDATE fields SET
  data_type = 'json',
  enum_values = '[
    {"value":"acceptance_end_user_convenience","label_de":null,"label_en":"Acceptance — end-user convenience/well-being (ease of operation and handling)","order_index":1,"regulation_reference":"Table 6, 4a"},
    {"value":"acceptance_perceived_safety","label_de":null,"label_en":"Acceptance — perceived safety (also in case of disasters, extreme events; cf. 5a)","order_index":2,"regulation_reference":"Table 6, 4a"},
    {"value":"qualified_jobs_number_created","label_de":null,"label_en":"Creation of qualified jobs — number of jobs created (international competitiveness; cf. 5a))","order_index":3,"regulation_reference":"Table 6, 4b"},
    {"value":"environmental_awareness_approach","label_de":null,"label_en":"Creation of environmental awareness — environmentally aware approach to water, energy, resources","order_index":4,"regulation_reference":"Table 6, 4c"}
  ]'::jsonb
WHERE id = 'd21b12b4-3238-4db1-a973-780a502fec22'
  AND symbol = 'criteria_social' AND data_type = 'text';

COMMIT;

-- Post-apply verification (read-only):
-- SELECT f.symbol, f.data_type, jsonb_array_length(f.enum_values) AS n_options
-- FROM fields f WHERE f.id IN (
--   '3c207bbb-8024-42e8-9cf3-060d624d1318',
--   '3f842ab6-fb0f-4578-ad7c-666c8f18f279',
--   '294b6b7d-1008-4294-8b2f-0f7d89ea110f',
--   '9940ec2a-d4fe-4dd7-a9c4-c4d05fee10c4',
--   'd21b12b4-3238-4db1-a973-780a502fec22');
-- Expected: all data_type='json'; n_options = 9, 5, 10, 10, 4.
