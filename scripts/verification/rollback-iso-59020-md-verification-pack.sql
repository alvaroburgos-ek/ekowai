-- Rollback for iso-59020-md-verification-pack.sql (run 2026-09-08).
-- Reverts ONLY the rows that pack touched - identified both by explicit id list AND by the
-- verification_note tag - and ONLY for standard ISO-59020, joined through worksheet_templates ->
-- standards.code so no other standard can be reached.
--
-- Prior state captured from the 2026-09-08 prod export (scripts/verification/export-fields.mjs):
--   fields    : all 83 rows verification_status='imported_unverified', with verification_quote,
--               verification_note and verified_at all NULL.
--   equations : all 13 rows verification_status='imported_unverified', with verification_quote,
--               verification_note and verified_at all NULL.
-- So every row returns to exactly that prior state - one uniform prior status per table, no
-- mixed-status sections needed.
--
-- Gates were NOT touched by the pack; the STAGED file was never applied; the encode-time
-- source_quote column is a different column and is left untouched by both files.
-- No transaction-control statements in this file: apply-pack.mjs supplies the transaction and
-- implements --dry-run by discarding it. An inline terminator would turn a dry run into a real apply.

-- ---- A. fields: 83 rows (82 quoted + 1 metadata exemption) -- prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-59020'
   and f.id in ('57e1ea03-8fe4-42af-bc4b-1599d6549a30','3e6204cb-91e9-4f06-b785-c262852fa500','3dd50c3e-d200-41c2-8ba0-72d43b934f0f','6306d541-b669-4088-bfc9-0bc4c5e42376','37276dbb-bf8f-4d97-aa23-458f4e65ddc5','11309c54-6458-416e-a7de-cabe0f959b4e','29e6d9cd-041b-4041-bc6a-969b6b094f09','a3b2a824-4c35-4d01-87ca-2b381cfe2d77','3495d971-cbd6-4b1e-baf1-aa70f9d05df4','18c47cd7-86c7-4576-8425-409f6a2d324c','0f748505-e3ec-49c0-b025-019f79daf022','54284e64-1e32-4340-811a-2709274fffd2','60c70308-04cd-411e-a1e4-1bdb0daca974','a021982d-339f-41b6-939c-5139e7dfa14d','e8a6a59f-ea98-4cd5-ae2e-8ef73414c2ed','def0c321-4f00-4f5f-9b47-e76992690db7','58296820-400e-4b1d-b894-3dbb77841ccc','9216567b-d176-49d7-88ff-7f4e82994b14','5657f6f9-6bee-45e4-a0e5-e58d9d74e31a','b32aebce-31b4-4e15-abb0-01c55a9c48f4','f9664ddc-894b-4ada-bcbf-407a16c19acd','eb66e6b9-c6b3-427e-b246-7be5cd1b6330','48984865-60d4-4f5c-8c89-391b4053e3f1','6f2f9002-8a87-4b01-90ae-2fa94c612ad2','fd124ae5-535d-4a17-a4d4-99471189277e','0002e3d0-fa39-4ee4-ad1d-cb3f020b44d5','c551ab32-8594-49a6-ae1a-95710b07d18f','871afd8f-0091-4ea8-996f-7fdf8d06aaa9','5673c713-d690-4b97-9e3c-74ff5dadde0f','d01fbfd9-a9d3-4219-8dd5-aac89b9fef77','c54cc28e-e2f7-4923-bc74-f3d2998b0827','5c3d9c67-df9f-4b84-b451-97cfe23c7588','8a6baf16-ff6c-4099-af79-b9a6a180b84a','361b917e-acdf-4048-8073-4283dd724fc6','4610da06-eb94-4a7e-a7ff-f5e3c46821f9','df15b536-271b-40e0-aa38-b605461c2ce6','3791f8e5-822f-4e38-87ee-9dff715b2ed0','e58b4452-d163-49a1-a8af-315e476f5318','cb8d3a22-a5f4-4c29-832d-a5232e123a78','58844536-3fa7-4c59-90ac-ab76e8e483c9','1bc16bdc-4aa1-4763-87c2-87c89ffa686a','91b4d023-4977-4483-8f93-bc68c0e214a3','b9a96955-5418-4ecc-a3cd-93dffaf1ba6f','38577662-77b2-4924-906d-4df0dd354830','5a336f08-70ba-407e-a4da-78c5e6c13821','e58dc111-a6b1-4ac7-888b-6ea00319d5c3','b319e908-1e4f-45e0-840a-354d1cc05825','a5d851a4-5b62-40a7-bf15-1f89298500ff','01e03f07-9399-46bb-84a5-e60795fc8e76','581eace3-9f38-4b0d-9b55-999ea2602ff3','523fb8dc-be76-4985-b82d-30987a22c3c1','66ddbe71-60e4-413b-ab77-d9737b8f96fe','9f7a4e65-ce0c-4697-a64e-30e5c31a76ca','bac59a13-aa8e-455e-ac53-c4ba2dc654a4','b367539d-4fd2-49db-94e1-7df044c8b541','ca386188-db5e-493e-a458-22ffe8095bd7','3a71e8aa-4148-4871-84ba-3f0a2d212b55','00963588-9de8-4ee5-9cde-6f9f2290070d','e01f10ce-cf02-4dad-96ed-cb803179eeb2','77761a72-44dd-4427-a607-3c517a13017f','92e932f7-e959-4238-8dad-5bb2cb7e1fb1','539327cc-9715-49cf-a5ca-8cf0337f74c4','e5686712-827e-431d-bf5b-5812ca67cf73','78e93697-83aa-41ca-8f33-c37038d0ecf2','ce2ec69f-15fa-498a-9533-452bb3d190bc','9839e32d-a1b7-4415-ab0d-965af1a12136','3bf241ae-788d-4de7-9374-0b05b10bd49f','e1a20088-49c5-4948-8ca6-c4fd7c6a7284','0224960d-b232-4177-a193-b068fea48424','4639aebc-0bf7-4621-af5a-e2b3236bb248','872c83ff-e004-4285-acde-b9322bac110f','d02d2034-5012-447b-b43e-fa4783a261fd','82123c62-3f11-438d-8252-0d4c0192f76f','ee8488f7-7859-4d28-9d89-758462454117','a690bee8-bdc2-4b36-872b-bfd9e95ec431','a1ea2b50-8d16-41ba-b52e-e635c71cbb85','e5ec7082-d791-450a-a2bc-631b8ae5d755','a9ea4f4a-0281-4021-80af-3dc7b3267ef9','86c433ec-8cf8-46ee-82b3-bd64b548b8ee','cc769ef2-1d50-44b4-b5ed-1de679fca71a','74f7357e-19ef-4903-9571-19b481b56855','4a082e0b-7f9e-4700-92b8-a7638792d4c6','eb510e9a-7d6b-47a1-afb8-294f01bd228d')
   and (f.verification_note like 'VA-verified 2026-09-08%' or f.verification_note like 'VA-pass 2026-09-08%');

-- ---- B. equations: 13 rows -- prior status = imported_unverified ----
update public.equations e set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'ISO-59020'
   and e.id in ('62e2cbfd-f530-4450-a9b7-1982fa1f955b','3d0e7b99-83ba-447d-9101-df3ab06c11c2','77f9ac60-2373-41f5-aa09-071b9e311ff2','36c2e3ea-1c39-458c-b1ab-0568b515e4ec','b96ecbfd-5f01-4c9b-af8a-864ebe15982a','1e0f3bf1-e489-4678-9fa3-84394512a64c','3fc5b480-968f-4176-bd3b-6eb91f1f6f3b','55e9a431-e000-4ee9-914c-1fce534ea092','7e69300e-af43-40b2-9f75-ef773d9ffed7','e3364b07-c567-4740-882c-d87e0e636a94','fc67093c-8d64-4854-882e-a2f621059041','16e117aa-9d53-4f91-8323-4cb016a18a3d','c724b258-9a2a-47b4-99b2-7907a0b006dd')
   and e.verification_note like 'VA-verified 2026-09-08%';
