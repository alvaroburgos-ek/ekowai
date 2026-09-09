-- Rollback for iso-5667-16-md-verification-pack.sql (2026-09-09, [VA-OCR] pass).
-- Reverts ONLY rows that pack touched (identified by the verification_note tag 'md-verified 2026-09-09%')
-- and ONLY for standard ISO-5667-16, joined through worksheet_templates -> standards.code.
-- Prior state per the 2026-09-09 export (scripts/verification/export-fields.mjs ISO-5667-16): all 60 fields and
-- both equations carried verification_status='imported_unverified' with NULL verification_quote, NULL
-- verification_note and NULL verified_at, so both sections return to exactly that state.
-- NOTE: both equations DO carry a non-null source_quote, and 3 of the 35 gates carry a non-null source_quote.
-- source_quote is a DIFFERENT column, is not touched by the pack, and is not touched here.
-- NO transaction control statements in this file by design.

-- ---- Section A: fields (60 rows) ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-5667-16'
   and f.id in ('83ab9a11-ef46-450a-b243-b154e36fbfc5','8317a7e8-3693-4b75-8d0e-6a60b86cc412','14663224-b0b7-4387-8680-7bb01d19507d','6bcf35d6-d45a-42ba-ace9-45e34ff82f6a','7dc9d434-68c7-489a-ae27-4e3a1774dbba','364e24b4-8528-4ef3-8e7e-fd468b257dea','a9069940-0fa4-4d79-8275-459da85144f3','bbbb0b91-41f2-4f1b-9b40-eb514891a1f2','ffc25b0c-3ff6-4247-9939-fbf3b8bbeb8f','34deb03d-1fb1-4b78-adf9-272b01d3d4e9','b0964036-794d-4334-beac-2c9c78a5a453','75ffdf19-daa7-47a0-8277-f9c1c4c27e39','7adb6e48-1a5c-48ba-9b76-85fe622f6ee5','a11b1873-a058-45b7-972c-8049316a25ae','fd9711d0-5f14-4b6c-9351-d09ce3b72137','9660faa1-930c-40c0-9650-f8a930a97474','9db58735-7973-446c-979d-c4124efdf658','42c7ae1f-7eb3-4921-93a0-c851fa4b6856','185cd2ae-b3b2-4aaf-aabe-921957d6bbd8','dd50f3cb-4045-4bc8-975a-8c330e99f560','20a61af8-5e00-4173-8fcc-b0df3ab9976d','107f0547-c8fd-45e6-9a4e-cb4c5908893a','e4281f85-4c29-4efa-a408-9300e0a5ccbe','52f9674a-0acf-440a-bbdd-fc554646ae28','da2b08c9-45f6-47cf-9c9d-c5887e1642e2','ccc5a1ee-5d6d-4085-bdf7-c5f239d9e54c','be1006d1-87e8-40f1-8c64-4bcdb2b9b295','0fe6c729-bfd5-42d6-aa0a-5981125466bf','1a791638-3d22-469f-8060-8c9a0d40eabc','d33904e3-676a-4a9f-ab2a-275f5af96052','386a421f-902a-4104-9b44-22bbe5f04597','03e7c376-6082-4469-acc6-89286a73ef4f','f310c94b-3757-4ad3-a1eb-84e7ad63ae42','700e7bbc-8e1b-46a7-b477-947950b00cd6','083f3135-3cae-4706-b68c-2b68152a32bc','cce40788-7f3f-4d0f-9c38-ebad10ccba91','f8ba1635-724a-42a4-a737-afc32ccc7433','72775c82-58f5-4e26-ae86-b9851184a1f2','290955c6-1520-4253-970d-8b9e15c23f7a','29648137-ca84-43f8-ab26-c1267c82f05c','6d6cf383-a286-407c-94b4-07d97d653f43','9b4ab469-d840-457e-bf0c-8c4dd41ebd52','f50c1af9-57f6-4bc9-8861-508dd0e24a0e','6665e5e9-8f1b-4f17-8995-e89bd59f55b1','821cf78f-9854-40fa-b15b-dccf45ff0b3a','83ae92f2-5062-4be5-a0e7-24cfcfd9ccb5','75ef37a8-5c17-4ab3-ac09-1a422b2431c8','d726926a-378a-4f0b-8cea-79f604be3af0','fd16ecaf-14cf-4f18-96aa-bae652989651','ef00644a-a77e-4652-89c6-f663ec051ac3','c9c6e49b-7ccd-4d7c-8f5b-522301ae973e','76a0aff5-8d3b-4625-9210-10e35f9e60bf','af4203e2-6412-42ec-aa96-c22bf9123bd6','59254f41-f566-4d94-a870-fdeaf1af755f','5c5d023b-5033-4722-b7ff-d107f6e3da16','d9e3b46d-392a-4010-acf0-38b8c33bc67f','d1b82ef4-3d1f-4919-a3a5-bff88587adcd','93ce404a-4ac8-4a93-9d92-9b5a2bb5f176','df09997d-4094-44cb-b40f-35d6b6d1cbac','c7c34406-a8a1-4550-b6a7-59f2dbe035ed')
   and f.verification_note like 'md-verified 2026-09-09%';

-- ---- Section B: equations (2 rows) ----
update public.equations e set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'ISO-5667-16'
   and e.id in ('786bb31e-ba90-4513-a97a-20af1deac310','415979e4-9949-4a6e-a54f-3b5da5e16fa9')
   and e.verification_note like 'md-verified 2026-09-09%';
