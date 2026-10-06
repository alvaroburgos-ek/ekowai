-- 20261006160000_m820_followup_1.sql · M820 follow-up block 1 (findings of the C1 fill run 2026-10-06)
-- Brief: vault 01-Projects/ekowai-wizard/m820-wizard-test/_briefs/followup-1-brief.md. Apply order: 25_APPLY-ORDER-m820-followup-1.md.
-- Sign-off sheet: 26_SIGN-OFF-m820-followup-1.md. Evidence of the findings: 24_Gate-Read_M820-1-2-3_C1 (G-1), 21_Fill-Run_M820-1_C1 (F-01).
-- Pre-state = prod after blocks 15 / 16 / 17 / 19 (the harness seeds the 2026-10-05 dumps and applies those four blocks first).
--
-- WHAT THE PROJECT TEAM SEES (plain English):
--   1. DWA-M 820-3: the two count checks "Anhang B.2 has 40 items" (REQ-20: qe63a_items_total + qe63b_items_total == 40) and
--      "Anhang B.3 has 50 items" (REQ-21: qe64a_items_total + qe64b_items_total == 50) move from M8203-11 (QE 6.2, Anhang B.1)
--      to M8203-23 "Zusammenfassung QE Projekte". On M8203-11 they could never read their four totals (those reach only
--      M8203-23 / -24), so the panel showed them "waiting" for good. On M8203-23 they read the totals and pass at 21 + 19 / 17 + 33.
--      Code, severity (warn — unchanged; a warn gate never refuses an approval), condition and clause are unchanged.
--   2. DWA-M 820-1: for the two private-client tokens of block 15 (privat_ohne_foerderung, privat_mit_foerderung) the EU threshold
--      twin on M820-09 (eu_threshold_value_anhb23) now fills with 214.000 € ("für alle anderen"), so M820-09-D3 (threshold entered
--      = threshold printed) computes. For a private client without funding who does not apply the procedure voluntarily the
--      threshold checks stay off (REQ-07 guard of block 15); the sheet shows the printed threshold for information.
--   NOT in this block: item 3 (M820-17 date_procurement_start / submission_deadline) = ruling on 26_ (the source does not tie
--   either date to the VgV-F procedure); item 4 (empty registers) = [CODE] fix in src/lib/eval/materialize-derived.ts.
--
-- SOURCES (every quote re-read 2026-10-06 on the RENDERED PDF: scoop pdftotext -layout of
--   C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-3\DWA-M_820-3.pdf and ...\DWA-M-820-1\DWA-M_820-1.pdf, whitespace-normalised
--   match per PDF page; L### = line of the .md transcript):
--   [G1] DWA-M 820-3 § 6.3, L446-L447, PDF p. 17: "Qualitätselemente (Auswahl) siehe Anhang B. 2 „QE 6.3: Planung""
--        § 6.4, L480-L481, PDF p. 18: "Qualitätselemente (Auswahl) siehe Anhang B. 3 „QE 6.4: Ausführungsvorbereitung""
--        EN "Quality elements (selection) see Annex B.2 'QE 6.3: planning'" / "... Annex B.3 'QE 6.4: preparation of execution'".
--        Anhang B.2 "QE 6.3: Planung" prints Nr. 1 ... 40 (PDF p. 27-30, "B.2 (Ende)" p. 30, last item 40 "Eventuelle Einsprüche
--        zum Genehmigungsbescheid sind geklärt"); Anhang B.3 "QE 6.4: Ausführungsvorbereitung" prints Nr. 1 ... 50 (PDF p. 30-34,
--        "B.3 (Ende)" p. 34, last item 50 "Zuschlag erteilen"). M8203-11 is "QE 6.2: Bedarfsplanung Projekt" = Anhang B.1 (PDF p. 26)
--        → REQ-20 / REQ-21 are not content of M8203-11; M8203-23 is the tool's Anhang-B summary sheet whose equation M8203-23-D1
--        already reads all eight B totals (the home is a tool structure choice → sign-off FU1-1, nothing waits on it).
--   [T1] DWA-M 820-1 Anh. B.2.3 "Schwellenwerte", L1327-L1330, PDF p. 52 (printed 50): "Die EU-Schwellenwerte betragen laut
--        Verordnung (EU) 2019/1828 vom 30.10.2019 ab dem 01.01.2020 für Planungsleistungen von Auftraggebern: der obersten oder
--        oberen Bundesbehörden oder vergleichbarer Institutionen 139.000 €, für alle anderen 214.000 €."
--        EN "The EU thresholds under Regulation (EU) 2019/1828 of 30.10.2019 from 01.01.2020 for planning services of clients are:
--        of the supreme or higher federal authorities or comparable institutions 139,000 €; for all others 214,000 €."
--   [T2] DWA-M 820-1 § 7.2, L766, PDF p. 31 (printed 29): "An das Vergaberecht sind Auftraggeber oder private Auftraggeber, die
--        Fördermittel erhalten, gebunden." EN "Procurement law binds clients, or private clients who receive public funding."
--        → a funded private client is a client under procurement law; a private client (funded or not) is not a supreme or
--        higher federal authority → the printed second line "für alle anderen" (all others) applies. The printed list has two
--        lines and the second is the catch-all, so no choice is left (source-settled; the six older tokens follow the same line,
--        m820_1-J-3 is only about "vergleichbare Institutionen" among PUBLIC bodies).
--   [T3] (context, no value) Anh. B.2.3, L1356, PDF p. 53: "Es wird daher empfohlen, bei Unsicherheiten und insbesondere bei
--        Fördermittelbezug eine rechtliche Prüfung im Einzelfall vorzunehmen." EN "It is therefore recommended to have a legal
--        check made in the individual case where there is uncertainty and in particular where funding is received." — about which
--        services are aggregated for the contract value, not about the threshold amount; quoted in the row label note on 26_.
--
-- WHAT THIS BLOCK DOES (idempotent; md5-guarded gate edits with an in-transaction archive; a ledger of the inserted rows):
--   1. REQ-20 (md5 bbae8277c3de31e19ff4303da2b66633) and REQ-21 (md5 ab3758b9f6a5a3fa1878465ecf48989b) on M8203-11 →
--      worksheet_template_id = M8203-23; description + one "moved" note; code, title, severity, condition, clause unchanged.
--   2. regulation_table_rows of DWA-M-820-1 ANHB23 (edition 2020) + 2 rows: privat_ohne_foerderung, privat_mit_foerderung →
--      schwellenwert_eur 214000, gruppe_gedruckt "für alle anderen", same regulation / date as the six existing rows [T1][T2].
--      ON CONFLICT (table_id, row_key) DO NOTHING; the ids actually inserted are kept in regulation_table_rows_added_m820_followup_1
--      so the rollback deletes exactly those.
-- EQUATIONS / FIELDS / SECTIONS: none changed. The lookup twin fills on the next save / recompute of M820-09 (25_ step 3).
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261006160000_m820_followup_1.sql
-- Rollback:  C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006160000-m820-followup-1.sql
-- Read-back: C:\Users\Ekowai\_wt-m820\scripts\verification\apply\readback-20261006160000-m820-followup-1.sql
BEGIN;

-- 0. in-transaction archive of the two gate rows (pre-state only; a re-run archives nothing) + ledger of inserted table rows
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_followup_1 AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS regulation_table_rows_added_m820_followup_1 (id uuid PRIMARY KEY);

INSERT INTO compliance_requirements_archive_m820_followup_1
SELECT cr.* FROM compliance_requirements cr
  JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND w.code = 'M8203-11'
   AND ((cr.code = 'REQ-20' AND md5(cr.condition) = 'bbae8277c3de31e19ff4303da2b66633')
     OR (cr.code = 'REQ-21' AND md5(cr.condition) = 'ab3758b9f6a5a3fa1878465ecf48989b'))
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_followup_1 a WHERE a.id = cr.id);

-- 1. G-1: REQ-20 / REQ-21 M8203-11 → M8203-23 [G1] (SET order: description, then the sheet; md5 guard on the live condition)
UPDATE compliance_requirements cr
   SET description = COALESCE(cr.description, '') || E'\n' || '[Follow-up 1, 2026-10-06] Blatt / sheet M8203-23 „Zusammenfassung QE Projekte“ (vorher / was M8203-11 = QE 6.2, Anhang B.1). Die Prüfung liest die Summen von M8203-12 / -13 (Anhang B.2, § 6.3: „Qualitätselemente (Auswahl) siehe Anhang B. 2 „QE 6.3: Planung““, PDF S. 17; B.2 druckt Nr. 1–40, PDF S. 27–30); diese erreichen nur M8203-23 / -24 — auf M8203-11 wartete die Prüfung dauerhaft. [EN] The check reads the totals of M8203-12 / -13 (Annex B.2, printed Nr. 1–40), which reach M8203-23 / -24 only; on M8203-11 it waited for good.',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-20' AND w.id = cr.worksheet_template_id AND w.code = 'M8203-11' AND s.code = 'DWA-M-820-3'
   AND wt.standard_id = s.id AND wt.code = 'M8203-23'
   AND md5(cr.condition) = 'bbae8277c3de31e19ff4303da2b66633';

UPDATE compliance_requirements cr
   SET description = COALESCE(cr.description, '') || E'\n' || '[Follow-up 1, 2026-10-06] Blatt / sheet M8203-23 „Zusammenfassung QE Projekte“ (vorher / was M8203-11 = QE 6.2, Anhang B.1). Die Prüfung liest die Summen von M8203-14 / -15 (Anhang B.3, § 6.4: „Qualitätselemente (Auswahl) siehe Anhang B. 3 „QE 6.4: Ausführungsvorbereitung““, PDF S. 18; B.3 druckt Nr. 1–50, PDF S. 30–34); diese erreichen nur M8203-23 / -24 — auf M8203-11 wartete die Prüfung dauerhaft. [EN] The check reads the totals of M8203-14 / -15 (Annex B.3, printed Nr. 1–50), which reach M8203-23 / -24 only; on M8203-11 it waited for good.',
       worksheet_template_id = wt.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id, worksheet_templates wt
 WHERE cr.code = 'REQ-21' AND w.id = cr.worksheet_template_id AND w.code = 'M8203-11' AND s.code = 'DWA-M-820-3'
   AND wt.standard_id = s.id AND wt.code = 'M8203-23'
   AND md5(cr.condition) = 'ab3758b9f6a5a3fa1878465ecf48989b';

-- 2. F-01: ANHB23 rows for the two private-client tokens of block 15 [T1][T2]
WITH ins AS (
  INSERT INTO regulation_table_rows (table_id, row_key, keys, group_label, label_de, order_index, row_values, verbatim_quote)
  SELECT t.id, v.row_key, jsonb_build_object('organisation', v.row_key), NULL, v.label_de, v.order_index,
         '{"schwellenwert_eur":214000,"gruppe_gedruckt":"für alle anderen","verordnung":"Verordnung (EU) 2019/1828 vom 30.10.2019","gueltig_ab":"01.01.2020"}'::jsonb,
         'für alle anderen 214.000 €.'
    FROM regulation_tables t,
         (VALUES ('privat_ohne_foerderung', 'Privater Auftraggeber ohne Fördermittel — für alle anderen', 6),
                 ('privat_mit_foerderung', 'Privater Auftraggeber mit Fördermitteln — für alle anderen', 7)) AS v(row_key, label_de, order_index)
   WHERE t.standard_code = 'DWA-M-820-1' AND t.edition = '2020' AND t.table_code = 'ANHB23'
  ON CONFLICT (table_id, row_key) DO NOTHING
  RETURNING id
)
INSERT INTO regulation_table_rows_added_m820_followup_1 (id) SELECT id FROM ins ON CONFLICT DO NOTHING;

COMMIT;
