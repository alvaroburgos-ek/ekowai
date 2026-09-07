-- ============================================================================
-- DWA-M-760 — STAGED, WRITTEN-NOT-APPLIED (owner rulings). Every block below changes structure,
-- enforcement or required-ness, so it sits OUTSIDE the pre-authorised evidence-capture class of the
-- verification pack. 2026-09-07, md pass [VC]. Apply only after Alvaro marks the block RATIFIED.
-- Source: C:\Users\Ekowai\Desktop\Guidelines\DWA-M-760\DWA-M_760_WD.md — Merkblatt DWA-M 760
-- „Fetthaltiges Abwasser“, April 2025, 1. Auflage (WEISSDRUCK / final Merkblatt, NOT a Gelbdruck:
-- the title page carries no Entwurf/Einspruchsfrist marker and „Frühere Ausgaben: Kein Vorgängerdokument“).
-- "printed p.N" = printed page per the document's own Inhalt + Bilder-/Tabellenverzeichnis, cross-checked
-- against the mathpix image indices (PDF/mathpix index = printed + 2, constant across the document).
-- Gate rows live in public.compliance_requirements (evaluate.ts grammar); field/gate/worksheet ids are the
-- prod uuids from the 2026-09-07 export (fields-DWA-M-760.json: 25 worksheets, 166 fields, 6 equations,
-- 21 gates). Each block carries its evidence quote and the rollback inverse. NOTHING here is in the pack.
-- ============================================================================


-- ---------------------------------------------------------------------------------------------
-- S-0 · Encoding-level observation (no SQL — owner policy question).
-- This is a MERKBLATT (DWA-M), the advisory class of the DWA-Regelwerk, and it says so of itself:
--   "Jeder Person steht die Anwendung des Merkblatts frei. Eine Pflicht zur Anwendung kann sich aber aus
--    Rechts- oder Verwaltungsvorschriften, Vertrag oder sonstigem Rechtsgrund ergeben." (Hinweis für die
--    Benutzung, printed p.14)
--   "Die Planung, Installation und der normgerechte Betrieb von Fettabscheidern sind ausdrücklich nicht
--    Hauptgegenstand des vorliegenden Merkblatts. Hierzu wird auf bereits bestehende technische Regeln
--    verwiesen wie DIN EN 1825, DIN 4040-100, Merkblatt DWA-M 167-3" (§1, printed p.14)
-- Consequence for the encoding: almost every number this standard carries is either (a) a *Richtwert*
-- reproduced from Merkblatt DWA-M 115-2:2013 (Tabelle 3), (b) a *Messwert* from a case study
-- (Tabellen 7, 10-27, 42, B.3), or (c) a requirement that actually belongs to DIN EN 1825-1/-2 or
-- DIN 4040-100 and is only quoted here. The binding value for an Indirekteinleiter is the local
-- Abwassersatzung, and the guideline says so explicitly:
--   "Grenzwert — Im vorliegenden Merkblatt als Grenzwert in der jeweiligen Abwasserbeseitigungssatzung zu
--    verstehen; die Grenzwerte können von Satzung zu Satzung variieren." (§3.1, printed p.18)
-- The encoding nevertheless carries SEVEN block gates (REQ-M760-01, -04, -08, -08-2, -09 on M760-18, -10 on M760-10, -10 on M760-19). S-5 proposes what to do with them.


-- ---------------------------------------------------------------------------------------------
-- S-1 · MIS-HOMED GATES — gates whose condition reads fields that do not exist on their worksheet.
-- Both are severity='block', so today they either never fire or block on an unfillable worksheet.

-- ☐ RATIFIED  (a) REQ-M760-09 (6222ae5d-a199-4d1f-b3bd-e6eb8caaa3c3, block) sits on M760-18
--     "Weitergehende Behandlungsverfahren", which holds exactly ONE field (waermerueckgewinnung_potenzial).
--     Its condition is "ns_fettabscheider IS NOT NULL AND bauform_fa IS NOT NULL" — neither field is on
--     M760-18. bauform_fa lives on M760-09 + M760-13, ns_fettabscheider on M760-09 + M760-15.
--     Its own quote is §9.1.2/Tabelle 29 (printed p.65), i.e. the Bauform subject of M760-13.
-- update public.compliance_requirements set worksheet_template_id='0ac4e9f8-15a7-4d6e-a481-458f343c8c9b', condition='bauform_fa IS NOT NULL' where id='6222ae5d-a199-4d1f-b3bd-e6eb8caaa3c3';
--     (0ac4e9f8… = M760-13 "Bauform Fettabscheider". The NS check is already covered by CR-M760-NS on M760-15.)
--     Rollback: set worksheet_template_id='7161abee-fd48-48bc-87fa-31111677c27a',
--       condition='ns_fettabscheider IS NOT NULL AND bauform_fa IS NOT NULL'.

-- ☐ RATIFIED  (b) REQ-M760-10 (0134a104-d495-4aaa-8381-53d0a5e5c6c2, block) sits on M760-19
--     "Bau und Einbau", which has ZERO fields (see S-7). Condition
--     "entleerintervall_d <= 30 AND wartung_intervall_a <= 1 AND generalinspektion_intervall_a <= 5"
--     reads three fields that live on M760-10/M760-22/M760-23. It is also a straight duplicate of the
--     REQ-M760-10 copy on M760-10 (65fd99ed-…), which DOES evaluate. Evidence for the values:
--     "Gemäß DIN 4040-100 ist eine monatliche Eigenkontrolle und eine jährliche Wartung durch einen
--      Sachkundigen vorgeschrieben" (§10.2.3, printed p.98);
--     "Der genaue Umfang einer alle fünf Jahre wiederkehrenden Generalinspektion ist in DIN 4040-100:2016
--      in 10.7.2 ausführlich beschrieben." (§10.2.5, printed p.101)
--     Preferred: re-home to M760-22 "Wartung und Generalinspektion" (holds wartung_intervall_a +
--     generalinspektion_intervall_a) and drop the entleerintervall term, which belongs to M760-23.
-- update public.compliance_requirements set worksheet_template_id='f2a069ee-f297-477a-9ca0-8f35411cf15a', condition='wartung_intervall_a <= 1 AND generalinspektion_intervall_a <= 5' where id='0134a104-d495-4aaa-8381-53d0a5e5c6c2';
--     Rollback: set worksheet_template_id='9e6e13f0-9bab-4980-9b1f-16e5ec76d6aa',
--       condition='entleerintervall_d <= 30 AND wartung_intervall_a <= 1 AND generalinspektion_intervall_a <= 5'.


-- ---------------------------------------------------------------------------------------------
-- S-2 · DUPLICATE GATES. Three pairs are byte-identical in condition and near-identical in quote; five
-- gate CODES are used twice within the same standard, so `code` is not unique per standard today.

-- ☐ RATIFIED  (a) REQ-M760-05 / REQ-M760-05-2 on M760-05, identical condition
--     "rho_fett >= 0.85 AND rho_fett <= 0.95". Keep the one whose quote carries the whole sentence.
-- update public.compliance_requirements set active=false where id='b2c1be0d-3696-4366-b597-0a9f0ea531dc'; -- REQ-M760-05 (shorter quote)
--     Rollback: set active=true for the same id. (If compliance_requirements has no `active` column,
--     delete instead: delete from public.compliance_requirements where id='b2c1be0d-…';)

-- ☐ RATIFIED  (b) REQ-M760-08 / REQ-M760-08-2 on M760-08, identical condition "c_h2s_ppm <= 5", both block.
-- update public.compliance_requirements set active=false where id='b70e673c-f23a-4ff8-aa0a-e6bd8491e3bb'; -- REQ-M760-08-2

-- ☐ RATIFIED  (c) REQ-M760-11 / REQ-M760-11-2 on M760-24, identical condition
--     "analyseverfahren_sls == 'din_iso_11349_gravimetrisch' AND probenahmeart IS NOT NULL".
-- update public.compliance_requirements set active=false where id='a7401f2c-a192-403c-bde2-056ca352a905'; -- REQ-M760-11-2

-- ☐ RATIFIED  (d) Code collisions to renumber (no behaviour change, but they break per-standard code lookup):
--     REQ-M760-06 → 03259476-c605-4d05-83d2-7d4eb948570a (M760-05) and 8ab94ee4-bec1-436d-abf1-5a54a9c42354 (M760-06)
--     REQ-M760-07 → a0a612a4-c858-4d7a-8b38-c686c3411a79 (M760-05) and dd4a52c7-f724-4f9f-9653-9bba13376217 (M760-06)
--     REQ-M760-09 → 658194a3-ffdc-4421-87ad-897bf9fad58f (M760-09) and 6222ae5d-… (M760-18)
--     REQ-M760-10 → 65fd99ed-3325-4613-a270-ebd0ad234ebb (M760-10) and 0134a104-… (M760-19)
--     REQ-M760-12 → 47a93795-375c-45e4-9631-9ce8454e2015 (M760-11) and 9ccd4d47-f635-4228-9498-66316d97d7a4 (M760-24)
-- update public.compliance_requirements set code=code||'-b' where id in ('8ab94ee4-bec1-436d-abf1-5a54a9c42354','dd4a52c7-f724-4f9f-9653-9bba13376217','6222ae5d-a199-4d1f-b3bd-e6eb8caaa3c3','0134a104-d495-4aaa-8381-53d0a5e5c6c2','9ccd4d47-f635-4228-9498-66316d97d7a4');
--     Rollback: strip the '-b' suffix again.


-- ---------------------------------------------------------------------------------------------
-- S-3 · EMPTY-CONDITION GATES (8 of 21). condition='' means the row can never evaluate; it is only
-- meaningful when requires_attestation=true (then it is a tick-box). Two of the eight are neither.

-- ☐ RATIFIED  (a) Two rows are inert: empty condition, source_quote IS NULL, requires_attestation=false.
--     They carry no evidence and no behaviour.
--     a0a612a4-c858-4d7a-8b38-c686c3411a79  REQ-M760-07 on M760-05, clause '7',  warn, quote NULL
--     dd4a52c7-f724-4f9f-9653-9bba13376217  REQ-M760-07 on M760-06, clause '6.4', warn, quote NULL
-- update public.compliance_requirements set active=false where id in ('a0a612a4-c858-4d7a-8b38-c686c3411a79','dd4a52c7-f724-4f9f-9653-9bba13376217');
--     Rollback: set active=true for both.

-- ☐ RATIFIED  (b) The remaining six empty-condition rows already have requires_attestation=true and read
--     as reading-confirmation gates (REQ-M760-02 §2, REQ-M760-03 §3.1, REQ-M760-06 §6.1, REQ-M760-09 §9.1.2,
--     REQ-M760-12 §12 ×2). No SQL proposed — owner decision whether attestation gates stay.


-- ---------------------------------------------------------------------------------------------
-- S-4 · UNSATISFIABLE GATE — raw measured value compared against an effluent limit.
-- ☐ RATIFIED  REQ-M760-06 on M760-06 (condition 'c_aox_grosskueche <= 1', clause_reference '4.4',
--     quote = Tabelle 3 AOX 1 mg/l). c_aox_grosskueche is NOT an effluent parameter; it is the §6.2 case
--     measurement:
--       "Der erhöhte AOX-Gehalt im Abwasser kann zu Grenzwertüberschreitungen führen; Messungen in einer
--        Großküche ergaben AOX-Konzentrationen bis $2,7 \mathrm{mg} / \mathrm{lim}$ Gesamtabwasser."
--        (§6.2, printed p.31)
--     The value the guideline prints for this field (2,7 mg/l) fails the gate by construction. The AOX
--     Richtwert already has a correct home: c_aox inside REQ-M760-04 on M760-04.
-- update public.compliance_requirements set active=false where id='8ab94ee4-bec1-436d-abf1-5a54a9c42354';  -- REQ-M760-06 on M760-06
--     Alternative if the gate should stay as a warning about the risk it describes:
-- update public.compliance_requirements set severity='warn', condition='', requires_attestation=true, clause_reference='6.2' where id='8ab94ee4-bec1-436d-abf1-5a54a9c42354';
--     Rollback: severity='warn', condition='c_aox_grosskueche <= 1', requires_attestation=false, clause_reference='4.4'.


-- ---------------------------------------------------------------------------------------------
-- S-5 · SEVERITY REVIEW — block gates anchored on advisory / second-hand text.

-- ☐ RATIFIED  (a) REQ-M760-04 (76fe5e81-fe71-456a-9807-57dab1f3ba41) on M760-04, severity='block',
--     condition 'ph_wert >= 6.5 AND ph_wert <= 10 AND t_abwasser <= 35 AND c_aox <= 1 AND
--     c_lipophil <= 300 AND sed_stoffe <= 10'. Every one of those five numbers is a RICHTWERT of another
--     Merkblatt, reproduced here as a recommendation to municipalities:
--       "Die Abwassersatzungen orientieren sich hinsichtlich der inhaltlichen Ausgestaltung ... häufig an
--        den Mustersatzungen der kommunalen Spitzenverbände. Diese wiederum übernehmen als
--        Grenzwertvorschläge in der Regel die Richtwerte aus dem Merkblatt DWA-M 115-2" (§4.4, printed p.24)
--       Tabelle 3 column header is literally "Richtwerte" (printed p.25).
--     And §3.1 (p.18) says the binding Grenzwert is the one in the local Abwassersatzung, which "können von
--     Satzung zu Satzung variieren". A block gate therefore over-enforces: it hard-blocks a project whose
--     municipality permits e.g. 250 mg/l (the value the Anhang-A.5 example flyer prints, printed p.126).
--     Two options — owner picks ONE:
--     (i) downgrade to warn:
-- update public.compliance_requirements set severity='warn' where id='76fe5e81-fe71-456a-9807-57dab1f3ba41';
--     (ii) keep block but make the five limits SR-2 engineer selections (satzungsabhängig) instead of
--          hard-coded literals — needs 5 new limit fields on M760-05 and a rewritten condition; not
--          written out here because it is a design change, not a one-liner.
--     Rollback for (i): severity='block'.

-- ☐ RATIFIED  (b) REQ-M760-10 (65fd99ed-3325-4613-a270-ebd0ad234ebb) on M760-10, block,
--     'entleerintervall_d <= 30 AND generalinspektion_intervall_a <= 5'. The monthly interval is printed as
--     a default, not an absolute:
--       "Dabei wird der Fett- und Schlammsammelraum so bemessen, dass die Entleerung in der Regel monatlich
--        durchgeführt wird." (§9.1.2, printed p.66)
--     and the guideline explicitly contemplates deviating from it:
--       "Unter Umständen muss zum Beispiel auf autofreien Inseln von den auf dem Festland üblichen
--        Entleerungsintervallen erdeingebauter Fettabscheider abgewichen werden" (§10.2.4, printed p.100)
--     It is also wrong for two encoded plant types: Teilentsorgung empties "meist täglich" (§9.1.3, p.67)
--     and mobile separators need "Komplettentleerung mindestens wöchentlich" (Tabelle 31, p.70).
--     Proposed: keep block on the Generalinspektion term (that one IS mandatory — "in regelmäßigen
--     Abständen von maximal 5 Jahren", §10.2.2, printed p.98) and split the emptying term into a warn.
-- update public.compliance_requirements set condition='generalinspektion_intervall_a <= 5' where id='65fd99ed-3325-4613-a270-ebd0ad234ebb';
--     Rollback: condition='entleerintervall_d <= 30 AND generalinspektion_intervall_a <= 5'.

-- ☐ RATIFIED  (c) REQ-M760-08 (9d9cb816-abac-4c14-a562-1a8a99d2975f) on M760-08, block, 'c_h2s_ppm <= 5'.
--     The 5 ppm value IS binding law (Arbeitsplatzgrenzwert) and the quote is correct:
--       "ist der Arbeitgeber nach europäischem und deutschem Recht verpflichtet, das bindende Schutzziel für
--        Beschäftigte in Form des Arbeitsplatzgrenzwerts (AGW) mit einer Begrenzung der H2S-Belastung auf
--        5 ppm (über 8 h) bzw. 10 ppm (nicht mehr als 15 min) zu gewährleisten." (§8.2.8, printed p.56)
--     Two defects remain: (1) the AGW is an 8-h workplace exposure value, while c_h2s_ppm is encoded from
--     the Anhang-A.2 case measurements ("maximal 178 ppm", "maximal 111 ppm", printed p.117); the gate
--     therefore blocks on documented reality rather than on a design decision. (2) it sits on M760-08
--     "Branchen- und Kuechentyperfassung"; the field's other copy already lives on M760-11 "Auswirkungen
--     auf Kanal und Klaeranlage", which is where §8 belongs.
-- update public.compliance_requirements set worksheet_template_id='acbef60a-070c-402b-b57d-120f16135512' where id='9d9cb816-abac-4c14-a562-1a8a99d2975f';
--     Rollback: worksheet_template_id='68ad2af1-b5e1-4498-b47b-a3dae0ee81a6'.


-- ---------------------------------------------------------------------------------------------
-- S-6 · MISSING GATES for printed limits (nothing enforces these today).

-- ☐ RATIFIED  (a) Direkteinleitung effluent Richtwert. Field c_lipophil_direkt exists (M760-04 + M760-05)
--     and is quoted in the pack, but no gate reads it. Evidence (Bild-2-Legende):
--       "2 Anforderung (Überwachungswerte) an Gehalt lipophile Stoffe im Ablauf des Fettabscheiders vor der
--        Einleitung in die Vorklärung der Betriebskläranlage (Richtwert kleiner gleich $150 \mathrm{mg} / \mathrm{l}$ )"
--        (§4.1, printed p.22)
-- insert into public.compliance_requirements (worksheet_template_id, code, severity, condition, clause_reference, source_quote, requires_attestation)
--   values ('69f0549b-cd12-4e66-ad1a-0c756a78ce87','REQ-M760-13','warn','einleitungsart == ''direkt'' AND c_lipophil_direkt <= 150','§4.1; Bild 2','Richtwert kleiner gleich 150 mg/l (DWA-M 760, §4.1, Bild-2-Legende, printed p.22)',false);
--     Rollback: delete from public.compliance_requirements where code='REQ-M760-13' and worksheet_template_id='69f0549b-…';

-- ☐ RATIFIED  (b) Blähschlamm threshold — printed twice, encoded nowhere. There is no field for it, so this
--     needs a field first (M760-11 has only 3 fields and none for lipophile Stoffe).
--       "Durch wissenschaftliche Untersuchungen ist belegt, dass eine Konzentration von lipophilen Stoffen
--        über $150 \mathrm{mg} / \mathrm{l}$ im Zulauf zur Belebung die Blähschlammbildung begünstigt" (§8.4.1, printed p.60)
--       "dass eine Konzentration lipophiler Stoffe ab $150 \mathrm{mg} / \mathrm{l}$ das Wachstum nocardioformer
--        Actinomyceten begünstigt" (Anhang A.3, printed p.119)
--     Also unencoded from the same paragraph: "ab Konzentrationen von ca. 60 mg/l bis 120 mg/l" (O2-Transfer)
--     and "Schlammindex größer als 150 ml/g" (Blähschlamm definition), both printed p.60.
--     Proposed: add field c_lipophil_belebung (mg/l) on M760-11 + a warn gate. Not written out (new field).

-- ☐ RATIFIED  (c) M760-17 "Bewegliche Spueleinrichtungen" carries five Tabelle-31 fields and NO gate at all,
--     although Tabelle 31 prints hard minima:
--       "\hline Nennweite Zulauf & Mindestens DN 50 & Mindestens DN 100 \\"
--       "\hline Bemessungsgrundlage & Mindestaufenthaltsdauer 4 min im Fettabscheideraum & Gemäß DIN EN 1825-2 \\"
--       "\hline Entleerung & Fettentnahme täglich Komplettentleerung mindestens wöchentlich & …" (Tabelle 31, printed p.70)
-- insert into public.compliance_requirements (worksheet_template_id, code, severity, condition, clause_reference, source_quote, requires_attestation)
--   values ('a23af872-1ba6-4380-bb8e-421349ae2346','REQ-M760-14','block','aufenthaltsdauer_min >= 4','§9.1.4; Tabelle 31','Bemessungsgrundlage: Mindestaufenthaltsdauer 4 min im Fettabscheideraum (DWA-M 760, Tabelle 31, printed p.70)',false);
--     Rollback: delete from public.compliance_requirements where code='REQ-M760-14';

-- ☐ RATIFIED  (d) M760-20 "Trinkwasserschutz und Rueckstausicherung" carries five fields
--     (rueckstausicherung_pflicht, durchlüftung_pflicht, probenahmeschacht_pflicht, einbauhoehe_gok,
--     hebeanlage_pflicht) and NO gate, although §10.1.10 states the rule unconditionally:
--       "Jeder Fettabscheider, bei dem die Sohle des Auslaufs unter der Rückstauebene liegt, muss gegen
--        Rückstau geschützt werden." (§10.1.10, printed p.92)
--       "Generell ist der Einbau einer Rückstausicherung als Doppelhebeanlage notwendig, wenn der Ablauf des
--        Abscheiders unterhalb der Rückstauebene liegt." (§10.1.10, printed p.95-96)
-- insert into public.compliance_requirements (worksheet_template_id, code, severity, condition, clause_reference, source_quote, requires_attestation)
--   values ('3e22d9c5-7550-456b-b4ad-d15e5a6f9084','REQ-M760-15','block','rueckstausicherung_pflicht == true','§10.1.10','Jeder Fettabscheider, bei dem die Sohle des Auslaufs unter der Rückstauebene liegt, muss gegen Rückstau geschützt werden. (DWA-M 760, §10.1.10, printed p.92)',false);
--     Rollback: delete from public.compliance_requirements where code='REQ-M760-15';

-- ☐ RATIFIED  (e) Anhang A.4 Tabelle A.1 — the whole "Verzicht auf einen Fettabscheider" point matrix
--     (criteria A-G, thresholds "bis 14 Punkte Kein Fettabscheider erforderlich / 15 bis 18 Punkte
--     Ermessensspielraum / ab 19 Punkte Fettabscheider erforderlich", printed p.123-124) is NOT encoded at
--     all: no fields, no equation, no gate. That is the single largest content gap of this standard and the
--     obvious owner of the empty worksheet M760-12 "Verfahrensauswahl Vorbehandlung" (see S-7).
--     Also unencoded from the same annex: the Bagatellgrenze "1 m³/d (aufgerundet 500 m³/a)" and the
--     "Frischwassermenge abzüglich einer Menge von 50 m³/a pro angeschlossenen Einwohner" (printed p.124) —
--     for these the fields abwassermenge_jahr / frischwassermenge_jahr DO exist (on M760-09) but nothing
--     reads them. Needs a design decision, no SQL proposed.


-- ---------------------------------------------------------------------------------------------
-- S-7 · EMPTY WORKSHEETS (4 of 25) — this confirms the open "Package vs Prod reconciliation" finding for
-- DWA-M-760. It is a STRUCTURAL gap (tables/sections never imported), not a value defect. Nothing is
-- fixed here; the point is to state it precisely.
--   M760-12 "Verfahrensauswahl Vorbehandlung"      (95c7a877-8d10-4cb7-9a5e-c21887010fba, phase 3, calculation)  0 fields, 0 gates
--     → source content exists: §9.4 "Entscheidungskriterien zur Verfahrensauswahl" (printed p.86),
--       Tabelle 32 "Weitergehende Behandlungsverfahren" (p.72), Tabelle A.1 point matrix (p.123-124).
--   M760-19 "Bau und Einbau"                       (9e6e13f0-9bab-4980-9b1f-16e5ec76d6aa, phase 5, verification) 0 fields, 1 BLOCK gate
--     → the gate cannot evaluate (S-1b). Source content exists: §10.1.1-§10.1.8 (printed p.88-92),
--       incl. "muss für jede Abscheideranlage ein statischer Nachweis gemäß DIN 19901 erfolgen" (§10.1.4, p.90).
--   M760-21 "Betrieb und Eigenkontrolle"           (2fc3162b-af5d-4994-898f-edee2f05add4, phase 5, verification) 0 fields, 0 gates
--     → source content exists: §10.2.3 "monatliche Eigenkontrolle und eine jährliche Wartung" (printed p.98),
--       Betriebstagebuch (p.99), Fettschichtdickenmessung (p.98-99).
--   M760-25 "Ergebniszusammenfassung und Freigabe"  (b6a43da3-dc32-44ff-a516-0b68b327f6b8, phase 6, summary)      0 fields, 0 gates
--     → app-side roll-up worksheet; empty is defensible, but then it should not be a phase-6 gate step.
-- Owner decision: re-import DWA-M-760 from a corrected Pass3c workbook, or author these four worksheets.


-- ---------------------------------------------------------------------------------------------
-- S-8 · FIELD→WORKSHEET MAPPING. 75 of the 91 symbols exist TWICE, on two different worksheets, and the
-- pairing is systematically off by one or two worksheets in the phase-1/2 block. Evidence per pair:
--   Tabelle 3 set (ph_wert, ph_min, ph_max, t_abwasser, c_aox, c_lipophil, sed_stoffe, c_lipophil_direkt,
--     egw_dezentral) sits on M760-04 "Begriffe und Formelzeichen" AND M760-05 "Rechtliche Rahmenbedingungen".
--     Tabelle 3 is §4.4 (printed p.25) → M760-05 is the right home; the M760-04 copies are strays.
--   Tabelle 4 solubilities + rho_fett sit on M760-05 "Rechtliche Rahmenbedingungen" AND M760-06
--     "Eigenschaften der Fette". §5.2 (printed p.27-28) → M760-06 is the right home.
--   Tabelle 6 food data + Benzotriazol sit on M760-06 "Eigenschaften der Fette" AND M760-07 "Reinigungs-
--     und Desinfektionsmittel". §6.3/§6.4 (printed p.32) → M760-07 is the closer home; note that M760-07
--     carries NOT ONE field from Tabelle 5 "Inhaltsstoffe von Reinigungsmitteln" (printed p.29-30), which
--     is the table its title names.
--   Tabellen 8/9/10/11 + §7.1 household data sit on M760-07 AND M760-09 "Abwasseranfall und
--     Beschaffenheit". §7 (printed p.33-38) → M760-09 is the right home.
--   M760-09 is additionally a 42-field catch-all that duplicates the phase-3 worksheets: bauform_fa (also
--     M760-13), maschenweite_* / dn_zulauf_stationaer (also M760-14), ns_fettabscheider / f_d / f_t / f_r /
--     q_bemessung_dinen1825 (also M760-15), entleerintervall_teil_d (also M760-16), dn_zulauf_mobil /
--     aufenthaltsdauer_min / t_spuelzeit_min / t_zyklus_min / v_nachspuel_l (also M760-17).
-- ☐ RATIFIED  Deactivate the duplicate copies rather than re-home them, keeping the worksheet whose title
--     matches the clause. Proposed set to deactivate (17 rows, all the M760-09 copies that have a
--     phase-3 home, plus the M760-04 Tabelle-3 strays):
-- update public.fields set active=false where id in (
--   -- M760-09 copies duplicating M760-13/-14/-15/-16/-17
--   '1453384a-d299-4d3d-8864-bba2607705a5','28b23c83-ec29-4ea4-abe1-f90d4c37710a','6c503829-1bcf-46a1-89cc-d14caa190e5d',
--   '788083e8-7c6b-4151-a001-d6097d70de2b','1232bc68-5f44-48c5-81d8-be17e2fa3718','30916d4b-b6e3-4755-8af7-2b97f270e484',
--   'fe48081f-5da5-4255-9534-0b42f471c122','054c817a-4f6d-4cd0-b171-e50fbc6d46fb','e43097b2-1b8c-46ab-8824-4920bab9b6ca',
--   '92189b6d-bc96-40b9-9d29-a653b532a086','1f459b0f-591d-4af6-b7e6-cfba81ef9032','223fd248-2e79-48dc-bba9-6fae750763d1',
--   'b67b8fab-cb2c-4b77-9930-b0544fc14461','dbee4d45-fd3d-44ff-aa50-4042255334a8','76225690-3d03-4e98-a6bd-05f7a87fe571',
--   -- M760-04 Tabelle-3 strays (Tabelle 3 is §4.4 → M760-05)
--   '04262954-4484-4f54-8511-ae9f7b86b1e9','d8918bc0-d9b1-4219-8966-977b91f3f88b','3bfb563a-43cc-4b8b-a4e2-e270bab97418',
--   'ad9b5de6-29af-451e-bc6b-9571ed45c87a','80288112-c4bd-4fef-8123-3e4bb23f3e0c','03fcca15-5468-4da3-8e2d-b46ef5ff84bb',
--   '0b699208-27c7-497a-a269-a882d957007c','a2169b5d-9420-478a-8e1a-653102741511','c03c48c7-902f-47e1-beb6-ab2ba12ed73f');
--     CAUTION: REQ-M760-04 (block) reads the M760-04 copies. Apply S-5(a) / re-home that gate to M760-05
--     BEFORE this block, or the gate stops evaluating. Rollback: set active=true for the same ids.


-- ---------------------------------------------------------------------------------------------
-- S-9 · is_required REVIEW. 16 field rows carry is_required=true. Three groups are questionable:
-- ☐ RATIFIED  (a) The duplicated required booleans on the SUMMARY worksheet M760-10 "Zusammenfassung
--     Eingangsdaten" (archetype='summary'): probenahmeschacht_pflicht, durchlüftung_pflicht,
--     rueckstausicherung_pflicht, entleerintervall_d — all four also exist required/non-required on
--     M760-20/M760-23, which are the verification worksheets that own the clauses. A summary worksheet
--     should not demand input.
-- update public.fields set is_required=false where id in ('9a2103d5-02ed-4568-8f1c-849f8da7e489','473351b5-5d6a-46fa-90bf-513e2e77d8fb','cb56ed99-03f3-4015-9c86-764721a7ab1c','ba973600-80d7-42e6-a391-d2639b15c248');
--     Rollback: is_required=true for the same ids.
-- ☐ RATIFIED  (b) ns_fettabscheider is required on BOTH M760-09 and M760-15; einleitungsart on BOTH
--     M760-01 and M760-02; branchentyp on BOTH M760-01 and M760-08; analyseverfahren_sls on BOTH M760-11
--     and M760-24. Keep one of each (the worksheet whose title matches) — covered by S-8 if that block is
--     ratified; otherwise:
-- update public.fields set is_required=false where id in ('1232bc68-5f44-48c5-81d8-be17e2fa3718','4fec98c5-2304-4137-90d8-cae2a3cf98f4','11081f79-358a-4011-94ac-b917219875a7','6333fa8a-9d16-4905-891c-8ba2ab42be86');
-- ☐ RATIFIED  (c) c_aox and c_lipophil are is_required=true on M760-04 and M760-05. The guideline never
--     requires an AOX measurement of an Indirekteinleiter — §6.2 only warns that chlorine-releasing agents
--     "kann zu Grenzwertüberschreitungen führen" (printed p.31), and §11.3 says the Überwachung
--     "kann sich ... beispielsweise auf eine Dokumentenprüfung und Anlagenkontrolle beschränken"
--     (§11.3, printed p.108). Proposed: c_aox → is_required=false.
-- update public.fields set is_required=false where id in ('80288112-c4bd-4fef-8123-3e4bb23f3e0c','1e940fce-59cf-486f-9326-af6a117bd566');


-- ---------------------------------------------------------------------------------------------
-- S-10 · CLAUSE RETAGS + UNIT CORRECTIONS (evidence in the pack quotes).
-- ☐ RATIFIED  (a) keller_vorhanden clause_reference '§4.1' → '§10.1.3'. Evidence: "Für den Fall, dass kein
--     Kellerraum zur Verfügung steht, gibt es unter bestimmten Voraussetzungen die Möglichkeit, den
--     Fettabscheider außerhalb des Gebäudes in einem beheizten Container oder einfachen Anbau
--     unterzubringen" (§10.1.3, printed p.89). §4.1 is "Rechtliche Rahmenbedingungen / Allgemeines" and
--     says nothing about cellars.
-- update public.fields set clause_reference='§10.1.3' where id='6d212bec-400f-4dcf-8502-75bef451cfb5';
--     Rollback: clause_reference='§4.1'.
-- ☐ RATIFIED  (b) einbauhoehe_gok clause_reference '§10.1.10' → '§10.1.3', AND unit 'm' → 'mm'.
--     Evidence: "Beim Bau dieser Aufstellungsform ist zu beachten, dass die erforderliche Zulaufhöhe aus dem
--     Gebäude in der Regel bei ca. 400 mm über GOK liegt." (§10.1.3, printed p.89). The only figure the
--     guideline prints for this quantity is in mm; a field in m invites a 1000× entry error.
-- update public.fields set clause_reference='§10.1.3', unit='mm' where id='ce321a32-9017-4914-ad2c-61698fe59ed8';
--     Rollback: clause_reference='§10.1.10', unit='m'.
-- ☐ RATIFIED  (c) wartung_intervall_a / generalinspektion_intervall_a clause_reference '§9.1.3' →
--     '§10.2.3' resp. '§10.2.2; §10.2.5'. §9.1.3 mentions the intervals only in passing for Teilentsorger
--     ("Komplettentleerung nur bei einer Wartung spätestens jährlich bzw. bei einer Generalinspektion alle
--     fünf Jahre", printed p.67); the general rules are §10.2.3 (p.98) and §10.2.2/§10.2.5 (p.98/101).
-- update public.fields set clause_reference='§10.2.3' where id in ('2b415255-5332-468f-9e28-3eacd94f905d','410d8ca8-258b-4b4b-9c4d-a83da3f5f8dc');
-- update public.fields set clause_reference='§10.2.2; §10.2.5' where id in ('e5630104-e541-43fd-b06f-38b06e825c8e','45322806-63eb-4e0a-935c-a9b67d1dfb89');
--     Rollback: clause_reference='§9.1.3' for all four.
-- ☐ RATIFIED  (d) c_csb_sediment clause '§3.2; Tabelle 2' is correct but the field is orphaned on M760-04
--     with no description and no consumer; Tabelle 2 defines it as "$C_{\text{CSB}}$ & Konzentration des
--     Chemischen Sauerstoffbedarfs, sedimentiert" (printed p.20). No SQL — flagged as a candidate for
--     deactivation if nothing ever reads it.


-- ---------------------------------------------------------------------------------------------
-- S-11 · SOURCE_QUOTE / DESCRIPTION DEFECTS found while verifying (encode-time columns, not touched by the pack).
-- ☐ RATIFIED  (a) FABRICATED "Verbatim" LABELS. The descriptions of f_d, f_t, f_r (6 rows, M760-09 +
--     M760-15) open with 'Verbatim (10.1.2 Bemessung): …' and assert the formula "NS = Qs * fd * ft * fr"
--     and the terms Dichtefaktor / Temperaturfaktor / Erschwernisfaktor. NONE of those strings occurs
--     anywhere in DWA-M 760 (grep counts: "Dichtefaktor" 0, "Temperaturfaktor" 0, "Erschwernisfaktor" 0,
--     "NS =" 0). §10.1.2 prints only the three Bemessungsmethoden A/B/C and refers to DIN EN 1825-2
--     (printed p.89). The three factors are DIN EN 1825-2 content, which is NOT in the library → NR.
--     These 6 rows are the pack's field residue (left at their prior status, deliberately unverified).
-- update public.fields set description=replace(description,'Verbatim (10.1.2 Bemessung): ','Aus DIN EN 1825-2 (in DWA-M 760 nicht abgedruckt; §10.1.2 verweist nur darauf): ') where id in ('fe48081f-5da5-4255-9534-0b42f471c122','054c817a-4f6d-4cd0-b171-e50fbc6d46fb','e43097b2-1b8c-46ab-8824-4920bab9b6ca','d33c38e4-864e-419b-b6ca-1eb763cf2d78','85c72532-5150-4324-8bf7-ede9494ae671','f4fddad4-fe9b-42c4-b6cf-9b1cc1266c08');
--     Rollback: replace back.
-- ☐ RATIFIED  (b) INVERTED SOURCE. anteil_abscheidbar_pct (2 rows) is described as "Anteil abscheidbarer
--     Fette … 60-80 %; Einzelfälle 7,7 %, 13,7 %, 63 %". The guideline says the opposite about those three:
--     "Der Anteil an nicht abscheidbaren Fetten im Küchenabwasser kann sehr unterschiedlich sein. In drei
--      untersuchten Küchenbetrieben lag er bei $7,7 \%, 13,7 \%$ und $63 \%$ (Belouschek et al. 1994)."
--      (§7.2.4.2, printed p.38)
--     Only the 60-80 % figure is the separable share. The three single cases must be dropped or relabelled.
-- update public.fields set source_quote='Verbatim §7.2.4.2: etwa 60 % bis 80 % abscheidbar (Sbieschni 2004); die Einzelwerte 7,7 %, 13,7 % und 63 % (Belouschek et al. 1994) sind NICHT abscheidbare Anteile.' where id in ('1f84bf37-3e2a-4518-9aaa-cf2d689a1dfb','a3218a76-7624-4238-8b77-11e7c934abac');
-- ☐ RATIFIED  (c) FIGURE-ONLY source_quotes. probenahmeschacht_pflicht ("Bilder 45-46"),
--     durchlüftung_pflicht ("Bilder 39-41"), rueckstausicherung_pflicht ("Bilder 42-44") cite pictures, not
--     text. The pack now carries the real sentences; the encode-time source_quote should follow.
-- update public.fields set source_quote='Verbatim §10.1.12: Gemäß den Normen für Fettabscheider muss im Ablauf des Abscheiders und davon räumlich abgesetzt eine Probenahmeeinrichtung vorhanden sein. (printed p.96)' where id in ('9a2103d5-02ed-4568-8f1c-849f8da7e489','91267376-b55b-4b6f-bb27-9098e0702d1d');
-- update public.fields set source_quote='Verbatim §10.1.10: Jeder Fettabscheider, bei dem die Sohle des Auslaufs unter der Rückstauebene liegt, muss gegen Rückstau geschützt werden. (printed p.92)' where id in ('cb56ed99-03f3-4015-9c86-764721a7ab1c','a2d4e833-54ee-4558-9603-1739629fe73a');


-- ---------------------------------------------------------------------------------------------
-- S-12 · ENUM EDITS.
-- ☐ RATIFIED  (a) bauform_fa carries a 4th option "teilentsorgung" ("Fettabscheider mit Teilentsorgung").
--     Tabelle 29 "Übersicht über die verschiedenen Bauformen einer Fettabscheideranlage" (printed p.66)
--     lists exactly THREE Bauformen; Teilentsorgung is a different axis (§9.1.3 / Tabelle 30, printed
--     p.67-68) and can be combined with Bauform 1 or 2 — Bild 22 is "Beispiel Teilentsorger, Bauform 1"
--     and Bild 23 "Beispiel Teilentsorger, Bauform 2" (printed p.69). Mixing the two axes into one enum
--     makes "Teilentsorger, Bauform 1" unrepresentable. Proposed: split into bauform_fa (1/2/3) plus a
--     boolean teilentsorgung. Needs a new field — no one-liner written.
-- ☐ RATIFIED  (b) generalinspektion_befund is data_type='text' (free text) although the guideline prints a
--     closed three-way classification:
--     "Die Prüfberichte müssen immer mit einer Einstufung der Fettabscheideranlage als Anlage ohne bzw. mit
--      geringfügigen Mängeln, Anlage mit erheblichen Mängeln oder Anlage mit gefährlichen Mängeln enden"
--      (§10.2.5, printed p.103)
--     Per the 2026-08-01 owner ruling (fixed options ⇒ selection widget, never free text):
-- update public.fields set data_type='enum', enum_values='[{"value":"ohne_geringfuegige_maengel","label_de":"Anlage ohne bzw. mit geringfügigen Mängeln","label_en":"No or minor defects","order_index":1,"regulation_reference":"§10.2.5"},{"value":"erhebliche_maengel","label_de":"Anlage mit erheblichen Mängeln","label_en":"Substantial defects","order_index":2,"regulation_reference":"§10.2.5"},{"value":"gefaehrliche_maengel","label_de":"Anlage mit gefährlichen Mängeln","label_en":"Dangerous defects","order_index":3,"regulation_reference":"§10.2.5"}]'::jsonb, clause_reference='§10.2.5' where id='9de3b950-b3fb-4842-9bb3-faa92c3d91f5';
--     Rollback: data_type='text', enum_values=null.
-- ☐ RATIFIED  (c) analyseverfahren_sls offers two WITHDRAWN norms as selectable values. The guideline is
--     explicit about both: DIN 38409-56 is "zurückgezogen und ersetzt durch DIN ISO 11349:2015" (Quellen,
--     printed p.135) and for DIN 38409-19 "kann die Anwendung dieser zurückgezogenen Norm jedoch nicht
--     empfohlen werden" (§11.5.2, printed p.111). Keep them (they occur in old reports) but the labels
--     already say "(zurückgezogen)" — no change proposed; flagged so the choice is a conscious one.


-- ---------------------------------------------------------------------------------------------
-- S-13 · EQUATIONS.
-- ☐ RATIFIED  (a) EQ-M760-03 UNIT ERROR. formula 'F_fett_haus = c_lipophil_haus * wasserverbrauch_pe_d'
--     with c_lipophil_haus in mg/l and wasserverbrauch_pe_d in l/(P·d) yields mg/(P·d); the output field
--     F_fett_haus carries unit 'g/(P*d)'. A factor 1000 is missing. The guideline itself gives the load
--     directly and states the relation it used:
--     "Pro Einwohner und Tag wird nach vorliegenden Erhebungen insgesamt eine Menge von ca. 2 g bis 6 g Fett
--      ins Abwasser eingetragen, was einer Konzentration an lipophilen Stoffen von 18 mg/l bis 55 mg/l
--      entspricht" (§7.1, printed p.33) — i.e. it back-calculated at 200 l/(P·d)
--      ("So wurden die Bilanzierungen in älteren Publikationen mit einem Wasserverbrauch von 200 L pro Person
--       und Tag vorgenommen", §7.1, printed p.33).
-- update public.equations set formula='F_fett_haus = c_lipophil_haus * wasserverbrauch_pe_d / 1000' where id in ('ff782b49-a7f0-4fd7-a4cd-754009d053c9','17bf4db7-5a0a-4fca-bc61-94e7e1ebbd64');
--     Rollback: formula='F_fett_haus = c_lipophil_haus * wasserverbrauch_pe_d'.
-- ☐ RATIFIED  (b) EQ-M760-01 (2 rows, M760-09 + M760-15) is the pack's equation RESIDUE. Its formula
--     'NS = q_bemessung_dinen1825 * f_d * f_t * f_r' is NOT printed in DWA-M 760 (see S-11a) and its own
--     source_quote already admits it ("Verbatim Formel steht in DIN EN 1825-2, nicht in DWA-M 760 selbst").
--     It stays at needs_engineer_review until DIN EN 1825-2 enters the library → NR per SR-3.
-- ☐ RATIFIED  (c) EQ-M760-01/-02/-03 each exist TWICE (M760-09 and M760-15 resp. M760-07 and M760-09) —
--     same equation_number, same formula. Same duplication pattern as S-8; deactivating the M760-09 copies
--     of EQ-M760-01/-02 and the M760-07 copy of EQ-M760-03 would leave one owner each.


-- ---------------------------------------------------------------------------------------------
-- S-14 · WHAT THE MD COULD NOT SUPPORT (honest residue, no SQL).
--   · Tabelle 44 "Instrumente der Überwachung einer Indirekteinleitung fetthaltigen Abwassers" (§11.3,
--     printed p.108) appears in the transcript as a CAPTION ONLY — the table body did not survive the
--     mathpix conversion (md line 2921). Nothing was encoded from it, so nothing is lost today, but any
--     future encoding of §11.3 needs the PDF.
--   · Tabellen 5, 12, 13-28, 30, 32, 35-43, A.1, B.1-B.7 are fully present in the md but almost entirely
--     UNENCODED (only Tabellen 1, 2, 3, 4, 6, 8, 9, 10, 11, 29, 31, 33, 34 have fields). Branch-specific
--     Tabellen 12-26 (Gastronomie, Imbiss, Schnellrestaurant, Bäckerei, Fleischerei, Fischverarbeitung)
--     have no fields at all, although branchentyp offers all of those branches as options — so choosing
--     "fleischerei" or "baeckerei" changes nothing downstream.
--   · No PDF-page verification was performed (owner ruling 2026-09-05: md is the source). Grade stays VC;
--     upgrading to VA requires reading DWA-M_760_WD.pdf (25.9 MB, same folder) at the pages named above.
