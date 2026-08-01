-- INDIVIDUAL-CALL gate items (owner: finish them too). A2 attestation/action -> ==True (data-flags/
-- disclosures/conditionals KEPT as presence); C field-missing typo -> corrected symbol, else cleared to manual.
-- D2 splits KEPT (enforce via project-wide fallback; re-home of a 2-ws split only shifts which ws shows pending).
-- Rollback: -individual.
DO $$
BEGIN
  UPDATE compliance_requirements SET condition='provider_roles_addressed == True' WHERE id='8f661a8e-7146-466f-ae27-266e1a143560' AND condition='provider_roles_addressed IS NOT NULL';
  UPDATE compliance_requirements SET condition='scope_change_recorded == True' WHERE id='8208a601-8ddc-49c0-992a-b529333f3b8a' AND condition='scope_change_recorded IS NOT NULL';
  UPDATE compliance_requirements SET condition='interviews_conducted == True' WHERE id='0a4dff89-ff78-4625-a33e-f73741db5daa' AND condition='interviews_conducted IS NOT NULL';
  UPDATE compliance_requirements SET condition='business_consequences_determined == True' WHERE id='9ea01ccf-b014-4a2a-806a-b43bd4b25497' AND condition='business_consequences_determined IS NOT NULL';
  UPDATE compliance_requirements SET condition='kpi_objective_specific == True' WHERE id='6242e82a-481b-48c5-9fe8-293f6df54a8f' AND condition='kpi_objective_specific IS NOT NULL';
  UPDATE compliance_requirements SET condition='weather_recorded == True' WHERE id='d39571a2-a89a-4ff8-a912-1c8c24a512f1' AND condition='weather_recorded IS NOT NULL';
  UPDATE compliance_requirements SET condition='hazardous_atmosphere_tested == True' WHERE id='5649c92d-6bb9-400c-8db7-41c52e21f89d' AND condition='hazardous_atmosphere_tested IS NOT NULL';
  UPDATE compliance_requirements SET condition='electrical_hazard_minimized == True' WHERE id='9e900a67-4ec6-4716-81e2-abefee793fcc' AND condition='electrical_hazard_minimized IS NOT NULL';
  UPDATE compliance_requirements SET condition='unusual_hydraulic_conditions_recorded == True' WHERE id='fd5b3824-6cfe-4078-9ab4-39d20a6f8e14' AND condition='unusual_hydraulic_conditions_recorded IS NOT NULL';
  UPDATE compliance_requirements SET condition='sampler_refrigerated == True' WHERE id='dcae5213-19c8-4654-b0d9-11966c21a688' AND condition='sampler_refrigerated IS NOT NULL';
  UPDATE compliance_requirements SET condition='equipment_secured == True' WHERE id='5ddbb215-0c52-4949-a984-67b387aca47d' AND condition='equipment_secured IS NOT NULL';
  UPDATE compliance_requirements SET condition='container_airtight == True' WHERE id='e9cf8836-e881-4f06-9399-6e0edcf59a55' AND condition='container_airtight IS NOT NULL';
  UPDATE compliance_requirements SET condition='replicate_ratio_met == True' WHERE id='293dd44c-efe4-4380-a7e3-072d73bdd2a3' AND condition='replicate_ratio_met IS NOT NULL';
  UPDATE compliance_requirements SET condition='sample_volume_adequate == True' WHERE id='09d05802-2e4c-46bc-ba7a-04abc8211d82' AND condition='sample_volume_adequate IS NOT NULL';
  UPDATE compliance_requirements SET condition='ph_controlled_during_test == True' WHERE id='28d0e9e1-31ca-4de1-a726-4525ea660830' AND condition='ph_controlled_during_test IS NOT NULL';
  UPDATE compliance_requirements SET condition='colour_turbidity_correction == True' WHERE id='8014b138-1f6e-438a-ab06-b283b08b1bdc' AND condition='colour_turbidity_correction IS NOT NULL';
  UPDATE compliance_requirements SET condition='concentration_response_curve_presented == True' WHERE id='d9887208-07a0-4a18-bc75-2cce8548c4fb' AND condition='concentration_response_curve_presented IS NOT NULL';
  UPDATE compliance_requirements SET condition='' WHERE id='febc9e47-2da7-4373-9006-53071cb3ec14' AND condition='IF construction_activity == bestand THEN method_documented';
  UPDATE compliance_requirements SET condition='' WHERE id='236ae4f6-5fcc-4d61-9960-402ac516bcde' AND condition='if mess_proof then authority_coordination_documented';
  UPDATE compliance_requirements SET condition='' WHERE id='f9a2a753-e843-4ba6-9d8e-106ddd6c1afe' AND condition='if q_R_Dr > 2 then Nachweisverfahren_triggered';
  UPDATE compliance_requirements SET condition='' WHERE id='525c1a19-ad97-4266-9f96-9db674adf8c4' AND condition='manual_check';
  UPDATE compliance_requirements SET condition='' WHERE id='f4b11f5c-6de5-4eef-919c-f27f5f69240b' AND condition='manual_check_against_bild_1';
  UPDATE compliance_requirements SET condition='' WHERE id='e8503d63-0263-4df1-b644-ed1dc94737ec' AND condition='manual_check';
  UPDATE compliance_requirements SET condition='' WHERE id='528583bb-c7ee-455e-97fe-aa1c4a9c9370' AND condition='manual_check';
  UPDATE compliance_requirements SET condition='' WHERE id='146cfd37-afb7-457d-96a0-d8eea269c472' AND condition='manual_check';
  UPDATE compliance_requirements SET condition='' WHERE id='d9d62bf1-de9b-4b73-b939-24ea39910b20' AND condition='manual_check';
  UPDATE compliance_requirements SET condition='' WHERE id='44d1425b-8382-4bd7-b77e-9733a0bc2fac' AND condition='equation_1_evaluated';
  UPDATE compliance_requirements SET condition='' WHERE id='12f8444a-daad-4b58-8a72-b7f593ee9e10' AND condition='manual_check';
  UPDATE compliance_requirements SET condition='' WHERE id='211c138d-8029-4708-97e8-c1f4f7e349a6' AND condition='';
  UPDATE compliance_requirements SET condition='' WHERE id='599ce477-e9dd-4181-8b41-b20437518f1d' AND condition='expositionspfade_dokumentiert == True AND schulung_durchgefuehrt == True';
  UPDATE compliance_requirements SET condition='' WHERE id='61b7e84b-dd17-4f0d-b137-fbd811290a54' AND condition='documented_compliance';
  UPDATE compliance_requirements SET condition='' WHERE id='f9d55b0b-2884-4462-a3ab-34d5b88b9c86' AND condition='alle_hygieneanforderungen_erfuellt';
  UPDATE compliance_requirements SET condition='' WHERE id='8bf0ba11-cec0-4aa9-a671-6809dc40007e' AND condition='filter_groesse_um <= 180 AND kontrollfilter_um <= 120';
  UPDATE compliance_requirements SET condition='' WHERE id='f9d55b0b-2884-4462-a3ab-34d5b88b9c86' AND condition='alle_hygieneanforderungen_erfuellt';
  UPDATE compliance_requirements SET condition='' WHERE id='16d7de18-b350-44bc-9ea4-ea223497fe58' AND condition='rule_speichervolumen_per_verwertung';
  UPDATE compliance_requirements SET condition='' WHERE id='aecbce1a-7c75-4e90-b8b5-b0a3e1f1df71' AND condition='IF verwertungsweg == mikrogasturbine AND h2s_konz >= 200 THEN Gasreinigung';
  UPDATE compliance_requirements SET condition='' WHERE id='16d7de18-b350-44bc-9ea4-ea223497fe58' AND condition='rule_speichervolumen_per_verwertung';
  UPDATE compliance_requirements SET condition='' WHERE id='aecbce1a-7c75-4e90-b8b5-b0a3e1f1df71' AND condition='IF verwertungsweg == mikrogasturbine AND h2s_konz >= 200 THEN Gasreinigung';
  UPDATE compliance_requirements SET condition='' WHERE id='20c12083-63ab-4bf1-a2b7-5e7a9e407fae' AND condition='mab_vorhanden';
  UPDATE compliance_requirements SET condition='' WHERE id='0665f405-35be-463d-b80e-6087276a5d7c' AND condition='havariebecken_vorhanden';
  UPDATE compliance_requirements SET condition='' WHERE id='be8d88fc-8122-4777-98c7-a060aa8bb19e' AND condition='reinigungsmittel_edta_frei IS NOT NULL OR edta_substitutionsplan IS NOT NULL';
  UPDATE compliance_requirements SET condition='' WHERE id='47a93795-375c-45e4-9631-9ce8454e2015' AND condition='';
  UPDATE compliance_requirements SET condition='' WHERE id='90ddf688-edda-42d6-87b0-87e5e0ab83ea' AND condition='verwendete_normen IS NOT EMPTY';
  UPDATE compliance_requirements SET condition='' WHERE id='dd4a52c7-f724-4f9f-9653-9bba13376217' AND condition='q_spitz IS NOT NULL AND c_lipophil_roh IS NOT NULL AND c_csb_roh IS NOT NULL AND anzahl_mahlzeiten IS NOT NULL';
  UPDATE compliance_requirements SET condition='' WHERE id='96bc2de9-c590-4b71-bcd0-a1c41e0c0588' AND condition='all == true';
  UPDATE compliance_requirements SET condition='' WHERE id='c7d18a70-5fe6-4df3-a8ea-5c63af022598' AND condition='all == true';
  RAISE NOTICE 'individual applied';
END $$;
