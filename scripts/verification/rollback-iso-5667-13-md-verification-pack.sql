-- Rollback for iso-5667-13-md-verification-pack.sql (2026-09-08, VA pass).
-- Reverts ONLY rows that pack touched (identified by the verification_note tag 'VA-verified 2026-09-08%')
-- and ONLY for standard ISO-5667-13, joined through worksheet_templates -> standards.code.
-- Prior state per the 2026-09-08 export (scripts/verification/export-fields.mjs ISO-5667-13): all 46 fields
-- and all 3 equations carried verification_status = 'imported_unverified' with NULL verification_quote,
-- NULL verification_note and NULL verified_at, so both sections return to exactly that state.
-- NOTE: the three equations DO carry a non-null source_quote. source_quote is a DIFFERENT column, is not
-- touched by the pack, and is not touched here.
-- NO transaction control statements in this file by design.

-- ---- Section A: fields (46 rows) ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-5667-13'
   and f.id in ('58e9114b-0712-4b54-b7ce-801188b25391','e94ff1c3-b5b7-4f14-b774-10d9f482eb97','9460c3fb-7454-4977-84ef-f3c2a81e2440','7fedecc6-d59d-495a-a9aa-7323632a943f','fcd970f3-7095-4994-a86f-826b5589d4c6','9bd8acb2-2129-4106-b282-60a18248cd6d','18982fea-26db-486a-85be-6850adc1a2df','e9a871e5-a2b0-4794-b38d-3efe2d3fe009','449a53e8-0566-4609-b27b-58d8f9bbdb16','8ef92cc4-9dc7-44f6-a986-5d8b459802c6','e204d056-c30a-4229-a3c1-067b1b633fd8','4cdd8718-20f6-4a3e-abb6-3b3a39ec4fbc','0f8cbffe-5bd9-4a66-8754-82c16ff593d6','fba117a2-95b5-48a9-8c24-94e3e4a276a7','67cb94d1-4c53-4d03-8e51-77a33f783316','08419d6c-0a99-44d2-8166-45734f99596d','3272495b-3315-44b6-8700-875110f1c6d8','332032fe-31ed-4b93-9a5f-08bf188f984d','1701eea7-97fa-43b1-b2a9-8c958aab6cb6','93510e02-1315-48ff-843c-8226cde60c51','da97e85e-0baf-46ac-9b38-9a59269040bc','f81fa43e-d06b-4d3e-a30a-63c88e9f8569','690aad7b-17e3-4fc0-aff4-d7e00768fa8c','549fcdcd-fcad-43ae-b0cb-d8f008dbd30b','efa0823d-5939-4145-8464-12dd20486e13','d32d3718-668a-4cc7-af9d-b574270f0b35','41c84966-d850-4f16-b01c-217947548c6a','e904d368-03f3-42ae-ba9f-9a99ec7fffcf','d3d77d1b-6e94-4312-b7ec-6f2e2f3ba06a','eaa1dd83-5da0-4538-a742-2bcc685e5478','a866af03-3498-4ae3-bda5-1af7cfcb0aa9','c3ba7f13-65bf-42e7-9ec0-72f83ad05c2b','57915de2-8411-421f-8d1f-6fbdbc911f1c','bcec0f85-5170-4205-9df6-43ef0551bc52','f2117d08-ce9e-4fbe-bede-bb68ee11c5bf','2db65cb4-3f80-48b8-b1e3-602627650550','d5ac269b-d38e-4fed-a6cd-a20f8c3a589c','7ff66f5b-0cae-4b97-9959-ebdf6634335a','f43c4359-26a3-4db4-aa25-ae4aa849d847','b95526db-9ba9-4c65-b0a6-74b81c58bb2e','de6872e1-cb82-49a4-b270-71090c0f5e3f','f985cc17-0524-4ba7-a445-42c48f0198c8','66f84df1-1335-46f8-b5c1-4c501cfa03c8','fd4bde73-c977-43b2-8e21-6451fd2164cc','956bd0e7-aca8-49c8-a0a4-7a9de7321cf4','0bf83eef-0dbd-4e14-a64f-230c3d6f74e5')
   and f.verification_note like 'VA-verified 2026-09-08%';

-- ---- Section B: equations (3 rows) ----
update public.equations e set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'ISO-5667-13'
   and e.id in ('b4b5c46f-2f34-4a80-aad4-54244d7f565e','53384ff5-d097-4d02-a69d-7a053a9ef8ba','a2e44a3f-fa64-45aa-94be-80f7c57ed95e')
   and e.verification_note like 'VA-verified 2026-09-08%';
