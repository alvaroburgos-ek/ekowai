-- Rollback for dwa-a-125-md-verification-pack.sql (2026-09-05, md pass [VC]).
-- Reverts ONLY the rows this pack touched (identified by the verification_note tag) and ONLY for standard
-- DWA-A-125 (joined through worksheet_templates -> standards.code).
-- Prior state, exactly as captured in the export (fields-DWA-A-125.json, this session):
--   ALL 70 fields were verification_status='imported_unverified' with verification_quote NULL and
--   verification_note NULL, so a single group restores the exact prior state. 70 ids = 70 quoted
--   (0 exempt, 0 residue -> nothing else was written and nothing else appears here).
--   source_quote is a DIFFERENT column and was never touched by the pack or by this rollback.
-- The 2 equations were ALREADY verification_status='verified_against_standard' before the pack; the pack only
--   backfilled their NULL verification_quote/verification_note, so the rollback nulls those two columns and
--   LEAVES the status alone.
-- Contains ONLY update statements — no begin/commit/rollback (apply-pack.mjs supplies the transaction).

-- (a) fields (70, all 'imported_unverified' before the pack)
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-A-125'
   and f.id in ('2df84756-8098-4691-b6a9-1a08eada0e1e','32b0ecfc-305e-4631-b12d-7fbfd4dd5fc1','aaeec037-6e07-4339-be65-88cb54baf1bc','ec6705d4-16bb-4c02-9e0c-e23de4a1f72a','c45e5dd4-219d-4738-a605-18741446126a','c50bc503-28dd-4717-be4a-170da654e050','fddd0de1-e073-44e8-91a0-425cf27f014a','26de0ef3-473f-4984-a109-ec924c33cb12','fb8e0f88-f374-4615-96fd-fa880516eaba','0cff294d-b713-4e8a-bc57-d9141aeb80f4','209dd27a-8a0b-4f9d-bdcb-4b2aca1d7aff','2b1c78c5-a332-4d17-90a6-24a8fd815ef3','b2ef3541-b497-4b28-8ee7-8e5621862911','c90709eb-5941-422c-888e-0c039248c9b3','8cb5f6be-fbcc-41aa-b73d-0b7714010629','9cbad52c-c446-469c-9cf8-853467e604b1','b69bce78-64c3-4af7-905d-8e7bca629488','27e0ddb3-059f-430c-9d6e-6b69dac24b8a','c0e19eda-5208-479d-b31d-92ca8a959942','caebd763-90b9-4026-9b8e-74e68fb8ec71','beb320a3-c2b2-4d60-b500-a4e867814412','525e7c5e-1ce1-42cd-863c-40cbffcd6a77','4a7b22a6-653b-483a-80cf-76474794dcf2','c80e049a-4519-4bf2-aa78-c54f92ffaccf','5f882c13-0280-45e4-bae4-b1fad3836689','9421dafd-67a8-44f1-ae6f-3517d7998c72','bee5afbc-16a7-4ea3-b74b-13f4db8f37bf','661766bc-c034-4610-afd0-a11029fa3934','f3990e97-ee94-4772-b4db-a485eed3ae23','0a80dca3-9746-4580-ab24-12994be98531','58ace4a6-c95c-4273-a987-0254b3b14bbd','c0dfe7b0-604b-4c05-b51d-d8b8f4bc2fb0','dcd7a30a-b703-4fc7-ab5e-31411b52322d','1ff4c7a1-47af-46ea-b557-5baba5e71946','47d0213a-d903-487d-982e-5c8f1d4a887d','c75fe1df-29c0-4a49-8da6-210d52303b02','e7228ec4-9ed7-4eb1-a145-38d9c15968fb','3d7f3b60-bafd-4673-b094-4cafe5f30265','98f1ccd3-f4d6-4ec0-b5b8-7ded4dc3975e','6cdd05d8-58cf-4d28-a921-efbfe2b631f2','0c884564-deb4-4194-a3cb-558f672fc528','77deb7b5-d068-4e7a-acff-09e33dd316e9','acf7d470-8767-4ee0-9a15-c72d278155bd','b298b567-229f-42ab-866f-db0857c857d3','573f465d-8694-4fcc-b0ff-564ac224176a','df49f903-ec77-45c0-b4d8-5845e8c5c960','9cb0f9c9-31ce-4a18-8073-33ac0dce1559','e095085f-cc80-47b8-8430-57338281e6b9','2128d273-bb50-4a09-8fb2-348db2ad27b2','e2c2d172-017d-4a5f-a5ef-b2bc8b302ec4','a6726e5a-013c-46ce-93a4-f45a8e099fe0','9022e737-7d2f-4f85-a23d-7fd5ed6555fb','78daa693-6126-4611-a692-30d2dff0c0ae','5275cc82-26ed-492d-b239-30e4a360816c','43ece15f-8b55-4262-a66a-f292d31d468f','366c2ff7-bab3-4db1-b5e8-5c7562221a75','e17ef40f-7d9a-40c4-ba0a-e4b34525c1c0','db7d3e15-cc01-4fec-91ef-f90c16ebd656','e3bb9c0d-5c0d-4eff-bc72-eb004ad3f24a','d7fd1152-657d-4ed7-b9e5-082c339df9ea','d2503b23-7592-4352-920e-770e58c4323d','b5be91a0-2243-4699-8225-34397f225ae5','3c48d301-c69e-45f6-80eb-047fc9133ee8','f17ca871-e01e-4ba9-97fc-349effe0f177','76659dd2-6295-42d4-b341-439d107862c6','0fc2e16a-ce5d-47b4-ad8c-def0501f2c72','eb4389bd-ca76-4453-a5b4-03ef056835ac','a2ffb765-cb5b-42d5-b5ff-812cdeee4416','f8579d4e-d5f7-44b2-9db3-9cf976827551','f0582651-c0e3-402a-ab7d-77974e4bcc6b')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- (b) equations (2) — quote/note backfill only; verification_status stays 'verified_against_standard'
update public.equations e set verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DWA-A-125'
   and e.id in ('c068f7f5-5b7b-4e8f-a715-b9b5fdf1bdee','cd0b71c6-d17e-4f96-8bfa-39414a01d767')
   and e.verification_note like 'md-verified 2026-09-05%';
