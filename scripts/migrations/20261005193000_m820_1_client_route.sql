-- 20261005193000_m820_1_client_route.sql · DWA-M 820-1 "client route" (owner requests 2026-10-05, verbatim:
--   "can we have or add something as private client which would make this not mandatory then? and for us to use it as a
--    standard anyway private or public so is fine" — and the amendment "we can also contact and follow the normal protocols
--    for private? would this be still okay? i guess will also be for the safe side?").
--
-- WHAT THE PROJECT TEAM SEES (plain English, three ways):
--   1. Public client (municipality, utility, association, federal authority, other) OR private client WITH public funding:
--      procurement law binds the client — every procurement check works exactly as before.
--   2. Private client WITHOUT public funding who answers "Yes, apply the procurement procedure voluntarily (safe side)":
--      every procurement check works exactly as for a public client (same gates, same blocking).
--   3. Private client WITHOUT public funding who answers "No": the procurement-law checks REQ-07, REQ-08, REQ-10, REQ-22,
--      REQ-26 are NOT REQUIRED — the decision is documented in M820-01 (a required Yes/No field); in the gate list they
--      appear as met/passed (the engine reports a gate whose guard is false as passed). The EU-notice date and the
--      § 134 GWB standstill fields are hidden. Everything else — needs assessment, risk,
--      quality requirements, contract checklist, insurance, documentation — still applies to every client.
--   A private client without funding who has NOT answered yet gets no silent pass: the guarded gates wait for the answer
--   (pending → the approval of the gated sheet is refused with "enter: vergaberecht_freiwillig_angewendet (from M820-01)"),
--   and M820-01 itself cannot be approved while the required answer is missing.
--
-- SOURCES (re-read this session on the RENDERED PDF, scoop pdftotext -layout of
--   C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-1\DWA-M_820-1.pdf; printed page = PDF page − 2; L### = transcript line):
--   [Q1] § 7.2 Vergaberecht, PDF p. 31 (printed 29), L766:
--        "An das Vergaberecht sind Auftraggeber oder private Auftraggeber, die Fördermittel erhalten, gebunden."
--        EN: "Procurement law binds [public] clients, or private clients who receive public funding."
--   [Q2] Hinweis für die Benutzung, PDF p. 12, L273:
--        "Jeder Person steht die Anwendung des Merkblatts frei. Eine Pflicht zur Anwendung kann sich aber aus Rechts- oder
--         Verwaltungsvorschriften, Vertrag oder sonstigem Rechtsgrund ergeben."
--        EN: "Anyone is free to apply the Merkblatt. A duty to apply it can arise from law, administrative rules, contract or
--        another legal ground." (basis of the voluntary "Yes" route)
--   [Q3] § 8.7, PDF p. 36 (printed 34), L874:
--        "Grundsätzlich nicht geeignet für die Ausführung eines Auftrags ist in einem VgV-F Verfahren ein Ingenieurbüro, bei
--         dem zwingende Ausschlussgründe gemäß § 123 GWB vorliegen."
--        EN: "In principle, in a VgV-F procedure, an engineering firm with mandatory exclusion grounds under § 123 GWB is not
--        suitable." (REQ-10 guard: procurement_procedure == 'vgv_f'; token checked in the live enum: vgv_f / suchverfahren /
--        direktvergabe / planungswettbewerb)
--   [Q4] Anh. B.2.3, PDF p. 52 (printed 50), L1325:
--        "In § 106 GWB ist festgelegt, dass das GWB und in Folge die VgV nur gelten, soweit der geschätzte Auftragswert die
--         EU-Schwellenwerte erreicht oder überschreitet."
--        EN: "§ 106 GWB lays down that the GWB, and therefore the VgV, apply only where the estimated contract value reaches or
--        exceeds the EU thresholds." (REQ-22 / REQ-26 guard: threshold_status == 'oberschwellig', the symbol the live gates
--        REQ-07 already read; NOTE inventory S-05 / S-09: threshold_status is hand-typed, the derived twin is
--        oberschwellig_code (M820-09-D1) — kept on threshold_status here, re-binding is not in this block)
--   [Q5] § 8.10.2.3 Bekanntmachung, PDF p. 40 (printed 38), L965 — field M820-17 publication_date (clause § 8.10.2.3):
--        "Die beabsichtigte Auftragsvergabe muss beim Amt für Veröffentlichungen der Europäischen Union mit dem vorgegebenen
--         Bekanntmachungsmuster (siehe http://simap.europa.eu) europaweit bekannt gemacht werden, § 37 VgV."
--        EN: "The intended award must be published EU-wide with the Publications Office of the European Union using the
--        prescribed notice form, § 37 VgV." — printed only inside § 8.10 (VgV-F procedure).
--   [Q6] § 8.10.3.6 Auftragserteilung, PDF p. 44 (printed 42), L1064 — fields M820-23 required_standstill_days,
--        standstill_period_days (clause § 134 Abs. 2 GWB):
--        "Der Auftraggeber darf den Vertrag frühestens 15 Kalendertage (bei Versendung auf elektronischem Weg 10 Kalendertage)
--         nach Absendung dieser Informationen schließen (§ 134 Abs. 2 GWB)."
--        EN: "The client may conclude the contract at the earliest 15 calendar days (10 calendar days when sent electronically)
--        after sending this information (§ 134(2) GWB)." — § 134 GWB belongs to the GWB, which [Q4] applies to every award
--        above the EU threshold whatever the procedure (review I-1): the two fields follow REQ-22's own guard.
--
-- WHAT THIS BLOCK DOES (idempotent; md5-guarded gate edits with an in-transaction archive; nothing else):
--   1. M820-01 client_organization_type: two enum values appended (same JSON shape, regulation_reference '§7.2'):
--      privat_ohne_foerderung "Privater Auftraggeber ohne Fördermittel" / "Private client without public funding",
--      privat_mit_foerderung  "Privater Auftraggeber mit Fördermitteln" / "Private client with public funding".
--      NOT done (not in this block): ANHB23 has no row for the two tokens, so eu_threshold_value_anhb23 (M820-09) stays empty
--      for them — which printed threshold row applies to a funded private client is a ruling (m820_1-J-3 class).
--   2. M820-01 new required boolean vergaberecht_freiwillig_angewendet, visible only for privat_ohne_foerderung.
--      order_index = client_organization_type's + 1: every M820-01 field carries order_index 0 (2026-10-05 dump) and the
--      form orders by order_index only (worksheet.ts .orderBy(fields.orderIndex), no tie-breaker), so the field shows
--      deterministically LAST in section B "Input Parameters"; "right after the client type" is not expressible without
--      renumbering the 16 sibling fields (not in this block).
--   3. Consumer reach (append-only, order kept): client_organization_type gets + M820-04 -10 -12 -17 -23 (the 2026-09-18
--      capture shows -08 -09 already there); the new field is created with the full list -04 -08 -09 -10 -12 -17 -23;
--      procurement_procedure (+ M820-12, -17); threshold_status (+ M820-04, -23) — every sheet whose gate or visible_when
--      reads them (the approval gate resolves them project-wide anyway; the reach makes the form show the same verdict).
--   4. Gate guards (bodies unchanged; SET condition first, cr.code first; md5 of the live condition from the 2026-10-05 dump):
--      G := (client_organization_type != 'privat_ohne_foerderung' OR vergaberecht_freiwillig_angewendet == true)
--      M820-04 REQ-07  md5 2a0ff00c0efd0d54f3c34ff21b24c16d → IF G THEN (<body>)
--      M820-10 REQ-08  md5 05c772bcfc41d111251f7aa2c900f845 → IF G THEN (<body>)
--      M820-12 REQ-10  md5 759e85932a46e82593a24a61c100ddc9 → IF G AND procurement_procedure == 'vgv_f' THEN (<body>)      [Q3]
--      M820-23 REQ-22  md5 7dedd983ac1ee5c379da759d5fbab75c → IF G AND threshold_status == 'oberschwellig' THEN (<body>)   [Q4]
--      M820-23 REQ-26  md5 dda8ecb39354511117b4341ff7f427ce → IF G AND threshold_status == 'oberschwellig' THEN (<body>)   [Q4]
--      A changed live text makes the UPDATE a no-op and archives nothing (re-check step 0 of the APPLY-ORDER note).
--   5. visible_when = G AND procurement_procedure == 'vgv_f' on M820-17 publication_date [Q5]; visible_when = G AND
--      threshold_status == 'oberschwellig' (= REQ-22's guard, review I-1) on M820-23 required_standstill_days,
--      standstill_period_days [Q4][Q6] (composed as (<existing>) AND (<new>) if a rule exists; the 2026-10-05 dump has
--      none). Producer guard: none of the three is an equation output or an input of an equation (M820-17 and M820-23
--      carry no equation). Gate effect of the hiding: REQ-18 (M820-17) loses the publication_date atom only; the standstill
--      fields are hidden exactly when REQ-22 is switched off, so REQ-22 never judges a bound award without them.
--      NOT hidden, because the printed text does NOT tie them to VgV-F (S-04 residue, ruling): M820-13 eligibility fields
--      (§ 8.9 L932–L934 lists "Nachweis der geforderten Berufshaftpflichtversicherung", "Einhaltung des vorgegebenen
--      Verhältnisses von Auftragswert zu Umsatzzahlen", "Referenzen" as Suchverfahren criteria, PDF p. 39); M820-14 award
--      criteria (§ 8.9 L930 "Damit können sowohl Eignungskriterien als auch Zuschlagskriterium als Wertungskriterien
--      herangezogen werden", PDF p. 39); M820-16 commission (§ 8.4 L843 "Will der Auftraggeber die Ingenieurleistungen nach
--      Qualitätskriterien vergeben, so muss er eine Bewertungskommission einsetzen", PDF p. 34 — conditional on quality
--      criteria, not on VgV-F); M820-17 submission_deadline / date_procurement_start (§ 8.9 L926/L928: a Suchverfahren may
--      publish and may run a Teilnahmewettbewerb, PDF p. 39); M820-19 evaluation_summary_date (§ 8.9 L926 evaluation in
--      every procedure).
-- SAFETY: one new required field (visible only for a private client without funding), 2 enum values, consumer reach,
--   5 guarded gates (bodies byte-identical inside the guard), 3 visible_when. No severity, value, equation or table change.
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261005193000_m820_1_client_route.sql
-- Rollback: scripts/rollback-20261005193000-m820-1-client-route.sql
-- Read-back: scripts/verification/apply/readback-20261005193000-m820-1-client-route.sql
BEGIN;

-- 0. in-transaction archives of every row this block changes (pre-state only; a re-run archives nothing)
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_1_client_route AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_1_client_route AS SELECT * FROM fields WHERE false;

INSERT INTO compliance_requirements_archive_m820_1_client_route
SELECT cr.* FROM compliance_requirements cr
  JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1'
   AND ((cr.code = 'REQ-07' AND w.code = 'M820-04' AND md5(cr.condition) = '2a0ff00c0efd0d54f3c34ff21b24c16d')
     OR (cr.code = 'REQ-08' AND w.code = 'M820-10' AND md5(cr.condition) = '05c772bcfc41d111251f7aa2c900f845')
     OR (cr.code = 'REQ-10' AND w.code = 'M820-12' AND md5(cr.condition) = '759e85932a46e82593a24a61c100ddc9')
     OR (cr.code = 'REQ-22' AND w.code = 'M820-23' AND md5(cr.condition) = '7dedd983ac1ee5c379da759d5fbab75c')
     OR (cr.code = 'REQ-26' AND w.code = 'M820-23' AND md5(cr.condition) = 'dda8ecb39354511117b4341ff7f427ce'))
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_1_client_route a WHERE a.id = cr.id);

INSERT INTO fields_archive_m820_1_client_route
SELECT f.* FROM fields f
  JOIN worksheet_templates w ON w.id = f.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1'
   AND ((w.code = 'M820-01' AND f.symbol = 'client_organization_type'
         AND (NOT (f.enum_values @> '[{"value":"privat_ohne_foerderung"}]'::jsonb OR f.enum_values @> '[{"value":"privat_mit_foerderung"}]'::jsonb)
           OR NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['M820-04','M820-10','M820-12','M820-17','M820-23']::text[])))
     OR (w.code = 'M820-10' AND f.symbol = 'procurement_procedure'
         AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['M820-12','M820-17']::text[]))
     OR (w.code = 'M820-09' AND f.symbol = 'threshold_status'
         AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['M820-04','M820-23']::text[]))
     OR (w.code = 'M820-17' AND f.symbol = 'publication_date'
         AND (f.visible_when IS NULL OR position('(client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure == ''vgv_f''' IN f.visible_when) = 0))
     OR (w.code = 'M820-23' AND f.symbol IN ('required_standstill_days','standstill_period_days')
         AND (f.visible_when IS NULL OR position('(client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND threshold_status == ''oberschwellig''' IN f.visible_when) = 0)))
   AND NOT EXISTS (SELECT 1 FROM fields_archive_m820_1_client_route a WHERE a.id = f.id);

-- 1. two client tokens on M820-01 client_organization_type ([Q1] § 7.2)
UPDATE fields f
   SET enum_values = f.enum_values || '[{"value":"privat_ohne_foerderung","label_de":"Privater Auftraggeber ohne Fördermittel","label_en":"Private client without public funding","order_index":7,"regulation_reference":"§7.2"},{"value":"privat_mit_foerderung","label_de":"Privater Auftraggeber mit Fördermitteln","label_en":"Private client with public funding","order_index":8,"regulation_reference":"§7.2"}]'::jsonb
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'client_organization_type'
   AND jsonb_typeof(f.enum_values) = 'array'
   AND NOT (f.enum_values @> '[{"value":"privat_ohne_foerderung"}]'::jsonb OR f.enum_values @> '[{"value":"privat_mit_foerderung"}]'::jsonb);

-- 2. the recorded decision of a private client without funding ([Q1] + [Q2]); visible only for that client, required when visible
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, source_anchor, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id,
       (SELECT f0.section_id FROM fields f0 WHERE f0.worksheet_template_id = w.id AND f0.symbol = 'client_organization_type'),
       'vergaberecht_freiwillig_angewendet',
       'Vergabeverfahren freiwillig angewendet (empfohlen, sichere Seite)',
       'Procurement procedure applied voluntarily (recommended, safe side)',
       'boolean', NULL, true, '§7.2',
       'Ein privater Auftraggeber ohne Fördermittel ist nicht an das Vergaberecht gebunden (§ 7.2: „An das Vergaberecht sind Auftraggeber oder private Auftraggeber, die Fördermittel erhalten, gebunden.“), kann das Vergabeverfahren aber freiwillig anwenden („Jeder Person steht die Anwendung des Merkblatts frei.“). Ja = alle Vergabeprüfungen gelten wie für einen öffentlichen Auftraggeber (empfohlen, sichere Seite). Nein = die Vergabeprüfungen REQ-07, REQ-08, REQ-10, REQ-22, REQ-26 sind nicht erforderlich — Entscheidung in M820-01 dokumentiert (in der Prüfliste erscheinen sie als erfüllt); Bekanntmachungsdatum und Wartefrist nach § 134 GWB werden ausgeblendet.
[EN] A private client without public funding is not bound by procurement law (§ 7.2: "Procurement law binds clients, or private clients who receive public funding."), but may follow the procedure voluntarily ("Anyone is free to apply the Merkblatt."). Yes = every procurement check applies as for a public client (recommended, safe side). No = the procurement checks REQ-07, REQ-08, REQ-10, REQ-22, REQ-26 are not required — decision documented in M820-01 (they appear as met/passed in the gate list); the EU-notice date and the § 134 GWB standstill fields are hidden.',
       'imported_unverified',
       '§ 7.2 (PDF p. 31, printed 29): "An das Vergaberecht sind Auftraggeber oder private Auftraggeber, die Fördermittel erhalten, gebunden." — Hinweis für die Benutzung (PDF p. 12): "Jeder Person steht die Anwendung des Merkblatts frei. Eine Pflicht zur Anwendung kann sich aber aus Rechts- oder Verwaltungsvorschriften, Vertrag oder sonstigem Rechtsgrund ergeben."',
       'DWA-M 820-1 §7.2 Z.766 (PDF S. 31) + Hinweis für die Benutzung Z.273 (PDF S. 12)',
       NULL, NULL, NULL,
       'client_organization_type == ''privat_ohne_foerderung''',
       NULL,
       ARRAY['M820-04','M820-08','M820-09','M820-10','M820-12','M820-17','M820-23']::text[],
       (SELECT COALESCE(f0.order_index, 0) + 1 FROM fields f0 WHERE f0.worksheet_template_id = w.id AND f0.symbol = 'client_organization_type'),
       true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-1' AND w.code = 'M820-01'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'vergaberecht_freiwillig_angewendet');

-- 3. consumer reach (append only the missing codes, existing order kept)
UPDATE fields f
   SET consumer_worksheets = COALESCE(f.consumer_worksheets, '{}'::text[])
       || ARRAY(SELECT u.c FROM unnest(ARRAY['M820-04','M820-10','M820-12','M820-17','M820-23']::text[]) WITH ORDINALITY AS u(c, o)
                 WHERE NOT (u.c = ANY (COALESCE(f.consumer_worksheets, '{}'::text[]))) ORDER BY u.o)
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-01' AND f.symbol = 'client_organization_type'
   AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['M820-04','M820-10','M820-12','M820-17','M820-23']::text[]);

UPDATE fields f
   SET consumer_worksheets = COALESCE(f.consumer_worksheets, '{}'::text[])
       || ARRAY(SELECT u.c FROM unnest(ARRAY['M820-12','M820-17']::text[]) WITH ORDINALITY AS u(c, o)
                 WHERE NOT (u.c = ANY (COALESCE(f.consumer_worksheets, '{}'::text[]))) ORDER BY u.o)
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-10' AND f.symbol = 'procurement_procedure'
   AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['M820-12','M820-17']::text[]);

UPDATE fields f
   SET consumer_worksheets = COALESCE(f.consumer_worksheets, '{}'::text[])
       || ARRAY(SELECT u.c FROM unnest(ARRAY['M820-04','M820-23']::text[]) WITH ORDINALITY AS u(c, o)
                 WHERE NOT (u.c = ANY (COALESCE(f.consumer_worksheets, '{}'::text[]))) ORDER BY u.o)
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-1' AND w.code = 'M820-09' AND f.symbol = 'threshold_status'
   AND NOT (COALESCE(f.consumer_worksheets, '{}'::text[]) @> ARRAY['M820-04','M820-23']::text[]);

-- 4. gate guards (archived above; SET condition first, cr.code first; md5 guard on the live text)
-- REQ-07 (M820-04): threshold consistency only where procurement law binds or is applied voluntarily ([Q1], [Q2])
UPDATE compliance_requirements cr
   SET condition = 'IF (client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) THEN ((IF estimated_engineering_fee >= eu_threshold_value THEN threshold_status == ''oberschwellig'') AND (IF threshold_status == ''oberschwellig'' THEN estimated_engineering_fee >= eu_threshold_value))'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-07' AND w.id = cr.worksheet_template_id AND w.code = 'M820-04' AND s.code = 'DWA-M-820-1'
   AND md5(cr.condition) = '2a0ff00c0efd0d54f3c34ff21b24c16d';

-- REQ-08 (M820-10): VgV-F above the threshold only where procurement law binds or is applied voluntarily ([Q1], [Q2])
UPDATE compliance_requirements cr
   SET condition = 'IF (client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) THEN (IF oberschwellig_check == true THEN procurement_procedure == ''vgv_f'')'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-08' AND w.id = cr.worksheet_template_id AND w.code = 'M820-10' AND s.code = 'DWA-M-820-1'
   AND md5(cr.condition) = '05c772bcfc41d111251f7aa2c900f845';

-- REQ-10 (M820-12): § 123 GWB check in a VgV-F procedure ([Q3]) of a bound or voluntarily applying client
UPDATE compliance_requirements cr
   SET condition = 'IF (client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure == ''vgv_f'' THEN (exclusion_123_gwb_checked == true)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-10' AND w.id = cr.worksheet_template_id AND w.code = 'M820-12' AND s.code = 'DWA-M-820-1'
   AND md5(cr.condition) = '759e85932a46e82593a24a61c100ddc9';

-- REQ-22 (M820-23): § 134 GWB information + standstill only above the threshold ([Q4], [Q6]) for a bound or voluntary client
UPDATE compliance_requirements cr
   SET condition = 'IF (client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND threshold_status == ''oberschwellig'' THEN (information_letters_sent == true AND ((electronic_transmission == true AND standstill_period_days >= 10) OR (electronic_transmission == false AND standstill_period_days >= 15)))'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-22' AND w.id = cr.worksheet_template_id AND w.code = 'M820-23' AND s.code = 'DWA-M-820-1'
   AND md5(cr.condition) = '7dedd983ac1ee5c379da759d5fbab75c';

-- REQ-26 (M820-23): § 135 GWB invalidity risk only above the threshold ([Q4]) for a bound or voluntary client
UPDATE compliance_requirements cr
   SET condition = 'IF (client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND threshold_status == ''oberschwellig'' THEN (information_letters_sent == true AND contract_invalidity_135_gwb_risk == false)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-26' AND w.id = cr.worksheet_template_id AND w.code = 'M820-23' AND s.code = 'DWA-M-820-1'
   AND md5(cr.condition) = 'dda8ecb39354511117b4341ff7f427ce';

-- 5a. EU notice date only in a VgV-F procedure ([Q5] § 37 VgV) of a bound or voluntary client — plain rule where none
--     exists, composed (<existing>) AND (<new>) onto an existing one (none in the 2026-10-05 dump)
UPDATE fields f
   SET visible_when = '(client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure == ''vgv_f'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-1' AND f.visible_when IS NULL
   AND w.code = 'M820-17' AND f.symbol = 'publication_date';

UPDATE fields f
   SET visible_when = '(' || f.visible_when || ') AND ((client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure == ''vgv_f'')'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-1' AND f.visible_when IS NOT NULL
   AND position('(client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND procurement_procedure == ''vgv_f''' IN f.visible_when) = 0
   AND w.code = 'M820-17' AND f.symbol = 'publication_date';

-- 5b. § 134 GWB standstill fields exactly when REQ-22 is switched on ([Q4] above the threshold, any procedure; [Q6])
UPDATE fields f
   SET visible_when = '(client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND threshold_status == ''oberschwellig'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-1' AND f.visible_when IS NULL
   AND w.code = 'M820-23' AND f.symbol IN ('required_standstill_days','standstill_period_days');

UPDATE fields f
   SET visible_when = '(' || f.visible_when || ') AND ((client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND threshold_status == ''oberschwellig'')'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'DWA-M-820-1' AND f.visible_when IS NOT NULL
   AND position('(client_organization_type != ''privat_ohne_foerderung'' OR vergaberecht_freiwillig_angewendet == true) AND threshold_status == ''oberschwellig''' IN f.visible_when) = 0
   AND w.code = 'M820-23' AND f.symbol IN ('required_standstill_days','standstill_period_days');

COMMIT;
