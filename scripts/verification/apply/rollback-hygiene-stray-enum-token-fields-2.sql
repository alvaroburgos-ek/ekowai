-- Rollback of hygiene-stray-enum-token-fields-2.sql (re-activates exactly the 19 deactivated ids).
BEGIN;
UPDATE fields SET active = true WHERE active = false AND id IN (
  'e93e2266-ffb5-4c03-835a-9f50bac5131d','b6f5cce2-97d5-4c04-a051-d511421ddb3d',
  'b9bfe986-7824-4b1a-aac4-df6b60be3b32','890d53a4-2b58-4618-953d-480413dba1f8','68cda828-cf64-4576-a0c0-6206b5be24c0',
  '0626fa4c-ea2f-4a67-a14a-c3eb28673cc7','30fa7fac-6c13-407c-98ec-ab72c07e6c21','3398cd11-2cd5-4201-8608-21ca69861a76',
  '1804755b-14dd-4646-a4f2-874750809100','729a7997-7981-4c33-ad77-c8aea316227b','c0577c94-c340-45f5-917c-e4ba0b7ae06a',
  'd5d5fcf0-d72d-4c0c-ba72-bd3820779f58','66a33431-73cc-43a3-a14f-2a0c8096c951','a9b0c8d8-6e6b-4684-8179-8c2466ad0369',
  'f9ba5e4a-24f2-4474-93d9-a04d615f9729',
  'e301b45e-38a0-4d4c-a0f5-31b4e4ac7043','7c241733-fd7b-4426-b91a-f047963ac2cf','4a9435f3-8b86-4e3a-bd9a-cb55c43ab02f',
  '0d8d6ca8-10a5-478b-9b45-ceb1b4f2f0fe'
);
COMMIT;
