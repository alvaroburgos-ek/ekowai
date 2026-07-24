-- ============================================================================
-- STAGED — WRITTEN-NOT-APPLIED — D-3 ES-1 check-encoding batch (FLL M2)
-- ----------------------------------------------------------------------------
-- `_STAGED_` prefix => the migration runner SKIPS this file. Prod write outside
-- the single authorized D-3 apply => STOP-and-batch for Alvaro's controlled pass.
-- The TWO BLOCK-relevant checks (RHZ-18 verdict, RHZ-21 conformity) were applied
-- separately (scripts/phase4/20260724_fll_rhz18_rhz21_verdict_block_gates.sql).
-- EVERYTHING below is the ES-1 class: threshold/acceptance checks that SHOULD be
-- compliance_requirements but are NOT block-critical to encode this instant, so
-- they are staged for ratification.  Each threshold carries its verbatim PDF
-- quote + page (SR-1/SR-3) — nothing here ships without a source line.
--
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
--
-- SR-3 SOURCE (rendered this session, scoop pdftotext -layout, 2026-07-24):
--   PDF: fll_tp_rhizomfestigkeit_gewaesserabdichtung_2023 (1).pdf
--   §5.9 Tab.2 "Anforderungen an die Wasserqualitaet" — PDF p.16:
--     Ammonium <= 0,5 mg/l | Eisen <= 0,2 mg/l | Gesamtphosphor (Pges) <= 0,03 mg/l
--     Haerte (Summe Erdalkalien) >= 1,0 mmol/l | Leitfaehigkeit <= 1000,0 uS/cm bei 20 C
--     Mangan <= 0,05 mg/l | Nitrat <= 50,0 mg/l | ortho-Phosphat (Angabe P) <= 0,01 mg/l
--     ph-Wert 6,0 - 9,0 | Saeurekapazitaet KS4,3 >= 2,0 mmol/l
--   §5.7 Duengemittel — PDF p.16: "Als Duengemittel ist ein wasserloeslicher,
--     chloridarmer Mehrnaehrstoffduenger ... vorzusehen ... der zusaetzlich die
--     Spurennaehrelemente Eisen, Kupfer, Molybdaen, Mangan, Bor und Zink enthaelt."
--     (The N/P2O5/K2O/MgO %-values are 'ca.' = approximate → NOT hard gates; a
--      tolerance band is a human decision, M2 decision RHZ-07/D-03 — NOT staged.)
--
-- TARGET: FLLTP-RHZ-07 "Duengemittel & Giesswasser-Eingangspruefung",
--   template 516cefc1-2f36-40a9-a350-b728ee2663e9 (0 compliance_requirements live).
--   M2 finding RHZ-07/F-01: 16 source-attested acceptance limits, 0 gates → an
--   out-of-spec Giesswasser/Duengemittel passes silently.
--
-- GRAMMAR (evaluate.ts): each requirement is one worksheet-local comparison; the
--   pH band is a single two-clause AND (supported: `x >= 6.0 AND x <= 9.0`).
--   These are proposed `block` (Tab.2 uses hard <=/>= Anforderungen, not 'soll').
--
-- SR-2 range note: pH 6,0-9,0 is a two-sided ACCEPTANCE BAND (both bounds fixed by
--   the standard) — encoded as the fixed band, NOT an engineer point-pick, so it is
--   not an SR-2 selection field. (Contrast D-4 standard_range fields.)
--
-- RE-APPLY-SAFE: INSERT ... WHERE NOT EXISTS on (worksheet_template_id, code).
--   audit_status/verification_status untouched. requires_attestation=false.
-- Rollback: scripts/rollback-_STAGED_20260724130000-fll-check-encodings-es1.sql
--
-- NOT STAGED HERE (need their OWN PDF-page quote + a human block/warn ruling
--   before any SQL — SR-1 forbids authoring a threshold without its verbatim line):
--   * GAR-12 Tab.6 concrete minima (w/z<=0,60; Z>=280; fck>=C25/30) — M2 §3.C-19
--   * GAR-13 Asphaltbeton (Hohlraum<=3 Vol-%; Schichtdicke>=40 mm)      — M2 §3.C-19
--   * RHZ-06 Tab.1 Substrat-Sollbereiche (pH 6,0-7,5; N<=50; ...)       — M2 §3.A-4
--   These stay in Alvaro's decision batch (deliverable §D-3), un-authored.
-- ============================================================================

BEGIN;

WITH tpl AS (
  SELECT wt.id
  FROM worksheet_templates wt
  JOIN standards s ON s.id = wt.standard_id AND s.code = 'FLL-TP-RHIZOM-2023'
  WHERE wt.id = '516cefc1-2f36-40a9-a350-b728ee2663e9'
    AND wt.code = 'FLLTP-RHZ-07'
),
proposed(code, title_de, condition, quote) AS (
  VALUES
    ('REQ-RHZ07-AMMONIUM','Ammonium <= 0,5 mg/l',              'wasser_ammonium_mg_l <= 0.5',        'Tab.2 (p.16): Ammonium <= 0,5 mg/l'),
    ('REQ-RHZ07-EISEN',   'Eisen <= 0,2 mg/l',                 'wasser_eisen_mg_l <= 0.2',           'Tab.2 (p.16): Eisen <= 0,2 mg/l'),
    ('REQ-RHZ07-PGES',    'Gesamtphosphor <= 0,03 mg/l',       'wasser_p_gesamt_mg_l <= 0.03',       'Tab.2 (p.16): Gesamtphosphor (Pges) <= 0,03 mg/l'),
    ('REQ-RHZ07-HAERTE',  'Haerte >= 1,0 mmol/l',              'wasser_haerte_mmol_l >= 1.0',        'Tab.2 (p.16): Haerte (Summe Erdalkalien) >= 1,0 mmol/l'),
    ('REQ-RHZ07-LEITF',   'Leitfaehigkeit <= 1000,0 uS/cm',    'wasser_leitfaehigkeit_uS_cm <= 1000.0','Tab.2 (p.16): Leitfaehigkeit <= 1000,0 uS/cm bei 20 C'),
    ('REQ-RHZ07-MANGAN',  'Mangan <= 0,05 mg/l',               'wasser_mangan_mg_l <= 0.05',         'Tab.2 (p.16): Mangan <= 0,05 mg/l'),
    ('REQ-RHZ07-NITRAT',  'Nitrat <= 50,0 mg/l',               'wasser_nitrat_mg_l <= 50.0',         'Tab.2 (p.16): Nitrat <= 50,0 mg/l'),
    ('REQ-RHZ07-ORTHOP',  'ortho-Phosphat <= 0,01 mg/l',       'wasser_ortho_phosphat_mg_l <= 0.01', 'Tab.2 (p.16): ortho-Phosphat (Angabe P) <= 0,01 mg/l'),
    ('REQ-RHZ07-PH',      'pH 6,0 - 9,0',                      'wasser_ph >= 6.0 AND wasser_ph <= 9.0','Tab.2 (p.16): ph-Wert 6,0 - 9,0'),
    ('REQ-RHZ07-KS43',    'Saeurekapazitaet KS4,3 >= 2,0',     'wasser_saurekapazitaet_mmol_l >= 2.0','Tab.2 (p.16): Saeurekapazitaet KS4,3 >= 2,0 mmol/l'),
    ('REQ-RHZ07-CHLORID', 'Duenger chloridarm',                'duenger_chloridarm == true',         '§5.7 (p.16): chloridarmer Mehrnaehrstoffduenger'),
    ('REQ-RHZ07-SPUREL',  'Spurennaehrelemente vorhanden',     'duenger_spurelemente_vorhanden == true','§5.7 (p.16): ...der zusaetzlich die Spurennaehrelemente Fe,Cu,Mo,Mn,B,Zn enthaelt')
)
INSERT INTO compliance_requirements
  (worksheet_template_id, code, title_de, condition, clause_reference, severity,
   description, source_file, source_anchor, source_quote, requires_attestation)
SELECT tpl.id, p.code, p.title_de, p.condition,
       CASE WHEN p.code IN ('REQ-RHZ07-CHLORID','REQ-RHZ07-SPUREL') THEN '§5.7' ELSE '§5.9 Tab.2' END,
       'block',
       'Eingangspruefung Giesswasser/Duengemittel: Grenzwert aus FLL-TP-Rhizom. Out-of-spec darf nicht unbemerkt durchgehen (M2 RHZ-07/F-01).',
       'fll_tp_rhizomfestigkeit_gewaesserabdichtung_2023 (1).pdf',
       'PDF p.16',
       p.quote,
       false
FROM tpl CROSS JOIN proposed p
WHERE NOT EXISTS (
  SELECT 1 FROM compliance_requirements cr
  WHERE cr.worksheet_template_id = tpl.id AND cr.code = p.code);

COMMIT;
