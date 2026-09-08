-- Rollback for iso-14033-md-verification-pack.sql (run 2026-09-08).
-- Reverts ONLY the rows that pack touched - identified both by an explicit id list AND by the
-- verification_note tag - and ONLY for standard ISO-14033, joined through worksheet_templates ->
-- standards.code so no other standard can be reached.
--
-- Prior state captured from the 2026-09-08 prod export (scripts/verification/export-fields.mjs,
-- read-only transaction):
--   fields    : all 48 rows verification_status='imported_unverified', with verification_quote,
--               verification_note and verified_at all NULL.  (0 rows were verified before.)
--   equations : 1 row exists (equation_number '1'), verification_status='imported_unverified'.
--               The pack did NOT touch it (it is residue - the standard prints no formula), so
--               there is nothing to revert for equations.
-- So every row the pack touched returns to exactly that prior state - one uniform prior status,
-- no mixed sections.
--
-- The 46 ids below are exactly the ids the pack updates; the two fields the pack leaves alone
-- (emission_removal_factor, verification_validation_external) are deliberately absent from this
-- list, so this rollback cannot disturb them either.
--
-- Gates were NOT touched by the pack; the STAGED file was never applied; the encode-time
-- source_quote column is a different column and is left untouched by both files.
-- No transaction-control statements in this file: apply-pack.mjs supplies the transaction and
-- implements --dry-run by discarding it. An inline terminator would turn a dry run into a real apply.

-- ---- fields: 46 rows (46 quoted, 0 metadata exemptions) -- prior status = imported_unverified ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-14033'
   and f.id in ('582e8033-0b01-408b-9b91-51b97d9c2579','a5b3ab2f-574b-4758-b326-3a57398aa9ee','64949c93-b258-43d4-8995-a08580e00bf0','004897c8-c194-48ef-93f6-619b9606a85f','4913fe80-d62b-45da-9446-f5a7334a3fc0','3cd74506-2fd1-4426-86d5-8d4cc5a0e3d3','37575fea-b25d-48a6-822a-28939cc68df6','61f4af4a-abab-44be-995a-062698d6feb4','2891ed48-1f1d-4855-b2c4-543608e940a0','527752d5-0ca1-421a-bf7a-0f827c3b4e7c','8140edc5-bb55-45c1-8add-1fa0ab409b99','0c782d8b-cc19-49d6-ac65-fd51afac2c31','ce8dd2b0-d111-4ffe-856f-3b8042563574','79f95dc1-318e-4947-925d-c211bb83fe03','ded64461-1bba-4f8f-afe5-a1c5293d2b61','f33d0d8a-78e5-45a4-bcf9-336e007e04a3','2a182072-ff55-44bc-8a59-c2bb7c9a8f00','1d0a2026-2f0a-4750-b484-030633d92be1','33b143c1-0012-420d-9a3e-39e0b2bb9841','ecbe801b-e0d1-4174-b1f5-cef97a27a805','8b987f67-194f-4ec4-9739-a3864dc8f42a','2b792c3f-c827-4919-8b7a-561f2e843ff5','265d0e94-3bf9-4c13-9488-809eebb9146d','e94a327c-903f-4b9a-8ee2-0db0ad4afe1c','5e5ab2a0-d697-45d7-9c41-bc68bc93e41d','6e1889e1-5f1a-4cf2-8944-04a946eae917','d765e0a7-4af1-4f01-9591-38aacfef90d9','cfb37fa1-d38b-4330-8d31-569c338bd525','9c7d5409-7094-403f-b7c0-fce33ba14dcc','628551de-5457-4c07-9f24-6cfbe7e38362','d243ad4a-0c26-4758-96ff-27ce7ffd1cc2','30db39c0-9cdb-44ae-8a6e-de77b28bbd15','d69249f4-339a-43e2-9bc9-88e42c5eb1b2','6867a2e7-667f-4676-8fb4-081978b29cee','3cb4ec1f-8c4b-45a6-bd8c-2a4c54f62679','7feb5ba3-7940-44b3-8e0c-27ee55a73df3','9de767c8-dce2-4a4e-a37a-786da3a86054','4de671bd-592d-4674-a9ad-fc831b5be4a6','be9d1cb6-26ff-4ed3-af52-cb43d2045b6e','752392c9-5f17-48ed-9d0c-547c3b93e6f5','2837cabc-4420-4996-8516-f338bc19ba7d','3309ac69-5bce-44a1-bbdf-fa68c03b6dcf','3c69e5df-be4a-4834-9676-f6505e60f91c','abb0f851-a085-4253-af62-7d81a056df32','02c86d30-cc3b-41f1-9d71-425430d77369','9d561b26-9c7d-4109-a4fd-00515f53d697')
   and (f.verification_note like 'VA-verified 2026-09-08%' or f.verification_note like 'VA-pass 2026-09-08%');
