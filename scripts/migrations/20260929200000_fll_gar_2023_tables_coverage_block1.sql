-- FLL-GAR-2023 · coverage wave block 1 (2026-09-29): the twelve printed tables that had no table_code.
-- Expected after apply: 12 tables · 143 rows (TAB2 5 · TAB9 3 · TAB10 3 · TAB11 6 · TAB14 2 · TAB15 11 · TAB17 6 · TAB19 14 · TAB20 13 · TAB21 47 · TAB23 3 · TAB29 30).
-- VA pass 2026-09-29 (second read of every page after drafting): Tab. 21 row 34 added, printed row numbers restored in Tab. 21/29 quotes, footnotes verbatim.
-- Source: rendered PDF `C:\Users\Ekowai\Desktop\FLL Guidelines PDF\fll_gewaesserabdichtungsrichtlinien_2023__2 (2).pdf`,
-- every page read as an image on 2026-09-29 (VA). page_ref = printed page number. Values transcribed as printed;
-- nothing interpreted, no defaults, no gates. Text-only tables (Tab. 11, 17, 19, 20, 21, 29) are reference lists —
-- they exist so the tool can OFFER the printed designations as selections (SR-1) instead of free text.
-- Format mirrors scripts/regulation-tables/emit-seed-sql.ts (upsert on (standard_code, edition, table_code) / (table_id, row_key)).
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20260929200000_fll_gar_2023_tables_coverage_block1.sql
-- Rollback: scripts/migrations/rollback-20260929200000_fll_gar_2023_tables_coverage_block1.sql
BEGIN;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 2 · Richtwerte zur Wasserdurchlässigkeit von mineralischen Stoffen ohne/mit Zusatzstoffen und als Verbundwerkstoff (§5, printed p. 36)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB2', 'Richtwerte zur Wasserdurchlässigkeit von mineralischen Stoffen ohne/mit Zusatzstoffen und als Verbundwerkstoff (Tab. 2)', '§5, Tab. 2', '36',
  ARRAY['zeile']::text[],
  '[{"name":"durchlaessigkeit","type":"string"},{"name":"stoffart","type":"string"},{"name":"kf_max_m_s","type":"number","unit":"m/s"},{"name":"kf_min_m_s","type":"number","unit":"m/s"},{"name":"q_max_m3_a_m2","type":"number","unit":"m³/(a·m²)"},{"name":"q_min_m3_a_m2","type":"number","unit":"m³/(a·m²)"},{"name":"verlust_max_m3_a_1000m2","type":"number","unit":"m³/a je 1.000 m²"},{"name":"verlust_min_m3_a_1000m2","type":"number","unit":"m³/a je 1.000 m²"},{"name":"verlust_max_l_d_1000m2","type":"number","unit":"l/d je 1.000 m²"},{"name":"verlust_min_l_d_1000m2","type":"number","unit":"l/d je 1.000 m²"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', '¹ Bei optimaler Dosierung des Zusatzstoffes (Mischungsverhältnis) und in Abhängigkeit von der Qualität der Ausgangsstoffe. — Konventionelle Geosynthetische Tondichtungsbahnen (GTD) werden in Tabelle 2 aufgrund ihrer - im Vergleich zu erdbautechnisch hergestellten mineralischen Dichtungen - geringeren Dichte nicht anhand des kf-Wertes zugeordnet.', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'z2', '{"zeile":"z2"}'::jsonb, 'durchlässig bis schwach durchlässig', 'natürlich vorkommende Böden (z. B. rohe Tone, Grubentone, Lehme)', 0,
 '{"durchlaessigkeit":"durchlässig bis schwach durchlässig","stoffart":"natürlich vorkommende Böden (z. B. rohe Tone, Grubentone, Lehme)","kf_max_m_s":1e-6,"kf_min_m_s":1e-7,"q_max_m3_a_m2":946.0,"q_min_m3_a_m2":94.6,"verlust_max_m3_a_1000m2":946000.0,"verlust_min_m3_a_1000m2":94600.0,"verlust_max_l_d_1000m2":2591780,"verlust_min_l_d_1000m2":259178,"gedruckt":"1 * 10⁻⁶ bis 1 * 10⁻⁷ | 946,00 bis 94,60 | 946.000,00 bis 94.600,00 | 2.591.780 bis 259.178"}'::jsonb,
 '2 durchlässig bis schwach durchlässig natürlich vorkommende Böden (z. B. rohe Tone, Grubentone, Lehme) 1 * 10-6 bis 1 * 10-7 946,00 bis 94,60 946.000,00 bis 94.600,00 2.591.780 bis 259.178'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB2'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'z3', '{"zeile":"z3"}'::jsonb, 'durchlässig bis schwach durchlässig', 'natürlich vorkommende Böden (z. B. homogenisierte Tone, Grubentone, Lehm); natürlich vorkommende Mineralböden mit natürlichen/synthetischen Zusatzstoffen (z. B. Bentonit/Tonmehl/Kunststoff) ¹', 1,
 '{"durchlaessigkeit":"durchlässig bis schwach durchlässig","stoffart":"natürlich vorkommende Böden (z. B. homogenisierte Tone, Grubentone, Lehm); natürlich vorkommende Mineralböden mit natürlichen/synthetischen Zusatzstoffen (z. B. Bentonit/Tonmehl/Kunststoff) ¹","kf_max_m_s":1e-8,"kf_min_m_s":1e-8,"q_max_m3_a_m2":9.5,"q_min_m3_a_m2":9.5,"verlust_max_m3_a_1000m2":9500.0,"verlust_min_m3_a_1000m2":9500.0,"verlust_max_l_d_1000m2":26027,"verlust_min_l_d_1000m2":26027,"gedruckt":"1 * 10⁻⁸ | 9,50 | 9.500,00 | 26.027"}'::jsonb,
 '3 durchlässig bis schwach durchlässig … 1 * 10-8 9,50 9.500,00 26.027'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB2'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'z4', '{"zeile":"z4"}'::jsonb, 'sehr schwach durchlässig', 'natürlich vorkommende Böden (z. B. homogenisierte Tone, Grubentone, Lehm); natürlich vorkommende Mineralböden mit natürlichen/synthetischen Zusatzstoffen (z. B. Bentonit/Tonmehl/Kunststoff) ¹', 2,
 '{"durchlaessigkeit":"sehr schwach durchlässig","stoffart":"natürlich vorkommende Böden (z. B. homogenisierte Tone, Grubentone, Lehm); natürlich vorkommende Mineralböden mit natürlichen/synthetischen Zusatzstoffen (z. B. Bentonit/Tonmehl/Kunststoff) ¹","kf_max_m_s":1e-9,"kf_min_m_s":1e-9,"q_max_m3_a_m2":0.95,"q_min_m3_a_m2":0.95,"verlust_max_m3_a_1000m2":950.0,"verlust_min_m3_a_1000m2":950.0,"verlust_max_l_d_1000m2":2602,"verlust_min_l_d_1000m2":2602,"gedruckt":"1 * 10⁻⁹ | 0,95 | 950,00 | 2.602"}'::jsonb,
 '4 sehr schwach durchlässig … 1 * 10-9 0,95 950,00 2.602'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB2'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'z5', '{"zeile":"z5"}'::jsonb, 'praktisch undurchlässig', 'industriell aufbereitete Böden (z. B. Fertigmischungen aus Grubentonen); natürlich vorkommende Mineralböden mit natürlichen/synthetischen Zusatzstoffen (z. B. Bentonit/Tonmehl/Kunststoff) ¹', 3,
 '{"durchlaessigkeit":"praktisch undurchlässig","stoffart":"industriell aufbereitete Böden (z. B. Fertigmischungen aus Grubentonen); natürlich vorkommende Mineralböden mit natürlichen/synthetischen Zusatzstoffen (z. B. Bentonit/Tonmehl/Kunststoff) ¹","kf_max_m_s":1e-10,"kf_min_m_s":1e-10,"q_max_m3_a_m2":0.095,"q_min_m3_a_m2":0.095,"verlust_max_m3_a_1000m2":95.0,"verlust_min_m3_a_1000m2":95.0,"verlust_max_l_d_1000m2":260,"verlust_min_l_d_1000m2":260,"gedruckt":"1 * 10⁻¹⁰ | 0,095 | 95,00 | 260"}'::jsonb,
 '5 praktisch undurchlässig … 1 * 10-10 0,095 95,00 260'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB2'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'z6', '{"zeile":"z6"}'::jsonb, 'praktisch undurchlässig', 'industriell aufbereitete Böden (z. B. vakuumverpresste Grubentone und Bentonit)', 4,
 '{"durchlaessigkeit":"praktisch undurchlässig","stoffart":"industriell aufbereitete Böden (z. B. vakuumverpresste Grubentone und Bentonit)","kf_max_m_s":1e-11,"kf_min_m_s":1e-12,"q_max_m3_a_m2":0.0095,"q_min_m3_a_m2":0.00095,"verlust_max_m3_a_1000m2":9.5,"verlust_min_m3_a_1000m2":0.95,"verlust_max_l_d_1000m2":26,"verlust_min_l_d_1000m2":3,"gedruckt":"1 * 10⁻¹¹ bis 1 * 10⁻¹² | 0,0095 bis 0,00095 | 9,50 bis 0,95 | 26 bis 3"}'::jsonb,
 '6 praktisch undurchlässig industriell aufbereitete Böden (z. B. vakuumverpresste Grubentone und Bentonit) 1 * 10-11 bis 1 * 10-12 0,0095 bis 0,00095 9,50 bis 0,95 26 bis 3'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB2'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 9 · Erforderliche Frischbetontemperatur (§5.3.2.1, printed p. 53)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB9', 'Erforderliche Frischbetontemperatur (Tab. 9)', '§5.3.2.1, Tab. 9', '53',
  ARRAY['fall']::text[],
  '[{"name":"lufttemperatur","type":"string"},{"name":"frischbeton_min_c","type":"number","unit":"°C"},{"name":"bedingung","type":"string"},{"name":"haltedauer_min_tage","type":"number","unit":"d"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', 'Die Grenztemperaturen des Frischbetons nach DIN 1045-3 von mind. + 5 °C bzw. höchstens + 30 °C müssen eingehalten werden (s. Tab. 9).', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'plus5_bis_3_allgemein', '{"fall":"plus5_bis_3_allgemein"}'::jsonb, '+ 5 °C bis 3 °C', '+ 5 °C allgemein', 0,
 '{"lufttemperatur":"+ 5 °C bis 3 °C","frischbeton_min_c":5,"bedingung":"allgemein","haltedauer_min_tage":null,"gedruckt":"+ 5 °C allgemein"}'::jsonb, '2 + 5 °C bis 3 °C + 5 °C allgemein'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB9'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'plus5_bis_3_zement_lt_240', '{"fall":"plus5_bis_3_zement_lt_240"}'::jsonb, '+ 5 °C bis 3 °C', '+ 10 °C bei Zementgehalt < 240 kg/m³ oder bei Zementen mit niedriger Hydratationswärme', 1,
 '{"lufttemperatur":"+ 5 °C bis 3 °C","frischbeton_min_c":10,"bedingung":"Zementgehalt < 240 kg/m³ oder Zemente mit niedriger Hydratationswärme","haltedauer_min_tage":null,"gedruckt":"+ 10 °C bei Zementgehalt < 240 kg/m³ oder bei Zementen mit niedriger Hydratationswärme"}'::jsonb, '3 + 10 °C bei Zementgehalt < 240 kg/m³ oder bei Zementen mit niedriger Hydratationswärme'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB9'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'unter_plus3', '{"fall":"unter_plus3"}'::jsonb, 'unter + 3 °C', '+ 10 °C; außerdem soll diese Temperatur wenigstens 3 Tage gehalten werden', 2,
 '{"lufttemperatur":"unter + 3 °C","frischbeton_min_c":10,"bedingung":"Temperatur wenigstens 3 Tage halten","haltedauer_min_tage":3,"gedruckt":"+ 10 °C; außerdem soll diese Temperatur wenigstens 3 Tage gehalten werden"}'::jsonb, '4 unter + 3 °C + 10 °C; außerdem soll diese Temperatur wenigstens 3 Tage gehalten werden'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB9'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 10 · Erforderliche Erhärtungszeit eines Betons mit w/z = 0,60 bis zum Erreichen der Gefrierbeständigkeit (§5.3.2.1, printed p. 54)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB10', 'Erforderliche Erhärtungszeit eines Betons mit w/z = 0,60 bis zum Erreichen der Gefrierbeständigkeit in Abhängigkeit von der Zementart und Betontemperatur (Tab. 10)', '§5.3.2.1, Tab. 10', '54',
  ARRAY['zementfestigkeitsklasse']::text[],
  '[{"name":"tage_bei_5c","type":"number","unit":"d"},{"name":"tage_bei_12c","type":"number","unit":"d"},{"name":"tage_bei_20c","type":"number","unit":"d"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', 'Diese Gefrierbeständigkeit ist dann erreicht, wenn er mindestens eine Festigkeit von 5 N/mm² aufweist und vor Fremdwasser geschützt wird. Die dafür erforderlichen Erhärtungszeiten in Abhängigkeit von Temperatur, Wasserzementwert und Zementfestigkeitsklasse sind in Tabelle 10 angegeben.', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, '52_5R_52_5N_42_5R', '{"zementfestigkeitsklasse":"52_5R_52_5N_42_5R"}'::jsonb, NULL, '52,5 R; 52,5 N; 42,5 R', 0,
 '{"tage_bei_5c":0.75,"tage_bei_12c":0.5,"tage_bei_20c":0.5,"gedruckt":"0,75 | 0,5 | 0,5"}'::jsonb, '3 52,5 R; 52,5 N; 42,5 R 0,75 0,5 0,5'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB10'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, '42_5N_32_5R', '{"zementfestigkeitsklasse":"42_5N_32_5R"}'::jsonb, NULL, '42,5 N; 32,5 R', 1,
 '{"tage_bei_5c":2,"tage_bei_12c":1.5,"tage_bei_20c":1,"gedruckt":"2 | 1,5 | 1"}'::jsonb, '4 42,5 N; 32,5 R 2 1,5 1'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB10'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, '32_5N', '{"zementfestigkeitsklasse":"32_5N"}'::jsonb, NULL, '32,5 N', 2,
 '{"tage_bei_5c":5,"tage_bei_12c":3.5,"tage_bei_20c":2,"gedruckt":"5 | 3,5 | 2"}'::jsonb, '5 32,5 N 5 3,5 2'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB10'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 11 · Umfang und Häufigkeit der Prüfung bei Frischbeton nach Eigenschaften (Normalbeton) bei ÜK 2 (§5.3.3.2, printed p. 57)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB11', 'Umfang und Häufigkeit der Prüfung bei Frischbeton nach Eigenschaften (Normalbeton) bei ÜK 2 (Tab. 11)', '§5.3.3.2, Tab. 11', '57',
  ARRAY['gegenstand']::text[],
  '[{"name":"gegenstand_text","type":"string"},{"name":"pruefverfahren","type":"string"},{"name":"haeufigkeit","type":"string"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', 'Vor dem Einbringen des Betons ist dieser im festgelegten Umfang zu kontrollieren (s. Tab. 11).', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'lieferschein', '{"gegenstand":"lieferschein"}'::jsonb, NULL, 'Lieferschein', 0,
 '{"gegenstand_text":"Lieferschein","pruefverfahren":"Augenscheinprüfung","haeufigkeit":"jedes Lieferfahrzeug","gedruckt":"Lieferschein | Augenscheinprüfung | jedes Lieferfahrzeug"}'::jsonb, '2 Lieferschein Augenscheinprüfung jedes Lieferfahrzeug'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB11'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'konsistenz_augenschein', '{"gegenstand":"konsistenz_augenschein"}'::jsonb, 'Konsistenz', 'Konsistenz — Augenscheinprüfung', 1,
 '{"gegenstand_text":"Konsistenz","pruefverfahren":"Augenscheinprüfung","haeufigkeit":"Stichprobe; jedes Lieferfahrzeug","gedruckt":"Konsistenz | Augenscheinprüfung | Stichprobe | jedes Lieferfahrzeug"}'::jsonb, '3 Konsistenz Augenscheinprüfung Stichprobe jedes Lieferfahrzeug'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB11'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'konsistenz_pruefung', '{"gegenstand":"konsistenz_pruefung"}'::jsonb, 'Konsistenz', 'Konsistenz — DIN EN 12350-2, DIN EN 12350-3 od. DIN EN 12350-4', 2,
 '{"gegenstand_text":"Konsistenz","pruefverfahren":"DIN EN 12350-2, DIN EN 12350-3 od. DIN EN 12350-4","haeufigkeit":"nur im Zweifelsfall; beim ersten Einbringen jeder Betonzusammensetzung, bei Herstellung von Probekörpern für die Festigkeitsprüfung und in Einzelfällen","gedruckt":"Konsistenz | DIN EN 12350-2, DIN EN 12350-3 od. DIN EN 12350-4 | nur im Zweifelsfall | Beim ersten Einbringen jeder Betonzusammensetzung, bei Herstellung von Probekörpern für die Festigkeitsprüfung und in Einzelfällen."}'::jsonb, '4 Konsistenz DIN EN 12350-2, DIN EN 12350-3 od. DIN EN 12350-4 nur im Zweifelsfall Beim ersten Einbringen jeder Betonzusammensetzung, bei Herstellung von Probekörpern für die Festigkeitsprüfung und in Einzelfällen.'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB11'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'gleichmaessigkeit', '{"gegenstand":"gleichmaessigkeit"}'::jsonb, 'Gleichmäßigkeit des Betons', 'Gleichmäßigkeit des Betons', 3,
 '{"gegenstand_text":"Gleichmäßigkeit des Betons","pruefverfahren":"Augenscheinprüfung; Eigenschaftenvergleich","haeufigkeit":"Stichprobe; jedes Lieferfahrzeug; in Zweifelsfällen","gedruckt":"Gleichmäßigkeit des Betons | Augenscheinprüfung | Stichprobe | jedes Lieferfahrzeug ; Eigenschaftenvergleich | in Zweifelsfällen"}'::jsonb, '5 Gleichmäßigkeit des Betons Augenscheinprüfung Stichprobe jedes Lieferfahrzeug Eigenschaftenvergleich in Zweifelsfällen'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB11'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'druckfestigkeit', '{"gegenstand":"druckfestigkeit"}'::jsonb, NULL, 'Druckfestigkeit', 4,
 '{"gegenstand_text":"Druckfestigkeit","pruefverfahren":"DIN EN 12390-3","haeufigkeit":"nur im Zweifelsfall; 3 Proben je 300 m³ oder je 3 Betoniertage; 3 Proben je 50 m³ oder je Betoniertage","gedruckt":"Druckfestigkeit | DIN EN 12390-3 | nur im Zweifelsfall | 3 Proben je 300 m³ oder je 3 Betoniertage | 3 Proben je 50 m³ oder je Betoniertage"}'::jsonb, '6 Druckfestigkeit DIN EN 12390-3 nur im Zweifelsfall 3 Proben je 300 m³ oder je 3 Betoniertage 3 Proben je 50 m³ oder je Betoniertage'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB11'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'luftgehalt', '{"gegenstand":"luftgehalt"}'::jsonb, NULL, 'Luftgehalt von Luftporenbeton', 5,
 '{"gegenstand_text":"Luftgehalt von Luftporenbeton","pruefverfahren":"DIN EN 12350-7","haeufigkeit":"nicht zutreffend; zu Beginn jedes Betonierabschnittes, in Zweifelsfällen","gedruckt":"Luftgehalt von Luftporenbeton | DIN EN 12350-7 | nicht zutreffend | zu Beginn jedes Betonierabschnittes, in Zweifelsfällen"}'::jsonb, '7 Luftgehalt von Luftporenbeton DIN EN 12350-7 nicht zutreffend zu Beginn jedes Betonierabschnittes, in Zweifelsfällen'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB11'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 14 · Mindestanforderungen an Geotextilien für GTD (§5.5.1.1, printed p. 64)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB14', 'Mindestanforderungen an Geotextilien für GTD (Tab. 14)', '§5.5.1.1, Tab. 14', '64',
  ARRAY['geotextil_art']::text[],
  '[{"name":"parameter","type":"string"},{"name":"symbol","type":"string"},{"name":"norm","type":"string"},{"name":"flaecheneinheit_min_g_m2","type":"number","unit":"g/m²"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', 'Anforderungswerte an die Eigenschaften der Geotextilien werden in Tabelle 14 angegeben.', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'baendchengewebe', '{"geotextil_art":"baendchengewebe"}'::jsonb, NULL, 'Bändchengewebe', 0,
 '{"parameter":"Flächeneinheit","symbol":"M_A","norm":"DIN EN ISO 9864","flaecheneinheit_min_g_m2":100,"gedruckt":"≥ 100 g/m²"}'::jsonb, '3 Flächeneinheit MA DIN EN ISO 9864 ≥ 100 g/m² ≥ 200 g/m²'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB14'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'pp_vliesstoff', '{"geotextil_art":"pp_vliesstoff"}'::jsonb, NULL, 'mechanisch verfestigter PP Vliesstoff', 1,
 '{"parameter":"Flächeneinheit","symbol":"M_A","norm":"DIN EN ISO 9864","flaecheneinheit_min_g_m2":200,"gedruckt":"≥ 200 g/m²"}'::jsonb, '3 Flächeneinheit MA DIN EN ISO 9864 ≥ 100 g/m² ≥ 200 g/m²'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB14'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 15 · Anforderungen für vernadelte Bentonitmatten mit Na-Bentonit (§5.5.1.1, printed p. 65)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB15', 'Anforderungen für vernadelte Bentonitmatten mit Na-Bentonit (Tab. 15)', '§5.5.1.1, Tab. 15', '65',
  ARRAY['eigenschaft']::text[],
  '[{"name":"norm","type":"string"},{"name":"ohne_beschichtung","type":"string"},{"name":"mit_beschichtung","type":"string"},{"name":"min_ohne","type":"number"},{"name":"min_mit","type":"number"},{"name":"max_ohne","type":"number"},{"name":"max_mit","type":"number"},{"name":"unit","type":"string"},{"name":"produktabhaengig","type":"boolean"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', 'Für die in der Praxis häufig eingesetzten vernadelten GTD mit Na-Bentonit gelten die in Tabelle 15 genannten Anforderungen. Die Anforderungen in den Zeilen 2 bis 7 der Tabelle 15 können produktabhängig abweichen.', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'na_bentoniteinlage', '{"eigenschaft":"na_bentoniteinlage"}'::jsonb, NULL, 'Natrium-Bentoniteinlage (bezogen auf Wassergehalt 0 Masse-%)', 0,
 '{"norm":"DIN EN 14196","ohne_beschichtung":"≥ 3.600 g/m² (Na-Bentonit)","mit_beschichtung":"≥ 3.600 g/m² (Na-Bentonit)","min_ohne":3600,"min_mit":3600,"max_ohne":null,"max_mit":null,"unit":"g/m²","produktabhaengig":true,"gedruckt":"≥ 3.600 g/m² (Na-Bentonit)"}'::jsonb, '2 Natrium-Bentoniteinlage (bezogen auf Wassergehalt 0 Masse-%) DIN EN 14196 ≥ 3.600 g/m² (Na-Bentonit)'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'quellvermoegen', '{"eigenschaft":"quellvermoegen"}'::jsonb, NULL, 'Quellvermögen', 1,
 '{"norm":"ASTM D 5890","ohne_beschichtung":"≥ 24 ml","mit_beschichtung":"≥ 24 ml","min_ohne":24,"min_mit":24,"max_ohne":null,"max_mit":null,"unit":"ml","produktabhaengig":true,"gedruckt":"≥ 24 ml"}'::jsonb, '3 Quellvermögen ASTM D 5890 ≥ 24 ml'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'deckgeotextil', '{"eigenschaft":"deckgeotextil"}'::jsonb, NULL, 'Deckgeotextil (mechanisch verfestigter PP Vliesstoff) Flächeneinheit', 2,
 '{"norm":"DIN EN ISO 9864","ohne_beschichtung":"≥ 200 g/m²","mit_beschichtung":"≥ 200 g/m²","min_ohne":200,"min_mit":200,"max_ohne":null,"max_mit":null,"unit":"g/m²","produktabhaengig":true,"gedruckt":"≥ 200 g/m²"}'::jsonb, '4 Deckgeotextil (mechanisch verfestigter PP Vliesstoff) Flächeneinheit DIN EN ISO 9864 ≥ 200 g/m²'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'polyolefine_beschichtung', '{"eigenschaft":"polyolefine_beschichtung"}'::jsonb, NULL, 'Polyolefine Beschichtung auf der Bändchengewebeseite Flächeneinheit', 3,
 '{"norm":"DIN EN ISO 9864","ohne_beschichtung":"-","mit_beschichtung":"≥ 400 g/m² PE-Beschichtung","min_ohne":null,"min_mit":400,"max_ohne":null,"max_mit":null,"unit":"g/m²","produktabhaengig":true,"gedruckt":"- | ≥ 400 g/m² PE-Beschichtung"}'::jsonb, '5 Polyolefine Beschichtung auf der Bändchengewebeseite Flächeneinheit DIN EN ISO 9864 - ≥ 400 g/m² PE-Beschichtung'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'traegergeotextil', '{"eigenschaft":"traegergeotextil"}'::jsonb, NULL, 'Trägergeotextil (PP-Bändchengewebe) Flächeneinheit', 4,
 '{"norm":"DIN EN ISO 9864","ohne_beschichtung":"≥ 100 g/m²","mit_beschichtung":"≥ 100 g/m²","min_ohne":100,"min_mit":100,"max_ohne":null,"max_mit":null,"unit":"g/m²","produktabhaengig":true,"gedruckt":"≥ 100 g/m² | ≥ 100 g/m²"}'::jsonb, '6 Trägergeotextil (PP-Bändchengewebe) Flächeneinheit DIN EN ISO 9864 ≥ 100 g/m² ≥ 100 g/m²'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'masse_pro_flaecheneinheit', '{"eigenschaft":"masse_pro_flaecheneinheit"}'::jsonb, NULL, 'Masse pro Flächeneinheit (bezogen auf Wassergehalt ≤ 0 Masse-%)', 5,
 '{"norm":"DIN EN 14196","ohne_beschichtung":"≥ 3.900 g/m²","mit_beschichtung":"≥ 4.300 g/m²","min_ohne":3900,"min_mit":4300,"max_ohne":null,"max_mit":null,"unit":"g/m²","produktabhaengig":true,"gedruckt":"≥ 3.900 g/m² | ≥ 4.300 g/m²"}'::jsonb, '7 Masse pro Flächeneinheit (bezogen auf Wassergehalt ≤ 0 Masse-%) DIN EN 14196 ≥ 3.900 g/m² ≥ 4.300 g/m²'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'zugfestigkeit', '{"eigenschaft":"zugfestigkeit"}'::jsonb, NULL, 'Zugfestigkeit (längs und quer)', 6,
 '{"norm":"DIN EN ISO 10319","ohne_beschichtung":"≥ 10 kN/m","mit_beschichtung":"≥ 10 kN/m","min_ohne":10,"min_mit":10,"max_ohne":null,"max_mit":null,"unit":"kN/m","produktabhaengig":false,"gedruckt":"≥ 10 kN/m | ≥ 10 kN/m"}'::jsonb, '8 Zugfestigkeit (längs und quer) DIN EN ISO 10319 ≥ 10 kN/m ≥ 10 kN/m'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'zugfestigkeitsdehnung', '{"eigenschaft":"zugfestigkeitsdehnung"}'::jsonb, NULL, 'Zugfestigkeitsdehnung', 7,
 '{"norm":"DIN EN ISO 10319","ohne_beschichtung":"≤ 30%","mit_beschichtung":"≤ 30%","min_ohne":null,"min_mit":null,"max_ohne":30,"max_mit":30,"unit":"%","produktabhaengig":false,"gedruckt":"≤ 30% | ≤ 30%"}'::jsonb, '8 Zugfestigkeitsdehnung DIN EN ISO 10319 ≤ 30% ≤ 30%'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'verbundfestigkeit', '{"eigenschaft":"verbundfestigkeit"}'::jsonb, NULL, 'Verbundfestigkeit', 8,
 '{"norm":"ASTM D 6496","ohne_beschichtung":"≥ 360 N/m","mit_beschichtung":"≥ 360 N/m","min_ohne":360,"min_mit":360,"max_ohne":null,"max_mit":null,"unit":"N/m","produktabhaengig":false,"gedruckt":"≥ 360 N/m"}'::jsonb, '9 Verbundfestigkeit ASTM D 6496 ≥ 360 N/m'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'kf', '{"eigenschaft":"kf"}'::jsonb, NULL, 'Durchlässigkeitsbeiwert (kf)', 9,
 '{"norm":"DIN EN 16416 (i=150, ca. 27,5 kPa Auflast, ermittelt bei d=1 cm)","ohne_beschichtung":"≤ 5,0 * 10⁻¹¹ m/s","mit_beschichtung":"≤ 5,0 * 10⁻¹¹ m/s","min_ohne":null,"min_mit":null,"max_ohne":5e-11,"max_mit":5e-11,"unit":"m/s","produktabhaengig":false,"gedruckt":"≤ 5,0 * 10-11 m/s"}'::jsonb, '10 Durchlässigkeitsbeiwert (kf) DIN EN 16416 (i=150, ca. 27,5 kPa Auflast, ermittelt bei d=1 cm) ≤ 5,0 * 10-11 m/s'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'permittivitaet', '{"eigenschaft":"permittivitaet"}'::jsonb, NULL, 'Permittivität', 10,
 '{"norm":"DIN EN 16416 (i=150, ca. 27,5 kPa Auflast)","ohne_beschichtung":"≤ 5,0 * 10⁻⁹ m/s","mit_beschichtung":"≤ 5,0 * 10⁻⁹ m/s","min_ohne":null,"min_mit":null,"max_ohne":5e-9,"max_mit":5e-9,"unit":"m/s","produktabhaengig":false,"gedruckt":"≤ 5,0 * 10-9 m/s"}'::jsonb, '11 Permittivität DIN EN 16416 (i=150, ca. 27,5 kPa Auflast) ≤ 5,0 * 10-9 m/s'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB15'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 17 · Art und Umfang der Qualitätskontrollen für die Rohstoffe der GTD (§5.5.3.1, printed p. 73)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB17', 'Art und Umfang der Qualitätskontrollen für die Rohstoffe der GTD (Tab. 17)', '§5.5.3.1, Tab. 17', '73',
  ARRAY['eigenschaft']::text[],
  '[{"name":"norm","type":"string"},{"name":"probenanzahl","type":"number"},{"name":"werkseigene_kontrolle","type":"string"},{"name":"werkseigene_kontrolle_m2","type":"number","unit":"m²"},{"name":"fremdueberwachung","type":"boolean"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', 'Art und Umfang der Qualitätskontrollen für die Rohstoffe der GTD sind der Tabelle 17 zu entnehmen.', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'bentoniteinlage', '{"eigenschaft":"bentoniteinlage"}'::jsonb, NULL, 'Bentoniteinlage (bezogen auf Wassergehalt 0 Masse-%)', 0,
 '{"norm":"DIN EN 14196","probenanzahl":10,"werkseigene_kontrolle":"alle 1.000 m²","werkseigene_kontrolle_m2":1000,"fremdueberwachung":true,"gedruckt":"DIN EN 14196 | 10 | alle 1.000 m² | X"}'::jsonb, '2 Bentoniteinlage (bezogen auf Wassergehalt 0 Masse-%) DIN EN 14196 10 alle 1.000 m² X'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB17'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'masse_pro_flaecheneinheit', '{"eigenschaft":"masse_pro_flaecheneinheit"}'::jsonb, NULL, 'Masse pro Flächeneinheit (bezogen auf Wassergehalt ≤ 12 Masse-%)', 1,
 '{"norm":"DIN EN 14196","probenanzahl":10,"werkseigene_kontrolle":"alle 1.000 m²","werkseigene_kontrolle_m2":1000,"fremdueberwachung":true,"gedruckt":"DIN EN 14196 | 10 | alle 1.000 m² | X"}'::jsonb, '3 Masse pro Flächeneinheit (bezogen auf Wassergehalt ≤ 12 Masse-%) DIN EN 14196 10 alle 1.000 m² X'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB17'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'zugfestigkeit_dehnung', '{"eigenschaft":"zugfestigkeit_dehnung"}'::jsonb, NULL, 'Zugfestigkeit und -dehnung', 2,
 '{"norm":"DIN EN ISO 10319","probenanzahl":5,"werkseigene_kontrolle":"alle 15.000 m²","werkseigene_kontrolle_m2":15000,"fremdueberwachung":true,"gedruckt":"DIN EN ISO 10319 | 5 | alle 15.000 m² | X"}'::jsonb, '4 Zugfestigkeit und -dehnung DIN EN ISO 10319 5 alle 15.000 m² X'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB17'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'verbundfestigkeit', '{"eigenschaft":"verbundfestigkeit"}'::jsonb, NULL, 'Verbundfestigkeit', 3,
 '{"norm":"ASTM D 6496","probenanzahl":5,"werkseigene_kontrolle":"alle 6.000 m²","werkseigene_kontrolle_m2":6000,"fremdueberwachung":true,"gedruckt":"ASTM D 6496 | 5 | alle 6.000 m² | X"}'::jsonb, '5 Verbundfestigkeit ASTM D 6496 5 alle 6.000 m² X'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB17'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'kf', '{"eigenschaft":"kf"}'::jsonb, NULL, 'Durchlässigkeitsbeiwert (kf)', 4,
 '{"norm":"DIN EN 16416 (i=150, ca. 27,5 kPa Auflast, d=1 cm)","probenanzahl":1,"werkseigene_kontrolle":"alle 25.000 m²","werkseigene_kontrolle_m2":25000,"fremdueberwachung":true,"gedruckt":"DIN EN 16416 (i=150, ca. 27,5 kPa Auflast, d=1 cm) | 1 | alle 25.000 m² | X"}'::jsonb, '6 Durchlässigkeitsbeiwert (kf) DIN EN 16416 (i=150, ca. 27,5 kPa Auflast, d=1 cm) 1 alle 25.000 m² X'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB17'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, 'permittivitaet', '{"eigenschaft":"permittivitaet"}'::jsonb, NULL, 'Permittivität', 5,
 '{"norm":"DIN EN 16416 (i=150, ca. 27,5 kPa Auflast)","probenanzahl":1,"werkseigene_kontrolle":"alle 25.000 m²","werkseigene_kontrolle_m2":25000,"fremdueberwachung":true,"gedruckt":"DIN EN 16416 (i=150, ca. 27,5 kPa Auflast) | 1 | alle 25.000 m² | X"}'::jsonb, '7 Permittivität DIN EN 16416 (i=150, ca. 27,5 kPa Auflast) 1 alle 25.000 m² X'
FROM regulation_tables WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB17'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 19 · Stoffe für die Abdichtung mit Bitumen- und Polymerbitumenbahn, Typ BA gemäß DIN 18535-2 (§6.1.1.1, printed p. 78)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB19', 'Stoffe für die Abdichtung mit Bitumen- und Polymerbitumenbahn, Typ BA gemäß DIN 18535-2 (Tab. 19)', '§6.1.1.1, Tab. 19', '78',
  ARRAY['kurzzeichen']::text[],
  '[{"name":"bahnenart","type":"string"},{"name":"kurzzeichen_text","type":"string"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', 'Unter Bezugnahme auf DIN 18535-2 sind die in Tabelle 19 genannten Bitumen- und Polymerbitumenbahnen nach DIN EN 13969 in Verbindung mit DIN SPEC 20000-202, Anwendungstyp BA zu verwenden.', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, k, jsonb_build_object('kurzzeichen', k), g, t, i, jsonb_build_object('bahnenart', g, 'kurzzeichen_text', t, 'gedruckt', t), q
FROM regulation_tables, (VALUES
  ('G_200_DD', 'Bitumen-Dachdichtungsbahnen', 'G 200 DD', 0, '2 Bitumen-Dachdichtungsbahnen G 200 DD'),
  ('PV_200_DD', 'Bitumen-Dachdichtungsbahnen', 'PV 200 DD', 1, '3 PV 200 DD'),
  ('PYE_G_200_DD', 'Polymerbitumen-Dachdichtungsbahnen', 'PYE G 200 DD', 2, '4 Polymerbitumen-Dachdichtungsbahnen PYE G 200 DD'),
  ('PYE_PV_200_DD', 'Polymerbitumen-Dachdichtungsbahnen', 'PYE PV 200 DD', 3, '5 PYE PV 200 DD'),
  ('G_200_S4', 'Bitumenschweißbahnen', 'G 200 S4', 4, '6 Bitumenschweißbahnen G 200 S4'),
  ('PV_200_S5', 'Bitumenschweißbahnen', 'PV 200 S5', 5, '7 PV 200 S5'),
  ('KTG_S4', 'Bitumenschweißbahnen', 'KTG S4', 6, '8 KTG S4'),
  ('KTP_S4', 'Bitumenschweißbahnen', 'KTP S4', 7, '9 KTP S4'),
  ('PYE_G_200_S4', 'Polymerbitumenschweißbahnen', 'PYE G 200 S4', 8, '10 Polymerbitumenschweißbahnen PYE G 200 S4'),
  ('PYE_PV_200_S5', 'Polymerbitumenschweißbahnen', 'PYE PV 200 S5', 9, '11 PYE PV 200 S5'),
  ('PYE_KTG_S4', 'Polymerbitumenschweißbahnen', 'PYE KTG S4', 10, '12 PYE KTG S4'),
  ('PYE_KTP_S5', 'Polymerbitumenschweißbahnen', 'PYE KTP S5', 11, '13 PYE KTP S5'),
  ('PYE_KTG_KSP_2_8', 'Kaltselbstklebende Polymerbitumenbahnen mit Trägereinlage', 'PYE-KTG KSP-2,8', 12, '14 Kaltselbstklebende Polymerbitumenbahnen mit Trägereinlage PYE-KTG KSP-2,8'),
  ('PYE_KTP_KSP_2_8', 'Kaltselbstklebende Polymerbitumenbahnen mit Trägereinlage', 'PYE-KTP KSP-2,8', 13, '15 PYE-KTP KSP-2,8')
) AS v(k, g, t, i, q)
WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB19'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 20 · Übersicht von Kurzzeichen für Kunststoff- und Elastomerbahnen (§6.2.1.1, printed p. 82)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB20', 'Übersicht von Kurzzeichen für Kunststoff- und Elastomerbahnen (Tab. 20)', '§6.2.1.1, Tab. 20', '82',
  ARRAY['kurzzeichen']::text[],
  '[{"name":"beschreibung","type":"string"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', 'Zur weiteren Stoffbeschreibung werden neben der Werkstoffbezeichnung folgende Kurzzeichen verwendet:', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, k, jsonb_build_object('kurzzeichen', k), NULL, d, i, jsonb_build_object('beschreibung', d, 'gedruckt', k || ' ' || d), q
FROM regulation_tables, (VALUES
  ('K', 'kaschiert', 0, '2 K kaschiert'), ('Zahl', 'Dicke in mm', 1, '3 Zahl Dicke in mm'), ('V', 'verstärkt', 2, '4 V verstärkt'),
  ('GV', 'Glasvlies', 3, '5 GV Glasvlies'), ('E', 'Einlage', 4, '6 E Einlage'), ('PV', 'Polyestervlies', 5, '7 PV Polyestervlies'),
  ('BV', 'bitumenverträglich', 6, '8 BV bitumenverträglich'), ('PPV', 'Polypropylenvlies', 7, '9 PPV Polypropylenvlies'),
  ('NB', 'nicht bitumenverträglich', 8, '10 NB nicht bitumenverträglich'), ('GG', 'Glasgittergelege bzw. -gewebe', 9, '11 GG Glasgittergelege bzw. -gewebe'),
  ('SK', 'Selbstklebeschicht', 10, '12 SK Selbstklebeschicht'), ('PG', 'Polyestergewebe bzw. -gelege', 11, '13 PG Polyestergewebe bzw. -gelege'),
  ('PBS', 'Polymerbitumenschicht', 12, '14 PBS Polymerbitumenschicht')
) AS v(k, d, i, q)
WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB20'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 21 · Stoffe für die Abdichtung mit Kunststoff- oder Elastomerbahnen nach DIN/TS 20.000-202, Anwendung Typ BA (§6.2.1.1, printed p. 83)
-- 37 printed rows; a row may carry one Kunststoff- and one Elastomer designation → 47 designations. zeile_nr = printed row number.
-- Footnotes as printed: "1 alternativ werkseitige Polymerbitumenschicht" · "2 Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG"
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB21', 'Stoffe für die Abdichtung mit Kunststoff- oder Elastomerbahnen nach DIN/TS 20.000-202, Anwendung Typ BA (Tab. 21)', '§6.2.1.1, Tab. 21', '83',
  ARRAY['bezeichnung']::text[],
  '[{"name":"zeile_nr","type":"number"},{"name":"bahnenart","type":"string"},{"name":"stoffgruppe","type":"string"},{"name":"bezeichnung_text","type":"string"},{"name":"fussnote","type":"string"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', '1 alternativ werkseitige Polymerbitumenschicht — 2 Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, k, jsonb_build_object('bezeichnung', k), g, t, i, jsonb_build_object('zeile_nr', nr, 'bahnenart', g, 'stoffgruppe', s, 'bezeichnung_text', t, 'fussnote', f, 'gedruckt', t), nr::text || ' ' || g || ' ' || t
FROM regulation_tables, (VALUES
  ('EVA-BV-1,2', 1, 'homogene Bahnen', 'Kunststoffbahnen', 'EVA-BV-1,2', NULL, 0),
  ('EPDM-BV-1,1', 1, 'homogene Bahnen', 'Elastomerbahnen', 'EPDM-BV-1,1', NULL, 1),
  ('PVC-P-NB-1,2', 2, 'homogene Bahnen', 'Kunststoffbahnen', 'PVC-P-NB-1,2', NULL, 2),
  ('TPE-BV-1,2', 2, 'homogene Bahnen', 'Elastomerbahnen', 'TPE-BV-1,2', NULL, 3),
  ('PVC-P-BV-1,2', 3, 'homogene Bahnen', 'Kunststoffbahnen', 'PVC-P-BV-1,2', NULL, 4),
  ('PIB-BV-1,5', 4, 'homogene Bahnen', 'Kunststoffbahnen', 'PIB-BV-1,5', NULL, 5),
  ('FPO-BV-1,2', 5, 'homogene Bahnen', 'Kunststoffbahnen', 'FPO-BV-1,2', NULL, 6),
  ('PVC-BV-1,5-SK', 6, 'homogene Bahnen mit Selbstklebeschicht', 'Kunststoffbahnen', 'PVC-BV-1,5-SK', NULL, 7),
  ('EPDM-BV-1,1-SK', 6, 'homogene Bahnen mit Selbstklebeschicht', 'Elastomerbahnen', 'EPDM-BV-1,1-SK', NULL, 8),
  ('ECB-BV-E-GV-1,5', 7, 'Bahnen mit Einlagen', 'Kunststoffbahnen', 'ECB-BV-E-GV-1,5', NULL, 9),
  ('FPO-BV-E-GV-1,2', 8, 'Bahnen mit Einlagen', 'Kunststoffbahnen', 'FPO-BV-E-GV-1,2', NULL, 10),
  ('PVC-P-NB-E-GV-1,2', 9, 'Bahnen mit Einlagen', 'Kunststoffbahnen', 'PVC-P-NB-E-GV-1,2', NULL, 11),
  ('PVC-P-BV-E-GV-1,2', 10, 'Bahnen mit Einlagen', 'Kunststoffbahnen', 'PVC-P-BV-E-GV-1,2', NULL, 12),
  ('ECB-BV-E-GV-1,5-SK', 11, 'Bahnen mit Einlage mit Selbstklebeschicht oder Polymerbitumenbeschichtung', 'Kunststoffbahnen', 'ECB-BV-E-GV-1,5-SK¹', '¹ alternativ werkseitige Polymerbitumenschicht', 13),
  ('PVC-P-BV-E-GV-1,2-SK', 12, 'Bahnen mit Einlage mit Selbstklebeschicht oder Polymerbitumenbeschichtung', 'Kunststoffbahnen', 'PVC-P-BV-E-GV-1,2-SK¹', '¹ alternativ werkseitige Polymerbitumenschicht', 14),
  ('FPO-BV-E-GV-1,2-SK', 13, 'Bahnen mit Einlage mit Selbstklebeschicht oder Polymerbitumenbeschichtung', 'Kunststoffbahnen', 'FPO-BV-E-GV-1,2-SK', NULL, 15),
  ('FPO-BV-V-(X)-1,2', 14, 'Bahnen mit Verstärkung', 'Kunststoffbahnen', 'FPO-BV-V-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 16),
  ('ECB-BV-V-(X)-1,5', 15, 'Bahnen mit Verstärkung', 'Kunststoffbahnen', 'ECB-BV-V-(X)²-1,5', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 17),
  ('EVA-BV-V-(X)-1,2', 16, 'Bahnen mit Verstärkung', 'Kunststoffbahnen', 'EVA-BV-V-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 18),
  ('EPDM-BV-V-(X)-1,3', 16, 'Bahnen mit Verstärkung', 'Elastomerbahnen', 'EPDM-BV-V-(X)²-1,3', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 19),
  ('PVC-P-NB-V-(X)-1,2', 17, 'Bahnen mit Verstärkung', 'Kunststoffbahnen', 'PVC-P-NB-V-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 20),
  ('PVC-P-BV-V-(X)-1,2', 18, 'Bahnen mit Verstärkung', 'Kunststoffbahnen', 'PVC-P-BV-V-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 21),
  ('PVC-P-BV-(X)-1,2-SK', 19, 'Bahnen mit Verstärkung mit Selbstklebeschicht oder Polymerbitumenbeschichtung', 'Kunststoffbahnen', 'PVC-P-BV-(X)²-1,2-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 22),
  ('EPDM-BV-V-(X)-1,3-SK', 19, 'Bahnen mit Verstärkung mit Selbstklebeschicht oder Polymerbitumenbeschichtung', 'Elastomerbahnen', 'EPDM-BV-V-(X)²-1,3-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 23),
  ('FPO-BV-V-(X)-1,2-SK', 20, 'Bahnen mit Verstärkung mit Selbstklebeschicht oder Polymerbitumenbeschichtung', 'Kunststoffbahnen', 'FPO-BV-V-(X)²-1,2-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 24),
  ('EPDM-BV-V-(X)-PBS', 20, 'Bahnen mit Verstärkung mit Selbstklebeschicht oder Polymerbitumenbeschichtung', 'Elastomerbahnen', 'EPDM-BV-V-(X)-PBS', NULL, 25),
  ('EVA-BV-K-(X)-1,2', 21, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'EVA-BV-K-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 26),
  ('EPDM-BV-K-(X)-1,1', 21, 'Bahnen mit Kaschierungen', 'Elastomerbahnen', 'EPDM-BV-K-(X)²-1,1', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 27),
  ('FPO-BV-E-GV-K-(X)-1,2', 22, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'FPO-BV-E-GV-K-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 28),
  ('TPE-BV-K-(X)-1,2', 22, 'Bahnen mit Kaschierungen', 'Elastomerbahnen', 'TPE-BV-K-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 29),
  ('FPO-BV-V-(X)-K-(X)-1,2', 23, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'FPO-BV-V-(X)²-K-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 30),
  ('PVC-P-NB-K-(X)-1,2', 24, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'PVC-P-NB-K-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 31),
  ('PVC-P-BV-K-(X)-1,2', 25, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'PVC-P-BV-K-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 32),
  ('PVC-P-NB-E-GV-K-(X)-1,2', 26, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'PVC-P-NB-E-GV-K-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 33),
  ('PVC-P-BV-E-GV-K-(X)-1,2', 27, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'PVC-P-BV-E-GV-K-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 34),
  ('PVC-P-NB-V-(X)-K-(X)-1,2', 28, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'PVC-P-NB-V-(X)²-K-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 35),
  ('PVC-P-BV-V-(X)-K-(X)-1,2', 29, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'PVC-P-BV-V-(X)²-K-(X)²-1,2', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 36),
  ('ECB-BV-E-GV-K-(X)-1,5', 30, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'ECB-BV-E-GV-K-(X)²-1,5', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 37),
  ('PIB-BV-K-(X)-1,5', 31, 'Bahnen mit Kaschierungen', 'Kunststoffbahnen', 'PIB-BV-K-(X)²-1,5', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 38),
  ('EVA-BV-K-(X)-1,2-SK', 32, 'Bahnen mit Kaschierung mit Selbstklebeschicht', 'Kunststoffbahnen', 'EVA-BV-K-(X)²-1,2-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 39),
  ('EPDM-BV-K-(X)-1,1-SK', 32, 'Bahnen mit Kaschierung mit Selbstklebeschicht', 'Elastomerbahnen', 'EPDM-BV-K-(X)²-1,1-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 40),
  ('FPO-BV-E-GV-K-(X)-1,2-SK', 33, 'Bahnen mit Kaschierung mit Selbstklebeschicht', 'Kunststoffbahnen', 'FPO-BV-E-GV-K-(X)²-1,2-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 41),
  ('TPE-BV-K-(X)-1,2-SK', 33, 'Bahnen mit Kaschierung mit Selbstklebeschicht', 'Elastomerbahnen', 'TPE-BV-K-(X)²-1,2-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 42),
  ('PVC-BV-V-K-(X)-1,2-SK', 34, 'Bahnen mit Kaschierung mit Selbstklebeschicht', 'Kunststoffbahnen', 'PVC-BV-V-K-(X)²-1,2-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 43),
  ('PVC-P-BV-K-(X)-1,2-SK', 35, 'Bahnen mit Kaschierung mit Selbstklebeschicht', 'Kunststoffbahnen', 'PVC-P-BV-K-(X)²-1,2-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 44),
  ('PVC-P-BV-E-GV-K-(X)-1,2-SK', 36, 'Bahnen mit Kaschierung mit Selbstklebeschicht', 'Kunststoffbahnen', 'PVC-P-BV-E-GV-K-(X)²-1,2-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 45),
  ('PVC-P-BV-V-K-(X)-1,2-SK', 37, 'Bahnen mit Kaschierung mit Selbstklebeschicht', 'Kunststoffbahnen', 'PVC-P-BV-V-K-(X)²-1,2-SK', '² Art der Verstärkung nach Tab. 20, z. B. PV, GG, PG bzw. Art der Kaschierung nach Tab. 20, z. B. PV, PPV, GG', 46)
) AS v(k, nr, g, s, t, f, i)
WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB21'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 23 · Stoffe und Anforderungen für Flüssigkunststoffe (§6.3.1.1, printed p. 89)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB23', 'Stoffe und Anforderungen für Flüssigkunststoffe (Tab. 23)', '§6.3.1.1, Tab. 23', '89',
  ARRAY['stoff']::text[],
  '[{"name":"stoff_text","type":"string"},{"name":"kurzbezeichnung","type":"string"},{"name":"leistungsstufen","type":"string"},{"name":"klimazonen","type":"string"},{"name":"nutzungsdauer","type":"string"},{"name":"nutzlast","type":"string"},{"name":"dach_neigung","type":"string"},{"name":"temperaturbestaendigkeit","type":"string"},{"name":"einlage_min_g_m2","type":"number","unit":"g/m²"},{"name":"schichtdicke_min_mm","type":"number","unit":"mm"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', '¹ Eine Beschreibung der Leistungsstufen findet sich im informativen Anhang. — Die Mindestschichtdicke der ausgehärteten flüssigen Abdichtung muss den Angaben der Zulassung (ETA, AbP gemäß MVV TB) entsprechen. Sie beträgt gemäß Tabelle 23 mind. 2,0 mm. Wenn die in der ETA angegebene Mindestschichtdicke höher ist, gilt der höhere Wert.', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, k, jsonb_build_object('stoff', k), NULL, t, i,
  jsonb_build_object('stoff_text', t, 'kurzbezeichnung', c, 'leistungsstufen', 'nach ETAG 005/EAD 03 0350-00-0402 ¹', 'klimazonen', 'M, S', 'nutzungsdauer', 'W3', 'nutzlast', 'P4', 'dach_neigung', 'S1, S2, S3, S4', 'temperaturbestaendigkeit', 'TL3, TH3, TL4, TH4', 'einlage_min_g_m2', 110, 'schichtdicke_min_mm', 2.0, 'gedruckt', t || ' | ' || c || ' | Klimazonen: M, S · Nutzungsdauer: W3 · Nutzlast: P4 · (Dach-)Neigung: S1, S2, S3, S4 · Temperaturbeständigkeit: TL3, TH3, TL4, TH4 | ≥ 110 g/m² | ≥ 2,0 mm'),
  q
FROM regulation_tables, (VALUES
  ('UP', 'flexibles, ungesättigtes Polyesterharz', 'UP', 0, '2 flexibles, ungesättigtes Polyesterharz UP Klimazonen: M, S Nutzungsdauer: W3 Nutzlast: P4 (Dach-)Neigung: S1, S2, S3, S4 Temperaturbeständigkeit: TL3, TH3, TL4, TH4 ≥ 110 g/m² ≥ 2,0 mm'),
  ('PUR', 'flexibles Polyurethanharz', 'PUR 1K / PUR 2K', 1, '3 flexibles Polyurethanharz PUR 1K PUR 2K'),
  ('PMMA', 'flexibles Polymethylmethacrylatharz', 'PMMA', 2, '4 flexibles Polymethylmethacrylatharz PMMA')
) AS v(k, t, c, i, q)
WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB23'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

-- ---------------------------------------------------------------------------------------------------------------
-- Tab. 29 · Beispiele von Pflanzen mit aggressiven Wurzeln oder Rhizomen (§10.3, printed p. 125)
-- 15 printed rows (2–16), each with one helophyte/hydrophyte and one terrestrial species; zeile_nr = printed row number (order_index 0–14 = left column, 15–29 = right column).
-- ¹ Lythrum salicaria: "bildet keine Ausläufer; spitze Pfahlwurzel zu berücksichtigen" (footnote as printed)
-- ---------------------------------------------------------------------------------------------------------------
INSERT INTO regulation_tables (standard_code, edition, table_code, title_de, clause_reference, page_ref, key_columns, value_columns, override_policy, override_quote, verification_status)
VALUES ('FLL-GAR-2023', '2023-12', 'TAB29', 'Beispiele von Pflanzen mit aggressiven Wurzeln oder Rhizomen (Tab. 29)', '§10.3, Tab. 29', '125',
  ARRAY['art']::text[],
  '[{"name":"zeile_nr","type":"number"},{"name":"gruppe","type":"string"},{"name":"botanisch","type":"string"},{"name":"deutsch","type":"string"},{"name":"fussnote","type":"string"},{"name":"gedruckt","type":"string"}]'::jsonb,
  'locked', 'Bei Verwendung oder Vorhandensein derartiger Pflanzenarten sind über den Standardaufbau der Abdichtung hinausgehende bauliche Vorkehrungen, z. B. als Rhizom- und Wurzelsperre, zu treffen und besondere Pflegemaßnahmen vorzusehen.', 'md_verified')
ON CONFLICT (standard_code, edition, table_code) DO UPDATE SET title_de = EXCLUDED.title_de, clause_reference = EXCLUDED.clause_reference, page_ref = EXCLUDED.page_ref, key_columns = EXCLUDED.key_columns, value_columns = EXCLUDED.value_columns, override_policy = EXCLUDED.override_policy, override_quote = EXCLUDED.override_quote;
INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
SELECT id, k, jsonb_build_object('art', k), g, b || ' — ' || d, i, jsonb_build_object('zeile_nr', (i % 15) + 2, 'gruppe', g, 'botanisch', b, 'deutsch', d, 'fussnote', f, 'gedruckt', b || ' ' || d), ((i % 15) + 2)::text || ' ' || b || ' ' || d
FROM regulation_tables, (VALUES
  ('phragmites_australis', 'Helophyten und Hydrophyten', 'Phragmites australis', 'Gewöhnlicher Schilfrohr', NULL, 0),
  ('phalaris_arundinacea', 'Helophyten und Hydrophyten', 'Phalaris arundinacea', 'Rohr-Glanzgras', NULL, 1),
  ('cyperus_longus', 'Helophyten und Hydrophyten', 'Cyperus longus', 'Langes Zyperngras', NULL, 2),
  ('zizania_caduciflora', 'Helophyten und Hydrophyten', 'Zizania caduciflora', 'Asiatischer Wildreis', NULL, 3),
  ('spartina_pectinata', 'Helophyten und Hydrophyten', 'Spartina pectinata', 'Flechtgras', NULL, 4),
  ('glyceria_maxima', 'Helophyten und Hydrophyten', 'Glyceria maxima', 'Wasserschwaden', NULL, 5),
  ('bolboschoenus_maritimus', 'Helophyten und Hydrophyten', 'Bolboschoenus maritimus', 'Strandsimse', NULL, 6),
  ('scirpus_sylvaticus', 'Helophyten und Hydrophyten', 'Scirpus sylvaticus', 'Waldsimse', NULL, 7),
  ('schoenoplectus_lacustris', 'Helophyten und Hydrophyten', 'Schoenoplectus lacustris, S. tabernaemontani', 'Teichbinse', NULL, 8),
  ('equisetum', 'Helophyten und Hydrophyten', 'Equisetum-Arten, insb. E. hyemale', 'Schachtelhalm', NULL, 9),
  ('carex_riparia', 'Helophyten und Hydrophyten', 'Carex riparia, C. acutiformis und andere stark ausläufertreibende Seggen', 'Groß-Seggen', NULL, 10),
  ('lythrum_salicaria', 'Helophyten und Hydrophyten', 'Lythrum salicaria ¹', 'Gewöhnlicher Blutweiderich', '¹ bildet keine Ausläufer; spitze Pfahlwurzel zu berücksichtigen', 11),
  ('typha', 'Helophyten und Hydrophyten', 'Typha starkwachsende Arten', 'Rohrkolben', NULL, 12),
  ('nymphaea', 'Helophyten und Hydrophyten', 'Nymphaea stark wachsende Arten und Sorten', 'Seerosen', NULL, 13),
  ('nuphar', 'Helophyten und Hydrophyten', 'Nuphar-Arten', 'Teichrosen', NULL, 14),
  ('phyllostachys', 'Terrestrische Pflanzen', 'Phyllostachys spp. und andere rhizombildende Bambusse', 'Bambus', NULL, 15),
  ('prunus_spinosa', 'Terrestrische Pflanzen', 'Prunus spinosa', 'Schlehe', NULL, 16),
  ('pyracantha_coccinea', 'Terrestrische Pflanzen', 'Pyracantha coccinea', 'Feuerdorn', NULL, 17),
  ('hippophae_rhamnoides', 'Terrestrische Pflanzen', 'Hippophae rhamnoides', 'Sanddorn', NULL, 18),
  ('elaeagnus_commutata', 'Terrestrische Pflanzen', 'Elaeagnus commutata', 'Silber-Ölweide', NULL, 19),
  ('aralia_elata', 'Terrestrische Pflanzen', 'Aralia elata', 'Japanische Aralie', NULL, 20),
  ('aesculus_parviflora', 'Terrestrische Pflanzen', 'Aesculus parviflora', 'Strauch-Rosskastanie', NULL, 21),
  ('sorbaria', 'Terrestrische Pflanzen', 'Sorbaria sorbifolia, S. tomentosa', 'Fiederspiere', NULL, 22),
  ('rosa_auslaeufer', 'Terrestrische Pflanzen', 'Rosa ausläufertreibende Arten, z. B. R. rugosa', 'Rosen', NULL, 23),
  ('arundo_donax', 'Terrestrische Pflanzen', 'Arundo donax', 'Pfahlrohr', NULL, 24),
  ('mahonia_aquifolium', 'Terrestrische Pflanzen', 'Mahonia aquifolium', 'Mahonie', NULL, 25),
  ('symphoricarpos', 'Terrestrische Pflanzen', 'Symphoricarpos-Arten', 'Schneebeere', NULL, 26),
  ('spiraea_douglasii', 'Terrestrische Pflanzen', 'Spiraea douglasii', 'Silber-Spiere', NULL, 27),
  ('hydrangea_arborescens', 'Terrestrische Pflanzen', 'Hydrangea arborescens', 'Ball-Hortensie', NULL, 28),
  ('ammophila_arenaria', 'Terrestrische Pflanzen', 'Ammophila arenaria', 'Strandhafer', NULL, 29)
) AS v(k, g, b, d, f, i)
WHERE standard_code = 'FLL-GAR-2023' AND edition = '2023-12' AND table_code = 'TAB29'
ON CONFLICT (table_id, row_key) DO UPDATE SET keys = EXCLUDED.keys, group_label = EXCLUDED.group_label, label_de = EXCLUDED.label_de, order_index = EXCLUDED.order_index, row_values = EXCLUDED.row_values, verbatim_quote = EXCLUDED.verbatim_quote;

COMMIT;
