-- =============================================================================
-- 20260723_fll_gar27_c_dedupe_retag — RATIFIED FLL-GAR-27 GAR-27 fix (C = 1,0)
-- =============================================================================
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
--
-- CONTEXT: FLL-GAR-27 (worksheet c51f9051-529e-43c2-b5df-bd7c4f27d227,
-- standard FLL-GAR-2023) carries TWO abflussbeiwert fields:
--   - consumed `C`            (d6f02425-71c9-4a85-bfd2-35069a118771) — the field
--     the Gl.1 Q_NOT equation actually reads (input_symbols includes 'C').
--   - decoy twin `C_abflusswert` (34d5b6f0-faf8-4f4c-b308-b330b36f6d94) — an
--     encode-time orphan that no equation consumes (unit NULL, clause '§Gl.1').
--
-- FIX (schema half — STANDARD-SCHEMA):
--   (1) DEDUPE: deactivate the decoy twin `C_abflusswert` so it no longer renders
--       or offers a competing value. Its stranded 0,82 is a DIN-1986-100 runoff
--       coefficient traced to the bring-up log and WITHDRAWN by the user — it is
--       NOT an FLL-GAR source value and is not carried forward.
--   (2) RE-TAG: attach the Anhang-1 verbatim source provenance to the consumed
--       `C`. FLL-GAR-2023 states exactly ONE abflussbeiwert, in the Anhang-1
--       Düsseldorf worked example: "Abflussbeiwert C = 1", dimensioned "nach
--       DIN 1986-100" (r5,100). That example computes Q_NOT = 23,28 l/s for its
--       800 m² case. So C = 1,0 is the PDF-attested value.
--
-- SOURCE-VERIFIED (VA-grade) against:
--   C:\Users\Ekowai\Desktop\FLL Guidelines PDF\
--     fll_gewaesserabdichtungsrichtlinien_2023__2 (2).pdf  (Anhang 1)
--   pdftotext -layout line 6499: "Abflussbeiwert C = 1"
--   line 6495: "Für Düsseldorf gilt: r5,5 = 316 l/(s*ha) und r5,100 = 607 l/(s*ha)"
--   line 6505-6507: "Q NOT = [ (r5,100 - (r5,5 * C) ] * (A / 10.000)
--                    = ( (607 - 316) ) * (800 / 10.000) = 23,28 l/sec"
--   Transliterated ASCII (ae/oe/ue/ss) to match stored convention + avoid
--   non-ASCII transport through the Management API.
--
-- SCOPING: matched by explicit field ids AND worksheet/standard join. Idempotent.
--   audit_status and verification_status are NOT modified. No project data here
--   (the live consumed-C value 0,83->1,0 is applied separately as project_parameters).
-- Rollback: rollback-20260723_fll_gar27_c_dedupe_retag.sql
-- Verify:   verify-20260723_fll_gar27_c_dedupe_retag.sql
-- =============================================================================

-- (1) DEDUPE — deactivate the decoy twin C_abflusswert (no equation consumes it).
UPDATE fields f
SET active = false,
    description = COALESCE(f.description, '')
      || ' [DEPRECATED 2026-07-23: decoy twin collapsed into consumed C (d6f02425-…);'
      || ' stranded 0,82 was a DIN-1986-100 coefficient, WITHDRAWN — not an FLL-GAR value.]'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'FLL-GAR-2023'
WHERE f.id = '34d5b6f0-faf8-4f4c-b308-b330b36f6d94'
  AND f.worksheet_template_id = wt.id
  AND wt.code = 'FLL-GAR-27';

-- (2) RE-TAG — attach Anhang-1 verbatim provenance to the consumed C.
UPDATE fields f
SET source_file  = 'fll_gewaesserabdichtungsrichtlinien_2023__2 (2).pdf',
    source_anchor = 'Anhang 1 (Beispielsberechnung Notueberlauf, Duesseldorf)',
    source_quote  = 'Abflussbeiwert C = 1. Die Dimensionierung der Notentwaesserung erfolgt nach DIN 1986-100 mit oertlicher 100-Jahres-Regenspende r5,100. Beispiel Duesseldorf: r5,5 = 316 l/(s*ha), r5,100 = 607 l/(s*ha), abflusswirksame Flaeche = 800 m2, Q NOT = [(r5,100 - r5,5*C)]*(A/10000) = (607 - 316)*(800/10000) = 23,28 l/sec.',
    clause_reference = 'Anhang 1',
    description = 'Eingang in Gl.1 Q_NOT (Abflussbeiwert). FLL-GAR-2023 nennt genau einen Abflussbeiwert: C = 1 (Anhang-1-Beispiel, nach DIN 1986-100).'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'FLL-GAR-2023'
WHERE f.id = 'd6f02425-71c9-4a85-bfd2-35069a118771'
  AND f.worksheet_template_id = wt.id
  AND wt.code = 'FLL-GAR-27';
