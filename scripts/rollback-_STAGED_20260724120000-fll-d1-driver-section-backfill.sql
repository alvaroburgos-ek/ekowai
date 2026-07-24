-- ROLLBACK for STAGED migration _STAGED_20260724120000_fll_d1_driver_section_backfill.sql
-- Reverts the 7 D-1 driver fields back to section_id = NULL (their current prod state).
-- WRITTEN-NOT-APPLIED. Only run if the staged migration was applied and must be undone.

BEGIN;

UPDATE fields SET section_id = NULL
WHERE symbol IN (
  'F_filter','h_filter','swimming_area_m2',
  'attest_fllnt_01_req_03','attest_fllnt_01_req_04',
  'attest_fllnt_12_req_25','attest_fllnt_13_req_28'
)
  AND worksheet_template_id IN (
    SELECT wt.id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'FLL-Naturteich'
      AND wt.code IN ('FLLNT-01','FLLNT-10','FLLNT-11','FLLNT-12','FLLNT-13')
  );

COMMIT;
