#!/usr/bin/env node
// Generator for dwa-a-272e-md-verification-pack.sql + rollback (md-verified pass, 2026-09-05 tag).
// Quotes are VERBATIM from C:\Users\Ekowai\Desktop\Guidelines\DWA-A-272E\DWA-A_272E (1).md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const J = JSON.parse(fs.readFileSync('C:/Users/Ekowai/AppData/Local/Temp/claude/C--Users-Ekowai/521e3f3a-2033-49ca-827b-4adef8491545/scratchpad/fields-DWA-A-272E.json', 'utf8'));
const q = (s) => s.replace(/'/g, "''");

// ---------------------------------------------------------------------------
// Re-used verbatim runs from the md (line numbers of the transcript in comments)
// ---------------------------------------------------------------------------
const T5CAP = 'Table 5: Comparison of population-specific volume flows and loads';
const T5_VOL = 'Volume & $\\mathrm{l} /(\\mathrm{E} \\cdot \\mathrm{d})$ & 1,5 & - ${ }^{31}$ & 8-50 ${ }^{41}$ & - & 75 & - ${ }^{31}$ & 150';
const T5_BOD = '$\\mathrm{BOD}_{5}$ & g/(E\u2022d) & 5 & 9 \\% & 37 & 67 \\% & 18 & 33 \\% & 60';
const T5_COD = 'COD & $\\mathrm{g} /(\\mathrm{E} \\cdot \\mathrm{d})$ & 10 & 10 \\% & 50 & 52 \\% & 47 & 48 \\% & 120';
const T5_TS = 'TS & $\\mathrm{g} /(\\mathrm{E} \\cdot \\mathrm{d})$ & - & - & 61 & 82 \\% & 13 & 18 \\% & 70';
const T5_N = 'N & $\\mathrm{g} /(\\mathrm{E} \\cdot \\mathrm{d})$ & 11 & 85 \\% & 12 & 92 \\% & 1 & 8 \\% & 11';
const T5_P = 'P & g/(E\u2022d) & 1,0 & 50 \\% & 1,5 & 75 \\% & 0,5 & 25 \\% & 1,8';
const T5_FN3 = '3) The percentages are given depending on the toilet technology used. In dry toilets no flush water is required and the greywater fraction makes up almost the entire wastewater volume. In case flush toilets are used, the yellow- and brownwater fractions increases and the greywater fraction decreases. The average flushing water requirement is given in BDEW (2011) as $33 \\mathrm{l} /(\\mathrm{E} \\mathrm{d})$.';
const T5_FN12 = 'Notes | 1) Median values, modified values from (DWA 2008). | 2) 85-percentile';
const T5_FN4 = '4) Large fluctuation range depending on the sanitation technology used.';

const EPOP = 'For the design practice, the type of building objects is particularly relevant. Essentially, there are three types of use: residential (can be further differentiated between permanent and temporary living), working and buildings with public access. These are recorded with the population equivalent of an object, e.g. due to typical occupancies or visitor frequencies and specific toilet uses.';
const DELINEATE = 'This not only serves to accept possible solutions, but also to consolidate and delineate the planning area, which, due to the different spatial levels of new sanitation systems, can expand beyond the property boundary into the private sphere.';
const SEVERAL = 'If several of the favourable conditions are met in a specific case, the implementation of NASS should be examined in the planning process.';
const T4CAP = 'Table 4: Promoting and aggravating conditions for the integration of NASS | & Favorable conditions & Aggravating conditions';
const T1CAP = 'Table 1: Subdivision of wastewater infrastructure systems into system groups';
const T2CAP = 'Table 2: Main products obtainable from NASS and relevant feedstock flows';
const T3CAP = 'Table 3: Selected treatment options for different material flows and treatment objective according to the DWA-Topics "New Alternative Sanitation Systems" (DWA 2008)';
const T6CAP = 'Table 6: Criteria list for the assessment of sanitation systems';
const TRANSPORT = 'In principle, the following transport systems are available for the diversion of the various wastewater streams: I gravity sewer systems, I vacuum systems, I pressure sewer systems, I no-sewer systems with collecting tank(s).';
const COLLECT = 'The separate collection of yellow- and brownwater is carried out via urine diverting toilets (gravity or vacuum technology). Conventional urinals can also be used to separate the flow of yellowwater. Blackwater is collected by flushing or vacuum toilets. Collection of urine and faeces is usually carried out by means of urine diverting toilets and waterless urinals. Faeces are only captured via dry toilets.';
const DIM_INTRO = 'For the dimensioning of the respective treatment processes, the following aspects for individual, separate collected wastewater streams must be taken into account:';
const HORIZON = 'Planning horizon: The selection of a uniform planning horizon requires great care when different alternatives of sanitation options are to be compared. [...] Typical planning horizons should be 30 to 50 years, but may also be 50 to 100 years if sewer systems are included. However, for isolated applications, the planning horizon may be only a period of 10 to 20 years.';
const METHODS = 'A distinction can be made between evaluation methods that focus on specific criteria (life cycle assessment or economic effects) that group many effects into one indicator (utility analysis ${ }^{4)}$ ), benefit-cost analysis ${ }^{51}$ or that consider many different criteria without aggregating them into one value (MAUT procedure ${ }^{61}$ ).';
const TRINKW_OBS = 'NASS can contribute in many ways to reducing specific drinking water requirements, in particular by reusing treated water or by using negative pressure technology to remove blackwater. However, the specifications of the Drinking Water Ordinance (TrinkwV) and other legal and technical regulations (e.g. fbr H 201) must be observed.';
const BASELINE = '(3) Basic research and (4) Evaluation of existing assets | Due to the newly developed and the novel combination of existing/new technical components, it will generally be necessary to quantitatively expand and qualitatively differentiate the existing baseline determination in the field of urban water management (e.g. separate collected wastewater flows) (see Section 6).';
const SELECT_SOL = 'Parallel to the urban design of a new development area or the demarcation of an existing area in which NASS are to be implemented, the development of different technical solutions takes place. [...] By assessing local conditions and constraints the appropriate solution that fits local requirements is selected.';
const LEGAL_LIST = 'When implementing NASS, there are a large number of regulations, ordinances and technical standards that currently affect the needs of these systems and must therefore be taken into account in planning. The most important regulations include: I Federal Water Act, I Closed Substance Cycle Waste Management Act, I Communal law, I Drinking Water Ordinance, l Construction Law, l Fertilizer Act/Fertilizers Application Ordinance.';
const KRWG = 'An essential practical application prerequisite for NASS is the clarification of whether the substance streams or derivatives to be treated are subject to wastewater law or recycling and waste legislation. This also includes the classification of a material as waste, product (e.g.fertilizer) or by-product.';
const DUENG = 'NASS produce substrates that can be used as fertilizers. The use of such a product is then subject to the requirements of the fertilizer regulations. Products from NASS are not explicitly mentioned, but depending on their quality they correspond with fertilizers according to § 2 Abs. 1 Fertilizer Act (DüngG). For the application of these substances, the requirements of the Fertilizer Application Ordinance must be met in accordance with § 3 (1) sentence 2 DüngG.';
const T5_GUIDE = 'If measurements are not possible, Table 5 can be used as a guide for the estimation of loads and volumes. The discharge volumes of the corresponding yellow-, brown- and blackwaters result from the values indicated in Table 5 and the flush water demand of the collection systems (WC, urinals).';
const VACUUM = 'Especially in the case of collecting blackwater via a vacuum system, possible ammonium stripping, increased corrosiveness or precipitation must be taken into account.';
const SENSI = 'I Uncertainties in the evaluation of the criteria: These include uncertainties in the costs or turnover rates inherent in a novel technology system. Classical methods such as sensitivity analysis can be applied to assess and integrate these uncertainties into the analysis.';
const SCEN = 'I Uncertainties in the future: The determination of the value functions and the evaluation of the criteria always takes place in relation to an environment. [...] By applying scenario and foresight processes, such uncertainties can be systematically included in the evaluation process.';

// ---------------------------------------------------------------------------
// field symbol -> [ verbatim quote, printed page, clause label, extra caveat ]
// ---------------------------------------------------------------------------
const Q = {
  // ---- A272E-01 Projektregistrierung -------------------------------------
  rationale_documented: ['At the beginning of the planning process, a detailed analysis of the problem situation and local framework conditions should be carried out.', '28', '§9.1(1)'],
  E_population: [EPOP, '20', '§6.1'],
  building_use_type: [EPOP, '20', '§6.1'],
  nass_rationale: ['NASS can be used as a planning alternative to conventional wastewater collection/drainage and treatment concepts for new developments and existing settlement structures or as an alternative to conventional refurbishment measures used for existing, over- or under-utilized systems.', '15', '§5.1'],

  // ---- A272E-02 Abgrenzung des Planungsgebiets ---------------------------
  planning_area_classification: [DELINEATE, '28', '§9.1(1)-(2)', 'the urban/peri-urban/rural/mixed granularity is EKOWAI\'s; the source only obliges delineation'],
  planning_area_size: [DELINEATE, '28', '§9.1(1)-(2)', 'the hectare figure is project data; the source only obliges delineation'],
  planning_area_set: [DELINEATE, '28', '§9.1(1)-(2)'],
  planning_area_admin_scope: ['Another essential point for the implementation of NASS is the clarification of compulsory connection and use. This is stipulated in the statutes for sewage disposal in the municipalities for the respective development area.', '26', '§8 Communal law'],
  planning_area_public: [DELINEATE, '28', '§9.1(1)-(2)'],
  planning_area_private: [DELINEATE, '28', '§9.1(1)-(2)'],
  property_count: ['A subsequent change of the development in existing areas cannot be enforced; it can only be approached in cooperation with the property owners and secured in urban development contracts.', '27', '§8 Construction Law'],
  residential_PE: [EPOP, '20', '§6.1'],
  commercial_PE: ['Depending on the existing catchment area, the ratio of municipal to commercial/industrial wastewater can be significantly changed when implementing new sanitation systems.', '19', '§5.2'],

  // ---- A272E-03 NASS-Anwendbarkeits-Screening ----------------------------
  aggravating_conditions_count: [T4CAP, '15', '§5.1 Table 4'],
  favourable_conditions_count: [SEVERAL, '17', '§5.1'],
  dominant_favourable_dimensions: ['Table 4 summarizes both important favourable conditions and aggravating conditions for the integration of NASS. In addition to technical aspects, the economic and ecological framework, organizational and institutional prerequisites determine the integration of innovative sanitation systems.', '15', '§5.1'],
  dominant_aggravating_dimensions: ['Table 4 summarizes both important favourable conditions and aggravating conditions for the integration of NASS. In addition to technical aspects, the economic and ecological framework, organizational and institutional prerequisites determine the integration of innovative sanitation systems.', '15', '§5.1'],
  key_constraints_identified: ['These encouraging or aggravating conditions include aspects of economics and ecology, organizational and institutional prerequisites, and social aspects (see Table 4). These should be checked at the beginning of the planning process in order to establish the further steps in the planning process in the case NASS are considered and to make sure that the special requirements for NASS are included in the planning process.', '28', '§9.1(1)-(2)'],
  examine_NASS: [SEVERAL, '17', '§5.1', 'the encoded threshold favourable_conditions_count >= 1 is NOT printed — the source word is "several" (see STAGED file)'],

  // ---- A272E-04 Terminologie und Definitionen ----------------------------
  term_products_definition: ['Products | Here: Usable materials and energy won from the use of NASS and consequent treatment', '8', '§3'],
  term_NASS_definition: ['New Alternative Sanitation Systems (NASS) | Sanitation systems with extensive closure of material and water flows for the recycling of valuable resources', '8', '§3'],
  material_flow_class: ['In the following, the relevant material flows from the domestic/municipal sector, which are used in the context of this Standard, are defined. | Service water | Water with different quality characteristics, if drinking water quality is not required | Bio-waste | Biodegradable solids, e.g. B. garden waste, food and leftovers | Brownwater | Faeces with flush water | Faecal matter | Urine and faeces | Faeces | Faeces without flush water | Yellowwater | Urine with flush water', '8', '§3'],
  attest_a272e_04_comp_24: [KRWG, '26', '§8 KrWG'],
  attest_a272e_04_comp_25: [DUENG, '27', '§8 Fertilizer Act/Fertilizers Application Ordinance'],

  // ---- A272E-05 Auswahl der Systemgruppe ---------------------------------
  system_group: [T1CAP + ' | "One material flow" system & no separation of material flows, combined drainage & wastewater | „Two material flows” system & separate collection of grey- and blackwater & greywater, blackwater | „Two material flows“ system (UDT) & separate collection of urine or yellowwater and combined drainage of other partial streams & urine or yellowwater, mixture of brownand greywater | „Three material flows" system (UDT) & separate collection of urine or yellowwater, brown-and greywater & urine or yellowwater, brownwater, greywater | „Two material flows” system (dry toilet) & separate collection of greywater and faecal matter & greywater, faecal matter | „Three material flows" system (UDDT) & separate collection of urine and faeces as well as greywater & urine, faeces, greywater', '11', '§4.2 Table 1'],
  separation_at_source: ['The overall objectives of NASS are the recycling of resources and the best possible closure of material and water loops. NASS is therefore based on the separate collection of domestic/municipal material flows directly at the point of origin.', '9', '§4.1'],
  urine_diverted: ['In the „two material flows“ system (urine diverting toilet - UDT, no-mix toilet), yellowwater or urine is collected and treated separately frombrown and greywater. Because of the low volume flow and high nutrient content of urine, the system is characterized by a high nutrient recovery potential.', '10', '§4.2'],
  brown_grey_separated: ['A characteristic feature of the „three material flows“ system (UDT) is also the diversion of yellowwater or urine from the remaining domestic/municipal wastewater. In addition to this, brown- and greywater are also collected separately.', '10', '§4.2'],
  dry_toilet_used: ['The „two material flows“ system (dry toilet) is similar to the blackwater system based on a separation of greywater. The difference lies in the toilet technology used: dispensing with flushing water produces undiluted faecal matter instead of blackwater.', '11', '§4.2'],
  uddt_used: ['The „three material flows“ (UDDT), similar to the „three material flows” (UDT), is based on a separation between urine, faeces and greywater. The difference is just as before in the toilet technology. The use of UDDT results in undiluted faeces instead of brownwater.', '11', '§4.2'],
  system_groups_count: ['Depending on the utilization or treatment goal, there are a large number of different concepts of NASS. These can be assigned to basic system groups (see Table 1). | ' + T1CAP, '10', '§4.2 Table 1'],
  primary_objective: ['By deciding on a system and the associated collection and treatment of different material flows, different goals and varyingly extensive goals can be pursued in individual cases, such as: I targeted recycling of nutrients to agriculture/production of fertilizers, I generating energy by extracting biogas and/or using excess waste heat, I elimination of problematic micropollutants in high strength, separate collected wastewater streams, I meeting hygienic requirements, I compliance with increased demands on water quality in the environment, I reducing drinking water demand through the efficient use of water and utilization of the treated wastewater for various uses', '9', '§4.1'],
  rainwater_integration: ['In all NASS concepts, a straight drainage of rainwater or its separate management is required, which may be limited by existing settlement structures. In any case, a sensible integration of semi-natural rainwater management into the flow-oriented concepts for domestic/municipal wastewater le.g. discharge of rainwater with greywater) is necessary.', '11', '§4.2'],

  // ---- A272E-06 Stoffstrom- und Produktidentifikation --------------------
  bio_waste_integration: ['Furthermore, some of the concepts have the option of integrating bio-waste.', '11', '§4.2'],
  product_target: [T2CAP + ' | Products & Original material flow | Nutrient-rich fertilizer (nitrogen, phosphorous, potassium) | & Faecal matter | Soil conditioner (nutrient poor fertilizer) | & Mixture of brown- and greywater | Biogas | & Bio-waste | Thermal energy (waste heat) | & Greywater, high strength or low strength | Clear water/white water | & Greywater, low strength or high strength | Servicewater | & Mixture of brown- and greywater', '12', '§4.3 Table 2', 'Table 2 is a multirow LaTeX table in the md — the product cell and its material-flow cells are quoted as separate runs (joined with " | ")'],
  active_material_flows: ['For each occurring material flow there is the possibility of separate collection and treatment as well as subsequent use or recycling (Fig. 1).', '9', '§4.1, Fig.1'],
  active_flows_count: ['For each occurring material flow there is the possibility of separate collection and treatment as well as subsequent use or recycling (Fig. 1).', '9', '§4.1, Fig.1'],
  target_products_count: ['Table 2 lists suitable material flows and the most important products which can be obtained via NASS concepts. Possible residues and recyclables are not described here. | ' + T2CAP, '11', '§4.3 Table 2'],
  greywater_differentiation: ['Greywater | Material flow from the domestic area without faecal matter, sometimes differentiated between highstrength (kitchen area, washing machine) and low-strength (bath, shower, washbasin etc.).', '8', '§3', 'clause_reference in prod reads §6.2 — the definition is printed in §3 Terms (see STAGED file)'],

  // ---- A272E-07 Einwohnerspezifische Frachten und Volumina ---------------
  V_pop: [T5CAP + ' | ' + T5_VOL + ' | ' + T5_FN4, '21', '§6.2 Table 5'],
  V_pop_urine: [T5CAP + ' | ' + T5_VOL, '21', '§6.2 Table 5'],
  V_pop_blackwater: [T5CAP + ' | ' + T5_VOL + ' | ' + T5_FN4, '21', '§6.2 Table 5'],
  V_pop_greywater: [T5CAP + ' | ' + T5_VOL, '21', '§6.2 Table 5'],
  V_pop_raw_sewage: [T5CAP + ' | ' + T5_VOL + ' | ' + T5_FN12, '21', '§6.2 Table 5'],
  L_BOD5_pop: [T5CAP + ' | ' + T5_BOD, '21', '§6.2 Table 5'],
  L_BOD5_pop_urine: [T5CAP + ' | ' + T5_BOD, '21', '§6.2 Table 5'],
  L_BOD5_pop_blackwater: [T5CAP + ' | ' + T5_BOD, '21', '§6.2 Table 5'],
  L_BOD5_pop_greywater: [T5CAP + ' | ' + T5_BOD, '21', '§6.2 Table 5'],
  L_BOD5_pop_raw_sewage: [T5CAP + ' | ' + T5_BOD + ' | ' + T5_FN12, '21', '§6.2 Table 5'],
  L_COD_pop: [T5CAP + ' | ' + T5_COD, '21', '§6.2 Table 5'],
  L_COD_pop_urine: [T5CAP + ' | ' + T5_COD, '21', '§6.2 Table 5'],
  L_COD_pop_blackwater: [T5CAP + ' | ' + T5_COD, '21', '§6.2 Table 5'],
  L_COD_pop_greywater: [T5CAP + ' | ' + T5_COD, '21', '§6.2 Table 5'],
  L_COD_pop_raw_sewage: [T5CAP + ' | ' + T5_COD + ' | ' + T5_FN12, '21', '§6.2 Table 5'],
  L_TS_pop: [T5CAP + ' | ' + T5_TS, '21', '§6.2 Table 5', 'Table 5 prints "-" for urine TS — no urine value exists'],
  L_TS_pop_blackwater: [T5CAP + ' | ' + T5_TS, '21', '§6.2 Table 5'],
  L_TS_pop_greywater: [T5CAP + ' | ' + T5_TS, '21', '§6.2 Table 5'],
  L_N_pop: [T5CAP + ' | ' + T5_N, '21', '§6.2 Table 5'],
  L_N_pop_urine: [T5CAP + ' | ' + T5_N, '21', '§6.2 Table 5'],
  L_N_pop_blackwater: [T5CAP + ' | ' + T5_N, '21', '§6.2 Table 5'],
  L_N_pop_greywater: [T5CAP + ' | ' + T5_N, '21', '§6.2 Table 5'],
  L_P_pop: [T5CAP + ' | ' + T5_P, '21', '§6.2 Table 5'],
  L_P_pop_urine: [T5CAP + ' | ' + T5_P, '21', '§6.2 Table 5'],
  L_P_pop_blackwater: [T5CAP + ' | ' + T5_P, '21', '§6.2 Table 5'],
  L_P_pop_greywater: [T5CAP + ' | ' + T5_P, '21', '§6.2 Table 5'],
  L_P_pop_raw_sewage: [T5CAP + ' | ' + T5_P + ' | ' + T5_FN12, '21', '§6.2 Table 5'],
  share_BOD5: [T5CAP + ' | ' + T5_BOD + ' | ' + T5_FN3, '21', '§6.2 Table 5'],
  share_COD: [T5CAP + ' | ' + T5_COD + ' | ' + T5_FN3, '21', '§6.2 Table 5'],
  share_TS: [T5CAP + ' | ' + T5_TS + ' | ' + T5_FN3, '21', '§6.2 Table 5'],
  share_N: [T5CAP + ' | ' + T5_N + ' | ' + T5_FN3, '21', '§6.2 Table 5'],
  share_P: [T5CAP + ' | ' + T5_P + ' | ' + T5_FN3, '21', '§6.2 Table 5'],
  share_urine_pct: [T5CAP + ' | ' + T5_BOD + ' | ' + T5_N + ' | ' + T5_FN3, '21', '§6.2 Table 5'],
  share_blackwater_pct: [T5CAP + ' | ' + T5_BOD + ' | ' + T5_N + ' | ' + T5_FN3, '21', '§6.2 Table 5'],
  share_greywater_pct: [T5CAP + ' | ' + T5_BOD + ' | ' + T5_N + ' | ' + T5_FN3, '21', '§6.2 Table 5'],
  Q_flush_avg: [T5CAP + ' | ' + T5_FN3, '21', '§6.2 Table 5 footnote 3', 'the 33 l/(E d) value is BDEW (2011) quoted by the table, not a DWA-A 272E value'],
  data_quality_note: ['Typical population-specific values for Germany are summarized in Table 5. However, the values in Table 5 are based on a relatively small database.', '20', '§6.2'],
  site_measurement_used: ['To minimize the uncertainties in load determination, it is recommended to carry out samplings, as far as possible, during actual use. In case of new developments, samples should be taken from an existing system, which are very similar to the planned one and complemented by plausibility checks. These investigations include water consumption measurements and sampling of the separate collected flows at times of varying load (e.g. working day, weekend).', '20', '§6.2'],
  Q_daily_total: [T5_GUIDE, '21', '§6.2'],
  L_BOD5_daily_total: [T5_GUIDE, '21', '§6.2'],
  L_COD_daily_total: [T5_GUIDE, '21', '§6.2'],
  L_N_daily_total: [T5_GUIDE, '21', '§6.2'],
  L_P_daily_total: [T5_GUIDE, '21', '§6.2'],
  Q_design: [T5_GUIDE, '21', '§6.2', 'the per-capita x population aggregation (RULE-1) is NOT printed anywhere in the source — see the equation residue'],
  L_BOD5_total: [T5_GUIDE, '21', '§6.2', 'the per-capita x population aggregation (RULE-2) is NOT printed anywhere in the source — see the equation residue'],
  L_COD_total: [T5_GUIDE, '21', '§6.2', 'the per-capita x population aggregation (RULE-3) is NOT printed anywhere in the source — see the equation residue'],
  L_N_total: [T5_GUIDE, '21', '§6.2', 'the per-capita x population aggregation (RULE-4) is NOT printed anywhere in the source — see the equation residue'],
  L_P_total: [T5_GUIDE, '21', '§6.2', 'the per-capita x population aggregation (RULE-5) is NOT printed anywhere in the source — see the equation residue'],

  // ---- A272E-08 Sammlung, Ableitung und Transport ------------------------
  collection_technology: [COLLECT, '12', '§4.3 Collection of different material flows'],
  transport_system: [TRANSPORT, '13', '§4.3 Drainage of different material flows'],
  gravity_flows_count: [TRANSPORT, '13', '§4.3 Drainage of different material flows'],
  vacuum_flows_count: [TRANSPORT, '13', '§4.3 Drainage of different material flows'],
  pressure_flows_count: [TRANSPORT, '13', '§4.3 Drainage of different material flows'],
  tank_flows_count: ['Greywater, in its drainage-relevant properties, corresponds largely to domestic wastewater; For black-and brownwater, the higher solids content must be considered. For faeces and faeces from dry systems, a non-sewer based transport system is generally used.', '13', '§4.3 Drainage of different material flows'],
  vacuum_corrosion_considered: [VACUUM, '18', '§5.2'],
  dry_toilet_additives_considered: ['In the case of collection and drainage, special features must be considered, especially with dry toilets and vacuum drainage. The use of dry toilets usually requires the addition of additives to faecal matter or faeces.', '18', '§5.2'],
  annex_A1_applies: ['Table A.1: Overview of rules and standards regarding sewer and drainage networks outside of buildings | Rules and standards & Description & Status | DIN 1986-3 & Drainage systems on private ground- Part 3: Specifications for service and maintenance & November 2004 | DIN 1986-100 & Drainage systems on private ground - Part 100: Specifications in relation to DIN EN 752 and DIN EN 12056 & February 2012 | DIN EN 12109 & Vacuum drainage systems inside buildings; German version EN 12109:1999 & June 1999', '35', 'Annex A Table A.1', 'the printed A.1 caption repeats "outside of buildings" although the table lists inside-building standards — source defect, quoted as printed'],
  annex_A2_applies: ['Table A.2: Overview of rules and standards regarding sewer and drainage networks outside of buildings | Rules and standards & Description & Status | DIN EN 1091 & Vacuum sewerage systems outside buildings; German version EN 1091:1996 & February 1997 | DIN EN 1610 & Construction and testing of drains and sewers; German version EN 1610:2015 & October 1997 | DIN EN 1671 & Pressure sewerage systems outside buildings; German version EN 1671:1997 & August 1997', '35', 'Annex A Table A.2'],

  // ---- A272E-09 Rechtsrahmen-Bewertung -----------------------------------
  legal_WHG_ok: ['According to WHG, "Wastewater [...] plants are to be constructed, operated and maintained in such a way that the requirements for wastewater disposal are met. Moreover, sewage plants may only be constructed, operated and maintained in accordance with the generally accepted codes of practice" (§ 60 (1) WHG).', '26', '§8 Federal Water Act (WHG)'],
  legal_KrWG_ok: [KRWG, '26', '§8 Closed Substance Cycle Waste Management Act (KrWG)'],
  legal_Communal_ok: ['Another essential point for the implementation of NASS is the clarification of compulsory connection and use. This is stipulated in the statutes for sewage disposal in the municipalities for the respective development area. The compulsory connection is property-related and obliges every property owner within the scope of the statute to connect his property to the local wastewater treatment facilities as soon as wastewater accumulates on the property.', '26', '§8 Communal law'],
  legal_TrinkwV_ok: ['The Drinking Water Ordinance regulates in accordance with European law that a drinking water outlet must be available in every household. However, it does not regulate consumer behaviour, but leaves it to the consumer as to the extent to which he uses water from sources other than the drinking water supply network for his private use. In this respect, the Drinking Water Ordinance is not an inhibiting factor in the implementation of NASS.', '27', '§8 Drinking Water Ordinance (TrinkwV)'],
  legal_BauGB_ok: ['An implementation of NASS can be established in new housing developments using the existing planning and building law with a development plan or a project and development plan. A subsequent change of the development in existing areas cannot be enforced; it can only be approached in cooperation with the property owners and secured in urban development contracts.', '27', '§8 Construction Law'],
  legal_DuengG_ok: [DUENG, '27', '§8 Fertilizer Act/Fertilizers Application Ordinance'],
  legal_BioAbfV_ok: ['If bio-waste is involved, for example after the co-fermentation of blackwater and bio-waste, the requirements of the Bio-waste Ordinance (BioAbfV) must be met as well.', '27', '§8 Fertilizer Act/Fertilizers Application Ordinance'],
  legal_feasibility_overall: ['In principle, the recycling of NASS products does not pose any legal obstacles. However, lack of definitions leaves uncertainties for approval.', '27', '§8', 'the feasible/conditional/not_feasible granularity is EKOWAI\'s; the source states no verdict scale'],
  legal_high_risk_count: [LEGAL_LIST, '26', '§8'],
  legal_actions_required_count: [LEGAL_LIST, '26', '§8'],

  // ---- A272E-11 Auswahl der Behandlungstechnologie -----------------------
  treatment_objective: [T3CAP + ' | Material flow & Treatment objective & Possible treatment | Yellowwater/urine & hygienisation & storage | & N -and P -concentration (production of a nutrient-rich fertilizer) & struvite precipitation (magnesium-ammonia-phosphate, MAP) | Black- and brownwater & separation/concentration & filtration | & energy generation/stabilizing (biogas) & anaerobic (mesophilic) | Greywater & high-quality service water & biological (membrane) treatment process', '14', '§4.3 Table 3'],
  treatment_process: [T3CAP + ' | Material flow & Treatment objective & Possible treatment | Yellowwater/urine & hygienisation & storage | & N-concentration (fertilizer production)/hygienisation & ammonium stripping | & stabilizing/nutrient concentration & nitrification/distillation | & hygienisation/volume reduction & drying ${ }^{1)}$ | & hygienisation/stabilizing & liming ${ }^{1)}$ | & nutrient concentration & precipitation/flocculation', '14', '§4.3 Table 3'],
  CNP_ratio_atypical: [DIM_INTRO + ' [...] I different $\\mathrm{C}: \\mathrm{N}: \\mathrm{P}$ ratios in comparison to domestic wastewater;', '20', '§6.1'],
  treatment_inhibitor_flag: [DIM_INTRO + ' I high concentrations of individual substances (in particular nitrogen in black/yellowwater) can inhibit biodegradation;', '20', '§6.1'],
  salt_concentration_high: [DIM_INTRO + ' [...] I high inert COD concentration in black- and yellowwater; I high conductivity (salt concentrations); I possible accumulation of compounds in material flow circulation;', '20', '§6.1'],
  attest_a272e_11_comp_18: [VACUUM, '18', '§5.2'],
  treatment_train_steps: ['The treatment involves mechanical, physical-chemical and biological processes, many of which have been tested in conventional wastewater treatment. Which methods are suitable for the generation of possible NASS products must be decided on a case-by-case basis, since the effort required to achieve the objectives may vary (depending on the boundary conditions).', '13', '§4.3 Treatment of different material flows'],
  products_achievable: ['For the material flows listed in Table 2 and possible treatment goals, Table 3 provides an overview of selected procedures for which experience has been documented in the literature.', '13', '§4.3 Treatment of different material flows'],

  // ---- A272E-13 Definition der Bewertungskriterien -----------------------
  criteria_env: [T6CAP + ' | 1 Protection of the environment and resources | a) Protection of water bodies | & input of oxygen-depleting substances (COD, BOD) & load | & input of suspended substances & load | b) Soil protection & input of ecotoxicological substances & concentration, load | c) Climate protection & emission of climate-relevant gases & load | & utilization of resources (construction and operation) & material, quantity', '23', '§7.2 Table 6, main obj. 1'],
  criteria_hygiene: [T6CAP + ' | 2 Hygiene/health and safety | a) Environmental hygiene, safe hygiene standards | & negative hygienic and toxicological impacts due to leaks, breakdown/failure and heavy rainfall & load, dose | & occupational health and safety & load, dose | & problems with insects and vermin & number, population | b) Food safety | & extent of food contamination due to pathogens or hazardous substances & load, dose', '23', '§7.2 Table 6, main obj. 2'],
  criteria_economic: [T6CAP + ' | 3 Economic objectives | a) Optimisation of micro-and macroeconomic costs | & microeconomic income le.g. fertilizer, biogas, service-and/or process water) & monetary | & flexibility, ease of switching systems (ratio of sunk costs) & monetary | b) International competitiveness & flexible, readily adaptable system with high international market potential & monetary', '23–24', '§7.2 Table 6, main obj. 3'],
  criteria_social: ['Table 6 (End) | 4 Social objectives | a) Acceptance | & perceived safety lalso in case of disasters, extreme events; cf. 5a) & qualitative | b) Creation of qualified jobs & number of jobs created (international competitiveness; cf. 5a)) & number | c) Creation of environmental awareness & environmentally aware approach to water, energy, resources & qualitative', '24', '§7.2 Table 6, main obj. 4'],
  criteria_technical: ['Table 6 (End) | 5 Technical objectives | a) Operational safety and reliability/ robustness | & incidence of system failure/susceptibility to disaster & number, duration | & availability of know-how (stare of the art) & qualitative | b) Adaptability/ expandability | & scalability & qualitative | c) Capacity for integration with other infrastructure systems | & space required & area', '24', '§7.2 Table 6, main obj. 5'],
  evaluation_method: [METHODS, '22', '§7.1'],
  T_plan: [HORIZON, '24', '§7.3 Boundary conditions/constraints'],
  horizon_ok: [HORIZON, '24', '§7.3 Boundary conditions/constraints', 'RULE-9 hard-codes only the 30-50 band; the source prints three bands (30-50 / 50-100 / 10-20) — SR-2, see STAGED file'],
  sensitivity_analysis_done: [SENSI, '25', '§7.3 Inclusion of uncertainties'],
  scenario_analysis_done: [SCEN, '25', '§7.3 Inclusion of uncertainties'],
  kvr_equality_check_done: ['The current Guidelines on Dynamic Cost Comparison Calculations (KVR Guidelines, DWA 2012) point to the restrictive condition of equality of benefits for alternatives. This endorses the application of more advanced decision support methods.', '22', '§7.1'],
  criteria_assessment_scale: ['The criteria may be assessed in nominal (\'qualitative\'), ordinal (\'orderly\') or cardinal (\'quantitative\') according to available knowledge and effort.', '22', '§7.2'],
  criteria_selected_count: ['Table 6 summarizes relevant evaluation criteria, including information on their possible specification. The criteria are assigned to five different main objectives and corresponding sub-objectives.', '22', '§7.2'],

  // ---- A272E-12 Auswirkungen auf bestehende Infrastruktur ----------------
  nitrogen_load_change: ['If mainly, nitrogen fractions are decoupled from the existing system le.g. urine separation, separation of blackwater), nitrification/denitrification may no longer be necessary.', '19', '§5.2'],
  dry_weather_flow_reduction: ['By separating wastewater streams, especially greywater, the wastewater discharge is reduced, so that in dry weather reduced flow rates can occur in gravity sewer systems. This may potentially lead to sedimentation problems and associated odour problems.', '19', '§5.2'],
  load_shift_summary: ['If substantial impacts on the load of the centralized wastewater treatment plant are expected or expected to be achieved, the impact can be estimated using the loading described in Table 5.', '19', '§5.2'],
  infrastructure_changes_required: ['When integrating innovative sanitation systems into existing wastewater infrastructures, the resulting consequences must be considered.', '19', '§5.2'],
  baseline_quantitative_expansion_documented: [BASELINE, '30', '§9.1(3)-(4)'],
  baseline_qualitative_differentiation_documented: [BASELINE, '30', '§9.1(3)-(4)'],

  // ---- A272E-14 Entwicklung alternativer Lösungen ------------------------
  variants: ['Generating planning options or alternatives is one of the most important steps in the whole assessment process. While there are a large number of different valuation methods, there are hardly any systematic methods and approaches for generating the possible technical alternatives (HAJKOWICZ \\& COLLINS 2007).', '25', '§7.3 Development of alternatives'],
  planning_horizon_case: [HORIZON, '24', '§7.3 Boundary conditions/constraints'],
  recommended_alternative: [SELECT_SOL, '30', '§9.1(5)-(7)'],
  recommended_total_score: [METHODS, '22', '§7.1', 'a single weighted score is the "one indicator" case (utility analysis); the numeric scale itself is EKOWAI\'s'],
  sensitivity_result: [SENSI, '25', '§7.3 Inclusion of uncertainties'],

  // ---- A272E-15 Stakeholder-Integration ----------------------------------
  stakeholder_urban: ['Urban and open space planners must coordinate in good time with the planners of the residential water management systems in order, for example, to find suitable locations for the treatment plants of separate collected wastewater flows (e.g. soil filter, vacuum station).', '32', '§9.2.2'],
  stakeholder_architecture: ['Depending on the NASS concepts, it may be necessary for rooms for decentralized treatment plants (e.g. technical or operating room in the building basement) to be accessible from outside for external purposes (e.g. for maintenance work).', '32', '§9.2.3'],
  stakeholder_water: [TRINKW_OBS, '32', '§9.2.4'],
  stakeholder_waste: ['From a technical point of view the co-treatment of organic household waste is possible or even advantageous for the implementation of NASS. Shared collection of bio-waste and black-or brownwater can be facilitated, for example with a vacuum sewer system.', '33', '§9.2.5'],
  stakeholder_agri: ['Agriculture plays an important role in the planning of new sanitation systems. The fertilizers produced (mineral fertilizer from processed urine or organic fertilizer from compost or digestate) have a potential for agricultural use.', '33', '§9.2.6'],
  stakeholder_energy: ['There is considerable potential for recovering energy from wastewater, especially if the different mate- rial flows are separate (e.g. utilization of waste heat from greywater, organic materials for biogas production).', '33', '§9.2.7'],
  implementation_approach: ['If an immediate implementation of NASS is omitted or only individual components are implemented (step-by-step solutions), an anticipatory planning approach ensure that relevant later additions are already accommodated for in the layout planning of domestic supply and disposal systems le.g. additional supply line for process water, separate sewer pipes for grey- and blackwater).', '32', '§9.2.3'],
  fire_water_decoupled: ['If the fire water supply is decoupled from the drinking water network, responsibilities and the assumption of costs for the erection and operation (maintenance) of fire water tanks/ponds must be coordinated early on across departments (e.g. with the fire brigade and licensing authority).', '32', '§9.2.4'],
  contracting_model_used: ['If, in the course of NASS, object-related systems (at building or block level) are implemented, financing and operation of these systems can be sensibly ensured by contracting models. For this purpose, a service contract can be concluded between the property owners and the contractor le.g. wastewater association).', '31', '§9.2.1'],
  service_water_reuse_planned: ['The reuse of treated water from innovative sanitation systems or the use of vacuum technology to drain blackwater reduces the specific drinking water consumption.', '32', '§9.2.4'],
  fbr_H201_attested: [TRINKW_OBS, '32', '§9.2.4'],
  TrinkwV_attested: [TRINKW_OBS, '32', '§9.2.4'],
  stakeholder_readiness: ['An early inclusion of all relevant decision makers by the client is therefore of great importance for the planning of NASS.', '31', '§9.2.1', 'the not_ready/partially_ready/ready granularity is EKOWAI\'s; the source states no readiness scale'],
  stakeholder_groups_engaged: ['Depending on the problem, it may be useful to engage representatives from urban planning, water supply, waste and energy management, agriculture and affected citizens, in order to create a common understanding of problems and to achieve knowledge transfer (see Figure 3).', '28', '§9.1(1)-(2)'],

  // ---- A272E-16 Variantenwahl und Vorplanung -----------------------------
  preferred_variant_selected: [SELECT_SOL, '30', '§9.1(5)-(7)'],
  selected_variant_score: [METHODS, '22', '§7.1', 'a single weighted score is the "one indicator" case (utility analysis); the numeric scale itself is EKOWAI\'s'],

  // ---- A272E-18 Compliance- und Entscheidungs-Zusammenfassung ------------
  monitoring_program_defined: ['(8) Program for operation and performance monitoring (monitoring) [...] Performance monitoring of NASS needs to be adapted to the changed operating conditions and the lack of long-term experience with regard to new technical components.', '31', '§9.1(8)'],
  comprehensive_assessment_completed: ['Comprehensive assessment approaches should be used in the evaluation of NASS. The resource-oriented approach of NASS hampers the direct comparison different systems since an equality of benefits cannot be expected.', '34', '§10'],
  all_protection_goals_addressed: ['A comparative assessment of different concepts must take full account of the implications of all essential protection goals and criteria. The most important aspects are therefore described below.', '7', '§1'],
};

// app/project metadata — exempt class (2026-08-01 ruling)
const EXEMPT = {
  project_name: 'project identifier', project_number: 'project identifier', client_name: 'client record',
  project_location: 'project identifier',
  screening_outcome: 'phase-gate verdict',
  consolidated_daily_loads: 'phase roll-up', phase2_completeness: 'phase-gate verdict', consolidated_transport_systems: 'phase roll-up',
  stakeholder_signoff_obtained: 'sign-off record', stakeholder_urban_signed: 'sign-off record',
  stakeholder_architecture_signed: 'sign-off record', stakeholder_water_signed: 'sign-off record',
  stakeholder_waste_signed: 'sign-off record', stakeholder_agri_signed: 'sign-off record',
  stakeholder_energy_signed: 'sign-off record',
  selected_variant_name: 'project data',
  compliance_decision: 'overall verdict', sections_verified_count: 'app roll-up',
  compliance_pass_count: 'app roll-up', compliance_fail_count: 'app roll-up', total_worksheets: 'app roll-up',
};

// residue — the md cannot support these
const RESIDUE = {
  groundwater_level: 'no clause in source — the Standard never makes a mean groundwater level a design datum (prod clause_reference §5.2 is wrong)',
  precipitation_annual: 'value comes from another standard (§9.2.1 defers semi-natural rainwater management to DWA-A 138 / DWA-M 153) — NR',
  safety_factor: 'no clause in source — §6.2 requires variabilities to be "covered by appropriate technical measures" but prescribes no numeric safety factor (SR-2)',
  consistency_ok: 'source contradicts the encoding — the Table 5 "Percentage" columns do NOT sum to 100 % (N: urine 85 % + blackwater 92 % + greywater 8 %, because urine is a subset of blackwater); RULE-6 does not exist in prod either',
  criteria_total_weight: 'no clause in source — §7.2 states only that "A more detailed aggregation of the individual criteria depends on the evaluation method used"; no weighting scheme, no 100 % rule',
  approval_obtained: 'not in the md — the "Approval?" decision box lives in Figure 2, which the transcript carries only as a mathpix image (no OCR of the figure); NR at md level',
  performance_deficiency_found: 'not in the md — the performance-control decision box lives in Figure 2, which the transcript carries only as a mathpix image; NR at md level',
};

// equations
const EQ = {
  'RULE-7': [T5CAP + ' | ' + T5_FN3, '21', '§6.2 Table 5 footnote 3', 'the constant 33 l/(E d) is BDEW (2011) as quoted by Table 5'],
  'RULE-10': [COLLECT, '12', '§4.3 Collection of different material flows'],
  'RULE-11': [T3CAP + ' | Material flow & Treatment objective & Possible treatment | Yellowwater/urine & hygienisation & storage | Black- and brownwater & separation/concentration & filtration | Greywater & high-quality service water & biological (membrane) treatment process | Note 1) Suitable for faeces from UDDT systems', '14', '§4.3 Table 3', 'Table 3 is a lookup, not a formula — the equation encodes the admissible (flow x objective x process) triples'],
};
const EQ_RESIDUE = {
  'RULE-1': 'no formula in source — DWA-A 272E prints no numbered equations at all; Q_design = V_pop * E_population is an EKOWAI skeleton',
  'RULE-2': 'no formula in source — L_BOD5_total = L_BOD5_pop * E_population is an EKOWAI skeleton',
  'RULE-3': 'no formula in source — L_COD_total = L_COD_pop * E_population is an EKOWAI skeleton',
  'RULE-4': 'no formula in source — L_N_total = L_N_pop * E_population is an EKOWAI skeleton',
  'RULE-5': 'no formula in source — L_P_total = L_P_pop * E_population is an EKOWAI skeleton',
  'RULE-8': 'threshold not printed — §5.1 says "If several of the favourable conditions are met"; the encoded favourable_conditions_count >= 1 reads "several" as 1 (SR-1: no verbatim source reads the target value)',
  'RULE-9': 'band not printed as encoded — §7.3 prints three bands (30-50 typical / 50-100 with sewers / 10-20 isolated); the encoded 30 <= T_plan <= 50 silently picks one (SR-2)',
};

// ---------------------------------------------------------------------------
const NOTE_DATE = '2026-09-05';
const lines = [];
const rollbackByStatus = {};
const push = (id, status) => { (rollbackByStatus[status] ||= []).push(id); };

const quoted = [], exempt = [], residue = [];
for (const f of J.fields) {
  if (['verified_against_standard', 'corrected'].includes(f.verification_status)) continue;
  if (RESIDUE[f.symbol]) { residue.push(f); continue; }
  if (EXEMPT[f.symbol]) { exempt.push(f); continue; }
  const e = Q[f.symbol];
  if (!e) { throw new Error(`no quote for ${f.ws}.${f.symbol}`); }
  quoted.push(f);
}

lines.push('-- ######################## App/project metadata (exempt class) ########################');
const byWs = {};
exempt.forEach((f) => { (byWs[f.ws] ||= []).push(f.symbol); });
lines.push('-- ' + Object.entries(byWs).map(([w, s]) => `${w} ${s.join(', ')}`).join(' · '));
lines.push('-- project identifiers, phase-gate verdicts, phase roll-ups and stakeholder sign-off records the guideline never defines.');
const exByStatus = {};
exempt.forEach((f) => { (exByStatus[f.verification_status] ||= []).push(f); push(f.id, f.verification_status); });
for (const [st, fs_] of Object.entries(exByStatus)) {
  lines.push(`update public.fields set verification_status='inferred_from_worksheet', verification_note='md-pass ${NOTE_DATE}: app/project metadata — the guideline does not define this field; exempt per the 2026-08-01 metadata ruling', verified_at=now() where id in (${fs_.map((f) => `'${f.id}'`).join(',')}) and verification_status not in ('verified_against_standard','corrected');`);
  lines.push('');
}

let curWs = null;
for (const f of quoted) {
  const [quote, page, clause, caveat] = Q[f.symbol];
  if (f.ws !== curWs) { curWs = f.ws; lines.push(''); lines.push(`-- ######################## ${curWs} ${J.worksheets.find((w) => w.code === curWs).title_de} ########################`); }
  const note = `md-verified ${NOTE_DATE} (${clause}, printed p.${page}) [VC]` + (caveat ? ` — caveat: ${caveat}` : '');
  lines.push(`-- ${f.symbol}`);
  lines.push(`update public.fields set verification_status='verified_against_standard', verification_quote='${q(quote)} — printed p.${page}', verification_note='${q(note)}', verified_at=now() where id='${f.id}' and verification_status not in ('verified_against_standard','corrected');`);
  push(f.id, f.verification_status);
}

lines.push('');
lines.push('-- ######################## Equations ########################');
const eqQuoted = [], eqResidue = [];
for (const e of J.equations) {
  if (e.verification_status === 'verified_against_standard') continue;
  if (EQ_RESIDUE[e.equation_number]) { eqResidue.push(e); continue; }
  const spec = EQ[e.equation_number];
  if (!spec) throw new Error(`no quote for equation ${e.equation_number}`);
  const [quote, page, clause, caveat] = spec;
  const note = `md-verified ${NOTE_DATE} (${clause}, printed p.${page}) [VC]` + (caveat ? ` — caveat: ${caveat}` : '');
  lines.push(`-- ${e.ws} ${e.equation_number}: ${e.formula}`);
  lines.push(`update public.equations set verification_status='verified_against_standard', verification_quote='${q(quote)} — printed p.${page}', verification_note='${q(note)}', verified_at=now() where id='${e.id}' and verification_status <> 'verified_against_standard';`);
  eqQuoted.push(e);
}

const header = `-- ============================================================================
-- SR-1 field-verification pack — DWA-A-272E (DWA-A 272E, June 2014, English edition: Principles for the Planning and
-- Implementation of New Alternative Sanitation Systems (NASS); the alternative-sanitation standard)
-- Generated: ${NOTE_DATE} — md-verified pass (owner ruling ${NOTE_DATE}: the markdown transcript is the verification source; the
--   PDF only where no markdown exists). Grade: VC (SR-3), labelled as such on every row. PDF confirmation would lift to VA.
-- Source md: C:\\Users\\Ekowai\\Desktop\\Guidelines\\DWA-A-272E\\DWA-A_272E (1).md (1,161 lines, English, mathpix LaTeX
--   transcript of the DWA PDF). Read completely (lines 1-420, 420-839, 839-1162).
--   PAGE CONVENTION — the md carries NO standalone page-number lines. "printed p.N" is DERIVED from the printed Content /
--   List of Figures / List of Tables tables (md lines 100-149: §1 p.7 · §2 p.7 · §3 p.8 · §4.1 p.9 · §4.2 p.10 (Table 1 p.11) ·
--   §4.3 p.11 (Table 2 p.12, Table 3 p.14) · §5.1 p.15 (Table 4 p.15-17) · §5.2 p.18-19 · §6.1 p.20 · §6.2 p.20-21 (Table 5 p.21) ·
--   §7.1 p.22 · §7.2 p.22 (Table 6 p.23-24) · §7.3 p.24-25 · §8 p.26-27 · §9.1 p.28-31 (Figure 2 p.29, Figure 3 p.31) ·
--   §9.2.1 p.31 · §9.2.2/9.2.3/9.2.4 p.32 · §9.2.5/9.2.6/9.2.7 p.33 · §10 p.34 · Table A.1/A.2 p.35) and cross-checked against
--   the mathpix figure page indices embedded in the md, which run printed+2 (Fig.1 = -12.jpg = printed p.10; Fig.2 = -31.jpg =
--   printed p.29). The single exception is Fig.3 (-32.jpg = printed p.30) which the List of Figures indexes at p.31 — so pages
--   inside multi-page sections (§8, §9.1) are section-derived and may be off by one; the clause reference in every
--   verification_note is exact, the page is the derived convenience. Where a quote genuinely spans two printed pages the ref
--   reads "p.23-24".
--   LaTeX: the md writes units/symbols in LaTeX ("$\\mathrm{g} /(\\mathrm{E} \\cdot \\mathrm{d})$", "\\%", "\${ }^{31}\$"); these are
--   quoted VERBATIM. Table rows: "\\hline" and trailing "\\\\" dropped, cells kept with "&", the table caption prefixed. OCR
--   quirks are quoted as printed ("le.g.", "frombrown", "mate- rial", "stare of the art", "brown-and greywater", "ATV-DVWKA 131").
--   "[...]" = omitted run inside one clause/cell; " | " joins two clauses, table rows or LaTeX-wrapped cells; ONE page ref at the
--   end of each quote.
-- Scope (default job + equation lift): ${J.fields.length} active fields (prior statuses MIXED: 113 imported_unverified,
--   65 needs_engineer_review, 8 derived_from_structural_mapping) -> ${quoted.length} quoted -> verified_against_standard /
--   ${exempt.length} app-metadata -> inferred_from_worksheet / ${residue.length} residue (listed in the report).
-- Equations: ${J.equations.length}, all needs_engineer_review -> ${eqQuoted.length} quoted (RULE-7/10/11) / ${eqResidue.length} residue
--   (RULE-1..5 = unprinted aggregation skeletons; RULE-8/RULE-9 = thresholds no verbatim source reads — SR-1/SR-2).
-- Gates: ${J.gates.length} read (20 block, 16 warn), none edited here — every structural/enforcement finding is in
--   scripts/verification/dwa-a-272e-STAGED-rulings.sql.
-- Rollback: scripts/verification/rollback-dwa-a-272e-md-verification-pack.sql (restores each row's OWN prior status).
-- ============================================================================
`;

fs.writeFileSync(path.join(here, 'dwa-a-272e-md-verification-pack.sql'), header + '\n' + lines.join('\n') + '\n', 'utf8');

// ---------------------------------------------------------------------------
// rollback — restore each group's own prior status
// ---------------------------------------------------------------------------
const rb = [];
rb.push(`-- Rollback for dwa-a-272e-md-verification-pack.sql (${NOTE_DATE}).`);
rb.push('-- Reverts ONLY rows this pack touched (identified by the verification_note tag) and ONLY for standard DWA-A-272E');
rb.push('-- (joined through worksheet_templates -> standards.code). Prior statuses were MIXED, so each group returns to its OWN');
rb.push('-- prior status (2026-09-05 export: fields 113 imported_unverified / 65 needs_engineer_review / 8 derived_from_structural_mapping;');
rb.push('-- equations 10 needs_engineer_review). Gates untouched; the STAGED file was never applied.');
for (const [st, ids] of Object.entries(rollbackByStatus)) {
  rb.push('');
  rb.push(`-- ---- fields: ${ids.length} rows whose prior status was '${st}' ----`);
  rb.push(`update public.fields f set verification_status='${st}', verification_quote=null, verification_note=null, verified_at=null`);
  rb.push('  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id');
  rb.push(" where wt.id = f.worksheet_template_id and s.code = 'DWA-A-272E'");
  rb.push(`   and f.id in (${ids.map((i) => `'${i}'`).join(',')})`);
  rb.push(`   and (f.verification_note like 'md-verified ${NOTE_DATE}%' or f.verification_note like 'md-pass ${NOTE_DATE}%');`);
}
if (eqQuoted.length) {
  rb.push('');
  rb.push(`-- ---- equations: ${eqQuoted.length} rows — prior status = 'needs_engineer_review' (encode-time source_quote is a separate column and stays) ----`);
  rb.push("update public.equations e set verification_status='needs_engineer_review', verification_quote=null, verification_note=null, verified_at=null");
  rb.push('  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id');
  rb.push(" where wt.id = e.worksheet_template_id and s.code = 'DWA-A-272E'");
  rb.push(`   and e.id in (${eqQuoted.map((e) => `'${e.id}'`).join(',')})`);
  rb.push(`   and e.verification_note like 'md-verified ${NOTE_DATE}%';`);
}
fs.writeFileSync(path.join(here, 'rollback-dwa-a-272e-md-verification-pack.sql'), rb.join('\n') + '\n', 'utf8');

console.log(`fields ${J.fields.length}: quoted ${quoted.length}, exempt ${exempt.length}, residue ${residue.length}`);
console.log('rollback groups: ' + Object.entries(rollbackByStatus).map(([k, v]) => `${k}=${v.length}`).join(', '));
console.log(`equations ${J.equations.length}: quoted ${eqQuoted.length}, residue ${eqResidue.length}`);
console.log('RESIDUE FIELDS:');
residue.forEach((f) => console.log(`  ${f.ws}.${f.symbol} — ${RESIDUE[f.symbol]}`));
console.log('RESIDUE EQUATIONS:');
eqResidue.forEach((e) => console.log(`  ${e.ws}.${e.equation_number} — ${EQ_RESIDUE[e.equation_number]}`));
