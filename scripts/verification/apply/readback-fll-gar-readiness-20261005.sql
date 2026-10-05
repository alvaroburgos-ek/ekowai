-- Read-back for 20261005140000_fll_gar_readiness_fixes.sql (prod-query.mjs, read-only). Run BEFORE the apply (baseline: the hosts below
-- read FLL-GAR-10, REQ-02/03 '== True', REQ-08 '', TAB28 zero rows zulaessig NULL, abdichtungs_art consumers without FLL-GAR-07) and AFTER.
-- Expected after: REQ-13 on FLL-GAR-11 · REQ-14 on FLL-GAR-12 · REQ-15 on FLL-GAR-13 · REQ-16 on FLL-GAR-14 · REQ-19 on FLL-GAR-17 with
-- 'IF abdichtungs_art == fluessigkunststoff THEN attest_fll_gar_10_req_19 == True' · REQ-20 on FLL-GAR-18 · REQ-21 on FLL-GAR-19 with
-- 'IF abdichtungs_art == stahl THEN attest_fll_gar_10_req_21 == True' · REQ-12 still on FLL-GAR-10 · REQ-02 'lbo_genehmigung_erforderlich
-- IS NOT NULL' · REQ-03 'whg_einleitung_genehmigung IS NOT NULL' · REQ-08 'boeschung_steilste_1m >= boeschungsneigung_limit' · REQ-09 ''
-- (unchanged) · REQ-27 'abnahme_datum IS NOT NULL' (unchanged) · severities unchanged (block/warn as before) · attest_fll_gar_10_req_19 on
-- FLL-GAR-17 and attest_fll_gar_10_req_21 on FLL-GAR-19 (section_id NULL as before) · abdichtungs_art consumers =
-- FLL-GAR-10,FLL-GAR-11,…,FLL-GAR-21,FLL-GAR-07 (baseline 2026-10-05 was the ONE literal element 'FLL-GAR-10..21') · TAB28 zero|freiflaeche and
-- zero|schwimmteich zulaessig = 'sonder', fussnote '1'; zero|bauteil_bauwerk unchanged ('sonder').
select 'gate' as kind, w.code as ws, cr.code as item, cr.severity as sev, left(cr.condition, 120) as detail
from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-GAR-2023' and cr.code in ('REQ-02','REQ-03','REQ-08','REQ-09','REQ-12','REQ-13','REQ-14','REQ-15','REQ-16','REQ-19','REQ-20','REQ-21','REQ-27')
union all
select 'field', w.code, f.symbol, coalesce(f.section_id::text, 'section NULL'), 'consumers: ' || coalesce(array_to_string(f.consumer_worksheets, ','), '-')
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-GAR-2023' and f.symbol in ('abdichtungs_art','attest_fll_gar_10_req_19','attest_fll_gar_10_req_21','boeschungsneigung_limit','boeschung_steilste_1m')
union all
select 'table', t.table_code, r.row_key, coalesce(r.row_values->>'zulaessig', 'NULL'), 'fussnote=' || coalesce(r.row_values->>'fussnote', 'NULL') || ' · ' || coalesce(r.row_values->>'hinweis', '-')
from regulation_table_rows r join regulation_tables t on t.id = r.table_id
where t.standard_code = 'FLL-GAR-2023' and t.edition = '2023-12' and t.table_code = 'TAB28' and r.row_key like 'zero|%'
order by 1, 2, 3;
