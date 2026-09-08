-- Rollback for iso-14097-md-verification-pack.sql (run 2026-09-08).
-- Reverts ONLY the rows that pack touched - identified both by explicit id list AND by the
-- verification_note tag - and ONLY for standard ISO-14097, joined through worksheet_templates ->
-- standards.code so no other standard can be reached.
--
-- Prior state captured from the 2026-09-08 prod export (scripts/verification/export-fields.mjs):
--   fields    : all 30 rows verification_status='imported_unverified', with verification_quote,
--               verification_note and verified_at all NULL. (0 rows were already verified.)
--   equations : the standard has NO equations in prod, and the source document (a Nov-2017
--               working-group scoping report) contains no formula anywhere, so there is no
--               equations section in this file.
-- Every row therefore returns to exactly that one uniform prior state.
--
-- The pack touched 29 of the 30 field rows (28 quoted + 1 app-metadata exemption). The single
-- residue field ISO-14097-06.impact_potential_category (232873ba-23e5-4f48-bac8-00dfaa8d38d5)
-- was never written and is deliberately NOT listed below.
--
-- Gates were NOT touched by the pack; the STAGED file (iso-14097-STAGED-rulings.sql) was never
-- applied; the encode-time source_quote column is a different column and is left untouched by
-- both files.
-- No transaction-control statements in this file: apply-pack.mjs supplies the transaction and
-- implements --dry-run by discarding it. An inline terminator would turn a dry run into a real apply.

-- ---- fields: 29 rows written by the pack -- prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-14097'
   and f.id in ('bdc37a68-67c6-448e-b491-6e4342eaf806','c40a225b-4c91-40a9-a3e7-15f4bd2e68d1','2f6ad359-d09d-42ec-97ce-6741d8dabf2a','c53847d8-57ed-4f82-a5e1-759e546002fb','912bc5db-81d6-432c-8358-1b46f22dfd79','22a23dee-26f2-404b-9345-68d8cd21f320','2b12251f-937d-48b1-b741-7ec7e1408939','fb7bba85-aa49-46b0-a0d9-67522c9da3be','dabaa993-1f4c-4ebb-a564-34816445b294','7ff08c3d-c9b6-485d-bca6-da3ab0bb98d5','bd9df002-04da-4fd9-907b-078a5e6fe82b','50fdb459-2e08-4226-9c84-d88727aa65ac','d9b6ba9d-0b1d-40b0-a2c8-72ceeafe2e72','0d31c182-4d6b-40ee-9012-3fe9ae90058f','e041b443-d10d-4194-a62a-eb07ceb57da0','7c373e66-382b-4b2b-aa38-163267a56177','c00ebca4-6dd7-4192-8fa5-1eaec71ddcf5','84f1d59f-48ac-4b3a-8ab5-ff3c54d78db9','c7735a9b-a04b-4f6c-9ec6-d0fa02bdf714','bc0f969a-a6b3-4013-91f2-68f359616923','2f17f267-94ec-4c7b-ab6e-a4e7ab8c6c7a','4c57ad63-77ac-4365-8a05-4480aec48c06','175b8df3-007a-431b-a91a-e01ed8ef2922','4f37f594-d8ff-4122-936a-8df595f9ad7c','105fd3f4-c43b-4c1d-9cb9-3c60c8e9a4c3','a0780b07-1e62-4e70-92f6-ce57f6d9cb13','7f80574a-9252-4859-aca1-c3349428c395','96b60fe7-66d9-40d0-848a-39d0418dd77f','5d59e5f9-d953-4299-9033-f761da3229f9')
   and (f.verification_note like 'pdf-verified 2026-09-08%' or f.verification_note like 'pdf-pass 2026-09-08%');
