-- =====================================================================
-- Pile-11: Three independent reviewable changes on DWA-A-138-1
-- (additive, NOT applied to production by this PR — reviewable only).
--
-- §1  Rewrite REQ-08 and REQ-22 to parseable DSL.
-- §2  Add compliance_requirements.requires_attestation column with a
--     default FALSE.
-- §3  Set requires_attestation = TRUE on the 12 known attestation
--     placeholder rows (`engineer-verified` and `verify Gl. X`).
--
-- WHY these three live together: §2 and §3 are the column the
-- application gradually adopts (`isAttestationCondition` pattern-match
-- in the code today, DB column once applied). §1 closes the two real
-- dead-check bugs documented in _integration-health-2026-06-02.md
-- Class 1. They're shipped together because all three are surfaced by
-- the same sweep and have the same review surface (single SQL file).
-- =====================================================================


-- ============= §1 — Rewrite REQ-08 and REQ-22 =============

-- REQ-08: `n IN Tab8_values` was a placeholder — `Tab8_values` is not a
-- list, just a bare ident, so the parser bailed to `manual`. The actual
-- Bemessungshäufigkeit values from Tab. 8 (§5.3.3.4 L1156-1188) are:
--   (1) gering:    0.5 / 0.33
--   (2) mäßig:     0.33 / 0.2
--   (3) stark:     0.2
--   (4) sehr stark: 0.1
-- Unique set: {0.1, 0.2, 0.33, 0.5}.
UPDATE compliance_requirements c
SET condition = 'n IN {0.1, 0.2, 0.33, 0.5}',
    audit_notes = COALESCE(audit_notes, '') || ' | Pile-11 2026-06-02: rewrote `n IN Tab8_values` (dead — bare ident not parseable) to {brace list} of Tab. 8 §5.3.3.4 L1156-1188 Bemessungshäufigkeit values.',
    audited_at = NOW(),
    audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE c.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND c.code = 'A138-REQ-08'
  AND c.condition = 'n IN Tab8_values';

-- REQ-22: `if flood_check_trigger == TRUE then V_Rueck present` — the
-- `V_Rueck present` predicate is not part of the DSL. Engineer intent
-- was "V_Rueck must have a value when the flood-check is triggered".
-- Rewrite to `IS NOT NULL`.
UPDATE compliance_requirements c
SET condition = 'IF flood_check_trigger == TRUE THEN V_Rueck IS NOT NULL',
    audit_notes = COALESCE(audit_notes, '') || ' | Pile-11 2026-06-02: rewrote malformed `V_Rueck present` predicate to `V_Rueck IS NOT NULL`. Preserves intent (flood-trigger implies V_Rueck must be set).',
    audited_at = NOW(),
    audited_by = 'claude-code-2026-06-02'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE c.worksheet_template_id = wt.id AND s.code = 'DWA-A-138-1'
  AND c.code = 'A138-REQ-22'
  AND c.condition = 'if flood_check_trigger == TRUE then V_Rueck present';


-- ============= §2 — Add requires_attestation column =============

-- Additive ALTER. Guarded with IF NOT EXISTS (Postgres 9.6+). Default
-- FALSE so existing rows behave identically until §3 flips the 12 known
-- placeholder rows on DWA-A-138-1.
ALTER TABLE compliance_requirements
  ADD COLUMN IF NOT EXISTS requires_attestation boolean NOT NULL DEFAULT false;


-- ============= §3 — Flip attestation rows on DWA-A-138-1 =============

-- 12 known placeholder rows. The application reads the column once
-- this SQL is applied; pattern-match fallback (src/lib/eval/attestation.ts)
-- continues to work for any future placeholders the engineer adds before
-- this column is curated.
UPDATE compliance_requirements c
SET requires_attestation = TRUE
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE c.worksheet_template_id = wt.id
  AND s.code = 'DWA-A-138-1'
  AND c.code IN (
    'A138-REQ-10','A138-REQ-11','A138-REQ-12','A138-REQ-13','A138-REQ-14',
    'A138-REQ-18','A138-REQ-20','A138-REQ-24','A138-REQ-25','A138-REQ-26',
    'A138-REQ-28','A138-REQ-29'
  )
  AND c.requires_attestation = FALSE;


-- ============= Smoke checks =============

SELECT c.code, c.condition
FROM compliance_requirements c
JOIN worksheet_templates wt ON wt.id = c.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND c.code IN ('A138-REQ-08','A138-REQ-22');

SELECT c.code, c.requires_attestation
FROM compliance_requirements c
JOIN worksheet_templates wt ON wt.id = c.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND c.requires_attestation = TRUE
ORDER BY c.code;
