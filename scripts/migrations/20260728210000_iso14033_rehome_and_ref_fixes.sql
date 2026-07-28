-- SOURCE-SETTLED FIXES — ISO-14033:2019. Four sections, all source-settled, all guarded per-row.
-- std_id fe3a798b-f09f-4929-9400-cdb321a9fa68. Rollback: scripts/rollback-20260728210000-iso14033.sql
--
-- SECTION 1 — mis-homed WARN gate re-home (dead-reference class c; settled warn-split, waves 14/15).
--   Each CR's operand field(s) live on a different worksheet than the CR; worksheet-local lookup ⇒
--   silent pending/fail. All warn → zero enforcement change. Operand homes (prod query this session):
--     CR-005 data_origin_category  -> ws02   CR-008 principle_* (all 8) -> ws03
--     CR-006 measurement_method    -> ws02   CR-019 parameter_value/activity_data/emission_removal_factor -> ws06
--     CR-007 metadata_supplied     -> ws02
--   REPRODUCTION (real evaluateCondition, this session): CR-005 absent→pending/present→pass;
--   CR-006 absent→FAIL(red)/present→pass; CR-007 absent→pending/present→pass; CR-008 absent→pending(8)/
--   all-true→pass; CR-019 absent→pending / consistent→pass / inconsistent→fail. Broken→works each.
--   (CR-003 is genuinely cross-sheet — one operand on ws01, one on ws03 — NOT re-homed here → ruling.)
--
-- SECTION 2 — §6.2.3 misattribution (dead-reference class c). The activity-data × emission/removal-
--   factor multiplication is NOT at §6.2.3; its printed home is INFORMATIVE Annex A.2.4 c) 1) (p.23),
--   with normative basis §6.1.2.2.4 (p.11) — verified against the rendered pages this session. The
--   equation row, the field emission_removal_factor, and CR-019 all carry the wrong §6.2.3 anchor.
--
-- SECTION 3 — ws03 factual count: description says "ten guiding principles" but enumerates NINE and
--   the standard prints nine (Clause 5.2–5.10). "ten" → "nine".
--
-- SECTION 4 — ws06 description: corrects the wrong clause "6.2.3 c) 1)" → "informative Annex A.2.4
--   c) 1)" and drops the false claim that this is "the only quantitative relationship stated in
--   normative text" (it is an informative annex example). Verified vs the printed pages.
DO $$
DECLARE v int := 0; t int := 0;
  ws01 uuid := '3ebd246e-4d04-4ef3-ba68-28317b414706';
  ws02 uuid := '7c293982-3ada-4314-b8eb-8f58d553a5f9';
  ws03 uuid := '79a1599b-101b-431c-9d33-efefcdfd41b1';
  ws05 uuid := 'ec1fb3e0-40b8-44e7-984b-53c2fd276fca';
  ws06 uuid := '89f020cc-2c1a-4a20-aa3e-0c552db50ff4';
  new_ref text := '§6.1.2.2.4, Annex A.2.4 c) 1)';
BEGIN
  -- SECTION 1
  UPDATE compliance_requirements SET worksheet_template_id = ws02
   WHERE id IN ('6bb447d9-6438-46d4-b020-299221dd6735','a3eb3686-f69f-4c78-a6a7-a2d2435559fa','efab6699-50c4-45e7-8986-5d4aed9ae638')
     AND worksheet_template_id = ws01;
  GET DIAGNOSTICS v = ROW_COUNT; t := t + v; RAISE NOTICE 'CR-005/006/007 -> ws02: %', v;
  UPDATE compliance_requirements SET worksheet_template_id = ws03
   WHERE id = '58a6c899-24ea-4501-8e34-d8b3d67a7dc1' AND worksheet_template_id = ws01;
  GET DIAGNOSTICS v = ROW_COUNT; t := t + v; RAISE NOTICE 'CR-008 -> ws03: %', v;
  UPDATE compliance_requirements SET worksheet_template_id = ws06
   WHERE id = '5cf4ef3f-15ac-497a-ae75-43beda6d2287' AND worksheet_template_id = ws05;
  GET DIAGNOSTICS v = ROW_COUNT; t := t + v; RAISE NOTICE 'CR-019 -> ws06: %', v;
  IF t <> 5 THEN RAISE EXCEPTION 'Section 1 expected 5 re-homes, got % — abort', t; END IF;

  -- SECTION 2
  UPDATE equations SET clause_reference = new_ref
   WHERE id = '792a1536-3a74-4bb7-8756-d55212945d28' AND clause_reference = '§6.2.3';
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'equation clause_reference: %', v;
  UPDATE fields SET clause_reference = new_ref
   WHERE id = '1f81bfe9-e9fc-4f15-b1c8-ee81c0802be9' AND clause_reference = '§6.2.3';
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'field emission_removal_factor clause_reference: %', v;
  UPDATE compliance_requirements SET clause_reference = new_ref
   WHERE id = '5cf4ef3f-15ac-497a-ae75-43beda6d2287' AND clause_reference = '§6.1.2.2.4, §6.2.3';
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'CR-019 clause_reference: %', v;

  -- SECTION 3
  UPDATE worksheet_templates
     SET description = replace(description, 'The ten guiding principles', 'The nine guiding principles')
   WHERE id = ws03 AND description LIKE 'The ten guiding principles%';
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'ws03 ten->nine: %', v;

  -- SECTION 4
  UPDATE worksheet_templates
     SET description = 'Mathematical processing of basic data into parameters and aggregated results. Captures the calculation-method definitions (6.1.2.2.4) and the activity-data x emission/removal-factor consolidation example (informative Annex A.2.4 c) 1)). Isolated as the single calculation worksheet so the equation is self-contained.'
   WHERE id = ws06 AND description LIKE '%only quantitative relationship stated in normative text%';
  GET DIAGNOSTICS v = ROW_COUNT; RAISE NOTICE 'ws06 description: %', v;
END $$;
