/**
 * FLL D-1 · task 2 — residual gate-condition-symbol parse (closes diagnostic §4.B-6).
 *
 * The D-1 diagnostic machine-checked every FLL EQUATION output/input symbol against
 * the prod active-field set and got `[]` (no missing-column). It explicitly left the
 * GATE-condition symbols un-parsed ("flagged as a residual check for 1b"). This test
 * closes that corner: it tokenizes every FLL `compliance_requirements.condition` with
 * the REAL evaluator tokenizer (src/lib/compliance/evaluate.ts internals, re-exported
 * for test), extracts the free symbol references (identifiers that the evaluator would
 * LOOK UP — i.e. not keywords, not membership/equality literals, not attest booleans),
 * and asserts each resolves to an active prod field in the SAME standard.
 *
 * The prod field set + condition set are frozen snapshots read live (read-only) from
 * `vadsmshzebefjreqcicl` on 2026-07-24 during the D-1 rerun (see fll-d1-rerun.md).
 * Freezing them keeps the test hermetic (no network) while still asserting the exact
 * prod reality the diagnostic verified.
 *
 * RESULT (asserted below): the ONLY condition identifiers that are not prod fields are
 * (a) enum VALUE tokens in membership/equality position (e.g. `mineralisch_ohne_zusatzstoffe`,
 * `type_III`, `submergent`, `phragmites_australis`), which are literals the evaluator
 * never looks up as symbols, and (b) natural-language prose in the 6 un-parseable
 * conditions the evaluator returns `manual` for. Zero genuine missing-column symbols.
 */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { extractConditionSymbols } from '@/lib/compliance/evaluate';

// ── frozen prod snapshot (read-only, 2026-07-24, project vadsmshzebefjreqcicl) ──
// active field symbols per FLL standard
const PROD_FIELDS: Record<string, Set<string>> = {
  'FLL-GAR-2023': new Set([
    'A','A_einzugsflaeche','abdichtungs_art','abnahme_datum','abschluss_anwendungsfall','alkalisilikat','alkalisilikat_type','anwendungsfall_concrete','anzahl_lagen','asph_bindemittel','asph_dicke','asph_kornverteilung','asph_nahttechnik','asph_verdichtungsgrad','attest_fll_gar_10_req_19','attest_fll_gar_10_req_21','attest_fll_gar_22_req_25','attest_fll_gar_25_req_26','ausfuehrungsbetrieb','bahn_bitumen','bahn_kunststoff_elastomer','bahn_material_naht','bahn_pe','bahnendicke_mm','baugrund_tragfaehig','baugrund_typ','bauherr','bauteil_type','bauteildicke_cm','bb_bahnentyp','bb_dicke','bb_lagen_anzahl','bb_nahtverbindung','bb_verlegeart','bb_zugfestigkeit','beckenform','beckenvolumen','bentonit_flaecheneinheit_g_m2','bentonit_type','bep_durchdringungen_anzahl','bep_einbauten_typen','bep_pflanzenarten','bep_rhizomfestigkeit_erforderlich','beta','beton_ausfuehrungsart','boeschungsneigung_ratio','C','ce_kennzeichnung_geprueft','compliance_verdict_final','d_D','d_Di','d_F','Delta_h_W','Delta_u','dichtigkeitsnachweis_required','druckfestigkeit_fck','eignungspruefung_durchgefuehrt','eisbildung_moeglich','exposition','feinkornanteil_063_pct','fk_armierung','fk_auftragsverfahren','fk_haftung_untergrund','fk_systemtyp','fk_trockenschichtdicke','fk_uv_bestaendigkeit','freibord_zu_bauwerk_cm','freibord_zu_gelaende_cm','fremdueberwachung_zertifikat','frosteinwirkung','fuegeverfahren','fuellhoehe_m','g_prime','gamma_A','gamma_D_prime','gamma_Di_prime','gamma_F_prime','gamma_w','gefaelle_percent','gewaesser_in_scope','gewaesser_tiefe_m','gewaesser_type','gewaesser_volumen_m3','groesstkorn_auflast_mm','gtd_auflast_funktion','gtd_polyolefin_beschichtung','gtd_schichtdicke_mm','gtd_ueberlappung_laengs_cm','gtd_ueberlappung_quer_cm','gup_biegefestigkeit','gup_glasfaser_anteil','gup_harztyp','gup_laminatdicke','gup_topcoat','gup_verarbeitung','hoechstwasserstand_m','hohlraumgehalt_asphaltbeton_vol_pct','ibn_befuellung_dauer','ibn_befuellung_methode','ibn_datum','ibn_dichtheit_bestanden','ibn_dichtheitspruefung_methode','inspektion_intervall_jahr','inst_inspektionsintervall','inst_protokollierung','inst_qualifikation_pruefer','inst_wartungsintervall','kalkgehalt_VCA','kf_abdichtung','konf_abdichtungssystem_gewaehlt','konf_alle_nachweise_bestanden','konf_bemerkungen','konf_freigabe_datum','kontrollpruefung_dokumentiert','kornanteil_unter_2micron','lbo_genehmigung_erforderlich','maengelfrist_5_jahre','mineralisch_bitumen','mineralisch_hydraulisch','mineralisch_mit_zusatzstoffen','mineralisch_ohne_zusatzstoffe','mit_bepflanzung','mz_dichtungswirkung_nachgewiesen','mz_dicke','mz_durchlaessigkeit_kf','mz_einbau_verdichtung','mz_zusatzstoff_anteil','mz_zusatzstofftyp','naht_pe_ueberlappung_mm','naht_ueberlappung_kunststoff_mm','nahtbreite_min_mm','nutzung_funktion','organische_substanz_VGL','pe_beanspruchung_klasse','peeh_dichte_g_cm3','peeh_mfr','peeh_russgehalt_pct','planer','polymerbitumen_beschichtung','project_code','project_date','project_name','Q_NOT','quellvermoegen_ml','r_5_100','r_5_5','rissklasse','schichtdicke_abdichtung_cm','schichtdicke_auflast_cm','setzungen_zu_erwarten','sl_drainage_erforderlich','sl_schutzlage_oben_flaechengewicht','sl_schutzlage_oben_typ','sl_schutzlage_unten_flaechengewicht','sl_schutzlage_unten_typ','sl_substratschicht_dicke','stahl_typ','standort_address','standortklasse','ueberlauf_position','umfang_oberkante','verbundwerkstoff_gtd','verdichtungsgrad_Dpr','verzinkung_dicke_um','wassereindringtiefe_geprueft','wassereinwirkungsklasse','wasserspiegelflaeche','wassertiefe_max','wasserzementwert','whg_einleitung_genehmigung','wurzel_rhizomfestigkeit_required','z_a','zementgehalt_kg_m3','zugang_wartung',
  ]),
  'FLL-Naturteich': new Set([
    'acceptance_date','acceptance_passed','aerobic_filtration_confirmed','area_separation_method','attest_fllnt_01_req_03','attest_fllnt_01_req_04','attest_fllnt_06_req_14','attest_fllnt_06_req_18','attest_fllnt_09_req_23','attest_fllnt_12_req_25','attest_fllnt_13_req_28','circulation_type','client_address','client_name','completion_notice_days_advance','compliance_verdict_overall','concrete_spec_compliant','consultation_checklist_completed','contractor_name','defects_noted','edge_design','edge_height_tolerance_mm','emersed','enclosure_provided','entry_exit_provision','equipment_elements_list','excavation_depth','existing_system','F_filter','filter_50x_rule_met','filter_colonized_surface_actual','filter_feed_rate_quick_qmin','filter_feed_rate_slow_qmax','filter_flow_direction','filter_flow_type','filter_frost_resistance','filter_grain_size_max','filter_kf','filter_layer_thickness','filter_layer_tolerance_pct','filter_substrate_elutable_p','filter_substrate_elutriated_pct','filter_substrate_oversize_pct','filter_volume_required','filter_water_column','freeboard_water_to_seal','grain_specific_surface','ground_covering_type','groundwater_level','h_filter','hydrobot_feed_rate','hydrobot_grain_size_max','hydrobot_substrate_thickness','hydrobot_type','hydrobot_water_column','inspection_frequency','intake_discharge_provided','intended_use_intensity','maintenance_contract_in_place','materials_biocide_free','natural_pool_type','operating_manual_provided','overflow_edge_length','overflow_horizontal_tolerance_mm','overflow_type','p_binding_required','phase_1_gate','phase_2_gate','phase_3_gate','phase_4_gate','phase_5_gate','phase_6_gate','physical_chemical_used','planner_name','planning_date','plant_density_marsh_medium_per_m2','plant_density_marsh_small_per_m2','plant_density_submerged_per_m2','plant_species_list','plant_substrate_compliant','planting_completion_date','pool_depth_max','pool_ground_area_m2','pool_submerged_wall_area_m2','pool_underwater_surface','pool_use_type','pre_maturity_care_provided','project_id','project_name','regeneration_area_m2','regeneration_area_share','regeneration_technique','repair_provisions','rigid_overflow_used','sealing_biocide_free_biofilm_ok','sealing_type','service_description_provided','site_address','splash_water_tank_volume','submergent','subsoil_type','supplementary_area_m2','swimming_area_m2','swimming_test_acid_capacity_ks43','swimming_test_ammonium','swimming_test_conductivity','swimming_test_hardness','swimming_test_nitrate','swimming_test_nitrite','swimming_test_orthophosphate','swimming_test_p_total','swimming_test_ph','total_pool_area_m2','treatment_impermissible_used','type_III','vertical_continuous_overflow','vertical_no_overflow','water_source','water_test_acid_capacity_ks43','water_test_ammonium','water_test_conductivity','water_test_hardness','water_test_iron','water_test_manganese','water_test_nitrate','water_test_orthophosphate','water_test_p_total','water_test_ph','wood_treatment_compliant',
  ]),
  'FLL-TP-RHIZOM-2023': new Set([
    'abbruchsgrund','abdichtungsart','anzahl_kontrollgefaesse','anzahl_pflanzen_total','anzahl_pruefgefaesse','arbeitsfuge_zeitabstand_h','attest_flltp_rhz_01_req_02','attest_flltp_rhz_19_req_21','auftraggeber_kontakt','auftraggeber_name','auswertungs_datum_12mon','auswertungs_datum_18mon','bepflanzung_datum','bericht_datum','bericht_seitenanzahl','bescheinigung_ausgestellt_durch','bescheinigung_ausstellung_datum','bescheinigung_gueltig_bis','bescheinigung_pruefnummer','bestandsdichte_k_avg','bestandsdichte_p_avg','bestandsdichte_p_avg_12mon','bestandsdichte_p_avg_18mon','bestandsdichte_p_avg_24mon','bestandsdichte_p_avg_6mon','dichte_relativ_prozent','duenger_chloridarm','duenger_gabe_g','duenger_intervall_monate','duenger_k2o_prozent','duenger_loesung_l','duenger_mgo_prozent','duenger_n_prozent','duenger_p2o5_prozent','duenger_spurelemente_vorhanden','eidesstattliche_erklaerung_vorhanden','endauswertung_datum','ersatz_pflanzen_periode_mon','final_rhizom_conformity','flaechenbedarf_pro_gefaess_m2','fotos_dokumentiert','fuegetechniken_angewandt','gefaess_innenmass_b_mm','gefaess_innenmass_h_mm','gefaess_innenmass_l_mm','gefaess_material','gesonderte_lage_eingebaut','gewaechshaus_id','gueltigkeitsdauer_jahre','halmschnitt_im_gruenen_zulaessig','hersteller_name','ist_bahnenartig','K_1','K_2','K_3','kontroll_einbau_datum','kontroll_standrohr_eingebaut','kontroll_vts_dicke_oben_mm','kontroll_vts_dicke_unten_mm','kontroll_vts_einbau_methode','kontrolle_p_avg_12mon','kontrolle_p_avg_18mon','kontrolle_p_avg_24mon','max_eindringtiefe_ueberlappung_mm','mehrschichtprodukt','naht_anzahl_boden_eck','naht_anzahl_laengs_2_pruefmuster','naht_anzahl_t_naht','naht_anzahl_wand_eck','P_1','P_2','P_3','P_4','P_5','P_6','P_7','P_8','pflanzdichte_pro_gefaess','pflanzen_initial_zustand','pflanzung_methode','produkt_aktuell_im_lieferprogramm','produktbezeichnung','pruefbericht_nr','pruefer_signatur_eingeholt','pruefergebnis_rhizomfest','pruefgrundlagen_unveraendert','pruefinstitut_name','pruefmuster_2_versatz_grad','pruefung_enddatum','pruefung_startdatum','relativ_prozent_12mon','relativ_prozent_18mon','relativ_prozent_24mon','rhizomdurchdringung_flaeche_count','rhizomdurchdringung_naehte_count','rhizome_in_poren_count','rhizome_unter_5mm_bei_hemmstoff_count','rhizomeindringung_arbeitsfuge_count','rhizomeindringung_flaeche_count','rhizomeindringung_naehte_count','rueckstellmuster_erneut_hinterlegt','rueckstellproben_entnommen','schutzschicht_definition','scope_anwendungsbereich','scope_einzelprodukt_bestaetigt','scope_geltung_validiert','scope_pruefer_name','scope_pruefung_datum','standrohr_durchmesser_mm','temp_lueftung_schwelle_C','temp_max_C','temp_nachts_C','temp_tagsueber_C','testpflanze_art','testpflanze_container_format','trennlage_eingebaut','trennlage_wasserdurchlaessig','verlangerung_zeitabschnitt_jahre','vts_caco3_scheibler_prozent','vts_gesamt_dicke_mm','vts_k2o_cat_mg_l','vts_koernung','vts_n_cat_mg_l','vts_obere_schicht_dicke_mm','vts_p2o5_cat_mg_l','vts_ph_cacl2','vts_salz_caso4_g_l','vts_salz_h2o_g_l','vts_untere_schicht_dicke_mm','wachstumshemmende_wirkstoffe','wasser_ammonium_mg_l','wasser_eisen_mg_l','wasser_haerte_mmol_l','wasser_leitfaehigkeit_uS_cm','wasser_mangan_mg_l','wasser_nitrat_mg_l','wasser_ortho_phosphat_mg_l','wasser_p_gesamt_mg_l','wasser_ph','wasser_saurekapazitaet_mmol_l','wasserablauf_durchmesser_mm','wasserstand_max_ueber_vts_mm','wasserstand_min_unter_vts_mm','widerlager_dicke_mm','widerlager_material','wuchsleistung_12mon_ausreichend','wuchsleistung_18mon_ausreichend','wuchsleistung_24mon_ausreichend','wuchsleistung_ausreichend',
  ]),
};

// every FLL compliance condition (frozen read-only 2026-07-24)
const CONDITIONS: { standard: string; req: string; condition: string }[] = [
  { standard: 'FLL-GAR-2023', req: 'REQ-02', condition: 'lbo_genehmigung_erforderlich IS NOT NULL' },
  { standard: 'FLL-GAR-2023', req: 'REQ-03', condition: 'whg_einleitung_genehmigung IS NOT NULL' },
  { standard: 'FLL-GAR-2023', req: 'REQ-01', condition: 'gewaesser_in_scope == true' },
  { standard: 'FLL-GAR-2023', req: 'REQ-04', condition: 'gewaesser_tiefe_m IS NOT NULL AND gewaesser_volumen_m3 IS NOT NULL AND nutzung_funktion IS NOT EMPTY AND hoechstwasserstand_m IS NOT NULL' },
  { standard: 'FLL-GAR-2023', req: 'REQ-05', condition: 'IF abdichtungs_art IN {bahn_bitumen,bahn_kunststoff_elastomer,fluessigkunststoff,bahn_pe} THEN wassereinwirkungsklasse IS NOT NULL AND rissklasse IS NOT NULL AND standortklasse IS NOT NULL' },
  { standard: 'FLL-GAR-2023', req: 'REQ-06', condition: 'if eisbildung_moeglich == true: documented ice-pressure protection' },
  { standard: 'FLL-GAR-2023', req: 'REQ-07', condition: 'setzungen_zu_erwarten IS NOT NULL AND baugrund_typ IS NOT EMPTY AND baugrund_tragfaehig IS NOT NULL' },
  { standard: 'FLL-GAR-2023', req: 'REQ-08', condition: 'Slope per Tab.1 row for chosen abdichtungs_art' },
  { standard: 'FLL-GAR-2023', req: 'REQ-09', condition: 'Engineer-judged selection traceable to Sec.4.7 criteria' },
  { standard: 'FLL-GAR-2023', req: 'REQ-10', condition: 'ce_kennzeichnung_geprueft == true' },
  { standard: 'FLL-GAR-2023', req: 'REQ-12', condition: 'IF abdichtungs_art == mineralisch_ohne_zusatzstoffe THEN kornanteil_unter_2micron >= 15 AND organische_substanz_VGL <= 5 AND kalkgehalt_VCA <= 15 AND kf_abdichtung <= 0.000000001 AND verdichtungsgrad_Dpr >= 97' },
  { standard: 'FLL-GAR-2023', req: 'REQ-13', condition: 'IF abdichtungs_art == mineralisch_mit_zusatzstoffen THEN mz_durchlaessigkeit_kf <= 0.000000001 AND mz_dichtungswirkung_nachgewiesen == true' },
  { standard: 'FLL-GAR-2023', req: 'REQ-14', condition: 'IF abdichtungs_art == mineralisch_hydraulisch THEN ((bauteildicke_cm <= 40 AND wasserzementwert <= 0.60 AND zementgehalt_kg_m3 >= 280) OR (bauteildicke_cm > 40 AND wasserzementwert <= 0.70))' },
  { standard: 'FLL-GAR-2023', req: 'REQ-15', condition: 'IF abdichtungs_art == mineralisch_bitumen THEN hohlraumgehalt_asphaltbeton_vol_pct <= 3' },
  { standard: 'FLL-GAR-2023', req: 'REQ-16', condition: 'IF abdichtungs_art == verbundwerkstoff_gtd THEN ((bentonit_type == "Na" AND bentonit_flaecheneinheit_g_m2 >= 3600 AND quellvermoegen_ml >= 24) OR (bentonit_type == "Ca" AND bentonit_flaecheneinheit_g_m2 >= 8000 AND quellvermoegen_ml >= 8)) AND gtd_ueberlappung_laengs_cm >= 30 AND gtd_ueberlappung_quer_cm >= 50' },
  { standard: 'FLL-GAR-2023', req: 'REQ-17', condition: 'IF abdichtungs_art == bahn_bitumen THEN anzahl_lagen >= 2' },
  { standard: 'FLL-GAR-2023', req: 'REQ-18', condition: 'IF abdichtungs_art == bahn_kunststoff_elastomer THEN bahnendicke_mm >= 1.2' },
  { standard: 'FLL-GAR-2023', req: 'REQ-19', condition: 'attest_fll_gar_10_req_19 == True' },
  { standard: 'FLL-GAR-2023', req: 'REQ-20', condition: 'IF abdichtungs_art == bahn_pe THEN peeh_dichte_g_cm3 > 0.940 AND peeh_mfr >= 1.0 AND peeh_mfr <= 3.0 AND peeh_russgehalt_pct >= 2 AND peeh_russgehalt_pct <= 3' },
  { standard: 'FLL-GAR-2023', req: 'REQ-21', condition: 'attest_fll_gar_10_req_21 == True' },
  { standard: 'FLL-GAR-2023', req: 'REQ-22', condition: 'IF abdichtungs_art == alkalisilikat THEN schichtdicke_abdichtung_cm >= 25 AND feinkornanteil_063_pct >= 20' },
  { standard: 'FLL-GAR-2023', req: 'REQ-11', condition: 'If required and abdichtung not inherently resistant: separate Wurzelschutzbahn' },
  { standard: 'FLL-GAR-2023', req: 'REQ-23', condition: 'freibord_zu_gelaende_cm >= 5 AND freibord_zu_bauwerk_cm >= 30' },
  { standard: 'FLL-GAR-2023', req: 'REQ-24', condition: 'Engineer-judged adequacy of protective layers' },
  { standard: 'FLL-GAR-2023', req: 'REQ-25', condition: 'attest_fll_gar_22_req_25 == True' },
  { standard: 'FLL-GAR-2023', req: 'REQ-26', condition: 'attest_fll_gar_25_req_26 == True' },
  { standard: 'FLL-GAR-2023', req: 'REQ-27', condition: 'abnahme_datum IS NOT NULL' },
  { standard: 'FLL-GAR-2023', req: 'REQ-28', condition: 'ibn_datum IS NOT NULL AND ibn_befuellung_methode IS NOT EMPTY' },
  { standard: 'FLL-GAR-2023', req: 'REQ-29', condition: 'inspektion_intervall_jahr <= 1' },
  { standard: 'FLL-GAR-2023', req: 'REQ-30', condition: 'compliance_verdict_final in {compliant, compliant_with_conditions}' },
  { standard: 'FLL-Naturteich', req: 'REQ-01', condition: 'pool_use_type IN {private_single_household,private_multi_household}' },
  { standard: 'FLL-Naturteich', req: 'REQ-02', condition: 'consultation_checklist_completed == true' },
  { standard: 'FLL-Naturteich', req: 'REQ-03', condition: 'attest_fllnt_01_req_03 == True' },
  { standard: 'FLL-Naturteich', req: 'REQ-04', condition: 'attest_fllnt_01_req_04 == True' },
  { standard: 'FLL-Naturteich', req: 'REQ-05', condition: 'operating_manual_provided == true' },
  { standard: 'FLL-Naturteich', req: 'REQ-06', condition: 'natural_pool_type IN {type_I,type_II,type_III,type_IV,type_V}' },
  { standard: 'FLL-Naturteich', req: 'REQ-07', condition: 'IF natural_pool_type IN {type_I, type_II} THEN regeneration_area_share > 50 AND IF natural_pool_type == type_III THEN regeneration_area_share > 30' },
  { standard: 'FLL-Naturteich', req: 'REQ-09', condition: 'water_test_ammonium <= 0.5 AND water_test_iron <= 0.2 AND water_test_p_total <= 0.03 AND water_test_hardness >= 1.0 AND water_test_conductivity <= 1000 AND water_test_manganese <= 0.05 AND water_test_nitrate <= 50.0 AND water_test_orthophosphate <= 0.01 AND water_test_ph >= 6.0 AND water_test_ph <= 9.0 AND water_test_acid_capacity_ks43 >= 2' },
  { standard: 'FLL-Naturteich', req: 'REQ-10', condition: 'swimming_test_ammonium <= 0.3 AND swimming_test_hardness >= 1.0 AND swimming_test_conductivity <= 1000 AND swimming_test_nitrate <= 30.0 AND swimming_test_nitrite <= 0.01 AND swimming_test_ph >= 7.0 AND swimming_test_ph <= 9.0 AND swimming_test_acid_capacity_ks43 >= 2 AND (IF natural_pool_type IN {type_I,type_II,type_III} THEN (swimming_test_p_total <= 0.03 AND swimming_test_orthophosphate <= 0.03)) AND (IF natural_pool_type IN {type_IV,type_V} THEN (swimming_test_p_total <= 0.01 AND swimming_test_orthophosphate <= 0.01))' },
  { standard: 'FLL-Naturteich', req: 'REQ-11', condition: 'concrete_spec_compliant == true AND wood_treatment_compliant == true AND materials_biocide_free == true AND plant_substrate_compliant == true' },
  { standard: 'FLL-Naturteich', req: 'REQ-12', condition: 'filter_substrate_elutable_p <= 5' },
  { standard: 'FLL-Naturteich', req: 'REQ-13', condition: 'total_pool_area_m2 IS NOT NULL AND regeneration_area_m2 IS NOT NULL AND swimming_area_m2 IS NOT NULL' },
  { standard: 'FLL-Naturteich', req: 'REQ-14', condition: 'attest_fllnt_06_req_14 == True' },
  { standard: 'FLL-Naturteich', req: 'REQ-15', condition: 'area_separation_method IS NOT EMPTY' },
  { standard: 'FLL-Naturteich', req: 'REQ-16', condition: 'sealing_type IS NOT NULL' },
  { standard: 'FLL-Naturteich', req: 'REQ-17', condition: 'edge_design IS NOT EMPTY' },
  { standard: 'FLL-Naturteich', req: 'REQ-18', condition: 'attest_fllnt_06_req_18 == True' },
  { standard: 'FLL-Naturteich', req: 'REQ-31', condition: 'freeboard_water_to_seal >= 5 AND edge_height_tolerance_mm <= 10' },
  { standard: 'FLL-Naturteich', req: 'REQ-32', condition: 'sealing_biocide_free_biofilm_ok == true' },
  { standard: 'FLL-Naturteich', req: 'REQ-08', condition: "if filter_flow_type == 'slow' then p_binding_required == true" },
  { standard: 'FLL-Naturteich', req: 'REQ-19', condition: 'hydrobot_grain_size_max <= 8 AND hydrobot_feed_rate <= 5 AND (IF hydrobot_type == submergent THEN (hydrobot_water_column >= 80 AND hydrobot_substrate_thickness >= 10 AND hydrobot_substrate_thickness <= 20)) AND (IF hydrobot_type == emersed THEN (hydrobot_water_column >= 10 AND hydrobot_water_column <= 50 AND hydrobot_substrate_thickness >= 10 AND hydrobot_substrate_thickness <= 30))' },
  { standard: 'FLL-Naturteich', req: 'REQ-20', condition: '(IF filter_flow_direction IN {vertical_continuous_overflow, vertical_no_overflow} THEN (filter_layer_thickness >= 40 AND filter_grain_size_max <= 16 AND filter_substrate_oversize_pct <= 15 AND filter_substrate_elutriated_pct <= 2 AND filter_frost_resistance == true AND filter_layer_tolerance_pct <= 10 AND filter_kf >= 0.0001)) AND (IF filter_flow_direction == vertical_continuous_overflow THEN (filter_water_column >= 10 AND filter_feed_rate_slow_qmax <= 5)) AND (IF filter_flow_direction == vertical_no_overflow THEN filter_feed_rate_slow_qmax <= 8)' },
  { standard: 'FLL-Naturteich', req: 'REQ-21', condition: 'IF filter_flow_direction IN {vertical_continuous_overflow,vertical_no_overflow} THEN (filter_layer_thickness >= 50 AND filter_grain_size_max <= 32 AND filter_substrate_oversize_pct <= 15 AND filter_substrate_elutriated_pct <= 0.5 AND filter_frost_resistance == true AND filter_layer_tolerance_pct <= 10 AND filter_kf >= 0.001 AND filter_feed_rate_quick_qmin >= 15)' },
  { standard: 'FLL-Naturteich', req: 'REQ-23', condition: 'attest_fllnt_09_req_23 == True' },
  { standard: 'FLL-Naturteich', req: 'REQ-24', condition: 'IF physical_chemical_used == true THEN NOT (regeneration_technique IN {physical_chemical})' },
  { standard: 'FLL-Naturteich', req: 'REQ-33', condition: 'IF rigid_overflow_used == true THEN splash_water_tank_volume >= 150 * pool_underwater_surface' },
  { standard: 'FLL-Naturteich', req: 'REQ-22', condition: 'filter_50x_rule_met == true' },
  { standard: 'FLL-Naturteich', req: 'REQ-30', condition: 'aerobic_filtration_confirmed == true' },
  { standard: 'FLL-Naturteich', req: 'REQ-29', condition: 'treatment_impermissible_used == false' },
  { standard: 'FLL-Naturteich', req: 'REQ-25', condition: 'attest_fllnt_12_req_25 == True' },
  { standard: 'FLL-Naturteich', req: 'REQ-26', condition: 'acceptance_passed == true OR defects_noted IS EMPTY' },
  { standard: 'FLL-Naturteich', req: 'REQ-28', condition: 'attest_fllnt_13_req_28 == True' },
  { standard: 'FLL-Naturteich', req: 'REQ-27', condition: 'maintenance_contract_in_place == true' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-01', condition: 'abdichtungsart IN {bitumen,kunststoff,elastomer,fluessig,gussasphalt,gup} AND scope_einzelprodukt_bestaetigt == true' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-02', condition: 'attest_flltp_rhz_01_req_02 == True' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-03', condition: 'wachstumshemmende_wirkstoffe != null' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-04', condition: 'mehrschichtprodukt == false OR (schutzschicht_definition != null)' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-05', condition: 'temp_tagsueber_C >= 15 AND temp_tagsueber_C <= 21 AND temp_nachts_C >= 13 AND temp_nachts_C <= 19 AND temp_lueftung_schwelle_C >= 19 AND temp_lueftung_schwelle_C <= 25 AND temp_max_C <= 35' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-06', condition: 'gefaess_innenmass_l_mm >= 800 AND gefaess_innenmass_b_mm >= 800 AND gefaess_innenmass_h_mm >= 250 AND anzahl_pruefgefaesse == 8 AND anzahl_kontrollgefaesse == 3 AND wasserablauf_durchmesser_mm == 40 AND widerlager_dicke_mm >= 9 AND widerlager_dicke_mm <= 11' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-07', condition: 'vts_ph_cacl2 >= 6.0 AND vts_ph_cacl2 <= 7.5 AND vts_salz_h2o_g_l <= 1.0 AND vts_salz_caso4_g_l <= 0.5 AND vts_n_cat_mg_l <= 50 AND vts_p2o5_cat_mg_l <= 25 AND vts_k2o_cat_mg_l <= 100 AND vts_caco3_scheibler_prozent >= 1 AND vts_caco3_scheibler_prozent <= 10' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-08', condition: 'duenger_chloridarm == true AND duenger_spurelemente_vorhanden == true' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-09', condition: 'wasser_ammonium_mg_l <= 0.5 AND wasser_eisen_mg_l <= 0.2 AND wasser_p_gesamt_mg_l <= 0.03 AND wasser_haerte_mmol_l >= 1.0 AND wasser_leitfaehigkeit_uS_cm <= 1000.0 AND wasser_mangan_mg_l <= 0.05 AND wasser_nitrat_mg_l <= 50.0 AND wasser_ortho_phosphat_mg_l <= 0.01 AND wasser_ph >= 6.0 AND wasser_ph <= 9.0 AND wasser_saurekapazitaet_mmol_l >= 2.0' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-10', condition: "testpflanze_art == 'phragmites_australis' AND pflanzdichte_pro_gefaess == 8" },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-11', condition: 'ist_bahnenartig == false OR (naht_anzahl_wand_eck >= 4 AND naht_anzahl_boden_eck >= 2 AND naht_anzahl_t_naht >= 1 AND naht_anzahl_laengs_2_pruefmuster >= 2 AND pruefmuster_2_versatz_grad == 45)' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-12', condition: 'ist_bahnenartig == true OR arbeitsfuge_zeitabstand_h >= 12' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-13', condition: 'vts_untere_schicht_dicke_mm >= 15 AND vts_untere_schicht_dicke_mm <= 25 AND vts_obere_schicht_dicke_mm >= 145 AND vts_obere_schicht_dicke_mm <= 155' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-14', condition: 'wasserstand_max_ueber_vts_mm == 20 AND wasserstand_min_unter_vts_mm == 50 AND duenger_intervall_monate == 1 AND duenger_gabe_g == 5 AND duenger_loesung_l == 20 AND ersatz_pflanzen_periode_mon <= 3 AND halmschnitt_im_gruenen_zulaessig == false' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-16', condition: 'bestandsdichte_p_avg_12mon >= 120 AND dichte_relativ_prozent >= 80' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-17', condition: 'bestandsdichte_p_avg_18mon >= 160 AND dichte_relativ_prozent >= 80' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-15', condition: 'bestandsdichte_p_avg_6mon >= 80 AND dichte_relativ_prozent >= 80' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-18', condition: 'bestandsdichte_p_avg_24mon >= 160 AND dichte_relativ_prozent >= 80' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-19', condition: 'rhizomeindringung_flaeche_count == 0 AND rhizomeindringung_naehte_count == 0 AND rhizomeindringung_arbeitsfuge_count == 0' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-20', condition: 'rhizomdurchdringung_flaeche_count == 0 AND rhizomdurchdringung_naehte_count == 0' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-21', condition: 'attest_flltp_rhz_19_req_21 == True' },
  { standard: 'FLL-TP-RHIZOM-2023', req: 'REQ-22', condition: 'pruefgrundlagen_unveraendert == true AND produkt_aktuell_im_lieferprogramm == true AND rueckstellmuster_erneut_hinterlegt == true AND eidesstattliche_erklaerung_vorhanden == true' },
];

describe('FLL gate-condition-symbol parse (D-1 task 2) — every looked-up gate symbol backs a prod field', () => {
  it('extracts free symbols with the REAL evaluator and finds ZERO missing-column across all 3 FLL standards', () => {
    const missing: { standard: string; req: string; symbol: string }[] = [];
    let parsed = 0;
    let manual = 0;
    for (const c of CONDITIONS) {
      const syms = extractConditionSymbols(c.condition);
      if (syms === null) { manual++; continue; } // un-parseable prose → evaluator returns `manual`
      parsed++;
      const fields = PROD_FIELDS[c.standard];
      for (const s of syms) {
        if (!fields.has(s)) missing.push({ standard: c.standard, req: c.req, symbol: s });
      }
    }
    // Raw diagnostics for the deliverable.
    // eslint-disable-next-line no-console
    console.log(`[gate-symbol-parse] conditions=${CONDITIONS.length} parsed=${parsed} manual(prose)=${manual} missing-column=${missing.length}`);
    if (missing.length) {
      // eslint-disable-next-line no-console
      console.log('[gate-symbol-parse] MISSING:', JSON.stringify(missing, null, 2));
    }
    expect(missing).toEqual([]);
  });

  it('the un-parseable conditions are exactly the known natural-language prose gates', () => {
    const manualReqs = CONDITIONS.filter((c) => extractConditionSymbols(c.condition) === null).map((c) => `${c.standard}:${c.req}`);
    // eslint-disable-next-line no-console
    console.log('[gate-symbol-parse] manual(prose):', JSON.stringify(manualReqs));
    // These are the documented un-encoded/prose gates (M2 findings), NOT missing-column.
    expect(manualReqs.sort()).toEqual([
      'FLL-GAR-2023:REQ-06', // "if …: documented ice-pressure protection"
      'FLL-GAR-2023:REQ-08', // "Slope per Tab.1 row for chosen abdichtungs_art"
      'FLL-GAR-2023:REQ-09', // "Engineer-judged selection traceable to Sec.4.7"
      'FLL-GAR-2023:REQ-11', // "If required and abdichtung not inherently resistant: …"
      'FLL-GAR-2023:REQ-24', // "Engineer-judged adequacy of protective layers"
    ].sort());
  });
});
