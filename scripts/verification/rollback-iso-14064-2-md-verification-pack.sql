-- Rollback for iso-14064-2-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows that pack touched (identified by the verification_note tag) and ONLY for standard
-- ISO-14064-2 (joined through worksheet_templates -> standards.code). The prior state was UNIFORM in the
-- 2026-09-05 prod read-back: all 60 active fields verification_status='imported_unverified' with
-- verification_quote, verification_note and verified_at all NULL (60 quoted -> verified_against_standard,
-- 0 app-metadata exempt, 0 residue), so every field returns to imported_unverified and the three evidence
-- columns are nulled again. Section B is a QUOTE BACKFILL only: all 4 equations were already
-- verification_status='verified_against_standard' (that status is NOT touched by the pack and is NOT
-- touched here) with verification_quote / verification_note / verified_at all NULL, so those three are
-- nulled again. Gates were untouched by the pack; the STAGED file was never applied; the encode-time
-- source_quote column is a separate column and stays as it is.
-- Contains ONLY update statements -- no begin/commit/rollback (apply-pack.mjs supplies the transaction).

-- ---- fields: 60 rows -- prior status = imported_unverified, quote/note/verified_at = NULL ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-14064-2'
   and f.id in ('0be5e745-45cd-4889-8165-a16e8b503096','b8f56e65-f050-41f6-bbea-fd9bb9d1ce48','5d7b5288-28aa-44d8-a952-057f17ea99d2','b1117257-52c9-4631-a8b9-d41d6a73d4c9','fd10146f-d3b9-4ac8-8a3c-1b4107f07a51','ce2e386b-faad-4848-97f6-292ab0ff6e45','195df072-72d6-4a1c-873f-95da858d8588','3e421b7a-c5f3-4c83-87f4-64f0cc22396e','1e2e1cb3-a387-405c-ba99-28fb8c4e2418','471e3312-6051-44bd-a01e-764c21c126ac','b9cf42b2-09e2-40a5-83f8-c6840d02e102','0b4ed4bb-ed1c-48d1-b92d-e5391acb1d45','703e4a19-1f8e-4c51-ab75-cafb2fa30c08','c54da5ad-0136-45d7-a33b-605a2b28b45f','25be1e50-81f0-41d9-b151-7cc55187f37f','e57bc9fe-366f-497a-8261-7405dbc9ec85','f7d7c86a-f166-4efa-a920-931a92dcab56','0cfb7a43-4bc7-474e-9901-3f577d058e79','40985960-4aaa-4ba4-92d5-584e405777c1','c80fc153-6520-4bc0-b515-3fd2f7b1b1bf','1e2310e2-8ddd-4c51-905e-56cb6efaee86','bcb82c05-6175-4e12-b85c-4506cb38759d','b0f1bba0-e89e-4b6c-8fc4-ccf4351ffefd','b1754d51-196c-4569-9eaa-fc0e6b26b12f','c255a956-85c7-470c-a2b3-20560568db81','9d79c73c-2582-472c-959d-503e0b49e624','53ac9d35-912f-4ea6-86c6-b696cc63d66f','a2753237-9860-442d-a8b0-9954ca91bf0f','9fb941fa-a115-4e0c-953f-902bdebbf186','ed005e63-f616-426d-8c68-e2b7830ef3ca','144c77b7-25b8-48af-ac41-560b48bb7c36','f8eaa9b4-513b-4fb8-9579-b9c30a514604','0ea16ba7-eb8f-4742-b03a-e270aaf4006b','ecfee535-a569-487b-9bf5-fae3903b790e','9f3b484e-4ef8-4abc-a64f-fd6875bac83f','e0179bf1-36b5-485b-adef-1b5de22ac06c','ecba1225-735a-47c2-9f2e-04b6332eea9a','64adbb96-d183-461e-ac7f-6f881b3c7717','9d41d3d5-1999-4c03-b02f-688f87cce01e','230588d5-cfcb-4d8d-83bf-d7ca9dc92e76','4a507902-964a-47e8-a782-1c82149e6704','21423fdc-d891-46d1-8a8d-a1a3abc352e1','91a79718-8bd0-4b97-bc7a-50704dfec272','d2c403ea-e4a0-4e51-9f67-7e960c877605','1b2e7617-23e7-48c8-8f77-683e4c3599f4','c5cef3ba-4a76-4d32-b9bb-c0a2acb37b43','4d749bfe-3529-4593-b5d9-c4ff2c4f4359','fb080a7d-84b3-4946-b00d-cc069ac12a83','176941ba-3ce9-4641-a058-8e88072fcdf7','281e49f5-6450-4737-be23-c2eea2e6c714','b1d4b8fc-1831-420f-a11a-98a7a90b46bf','be767df5-8c46-40aa-a11e-106b2f06fa38','7b4057c1-59c6-425f-9422-828dd2bf6df7','7ca8f85d-6807-483d-a6fd-41a057339ba1','87e11860-f4fe-489d-9973-497535621460','a166153b-d9c7-4e2e-992d-2c4f3aa1f533','9cbda25b-4827-45a1-bea6-a9a71c2b8891','e4caa604-fa16-431b-9f1a-dd2c4d29cac8','a4f9a065-ce55-4ad3-a273-6b77d5afe620','b0ed9ed0-faf8-493f-b9f9-dd9943e02f9b')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- equations: 4 rows (EQ-01..EQ-04) -- quote backfill only; status stays verified_against_standard ----
update public.equations e set verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'ISO-14064-2'
   and e.id in ('1946f6f0-ee76-4d4f-a0a0-b7240196e734','a6559b54-578c-4ba8-b224-37345a1269fe','a7d36f0e-158e-4ef9-8c48-918ead93fa85','a7244a73-ebd4-481d-a867-5432768cdd70')
   and e.verification_note like '%md-verified 2026-09-05%';
