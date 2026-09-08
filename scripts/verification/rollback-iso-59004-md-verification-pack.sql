-- Rollback for iso-59004-md-verification-pack.sql (run 2026-09-08).
-- Reverts ONLY the rows that pack touched — identified both by explicit id list AND by the
-- verification_note tag — and ONLY for standard ISO-59004, joined through worksheet_templates ->
-- standards.code so no other standard can be reached. The 2026-09-08 prod export showed all 33
-- fields carrying the single prior status 'imported_unverified' with verification_quote,
-- verification_note and verified_at all null, so every row returns to exactly that prior state.
-- ISO-59004 has 0 equations, so there is no equations block.
-- Gates were NOT touched by the pack; the STAGED file was never applied; the encode-time
-- source_quote column is a different column and is left untouched.
-- No transaction control in this file: apply-pack.mjs supplies BEGIN/COMMIT and implements
-- --dry-run by rolling back. An inline commit would silently turn a dry run into a real apply.

-- ---- fields: 33 rows (32 verified + 1 metadata-exempt) — prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-59004'
   and f.id in ('863cdc93-3d43-46fc-8462-a0f5ad081ca9','cfe85257-2334-47eb-ac71-dbb8af526cc8','12b9022c-dc42-41ed-b321-3025a6367674','f7c980f0-4f03-44eb-98fe-757e6b2343c7','1198f1b3-e3f2-46cf-b9f4-af083b190ae3','54c8f4df-8ff2-4571-8020-a8cf39b71b2c','032bb918-83c1-49f2-8350-d08eb2d42e19','e49c7202-6a79-4558-b0b3-f52b7b643385','b2436626-4bea-4bd3-a198-fffb9348edf0','2930b494-3154-4d09-941f-c57e67407085','f5d68a9c-2e5a-45b6-937c-b2dbf06242af','86c49ff8-ff8d-4971-b571-5e361b00e84b','bf42aa68-b9ad-48c4-af29-e61557c912ec','1c8e0886-5389-409f-8beb-f582097923a8','140e3977-fce7-409e-ba5a-d135103c831b','06d21589-3812-404c-bc62-0baf0432ff7c','152afe33-75b1-4e24-889a-46e524630cf6','f2078636-0072-4f7b-ac72-cd518bd16fc1','488f7f2a-0090-492e-af07-bd26e5f69391','f301f926-4f37-4df9-9b3b-ee3801cb4753','2084eca2-b592-4c8d-a63e-23e5a3125b24','9d1e60c3-cf6c-4d33-bd9a-8462f2f9f114','ed937302-ec3e-4590-8932-50a10b60190c','e2831e54-13ae-4a10-8bc7-0e80b4dd6eb9','1a37d6cb-2e64-4062-b556-52b808543b34','4a0d089d-1395-4bf6-9997-518d08be3d2d','8ffe261f-1527-4051-a397-5a53fdd0b068','f34c2fab-d2a7-4e41-8340-af9b9ff40f7e','1fb9879b-24b0-4cd0-8424-c854ffdb72c4','3476e0a8-29a1-40a9-8384-7742177ae134','eeca86b2-0dcb-4407-add3-9cb1da1b246c','82b7680e-b5c0-4ee1-a9d6-bb1746a25f17','c66ed4f7-d3d6-46ca-af8e-8a933ea7cae1')
   and (f.verification_note like 'VA-verified 2026-09-08%' or f.verification_note like 'md-pass 2026-09-08%');
