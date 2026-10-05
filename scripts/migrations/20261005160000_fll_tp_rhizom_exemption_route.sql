-- 20261005160000_fll_tp_rhizom_exemption_route.sql = PORT of 20260925115000_fll_wave_rhz_exemption_route.sql (branch
--   feat/fll-field-na-structure, commits db152c7 / f006a92 / a4f89a8, harness-proven 6e7efe0) onto main, 2026-10-05, unchanged in body.
--   WHY NOW: owner 2026-10-05 - read the guidelines, check it yourself. TP §1 (PDF p. 8, printed 7) re-read on the rendered page in
--   this session settles the exemption route the readiness run left as ruling D-5: sealings that count as root- and rhizome-proof by
--   their material (e.g. Stahl, Beton, PEHD) need no separate FLL test proof; under intensive planting load the rhizome test is
--   required. This block encodes exactly that (route selector, material class, exempt conformity value, REQ-RHZ03-INTENSIV warn).
--   PRECONDITIONS re-checked on prod 2026-10-05 (read-only): fields columns widget / ui_config / lookup / visible_when /
--   consumer_worksheets / verification_quote present; REQ-RHZ21-CONFORMITY md5 29d6db2a5163fdb286534d3f50514722 and
--   REQ-RHZ18-VERDICT md5 197d1a2c1461a87e1f2a8d4cbdf11e57 unchanged (the md5 guards below match); 33 orphan fields (section NULL)
--   as at the 2026-09-25 baseline; sections A B C D F J K L M on every RHZ sheet; the archive table is created by this block itself
--   (CREATE TABLE IF NOT EXISTS). Blocks 4a / 4b / 120000 touch other symbols (joint, seam, VTS, scaling fields) - no overlap.
-- STAGED - not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005160000_fll_tp_rhizom_exemption_route.sql
-- Rollback: scripts/migrations/rollback-20261005160000_fll_tp_rhizom_exemption_route.sql
-- Read-back: scripts/verification/apply/readback-fll-tp-exemption-20261005.sql
--
-- ===== original 20260925115000 header and body follow unchanged =====
-- 20260925115000_fll_wave_rhz_exemption_route.sql · Plan B Task 7 — TP Rhizom ruling H-2: exemption route for sealings that
--   are root- and rhizome-resistant by their material (P-20 route selector on RHZ-03, P-21 material class on RHZ-02, P-22
--   test-route-only fields, P-23 exempt conformity value + REQ-RHZ21 / REQ-RHZ18 amendments) and the section backfill of the
--   33 orphan fields. Specs: vault 01-Projects/ekowai-wizard/fll-wizard-test/03_FLL-gap-vs-branch.md §"FLL-TP-RHIZOM-2023"
--   (P-20…P-23) and _parts/_audit_RHZ.md (A-RHZ-01…06). The Vorwort roof-greening route (A-RHZ-06, ruling H-3) is NOT built.
-- WRITTEN-NOT-APPLIED. Apply only after owner sign-off and AFTER the branch schema migration that adds fields.widget /
--   ui_config / lookup / visible_when (prod has none of them today: baseline _meta.columns_present).
-- Rollback: scripts/rollback-20260925115000-fll-wave-rhz-exemption-route.sql
--
-- Baseline: _baseline/2026-09-25_prod_fll_tp_rhizom.prior.json (captured 2026-09-25T08:26Z, READ ONLY): 149 fields, 189
--   sections (21 × A B C D F J K L M), 3 equations (all on RHZ-13), 24 gates, 33 fields with section_id_is_null.
--   Section meaning (template, .tmp-p3c-sql/FLL-TP-RHIZOM-2023.sql): A Zweck und Kontext · B Eingangsdaten · C
--   Worksheet-spezifischer Inhalt · D Abgeleitete Werte / Berechnungen · F Ergebnis-Zusammenfassung · J Output-Übergabe ·
--   K Notizen · L Freigabe · M Workflow-Verknüpfung.
--
-- Sources (SR-1, every quote re-read 2026-09-25 from the rendered PDF, pdftotext -layout -enc UTF-8 -f <p> -l <p>).
--   FLL TP Rhizomfestigkeit Gewässerabdichtungen 2023 (fll_tp_rhizomfestigkeit_gewaesserabdichtung_2023 (1).pdf);
--   PDF page = printed page + 1 (p. 8 prints "7", p. 12 prints "11").
--   PDF p. 8 (printed 7) §1 "Einführung":
--     "Abdichtungen, die aufgrund ihrer werkstoffspezifischen Eigenschaften als wurzel- und rhizomfest gelten (z. B. Stahl,
--     Beton, PEHD), erfordern keinen gesonderten Nachweis nach FLL-Prüfverfahren. Bei Abdichtungen, die nicht nach dem
--     FLL-Prüfverfahren geprüft werden können (z. B. mineralische Abdichtungen), ist die Wurzel- und Rhizombeständigkeit bei
--     Bedarf gesondert nachzuweisen. …"   (the paragraph continues "Dies gilt nicht für Bauweisen …" — not quoted)
--     EN: Sealings regarded as root- and rhizome-resistant because of their material-specific properties (e.g. steel,
--     concrete, PEHD) need no separate proof by an FLL test procedure. For sealings that cannot be tested by the FLL test
--     procedure (e.g. mineral sealings), root and rhizome resistance is to be proven separately where needed.
--                                                                            (P-20 nachweis_route, P-21 werkstoff_klasse,
--                                                                             P-22, P-23 werkstoffspezifisch_rhizomfest)
--     "Bei intensiverer Beanspruchung durch die Bepflanzung (z. B. Vegetation für Pflanzenkläranlagen und
--     Aufbereitungsbereiche von Schwimmteichen) ist eine Prüfung nach dem nachfolgend beschriebenen „Verfahren zur
--     Bestimmung der Rhizomfestigkeit von Gewässerabdichtungen“ der FLL erforderlich."
--     EN: Under more intensive loading from the planting (e.g. vegetation for constructed wetlands and the treatment zones
--     of swimming ponds), a test by the FLL "procedure for determining the rhizome resistance of water-body sealings"
--     described below is required.                                          (P-20 intensive_bepflanzung, REQ-RHZ03-INTENSIV)
--   PDF p. 12 (printed 11) §3.11 "Prüfergebnis":
--     "Ein Produkt gilt als rhizomfest, wenn in allen Prüfgefäßen nach Ablauf der Prüfdauer keine Rhizomeindringungen gemäß
--     Abschnitt 2.9 sowie keine Rhizomdurchdringungen gemäß Abschnitt 2.10 festzustellen sind. Voraussetzung ist zudem, dass
--     die in der Prüfung verwendeten Pflanzen in den Prüfgefäßen im gesamten Prüfungsverlauf eine ausreichende Wuchsleistung
--     gemäß Abschnitt 2.7 erbracht haben."
--     EN: A product counts as rhizome-resistant if, after the test period, no rhizome ingress per section 2.9 and no rhizome
--     penetration per section 2.10 is found in any test vessel. A further condition is that the plants used in the test
--     vessels grew sufficiently throughout the whole test per section 2.7. (The "2.x" cross-references are the print's own;
--     the clauses are §3.9 / §3.10 / §3.7.)
--     => "rhizomfest" is a TEST OUTCOME. It is therefore not offered for the exempt route: RHZ-18 gets no new value and is
--        hidden there; RHZ-21 gets the distinct value werkstoffspezifisch_rhizomfest, and REQ-RHZ21 refuses 'rhizomfest'
--        on the exempt route.                                                (P-23)
--   FLL GA-RL 2023 (fll_gewaesserabdichtungsrichtlinien_2023__2 (2).pdf, PDF page = printed + 2), PDF p. 97 (printed 95)
--     §6.4.1.1 "Abdichtungsstoffe": "Kunststoffbahnen aus PEHD besitzen eine ausreichende Widerstandsfähigkeit gegenüber
--     Wurzeln und Rhizomen. Auf eine Prüfung der Wurzel- und Rhizomfestigkeit kann verzichtet werden."
--     EN: PEHD plastic sheets have sufficient resistance to roots and rhizomes. Testing of root and rhizome resistance may
--     be waived.  (Cited as a REFERENCE only, in the description of REQ-RHZ03-INTENSIV — content-boundary rule (2).)
--   Final review I-2 (controller ruling), re-read 2026-09-25 in the fix wave (pdftotext -layout -f <p> -l <p>):
--     TP PDF p. 8 (printed 7) §1 — the "(z. B. Stahl, Beton, PEHD)" sentence above, verbatim.
--     GA-RL PDF p. 108 (printed 106) §7.3.1.1 "Abdichtungsstoffe" (GUP): "Abdichtungen aus GUP besitzen eine ausreichende
--       Widerstandsfähigkeit gegenüber Wurzeln und Rhizomen."  EN: GUP sealings have sufficient resistance to roots and
--       rhizomes.                                                             (-> werkstoff_klasse value 'gup')
--     GA-RL PDF p. 97 (printed 95) §6.4.1.1: "Bei Kunststoffbahnen aus PELD ist vom Hersteller zusätzlich ein Nachweis der
--       Wurzel- bzw. Rhizomfestigkeit gemäß FLL zu erbringen."  EN: for PELD plastic sheets the manufacturer must
--       additionally provide proof of root / rhizome resistance per FLL.   (evidence that a material outside the named
--       classes — PELD answers 'sonstige' — is NOT exempt by its material; -> REQ-RHZ03-WERKSTOFF)
--     All three are REFERENCES from GA-RL (content-boundary rule (2)); the TP's own list is open ("z. B."), so the gate is warn.
--
-- Symbols (the brief wins over 03_): route selector nachweis_route with 'pruefung' / 'werkstoffspezifisch' (03_ had
--   nachweisweg_rhizomfestigkeit / fll_pruefung / werkstoffspezifisch_entbehrlich / gesonderter_nachweis); material class
--   werkstoff_klasse with lower-case quoted tokens 'pehd', 'stahl', 'beton', 'sonstige' (A-RHZ-05 token-case fix; 03_'s
--   10-token list is not used). Every token in every condition and rule is quoted (A-GAR-06 / A-RHZ-05 (b)).
--
-- Contents (one transaction):
--   1. Section backfill of the 33 orphans (baseline section_id_is_null: true), each UPDATE guarded `f.section_id IS NULL`.
--      Choice per sheet = the data-entry section the sheet already uses (baseline section_code of its sectioned fields):
--        FLLTP-RHZ-01 → B  (all 6 sectioned fields in B)        attest_flltp_rhz_01_req_02
--        FLLTP-RHZ-03 → C  (scope_einzelprodukt_bestaetigt in C) scope_anwendungsbereich, scope_geltung_validiert,
--                                                               scope_pruefer_name, scope_pruefung_datum
--        FLLTP-RHZ-10 → C  (no sectioned field; C like the test-vessel installation on RHZ-09, whose layer thicknesses and
--                           standpipe sit in C)                  kontroll_einbau_datum, kontroll_standrohr_eingebaut,
--                                                               kontroll_vts_dicke_oben_mm, kontroll_vts_dicke_unten_mm,
--                                                               kontroll_vts_einbau_methode
--        FLLTP-RHZ-11 → B  (pflanzdichte_pro_gefaess in B)      anzahl_pflanzen_total, bepflanzung_datum,
--                                                               pflanzen_initial_zustand, pflanzung_methode
--        FLLTP-RHZ-14 → D  (bestandsdichte_p_avg_12mon in D)    auswertungs_datum_12mon, kontrolle_p_avg_12mon,
--                                                               relativ_prozent_12mon, wuchsleistung_12mon_ausreichend
--        FLLTP-RHZ-15 → D  (bestandsdichte_p_avg_18mon in D)    auswertungs_datum_18mon, kontrolle_p_avg_18mon,
--                                                               relativ_prozent_18mon, wuchsleistung_18mon_ausreichend
--        FLLTP-RHZ-16 → D  (bestandsdichte_p_avg_24mon in D)    endauswertung_datum, kontrolle_p_avg_24mon,
--                                                               relativ_prozent_24mon, wuchsleistung_24mon_ausreichend
--        FLLTP-RHZ-19 → F  (bericht_* / gueltigkeitsdauer in F) attest_flltp_rhz_19_req_21
--        FLLTP-RHZ-21 → F  (no sectioned field; F "Ergebnis-Zusammenfassung", like the verdict sheet RHZ-18 and the report
--                           sheet RHZ-19, whose fields all sit in F) bescheinigung_ausgestellt_durch,
--                                                               bescheinigung_ausstellung_datum, bescheinigung_gueltig_bis,
--                                                               bescheinigung_pruefnummer, final_rhizom_conformity,
--                                                               pruefer_signatur_eingeholt
--      (1+4+5+4+4+4+4+1+6 = 33.) Placement only; no value, requirement or gate changes.
--   2. New fields (INSERT … WHERE NOT EXISTS; shape of 20260925114000; verification_status imported_unverified,
--      verification_quote = the re-read TP §1 sentence):
--      P-21 FLLTP-RHZ-02 werkstoff_klasse (enum pehd/stahl/beton/sonstige, required, section B, consumers {FLLTP-RHZ-03} —
--           shown beside the route choice, A-RHZ-05 (d))
--      P-20 FLLTP-RHZ-03 nachweis_route (enum pruefung/werkstoffspezifisch, required, section C, consumers = the 20 other
--           RHZ sheets — every sheet whose visible_when or gate reads it; the form resolves a foreign driver only through
--           consumer_worksheets, visibility.ts inheritedFieldsFor)
--           nachweis_begruendung (text, required when visible, visible_when nachweis_route == 'werkstoffspezifisch')
--           intensive_bepflanzung (boolean, required when visible, same visible_when)
--   3. P-23 enum append on FLLTP-RHZ-21 final_rhizom_conformity: werkstoffspezifisch_rhizomfest (guarded NOT @>).
--      FLLTP-RHZ-18 pruefergebnis_rhizomfest gets NO new value (§3.11 test outcome).
--   4. P-22 visible_when = 'nachweis_route == ''pruefung''' (guard f.visible_when IS NULL) on:
--      RHZ-01 the test-order fields pruefinstitut_name, pruefbericht_nr, pruefung_startdatum, pruefung_enddatum,
--             auftraggeber_name, auftraggeber_kontakt (NOT attest_flltp_rhz_01_req_02 — REQ-02 scope attestation stays)
--      RHZ-04 … 12, 14 … 17, 19, 20: every baseline field of the sheet
--      RHZ-13 only bestandsdichte_p_avg_6mon, wuchsleistung_ausreichend (producer guard, below)
--      RHZ-18 pruefergebnis_rhizomfest, abbruchsgrund
--      RHZ-21 the certificate fields bescheinigung_gueltig_bis, bescheinigung_ausgestellt_durch, bescheinigung_pruefnummer,
--             bescheinigung_ausstellung_datum, pruefer_signatur_eingeholt (final_rhizom_conformity stays visible)
--      119 fields in 19 UPDATEs. A value-less route (nachweis_route empty) evaluates `pending`, which keeps every field
--      VISIBLE (fail-safe, visibility.ts) — nothing is hidden before the engineer answers the required selector.
--   5. Gate amendments (archive → UPDATE; B-1 SET condition first; B-5 cr.code first; md5 guard on the baseline text):
--      FLLTP-RHZ-21 REQ-RHZ21-CONFORMITY (block) md5 29d6db2a5163fdb286534d3f50514722
--        "final_rhizom_conformity == 'rhizomfest'" →
--        "nachweis_route IS NOT NULL AND ((nachweis_route == 'pruefung' AND final_rhizom_conformity == 'rhizomfest') OR
--         (nachweis_route == 'werkstoffspezifisch' AND final_rhizom_conformity == 'werkstoffspezifisch_rhizomfest'))"
--        Fix round 1 (controller ruling): the leading "nachweis_route IS NOT NULL" makes an unanswered route a definite
--        FAIL instead of pending (pending never blocks, approval-gate.ts:234–256) — otherwise RHZ-21 could be approved with
--        werkstoffspezifisch_rhizomfest while the route is empty. The honesty safeguard outranks the brief's literal text.
--      FLLTP-RHZ-18 REQ-RHZ18-VERDICT (block) md5 197d1a2c1461a87e1f2a8d4cbdf11e57
--        "pruefergebnis_rhizomfest == 'rhizomfest'" → "IF nachweis_route == 'pruefung' THEN pruefergebnis_rhizomfest ==
--         'rhizomfest'"
--      Parser: OR between parenthesised groups is supported (src/lib/compliance/evaluate.ts grammar note "AND/OR/NOT/
--        parentheses, IF cond THEN cond"), so the brief's primary form is used; the IF…AND IF fallback is not needed.
--      md5 values re-computed this session from the baseline conditions (node crypto): 197d1a2c… / 29d6db2a… — equal to the
--        controller's table. A changed prod text makes the UPDATE a no-op (0 rows) and archives nothing.
--   6. New gates (INSERT … WHERE NOT EXISTS, `-- CONDITION` marker, ruling B-2):
--      FLLTP-RHZ-03 REQ-RHZ03-WERKSTOFF  warn  IF nachweis_route == 'werkstoffspezifisch' THEN werkstoff_klasse IN {'pehd',
--        'stahl', 'beton', 'gup'}  (final review I-2: werkstoff_klasse fed no gate, so a 'sonstige' material passed REQ-RHZ21
--        on the exempt route; warn because TP §1 lists materials only "z. B." — SIGN-OFF fllwave-H-2b). werkstoff_klasse
--        (RHZ-02) reaches RHZ-03 through its consumer list {FLLTP-RHZ-03}. The parser's IN form accepts quoted members
--        (src/lib/expr/parser.ts parseLiteral: a quoted string is a literal), so no OR-chain is needed.
--      FLLTP-RHZ-03 REQ-RHZ03-INTENSIV  warn  IF nachweis_route == 'werkstoffspezifisch' THEN intensive_bepflanzung == false
--      Modal: TP §1 "ist … erforderlich" (is required) for intensive planting — but GA-RL §6.4.1.1 lets PEHD waive the test
--      ("kann verzichtet werden"); the two documents meet exactly at a PEHD swimming-pond treatment zone. Whether the GA-RL
--      waiver overrides TP §1 is an owner ruling, so the gate only WARNS (for every material, PEHD included) and names both
--      texts → SIGN-OFF fllwave-P-20-INTENSIV.
--
-- B-3 (visible_when composition): no RHZ field carries a rule anywhere. Checked 2026-09-25: `grep -rln visible_when
--   scripts/migrations | xargs grep -li "rhz\|rhizom"` → only 20260917100710_field_configs_fll_gar.sql, whose RHZ hits are
--   GA-RL fields (pe_werkstoff, pe_rhizom_nachweis_code, durchdringungen, pflanzenarten on FLL-GAR-18/-24), none on an
--   FLLTP-RHZ sheet; 20260801500000_fllrhz_isnotnull.sql / 20260731190000_batch17_source_settled.sql touch RHZ gates only
--   (REQ-03/04, REQ-01), and the _STAGED_2026072* files are not applied and hold no RHZ visible_when; of
--   scripts/verification/*.sql only fll_gar-STAGED-plan3-rulings.sql mentions "rhizom" (GA-RL fields
--   wurzel_rhizomfestigkeit_required / pe_rhizom_nachweis_code on FLL-GAR sheets, no FLLTP-RHZ field). The branch encodes no
--   RHZ field config (no RHZ emitter). Prod has no visible_when column (baseline). So every UPDATE guards
--   `f.visible_when IS NULL` — per sheet: RHZ-01, -04 … -21 (as listed in 4.): no existing rule → IS NULL guard.
--
-- Producer guard (no visible_when on an equation OUTPUT, nor on an input whose same-sheet equation output feeds a gate).
--   Equations (baseline, all on RHZ-13): EQ-1 bestandsdichte_p_avg ← P_1…P_8; EQ-2 bestandsdichte_k_avg ← K_1…K_3; EQ-3
--   dichte_relativ_prozent ← bestandsdichte_p_avg, bestandsdichte_k_avg. dichte_relativ_prozent feeds REQ-15 (same sheet),
--   REQ-16 / REQ-17 (RHZ-12) and REQ-18 (RHZ-16). Therefore NOT hidden (reported, not hidden): the outputs
--   bestandsdichte_p_avg, bestandsdichte_k_avg, dichte_relativ_prozent and the inputs P_1…P_8, K_1…K_3. No other RHZ sheet
--   has an equation, so no other field is guarded.
--   Consumed producers that ARE hidden (capture = baseline consumer_worksheets; "captured NULL" visible_when; rollback resets
--   only rows still carrying this rule). Each consumer is itself a test-route sheet or reads the symbol in no gate:
--     RHZ-01 pruefinstitut_name → 19, 21 · pruefung_startdatum → 13, 14, 15, 16, 19 · pruefbericht_nr, pruefung_enddatum,
--            auftraggeber_name, auftraggeber_kontakt → 19            (no gate reads any of them)
--     RHZ-05 anzahl_kontrollgefaesse → 10, 13–16 · anzahl_pruefgefaesse → 13–17 · gefaess_innenmass_l_mm → 09, 10 ·
--            trennlage_eingebaut, widerlager_dicke_mm → 09           (only REQ-06, on -05 itself, reads them)
--     RHZ-07 duenger_n_prozent → 12 · RHZ-08 testpflanze_art → 11 · RHZ-09 vts_obere/untere_schicht_dicke_mm → 10
--            (REQ-10 on RHZ-04 reads testpflanze_art cross-sheet — see the gate list)
--     RHZ-11 pflanzdichte_pro_gefaess → 12–16 (read by REQ-10 on RHZ-04, cross-sheet)
--     RHZ-13 bestandsdichte_p_avg_6mon → 21 · wuchsleistung_ausreichend → 14, 15, 16, 18, 21 (no equation reads either;
--            REQ-15 on -13 reads bestandsdichte_p_avg_6mon)
--     RHZ-16 bestandsdichte_p_avg_24mon → 18, 21 (REQ-18 on -16 itself)
--     RHZ-17 the five rhizom*_count → 18, 21 · fotos_dokumentiert, max_eindringtiefe_ueberlappung_mm,
--            rueckstellproben_entnommen → 19                         (REQ-19 / REQ-20 on -17 itself)
--     RHZ-18 pruefergebnis_rhizomfest → 19, 21 · abbruchsgrund → 19 (REQ-RHZ18 on -18; REQ-RHZ21 no longer reads it)
--     RHZ-19 bericht_datum → 20 · gueltigkeitsdauer_jahre → 20, 21  (no gate reads them)
--   No hidden field is an equation input or output.
--
-- Gates on the exempt route (nachweis_route = 'werkstoffspezifisch'):
--   not_applicable (a referenced symbol is hidden on the gate's own sheet — approval-gate.ts: never a blocker):
--     RHZ-04 REQ-05 · RHZ-05 REQ-06 · RHZ-06 REQ-07 · RHZ-07 REQ-08, REQ-09 · RHZ-09 REQ-11, REQ-12, REQ-13 · RHZ-12 REQ-14
--     · RHZ-13 REQ-15 (bestandsdichte_p_avg_6mon hidden) · RHZ-16 REQ-18 (bestandsdichte_p_avg_24mon hidden) · RHZ-17
--     REQ-19, REQ-20 · RHZ-18 REQ-RHZ18-VERDICT (hidden verdict; its IF-guard also passes) · RHZ-19 REQ-21 · RHZ-20 REQ-22.
--   stay pending (never a block; they read only FOREIGN symbols, which are hidden on their own sheets and left empty):
--     RHZ-04 REQ-10 (testpflanze_art -08, pflanzdichte_pro_gefaess -11) · RHZ-12 REQ-16, REQ-17 (-14 / -15 means and the
--     -13 dichte_relativ_prozent). A value typed BEFORE switching to the exempt route would still be judged there (hiding is
--     per worksheet — same limitation as NT REQ-10, Task 6); mis-homing is A-RHZ-08, not changed here.
--   stay enforced: RHZ-01 REQ-01 (abdichtungsart / scope_einzelprodukt_bestaetigt, both visible) and REQ-02 (scope
--     attestation) · RHZ-02 REQ-03, REQ-04 · RHZ-21 REQ-RHZ21-CONFORMITY (passes only with werkstoffspezifisch_rhizomfest)
--     · the new warn REQ-RHZ03-INTENSIV and REQ-RHZ03-WERKSTOFF.
--   On the test route nothing changes except REQ-RHZ21 (still passes only 'rhizomfest') and REQ-RHZ18 (still fails any
--   non-'rhizomfest' verdict).
--
-- REVERSALS / deviations (R-5; each with its reason):
--   D-a  Page: the brief cites "TP §1 … PDF p. 7". p. 7 is the PRINTED page; the PDF page is 8 (the PEHD sentence is not
--        on PDF p. 7, which carries the Vorwort). Quoted above with PDF p. 8 (printed 7).
--   D-b  RHZ-01 auftraggeber_name / auftraggeber_kontakt are hidden too (03_ P-22 lists only four RHZ-01 fields). They are
--        the client of the test ORDER (sheet "Auftragsregistrierung"; consumed only by the test report RHZ-19); on the
--        exempt route there is no order, and leaving them required would force invented data (A-RHZ-01 class).
--   D-c  RHZ-18 abbruchsgrund is hidden with the verdict (03_ P-22 names both; the brief says "RHZ-18 (verdict)").
--   D-d  nachweis_begruendung / intensive_bepflanzung and the warn gate come from 03_ P-20 (the brief names only the
--        selector). 03_'s block gate "werkstoff_klasse IN {PEHD, Stahl, Beton} OR nachweis_begruendung IS NOT EMPTY" is
--        NOT written: with the reason required whenever the exempt route is chosen it is always true. 03_'s warn exempted
--        PEHD; here it warns for PEHD too (see §6 — the waiver's precedence is the owner's call).
--
-- NOT DONE HERE (residue, with reason):
--   RHZ-13 on the exempt route keeps P_1…P_8, K_1…K_3 and the three EQ outputs visible (producer guard). Where they are
--     required, the sheet cannot be approved empty on the exempt route: the engineer marks them field-level N.A. (Plan A)
--     or the sheet N.A. Clean fix = hide the whole RHZ-13 evaluation once REQ-16/17/18 stop reading its dichte_relativ_prozent
--     (A-RHZ-07) — a ruling, not done here.
--   P-21 TP §6 product data (werkstoffbezeichnung, stoffnormen, produktdicke_mm, lieferform, herstelltechnik,
--     herstellungsjahr, biozid_konzentration): TP §6 was not re-read this session — not written.
--   P-23 read-only nachweis_zitat (lookup_fill of the TP §1 sentence) for the Konformitätserklärung: needs a lookup source
--     row (regulation_tables) — not hand-patched; the TP §1 sentence is carried in nachweis_route.verification_quote.
--   The third 03_ route "gesonderter_nachweis" (TP §1 2nd sentence, mineral sealings) and the Vorwort roof-greening route
--     (H-3, A-RHZ-06) are not built (brief: two routes only; H-3 awaits the owner).
--   abdichtungsart (RHZ-02, REQ-01 on RHZ-01) has no steel / concrete value: a steel or concrete sealing cannot answer
--     that required field honestly — PEHD answers 'kunststoffbahn'. Listed, not changed (REQ-01 scope is A-RHZ-09).
--   P-24 (sheet vs non-sheet visibility on RHZ-09 / -17): not in this task.
--
-- SIGN-OFF blocks (judgment items; nothing here is applied by a session):
--   SIGN-OFF fllwave-H-2 — exemption route per TP §1 ("z. B. Stahl, Beton, PEHD … erfordern keinen gesonderten Nachweis"):
--     lab sheets RHZ-01 (order fields), -04…-20 and the RHZ-21 certificate fields become test-route-only; REQ-RHZ21 accepts
--     werkstoffspezifisch_rhizomfest on the exempt route only; REQ-RHZ18 judges only on the test route (enforcement change
--     resting on the owner's ruling H-2).
--   SIGN-OFF fllwave-H-2b — new warn gate REQ-RHZ03-WERKSTOFF + werkstoff_klasse value 'gup' (final review I-2).
--   SIGN-OFF fllwave-P-20-INTENSIV — new warn gate REQ-RHZ03-INTENSIV (TP §1 "erforderlich" vs GA-RL §6.4.1.1 "kann
--     verzichtet werden"); owner: keep warn, raise to block for non-PEHD, or drop.
--   SIGN-OFF fllwave-orphan-sections — section choice per sheet for the 33 orphans (list in 1.).
--   SIGN-OFF fllwave-H-3 — NOT built (Vorwort route); listed so it is not lost.
-- Test: src/lib/compliance/__tests__/fll-wave/rhz-route.test.ts
BEGIN;

-- 1. section backfill of the 33 orphans (guard: section_id IS NULL; choice per sheet in the header)
UPDATE fields f
   SET section_id = ws.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'B'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('attest_flltp_rhz_01_req_02') AND w.code = 'FLLTP-RHZ-01' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id IS NULL;
UPDATE fields f
   SET section_id = ws.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'C'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('scope_anwendungsbereich', 'scope_geltung_validiert', 'scope_pruefer_name', 'scope_pruefung_datum') AND w.code = 'FLLTP-RHZ-03' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id IS NULL;
UPDATE fields f
   SET section_id = ws.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'C'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('kontroll_einbau_datum', 'kontroll_standrohr_eingebaut', 'kontroll_vts_dicke_oben_mm', 'kontroll_vts_dicke_unten_mm', 'kontroll_vts_einbau_methode') AND w.code = 'FLLTP-RHZ-10' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id IS NULL;
UPDATE fields f
   SET section_id = ws.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'B'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('anzahl_pflanzen_total', 'bepflanzung_datum', 'pflanzen_initial_zustand', 'pflanzung_methode') AND w.code = 'FLLTP-RHZ-11' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id IS NULL;
UPDATE fields f
   SET section_id = ws.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'D'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('auswertungs_datum_12mon', 'kontrolle_p_avg_12mon', 'relativ_prozent_12mon', 'wuchsleistung_12mon_ausreichend') AND w.code = 'FLLTP-RHZ-14' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id IS NULL;
UPDATE fields f
   SET section_id = ws.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'D'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('auswertungs_datum_18mon', 'kontrolle_p_avg_18mon', 'relativ_prozent_18mon', 'wuchsleistung_18mon_ausreichend') AND w.code = 'FLLTP-RHZ-15' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id IS NULL;
UPDATE fields f
   SET section_id = ws.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'D'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('endauswertung_datum', 'kontrolle_p_avg_24mon', 'relativ_prozent_24mon', 'wuchsleistung_24mon_ausreichend') AND w.code = 'FLLTP-RHZ-16' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id IS NULL;
UPDATE fields f
   SET section_id = ws.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'F'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('attest_flltp_rhz_19_req_21') AND w.code = 'FLLTP-RHZ-19' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id IS NULL;
UPDATE fields f
   SET section_id = ws.id
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
       JOIN worksheet_sections ws ON ws.worksheet_template_id = w.id AND ws.code = 'F'
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('bescheinigung_ausgestellt_durch', 'bescheinigung_ausstellung_datum', 'bescheinigung_gueltig_bis', 'bescheinigung_pruefnummer', 'final_rhizom_conformity', 'pruefer_signatur_eingeholt') AND w.code = 'FLLTP-RHZ-21' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.section_id IS NULL;

-- 2. new fields
-- P-21: FLLTP-RHZ-02.werkstoff_klasse
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'B'), 'werkstoff_klasse', 'Werkstoff der Abdichtung', 'Sealing material', 'enum', NULL, true, '§1', 'Plan B fllwave P-21 / Ruling H-2: Werkstoffklasse für die Wahl des Nachweiswegs auf FLLTP-RHZ-03. TP §1 nennt als werkstoffspezifisch wurzel- und rhizomfest "z. B. Stahl, Beton, PEHD" (offene Aufzählung — "sonstige" verlangt auf dem werkstoffspezifischen Weg eine Begründung, nachweis_begruendung). GUP nach FLL GA-RL 2023 §7.3.1.1 (Verweis, final review I-2); REQ-RHZ03-WERKSTOFF (warn) meldet "sonstige" auf dem werkstoffspezifischen Weg.', 'imported_unverified', 'Abdichtungen, die aufgrund ihrer werkstoffspezifischen Eigenschaften als wurzel- und rhizomfest gelten (z. B. Stahl, Beton, PEHD), erfordern keinen gesonderten Nachweis nach FLL-Prüfverfahren.', 'select_one', NULL, NULL, NULL, '[{"value":"pehd","label_de":"PEHD (Polyethylen hoher Dichte)","label_en":"PEHD (high-density polyethylene)","order_index":1,"regulation_reference":"§1"},{"value":"stahl","label_de":"Stahl","label_en":"Steel","order_index":2,"regulation_reference":"§1"},{"value":"beton","label_de":"Beton","label_en":"Concrete","order_index":3,"regulation_reference":"§1"},{"value":"gup","label_de":"GUP (glasfaserverstärktes ungesättigtes Polyester)","label_en":"GUP (glass-fibre-reinforced unsaturated polyester)","order_index":4,"regulation_reference":"FLL GA-RL 2023 §7.3.1.1"},{"value":"sonstige","label_de":"Sonstiger Werkstoff","label_en":"Other material","order_index":5,"regulation_reference":"§1"}]'::jsonb, ARRAY['FLLTP-RHZ-03']::text[], (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'werkstoff_klasse') AND w.code = 'FLLTP-RHZ-02' AND s.code = 'FLL-TP-RHIZOM-2023';
-- P-20: FLLTP-RHZ-03.nachweis_route
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'nachweis_route', 'Nachweisweg der Wurzel- und Rhizomfestigkeit', 'Route of the root and rhizome resistance proof', 'enum', NULL, true, '§1', 'Plan B fllwave P-20 / Ruling H-2: Hauptschalter. "pruefung" = Prüfung nach dem FLL-Verfahren (die Laborblätter FLLTP-RHZ-04…20, die Prüfauftragsfelder auf -01 und die Bescheinigungsfelder auf -21 sind nur dann sichtbar). "werkstoffspezifisch" = werkstoffspezifisch wurzel- und rhizomfest nach TP §1, kein gesonderter Nachweis nach FLL-Prüfverfahren; Konformität auf -21 dann "werkstoffspezifisch_rhizomfest". Der Vorwort-Weg (Dachbegrünungsprüfung, geringe Beanspruchung) ist nicht abgebildet (fllwave-H-3).', 'imported_unverified', 'Abdichtungen, die aufgrund ihrer werkstoffspezifischen Eigenschaften als wurzel- und rhizomfest gelten (z. B. Stahl, Beton, PEHD), erfordern keinen gesonderten Nachweis nach FLL-Prüfverfahren. Bei Abdichtungen, die nicht nach dem FLL-Prüfverfahren geprüft werden können (z. B. mineralische Abdichtungen), ist die Wurzel- und Rhizombeständigkeit bei Bedarf gesondert nachzuweisen.', 'select_one', NULL, NULL, NULL, '[{"value":"pruefung","label_de":"Prüfung nach dem FLL-„Verfahren zur Bestimmung der Rhizomfestigkeit von Gewässerabdichtungen“","label_en":"Test by the FLL procedure for determining the rhizome resistance of water-body sealings","order_index":1,"regulation_reference":"§1"},{"value":"werkstoffspezifisch","label_de":"Werkstoffspezifisch wurzel- und rhizomfest (z. B. Stahl, Beton, PEHD) – kein gesonderter Nachweis nach FLL-Prüfverfahren","label_en":"Root- and rhizome-resistant by material (e.g. steel, concrete, PEHD) – no separate proof by an FLL test procedure","order_index":2,"regulation_reference":"§1"}]'::jsonb, ARRAY['FLLTP-RHZ-01','FLLTP-RHZ-02','FLLTP-RHZ-04','FLLTP-RHZ-05','FLLTP-RHZ-06','FLLTP-RHZ-07','FLLTP-RHZ-08','FLLTP-RHZ-09','FLLTP-RHZ-10','FLLTP-RHZ-11','FLLTP-RHZ-12','FLLTP-RHZ-13','FLLTP-RHZ-14','FLLTP-RHZ-15','FLLTP-RHZ-16','FLLTP-RHZ-17','FLLTP-RHZ-18','FLLTP-RHZ-19','FLLTP-RHZ-20','FLLTP-RHZ-21']::text[], (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'nachweis_route') AND w.code = 'FLLTP-RHZ-03' AND s.code = 'FLL-TP-RHIZOM-2023';
-- P-20: FLLTP-RHZ-03.nachweis_begruendung
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'nachweis_begruendung', 'Begründung des werkstoffspezifischen Nachweiswegs (Werkstoff, Quelle)', 'Reason for the material-based route (material, source)', 'text', NULL, true, '§1', 'Plan B fllwave P-20: nur sichtbar (und dann Pflicht), wenn nachweis_route = werkstoffspezifisch. TP §1 zählt die Werkstoffe nur beispielhaft auf ("z. B."); die Begründung nennt Werkstoff und Grundlage.', 'imported_unverified', 'Abdichtungen, die aufgrund ihrer werkstoffspezifischen Eigenschaften als wurzel- und rhizomfest gelten (z. B. Stahl, Beton, PEHD), erfordern keinen gesonderten Nachweis nach FLL-Prüfverfahren.', 'scalar', NULL, NULL, 'nachweis_route == ''werkstoffspezifisch''', NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'nachweis_begruendung') AND w.code = 'FLLTP-RHZ-03' AND s.code = 'FLL-TP-RHIZOM-2023';
-- P-20: FLLTP-RHZ-03.intensive_bepflanzung
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id, (SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = 'C'), 'intensive_bepflanzung', 'Intensivere Beanspruchung durch die Bepflanzung (z. B. Pflanzenkläranlagen, Aufbereitungsbereiche von Schwimmteichen)', 'More intensive loading from the planting (e.g. constructed wetlands, treatment zones of swimming ponds)', 'boolean', NULL, true, '§1', 'Plan B fllwave P-20: nur sichtbar (und dann Pflicht) auf dem werkstoffspezifischen Weg; "ja" löst die Warnung REQ-RHZ03-INTENSIV aus (TP §1: Prüfung nach dem FLL-Verfahren erforderlich).', 'imported_unverified', 'Bei intensiverer Beanspruchung durch die Bepflanzung (z. B. Vegetation für Pflanzenkläranlagen und Aufbereitungsbereiche von Schwimmteichen) ist eine Prüfung nach dem nachfolgend beschriebenen „Verfahren zur Bestimmung der Rhizomfestigkeit von Gewässerabdichtungen“ der FLL erforderlich.', 'scalar', NULL, NULL, 'nachweis_route == ''werkstoffspezifisch''', NULL, NULL, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'intensive_bepflanzung') AND w.code = 'FLLTP-RHZ-03' AND s.code = 'FLL-TP-RHIZOM-2023';

-- 3. P-23: werkstoffspezifisch_rhizomfest in final_rhizom_conformity (FLLTP-RHZ-21); RHZ-18 pruefergebnis_rhizomfest unchanged
UPDATE fields f
   SET enum_values = f.enum_values || '[{"value":"werkstoffspezifisch_rhizomfest","label_de":"werkstoffspezifisch wurzel- und rhizomfest – kein gesonderter Nachweis nach FLL-Prüfverfahren (TP §1)","label_en":"root- and rhizome-resistant by material – no separate proof by an FLL test procedure (TP §1)","order_index":4,"regulation_reference":"§1"}]'::jsonb
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol = 'final_rhizom_conformity' AND w.code = 'FLLTP-RHZ-21' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.enum_values IS NOT NULL AND NOT (f.enum_values @> '[{"value":"werkstoffspezifisch_rhizomfest"}]'::jsonb);

-- 4. P-22: lab-only fields visible only on the test route (B-3: IS NULL guards; producer guard: RHZ-13 EQ inputs/outputs excluded)
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('auftraggeber_kontakt', 'auftraggeber_name', 'pruefbericht_nr', 'pruefinstitut_name', 'pruefung_enddatum', 'pruefung_startdatum') AND w.code = 'FLLTP-RHZ-01' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('flaechenbedarf_pro_gefaess_m2', 'gewaechshaus_id', 'temp_lueftung_schwelle_C', 'temp_max_C', 'temp_nachts_C', 'temp_tagsueber_C') AND w.code = 'FLLTP-RHZ-04' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('anzahl_kontrollgefaesse', 'anzahl_pruefgefaesse', 'gefaess_innenmass_b_mm', 'gefaess_innenmass_h_mm', 'gefaess_innenmass_l_mm', 'gefaess_material', 'trennlage_eingebaut', 'trennlage_wasserdurchlaessig', 'wasserablauf_durchmesser_mm', 'widerlager_dicke_mm', 'widerlager_material') AND w.code = 'FLLTP-RHZ-05' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('vts_caco3_scheibler_prozent', 'vts_gesamt_dicke_mm', 'vts_k2o_cat_mg_l', 'vts_koernung', 'vts_n_cat_mg_l', 'vts_p2o5_cat_mg_l', 'vts_ph_cacl2', 'vts_salz_caso4_g_l', 'vts_salz_h2o_g_l') AND w.code = 'FLLTP-RHZ-06' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('duenger_chloridarm', 'duenger_k2o_prozent', 'duenger_mgo_prozent', 'duenger_n_prozent', 'duenger_p2o5_prozent', 'duenger_spurelemente_vorhanden', 'wasser_ammonium_mg_l', 'wasser_eisen_mg_l', 'wasser_haerte_mmol_l', 'wasser_leitfaehigkeit_uS_cm', 'wasser_mangan_mg_l', 'wasser_nitrat_mg_l', 'wasser_ortho_phosphat_mg_l', 'wasser_p_gesamt_mg_l', 'wasser_ph', 'wasser_saurekapazitaet_mmol_l') AND w.code = 'FLLTP-RHZ-07' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('testpflanze_art', 'testpflanze_container_format') AND w.code = 'FLLTP-RHZ-08' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('arbeitsfuge_zeitabstand_h', 'naht_anzahl_boden_eck', 'naht_anzahl_laengs_2_pruefmuster', 'naht_anzahl_t_naht', 'naht_anzahl_wand_eck', 'pruefmuster_2_versatz_grad', 'standrohr_durchmesser_mm', 'vts_obere_schicht_dicke_mm', 'vts_untere_schicht_dicke_mm') AND w.code = 'FLLTP-RHZ-09' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('kontroll_einbau_datum', 'kontroll_standrohr_eingebaut', 'kontroll_vts_dicke_oben_mm', 'kontroll_vts_dicke_unten_mm', 'kontroll_vts_einbau_methode') AND w.code = 'FLLTP-RHZ-10' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('anzahl_pflanzen_total', 'bepflanzung_datum', 'pflanzdichte_pro_gefaess', 'pflanzen_initial_zustand', 'pflanzung_methode') AND w.code = 'FLLTP-RHZ-11' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('duenger_gabe_g', 'duenger_intervall_monate', 'duenger_loesung_l', 'ersatz_pflanzen_periode_mon', 'halmschnitt_im_gruenen_zulaessig', 'wasserstand_max_ueber_vts_mm', 'wasserstand_min_unter_vts_mm') AND w.code = 'FLLTP-RHZ-12' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('bestandsdichte_p_avg_6mon', 'wuchsleistung_ausreichend') AND w.code = 'FLLTP-RHZ-13' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('auswertungs_datum_12mon', 'bestandsdichte_p_avg_12mon', 'kontrolle_p_avg_12mon', 'relativ_prozent_12mon', 'wuchsleistung_12mon_ausreichend') AND w.code = 'FLLTP-RHZ-14' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('auswertungs_datum_18mon', 'bestandsdichte_p_avg_18mon', 'kontrolle_p_avg_18mon', 'relativ_prozent_18mon', 'wuchsleistung_18mon_ausreichend') AND w.code = 'FLLTP-RHZ-15' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('bestandsdichte_p_avg_24mon', 'endauswertung_datum', 'kontrolle_p_avg_24mon', 'relativ_prozent_24mon', 'wuchsleistung_24mon_ausreichend') AND w.code = 'FLLTP-RHZ-16' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('fotos_dokumentiert', 'max_eindringtiefe_ueberlappung_mm', 'rhizomdurchdringung_flaeche_count', 'rhizomdurchdringung_naehte_count', 'rhizome_in_poren_count', 'rhizome_unter_5mm_bei_hemmstoff_count', 'rhizomeindringung_arbeitsfuge_count', 'rhizomeindringung_flaeche_count', 'rhizomeindringung_naehte_count', 'rueckstellproben_entnommen') AND w.code = 'FLLTP-RHZ-17' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('abbruchsgrund', 'pruefergebnis_rhizomfest') AND w.code = 'FLLTP-RHZ-18' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('attest_flltp_rhz_19_req_21', 'bericht_datum', 'bericht_seitenanzahl', 'gueltigkeitsdauer_jahre') AND w.code = 'FLLTP-RHZ-19' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('eidesstattliche_erklaerung_vorhanden', 'produkt_aktuell_im_lieferprogramm', 'pruefgrundlagen_unveraendert', 'rueckstellmuster_erneut_hinterlegt', 'verlangerung_zeitabschnitt_jahre') AND w.code = 'FLLTP-RHZ-20' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;
UPDATE fields f
   SET visible_when = 'nachweis_route == ''pruefung'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND f.symbol IN ('bescheinigung_ausgestellt_durch', 'bescheinigung_ausstellung_datum', 'bescheinigung_gueltig_bis', 'bescheinigung_pruefnummer', 'pruefer_signatur_eingeholt') AND w.code = 'FLLTP-RHZ-21' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND f.visible_when IS NULL;

-- 5. gate amendments: archive the baseline rows (md5-guarded), then SET condition first, cr.code first (B-1, B-5)
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_fll_wave AS SELECT * FROM compliance_requirements WHERE false;
INSERT INTO compliance_requirements_archive_fll_wave
SELECT cr.* FROM compliance_requirements cr
  JOIN worksheet_templates w ON w.id = cr.worksheet_template_id
  JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'FLL-TP-RHIZOM-2023'
   AND ((cr.code IN ('REQ-RHZ21-CONFORMITY') AND w.code = 'FLLTP-RHZ-21' AND md5(cr.condition) = '29d6db2a5163fdb286534d3f50514722')
     OR (cr.code IN ('REQ-RHZ18-VERDICT') AND w.code = 'FLLTP-RHZ-18' AND md5(cr.condition) = '197d1a2c1461a87e1f2a8d4cbdf11e57'));

-- P-23: REQ-RHZ21-CONFORMITY — test route: 'rhizomfest' (TP §3.11 outcome); exempt route: 'werkstoffspezifisch_rhizomfest' (TP §1)
UPDATE compliance_requirements cr
   SET condition = 'nachweis_route IS NOT NULL AND ((nachweis_route == ''pruefung'' AND final_rhizom_conformity == ''rhizomfest'') OR (nachweis_route == ''werkstoffspezifisch'' AND final_rhizom_conformity == ''werkstoffspezifisch_rhizomfest''))'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-RHZ21-CONFORMITY' AND w.id = cr.worksheet_template_id AND w.code = 'FLLTP-RHZ-21' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND md5(cr.condition) = '29d6db2a5163fdb286534d3f50514722';

-- P-23: REQ-RHZ18-VERDICT — the §3.11 verdict is judged only on the test route
UPDATE compliance_requirements cr
   SET condition = 'IF nachweis_route == ''pruefung'' THEN pruefergebnis_rhizomfest == ''rhizomfest'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE cr.code = 'REQ-RHZ18-VERDICT' AND w.id = cr.worksheet_template_id AND w.code = 'FLLTP-RHZ-18' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND md5(cr.condition) = '197d1a2c1461a87e1f2a8d4cbdf11e57';

-- 6. new gate
-- P-20: FLLTP-RHZ-03 REQ-RHZ03-INTENSIV (warn; TP §1 "erforderlich" vs GA-RL §6.4.1.1 "kann verzichtet werden" — SIGN-OFF fllwave-P-20-INTENSIV)
-- CONDITION REQ-RHZ03-INTENSIV: IF nachweis_route == 'werkstoffspezifisch' THEN intensive_bepflanzung == false
INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, title_en, condition, description, clause_reference, severity)
SELECT w.id, 'REQ-RHZ03-INTENSIV', 'Werkstoffspezifischer Weg bei intensiver Bepflanzung: TP §1 verlangt die FLL-Prüfung', 'Material-based route under intensive planting: TP §1 requires the FLL test', 'IF nachweis_route == ''werkstoffspezifisch'' THEN intensive_bepflanzung == false', 'FLL TP Rhizom 2023 (Plan B fllwave P-20, imported_unverified), §1 (PDF p. 8, printed 7): "Bei intensiverer Beanspruchung durch die Bepflanzung (z. B. Vegetation für Pflanzenkläranlagen und Aufbereitungsbereiche von Schwimmteichen) ist eine Prüfung nach dem nachfolgend beschriebenen „Verfahren zur Bestimmung der Rhizomfestigkeit von Gewässerabdichtungen“ der FLL erforderlich." Reference only: FLL GA-RL 2023 §6.4.1.1 (PDF p. 97, printed 95) "Kunststoffbahnen aus PEHD besitzen eine ausreichende Widerstandsfähigkeit gegenüber Wurzeln und Rhizomen. Auf eine Prüfung der Wurzel- und Rhizomfestigkeit kann verzichtet werden." Warn only: whether that waiver overrides TP §1 for PEHD is the specialist planner''s / owner''s decision.', '§1', 'warn'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE w.code = 'FLLTP-RHZ-03' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements c2 WHERE c2.worksheet_template_id = w.id AND c2.code = 'REQ-RHZ03-INTENSIV');
-- I-2: FLLTP-RHZ-03 REQ-RHZ03-WERKSTOFF (warn; TP §1 lists the materials "z. B." — SIGN-OFF fllwave-H-2b)
-- CONDITION REQ-RHZ03-WERKSTOFF: IF nachweis_route == 'werkstoffspezifisch' THEN werkstoff_klasse IN {'pehd', 'stahl', 'beton', 'gup'}
INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, title_en, condition, description, clause_reference, severity)
SELECT w.id, 'REQ-RHZ03-WERKSTOFF', 'Werkstoffspezifischer Weg nur für einen als wurzel- und rhizomfest genannten Werkstoff', 'Material-based route only for a material named as root- and rhizome-resistant', 'IF nachweis_route == ''werkstoffspezifisch'' THEN werkstoff_klasse IN {''pehd'', ''stahl'', ''beton'', ''gup''}', 'FLL TP Rhizom 2023 (Plan B fllwave final review I-2, imported_unverified), §1 (PDF p. 8, printed 7): "Abdichtungen, die aufgrund ihrer werkstoffspezifischen Eigenschaften als wurzel- und rhizomfest gelten (z. B. Stahl, Beton, PEHD), erfordern keinen gesonderten Nachweis nach FLL-Prüfverfahren." Reference only: FLL GA-RL 2023 §7.3.1.1 (PDF p. 108, printed 106) "Abdichtungen aus GUP besitzen eine ausreichende Widerstandsfähigkeit gegenüber Wurzeln und Rhizomen." and §6.4.1.1 (PDF p. 97, printed 95) "Bei Kunststoffbahnen aus PELD ist vom Hersteller zusätzlich ein Nachweis der Wurzel- bzw. Rhizomfestigkeit gemäß FLL zu erbringen." Warn only: the TP list is open ("z. B.") — a "sonstige" material on the material-based route needs the specialist planner''s / owner''s review.', '§1', 'warn'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE w.code = 'FLLTP-RHZ-03' AND s.code = 'FLL-TP-RHIZOM-2023'
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements c2 WHERE c2.worksheet_template_id = w.id AND c2.code = 'REQ-RHZ03-WERKSTOFF');
COMMIT;
