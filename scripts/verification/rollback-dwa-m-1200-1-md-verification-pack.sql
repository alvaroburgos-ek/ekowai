-- Rollback for dwa-m-1200-1-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows this pack touched (identified by the verification_note tag) and ONLY for standard DWA-M-1200-1
-- (joined through worksheet_templates → standards.code). Prior status was MIXED in the 2026-09-05 export, so each group is
-- restored to its own prior value: 97 fields needs_engineer_review, 20 fields imported_unverified,
-- 7 fields verified_via_cross_reference (BBodSchV metals, ws 13), 2 fields derived_from_structural_mapping
-- (project_id, alle_genehmigungen — the two exempt rows). verification_quote / verification_note / verified_at were null before
-- the pack on every field and on the equation and are nulled again. The 1 equation was needs_engineer_review and returns to it.
-- Gates untouched; STAGED file never applied; the encode-time source_quote column is separate and stays.

-- ---- fields group: prior status = needs_engineer_review (97 rows) ----
update public.fields f set verification_status='needs_engineer_review', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-M-1200-1'
   and f.id in ('f4b3a6a0-a62f-4b71-8848-3e6c8c879b13','232b73dd-2a00-4460-8f2f-8f5df8ac7e77','c2e405e2-853e-49c3-9fa3-740f48142467','ebff75c5-4cc0-4fa6-b736-ba86da6ea7ec','b5837d74-8abf-413e-87c9-48270ea65641','341cb3f0-319d-42d5-9962-c3b9e601a33d','77585e4a-bba9-4c08-9b97-e7d52e3bf887','3b85fdcd-cee2-423c-81f2-25ea18a8c458','705e5aeb-6061-4d1b-be93-48030b4bfc08','5117b23e-9d42-4d0f-8972-73f8520252f0','9365f90f-6090-46ef-ba2a-b6f9760ba03e','866e053f-9a18-46c8-ad36-859e9cfb8534','e2a9d1da-a726-48d2-8c8c-eaab018a3ddf','c53883cf-6d47-42e4-941c-e8f346b0bca9','7bf8c849-6107-486c-b35c-7d33a67537b1','1fe9394e-f43f-425c-b798-74e2d64df8c8','6fcf93f7-272e-46ce-8e37-14413b2f9439','6ca759d3-744b-4f49-953d-b2d401de6b0a','99a8f5ec-fce4-4303-ace3-9310b29b97ef','4150ecd9-989b-4dce-ac02-203829df5e03','e811a1ed-482a-4632-882d-686b5131c679','27cf4621-aada-44e1-8019-7c6401b10893','f5e407f7-e260-4822-a922-ef731ed70f38','cdae9f2c-ed23-48e7-80c8-a29caaba0d21','01737501-8fe9-4632-9b4e-405e4184748d','b89a72dd-ddac-49f6-b10e-69b036fc682a','76be4025-8e72-4d69-9aed-c3b4a2f5d05e','fc5e1a0d-e2ae-4bc9-b3d9-c1d95b4101f2','c3bff6ea-2b95-4b59-9abd-10026a39b47d','b629df87-8b49-4e8a-9b73-c6e91b5c3c54','b1d23ef2-a68b-4bb9-b67f-01f9c69e44c1','5224d52c-7a90-4e4b-8266-75646f1f928b','963e6fcc-7be5-4633-b43d-f93066f3575c','c8211c89-a5fc-4132-9019-f7b86d0931cd','8dd5da76-19c0-4d3b-8912-448da07a09e1','319a7c33-ca02-4615-8b5d-7a4d9599d16a','9483e737-db50-403c-9d13-4ad1e572c5f9','d03cbf9b-7dbc-46e3-a01c-7af06ccb31d1','b1ef9f0a-83f7-43bc-89a3-40a269b72ba6','b23ca174-6d64-433a-8aab-1e07a585ce55','46098d1c-c923-4665-aea7-91ad787b3663','54cc0f56-44d9-433f-b0ca-dd59762cdc46','b5f632a3-fe4c-47de-aa26-388213dd07f4','3fe7afff-cb45-4d19-9e61-621e327b1ed7','e1a16dd8-36ae-404f-9060-5ed24089251e','1a5d9943-46ed-40f1-8eba-d4c7f3bdc066','e6459573-c815-40aa-bbab-a0902cf5871c','cd1e23d3-e723-426e-9a01-8da3d569e56b','5cfb676c-a2e1-428b-8f77-d7fe254d37f5','24461ee0-1897-47e8-b12c-ef9f4ab003e2','57e5c74a-f26f-4be3-bfc3-0fe970e7f94c','91719575-0cd9-468c-8711-79445b207750','92b9d7dd-8499-437a-9cc4-977e29febb09','2c40ae6b-8e6e-49ab-806f-082f1205e41e','76c7c977-e0f0-412c-8f89-68c6a158b7a7','92bd7c97-4274-41ab-9ca6-32098734daef','c8475480-3692-4151-99d6-0cf63ef6f767','25fb0e98-6b21-4edc-83c0-7a3ded0e3030','2998570c-a7b8-4f00-85c8-61895eb46f92','2274fe3c-0e4b-4d9d-991e-d3e8916d887f','c2fc8f4d-3831-4528-b602-12c9db8f3ee7','47a4b57b-6509-432f-a226-4af9a97a253c','c39100a9-9186-4431-878c-606907735d89','ff480e02-3be4-49ef-bc70-66b0c67ce282','17dd811a-66af-4eda-8c6f-30e3f79f0e53','68a69e80-7199-43d9-88aa-cd0fe0bf2f5f','d5c608d8-8cc6-4495-a40a-ab0ea6d7db2e','1b2f4bf7-6320-47e8-9d38-0a80dd50379c','24c97032-8b70-48f3-9e09-0bb6769d96fb','dad1d639-eda0-4644-b5bf-eae609d4621e','c59e5d6d-6154-4cc9-a601-6ef10e09f1c9','3f842ab6-fb0f-4578-ad7c-666c8f18f279','f59bbbff-7a11-4433-a346-2a0f2da42b59','3c207bbb-8024-42e8-9cf3-060d624d1318','29115393-e763-4e52-977e-5aa84d7b2761','d6650cd9-255e-4ae3-9a13-808f2aa739b2','9bd537dd-3735-452b-a9a3-66dc23129226','a3b1030c-3040-475e-bbf9-61a5b071f8a4','371f6322-59eb-4c2a-be71-b2133db2d809','39e745a2-dafd-441b-8651-25f2b6007b5b','f7043885-c9ce-49c3-811d-f2bca5d0396e','9b91d7d1-71b2-4696-81e4-2883de736925','17e2ae53-e5b3-48c8-8dff-fec7dcdee215','a466f1b1-a189-4b3c-b34c-2ec4bdf45ec0','df696c7f-3c86-43b6-81ee-856b9d4435a3','5b8e47e5-a3c2-459e-9425-421eebf8dad0','465205f0-52f7-425b-9843-ad4cb7017ca6','3de488ce-5f0b-4cad-a6d0-db19863dc880','8aa5577f-1a3d-405f-bc6b-782b57aab4d4','606007c3-98ac-4724-8a04-1b06b52daee0','f78ec601-215b-456e-bd94-aa48581033a0','587ec18e-6647-48d2-b615-f7f4bd9ad648','0574e09b-cc44-4949-bbd7-9cdebeb9647e','cf3a29f9-5769-45d7-93ca-d7a09643dc57','4fc4f0c0-2b1c-4bb2-aa71-617318cdc8db','40f2cdae-191a-4cb2-a550-944bd5793a76','cb644be5-15fb-4976-8a79-53f1a2d38849')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- fields group: prior status = imported_unverified (20 rows) ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-M-1200-1'
   and f.id in ('2662df4c-5e92-47fa-a566-ca8cc1555f48','1a314a45-4500-426d-afe7-8eb47a695989','250c4114-6298-4bd7-84a0-0acfc2ff6cbe','2176c0ac-a311-4df9-8161-23d52f13fd17','80c8aa22-35d0-410f-8f44-370380f94ec6','4eaf6b9f-59ab-4d84-9b66-a12a6459c58e','a916f88b-f0dd-41ff-a825-6e0ec317a922','1348d887-66fe-4473-b589-e5a20000204d','1356e4f5-5d84-44b2-98a3-482ab937ef3d','511d950e-bcf7-4685-9d36-8c8359996796','4b9d3191-dbce-4d1a-bffa-86f0b85ba6a5','0492b936-3453-4078-bf23-00641e217796','26088da8-0107-4108-8b06-46a98d7ae7fa','edc2813b-2582-480c-84fc-92e5605019b4','442110fd-618b-4640-96b9-c634e318717b','9580114d-bf93-4f3b-aee8-bc41549a6ca8','ef4ee0d6-fc86-4030-990b-36e9b81c8c59','57abe92e-f82a-4771-837d-def78f603d17','cf6f7e7c-bb78-4379-bf7e-b25212bc6042','e41a1089-ea20-43f2-8829-40e45db92084')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- fields group: prior status = verified_via_cross_reference (7 rows) ----
update public.fields f set verification_status='verified_via_cross_reference', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-M-1200-1'
   and f.id in ('a3bd13da-e25a-4d28-8c03-02d05a6ed8dc','a93ed80c-25a8-49ff-a245-2315efa0c044','11425a3d-f65b-453e-b707-9b5b3399ccd8','673a3bda-2fab-448b-a344-7f0ed931fa2f','ce0bcb78-1138-47c5-bd7c-4f6fa357f13e','d79bcbb2-c1de-40de-b190-28464fde127e','78de4d3b-97fb-4491-8d7e-e7987ea9284d')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- fields group: prior status = derived_from_structural_mapping (2 rows) ----
update public.fields f set verification_status='derived_from_structural_mapping', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-M-1200-1'
   and f.id in ('33b822f5-db5b-48db-a7cf-0165894a5942','bf41fbef-e6a2-48c9-a254-a8df1c626701')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- equations: 1 row — prior status = needs_engineer_review ----
update public.equations e set verification_status='needs_engineer_review', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DWA-M-1200-1'
   and e.id in ('978ac484-ac6c-4611-9a87-359c900b88dc')
   and e.verification_note like 'md-verified 2026-09-05%';
