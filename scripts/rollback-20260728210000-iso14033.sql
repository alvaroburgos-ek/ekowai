-- ROLLBACK for 20260728210000_iso14033_rehome_and_ref_fixes.sql
DO $$
DECLARE
  ws01 uuid := '3ebd246e-4d04-4ef3-ba68-28317b414706';
  ws05 uuid := 'ec1fb3e0-40b8-44e7-984b-53c2fd276fca';
BEGIN
  -- Section 1 re-homes back
  UPDATE compliance_requirements SET worksheet_template_id = ws01
   WHERE id IN ('6bb447d9-6438-46d4-b020-299221dd6735','a3eb3686-f69f-4c78-a6a7-a2d2435559fa',
                'efab6699-50c4-45e7-8986-5d4aed9ae638','58a6c899-24ea-4501-8e34-d8b3d67a7dc1');
  UPDATE compliance_requirements SET worksheet_template_id = ws05
   WHERE id = '5cf4ef3f-15ac-497a-ae75-43beda6d2287';
  -- Section 2 clause_reference back
  UPDATE equations SET clause_reference = '§6.2.3' WHERE id = '792a1536-3a74-4bb7-8756-d55212945d28';
  UPDATE fields SET clause_reference = '§6.2.3' WHERE id = '1f81bfe9-e9fc-4f15-b1c8-ee81c0802be9';
  UPDATE compliance_requirements SET clause_reference = '§6.1.2.2.4, §6.2.3' WHERE id = '5cf4ef3f-15ac-497a-ae75-43beda6d2287';
  -- Section 3 ws03 nine->ten
  UPDATE worksheet_templates SET description = replace(description, 'The nine guiding principles', 'The ten guiding principles')
   WHERE id = '79a1599b-101b-431c-9d33-efefcdfd41b1' AND description LIKE 'The nine guiding principles%';
  -- Section 4 ws06 description restore
  UPDATE worksheet_templates SET description = 'Mathematical processing of basic data into parameters and aggregated results. Captures the calculation-method definitions (6.1.2.2.4) and the only quantitative relationship stated in normative text -- the activity-data x emission/removal-factor consolidation example (6.2.3 c) 1)). Isolated as the single calculation worksheet so the equation is self-contained.'
   WHERE id = '89f020cc-2c1a-4a20-aa3e-0c552db50ff4';
  RAISE NOTICE 'rollback complete';
END $$;
