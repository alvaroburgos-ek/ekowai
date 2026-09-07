-- Rollback for dwa-m-732-md-verification-pack.sql (2026-09-05, md pass [VC]).
-- Reverts ONLY the rows this pack touched (identified by the verification_note tag) and ONLY for standard
-- DWA-M-732 (joined through worksheet_templates -> standards.code). Prior statuses were NOT uniform on this
-- standard, so the fields are restored in two groups exactly as captured in the 2026-09-05 export
-- (fields-DWA-M-732.json): 52 rows were 'needs_engineer_review', 40 rows were 'imported_unverified'.
-- 92 field ids = 85 quoted + 7 exempt. Residue (3 ids: M732-08.CSB_spez_fracht, M732-09.N_ges_grenzwert_indirekt,
-- M732-21.trub_spez) was never written and is therefore absent here.
-- The 3 equations were all 'needs_engineer_review' before the pack.
-- NOTE: verification_quote / verification_note / verified_at were NULL on every touched row at export time,
-- so nulling them restores the exact prior state.

-- (a) fields that were 'needs_engineer_review' before the pack (52)
update public.fields f set verification_status='needs_engineer_review', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-M-732'
   and f.id in ('20cea871-b7a5-4f5a-a2e3-394f79de07ea','f2409882-b558-4c5b-ad4c-2156500cf344','a97900b6-78ca-485f-a95b-e5e55c0b4785','e6d5cce8-1457-4200-84a2-17f9febede03','67c9e595-2092-4635-bdeb-033fcbf01841','39e89071-f1fa-4935-8e76-42751817196d','a26aae2e-9fb4-47c0-a9c2-d766dc3a7856','50ee981d-2434-4805-85ad-e19464831a3a','b8827b94-d4cc-48be-9a00-0dd0ef8816ce','9eec479d-2e5e-46af-a11e-0199962697c9','f4f0c50e-8ca8-42ab-bb2d-ea5258194ccb','e671ca35-accb-46f5-b029-a92f61b75522','baf6bd7a-619e-4c6c-852b-b515ae7b73e7','f51945b4-8566-4b1b-a00a-5ea40e52ce51','f5ae9ec0-f166-47ba-88a4-8beaeb4f8121','ce08be93-2c46-4000-86c3-7a0643b07bc2','f9df5bdc-eb09-4718-91b7-37fc206fb3d8','af42cd21-e946-42f3-a3ec-3df60209ee46','34da2241-916c-43ce-960d-506fdb0c2bfb','6e16a433-1c4e-42a7-8b70-7db0684e17b1','7c81b316-68ab-479d-804c-3a23b0a0cd7a','efbbc8a6-420f-4498-9033-8f3d9c334da8','5ddee811-98cf-4de8-b643-5fe3aadd22db','d0fb71dc-7918-4cc4-8be6-22b2fad692d9','8d0526dd-fd37-4639-a98e-6299381e2a75','8484ca62-a29c-49cd-b733-067021fad69c','1621d254-8651-4244-aad6-24321eb623b2','5cc03144-3ed8-4828-a7aa-d7504fdce699','78deb84e-39e8-405f-8286-fa7ef0811806','cf9d83ce-1670-4de7-b91f-fda2590b096c','3f5fb7a1-2e26-43ed-b9fa-62291f5a4f95','492e8414-7d87-4f57-8a93-e67b13005fc9','2b812671-9421-4148-a00b-9b1cb7673a66','a7cccea4-f4ce-4812-b8ee-622ea1459edc','53405c40-4b7a-41e7-ae97-4eb5906f628c','479bdaa1-b555-4643-99fe-34da0272758f','cdfe022e-70df-4b56-a1d3-141ae5dfc678','0671a917-65c1-40c4-9978-a74d14687a9c','fe236bbf-f81d-4841-b29e-e21b5310dbb5','b8f18b2f-5af5-40e9-82b4-76181aee398a','bed238e2-07ce-48db-b819-d3866093b176','7e6ba3b0-5a14-413a-962b-f2afd141faac','96388f32-8447-4e36-aaa9-8080bc4a08ab','77a443f4-6f91-488c-860e-db2c94920d54','382fd873-2ee4-4563-a0bf-fcd6b782e7bd','4280536a-2734-4b78-9b9c-f1bba55b6f2f','e49d3c4b-676f-40c7-9144-2f5b826e42f0','bc11861a-439f-4fc5-ad05-bda22b4a79d1','416de19f-1229-4171-9ab2-5db8469d143b','b7533f72-a6bb-44f4-bc98-bcaf0c1a76a6','59ee57db-05ec-4bc1-8b8c-b3271d6a3a44','4d3e1e09-415a-46c9-ad35-5c8b3eff4ee6')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- (b) fields that were 'imported_unverified' before the pack (40)
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-M-732'
   and f.id in ('09f34f9c-d6e0-40bf-abe9-d2e2dd5931dc','19b877eb-d546-4602-8cbf-56ccfb6217ad','6d44b2b7-d24f-424a-a57d-c5ed59904315','2e3fd8e5-bb63-438b-80f8-c5ce4244ed55','33c0f6aa-c958-4760-a2be-33a7ef997d6c','765f34a5-136e-427c-9e5e-f87cbeeb35e2','cf2a9726-0a50-4ff4-a77e-476396238900','40c1bd97-6622-4241-ac47-2bb04c6da653','f0af988b-9cd9-4c76-9d7a-c3d86e968297','ddc83a2c-0a67-4997-ba42-82866e03c0fe','ea2eea5a-a5e6-4693-aa73-2b98ec6afd32','dd1d15d2-8902-4dc1-aad6-b29733837949','4a5f4031-a4db-466c-8240-da3d092cf073','bcd1403f-7547-43f4-bde4-9130ba386bc9','4d3273bb-7f30-4716-87ae-f722f3a831c2','51b766ef-97f1-4443-9eb5-12561ad9cdfd','a7e5252a-160a-4303-9182-3981910576d1','69423f87-7cb1-4a4c-bbcf-41c47b48b21d','90ff20e1-f142-43fe-a31e-1ad48ecc0111','07350a55-2c1a-4dd1-aee2-77009dc45bcc','6d790237-7acf-4278-b4c4-8256e2ea8afc','bf545d80-713e-4117-867a-0f6f9a8134b7','e293ec74-0a6f-43d9-993d-ab1481c1b1e5','d9892d7f-fec9-411c-97cd-ae70011a3385','91cc29e7-d0f0-4cb7-b2ed-1707a0d94de3','52cde2c4-65f4-4d07-b8d6-b8d9ef6350df','527c19e2-304d-4886-bbe7-79c9e8f8ea6e','a4d5618e-e8d8-49ee-9fbd-814b69f9f991','9b2234bf-1034-4138-9c59-a23587e21ef9','61f7d6e0-e45d-4d52-bf29-21292e89b464','fd0ed4b2-8078-41bb-9dfb-41d38ef426aa','7c1f69c6-c2b7-4cef-b437-d3d58e724e55','5f36b0d6-0d2c-4ac3-be82-a2472c6fe97f','f8de14b5-4062-4b3d-b076-c5808ee7736a','b3cc2ac6-5422-4f8e-b90a-c2badb0edfd0','e3c44469-75a8-4a02-aa39-57101d0f44cf','3993735d-e68a-4d42-af1a-bc7aa6d9c502','2f653bf5-9ad8-425f-852d-315ed69fdb06','d946c5e7-400f-4825-9f5c-79670111a77e','803443d8-5561-493b-9518-566fd93b0774')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- (c) equations (3, all 'needs_engineer_review' before the pack)
update public.equations e set verification_status='needs_engineer_review', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DWA-M-732'
   and e.id in ('a805ee12-14e4-457f-be5e-a1e5e2cfaf91','136985eb-8dca-45b1-a61f-abe9b4db47ee','462c0610-099f-468c-8330-efe8e7bf7c33')
   and e.verification_note like 'md-verified 2026-09-05%';
