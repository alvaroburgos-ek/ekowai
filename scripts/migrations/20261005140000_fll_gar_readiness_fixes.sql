-- FLL-GAR-2023 · readiness run 2026-10-05 (encoding defects D5, D6, D7, D15 of 14_FLL-Run_GAR_2026-10-05.md; D9 and D14 examined and
-- left unchanged, see the end of this header) — source-settled by the printed pages (PDF page = printed page + 2, every quote re-read
-- in the session that wrote this block, 2026-10-05) and by the encoding's own structure. Code defects D1–D4, D11–D13 are not touched.
--
--   D5  Seven gates sat on the mineral sheet FLL-GAR-10 although they govern other materials; a gate on a sheet that is N.A. for the
--       project never evaluates (B1: PEHD OIT = 100 approved without REQ-20), and the two attestation gates blocked the mineral sheet
--       (B7c: "REQ-19 (…), REQ-21 (…)"). Each gate moves to the sheet that owns its inputs — the host change is the whole fix for five
--       of them (their conditions, severities and inputs are unchanged):
--       · REQ-13 → FLL-GAR-11 (Mineralisch mit Zusatzstoffen). §5.2.1.1 (p. 44): "Güte und Menge der verwendeten natürlichen und
--         synthetischen Zusatzstoffe müssen so beschaffen sein, dass die gleichwertigen Anforderungen nach Tabelle 3 erfüllt werden."
--         Inputs mz_durchlaessigkeit_kf, mz_dichtungswirkung_nachgewiesen live on FLL-GAR-11.
--       · REQ-14 → FLL-GAR-12 (Beton). Tab. 6 (p. 48) "Anforderungen an Beton mit hohem Wassereindringwiderstand": row 2 "≤ 40 |
--         Wasserzementwert | w/z | ≤ 0,60" · row 3 "≤ 40 | Zementgehalt ³ | Z | ≥ 280 kg/m³" · row 5 "> 40 | Wasserzementwert | w/z |
--         ≤ 0,70". Inputs bauteildicke_cm, wasserzementwert, zementgehalt_kg_m3 live on FLL-GAR-12.
--       · REQ-15 → FLL-GAR-13 (Asphalt). §5.4.1.1 (p. 58): "Asphaltbeton gilt als wasserdicht, wenn dieser mit einer Schichtdicke von
--         mind. 40 mm eingebaut wird und die eingebaute Schicht einen Hohlraumgehalt ≤ 3 Vol.-% aufweist." Input
--         hohlraumgehalt_asphaltbeton_vol_pct lives on FLL-GAR-13. (Observation, not changed here: the condition carries only the
--         void-content term; the 40-mm thickness and the Tab.-12 nominal thicknesses of the gate title are not in the condition.)
--       · REQ-16 → FLL-GAR-14 (GTD). Tab. 13 (p. 63) "Mindestanforderungen an Bentonite für GTD": row 2 "Bentonit-Flächeneinheit …
--         ≥ 3.600 g/m² | ≥ 8.000 g/m²" (Na / Ca) · row 4 "Quellvermögen … ≥ 24 ml | ≥ 8 ml". Inputs bentonit_type,
--         bentonit_flaecheneinheit_g_m2, quellvermoegen_ml, gtd_ueberlappung_laengs_cm, gtd_ueberlappung_quer_cm live on FLL-GAR-14.
--         The 30 / 50 cm overlap terms of the condition are carried unchanged (not re-read in this session).
--       · REQ-20 → FLL-GAR-18 (PE). Tab. 24 (p. 95) "Werkstoffspezifische Anforderungen für Bahnen aus PEHD": row 3 "Dichte | > 0,940 |
--         g/cm³" · row 4 "Schmelze-Massefließrate (MFR) | ≥ 1,0 / ≤ 3,0 | g/10 min." · row 5 "Rußgehalt | 2-3 | %" · row 6
--         "Rußverteilung | 2-3 | Kategorie" · row 7 "Maßänderung 1 h / 100 °C | ≤ 2 | %" · row 8 "NCTL-Test Stress crack resistance |
--         > 500 | h" · row 9 "OIT-Test Stabilisierungsgrad | > 100, bei 200 °C | min." · row 10 "Umweltverträglichkeit gemäß BBodSchVO |
--         unbedenklich". All eleven inputs (pe_werkstoff, peeh_*) live on FLL-GAR-18. (Matches ruling fllwave-G-2 of 08_SIGN-OFF-fll-wave_v4.)
--       The two attestation gates move WITH their attestation field (same field row, symbol unchanged, section_id stays NULL as today)
--       and receive the material guard their new siblings carry (REQ-41 on -17 reads `IF abdichtungs_art == fluessigkunststoff THEN …`);
--       without the guard an un-deactivated sheet would demand a liquid-plastic or steel attestation from every project
--       (matches ruling fllwave-G-3; severity block unchanged):
--       · REQ-19 → FLL-GAR-17 (Flüssigkunststoff), field attest_fll_gar_10_req_19 → FLL-GAR-17. §6.3.1 (p. 88): "Flüssigkunststoffe
--         müssen gemäß der Europäischen Organisation für Technische Zulassung (ETA) der Leitlinie ETAG 005/EAD 030350-00-0402
--         entsprechen." Anhang 3 (p. 134) "Klassen und Leistungsstufen für Flüssigkunststoffe (in Anlehnung an DIN 18531-2)": Klimazone
--         M / S · Nutzungsdauer W1–W3 · Nutzlasten P1–P4 · Neigung S1–S4 · tiefe Temperaturen TL1–TL4 · hohe Temperaturen TH1–TH4.
--       · REQ-21 → FLL-GAR-19 (Stahl), field attest_fll_gar_10_req_21 → FLL-GAR-19. §7.1.1.1 (p. 101): "Bevorzugt zu verwenden sind
--         daher nicht rostende Stähle V2A (Werkstoffnummer 1.4301) … Bei höheren Anforderungen an die Korrosionsbeständigkeit (z. B. in
--         Meeresnähe oder in Industrieatmosphäre) sind rostfreie Stähle V4A (Werkstoffnummer 1.4401) zu verwenden. Bei Kontakt mit
--         Meerwasser oder für ähnliche Einsatzzwecke (z. B. Solebecken) sind noch höherwertige Stähle, wie z. B. V5A (Werkstoffnummer
--         1.4539) zu verwenden." · "Unlegierte Stähle müssen verzinkt und ggf. beschichtet werden … Durch Schmelztauchen (Feuerverzinken)
--         soll eine Schichtstärke von wenigstens 100 µm erreicht werden." §7.1.3.2 (p. 103): "Die Qualität der verwendeten Stähle ist vom
--         Hersteller nachzuweisen. Dieser Nachweis erfolgt im Rahmen der Fremdüberwachung."
--       REQ-12 (Tab. 3) is the only material gate that belongs to FLL-GAR-10 and stays there. No gate is added, no severity changes.
--       C-1 LITERAL (found on the pre-apply read-back 2026-10-05): the live consumer_worksheets of abdichtungs_art is the ONE-element
--       array {FLL-GAR-10..21} — a range NOTATION, not twelve codes. Both inheritance loaders match codes exactly (worksheet.ts
--       loadInheritedFields: `code = ANY(consumer_worksheets)`; visibility.ts inheritedFieldsFor: `.includes(code)`), so no sheet 10–21
--       inherits the field through this list; the material sections (visible_when abdichtungs_art == '…') never hide and the Tab.-1 /
--       material lookups on those sheets cannot key on it. Structural fix (dead reference to the standard's own sheets, zero
--       interpretation): the literal is replaced by the twelve codes it names, plus FLL-GAR-07 (D7). Rollback restores the literal.
--       Symbol resolution: abdichtungs_art already resolves on FLL-GAR-12/-14/-17/-18 (the run proved REQ-43/-42/-41/-35/-37 both ways
--       with the same guard); FLL-GAR-11/-13/-19 render their sections on `abdichtungs_art == '…'` and are assumed to be on the same
--       consumer list (staged fll_gar-C-1) — the read-back prints the list; if a code is missing there, add it before relying on the gate.
--   D6  REQ-02 / REQ-03 (FLL-GAR-03) read `… == True`, i.e. "a permit IS needed" — a permit-free pond (B1: Nein/Nein, truthful) was
--       refused: "Blockierende Compliance-Verstöße offen: REQ-02 (Baurechtliche Genehmigungen geprueft), REQ-03
--       (WHG-Einleitungsgenehmigung geklaert)". §4.2 (p. 27): "Im Planungsverlauf ist zu prüfen, welche jeweiligen bauaufsichtlichen
--       Anforderungen die Herstellung, Inbetriebnahme, Nutzung und Instandhaltung des Gewässers beeinflussen oder im Ganzen bzw. in Teilen
--       bestimmen können, z. B.: … Genehmigungsverfahren der Länder und Kommunen je nach Größe und Nutzung des geplanten Gewässers; …
--       wasserwirtschaftliche Gesetze des Bundes und der Länder für Wasserentnahme und für eine kontrollierte Entwässerung des
--       Überschusswassers bzw. der Gewässerentleerung." The page makes CHECKING the duty. Ruling fllwave-G-1 ("permit gates require an
--       answer, not a permit"): condition = `<field> IS NOT NULL` — either answer passes, an explicit null fails; a never-entered field is
--       `pending` (A1 semantics) and is caught by the fields' required flag ("Pflichteingaben fehlen"). Severity block unchanged.
--   D7  FLL-GAR-07 (Profilierung) does not inherit abdichtungs_art, so its Tab.-1 lookup `boeschungsneigung_limit` stays empty and
--       REQ-08 (condition '') never judged a slope (B4: 1:1,2 approved against the 1:1,5 limit). §4.5 (p. 28): "Für die Neigung der
--       Abdichtung von Böschungen bestehen werkstoffspezifische Einschränkungen (s. Tab. 1)." Tab. 1 (p. 29) "Richtwerte für
--       werkstoffspezifische Böschungsneigungen verschiedener Abdichtungsarten": row 4 "Ortbeton (ohne Schalung) | ≤ 1:2 | ≤ 50 %" · row 10
--       "Kunststoff- und Elastomerbahnen | ≤ 1:1,5 | ≤ 66 %" · row 12 "Kunststoffbahnen aus PEHD | ≤ 1:1,5 | ≤ 66 %" (rows 2, 3, 5, 8, 9
--       "≤ 1:3 | ≤ 33 %", row 6 "≤ 1:5 | ≤ 20 %", row 7 "≤ 1:2 | ≤ 50 %", row 11 "≤ 1:1 | ≤ 100 %"). Fix: FLL-GAR-07 added as consumer of
--       abdichtungs_art (FLL-GAR-09); REQ-08 := `boeschung_steilste_1m >= boeschungsneigung_limit` ("≤ 1:1,5" = the steepest section's
--       m of 1:m must be ≥ the Tab.-1 m; FLL-GAR-07-D1 is the steepest section, the limit field is the TAB1 lookup by abdichtungs_art).
--       p. 29 "Die angegebenen Werte sind Richtwerte" → severity warn unchanged. Sealing types without a Tab.-1 row (Stahl,
--       Alkalisilikate, GUP — fll_gar-E-1) leave the limit empty → the gate stays pending, as documented.
--       REQ-09 (Sec.4.7, condition '') is NOT Tab. 1: §4.7 (p. 30) prints "Die Wahl des Abdichtungssystem ist u. a. abhängig von: der
--       Nutzungsart und Intensität …; der Dimensionierung, Profilierung und Neigung …; …" — a list of selection aspects, no testable rule
--       → left empty (never invent a condition).
--   D15 Tab. 28 (p. 118) "Objektbezogene An- und Abschlusshöhen für Gewässerabdichtungen", row 5 "0": the page prints ONE cell "- ¹"
--       spanning the three application columns Bauteil/Bauwerk, Freifläche, Schwimmteich (no column dividers in that row; the text
--       extraction yields the single token "5 0 - 1"); footnote "¹ Nur als Sonderkonstruktion, d. h. als besondere planerische und
--       technische Lösung." p. 118: "Die vorgegebenen An- /Abschlusshöhen gelten als Mindesthöhen während des Betriebs der
--       Gewässeranlage." The encoding had left zero|freiflaeche and zero|schwimmteich undecidable (zulaessig null, fll_gar-U-4) → a 4-cm
--       freeboard on a Freifläche was not counted by FLL-GAR-23-D1. Fix: both rows get the printed cell (zulaessig 'sonder', footnote 1),
--       which resolves U-4 as "printed, not left to the authority". The owner confirms the merged-cell reading on apply.
--   D9  NOT ENCODED — blocked on code. Anhang 2 (p. 133): "g' = γ'D" (erforderliches Flächengewicht g' der Auflast gegen Abheben in kN/m²)
--       · "dD ≥ (Δu x γA − (γ'F x dF + γ'Di x dDi)) / cos ß" · "Δu = (ΔhW + za) γw" · "γA Sicherheit gegen Auftrieb [-], γA = 1,00" ·
--       "β Böschungswinkel [°]". The inequality needs cos(β); the unified expression engine has no trigonometric function
--       (src/lib/expr/functions.ts: ln, log10, sqrt, exp, abs, round, ceil, floor, min, max) and an unknown call parses to `manual`
--       (src/lib/expr/evaluate.ts "Unparseable input or an unknown function name → manual") — which is exactly why the stored 2b is
--       skipped today. A gate or equation written with cos(beta) would be `manual`, not a check. Needs [CODE]: register cos (and the
--       degree→radian convention, β is printed in °), then the gate `g_prime >= (Delta_u * gamma_A - (gamma_F_prime * d_F +
--       gamma_Di_prime * d_Di)) / cos(beta)` can be staged. Also for the owner: the page prints the left-hand side as "dD ≥" while the
--       heading and the symbol list define the required quantity as g' [kN/m²] — the encoding reads it as g' (the run's hand value
--       2,0 ≥ 1,606 does too).
--   D14 NOT CHANGED. REQ-27 (FLL-GAR-26, `abnahme_datum IS NOT NULL`) duplicates the required field. §11.1 (p. 127): "Abnahme bedeutet
--       die körperliche Hinnahme der Leistung des Auftragnehmers durch den Auftraggeber, verbunden mit der Erklärung, dass er das Werk als
--       im Wesentlichen vertragsgemäß anerkennt." · "… ist die ordnungsgemäße Ausführung der Abdichtungsarbeiten nach ihrer
--       Fertigstellung gemeinsam von Auftraggeber und Auftragnehmer festzustellen und das Ergebnis schriftlich niederzulegen." The page
--       prints no threshold and no date rule — the only checkable element beyond existence ("schriftlich niederzulegen", for sealing works
--       combined with other works) has no field on FLL-GAR-26; adding one is a design item, not an encoding fix. The gate stays as it is.
-- SAFETY: no new gate, no severity change, no source_quote written (the pre-block source_quote values are not in the dump, so a write
-- could not be rolled back exactly — the quotes above are the evidence). Two conditions gain a material guard (REQ-19/21), two are
-- inverted to the ruled form (REQ-02/03), one is filled (REQ-08) — the owner's apply ratifies these as written. Idempotent (every
-- statement is guarded by the pre-block host / condition / row value).
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005140000_fll_gar_readiness_fixes.sql
-- Rollback: scripts/migrations/rollback-20261005140000_fll_gar_readiness_fixes.sql
-- Read-back: scripts/verification/apply/readback-fll-gar-readiness-20261005.sql (run before AND after the apply)
BEGIN;

-- C-1 literal: the range notation {FLL-GAR-10..21} becomes the twelve codes it names
UPDATE fields f SET consumer_worksheets = array_remove(f.consumer_worksheets, 'FLL-GAR-10..21') || ARRAY['FLL-GAR-10','FLL-GAR-11','FLL-GAR-12','FLL-GAR-13','FLL-GAR-14','FLL-GAR-15','FLL-GAR-16','FLL-GAR-17','FLL-GAR-18','FLL-GAR-19','FLL-GAR-20','FLL-GAR-21']::text[]
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-09' AND f.symbol = 'abdichtungs_art'
  AND 'FLL-GAR-10..21' = ANY (f.consumer_worksheets);

-- D7 consumer: FLL-GAR-07 inherits abdichtungs_art (FLL-GAR-09)
UPDATE fields f SET consumer_worksheets = COALESCE(f.consumer_worksheets, ARRAY[]::text[]) || ARRAY['FLL-GAR-07']::text[]
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-09' AND f.symbol = 'abdichtungs_art'
  AND NOT ('FLL-GAR-07' = ANY (COALESCE(f.consumer_worksheets, ARRAY[]::text[])));

-- D7 REQ-08: Tab. 1 — steepest section (m of 1:m) must not be steeper than the Tab.-1 value
UPDATE compliance_requirements cr SET condition = 'boeschung_steilste_1m >= boeschungsneigung_limit'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-07' AND cr.code = 'REQ-08' AND COALESCE(cr.condition, '') = '';

-- D6 REQ-02 / REQ-03: an answer must exist (fllwave-G-1)
UPDATE compliance_requirements cr SET condition = 'lbo_genehmigung_erforderlich IS NOT NULL'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-03' AND cr.code = 'REQ-02' AND cr.condition = 'lbo_genehmigung_erforderlich == True';

UPDATE compliance_requirements cr SET condition = 'whg_einleitung_genehmigung IS NOT NULL'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-03' AND cr.code = 'REQ-03' AND cr.condition = 'whg_einleitung_genehmigung == True';

-- D5 host moves (conditions unchanged): REQ-13 → -11, REQ-14 → -12, REQ-15 → -13, REQ-16 → -14, REQ-20 → -18
UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-11')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-10' AND cr.code = 'REQ-13';

UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-12')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-10' AND cr.code = 'REQ-14';

UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-13')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-10' AND cr.code = 'REQ-15';

UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-14')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-10' AND cr.code = 'REQ-16';

UPDATE compliance_requirements cr SET worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-18')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-10' AND cr.code = 'REQ-20';

-- D5 attestation gates: REQ-19 → -17 (guard fluessigkunststoff), REQ-21 → -19 (guard stahl); their attestation fields move with them
UPDATE compliance_requirements cr SET condition = 'IF abdichtungs_art == fluessigkunststoff THEN attest_fll_gar_10_req_19 == True',
  worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-17')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-10' AND cr.code = 'REQ-19' AND cr.condition = 'attest_fll_gar_10_req_19 == True';

UPDATE fields f SET worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-17')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-10' AND f.symbol = 'attest_fll_gar_10_req_19';

UPDATE compliance_requirements cr SET condition = 'IF abdichtungs_art == stahl THEN attest_fll_gar_10_req_21 == True',
  worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-19')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE cr.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-10' AND cr.code = 'REQ-21' AND cr.condition = 'attest_fll_gar_10_req_21 == True';

UPDATE fields f SET worksheet_template_id = (SELECT w2.id FROM worksheet_templates w2 WHERE w2.standard_id = s.id AND w2.code = 'FLL-GAR-19')
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-10' AND f.symbol = 'attest_fll_gar_10_req_21';

-- D15 Tab. 28 row 5 "0": the printed cell "- ¹" spans Bauteil/Bauwerk, Freifläche and Schwimmteich (U-4 resolved)
UPDATE regulation_table_rows r SET row_values = '{"hinweis":"Tab. 28 Zeile 5 (0 cm): eine über Bauteil/Bauwerk, Freifläche und Schwimmteich durchgehende Zelle \"- ¹\" (fll_gar-U-4 aufgelöst 2026-10-05, S. 118)","fussnote":"1","gedruckt":"- 1","zulaessig":"sonder","hoehe_min_cm":0}'::jsonb
FROM regulation_tables t
WHERE r.table_id = t.id AND t.standard_code = 'FLL-GAR-2023' AND t.edition = '2023-12' AND t.table_code = 'TAB28'
  AND r.row_key IN ('zero|freiflaeche', 'zero|schwimmteich') AND r.row_values->>'zulaessig' IS NULL;

COMMIT;
