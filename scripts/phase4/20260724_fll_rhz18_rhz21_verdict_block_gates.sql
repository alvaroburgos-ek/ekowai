-- =============================================================================
-- 20260724_fll_rhz18_rhz21_verdict_block_gates
--   D-3 (FLL M2 batch) — the TWO BLOCK-relevant check-encodings, APPLIED.
-- =============================================================================
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
--
-- MANDATE: Explicitly user-authorized apply (STEP 1 / task 1c, decision D-3).
--   Every OTHER check-encoding candidate from the M2 report is STAGED
--   written-not-applied (see _STAGED_20260724130000_fll_check_encodings_es1.sql).
--   These TWO are applied now because each guards a real out-of-spec state that
--   MUST block: the whole-standard rhizome-resistance PASS/FAIL verdict.
--
-- WHAT: add one `block`-severity compliance_requirement to each of the two
--   FLL-TP-RHIZOM-2023 verdict worksheets, both of which live on prod with
--   ZERO compliance_requirements today (verified read-only this session):
--     * FLLTP-RHZ-18  "Bewertung Rhizomfestigkeit (Gate)"
--         template c2ead780-210c-4067-b282-0908e98ce4bb
--         verdict field  pruefergebnis_rhizomfest (enum)
--         M2 finding RHZ-18/F1 — the "(Gate)" is vacuous; live FAIL/ABORT saves
--         both returned save.ok=true (nothing blocks a failing verdict).
--     * FLLTP-RHZ-21  final-conformity worksheet
--         template — resolved by join below (final_rhizom_conformity enum)
--         M2 finding RHZ-21/F2 — terminal conformity sheet, 0 gates.
--
-- CONDITION (evaluate.ts grammar, worksheet-local `compare` node, string RHS):
--     <verdict_symbol> == 'rhizomfest'
--   Semantics proven against src/lib/compliance/evaluate.ts:
--     value 'rhizomfest'              -> compare true  -> PASS
--     value 'nicht_rhizomfest'        -> compare false -> FAIL  (blocks)
--     value 'vorzeitig_abgebrochen'   -> compare false -> FAIL  (blocks)
--     value unset/NULL/''             -> missing       -> PENDING (never a false FAIL)
--   'vorzeitig_abgebrochen' MUST also block: per §9 a Pruefbericht is issued
--   "jedoch nur, wenn sich das Produkt ... als rhizomfest erwiesen hat" — an
--   aborted test does not yield rhizomfest, so == 'rhizomfest' correctly blocks it.
--
-- SR-1 / SR-3 — VERBATIM SOURCE, rendered PDF, THIS session (VA):
--   PDF: C:\Users\Ekowai\Desktop\FLL Guidelines PDF\
--        fll_tp_rhizomfestigkeit_gewaesserabdichtung_2023 (1).pdf
--   scoop pdftotext -layout, 2026-07-24.
--   §3.11 Pruefergebnis (PDF p.12): "Ein Produkt gilt als rhizomfest, wenn in
--     allen Pruefgefaessen nach Ablauf der Pruefdauer keine Rhizomeindringungen
--     gemaess Abschnitt 2.9 sowie keine Rhizomdurchdringungen gemaess Abschnitt
--     2.10 festzustellen sind."
--   §9 Pruefbericht (PDF p.23): "... ein vollstaendiger Pruefbericht ... zu
--     erstellen, jedoch nur, wenn sich das Produkt gemaess Abschnitt 2.11 als
--     rhizomfest erwiesen hat. Firmen und Produkte, die ohne Erfolg an der
--     Untersuchung teilgenommen haben, erhalten keinen Pruefbericht, sondern
--     lediglich eine schriftliche Mitteilung ... dass sich das Produkt als nicht
--     rhizomfest nach FLL erwiesen hat."
--   §3.12 Vorzeitiger Abbruch (PDF p.12): "Wird im Pruefungsverlauf keine
--     ausreichende Wuchsleistung der Testpflanzen erzielt (s. 2.7), ist die
--     Pruefung abzubrechen."
--   Non-ASCII transliterated (ae/oe/ue/ss) for Management-API transport, matching
--   the stored convention (see 20260723_fll_gar27_c_dedupe_retag.sql).
--
-- SCOPING: matched by worksheet_template + standard join AND deterministic CR
--   `code`; INSERT ... WHERE NOT EXISTS makes re-apply idempotent (no duplicate).
--   audit_status / verification_status NOT touched. requires_attestation=false.
-- Rollback: rollback-20260724_fll_rhz18_rhz21_verdict_block_gates.sql
-- Verify:   verify-20260724_fll_rhz18_rhz21_verdict_block_gates.sql
-- =============================================================================

BEGIN;

-- (1) FLLTP-RHZ-18 — Bewertung Rhizomfestigkeit (Gate)
INSERT INTO compliance_requirements
  (worksheet_template_id, code, title_de, title_en, condition, clause_reference,
   severity, description, suggestion, source_file, source_anchor, source_quote,
   requires_attestation)
SELECT wt.id,
       'REQ-RHZ18-VERDICT',
       'Rhizomfestigkeits-Ergebnis muss "rhizomfest" sein',
       'Rhizome-resistance verdict must be "rhizomfest"',
       'pruefergebnis_rhizomfest == ''rhizomfest''',
       '§3.11 / §9',
       'block',
       'Sperrgate fuer das Gesamtergebnis der Rhizomfestigkeitspruefung. Ein Ergebnis "nicht_rhizomfest" oder "vorzeitig_abgebrochen" darf nicht als konform durchgereicht werden (§9: Pruefbericht nur, wenn sich das Produkt als rhizomfest erwiesen hat).',
       'Nur ein Ergebnis "rhizomfest" (keine Rhizomein-/durchdringungen gemaess Abschnitt 2.9/2.10) erfuellt die Anforderung. Bei "nicht_rhizomfest"/"vorzeitig_abgebrochen" ist kein FLL-Pruefbericht auszustellen.',
       'fll_tp_rhizomfestigkeit_gewaesserabdichtung_2023 (1).pdf',
       '§3.11 Pruefergebnis (PDF p.12); §9 Pruefbericht (PDF p.23)',
       'Ein Produkt gilt als rhizomfest, wenn in allen Pruefgefaessen nach Ablauf der Pruefdauer keine Rhizomeindringungen gemaess Abschnitt 2.9 sowie keine Rhizomdurchdringungen gemaess Abschnitt 2.10 festzustellen sind. (§3.11) — Pruefbericht ... jedoch nur, wenn sich das Produkt ... als rhizomfest erwiesen hat. (§9)',
       false
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'FLL-TP-RHIZOM-2023'
WHERE wt.id = 'c2ead780-210c-4067-b282-0908e98ce4bb'
  AND wt.code = 'FLLTP-RHZ-18'
  AND NOT EXISTS (
    SELECT 1 FROM compliance_requirements cr
    WHERE cr.worksheet_template_id = wt.id AND cr.code = 'REQ-RHZ18-VERDICT');

-- (2) FLLTP-RHZ-21 — final conformity worksheet (final_rhizom_conformity)
INSERT INTO compliance_requirements
  (worksheet_template_id, code, title_de, title_en, condition, clause_reference,
   severity, description, suggestion, source_file, source_anchor, source_quote,
   requires_attestation)
SELECT wt.id,
       'REQ-RHZ21-CONFORMITY',
       'Endkonformitaet muss "rhizomfest" sein',
       'Final conformity must be "rhizomfest"',
       'final_rhizom_conformity == ''rhizomfest''',
       '§3.11 / §9',
       'block',
       'Sperrgate fuer die Endkonformitaet. Eine finale Bewertung ungleich "rhizomfest" (also "nicht_rhizomfest" oder "vorzeitig_abgebrochen") darf die Abnahme nicht passieren (§9: Bescheinigung/Pruefbericht nur bei nachgewiesener Rhizomfestigkeit).',
       'Die Endkonformitaet ist nur bei "rhizomfest" erfuellt. Andernfalls ist keine FLL-Konformitaetsbescheinigung auszustellen.',
       'fll_tp_rhizomfestigkeit_gewaesserabdichtung_2023 (1).pdf',
       '§3.11 Pruefergebnis (PDF p.12); §9 Pruefbericht (PDF p.23)',
       'Ein Produkt gilt als rhizomfest, wenn in allen Pruefgefaessen nach Ablauf der Pruefdauer keine Rhizomeindringungen gemaess Abschnitt 2.9 sowie keine Rhizomdurchdringungen gemaess Abschnitt 2.10 festzustellen sind. (§3.11) — Pruefbericht ... jedoch nur, wenn sich das Produkt ... als rhizomfest erwiesen hat. (§9)',
       false
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'FLL-TP-RHIZOM-2023'
WHERE wt.code = 'FLLTP-RHZ-21'
  AND NOT EXISTS (
    SELECT 1 FROM compliance_requirements cr
    WHERE cr.worksheet_template_id = wt.id AND cr.code = 'REQ-RHZ21-CONFORMITY');

COMMIT;
