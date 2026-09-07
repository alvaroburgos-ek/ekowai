-- Rollback for dwa-a-201-md-verification-pack.sql (DWA-A-201 only).
-- Reverts the fields/equations this pack touched, identified by the pack's own verification_note stamps
-- ('md-verified 2026-09-05%' / 'md-pass 2026-09-05%'), scoped to DWA-A-201 through worksheet_templates -> standards.code.
-- Pre-pass field statuses were MIXED (needs_engineer_review / imported_unverified / derived_from_structural_mapping),
-- so each class is restored separately by explicit id list. Equations were all 'needs_engineer_review'.

-- NO begin/commit here on purpose: apply-pack.mjs already wraps the file in one transaction, and an
-- inline commit would end that transaction and defeat --dry-run.

update public.fields f
set verification_status='needs_engineer_review', verification_quote=null, verification_note=null, verified_at=null
from public.worksheet_templates wt, public.standards s
where f.worksheet_template_id = wt.id and wt.standard_id = s.id and s.code = 'DWA-A-201'
  and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%')
  and f.id in (
    '5a5627f7-860c-4ad4-bb28-d24c08bc82d1',
    'a8bdf156-b1ad-4781-bdfc-22113e05355d',
    '2b44aa66-9321-487d-92c8-47333ebb327e',
    '07d97e25-a76b-40ad-937b-df1b5ca02513',
    '539d905d-bf9f-4708-8103-3377f96a3664',
    'd3dce1fb-65a2-4c6f-83ec-84a221812394',
    '50d2303e-3414-488f-9b15-70f6b3f78da1',
    '91bc07fc-8af8-459d-9b96-bddb18be9b68',
    '5c4a64f3-6543-43b6-8a37-bc511ab7c11e',
    'aafedabf-3ad6-4a0d-a315-983178683fb4',
    '9942cc6d-a714-41d3-b867-0e6428dd9aa0',
    'fc553b4c-aebb-466d-8d66-43e7b793be21',
    'd2d36272-9a37-4f3f-9402-521416c045c9',
    'e96e5aed-cded-4708-beef-6a6bacbd7679',
    '0de73799-fd85-4dcb-b454-1dc984586bbd',
    'dbd901e8-23a8-450d-8900-5b8953e00f15',
    'b91265dd-4080-47eb-9a4c-f052829a8ee3',
    '049af922-5144-4a28-b4f1-5538fd0a6d97',
    'c2324018-c2a9-4579-b49b-3b15a786c1f1',
    'caede26b-597d-4664-a3ab-c279a0403dd2',
    '7ec4d3e1-38eb-4459-9091-c5f087413fd7',
    '68241712-ff73-4788-9237-bd61a0003357',
    'e481617f-246b-41d4-8a8c-de0d65e0d859',
    '7528851f-4916-4c15-8df1-23ab4b1d06b3',
    '0bcdfa66-c016-4413-b00f-6b9ab371f0c7',
    '900f2403-f4cf-436b-9fc4-8dc6c085b8ab',
    '93ce16b9-ddf1-48cd-aa28-d6dfde3f15bf',
    'a62575f7-db72-49df-a6ac-b15fcebdb63b',
    '517a3273-5972-4081-83c0-fc691a00b31e',
    '5605eb1d-bcc4-4e1a-8684-1d00e1aadb3d',
    'd8110db0-6a07-4dcf-98fe-c613c4377d73',
    '7eaf63e3-a259-4541-a9e4-4d6e7b95549a',
    '8e0b7883-2d7e-4669-bb54-f4b8c0c3929c',
    '43668c43-4b8c-465c-9e36-968cefc80fff',
    '55d36339-5b12-4061-af0a-338547d5d53c',
    'ed362ed4-b254-4343-a8ed-a0edb003d039',
    '62ecb7ba-ce30-4d5e-971e-8bc0c356430b',
    '9db070ca-3bf9-427b-b785-c42afe6430aa',
    '744ff124-89e0-4b69-ae4a-6d347f3212d2',
    '969bde77-b483-445b-a2d3-aea31c829eed',
    'e6d09499-240a-4168-9fbf-df57952782b3',
    'f7575a46-d203-4461-b5fa-5ad0c6e1c37e',
    '1b164b93-8e89-41ac-8a5c-58451e201386',
    '03b84407-fb47-47b4-9dc1-35a7cd654e37',
    'b55597d6-0270-4331-b00d-da0a39a2683f',
    '0d68ea7f-9d55-4cc1-b640-2585d3e8d52f',
    'c0f435e7-5d9d-4c29-8abd-7d7842c199f2',
    '6b565c74-a52c-42cf-99c4-c24dfc581b6a',
    'a315dd8b-dc20-4a5a-80b8-70f43a2d543a',
    '0664353a-c29a-442e-be2e-7b774449b0f7',
    '4ceb45f1-a6dc-4e68-a8ce-90516140b132',
    '068499be-afe8-4835-bd8d-4c3a563fc86b',
    'cb78a07c-c637-4d9e-989b-59052aeb69bf',
    '1fd86fd3-2c4e-4f22-9a39-7631ba520c84',
    'b2a4709f-f8cd-4efb-aaa2-6e20ef67a68d',
    '1c82b714-e4e4-4527-8685-ad809b2e3ab7',
    '72b6a4dd-3072-4616-8d43-a83ecb4428bf',
    '9a947c0d-a268-4225-b9f2-0f16e79c2fdd',
    '3ec0ca4a-899f-4f75-882e-7b840f658572',
    '7fcf5d90-eb59-49a6-89b1-b456b3205b4c',
    '611a930e-841a-42cf-9a46-7d6f048253a6',
    '05efd245-068a-4fc5-a5e6-0cc5ee5716d8',
    'fea742b6-d0d2-4247-95e6-ed76f4e04e9c'
  );

update public.fields f
set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
from public.worksheet_templates wt, public.standards s
where f.worksheet_template_id = wt.id and wt.standard_id = s.id and s.code = 'DWA-A-201'
  and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%')
  and f.id in (
    '3a22a6ca-1bb4-4a74-995b-8b811aca0bbf',
    'ca29cd92-4d3e-4ceb-9319-03706b1d26bd',
    '732d5e7e-8ef8-4a43-ae92-f2af755412ea',
    '7e2fc2b2-828d-4d77-aab7-ea16dfd5197f',
    '855b35bd-47ff-4372-b4e3-46ad4df51bc4',
    '85cc371e-4c5d-48ca-a14c-8e120019b040',
    'a5157fff-7184-4bea-a10b-a6f8ea3cfb59',
    'e73f3730-316b-4974-8880-e2e551da400a',
    'b5b9e7d5-8e37-49a3-9c98-4b1aef2a5f0b',
    '7288af1c-2541-437e-94b2-afb2a13d5d06',
    '31489783-3256-4859-a15a-3a996b308750',
    '6d12bc00-c8c5-424a-ab25-ee0b04706967',
    '19ce0c0d-2823-4663-83a1-5f36566e8d95',
    'ee3e4da2-993e-4e93-ae22-c5e9424ba147',
    'dd9fce85-7ddf-4011-80cc-5b55605393e2',
    '9abade19-4f2e-465e-adc2-e74090cc85f2',
    '9e22bcdf-d003-4334-828a-2ed77512ebbd',
    'aef60bec-b6e5-4702-b961-295f3c9159e6',
    'e922a241-6f0e-4af5-a5f6-8852e9813217',
    'e8fc72c5-a4aa-45c0-97e7-d63023ea394e',
    'f3683017-a5f5-4e4a-b995-b6a01f828eec',
    '14bf8f5e-e819-4951-9037-5ed02772a550',
    '1f480f09-8161-4104-9451-fcc7514ad543',
    '4c3832aa-8f80-435d-ae25-7cac015eedbd',
    'b66135a6-8374-419a-8c9c-cce8d2a86523',
    '468d9cc0-4042-4a33-9118-d88063a78549',
    '18ef8aec-eb04-4e64-a0f5-63e1afb51613',
    'beeb43cd-2644-49b3-95c9-894df8dea4a9',
    '80c1dad8-b2bd-4cdd-9106-277c51234dd5',
    '40d67876-05ff-4cc9-b354-0c4d8f06bc0a',
    '312e2550-13f3-4bc6-a0f2-3e1010fc5ac9',
    '4c16ac2c-f9a9-44cf-87ca-e3205093f115',
    '02c86462-e90e-423e-982d-b9ff4491dd7d',
    '08fb505a-783e-4227-a632-92aac2e26072',
    'd95b5734-ca46-4af4-8b97-a25ca08a3330',
    'f38bb53d-4c66-4f04-a767-68f9188fb74a',
    '8ec55da9-f00e-4ace-bca0-1c398f3e2269',
    'd0ade0a5-3d69-49b9-8dbc-80c3576d0234',
    'd48467ae-548f-4fd4-94a1-22f676efb298',
    '0ec017a0-f296-4e0a-8cbc-8fb2bd545fb1',
    '18684d47-3a48-438f-8496-0cb82d115bf2',
    '275240ed-7214-4445-a8e5-72b232f1d8fd',
    '3dc8ebfb-f025-45d7-8b2c-f8b78bdf91f2',
    '33f419b5-8371-41ce-9b9c-831b4420992a',
    '61b16313-8ae9-4687-a445-ce8fc247af98',
    '066f3732-f52d-4dba-86b3-2b8c68b66cfb',
    '84d2cbaf-8a6b-4359-83ec-0f20aeb42e92',
    '951e43dd-8bca-480e-85fe-c8845eaa912d',
    'cf3016e2-5b5b-49a7-8a48-f9ad51da77ef',
    'd9d7fa11-3ba7-4300-bf19-a9692ef44755',
    '93eba521-9ae5-4116-b1d1-d0a4d603fb9e',
    'bb61952e-f051-4460-bbe7-58e0d99934dc',
    '12cbb0bf-b6a4-4727-842a-eaf37c1d6a06',
    'a8326af6-803c-4228-b3d9-20b95203d951',
    'ff13ccf4-de89-4b38-b62a-a464057b953b',
    '88998835-2f71-4733-9fcd-92b4617e8c6d',
    '24ab0b64-a749-4a68-afb0-d8b2fb5f8e3d',
    '4afddb65-66f0-440a-a2f9-87cc90657201',
    'b71229e0-0719-402e-bb31-968cc918b821',
    '4bcffaa7-5af8-40f9-8833-47333aeb7ff3',
    '175c4571-56a9-4e3a-b74b-b36253642f62',
    '0b913d53-f299-42ca-b5d6-8d672e2168e4',
    '34cc4680-53d2-492b-a6b5-fd27225cbf42',
    '719fde7a-8fcd-4094-a19a-be963c2d364e',
    'fb3a2d66-a404-4fe1-8c34-648c3a4cfad6',
    '8edcf8ad-b3f8-4da3-80a3-7c2535a289fb',
    '4fe79467-5ced-415a-b3ee-1dc18a339be6',
    '397fb927-ad39-4f75-9b5f-eb9f0b083db9',
    'c722d273-4958-452b-9eff-2f0c698a1adb',
    '3673148a-f922-4946-8123-5a6413321c4d',
    '49f5f51a-6168-42db-8adb-07093230a332',
    'fea80983-190b-4510-8ff2-3df2ed7c59ff',
    '74e5bd93-5172-4e24-a2ec-d7c5692b29ad',
    '6d81c31b-94ef-4073-bda4-2075fc2bedd1',
    '2e7e5401-6d60-460d-aabc-f4879edc5c01',
    '28468279-3b99-4e40-9936-743a60e94d54',
    '8927b764-371b-4d90-9f6f-104e912ba789',
    '28cfb8f1-848f-40ac-ae7d-19c34fa7978c',
    '38c845d7-56d5-4407-97ee-74d0e06ae3e3',
    '33abeae2-ff90-4023-92f2-3e0e450f8eec',
    '440c9451-b64c-44ea-9245-23ea619d4f98',
    '5d3cf6e9-dde1-4888-b8e5-04c3bfcd7591',
    'db3f1c0d-f346-477d-a279-7697f7d2ba11',
    '5e27e200-5e5d-41fa-bc79-cf6119028236',
    '4d3080a7-d3cd-49ec-b7d4-e3acc26dd378',
    '8b123592-6c42-4d72-8ccc-fd78bc745869'
  );

update public.fields f
set verification_status='derived_from_structural_mapping', verification_quote=null, verification_note=null, verified_at=null
from public.worksheet_templates wt, public.standards s
where f.worksheet_template_id = wt.id and wt.standard_id = s.id and s.code = 'DWA-A-201'
  and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%')
  and f.id in (
    '57e2881b-30bd-4c5d-ae9a-b0d0c7375d64',
    '954c4753-5645-4ff5-a7f5-a5fdeb7aa804'
  );

update public.equations e
set verification_status='needs_engineer_review', verification_quote=null, verification_note=null, verified_at=null
from public.worksheet_templates wt, public.standards s
where e.worksheet_template_id = wt.id and wt.standard_id = s.id and s.code = 'DWA-A-201'
  and e.verification_note like 'md-verified 2026-09-05%'
  and e.id in (
    '48ef9e99-ffc6-4b51-a911-88fb8e40101d',
    '9595054e-f057-4cbb-8468-50913547d86b',
    '792d1332-5ed4-4b16-a106-8132a1fa7bf7',
    'e3c30a7d-c11e-4076-8f09-a0d4a590946e',
    'cd3b9207-ad53-43ad-bcf3-31c6028194d8',
    'ba340cbf-9420-410d-bfc9-d4380dde9a6e',
    '2c9d5018-004f-4f67-b40b-dcc8898d3171',
    '3f986494-9fae-4171-b602-ab106a8cd659',
    '907ca435-b41e-43f9-8811-ea85b6098956',
    'a69cfcaf-18a2-482e-a359-63848ffa00b9',
    '2aa30964-75b6-4990-995e-58d16598fc2c',
    'c34e9132-0c2f-404a-bc06-c2673770c761',
    '74018e72-ea91-4a1e-bef9-2cb4f3782f8d',
    'f4ae9506-4dea-4835-89e2-5f98d23db308',
    '05bc3636-53d6-4518-aa00-2f40fce08d5a',
    '4219cb5e-8ced-41b0-8eef-783e0d3fcfc5',
    'fa442217-ded1-4102-8a7c-24b22e7612c3',
    '9f5fbe27-18b6-4dcc-a3ab-b998112aa05c',
    'e1345767-b989-4a0c-b6c3-8395c0983a1b',
    '7ccc47c0-1fa7-4ee6-92e6-a6f80f0a3772'
  );
