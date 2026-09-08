-- Rollback for iso-5667-1-md-verification-pack.sql (2026-09-08, VA pass).
-- Reverts ONLY rows that pack touched (identified by the verification_note tag) and ONLY for standard
-- ISO-5667-1, joined through worksheet_templates -> standards.code. Prior state per the 2026-09-08 export:
-- all 51 fields and all 3 equations carried verification_status = 'imported_unverified' with NULL
-- quote/note/verified_at, so both sections return to exactly that state.
-- NO transaction control statements in this file by design.

-- ---- Section A: fields (51 rows) ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-5667-1'
   and f.id in ('7724c1c4-2242-4a64-89e9-105f141249c0','f12dc5d6-5551-4f3c-837f-7837268e908f','e7a3adcc-3931-43a4-84c6-df016b6e387f','c38ba183-3f7a-422a-9fd7-c417237f0ecc','6bf5e8c4-b0d7-4a76-b92f-f0abf0a6416e','6bf32e7e-862b-4267-990e-c804033058a4','4a2d2a4b-044d-4122-8535-5793d9b09e5d','30af289e-c335-472a-80c1-189392080286','fef789e1-ee09-40d3-983b-1c6bd0ac4984','6dccafd3-f475-4092-9fd4-f3200cb01637','b93e6ca4-42d0-4f8a-a9b7-8925f0216d73','2e0f245e-d435-4c53-a0d1-9d4ceb73345b','10ac43b4-e7a3-4eea-9b0a-13e6a8b242c6','bdd960ac-3ffb-4d60-a0e3-e23447af789e','140725fb-18af-478a-8b18-06c9ed1798e9','d1143703-3dcd-4ea8-a7e0-287d246308e3','7d10b346-d88b-45ab-a1a2-86d03eeb3fba','71e8af1f-fc0a-474a-afb5-f65a8e04288f','a378d740-3ada-451d-8b88-0763cd3ec47b','e4d9335e-517a-4a95-9c99-307085ed21af','31905ec3-40d1-4e8d-b5eb-8c67fe753655','6f21cb89-2733-4b8d-902a-b6bd0d0dadc1','5c1227a6-70ae-4fe5-85a9-9ea78eabc7ca','5859b2fd-f803-4b26-90fe-cd9ce2836b74','b147ad8a-2ccc-4c2c-ab1b-80a2d978e3fc','a725d48f-97a3-459a-8783-95568ffd8cc0','a492fed6-eff8-4e5e-b97a-5a73d44c3dca','08fd0d81-54e2-4724-87e9-461d29f92568','f1598372-baf3-46bf-ba8a-0ffcec16df24','61bc94ff-a44d-47a5-a7b8-d9f6b4b33024','b8f1cbeb-120b-4e3e-b459-59f0b45a44d1','44395743-9cd9-4826-a417-0e05d3fa4d76','c68f7e2a-3b50-4281-81a3-83e21f8d5d77','2e37968a-d888-4348-abc8-4b14ad146f90','c6ca0cc7-9395-4a9e-be4d-5f39324954f1','2600e7e4-9e37-47c6-89e7-fb8f4c1518da','c5515a42-d22f-4d89-ac80-5f242e3ef673','bd3aec17-f34a-42be-8c31-c45971377c21','4462894b-4ee4-4b4e-8151-ec3815b6ee31','8e17b978-a178-4fa9-a55e-cd4bdc54ffbd','dd00f03e-8c98-4aa8-b00e-83b3211fd60d','34719e36-a501-472b-9147-0d61f2a36232','85996c78-5550-40e3-a8cb-a1fb033c9a17','91abb053-3ca3-4a3a-a6ad-8913247a6450','79095d10-a410-4520-b1fc-b4abd91142d2','84a546f0-c152-494e-aa11-b8812082d321','19577e9a-1111-489b-826a-854ac6a44d8f','cf9f723b-93ec-4b07-aba2-af03212c513f','b36c030f-2bb5-4697-83e2-586ffb84d0bd','6219d1a8-5c31-4630-9837-404a825126e5','7740ebba-6f5f-469d-b8be-f6023f8bf915')
   and f.verification_note like 'VA-verified 2026-09-08%';

-- ---- Section B: equations (3 rows) ----
update public.equations e set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'ISO-5667-1'
   and e.id in ('d42f576c-c3c7-4e00-bf34-e2da20bf3886','db88161d-3cc3-4541-92bd-4271eba4b0fc','8b5fc076-c947-447c-aa37-7ebbc3a3a81d')
   and e.verification_note like 'VA-verified 2026-09-08%';
