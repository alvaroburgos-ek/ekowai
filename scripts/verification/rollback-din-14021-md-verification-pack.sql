-- Rollback for din-14021-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows this pack touched (identified by the verification_note tag) and ONLY for standard DIN-14021
-- (joined through worksheet_templates → standards.code). Prior status was UNIFORM in the 2026-09-05 export: all 47 fields
-- imported_unverified (42 quoted → verified_against_standard, 5 app/workflow metadata on worksheet DIN-14021-06 →
-- inferred_from_worksheet), so every field returns to imported_unverified; quote/note/verified_at were null before the pack
-- and are nulled again. Section B equations keep their status (verified_against_standard, encode-time); only the backfilled
-- quote is nulled and the " | md-quote 2026-09-05 …" tag stripped. No Section A equation statements existed in the pack.
-- Gates untouched by the pack; the STAGED file was never applied; the encode-time source_quote column is separate and stays.

-- ---- fields: 47 rows — prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DIN-14021'
   and f.id in ('c6b032c6-f488-4dee-8a2d-a0d5f7f89aa8','8f7e1d40-493c-407c-88de-343a6acb89ae','698eb9ba-eb93-4724-8293-44b0912301bc','a8420fa9-0d3f-4864-913f-36c25eeabdbb','7fd849d3-cb9a-4792-a324-43e554a03a4f','40fe9752-f0f3-41e4-9ba0-a58bd0527a54','e7b7a231-ac30-43c1-8a55-2e118f4ddabd','d5aa63a1-c3bd-4e45-97de-07316c485ebd','659ac4cd-7848-431e-b825-96e5369fd403','c938c92b-fe17-402e-b15a-1db02c31699a','0c916657-6460-4695-a801-eb61a11233bf','83910123-d427-4b04-8603-c30c6c5edacb','a67e8aba-a822-404b-be96-bf978bb94704','029f4d91-bf50-4545-92d6-0e7add42d21a','8d61136e-1239-4779-bc96-c53bc3519ce3','c3652d7e-d7d8-4e2b-8d00-a633994db747','8c7299a2-6d20-4917-bbd6-8f04157833df','c6f16e9d-4941-4899-a771-86d7249ba8ba','0e43ebf3-f7d3-49ca-a3b8-b74c94bf4ec8','2e23a8e7-4734-46c0-b7b2-948a37c83994','a15413f5-338d-4a10-8132-6eb222c5f908','3f449e53-a3cc-454b-9c24-e05b946ae389','366a3df2-454a-4962-862c-a5f84c483538','9317fab5-327f-492e-85ff-d34dbc5f3f0f','90277002-d95d-4372-a61c-2de346a89612','935dd577-d759-47d1-a5e5-42b239611f7a','4fcdeee6-ccb1-45be-975e-ffc784b2e274','ed9fccf1-b8a3-46e6-b73b-990fe61ea2cc','f4c868bd-d189-427c-8cb2-9be78e77d15b','a5b14d69-a416-47dc-9e9f-92d827772677','4df1d896-b84a-4638-a66a-e5d9cfdd2ff9','a2dc5937-9de4-4766-a6f6-850dd69c1cfa','9d1257d4-0e72-48f2-acdf-4afe530d3d6d','45dab36f-156c-47bb-8132-00b5c7379209','fee3a082-4569-4438-9697-4b95e7a548f2','f5c87bfe-c0ba-48e3-9c72-9cf333ddd0cd','f65f1993-3a38-4769-8789-c84ae18922c9','35dcb951-4d1d-4143-ac93-d445ff15f005','9b1b1b89-831e-4b71-ab94-b2fb67f12881','d1a4be17-5e33-445d-b2e4-880adc82399e','800f9d17-faae-46ac-8cd8-bcd7fa162269','ea98b6d3-ca2b-454f-8eca-b454a4474d74','4611bf92-eb63-4564-b1a3-9b284431c4c4','3cb64452-a36d-4d0f-8684-04536675396d','b816ca67-a128-4cf0-bf9b-3d16fbc686cb','74b6bc61-71df-44dc-bcee-79b811afe0da','278b290e-d49a-464e-a66c-ae1b39c27092')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- equations: 3 rows — quote backfill only (status stays verified_against_standard) ----
update public.equations e set verification_quote=null,
       verification_note=nullif(regexp_replace(e.verification_note, ' \| md-quote 2026-09-05 \(.*\) \[VC\]$', ''), '')
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DIN-14021'
   and e.id in ('bf45c951-daee-447a-b699-81157cdb61e0','c14004cb-6185-4b81-8ae0-427a9d9d791b','af58d637-011b-4b83-a1d7-c8a1d4b4a129')
   and e.verification_note like '%md-quote 2026-09-05%';
