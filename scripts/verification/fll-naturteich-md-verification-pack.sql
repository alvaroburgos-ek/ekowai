-- ============================================================================
-- SR-1 field-verification pack — FLL-Naturteich (Guidelines for the planning, construction
-- and maintenance of private natural swimming pools, 2nd ed. 2017, EN translation 2023/2024)
-- Generated: 2026-09-05 — md-verified pass (owner ruling 2026-09-05: markdown transcript is the
--   verification source; PDF only where no markdown exists). Grade: VC (SR-3), labelled as such.
-- Source md: C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\FLL-Guidelines natural pool.md
--   Printed page numbers are carried in the md as standalone page-number lines; quotes cite "printed p.N".
-- Scope: all 15 worksheets, fields with verification_status NOT IN ('verified_against_standard','corrected').
-- Counts: 108 examined / 91 quoted here / 12 app-metadata → inferred_from_worksheet (same class as the
--   A138 metadata exemption ruled 2026-08-01) / 5 phantom enum-value fields → STAGED delete (ruling AL-1,
--   see fll-naturteich-STAGED-phantom-fields.sql) / equations EQ-01..EQ-05 quoted (section E).
-- Quote conventions: md line breaks joined; "[...]" marks an omitted run inside one clause.
-- Rollback: scripts/verification/rollback-fll-naturteich-md-verification-pack.sql
-- ============================================================================

-- ---------- FLLNT-01 Projekteinrichtung & Kundenberatung ----------

-- client_name / client_address / project_id / project_name / planning_date → app metadata (exempt class)
update public.fields set verification_status='inferred_from_worksheet', verification_note='md-pass 2026-09-05: app/project metadata — the guideline does not define this field (App.3/App.4 checklists list "Customer", "Planning expert" as record headers only); exempt from SR-1 per the 2026-08-01 metadata ruling', verified_at=now() where id in ('0d355dde-66ca-48d0-a241-0e9fe65e474c','e1ecae7b-64a7-4c4e-a914-8b9112511a75','318e54a1-76ed-44f7-ab96-faab74bb3819','6018a3da-72ae-4e08-89c8-5976068b45a9','e963c39d-e216-4223-9b80-fdd98e8fe199') and verification_status not in ('verified_against_standard','corrected');

-- planner_name (clause_reference says §8.4; the normative anchor is §8.1.4 — retag proposed in STAGED file)
update public.fields set verification_status='verified_against_standard', verification_quote='During the construction phase, the person to whom the management of the site has been transferred, i. e. the planning expert or supplier, is also responsible in addition to the property owner. — printed p.37', verification_note='md-verified 2026-09-05 (§8.1.4, printed p.37) [VC]', verified_at=now() where id='80babe71-060c-4c41-8e54-54491fad6cfe' and verification_status not in ('verified_against_standard','corrected');

-- contractor_name
update public.fields set verification_status='verified_against_standard', verification_quote='During the construction phase, the person to whom the management of the site has been transferred, i. e. the planning expert or supplier, is also responsible in addition to the property owner. — printed p.37', verification_note='md-verified 2026-09-05 (§8.1.4, printed p.37) [VC]', verified_at=now() where id='ececcdbb-8ab0-49d2-bdc6-205f7d728ce0' and verification_status not in ('verified_against_standard','corrected');

-- pool_use_type (enum single/multi household is EKOWAI granularity; the source only distinguishes private vs commercial/public)
update public.fields set verification_status='verified_against_standard', verification_quote='which are exclusively used for private purposes; [...] Installations which are used for commercial and public purposes and not exclusively for private purposes in accordance with § 37 of the Infektionsschutzgesetz (German Infection Protection Act) (e. g. hotel pools) are subject to the "Richtlinien für Planung, Bau, Instandhaltung und Betrieb von öffentlichen Schwimm- und Badeteichanlagen". — printed p.9', verification_note='md-verified 2026-09-05 (§1.1, printed p.9) [VC]; note: single- vs multi-household split is not in the source', verified_at=now() where id='c4925ac7-9c85-4289-bd2b-333d2e76fbb6' and verification_status not in ('verified_against_standard','corrected');

-- consultation_checklist_completed
update public.fields set verification_status='verified_against_standard', verification_quote='The decision as to which type is most suitable must be made taking consultation with the planning expert into account and after weighing up the personal requirements of the pool owner and the conditions on location. In this phase, extensive consultation must take place; please also refer to Appendix 3. — printed p.21', verification_note='md-verified 2026-09-05 (§5 + Appendix 3, printed p.21/74) [VC]', verified_at=now() where id='9354feae-4b5f-4082-bb9d-0fdca8bec43c' and verification_status not in ('verified_against_standard','corrected');

-- intended_use_intensity (enum low/medium/high is EKOWAI granularity; source gives the principle + 10 m³/user)
update public.fields set verification_status='verified_against_standard', verification_quote='The type and size of the swimming area and regeneration area must be adapted to the behaviour of the users. A minimum water volume of 10 m3 per user is recommended. — printed p.31', verification_note='md-verified 2026-09-05 (§6.5, printed p.31) [VC]; note: low/medium/high bands are not in the source', verified_at=now() where id='bcf79d2d-8c7f-4d9d-8840-9e61ace5d7d0' and verification_status not in ('verified_against_standard','corrected');

-- attest_fllnt_01_req_03 (§8.1.3 / §9.1)
update public.fields set verification_status='verified_against_standard', verification_quote='Prior to planning and site selection, it may be necessary to conduct pilot surveys of the land – e. g. boreholes, probes – with regard to: soil conditions, in particular: grown or heaped subsoil; soil type; stiffness (consistency); load-bearing capacity; composition of the layers; expected settling, risk of ground breakage; groundwater level; stratum water; existence of supply and discharge installations and other obstacles — printed p.37 | The subsoil must be load-bearing otherwise it should be compacted or improved using other means (e. g. by putting down a suitable ground layer). It may be necessary to have the ground structurally verified. — printed p.41', verification_note='md-verified 2026-09-05 (§8.1.3 p.37, §9.1 p.41) [VC]', verified_at=now() where id='cbea4d56-29a6-4e50-b0b8-7fe49dd846ce' and verification_status not in ('verified_against_standard','corrected');

-- attest_fllnt_01_req_04 (§8.1.4)
update public.fields set verification_status='verified_against_standard', verification_quote='Every property owner is subject to the legal duty to maintain safety and this also applies to private natural pools. This legal duty to maintain safety applies both during the construction phase and after completion of the natural pool. — printed p.37 | In order to reduce the risks for children, it must usually be ensured that children cannot gain access to the property or have an accident in the pool, e. g. by enclosing the property; [...] safety measures must be more and more effective the greater the appeal the pool has to children (e. g. splashing brook, stepping stones). — printed p.38', verification_note='md-verified 2026-09-05 (§8.1.4, printed p.37-38) [VC]', verified_at=now() where id='ac9fb01c-a576-4ad9-a4a1-3337d9873512' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-02 Standortanalyse & Untergrundverhältnisse ----------

-- site_address
update public.fields set verification_status='verified_against_standard', verification_quote='The surrounding conditions that have an effect on construction, maintenance and usage particularly include: risk of flooding; climatic and air hygiene conditions; reserves/protected areas; high voltage cables, other overhead power lines; topography, relief; use of adjacent surfaces (e.g. agriculture, industry). — printed p.36', verification_note='md-verified 2026-09-05 (§8.1.1, printed p.36) [VC]', verified_at=now() where id='d8a5f846-68d5-435d-a900-187ea1811c09' and verification_status not in ('verified_against_standard','corrected');

-- subsoil_type (enum rock/gravel/sand/clay/loam/mixed/fill is EKOWAI granularity; source names "soil type")
update public.fields set verification_status='verified_against_standard', verification_quote='soil conditions, in particular: grown or heaped subsoil; soil type; stiffness (consistency); load-bearing capacity; composition of the layers; — printed p.37', verification_note='md-verified 2026-09-05 (§8.1.3, printed p.37) [VC]; note: the soil-class list is EKOWAI''s, source says "soil type" and refers to DIN 18196', verified_at=now() where id='9acc90c7-0efd-4b75-a76b-2ecfbc46876f' and verification_status not in ('verified_against_standard','corrected');

-- groundwater_level
update public.fields set verification_status='verified_against_standard', verification_quote='expected settling, risk of ground breakage; groundwater level; stratum water; existence of supply and discharge installations and other obstacles; miscellaneous (e. g. the presence of aggressive water, quicksand). — printed p.37 | Respective measures such as drainage systems e.g. must be taken if groundwater or stratum water is expected. — printed p.41', verification_note='md-verified 2026-09-05 (§8.1.3 p.37, §9.1 p.41) [VC]', verified_at=now() where id='a7aa9385-60a3-4c24-bf75-cbc4d63eb6fe' and verification_status not in ('verified_against_standard','corrected');

-- existing_system
update public.fields set verification_status='verified_against_standard', verification_quote='Appendix 4 (informative): Checklist for existing systems — Date of inspection: [...] Customer: [...] Builder: [...] Planning expert: [...] Year of construction: [...] Problems: [...] 1. CLASSIFICATION/GENERAL INFORMATION 1.2 Dimensioning — printed p.78', verification_note='md-verified 2026-09-05 (Appendix 4, printed p.78) [VC]; informative appendix', verified_at=now() where id='44b7fa64-d68a-4a55-9304-8a7a59894408' and verification_status not in ('verified_against_standard','corrected');

-- enclosure_provided
update public.fields set verification_status='verified_against_standard', verification_quote='In the process, fences should comply with the following requirements, provided the respective state building code does not stipulate anything to the contrary: Minimum height 1 meter; distance between horizontal slats ≤ 4 cm; distance between vertical slats ≤ 11 cm; ground clearance ≤ 11 cm; door/gate with lock. — printed p.38', verification_note='md-verified 2026-09-05 (§8.1.4, printed p.38) [VC]', verified_at=now() where id='1bf86046-8743-4b44-9f52-ed55f678415f' and verification_status not in ('verified_against_standard','corrected');

-- operating_manual_provided
update public.fields set verification_status='verified_against_standard', verification_quote='A written operating manual must be created for the proper planning and construction of a natural pond. This includes: required checks; required maintenance and care work as well as the corresponding intervals; instruction manuals for technical products used (e.g. circulation pump, skimmer or controlled quick flow through technical unit); instructions for use. Furthermore, the purchaser must be instructed to the necessary extent verbally and practically. — printed p.39', verification_note='md-verified 2026-09-05 (§8.1.5, printed p.39) [VC]', verified_at=now() where id='a76f0575-38c2-4093-9a5d-f1217b2a30b4' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-04 Wasserqualitäts-Anforderungen (Tab.7 fill-up water p.32 / Tab.8 swimming area p.33) ----------

-- water_source
update public.fields set verification_status='verified_against_standard', verification_quote='Tap water, well water and rainwater are all potentially suitable as fill-up water. [...] Rainwater cannot be introduced directly because of the atmospheric substance deposition, e.g. on roofs. [...] Surface water from rivers and lakes cannot be introduced. The suitability of fill-up water must always be checked. — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1, printed p.32) [VC]', verified_at=now() where id='f07e7cf1-3654-4693-a277-6a1ecfdbbaee' and verification_status not in ('verified_against_standard','corrected');

-- water_test_ammonium
update public.fields set verification_status='verified_against_standard', verification_quote='Table 7: Approximate chemical values for the fill-up water – if applicable, after purification — 1 Ammonium ≤ 0.5 mg/l — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1 Tab.7 row 1, printed p.32) [VC]', verified_at=now() where id='7632a838-5af8-4b8b-a94d-5e4bda1db5aa' and verification_status not in ('verified_against_standard','corrected');

-- water_test_iron
update public.fields set verification_status='verified_against_standard', verification_quote='Table 7: Approximate chemical values for the fill-up water – if applicable, after purification — 2 Iron ≤ 0.2 mg/l — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1 Tab.7 row 2, printed p.32) [VC]', verified_at=now() where id='6c9e20b2-22a1-479a-ac71-afe56297fc56' and verification_status not in ('verified_against_standard','corrected');

-- water_test_p_total
update public.fields set verification_status='verified_against_standard', verification_quote='Table 7: Approximate chemical values for the fill-up water – if applicable, after purification — 3 Total phosphorus [Ptotal] ≤ 0.03 mg/l — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1 Tab.7 row 3, printed p.32) [VC]', verified_at=now() where id='e2bd676a-0de4-4aa7-b1b5-777876279a60' and verification_status not in ('verified_against_standard','corrected');

-- water_test_orthophosphate
update public.fields set verification_status='verified_against_standard', verification_quote='Table 7: Approximate chemical values for the fill-up water – if applicable, after purification — 8 Orthophosphate (indicated as P) ≤ 0.01 mg/l — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1 Tab.7 row 8, printed p.32) [VC]', verified_at=now() where id='0346b8a3-2d57-4e36-8d20-456d99787936' and verification_status not in ('verified_against_standard','corrected');

-- water_test_hardness
update public.fields set verification_status='verified_against_standard', verification_quote='Table 7: Approximate chemical values for the fill-up water – if applicable, after purification — 4 Hardness (total alkaline earth) Corresponds to total hardness ≥ 1.0 mmol/l ≥ 5.6 dH° — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1 Tab.7 row 4, printed p.32) [VC]', verified_at=now() where id='e2341a70-9b62-4327-92cd-c12e3f15f0ba' and verification_status not in ('verified_against_standard','corrected');

-- water_test_conductivity
update public.fields set verification_status='verified_against_standard', verification_quote='Table 7: Approximate chemical values for the fill-up water – if applicable, after purification — 5 Conductivity ≤ 1000 μS/cm at 20°C — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1 Tab.7 row 5, printed p.32) [VC]', verified_at=now() where id='d4a4ec09-d551-4d8b-b711-fb0e73220a44' and verification_status not in ('verified_against_standard','corrected');

-- water_test_manganese
update public.fields set verification_status='verified_against_standard', verification_quote='Table 7: Approximate chemical values for the fill-up water – if applicable, after purification — 6 Manganese ≤ 0.05 mg/l — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1 Tab.7 row 6, printed p.32) [VC]', verified_at=now() where id='743420da-4013-4eb8-b515-cafb6b9a5f69' and verification_status not in ('verified_against_standard','corrected');

-- water_test_nitrate
update public.fields set verification_status='verified_against_standard', verification_quote='Table 7: Approximate chemical values for the fill-up water – if applicable, after purification — 7 Nitrate ≤ 50.0 mg/l — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1 Tab.7 row 7, printed p.32) [VC]', verified_at=now() where id='b3dd5171-544b-4dc1-a949-49396bac89a1' and verification_status not in ('verified_against_standard','corrected');

-- water_test_ph
update public.fields set verification_status='verified_against_standard', verification_quote='Table 7: Approximate chemical values for the fill-up water – if applicable, after purification — 9 pH value 6.0 – 9.0 — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1 Tab.7 row 9, printed p.32) [VC]', verified_at=now() where id='73860b84-a087-490e-9274-060500006bf7' and verification_status not in ('verified_against_standard','corrected');

-- water_test_acid_capacity_ks43
update public.fields set verification_status='verified_against_standard', verification_quote='Table 7: Approximate chemical values for the fill-up water – if applicable, after purification — 10 Acid capacity KS 4.3 Corresponds to carbon hardness ≥ 2 mmol/l ≥ 5.6 dH° — printed p.32', verification_note='md-verified 2026-09-05 (§7.1.1 Tab.7 row 10, printed p.32) [VC]', verified_at=now() where id='9fa9c550-8367-496c-9641-ee9a1dc62d06' and verification_status not in ('verified_against_standard','corrected');

-- swimming_test_ammonium
update public.fields set verification_status='verified_against_standard', verification_quote='Table 8: Approximate chemical values for the swimming area — 1 Ammonium ≤ 0.3 mg/l — printed p.33', verification_note='md-verified 2026-09-05 (§7.1.2 Tab.8 row 1, printed p.33) [VC]', verified_at=now() where id='95c850cd-ffda-47fa-8146-8cf0c98a389e' and verification_status not in ('verified_against_standard','corrected');

-- swimming_test_p_total
update public.fields set verification_status='verified_against_standard', verification_quote='Table 8: Approximate chemical values for the swimming area — 2 Total phosphorus [Ptotal] ≤ 0.03 mg/l (type I-III) ≤ 0.01 mg/l (type IV, V) — printed p.33', verification_note='md-verified 2026-09-05 (§7.1.2 Tab.8 row 2, printed p.33) [VC]', verified_at=now() where id='c8919295-d266-4cae-be33-981c2f789f6d' and verification_status not in ('verified_against_standard','corrected');

-- swimming_test_hardness
update public.fields set verification_status='verified_against_standard', verification_quote='Table 8: Approximate chemical values for the swimming area — 3 Hardness (total alkaline earth) Corresponds to total hardness ≥ 1.0 mmol/l ≥ 5.6 dH° — printed p.33', verification_note='md-verified 2026-09-05 (§7.1.2 Tab.8 row 3, printed p.33) [VC]', verified_at=now() where id='dd14cc02-4759-4f87-aa1e-8b33153f3bec' and verification_status not in ('verified_against_standard','corrected');

-- swimming_test_conductivity
update public.fields set verification_status='verified_against_standard', verification_quote='Table 8: Approximate chemical values for the swimming area — 4 Conductivity ≤ 1000 μS/cm at 20°C — printed p.33', verification_note='md-verified 2026-09-05 (§7.1.2 Tab.8 row 4, printed p.33) [VC]', verified_at=now() where id='92147b5b-4411-47e3-9749-8b89ad3a4ee5' and verification_status not in ('verified_against_standard','corrected');

-- swimming_test_nitrate
update public.fields set verification_status='verified_against_standard', verification_quote='Table 8: Approximate chemical values for the swimming area — 5 Nitrate ≤ 30.0 mg/l — printed p.33', verification_note='md-verified 2026-09-05 (§7.1.2 Tab.8 row 5, printed p.33) [VC]', verified_at=now() where id='cf8414c1-87ea-4377-800e-775f6943aec6' and verification_status not in ('verified_against_standard','corrected');

-- swimming_test_nitrite
update public.fields set verification_status='verified_against_standard', verification_quote='Table 8: Approximate chemical values for the swimming area — 6 Nitrite ≤ 0.01 mg/l — printed p.33', verification_note='md-verified 2026-09-05 (§7.1.2 Tab.8 row 6, printed p.33) [VC]', verified_at=now() where id='83ae0aa5-ca66-41da-b824-48482ac54689' and verification_status not in ('verified_against_standard','corrected');

-- swimming_test_orthophosphate
update public.fields set verification_status='verified_against_standard', verification_quote='Table 8: Approximate chemical values for the swimming area — 7 Orthophosphate (indicated as P) ≤ 0.03 mg/l (type I-III) ≤ 0.01 mg/l (type IV, V) — printed p.33', verification_note='md-verified 2026-09-05 (§7.1.2 Tab.8 row 7, printed p.33) [VC]', verified_at=now() where id='a09b608e-6634-440d-87e8-6a2e84ef17f9' and verification_status not in ('verified_against_standard','corrected');

-- swimming_test_ph
update public.fields set verification_status='verified_against_standard', verification_quote='Table 8: Approximate chemical values for the swimming area — 8 pH value 7.0 – 9.0 — printed p.33', verification_note='md-verified 2026-09-05 (§7.1.2 Tab.8 row 8, printed p.33) [VC]', verified_at=now() where id='f2545fa7-ee37-4799-aee1-4a3711378afb' and verification_status not in ('verified_against_standard','corrected');

-- swimming_test_acid_capacity_ks43
update public.fields set verification_status='verified_against_standard', verification_quote='Table 8: Approximate chemical values for the swimming area — 9 Acid capacity KS 4.3 Corresponds to carbon hardness ≥ 2 mmol/l ≥ 5.6 dH° — printed p.33', verification_note='md-verified 2026-09-05 (§7.1.2 Tab.8 row 9, printed p.33) [VC]', verified_at=now() where id='1a0c8020-c000-4a98-b5c2-8f0c1a333d69' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-05 Baustoff-Anforderungen ----------

-- filter_substrate_elutriated_pct
update public.fields set verification_status='verified_against_standard', verification_quote='Filter substrates that are used in controlled quick flow through filter bodies (natural pool type IV) should indicate a silt and clay percentage (< 0.063 mm) of ≤ 0.5% by weight; a threshold value of ≤ 2% by weight applies here for all other filter substrates. — printed p.34', verification_note='md-verified 2026-09-05 (§7.2.3 + Tab.9, printed p.34) [VC]', verified_at=now() where id='2da2c1a4-a182-46cc-88b5-0179e3e6c2f4' and verification_status not in ('verified_against_standard','corrected');

-- plant_substrate_compliant
update public.fields set verification_status='verified_against_standard', verification_quote='Plant substrates must be as free as possible from organic parts (risk of decay, uncontrolled nutrient release). It is best to use fine-grained material because coarser material usually makes rooting and plant development more difficult. The largest grain should not exceed 8 mm. — printed p.35 | Table 9 — Plant substrate: Recommended maximum grain size 8 mm; Oversized grain percentage no requirement; Percentage of elutriated parts no requirement; Permeability coefficient no requirement; Frost resistance no requirement; Elutable phosphorus level no requirement — printed p.34', verification_note='md-verified 2026-09-05 (§7.2.4 p.35, Tab.9 p.34) [VC]', verified_at=now() where id='466833cb-ebd9-4bc2-8670-a34955bedc8b' and verification_status not in ('verified_against_standard','corrected');

-- concrete_spec_compliant
update public.fields set verification_status='verified_against_standard', verification_quote='Concrete must have hardened before filling in water. Concrete and mortar must be used in a manner that prevents calcareous deposits. Please observe the requirements for concrete according to DIN-EN 206-1. Required potential equalization measures must be executed according to DIN VDE 0100-410. — printed p.33', verification_note='md-verified 2026-09-05 (§7.2.1, printed p.33) [VC]', verified_at=now() where id='a7ddfe39-a7ea-45be-b465-e6ba592b3386' and verification_status not in ('verified_against_standard','corrected');

-- wood_treatment_compliant
update public.fields set verification_status='verified_against_standard', verification_quote='When using wood in or around the pool please observe that substances can be released into the water depending on the type and processing of the wood. In particular, this includes tanning agents as well as substances with a biocidal effect. — printed p.33 | wood preservatives/surface treatment (e.g. cannot give off any substances that are harmful to human health and/or adversely effect the biology of the natural pool); — printed p.34', verification_note='md-verified 2026-09-05 (§7.2.2, printed p.33-34) [VC]', verified_at=now() where id='7325190b-d714-4373-ba7d-b5f96bbbc18f' and verification_status not in ('verified_against_standard','corrected');

-- filter_substrate_elutable_p (unit: source prints "mg P/kg")
update public.fields set verification_status='verified_against_standard', verification_quote='The level of elutable phosphorus should not exceed 5 mg P/kg. — printed p.34 | Table 9 — Elutable phosphorus level ≤ 5 mg P/kg ≤ 5 mg P/kg no requirement — printed p.34 | Appendix 2 (normative): Definition of the elutable phosphorus level in construction materials — printed p.70', verification_note='md-verified 2026-09-05 (§7.2.3 + Tab.9 p.34, App.2 p.70) [VC]; note: unit printed as "mg P/kg"', verified_at=now() where id='f20f8b04-9567-4137-a918-be8b4e5631d2' and verification_status not in ('verified_against_standard','corrected');

-- filter_substrate_oversize_pct
update public.fields set verification_status='verified_against_standard', verification_quote='Filter substrates must be free of organic parts (risk of decay, uncontrolled nutrient release). The percentage of oversized grain must not exceed 15% by weight. — printed p.34', verification_note='md-verified 2026-09-05 (§7.2.3 + Tab.9, printed p.34) [VC]', verified_at=now() where id='9f6e04f2-4e8e-4907-84f4-cff4aa0387c1' and verification_status not in ('verified_against_standard','corrected');

-- materials_biocide_free
update public.fields set verification_status='verified_against_standard', verification_quote='Materials installed in the water body or directly adjacent to it cannot lead to a long-term (longer than three weeks) negative effect on the water quality; the approximate values indicated in Table 8 must be adhered to. The materials must not have a biocidal or disinfect effect to the limnologic bioceonosis. — printed p.33', verification_note='md-verified 2026-09-05 (§7.2, printed p.33) [VC]', verified_at=now() where id='65029409-2e1b-4982-820e-fce8f0180ca3' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-06 Flächenplanung (attestations) ----------

-- attest_fllnt_06_req_14 (§9.1)
update public.fields set verification_status='verified_against_standard', verification_quote='The subsoil must be load-bearing otherwise it should be compacted or improved using other means (e. g. by putting down a suitable ground layer). It may be necessary to have the ground structurally verified. Respective measures such as drainage systems e.g. must be taken if groundwater or stratum water is expected. — printed p.41', verification_note='md-verified 2026-09-05 (§9.1, printed p.41) [VC]', verified_at=now() where id='e321d373-b571-44bd-b35b-489666da2c23' and verification_status not in ('verified_against_standard','corrected');

-- attest_fllnt_06_req_18 (§9.5.1-3)
update public.fields set verification_status='verified_against_standard', verification_quote='The surfaces (e. g. bottoms, walls, additional components installed in the pool) in the swimming area must be able to be maintained and cleaned as easily as possible. There cannot be any sharp edges. There should be no plants in the swimming area. [...] Ground coverings, including steps on stairs and ladders, must be made safe to walk on and must be slip resistant. [...] Only washed material must be used in cases of sand and gravel areas inside the swimming area. [...] There must be at least one entry/exit point in the swimming area. [...] Entry and exit ladders made of metal must be earthed according to DIN VDE 0100-702. — printed p.43', verification_note='md-verified 2026-09-05 (§9.5.1-9.5.3, printed p.43) [VC]', verified_at=now() where id='fe1cef4b-9bb8-4569-9c5a-911f850df25f' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-08 Anlagenausstattung & Leistungsbeschreibung ----------

-- service_description_provided
update public.fields set verification_status='verified_against_standard', verification_quote='Sections 0 of the Allgemeinen Technischen Vertragsbedingungen für Bauleistungen (ATV) (General technical contractual specifications for construction contracts) of part C of the VOB contain instructions for drawing up the description of services. Compliance with these instructions is prerequisite for a proper description of services. — printed p.40', verification_note='md-verified 2026-09-05 (§8.4, printed p.40) [VC]', verified_at=now() where id='6d80bc47-9de0-4625-b7c2-b692debbbacb' and verification_status not in ('verified_against_standard','corrected');

-- equipment_elements_list
update public.fields set verification_status='verified_against_standard', verification_quote='For example, equipment elements include: walkways; ladders/stairs; platforms; showers; diving rocks/boards; underwater lighting; covers; counter current system; fountains/streams; heater. Possible interferences with the overall system must be taken into account. The planning of equipment elements must particularly take into account the structural analysis, durability, corrosion and transport safety (e. g. slip resistance). — printed p.39-40', verification_note='md-verified 2026-09-05 (§8.3, printed p.39-40) [VC]; the list is "for example" (non-exhaustive) — seeded+extensible widget, not closed enum', verified_at=now() where id='2e34761a-5bc2-4505-b443-68ab3540097c' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-09 Hydrobotanisches System – Bemessung (Tab.10 p.47) ----------

-- hydrobot_water_column
update public.fields set verification_status='verified_against_standard', verification_quote='Table 10: Structural requirements for hydrobotanical systems — 2 Water column height ≥ 80 cm (submergent) 10 – 50 cm (emersed) — printed p.47', verification_note='md-verified 2026-09-05 (§10.2.1 Tab.10 row 2, printed p.47) [VC]', verified_at=now() where id='cc0daed6-65dc-498b-81cf-317164e75dad' and verification_status not in ('verified_against_standard','corrected');

-- hydrobot_substrate_thickness
update public.fields set verification_status='verified_against_standard', verification_quote='Table 10: Structural requirements for hydrobotanical systems — 3 Thickness of substrate layer 10 – 20 cm (submergent) 10 – 30 cm (emersed) — printed p.47 | the thickness of the vegetation support layer should be at least 10 cm. — printed p.46', verification_note='md-verified 2026-09-05 (§10.2.1 Tab.10 row 3 p.47, §10.2.1 p.46) [VC]', verified_at=now() where id='05856103-49de-44df-ba44-e774fa223d2e' and verification_status not in ('verified_against_standard','corrected');

-- hydrobot_grain_size_max
update public.fields set verification_status='verified_against_standard', verification_quote='Table 10: Structural requirements for hydrobotanical systems — 5 Grain size range 1) Location of the plant ≤ 8 mm; Filters — — | 1) The grain distribution curve of the substrate can deviate from the information in the table if the listed properties or requirements are not decisively influenced by therefrom. — printed p.47', verification_note='md-verified 2026-09-05 (§10.2.1 Tab.10 row 5, printed p.47) [VC]', verified_at=now() where id='0a0698ab-ecb1-4a3e-bf23-4bb5aeb41e56' and verification_status not in ('verified_against_standard','corrected');

-- hydrobot_feed_rate
update public.fields set verification_status='verified_against_standard', verification_quote='Table 10: Structural requirements for hydrobotanical systems — 12 Feed rate Qmax 5 m3/(m2 x day) 5 m3/(m2 x day) — printed p.47', verification_note='md-verified 2026-09-05 (§10.2.1 Tab.10 row 12, printed p.47) [VC]', verified_at=now() where id='37a47776-2997-4c2b-bf19-5c73d2668a39' and verification_status not in ('verified_against_standard','corrected');

-- hydrobot_type
update public.fields set verification_status='verified_against_standard', verification_quote='Hydrobotanical systems are designed using submerged plants (formerly called aquaculture) or emersed plants. Aquatic or marsh plants and zooplankton are significant elements for water purification here. — printed p.45 | Table 10 — Hydrobotanical systems: submergent / Emersed — printed p.47', verification_note='md-verified 2026-09-05 (§10.2.1 p.45, Tab.10 p.47) [VC]', verified_at=now() where id='8b81be0b-e349-4f74-9a50-d8c3f044cfa0' and verification_status not in ('verified_against_standard','corrected');

-- attest_fllnt_09_req_23 (§10.3)
update public.fields set verification_status='verified_against_standard', verification_quote='Overflow weirs are used to remove the bulk of dirt particles that accumulate on the surface (e.g. leaves, pollen), so that they do not drop to the bottom. [...] A distinction is made: rigid overflow weir, e.g. gully; flexible overflow weir, e.g. skimmer. The number, type and arrangement of the water discharge/extraction devices should be chosen according to the volumetric recirculation current, the local conditions and the planned type of natural pool. — printed p.54', verification_note='md-verified 2026-09-05 (§10.3.1, printed p.54) [VC]', verified_at=now() where id='a9817821-2e98-4bfc-85bf-13e007ca6e68' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-10 Substratfilter – Bemessung (Tab.11 p.50 slow / Tab.12 p.52 quick / App.5 p.82) ----------

-- filter_flow_type
update public.fields set verification_status='verified_against_standard', verification_quote='Here, the regeneration techniques are summarized in the following techniques: hydrobotanical systems; controlled slow flow through the substrate filter; controlled quick flow through the substrate filter; controlled flow through the technical unit. — printed p.45', verification_note='md-verified 2026-09-05 (§10.1, printed p.45; §10.2.2 p.49 / §10.2.3 p.51) [VC]', verified_at=now() where id='91919f28-b9c9-4e01-9444-de03712aa668' and verification_status not in ('verified_against_standard','corrected');

-- filter_flow_direction
update public.fields set verification_status='verified_against_standard', verification_quote='The flow through a substrate filter with a controlled slow flow is vertical or horizontal. — printed p.49 | Table 11 — Substrate filter: vertical flow, continuous full-surface overflow / vertical flow, no overflow / horizontal flow — printed p.50', verification_note='md-verified 2026-09-05 (§10.2.2 p.49, Tab.11 p.50, Tab.12 p.52) [VC]', verified_at=now() where id='990fe82f-82a4-4951-b2aa-19a63fdeacb6' and verification_status not in ('verified_against_standard','corrected');

-- filter_water_column
update public.fields set verification_status='verified_against_standard', verification_quote='Table 11 — 2 Water column height ≥ 10 cm — Individual verification no further information — printed p.50 | Table 12 — 2 Water column height ≥ 0 cm — Individual verification no further information — printed p.52', verification_note='md-verified 2026-09-05 (Tab.11 row 2 p.50, Tab.12 row 2 p.52) [VC]', verified_at=now() where id='f59729d9-2371-41a4-b207-df0bb827dabe' and verification_status not in ('verified_against_standard','corrected');

-- filter_layer_thickness
update public.fields set verification_status='verified_against_standard', verification_quote='Table 11 — 3 Thickness of the filter-effective layer ≥ 40 cm — printed p.50 | Table 12 — 3 Thickness of the filter-effective layer ≥ 50 cm — printed p.52', verification_note='md-verified 2026-09-05 (Tab.11 row 3 p.50, Tab.12 row 3 p.52) [VC]', verified_at=now() where id='71f7e4b6-032b-4558-aae0-7524d186b1e2' and verification_status not in ('verified_against_standard','corrected');

-- filter_grain_size_max
update public.fields set verification_status='verified_against_standard', verification_quote='Table 11 — 5 Grain size range 1) [...] Filters ≤ 16 mm — printed p.50 | Table 12 — 5 [...] Filters ≤ 32 mm — printed p.52 | 1) The grain distribution curve of the substrate must allow the specified permeability [permeability coefficient] to be achieved with the specified grain size range.', verification_note='md-verified 2026-09-05 (Tab.11 row 5 p.50, Tab.12 row 5 p.52) [VC]', verified_at=now() where id='cc24a6a1-49b7-464c-8015-e0ec441ba8fc' and verification_status not in ('verified_against_standard','corrected');

-- filter_kf
update public.fields set verification_status='verified_against_standard', verification_quote='Table 11 — 13 Permeability coefficient ≥ 10-4 m/s ≥ 10-4 m/s Individual verification no further information — printed p.50 | Table 12 — 13 Permeability coefficient ≥ 10-3 m/s ≥ 10-3 m/s Individual verification no further information — printed p.52', verification_note='md-verified 2026-09-05 (Tab.11 row 13 p.50, Tab.12 row 13 p.52) [VC]; "10-4"/"10-3" = 10⁻⁴/10⁻³ (superscript lost in md)', verified_at=now() where id='35481af4-79df-4cf1-88c7-c8743d8bc7e2' and verification_status not in ('verified_against_standard','corrected');

-- filter_feed_rate_slow_qmax
update public.fields set verification_status='verified_against_standard', verification_quote='Table 11 — 14 Feed rate Qmax 5 m3/(m2 x day) (vertical flow, continuous full-surface overflow) 8 m3/(m2 x day) (vertical flow, no overflow) — printed p.50', verification_note='md-verified 2026-09-05 (§10.2.2 Tab.11 row 14, printed p.50) [VC]', verified_at=now() where id='29789cf6-00ce-4e89-b176-980ce73c15c6' and verification_status not in ('verified_against_standard','corrected');

-- filter_feed_rate_quick_qmin
update public.fields set verification_status='verified_against_standard', verification_quote='According to experience, substrate filters with a controlled quick flow must be operated with a feed rate of Qmin ≥ 15 m3/(m2 x day). Smaller feed rates are permissible if the functionality of pool is ensured. — printed p.52 | Table 12 — 14 Feed rate Qmin ≥ 15 m3/(m2 x day) ≥ 15 m3/(m2 x day) — printed p.52', verification_note='md-verified 2026-09-05 (§10.2.3 + Tab.12 row 14, printed p.52) [VC]', verified_at=now() where id='72d494f1-d25c-41d0-8737-f2cec38329e9' and verification_status not in ('verified_against_standard','corrected');

-- filter_layer_tolerance_pct
update public.fields set verification_status='verified_against_standard', verification_quote='Table 11 — 11 Layer thickness tolerance 10% deviation — printed p.50 | Table 12 — 11 Layer thickness tolerance 10% deviation — printed p.52', verification_note='md-verified 2026-09-05 (Tab.11/Tab.12 row 11, printed p.50/52) [VC]', verified_at=now() where id='c0f4162a-4fcd-46ff-9ff4-f27b9c6988ef' and verification_status not in ('verified_against_standard','corrected');

-- filter_frost_resistance
update public.fields set verification_status='verified_against_standard', verification_quote='Table 11 — 8 Frost resistance is mandatory — printed p.50 | Table 12 — 8 Frost resistance is mandatory — printed p.52 | Table 9 — Frost resistance is mandatory is mandatory no requirement — printed p.34', verification_note='md-verified 2026-09-05 (Tab.11/12 row 8, Tab.9) [VC]', verified_at=now() where id='6f8c60bf-5540-4678-aca4-b92f4532b6c7' and verification_status not in ('verified_against_standard','corrected');

-- grain_specific_surface (Tab.15 p.83)
update public.fields set verification_status='verified_against_standard', verification_quote='Table 15: Grain sizes – surfaces. The values were determined using dolomite gravel — Grain size / Pore water [%] / Surface [m2/m3]: Grain 4/6 43 1400; Grain 4/8 43 1200; Grain 6/8 43 1000; Grain 8/12 44 700; Grain 8/16 44 600; Grain 12/16 47 500; Grain 16/22 48 350; Grain 16/32 47 300; Grain 22/32 47 250. Size of the grain surface depends on its composition of grain sizes — printed p.83', verification_note='md-verified 2026-09-05 (Appendix 5 Tab.15, printed p.83) [VC]; informative appendix', verified_at=now() where id='dea4de02-9984-48fd-96e5-7aa455ce8cb8' and verification_status not in ('verified_against_standard','corrected');

-- filter_volume_required (App.5 Example 2)
update public.fields set verification_status='verified_against_standard', verification_quote='Required colonized surface in the filter 95 m2 x 50 = 4750 m2. a) Assumed grain size of the filter material 8-16 mm (according to Table 1): Surface filter material 600 m2/m3. Required filter volume: 4750 m2 / 600 m2 / m3 = approx. 8 m3. b) Assumed grain size of the filter material 4-8 mm (according to Table 1): Surface filter material 1200 m2/m3. Required filter volume: 4750 m2 / 1200 m2 / m3 = approx. 4 m3 — printed p.82', verification_note='md-verified 2026-09-05 (Appendix 5 Example 2, printed p.82) [VC]; informative appendix', verified_at=now() where id='c30cbf4d-4d10-4156-93d1-f5c23d23d6b1' and verification_status not in ('verified_against_standard','corrected');

-- filter_colonized_surface_actual (App.5 Example 1)
update public.fields set verification_status='verified_against_standard', verification_quote='Example 1: known filter volume — Filter cross-section F: 15 m2; Filter height: 0.7 m; Surface grain size 8-16 mm (according to Table 1): 600 m2/m3. Surface of the filter body = 600 m2/m3 x 15 m2 x 0.7 m = 6300 m2 — printed p.82', verification_note='md-verified 2026-09-05 (Appendix 5 Example 1, printed p.82) [VC]; informative appendix', verified_at=now() where id='07ffd8bc-f339-4a63-96bf-cc7709f5e6e4' and verification_status not in ('verified_against_standard','corrected');

-- filter_50x_rule_met
update public.fields set verification_status='verified_against_standard', verification_quote='The outer grain surfaces of the filter material in the filter body that can be colonized should, as experience shows, amount to at least 50-times the surfaces of the pool that are exposed to light and inundated (refer to Appendix 5). Among others these surfaces include: surface of the bottom of the pool and pool walls; "decorative surfaces" (gravel areas with no flow, rocks for design purposes, etc.) — printed p.51', verification_note='md-verified 2026-09-05 (§10.2.3, printed p.51; Tab.5 p.26) [VC]; source modal is "should, as experience shows"', verified_at=now() where id='8b30e3ab-8874-4c81-b122-28334f56143c' and verification_status not in ('verified_against_standard','corrected');

-- aerobic_filtration_confirmed
update public.fields set verification_status='verified_against_standard', verification_quote='The filtration systems must operate aerobically in order to avoid a redissolution of phosphate. — printed p.45', verification_note='md-verified 2026-09-05 (§10.1, printed p.45) [VC]', verified_at=now() where id='b445f77e-433c-4239-90e9-84e5d258ac64' and verification_status not in ('verified_against_standard','corrected');

-- F_filter (EQ-02 input)
update public.fields set verification_status='verified_against_standard', verification_quote='Example 1: known filter volume — Filter cross-section F: 15 m2 — printed p.82', verification_note='md-verified 2026-09-05 (Appendix 5 Example 1, printed p.82) [VC]', verified_at=now() where id='32b4a9b3-114f-45ea-b508-8c5c76f85273' and verification_status not in ('verified_against_standard','corrected');

-- h_filter (EQ-02 input)
update public.fields set verification_status='verified_against_standard', verification_quote='Example 1: known filter volume — Filter height: 0.7 m — printed p.82', verification_note='md-verified 2026-09-05 (Appendix 5 Example 1, printed p.82) [VC]', verified_at=now() where id='8c7db450-77aa-47be-9785-020151684268' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-11 Wasserzirkulation & technische Anlagen (§10.3 p.54-55) ----------

-- circulation_type
update public.fields set verification_status='verified_against_standard', verification_quote='By positioning the water discharge/extraction devices in the "local" primary wind direction and by providing carefully controlled water recirculation, a continuous flow can be achieved that assists the effective removal of dirt that has entered the system. Unhindered inflow to the discharge devices must be ensured. — printed p.54', verification_note='md-verified 2026-09-05 (§10.3.1, printed p.54) [VC]', verified_at=now() where id='edee4304-ac5d-43b8-b174-1678fe9a2185' and verification_status not in ('verified_against_standard','corrected');

-- overflow_type (clause_reference §10.3.2 — the skimmer/weir distinction sits in §10.3.1; retag proposed)
update public.fields set verification_status='verified_against_standard', verification_quote='Water should be discharged from the surface by flowing over freely. [...] A distinction is made: rigid overflow weir, e.g. gully; flexible overflow weir, e.g. skimmer. — printed p.54 | An overflow must be provided at a suitable point, to discharge excess water. — printed p.55', verification_note='md-verified 2026-09-05 (§10.3.1 p.54, §10.3.2 p.55) [VC]', verified_at=now() where id='86a5eb0a-8994-4531-8454-2147d8b5a9df' and verification_status not in ('verified_against_standard','corrected');

-- intake_discharge_provided
update public.fields set verification_status='verified_against_standard', verification_quote='Please observe DGfdB R 60.03 if an intake, discharge and/or feed system is to be installed in the swimming area. — printed p.55 | To prevent excessive biofilm and algae growth, please make sure that there is no direct flow against bottom, wall or installation surfaces in regard to water return. — printed p.55', verification_note='md-verified 2026-09-05 (§10.3.3-10.3.4, printed p.55) [VC]', verified_at=now() where id='d21bba4f-ea0f-4669-a165-4993090bd34c' and verification_status not in ('verified_against_standard','corrected');

-- physical_chemical_used
update public.fields set verification_status='verified_against_standard', verification_quote='Physical and/or chemical techniques can only be used in conjunction with biological techniques and should only be regarded as supplementary methods. — printed p.53 | Water purification must be able to meet the requirements as defined in section 5 without these supplementary techniques. — printed p.45', verification_note='md-verified 2026-09-05 (§10.2.5 p.53, §10.1 p.45) [VC]', verified_at=now() where id='953f0a9d-3f2e-433e-8749-08218e7c2d2e' and verification_status not in ('verified_against_standard','corrected');

-- treatment_impermissible_used
update public.fields set verification_status='verified_against_standard', verification_quote='The following applications are deemed unsuitable and are impermissible because they can endanger the operation of the purification technique: disinfectants (e.g. chlorine, chlorine dioxide, ozone); biocides and biocidal products (e.g. insecticides, fungicides, algicides); products containing heavy metals; technical techniques based on silver and copper – these metals cannot be introduced in any form; UV disinfection; sonification. — printed p.45', verification_note='md-verified 2026-09-05 (§10.1, printed p.45) [VC]', verified_at=now() where id='2637a4b8-1f50-4f48-a3a7-4add77468fdc' and verification_status not in ('verified_against_standard','corrected');

-- overflow_edge_length
update public.fields set verification_status='verified_against_standard', verification_quote='As a guide for the required length of overflow edge, the following value can be used for flexible and rigid overflow weirs depending on the shape and type of the natural pool: 1% of the surface area of the swimming area in metres. Example: Swimming area 30 m2, 1% of 30 = 0.3 i. e. length of the overflow edge 0.3 m. — printed p.54', verification_note='md-verified 2026-09-05 (§10.3.1, printed p.54) [VC]; "guide" value', verified_at=now() where id='a080fa29-2461-4f49-a9c5-a8a3c15297ff' and verification_status not in ('verified_against_standard','corrected');

-- splash_water_tank_volume
update public.fields set verification_status='verified_against_standard', verification_quote='A water reservoir is mandatory when using rigid overflow weirs. [...] Approximate value for the dimensioning of the water reservoir: The usable volume of the splash water tank must be dimensioned so that at least 150 l per square metre can be provided to the inundated water surface. — printed p.54 | In the case of multi-area systems, only the water surface of the area to which the overflow weir is connected is taken into account. — printed p.55', verification_note='md-verified 2026-09-05 (§10.3.1, printed p.54-55) [VC]; reference area = inundated water surface of the connected area (EQ-05 uses pool_underwater_surface incl. walls — see AL-4 ruling)', verified_at=now() where id='e32ecaa2-f423-4afd-978c-ae1e2a999729' and verification_status not in ('verified_against_standard','corrected');

-- overflow_horizontal_tolerance_mm
update public.fields set verification_status='verified_against_standard', verification_quote='Overflow weirs are to be installed in a manner that the overflow edge does not deviate horizontally by more than +/- 2 mm or for overflow edges up to 1 m, by more than +/- 1 mm. — printed p.54', verification_note='md-verified 2026-09-05 (§10.3.1, printed p.54) [VC]', verified_at=now() where id='f131f0bd-cdf2-4500-9ec2-10d6ce304680' and verification_status not in ('verified_against_standard','corrected');

-- rigid_overflow_used
update public.fields set verification_status='verified_against_standard', verification_quote='A distinction is made: rigid overflow weir, e.g. gully; flexible overflow weir, e.g. skimmer. [...] A water reservoir is mandatory when using rigid overflow weirs. — printed p.54', verification_note='md-verified 2026-09-05 (§10.3.1, printed p.54) [VC]', verified_at=now() where id='4497fdde-cbcd-4642-8a0e-1ad41e3867b6' and verification_status not in ('verified_against_standard','corrected');

-- swimming_area_m2 (FLLNT-11 twin of the FLLNT-06 field — single-source candidate, noted)
update public.fields set verification_status='verified_against_standard', verification_quote='The size of the swimming area depends on the users'' requirements. As a guide value for the area intended for swimming, at least 8.0 x 4.0 m is recommended. — printed p.39 | Example: Swimming area 30 m2, 1% of 30 = 0.3 i. e. length of the overflow edge 0.3 m. — printed p.54', verification_note='md-verified 2026-09-05 (§8.2.1 p.39, §10.3.1 p.54) [VC]; duplicate of FLLNT-06.swimming_area_m2 — should inherit, not re-enter', verified_at=now() where id='23ea51f1-0e88-448c-96ff-be8e1f5b5337' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-12 Pflanzplan (§10.4 p.55-58) ----------

-- planting_completion_date
update public.fields set verification_status='verified_against_standard', verification_quote='According to this document, planting is completed with this pre-maturity care stage until the status "ready for acceptance inspection" has been attained. — printed p.57 | Plants are deemed to have reached maturity at which they can be accepted if it can be observed that they have established a footing or, in the case of underwater plants, if they have started to propagate. — printed p.58', verification_note='md-verified 2026-09-05 (§10.4.4, printed p.57-58) [VC]', verified_at=now() where id='22987a16-5b81-4c89-a09e-f394891e559f' and verification_status not in ('verified_against_standard','corrected');

-- pre_maturity_care_provided (source modal "recommend")
update public.fields set verification_status='verified_against_standard', verification_quote='We recommend allowing the installation firm to perform the pre-maturity care of the plants. During the pre-maturity care period, new plantings should be checked for unwanted foreign growth: once if planting takes place in the spring or during the vegetation period; once in the autumn and once in spring if planting takes place outside the vegetation period. — printed p.58', verification_note='md-verified 2026-09-05 (§10.4.5, printed p.58) [VC]; modal "recommend" — is_required review proposed', verified_at=now() where id='b30144d0-40be-4a55-afd2-52b527bf8c51' and verification_status not in ('verified_against_standard','corrected');

-- plant_density_submerged_per_m2
update public.fields set verification_status='verified_against_standard', verification_quote='For plant density, the following number of plants applies as an approximate value per m2 of planting surface area: submerged plants 6 – 10 plants; [...] The aforementioned number of plants applies to pot plants P 0.5 (500 cm3). — printed p.57', verification_note='md-verified 2026-09-05 (§10.4.3, printed p.57) [VC]; SR-2 range 6-10', verified_at=now() where id='ff2a3d55-f4d8-4666-8841-bbac6cbec293' and verification_status not in ('verified_against_standard','corrected');

-- plant_density_marsh_small_per_m2
update public.fields set verification_status='verified_against_standard', verification_quote='For plant density, the following number of plants applies as an approximate value per m2 of planting surface area: [...] half-height to tall marsh and aquatic plants 3 – 5 plants; — printed p.57', verification_note='md-verified 2026-09-05 (§10.4.3, printed p.57) [VC]; SR-2 range 3-5', verified_at=now() where id='7dd43570-1878-4eff-955a-ac6ec4862a01' and verification_status not in ('verified_against_standard','corrected');

-- plant_density_marsh_medium_per_m2
update public.fields set verification_status='verified_against_standard', verification_quote='For plant density, the following number of plants applies as an approximate value per m2 of planting surface area: [...] medium height to tall marsh and aquatic plants 5 – 7 plants; lilies and lily pads depending on type. — printed p.57', verification_note='md-verified 2026-09-05 (§10.4.3, printed p.57) [VC]; SR-2 range 5-7', verified_at=now() where id='ae3dde18-0c3c-4bf9-8805-a58765253c73' and verification_status not in ('verified_against_standard','corrected');

-- plant_species_list
update public.fields set verification_status='verified_against_standard', verification_quote='When selecting plants, the locational conditions regarding the type, particularly the aspired low nutrient concentrations as well as plant-sociological properties must be considered. Furthermore, plant species native to Central Europe must be favoured and in particular, no invasive alien species (non-indigenous species) are to be used. — printed p.29 | In accordance with DIN 18916, the plants and their packaging must meet the requirements of the "Gütebestimmungen für Stauden" (quality requirements for shrubs). — printed p.55', verification_note='md-verified 2026-09-05 (§6.2.2 p.29, §10.4.1 p.55) [VC]; no species list is printed — free register, not enum', verified_at=now() where id='130d57e0-f0ae-437a-9f01-be4334aadffc' and verification_status not in ('verified_against_standard','corrected');

-- attest_fllnt_12_req_25 (§10.4 / §6.2.2)
update public.fields set verification_status='verified_against_standard', verification_quote='Given that hardly any nutrients will be available to the plants when they are first planted, particularly strict requirements are placed on the correct choice of plants, the quality of the seed stock and the soil/substrate. Furthermore, it is extremely important that the planting itself is carried out very carefully. — printed p.55 | When planting in filter elements, please make sure that the plant''s root system does not compromise the functionality of the filter. — printed p.29', verification_note='md-verified 2026-09-05 (§10.4.1 p.55, §6.2.2 p.29) [VC]', verified_at=now() where id='469d4f03-b00a-45ad-b97f-076794c121fc' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-13 Abnahme (§11 p.59, §12.4 p.64) ----------

-- acceptance_passed
update public.fields set verification_status='verified_against_standard', verification_quote='The acceptance inspection is the physical acceptance of the service provided by the supplier by the purchaser combined with the assertion that the he or she basically accepts the work as specified in the contract. — printed p.59', verification_note='md-verified 2026-09-05 (§11.1, printed p.59) [VC]', verified_at=now() where id='72a3ba7b-85d3-45c9-bc44-bcb2c80106a9' and verification_status not in ('verified_against_standard','corrected');

-- defects_noted
update public.fields set verification_status='verified_against_standard', verification_quote='Acceptance inspection and claims due to defects: The acceptance inspection and the periods of limitation for claims due to defects comply with the contractual stipulations. The legal provisions always apply if there are no contractual stipulations or if no other regulations (e.g. according to VOB) have been agreed upon. — printed p.59 | 11.2 Claims due to defects: The effective versions of the German Civil Code (BGB) and the German Tendering and Contract Regulations for Building Works (VOB). — printed p.59', verification_note='md-verified 2026-09-05 (§11.1-11.2, printed p.59) [VC]', verified_at=now() where id='35fb55d3-d5a5-404a-997c-2d48c2298b9e' and verification_status not in ('verified_against_standard','corrected');

-- acceptance_date
update public.fields set verification_status='verified_against_standard', verification_quote='Performed parts completed in themselves should be inspected and accepted separately on demand according to § 12 no. 2 VOB/B, in particular: after completion: technical installations; structural installations, i.e. construction elements in the natural pool; for planting: once it has attained the status "ready for acceptance inspection" — printed p.59', verification_note='md-verified 2026-09-05 (§11.1, printed p.59) [VC]', verified_at=now() where id='6b07c446-e4c0-4d96-9bc2-7e7001dd679b' and verification_status not in ('verified_against_standard','corrected');

-- completion_notice_days_advance
update public.fields set verification_status='verified_against_standard', verification_quote='The supplier must inform the purchaser of pending completion dates no later than 3 working days before the respective completion date. — printed p.59', verification_note='md-verified 2026-09-05 (§11.1, printed p.59) [VC]', verified_at=now() where id='25db698e-d478-4573-b447-3fb0089e6ef2' and verification_status not in ('verified_against_standard','corrected');

-- attest_fllnt_13_req_28 (§12.4)
update public.fields set verification_status='verified_against_standard', verification_quote='Repairs that are found to be necessary during the checks or during the performance of maintenance work should be performed within the agreed scope, e. g.: replacing filter materials; replacing defective technical systems; replacing and supplementing plants; repairing structural installations. If a comprehensive or complete change of water is unavoidable, it must be taken into account that the biological system will usually need 1 to 2 months to stabilize itself again. — printed p.64', verification_note='md-verified 2026-09-05 (§12.4, printed p.64) [VC]', verified_at=now() where id='0e22a7ce-b4ba-4655-999c-820fb6f4ef89' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-14 Instandhaltung & Betrieb (§12 p.60-64) ----------

-- inspection_frequency
update public.fields set verification_status='verified_against_standard', verification_quote='Irrespective thereof, the supplier should be instructed to perform the checks once annually for the duration of the time period in which warranty claims can be made. After that period, routine checks should be made (e.g. once a year) by a specialist. — printed p.60', verification_note='md-verified 2026-09-05 (§12.2, printed p.60; Tab.13 p.62) [VC]', verified_at=now() where id='4fd22e99-5e00-493d-888f-baf4f8e0d275' and verification_status not in ('verified_against_standard','corrected');

-- maintenance_contract_in_place (source modal "should")
update public.fields set verification_status='verified_against_standard', verification_quote='A natural pool will only work in the long run if it is maintained regularly and properly. This includes: checks (inspections); maintenance of the vegetation, water, substrate and visible sealing areas; maintenance of the structural and technical installations; repairs. If the owner of the pool is unwilling or incapable of performing this work him- or herself to the required extent and with the necessary professional expertise, he or she should contract a suitably qualified and reliable company to do all or part of this work for the owner. — printed p.60', verification_note='md-verified 2026-09-05 (§12.1, printed p.60) [VC]; contract is conditional "should" — REQ-27 severity ruling AL-4/FLLNT-14 stands', verified_at=now() where id='1d73d7a8-6ecc-4f10-9d5f-447bb5207bd3' and verification_status not in ('verified_against_standard','corrected');

-- repair_provisions
update public.fields set verification_status='verified_against_standard', verification_quote='Repairs that are found to be necessary during the checks or during the performance of maintenance work should be performed within the agreed scope, e. g.: replacing filter materials; replacing defective technical systems; replacing and supplementing plants; repairing structural installations. — printed p.64', verification_note='md-verified 2026-09-05 (§12.4, printed p.64) [VC]', verified_at=now() where id='4bdd7fff-e11b-4da5-b316-5ba4a285d015' and verification_status not in ('verified_against_standard','corrected');

-- ---------- FLLNT-15 Konformitäts-Zusammenfassung → app workflow (exempt class) ----------
update public.fields set verification_status='inferred_from_worksheet', verification_note='md-pass 2026-09-05: app workflow roll-up (phase gates / overall verdict) — not defined by the guideline; exempt from SR-1 per the 2026-08-01 metadata ruling', verified_at=now() where id in ('b47cb27a-385d-4775-bcf9-b3e60edf2dd2','75db48f1-87f0-4793-acb5-10788189179e','42b8687e-8c74-4b2b-aa27-448616d8e412','3f6c36c0-6a35-41d2-be8c-e07b67264232','6505874a-e385-4f65-94f9-4da98e20d7e2','95f54004-ab0c-40c5-a64f-f3685a97c9f1','44ee439d-6098-47a1-9d86-31425bf462e8') and verification_status not in ('verified_against_standard','corrected');

-- ---------- E · Equations EQ-01..EQ-05 (source_quote already carried [VC]; lift to md-verified) ----------
update public.equations set verification_status='verified_against_standard', verification_quote='The outer grain surfaces of the filter material in the filter body that can be colonized should, as experience shows, amount to at least 50-times the surfaces of the pool that are exposed to light and inundated (refer to Appendix 5). — printed p.51', verification_note='md-verified 2026-09-05 (§10.2.3, printed p.51) [VC]', verified_at=now() where id='0a875bd8-1e8f-47f2-9a38-62396ea73c70' and verification_status <> 'verified_against_standard';
update public.equations set verification_status='verified_against_standard', verification_quote='Surface of the filter body = 600 m2/m3 x 15 m2 x 0.7 m = 6300 m2 — printed p.82', verification_note='md-verified 2026-09-05 (Appendix 5 Example 1, printed p.82) [VC]; informative appendix', verified_at=now() where id='e56fc10a-de59-4b62-af9b-bbfa6bc012b4' and verification_status <> 'verified_against_standard';
update public.equations set verification_status='verified_against_standard', verification_quote='Required colonized surface in the filter 95 m2 x 50 = 4750 m2. [...] Required filter volume: 4750 m2 / 600 m2 / m3 = approx. 8 m3 — printed p.82', verification_note='md-verified 2026-09-05 (Appendix 5 Example 2, printed p.82) [VC]; informative appendix', verified_at=now() where id='b722809a-24c4-4c2d-8e8c-ea65a65a7e49' and verification_status <> 'verified_against_standard';
update public.equations set verification_status='verified_against_standard', verification_quote='1% of the surface area of the swimming area in metres. Example: Swimming area 30 m2, 1% of 30 = 0.3 i. e. length of the overflow edge 0.3 m. — printed p.54', verification_note='md-verified 2026-09-05 (§10.3.1, printed p.54) [VC]; guide value', verified_at=now() where id='356a95cc-499a-454c-a905-d0de3bf41643' and verification_status <> 'verified_against_standard';
update public.equations set verification_status='verified_against_standard', verification_quote='The usable volume of the splash water tank must be dimensioned so that at least 150 l per square metre can be provided to the inundated water surface. — printed p.54', verification_note='md-verified 2026-09-05 (§10.3.1, printed p.54) [VC]; reference area = inundated water surface (AL-4 ruling on walls open)', verified_at=now() where id='27f94c84-87bd-411e-a9e5-c7546c59f713' and verification_status <> 'verified_against_standard';
