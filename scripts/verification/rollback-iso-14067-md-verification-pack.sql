-- Rollback for iso-14067-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows that pack touched (identified by the verification_note tag) and ONLY for standard
-- ISO-14067 (joined through worksheet_templates -> standards.code).
--
-- PRIOR STATE, read back from prod (vadsmshzebefjreqcicl) before the pack was written — it is UNIFORM:
--   fields    : 83 rows, all verification_status='imported_unverified', all 83 active,
--               verification_quote / verification_note / verified_at all NULL (0/0/0).
--   equations :  1 row  verification_status='verified_against_standard'   (EQ-01)
--                6 rows verification_status='verified_via_cross_reference' (EQ-02..EQ-07)
--               verification_quote / verification_note / verified_at all NULL (0/0/0) on all 7.
-- So section A returns every field to imported_unverified with the three evidence columns nulled;
-- section B nulls the three evidence columns on EQ-01 WITHOUT touching its status (the pack did not
-- touch it either — that statement is a quote backfill guarded on "verification_quote is null");
-- section C returns EQ-02..EQ-07 to 'verified_via_cross_reference' and nulls their evidence columns.
--
-- Gates were untouched by the pack; the STAGED file was never applied; the encode-time source_quote
-- column is a separate column and stays exactly as it is.
-- Contains ONLY update statements -- no begin/commit/rollback (apply-pack.mjs supplies the transaction).

-- ---- A. fields: 83 rows -- prior status = imported_unverified, quote/note/verified_at = NULL ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-14067'
   and f.id in ('d17747e6-7c10-4dc0-bd5f-d785a5169381','b0538c21-dea2-4b24-b2ad-b523ece8a695','624c6ca0-d50a-48b1-8b06-091340fd928e','ce847106-8a29-40a1-8203-ed8bcf9d2d54','6f53827f-5a32-4942-ba01-c0224ea95672','5afba56b-b47d-4a3f-8832-f8f29848a63c','f6683964-4c85-4a9a-b2c9-86275bbf4faf','c6b7f2a5-4515-4c9d-b0ad-4eebeafeb054','88d0e621-d3f7-4f31-99ec-0532923485b1','0eb9262b-73e6-4e5e-ac15-20e15db4e5ea','0367c3f0-22f0-453e-bff0-6421750b155f','a7e936fb-02fc-460b-985f-5029f2d97481','0d0d8700-f00d-4a8f-9b94-ce76612055f1','2760c4c5-f553-4209-8ae7-aed9df7b173a','43be2b37-1d46-42f3-bb78-dd9f6caf2486','dc3ccedf-1fc8-4de9-853f-431cf4ebbe12','8731b5c1-1faf-4153-b9df-369af852e879','5a6856bd-727c-4ddc-ad1d-fed25ae60f71','36ae0d16-c956-4ed9-8da2-91906ba89491','ba9aab71-fb05-4a1a-b16a-554370857de6','54acbef0-7afa-41bd-8e63-29a0759c6354','e31b85eb-0799-4dd5-8e8d-e7a32b41f42d','ad808b81-19e4-402f-aeda-b4c766d77886','b0a1c10c-816c-4830-9085-fb4d8acf17ab','29d96c8c-0bbb-4fab-a9b9-8e23b64bbab4','505debb2-6dee-4d0b-834a-74e88e8e0321','c0ad4e0a-4a94-44d2-ba43-f8e48b64d43d','f2c96c47-691d-4590-a104-23f2ca55ad3d','df4dd90e-65f2-4e28-a21e-c58c2f15323f','3f62ebfe-32ef-496a-8af2-2e8b3f6643ee','218bfc20-a4f1-4c12-8d1b-b6c2eaef12e3','69290ec7-72d8-4280-8c58-861942b0def4','b8ab16cf-d36d-4a54-a6cf-0c0b239e694b','21eea4f4-0702-43ba-9710-74d04223ebe2','1d37619d-7345-4440-aeb5-853793f787c0','66840a39-ef80-4798-9e97-0cd21a26ede6','8f01c0e9-187f-420d-9492-9d6fece60367','8a65913b-a883-4400-99a3-e7d1b9675a36','c9a8f300-1066-4e98-83c2-18a7a7c5b2f3','013a15ad-07f2-47bc-9b24-9e1b9a532a53','bcb7e688-2244-4356-b134-b62ad065b346','6827e822-1fc4-475e-a2a3-ea646eeff71b','6e850f60-5fdf-47ac-a176-2d970fd56c51','d42f83b5-b48d-4a70-a2ae-fdced2b7eae1','085127e9-c804-4074-bb4a-8bd783aa9f1c','afd2a2ae-f19d-444d-96d7-694baddf593c','43e4fd27-b63f-4af9-8160-61ad5ae99ccb','856f5660-315e-4801-834f-83913482b0e7','09926923-0436-4c76-b9dc-2a5e70208deb','87cce471-9dc0-4cf2-909b-f8760772a940','abda35f9-a2e1-426b-b3bf-a04a6878a32f','d87c9fa9-1105-4acd-bb34-4db66ccc54c5','0d5b6655-6fee-49ab-a5ad-1889b2699d94','9df3ef67-f91d-4b00-b94e-a5fcebef280b','51ca6f75-3245-4a0b-9000-fd5f0ffc3448','a7b96010-4f61-4cea-84e9-5e8a17a05ab0','41a53794-d939-4dcc-8c52-7af5d6182199','6c79cb8d-f0bb-4b31-a8f0-a4123efec794','bf089da0-788d-418b-9159-eb7f9a418128','ad5e4ce5-7694-4d32-a96b-f74b1f3640f3','d6eefbe4-217d-41b2-94b7-a8dbbd1418ef','9b96f76f-8231-4b6b-9a72-a9336b98cee3','b46c9e2b-ecfa-463d-9acd-ea2b31ac089d','94e18815-59d1-4a2d-9299-c8c4f17f5532','c81cff53-6636-4849-a316-94b57732250e','e19cf2e9-2e64-40d8-9827-46d8ba0f08cc','648db44d-8bbb-42f0-b962-5f61e8cb19db','b3be6a33-5961-481c-94b2-37025142c1fc','3b0334e5-8a25-40d3-9c50-10f5fe289c17','5cf86e2e-0d02-41be-9b14-08662ffc6877','a4a3eaa2-44df-46f0-9aa3-b15078868662','ce5137ee-a957-4a17-9ace-2b0c739d983a','f8ff3964-20b8-470a-a7fa-077478049716','0e2a58cc-fc0b-4780-b4bb-d2fe00cf2189','50474f1b-1b1b-4ff6-8ef1-955b85b6edcb','9b733260-0966-4db6-8822-1c5ddc9200e1','db5c577a-08ae-4e44-b463-2632f26009a6','1494d607-f460-4e09-80d4-87a5a2461b7a','3d869db7-dc86-453a-9eb8-cebaa2be67bf','e558c04f-9514-4a5b-bb2e-540693a23617','926a7fec-d5af-4595-91b0-a8616392a6df','5d23d399-f3d9-480e-a7a1-ce4b169b6cd0','448f65f3-4130-4566-aeca-573f524fce15')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- B. equation EQ-01: 1 row -- quote backfill only; status stays verified_against_standard ----
update public.equations e set verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'ISO-14067'
   and e.id in ('df04c31f-0ea5-4551-b898-f9c16e439e53')
   and e.verification_note like '%md-verified 2026-09-05%';

-- ---- C. equations EQ-02..EQ-07: 6 rows -- prior status = verified_via_cross_reference ----
update public.equations e set verification_status='verified_via_cross_reference', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'ISO-14067'
   and e.id in ('fab85edf-e745-49fc-a308-de4ed8cd07a0','450ece72-5b56-48d0-90c6-75e19d0ae0f6','8195c5e7-6782-4a4d-9821-1b711385a9bc','a07bd085-706c-4641-a6fb-85611d98ae1f','f369ed15-f791-4753-9d08-053806b55289','59c28418-d4a8-4ff5-bbfb-6029cb6c7024')
   and e.verification_note like 'md-verified 2026-09-05%';
