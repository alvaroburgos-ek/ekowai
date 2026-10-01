-- DWA-A 138-1 · Mulden-Rigolen facilities — three items the readiness run (2026-09-30) parked as "owner rulings" and
-- the printed text settles (re-read 2026-10-01, transcript DWA-A_138-1_WD (5).md, line numbers = Z.):
--   (1) Mulden-Rigolen-System storage volume: §6.6.2 Z.2023 "Die Bemessung von Mulden-Rigolen-Systemen als Einzelelement
--       erfolgt im Einfachen Verfahren analog zur Bemessung von Mulden-Rigolen-Elementen (siehe 6.5.2)." → V_MR = V_M + V_R
--       (Gl. 26). V_MÜ (Gl. 30) is the swale OVERFLOW volume that sizes the overflow outlet Q_MÜ (Gl. 31) — never the storage.
--       A138-20 had no V_MR field → added, with Gl. 26 applied to the system.
--   (2) Two infiltration rates in a composite facility: §6.5.2 Z.1909 "Bei der Muldenbemessung ist die Infiltrationsrate der
--       bewachsenen Bodenzone und bei der Bemessung der Rigole die Infiltrationsrate des anstehenden Bodens bemessungsrelevant."
--       and Z.1925 "Die maßgebliche Bodenschicht der Mulde für die Bestimmung der bemessungsrelevanten Infiltrationsrate k_i ist
--       die bewachsene Bodenzone." §5.3.3.6 Z.1395 gives k_f,BBZ 1·10⁻⁵–5·10⁻⁵ m/s (f_Methode neglected) when 5.2.3.2 + Bild 1
--       hold. → k_f_BBZ / k_f_BBZ_quelle / k_i_BBZ on A138-19 and A138-20; k_i_Mulde on A138-17 (the value Gl. 14/16 read).
--   (3) Swale required vs available volume: §6.3.2 Gl. 14 (Z.1681) = required, Gl. 15 (Z.1717 "näherungsweise") = the chosen
--       geometry. The sizing itself is "available ≥ required" → V_M_erf on A138-17 + gate A138-REQ-34 (block).
-- All quotes were read in-session from the transcript (VA; the transcript was verified against the printed PDF 2026-09-29).
-- SAFETY: additive. New input fields are optional; the derived fields are server-materialised (worksheet.ts facility_volume
-- branch, commit of 2026-10-01) and skipped while absent. The ONE enforcement change is the new gate A138-REQ-34 — your apply
-- ratifies it. Idempotent (NOT EXISTS / ON CONFLICT DO NOTHING).
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261001100000_a138_mulden_rigolen_guideline_settled.sql
-- Rollback: scripts/migrations/rollback-20261001100000_a138_mulden_rigolen_guideline_settled.sql
BEGIN;

-- ───────────────────────── (2) A138-19 · Mulden-Rigolen-Element: vegetated soil zone ─────────────────────────
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'k_f_BBZ', 'Wasserdurchlässigkeit der bewachsenen Bodenzone k_f,BBZ', 'Permeability of the vegetated soil zone k_f,BBZ', 'number', 'm/s', false, '§5.3.3.6 / §6.5.2',
  'Für die MULDE des Mulden-Rigolen-Elements ist die bewachsene Bodenzone die maßgebliche Bodenschicht (§6.5.2); die Rigole versickert mit dem k_i des anstehenden Bodens (A138-11). Erfüllt der Boden der bewachsenen Bodenzone 5.2.3.2 und liegt die Körnung im Bereich nach Bild 1, darf k_f,BBZ mit 1·10⁻⁵ bis 5·10⁻⁵ m/s angesetzt werden (Wert innerhalb des Bereichs wählen und unter Quelle „Bereich nach 5.3.3.6“ kennzeichnen — dann entfällt f_Methode); sonst gemessener Wert (f_Methode nach Tab. 11 gilt). Leer = die Mulde rechnet mit dem Projekt-k_i.',
  'verified_against_standard', 'Erfüllt der Boden der bewachsenen Bodenzone die Anforderungen nach 5.2.3.2 und liegt die Korngrößenverteilung in dem maßgeblichen Bereich nach Bild 1, kann der k_f-Wert für die bewachsene Bodenzone mit 1·10⁻⁵ bis 5·10⁻⁵ m/s angesetzt werden; der Korrekturfaktor für die Bestimmungsmethode Wasserdurchlässigkeit f_Methode nach Tabelle 11 ist in diesem Fall zu vernachlässigen.', 'DWA-A 138-1 §5.3.3.6 Z.1395 + §6.5.2 Z.1909/Z.1925', 'scalar', NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'k_f_BBZ') AND w.code = 'A138-19' AND s.code = 'DWA-A-138-1';

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'k_f_BBZ_quelle', 'Herkunft von k_f,BBZ', 'Source of k_f,BBZ', 'enum', NULL, false, '§5.3.3.6',
  'Bestimmt, welcher Korrekturfaktor auf k_f,BBZ wirkt: Bereich nach 5.3.3.6 → nur f_Ort (f_Methode entfällt); gemessen → f_K = f_Ort·f_Methode (Gl. 6).',
  'verified_against_standard', 'der Korrekturfaktor für die Bestimmungsmethode Wasserdurchlässigkeit f_Methode nach Tabelle 11 ist in diesem Fall zu vernachlässigen.', 'DWA-A 138-1 §5.3.3.6 Z.1395', 'select_one', NULL, NULL, NULL,
  '[{"value":"bild1_bereich","label_de":"Bereich nach 5.3.3.6 (1·10⁻⁵ bis 5·10⁻⁵ m/s) — f_Methode entfällt","label_en":"Printed range per 5.3.3.6 (1·10⁻⁵ to 5·10⁻⁵ m/s) — f_Methode neglected","order_index":1,"regulation_reference":"§5.3.3.6"},{"value":"gemessen","label_de":"gemessen — f_Methode nach Tab. 11 gilt (f_K)","label_en":"measured — f_Methode per Tab. 11 applies (f_K)","order_index":2,"regulation_reference":"§5.3.3.6 / Tab. 11"}]'::jsonb,
  (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'k_f_BBZ_quelle') AND w.code = 'A138-19' AND s.code = 'DWA-A-138-1';

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'k_i_BBZ', 'Bemessungsrelevante Infiltrationsrate der Mulde k_i,BBZ', 'Design infiltration rate of the swale k_i,BBZ', 'number', 'm/s', false, '§5.3.3.6 / §6.5.2',
  'k_i,BBZ = k_f,BBZ · f_Ort (Bereich nach 5.3.3.6) bzw. k_f,BBZ · f_K (gemessen). Serverseitig berechnet und auf A138-17 als k_i_Mulde übernommen: die Mulde dieses Elements rechnet Gl. 14/16 und den Muldenüberlauf (Gl. 30/31) damit; die Rigole (Gl. 28/29/32) rechnet mit dem Projekt-k_i des anstehenden Bodens.',
  'verified_against_standard', 'Die maßgebliche Bodenschicht der Mulde für die Bestimmung der bemessungsrelevanten Infiltrationsrate k_i ist die bewachsene Bodenzone.', 'DWA-A 138-1 §6.5.2 Z.1925 + §5.3.3.6 Z.1395', 'derived', NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'k_i_BBZ') AND w.code = 'A138-19' AND s.code = 'DWA-A-138-1';

INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT '5c1b7a9e-3d2f-4e8a-9b61-a13819000b01'::uuid, w.id, 'A138-19-D1', 'k_i_BBZ = k_f_BBZ * if(k_f_BBZ_quelle == ''bild1_bereich'', f_ort, f_K)', ARRAY['k_f_BBZ','k_f_BBZ_quelle','f_ort','f_K']::text[], 'k_i_BBZ', 'm/s', '§5.3.3.6 / Gl. 5–6',
  'Gl. 5/6 auf die bewachsene Bodenzone angewandt; im Bereichsfall nach 5.3.3.6 entfällt f_Methode (Faktor = f_Ort). Anzeige-Gleichung — der Server schreibt k_i_BBZ.',
  'verified_against_standard', 'der Korrekturfaktor für die Bestimmungsmethode Wasserdurchlässigkeit f_Methode nach Tabelle 11 ist in diesem Fall zu vernachlässigen.'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = 'A138-19' AND s.code = 'DWA-A-138-1'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

-- ───────────────────────── (1)+(2) A138-20 · Mulden-Rigolen-System ─────────────────────────
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'V_MR', 'Gesamtspeichervolumen MRS V_MR', 'Total storage volume MRS V_MR', 'number', 'm³', true, '§6.6.2 / §6.5.2 Gl. 26',
  'Speichervolumen des Mulden-Rigolen-Systems: V_MR = V_M (Mulde, A138-17) + V_R (Rigole, A138-18) — das System wird „analog zur Bemessung von Mulden-Rigolen-Elementen (siehe 6.5.2)“ bemessen; nur die Rigolenlänge nach Gl. 32 berücksichtigt zusätzlich den Drosselabfluss Q_Dr. V_MÜ (Gl. 30) ist das ÜBERLAUFVOLUMEN der Mulde für die Bemessung des Muldenüberlaufs (Q_MÜ, Gl. 31) und kein Speichervolumen. Serverseitig berechnet; wird in die Anlagen-Zusammenfassung (A138-23) übernommen.',
  'verified_against_standard', 'Die Bemessung von Mulden-Rigolen-Systemen als Einzelelement erfolgt im Einfachen Verfahren anlog zur Bemessung von Mulden-Rigolen-Elementen (siehe 6.5.2).', 'DWA-A 138-1 §6.6.2 Z.2023 + §6.5.2 Gl. 26', 'derived', NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'V_MR') AND w.code = 'A138-20' AND s.code = 'DWA-A-138-1';

INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT '5c1b7a9e-3d2f-4e8a-9b61-a13820000026'::uuid, w.id, '26', 'V_MR = V_M + V_R', ARRAY['V_M','V_R']::text[], 'V_MR', 'm³', '§6.6.2 / §6.5.2',
  'Gl. 26 auf das Mulden-Rigolen-System angewandt (§6.6.2: Bemessung analog 6.5.2). Anzeige-Gleichung — der Server schreibt V_MR.',
  'verified_against_standard', 'Die Bemessung von Mulden-Rigolen-Systemen als Einzelelement erfolgt im Einfachen Verfahren anlog zur Bemessung von Mulden-Rigolen-Elementen (siehe 6.5.2).'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = 'A138-20' AND s.code = 'DWA-A-138-1'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'k_f_BBZ', 'Wasserdurchlässigkeit der bewachsenen Bodenzone k_f,BBZ', 'Permeability of the vegetated soil zone k_f,BBZ', 'number', 'm/s', false, '§5.3.3.6 / §6.5.2',
  'Für die MULDE des Mulden-Rigolen-Systems ist die bewachsene Bodenzone die maßgebliche Bodenschicht (§6.6.2 → §6.5.2); die Rigole versickert mit dem k_i des anstehenden Bodens (A138-11). Erfüllt der Boden der bewachsenen Bodenzone 5.2.3.2 und liegt die Körnung im Bereich nach Bild 1, darf k_f,BBZ mit 1·10⁻⁵ bis 5·10⁻⁵ m/s angesetzt werden (Wert innerhalb des Bereichs wählen und unter Quelle „Bereich nach 5.3.3.6“ kennzeichnen — dann entfällt f_Methode); sonst gemessener Wert (f_Methode nach Tab. 11 gilt). Leer = die Mulde rechnet mit dem Projekt-k_i.',
  'verified_against_standard', 'Erfüllt der Boden der bewachsenen Bodenzone die Anforderungen nach 5.2.3.2 und liegt die Korngrößenverteilung in dem maßgeblichen Bereich nach Bild 1, kann der k_f-Wert für die bewachsene Bodenzone mit 1·10⁻⁵ bis 5·10⁻⁵ m/s angesetzt werden; der Korrekturfaktor für die Bestimmungsmethode Wasserdurchlässigkeit f_Methode nach Tabelle 11 ist in diesem Fall zu vernachlässigen.', 'DWA-A 138-1 §5.3.3.6 Z.1395 + §6.5.2 Z.1909/Z.1925 + §6.6.2 Z.2023', 'scalar', NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'k_f_BBZ') AND w.code = 'A138-20' AND s.code = 'DWA-A-138-1';

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'k_f_BBZ_quelle', 'Herkunft von k_f,BBZ', 'Source of k_f,BBZ', 'enum', NULL, false, '§5.3.3.6',
  'Bestimmt, welcher Korrekturfaktor auf k_f,BBZ wirkt: Bereich nach 5.3.3.6 → nur f_Ort (f_Methode entfällt); gemessen → f_K = f_Ort·f_Methode (Gl. 6).',
  'verified_against_standard', 'der Korrekturfaktor für die Bestimmungsmethode Wasserdurchlässigkeit f_Methode nach Tabelle 11 ist in diesem Fall zu vernachlässigen.', 'DWA-A 138-1 §5.3.3.6 Z.1395', 'select_one', NULL, NULL, NULL,
  '[{"value":"bild1_bereich","label_de":"Bereich nach 5.3.3.6 (1·10⁻⁵ bis 5·10⁻⁵ m/s) — f_Methode entfällt","label_en":"Printed range per 5.3.3.6 (1·10⁻⁵ to 5·10⁻⁵ m/s) — f_Methode neglected","order_index":1,"regulation_reference":"§5.3.3.6"},{"value":"gemessen","label_de":"gemessen — f_Methode nach Tab. 11 gilt (f_K)","label_en":"measured — f_Methode per Tab. 11 applies (f_K)","order_index":2,"regulation_reference":"§5.3.3.6 / Tab. 11"}]'::jsonb,
  (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'k_f_BBZ_quelle') AND w.code = 'A138-20' AND s.code = 'DWA-A-138-1';

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'k_i_BBZ', 'Bemessungsrelevante Infiltrationsrate der Mulde k_i,BBZ', 'Design infiltration rate of the swale k_i,BBZ', 'number', 'm/s', false, '§5.3.3.6 / §6.5.2',
  'k_i,BBZ = k_f,BBZ · f_Ort (Bereich nach 5.3.3.6) bzw. k_f,BBZ · f_K (gemessen). Serverseitig berechnet und auf A138-17 als k_i_Mulde übernommen: die Mulde dieses Systems rechnet Gl. 14/16 und den Muldenüberlauf (Gl. 30/31) damit; die Rigole (Gl. 32) rechnet mit dem Projekt-k_i des anstehenden Bodens.',
  'verified_against_standard', 'Die maßgebliche Bodenschicht der Mulde für die Bestimmung der bemessungsrelevanten Infiltrationsrate k_i ist die bewachsene Bodenzone.', 'DWA-A 138-1 §6.5.2 Z.1925 + §5.3.3.6 Z.1395', 'derived', NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'k_i_BBZ') AND w.code = 'A138-20' AND s.code = 'DWA-A-138-1';

INSERT INTO equations (id, worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT '5c1b7a9e-3d2f-4e8a-9b61-a13820000b01'::uuid, w.id, 'A138-20-D1', 'k_i_BBZ = k_f_BBZ * if(k_f_BBZ_quelle == ''bild1_bereich'', f_ort, f_K)', ARRAY['k_f_BBZ','k_f_BBZ_quelle','f_ort','f_K']::text[], 'k_i_BBZ', 'm/s', '§5.3.3.6 / Gl. 5–6',
  'Gl. 5/6 auf die bewachsene Bodenzone angewandt; im Bereichsfall nach 5.3.3.6 entfällt f_Methode (Faktor = f_Ort). Anzeige-Gleichung — der Server schreibt k_i_BBZ.',
  'verified_against_standard', 'der Korrekturfaktor für die Bestimmungsmethode Wasserdurchlässigkeit f_Methode nach Tabelle 11 ist in diesem Fall zu vernachlässigen.'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = 'A138-20' AND s.code = 'DWA-A-138-1'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

-- V_MÜ: say on the sheet what it is for (the stored formula/quote stay as they are).
UPDATE fields f SET description = 'V_MÜ = [(A_C + A_VA) · r_D(n_R) · 10⁻⁷ − A_S,m · k_i] · D · 60 · f_Z − V_M per Gl. 30 (iterate D). ÜBERLAUFVOLUMEN der Mulde auf der Regenspende der Rigolen-Häufigkeit n_R mit dem k_i der bewachsenen Bodenzone: die kleinste Dauerstufe mit V_MÜ > 0 liefert r_MÜ und damit den Bemessungsabfluss des Muldenüberlaufs Q_MÜ (Gl. 31). Kein Speichervolumen — das Speichervolumen des Systems ist V_MR (Gl. 26). Serverseitig berechnet; V_MÜ ≤ 0 = die Mulde läuft bei n_R nicht über (r_MÜ = Q_MÜ = 0).'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.worksheet_template_id = w.id AND w.code = 'A138-20' AND s.code = 'DWA-A-138-1' AND f.symbol = 'V_MUE' AND f.description = 'V_MÜ = [(A_C + A_VA) · r_D(n_R) · 10⁻⁷ − A_S,m · k_i] · D · 60 · f_Z − V_M per Gl. 30 (iterate D).';

-- f_Ort (A138-08) and f_K (A138-11) flow into the composite sheets so the k_i,BBZ card can show its inputs.
UPDATE fields f SET consumer_worksheets = f.consumer_worksheets || ARRAY['A138-19','A138-20']
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-A-138-1' AND ((w.code = 'A138-08' AND f.symbol = 'f_ort') OR (w.code = 'A138-11' AND f.symbol = 'f_K')) AND NOT ('A138-20' = ANY (f.consumer_worksheets));

-- ───────────────────────── (2)+(3) A138-17 · Versickerungsmulde ─────────────────────────
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'k_i_Mulde', 'Bemessungsrelevante Infiltrationsrate der Mulde k_i', 'Design infiltration rate of the swale k_i', 'number', 'm/s', false, '§6.3.2 / §6.5.2',
  'Der k_i, mit dem diese Mulde in Gl. 14 und Gl. 16 rechnet. Eigenständige Versickerungsmulde: k_i der maßgeblichen Bodenschicht nach A138-05/A138-11 (die bewachsene Bodenzone ist dabei zu berücksichtigen, §6.3.2). Mulde eines Mulden-Rigolen-Elements/-Systems: k_i,BBZ der bewachsenen Bodenzone (A138-19/A138-20), weil die Rigole mit dem anstehenden Boden rechnet (§6.5.2). Serverseitig gesetzt.',
  'verified_against_standard', 'Bei der Muldenbemessung ist die Infiltrationsrate der bewachsenen Bodenzone und bei der Bemessung der Rigole die Infiltrationsrate des anstehenden Bodens bemessungsrelevant.', 'DWA-A 138-1 §6.5.2 Z.1909 + §6.3.2 Z.1698', 'derived', NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'k_i_Mulde') AND w.code = 'A138-17' AND s.code = 'DWA-A-138-1';

INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'D'), 'V_M_erf', 'Erforderliches Speichervolumen V_M,erf (Gl. 14)', 'Required storage volume V_M,req (Eq. 14)', 'number', 'm³', false, '§6.3.2 Gl. 14',
  'Erforderliches Speichervolumen aus der Zufluss-Versickerungs-Bilanz, Maximum über die Dauerstufen der Mulden-Bemessungshäufigkeit n_M (mit A_VA der Mulde, sonst A_VA des Projekts, sonst A_VA = A_S,m; k_i = k_i_Mulde). Das Feld V_M (Gl. 15 = A_S,m · h_M mit der gewählten Einstauhöhe) ist das VORHANDENE Volumen; die Mulde ist bemessen, wenn V_M ≥ V_M,erf (Prüfung A138-REQ-34). Serverseitig berechnet.',
  'verified_against_standard', 'V_M = [(AC + A_VA) · 10⁻⁷ · r_D(n) − A_S,m · k_i] · D · 60 · f_Z (14) — Als Alternative zur Bemessung nach Gl. (14) kann unter Vorgabe der Einstauhöhe h_M der erforderliche Flächenbedarf für die Versickerungsmulde abgeschätzt werden. Das erforderliche Speichervolumen ist näherungsweise mit Gl. (15) zu berechnen', 'DWA-A 138-1 §6.3.2 Gl. 14 Z.1681 + Z.1717', 'derived', NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'V_M_erf') AND w.code = 'A138-17' AND s.code = 'DWA-A-138-1';

-- (3) the sizing check itself. `pending` while V_M_erf is not yet materialised (never a false block).
INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, title_en, condition, clause_reference, severity, description, source_quote, requires_attestation)
SELECT w.id, 'A138-REQ-34', 'Mulde: vorhandenes Speichervolumen V_M (Gl. 15) ≥ erforderliches Speichervolumen V_M,erf (Gl. 14)', 'Swale: available storage V_M (Eq. 15) ≥ required storage V_M,req (Eq. 14)', 'V_M >= V_M_erf', '§6.3.2 Gl. 14/15', 'block',
  'Guideline-settled 2026-10-01: Gl. 14 liefert das erforderliche, Gl. 15 (gewählte Einstauhöhe) das vorhandene Volumen; die Bemessung ist erfüllt, wenn das vorhandene Volumen das erforderliche deckt. Hebel: Sohlenfläche A_S,m oder Einstauhöhe h_M (≤ 30 cm, Tab. 14) vergrößern.',
  'V_M = [(AC + A_VA) · 10⁻⁷ · r_D(n) − A_S,m · k_i] · D · 60 · f_Z (14); Das erforderliche Speichervolumen ist näherungsweise mit Gl. (15) zu berechnen: V_M = A_S,m · h_M (15)', false
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = 'A138-17' AND s.code = 'DWA-A-138-1'
ON CONFLICT (worksheet_template_id, code) DO NOTHING;

COMMIT;
