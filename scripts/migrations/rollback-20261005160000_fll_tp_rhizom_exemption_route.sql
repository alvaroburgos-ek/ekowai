-- ROLLBACK for 20261005160000_fll_tp_rhizom_exemption_route.sql = the original rollback-20260925115000 (branch feat/fll-field-na-structure), unchanged.
-- rollback-20260925115000-fll-wave-rhz-exemption-route.sql · reverts scripts/migrations/20260925115000_fll_wave_rhz_exemption_route.sql
-- 1. REQ-RHZ18-VERDICT / REQ-RHZ21-CONFORMITY: condition restored from compliance_requirements_archive_fll_wave, only while
--    the live row still carries the text this migration set (a later change is never clobbered); the archive rows are
--    deleted only where the restore succeeded (live condition equals the archived one); a skipped restore keeps its archive
--    row. Scoped to the two codes on FLLTP-RHZ-18 / -21, so archive rows of other fll-wave tasks are left untouched.
-- 2. The inserted warn gates REQ-RHZ03-INTENSIV and REQ-RHZ03-WERKSTOFF (final review I-2) are deleted (by template + code;
--    neither code exists in the baseline). The 'gup' value goes with the werkstoff_klasse field row (deleted in 6.).
-- 3. The appended value werkstoffspezifisch_rhizomfest is removed from final_rhizom_conformity (by value; not in the
--    baseline). A STORED final_rhizom_conformity = 'werkstoffspezifisch_rhizomfest' is NOT checked: look for it before
--    rolling back (it would be left without an option).
-- 4. visible_when reset to NULL on the 119 listed fields, only where it still equals 'nachweis_route == ''pruefung'''
--    (baseline: no visible_when column in prod ⇒ captured NULL).
-- 5. section_id reset to NULL on the 33 backfilled orphans, only where the field still sits in the section this migration
--    chose (baseline: section_id_is_null = true for all 33).
-- 6. The inserted fields werkstoff_klasse (RHZ-02), nachweis_route / nachweis_begruendung / intensive_bepflanzung (RHZ-03)
--    are deleted (by template + symbol; none exists in the baseline). A field DELETE fails on the project_parameters FK if
--    values were stored meanwhile: that aborts the whole rollback (no silent partial revert) — export / delete those values
--    first, deliberately.
BEGIN;
UPDATE compliance_requirements cr
   SET condition = a.condition
  FROM compliance_requirements_archive_fll_wave a, worksheet_templates w, standards s
 WHERE a.id = cr.id AND a.code IN ('REQ-RHZ18-VERDICT', 'REQ-RHZ21-CONFORMITY')
   AND w.id = a.worksheet_template_id AND w.code IN ('FLLTP-RHZ-18', 'FLLTP-RHZ-21') AND s.id = w.standard_id AND s.code = 'FLL-TP-RHIZOM-2023'
   AND cr.condition IN (
     'nachweis_route IS NOT NULL AND ((nachweis_route == ''pruefung'' AND final_rhizom_conformity == ''rhizomfest'') OR (nachweis_route == ''werkstoffspezifisch'' AND final_rhizom_conformity == ''werkstoffspezifisch_rhizomfest''))',
     'IF nachweis_route == ''pruefung'' THEN pruefergebnis_rhizomfest == ''rhizomfest''');
DELETE FROM compliance_requirements_archive_fll_wave a USING worksheet_templates w, standards s, compliance_requirements cr
 WHERE w.id = a.worksheet_template_id AND w.code IN ('FLLTP-RHZ-18', 'FLLTP-RHZ-21') AND s.id = w.standard_id AND s.code = 'FLL-TP-RHIZOM-2023'
   AND a.code IN ('REQ-RHZ18-VERDICT', 'REQ-RHZ21-CONFORMITY')
   AND cr.id = a.id AND cr.condition = a.condition;

DELETE FROM compliance_requirements cr
 USING worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.worksheet_template_id = w.id AND w.code = 'FLLTP-RHZ-03' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND cr.code IN ('REQ-RHZ03-INTENSIV', 'REQ-RHZ03-WERKSTOFF');

UPDATE fields f
   SET enum_values = (SELECT jsonb_agg(e ORDER BY (e->>'order_index')::int) FROM jsonb_array_elements(f.enum_values) e WHERE e->>'value' NOT IN ('werkstoffspezifisch_rhizomfest'))
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol = 'final_rhizom_conformity' AND w.code = 'FLLTP-RHZ-21' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.enum_values @> '[{"value":"werkstoffspezifisch_rhizomfest"}]'::jsonb;

UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('auftraggeber_kontakt', 'auftraggeber_name', 'pruefbericht_nr', 'pruefinstitut_name', 'pruefung_enddatum', 'pruefung_startdatum') AND w.code = 'FLLTP-RHZ-01' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('flaechenbedarf_pro_gefaess_m2', 'gewaechshaus_id', 'temp_lueftung_schwelle_C', 'temp_max_C', 'temp_nachts_C', 'temp_tagsueber_C') AND w.code = 'FLLTP-RHZ-04' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('anzahl_kontrollgefaesse', 'anzahl_pruefgefaesse', 'gefaess_innenmass_b_mm', 'gefaess_innenmass_h_mm', 'gefaess_innenmass_l_mm', 'gefaess_material', 'trennlage_eingebaut', 'trennlage_wasserdurchlaessig', 'wasserablauf_durchmesser_mm', 'widerlager_dicke_mm', 'widerlager_material') AND w.code = 'FLLTP-RHZ-05' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('vts_caco3_scheibler_prozent', 'vts_gesamt_dicke_mm', 'vts_k2o_cat_mg_l', 'vts_koernung', 'vts_n_cat_mg_l', 'vts_p2o5_cat_mg_l', 'vts_ph_cacl2', 'vts_salz_caso4_g_l', 'vts_salz_h2o_g_l') AND w.code = 'FLLTP-RHZ-06' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('duenger_chloridarm', 'duenger_k2o_prozent', 'duenger_mgo_prozent', 'duenger_n_prozent', 'duenger_p2o5_prozent', 'duenger_spurelemente_vorhanden', 'wasser_ammonium_mg_l', 'wasser_eisen_mg_l', 'wasser_haerte_mmol_l', 'wasser_leitfaehigkeit_uS_cm', 'wasser_mangan_mg_l', 'wasser_nitrat_mg_l', 'wasser_ortho_phosphat_mg_l', 'wasser_p_gesamt_mg_l', 'wasser_ph', 'wasser_saurekapazitaet_mmol_l') AND w.code = 'FLLTP-RHZ-07' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('testpflanze_art', 'testpflanze_container_format') AND w.code = 'FLLTP-RHZ-08' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('arbeitsfuge_zeitabstand_h', 'naht_anzahl_boden_eck', 'naht_anzahl_laengs_2_pruefmuster', 'naht_anzahl_t_naht', 'naht_anzahl_wand_eck', 'pruefmuster_2_versatz_grad', 'standrohr_durchmesser_mm', 'vts_obere_schicht_dicke_mm', 'vts_untere_schicht_dicke_mm') AND w.code = 'FLLTP-RHZ-09' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('kontroll_einbau_datum', 'kontroll_standrohr_eingebaut', 'kontroll_vts_dicke_oben_mm', 'kontroll_vts_dicke_unten_mm', 'kontroll_vts_einbau_methode') AND w.code = 'FLLTP-RHZ-10' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('anzahl_pflanzen_total', 'bepflanzung_datum', 'pflanzdichte_pro_gefaess', 'pflanzen_initial_zustand', 'pflanzung_methode') AND w.code = 'FLLTP-RHZ-11' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('duenger_gabe_g', 'duenger_intervall_monate', 'duenger_loesung_l', 'ersatz_pflanzen_periode_mon', 'halmschnitt_im_gruenen_zulaessig', 'wasserstand_max_ueber_vts_mm', 'wasserstand_min_unter_vts_mm') AND w.code = 'FLLTP-RHZ-12' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('bestandsdichte_p_avg_6mon', 'wuchsleistung_ausreichend') AND w.code = 'FLLTP-RHZ-13' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('auswertungs_datum_12mon', 'bestandsdichte_p_avg_12mon', 'kontrolle_p_avg_12mon', 'relativ_prozent_12mon', 'wuchsleistung_12mon_ausreichend') AND w.code = 'FLLTP-RHZ-14' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('auswertungs_datum_18mon', 'bestandsdichte_p_avg_18mon', 'kontrolle_p_avg_18mon', 'relativ_prozent_18mon', 'wuchsleistung_18mon_ausreichend') AND w.code = 'FLLTP-RHZ-15' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('bestandsdichte_p_avg_24mon', 'endauswertung_datum', 'kontrolle_p_avg_24mon', 'relativ_prozent_24mon', 'wuchsleistung_24mon_ausreichend') AND w.code = 'FLLTP-RHZ-16' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('fotos_dokumentiert', 'max_eindringtiefe_ueberlappung_mm', 'rhizomdurchdringung_flaeche_count', 'rhizomdurchdringung_naehte_count', 'rhizome_in_poren_count', 'rhizome_unter_5mm_bei_hemmstoff_count', 'rhizomeindringung_arbeitsfuge_count', 'rhizomeindringung_flaeche_count', 'rhizomeindringung_naehte_count', 'rueckstellproben_entnommen') AND w.code = 'FLLTP-RHZ-17' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('abbruchsgrund', 'pruefergebnis_rhizomfest') AND w.code = 'FLLTP-RHZ-18' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('attest_flltp_rhz_19_req_21', 'bericht_datum', 'bericht_seitenanzahl', 'gueltigkeitsdauer_jahre') AND w.code = 'FLLTP-RHZ-19' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('eidesstattliche_erklaerung_vorhanden', 'produkt_aktuell_im_lieferprogramm', 'pruefgrundlagen_unveraendert', 'rueckstellmuster_erneut_hinterlegt', 'verlangerung_zeitabschnitt_jahre') AND w.code = 'FLLTP-RHZ-20' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';
UPDATE fields f
   SET visible_when = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('bescheinigung_ausgestellt_durch', 'bescheinigung_ausstellung_datum', 'bescheinigung_gueltig_bis', 'bescheinigung_pruefnummer', 'pruefer_signatur_eingeholt') AND w.code = 'FLLTP-RHZ-21' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when = 'nachweis_route == ''pruefung''';

UPDATE fields f
   SET section_id = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'B'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('attest_flltp_rhz_01_req_02') AND w.code = 'FLLTP-RHZ-01' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id = ws.id;
UPDATE fields f
   SET section_id = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'C'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('scope_anwendungsbereich', 'scope_geltung_validiert', 'scope_pruefer_name', 'scope_pruefung_datum') AND w.code = 'FLLTP-RHZ-03' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id = ws.id;
UPDATE fields f
   SET section_id = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'C'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('kontroll_einbau_datum', 'kontroll_standrohr_eingebaut', 'kontroll_vts_dicke_oben_mm', 'kontroll_vts_dicke_unten_mm', 'kontroll_vts_einbau_methode') AND w.code = 'FLLTP-RHZ-10' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id = ws.id;
UPDATE fields f
   SET section_id = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'B'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('anzahl_pflanzen_total', 'bepflanzung_datum', 'pflanzen_initial_zustand', 'pflanzung_methode') AND w.code = 'FLLTP-RHZ-11' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id = ws.id;
UPDATE fields f
   SET section_id = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'D'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('auswertungs_datum_12mon', 'kontrolle_p_avg_12mon', 'relativ_prozent_12mon', 'wuchsleistung_12mon_ausreichend') AND w.code = 'FLLTP-RHZ-14' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id = ws.id;
UPDATE fields f
   SET section_id = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'D'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('auswertungs_datum_18mon', 'kontrolle_p_avg_18mon', 'relativ_prozent_18mon', 'wuchsleistung_18mon_ausreichend') AND w.code = 'FLLTP-RHZ-15' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id = ws.id;
UPDATE fields f
   SET section_id = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'D'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('endauswertung_datum', 'kontrolle_p_avg_24mon', 'relativ_prozent_24mon', 'wuchsleistung_24mon_ausreichend') AND w.code = 'FLLTP-RHZ-16' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id = ws.id;
UPDATE fields f
   SET section_id = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'F'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('attest_flltp_rhz_19_req_21') AND w.code = 'FLLTP-RHZ-19' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id = ws.id;
UPDATE fields f
   SET section_id = NULL
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'F'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('bescheinigung_ausgestellt_durch', 'bescheinigung_ausstellung_datum', 'bescheinigung_gueltig_bis', 'bescheinigung_pruefnummer', 'final_rhizom_conformity', 'pruefer_signatur_eingeholt') AND w.code = 'FLLTP-RHZ-21' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id = ws.id;

DELETE FROM fields f
 USING worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND w.code = 'FLLTP-RHZ-02' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.symbol IN ('werkstoff_klasse');
DELETE FROM fields f
 USING worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND w.code = 'FLLTP-RHZ-03' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.symbol IN ('nachweis_route', 'nachweis_begruendung', 'intensive_bepflanzung');
COMMIT;
