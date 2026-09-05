-- Rollback for din-1989-2-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows this pack touched (identified by the verification_note tag) and ONLY for standard DIN-1989-2
-- (joined through worksheet_templates → standards.code). Every Section A field carried the single prior status
-- 'imported_unverified' (2026-09-05 export: 42/42 imported_unverified), so Section A rows return to exactly that
-- status. Section B equations keep their status (verified_against_standard, encode-time); only the backfilled quote
-- is nulled and the " | md-quote …" tag stripped. No Section A equation statements existed in the pack.

-- ---- Section A: fields (status + quote + note + verified_at) — prior status = imported_unverified (42 rows) ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DIN-1989-2'
   and f.id in ('ef8eb4a1-9b51-40d1-9388-4e311750261d','097ec461-e2c5-4f11-a4ea-1d42e06723e9','debeabeb-5274-4d4f-9d25-57ba49204f90','69513474-19e9-4966-81c4-0735f6b72eb8','f4fc9848-9bbb-4f6b-b571-58c02c81fa3f','3d471a30-71c4-498e-8e89-01a8c5110a14','575f24b4-cad1-4be3-ad90-5afca26ee3b3','809aa64b-3d3d-4f8e-b5c5-a9f2f406a4bb','d516ce4f-ff7a-4231-a35e-ffd122d8f2bf','62bbc378-2fee-435e-ac3b-b983bfc8ecfd','40084568-421e-4324-8d4b-72e5a4774f4a','8efc35b5-fadf-44a3-93f5-34c364955928','e0a55dcc-b834-4f1b-9f4e-86c9bd9381ee','5ca57046-b54b-43f2-9c64-b257c028c5ea','7e796266-a08b-4be3-9e57-200b78c4e609','db627bab-b152-430b-a0d6-22ddea203df1','a83d0fc0-856c-49ed-982a-c404e30d878c','39e8c65b-085f-44fd-991d-08d3927e54b4','c0e86394-530e-4b7f-94ff-558279f55bd4','f6c8533d-b805-4e32-a28f-43e165e0552e','d399fd43-aa40-400a-a8cb-af7f52640f88','ccbb44f6-76bb-4363-8098-3367f76187e2','a475b605-1c9c-4593-946d-cf29f7514fab','7f250107-a6c7-4ec8-ad37-1bf467c5b731','7a7defcc-f8ad-4e68-8a0f-5e577dba3b90','aaae66e8-605a-4829-a4ad-cbb88329c5e6','614270fb-7831-4e83-8973-a2c899813e9c','7340f3b7-b991-41bc-a7b5-0b3440ce6a2b','1d8ce3d4-0bf6-469e-9e68-7ae02c7173f9','9e519854-b82e-4a69-b187-a8202e8959c9','a539fd83-9eef-4f8a-a1d3-efb97b27f34b','81e181b8-5ee3-47ea-9545-cfdc6e60ffde','a07d8f93-3fa5-455e-a05a-26e4d3a3c3dd','1b4fcd17-2321-4723-baed-111e0de5f498','11fc2f69-0dd0-415c-af4a-2eb1571fe0dd','590083e0-23a5-42bd-9feb-59ed5eeff427','6d1d99ed-7401-46b6-8a17-005ca4b6cb45','d829f7eb-727a-4c54-b7cb-0e04f30bff60','036aaef7-2b25-4bea-9ed2-2bfd115a2147','5d5591fe-54bc-45fc-b8fe-61d04f2299ad','394e7b5c-d99d-4cb3-8687-c7487710bc06','e609bed5-343f-468f-9885-4a08ecb89e0c')
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- Section B: equation quote backfill only (status unchanged; nulls the quote and strips the tag) ----
update public.equations e set verification_quote=null,
       verification_note=nullif(regexp_replace(e.verification_note, ' \| md-quote 2026-09-05 \(.*\) \[VC\]$', ''), '')
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DIN-1989-2'
   and e.id in ('46fb74c9-af5e-4705-8b7e-7c56e595240e','f1ac6dff-12fa-43f4-af5b-2b0796ed349b','c44be6b5-448a-43f8-9755-ff041c659246','41935d13-1d60-49f6-8308-25d0203c44f0','b6241c7a-4a65-4052-9ea9-9b7704e5d0e1','fd3184a2-6cdb-4498-b78a-083033d12978','20c140c2-3bdb-4ed4-937f-b0bded5cd925','64f61270-2f75-4f4b-8e5d-25893c023e93','8c7c52f1-9976-452c-a3c1-cf00131697e6')
   and e.verification_note like '%md-quote 2026-09-05%';
