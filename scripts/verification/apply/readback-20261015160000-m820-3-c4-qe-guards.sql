-- Read-back for scripts/migrations/20261015160000_m820_3_c4_qe_guards.sql (DWA-M 820-3 case C4 F3 / F4). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R4) and AFTER (R0 … R5). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 79_APPLY-ORDER-m820-3-c4-qe-guards.md and the harness tests/harness/m820-3-c4-qe-guards.integration.test.ts. Signatures sig0 come
-- = prod 2026-10-17 (regenerated; was the harness seed: 2026-10-05 dumps + every M820 block up to 20261008100000), sig1 from the harness after the apply.
-- Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de | label_en | is_required | data_type |
-- verification_quote md5 | source_anchor. Gate signature = md5 of condition | severity | description md5 | clause_reference.
-- No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state (before: fields_pre 91, gates_pre 6, *_post 0, new_equations 0 · after: 0 / 91, 0 / 6, new_equations 8;
--      always: totals_widget_ok 8 (widget NULL at sig0 / 'derived' at sig1), foreign_total_equations 0)
WITH fv(ws, sym, sig0, sig1) AS (VALUES
    ('M8203-11','qe62_assessor','119486e04a5ac00f8bbdbae6bd8c1fc3','60f7d2051866bf4de027f1f2efcd9233'),
    ('M8203-11','qe62_assessment_date','cb7a015c0bbab4ddaa27dc169bf87a74','2c7934d615f0dd3b09d1320edf1785ac'),
    ('M8203-11','qe62_fulfilment_pct','9c57fa8ed875a92e918bdc38c88bdccd','2b8e8d9bf2512a99b9f56cfc359fda32'),
    ('M8203-11','qe62_items_y','492ae165dc92e2703096371d5c9fb6f4','a79ef4d7e8a88b7c0a5162b8c6b1049b'),
    ('M8203-11','qe62_items_p','2ee9e893cac23e18537075c71dfa5b55','2d642a485932e65541cb800a9d475e1a'),
    ('M8203-11','qe62_items_n','d8ef1a5fdd701d5b67452fb3efdbcd43','b0420af661a27cb066f3dc0aebcf0f9e'),
    ('M8203-11','qe62_items_na','48422f5c485de9463534801ea1d108f3','edeba4bc33ccb5a4185f48b425f6b2d6'),
    ('M8203-11','qe62_items_total','e0db05161539d822485a48c3bec93edf','4e41eaf4d4b70ff12810bf7c3ef4de4b'),
    ('M8203-12','qe63a_assessor','4cda81e8e5f3981bbf08cca5c85e1881','f0a1ce1e0c2c7cff4e23ff4c68d987ff'),
    ('M8203-12','qe63a_assessment_date','d0d4e7037dccbd263e2d78cb8a4cefcf','890e16918a180e081e2dce433d1cf59e'),
    ('M8203-12','qe63a_fulfilment_pct','31a0d41d223595f5286044336beb1c30','831d20bfbc10181b5f232f30ddb0a075'),
    ('M8203-12','qe63a_items_y','0174cb2e9466e653c9671ac2dba5a6f7','306606549ed76ed893a8d6cdabca94e0'),
    ('M8203-12','qe63a_items_p','0c4f09c997c0b9112523bae73351052d','a085b3d4ba898a48f57ba063e276812d'),
    ('M8203-12','qe63a_items_n','bc2308ebf9eabf5b593d6a07e4eb4969','54b1d29fc2241527dbcb0088e83c459c'),
    ('M8203-12','qe63a_items_na','790f94aefd9f24cbbfb42c63a175ffee','8bdf46753568197d8bc34ecdbbca1488'),
    ('M8203-12','qe63a_items_total','fa904747af497e706b0731a4bf26ae29','81b87567109121f433fee7d51ae9cab2'),
    ('M8203-13','qe63b_assessor','b8d62c397115ef30305b60b9c75eeba2','ee714b1f6eccd532db7470e708dbbd08'),
    ('M8203-13','qe63b_assessment_date','9e37fb5497febc3bc5b82122da504c4c','6e42466aebe7f7174a8893b7737c821c'),
    ('M8203-13','qe63b_fulfilment_pct','565bd1d3e66d1947d1d293fdeaba8e59','e0ec65292bc8be10ecfdd9cf47bc1790'),
    ('M8203-13','qe63b_items_y','4ec5560f0c396304ed58ddb15ff60b6d','9554ac3d04ff04f9926ddc73fa91cca7'),
    ('M8203-13','qe63b_items_p','146a8528ee74681549f8f51dc10908db','3e6e78a4cbaacc13be02ae2fb6f88b1d'),
    ('M8203-13','qe63b_items_n','921db1774ef3fa0284367cbbca9553a3','3eb9d68f90b21644bcfe1d05d9c24c40'),
    ('M8203-13','qe63b_items_na','2af5d8e3cefb18659561bcbfdcf806bf','869ede93bcbbf95ba2cca87f885fb00f'),
    ('M8203-13','qe63b_items_total','a9d01e0cc10883321e30b29fcd6e2960','b79deca28796acb3fcb2052b2a8ae9d4'),
    ('M8203-14','qe64a_assessor','046b8f377f418b7c289bea8e0b52c227','ae63c75aa56b5b8dbcc2b84add59ae89'),
    ('M8203-14','qe64a_assessment_date','850895ae4cab16dc7fe21bf17fd767e5','c1ea9659c1afac6bc37915a4a197854f'),
    ('M8203-14','qe64a_fulfilment_pct','a515b1a9b61db32aaecdc894e8a33fcc','09ac871ced0056357ab7cfc0cc1f542d'),
    ('M8203-14','qe64a_items_y','929e7c015174e83dab8d4e7e5bdc002f','e6dc96a187dd555dd991594f16076d4f'),
    ('M8203-14','qe64a_items_p','44091a189acc31fa50f7829b6cc81a0b','5b5d9cca2c441d3f7cfe9e804075b329'),
    ('M8203-14','qe64a_items_n','738a27260e9b4cbb30758e6074f46cda','5e90c19d764f8d8019826a80368335e2'),
    ('M8203-14','qe64a_items_na','68a23dc0d7cbdf678db3acfe92bedf34','55fb0a99ee44fff78d296ffa3227aaec'),
    ('M8203-14','qe64a_items_total','b77f7dd2eed1569ba1e1e9521baddd14','38a60fa46cf3884466b1f64887c3c06b'),
    ('M8203-15','qe64b_assessor','4866a25772ba52a66ef4d58e7e67ebe3','5028f3404ef5648d12c556447ee4ec4e'),
    ('M8203-15','qe64b_assessment_date','27c95168892fc849dd29515a5b515285','0e1242f7cd1edc917fca18dc9c8d39f8'),
    ('M8203-15','qe64b_fulfilment_pct','59d2d024b187d8dce3f4dbbddf45e506','3d6b09f590647b6d43eb8970690f3a4c'),
    ('M8203-15','qe64b_items_y','9fb0b3cf33fe37deaad71b9349157985','b4ac0562173152020d807345dba4cb84'),
    ('M8203-15','qe64b_items_p','2f48b4380808ff2c71b38eb589ad852f','18bcea6a25f72983933e2f345d1df57f'),
    ('M8203-15','qe64b_items_n','d5c95bca82697442e0bb2b4de68233bc','19a5c57cfa574bfd8d9a8af5a91f733b'),
    ('M8203-15','qe64b_items_na','669bae4e47fbc181047e36ee0f580258','946c44fcfa120dd84ceec19d624c2e58'),
    ('M8203-15','qe64b_items_total','3ad1bb729bb3c6476896f43b4cf3a962','075345e403faf815bb0ab0c5efbb0087'),
    ('M8203-16','qe65_assessor','61c5ac311af844b81b6cf1ab96267bc2','d5b3bc32050f52ef0822679d67d52811'),
    ('M8203-16','qe65_assessment_date','1677c6cded15b5d68b700c9acedb7f90','7c552c5475ba57f327431ebc315dc11f'),
    ('M8203-16','qe65_fulfilment_pct','38d76a1816df0ef220bbb588abeed2fa','7d9fd4395e705c6f2d6d6f2beabc1b3b'),
    ('M8203-16','qe65_items_y','9ada97b267be64380d3c203554f84a5a','e1603da74d413f241760e82235bf5e6a'),
    ('M8203-16','qe65_items_p','2225f4a76cb61a5b06674e5eeb2bb7b6','aee0b625a8e9703e9b52e86f536aa04a'),
    ('M8203-16','qe65_items_n','11502344a32d4ce0db78c13d4a86344e','3c8fc835e95be379ad6d84d51217afe4'),
    ('M8203-16','qe65_items_na','742a797bb33b21320efc9e7d1ddf5dc7','37ca6ccfe39708b92f562b30f8ac806c'),
    ('M8203-16','qe65_items_total','b39870eede800d1aa80ed3bb35e9dbd5','226af56284aff43317c238e7cb70e1e9'),
    ('M8203-17','qe66_assessor','0440b0ccefdd7883803040e717c3f60d','5980136eadb13846e82a2bb869c279ee'),
    ('M8203-17','qe66_assessment_date','566e64eabeff9221d43e2e9e25e93b3c','3085e91f6e25031234a4f3209f37bb0f'),
    ('M8203-17','qe66_fulfilment_pct','3530b5a833b9f349624b341e7b9848de','212f9cc973364681e15f00ec57be3d82'),
    ('M8203-17','qe66_items_y','3f4ff0fe8e35eac898463e41fa324054','e7409be6cf594330457f10a3565353fd'),
    ('M8203-17','qe66_items_p','68b1369ba2862840973e07633ff16d02','0c22abedc269a9bb8b3d27de3a0ba99b'),
    ('M8203-17','qe66_items_n','5add752e0d6e887c1d2e8d1badfc909b','8ecf033df0276fe0c84b388f9ae7555d'),
    ('M8203-17','qe66_items_na','47a367ac9ba7fa0c7364af6b0b0106c2','3bcc9a71891e0081f07daca879197e1e'),
    ('M8203-17','qe66_items_total','2ca08f74237462de4c3ab3ab9a5745f0','473d31c010e52101823abe3de8fa2f05'),
    ('M8203-18','qe67_assessor','d0cf4f07fa7be5bce329446403b7e51a','97120c49a8e6e5ba4de71ef01fe98955'),
    ('M8203-18','qe67_assessment_date','75ad5a0dbd1fc977de96e5f4aa6e3cc2','a199276c427120d0f52560d8a1a8f580'),
    ('M8203-18','qe67_fulfilment_pct','0a43cacf1fcae85c8ab4362306de5630','a4319a4f09ef4ad5b6d2104f860d4620'),
    ('M8203-18','qe67_items_y','847dbb8f03cc00fac9badb38223b8299','a88b898bce87baf8acccf09c93246823'),
    ('M8203-18','qe67_items_p','0836a9e10510edd3eae815e48526a1fc','61efdccff0927f90cd9cd5b6e0498ea0'),
    ('M8203-18','qe67_items_n','b9e5d8a222caa9cea4fd71a0456baef3','539a1eb95607d697e74968321221c611'),
    ('M8203-18','qe67_items_na','05add12331ea61d1863b259b0ab59279','f1f011d0e724ef5de510848c1c95b2fc'),
    ('M8203-18','qe67_items_total','8380679ea7109a8c4e3c95ebb182d007','e70744753dec388b044427c2cfaa84ed'),
    ('M8203-23','gesamt_anhang_b_fulfilment_pct','934b810aa77f232a84e0bb42c0d674e0','383940974fb9b14626f39abfbd71d2f6'),
    ('M8203-23','gesamt_anhang_b_items_total','200e74e9e74ea7cd97e74aa1d7c80b87','863867a9244358de45420985a3abadf9'),
    ('M8203-23','gesamt_anhang_b_verdict','b86fb243b31a2873e5a7c87e269a7629','036b5d1963ffdbe26cf912c90a77487e'),
    ('M8203-11','pz_62_1_status','2c52778614a1ac9e7bbb4d2a83f9d84d','5369b45fd2888bbd8c9171e7cd5c6e74'),
    ('M8203-13','pz_63_1_status','74baf81a901f72825becde357b57a4b2','07915ec15e25c070f3414dd1fd2f050a'),
    ('M8203-15','pz_64_1_status','210a7c5ed8bd705032716fdc720774d0','0a3f70c78add46e18737e918c5e71427'),
    ('M8203-16','pz_65_1_status','312cc2e660fc379e553137c5e2aec5dc','c33ac119a04b3d38c29bc5c6e5f6eb56'),
    ('M8203-17','pz_66_1_status','39e3ec2dfc598ae1c6db20be7939f941','e7d2e2086b67df3c384ea238757d419a'),
    ('M8203-18','pz_67_1_status','541bc6bfbac9ac7dde82f20fbdfae5f5','244bfeff58ba3f137441e9f17e342fbe'),
    ('M8203-13','pz_63_2_status','57c0e3f217f13a28973fe876da53a14a','342e09a1940f26080a205a6e87dcc212'),
    ('M8203-13','pz_63_3_status','6a0660fff0204bde68c97e7e977eca88','4156202ef5f357d214c7647ae8918c6a'),
    ('M8203-13','pz_63_4_status','8b2aafc5cbc89d2783b66c3a05c685cf','f181bc91349899c4fcc4b51456522f2c'),
    ('M8203-13','pz_63_5_status','0c7122a98b9190935a9a382c46ffa6a6','df221f0c41ff76473c6ff58b9b63a8ec'),
    ('M8203-13','pz_63_6_status','d13d076c392074690e20f11174f49a5e','4f3e3323bbc855167fc9a402f15ca6ec'),
    ('M8203-13','pz_63_7_status','76df83f6c3e24c29a990b897ec98abab','bf487f9b5b324bf7b78ffb21b62a48da'),
    ('M8203-13','pz_63_8_status','b3d5ff65fbf3ce29c7112b2395358cb9','0fae1d6d60d523c9777f770180bbe215'),
    ('M8203-15','pz_64_2_status','a91dfdf10afdb829d6cdc3cf978fad46','cf4f2df5d9447b260f32b4d42e36fdf6'),
    ('M8203-15','pz_64_3_status','b192c4374ebfe60d1f2c570ea4c50f97','52fac5b08cdbdd88df1f19f3a21a59b0'),
    ('M8203-15','pz_64_4_status','bc999ed60a2f08f14655737870b66d9a','74689dc2c1437acdf7824c63fb479526'),
    ('M8203-15','pz_64_5_status','e105d2005551a7264b6e249a5a69743e','aab9f483542fbda1f6f67e5cf50fe9ad'),
    ('M8203-15','pz_64_6_status','7fe0342bacb33ae688b6754961eadab6','18982abfbf7d950a6cc3d364a9dbf9bc'),
    ('M8203-15','pz_64_7_status','a205b5b157c794eb3021e8d916d2905d','d1ec5aee3d1482f6cccdab83a54f6de9'),
    ('M8203-15','pz_64_8_status','2a7bb5ff86d3dd42239139c87f859bdc','cbe6837046a9cef4a92a05fe2d793549'),
    ('M8203-15','pz_64_9_status','921bf6de3ff8e181a241dc6a7ab5cae2','1a578e5da025ab1f6b1a59fb38ba90ae'),
    ('M8203-15','pz_64_10_status','3f0624e3a72be0479dc14f63e6acdd5c','77123729bd10e1e8ba9a0a74216b2c44'),
    ('M8203-15','pz_64_11_status','4d3e16f2f7302c25993c7309f7338507','f5c44587ff0a785f55a5048b5132e48d'),
    ('M8203-15','pz_64_12_status','27fff349c17311f3193cd998b5d38c16','2af045a2ea95f929b5f1862d503de27a')),
gv(ws, code, sig0, sig1) AS (VALUES
    ('M8203-11','REQ-19','ed2fb49573e966c41cc5b9374fd9bc7f','370f53bb5c00f727e091327f0e5b179c'),
    ('M8203-16','REQ-22','54bca979b5e9e0958c8125a5b4fef16b','4393d848a81e6fadca20a35083e47241'),
    ('M8203-17','REQ-23','bb7c290b8b639c6c434809a37c64023d','3b4a0c9e543a767a6f651ada055e91e4'),
    ('M8203-18','REQ-24','bae5af06eba8f76ad1064cfa28d0584c','5f852e7c3ef60a940c336b6405ad7ad3'),
    ('M8203-23','REQ-20','86bd6d2125084117ae7db0f6bd875a10','036de3dff45981fa8672f6a039f8aa9f'),
    ('M8203-23','REQ-21','b624a3dee23aa7599ce6bfb49a1d98c1','881dd28e15e1fc98a9dd0aa74a0f3c08')),
tv(ws, sym, eqno, formula, sig0, sig1) AS (VALUES
    ('M8203-11','qe62_items_total','M8203-11-D10','qe62_items_total = 15','e0db05161539d822485a48c3bec93edf','4e41eaf4d4b70ff12810bf7c3ef4de4b'),
    ('M8203-12','qe63a_items_total','M8203-12-D10','qe63a_items_total = 21','fa904747af497e706b0731a4bf26ae29','81b87567109121f433fee7d51ae9cab2'),
    ('M8203-13','qe63b_items_total','M8203-13-D10','qe63b_items_total = 19','a9d01e0cc10883321e30b29fcd6e2960','b79deca28796acb3fcb2052b2a8ae9d4'),
    ('M8203-14','qe64a_items_total','M8203-14-D10','qe64a_items_total = 17','b77f7dd2eed1569ba1e1e9521baddd14','38a60fa46cf3884466b1f64887c3c06b'),
    ('M8203-15','qe64b_items_total','M8203-15-D10','qe64b_items_total = 33','3ad1bb729bb3c6476896f43b4cf3a962','075345e403faf815bb0ab0c5efbb0087'),
    ('M8203-16','qe65_items_total','M8203-16-D10','qe65_items_total = 34','b39870eede800d1aa80ed3bb35e9dbd5','226af56284aff43317c238e7cb70e1e9'),
    ('M8203-17','qe66_items_total','M8203-17-D10','qe66_items_total = 10','2ca08f74237462de4c3ab3ab9a5745f0','473d31c010e52101823abe3de8fa2f05'),
    ('M8203-18','qe67_items_total','M8203-18-D10','qe67_items_total = 6','8380679ea7109a8c4e3c95ebb182d007','e70744753dec388b044427c2cfaa84ed')),
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
