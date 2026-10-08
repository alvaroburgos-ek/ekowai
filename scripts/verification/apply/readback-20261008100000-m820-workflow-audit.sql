-- Read-back for scripts/migrations/20261008100000_m820_workflow_audit.sql (DWA-M 820 workflow improvements from the Forscheln audit). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R3) and AFTER (R0 … R4). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 63_APPLY-ORDER-m820-workflow-audit.md and the harness tests/harness/m820-workflow-audit.integration.test.ts. Signatures sig0 were taken
-- from the LIVE rows (prod-query 2026-10-08, 63 fields + 14 gates all equal) and sig1 from the harness after the apply.
-- Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de | label_en | is_required | data_type.
-- Gate signature = md5 of condition | severity | description md5 | clause_reference. No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state (before: fields_pre 63, gates_pre 14, *_post 0 · after: 0 / 63 and 0 / 14)
WITH fv(std, ws, sym, sig0, sig1) AS (VALUES
    ('DWA-M-820-1','M820-11','leistungswettbewerb_only','7eb40a57f59b9dfebe8e1ac5f92e62fc','39e664c0c9dbda4e11723936c83b138c'),
    ('DWA-M-820-1','M820-11','qualitaets_kriterien_anzahl','36d094ae9f1aabef8ed8b5749f7b8e0a','a1762612ddd78e320af9c335a27bca3e'),
    ('DWA-M-820-1','M820-13','min_annual_revenue_multiplier','9b18c22f4134b0c7581cf030b5eae93f','b16ec9d6bd4541b468c30e75db7b5502'),
    ('DWA-M-820-1','M820-13','large_long_project','270c0a78c3a286a703db7bce44b0163f','68f352f0ab7e8fdc1c466b3ceca9510e'),
    ('DWA-M-820-1','M820-13','reference_period_years','4b2170ad6c248e9e83bb507da5779f14','029877f118e59e87798c879d9d55a884'),
    ('DWA-M-820-1','M820-13','references_required_count','4a570ac55943e2497a63b20c85785bbe','d698695f56aa7370177a90ba49506491'),
    ('DWA-M-820-1','M820-13','min_personnel','158defbbf998a1d831e835c56c3196e6','02c7bfaceddecb7001d27f819e21f42b'),
    ('DWA-M-820-1','M820-13','social_criteria_included','c0a814f73b28af9f23d41d005b954949','a455b9c7e2e045b49dd4390665f55b80'),
    ('DWA-M-820-1','M820-13','min_annual_revenue_multiplier_max','959fde146a839b1ac51f1a5a6eeb6c4b','77ce9d260337d55fd0d55ff54ef1d0f0'),
    ('DWA-M-820-1','M820-13','min_annual_revenue_multiplier_ok','caa8e50635e9c7abbb09c8ffc8dad4c9','ba172d813feb4fc659de24238ba7e513'),
    ('DWA-M-820-1','M820-14','award_criteria_list','1f9fea1fd21da0e840d4154088f56c95','a74a557480ff91134104d5a019f26032'),
    ('DWA-M-820-1','M820-14','schluesselpersonal_count','812c40b1e49246f5d0f43f9c3547d3e5','e3573b076103645959f3e69cbb75a858'),
    ('DWA-M-820-1','M820-14','price_weight_percent','ad7765d9d09e0cfada71826967bda7d3','ae0036c560eb05a68f4ee743477a7b71'),
    ('DWA-M-820-1','M820-14','festpreis_used','4c419cf86a61af0f8dbb027e6c80b326','0b198175f45d15d836147306d43fffc3'),
    ('DWA-M-820-1','M820-14','doppelbewertungsverbot_check','632a2e44c00e2a6438f06515b7cb6200','838014fd390d7aa3f6cef63bf40d6e4e'),
    ('DWA-M-820-1','M820-14','award_weight_sum_pct','f359e99910dbe6d70195098cabd7011a','99cbef3bc6f784a40add0f1117d880d8'),
    ('DWA-M-820-1','M820-14','price_weight_calc_pct','3f6d378cdf67ff7173a0778c9956b9a4','cdc132b4e24a16f3d154ab9e3d76c0d2'),
    ('DWA-M-820-1','M820-14','qualitaets_kriterien_count','41cc21c5a53893359d0bd35bbb6da942','9aa6367d8c981e379e3bc083f11636c2'),
    ('DWA-M-820-1','M820-15','bewerbungsbedingungen_complete','f73e601a8fadf2b11e036133da3a1f76','6b2ef021532cf5c8b42724628889ec80'),
    ('DWA-M-820-1','M820-15','eignungskriterien_dokumentiert','2f510f190ad1926a48796008819952b3','a19c871087f4d9f41d64ea7d55d3fa24'),
    ('DWA-M-820-1','M820-16','bewertungskommission_members','63ebcd78b526b79e0c18452b1451df17','b9dad50aa4b43232ef58af8c7ab498ff'),
    ('DWA-M-820-1','M820-16','bewertungskommission_constituted','dec83e0c9a1ee7d26e79f23e163ba497','17e83051b106e4dd15cc12bc0b9ef1f0'),
    ('DWA-M-820-1','M820-16','bewertungskommission_size','150bb3d7b03f1c360ca0409f5831bede','702c17b0be41e215b54bcea0eb34f31a'),
    ('DWA-M-820-1','M820-16','bewertungskommission_chairperson','e74493a73aa17ee617c5fe510896db88','ec59a3b0b3b0ef498f11e9ade815298c'),
    ('DWA-M-820-1','M820-16','kommission_constitution_date','4107c8848ac5a37d6372b50f92386922','b6b28f653b820a7ed37882abc10d8a8b'),
    ('DWA-M-820-1','M820-16','bewertungskommission_size_calc','0f7bf5bb79e3215272a0b62f39ef5ed2','6969b7c2932b585fa2f3baf89acc8b8e'),
    ('DWA-M-820-1','M820-16','bewertungskommission_vorsitz_count','37bd0a8b5ababbd63172f534e744391e','faf6b0fc9b65db88dad6dca8d82ee813'),
    ('DWA-M-820-1','M820-16','bewertungskommission_stimmberechtigt_count','9e6fa39f0d25491a26cde0cd241ef042','bda466e30a24b8d1d693aa41bedaba85'),
    ('DWA-M-820-1','M820-16','bewertungskommission_ungerade_code','03b3a4a4f4104670697ce2081d114188','5e6cefc21a34149b404455a2025ca6fc'),
    ('DWA-M-820-1','M820-17','submission_deadline','a3de2b4496792944f46b445c50da629a','54d468155cdce67c4bf2ed83850a2725'),
    ('DWA-M-820-1','M820-17','ted_notice_id','99d3fd91dabed2849f497e5d33b4979e','8f165b6f76b57f92a044fcef87d09ffc'),
    ('DWA-M-820-1','M820-18','applicant_count','e69c7ec83446592d6e4497e7436d8b27','3d9cc57795436d6fa0d30f18da74b0b1'),
    ('DWA-M-820-1','M820-18','shortlisted_count','8a4c4dbfb1c5c81db76986ad9eb2a1cb','922abf1851abda88143f9db60417eb7d'),
    ('DWA-M-820-1','M820-19','final_offers_count','d44f0041a8bfe05dab7abb24b6280fc6','4ea90a72a341d99b27a60911c35dcbfe'),
    ('DWA-M-820-1','M820-19','bewertungs_kriterien_dokumentiert','e0764357980a9f92e1785a6c0aa13b8b','eeb64ee3ba3dc44b521edca65c8afb8d'),
    ('DWA-M-820-1','M820-19','preisbewertung_durchgefuehrt','744a699637671bba2744f68ed983d499','2a67b867ef4371c57056ccc78e847e06'),
    ('DWA-M-820-1','M820-19','qualitaetsbewertung_durchgefuehrt','0f12dcec5bcb5f9ccc87dac6b7c0fe47','c7ea3f9c0918cdbe3ccf92079b8fd80e'),
    ('DWA-M-820-1','M820-19','evaluation_summary_date','316d7c96866245f36c9032389e2c55f0','e5709442e71232693118bc15ffdd0f17'),
    ('DWA-M-820-1','M820-10','procurement_procedure','ddffabfc145df4250ee14d5035fe7c29','11b7988015133a1ee9a111e704c59b10'),
    ('DWA-M-820-1','M820-04','alternatives_considered','5adf8678ad5c880f10832a00b393e90e','9a0d61e9effb7bf8e109b36823b26d83'),
    ('DWA-M-820-1','M820-04','quality_targets_konzept','c945d0a586c669e8cf2b7efa6b181dc6','74aca9e4f0077622e09ccd0c3424b196'),
    ('DWA-M-820-1','M820-04','bedarfsplanung_konzept_complete','02e39315d96decc64c65916fc34e0e71','190fb68f72b912da1bcd37370482ab0d'),
    ('DWA-M-820-1','M820-04','date_bedarfsplanung_complete','d1a787a12f913b07110e390c8965daa7','24ff06adc1d3f442b04ccf5f2636e7ee'),
    ('DWA-M-820-1','M820-01','project_type','ce783d4360e2a0d2dd14ef8ec51fa8bb','73d29e3abb833b96ce0e5b7b148757a7'),
    ('DWA-M-820-1','M820-01','sector','5bb6401c2c073ffb190637432a21b636','89af21d4693d1d2ba42e291c84cdcc43'),
    ('DWA-M-820-1','M820-05','bedarfsplanung_projekt_complete','7a7d4d089830ea8d43c0819568833e94','93595ce5fce8d72a128d009ad079767f'),
    ('DWA-M-820-1','M820-04','aufgabenbeschreibung_eindeutig','455fb6806fb22adaa7600f29e6a30b9f','7dc0a353a6e546a7f97115e3ef36034a'),
    ('DWA-M-820-2','820-2-11','framework_conditions_clarified','f4ba72c3be2f2459fbde6a786af40405','820494d6f36ca201e9988a98b2c07aa0'),
    ('DWA-M-820-3','M8203-11','pz_62_1_status','8c29edf8101787bdfe513e4234347d6b','417db6dc62858eb28a8426617f39cf1d'),
    ('DWA-M-820-2','820-2-08','cost_planning_din276','ea06a47e5a95e06b720f9a779fabe30f','4e0a47773b6cd0080f53595ace9f6f8a'),
    ('DWA-M-820-2','820-2-05','mgmt_cycle_frequency','1a47441822a439d434366071c1614115','b555b6b082a420a37000984c326ec20a'),
    ('DWA-M-820-2','820-2-14','public_relations_strategy','36b880f63750c0b7a9cdffce7dd9ebac','35cb700d274998ef9df00db1a3bd886e'),
    ('DWA-M-820-2','820-2-20','quality_supervision_active','18777436517485395960dab4afe403a3','99ac12bfe7cbf4290e0e169c73367d1f'),
    ('DWA-M-820-2','820-2-21','oeffentlichkeitsarbeit_durchgefuehrt','1b47104553e5f6c1138d90de59bbfd9f','d6772c57c49e62a69d6c771217e30c9b'),
    ('DWA-M-820-2','820-2-22','abnahme_per_bild4','7f50572dbbc27ef965d831f78258e5c4','6f2dd65ecf9e257e4cec4f40a16f894a'),
    ('DWA-M-820-2','820-2-23','training_complete','931e9e1e6c72e484350e0b508e0fd750','6205c7ed5733fc0f33f6530e1ef44036'),
    ('DWA-M-820-2','820-2-23','operating_manuals_complete','711f4cb2dfb7028391c3a572e53870be','b19551646559b5a5a6524cbcd81a3114'),
    ('DWA-M-820-2','820-2-24','warranty_start_date','ab6a8067dda0be650f30774c70d3e5d1','d17bc521ba86d9352f8007c497fc0634'),
    ('DWA-M-820-2','820-2-24','warranty_end_date','cacfe8783eeff38fc1a55933c4e27bbf','f3580809c1e205fe296a6fce622e6cc6'),
    ('DWA-M-820-2','820-2-24','defect_tracking_active','5d4db95c0b8c77f4eddea5b62140682e','d68719ecc0d3afca7e52f58df8f57439'),
    ('DWA-M-820-2','820-2-24','gewaehrleistungen','f59774f637bbbbc3c769cc32890a7872','7c4e3e2d6913aa5d4437515e5a2bb22d'),
    ('DWA-M-820-2','820-2-24','warranty_count','81760e5cf9d0e24b8ecd57e13250ef2d','2423b230d1302a5c37921884e758bf59'),
    ('DWA-M-820-2','820-2-24','warranty_open_defects','5765787092758ac252b43a93b44621b6','ffc31472d14f8ed6498bd854e2d1c8b7')),
gv(std, ws, code, sig0, sig1) AS (VALUES
    ('DWA-M-820-1','M820-01','REQ-01','80d3f958e6b43bf99e8ed68e64c5b634','6095e56cc675be6a7a87b7b17f9e232e'),
    ('DWA-M-820-1','M820-04','REQ-02','25b02c39e0dc7acddb4e88219b199c59','8ed4040ab638af0565aa05203678b075'),
    ('DWA-M-820-1','M820-11','REQ-17','75b121109905bb9e12fa59d7cea7b8b0','42413283bb8a62769ec82f037833d39d'),
    ('DWA-M-820-1','M820-13','REQ-12','bf4ab9222aa1b79fded26b42f8c97dc0','cd6571b8536c5dcbc03ce76ebb292ecf'),
    ('DWA-M-820-1','M820-14','REQ-15','cf202c8275e36bb9575a4c5db04f86d6','63725e801f3eb4c810f23615354f874c'),
    ('DWA-M-820-1','M820-14','REQ-16','9b5e5dbc120aad8a88ce37d2d3643139','4ef7a626dd26d880f5ff281bbf9aaf1d'),
    ('DWA-M-820-2','820-2-08','REQ-12','ed6b5541379f72930e0c45f278f61815','82c591f0609f91d335523271bb136254'),
    ('DWA-M-820-2','820-2-14','REQ-33','2b8cf207e2905528278abab99d5c6b2a','0c5c72f686f1ea6f6723cec647280375'),
    ('DWA-M-820-2','820-2-20','REQ-43','712c58e9752dd179d9231851373be46b','38e5006956a38b218e7db7c774e64fbd'),
    ('DWA-M-820-2','820-2-22','REQ-47','b30bdde45f5da70385c477708cd34052','f0346c95378121b5a47ad12beab5565c'),
    ('DWA-M-820-2','820-2-23','REQ-48','1b7661ee6283cba300b3e8e0406d5e2d','959aab0d4d32dd4850b1aca4bdf98e66'),
    ('DWA-M-820-2','820-2-23','REQ-49','280e50679a52cc66d2c94aeb93e42b76','62aace75e958d19961a35cd4fad47e40'),
    ('DWA-M-820-2','820-2-24','REQ-51','0b4c97b02f219454f2365c0f56a2aec5','21f6461340956ed21f2a7d7ade04b746'),
    ('DWA-M-820-2','820-2-24','REQ-52','ae9c338958d85bd38ac0fa05f1a52f03','8285f9656313650117012ae9e7925ffd')),
fl AS (SELECT fv.*, md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type)) AS sig
         FROM fv JOIN standards s ON s.code = fv.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fv.ws
         JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = fv.sym AND f.active),
gl AS (SELECT gv.*, md5(concat_ws('|', coalesce(cr.condition,''), cr.severity, md5(coalesce(cr.description,'')), coalesce(cr.clause_reference,''))) AS sig
         FROM gv JOIN standards s ON s.code = gv.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = gv.ws
         JOIN compliance_requirements cr ON cr.worksheet_template_id = w.id AND cr.code = gv.code)
SELECT (SELECT count(*) FROM fl) AS fields,
       (SELECT count(*) FROM fl WHERE sig = sig0) AS fields_pre,
       (SELECT count(*) FROM fl WHERE sig = sig1) AS fields_post,
       (SELECT count(*) FROM gl) AS gates,
       (SELECT count(*) FROM gl WHERE sig = sig0) AS gates_pre,
       (SELECT count(*) FROM gl WHERE sig = sig1) AS gates_post,
       (SELECT string_agg(ws || ' ' || sym, ',') FROM fl WHERE sig <> sig0 AND sig <> sig1) AS fields_neither,
       (SELECT string_agg(ws || ' ' || code, ',') FROM gl WHERE sig <> sig0 AND sig <> sig1) AS gates_neither;

-- R1 · the 5 new fields (before: 0 rows · after: 5 rows, all active)
SELECT w.code AS ws, f.symbol, f.data_type, f.is_required AS req, coalesce(array_to_string(f.consumer_worksheets, ','), '') AS consumers, coalesce(f.visible_when, '') AS visible_when
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-2' AND f.symbol IN ('weitere_regelwerke', 'oeffentlichkeitsbeteiligung_vorgesehen', 'phase_ausfuehrung_erreicht', 'phase_inbetriebnahme_erreicht', 'phase_gewaehrleistung_erreicht') AND f.active
 ORDER BY 1, 2;

-- R2 · the 14 touched gates: severity and condition (severities never change)
SELECT w.code AS ws, cr.code, cr.severity AS sev, cr.condition
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE (w.code, cr.code) IN (('M820-01','REQ-01'), ('M820-04','REQ-02'), ('M820-11','REQ-17'), ('M820-13','REQ-12'), ('M820-14','REQ-15'), ('M820-14','REQ-16'), ('820-2-08','REQ-12'), ('820-2-14','REQ-33'), ('820-2-20','REQ-43'), ('820-2-22','REQ-47'), ('820-2-23','REQ-48'), ('820-2-23','REQ-49'), ('820-2-24','REQ-51'), ('820-2-24','REQ-52'))
 ORDER BY 1, 2;

-- R3 · any time: saved project values the rollback would delete (new fields) or leave without a token (wasserwirtschaft, anlassbezogen)
SELECT p.name AS project, w.code AS ws, f.symbol, coalesce(pp.value_enum, pp.value_text, pp.value_boolean::text, left(pp.value_json::text, 60)) AS value
  FROM project_parameters pp JOIN projects p ON p.id = pp.project_id JOIN fields f ON f.id = pp.field_id
  JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE (s.code = 'DWA-M-820-2' AND f.symbol IN ('weitere_regelwerke', 'oeffentlichkeitsbeteiligung_vorgesehen', 'phase_ausfuehrung_erreicht', 'phase_inbetriebnahme_erreicht', 'phase_gewaehrleistung_erreicht'))
    OR (s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'sector' AND 'wasserwirtschaft' IN (coalesce(pp.value_enum, ''), coalesce(pp.value_text, '')))
    OR (s.code = 'DWA-M-820-2' AND w.code = '820-2-05' AND f.symbol = 'mgmt_cycle_frequency' AND 'anlassbezogen' IN (coalesce(pp.value_enum, ''), coalesce(pp.value_text, '')))
 ORDER BY 1, 2, 3;

-- R4 · after the apply only (the tables exist from then on): archives and ledger (expect 14 / 63 / 77)
SELECT (SELECT count(*) FROM compliance_requirements_archive_m820_wa) AS gate_archive, (SELECT count(*) FROM fields_archive_m820_wa) AS field_archive,
       (SELECT count(*) FROM m820_wa_written) AS written;
