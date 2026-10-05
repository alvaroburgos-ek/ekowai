-- Rollback of scripts/migrations/20261005120000_m820_1_client_route.sql (DWA-M 820-1 client route).
-- Scoped: every statement restores ONLY a row that still carries exactly what the block wrote (from the in-transaction
-- archives fields_archive_m820_1_client_route / compliance_requirements_archive_m820_1_client_route); a row edited since
-- the apply is left alone and shows up in the read-back. Restored archive rows are deleted; the archive tables stay.
-- BEFORE running: read-back query R6 counts saved project values that use the two new client tokens — after the rollback
-- those values are no longer in the enum (they stay stored; the owner decides whether to re-select them).
-- Run: node scripts/apply-migration.mjs scripts/rollback-20261005120000-m820-1-client-route.sql
BEGIN;

-- 4⁻¹. gate conditions back to the archived text where the guarded text is still live
UPDATE compliance_requirements cr
   SET condition = a.condition
  FROM compliance_requirements_archive_m820_1_client_route a, worksheet_templates w, standards s
 WHERE a.id = cr.id AND a.code IN ('REQ-07','REQ-08','REQ-10','REQ-22','REQ-26')
   AND w.id = a.worksheet_template_id AND w.code IN ('M820-04','M820-10','M820-12','M820-23') AND s.id = w.standard_id AND s.code = 'DWA-M-820-1'
   AND cr.condition IN (
     'IF (client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) THEN ((IF estimated_engineering_fee >= eu_threshold_value THEN threshold_status == ''oberschwellig'') AND (IF threshold_status == ''oberschwellig'' THEN estimated_engineering_fee >= eu_threshold_value))',
     'IF (client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) THEN (IF oberschwellig_check == true THEN procurement_procedure == ''vgv_f'')',
     'IF (client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure == ''vgv_f'' THEN (exclusion_123_gwb_checked == true)',
     'IF (client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND threshold_status == ''oberschwellig'' THEN (information_letters_sent == true AND ((electronic_transmission == true AND standstill_period_days >= 10) OR (electronic_transmission == false AND standstill_period_days >= 15)))',
     'IF (client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND threshold_status == ''oberschwellig'' THEN (information_letters_sent == true AND contract_invalidity_135_gwb_risk == false)');
DELETE FROM compliance_requirements_archive_m820_1_client_route a USING compliance_requirements cr
 WHERE cr.id = a.id AND cr.condition = a.condition;

-- 5⁻¹. visible_when back to the archived value where the block's rule is still live (plain or composed form)
UPDATE fields f
   SET visible_when = a.visible_when
  FROM fields_archive_m820_1_client_route a
 WHERE a.id = f.id AND f.symbol IN ('publication_date','required_standstill_days','standstill_period_days')
   AND f.visible_when = CASE WHEN a.visible_when IS NULL
         THEN '(client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure == ''vgv_f'''
         ELSE '(' || a.visible_when || ') AND ((client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure == ''vgv_f'')' END;

-- 3⁻¹. consumer reach back to the archived array where it still equals archive || the codes the block appended
UPDATE fields f
   SET consumer_worksheets = a.consumer_worksheets
  FROM fields_archive_m820_1_client_route a
 WHERE a.id = f.id AND f.symbol IN ('client_organization_type','procurement_procedure','threshold_status')
   AND f.consumer_worksheets = COALESCE(a.consumer_worksheets, '{}'::text[])
       || ARRAY(SELECT u.c FROM unnest(CASE f.symbol
                   WHEN 'client_organization_type' THEN ARRAY['M820-04','M820-10','M820-12','M820-17','M820-23']::text[]
                   WHEN 'procurement_procedure'    THEN ARRAY['M820-12','M820-17','M820-23']::text[]
                   ELSE                                 ARRAY['M820-04','M820-23']::text[] END) WITH ORDINALITY AS u(c, o)
                 WHERE NOT (u.c = ANY (COALESCE(a.consumer_worksheets, '{}'::text[]))) ORDER BY u.o);

-- 1⁻¹. enum back to the archived array where it still equals archive || the two appended tokens
UPDATE fields f
   SET enum_values = a.enum_values
  FROM fields_archive_m820_1_client_route a
 WHERE a.id = f.id AND f.symbol = 'client_organization_type'
   AND f.enum_values = a.enum_values || '[{"value":"privat_ohne_foerderung","label_de":"Privater Auftraggeber ohne Fördermittel","label_en":"Private client without public funding","order_index":7,"regulation_reference":"§7.2"},{"value":"privat_mit_foerderung","label_de":"Privater Auftraggeber mit Fördermitteln","label_en":"Private client with public funding","order_index":8,"regulation_reference":"§7.2"}]'::jsonb;

DELETE FROM fields_archive_m820_1_client_route a USING fields f
 WHERE f.id = a.id
   AND f.enum_values IS NOT DISTINCT FROM a.enum_values
   AND f.consumer_worksheets IS NOT DISTINCT FROM a.consumer_worksheets
   AND f.visible_when IS NOT DISTINCT FROM a.visible_when;

-- 2⁻¹. the new decision field and its saved values
DELETE FROM project_parameters p USING fields f, worksheet_templates w, standards s
 WHERE p.field_id = f.id AND f.worksheet_template_id = w.id AND w.standard_id = s.id
   AND s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'vergaberecht_freiwillig_angewendet';
DELETE FROM fields f USING worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id
   AND s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'vergaberecht_freiwillig_angewendet';

COMMIT;
