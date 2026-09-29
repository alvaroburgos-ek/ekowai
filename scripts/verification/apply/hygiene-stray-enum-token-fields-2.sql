-- Hygiene 3 (2026-09-29): deactivate 19 stray fields whose symbol equals an enum token of a selection field
-- of the SAME standard on ANOTHER worksheet (the hygiene-2 scan of 2026-09-25 was same-worksheet only).
-- Evidence (re-executable): scripts/verification/apply/readback-hygiene-3.sql — every row has 0 stored values
-- in project_parameters and 0 equation references on its standard; the symbols are enum tokens of the named
-- selection fields. Harm class: a bare-identifier gate literal on the stray's sheet resolves to the empty stray
-- instead of the token (Task 13b), e.g. FLLNT-09 REQ-20 `filter_flow_direction == vertical_continuous_overflow`.
-- Rollback: scripts/verification/apply/rollback-hygiene-stray-enum-token-fields-2.sql
BEGIN;
UPDATE fields SET active = false WHERE active = true AND (id, symbol) IN (
  -- FLL-Naturteich · FLLNT-09 · tokens of FLLNT-10.filter_flow_direction
  ('e93e2266-ffb5-4c03-835a-9f50bac5131d','vertical_continuous_overflow'),
  ('b6f5cce2-97d5-4c04-a051-d511421ddb3d','vertical_no_overflow'),
  -- FLL-GAR-2023 · FLL-GAR-10 · tokens of FLL-GAR-09.abdichtungs_art (W-10: nine numeric fields named after sealing types)
  ('b9bfe986-7824-4b1a-aac4-df6b60be3b32','alkalisilikat'),
  ('890d53a4-2b58-4618-953d-480413dba1f8','bahn_bitumen'),
  ('68cda828-cf64-4576-a0c0-6206b5be24c0','bahn_kunststoff_elastomer'),
  ('0626fa4c-ea2f-4a67-a14a-c3eb28673cc7','bahn_pe'),
  ('30fa7fac-6c13-407c-98ec-ab72c07e6c21','mineralisch_bitumen'),
  ('3398cd11-2cd5-4201-8608-21ca69861a76','mineralisch_hydraulisch'),
  ('1804755b-14dd-4646-a4f2-874750809100','mineralisch_mit_zusatzstoffen'),
  ('729a7997-7981-4c33-ad77-c8aea316227b','mineralisch_ohne_zusatzstoffe'),
  ('c0577c94-c340-45f5-917c-e4ba0b7ae06a','verbundwerkstoff_gtd'),
  -- DWA-M-179-1 · M179-08 · tokens of M179-05.flow_split_case / treatment_method
  ('d5d5fcf0-d72d-4c0c-ba72-bd3820779f58','fall_4'),
  ('66a33431-73cc-43a3-a14f-2a0c8096c951','filtration_oberflaeche'),
  ('a9b0c8d8-6e6b-4684-8179-8c2466ad0369','sedimentation'),
  ('f9ba5e4a-24f2-4474-93d9-a04d615f9729','vollstrom'),
  -- (M205-18 `katalytisch` EXCLUDED: gate CR-26 uses it as a boolean field, `katalytisch == True` — not a stray)
  -- DWA-M-363 · M363-02/-06/-09 · tokens of M363-01.biogas_quelle, M363-07/-14.speichertyp, M363-22.anlagenstatus
  ('e301b45e-38a0-4d4c-a0f5-31b4e4ac7043','faulgas'),
  ('7c241733-fd7b-4426-b91a-f047963ac2cf','klaergas'),
  ('4a9435f3-8b86-4e3a-bd9a-cb55c43ab02f','gewichtsbelastet'),
  ('0d8d6ca8-10a5-478b-9b45-ceb1b4f2f0fe','neu')
);
COMMIT;
