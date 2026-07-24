-- ============================================================================
-- STAGED — WRITTEN-NOT-APPLIED — FLL D-1 task 5 (prod data-quality quirk)
-- ----------------------------------------------------------------------------
-- Filename intentionally prefixed `_STAGED_` so the migration runner SKIPS it.
-- This is a PROD WRITE OUTSIDE the D-1 harness-only mandate → per doctrine SR-4
-- it is a STOP-and-batch item: DO NOT APPLY. Batched for Alvaro's controlled
-- apply pass. Rationale + scope in .superpowers/sdd/fll-d1-rerun.md §5.
--
-- WHAT: the D-1 driver fields whose fixture-drift blocked the M2 chains are
--   ACTIVE on prod but carry section_id = NULL (they render section-less). The
--   seeder fix (task 1) mirrors prod exactly incl. this NULL; this migration
--   would OPTIONALLY assign each driver to its worksheet's "C — Worksheet-
--   Specific Content" section so it renders under a heading like its siblings.
--
-- SCOPE OF THIS FILE: ONLY the 7 D-1 driver fields (the harness-mandate set).
--   FLLNT-10: F_filter, h_filter
--   FLLNT-11: swimming_area_m2
--   FLLNT-01: attest_fllnt_01_req_03, attest_fllnt_01_req_04
--   FLLNT-12: attest_fllnt_12_req_25
--   FLLNT-13: attest_fllnt_13_req_28
--
-- NOT IN THIS FILE (flagged to Alvaro, see deliverable §5): the section_id=NULL
--   quirk is MUCH broader on prod (GAR-10/-22/-27, most RHZ worksheets, more
--   FLLNT). Some of those "unsectioned fields" are actually the PHANTOM enum-
--   value rows from separate M2 findings (type_III, emersed, submergent,
--   vertical_continuous_overflow, vertical_no_overflow) which must be DELETED,
--   not sectioned. The broad backfill is a distinct ratification requiring a
--   per-field section decision + phantom-row cleanup — NOT auto-generated here.
--
-- SR-1 note: assigning a section is an encoding-STRUCTURE choice, not a source-
--   quoted numeric value; still ratification-gated because it writes prod.
-- ============================================================================

BEGIN;

-- FLLNT-10 filter-geometry inputs → C
UPDATE fields SET section_id = '335cadb5-1ac2-43cd-9f1f-c94385220f32'
WHERE symbol IN ('F_filter','h_filter')
  AND worksheet_template_id = (
    SELECT wt.id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'FLL-Naturteich' AND wt.code = 'FLLNT-10')
  AND section_id IS NULL;

-- FLLNT-11 EQ-04 driver → C
UPDATE fields SET section_id = 'e79e8818-d375-4ee8-9eec-0c086dfe634a'
WHERE symbol = 'swimming_area_m2'
  AND worksheet_template_id = (
    SELECT wt.id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'FLL-Naturteich' AND wt.code = 'FLLNT-11')
  AND section_id IS NULL;

-- FLLNT-01 attest booleans → C
UPDATE fields SET section_id = 'a0e19b3b-434d-4c62-9968-a883ac27a518'
WHERE symbol IN ('attest_fllnt_01_req_03','attest_fllnt_01_req_04')
  AND worksheet_template_id = (
    SELECT wt.id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'FLL-Naturteich' AND wt.code = 'FLLNT-01')
  AND section_id IS NULL;

-- FLLNT-12 attest boolean → C
UPDATE fields SET section_id = '925bc465-0f2b-410e-b57b-c6edb9579983'
WHERE symbol = 'attest_fllnt_12_req_25'
  AND worksheet_template_id = (
    SELECT wt.id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'FLL-Naturteich' AND wt.code = 'FLLNT-12')
  AND section_id IS NULL;

-- FLLNT-13 attest boolean → C
UPDATE fields SET section_id = 'c7c9d1dc-fbda-4011-9cd9-3f6d93f88aaa'
WHERE symbol = 'attest_fllnt_13_req_28'
  AND worksheet_template_id = (
    SELECT wt.id FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'FLL-Naturteich' AND wt.code = 'FLLNT-13')
  AND section_id IS NULL;

COMMIT;
