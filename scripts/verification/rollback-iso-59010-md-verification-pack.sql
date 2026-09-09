-- Rollback for iso-59010-md-verification-pack.sql (2026-09-09, [VA-OCR] pass).
-- Reverts ONLY rows that pack touched, identified by the verification_note tags
--   'md-verified 2026-09-09%'  (the 50 quoted fields)  and
--   'md-pass 2026-09-09%'      (the 1 app-metadata exempt field),
-- and ONLY for standard ISO-59010, joined through worksheet_templates -> standards.code.
--
-- Prior state per the 2026-09-09 export (scripts/verification/export-fields.mjs ISO-59010): all 51 fields
-- carried verification_status='imported_unverified' with NULL verification_quote, NULL verification_note and
-- NULL verified_at, so the section below returns them to exactly that state.
--
-- ISO-59010 has NO equations in prod (0 rows), so there is no equations section.
-- The pack does not touch public.compliance_requirements, so there is nothing to roll back there either.
-- source_quote is a DIFFERENT column, is not touched by the pack, and is not touched here.
-- NO transaction control statements in this file by design.

-- ---- Section A: fields (51 rows: 50 quoted + 1 exempt) ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-59010'
   and f.id in ('b76337ef-8cf6-442f-ab1e-dde451e3e3ef','10fae041-ef5e-4f62-857c-90c7b5f6953d','1157f2e4-2109-4990-a4c7-c6296a9bb0d8','cde447ec-f534-4a60-922b-87897731de00','c23ee82a-861e-427b-92a9-2cc8efcfb6b9','1d797b75-4fc8-4a1b-8a06-68e8b7c4ddf3','006399e7-4029-46fa-a823-2bdf9bb0fc3a','8e62c6da-5ec1-460e-b48e-eabe014e1fa8','649c532d-7694-4094-820e-11881fafa31c','e56affce-2a53-4368-8cae-3e3686eda121','c5fd5a85-b256-43f4-b2da-5e8f9d431265','a67c8c64-2592-4678-91e7-351e6497b9cb','243dda47-b882-4e47-8261-345e407ad633','5cab4447-5814-4731-a715-fe42e81eeba4','934e36a6-cba4-45e7-b290-309289dc5945','c313e635-6cb2-459a-b735-4bdf4937355b','bfc64e0c-c18d-43e1-8484-783bee8d0aa0','79ed1c19-22d5-4209-9463-500d8c7657a1','a2408657-84cb-49b1-99e7-6164b9d09cae','23051059-67fb-4f4a-8a4c-cb08c803a2de','9613a0f5-67ee-48b6-8bc4-2204c0b5bef7','591f547a-52db-4962-b09c-20b977c44242','45d1cb97-ee2a-4f26-9347-97e772a863c6','d4a83518-0065-4050-9ff9-be135d32b831','22ff0fea-6e41-4f7d-9117-115143e29ad1','895cb205-e9cd-498f-a264-7dfedda53705','1abc8c85-69b4-482b-9248-d05baf6b73d3','647b0e21-aa3c-44ab-b1b5-944b2c0403a4','d50cae27-bbe3-4a97-a697-ddb0cee6644d','0e84e7dc-be78-4fba-97c4-100766eaadc6','c9f3e72b-fba4-44fd-9cae-7ab726bf6af8','6cff7fff-6586-42e8-b6ae-5fc1b47d9ef9','5982a448-d791-452b-8458-3517a20e35d1','20698e1e-344b-4aa7-b45d-52606d8ce566','1fbd291b-f5b3-48fb-89bf-566a93122e88','18f18c4b-b38c-45c8-a5ab-be63eb7954b3','3abade2e-151b-4498-bda3-cc326195479b','d2181237-daf4-4b9f-89b8-0d4e69a2dd31','b407c511-02fa-4a6d-930f-9b47c3fabc61','808e1c49-47af-4262-aebb-8e3ddd910810','13e3aca8-f702-43ce-997a-0baee44ff383','8a776108-7358-492c-a2f5-ca979b3886a5','73111e4c-2c5f-4c5a-b6c5-b7eee158db1c','fbbf9b4e-f676-44df-aa65-7f4ccdac416a','4b9a482c-14c3-476c-ac4f-0ad6eb227862','88291662-09d2-46ad-92e3-dc2105cead90','e0ec4881-5da4-4601-b192-68c59fd656e1','58994603-9d3a-4521-818c-d8db8973a983','6767b276-55be-4cc2-87b7-220333ad23c4','4232be61-4324-4ad6-aef2-a822c6025473','b02ae10a-c7d3-455a-95bb-5152a3d660aa')
   and (f.verification_note like 'md-verified 2026-09-09%' or f.verification_note like 'md-pass 2026-09-09%');
