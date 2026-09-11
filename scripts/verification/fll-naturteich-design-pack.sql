-- ============================================================================
-- FLL-Naturteich SR-1 verification pack — design-phase fields (STAGED, NOT APPLIED)
-- Source: "guidelines_for_the_planning_construction_and_maintenance_of_private_
--          natural_swimming_pools_2017_p (1).pdf" (FLL Naturteich, 2017 EN edition)
-- Reader:  pdftotext -layout transcript FLL-Naturteich-2017_pdftotext.txt (SR-3:
--          rendered PDF is ground truth; transcript is searchable convenience)
-- Page offset PROVEN this session: printed = physical − 3
--          (printed 2 on physical 5; printed 46 on physical 49; consecutive run)
-- Extraction date: 2026-08-14 · Fields: 21 (FLLNT-03: 4, FLLNT-06: 8, FLLNT-07: 9)
-- verified_by_user_id deliberately untouched (no engineer session user here);
-- quotes verbatim incl. the printed "phosphrous" typo in §10.2.2.
-- Apply via gated migration path only. Rollback: rollback-fll-naturteich-design-pack.sql
-- ============================================================================

-- ---------- FLLNT-03 · Auswahl Naturteich-Typ ----------

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Irrespective of the design and/or construction method, natural pool types are distinguished according to the type and scope of technical systems used to achieve a flow through the swimming area and regeneration area in accordance with Table 1. — printed p.21',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.21, §5 (types I–V enumerated as Table 1 columns, printed p.22)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-03' AND fields.symbol = 'natural_pool_type';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Here, the regeneration techniques are summarized in the following techniques: hydrobotanical systems; controlled slow flow through the substrate filter; controlled quick flow through the substrate filter; controlled flow through the technical unit. — printed p.45',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.45, §10.1 (list printed in §10.1, per-type assignment in Table 1 printed p.22 — encoded clause_reference says §10.2: mismatch finding, not fixed here)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-03' AND fields.symbol = 'regeneration_technique';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Dimension of the regeneration area compared to the total area — Type I: > 50%; Type II: > 50%; Type III: > 30%; Type IV/V: information on construction based on design refer to Tab. 5 / Tab. 6 (Table 1). — printed p.22',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.22, §5 Tab.1 (per-type MINIMUM bounds; the entered share is an engineer value that must satisfy the type''s bound — SR-2: bound is type-dependent, never auto-picked)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-03' AND fields.symbol = 'regeneration_area_share';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Substrate filters with a controlled slow flow must be equipped with a downstream phosphrous-binding purification stage (submergent hydrobotanical system or adsorbing filter material). — printed p.49',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.49, §10.2.2 (quote verbatim incl. printed typo "phosphrous")',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-03' AND fields.symbol = 'p_binding_required';

-- ---------- FLLNT-06 · Flächenplanung ----------

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'The size of the swimming area depends on the users’ requirements. As a guide value for the area intended for swimming, at least 8.0 x 4.0 m is recommended. This is calculated from 4 x 1.5 m strokes + 2.0 m for a stretched out body length. If a round pool is being constructed, a minimum diameter of 5.0 m is recommended. Other sizes are possible. — printed p.39',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.39, §8.2.1 (guide value/recommendation, not a requirement — engineer_input)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-06' AND fields.symbol = 'swimming_area_m2';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'In particular, the size of the regeneration area depends on the type of natural pool – refer to section 5. — printed p.39',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.39, §8.2.2 (numeric bound lives in Tab.1 printed p.22 as share of total area; §9.6 printed p.44 adds fully-engaged-flow prerequisite)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-06' AND fields.symbol = 'regeneration_area_m2';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Access options to the pool must be safe to walk on with a non-slip surface and they should be designed in a manner that prevents dirt from being brought into the pool. — printed p.39',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.39, §8.2.3 (clause prints requirements for supplementary areas but NO area quantity — the m² value is engineer_input)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-06' AND fields.symbol = 'supplementary_area_m2';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Dimension of the regeneration area compared to the total area — Type I: > 50%; Type II: > 50%; Type III: > 30% (Table 1). — printed p.22',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.22, §5 Tab.1 (total area is the reference quantity of the Tab.1 share bounds; encoded clause_reference §8.2 prints no total-area requirement — mismatch finding, not fixed here; value itself engineer_input)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-06' AND fields.symbol = 'total_pool_area_m2';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'No generally applicable specifications are made regarding the water depth of the swimming area. From case to case, the following aspects can be relevant: Recommended water depth natural pool type I to III > 2 m (to avoid silt out and enlargement of the water volume); — printed p.39',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.39, §8.2.1 (encoded clause_reference §9.5 prints NO depth requirement — mismatch finding, not fixed here; "> 2 m" types I–III is a recommendation; engineer_input)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-06' AND fields.symbol = 'pool_depth_max';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'The outer grain surfaces of the filter material in the filter body that can be colonized should, as experience shows, amount to at least 50-times the surfaces of the pool that are exposed to light and inundated (refer to Appendix 5). Among others these surfaces include: surface of the bottom of the pool and pool walls; “decorative surfaces” (gravel areas with no flow, rocks for design purposes, etc.) — printed p.51',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.51, §10.2.3 (50-times rule is "should, as experience shows" — recommendation grade)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-06' AND fields.symbol = 'pool_underwater_surface';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Example 2: known pool size — Surface area of the pool (5 x 10 m): 50 m²; Pool depth: 1.5 m; Surface that can be colonized — Ground area: 50 m²; Wall area: 45 m²; Total: 95 m² — printed p.82',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.82, Appendix 5 Example 2 (Appendix 5 is expressly INFORMATIVE — worked example, not a binding table; value engineer_input)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-06' AND fields.symbol = 'pool_ground_area_m2';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Example 2: known pool size — Surface that can be colonized — Ground area: 50 m²; Wall area: 45 m²; Total: 95 m²; Required colonized surface in the filter 95 m² x 50 = 4750 m² — printed p.82',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.82, Appendix 5 Example 2 (Appendix 5 is expressly INFORMATIVE — worked example, not a binding table; value engineer_input)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-06' AND fields.symbol = 'pool_submerged_wall_area_m2';

-- ---------- FLLNT-07 · Bau- & Konstruktionsanforderungen ----------

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'The subsoil must be load-bearing otherwise it should be compacted or improved using other means (e. g. by putting down a suitable ground layer). It may be necessary to have the ground structurally verified. — printed p.41',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.41, §9.1 (execution requirements only, NO depth number printed — the m value is engineer_input)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-07' AND fields.symbol = 'excavation_depth';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Natural pools must be durably sealed against the subsoil to prevent both water from escaping from the natural pool into the subsoil and groundwater or stratum water from entering the natural pool. — printed p.41',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.41, §9.3 (sealing SYSTEM governed by FLL Gewässerabdichtungs-Empfehlungen per §9.3 printed p.42 — cross-ref to FLL-GAR)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-07' AND fields.symbol = 'sealing_type';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Natural pools must be separated into a swimming area and a regeneration area. The area used by swimmers must be kept separate from the regeneration area by at least an inundated barrier. [...] For example the separation can be executed by means of earth modelling, wood, natural stone, concrete, dimension stone or synthetic/stainless steel elements. — printed p.41',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.41, §9.2',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-07' AND fields.symbol = 'area_separation_method';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'The waterside/pool edge must be formed in a manner that [...] the sealing system is protected against damage (e. g. due to covering with mineral substances with a grain size > 8 mm or due to solid edging/enclosure); [...] the edge design is permanently stable and withstands the intended loads; — printed p.42',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.42, §9.4',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-07' AND fields.symbol = 'edge_design';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'They must be safe to walk on and have a non-slip finish. Routine care and maintenance must be ensured. There must be at least one entry/exit point in the swimming area. — printed p.43',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.43, §9.5.3',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-07' AND fields.symbol = 'entry_exit_provision';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'depending on the expected wash of the waves, the water level remains consistently at least 5 cm below the upper edge of the sealing system. This does not apply to technical equipment installed in the pool for water extraction purposes; — printed p.42',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.42, §9.4 (normative minimum 5 cm; encoded unit cm matches)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-07' AND fields.symbol = 'freeboard_water_to_seal';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'the ends of the edges can indicate a maximum deviation of the planned nominal height of +/- 10 mm. — printed p.42',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.42, §9.4 (normative maximum ±10 mm; encoded unit mm matches)',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-07' AND fields.symbol = 'edge_height_tolerance_mm';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'The sealings and protective layers cannot be treated with biocides; consequently, only sealings that allow biofilm to form on the surface are permissible. — printed p.42',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.42, §9.3',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-07' AND fields.symbol = 'sealing_biocide_free_biofilm_ok';

UPDATE fields SET
  verification_status = 'verified_against_standard',
  verification_quote  = 'Ground coverings, including steps on stairs and ladders, must be made safe to walk on and must be slip resistant. [...] Only washed material must be used in cases of sand and gravel areas inside the swimming area. — printed p.43',
  verification_note   = 'SR-1 2026-08-14, FLL-Naturteich 2017 EN, printed p.43, §9.5.2',
  verified_at = now()
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-07' AND fields.symbol = 'ground_covering_type';
