-- ============================================================================
-- ROLLBACK — OPTIONS sweep TRANCHE 3 (seeded-but-extensible)
-- Restores the pre-tranche state verified via prod lookup before authoring:
--   all 4 rows: data_type='text', enum_values=NULL, validation_rules=NULL.
-- Guarded on id AND symbol (+ data_type='json' for the converted field).
-- Forward script: scripts/options-sweep-tranche3.sql
-- NOTE: any project_parameters.value_json arrays saved while the extensible
-- checklist was live on a138_anlagentyp_kandidaten are left in place
-- (value_text stays NULL for those rows); the widget falls back to the
-- "Phase 2" placeholder once enum_values is NULL again. Text values typed
-- into the suggested-text fields are ordinary value_text rows — unaffected.
-- ============================================================================

BEGIN;

-- DWA-A-138-1 · A138-15 · a138_anlagentyp_gewaehlt (was text + NULL enums)
UPDATE fields SET enum_values = NULL
WHERE id = '922e0c09-7372-43da-b258-baa729f95942'
  AND symbol = 'a138_anlagentyp_gewaehlt' AND data_type = 'text';

-- DWA-A-138-1 · A138-15 · a138_anlagentyp_kandidaten (was text + NULL enums
-- + NULL validation_rules; strip only the extensible key, then collapse an
-- empty object back to NULL so the exact prior state is restored)
UPDATE fields SET
  data_type = 'text',
  enum_values = NULL,
  validation_rules = NULLIF(COALESCE(validation_rules, '{}'::jsonb) - 'extensible', '{}'::jsonb)
WHERE id = 'd52ed064-0a8f-47da-a2e1-e9fa40eae0a9'
  AND symbol = 'a138_anlagentyp_kandidaten' AND data_type = 'json';

-- DWA-M-1200-3 · M12003-05 · kultur_typ (was text + NULL enums)
UPDATE fields SET enum_values = NULL
WHERE id = '6713e298-ea48-463c-a430-5d967318f749'
  AND symbol = 'kultur_typ' AND data_type = 'text';

-- DWA-M-1200-3 · M12003-06 · kultur_typ (was text + NULL enums)
UPDATE fields SET enum_values = NULL
WHERE id = '8048c039-8877-41e9-b526-14647ef70bc7'
  AND symbol = 'kultur_typ' AND data_type = 'text';

COMMIT;
