-- Rollback for iso-59032-md-verification-pack.sql (run 2026-09-08).
-- Reverts ONLY the rows that pack touched - identified both by explicit id list AND by the
-- verification_note tag - and ONLY for standard ISO-59032, joined through worksheet_templates ->
-- standards.code so no other standard can be reached.
--
-- Prior state captured from the 2026-09-08 prod export (scripts/verification/export-fields.mjs):
--   fields    : all 47 rows verification_status='imported_unverified', with verification_quote,
--               verification_note and verified_at all NULL.  (0 rows were already verified.)
--   equations : the standard has NO equations - the source contains no formula, equation or
--               calculation anywhere - so there is no equations section in this file.
-- Every row therefore returns to exactly that one uniform prior state; no mixed-status sections
-- are needed.
--
-- The pack touched 44 of the 47 field rows. The 3 residue fields
-- (year_of_implementation, relevant_products_services, added_created_value) were never written
-- and are deliberately NOT listed below.
--
-- Gates were NOT touched by the pack; the STAGED file (iso-59032-STAGED-rulings.sql) was never
-- applied; the encode-time source_quote column is a different column and is left untouched by
-- both files.
-- No transaction-control statements in this file: apply-pack.mjs supplies the transaction and
-- implements --dry-run by discarding it. An inline terminator would turn a dry run into a real apply.

-- ---- fields: 44 rows quoted by the pack -- prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-59032'
   and f.id in ('3e57752f-0e99-426b-9601-43e78c4ca344','35a6bb15-4d4b-48f6-a21a-2c988a73b402','8f9e2753-6015-4b34-82d1-c3cd51bce18e','9dd386df-7780-4559-842a-e9c9c67ca1b5','e9a5251e-8e69-4c94-8373-6b61ae3d478d','963f127a-9417-426b-b4c7-6533944cae0b','15e65d84-6ebf-4bba-8997-f483f7a18931','2b78a3be-b5af-4503-9c8f-c6eb1dc519f3','d386e867-13b9-4721-b1d9-303622642fe2','c320af88-f170-41ac-920c-f39f118f81da','23a8580d-5387-4329-bbca-0d0fa95e7fdf','f2f63e34-122b-452f-8a84-a59271b9ae5f','a371b38d-184c-4495-b3ef-882b31631bb2','db929aea-dd2d-4abe-8f81-9d23df83accc','c03ec6bd-00ab-42f6-a451-9062c3d73ac8','98e7b5ff-959b-4ada-b077-21954e726f9d','ba87a922-ee6b-43ed-867c-730bc0076db1','b224544c-97c2-4c50-bd00-837138e106a4','acdfa5be-aac7-405a-9afb-222c3b064e83','0dfc9aa3-3447-47f9-abaa-c5c697b19841','c3d12aa0-3eb9-4419-8a58-c189e1710409','ef80a79f-7f17-4822-abc7-bcd4a1415197','efddfee2-3784-4c29-992d-1221f4317694','9866b829-3815-481c-8403-687273642d10','fda8ff7a-ba7f-43c1-9306-99581c863ba6','07b148f4-506c-42db-a32a-3f53541d52a1','7cf57274-46fb-407a-b21c-4d6d9ecd4739','e3353fd6-adc0-4df7-aa73-85c4f16aafd0','cb05c0aa-0d58-45b7-ae1f-298a796cd776','d806d744-7a8b-4a73-bb61-f3d9d88d7c6a','4964e25a-78fc-4e3b-8ba8-839666de425e','cf6be8a0-26d3-4446-8900-54ef7f27209d','345f9a80-0463-4d2b-bec8-dd08db593775','c8d1bb5e-89bf-453b-bc7d-b276ae43a721','bf25f4d2-04df-4279-9a7c-6225504e068f','9c463c68-bb5e-4028-b9cd-0dd1511859aa','57615cd5-0d65-47f9-9970-425b5a14c5e2','c2468260-a35f-4f9e-a1a9-15ffa0dcd2ca','6060bdc9-6c71-4c0b-82fd-7fc96ab59798','96eea065-925e-4a7b-bbec-c8ec4b3286a5','378bd985-f3d8-49ba-94c6-642143f59a2c','06f63a4e-7398-4375-ae2c-d09593991fd6','00360bdb-558b-499f-8f7f-19d8c12176b4','f3be4570-3fdc-44ad-92e7-26876ee1652a')
   and (f.verification_note like 'VA-verified 2026-09-08%' or f.verification_note like 'VA-pass 2026-09-08%');
