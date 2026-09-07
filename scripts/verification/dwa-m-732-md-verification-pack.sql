-- ============================================================================
-- SR-1 field-verification pack — DWA-M-732 (Merkblatt DWA-M 732 „Abwasser aus Brauereien“, September 2010,
--   korrigierte Fassung: Stand August 2022). This is the FINAL published Merkblatt (DWA "Weißdruck" class,
--   1. Auflage + corrected reprint) — NOT a Gelbdruck/Entwurf. The title page prints: "Merkblatt DWA-M 732
--   Abwasser aus Brauereien / September 2010 / Korrigierte Fassung: Stand August 2022" and the imprint
--   "© DWA, 1. Auflage, korrigierte Fassung: Stand August 2022, Hennef 2022".
-- Generated: 2026-09-05 — md-verified pass (owner ruling 2026-09-05: the markdown transcript is the
--   verification source; PDF only where no markdown exists). Grade: VC (SR-3), labelled as such.
-- Source md: C:\Users\Ekowai\Desktop\Guidelines\DWA-M-732\DWA-M_732.md (1,922 lines, mathpix LaTeX, read completely).
--   Page convention: this transcript carries NO standalone page-number lines. "printed p.N" is the printed page
--   taken from the document's own Inhalt (md lines 94–150) and Bilder-/Tabellenverzeichnis (md lines 151–199),
--   cross-checked against the mathpix image indices: Bild 1 = printed p.9 → "…-11.jpg"; Bild 2 = p.15 → "-17.jpg";
--   Bild 3 = p.23 → "-25.jpg"; Bild 6 = p.28 → "-30.jpg"; Bild 7 = p.32 → "-34.jpg"; Bild 11 = p.38 → "-40.jpg";
--   Bild 13 = p.42 → "-44.jpg" — a constant offset of +2 (PDF = printed + 2) across the whole document, so the
--   Inhalt page numbers are trustworthy. Tabelle 1 spans printed p.10–12 and its three blocks are attributed
--   per block (p.10 = a.n.g.…EDTA, p.11 = EGSB…NTA, p.12 = oTS…ZKL). Quotes are verbatim mathpix LaTeX
--   ($…$, \mathrm{}, table "&" and \hline kept as printed); md line breaks joined; "[...]" = omitted run inside
--   ONE clause; " | " joins clauses and table rows. The printed page(s) are given ONCE at the end of each quote.
-- Scope: fields with verification_status NOT IN ('verified_against_standard','corrected') — all 95 fields
--   qualified at export time (52 needs_engineer_review + 43 imported_unverified):
--   95 examined / 85 quoted → verified_against_standard / 7 app-metadata+workflow → inferred_from_worksheet
--   / 3 residue (written NOWHERE, listed below).
--   Residue (no md support — NOT invented):
--     M732-08.CSB_spez_fracht  — clause says §7.1; §7.1 prints no specific CSB load. The only printed spec.
--         CSB load is Tabelle 29 (one example plant, 1.230 g/hl) and Bild 3 (an image the transcript does not
--         carry as text); the field unit is kg/hl VB, the printed figure g/hl. No verbatim source for the field.
--     M732-09.N_ges_grenzwert_indirekt — Tabelle 13 has exactly three rows (NH4-N+NH3-N ≤5.000 EW, NH4-N+NH3-N
--         >5.000 EW, P_ges). There is NO N_ges row for Indirekteinleiter anywhere in the Merkblatt. Invented limit.
--     M732-21.trub_spez — §8.2/§8.2.1 print Treber (ca. 18 kg/hl) and Hefe (ca. 2,9 kg/hl) only; no Trub quantity
--         is printed anywhere in the document.
--   Verified WITH caveat (caveat carried in verification_note): V_spez_wasser_abteilung (Tab. 5 is in l/hl VB,
--   the field unit is m3/hl VB), Q_d / Q_MA_becken / ablaufwert_MA_becken / the four cost fields (only example-plant
--   values are printed, §7.6 — no design rule), abwasser_rest_nach_massnahmen (source is §7.2 Tab. 11, not §6),
--   abwasserquellen (source is §6, not §4), geruch_konz (the measurement duty is printed, no GE/m3 limit value is —
--   that lives in GIRL/TA Luft → NR), CSB (duplicate of CSB_durchmischt/CSB_sedimentiert).
-- Equations: 3 on this standard, all 3 quoted (Gl-M732-01 EW=EGW+EZ, Gl-M732-02 22,2 mmol CO2/g BSB5,
--   Gl-M732-03 60–70 % Neutralisationsanteil). 0 residue.
-- Gates: 15 (12 block / 3 warn), 15 non-null source_quotes — every one located verbatim in the md except the
--   §7.3 quotes, which print the md's line-broken "DWA-M 115-2" as "DWAM 115-2" (transcript artefact, not a defect).
--   Findings raised: CR-M732-13 has an EMPTY condition and requires_attestation=true with no attest field;
--   CR-M732-05 compares the RAW-wastewater fields CSB_durchmischt/BSB5_durchmischt against the Anhang-11
--   EFFLUENT limits; CR-M732-02/03/04/05 fire regardless of einleitungsart; six gates sit on the wrong worksheet.
--   All of these are structural/enforcement changes → STAGED file, nothing in this pack.
-- Rollback: scripts/verification/rollback-dwa-m-732-md-verification-pack.sql
-- STAGED:   scripts/verification/dwa-m-732-STAGED-rulings.sql
-- ============================================================================

-- App/project metadata + workflow attestation flags (exempt class, 2026-08-01 metadata ruling):
--   M732-01.brauerei_name (Stammdatum, the guideline defines no client/plant name field) and the six
--   attest_* booleans that exist only so a block gate has something to read
--   (M732-03.attest_m732_03_cr_m732_12, M732-11.attest_m732_11_cr_m732_06/_cr_m732_09/_cr_m732_10,
--    M732-15.attest_m732_15_cr_m732_14, M732-21.attest_m732_21_cr_m732_11) — the Merkblatt defines no
--   attestation checkbox; the underlying obligations are quoted on the gates themselves.
update public.fields set verification_status='inferred_from_worksheet', verification_note='md-pass 2026-09-05: app/project metadata — the guideline does not define this field; exempt per the 2026-08-01 metadata ruling', verified_at=now() where id in ('19b877eb-d546-4602-8cbf-56ccfb6217ad','cf2a9726-0a50-4ff4-a77e-476396238900','e293ec74-0a6f-43d9-993d-ab1481c1b1e5','bf545d80-713e-4117-867a-0f6f9a8134b7','6d790237-7acf-4278-b4c4-8256e2ea8afc','7c1f69c6-c2b7-4cef-b437-d3d58e724e55','d946c5e7-400f-4825-9f5c-79670111a77e') and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-01 · Projekt-Registrierung Brauereiabwasser
-- ---------------------------------------------------------------------------

-- M732-01.dichte_bier
update public.fields set verification_status='verified_against_standard', verification_quote='Nach IVU-RL 2008/01/EG Teil 4, Anhang 1 Punkt 6.4 gelten Brauereien als relevant, wenn die Produktion mehr als 300 t Fertigerzeugnisse pro Tag (gerechnet als Vierteljahresdurchschnitt) beträgt (Deutsche Umsetzung über die 4. BImSchV). Die Dichte von Bier wird mit $1,008 \mathrm{~kg} / \mathrm{l}$ angesetzt. — printed p.13', verification_note='md-verified 2026-09-05 (§3 Statistik der Bierproduktion in Deutschland, printed p.13) [VC]', verified_at=now() where id='20cea871-b7a5-4f5a-a2e3-394f79de07ea' and verification_status not in ('verified_against_standard','corrected');

-- M732-01.einleitungsart
update public.fields set verification_status='verified_against_standard', verification_quote='Die überwiegende Zahl der Brauereien in der Bundesrepublik Deutschland leitet ihre Abwässer als Indirekteinleiter in kommunale Kläranlagen. | In der Wasser-/Abwasserumfrage des Deutschen BrauerBundes e. V. von 2007 ergab sich, dass von 95 teilnehmenden Brauereien 8 Betriebe Direkteinleiter waren. | Indirekteinleitung mit wesentlichen Anforderungen zur Feststoffabscheidung, Neutralisation, Frachtreduktion; | Direkteinleitung. — printed p.22, p.25', verification_note='md-verified 2026-09-05 (§7.1 printed p.22; §7.3 bullet list printed p.25) [VC]. The two enum values indirekt/direkt are exactly the two discharge routes the Merkblatt distinguishes.', verified_at=now() where id='09f34f9c-d6e0-40bf-abe9-d2e2dd5931dc' and verification_status not in ('verified_against_standard','corrected');

-- M732-01.ausstoss_jahr
update public.fields set verification_status='verified_against_standard', verification_quote='Im Jahr 2007 sind in Deutschland rd. 108 Mio. hl Bier in 1.280 Brauereien erzeugt worden, wobei allein in Bayern 623 Brauereien ansässig sind. Folgende Formulierungen werden in diesem Papier genutzt: | Großbrauereien: ca. 2,0 \% aller Brauereien mit einem Ausstoß von mehr als 1 Mio. hl Bier/Jahr (26 Brauereien); | Mittelständische Brauereien: ca. $13,0 \%$ mit 50.000 hl bis 1.000.000 hl Bier/Jahr (167 Brauereien); — printed p.13', verification_note='md-verified 2026-09-05 (§3, printed p.13) [VC]. The annual output in hl VB is the classifying quantity of §3.', verified_at=now() where id='f2409882-b558-4c5b-ad4c-2156500cf344' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-02 · Anwendungsbereich und Geltungsbereich
-- ---------------------------------------------------------------------------

-- M732-02.prozessbeschreibung
update public.fields set verification_status='verified_against_standard', verification_quote='Die wichtigsten Schritte im Brauprozess, die im Anschluss erläutert werden, sind Bild 2 zu entnehmen und umfassen: | Bild 2: Grundverfahrensschema der Bierherstellung | Dieses Merkblatt beschreibt den Stand der Technik bei der Herstellung von Bieren im Hinblick auf abwasserrelevante Prozesse. Der Geltungsbereich erstreckt sich in technischer Hinsicht auf den Brauprozess und Abfüllbereich einschließlich der prozessbedingten Vor- und Nachbereitung und die dadurch verursachten Emissionen. — printed p.8, p.14, p.15', verification_note='md-verified 2026-09-05 (§4 Verfahrenstechnik des Brauprozesses printed p.14, Bild 2 printed p.15; scope sentence §1 printed p.8) [VC].', verified_at=now() where id='6d44b2b7-d24f-424a-a57d-c5ed59904315' and verification_status not in ('verified_against_standard','corrected');

-- M732-02.abwasserquellen
update public.fields set verification_status='verified_against_standard', verification_quote='Grundlage dieses Systems ist die Erfassung und Darstellung aller Wasserverbrauchs- und Abwasseranfallstellen in einem Lageplan mit Zuordnung zu den Abteilungen der Brauerei und den zugehörigen Verfahrensschritten (gegebenenfalls als Grundlage für ein Abwasserkataster). Dabei sollten neben den (Ab-)Wassermengen verschiedener Verbraucher bzw. Abwassererzeuger möglichst die verschiedenen (Ab-)Wasserqualitäten (z. B. Organik- und Salzbelastung, Kalt- und Heißwasser) miterfasst werden. — printed p.20', verification_note='md-verified 2026-09-05 (§6 Innerbetriebliche Maßnahmen zur Abwasservermeidung, printed p.20) [VC]. CAVEAT: the field carries clause_reference §4; the sentence that defines this field is §6 — retag proposed in STAGED S-3.', verified_at=now() where id='2e3fd8e5-bb63-438b-80f8-c5ce4244ed55' and verification_status not in ('verified_against_standard','corrected');

-- M732-02.bier_beschaffenheit_ref
update public.fields set verification_status='verified_against_standard', verification_quote='In der Tabelle 3 ist die durchschnittliche Zusammensetzung Pilsener Bieres im Hinblick auf wesentliche Parameter angegeben. | Tabelle 3: Durchschnittliche Beschaffenheit des Pilsener Bieres (Piendl 2000) | Für Pilsener Bier liegt der durchschnittliche CSB liegt bei ca. $120.000 \mathrm{mg} / \mathrm{l}$, der TOC bei $30.000 \mathrm{mg} / \mathrm{l}$. — printed p.14', verification_note='md-verified 2026-09-05 (§4 / Tabelle 3, printed p.14) [VC]. Reference field for the beer composition table.', verified_at=now() where id='33c0f6aa-c958-4760-a2be-33a7ef997d6c' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-03 · Betriebsklassifikation nach Ausstoss
-- ---------------------------------------------------------------------------

-- M732-03.betriebsklasse
update public.fields set verification_status='verified_against_standard', verification_quote='Großbrauereien: ca. 2,0 \% aller Brauereien mit einem Ausstoß von mehr als 1 Mio. hl Bier/Jahr (26 Brauereien); | Mittelständische Brauereien: ca. $13,0 \%$ mit 50.000 hl bis 1.000.000 hl Bier/Jahr (167 Brauereien); | Kleinstbrauereien: ca. $63,3 \%$ mit bis zu 5.000 hl Bier im Jahr (807 Brauereien); | Übrige Brauereien: ca. $21,7 \%$ mit 5.000 hl bis 50.000 hl Bier/Jahr (280 Brauereien). | Die Empfehlungen gelten in der Regel für mittelständische und Großbrauereien; Gasthausbrauereien werden nicht erfasst. — printed p.8, p.13', verification_note='md-verified 2026-09-05 (§3 four size classes printed p.13; the Gasthausbrauerei exclusion is §1 printed p.8) [VC]. All five enum values are printed classes.', verified_at=now() where id='765f34a5-136e-427c-9e5e-f87cbeeb35e2' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-04 · Wassereinsatz und Wasserqualitaeten
-- ---------------------------------------------------------------------------

-- M732-04.V_spez_wasser
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 4: Spezifischer Wassereinsatz von Brauereien in Abhängigkeit der Größe (Nieroda 2007a) | Median spez. Wassereinsatz [hl/hl VB] & 4,8 & 4,3 & 3,7 | Spanne von 75 \% & 4,5 6,0 & 4,0 5,4 & 3,3 4,1 — printed p.17', verification_note='md-verified 2026-09-05 (§5.1 / Tabelle 4, printed p.17) [VC]. standard_range per size class (200–500 / 500–1.000 / >1.000 Tsd. hl VB/a) — SR-2: the point value is an engineer selection, never auto-picked.', verified_at=now() where id='a97900b6-78ca-485f-a95b-e5e55c0b4785' and verification_status not in ('verified_against_standard','corrected');

-- M732-04.V_spez_wasser_abteilung
update public.fields set verification_status='verified_against_standard', verification_quote='Als Anhaltspunkt für die spezifischen Verbräuche in Brauereien $>200.000 \mathrm{hl} \mathrm{VB} / \mathrm{a}$ unterschiedlicher Ausstoßverteilung dienen folgende, in Tabelle 5 zusammengestellte Erfahrungswerte. | Wassereinsatz für Brauereien $>200.000 \mathrm{hl} \mathrm{VB}$ & Min*). [1/hl VB] & Max. [l/hl VB] | Summe & 326 & 854 — printed p.17', verification_note='md-verified 2026-09-05 (§5.1 / Tabelle 5, printed p.17) [VC]. CAVEAT — UNIT MISMATCH: Tabelle 5 is printed in l/hl VB (Sudhaus 159–187, Abfüllung 65–276, Summe 326–854); the encoded field unit is m3/hl VB, a factor 1000 out. Correction proposed in STAGED S-4.', verified_at=now() where id='40c1bd97-6622-4241-ac47-2bb04c6da653' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-06 · Energieverbrauch
-- ---------------------------------------------------------------------------

-- M732-06.E_spez
update public.fields set verification_status='verified_against_standard', verification_quote='Nach Schu (Schu 2007) ergibt sich der folgende, spezifische Energieverbrauch bei Brauereien. Die größten Verbraucher sind das Sudhaus, die Flaschenbefüllung und die Kühlanlagen. | Der spezifische Energieverbrauch bei Brauereien lässt sich entsprechend der folgenden Tabelle 9 wie folgt angeben. | Tabelle 9: Spezifischer Energieverbrauch bei Brauereien (Schu 2007) | Strom spez. [kWh/hl] & 7,8-16,8 — printed p.20', verification_note='md-verified 2026-09-05 (§5.4 / Tabelle 9, printed p.20) [VC]. standard_range: Strom 9,7–16,8 kWh/hl (<500.000 hl), 7,8–14,5 (>500.000 hl), Gesamtbranche 7,8–16,8; Wärme 65–185 MJ/hl. SR-2 selection.', verified_at=now() where id='f0af988b-9cd9-4c76-9d7a-c3d86e968297' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-07 · Innerbetriebliche Massnahmen zur Abwasservermeidung
-- ---------------------------------------------------------------------------

-- M732-07.massnahmen_bvt
update public.fields set verification_status='verified_against_standard', verification_quote='Eine erfolgversprechende Strategie zur kontinuierlichen Optimierung des Wasserverbrauches und des Abwasseranfalles sollte aus den folgenden drei hierarchisch gegliederten Schritten bestehen: | Die folgende Aufstellung gibt eine abteilungsbezogene Aufstellung unterschiedlicher Ansätze und Strategien zur Wassereinsparung und Abwasservermeidung wieder (Franzmann 2007): — printed p.20, p.21', verification_note='md-verified 2026-09-05 (§6, Schritt 1–3 printed p.20, the department-wise measure list printed p.21) [VC]. The Merkblatt states the measures as "sollte" — documentation field, not an obligation.', verified_at=now() where id='ddc83a2c-0a67-4997-ba42-82866e03c0fe' and verification_status not in ('verified_against_standard','corrected');

-- M732-07.abwasser_rest_nach_massnahmen
update public.fields set verification_status='verified_against_standard', verification_quote='Für Brauereien mit Anwendung von innerbetrieblichen Maßnahmen wurden bei sorgfältiger Betriebsführung folgende Vergleichswerte gefunden (Tabelle 11): | spezifischer Abwasseranfall & 0,25 bis 0,6 $\mathrm{m}^{3} / \mathrm{hl}$ VB & 0,2 $\mathrm{m}^{3} / \mathrm{hl}$ VB — printed p.22', verification_note='md-verified 2026-09-05 (§7.2 / Tabelle 11, printed p.22) [VC]. CAVEAT: the field carries clause_reference §6; the only printed post-measure figure is Tabelle 11 in §7.2 ("Tendenz (min.) 0,2 m3/hl VB"). Retag proposed in STAGED S-3.', verified_at=now() where id='ea2eea5a-a5e6-4693-aa73-2b98ec6afd32' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-08 · Abwasseranfall, Konzentration und Schmutzfrachten
-- ---------------------------------------------------------------------------

-- M732-08.V_spez_abwasser
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 11: Spezifische Mengen und Frachten bei der Bierherstellung | Kennwert & üblicher Wertebereich*) & Tendenz (min.) | spezifischer Abwasseranfall & 0,25 bis 0,6 $\mathrm{m}^{3} / \mathrm{hl}$ VB & 0,2 $\mathrm{m}^{3} / \mathrm{hl}$ VB — printed p.22', verification_note='md-verified 2026-09-05 (§7.2 / Tabelle 11, printed p.22) [VC]. standard_range 0,25–0,6 m3/hl VB, Tendenz min. 0,2 — SR-2 selection.', verified_at=now() where id='e6d5cce8-1457-4200-84a2-17f9febede03' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.ASS
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 12: Konzentrationsbereiche von Abwasserinhaltsstoffen (aus Tagesmischproben) bei Brauereien mit mittlerem Abwasseranfall (je nach spez. Wasserverbrauch deutliche Abweichungen möglich) (Rosenwinkel \& Schrewe 2000) | absetzbare Stoffe & [ml/l] & 10 bis 60 | Das Merkblatt DWA-M 115-2 fordert eine Begrenzung der absetzbaren Stoffe nur, wenn eine Schlammabscheidung erforderlich ist; dann sollte der Wert auf $1 \mathrm{ml} / \mathrm{l}$ bis $10 \mathrm{ml} / \mathrm{l}$ begrenzt werden. — printed p.23, p.25', verification_note='md-verified 2026-09-05 (Tabelle 12 printed p.23; the DWA-M 115-2 limitation §7.3 printed p.25) [VC]. The 1–10 ml/l limit is conditional ("nur, wenn eine Schlammabscheidung erforderlich ist") and soft ("sollte") — no block gate exists and none is proposed as block.', verified_at=now() where id='67c9e595-2092-4635-bdeb-033fcbf01841' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.CSB_BSB5_verhaeltnis
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 11: Spezifische Mengen und Frachten bei der Bierherstellung | $\mathrm{CSB} / \mathrm{BSB}_{5}$ Verhältnis & 1,5 bis 1,8 & 1,7 bis 2 — printed p.22', verification_note='md-verified 2026-09-05 (§7.2 / Tabelle 11, printed p.22) [VC]. Example plants print 1,2 bis 2,1 (Tabelle 25 p.39, Tabelle 28 p.40).', verified_at=now() where id='39e89071-f1fa-4935-8e76-42751817196d' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.BSB5_spez_fracht
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 11: Spezifische Mengen und Frachten bei der Bierherstellung | spezifische $\mathrm{BSB}_{5}$-Fracht & 0,3 bis 0,6 kg/hl VB & 0,25 kg/hl VB — printed p.22', verification_note='md-verified 2026-09-05 (§7.2 / Tabelle 11, printed p.22) [VC]. standard_range 0,3–0,6 kg/hl VB, Tendenz min. 0,25 — SR-2 selection.', verified_at=now() where id='a26aae2e-9fb4-47c0-a9c2-d766dc3a7856' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.Q_d
update public.fields set verification_status='verified_against_standard', verification_quote='Q & z. B. $\mathrm{m}^{3} / \mathrm{h}$ & - & Volumenstrom | Maximale Tagesabwassermenge & [m³/d] & 500 | max. Tagesmenge & [m³/d] & 9.260 — printed p.12, p.31, p.32', verification_note='md-verified 2026-09-05 (symbol Q defined in §2 Tabelle 1 printed p.12; the daily volumes are example-plant data, Tabelle 15 printed p.31 and Tabelle 17 printed p.32) [VC]. CAVEAT: the Merkblatt prints no design rule for Q_d — only measured example-plant values; this is an engineer_input field.', verified_at=now() where id='50ee981d-2434-4805-85ad-e19464831a3a' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.TOC
update public.fields set verification_status='verified_against_standard', verification_quote='TOC & Konzentration z. B. g/l & - & Total Organic Carbon (gesamter organischer Kohlenstoff) | Für Pilsener Bier liegt der durchschnittliche CSB liegt bei ca. $120.000 \mathrm{mg} / \mathrm{l}$, der TOC bei $30.000 \mathrm{mg} / \mathrm{l}$. — printed p.12, p.14', verification_note='md-verified 2026-09-05 (§2 Tabelle 1 printed p.12; §3 beer TOC printed p.14) [VC]. TOC is also the online parameter of the §7.6.3 example plant ("dort werden Temperatur, pH-Wert und TOC gemessen", printed p.33).', verified_at=now() where id='b8827b94-d4cc-48be-9a00-0dd0ef8816ce' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.TR
update public.fields set verification_status='verified_against_standard', verification_quote='TR & Konzentration z. B. g/l & - & Trockenrückstand — printed p.12', verification_note='md-verified 2026-09-05 (§2 Tabelle 1 „Im Dokument verwendete Abkürzungen“, third block, printed p.12) [VC]. Definition-only: the Merkblatt prints no TR value or limit for brewery wastewater.', verified_at=now() where id='9eec479d-2e5e-46af-a11e-0199962697c9' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.LF
update public.fields set verification_status='verified_against_standard', verification_quote='LF & $\mathrm{mS} / \mathrm{cm}$ & $\mu \mathrm{S} / \mathrm{cm}$ & Elektrische Leitfähigkeit — printed p.11', verification_note='md-verified 2026-09-05 (§2 Tabelle 1, second block, printed p.11) [VC]. Definition + unit only; no LF value is printed. §6 notes rising salt concentrations under water recycling (printed p.21).', verified_at=now() where id='f4f0c50e-8ca8-42ab-bb2d-ea5258194ccb' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.N_ges_min
update public.fields set verification_status='verified_against_standard', verification_quote='$\mathrm{N}_{\text {ges,min }}$ & Konzentration z. B. mg/l & Fracht z. B. kg/d & Gesamtstickstoff mineralisch ( $\mathrm{NH}_{4}+\mathrm{NO}_{2}+\mathrm{NO}_{3}$ ) — printed p.11', verification_note='md-verified 2026-09-05 (§2 Tabelle 1, second block, printed p.11) [VC]. Example-plant values: Tabelle 20 Grenzwert 220 mg/l (p.33), Tabelle 24 <10 mg/l (p.37), Tabelle 26 Überwachungswert 18 mg/l (p.40).', verified_at=now() where id='e671ca35-accb-46f5-b029-a92f61b75522' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.NO3_N
update public.fields set verification_status='verified_against_standard', verification_quote='$\mathrm{NO}_{3}-\mathrm{N}$ & Konzentration z. B. mg/l & Fracht z. B. kg/d & Nitrat-Stickstoff | Die Stickstoffgehalte bestehen zum größten Teil aus organischem Stickstoff (Eiweiß, Hefe) und zum Teil aus Nitrat (Salpetersäure). — printed p.11, p.22', verification_note='md-verified 2026-09-05 (§2 Tabelle 1 printed p.11; §7.2 nitrogen origin printed p.22) [VC]. Definition-only; no NO3-N value or limit is printed for brewery wastewater.', verified_at=now() where id='baf6bd7a-619e-4c6c-852b-b515ae7b73e7' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.NO2_N
update public.fields set verification_status='verified_against_standard', verification_quote='$\mathrm{NO}_{2}$-N & Konzentration z. B. mg/l & Fracht z. B. kg/d & Nitrit-Stickstoff — printed p.11', verification_note='md-verified 2026-09-05 (§2 Tabelle 1, second block, printed p.11) [VC]. Definition-only; NO2-N appears only as a component of N_ges / N_ges,min.', verified_at=now() where id='f51945b4-8566-4b1b-a00a-5ea40e52ce51' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.NH3_N
update public.fields set verification_status='verified_against_standard', verification_quote='$\mathrm{NH}_{3}-\mathrm{N}$ & Konzentration z. B. mg/l & Fracht z. B. kg/d & Ammoniak-Stickstoff | Tabelle 13: Begrenzung von Nährsalzgehalten in Brauereiabwasser bei Indirekteinleitern nach Merkblatt DWA-M 115-2 | $\mathrm{NH}_{4}-\mathrm{N}+\mathrm{NH}_{3}-\mathrm{N}:$ & 100 & {$[\mathrm{mg} / \mathrm{l}]$} & $\leq 5.000$ — printed p.11, p.25', verification_note='md-verified 2026-09-05 (§2 Tabelle 1 printed p.11; §7.3 Tabelle 13 printed p.25) [VC]. NH3-N is limited only as the sum NH4-N + NH3-N.', verified_at=now() where id='dd1d15d2-8902-4dc1-aad6-b29733837949' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.NH4_N
update public.fields set verification_status='verified_against_standard', verification_quote='$\mathrm{NH}_{4}-\mathrm{N}+\mathrm{NH}_{3}-\mathrm{N}:$ & 100 & {$[\mathrm{mg} / \mathrm{l}]$} & $\leq 5.000$ | $\mathrm{NH}_{4}-\mathrm{N}+\mathrm{NH}_{3}-\mathrm{N}:$ & 200 & {$[\mathrm{mg} / \mathrm{l}]$} & $>5.000$ | Tabelle 14: Mindestanforderungen für Brauereiabwasser bei Direkteinleitern nach Anhang 11 AbwV (Rosenwinkel \& Brinkmeyer 2004) | $\mathrm{NH}_{4}$-N & [mg/l] & 10*) — printed p.25', verification_note='md-verified 2026-09-05 (§7.3 Tabelle 13 + Tabelle 14, both printed p.25) [VC]. Two different limits apply depending on einleitungsart; the *) footnote conditions the 10 mg/l on Te ≥ 12 °C und N_ges ≥ 100 kg/d.', verified_at=now() where id='4a5f4031-a4db-466c-8240-da3d092cf073' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.BSB5_durchmischt
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 12: Konzentrationsbereiche von Abwasserinhaltsstoffen (aus Tagesmischproben) bei Brauereien mit mittlerem Abwasseranfall | $\mathrm{BSB}_{5 \text {,durchmischt }}$ & [mg/l] & 1.100 bis 1.500 (2.200) — printed p.23', verification_note='md-verified 2026-09-05 (§7.2 / Tabelle 12, printed p.23) [VC]. This is a RAW-wastewater concentration range, not an effluent value — see STAGED S-5 (gate CR-M732-05 compares it against the Anhang-11 effluent limit 25 mg/l).', verified_at=now() where id='f5ae9ec0-f166-47ba-88a4-8beaeb4f8121' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.T_abwasser
update public.fields set verification_status='verified_against_standard', verification_quote='Alle Abwässer der Brauereien haben in der Regel relativ günstige Temperaturen für eine anaerobe Vorbehandlung (zwischen $25^{\circ} \mathrm{C}$ und $35^{\circ} \mathrm{C}$ ) | Sofern das Merkblatt DWAM 115-2 angewendet wird, ist die Einhaltung der Temperatur ( $<35^{\circ} \mathrm{C}$ ) und der pH -Werte (6,5 bis 10,0) für Brauereien von Bedeutung. — printed p.22, p.25', verification_note='md-verified 2026-09-05 (§7.2 printed p.22; §7.3 printed p.25) [VC]. NOTE: the md renders the line-broken "DWA-M 115-2" as "DWAM 115-2" — transcript artefact. The <35 °C is conditional ("Sofern das Merkblatt DWA-M 115-2 angewendet wird") and applies to Indirekteinleiter; gate CR-M732-03 enforces it unconditionally — see STAGED S-5.', verified_at=now() where id='ce08be93-2c46-4000-86c3-7a0643b07bc2' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.pH_wert
update public.fields set verification_status='verified_against_standard', verification_quote='Sofern das Merkblatt DWAM 115-2 angewendet wird, ist die Einhaltung der Temperatur ( $<35^{\circ} \mathrm{C}$ ) und der pH -Werte (6,5 bis 10,0) für Brauereien von Bedeutung. | Bei entsprechendem „Schmutzausgleich“ können also pH -Werte über 10 zugelassen werden. — printed p.25, p.26', verification_note='md-verified 2026-09-05 (§7.3 printed p.25; §7.4.1.2 printed p.26) [VC]. The 6,5–10,0 window is conditional on DWA-M 115-2 being applied AND §7.4.1.2 explicitly allows pH > 10 with sufficient "Schmutzausgleich" — gate CR-M732-02 enforces 6,5–10 as a hard block; see STAGED S-5.', verified_at=now() where id='f9df5bdc-eb09-4718-91b7-37fc206fb3d8' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.P_ges
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 12: Konzentrationsbereiche von Abwasserinhaltsstoffen (aus Tagesmischproben) bei Brauereien mit mittlerem Abwasseranfall | $P_{\text {ges }}$ & [mg/l] & 10 bis 30 — printed p.23', verification_note='md-verified 2026-09-05 (§7.2 / Tabelle 12, printed p.23) [VC]. Raw-wastewater range. Limits: 50 mg/l Indirekt (Tabelle 13, p.25) and 2 mg/l Direkt bei P_ges ≥ 20 kg/d (Tabelle 14, p.25).', verified_at=now() where id='af42cd21-e946-42f3-a3ec-3df60209ee46' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.N_ges
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 12: Konzentrationsbereiche von Abwasserinhaltsstoffen (aus Tagesmischproben) bei Brauereien mit mittlerem Abwasseranfall | $\mathrm{N}_{\text {ges }}$ & [mg/l] & 30 bis 100 — printed p.23', verification_note='md-verified 2026-09-05 (§7.2 / Tabelle 12, printed p.23) [VC]. Raw-wastewater range; the 18 mg/l of Tabelle 14 (p.25) is the Anhang-11 EFFLUENT limit, not a limit on this field.', verified_at=now() where id='34da2241-916c-43ce-960d-506fdb0c2bfb' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.CSB_sedimentiert
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 12: Konzentrationsbereiche von Abwasserinhaltsstoffen (aus Tagesmischproben) bei Brauereien mit mittlerem Abwasseranfall | $\mathrm{CSB}_{\text {sedimentiert }}$ & [mg/l] & 1.500 bis 2.500 (3.600) — printed p.23', verification_note='md-verified 2026-09-05 (§7.2 / Tabelle 12, printed p.23) [VC]. The bracketed value is the supplementary figure per the caption ("ergänzende Werte in Klammern (Nieroda 2007a, Ahrens 2008)").', verified_at=now() where id='6e16a433-1c4e-42a7-8b70-7db0684e17b1' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.CSB_durchmischt
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 12: Konzentrationsbereiche von Abwasserinhaltsstoffen (aus Tagesmischproben) bei Brauereien mit mittlerem Abwasseranfall | CSB ${ }_{\text {durchmischt }}$ & [mg/l] & 1.800 bis 3.000 (4.000) — printed p.23', verification_note='md-verified 2026-09-05 (§7.2 / Tabelle 12, printed p.23) [VC]. RAW-wastewater concentration, not an effluent value — gate CR-M732-05 compares it against the Anhang-11 effluent limit 110 mg/l; see STAGED S-5.', verified_at=now() where id='7c81b316-68ab-479d-804c-3a23b0a0cd7a' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.BSB5_sedimentiert
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 12: Konzentrationsbereiche von Abwasserinhaltsstoffen (aus Tagesmischproben) bei Brauereien mit mittlerem Abwasseranfall | $\mathrm{BSB}_{5, \text { sedimentiert }}$ & [mg/l] & 900 bis 1.200 (2.400) — printed p.23', verification_note='md-verified 2026-09-05 (§7.2 / Tabelle 12, printed p.23) [VC].', verified_at=now() where id='efbbc8a6-420f-4498-9033-8f3d9c334da8' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.CSB
update public.fields set verification_status='verified_against_standard', verification_quote='Die Konzentrationen von Brauereiabwässern liegen in folgenden, in Tabelle 11 zusammengestellten, Bereichen. | CSB ${ }_{\text {durchmischt }}$ & [mg/l] & 1.800 bis 3.000 (4.000) | $\mathrm{CSB}_{\text {sedimentiert }}$ & [mg/l] & 1.500 bis 2.500 (3.600) — printed p.22, p.23', verification_note='md-verified 2026-09-05 (§7.2 lead sentence printed p.22, Tabelle 12 rows printed p.23) [VC]. CAVEAT — DUPLICATE: this generic "CSB-Konzentration (Bereich)" field encodes the same two Tabelle-12 rows already held by CSB_durchmischt and CSB_sedimentiert on the same worksheet. Retirement proposed in STAGED S-2. (The lead sentence in the source says "Tabelle 11" where it means Tabelle 12 — a printing error in the Merkblatt itself.)', verified_at=now() where id='bcd1403f-7547-43f4-bde4-9130ba386bc9' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.EW
update public.fields set verification_status='verified_against_standard', verification_quote='EW & - & - & Einwohnerwert ( $E W=E G W+E Z$ ) — printed p.11', verification_note='md-verified 2026-09-05 (§2 Tabelle 1, second block, printed p.11) [VC]. This row is also the sole source of equation Gl-M732-01. Example plants: 100.000 EGW (Tabelle 25 p.39), Ausbaugröße 90.000 / Tagesspitze 111.000 EGW (Tabelle 28 p.40).', verified_at=now() where id='4d3273bb-7f30-4716-87ae-f722f3a831c2' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.EGW
update public.fields set verification_status='verified_against_standard', verification_quote='$E G W_{\mathrm{x}}$ & - & - & Einwohnergleichwert - mit Index der Bezugsgröße (z. B. C120, B60,...). Vergleichswert zur Umrechung von nicht häuslichem Abwasser — printed p.11', verification_note='md-verified 2026-09-05 (§2 Tabelle 1, second block, printed p.11) [VC]. The printed symbol carries an index (EGW_x); the encoded field drops it.', verified_at=now() where id='51b766ef-97f1-4443-9eb5-12561ad9cdfd' and verification_status not in ('verified_against_standard','corrected');

-- M732-08.EZ
update public.fields set verification_status='verified_against_standard', verification_quote='$E Z$ & - & - & Anzahl der Einwohner (z. B. in einem Siedlungsgebiet) — printed p.11', verification_note='md-verified 2026-09-05 (§2 Tabelle 1, second block, printed p.11) [VC].', verified_at=now() where id='a7e5252a-160a-4303-9182-3981910576d1' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-09 · Anforderungen Indirekteinleiter
-- ---------------------------------------------------------------------------

-- M732-09.NH4_grenzwert_indirekt_klein
update public.fields set verification_status='verified_against_standard', verification_quote='Nach dem Merkblatt DWA-M 115-2 sind folgende Begrenzungen für Nährsalzgehalte von Indirekteinleitern empfohlen (Tabelle 13): | Tabelle 13: Begrenzung von Nährsalzgehalten in Brauereiabwasser bei Indirekteinleitern nach Merkblatt DWA-M 115-2 | $\mathrm{NH}_{4}-\mathrm{N}+\mathrm{NH}_{3}-\mathrm{N}:$ & 100 & {$[\mathrm{mg} / \mathrm{l}]$} & $\leq 5.000$ — printed p.25', verification_note='md-verified 2026-09-05 (§7.3 / Tabelle 13, printed p.25) [VC]. The source word is "empfohlen" (recommended) and the value is DWA-M 115-2''s, not this Merkblatt''s — block gate CR-M732-04 is anchored on it; downgrade to warn proposed in STAGED S-6.', verified_at=now() where id='5ddee811-98cf-4de8-b643-5fe3aadd22db' and verification_status not in ('verified_against_standard','corrected');

-- M732-09.NH4_grenzwert_indirekt_gross
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 13: Begrenzung von Nährsalzgehalten in Brauereiabwasser bei Indirekteinleitern nach Merkblatt DWA-M 115-2 | $\mathrm{NH}_{4}-\mathrm{N}+\mathrm{NH}_{3}-\mathrm{N}:$ & 200 & {$[\mathrm{mg} / \mathrm{l}]$} & $>5.000$ — printed p.25', verification_note='md-verified 2026-09-05 (§7.3 / Tabelle 13, printed p.25) [VC]. Größenzuordnung > 5.000 EW; source word "empfohlen".', verified_at=now() where id='d0fb71dc-7918-4cc4-8be6-22b2fad692d9' and verification_status not in ('verified_against_standard','corrected');

-- M732-09.P_grenzwert_indirekt
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 13: Begrenzung von Nährsalzgehalten in Brauereiabwasser bei Indirekteinleitern nach Merkblatt DWA-M 115-2 | $\mathrm{P}_{\text {ges }}$ & 50 & {$[\mathrm{mg} / \mathrm{l}]$} & - — printed p.25', verification_note='md-verified 2026-09-05 (§7.3 / Tabelle 13, printed p.25) [VC]. No Größenzuordnung for P_ges (the table prints "-"); source word "empfohlen".', verified_at=now() where id='8d0526dd-fd37-4639-a98e-6299381e2a75' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-10 · Anforderungen Direkteinleiter (Anhang 11 AbwV)
-- ---------------------------------------------------------------------------

-- M732-10.BSB5_grenzwert
update public.fields set verification_status='verified_against_standard', verification_quote='Für direkteinleitende Brauereien gelten folgende, in Tabelle 14 zusammengestellte Mindestanforderungen nach Anhang 11 der Abwasserverordnung. Weitere immissionsbezogene Anforderungen können gestellt werden. | Tabelle 14: Mindestanforderungen für Brauereiabwasser bei Direkteinleitern nach Anhang 11 AbwV (Rosenwinkel \& Brinkmeyer 2004) | $\mathrm{BSB}_{5}$ & [mg/l] & 25 — printed p.25', verification_note='md-verified 2026-09-05 (§7.3 / Tabelle 14, printed p.25) [VC]. Legally binding value; the governing document is Anhang 11 AbwV (this Merkblatt reproduces it) → grade caps at VC/NR for the AbwV text itself.', verified_at=now() where id='8484ca62-a29c-49cd-b733-067021fad69c' and verification_status not in ('verified_against_standard','corrected');

-- M732-10.CSB_grenzwert
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 14: Mindestanforderungen für Brauereiabwasser bei Direkteinleitern nach Anhang 11 AbwV (Rosenwinkel \& Brinkmeyer 2004) | CSB & [mg/l] & 110 — printed p.25', verification_note='md-verified 2026-09-05 (§7.3 / Tabelle 14, printed p.25) [VC]. Confirmed a second time by Tabelle 26 (Überwachungswert CSB 110 mg/l, printed p.40).', verified_at=now() where id='1621d254-8651-4244-aad6-24321eb623b2' and verification_status not in ('verified_against_standard','corrected');

-- M732-10.NH4_N_grenzwert
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 14: Mindestanforderungen für Brauereiabwasser bei Direkteinleitern nach Anhang 11 AbwV (Rosenwinkel \& Brinkmeyer 2004) | $\mathrm{NH}_{4}$-N & [mg/l] & 10*) | *) bei $T_{\mathrm{e}} \geq 12^{\circ} \mathrm{C}$ und $\mathrm{N}_{\text {ges }} \geq 100 \mathrm{~kg} / \mathrm{d}$ — printed p.25', verification_note='md-verified 2026-09-05 (§7.3 / Tabelle 14 incl. footnote *), printed p.25) [VC]. The limit applies ONLY under the footnote condition; the encoding carries no condition — see STAGED S-5.', verified_at=now() where id='69423f87-7cb1-4a4c-bbcf-41c47b48b21d' and verification_status not in ('verified_against_standard','corrected');

-- M732-10.N_ges_grenzwert
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 14: Mindestanforderungen für Brauereiabwasser bei Direkteinleitern nach Anhang 11 AbwV (Rosenwinkel \& Brinkmeyer 2004) | $\mathrm{N}_{\text {ges }}$ & [mg/l] & 18*) | *) bei $T_{\mathrm{e}} \geq 12^{\circ} \mathrm{C}$ und $\mathrm{N}_{\text {ges }} \geq 100 \mathrm{~kg} / \mathrm{d}$. Bei Elimination $T N_{\mathrm{b}} \geq 70 \%$ Genehmigung bis $25 \mathrm{mg} \mathrm{N}_{\text {ges }} / \mathrm{l}$ möglich — printed p.25', verification_note='md-verified 2026-09-05 (§7.3 / Tabelle 14 incl. footnote *), printed p.25) [VC]. Two printed values: 18 mg/l, or up to 25 mg/l where TN_b elimination ≥ 70 % — SR-2: the applicable value is an explicit engineer selection, never auto-picked.', verified_at=now() where id='90ff20e1-f142-43fe-a31e-1ad48ecc0111' and verification_status not in ('verified_against_standard','corrected');

-- M732-10.P_ges_grenzwert
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 14: Mindestanforderungen für Brauereiabwasser bei Direkteinleitern nach Anhang 11 AbwV (Rosenwinkel \& Brinkmeyer 2004) | Pges & [mg/l] & 2**) | **) bei $\mathrm{P}_{\text {ges }} \geq 20 \mathrm{~kg} / \mathrm{d}$ — printed p.25', verification_note='md-verified 2026-09-05 (§7.3 / Tabelle 14 incl. footnote **), printed p.25) [VC]. The limit applies ONLY at P_ges ≥ 20 kg/d; the encoding carries no condition — see STAGED S-5.', verified_at=now() where id='07350a55-2c1a-4dd1-aee2-77009dc45bcc' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-11 · Chemisch-physikalische Vorbehandlung
-- ---------------------------------------------------------------------------

-- M732-11.BSB5_elim_grad
update public.fields set verification_status='verified_against_standard', verification_quote='Die Belüftung ist auf mindestens $50 \%$, bei gezielter biologischer Teilreinigung auf etwa $80 \% \mathrm{BSB}_{5}$-Eliminierung auszulegen. | Durch Einrichten eines ständigen Teilspeichers kann die biologische Wirkung auf $70 \%$ bis $80 \% \mathrm{BSB}_{5}$-Wirkungsgrad gesteigert werden. — printed p.26', verification_note='md-verified 2026-09-05 (§7.4.1.3 Misch- und Ausgleichsbecken, printed p.26) [VC]. The "mindestens 50 %" applies to BELÜFTETE M+A-Becken only; §7.4.1.3 also states that M+A basins upstream of an anaerobic stage "sollten sie ohne Belüftung betrieben werden" — gate CR-M732-07 does not distinguish; see STAGED S-5.', verified_at=now() where id='5cc03144-3ed8-4828-a7aa-d7504fdce699' and verification_status not in ('verified_against_standard','corrected');

-- M732-11.alpha_O2
update public.fields set verification_status='verified_against_standard', verification_quote='Dabei ist zu berücksichtigen, dass der Sauerstoffzufuhrfaktor, z. B. bei ungereinigtem Brauereiabwasser, bei $\alpha =0,4$ bis 0,6 liegen kann, wie Messungen in einem $\mathrm{M}+\mathrm{A}$-Becken ergeben haben (Seyfried \& Rosenwinkel 1981). — printed p.26', verification_note='md-verified 2026-09-05 (§7.4.1.3, printed p.26) [VC]. standard_range 0,4–0,6 — SR-2 selection.', verified_at=now() where id='78deb84e-39e8-405f-8286-fa7ef0811806' and verification_status not in ('verified_against_standard','corrected');

-- M732-11.Q_MA_becken
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 17: Abwassermengen und -frachten für die Bemessung der Misch- und Ausgleichsbecken (Webling-Arendt 2004) | max. Tagesmenge & [m³/d] & 9.260 | mittl. Tagesmenge & [m³/d] & 7.040 — printed p.32', verification_note='md-verified 2026-09-05 (§7.6.2 / Tabelle 17, printed p.32) [VC]. CAVEAT: the field carries clause_reference §7.4.1, which prints NO design flow. The only printed sizing figures are the §7.6.2 example plant (Tagesausgleich, Gesamtnutzungsvolumen 7.800 m3). Retag proposed in STAGED S-3.', verified_at=now() where id='d9892d7f-fec9-411c-97cd-ae70011a3385' and verification_status not in ('verified_against_standard','corrected');

-- M732-11.ablaufwert_MA_becken
update public.fields set verification_status='verified_against_standard', verification_quote='Die Brauerei muss als Indirekteinleiter in die kommunale Kläranlage die in Tabelle 16 aufgeführten Grenzwerte einhalten. | Tabelle 16: Vorgaben für die Ablaufwerte der Mischund Ausgleichsbecken (Webling-Arendt 2004) | pH-Wert & [-] & 6,5-10 | $\mathrm{BSB}_{5, \text { sed }}$ & [kg/h] & 450 — printed p.31', verification_note='md-verified 2026-09-05 (§7.6.2 / Tabelle 16, printed p.31) [VC]. CAVEAT: these are the permit values of ONE example plant, not a §7.4.1 requirement, and Tabelle 16 mixes units (µg/l for Cr/Cu/Ni/Zn/AOX, "-" for pH, kg/h for BSB5,sed) while the field is typed as a single number in mg/l. Retag + type note in STAGED S-3/S-4.', verified_at=now() where id='91cc29e7-d0f0-4cb7-b2ed-1707a0d94de3' and verification_status not in ('verified_against_standard','corrected');

-- M732-11.n_CO2_neutral
update public.fields set verification_status='verified_against_standard', verification_quote='Beim aeroben biologischen Abbau von $1 \mathrm{~g} \mathrm{BSB}_{5}$ werden $22,2 \mathrm{mmol} \mathrm{CO}_{2}$ erzeugt, wovon je nach Belüftungsart etwa $60 \%$ bis $70 \%$ für die Neutralisation angesetzt werden können (Mudrack \& Doedens 1973). — printed p.26', verification_note='md-verified 2026-09-05 (§7.4.1.2 Neutralisation, printed p.26) [VC]. derived field (output of Gl-M732-03); the 60–70 % band is a standard_range → SR-2 selection.', verified_at=now() where id='52cde2c4-65f4-4d07-b8d6-b8d9ef6350df' and verification_status not in ('verified_against_standard','corrected');

-- M732-11.n_CO2
update public.fields set verification_status='verified_against_standard', verification_quote='Beim aeroben biologischen Abbau von $1 \mathrm{~g} \mathrm{BSB}_{5}$ werden $22,2 \mathrm{mmol} \mathrm{CO}_{2}$ erzeugt, wovon je nach Belüftungsart etwa $60 \%$ bis $70 \%$ für die Neutralisation angesetzt werden können (Mudrack \& Doedens 1973). — printed p.26', verification_note='md-verified 2026-09-05 (§7.4.1.2, printed p.26) [VC]. derived field (output of Gl-M732-02); the factor 22,2 mmol CO2 per g BSB5 is standard_fixed.', verified_at=now() where id='527c19e2-304d-4886-bbe7-79c9e8f8ea6e' and verification_status not in ('verified_against_standard','corrected');

-- M732-11.m_BSB5
update public.fields set verification_status='verified_against_standard', verification_quote='Laugen sollten in der Regel nicht neutralisiert, sondern nur gleichmäßig zur Kläranlage dosiert werden; sie werden bei entsprechenden $\mathrm{BSB}_{5}$-Konzentrationen durch die $\mathrm{CO}_{2}$-Produktion im biologischen Reinigungsverfahren neutralisiert. Beim aeroben biologischen Abbau von $1 \mathrm{~g} \mathrm{BSB}_{5}$ werden $22,2 \mathrm{mmol} \mathrm{CO}_{2}$ erzeugt — printed p.26', verification_note='md-verified 2026-09-05 (§7.4.1.2, printed p.26) [VC]. engineer_input: the aerobically degraded BSB5 mass is the input of Gl-M732-02.', verified_at=now() where id='a4d5618e-e8d8-49ee-9fbd-814b69f9f991' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-12 · Aerobe biologische Behandlung
-- ---------------------------------------------------------------------------

-- M732-12.ISV_schlammindex
update public.fields set verification_status='verified_against_standard', verification_quote='Ein gutes Absetzverhalten ist bei Schlammindizes von $120 \mathrm{ml} / \mathrm{g}$ bis $180 \mathrm{ml} / \mathrm{g}$ zu erwarten. — printed p.27', verification_note='md-verified 2026-09-05 (§7.4.2.2.1 Belebungsverfahren, printed p.27) [VC]. Descriptive expectation ("zu erwarten"), not a requirement; standard_range 120–180 ml/g.', verified_at=now() where id='cf9d83ce-1670-4de7-b91f-fda2590b096c' and verification_status not in ('verified_against_standard','corrected');

-- M732-12.TS_BB
update public.fields set verification_status='verified_against_standard', verification_quote='übliche Schlammbelastungen liegen zwischen $B_{\mathrm{TS}}=0,05 \mathrm{~kg} \mathrm{BSB}_{5}$ und $0,08 \mathrm{~kg} \mathrm{BSB}_{5} /(\mathrm{kg}$ TS ⋅ d) bei einem TS-Gehalt im Belebungsbecken von ca. $3 \mathrm{~g} / \mathrm{l}$ bis $5 \mathrm{~g} / \mathrm{l}$. | $T S_{\text {BB }}$ & Konzentration z. B. g/l & - & Trockensubstanzgehalt im Belebungsbecken — printed p.12, p.27', verification_note='md-verified 2026-09-05 (§7.4.2.2.1 printed p.27; symbol row §2 Tabelle 1 printed p.12) [VC]. standard_range 3–5 g/l, introduced by "übliche" — SR-2 selection, no gate enforces it.', verified_at=now() where id='3f5fb7a1-2e26-43ed-b9fa-62291f5a4f95' and verification_status not in ('verified_against_standard','corrected');

-- M732-12.B_TS_BSB
update public.fields set verification_status='verified_against_standard', verification_quote='Mittlere Belastungsbereiche zwischen $B_{\text {TS }}=0,1 \mathrm{~kg} \mathrm{BSB}_{5}$ und $1,0 \mathrm{~kg} \mathrm{BSB}_{5} /(\mathrm{kg}$ TS ⋅ d) sind in der Regel für Brauereiabwässer wegen der Gefahr von Blähschlammbildung weniger geeignet, übliche Schlammbelastungen liegen zwischen $B_{\mathrm{TS}}=0,05 \mathrm{~kg} \mathrm{BSB}_{5}$ und $0,08 \mathrm{~kg} \mathrm{BSB}_{5} /(\mathrm{kg}$ TS ⋅ d) — printed p.27', verification_note='md-verified 2026-09-05 (§7.4.2.2.1, printed p.27) [VC]. The 0,05–0,08 band is DESCRIPTIVE ("übliche Schlammbelastungen liegen zwischen") and the 0,1–1,0 band is only "in der Regel … weniger geeignet" — block gate CR-M732-08 hard-enforces 0,05 ≤ B_TS ≤ 0,08; downgrade to warn proposed in STAGED S-6.', verified_at=now() where id='492e8414-7d87-4f57-8a93-e67b13005fc9' and verification_status not in ('verified_against_standard','corrected');

-- M732-12.V_BB
update public.fields set verification_status='verified_against_standard', verification_quote='$V_{\mathrm{BB}}$ & $\mathrm{m}^{3}$ & - & Volumen Belebungsbecken — printed p.12', verification_note='md-verified 2026-09-05 (§2 Tabelle 1, third block, printed p.12) [VC]. Symbol + unit only; the Merkblatt prints no sizing formula for V_BB (it refers to ATV-DVWK-A 131 „Bemessung von einstufigen Belebungsanlagen“, Technische Regeln p.47 → NR).', verified_at=now() where id='2b812671-9421-4148-a00b-9b1cb7673a66' and verification_status not in ('verified_against_standard','corrected');

-- M732-12.B_TS_CSB
update public.fields set verification_status='verified_against_standard', verification_quote='$B_{\mathrm{TS}, \mathrm{CSB}}$ & g CSB/(gTS•d) & - & Schlammbelastung — printed p.10', verification_note='md-verified 2026-09-05 (§2 Tabelle 1, first block, printed p.10) [VC]. NOTE: Tabelle 1 prints the unit as g CSB/(gTS·d); the encoded field unit is kg CSB/(kg TS*d) — dimensionally identical, see STAGED S-4.', verified_at=now() where id='9b2234bf-1034-4138-9c59-a23587e21ef9' and verification_status not in ('verified_against_standard','corrected');

-- M732-12.US_d
update public.fields set verification_status='verified_against_standard', verification_quote='$\ddot{U} S_{\mathrm{d}}$ & Fracht z. B. kg/d & - & Tägliche Schlammproduktion — printed p.12', verification_note='md-verified 2026-09-05 (§2 Tabelle 1, third block, printed p.12) [VC]. Symbol + unit only; no sludge-production value is printed for the general case (only §8.2.3 example composition, Tabelle 31 p.44).', verified_at=now() where id='a7cccea4-f4ce-4812-b8ee-622ea1459edc' and verification_status not in ('verified_against_standard','corrected');

-- M732-12.t_TS
update public.fields set verification_status='verified_against_standard', verification_quote='$t_{\mathrm{TS}}$ & d & - & Schlammalter — printed p.12', verification_note='md-verified 2026-09-05 (§2 Tabelle 1, third block, printed p.12) [VC]. Symbol + unit only; no sludge-age value or limit is printed.', verified_at=now() where id='53405c40-4b7a-41e7-ae97-4eb5906f628c' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-13 · Anaerobe biologische Behandlung
-- ---------------------------------------------------------------------------

-- M732-13.v_leerrohr
update public.fields set verification_status='verified_against_standard', verification_quote='In beiden Reaktortypen wird durch eine hohe Rückführrate eine hohe Leerrohrgeschwindigkeit von $5 \mathrm{~m} / \mathrm{h}$ bis $20 \mathrm{~m} / \mathrm{h}$ erreicht, die einen intensiven Kontakt zwischen Abwasser und Biomasse bedingt und dadurch eine gesteigerte Schlammaktivität bewirkt. — printed p.28', verification_note='md-verified 2026-09-05 (§7.4.2.3 Anaerobe Verfahren, printed p.28) [VC]. Applies to EGSB and Fließbett reactors; standard_range 5–20 m/h — SR-2 selection.', verified_at=now() where id='479bdaa1-b555-4643-99fe-34da0272758f' and verification_status not in ('verified_against_standard','corrected');

-- M732-13.CSB_abbaugrad_anaerob
update public.fields set verification_status='verified_against_standard', verification_quote='Die erreichbaren Abbaugrade in der Anaerobstufe betragen aufgrund der guten Abbaubarkeit des Abwassers ca. $80 \%$ bis $85 \%$, bezogen auf den filtrierten CSB. — printed p.28', verification_note='md-verified 2026-09-05 (§7.4.2.3, printed p.28) [VC]. Explicitly "bezogen auf den filtrierten CSB". The §7.6.3 example plant achieves 73 % (printed p.33) — i.e. the 80–85 % is an achievable band, not a requirement.', verified_at=now() where id='cdfe022e-70df-4b56-a1d3-141ae5dfc678' and verification_status not in ('verified_against_standard','corrected');

-- M732-13.B_R_CSB
update public.fields set verification_status='verified_against_standard', verification_quote='Mit diesen Reaktortypen können bei guten Substrateigenschaften im großtechnischen Maßstab Raumbelastungen von bis zu $30 \mathrm{~kg} \mathrm{CSB} /\left(\mathrm{m}^{3} \cdot \mathrm{~d}\right)$ erreicht werden | Bei Temperaturen von $35^{\circ} \mathrm{C}$ betragen die üblichen Auslegungswerte für UASB-Reaktoren ca. $8 \mathrm{~kg} \mathrm{CSB} /\left(\mathrm{m}^{3} \cdot \mathrm{~d}\right)$ bis 10 kg CSB/ $\left(\mathrm{m}^{3} \cdot \mathrm{~d}\right)$ und für Hochlastverfahren ca. $20 \mathrm{~kg} \mathrm{CSB} /\left(\mathrm{m}^{3} \cdot \mathrm{~d}\right)$ bis $25 \mathrm{~kg} \mathrm{CSB} /\left(\mathrm{m}^{3} \cdot \mathrm{~d}\right)$. — printed p.28', verification_note='md-verified 2026-09-05 (§7.4.2.3, printed p.28) [VC]. Three printed bands, reactor-type and temperature dependent (UASB 8–10; Hochlast/EGSB 20–25; up to 30 with good substrate at 35 °C) — SR-2: reactor type and design value are explicit engineer selections. No gate enforces this and none should without the reactor-type discriminator.', verified_at=now() where id='0671a917-65c1-40c4-9978-a74d14687a9c' and verification_status not in ('verified_against_standard','corrected');

-- M732-13.vorversaeuerungsgrad
update public.fields set verification_status='verified_against_standard', verification_quote='Neben der Feststoffabscheidung sind ein ausreichend dimensioniertes Misch- und Ausgleichsbecken und eine Vorversäuerung notwendige Verfahrensschritte zur Gewährleistung eines stabilen Anlagenbetriebes. Die Aufenthaltszeit in der Vorversäuerung sollte anpassbar realisiert werden. Ein Vorversäuerungsgrad von ca. $30 \%$ bis $40 \%$ hat sich in vielen Fällen bewährt. — printed p.29', verification_note='md-verified 2026-09-05 (§7.4.2.3, printed p.29 — the section runs p.28–29) [VC]. "hat sich in vielen Fällen bewährt" = experience value, not a requirement; standard_range 30–40 % → SR-2 selection. The pre-acidification STEP itself is "notwendig" — a missing block gate, proposed in STAGED S-7(a).', verified_at=now() where id='fe236bbf-f81d-4841-b29e-e21b5310dbb5' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-15 · (worksheet titled "Beispielanlage Neutralisation", but every field below is a §8.5 Lärm field —
--            mis-homed worksheet, re-home to M732-22 proposed in STAGED S-1)
-- ---------------------------------------------------------------------------

-- M732-15.schallpegel
update public.fields set verification_status='verified_against_standard', verification_quote='Welche Schutzabstände einzuhalten sind, hängt vom Gesamtschallleistungspegel des Betriebes und von der Schutzwürdigkeit der angrenzenden Gebiete ab. Bei einem Schallleistungspegel von z. B. $100 \mathrm{~dB}(\mathrm{~A})$, muss der Abstand zu einem reinen Wohngebiet (WR) ca. 400 m , zu einem allgemeinen Wohngebiet (WA) ca. 250 m und zu einem Mischgebiet ca. 150 m betragen. — printed p.45', verification_note='md-verified 2026-09-05 (§8.5 Lärm, printed p.45) [VC]. The 100 dB(A) is expressly an EXAMPLE ("z. B."); the field is engineer_input (the plant''s actual sound power level). Field sits on M732-15 (Beispielanlage Neutralisation) — re-home to M732-22 proposed in STAGED S-1.', verified_at=now() where id='2f653bf5-9ad8-425f-852d-315ed69fdb06' and verification_status not in ('verified_against_standard','corrected');

-- M732-15.gebiet
update public.fields set verification_status='verified_against_standard', verification_quote='Kann bei Neubauten durch diese Maßnahmen keine ausreichende Dämpfung des Schallpegels erreicht werden, sind Mindestabstände zu Gebieten mit reiner oder anteiliger Wohnnutzung zu beachten. Welche Schutzabstände einzuhalten sind, hängt vom Gesamtschallleistungspegel des Betriebes und von der Schutzwürdigkeit der angrenzenden Gebiete ab. | WA & - & - & allgemeines Wohngebiet | WR & - & - & reines Wohngebiet — printed p.12, p.45', verification_note='md-verified 2026-09-05 (§8.5 printed p.45; the WA/WR abbreviations §2 Tabelle 1 third block printed p.12) [VC]. CAVEAT: the field is free text with NO enum, yet gate CR-M732-15 compares it to the literal tokens WR/WA/MI — an enum is proposed in STAGED S-8. "MI" (Mischgebiet) is not among the Tabelle 1 abbreviations.', verified_at=now() where id='3993735d-e68a-4d42-af1a-bc7aa6d9c502' and verification_status not in ('verified_against_standard','corrected');

-- M732-15.abstand_wr
update public.fields set verification_status='verified_against_standard', verification_quote='Bei einem Schallleistungspegel von z. B. $100 \mathrm{~dB}(\mathrm{~A})$, muss der Abstand zu einem reinen Wohngebiet (WR) ca. 400 m , zu einem allgemeinen Wohngebiet (WA) ca. 250 m und zu einem Mischgebiet ca. 150 m betragen. — printed p.45', verification_note='md-verified 2026-09-05 (§8.5, printed p.45) [VC]. 400 m holds for the EXAMPLE level of 100 dB(A) ("z. B."), it is not a level-independent minimum. Field carries unit=NULL; m proposed in STAGED S-4.', verified_at=now() where id='e3c44469-75a8-4a02-aa39-57101d0f44cf' and verification_status not in ('verified_against_standard','corrected');

-- M732-15.abstand_wa
update public.fields set verification_status='verified_against_standard', verification_quote='Bei einem Schallleistungspegel von z. B. $100 \mathrm{~dB}(\mathrm{~A})$, muss der Abstand zu einem reinen Wohngebiet (WR) ca. 400 m , zu einem allgemeinen Wohngebiet (WA) ca. 250 m und zu einem Mischgebiet ca. 150 m betragen. — printed p.45', verification_note='md-verified 2026-09-05 (§8.5, printed p.45) [VC]. 250 m holds for the EXAMPLE level of 100 dB(A). Field carries unit=NULL; m proposed in STAGED S-4.', verified_at=now() where id='61f7d6e0-e45d-4d52-bf29-21292e89b464' and verification_status not in ('verified_against_standard','corrected');

-- M732-15.abstand_mi
update public.fields set verification_status='verified_against_standard', verification_quote='Bei einem Schallleistungspegel von z. B. $100 \mathrm{~dB}(\mathrm{~A})$, muss der Abstand zu einem reinen Wohngebiet (WR) ca. 400 m , zu einem allgemeinen Wohngebiet (WA) ca. 250 m und zu einem Mischgebiet ca. 150 m betragen. — printed p.45', verification_note='md-verified 2026-09-05 (§8.5, printed p.45) [VC]. 150 m holds for the EXAMPLE level of 100 dB(A). Field carries unit=NULL; m proposed in STAGED S-4.', verified_at=now() where id='b3cc2ac6-5422-4f8e-b90a-c2badb0edfd0' and verification_status not in ('verified_against_standard','corrected');

-- M732-15.nachtzeit
update public.fields set verification_status='verified_against_standard', verification_quote='Die Mindestabstände gelten für den Betrieb in der Nachtzeit ( 22 Uhr bis 6 Uhr), in der um $15 \mathrm{~dB}(\mathrm{~A})$ geringere Immissionsrichtwerte als am Tage zugrunde zu legen sind (nach TA LÄRM 1998). — printed p.45', verification_note='md-verified 2026-09-05 (§8.5, printed p.45) [VC]. The night window 22:00–06:00 is printed verbatim; the governing document is TA Lärm 1998 (NR for its own text).', verified_at=now() where id='f8de14b5-4062-4b3d-b076-c5808ee7736a' and verification_status not in ('verified_against_standard','corrected');

-- M732-15.immissionsrichtwert_tag
update public.fields set verification_status='verified_against_standard', verification_quote='Die Geräuschimmissionen werden nach der „Technischen Anleitung zum Schutz gegen Lärm (TA Lärm)“ beurteilt. | Die Mindestabstände gelten für den Betrieb in der Nachtzeit ( 22 Uhr bis 6 Uhr), in der um $15 \mathrm{~dB}(\mathrm{~A})$ geringere Immissionsrichtwerte als am Tage zugrunde zu legen sind (nach TA LÄRM 1998). — printed p.45', verification_note='md-verified 2026-09-05 (§8.5, printed p.45) [VC]. CAVEAT: the Merkblatt prints only the 15 dB(A) day/night DIFFERENCE — the daytime Immissionsrichtwerte themselves are in TA Lärm 1998 and are NOT printed here (NR).', verified_at=now() where id='fd0ed4b2-8078-41bb-9dfb-41d38ef426aa' and verification_status not in ('verified_against_standard','corrected');

-- M732-15.immissionsrichtwert_nacht
update public.fields set verification_status='verified_against_standard', verification_quote='Die Mindestabstände gelten für den Betrieb in der Nachtzeit ( 22 Uhr bis 6 Uhr), in der um $15 \mathrm{~dB}(\mathrm{~A})$ geringere Immissionsrichtwerte als am Tage zugrunde zu legen sind (nach TA LÄRM 1998). — printed p.45', verification_note='md-verified 2026-09-05 (§8.5, printed p.45) [VC]. CAVEAT: only the 15 dB(A) offset to the daytime value is printed; the absolute night value is TA Lärm 1998 (NR).', verified_at=now() where id='5f36b0d6-0d2c-4ac3-be82-a2472c6fe97f' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-17 · Beispielanlage Anaerob-aerob (Indirekteinleitung)
-- ---------------------------------------------------------------------------

-- M732-17.investitionssumme
update public.fields set verification_status='verified_against_standard', verification_quote='Angaben zu den Investitionen der Abwasservorbehandlung sowie laufender Betriebskosten sind Tabelle 19 zu entnehmen. | Tabelle 19: Investitionen der Abwasservorbehandlung und laufende Kosten auf Basis des Jahres 2003 | Gesamtinvestitionssumme & 10.000 — printed p.33', verification_note='md-verified 2026-09-05 (§7.6.3 / Tabelle 19, printed p.33) [VC]. CAVEAT: a single example plant on a 2003 cost basis (T€), not a design value.', verified_at=now() where id='b8f18b2f-5af5-40e9-82b4-76181aee398a' and verification_status not in ('verified_against_standard','corrected');

-- M732-17.kosten_summe_spez
update public.fields set verification_status='verified_against_standard', verification_quote='Summe Betriebskosten (2003) & 1.671 & 3,05 | Summe & 2,01 [€/m³] | Summe & [€ $/ \mathrm{m}^{3}$ ] & 3,39 — printed p.33, p.35, p.40', verification_note='md-verified 2026-09-05 (Tabelle 19 printed p.33, Tabelle 22 printed p.35, Tabelle 27 printed p.40) [VC]. CAVEAT: three DIFFERENT example plants on different cost bases (2003 / 2007). Not a benchmark the Merkblatt asserts.', verified_at=now() where id='bed238e2-07ce-48db-b819-d3866093b176' and verification_status not in ('verified_against_standard','corrected');

-- M732-17.kosten_energie_spez
update public.fields set verification_status='verified_against_standard', verification_quote='Energie (Verbrauch abzgl. Verkaufserlöse) & 7 & 0,01 | Energie & 0,28 [€ $/ \mathrm{m}^{3}$ ] | Energie & [€ $/ \mathrm{m}^{3}$ ] & 0,44 — printed p.33, p.35, p.40', verification_note='md-verified 2026-09-05 (Tabelle 19 printed p.33, Tabelle 22 printed p.35, Tabelle 27 printed p.40) [VC]. CAVEAT: three different example plants; the Tabelle 19 figure is NET of biogas/electricity sales.', verified_at=now() where id='7e6ba3b0-5a14-413a-962b-f2afd141faac' and verification_status not in ('verified_against_standard','corrected');

-- M732-17.kosten_personal_spez
update public.fields set verification_status='verified_against_standard', verification_quote='Personal & 150 & 0,27 | Personalkosten & 0,32 [€/m³ Abwasser] | Personalkosten & [ € / $\mathrm{m}^{3}$ ] & 0,70 — printed p.33, p.35, p.40', verification_note='md-verified 2026-09-05 (Tabelle 19 printed p.33, Tabelle 22 printed p.35, Tabelle 27 printed p.40) [VC]. CAVEAT: three different example plants (2003 / 2007 basis).', verified_at=now() where id='96388f32-8447-4e36-aaa9-8080bc4a08ab' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-18 · Beispielanlage Aerob (Direkteinleitung)
-- ---------------------------------------------------------------------------

-- M732-18.kosten_afa_spez
update public.fields set verification_status='verified_against_standard', verification_quote='AfA & - & - & Absetzung für Abnutzungen | AfA & 0,84 [€/ $\mathrm{m}^{3}$ ] | AfA & [ € $/ \mathrm{m}^{3}$ ] & 1,55 — printed p.10, p.35, p.40', verification_note='md-verified 2026-09-05 (abbreviation §2 Tabelle 1 first block printed p.10; Tabelle 22 printed p.35; Tabelle 27 printed p.40) [VC]. CAVEAT: two different example plants, 2007 cost basis.', verified_at=now() where id='77a443f4-6f91-488c-860e-db2c94920d54' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-21 · Weitere Emissionen: Abfaelle und Nebenprodukte
-- ---------------------------------------------------------------------------

-- M732-21.treber_spez
update public.fields set verification_status='verified_against_standard', verification_quote='Die spezifischen Anfallmengen der wirtschaftlich relevanten Nebenprodukte liegen bei den Trebern bei ca. $18 \mathrm{~kg} / \mathrm{hl}$ (Verkaufsbier) und bei der Hefe bei ca. $2,9 \mathrm{~kg} / \mathrm{hl}$. — printed p.41, p.42', verification_note='md-verified 2026-09-05 (§8.2.1 Anfall und Zuordnung — the sentence straddles the p.41/p.42 page break) [VC]. Reference value ("ca."), not a limit.', verified_at=now() where id='382fd873-2ee4-4563-a0bf-fcd6b782e7bd' and verification_status not in ('verified_against_standard','corrected');

-- M732-21.hefe_spez
update public.fields set verification_status='verified_against_standard', verification_quote='Die spezifischen Anfallmengen der wirtschaftlich relevanten Nebenprodukte liegen bei den Trebern bei ca. $18 \mathrm{~kg} / \mathrm{hl}$ (Verkaufsbier) und bei der Hefe bei ca. $2,9 \mathrm{~kg} / \mathrm{hl}$. — printed p.41, p.42', verification_note='md-verified 2026-09-05 (§8.2.1, printed p.41–42) [VC]. Reference value ("ca."), not a limit.', verified_at=now() where id='4280536a-2734-4b78-9b9c-f1bba55b6f2f' and verification_status not in ('verified_against_standard','corrected');

-- M732-21.K_ges
update public.fields set verification_status='verified_against_standard', verification_quote='$\mathrm{K}_{\text {ges }}$ & Konzentration z. B. mg/l & Fracht z. B. kg/d & Gesamtkalium | Tabelle 31: Inhaltsstoffe des Überschussschlammes aus einer anaeroben-aeroben Abwasserbehandlungsanlage (TS ca. 30 \%, pH-Wert 8,6) | $\mathrm{K}_{\text {ges }}$ & 0,1 & 0,03 — printed p.11, p.44', verification_note='md-verified 2026-09-05 (§2 Tabelle 1 printed p.11; §8.2.3 Tabelle 31 printed p.44) [VC]. CAVEAT — UNIT: Tabelle 31 prints K_ges as % of dry / original substance, the encoded field unit is mg/l (the Tabelle 1 example unit). See STAGED S-4.', verified_at=now() where id='e49d3c4b-676f-40c7-9144-2f5b826e42f0' and verification_status not in ('verified_against_standard','corrected');

-- M732-21.Mg_ges
update public.fields set verification_status='verified_against_standard', verification_quote='$\mathrm{Mg}_{\text {ges }}$ & Konzentration z. B. mg/l & Fracht z. B. kg/d & Gesamtmagnesium | Tabelle 31: Inhaltsstoffe des Überschussschlammes aus einer anaeroben-aeroben Abwasserbehandlungsanlage (TS ca. 30 \%, pH-Wert 8,6) | $\mathrm{Mg}_{\mathrm{ges}}$ & 0,34 & 0,1 — printed p.11, p.44', verification_note='md-verified 2026-09-05 (§2 Tabelle 1 printed p.11; §8.2.3 Tabelle 31 printed p.44) [VC]. CAVEAT — UNIT: Tabelle 31 prints Mg_ges in %, the encoded field unit is mg/l. See STAGED S-4.', verified_at=now() where id='bc11861a-439f-4fc5-ad05-bda22b4a79d1' and verification_status not in ('verified_against_standard','corrected');

-- M732-21.oTS
update public.fields set verification_status='verified_against_standard', verification_quote='oTS & Konzentration z. B. g/l & \% & Organische Trockensubstanz | Organische Substanz & 27,8 & 8,0 — printed p.12, p.44', verification_note='md-verified 2026-09-05 (§2 Tabelle 1 third block printed p.12; Tabelle 31 organic-matter row printed p.44) [VC]. Tabelle 1 gives % as the Ergänzungseinheit, which matches the encoded field unit.', verified_at=now() where id='416de19f-1229-4171-9ab2-5db8469d143b' and verification_status not in ('verified_against_standard','corrected');

-- M732-21.TS
update public.fields set verification_status='verified_against_standard', verification_quote='TS & Konzentration z. B. g/l & - & Trockensubstanzgehalt | Tabelle 31: Inhaltsstoffe des Überschussschlammes aus einer anaeroben-aeroben Abwasserbehandlungsanlage (TS ca. 30 \%, pH-Wert 8,6) | Der bei der Abwasserreinigung anfallende Überschussschlamm wird aerob stabilisiert und mittels Standeindicker, Zentrifuge und dampfbeheizten Plattentrockner auf einen Trockensubstanzgehalt von 95 \% entwässert und getrocknet. — printed p.12, p.39, p.44', verification_note='md-verified 2026-09-05 (§2 Tabelle 1 third block printed p.12; §7.6.6 printed p.39; Tabelle 31 caption printed p.44) [VC]. NOTE: Tabelle 1 gives the example unit as g/l while the encoded field unit is % — the % readings come from Tabelle 31 / §7.6.6. See STAGED S-4.', verified_at=now() where id='b7533f72-a6bb-44f4-bc98-bcaf0c1a76a6' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- M732-22 · Weitere Emissionen: Dampf, Abluft, Geruch, Laerm
-- ---------------------------------------------------------------------------

-- M732-22.staubkonz_rein
update public.fields set verification_status='verified_against_standard', verification_quote='Die Staubemissionen (Malzannahme, Schroterei, Schüttguttransport) können mit Entstaubungsanlagen entsprechend dem Stand der Technik auf Reingasstaubkonzentrationen von $<20 \mathrm{mg} / \mathrm{m}^{3}$ begrenzt werden. — printed p.44', verification_note='md-verified 2026-09-05 (§8.4 Abluft und Geruch, printed p.44) [VC]. Stated as an achievable state of the art ("können … begrenzt werden"), NOT as an obligation — no block gate is justified on this value.', verified_at=now() where id='59ee57db-05ec-4bc1-8b8c-b3271d6a3a44' and verification_status not in ('verified_against_standard','corrected');

-- M732-22.H2S_konz_grenze_bio
update public.fields set verification_status='verified_against_standard', verification_quote='Eine Grenze für biologische Verfahren wird etwa bei $>20 \mathrm{mg} / \mathrm{m}^{3} \mathrm{H}_{2} \mathrm{~S}$ ( $>$ ca. 13 ppmV ) gesetzt. Darüber ist ein mit Natronlauge arbeitender Chemowäscher sinnvoll, der mit hohen pH -Werten (i. d. R. pH 10 ) betrieben werden kann. — printed p.45', verification_note='md-verified 2026-09-05 (§8.4, printed p.45) [VC]. A process-selection threshold ("etwa", "sinnvoll"), not an emission limit.', verified_at=now() where id='4d3e1e09-415a-46c9-ad35-5c8b3eff4ee6' and verification_status not in ('verified_against_standard','corrected');

-- M732-22.geruch_konz
update public.fields set verification_status='verified_against_standard', verification_quote='Um die Emissionen einer Gesamtanlage abschätzen zu können, sind die jeweiligen Geruchsstoffkonzentrationen aller Teilvolumenströme als Einzelquellen zu bestimmen. Dies geschieht mit Hilfe der Olfaktometrie nach DIN EN 13725. — printed p.45', verification_note='md-verified 2026-09-05 (§8.4, printed p.45) [VC]. CAVEAT: the Merkblatt defines the MEASUREMENT duty (olfactometry per DIN EN 13725) but prints NO odour concentration value or limit — the assessment thresholds live in the GIRL / TA Luft (Gesetze und Verordnungen p.46) → NR for the value itself.', verified_at=now() where id='803443d8-5561-493b-9518-566fd93b0774' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- Equations (3 of 3 quoted, 0 residue)
-- ---------------------------------------------------------------------------

-- Gl-M732-01 · EW = EGW + EZ (M732-08)
update public.equations set verification_status='verified_against_standard', verification_quote='EW & - & - & Einwohnerwert ( $E W=E G W+E Z$ ) | $E G W_{\mathrm{x}}$ & - & - & Einwohnergleichwert - mit Index der Bezugsgröße (z. B. C120, B60,...). Vergleichswert zur Umrechung von nicht häuslichem Abwasser | $E Z$ & - & - & Anzahl der Einwohner (z. B. in einem Siedlungsgebiet) — printed p.11', verification_note='md-verified 2026-09-05 (§2 Tabelle 1 „Im Dokument verwendete Abkürzungen“, second block, printed p.11) [VC]. The equation is printed inside the EW definition cell; the two input rows are quoted alongside it.', verified_at=now() where id='a805ee12-14e4-457f-be5e-a1e5e2cfaf91' and verification_status <> 'verified_against_standard';

-- Gl-M732-02 · n_CO2 = 22,2 * m_BSB5 (M732-11)
update public.equations set verification_status='verified_against_standard', verification_quote='Beim aeroben biologischen Abbau von $1 \mathrm{~g} \mathrm{BSB}_{5}$ werden $22,2 \mathrm{mmol} \mathrm{CO}_{2}$ erzeugt, wovon je nach Belüftungsart etwa $60 \%$ bis $70 \%$ für die Neutralisation angesetzt werden können (Mudrack \& Doedens 1973). — printed p.26', verification_note='md-verified 2026-09-05 (§7.4.1.2 Neutralisation, printed p.26) [VC]. The factor 22,2 mmol CO2 per g BSB5 is printed verbatim; the equation is the direct proportionality the sentence states. Unit of the result: mmol per g BSB5 degraded.', verified_at=now() where id='136985eb-8dca-45b1-a61f-abe9b4db47ee' and verification_status <> 'verified_against_standard';

-- Gl-M732-03 · n_CO2_neutral = 0,60..0,70 * n_CO2 (M732-11)
update public.equations set verification_status='verified_against_standard', verification_quote='Beim aeroben biologischen Abbau von $1 \mathrm{~g} \mathrm{BSB}_{5}$ werden $22,2 \mathrm{mmol} \mathrm{CO}_{2}$ erzeugt, wovon je nach Belüftungsart etwa $60 \%$ bis $70 \%$ für die Neutralisation angesetzt werden können (Mudrack \& Doedens 1973). Bei entsprechendem „Schmutzausgleich“ können also pH -Werte über 10 zugelassen werden. — printed p.26', verification_note='md-verified 2026-09-05 (§7.4.1.2, printed p.26) [VC]. SR-2: the 60–70 % band is a RANGE ("je nach Belüftungsart") — the encoded formula keeps both bounds and must surface the point value as an explicit engineer selection, never auto-pick.', verified_at=now() where id='462c0610-099f-468c-8330-efe8e7bf7c33' and verification_status <> 'verified_against_standard';
