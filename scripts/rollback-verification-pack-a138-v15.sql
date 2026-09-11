-- ============================================================================
-- ROLLBACK for verification-pack-a138-v15.sql (SR-1 Kampagne 2026-08-01)
-- Resets exactly the 43 field ids of the pack to imported_unverified.
-- Guard: only rows whose verification_note begins with
--   'SR-1 Kampagnen-Verifikation 2026-08-01' are touched, so later human
--   verifications can never be clobbered.
-- ============================================================================

-- A138-01
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='de96b550-5a3e-40e2-953b-8546492e79c2' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='24c144f4-4a68-4687-b964-5964c8f14300' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='d151b9f8-c5c6-472b-aa9b-f4aaa7428074' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='3b3937e7-bd15-477c-b717-163f5a9e7051' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='21941a60-3bda-4ac1-90c2-ad2b5760c952' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='3bbcb2a7-6be0-420b-a4df-b4043ce7f40e' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='6cdf34f3-ba25-4fcc-ae89-b95ed4a6bfae' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';

-- A138-04
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='71051b96-0b88-4c12-9270-40ecc41b415d' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='1f803cf6-0b02-4c0e-b12b-fc9d95b8e3e9' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='41a43c4c-f8ad-44f2-b34e-a2abba4882bc' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='bb57e7dc-bb96-42d7-b5fe-7da15762eadf' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='c610cf69-2f82-4b66-825a-28e76ca29d17' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';

-- A138-05
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='3d835b1b-9ce5-4ee6-aa61-4122d5cd7ed1' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='afd460d2-63c5-42f4-8511-7c51aac8e574' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='b966716b-783a-470a-80de-1056fc297ba2' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='7f478cf1-8c99-45e7-a92d-2c5da0edb8ef' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='9978420d-2d14-4a4e-b1d9-6c30278f3dbd' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';

-- A138-07
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='a1380700-0000-4000-8000-000000000001' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='a1380700-0000-4000-8000-000000000005' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='a1380700-0000-4000-8000-000000000006' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='a1380700-0000-4000-8000-000000000003' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='a1380700-0000-4000-8000-000000000004' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='a1380700-0000-4000-8000-000000000002' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='3e0d90dd-8c6a-425e-9c9f-73e7e18c923e' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';

-- A138-10
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='d1a38110-0000-0000-0000-0000000000a1' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='d1a38110-0000-0000-0000-0000000000a2' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='dd3945c7-477c-4acb-a065-012e745e359e' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='a514ba2e-5077-4ae5-80ed-8db90eb21567' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='393925ec-7ddd-4a76-9829-059b2a64a3b7' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='e8f2de04-8434-4998-8a67-0e2bf772cc0d' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='be517c98-bd49-4dd3-87bb-85d41c601021' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';

-- A138-11
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='7af2b6e8-18ce-443e-942f-6a1de3b8895f' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='52b6f9cb-0821-448e-85e5-1aca402f11a7' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';

-- A138-12
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='1c8c9d12-5919-45a0-93f1-fd2d8b3b7c63' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='ed25fd54-51a5-4749-89fd-24192ec7ae73' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='d3511149-a224-40ad-95d6-05708f3d7d60' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='232fdcbe-26c1-42c1-87c7-646efe2faa4a' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='a0cd8e61-006c-44f9-bdeb-df761d8b05a8' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';

-- A138-13
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='3a327d2d-8013-464c-be6f-112402e8904b' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='0c5051cd-c992-4287-a8b1-187eb3af9393' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='d1381310-0000-4000-8000-000000000002' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='d1381310-0000-4000-8000-000000000001' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';
update public.fields set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null where id='d1384013-0000-4000-8000-000000000001' and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01%';

-- End of rollback: 43 statements.
