-- Rollback for iso-14002-2-md-verification-pack.sql (run 2026-09-08).
-- Reverts ONLY the rows that pack touched - identified both by an explicit id list AND by the
-- verification_note tag - and ONLY for standard ISO-14002-2, joined through worksheet_templates ->
-- standards.code so no other standard can be reached.
--
-- Prior state captured from the 2026-09-08 prod export (scripts/verification/export-fields.mjs):
--   fields    : all 51 rows verification_status='imported_unverified', with verification_quote,
--               verification_note and verified_at all NULL.  (0 rows were verified before.)
--   equations : none exist for this standard (0 rows) - nothing to revert.
-- So every row returns to exactly that prior state - one uniform prior status, no mixed sections.
--
-- Gates were NOT touched by the pack; the STAGED file was never applied; the encode-time
-- source_quote column is a different column and is left untouched by both files.
-- No transaction-control statements in this file: apply-pack.mjs supplies the transaction and
-- implements --dry-run by discarding it. An inline terminator would turn a dry run into a real apply.

-- ---- fields: 51 rows (49 quoted + 2 metadata exemptions) -- prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-14002-2'
   and f.id in ('3299869c-edba-48d8-8ed3-bce1636f327f','f1e2bba2-435d-4012-818e-fe46b972ba69','8a1c4fc2-8e90-4a0b-819e-4fee795cc3a3','a0074752-0e0c-44e8-8b66-e7e3e0daef0b','52690e16-1945-4639-ba00-c2ac3dc92cb5','a0237e54-e185-46a5-8f56-65761094c8f4','70a659d3-7b93-4b1f-ac14-d5b9f0238c07','991aa116-1f44-4171-9c5b-701836d0e2a1','1ce4935f-e375-40fe-a813-745988beaf62','d2fac053-3d5e-426f-8f34-29ffbee08d35','dbe62742-8693-4b51-b1bf-9053cb020bc5','57a2468d-8f1f-4c99-94f8-8e2c33dfa655','61919831-5678-4c1b-b227-170e3900f3df','469b264f-adca-4e91-b5ff-46f4e17faaae','9fda22fc-6f6f-4230-90c5-39bd11b79b7b','5cf7eba0-fc08-481b-9f07-a2629adcaaa9','610f0619-8f53-4d2c-9a16-fc042a7dd41a','1523510c-247e-4793-9c16-559b5e1ea03a','d9df40ac-1960-4711-b52f-1b339345dcc9','b33db3b4-ba99-42de-a525-fb483598e201','56fd27da-1186-4532-84aa-cb1be75e5da5','0e1c924e-54f9-4078-aaac-fee6943c9976','10b4527c-4bd8-4a9d-b8e5-d121953904a5','c34661ef-c4dd-4d42-a198-4a1d8f55a3ae','a5cb5455-e76c-44e7-b776-c904f034646d','7eb5f61d-4120-4263-ab21-ce0257cc7d65','ded35312-dcaa-4ea8-81e6-7031d35de8eb','b1412e8d-4bc8-41dc-8472-a15703c0de39','3015442a-ad78-4f65-a3e7-675551935918','838c9834-6ae6-4c04-bb0e-a95f3c8d7a9d','50e19d65-5c1c-4728-99f2-304d1352657b','b135ccd4-0214-45b5-a4fe-8dc011b2cca8','f5d4756a-b86f-48fb-b3e8-f49169185d16','a51010fa-5be4-4f72-82c5-c10d9ea42712','d41d8f7c-fce5-483d-9ed6-10c9a3382563','3994a1e1-b18d-4e3d-be40-b4a14fd3dcd6','8fefb242-591f-487e-a428-dd7811f5c918','080a4e77-1a4f-4eb6-b81a-1a0b3dd215f0','e9caf67d-291c-49cc-ad0a-632be5c45bad','8e2eadb0-a2a0-4240-b26b-37c48c84ee0e','4fa26f77-6357-4874-9841-b4d057b510a0','806f1ec4-f710-4875-8971-f71f532325f6','40f7e8df-ffb0-4b2d-8f9c-d70bccc8c347','f2dc0543-9361-4344-84a2-79d733e79ae6','ef49322e-8a40-4313-a37f-2df4f0ccefdb','eb253172-82a4-4ba5-9725-4b359d5175b7','971b835b-f2ea-41f9-925c-c30f7359c231','25b44e31-f51c-4165-8346-a38f71ee8d29','ee514d8e-d867-4f0f-8f1d-3bad963f5751','5d84a8c4-992f-48d5-acc7-d811bd5ea51a','8799b01c-c7ce-4eb6-8f6a-20e683a2dbef')
   and (f.verification_note like 'VA-verified 2026-09-08%' or f.verification_note like 'VA-pass 2026-09-08%');
