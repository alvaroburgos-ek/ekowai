-- Rollback for iso-14064-1-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows that pack touched (identified by the verification_note tag) and ONLY for standard
-- ISO-14064-1 (joined through worksheet_templates -> standards.code). Prior status was UNIFORM in the
-- 2026-09-05 export: all 49 fields imported_unverified (49 quoted -> verified_against_standard, 0 app-metadata
-- exempt, 0 residue), so every field returns to imported_unverified; quote/note/verified_at were null before the
-- pack and are nulled again. Section B is a QUOTE BACKFILL only: all 4 equations keep their status
-- (verified_against_standard, which they already had); only the backfilled quote is nulled and the appended
-- 'md-verified 2026-09-05 …' tag is stripped from verification_note. Gates were untouched by the pack; the
-- STAGED file was never applied; the encode-time source_quote column is separate and stays.
-- Contains ONLY update statements — no begin/commit/rollback (apply-pack.mjs supplies the transaction).

-- ---- fields: 49 rows — prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-14064-1'
   and f.id in ('a1c93e53-e398-45db-bc15-970f7c5bc014','66bec742-fd02-4824-ac73-c37824e2bcb6','8ed5c75e-1a4e-41de-a650-f496dfcb5937','296dd97b-2fe2-43fa-b94b-7879cf9f58e8','8eae7927-b5f6-4332-885b-d68953348079','788b3338-c12c-422e-91ed-83b542e9c056','26c53278-c96f-47c6-a4a8-c1164c9d82a3','8d97d79b-1142-4318-a864-44e3cbedbc8a','447d8489-dc4d-4a44-ba13-0518e2354600','d05158a2-a346-442d-a3bb-e79560926a63','cdd4a4e6-8f11-48a5-a267-32b1f9ebbb0e','d6a698f3-19a6-40d5-929e-793967122763','c379e991-c167-400b-a298-759678ad23c2','3c1fab4a-9ae2-4f35-bc3a-63aae0ab7016','6901ba56-e130-4c17-817c-fad3217886f3','444e5818-a1a5-4dfa-8ce2-61d07cbfd96c','4847222f-3112-4aa8-a4d6-bc1451a9711e','ff10861d-7cb4-4492-bf1a-59ada289b807','45c320c5-0591-4227-8696-0d9639e1a53d','9cdc7ee2-cb45-4709-8e46-b5cefc093a7b','c34307a3-c5ee-4e3a-8985-a420705ce9e5','af0f9b59-debc-4336-a80b-9f6ea1dff69c','ae66de98-e805-494d-9e34-6a77ba29dd03','30114ef9-c958-40bf-91e1-c2b841a46073','763dcf29-9ad8-4ad1-b5ab-c8a6e0b18f04','444ff7d6-1987-4746-8fa5-829aa99efe7a','de4f1bff-288e-48f0-907b-d3019d4c9579','4fa05957-b17a-4cbe-b476-6c602f9bbea4','b116fd28-ceef-42c4-84c4-69754df2a31d','b534fcea-fac6-40ec-8fab-089e00d2c1d9','6b9f20ac-c228-403b-920a-ea876f21dcb1','6bdc6a2a-7fd0-449d-9653-89ab83034a78','731a86e8-a228-45b9-adf7-2b810445aae0','beb67966-fe7a-4ece-b76f-7ab8aded6d94','bacea67e-743a-495a-847d-c8093a170f77','3dc98acf-09e9-4343-baae-1f518d926d9b','11db7d23-8ee3-45ed-8c79-54cef621db95','d7169a25-df4e-462a-a5ee-ea5b60deee58','8c79a983-d5c9-4326-810d-df91f961c618','d8976418-ee9f-4ba3-aa8a-0ded52ab6591','bff8685d-e8b3-4e78-aa70-d22a1034e9f1','45944213-7bc7-46ea-94eb-ab24e490251f','14fb18a6-94c5-4f44-a46b-bf820f9e36f6','738de1ab-5cf3-4fcf-8a61-ac3a5973a12a','2fb855f4-cb45-4f41-9cb1-d5a29bac7235','22f1ea9e-4af3-49a8-837e-c0cab633c0ce','7a2235c1-067c-4c09-90eb-d7928f83ca10','d618521f-95fd-4f47-a5a6-c018578f4046','ea0fb890-9965-4b05-8483-01b2eca3ed8c')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- equations: 4 rows (Q-GHG, Q-CAT, Q-TOT, Q-EL) — quote backfill only (status stays verified_against_standard) ----
update public.equations e set verification_quote=null,
       verification_note=nullif(regexp_replace(e.verification_note, '( \| )?md-verified 2026-09-05 \(.*$', ''), '')
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'ISO-14064-1'
   and e.id in ('7ac8363d-19a8-4106-94e4-c1b0abe174e2','4e81dbbd-4211-48b7-8991-02aaf039c3e2','09b790ad-bda4-4020-9ef9-9384abef9f76','1b725e27-bceb-438e-80cc-35ef7960d4e7')
   and e.verification_note like '%md-verified 2026-09-05%';
