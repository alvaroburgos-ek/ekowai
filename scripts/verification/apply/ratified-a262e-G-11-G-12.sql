BEGIN;
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_a262e AS SELECT * FROM compliance_requirements WHERE false;
INSERT INTO compliance_requirements_archive_a262e
SELECT * FROM compliance_requirements
 WHERE id = '4d3f2c87-ca57-412a-bdad-eba11f16ae72' AND md5(condition) = '44b9a62e2288a9128ea1bb7964bb1f36';
UPDATE compliance_requirements
   SET condition = 'IF sewer_system_type == separate_sewer THEN m_multiplier >= 1'
 WHERE id = '4d3f2c87-ca57-412a-bdad-eba11f16ae72' AND md5(condition) = '44b9a62e2288a9128ea1bb7964bb1f36';

CREATE TABLE IF NOT EXISTS compliance_requirements_archive_a262e AS SELECT * FROM compliance_requirements WHERE false;
INSERT INTO compliance_requirements_archive_a262e
SELECT * FROM compliance_requirements WHERE
     (id = '38145be2-a111-4b5a-b63f-cc895141415d' AND md5(condition) = 'a9051f0f29414d3fbaf73c0f1a9b88cf')
  OR (id = 'd0d6acdc-8411-4c49-876c-5b12f25ba9c8' AND md5(condition) = '4b80564b0ad2d72042150fe9361623e2')
  OR (id = '77d1a8d7-33b9-4884-a0cb-c5c9aeaff61d' AND md5(condition) = 'cd8a3764420d32eb4e39670a4ccb8fbc')
  OR (id = 'b5526f2e-3d94-4fbb-a57a-bae3f179a643' AND md5(condition) = '5ed5179234ca0938acc2e422641ed844')
  OR (id = 'cd44e737-9fc0-4907-a6b6-79134b515cf9' AND md5(condition) = '87a3b9540f2296fadba9e6d2a879dfd2')
  OR (id = 'ca5e12f4-823c-4421-bc03-2f41c04475e3' AND md5(condition) = 'df9ca25cecd42398d3aa1dccc8b4d776')
  OR (id = '73c598cf-25e2-41b8-a770-b8fd23b912fa' AND md5(condition) = 'f8c06acf39050396101d1ce6b77ca895')
  OR (id = 'eb2e3043-f8c6-47d5-a99e-b76cb1d25e14' AND md5(condition) = '92e7e2d7705ee51a0eea67aed9452ac6')
  OR (id = 'cabd0aa5-3be4-45f8-8a43-5da843ff93ea' AND md5(condition) = 'cfc68ad1d1a6a43ce5f5c7425ef50a1e')
  OR (id = '8a8539fe-7b53-4920-ad9b-7757d002f896' AND md5(condition) = '1e64d05b4416d7f72a76da96602cdd10');
UPDATE compliance_requirements SET condition = 'IF (system_size_category == small_wwts AND filter_type == vf_sand_0_2) THEN A_Fo_spez_VFS_KA >= 4'
 WHERE id = '38145be2-a111-4b5a-b63f-cc895141415d' AND md5(condition) = 'a9051f0f29414d3fbaf73c0f1a9b88cf';
UPDATE compliance_requirements SET condition = 'IF (system_size_category == small_wwts AND filter_type == vf_sand_0_2) THEN A_Fo_min_VFS_KA >= 16'
 WHERE id = 'd0d6acdc-8411-4c49-876c-5b12f25ba9c8' AND md5(condition) = '4b80564b0ad2d72042150fe9361623e2';
UPDATE compliance_requirements SET condition = 'IF (system_size_category == small_wwts AND filter_type == vf_coarse_sand_0_4) THEN A_Fo_spez_VFG_KA >= 1'
 WHERE id = '77d1a8d7-33b9-4884-a0cb-c5c9aeaff61d' AND md5(condition) = 'cd8a3764420d32eb4e39670a4ccb8fbc';
UPDATE compliance_requirements SET condition = 'IF (system_size_category == small_wwts AND filter_type == vf_coarse_sand_0_4) THEN A_Fo_min_VFG_KA >= 4'
 WHERE id = 'b5526f2e-3d94-4fbb-a57a-bae3f179a643' AND md5(condition) = '5ed5179234ca0938acc2e422641ed844';
UPDATE compliance_requirements SET condition = 'IF (system_size_category == small_wwts AND filter_type == aerated_hf_gravel_8_16) THEN A_F_spez_HFK_KA >= 1'
 WHERE id = 'cd44e737-9fc0-4907-a6b6-79134b515cf9' AND md5(condition) = '87a3b9540f2296fadba9e6d2a879dfd2';
UPDATE compliance_requirements SET condition = 'IF (system_size_category == municipal_wwtp AND filter_type == two_stage_vf_gravel_sand) THEN A_Fo1_spez_KomKA >= 1'
 WHERE id = 'ca5e12f4-823c-4421-bc03-2f41c04475e3' AND md5(condition) = 'df9ca25cecd42398d3aa1dccc8b4d776';
UPDATE compliance_requirements SET condition = 'IF (system_size_category == municipal_wwtp AND filter_type == two_stage_vf_gravel_sand) THEN A_Fo2_spez_KomKA >= 1'
 WHERE id = '73c598cf-25e2-41b8-a770-b8fd23b912fa' AND md5(condition) = 'f8c06acf39050396101d1ce6b77ca895';
UPDATE compliance_requirements SET condition = 'IF (system_size_category == municipal_wwtp AND filter_type == aerated_vf_gravel_8_16) THEN A_Fu_spez_VFK_KomKA >= 1'
 WHERE id = 'eb2e3043-f8c6-47d5-a99e-b76cb1d25e14' AND md5(condition) = '92e7e2d7705ee51a0eea67aed9452ac6';
UPDATE compliance_requirements SET condition = 'IF (system_size_category == municipal_wwtp AND filter_type == aerated_vf_gravel_8_16) THEN f_V_CSB_VFK_KomKA <= 100'
 WHERE id = 'cabd0aa5-3be4-45f8-8a43-5da843ff93ea' AND md5(condition) = 'cfc68ad1d1a6a43ce5f5c7425ef50a1e';
UPDATE compliance_requirements SET condition = 'IF wastewater_type == greywater_only THEN Q_GW_taeglich >= 75'
 WHERE id = '8a8539fe-7b53-4920-ad9b-7757d002f896' AND md5(condition) = '1e64d05b4416d7f72a76da96602cdd10';
COMMIT;
