BEGIN;
UPDATE fields SET active = false WHERE active = true AND (id, symbol) IN (('78830e94-abf2-4324-890e-fcf3e093d3ee','emersed'),('8248f4d6-bda8-4f91-98c4-e863ab771faa','submergent'),('7c17d909-a490-4886-9e68-55e58f248594','II'),('c86a571d-d7d5-49de-ae28-5b5809617982','III'),('e4704fc9-1cd0-4505-8511-afb14cab57fc','tankstelle'),('54aec43c-3f4f-46a4-ad1e-5059b7d87524','keine'),('57c69bdf-f6e2-4c35-bdde-04f8573207c4','nicht_genehmigungsbeduerftig'));
COMMIT;
