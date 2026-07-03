-- scripts/migrations/20260703120000_a138_12_tab6_descriptions.sql
-- DWA-A 138-1 — fix stale field descriptions on the A138-12 Tab.6 loading-check
-- fields. The COMPUTATION is Flächengruppe-keyed (Tab.5) and correct; only the
-- engineer-facing `description` text carried the superseded Belastungskategorie
-- (BK I/II/III) framing — the exact wrong keying corrected in B1. This migration
-- realigns the description text + citation with the verified Tab.5/Tab.6 encoding.
-- Data-only (no schema change). WRITTEN-NOT-APPLIED — apply via Management-API POST
-- after Alvaro's review. Rollback: scripts/rollback-20260703120000-a138_12_tab6_descriptions.sql
--
-- Two idempotent UPDATEs (converging, re-runnable):
--   (1) ac_as_ratio_limit  — replace BK-keyed limit text with Flächengruppe/tier
--       text (incl. the BL counter-example) + clause_reference '§5.2.3.2, Tab. 6'.
--   (2) ac_as_ratio_check  — 'governing BK' → 'governing Flächengruppe (Tab. 5)'
--       + the four states + clause_reference '§5.2.3.2, Tab. 6'.
DO $$
DECLARE
  ws12 uuid;
BEGIN
  SELECT wt.id INTO ws12 FROM worksheet_templates wt
    JOIN standards s ON s.id = wt.standard_id
    WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-12';
  IF ws12 IS NULL THEN
    RAISE EXCEPTION 'a138_12_tab6_descriptions: A138-12 not found';
  END IF;

  -- (1) ac_as_ratio_limit
  UPDATE fields SET
    description = 'Limit for A_C/A_S,m per Tab. 6, keyed on the Flächengruppe (Tab. 5) — NOT the Belastungskategorie (BK). tier2 (VW2/V2/BF/BG2): ≤30 at BBZ ≥20 cm, ≤50 at BBZ ≥30 cm. tier3 (BL/V3/BG3): ≤15 at ≥20 cm, ≤30 at ≥30 cm. VW1/V1/BG1: keine Anforderung. D and special areas (SD1/SD2/SV/SVW/SF/SL/SG/SA): behördlich abzustimmen (*). Note: BL is BK II but takes the stricter tier-3 limit — hence the key is the Flächengruppe, not the BK. §5.2.3.2.',
    clause_reference = '§5.2.3.2, Tab. 6'
    WHERE worksheet_template_id = ws12 AND symbol = 'ac_as_ratio_limit';

  -- (2) ac_as_ratio_check
  UPDATE fields SET
    description = 'PASS if A_C/A_S,m is within the Tab. 6 limit for the governing Flächengruppe (Tab. 5) and BBZ thickness. States: pass / fail / not_applicable (keine Anforderung, or behördlich abzustimmen *) / indeterminate (Flächengruppe or inputs not set). §5.2.3.2.',
    clause_reference = '§5.2.3.2, Tab. 6'
    WHERE worksheet_template_id = ws12 AND symbol = 'ac_as_ratio_check';

END $$;
