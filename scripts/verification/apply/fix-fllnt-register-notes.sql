-- FLL-Naturteich · FLLNT-08 equipment register + FLLNT-12 plant register: the seeded ui_config.note claims the source is
-- "derzeit nicht in der Bibliothek". FLL-Naturteich has been seeded since 2026-09-25 (11 regulation tables). The truthful
-- statement is that the guideline prints no list of equipment elements / species, so the column stays free text.
-- Source-settled wording fix (no value, gate or structure change). Same strings as the code fallback in src/lib/eval/selection-fields.ts.
-- Apply: node scripts/apply-migration.mjs scripts/verification/apply/fix-fllnt-register-notes.sql
-- Read-back: select w.code, f.symbol, f.ui_config->>'note' from fields f join worksheet_templates w on w.id=f.worksheet_template_id join standards s on s.id=w.standard_id where s.code='FLL-Naturteich' and f.symbol in ('equipment_elements_list','plant_species_list');
BEGIN;
UPDATE fields f SET ui_config = jsonb_set(f.ui_config, '{note}', to_jsonb('Die Richtlinie druckt keine Liste der Ausstattungselemente — Auswahlliste nicht vorbelegt (nicht erfunden). Freitext.'::text))
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND f.symbol = 'equipment_elements_list' AND f.ui_config->>'note' LIKE 'Quelle FLL-Naturteich derzeit nicht in der Bibliothek%';
UPDATE fields f SET ui_config = jsonb_set(f.ui_config, '{note}', to_jsonb('Die Richtlinie druckt keine Zonen-/Artenliste — Auswahlliste nicht vorbelegt (nicht erfunden). Freitext.'::text))
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND f.symbol = 'plant_species_list' AND f.ui_config->>'note' LIKE 'Quelle FLL-Naturteich derzeit nicht in der Bibliothek%';
COMMIT;
-- Rollback (run separately): set the note back to 'Quelle FLL-Naturteich derzeit nicht in der Bibliothek — Auswahllisten nicht vorbelegt (nicht erfunden). Freitext.' /
-- '… — Zonen-/Artenlisten nicht vorbelegt (nicht erfunden). Freitext.' for the two symbols above.
