-- ============================================================================
-- ROLLBACK for fll-naturteich-design-pack.sql — restores the exact same 21
-- fields to imported_unverified and clears quote/note/timestamp.
-- ============================================================================

UPDATE fields SET
  verification_status = 'imported_unverified',
  verification_quote  = NULL,
  verification_note   = NULL,
  verified_at         = NULL
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND (
    (wt.code = 'FLLNT-03' AND fields.symbol IN
      ('natural_pool_type','regeneration_technique','regeneration_area_share','p_binding_required'))
    OR
    (wt.code = 'FLLNT-06' AND fields.symbol IN
      ('swimming_area_m2','regeneration_area_m2','supplementary_area_m2','total_pool_area_m2',
       'pool_depth_max','pool_underwater_surface','pool_ground_area_m2','pool_submerged_wall_area_m2'))
    OR
    (wt.code = 'FLLNT-07' AND fields.symbol IN
      ('excavation_depth','sealing_type','area_separation_method','edge_design',
       'entry_exit_provision','freeboard_water_to_seal','edge_height_tolerance_mm',
       'sealing_biocide_free_biofilm_ok','ground_covering_type'))
  );
