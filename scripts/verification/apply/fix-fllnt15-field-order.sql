-- FLLNT-15 field order (2026-09-29): all seven active fields carry order_index = 0, so the sheet renders
-- them in id order (3, 2, 6, 4, 1, 5, verdict). Structural fix — the phase gates follow the guideline's
-- phase numbering 1…6, the overall verdict closes the sheet. Read-back: the same SELECT ordered by order_index.
-- Rollback: UPDATE fields SET order_index = 0 WHERE id IN (the seven ids below).
BEGIN;
UPDATE fields SET order_index = v.idx FROM (VALUES
  ('75db48f1-87f0-4793-acb5-10788189179e'::uuid, 1),  -- phase_1_gate
  ('42b8687e-8c74-4b2b-aa27-448616d8e412'::uuid, 2),  -- phase_2_gate
  ('3f6c36c0-6a35-41d2-be8c-e07b67264232'::uuid, 3),  -- phase_3_gate
  ('6505874a-e385-4f65-94f9-4da98e20d7e2'::uuid, 4),  -- phase_4_gate
  ('95f54004-ab0c-40c5-a64f-f3685a97c9f1'::uuid, 5),  -- phase_5_gate
  ('44ee439d-6098-47a1-9d86-31425bf462e8'::uuid, 6),  -- phase_6_gate
  ('b47cb27a-385d-4775-bcf9-b3e60edf2dd2'::uuid, 7)   -- compliance_verdict_overall
) AS v(id, idx) WHERE fields.id = v.id;
COMMIT;
