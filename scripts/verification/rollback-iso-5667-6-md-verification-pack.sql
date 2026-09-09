-- Rollback for iso-5667-6-md-verification-pack.sql (2026-09-09, [VA] pass).
-- Reverts ONLY rows that pack touched (identified by the verification_note tag 'md-verified 2026-09-09%')
-- and ONLY for standard ISO-5667-6, joined through worksheet_templates -> standards.code.
-- Prior state per the 2026-09-09 export (scripts/verification/export-fields.mjs ISO-5667-6): all 76 fields and
-- both equations carried verification_status='imported_unverified' with NULL verification_quote, NULL
-- verification_note and NULL verified_at, so every row returns to exactly that state.
-- NOTE: both equations DO carry a non-null source_quote, and 8 of the 30 gates carry a non-null source_quote.
-- source_quote is a DIFFERENT column, is not touched by the pack, and is not touched here.
-- Equation A.1 (1ba62e5b-4490-4071-95e4-706d57bf2593) is NOT in the pack and is NOT listed here.
-- NO transaction control statements in this file by design.

-- ---- Section A: fields (76 rows) ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'ISO-5667-6'
   and f.id in ('dc3f2e22-092d-45a8-98ef-dbe196720e1f','f9cdb9b8-c119-49f8-bcd1-d4dbe5beb8fd','6ac8c9ec-e07b-4a5a-b8ca-0e030af1b1db','cc8bd60a-e3ee-4bb5-84f8-7cb783909cfd','ab7331cb-768f-4fbc-a620-0e0278787a42','0f718fb0-4a86-479a-8077-847169430ee2','18a587e0-bc06-4ec7-b7af-0b0601915f1e','fb30d7ce-6d86-4ca8-b473-b35e716dd5ac','c4c01fcc-5646-4b83-a572-f5cb6f24f0de','a1d49d54-da09-4597-8d83-05da42c1e3ff','a6a76b4b-7057-4e24-8dae-eead6d1e36e1','3e6db79d-37c2-438c-8e7a-ef33fef739b4','c3af776c-69d0-4103-9671-c72302089db1','c24da9a7-5d50-4d79-8fb9-3bb66eec84e2','283c1f5a-7a10-413a-bac0-4b34543c8f41','aceafeed-86f7-401f-a6e2-369186c2da2c','6f5a169b-6f69-423d-a408-0dc14a59a7e0','206ebc83-8689-47d5-9f1d-f79beeddb33e','220c5dd9-68b4-48fb-8a15-cdb26097fc94','578291da-eebc-4819-a26b-11bd63686828','7be09e28-cd2f-44a6-b037-83a093271cb0','850878c4-2676-4e56-b51d-bc8f971d7a60','500d71c2-6639-4012-aef7-50a5799af1bc','c1067a77-998b-43e6-a52a-ae1370a22396','f6c98760-e60f-450e-9381-e91a80602147','4c2cb4da-f15b-4390-9dd6-cc862b3f9ff4','3681f3df-b4a3-417b-bf2c-2c68dc3e206b','c5e82d5d-a5c5-4dd3-8c0e-3a74e495f71d','38adf693-d4dd-4a64-ae4c-418d47d5149e','0d7ce671-061c-4eca-8705-ed234efb3b69','f0e6c458-b4e5-4cad-92e1-a441036b031d','1df385b0-9f90-44b0-97c7-3e9c514685dd','6207e3f3-29b8-425a-819b-9fcc73bde052','0542c16a-e322-4903-9009-8c23590979bd','4b02c8a0-d6d0-4283-8ff9-09cb2861a7fd','e4987062-65c4-4fa0-8fda-2e574bd6952f','3df8710b-9116-45c6-944b-bb850acab0a2','14030e31-9532-46bc-bb51-5fe2c206e25d','bd3e0ab5-b323-426e-8f18-23394c7f2e4c','a2f01b0e-6230-4591-a234-d364803579fd','45813080-6843-490a-a766-74425a908dbf','fa45871c-b23e-4a88-bbfd-92ca49e08474','57cab2e1-77d8-4259-81b1-b08c72b1055a','097c7f4e-b0c3-4c98-b6e1-ee0f26ddf057','694593a2-278b-4a22-a291-4d4a5843de14','7b8089e8-2fc6-4e77-ae6b-55a5a3c7fc73','c674419b-2aaa-46bc-80e2-92a61c457aae','607cb886-c2a3-4ff0-a4c1-1dc9b8afe7e8','9dab3160-7120-42b2-bce2-3b094aaf5fb1','fd8539e9-285d-4ed1-a800-ce229bccf5a3','f563e4f1-5778-49f9-8618-ef6f853488c9','94d9543f-eec2-41d1-9f00-76d3c6996acb','34533e99-4545-4003-82a3-fec8c76e3268','d4ed8f7a-35dd-41c6-bf70-2d4359cff984','daf237cf-25bc-4564-9d4a-ada051347aae','15b25ce6-191a-41db-a87c-92409ae96cb5','c2cfcfe3-4c33-4cb1-80f7-b63e661bbc26','233ce0dd-2c3f-4414-bd2e-389f4cfc77d1','0e57a443-5a2d-4067-b203-f044615e5112','c3ef8e9f-a821-40fb-9749-ad429622bd6c','012db388-9209-4639-b18c-25ef634765e4','92dc9f7f-bfd2-4af3-8962-985d703ef800','b4637879-fdbf-40aa-8a81-b4d172667e62','c6ddb694-266e-47a9-afaa-b02028f85306','2dfc3e21-86ea-44ac-bb78-d4fc6d4e498f','2cc09441-767e-4944-8a70-a6848f59cd76','0cc66d07-944c-441f-94c9-14743789083d','4bb801cb-4760-4981-87ad-34923d2fe30d','ccaae552-bbf0-4c7e-8e1f-4fc2c0effaac','62384ede-3a98-4e0c-acc7-824604964d8b','e44ca59f-dc25-48f7-aad7-6ff68c0a3cf9','b33c24f3-c597-4c39-9b32-7d63e659efdb','d3e1e28c-7505-4d76-85d8-205ae9e60990','8faf0f0e-ece4-4e88-8cc9-2d586fe87e5a','7aee7b04-7082-497b-9f8b-d013783a5ed1','5736cc48-a8f5-48bf-8b26-c282ff7289b2')
   and f.verification_note like 'md-verified 2026-09-09%';

-- ---- Section B: equations (1 row) ----
update public.equations e set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'ISO-5667-6'
   and e.id in ('7e099928-b002-453a-9109-e620c5091337')
   and e.verification_note like 'md-verified 2026-09-09%';
