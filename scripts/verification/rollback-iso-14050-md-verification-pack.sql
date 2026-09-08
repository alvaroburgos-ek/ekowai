-- Rollback for iso-14050-md-verification-pack.sql (2026-09-08, VA pass).
-- Reverts ONLY the rows that pack touched (identified by the verification_note tag) and ONLY for
-- standard ISO-14050 (joined through worksheet_templates -> standards.code).
--
-- PRIOR STATE, read back from prod (vadsmshzebefjreqcicl) before the pack was written — UNIFORM:
--   fields    : 25 rows, all verification_status='imported_unverified', all 25 active,
--               verification_quote / verification_note / verified_at all NULL (0/0/0).
--   equations :  0 rows (ISO 14050 contains no formula — zero "=" characters in the whole
--               81-page text layer), so there is no equation section in this rollback.
--   gates     :  6 rows, untouched by the pack (all six carry condition = '' and severity 'warn';
--               proposals for them live unapplied in iso-14050-STAGED-rulings.sql).
-- So section A returns every field to imported_unverified with the three evidence columns nulled.
-- The encode-time source_quote column is a SEPARATE column and stays exactly as it is.
-- Contains ONLY update statements -- no begin/commit/rollback (apply-pack.mjs supplies the transaction).

-- ---- A. fields: 25 rows -- prior status = imported_unverified, quote/note/verified_at = NULL ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-14050'
   and f.id in ('6cb078fe-697c-4f37-8d5f-114cff07e8e9','b7645e00-c055-45f7-b367-a3f08b1be5e6','6dd8e361-cdf1-40e1-974a-b3ca07e734eb','29166771-3495-4b9b-8a50-57faa4849b63','08ed965c-c461-419f-abab-cce5a857ea7e','50d5ba20-f736-4cfc-9444-e8327644657d','7e8165c7-2f33-4c11-b612-5fd695515c4c','b890853e-fa12-441a-99cc-e4a9e10acfa0','97e4b530-07d8-4158-9dcd-d98ca9be1bf4','77527d6b-1ade-4da4-8ab7-55e6c280a9ee','9b9b9bae-9db3-4c79-893c-a2f21f593790','757b07ed-48ae-4ac2-936b-95630022bfdd','e4536264-fe7f-401b-a774-fc0f589fdb8e','a4328313-b1ab-4d06-baae-94a3632cd492','43b307a4-0c9e-401e-a1c6-acf575668cb8','b8f1e765-ff5f-416c-b582-0c1aec3f12b4','e131b4af-7e87-44e6-85ac-a544f07a544c','16bfd01b-94bf-4348-b179-a4d273dfa708','04b550df-9c1e-44fc-80a5-f028c6c2554c','a39d52cb-3881-47b3-bab9-da8f13f59963','0832994c-2e17-4b79-8799-9e44952a7c8b','60c08559-954f-402f-8b9c-dfa01a46465c','2a14c93c-b895-4da2-b04b-f8a9478c02bf','334d5e4b-c596-44f9-824a-0b2731fc52b7','090b4eb5-f715-4ebb-9f18-dc26a4ba37f5')
   and f.verification_note like 'VA-verified 2026-09-08%';
