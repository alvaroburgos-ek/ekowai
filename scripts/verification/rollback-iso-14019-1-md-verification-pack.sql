-- Rollback for iso-14019-1-md-verification-pack.sql (run 2026-09-08).
-- Reverts ONLY the rows that pack touched - identified both by an explicit id list AND by the
-- verification_note tag - and ONLY for standard ISO-14019-1, joined through worksheet_templates ->
-- standards.code so no other standard can be reached.
--
-- Prior state captured from the 2026-09-08 prod export (scripts/verification/export-fields.mjs):
--   fields    : all 70 rows verification_status='imported_unverified', with verification_quote,
--               verification_note and verified_at all NULL.
--   equations : none exist for this standard (0 rows) - nothing to revert.
-- So every row returns to exactly that prior state - one uniform prior status, no mixed sections.
--
-- Gates were NOT touched by the pack; the STAGED file was never applied; the encode-time
-- source_quote column is a different column and is left untouched by both files.
-- No transaction-control statements in this file: apply-pack.mjs supplies the transaction and
-- implements --dry-run by discarding it. An inline terminator would turn a dry run into a real apply.

-- ---- fields: 70 rows (69 quoted + 1 metadata exemption) -- prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-14019-1'
   and f.id in ('912ec99a-5c15-44ac-a2ef-eaadb5818266','4f68850d-c424-4036-aeb2-7554aa795e35','650384ee-0b9a-4a7b-9b49-e9a227eeaeb6','f0d15204-c7a1-457d-8aba-116d52a2495c','0c9cd1c8-4f7d-487b-8473-c7007dd0ecde','585ab8e5-a223-456e-baa7-617fad748845','1097928c-e18e-4d86-9e17-63a3f5aa1a42','64f33cd9-d6b9-4586-89c1-358b2086e830','6857be01-2c13-4ad8-be72-ed083e35fd2b','26d7bbdd-d6d1-413c-82d3-0767014820ae','4b733e06-c701-4efb-922f-62a849c8639c','ce1f76f2-beb3-4b16-a3a6-a1dae2ed2bc3','7212f992-5881-4839-b505-e7e952d73c94','b0b39d00-76b6-4a62-886f-673b853f9935','7fed1a24-8520-49f6-80ee-a77f816ce582','9c169e74-52ce-4af7-9e82-7285bfe22cdb','3b9dfe1f-ea35-40fc-be34-3e5f47aa1ec1','fe4f018b-66c9-4e57-8cca-40e65d9e93fd','2d6ed912-556f-4d7c-ad9d-f5f2f762336a','d7a1f0ed-5ced-4a4e-a288-0f153b9ba8ec','c527f894-4cb1-4083-b311-99130b7faa2f','5cd5b766-b2b7-4d57-b1b3-7adc33b789da','47888f16-ebb0-4793-9500-cd423cabbe2d','180df9cc-a9aa-4e19-968e-b7c1ce8cd250','226e56ae-371e-4ec4-861e-3af4b2939cf7','e2c49504-7e70-4c00-8be3-0517a76b5e35','76e5d475-93e4-4427-a029-4a7ac0991bd6','eecd52e2-c8e3-4e13-b236-044daf75b155','f92a99ee-da48-45b1-88b0-f986a0110fd0','0972f1f3-70a1-4135-a65b-b19d8492a351','6a68ad6c-9674-4ff6-aeda-92d5f535e89d','f1ccd7a8-6640-43db-b009-755dba3762e3','611af43e-c24a-44c5-9739-23d1e894f724','bc943800-537f-44e4-a02f-536f7753a69d','f978667d-2c8f-4602-914f-6cbaad4a10b2','ef03fb3a-ff06-48e5-98cc-fb5516ab9bf9','038301cb-cee6-407b-93ac-f302fe5f4b4d','eaca8d48-49e7-4e14-a2e9-56b1b87a411d','79080d11-6bca-4306-8857-9bf4e1ef7caf','60afa6a2-c5f3-41c3-a2a5-c4cd7265e47f','b59ba04d-dd29-4ca7-ab17-b7429044abd1','dc80868c-3857-46f2-bb23-ea8e1f9d8b57','1964e1a8-06ca-4133-9fcc-813d5d5a94bd','d82fa261-5c03-40b3-8caf-f59fec96f831','44825e59-13fd-477c-8114-1e41c3fca8ed','3208a760-9b9c-4eb3-80a2-014f7c405f4d','c4bc518b-a7f5-4ea8-8c1c-5199ab40ca9a','7904fdb3-d7b5-4e2f-842e-039888f5eec7','4fecff56-a877-409a-84b2-86260a0f8166','5c9fbcd5-cab5-4efb-bba4-256c34074bc8','3246dc63-6b73-4e08-a15b-028c93c1a743','fc52a902-15c7-4ae5-a0ba-ad3f0d010431','e2ce8caf-3ef6-4106-86c8-6f065210c126','d302c48d-9a64-47a3-920a-5ceacef8ca80','e58f6115-e126-4171-aa03-e406ed1430f2','668ca7ca-7a6b-4237-80bf-74e46779aa48','2f06f214-9ea3-4c02-93e0-2aff54f10bb4','7f02a5a3-c1d0-4c62-b65c-81557285622c','1c7df519-3c96-410c-a5aa-cc0e293c6f67','b523aa76-672c-4d24-8e2a-c53b6269ebaa','a00b872a-a14a-4af2-ad0f-3f63b57d94ff','066b4a85-ff98-4bb0-9e0c-19fd274b70eb','27093697-899e-4310-bf8c-d28c1cd0c1cf','7b1fe234-cd29-4061-b846-383b0688b8ae','21f56704-d0f6-464f-8280-01214aa9a870','32072cbc-6362-4a11-afd0-7ae25d45e875','79391a77-cd3b-4726-b820-41c523d3f182','b59e8edb-f865-4192-bef2-33a02cd43c1d','119305ce-c3c5-402e-8672-31d5732cf531','d4bd93a2-e254-4cc2-b8db-4829e3254c48')
   and (f.verification_note like 'VA-verified 2026-09-08%' or f.verification_note like 'VA-pass 2026-09-08%');
