-- Rollback for iso-14015-md-verification-pack.sql (run 2026-09-08).
-- Reverts ONLY the rows that pack touched - identified both by an explicit id list AND by the
-- verification_note tag - and ONLY for standard ISO-14015, joined through worksheet_templates ->
-- standards.code so no other standard can be reached.
--
-- Prior state captured from the 2026-09-08 prod export (scripts/verification/export-fields.mjs):
--   fields    : all 54 rows verification_status='imported_unverified', with verification_quote,
--               verification_note and verified_at all NULL.
--   equations : none exist for this standard (0 rows) - nothing to revert.
-- So every row returns to exactly that prior state - one uniform prior status, no mixed sections.
--
-- Gates were NOT touched by the pack; the STAGED file was never applied; the encode-time
-- source_quote column is a different column and is left untouched by both files.
-- No transaction-control statements in this file: apply-pack.mjs supplies the transaction and
-- implements --dry-run by discarding it. An inline terminator would turn a dry run into a real apply.

-- ---- fields: 54 rows (all quoted, 0 exemptions) -- prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-14015'
   and f.id in ('c7b86d1a-25cb-440e-90fa-d30a1b05e5e9','1de21901-696e-424e-9689-5fbd4e342389','98808251-f2b4-462d-ae6b-8db04946d8a5','2ef81485-8b7c-43f7-b435-fe2f7f5a48fc','8e5fe5fe-7fab-4d8a-858e-fe879dcbed10','a5f0db2f-4956-42c1-9768-712424657cba','3deea385-9b1a-41a7-80af-ebbcba798eea','5ab85172-61ce-401b-af30-a77a1b974618','c3dab306-5aa1-4a7d-bb8e-430778c2e750','ccfa9e19-d8a8-4dad-a638-a97b2b78d8b9','566eac43-c484-4f2f-859b-f47a0441937d','7375d4b1-24bd-4f4c-90dc-c18ec51041af','1d870459-aa93-40b4-a230-1f5f4226781a','708e494a-8329-4d3d-ade9-7fd8ce29e607','c5bb3d12-0349-438c-9b0f-4dfaff1176bb','85e0c89a-15c8-4e2f-9ae4-4c428533210c','c0e84331-8e30-46e3-a5ff-a73940aa5422','6706fc7e-63c7-4613-9b61-93bc84dd7e3e','de7026ac-7ab6-4f6f-b0c8-91c80e4cb042','b865bc98-07d1-47a2-812f-2cd43f47ddfa','920c246d-7f71-4ad8-9021-dd88576431e8','14fb098a-77de-4278-987f-3cc17bad372b','60565176-3786-4d5d-a8dc-46ae9e26c51d','0fc1ff1c-209e-4f7d-9468-88635ddb350b','b83b42af-5387-4a09-bec6-856ebb24b337','5e784f0c-a8e0-4639-970e-e4e8bc6a5d8e','2222e93f-18d1-49c1-92a0-da770830093a','a1460d5c-cf62-418c-b5b5-9ab38745e9e2','302fe2bf-439d-426f-974b-f0aa2271b656','cedf1b7a-1c6a-408f-bee7-3b123a25166a','c94a1a72-3933-4905-af4a-f6fcedb3eca6','8215b7b3-f247-4651-95cc-937a84c56ef1','323898fa-0b25-4e2e-9a46-e41d405c8ff0','a03c09a7-2607-458d-8cbf-100fcbefa545','4eb9b004-0d3e-4f63-bd87-0c8e2d865a0d','d0c04f24-1d36-4b11-9c3b-de92623fae94','bd8ed115-69f3-4c49-b1cb-75016ddccb84','cacc0c0a-3c37-48e3-b853-177a30676442','8ca89642-7e6b-4d66-949c-ca40fa2c9194','48aad03a-ccfb-44e4-a5bb-ce2f2803d9ba','3a3a93a5-5295-462f-a16d-682a36deb216','3d0a8379-a0a3-48e5-89be-2e00c5942049','ab9894b3-f42a-4c67-9d78-237da7bf5d7f','b7654f7d-901f-458a-9488-e5de9991abf5','ee6da654-e0eb-44fd-93f1-ab9c7e3ec21f','c9eb40d6-4508-4b66-b1da-686e851dfeea','a0940394-370e-4cf2-a50c-04ab09bc0a38','875a0ce3-e992-429a-bfc4-1c3aea1acdc1','ed235ba9-9619-4c9e-85b3-58e43c46dfe5','6ed8c9b9-7856-4e72-89a0-e663048ebaf0','ed4bac7f-7b5d-4547-b528-45de50b01ec0','19dc742b-261f-44aa-b095-a0dbe0d3508e','fcd8cca5-793f-4f77-b408-f80e2cfe4e24','775ae90c-51b0-4a21-9b67-e569e9a25671')
   and (f.verification_note like 'VA-verified 2026-09-08%' or f.verification_note like 'VA-pass 2026-09-08%');
