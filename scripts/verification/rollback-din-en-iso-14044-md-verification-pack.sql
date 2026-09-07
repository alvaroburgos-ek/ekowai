-- Rollback for din-en-iso-14044-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows that pack touched (identified by the verification_note tag) and ONLY for standard
-- DIN-EN-ISO-14044 (joined through worksheet_templates -> standards.code). Prior status was UNIFORM in the
-- 2026-09-05 export: all 67 fields imported_unverified (67 quoted -> verified_against_standard, 0 app-metadata,
-- 0 residue), so every field returns to imported_unverified; quote/note/verified_at were null before the pack and
-- are nulled again. Section B is a quote backfill only: EQ-01 keeps its status (verified_against_standard); only
-- the backfilled quote is nulled and the " | md-quote 2026-09-05 …" tag stripped. Gates were untouched by the
-- pack; the STAGED file was never applied; the encode-time source_quote column is separate and stays.
-- Contains ONLY update statements — no begin/commit/rollback (apply-pack.mjs supplies the transaction).

-- ---- fields: 67 rows — prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DIN-EN-ISO-14044'
   and f.id in ('c0ead0ab-9b57-4369-a6e3-b1afc4716caa','a369afaa-c5ea-4e55-b950-ae62709b2d8e','eab6bc9c-7e4e-4bb7-bf3b-fc64549f6690','fa78e4ea-6c51-48be-abf8-2f9caa41faa9','f58c5104-a83e-4407-971f-3b3d8b028eca','cafa1bc5-0fdd-45df-9e59-c28837a04985','9ee3c4a2-febf-4147-b0ed-363342699a34','df206207-1c54-4ad6-9832-d170c211c347','88cbddeb-4ed0-4a5f-ab3e-2c3a3b51c80f','0cd25d82-e035-428e-823b-429c8a5a8af5','690ca38b-2edc-49fd-ad2a-a38cf672748d','2e20b8e5-be61-40c9-ae2f-71eaf01ceaee','c8f53d66-1d51-46f3-baad-ba5b02341f97','4ab1dba2-294e-4f41-920d-60299bf52466','e6abd75c-83d9-4916-a494-4434cb6685c5','80faf351-d975-417f-857b-046501de8836','04d30391-5ee6-4489-9806-ea61984f2925','0c841e9b-5904-41e8-8824-7396647e75cf','ca18195e-b1bc-4564-a58a-5c3f4951a787','82b906a1-9bf5-4dea-b455-d5280e29dfd8','0ce7876f-dd87-4bae-b010-955467d22291','5f2f70a4-204a-4758-a466-e8a1f2eca818','90d40510-fd6f-48a8-9349-1db3f0129eac','f0e3a655-77e1-4738-964f-7280fb417f47','a2074390-11e1-4756-be08-50ad2fc128e9','9292a211-d02a-46d1-92b8-6f9eb2ea7d1a','06f78f75-331a-42ff-ae33-c146f022e79d','f97a5612-0b62-488b-b017-85aa92d73ea4','35061916-a4df-4b94-8062-2d24e1a29ce5','5643143b-5233-4338-8766-a70136a6465a','d0e9c369-c511-40a6-99e5-c3b96846ad49','1035f8ad-9174-4b63-8911-626126544f5e','be970b39-ab53-4bd8-89ab-267209fb80c8','a3fa2617-8c24-4d4d-a7df-aad16fb3b7d6','6aca78bc-70af-428a-ae6b-49e40b108220','ac3e2a0b-6a87-40e7-9ce4-e022df5ff261','de990c85-4648-4269-865e-93764c7a5e8a','e868fb9c-c9d9-4da2-b71a-798af892a685','f028bff4-c1be-4713-b0d3-2225dcbb7668','f89ce2f4-64e5-41b4-a41b-68dda0c632a0','5237e9c1-3137-4346-bbc5-ed78863e401a','5ab35630-775c-42a8-b1b3-e77bdde77ae6','d32ad612-b320-47cd-bfcc-f0d0ebd21f85','1716666b-6a17-4924-bdc1-0250c3a1c82a','4725287e-066d-4d7a-9722-ba04c16d6abb','267af467-1a09-4a27-af71-3c146851dbe8','7f366695-dc78-4cb5-b11d-32d10982cd5e','da74fca0-622a-4745-9d24-77ed3e93cf3f','7ce75b64-fecf-4f10-bffa-bbfddca6a633','76fbc899-0638-403a-a691-ed6301ff8faf','b15953db-71e8-491f-b311-0fb1e0344f78','4caffcee-5615-49b7-975b-15ca6f420897','3a7ba796-bd83-4f37-923a-3588c14335a7','d21e9299-f070-457f-a535-a5fccec5adf7','2756b92b-0482-4ae8-9edc-53e0983970d0','e539e776-aa82-416b-a0fd-2d9e485fd295','9318f4df-e18b-417b-9a59-f3f16d191036','fe4d64c8-a912-4c3e-8108-0b2946f19941','50a8e1d2-fb00-4350-aaaf-a0701ad025a6','32f52632-8612-404b-a781-361468367f18','ad3226c1-eee9-4eda-b0b0-f0b4e801dd93','aad64b32-f49a-4f6c-bcc4-837a64d7b195','3d808cbc-5937-4ffe-bce1-28e5e9b592e0','1dc12e9d-25ff-4744-9852-473d9d285079','c2861230-21d9-4f3b-bfbe-845f4a246b37','3cd5dc5d-8486-4241-99ea-d4692674ead6','1cb84ead-c30e-4493-b694-b09fc0080991')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- equations: 1 row (EQ-01) — quote backfill only (status stays verified_against_standard) ----
update public.equations e set verification_quote=null,
       verification_note=nullif(regexp_replace(e.verification_note, '( \| )?md-quote 2026-09-05 \(.*$', ''), '')
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DIN-EN-ISO-14044'
   and e.id = '0b643c13-d138-45e7-a90a-0254b68db990'
   and e.verification_note like '%md-quote 2026-09-05%';
