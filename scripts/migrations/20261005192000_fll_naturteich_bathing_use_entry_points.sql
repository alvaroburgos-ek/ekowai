-- FLL-Naturteich · follow-up of block 20261005190000 (ornamental pond without bathing). Re-drive 2026-10-05 (OBS-1 in
-- _parts/redrive-forscheln-exception-2026-10-05.md): REQ-39 "at least one entry / exit point in the swimming area (§ 9.5.3)" on
-- FLLNT-07 still applied to an ornamental pond. § 9.5.3 is a swimming-area construction requirement — the same class the block hid on
-- FLLNT-06 (§ 9.5.1–9.5.3 attestation). Fix: the count field entry_exit_point_count shows only for bathing_use == 'swimming_pool'; REQ-39
-- then reads not applicable for an ornamental pond (hidden-term rule). Condition and severity unchanged. Idempotent.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005192000_fll_naturteich_bathing_use_entry_points.sql
-- Rollback: scripts/migrations/rollback-20261005192000_fll_naturteich_bathing_use_entry_points.sql
BEGIN;
UPDATE fields f SET visible_when = 'bathing_use == ''swimming_pool'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-07' AND f.symbol = 'entry_exit_point_count'
   AND f.visible_when IS NULL;
COMMIT;
