-- Read-back for scripts/migrations/20261015160000_m820_3_c4_qe_guards.sql (DWA-M 820-3 case C4 F3 / F4). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R4) and AFTER (R0 … R5). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 79_APPLY-ORDER-m820-3-c4-qe-guards.md and the harness tests/harness/m820-3-c4-qe-guards.integration.test.ts. Signatures sig0 come
-- from the harness seed (2026-10-05 dumps + every M820 block applied on prod up to 20261008100000), sig1 from the harness after the apply.
-- Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de | label_en | is_required | data_type |
-- verification_quote md5 | source_anchor. Gate signature = md5 of condition | severity | description md5 | clause_reference.
-- No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state (before: fields_pre 91, gates_pre 6, *_post 0, new_equations 0 · after: 0 / 91, 0 / 6, new_equations 8;
--      always: totals_widget_ok 8 (widget NULL at sig0 / 'derived' at sig1), foreign_total_equations 0)
WITH fv(ws, sym, sig0, sig1) AS (VALUES
    ('M8203-11','qe62_assessor','119486e04a5ac00f8bbdbae6bd8c1fc3','60f7d2051866bf4de027f1f2efcd9233'),
    ('M8203-11','qe62_assessment_date','cb7a015c0bbab4ddaa27dc169bf87a74','2c7934d615f0dd3b09d1320edf1785ac'),
    ('M8203-11','qe62_fulfilment_pct','9c57fa8ed875a92e918bdc38c88bdccd','2b8e8d9bf2512a99b9f56cfc359fda32'),
    ('M8203-11','qe62_items_y','12314446500875e1023c01745ccde684','872e7b588b5f753c1853ebff09ad99ed'),
    ('M8203-11','qe62_items_p','6b375d9e3a9a5e84a8cca71012dbe57b','71c2a6f8a86302d7f55e666c17c666e9'),
    ('M8203-11','qe62_items_n','a2548e12a2784c854fffd3bec94cbff9','68bc5922ff9467bbad26af56243c980f'),
    ('M8203-11','qe62_items_na','6d03cd1e63b26b812553d1237349b004','dc5a9e891dc337d397463e09afe76492'),
    ('M8203-11','qe62_items_total','7a244e5efa75ae7dfbcf4fe404956dda','ef205169ac217110f2c030602e42ff89'),
    ('M8203-12','qe63a_assessor','4cda81e8e5f3981bbf08cca5c85e1881','f0a1ce1e0c2c7cff4e23ff4c68d987ff'),
    ('M8203-12','qe63a_assessment_date','d0d4e7037dccbd263e2d78cb8a4cefcf','890e16918a180e081e2dce433d1cf59e'),
    ('M8203-12','qe63a_fulfilment_pct','31a0d41d223595f5286044336beb1c30','831d20bfbc10181b5f232f30ddb0a075'),
    ('M8203-12','qe63a_items_y','fda2361deedb2de2d1558a9e5fbd628f','6cab43fb6265edb92601479ed3d21e20'),
    ('M8203-12','qe63a_items_p','9f7e4f2170e6ef3ed531a6aa786926ee','f39e4cc776f7dad9518dcbd739f55d53'),
    ('M8203-12','qe63a_items_n','1f2f627d5d5a80c1de992da71f881cfd','ed7d31c7117347fe8e87cfb05bc3cb3c'),
    ('M8203-12','qe63a_items_na','a13840ed65121e311216e02f20878deb','363ef8d9d1f6e863871535130448a6f9'),
    ('M8203-12','qe63a_items_total','9250e539735c45dea3988526c889527f','0883988cedd148b406035d5d4b2f2ff4'),
    ('M8203-13','qe63b_assessor','b8d62c397115ef30305b60b9c75eeba2','ee714b1f6eccd532db7470e708dbbd08'),
    ('M8203-13','qe63b_assessment_date','9e37fb5497febc3bc5b82122da504c4c','6e42466aebe7f7174a8893b7737c821c'),
    ('M8203-13','qe63b_fulfilment_pct','565bd1d3e66d1947d1d293fdeaba8e59','e0ec65292bc8be10ecfdd9cf47bc1790'),
    ('M8203-13','qe63b_items_y','6f617b06a512c6c8aa02a76179a8bbb9','658c2067c5e6f2d7ea460a91e8785d77'),
    ('M8203-13','qe63b_items_p','117456c1d35e84ac2fbff89fa58c2c4b','6c5418a55f47ced5bae082a9834881fd'),
    ('M8203-13','qe63b_items_n','1c6f5b111e5c6908e852a26303eb0c42','040fac7d3c842d2b831df824916e6acb'),
    ('M8203-13','qe63b_items_na','9d4d0aa79750f28184b8390013762c19','c11b05d37ad2663a200edf43cd32ec63'),
    ('M8203-13','qe63b_items_total','3ef9569260cd6ae74d87f88e4ff3a933','304beadc442600e9a722ee1d72563f16'),
    ('M8203-14','qe64a_assessor','046b8f377f418b7c289bea8e0b52c227','ae63c75aa56b5b8dbcc2b84add59ae89'),
    ('M8203-14','qe64a_assessment_date','850895ae4cab16dc7fe21bf17fd767e5','c1ea9659c1afac6bc37915a4a197854f'),
    ('M8203-14','qe64a_fulfilment_pct','a515b1a9b61db32aaecdc894e8a33fcc','09ac871ced0056357ab7cfc0cc1f542d'),
    ('M8203-14','qe64a_items_y','d2d4235a5c569487acb995d342f28d66','abe3b1583aeac145d9fb67f8956f9173'),
    ('M8203-14','qe64a_items_p','adf1304b60c561781e0cd08e4e1e742b','6009e9d1d2348cada0a4e9498a9dbe71'),
    ('M8203-14','qe64a_items_n','ab5fff99af9e93c8ab89f7ed9b43ac9c','94609b483509bab57c16e265564cf363'),
    ('M8203-14','qe64a_items_na','5fabe2d984462b400b528289e3c0107a','e760786cc73a5f38afbc743ebd270760'),
    ('M8203-14','qe64a_items_total','126fa47d9ddef152415794b6b6a0af9d','2e8c2afc6d1ab19cf951ea83be95668a'),
    ('M8203-15','qe64b_assessor','4866a25772ba52a66ef4d58e7e67ebe3','5028f3404ef5648d12c556447ee4ec4e'),
    ('M8203-15','qe64b_assessment_date','27c95168892fc849dd29515a5b515285','0e1242f7cd1edc917fca18dc9c8d39f8'),
    ('M8203-15','qe64b_fulfilment_pct','59d2d024b187d8dce3f4dbbddf45e506','3d6b09f590647b6d43eb8970690f3a4c'),
    ('M8203-15','qe64b_items_y','dd289395c8397cd1142c67890693fbf3','23e165da7fc9340cc6964ac11bfbf513'),
    ('M8203-15','qe64b_items_p','70d35e192ccc6ae376a94c7bc1b128b5','25b39dd8534aa18103f83534884744c0'),
    ('M8203-15','qe64b_items_n','bf1fc78a80ea93cd66ecc6c3824af621','b1c8033cc80d87ef8f4e3629bd434e0d'),
    ('M8203-15','qe64b_items_na','c7bb3fc77477dfd4b5984a7686d11c14','e5f8cf51cb4a6e449efd33a67f6decbf'),
    ('M8203-15','qe64b_items_total','b8898fa89197a92ae2e48dc306bf352f','ad39d6f20830de5916bc5df2bf4bb7f7'),
    ('M8203-16','qe65_assessor','61c5ac311af844b81b6cf1ab96267bc2','d5b3bc32050f52ef0822679d67d52811'),
    ('M8203-16','qe65_assessment_date','1677c6cded15b5d68b700c9acedb7f90','7c552c5475ba57f327431ebc315dc11f'),
    ('M8203-16','qe65_fulfilment_pct','38d76a1816df0ef220bbb588abeed2fa','7d9fd4395e705c6f2d6d6f2beabc1b3b'),
    ('M8203-16','qe65_items_y','20cbc5014ccc3bb6dbdeb8b765ffa55c','b18ad11c3304c6e19f981b5c1b508f6d'),
    ('M8203-16','qe65_items_p','2acf9a4221c933f15a8b332e5e0397d2','ec22e1e4f9fafcd43682ea8b4f4c09fa'),
    ('M8203-16','qe65_items_n','7d3bb1cba1cf9bb19165e11421a7cdc4','99f0a6bb1786297d49d1c34853d72062'),
    ('M8203-16','qe65_items_na','e084be15b7f78fad2057e21bbf901cab','54f08df9244fa43b45a904735765e127'),
    ('M8203-16','qe65_items_total','8ba9604fa2f310289bad287dcfbae92b','e91508d6b433f15de6f22af4f7515015'),
    ('M8203-17','qe66_assessor','0440b0ccefdd7883803040e717c3f60d','5980136eadb13846e82a2bb869c279ee'),
    ('M8203-17','qe66_assessment_date','566e64eabeff9221d43e2e9e25e93b3c','3085e91f6e25031234a4f3209f37bb0f'),
    ('M8203-17','qe66_fulfilment_pct','3530b5a833b9f349624b341e7b9848de','212f9cc973364681e15f00ec57be3d82'),
    ('M8203-17','qe66_items_y','3d48bf880937c043b3d382077f559441','3ec5ae0232721edbce8ffc85bf38c851'),
    ('M8203-17','qe66_items_p','a4c9dc80ae164d78a10099b652906b7c','dba2ee67e640ee9787940908b271e7d3'),
    ('M8203-17','qe66_items_n','9b65754e05f6c33d09310ecf69026f6c','bc4bc5cb1a4802801ec5f158bc4a89e8'),
    ('M8203-17','qe66_items_na','bd8fb735d45590e3b82c1da7acc33cd0','fe93a18a9884fd0d47fdc2f4559391ef'),
    ('M8203-17','qe66_items_total','54ffc605d87fa495593c4899275e12a0','f6e67852778ab10145e0a326d192678e'),
    ('M8203-18','qe67_assessor','d0cf4f07fa7be5bce329446403b7e51a','97120c49a8e6e5ba4de71ef01fe98955'),
    ('M8203-18','qe67_assessment_date','75ad5a0dbd1fc977de96e5f4aa6e3cc2','a199276c427120d0f52560d8a1a8f580'),
    ('M8203-18','qe67_fulfilment_pct','0a43cacf1fcae85c8ab4362306de5630','a4319a4f09ef4ad5b6d2104f860d4620'),
    ('M8203-18','qe67_items_y','57b847055cfab36b9ccf15133ad89955','b9520bb881f53f6c9e519cbb746fe465'),
    ('M8203-18','qe67_items_p','7366030acf4364363e06338599388bdb','3df9ad02c81af62ddd41e4c760756f38'),
    ('M8203-18','qe67_items_n','a3b4934df84ca462fdce89b35f2116c3','b2e810e685d5ec6d56dfeea87fb6ed8a'),
    ('M8203-18','qe67_items_na','55d1e5184bc6c21aaa231ee022d4d266','637a1f9108554bb637936d83dd3042a6'),
    ('M8203-18','qe67_items_total','0deaba82f96d3abf894c0289cb66c22e','1e9f16e2a534dce0c4da8943d2e5a015'),
    ('M8203-23','gesamt_anhang_b_fulfilment_pct','934b810aa77f232a84e0bb42c0d674e0','383940974fb9b14626f39abfbd71d2f6'),
    ('M8203-23','gesamt_anhang_b_items_total','b8ec72db0c678829262d103b43d07124','28b35da6d3e75865dfae7b879dbd60f7'),
    ('M8203-23','gesamt_anhang_b_verdict','b86fb243b31a2873e5a7c87e269a7629','036b5d1963ffdbe26cf912c90a77487e'),
    ('M8203-11','pz_62_1_status','34a96a9756edab7ccb746a3222e219cc','32872771a44677f530ca580763258248'),
    ('M8203-13','pz_63_1_status','5751fb1a7c23fd5f529951c9e86eee24','aa0960095edf8275f8e713b80ad0215f'),
    ('M8203-15','pz_64_1_status','0778f01a58d658bfd28cbc5dfe6b60dd','8c11ca2d4ec06372c2d323b772e11e1a'),
    ('M8203-16','pz_65_1_status','d59367dedbb0e31c4d97f4838318f883','0e73262c37363eac9e27e31fc1164eb4'),
    ('M8203-17','pz_66_1_status','66ff02d323d24c7f6c9513fde3a57294','3b8d89db05e068c153b727c2fa49290d'),
    ('M8203-18','pz_67_1_status','60977f9fa932876ff7bceb5d9d493d5a','cffba4bed6dd40148fd7c0eb7b4119f1'),
    ('M8203-13','pz_63_2_status','c1bb0a1535a89728a8f8f5cf8e6c5b59','7680d5b52e8cd17650663993867cc5ba'),
    ('M8203-13','pz_63_3_status','7b01db357a8e1c91877bd8d244bcf8d8','c67fbf78283e5e258235731e42f1af0a'),
    ('M8203-13','pz_63_4_status','fe268ecb1b9290885bf90556b4e9a9d8','a3a19d0211215959cb57694bcc60b9da'),
    ('M8203-13','pz_63_5_status','9d6db94f5f3a2addac1eb9e15996c2de','358ad40996ccb54cdc819d1529814bff'),
    ('M8203-13','pz_63_6_status','dec78f1a923dc0d708da16be25d5a0cf','4ce4eecf6d6dc01d20824dde5bebd654'),
    ('M8203-13','pz_63_7_status','f1bad99041d769a179c33e3c8a19668f','67a873d899454a31a7c0224371e10616'),
    ('M8203-13','pz_63_8_status','b1235c9dcc5378035324b586b01ace30','ccac284138256692d91abfaef658e1bc'),
    ('M8203-15','pz_64_2_status','8f1330045b51452e7397f8be7df91ec1','2e255d0ea8088a677d8731175bddc645'),
    ('M8203-15','pz_64_3_status','a7c9fe7d1796d7d252fbbb1ebd1e6f2e','b71505ed0bbc7c92f056cfa62edddb20'),
    ('M8203-15','pz_64_4_status','3e9731331efa4980d0639f0058e71796','f452338bb4aad6b5ef06d0db83c13e35'),
    ('M8203-15','pz_64_5_status','a66e349823446a8e8329f5a5614bcb94','336f7671163d6aafdc197e3328511cd5'),
    ('M8203-15','pz_64_6_status','93f6b6459a2ea53a9398b12446c38a71','379a7cb59aefd35ec53a7b22bfcf20f7'),
    ('M8203-15','pz_64_7_status','47def9e3c775ff585384297c793c5416','6f442f5d40fc002d931e6a421649c21e'),
    ('M8203-15','pz_64_8_status','2c79eba36fa0d262c1e2afeb8b14531d','43dc2056fecfb997ed1d99d36a156d4b'),
    ('M8203-15','pz_64_9_status','849b95a1df02806631dfdf564e31fde7','259758e0fb67fc049166d256e80f3f8d'),
    ('M8203-15','pz_64_10_status','5c987378074801044607f3c8bdeaf91e','71e8b0463780bb72e6be683a03f44b02'),
    ('M8203-15','pz_64_11_status','126cf699568c5e4eb554de8a74bdceca','d21a9a270deb7d84e6d84adc66887cf6'),
    ('M8203-15','pz_64_12_status','0b505f22f3d08e4224b31225b6425e3a','d764e614d55ce551da13d5bbcccf513c')),
gv(ws, code, sig0, sig1) AS (VALUES
    ('M8203-11','REQ-19','ed2fb49573e966c41cc5b9374fd9bc7f','370f53bb5c00f727e091327f0e5b179c'),
    ('M8203-16','REQ-22','54bca979b5e9e0958c8125a5b4fef16b','4393d848a81e6fadca20a35083e47241'),
    ('M8203-17','REQ-23','bb7c290b8b639c6c434809a37c64023d','3b4a0c9e543a767a6f651ada055e91e4'),
    ('M8203-18','REQ-24','bae5af06eba8f76ad1064cfa28d0584c','5f852e7c3ef60a940c336b6405ad7ad3'),
    ('M8203-23','REQ-20','86bd6d2125084117ae7db0f6bd875a10','036de3dff45981fa8672f6a039f8aa9f'),
    ('M8203-23','REQ-21','b624a3dee23aa7599ce6bfb49a1d98c1','881dd28e15e1fc98a9dd0aa74a0f3c08')),
tv(ws, sym, eqno, formula, sig0, sig1) AS (VALUES
    ('M8203-11','qe62_items_total','M8203-11-D10','qe62_items_total = 15','7a244e5efa75ae7dfbcf4fe404956dda','ef205169ac217110f2c030602e42ff89'),
    ('M8203-12','qe63a_items_total','M8203-12-D10','qe63a_items_total = 21','9250e539735c45dea3988526c889527f','0883988cedd148b406035d5d4b2f2ff4'),
    ('M8203-13','qe63b_items_total','M8203-13-D10','qe63b_items_total = 19','3ef9569260cd6ae74d87f88e4ff3a933','304beadc442600e9a722ee1d72563f16'),
    ('M8203-14','qe64a_items_total','M8203-14-D10','qe64a_items_total = 17','126fa47d9ddef152415794b6b6a0af9d','2e8c2afc6d1ab19cf951ea83be95668a'),
    ('M8203-15','qe64b_items_total','M8203-15-D10','qe64b_items_total = 33','b8898fa89197a92ae2e48dc306bf352f','ad39d6f20830de5916bc5df2bf4bb7f7'),
    ('M8203-16','qe65_items_total','M8203-16-D10','qe65_items_total = 34','8ba9604fa2f310289bad287dcfbae92b','e91508d6b433f15de6f22af4f7515015'),
    ('M8203-17','qe66_items_total','M8203-17-D10','qe66_items_total = 10','54ffc605d87fa495593c4899275e12a0','f6e67852778ab10145e0a326d192678e'),
    ('M8203-18','qe67_items_total','M8203-18-D10','qe67_items_total = 6','0deaba82f96d3abf894c0289cb66c22e','1e9f16e2a534dce0c4da8943d2e5a015')),
fl AS (SELECT fv.*, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,''))) AS sig
         FROM fv JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fv.ws
         JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = fv.sym AND f.active),
gl AS (SELECT gv.*, md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) AS sig
         FROM gv JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = gv.ws
         JOIN compliance_requirements cr ON cr.worksheet_template_id = w.id AND cr.code = gv.code)
SELECT (SELECT count(*) FROM fl) AS fields,
       (SELECT count(*) FROM fl WHERE sig = sig0) AS fields_pre,
       (SELECT count(*) FROM fl WHERE sig = sig1) AS fields_post,
       (SELECT count(*) FROM gl) AS gates,
       (SELECT count(*) FROM gl WHERE sig = sig0) AS gates_pre,
       (SELECT count(*) FROM gl WHERE sig = sig1) AS gates_post,
       (SELECT string_agg(ws || ' ' || sym, ',') FROM fl WHERE sig <> sig0 AND sig <> sig1) AS fields_neither,
       (SELECT string_agg(ws || ' ' || code, ',') FROM gl WHERE sig <> sig0 AND sig <> sig1) AS gates_neither,
       (SELECT count(*) FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = 'DWA-M-820-3' AND e.equation_number IN ('M8203-11-D10', 'M8203-12-D10', 'M8203-13-D10', 'M8203-14-D10', 'M8203-15-D10', 'M8203-16-D10', 'M8203-17-D10', 'M8203-18-D10')) AS new_equations,
       (SELECT count(*) FROM tv JOIN standards s ON s.code = 'DWA-M-820-3' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = tv.ws
    JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = tv.sym AND f.active
   WHERE (md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,''))) = tv.sig0 AND f.widget IS NULL) OR (md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, md5(coalesce(f.verification_quote,'')), coalesce(f.source_anchor,''))) = tv.sig1 AND f.widget = 'derived')) AS totals_widget_ok,
       (SELECT count(*) FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
    JOIN tv ON tv.sym = e.output_symbol
   WHERE s.code = 'DWA-M-820-3' AND NOT (w.code = tv.ws AND e.equation_number = tv.eqno AND e.formula = tv.formula)) AS foreign_total_equations;

-- R1 · rule columns of the guarded rows + the gates (before: no visible_when, items_total required and typed · after: phase clause, items_total derived)
SELECT w.code AS ws, 'field' AS kind, f.symbol AS item, left(coalesce(f.visible_when, ''), 120) AS rule, coalesce(array_to_string(f.consumer_worksheets, ','), '') AS consumers, f.is_required::text || '/' || coalesce(f.widget, '-') AS req_or_sev
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND f.active AND (w.code, f.symbol) IN (('M8203-11', 'qe62_assessor'), ('M8203-11', 'qe62_assessment_date'), ('M8203-11', 'qe62_fulfilment_pct'), ('M8203-11', 'qe62_items_y'), ('M8203-11', 'qe62_items_p'), ('M8203-11', 'qe62_items_n'), ('M8203-11', 'qe62_items_na'), ('M8203-11', 'qe62_items_total'), ('M8203-12', 'qe63a_assessor'), ('M8203-12', 'qe63a_assessment_date'), ('M8203-12', 'qe63a_fulfilment_pct'), ('M8203-12', 'qe63a_items_y'), ('M8203-12', 'qe63a_items_p'), ('M8203-12', 'qe63a_items_n'), ('M8203-12', 'qe63a_items_na'), ('M8203-12', 'qe63a_items_total'), ('M8203-13', 'qe63b_assessor'), ('M8203-13', 'qe63b_assessment_date'), ('M8203-13', 'qe63b_fulfilment_pct'), ('M8203-13', 'qe63b_items_y'), ('M8203-13', 'qe63b_items_p'), ('M8203-13', 'qe63b_items_n'), ('M8203-13', 'qe63b_items_na'), ('M8203-13', 'qe63b_items_total'), ('M8203-14', 'qe64a_assessor'), ('M8203-14', 'qe64a_assessment_date'), ('M8203-14', 'qe64a_fulfilment_pct'), ('M8203-14', 'qe64a_items_y'), ('M8203-14', 'qe64a_items_p'), ('M8203-14', 'qe64a_items_n'), ('M8203-14', 'qe64a_items_na'), ('M8203-14', 'qe64a_items_total'), ('M8203-15', 'qe64b_assessor'), ('M8203-15', 'qe64b_assessment_date'), ('M8203-15', 'qe64b_fulfilment_pct'), ('M8203-15', 'qe64b_items_y'), ('M8203-15', 'qe64b_items_p'), ('M8203-15', 'qe64b_items_n'), ('M8203-15', 'qe64b_items_na'), ('M8203-15', 'qe64b_items_total'), ('M8203-16', 'qe65_assessor'), ('M8203-16', 'qe65_assessment_date'), ('M8203-16', 'qe65_fulfilment_pct'), ('M8203-16', 'qe65_items_y'), ('M8203-16', 'qe65_items_p'), ('M8203-16', 'qe65_items_n'), ('M8203-16', 'qe65_items_na'), ('M8203-16', 'qe65_items_total'), ('M8203-17', 'qe66_assessor'), ('M8203-17', 'qe66_assessment_date'), ('M8203-17', 'qe66_fulfilment_pct'), ('M8203-17', 'qe66_items_y'), ('M8203-17', 'qe66_items_p'), ('M8203-17', 'qe66_items_n'), ('M8203-17', 'qe66_items_na'), ('M8203-17', 'qe66_items_total'), ('M8203-18', 'qe67_assessor'), ('M8203-18', 'qe67_assessment_date'), ('M8203-18', 'qe67_fulfilment_pct'), ('M8203-18', 'qe67_items_y'), ('M8203-18', 'qe67_items_p'), ('M8203-18', 'qe67_items_n'), ('M8203-18', 'qe67_items_na'), ('M8203-18', 'qe67_items_total'), ('M8203-23', 'gesamt_anhang_b_fulfilment_pct'), ('M8203-23', 'gesamt_anhang_b_items_total'), ('M8203-23', 'gesamt_anhang_b_verdict'), ('M8203-11', 'pz_62_1_status'), ('M8203-13', 'pz_63_1_status'), ('M8203-15', 'pz_64_1_status'), ('M8203-16', 'pz_65_1_status'), ('M8203-17', 'pz_66_1_status'), ('M8203-18', 'pz_67_1_status'), ('M8203-13', 'pz_63_2_status'), ('M8203-13', 'pz_63_3_status'), ('M8203-13', 'pz_63_4_status'), ('M8203-13', 'pz_63_5_status'), ('M8203-13', 'pz_63_6_status'), ('M8203-13', 'pz_63_7_status'), ('M8203-13', 'pz_63_8_status'), ('M8203-15', 'pz_64_2_status'), ('M8203-15', 'pz_64_3_status'), ('M8203-15', 'pz_64_4_status'), ('M8203-15', 'pz_64_5_status'), ('M8203-15', 'pz_64_6_status'), ('M8203-15', 'pz_64_7_status'), ('M8203-15', 'pz_64_8_status'), ('M8203-15', 'pz_64_9_status'), ('M8203-15', 'pz_64_10_status'), ('M8203-15', 'pz_64_11_status'), ('M8203-15', 'pz_64_12_status'))
UNION ALL
SELECT w.code, 'gate', cr.code, left(cr.condition, 120), coalesce(cr.clause_reference, ''), cr.severity
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND (w.code, cr.code) IN (('M8203-11', 'REQ-19'), ('M8203-16', 'REQ-22'), ('M8203-17', 'REQ-23'), ('M8203-18', 'REQ-24'), ('M8203-23', 'REQ-20'), ('M8203-23', 'REQ-21'))
 ORDER BY 1, 2, 3;

-- R2 · any time: saved values on the guarded fields per field (after the apply such a value stays saved; it is hidden while no goal of its phase is assessed)
SELECT w.code AS ws, f.symbol, count(pp.id) AS saved_values
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN project_parameters pp ON pp.field_id = f.id
 WHERE s.code = 'DWA-M-820-3' AND f.active AND (w.code, f.symbol) IN (('M8203-11', 'qe62_assessor'), ('M8203-11', 'qe62_assessment_date'), ('M8203-11', 'qe62_fulfilment_pct'), ('M8203-11', 'qe62_items_y'), ('M8203-11', 'qe62_items_p'), ('M8203-11', 'qe62_items_n'), ('M8203-11', 'qe62_items_na'), ('M8203-11', 'qe62_items_total'), ('M8203-12', 'qe63a_assessor'), ('M8203-12', 'qe63a_assessment_date'), ('M8203-12', 'qe63a_fulfilment_pct'), ('M8203-12', 'qe63a_items_y'), ('M8203-12', 'qe63a_items_p'), ('M8203-12', 'qe63a_items_n'), ('M8203-12', 'qe63a_items_na'), ('M8203-12', 'qe63a_items_total'), ('M8203-13', 'qe63b_assessor'), ('M8203-13', 'qe63b_assessment_date'), ('M8203-13', 'qe63b_fulfilment_pct'), ('M8203-13', 'qe63b_items_y'), ('M8203-13', 'qe63b_items_p'), ('M8203-13', 'qe63b_items_n'), ('M8203-13', 'qe63b_items_na'), ('M8203-13', 'qe63b_items_total'), ('M8203-14', 'qe64a_assessor'), ('M8203-14', 'qe64a_assessment_date'), ('M8203-14', 'qe64a_fulfilment_pct'), ('M8203-14', 'qe64a_items_y'), ('M8203-14', 'qe64a_items_p'), ('M8203-14', 'qe64a_items_n'), ('M8203-14', 'qe64a_items_na'), ('M8203-14', 'qe64a_items_total'), ('M8203-15', 'qe64b_assessor'), ('M8203-15', 'qe64b_assessment_date'), ('M8203-15', 'qe64b_fulfilment_pct'), ('M8203-15', 'qe64b_items_y'), ('M8203-15', 'qe64b_items_p'), ('M8203-15', 'qe64b_items_n'), ('M8203-15', 'qe64b_items_na'), ('M8203-15', 'qe64b_items_total'), ('M8203-16', 'qe65_assessor'), ('M8203-16', 'qe65_assessment_date'), ('M8203-16', 'qe65_fulfilment_pct'), ('M8203-16', 'qe65_items_y'), ('M8203-16', 'qe65_items_p'), ('M8203-16', 'qe65_items_n'), ('M8203-16', 'qe65_items_na'), ('M8203-16', 'qe65_items_total'), ('M8203-17', 'qe66_assessor'), ('M8203-17', 'qe66_assessment_date'), ('M8203-17', 'qe66_fulfilment_pct'), ('M8203-17', 'qe66_items_y'), ('M8203-17', 'qe66_items_p'), ('M8203-17', 'qe66_items_n'), ('M8203-17', 'qe66_items_na'), ('M8203-17', 'qe66_items_total'), ('M8203-18', 'qe67_assessor'), ('M8203-18', 'qe67_assessment_date'), ('M8203-18', 'qe67_fulfilment_pct'), ('M8203-18', 'qe67_items_y'), ('M8203-18', 'qe67_items_p'), ('M8203-18', 'qe67_items_n'), ('M8203-18', 'qe67_items_na'), ('M8203-18', 'qe67_items_total'), ('M8203-23', 'gesamt_anhang_b_fulfilment_pct'), ('M8203-23', 'gesamt_anhang_b_items_total'), ('M8203-23', 'gesamt_anhang_b_verdict'))
 GROUP BY 1, 2 ORDER BY 1, 2;

-- R3 · any time: 820-3 gates that read a guarded symbol WITHOUT a goal of its phase in the condition (before: REQ-19, REQ-20, REQ-21, REQ-22, REQ-23, REQ-24 · after: 0 rows)
WITH g(sym, drv) AS (VALUES ('qe62_assessor', 'pz_62_1_status'), ('qe62_assessment_date', 'pz_62_1_status'), ('qe62_fulfilment_pct', 'pz_62_1_status'), ('qe62_items_y', 'pz_62_1_status'), ('qe62_items_p', 'pz_62_1_status'), ('qe62_items_n', 'pz_62_1_status'), ('qe62_items_na', 'pz_62_1_status'), ('qe62_items_total', 'pz_62_1_status'), ('qe63a_assessor', 'pz_63_1_status'), ('qe63a_assessment_date', 'pz_63_1_status'), ('qe63a_fulfilment_pct', 'pz_63_1_status'), ('qe63a_items_y', 'pz_63_1_status'), ('qe63a_items_p', 'pz_63_1_status'), ('qe63a_items_n', 'pz_63_1_status'), ('qe63a_items_na', 'pz_63_1_status'), ('qe63a_items_total', 'pz_63_1_status'), ('qe63b_assessor', 'pz_63_1_status'), ('qe63b_assessment_date', 'pz_63_1_status'), ('qe63b_fulfilment_pct', 'pz_63_1_status'), ('qe63b_items_y', 'pz_63_1_status'), ('qe63b_items_p', 'pz_63_1_status'), ('qe63b_items_n', 'pz_63_1_status'), ('qe63b_items_na', 'pz_63_1_status'), ('qe63b_items_total', 'pz_63_1_status'), ('qe64a_assessor', 'pz_64_1_status'), ('qe64a_assessment_date', 'pz_64_1_status'), ('qe64a_fulfilment_pct', 'pz_64_1_status'), ('qe64a_items_y', 'pz_64_1_status'), ('qe64a_items_p', 'pz_64_1_status'), ('qe64a_items_n', 'pz_64_1_status'), ('qe64a_items_na', 'pz_64_1_status'), ('qe64a_items_total', 'pz_64_1_status'), ('qe64b_assessor', 'pz_64_1_status'), ('qe64b_assessment_date', 'pz_64_1_status'), ('qe64b_fulfilment_pct', 'pz_64_1_status'), ('qe64b_items_y', 'pz_64_1_status'), ('qe64b_items_p', 'pz_64_1_status'), ('qe64b_items_n', 'pz_64_1_status'), ('qe64b_items_na', 'pz_64_1_status'), ('qe64b_items_total', 'pz_64_1_status'), ('qe65_assessor', 'pz_65_1_status'), ('qe65_assessment_date', 'pz_65_1_status'), ('qe65_fulfilment_pct', 'pz_65_1_status'), ('qe65_items_y', 'pz_65_1_status'), ('qe65_items_p', 'pz_65_1_status'), ('qe65_items_n', 'pz_65_1_status'), ('qe65_items_na', 'pz_65_1_status'), ('qe65_items_total', 'pz_65_1_status'), ('qe66_assessor', 'pz_66_1_status'), ('qe66_assessment_date', 'pz_66_1_status'), ('qe66_fulfilment_pct', 'pz_66_1_status'), ('qe66_items_y', 'pz_66_1_status'), ('qe66_items_p', 'pz_66_1_status'), ('qe66_items_n', 'pz_66_1_status'), ('qe66_items_na', 'pz_66_1_status'), ('qe66_items_total', 'pz_66_1_status'), ('qe67_assessor', 'pz_67_1_status'), ('qe67_assessment_date', 'pz_67_1_status'), ('qe67_fulfilment_pct', 'pz_67_1_status'), ('qe67_items_y', 'pz_67_1_status'), ('qe67_items_p', 'pz_67_1_status'), ('qe67_items_n', 'pz_67_1_status'), ('qe67_items_na', 'pz_67_1_status'), ('qe67_items_total', 'pz_67_1_status'), ('gesamt_anhang_b_fulfilment_pct', 'pz_62_1_status'), ('gesamt_anhang_b_items_total', 'pz_62_1_status'), ('gesamt_anhang_b_verdict', 'pz_62_1_status'))
SELECT w.code AS ws, cr.code, cr.severity, g.sym, g.drv
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id, g
 WHERE s.code = 'DWA-M-820-3' AND cr.condition ~ ('(^|[^a-z0-9_])' || g.sym || '($|[^a-z0-9_])') AND cr.condition !~ ('(^|[^a-z0-9_])' || g.drv || '($|[^a-z0-9_])')
   AND cr.condition !~ ('(^|[^a-z0-9_])pz_6' || substr(g.drv, 5, 1) || '_[0-9]+_status($|[^a-z0-9_])')
 ORDER BY 1, 2, 4;

-- R4 · any time: the new equations (before: 0 rows · after: 8) and saved values on the 8 total fields (what stays saved after a rollback)
SELECT w.code AS ws, e.equation_number, e.formula, (SELECT count(*) FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
         WHERE f.worksheet_template_id = w.id AND f.symbol = e.output_symbol) AS saved_values
  FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND e.equation_number IN ('M8203-11-D10', 'M8203-12-D10', 'M8203-13-D10', 'M8203-14-D10', 'M8203-15-D10', 'M8203-16-D10', 'M8203-17-D10', 'M8203-18-D10')
 ORDER BY 1, 2;

-- R5 · after the apply only (the tables exist from then on): archives and ledger (expect 6 / 91 / 105, of which equations_new 8)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_c4q) AS gate_archive, (SELECT count(*) FROM fields_archive_m820_c4q) AS field_archive,
       (SELECT count(*) FROM m820_c4q_written) AS written, (SELECT count(*) FROM m820_c4q_written WHERE tbl = 'equations_new') AS written_new;
