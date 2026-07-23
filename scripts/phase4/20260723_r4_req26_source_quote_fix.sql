-- =============================================================================
-- 20260723_r4_req26_source_quote_fix — RATIFIED R4 (A138-26 REQ-26)
-- =============================================================================
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
--
-- DEFECT: REQ-26's source_quote was MISPASTED — it held the Gl.(10) V_Rueck
-- Dauerstufe-iteration note (from §5.3.4.1 line 1524 of the source), which is
-- NOT the clause the attestation (attest_a138_26_a138_req_26) attests to.
-- REQ-26 is the Ueberflutungsnachweis attestation gate (clause_reference
-- 5.3.4.1). Severity STAYS block.
--
-- SOURCE-VERIFIED against the guideline:
--   C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).md
--   §5.3.4.1 Grundstuecksentwaesserung
--   - line 1498: the requirement-establishing sentence (WHEN an Ueberflutungs-
--     nachweis must be provided and WHAT must be proven).
--   - line 1530: the proof obligation (complete + harmless retention on the
--     property) that the attestation confirms.
-- These two verbatim sentences are the correct basis for the attestation gate.
-- Transliterated ASCII (ae/oe/ue/ss) to match the existing stored convention
-- and to avoid non-ASCII transport through the Management API.
--
-- SCOPING: matched on (worksheet A138-26 + code A138-REQ-26 + standard
-- DWA-A-138-1). Idempotent. severity/condition/audit_status NOT modified.
-- Rollback: rollback-20260723_r4_req26_source_quote_fix.sql
-- =============================================================================
UPDATE compliance_requirements cr
SET source_quote = 'Fuer Versickerungsanlagen zur Grundstuecksentwaesserung inneroertlicher Grundstuecke muss ein Ueberflutungsnachweis nach DIN 1986-100 erbracht werden, wenn der Rechenwert AC als Summenwert aller abflusswirksamen Flaechen des Grundstuecks groesser als 800 m2 ist. Fuer den Ueberflutungsnachweis ist die zurueckzuhaltende Regenmenge zu berechnen und deren schadloser Verbleib auf dem Grundstueck nachzuweisen. (§5.3.4.1) Beim Ueberflutungsnachweis muss nachgewiesen werden, dass die zurueckzuhaltende Regenwassermenge vollstaendig und schadlos auf dem Grundstueck verbleiben kann.'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'DWA-A-138-1'
WHERE cr.worksheet_template_id = wt.id
  AND wt.code = 'A138-26'
  AND cr.code = 'A138-REQ-26';
