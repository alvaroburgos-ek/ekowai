-- DWA-A 138-1 · iteration fields (readiness presentation item, 2026-10-05): the governing (r_D(n), D) pair of the
-- swale (Gl. 14 sweep) and of the trench (Gl. 23 sweep; Gl. 29/32 inside a Mulden-Rigolen facility) as the sheets'
-- OWN fields, so the Gl. 14/16 and Gl. 19/23/28/29/32 cards read them (equation-profiles aliases) instead of
-- reporting "Fehlt: r_D_n, D". The server facility_volume branch writes them (commit of 2026-10-05); the design
-- windows already showed the same numbers. A138-18 r_D_n_used_R exists (engineer-typed so far) and becomes server-
-- written like the others.
-- Source: §6.3.2 Z.1743 "Das erforderliche Speichervolumen der Mulde erhält man durch die iterative Anwendung der
-- Gl. (14) für unterschiedliche Dauerstufen D und jeweils zugehöriger Regenspende r_D(n)." and §6.4.2 Z.1849 "Die
-- erforderliche Länge L_R erhält man durch die iterative Anwendung der Gl. (23) für unterschiedliche Dauerstufen D".
-- SAFETY: additive, all new fields optional and derived; no gate, value or severity change. Idempotent.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005100000_a138_iteration_fields.sql
-- Rollback: scripts/migrations/rollback-20261005100000_a138_iteration_fields.sql
BEGIN;

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'r_D_n_used_M', 'Maßgebende Regenspende r_D(n) der Mulde', 'Governing rainfall intensity r_D(n) of the swale', 'number', 'l/(s·ha)', false, '§6.3.2 Gl. 14',
  'Regenspende der maßgebenden Dauerstufe des Gl.-14-Durchlaufs (Bemessungshäufigkeit der Mulde n_M); die Gl.-14/16-Karten rechnen mit diesem Wert. Serverseitig gesetzt.',
  'verified_against_standard', 'Das erforderliche Speichervolumen der Mulde erhält man durch die iterative Anwendung der Gl. (14) für unterschiedliche Dauerstufen D und jeweils zugehöriger Regenspende r_D(n).', 'DWA-A 138-1 §6.3.2 Z.1743', 'derived', NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'r_D_n_used_M') AND w.code = 'A138-17' AND s.code = 'DWA-A-138-1';

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'D_used_M', 'Maßgebende Dauerstufe D der Mulde', 'Governing duration D of the swale', 'number', 'min', false, '§6.3.2 Gl. 14',
  'Dauerstufe, bei der Gl. 14 das größte erforderliche Speichervolumen liefert (Maximum über die KOSTRA-Dauerstufen). Serverseitig gesetzt.',
  'verified_against_standard', 'Das erforderliche Speichervolumen der Mulde erhält man durch die iterative Anwendung der Gl. (14) für unterschiedliche Dauerstufen D und jeweils zugehöriger Regenspende r_D(n).', 'DWA-A 138-1 §6.3.2 Z.1743', 'derived', NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'D_used_M') AND w.code = 'A138-17' AND s.code = 'DWA-A-138-1';

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'D_used_R', 'Maßgebende Dauerstufe D der Rigole', 'Governing duration D of the trench', 'number', 'min', false, '§6.4.2 Gl. 23',
  'Dauerstufe, bei der die erforderliche Rigolenlänge am größten ist: Gl. 23 (Rigole), Gl. 29 (Rigole eines Mulden-Rigolen-Elements) bzw. Gl. 32 (Mulden-Rigolen-System, mit Drossel) — auf der Bemessungshäufigkeit der Rigole. Serverseitig gesetzt; die Gl.-19/23/28/29/32-Karten rechnen mit diesem Wert.',
  'verified_against_standard', 'Die erforderliche Länge L_R erhält man durch die iterative Anwendung der Gl. (23) für unterschiedliche Dauerstufen D und jeweils zugehörigen Regenspenden r_D(n).', 'DWA-A 138-1 §6.4.2 Z.1849 + §6.5.2 Z.1955 + §6.6.2 Z.2055', 'derived', NULL, NULL, NULL, NULL, ARRAY['A138-19','A138-20']::text[], (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'D_used_R') AND w.code = 'A138-18' AND s.code = 'DWA-A-138-1';

-- r_D_n_used_R: now server-written (governing r_D of the trench sweep) and inherited by the composite sheets.
UPDATE fields f SET widget = 'derived',
  description = 'Regenspende der maßgebenden Dauerstufe des Rigolen-Durchlaufs (Gl. 23; Gl. 29/32 im Mulden-Rigolen-Element/-System) auf der Bemessungshäufigkeit der Rigole. Serverseitig gesetzt; die Gl.-19/23/28/29/32-Karten rechnen mit diesem Wert.',
  consumer_worksheets = CASE WHEN f.consumer_worksheets IS NULL THEN ARRAY['A138-19','A138-20']::text[] ELSE f.consumer_worksheets || ARRAY['A138-19','A138-20']::text[] END
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND w.code = 'A138-18' AND s.code = 'DWA-A-138-1' AND f.symbol = 'r_D_n_used_R' AND NOT ('A138-20' = ANY (COALESCE(f.consumer_worksheets, ARRAY[]::text[])));

COMMIT;
