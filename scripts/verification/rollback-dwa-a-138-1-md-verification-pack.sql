-- Rollback for dwa-a-138-1-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows this pack touched (identified by the verification_note tag) and ONLY for standard
-- DWA-A-138-1 (joined through worksheet_templates → standards.code).
-- Section A rows return to their EXACT pre-pack verification_status (captured from the 2026-09-05 export,
-- grouped by prior status) — not to a blanket 'imported_unverified' — because A138 rows carried mixed prior
-- statuses (verified_via_cross_reference / needs_engineer_review / imported_unverified / derived_from_structural_mapping).
-- Section B rows keep their status; only the backfilled verification_quote is nulled and the " | md-quote …" tag stripped.

-- ---- Section A: fields (status + quote + note + verified_at) ----
-- prior status = imported_unverified (15 rows)
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-A-138-1'
   and f.id in ('13efa8c3-87a8-4d27-ad89-cec6fda1db5c','a2e73497-426d-4c82-9ce8-65746bf33554','7571f62b-45b9-48fe-a284-b13ccb898b57','d1384016-0000-4000-8000-000000000001','d1384017-0000-4000-8000-000000000001','d1384018-0000-4000-8000-000000000001','d1384019-0000-4000-8000-000000000001','d1384020-0000-4000-8000-000000000001','d1384021-0000-4000-8000-000000000001','d1384022-0000-4000-8000-000000000001','fbbb7c9e-48c4-49bc-9819-1c9d0e7dcd37','b46324eb-8545-4d84-a0df-f30bf0ccfb3e','59297f87-e050-4e64-9f1d-734233c9840e','2a65d005-b24e-4b02-a986-2db9081e19f8','545f6bb1-d8c6-4056-a98b-01da1878e547')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');
-- prior status = verified_via_cross_reference (57 rows)
update public.fields f set verification_status='verified_via_cross_reference', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-A-138-1'
   and f.id in ('f195d7e1-6c32-415f-bacb-b42e4be14965','bdd1d9fa-4ff7-43cc-a92e-25c9d79f6e40','7653b765-1ca9-4230-8944-bf96048dc470','596f5cd2-21b3-4445-a881-01cfcefc77f9','03847f12-78e4-415c-944a-1a77bdb4f07d','97e1cae0-09f0-4ae7-bbd9-b3aaf4ce02cf','618b3e68-0674-4687-8c7c-3a22f69d922e','399382f4-fb28-4ca1-af9c-fb4427406ac1','e8b15afd-c117-4422-a8b7-82a0b4721e9e','50e7171a-cc09-4e97-9841-f3fd16b02fd3','83b90cfb-9bb0-4949-8b50-d7607e1445cf','968a00d6-b5d2-4ff4-8e13-27d1eb7e8641','97fb59ba-91d8-4049-9cca-15d3b309839f','c454ce3f-8ea6-45a9-b32f-cd953eb65d4b','ae2dc292-8b53-42a3-9949-cfff7043868e','748839c7-c248-4ebd-91c0-f3737dcb9552','d85e192b-c4d1-484e-9d2f-420e4fce40ae','a89a7cc8-c8ca-41f2-afa8-a6f838752bbc','d6625e09-f60d-4ab1-b8cb-69ac16830be4','83c8707b-e4d5-4c08-9337-8377c7efbdc3','a9d01674-74a1-462e-95ae-32e4b7bfa6b6','571fa233-2267-48cb-b7d3-9ed12c9f4e10','10d5bceb-7459-4fc8-a391-edb905ecd50c','8dfd843d-5666-4b72-9136-87ab8a2c355f','704b9b41-d090-46e8-9e21-bed9ebc3ae02','20ad56bb-24ea-4acf-b7cf-f87e394a7101','52a51d54-8ea0-4d15-b0ca-b6af8773fb09','35a8ae2b-0ac7-4908-985a-be17a5595257','40ab67eb-6b2d-4184-a9f6-bbd2bed858f9','ac2545a2-c867-47e3-a5bc-94dc98ec25fc','a77f36ad-bddc-4620-8569-4df12a7b7139','c801b5a1-9b74-4362-b4f0-7a1a7a1bebfb','dc69c995-d57c-4f1e-80b2-36d3d83ae4a6','55a89c11-5c0d-4e5d-b81c-ddc1ba8942c3','835b0827-bdf8-4e88-9e36-4b6c1a6f1e98','fcdcff58-7176-48d3-84e0-65e5e168e608','df45bc34-8097-4af3-9fce-dcea063841c0','bea2d323-6503-4c53-ad6c-75b6bd32deeb','fe690684-99ef-4275-ae4c-997b6c1297a0','0186774f-03d4-4eb9-bbe3-da72de137552','3d17099a-6c80-40ca-8b95-f37488608f20','d8a1f22b-d52a-41d4-8653-3f71dc8ad8f8','bcc67b11-9a09-435b-a1de-f740f93ff776','bccccfd0-9272-4ef7-9152-0eb1aa4b8de7','95d72a18-9601-4691-b1a3-5f3bebe6410e','1537f2e7-7812-4e9b-9694-74cb596990a0','3843f6f8-ec28-4af9-b1a9-19c77da3effd','435e13fd-ff0e-4074-9968-c0e3a7dbd4b7','9c1e0277-a308-4b04-bf34-34d25060274e','da098e45-4fc3-4d6b-9a2e-3865d944e11b','8c5c8dc6-b193-4906-a544-c59ac86eb8e8','7e9f9766-bc8d-41b7-80be-2e22db659edc','4b94be53-c55b-4ef7-9030-e01f82bc419e','f06229d6-0dac-46b3-b2d3-f47450f5690b','55dea09b-c87f-4ca6-984d-b7b7064badd0','b6b48360-defd-4217-b13b-4ad7e360136c','3db5fa56-22dd-45e9-b29b-eeaf35329b5f')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');
-- prior status = derived_from_structural_mapping (1 rows)
update public.fields f set verification_status='derived_from_structural_mapping', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-A-138-1'
   and f.id in ('b3c8fb94-bf62-49cb-bd92-60f76976c6ec')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');
-- prior status = needs_engineer_review (37 rows)
update public.fields f set verification_status='needs_engineer_review', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-A-138-1'
   and f.id in ('9a9cc984-d1d3-4b64-b3a4-0fd057bf4b67','f797705a-4853-4d7d-8b06-dd8ab50e762c','57016d04-50a6-4996-a08c-b0920049a056','f00fcf1a-981a-4d75-9a50-65f10384a017','3bbf278c-41bc-406a-bdf0-1520fe3b9636','49dd42d1-c3a5-42d8-a101-5a8737a332d7','286a96b9-92ae-4381-bab8-18ff2a2f08df','fa3f8fdd-2baf-4279-9d72-ec0d4945bf7b','661be02e-b9de-46bb-abd7-5a278dfe62f0','af98385d-d6b6-4416-94cf-1e221f99c3a7','f69c321c-c08f-4954-868f-e584ef88bf2e','eaaac39e-4f23-48d2-ae6b-dba56f7f853c','b7552496-47e8-4303-9fe8-3db76a8d47b3','59ed4ac9-1e6f-4c6f-b703-5335bfac0ecd','44378c29-cd03-4915-8ab8-05bf38f070e3','e1d6777c-f7dd-46e6-8548-33def023004d','6e301de0-e085-411a-aff7-36357d6d52c1','0598d606-947f-49d1-9f83-bfc84b9534b6','bc890f79-f655-41c1-9fa5-457bf784c7c1','92d409fc-8901-48af-bb35-eca3f2a2ae39','fab6ed35-86f5-44a5-a8b8-12706cb3fa9c','402f7602-32c0-4096-82d1-6e07c7ca9167','8b9d632e-b46a-44c4-93bc-6e0cbea0809d','5ea81604-9db9-4c92-b75c-46317cebfe58','14577af6-88a4-448d-b00e-1f419262ff27','690183af-64ae-46c2-aa7a-9c2c5dbde039','4e4c4ea2-6d41-46e7-9003-7bf186e111bb','b823f75d-772e-4f98-b92b-eaff1aed1eb7','eb581c73-3274-471c-a741-ae0f621c468c','34719597-d612-45ab-8ca7-0b078b5c7543','67ae6f35-7519-4384-9074-497ce105cb33','86526203-09f8-463a-acc3-9405c72f53ad','41ae3564-77da-46aa-b933-7a6f178da82f','210d6a08-8afd-4e20-8bd2-39ea67e6f604','6a79ea81-c95e-4523-9cc4-5d5f7583da06','0a882c02-10db-4054-93d8-de08282c68f1','9630a3d5-cfc6-48ae-ba9e-2ba2752d006c')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');
-- ---- Section A: equations (status change) ----
update public.equations e set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DWA-A-138-1'
   and e.id in ('a1380702-0000-4000-8000-000000000003','a1380702-0000-4000-8000-000000000004','a1380702-0000-4000-8000-000000000005','a1380702-0000-4000-8000-000000000006')
   and e.verification_note like 'md-verified 2026-09-05%';
-- ---- Section B: quote backfill only (status unchanged; nulls the quote and strips the tag) ----
update public.fields f set verification_quote=null,
       verification_note=nullif(regexp_replace(f.verification_note, ' \| md-quote 2026-09-05 \([^)]*\) \[VC\]$', ''), '')
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-A-138-1'
   and f.verification_note like '%md-quote 2026-09-05%';
update public.equations e set verification_quote=null,
       verification_note=nullif(regexp_replace(e.verification_note, ' \| md-quote 2026-09-05 \([^)]*\) \[VC\]$', ''), '')
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DWA-A-138-1'
   and e.verification_note like '%md-quote 2026-09-05%';
