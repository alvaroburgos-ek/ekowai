-- ============================================================================
-- ROLLBACK — OPTIONS-AS-SELECTION sweep TRANCHE 2 (checklist shape)
-- Restores data_type='text', enum_values=NULL for the 5 converted fields.
-- Guarded on the fields' ids AND symbol AND data_type='json'.
-- Forward script: scripts/options-sweep-tranche2.sql
-- NOTE: any project_parameters.value_json arrays saved while the checklist was
-- live are left in place (value_text stays NULL for those rows); the widget
-- falls back to the "Phase 2" placeholder once enum_values is NULL again.
-- ============================================================================

BEGIN;

-- DWA-M-1200-1 · M12001-10 · indikatorchemikalien_kat1
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = '3c207bbb-8024-42e8-9cf3-060d624d1318'
  AND symbol = 'indikatorchemikalien_kat1' AND data_type = 'json';

-- DWA-M-1200-1 · M12001-10 · indikatorchemikalien_kat2
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = '3f842ab6-fb0f-4578-ad7c-666c8f18f279'
  AND symbol = 'indikatorchemikalien_kat2' AND data_type = 'json';

-- DWA-M-820-2 · 820-2-15 · lph_completed
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = '294b6b7d-1008-4294-8b2f-0f7d89ea110f'
  AND symbol = 'lph_completed' AND data_type = 'json';

-- DWA-M-820-3 · M8203-01 · applicable_lph
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = '9940ec2a-d4fe-4dd7-a9c4-c4d05fee10c4'
  AND symbol = 'applicable_lph' AND data_type = 'json';

-- DWA-A-272E · A272E-13 · criteria_social
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = 'd21b12b4-3238-4db1-a973-780a502fec22'
  AND symbol = 'criteria_social' AND data_type = 'json';

COMMIT;
