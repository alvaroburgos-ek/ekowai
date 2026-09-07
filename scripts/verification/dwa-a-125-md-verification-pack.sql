-- ============================================================================
-- SR-1 field-verification pack — DWA-A-125 "Rohrvortrieb und verwandte Verfahren".
-- Edition on the title page: "Dezember 2008, korrigierte Fassung September 2020"; "© DWA, 3. Auflage,
--   korrigierte Fassung Stand September 2020, Hennef 2020"; ISBN 978-3-941089-30-3 (Print) /
--   978-3-96862-055-8 (E-Book). This is an ARBEITSBLATT — i.e. a WEISSDRUCK (the published rule), NOT a
--   Gelbdruck/Entwurf: the title page carries no "Entwurf" and no comment deadline, the Benutzerhinweis is the
--   Weissdruck wording ("Für dieses besteht nach der Rechtsprechung eine tatsächliche Vermutung, dass es
--   inhaltlich und fachlich richtig sowie allgemein anerkannt ist"), and the document's only reference to
--   Gelbdrucke is the DWA-Regelwerk-Online advertisement on the back matter. Weitgehend inhaltlich identisch
--   mit DVGW-Arbeitsblatt GW 304. Its "muss/darf nicht" statements are normative rule text, so a block gate on
--   a hard "muss" is defensible here; "sollte" statements are NOT (see the STAGED file).
-- Generated: 2026-09-05 — md-verified pass (owner ruling 2026-09-05: the markdown transcript is the verification
--   source; the PDF only where no markdown exists). Grade: VC (SR-3), labelled as such on every row.
-- Source md: C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-A-125\DWA-A-125.md
--   (3,093 lines, read completely in this session; sibling DWA-A-125.pdf and .xlsx were NOT used).
--   The transcript is mathpix LaTeX: quotes keep `$…$`, `\hline`, `\\`, `\multicolumn`, `\begin{aligned}` and
--   the table "&" separators verbatim, because re-rendering them as plain text fails the verbatim spotcheck.
--   PAGE CONVENTION: the md carries NO standalone page-number lines and no page markers at all. "printed p.N"
--   was DERIVED from the document's own Inhalt / Bilderverzeichnis / Tabellenverzeichnis (printed pp.5-10 of the
--   guideline, transcript lines 155-394), which give a printed page for every clause, every Bild and every
--   Tabelle. That mapping was CROSS-CHECKED against the mathpix image indices embedded in the md, which are
--   offset by exactly +2 from the printed page throughout: Bild 1 (Inhalt: p.20) = "…-22.jpg", Bild 2 (p.22) =
--   "…-24.jpg", Bild 4 (p.25) = "…-27.jpg", Bild 6 (p.30) = "…-32.jpg", Bild 21 (p.46) = "…-48.jpg", Anhang B
--   (p.73) = "…-75.jpg". Every page ref below therefore = Inhalt page, image-index-confirmed. Where a clause
--   spans a page break the quote carries every page it touches. The page ref is given ONCE at the end of each
--   quote; the per-clause page is repeated in verification_note.
-- Scope: fields with verification_status NOT IN ('verified_against_standard','corrected') — ALL 70 fields were
--   'imported_unverified' at export time (export: fields-DWA-A-125.json, this session):
--   70 examined / 70 quoted → verified_against_standard / 0 app-metadata exempt / 0 residue.
--   0 exempt because DWA-A-125 has no client/project-metadata worksheet: every one of the 70 fields is a
--   guideline-defined quantity, material choice, tolerance or duty. The 2026-08-01 metadata-exemption class is
--   empty on this standard.
--   ONE CAVEAT is carried in verification_note rather than in the residue list: A125-04.mindestueberdeckung is
--   verified from the §7.1.5 sentence (printed p.47) that names the sources, and Tabelle 7 (printed p.32) is
--   fully readable in the md — but Anhang B (printed p.73), which holds the Erfahrungswerte for the STEERABLE
--   methods, exists in the transcript only as a mathpix IMAGE ("…-75.jpg") with no extracted text. That half of
--   the field's value set is NR from the md and would need the PDF.
-- Equations: 2 (E1 Δa = a_max − a_min, §5.2.3.2; E2 R_min = 200 × D_a, §7.1.6). BOTH are already
--   verification_status='verified_against_standard' in prod, so this pack does NOT change their status — a
--   status statement would report rows=0. Both carried a NULL verification_quote, so the pack BACKFILLS
--   quote + note (guard: verification_quote is null). Both formulas were re-read against the md this session
--   and match the printed text verbatim; E2's printed form is an inequality (R_min ≥ 200 × D_a) offered as
--   "eine erste grobe Abschätzung", which the encoded equality reproduces as the boundary value — noted, not
--   changed (see STAGED S-8).
-- Gates: 16, all severity='block' (CR-001…CR-016). All 16 source_quotes were located verbatim in the md — none
--   is fabricated, none is empty, none is condition='TRUE', there are no duplicate codes and no unsatisfiable
--   enum operands. But 8 of them are defective and are written up in the STAGED file, not fixed here:
--     · CR-008 (§7.1.7) is a PRESENCE-ONLY no-op: its source_quote carries Tabelle 10's printed limits
--       (±20/±25/±30/±50 mm vertikal, ±25/±40/±100/±200 mm horizontal) but its condition is only
--       "abweichung_vertikal_zul > 0 AND abweichung_horizontal_zul > 0" — it never compares anything to the
--       table. It is also severity='block' on text that reads "sollten nicht überschritten werden".
--     · CR-011 (§7.2.6) OVER-enforces: the guideline prints "max. 100 mm Länge ODER max. 90 s Dauer"; the
--       condition ANDs the two.
--     · CR-001 (§5.2.3.1) UNDER-enforces: the DN>1200 branch of the condition carries no limit at all, so the
--       printed +25/−10 mm row of Tabelle 1 is unenforced.
--     · CR-006 (§7.1.3) is a block gate on a "sollten" sentence (50 m Aufschlussabstand).
--     · CR-015 (§8.1) reads sondergelaende, which lives on worksheet A125-01, from a gate homed on A125-07, and
--       demands a Genehmigung even when sondergelaende='keines'.
--     · CR-012 (§7.2.6) reads zul_vorpresskraft (worksheet A125-05) from a gate homed on A125-06, and its
--       source_quote is the §7.2.4 sentence, not §7.2.6.
--     · CR-002 (§5.2.3.2) and CR-016 (§7.2.5) are mis-anchored (CR-002 quotes a sentence truncated before the
--       formula and never quotes Tabelle 2's limits; CR-016's condition is presence-only while the printed hard
--       duty "Der gewählte Überschnitt muss begründet werden" has no field to hold the Begründung).
--   Additionally: 6 printed hard limits have a field but NO gate at all (Tab.3 Geradheit, §5.2.3.5 Sohlsprung,
--   Tab.4 Aussendurchmesser-Toleranz, Tab.5 Abwinklung, §7.1.3 geotechnische Kategorie 3, §5.3.6 Führungsring-
--   Aussendurchmesser). All listed in the STAGED file.
-- Invented values: NONE. Every number any field description or gate condition claims was grepped in the md and
--   found printed: 5/8/+25/−10 mm (Tab.1); 1,0/1,5/1,6/2,0/3,0/4,0/6,0/8,0/10,0 mm (Tab.2); 5/10/15 mm and
--   1,5 mm je m (Tab.3, §5.2.3.3); −8…−36 mm (Tab.4); 3 mm / 0,01 × DN / 30 mm (§5.2.3.5); 25/15/10/7/5 mm je m
--   (Tab.5); 20 N × DN und 6 mm (§5.3.3.3); 15 mm, t=b, 15+b/4, 2×b (Tab.6); 50 m, 2 m, 3 m (§7.1.3);
--   600/800/1000/1200/1800 mm MLM und 150/200/250 m (Tab.9); 200 × D_a, 8 × D_a (§7.1.6); Tab.10 values;
--   20 mm Überschnitt (§7.2.5); 100 mm / 90 s und D_a ≥ 1300 mm (§7.2.6). Unit mismatches: none that change a
--   value; two conventions are EKOWAI's and not printed (wichte_boden kN/m3, kohaesion kN/m2 — Tabelle 8 names
--   the quantities without units) and one is a genuine inconsistency (raeumliche_abwinklung is encoded in
--   "grad" while the guideline expresses Abwinklung in [mm] je [m] Baulänge, Tabelle 5) — STAGED S-9.
-- Worksheets with zero fields: none. 7 worksheets / 70 fields = 3 + 23 + 13 + 11 + 8 + 7 + 5.
-- Rollback: rollback-dwa-a-125-md-verification-pack.sql
-- Staged (NOT applied): dwa-a-125-STAGED-rulings.sql
-- ============================================================================


-- A125-01.anwendungsfall
update public.fields set verification_status='verified_against_standard', verification_quote='Dieses Arbeitsblatt behandelt den unterirdischen Einbau von vorgefertigten Rohren unterschiedlicher Querschnittsgeometrie, bei dem durch Verdrängen, Rammen, Bohren, Pressen oder sonstigen Abbau ein Hohlraum im Boden geschaffen wird, in den die Rohre eingezogen, eingeschoben oder eingepresst werden, oder bei dem bestehende Kanäle oder Rohrleitungen überfahren bzw. ausgewechselt werden. | Dieses Arbeitsblatt gilt nicht für mit dem Rohrvortrieb verwandte Verfahren, sofern die jeweiligen Anforderungen in eigenständigen DVGW- bzw. DWA-Arbeits- oder Merkblättern zusammengefasst sind. — printed p.11', verification_note='md-verified 2026-09-05 (§1, printed p.11) [VC]', verified_at=now() where id='2df84756-8098-4691-b6a9-1a08eada0e1e' and verification_status not in ('verified_against_standard','corrected');

-- A125-01.sondergelaende
update public.fields set verification_status='verified_against_standard', verification_quote='Diese Ausnahme gilt nicht unter Bahngeländen, Bundesfernstraßen oder Bundeswasserstraßen. | Bei Planung und Durchführung von Rohrvortrieben und verwandten Verfahren unter Bahngelände der Eisenbahnen des Bundes (EdB) müssen die Abschnitte 1 bis 7 beachtet werden. | Bei Planung und Durchführung von Rohrvortrieben und verwandten Verfahren unter Bundesfernstraßen müssen die Abschnitte 1 bis 7 beachtet werden. | Bei der Planung und Ausführung von Rohrvortrieben unter Bundeswasserstraßen müssen die Abschnitte 1 bis 7 und darüber hinaus bei Spülbohrverfahren die Technische Richtlinie des DCA beachtet werden. — printed p.11, p.56, p.60, p.63', verification_note='md-verified 2026-09-05 (§1 + §8.1 + §9.1 + §10.1, printed p.11, p.56, p.60, p.63) [VC]', verified_at=now() where id='32b0ecfc-305e-4631-b12d-7fbfd4dd5fc1' and verification_status not in ('verified_against_standard','corrected');

-- A125-01.rohrfunktion
update public.fields set verification_status='verified_against_standard', verification_quote='Die fertiggestellte Rohrstrecke dient entweder als Produktrohrleitung für Abwasser, Gas, Wasser etc. oder als Mantelrohr zur Aufnahme von Produktrohren, Kabeln, etc. | Bei Vortriebsrohren ist zu unterscheiden, ob es sich um Mantel- oder Produktrohre handelt. — printed p.18', verification_note='md-verified 2026-09-05 (§4 + §5.2.1, printed p.18) [VC]', verified_at=now() where id='aaeec037-6e07-4339-be65-88cb54baf1bc' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.rohrwerkstoff
update public.fields set verification_status='verified_against_standard', verification_quote='Als Werkstoffe kommen in Betracht: - Beton, Stahlbeton, Stahlfaserbeton, - GFK (UP-GF), - Gusseisen (duktil), - PE, PP, PVC-U, - Polymerbeton, - Stahl, - Steinzeug. — printed p.18', verification_note='md-verified 2026-09-05 (§5.2.1, printed p.18) [VC]', verified_at=now() where id='ec6705d4-16bb-4c02-9e0c-e23de4a1f72a' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.DN
update public.fields set verification_status='verified_against_standard', verification_quote='5.2.3 Allgemein verbindliche Maße und Toleranzen | Vortriebsrohre und Rohrverbindungen müssen (nach Möglichkeit auch innen) mindestens mit: [...] Nennweite, [...] gekennzeichnet werden. — printed p.19, p.28', verification_note='md-verified 2026-09-05 (§5.2.3 (Titel) + §5.9; DN is the keying dimension of Tab.1-5 and Tab.9/10 — printed p.19, p.28) [VC]', verified_at=now() where id='c45e5dd4-219d-4738-a605-18741446126a' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.D_a
update public.fields set verification_status='verified_against_standard', verification_quote='Mittlerer Außendurchmesser des Rohrschaftes an einem beliebigen Querschnitt (siehe DIN EN 14457 und DIN EN 476). | \hline $D_{\mathrm{a}}$ & maximaler Rohraußendurchmesser \\ | Der Hersteller von Vortriebsrohren muss Angaben machen über: [...] Rohraußendurchmesser (Maximalwert), — printed p.16, p.17, p.19', verification_note='md-verified 2026-09-05 (§3.1.4 + §3.2 + §5.2.2, printed p.16, p.17, p.19) [VC]', verified_at=now() where id='c50bc503-28dd-4717-be4a-170da654e050' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.baulaenge
update public.fields set verification_status='verified_against_standard', verification_quote='Länge des inneren Rohrschaftes (siehe DIN EN 14457). | Der Hersteller von Vortriebsrohren muss Angaben machen über: [...] Baulänge, — printed p.16, p.19', verification_note='md-verified 2026-09-05 (§3.1.5 + §5.2.2, printed p.16, p.19) [VC]', verified_at=now() where id='fddd0de1-e073-44e8-91a0-425cf27f014a' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.baulaengentoleranz
update public.fields set verification_status='verified_against_standard', verification_quote='Die Baulängentoleranzen laut Tabelle 1 dürfen nicht überschritten werden. Bei geschweißten Rohrverbindungen kann von dieser Anforderung abgewichen werden. | Tabelle 1: Baulängentoleranzen in [mm] | \hline DN & Baulängentoleranzen \\ \hline$\leq 800$ & $\pm 5$ \\ \hline$>800$ bis $\leq 1200$ & $\pm 8$ \\ \hline$>1200$ & +25 \\ & -10 \\ — printed p.19', verification_note='md-verified 2026-09-05 (§5.2.3.1 + Tabelle 1, printed p.19) [VC]', verified_at=now() where id='26de0ef3-473f-4984-a109-ec924c33cb12' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.a_max
update public.fields set verification_status='verified_against_standard', verification_quote='Die Rechtwinkligkeit der Stirnflächen wird gemäß Bild 1 an jedem Rohrende definiert als $\Delta a=a_{\max }-a_{\min }$. | Die Abweichung von der Rechtwinkligkeit ist definiert als Summe aus der Abweichung des gesamten Rohrendspiegels von der Rechtwinkligkeit und der Abweichung von der Rechtwinkligkeit innerhalb der Wanddicke $s$. — printed p.19, p.20', verification_note='md-verified 2026-09-05 (§5.2.3.2 (Bild 1), printed p.19, p.20) [VC]', verified_at=now() where id='fb8e0f88-f374-4615-96fd-fa880516eaba' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.a_min
update public.fields set verification_status='verified_against_standard', verification_quote='Die Rechtwinkligkeit der Stirnflächen wird gemäß Bild 1 an jedem Rohrende definiert als $\Delta a=a_{\max }-a_{\min }$. | Die Abweichung von der Rechtwinkligkeit ist definiert als Summe aus der Abweichung des gesamten Rohrendspiegels von der Rechtwinkligkeit und der Abweichung von der Rechtwinkligkeit innerhalb der Wanddicke $s$. — printed p.19, p.20', verification_note='md-verified 2026-09-05 (§5.2.3.2 (Bild 1), printed p.19, p.20) [VC]', verified_at=now() where id='0cff294d-b713-4e8a-bc57-d9141aeb80f4' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.delta_a
update public.fields set verification_status='verified_against_standard', verification_quote='Die Rechtwinkligkeit der Stirnflächen wird gemäß Bild 1 an jedem Rohrende definiert als $\Delta a=a_{\max }-a_{\min }$. | Die Rechtwinkligkeit ist von besonderer Bedeutung für die Übertragung der Vortriebskräfte und die Bemessung der Druckübertragungsringe und wird bei der Berechnung der Vortriebskräfte nach Arbeitsblatt ATV-A 161 bzw. DVGW GW 312 berücksichtigt. — printed p.19, p.20', verification_note='md-verified 2026-09-05 (§5.2.3.2, printed p.19, p.20) [VC]', verified_at=now() where id='209dd27a-8a0b-4f9d-bdcb-4b2aca1d7aff' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.rechtwinkligkeit_zul
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 2: Zulässige Abweichung von der Rechtwinkligkeit in [mm] | \hline DN & Beton, Stahlbeton, Stahlfaserbeton & Steinzeug & Stahl & Gusseisen (duktil) & GFK (UP-GF) & Polymerbeton & PE, PP, PVC-U \\ \hline $\leq 300$ & 4,0 & 1,0 & 1,6 & 1,0 & 1,0 & 1,0 & 1,0 \\ \hline $$ \begin{aligned} & >300 \\ & \leq 1000 \end{aligned} $$ & 6,0 & 1,0 & 1,6 & 2,0 & 1,0 & 1,5 & 2,0 \\ \hline $$ \begin{aligned} & >1000 \\ & \leq 2800 \end{aligned} $$ & 8,0 & 1,0 & 1,6 & 3,0 & 1,0 & 3,0 & - \\ \hline > 2800 & 10,0 & - & - & - & - & - & - \\ — printed p.20', verification_note='md-verified 2026-09-05 (§5.2.3.2, Tabelle 2, printed p.20) [VC]', verified_at=now() where id='2b1c78c5-a332-4d17-90a6-24a8fd815ef3' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.geradheitsabweichung_zul
update public.fields set verification_status='verified_against_standard', verification_quote='Unabhängig von der Baulänge des Vortriebsrohres darf die Mantellinie von der Geraden maximal um den Wert gemäß Tabelle 3 abweichen. [...] Für Stahlvortriebsrohre dürfen $1,5 \mathrm{~mm}$ je Meter Baulänge nicht überschritten werden. | Tabelle 3: Zulässige Abweichung von der Geraden in [mm] | \hline DN & Abweichung von der Geraden \\ \hline$\leq$ DN 1000 & 5 \\ \hline$>$ DN 1000 bis $\leq$ DN 2000 & 10 \\ \hline$>$ DN 2000 & 15 \\ — printed p.20', verification_note='md-verified 2026-09-05 (§5.2.3.3 + Tabelle 3, printed p.20) [VC]', verified_at=now() where id='b2ef3541-b497-4b28-8ee7-8e5621862911' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.aussendurchmesser_toleranz
update public.fields set verification_status='verified_against_standard', verification_quote='Die zulässigen Toleranzen für den maximalen Rohraußendurchmesser sind in Tabelle 4 zusammengestellt. | Tabelle 4: Zulässige Abweichung vom maximalen Rohraußendurchmesser in [mm] | \hline DN & alle Werkstoffe ${ }^{1)}$ außer Beton, Stahlbeton, Stahlfaserbeton und Steinzeug & Beton Stahlbeton Stahlfaserbeton & Steinzeug \\ | 1) Für Stahlrohre gelten außerdem DIN 2460, DIN EN 10208-1, DIN EN 10208-2, DIN EN 10216-1, DIN EN 10217-1 und DIN EN 10224. Die Schichtdicken von Umhüllungen und Ummantelungen müssen zusätzlich beachtet werden. — printed p.20, p.21', verification_note='md-verified 2026-09-05 (§5.2.3.4 + Tabelle 4, printed p.20, p.21) [VC]', verified_at=now() where id='c90709eb-5941-422c-888e-0c039248c9b3' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.sohlsprung
update public.fields set verification_status='verified_against_standard', verification_quote='Die zulässige Abweichung von der Sohlengleichheit (Sohlsprung) ist begrenzt auf - 3 mm für Vortriebsrohre $\leq$ DN 300 und - $0,01 \times$ DN für größere Vortriebsrohre, - höchstens jedoch 30 mm . — printed p.21', verification_note='md-verified 2026-09-05 (§5.2.3.5, printed p.21) [VC]', verified_at=now() where id='8cb5f6be-fbcc-41aa-b73d-0b7714010629' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.max_abwinklung
update public.fields set verification_status='verified_against_standard', verification_quote='Steckverbindungen müssen bei Belastung gemäß Abschnitt 5.3.3.1 bei der maximal zulässigen Abwinklung max a nach Tabelle 5 unter Berücksichtigung der zulässigen Toleranzen nach Tabelle 2 dicht sein. | Tabelle 5: Abwinklung in [mm] je [m] Baulänge | \hline$\leq 200$ & 25 \\ \hline$>200$ bis $\leq 500$ & 15 \\ \hline$>500$ bis $\leq 2000$ & 10 \\ \hline$>2000$ bis $\leq 2800$ & 7 \\ \hline$>2800$ & 5 \\ — printed p.22', verification_note='md-verified 2026-09-05 (§5.3.3.2 + Tabelle 5, printed p.22) [VC]', verified_at=now() where id='9cbad52c-c446-469c-9cf8-853467e604b1' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.scherlast_nachweis
update public.fields set verification_status='verified_against_standard', verification_quote='Die Verbindungen müssen dicht bleiben unter Belastungen nach Abschnitt 5.3.3.1 bei Aufbringung einer Scherlast von mindestens $20 \mathrm{~N} \times \mathrm{DN}$, wobei der sich dabei einstellende Scherweg auf 6 mm begrenzt werden darf. Der Nachweis muss nach DIN EN 14457 geführt werden. — printed p.23', verification_note='md-verified 2026-09-05 (§5.3.3.3, printed p.23) [VC]', verified_at=now() where id='b69bce78-64c3-4af7-905d-8e7bca629488' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.dichtheit_betrieb
update public.fields set verification_status='verified_against_standard', verification_quote='Die Verbindungen von Abwasserrohren müssen im Betriebs- und Bauzustand dicht sein. | Im Betriebszustand gilt: | Die Beurteilung der Dichtheit gegen inneren und äußeren Wasserdruck erfolgt nach den Anforderungen und Prüfverfahren von DIN EN 12889 (Freispiegelleitungen nach DIN EN 1610 in Verbindung mit Arbeitsblatt ATV-DVWK-A 139, Abwasserdruckleitungen in Analogie zur DIN EN 805). — printed p.22', verification_note='md-verified 2026-09-05 (§5.3.3.1, printed p.22) [VC]', verified_at=now() where id='27e0ddb3-059f-430c-9d6e-6b69dac24b8a' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.dichtheit_bau
update public.fields set verification_status='verified_against_standard', verification_quote='Im Bauzustand gilt: | Die Dichtheit muss auch bei innerem Luftüberdruck entsprechend den Erfordernissen, z. B. beim Vortrieb unter Druckluft, sichergestellt sein. | Infolge von Außendruck durch Gleit- und Stützmittel darf die Lage der Dichtung nicht verändert und die Dichtfunktion nicht beeinträchtigt werden. Die Höhe des zulässigen Außendruckes muss mit dem Rohrhersteller abgestimmt werden. — printed p.22', verification_note='md-verified 2026-09-05 (§5.3.3.1, printed p.22) [VC]', verified_at=now() where id='c0e19eda-5208-479d-b31d-92ca8a959942' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.druckuebertragungsring_breite
update public.fields set verification_status='verified_against_standard', verification_quote='Die Breite des Druckübertragungsringes muss auch im belasteten Zustand kleiner sein als die geringste Rohrwanddicke. | Dicke und Breite des Druckübertragungsringes gehen in die Bemessung nach Arbeitsblatt DWAA 161 bzw. GW 312 (beide in Vorbereitung) ein. — printed p.23', verification_note='md-verified 2026-09-05 (§5.3.4, printed p.23) [VC]', verified_at=now() where id='caebd763-90b9-4026-9b8e-74e68fb8ec71' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.rohrwanddicke
update public.fields set verification_status='verified_against_standard', verification_quote='Die Breite des Druckübertragungsringes muss auch im belasteten Zustand kleiner sein als die geringste Rohrwanddicke. | Die Abweichung von der Rechtwinkligkeit ist definiert als Summe aus der Abweichung des gesamten Rohrendspiegels von der Rechtwinkligkeit und der Abweichung von der Rechtwinkligkeit innerhalb der Wanddicke $s$. — printed p.19, p.23', verification_note='md-verified 2026-09-05 (§5.3.4 (Grenze) + §5.2.3.2 (Definition Wanddicke s), printed p.19, p.23) [VC]', verified_at=now() where id='beb320a3-c2b2-4d60-b500-a4e867814412' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.fuehrungsring_werkstoff
update public.fields set verification_status='verified_against_standard', verification_quote='Die Führungsringe der Vortriebsrohre müssen aus einem der folgenden Werkstoffe oder Werkstoffkombinationen bestehen: - Rohrwerkstoff (genormt oder zugelassen für das zu transportierende Medium: Gas, Wasser, Abwasser), - nichtrostender Stahl nach DIN EN 10088-1, - Stahl mit Überzug (z. B. gummiert), - Baustahl nach DIN EN 10025-1 bis -6, ggf. mit Abrostungszuschlag [...] | Führungsringe aus Stahl mit galvanischem Oberflächenschutz oder mit polymeren Beschichtungen dürfen nicht verwendet werden. — printed p.26', verification_note='md-verified 2026-09-05 (§5.3.7, printed p.26) [VC]', verified_at=now() where id='525e7c5e-1ce1-42cd-863c-40cbffcd6a77' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.aeussere_dichtung_werkstoff
update public.fields set verification_status='verified_against_standard', verification_quote='Die äußere Dichtung muss die Anforderungen nach DIN EN 681-1 erfüllen. Die innere Dichtung (soweit aus Elastomeren bestehend) muss die Anforderungen nach DIN EN 681-1 bzw. nach DIN EN 681-3 erfüllen. | Eine innere Dichtung aus ZweikomponentenDichtstoffen muss die Anforderung der Zulassungsgrundsätze des Deutschen Instituts für Bautechnik (DIBt) erfüllen. — printed p.26', verification_note='md-verified 2026-09-05 (§5.3.8, printed p.26) [VC]', verified_at=now() where id='4a7b22a6-653b-483a-80cf-76474794dcf2' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.innere_fugenbreite_b
update public.fields set verification_status='verified_against_standard', verification_quote='Bei der Herstellung eines inneren Fugenverschlusses müssen die Angaben in Tabelle 6 beachtet werden. | Tabelle 6: Innere Dichtung für Vortriebsrohre | \hline Endgültige Fugenbreite $b$ & \multicolumn{3}{|c|}{$\min 15 \mathrm{~mm}$} \\ — printed p.24, p.26', verification_note='md-verified 2026-09-05 (§5.3.6 + Tabelle 6, printed p.24, p.26) [VC]', verified_at=now() where id='c80e049a-4519-4bf2-aa78-c54f92ffaccf' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.innere_fugentiefe_t
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 6: Innere Dichtung für Vortriebsrohre | \hline \multirow{2}{*}{Endgültige Fugentiefe $t$ je Dichtmittellage} & \multicolumn{2}{|c|}{einlagig oder zweilagig ${ }^{1)}$} & \multirow{2}{*}{$t \geq 2 \times b$} \\ \hline & $$ \begin{gathered} \text { bei } \\ b \leq 20 \mathrm{~mm} \\ t=b \end{gathered} $$ & $$ \begin{gathered} \text { bei } \\ b>20 \mathrm{~mm} \\ t \geq 15+\frac{b}{4} \end{gathered} $$ & \\ — printed p.26', verification_note='md-verified 2026-09-05 (§5.3.6 + Tabelle 6, printed p.26) [VC]', verified_at=now() where id='5f882c13-0280-45e4-bae4-b1fad3836689' and verification_status not in ('verified_against_standard','corrected');

-- A125-02.zwischenpressstation
update public.fields set verification_status='verified_against_standard', verification_quote='Zwischenpressstationen werden in den Rohrstrang integriert, wenn die Vortriebskraft die Kapazität der Hauptpressstation, die zulässige Vorpresskraft der Vortriebsrohre oder des Widerlagers im Startschacht überschreiten könnte. — printed p.27', verification_note='md-verified 2026-09-05 (§5.4.4, printed p.27) [VC]', verified_at=now() where id='9421dafd-67a8-44f1-ae6f-3517d7998c72' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.aufschluss_abstand
update public.fields set verification_status='verified_against_standard', verification_quote='Die Aufschlüsse sollten in einem Abstand von max. 50 m in der Vortriebstrasse ausgeführt werden. In Sonderfällen müssen die Abstände verringert werden. — printed p.45', verification_note='md-verified 2026-09-05 (§7.1.3, printed p.45 — SOLL-Anforderung ("sollten"), siehe STAGED S-6) [VC]', verified_at=now() where id='bee5afbc-16a7-4ea3-b74b-13f4db8f37bf' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.aufschlusstiefe_unter_sohle
update public.fields set verification_status='verified_against_standard', verification_quote='Die Aufschlüsse müssen mindestens: - bis 2 m unter Rohrsohle in grundwasserfreien Böden, - bis 3 m unter Rohrsohle in grundwasserführenden Böden, | bis zur geplanten Unterkante des Verbaus im Bereich der Start-, Zwischen- und Zielgruben und sollten bei nicht ausreichend tragfähigem Baugrund bis in den tragfähigen Baugrund geführt werden. — printed p.45, p.46', verification_note='md-verified 2026-09-05 (§7.1.3, printed p.45, p.46) [VC]', verified_at=now() where id='661766bc-c034-4610-afd0-a11029fa3934' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.bestandsaufnahme_vorhanden
update public.fields set verification_status='verified_against_standard', verification_quote='Es müssen Angaben eingeholt werden über Vorhandensein, Lage, Zustand, Belastbarkeit und Schutzbedürftigkeit von z. B.: - Kabeln, - Rohrleitungen, - Kanälen, - Schächten, - Brunnen, - Fundamenten, [...] - Kriegs- und Kampfmitteln, - Altlasten | In Zweifelsfällen muss die genaue Lage durch Schürfe oder Suchschlitze oder andere geeignete Maßnahmen festgestellt werden. — printed p.44', verification_note='md-verified 2026-09-05 (§7.1.2, printed p.44) [VC]', verified_at=now() where id='f3990e97-ee94-4772-b4db-a485eed3ae23' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.geotechnische_kategorie
update public.fields set verification_status='verified_against_standard', verification_quote='Die Baugrundverhältnisse müssen gemäß DIN 4020 erkundet und dokumentiert und nach DIN 18319 eingestuft werden. Rohrvortriebe sind als Hohlraumbaumaßnahmen der geotechnischen Kategorie 3 gemäß DIN 4020 zugeordnet. Verwandte Verfahren (siehe Bild 6) müssen einer geotechnischen Kategorie gemäß DIN 4020 in Abhängigkeit der Randbedingungen zugeordnet werden. — printed p.44', verification_note='md-verified 2026-09-05 (§7.1.3, printed p.44) [VC]', verified_at=now() where id='0a80dca3-9746-4580-ab24-12994be98531' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.gebirgsart
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 8: Beschreibung der Baugrund- und Grundwasserverhältnisse | \hline \multicolumn{2}{|c|}{Lockergestein und Festgestein} \\ | \hline Lockergestein & Festgestein \\ | Für Rohre, die im Festgestein oder im Übergangsbereich Festgestein/Lockergestein vorgetrieben werden, sind im Einzelfall unter Berücksichtigung der Eigenschaften des Gebirges und der Vortriebstechnik ingenieurmäßige Überlegungen und Berechnungen erforderlich. — printed p.45, p.50', verification_note='md-verified 2026-09-05 (§7.1.3 (Tabelle 8) + §7.1.13, printed p.45, p.50) [VC]', verified_at=now() where id='58ace4a6-c95c-4273-a987-0254b3b14bbd' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.grundwasserstand_max
update public.fields set verification_status='verified_against_standard', verification_quote='Nach den Erfordernissen des Einzelfalles müssen Angaben gemäß Tabelle 8 gemacht werden. | Tabelle 8: Beschreibung der Baugrund- und Grundwasserverhältnisse | \hline \multicolumn{2}{|l|}{Maximaler und minimaler Grundwasserstand, Ganglinien} \\ — printed p.44, p.45', verification_note='md-verified 2026-09-05 (§7.1.3, Tabelle 8, printed p.44, p.45) [VC]', verified_at=now() where id='c0dfe7b0-604b-4c05-b51d-d8b8f4bc2fb0' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.grundwasserstand_min
update public.fields set verification_status='verified_against_standard', verification_quote='Nach den Erfordernissen des Einzelfalles müssen Angaben gemäß Tabelle 8 gemacht werden. | Tabelle 8: Beschreibung der Baugrund- und Grundwasserverhältnisse | \hline \multicolumn{2}{|l|}{Maximaler und minimaler Grundwasserstand, Ganglinien} \\ — printed p.44, p.45', verification_note='md-verified 2026-09-05 (§7.1.3, Tabelle 8, printed p.44, p.45) [VC]', verified_at=now() where id='dcd7a30a-b703-4fc7-ab5e-31411b52322d' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.wasserdurchlaessigkeit
update public.fields set verification_status='verified_against_standard', verification_quote='Nach den Erfordernissen des Einzelfalles müssen Angaben gemäß Tabelle 8 gemacht werden. | Tabelle 8: Beschreibung der Baugrund- und Grundwasserverhältnisse | \hline Wasserdurchlässigkeitsbeiwert & Trennflächengefüge und Schichtstärke von Gesteinsplatten, Kluftkörper (RQD) und räumliche Orientierung \\ — printed p.44, p.45', verification_note='md-verified 2026-09-05 (§7.1.3, Tabelle 8 (Spalte Lockergestein), printed p.44, p.45) [VC]', verified_at=now() where id='1ff4c7a1-47af-46ea-b557-5baba5e71946' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.wichte_boden
update public.fields set verification_status='verified_against_standard', verification_quote='Nach den Erfordernissen des Einzelfalles müssen Angaben gemäß Tabelle 8 gemacht werden. | Tabelle 8: Beschreibung der Baugrund- und Grundwasserverhältnisse | \hline \multicolumn{2}{|l|}{Wichte} \\ — printed p.44, p.45', verification_note='md-verified 2026-09-05 (§7.1.3, Tabelle 8, printed p.44, p.45 — Einheit kN/m3 ist EKOWAI-Konvention, die Tabelle nennt nur "Wichte") [VC]', verified_at=now() where id='47d0213a-d903-487d-982e-5c8f1d4a887d' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.reibungswinkel
update public.fields set verification_status='verified_against_standard', verification_quote='Nach den Erfordernissen des Einzelfalles müssen Angaben gemäß Tabelle 8 gemacht werden. | Tabelle 8: Beschreibung der Baugrund- und Grundwasserverhältnisse | \hline Scherparameter, Reibungswinkel und Kohäsion & Spaltzugfestigkeit \\ — printed p.44, p.45', verification_note='md-verified 2026-09-05 (§7.1.3, Tabelle 8 (Spalte Lockergestein), printed p.44, p.45) [VC]', verified_at=now() where id='c75fe1df-29c0-4a49-8da6-210d52303b02' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.kohaesion
update public.fields set verification_status='verified_against_standard', verification_quote='Nach den Erfordernissen des Einzelfalles müssen Angaben gemäß Tabelle 8 gemacht werden. | Tabelle 8: Beschreibung der Baugrund- und Grundwasserverhältnisse | \hline Scherparameter, Reibungswinkel und Kohäsion & Spaltzugfestigkeit \\ — printed p.44, p.45', verification_note='md-verified 2026-09-05 (§7.1.3, Tabelle 8 (Spalte Lockergestein), printed p.44, p.45) [VC]', verified_at=now() where id='e7228ec4-9ed7-4eb1-a145-38d9c15968fb' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.abrasivitaet_cai
update public.fields set verification_status='verified_against_standard', verification_quote='CERCHAR Abrasiveness Index: Durch Laborverfahren ermittelte Gesteinsabrasivität, gemäß: The Cerchar Abrasivity Index - Plan; Centre d''Etudes et Recherches de Charbonnages de France; Verneuil, 1986. | \hline Erddruckbeiwert & Abrasivität (Cerchar Abrasiveness Index) \\ — printed p.16, p.45', verification_note='md-verified 2026-09-05 (§3.1.6 + §7.1.3 Tabelle 8 (Spalte Festgestein), printed p.16, p.45) [VC]', verified_at=now() where id='3d7f3b60-bafd-4673-b094-4cafe5f30265' and verification_status not in ('verified_against_standard','corrected');

-- A125-03.rqd_index
update public.fields set verification_status='verified_against_standard', verification_quote='Rock Quality Designation: Charakteristikum zur Beschreibung von Fels, schließt von der Länge der genommenen Bohrkerne auf die vorhandene Gebirgsqualität (gemäß: ASTM D6032-02). | \hline Wasserdurchlässigkeitsbeiwert & Trennflächengefüge und Schichtstärke von Gesteinsplatten, Kluftkörper (RQD) und räumliche Orientierung \\ — printed p.16, p.45', verification_note='md-verified 2026-09-05 (§3.1.15 + §7.1.3 Tabelle 8 (Spalte Festgestein), printed p.16, p.45) [VC]', verified_at=now() where id='98f1ccd3-f4d6-4ec0-b5b8-7ded4dc3975e' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.vortriebslaenge
update public.fields set verification_status='verified_against_standard', verification_quote='Wird Personal bei Rohrvortrieben im Rohrstrang oder in der Vortriebsmaschine eingesetzt, müssen in Abhängigkeit von der Vortriebslänge Mindestlichtmaße innerhalb des vorzupressenden Rohrstrangs eingehalten werden. — printed p.46', verification_note='md-verified 2026-09-05 (§7.1.4, printed p.46) [VC]', verified_at=now() where id='6cdd05d8-58cf-4d28-a921-efbfe2b631f2' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.personaleinsatz
update public.fields set verification_status='verified_against_standard', verification_quote='Dabei wird zwischen ständigem Personaleinsatz bei bemannten Verfahren (vgl. Abschnitt 6.2.1) und vorübergehendem Personaleinsatz bei unbemannten Verfahren (vgl. Abschnitt 6.1.1) unterschieden. Die Einsatzbereiche sind in Bild 21 und Tabelle 9 dargestellt. — printed p.46', verification_note='md-verified 2026-09-05 (§7.1.4, printed p.46) [VC]', verified_at=now() where id='0c884564-deb4-4194-a3cb-558f672fc528' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.mindestlichtmass
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 9: Vorübergehender Personaleinsatz bei unbemannten Verfahren | \hline MLM [mm] & i. d. R. DN [mm] & Personaleinsatz \\ \hline < 600 & < 800 & nicht zulässig \\ \hline $\geq 600$ bis < 800 & $\geq 800$ bis < 1000 & \begin{tabular}{l} zulässig bei Vortriebslängen $\leq 150 \mathrm{~m}$ unter Berücksichtigung des Abschnittes IX der UVV „Bauarbeiten" (BGV C22) \\ — printed p.47', verification_note='md-verified 2026-09-05 (§7.1.4, Tabelle 9, printed p.47) [VC]', verified_at=now() where id='77deb7b5-d068-4e7a-acff-09e33dd316e9' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.mlm_vortriebslaenge_zul
update public.fields set verification_status='verified_against_standard', verification_quote='Wird Personal bei Rohrvortrieben im Rohrstrang oder in der Vortriebsmaschine eingesetzt, müssen in Abhängigkeit von der Vortriebslänge Mindestlichtmaße innerhalb des vorzupressenden Rohrstrangs eingehalten werden. | \hline 800 bis < 1000 & $\geq 1000$ bis < 1200 & \begin{tabular}{l} zulässig bei Vortriebslängen $\leq 200 \mathrm{~m}$ unter Berücksichtigung des Abschnittes IX der UVV „Bauarbeiten" (BGV C22) \\ | \hline $\geq 1000$ bis <1 200 & $\geq 1200$ bis < 1400 & \begin{tabular}{l} zulässig bei Vortriebslängen $\leq 250 \mathrm{~m}$ \\ — printed p.46, p.47', verification_note='md-verified 2026-09-05 (§7.1.4, Tabelle 9, printed p.46, p.47) [VC]', verified_at=now() where id='acf7d470-8767-4ee0-9a15-c72d278155bd' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.mindestueberdeckung
update public.fields set verification_status='verified_against_standard', verification_quote='Die empfohlenen Mindestüberdeckungen für nichtsteuerbare Verfahren sind in Tabelle 7 und für steuerbare Verfahren in Anhang B zusammengestellt. Angaben für das HDD-Verfahren können der Technischen Richtlinie des DCA entnommen werden. — printed p.47', verification_note='md-verified 2026-09-05 (§7.1.5, printed p.47 — CAVEAT: Anhang B (printed p.73) liegt im Transkript nur als mathpix-Bild vor; die dortigen Erfahrungswerte für steuerbare Verfahren sind aus dem md NICHT lesbar (NR für diese Hälfte). Tabelle 7 (p.32) ist lesbar) [VC]', verified_at=now() where id='b298b567-229f-42ab-866f-db0857c857d3' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.R_min
update public.fields set verification_status='verified_against_standard', verification_quote='Bei Rohrvortrieben in gekrümmter Trasse müssen in Abhängigkeit von der Baulänge, der Fügekonstruktion und dem Außendurchmesser der Rohre Mindestradien eingehalten werden. Als eine erste grobe Abschätzung kann bei $3,00 \mathrm{~m}$ langen Vortriebsrohren für die Höhe und Seite von einem zulässigen Mindestradius von $R_{\text {min }} \geq 200 \times D_{\mathrm{a}}$ ausgegangen werden. — printed p.48', verification_note='md-verified 2026-09-05 (§7.1.6, printed p.48) [VC]', verified_at=now() where id='573f465d-8694-4fcc-b0ff-564ac224176a' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.startgrube_bogenabstand
update public.fields set verification_status='verified_against_standard', verification_quote='Der Abstand zwischen Startgrube und Bogenanfang sollte mindestens $8 \times D_{\mathrm{a}}$ betragen. Dieser gerade Abschnitt sollte auch bei wechselnden Radien sowie zwischen Kurve und Gegenkurve eingehalten werden. — printed p.48', verification_note='md-verified 2026-09-05 (§7.1.6, printed p.48) [VC]', verified_at=now() where id='df49f903-ec77-45c0-b4d8-5845e8c5c960' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.abweichung_vertikal_zul
update public.fields set verification_status='verified_against_standard', verification_quote='Die in Tabelle 10 aufgeführten Werte der maximalen Abweichungen von der Soll-Lage gelten aus betrieblichen Gründen und sollten nicht überschritten werden. Für die Funktionsfähigkeit sollte eine Gefällereserve eingeplant werden. | Tabelle 10: Maximale Abweichung in [mm] von der Soll-Lage für Abwasserleitungen und -kanäle | \hline DN & vertikal & horizontal \\ \hline$<600$ & $\pm 20$ & $\pm 25$ \\ \hline$\geq 600$ bis $\leq 1000$ & $\pm 25$ & $\pm 40$ \\ \hline$>1000$ bis $<1400$ & $\pm 30$ & $\pm 100$ \\ \hline$\geq 1400$ & $\pm 50$ & $\pm 200$ \\ — printed p.48', verification_note='md-verified 2026-09-05 (§7.1.7 + Tabelle 10, printed p.48) [VC]', verified_at=now() where id='9cb0f9c9-31ce-4a18-8073-33ac0dce1559' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.abweichung_horizontal_zul
update public.fields set verification_status='verified_against_standard', verification_quote='Die in Tabelle 10 aufgeführten Werte der maximalen Abweichungen von der Soll-Lage gelten aus betrieblichen Gründen und sollten nicht überschritten werden. Für die Funktionsfähigkeit sollte eine Gefällereserve eingeplant werden. | Tabelle 10: Maximale Abweichung in [mm] von der Soll-Lage für Abwasserleitungen und -kanäle | \hline DN & vertikal & horizontal \\ \hline$<600$ & $\pm 20$ & $\pm 25$ \\ \hline$\geq 600$ bis $\leq 1000$ & $\pm 25$ & $\pm 40$ \\ \hline$>1000$ bis $<1400$ & $\pm 30$ & $\pm 100$ \\ \hline$\geq 1400$ & $\pm 50$ & $\pm 200$ \\ — printed p.48', verification_note='md-verified 2026-09-05 (§7.1.7 + Tabelle 10, printed p.48) [VC]', verified_at=now() where id='e095085f-cc80-47b8-8430-57338281e6b9' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.startgrube_abmessung
update public.fields set verification_status='verified_against_standard', verification_quote='Aus den Abmessungen der Vortriebsmaschine und der Vortriebsrohre ergeben sich die Baugrubengrößen (Lichtmaße, siehe Beispiele in Tabelle 11). | Tabelle 11: Beispiele für Baugrubengrößen | \hline 200-300 & bis 406 & $1,0 \mathrm{~m}$ & $2,0 \mathrm{~m}$ Durchmesser bzw. $2,5 \mathrm{~m} \times 2,0 \mathrm{~m}$ & $2,0 \mathrm{~m}$ Durchmesser bzw. $2,0 \mathrm{~m} \times 2,0 \mathrm{~m}$ \\ | Unter anderem bei Doppelstart- und -zielgruben, bei Ausfahrbrillen mit Not- und Reservedichtungen, bei Rohrbremsen sowie bei abweichenden Baulängen der Vortriebsrohre müssen ggf. Zuschläge für die Baugrubengröße vorgenommen werden. — printed p.48, p.49', verification_note='md-verified 2026-09-05 (§7.1.8 + Tabelle 11, printed p.48, p.49) [VC]', verified_at=now() where id='2128d273-bb50-4a09-8fb2-348db2ad27b2' and verification_status not in ('verified_against_standard','corrected');

-- A125-04.zielgrube_abmessung
update public.fields set verification_status='verified_against_standard', verification_quote='Die Zielgrube dient der Bergung der Vortriebsmaschine sowie bei Pilotrohrvortriebsverfahren zur Bergung der Pilotgestänge und der wiedergewinnbaren Rohre. Zur sicheren Maschinenbergung muss die Einfahrwand gegen den Anpressdruck der Vortriebsmaschine gesichert werden. | Aus den Abmessungen der Vortriebsmaschine und der Vortriebsrohre ergeben sich die Baugrubengrößen (Lichtmaße, siehe Beispiele in Tabelle 11). — printed p.48, p.49', verification_note='md-verified 2026-09-05 (§7.1.8 + Tabelle 11, printed p.48, p.49) [VC]', verified_at=now() where id='e2c2d172-017d-4a5f-a5ef-b2bc8b302ec4' and verification_status not in ('verified_against_standard','corrected');

-- A125-05.stuetzfluessigkeit_druck
update public.fields set verification_status='verified_against_standard', verification_quote='Bei flüssigkeitsgestützter Ortsbrust müssen der Druck und die rheologischen Eigenschaften der Stützflüssigkeit (i. d. R. Viskosität, Dichte, Fließgrenze und Filtratwasserabgabe) auf die Höhe des Grundwasserstandes, die Eigenschaften des anstehenden Bodens, die Erdüberdeckung und sonstige bauliche Gegebenheiten abgestimmt werden. — printed p.54', verification_note='md-verified 2026-09-05 (§7.2.7, printed p.54) [VC]', verified_at=now() where id='a6726e5a-013c-46ce-93a4-f45a8e099fe0' and verification_status not in ('verified_against_standard','corrected');

-- A125-05.ortsbrust_standsicherheit
update public.fields set verification_status='verified_against_standard', verification_quote='Die Standsicherheit der Ortsbrust muss entsprechend dem gewählten Verfahren nachgewiesen werden. | Bei nicht oder nur vorübergehend standfester Ortsbrust muss ständig eine teilweise oder vollflächige Stützung sichergestellt sein. — printed p.54', verification_note='md-verified 2026-09-05 (§7.2.7, printed p.54) [VC]', verified_at=now() where id='9022e737-7d2f-4f85-a23d-7fd5ed6555fb' and verification_status not in ('verified_against_standard','corrected');

-- A125-05.ortsbruststuetzung_prinzip
update public.fields set verification_status='verified_against_standard', verification_quote='Bei nicht oder nur vorübergehend standfester Ortsbrust muss ständig eine teilweise oder vollflächige Stützung sichergestellt sein. Diese kann nach dem Prinzip der natürlichen Stützung (natürlicher Böschungswinkel), der mechanischen Stützung, der Flüssigkeits- oder der Erddruckstützung erfolgen. Bei Vortrieben unter Druckluft darf diese nicht zur Aufnahme des Erddrucks angesetzt werden. — printed p.49', verification_note='md-verified 2026-09-05 (§7.1.9, printed p.49) [VC]', verified_at=now() where id='78daa693-6126-4611-a692-30d2dff0c0ae' and verification_status not in ('verified_against_standard','corrected');

-- A125-05.vortriebskraft_nachweis
update public.fields set verification_status='verified_against_standard', verification_quote='Vor Beginn der Bauausführung muss die Tragfähigkeit der Rohrleitung unter Einbeziehung der Vortriebskräfte nachgewiesen sein. Die statische Berechnung der im Lockergestein im Vortriebsverfahren einzubauenden Rohre erfolgt nach Arbeitsblatt ATV-A 161/DVGW GW 312. Neuere Erkenntnisse müssen ggf. berücksichtigt werden. — printed p.53', verification_note='md-verified 2026-09-05 (§7.2.4, printed p.53) [VC]', verified_at=now() where id='5275cc82-26ed-492d-b239-30e4a360816c' and verification_status not in ('verified_against_standard','corrected');

-- A125-05.zul_vorpresskraft
update public.fields set verification_status='verified_against_standard', verification_quote='Die zulässige Vorpresskraft muss in Abhängigkeit von der räumlichen Abwinklung der Rohrverbindungen angegeben werden. | Bei Abweichungen von der geplanten Vortriebstrasse muss die zulässige Vorpresskraft der Vortriebsrohre überprüft und ggf. herabgesetzt werden. — printed p.51, p.53', verification_note='md-verified 2026-09-05 (§7.2.4 + §7.2.1, printed p.51, p.53) [VC]', verified_at=now() where id='43ece15f-8b55-4262-a66a-f292d31d468f' and verification_status not in ('verified_against_standard','corrected');

-- A125-05.baugrube_standsicherheit
update public.fields set verification_status='verified_against_standard', verification_quote='Für Baugruben müssen Standsicherheits- und Gebrauchstauglichkeitsnachweise geführt werden. Ferner müssen Nachweise gegen hydraulischen Grundbruch während der Baugrubenherstellung vor dem Einbringen einer grundwassersperrenden Baugrubensohle sowie der Auftriebssicherheit nach Einbau der grundwassersperrenden Baugrubensohle geführt werden. — printed p.53', verification_note='md-verified 2026-09-05 (§7.2.4, printed p.53) [VC]', verified_at=now() where id='366c2ff7-bab3-4db1-b5e8-5c7562221a75' and verification_status not in ('verified_against_standard','corrected');

-- A125-05.widerlager_bemessung
update public.fields set verification_status='verified_against_standard', verification_quote='Widerlager zur Aufnahme und Übertragung der Vortriebskräfte müssen bemessen werden. Hierbei müssen neben den zulässigen Spannungen in allen belasteten Teilen auch die zulässigen Verformungen, die gefahrlos vom umgebenden Boden und von der Presseinrichtung aufgenommen werden können, berücksichtigt werden. — printed p.53', verification_note='md-verified 2026-09-05 (§7.2.4, printed p.53) [VC]', verified_at=now() where id='e17ef40f-7d9a-40c4-ba0a-e4b34525c1c0' and verification_status not in ('verified_against_standard','corrected');

-- A125-05.ueberschnitt
update public.fields set verification_status='verified_against_standard', verification_quote='Der Überschnitt (siehe Abschnitt 3.1.19) kann je nach Bodenart und Nennweite, insbesondere bei Kurvenfahrten, bis 20 mm betragen, in Sonderfällen (z. B. Fels, Quellton) auch mehr. Der gewählte Überschnitt muss begründet werden. | Die Hälfte der Differenz von Bohrlochdurchmesser und Rohraußendurchmesser (im Idealfall ein gleichmäßiger Ringspalt um die Rohrleitung). — printed p.17, p.53', verification_note='md-verified 2026-09-05 (§7.2.5 + §3.1.19, printed p.17, p.53) [VC]', verified_at=now() where id='db7d3e15-cc01-4fec-91ef-f90c16ebd656' and verification_status not in ('verified_against_standard','corrected');

-- A125-06.verfahren_steuerbar
update public.fields set verification_status='verified_against_standard', verification_quote='Bei nicht steuerbaren Verfahren muss in festzulegenden Abständen die Lage des Rohrstranges gemessen und protokolliert werden. | Bei steuerbaren Verfahren müssen nachfolgend genannte Vortriebsparameter kontinuierlich gemessen und in Vortriebsintervallen von max. 100 mm Länge oder max. 90 s Dauer automatisch aufgezeichnet werden: — printed p.53', verification_note='md-verified 2026-09-05 (§7.2.6, printed p.53) [VC]', verified_at=now() where id='e3bb9c0d-5c0d-4eff-bc72-eb004ad3f24a' and verification_status not in ('verified_against_standard','corrected');

-- A125-06.aufzeichnungsintervall_laenge
update public.fields set verification_status='verified_against_standard', verification_quote='Bei steuerbaren Verfahren müssen nachfolgend genannte Vortriebsparameter kontinuierlich gemessen und in Vortriebsintervallen von max. 100 mm Länge oder max. 90 s Dauer automatisch aufgezeichnet werden: — printed p.53', verification_note='md-verified 2026-09-05 (§7.2.6, printed p.53 — das Regelwerk verknüpft die beiden Intervallkriterien mit ODER, siehe STAGED S-7) [VC]', verified_at=now() where id='d7fd1152-657d-4ed7-b9e5-082c339df9ea' and verification_status not in ('verified_against_standard','corrected');

-- A125-06.aufzeichnungsintervall_zeit
update public.fields set verification_status='verified_against_standard', verification_quote='Bei steuerbaren Verfahren müssen nachfolgend genannte Vortriebsparameter kontinuierlich gemessen und in Vortriebsintervallen von max. 100 mm Länge oder max. 90 s Dauer automatisch aufgezeichnet werden: — printed p.53', verification_note='md-verified 2026-09-05 (§7.2.6, printed p.53 — das Regelwerk verknüpft die beiden Intervallkriterien mit ODER, siehe STAGED S-7) [VC]', verified_at=now() where id='d2503b23-7592-4352-920e-770e58c4323d' and verification_status not in ('verified_against_standard','corrected');

-- A125-06.abweichung_hoehe_seite
update public.fields set verification_status='verified_against_standard', verification_quote='Bei steuerbaren Verfahren müssen nachfolgend genannte Vortriebsparameter kontinuierlich gemessen und in Vortriebsintervallen von max. 100 mm Länge oder max. 90 s Dauer automatisch aufgezeichnet werden: [...] Abweichungen nach Höhe und Seite, — printed p.53', verification_note='md-verified 2026-09-05 (§7.2.6, printed p.53) [VC]', verified_at=now() where id='b5be91a0-2243-4699-8225-34397f225ae5' and verification_status not in ('verified_against_standard','corrected');

-- A125-06.vorpresskraft_gemessen
update public.fields set verification_status='verified_against_standard', verification_quote='Vorpresskräfte getrennt für Haupt- und Zwischenpressstationen, | Dabei müssen für die Parameter Vortriebskraft, Bohrkopfdrehmoment, im jeweiligen Intervall, zusätzlich die Maximalwerte, bei Stütz- bzw. Erddruck sowie Luftdruck die Minimal- und Maximalwerte aufgezeichnet werden. — printed p.53, p.54', verification_note='md-verified 2026-09-05 (§7.2.6, printed p.53, p.54) [VC]', verified_at=now() where id='3c48d301-c69e-45f6-80eb-047fc9133ee8' and verification_status not in ('verified_against_standard','corrected');

-- A125-06.stuetzdruck_gemessen
update public.fields set verification_status='verified_against_standard', verification_quote='ggf. Stütz- bzw. Erddruck (bei $D_{\mathrm{a}} \geq 1300 \mathrm{~mm}$ ) bei Flüssigkeits- oder Erddruckstützung, | Dabei müssen für die Parameter Vortriebskraft, Bohrkopfdrehmoment, im jeweiligen Intervall, zusätzlich die Maximalwerte, bei Stütz- bzw. Erddruck sowie Luftdruck die Minimal- und Maximalwerte aufgezeichnet werden. — printed p.54', verification_note='md-verified 2026-09-05 (§7.2.6, printed p.54) [VC]', verified_at=now() where id='f17ca871-e01e-4ba9-97fc-349effe0f177' and verification_status not in ('verified_against_standard','corrected');

-- A125-06.raeumliche_abwinklung
update public.fields set verification_status='verified_against_standard', verification_quote='räumliche Abwinklung in der maßgeblichen Rohrfuge, erfahrungsgemäß die zweite oder dritte (ohne Abwinklungsmessung müssen auf der sicheren Seite liegende Annahmen für die Berechnung der zulässigen Vortriebskraft getroffen werden; bei Pilotvortrieben ist eine Abwinklungsmessung nicht erforderlich), — printed p.54', verification_note='md-verified 2026-09-05 (§7.2.6, printed p.54 — Einheit "grad" ist EKOWAI-Konvention; das Regelwerk gibt Abwinklung in Tabelle 5 in [mm] je [m] Baulänge an (siehe STAGED S-9)) [VC]', verified_at=now() where id='76659dd2-6295-42d4-b341-439d107862c6' and verification_status not in ('verified_against_standard','corrected');

-- A125-07.gueteueberwachung
update public.fields set verification_status='verified_against_standard', verification_quote='Das Einhalten der in den Abschnitten 5.2, 5.3, 5.4, 5.6 und 5.9 festgelegten Anforderungen muss durch eine Überwachung, bestehend aus Eigenüberwachung und Fremdüberwachung sichergestellt werden. — printed p.28', verification_note='md-verified 2026-09-05 (§5.8, printed p.28) [VC]', verified_at=now() where id='0fc2e16a-ce5d-47b4-ad8c-def0501f2c72' and verification_status not in ('verified_against_standard','corrected');

-- A125-07.unternehmen_qualifikation
update public.fields set verification_status='verified_against_standard', verification_quote='Der Nachweis der Fachkunde für die Ausführung von steuerbaren Verfahren und Berstverfahren im Kanalbau gilt als erbracht, wenn das Unternehmen ein Zertifikat der entsprechenden Gruppe gemäß Gütesicherung RAL-GZ 961 [...] oder einen entsprechenden Qualifikationsnachweis gemäß „Güte- und Prüfbestimmungen RAL-GZ 961“ und einen Vertrag zur RAL-Gütesicherung für die Maßnahme vorlegt. | Für den Einbau von Gas- und Wasserversorgungsleitungen mit steuerbaren unbemannten (außer HDD) oder bemannten Verfahren muss das Unternehmen darüber hinaus im Besitz der DVGW-Bescheinigung für Rohrleitungsbauunternehmen nach Arbeitsblatt DVGW GW 301 in der entsprechenden Gruppe sein. — printed p.51', verification_note='md-verified 2026-09-05 (§7.1.15, printed p.51) [VC]', verified_at=now() where id='eb4389bd-ca76-4453-a5b4-03ef056835ac' and verification_status not in ('verified_against_standard','corrected');

-- A125-07.qm_system
update public.fields set verification_status='verified_against_standard', verification_quote='Für die Ausführung und Dokumentation muss ein geeignetes Qualitätsmanagementsystem beschrieben und gefordert werden. — printed p.51', verification_note='md-verified 2026-09-05 (§7.1.15, printed p.51) [VC]', verified_at=now() where id='a2ffb765-cb5b-42d5-b5ff-812cdeee4416' and verification_status not in ('verified_against_standard','corrected');

-- A125-07.bestandsunterlagen
update public.fields set verification_status='verified_against_standard', verification_quote='Alle Arbeitsvorgänge des Vortriebs müssen unter Berücksichtigung der jeweiligen verfahrenspezifischen Besonderheiten, sowie ggf. weiterer technischer Regelwerke, protokolliert werden. | Die Bestandsdokumentation muss gemäß ATBBeStra erfolgen und muss auch aufgegebene Vortriebe enthalten. | Die Bestandsunterlagen müssen zur Aufnahme in die Leitungsdokumentation der WSV in digitaler Form gefertigt und dem zuständigen WSA spätestens 6 Monate nach Fertigstellung des Vortriebs-/Bohrprojektes übergeben werden. — printed p.60, p.63, p.67', verification_note='md-verified 2026-09-05 (§10.5 (+ §8.7 und §9.6), printed p.60, p.63, p.67) [VC]', verified_at=now() where id='f8579d4e-d5f7-44b2-9db3-9cf976827551' and verification_status not in ('verified_against_standard','corrected');

-- A125-07.sondergelaende_genehmigung
update public.fields set verification_status='verified_against_standard', verification_quote='In bestimmten Fällen, die in den folgenden Abschnitten und in den betreffenden Regelwerken genannt sind, wird eine besondere Unternehmensinterne Genehmigung (UiG) durch die Zentrale des jeweiligen Eisenbahn-Infrastrukturunternehmens (EIU) erforderlich. Darüber hinaus kann zusätzlich eine Zustimmung im Einzelfall (ZiE) durch die Zentrale des EBA erforderlich werden. | Nach § 31 Bundeswasserstraßengesetz (WaStrG) benötigen Kreuzungen von Leitungen mit Bundeswasserstraßen eine strom- und schifffahrtspolizeiliche Genehmigung (SSG) und einen Gestattungs- bzw. Nutzungsvertrag. — printed p.56, p.63', verification_note='md-verified 2026-09-05 (§8.1 + §10.1 (clause_reference in prod is §8.7 = Dokumentation — Retag vorgeschlagen, siehe STAGED S-5), printed p.56, p.63) [VC]', verified_at=now() where id='f0582651-c0e3-402a-ab7d-77974e4bcc6b' and verification_status not in ('verified_against_standard','corrected');

-- ============================================================================
-- EQUATIONS — both are ALREADY verification_status='verified_against_standard' in prod but carry a NULL
-- verification_quote. The pack therefore does NOT touch their status; it only BACKFILLS the missing quote/note
-- (guard: verification_quote is null), so the provenance is readable in the app and in the form guide.
-- ============================================================================
-- E1  delta_a = a_max - a_min
update public.equations set verification_quote='Die Rechtwinkligkeit der Stirnflächen wird gemäß Bild 1 an jedem Rohrende definiert als $\Delta a=a_{\max }-a_{\min }$. — printed p.19, p.20', verification_note='md-verified 2026-09-05 (§5.2.3.2, printed p.19, p.20) [VC] — quote backfill only; verification_status was already verified_against_standard', verified_at=now() where id='c068f7f5-5b7b-4e8f-a715-b9b5fdf1bdee' and verification_quote is null;

-- E2  R_min = 200 * D_a
update public.equations set verification_quote='Bei Rohrvortrieben in gekrümmter Trasse müssen in Abhängigkeit von der Baulänge, der Fügekonstruktion und dem Außendurchmesser der Rohre Mindestradien eingehalten werden. Als eine erste grobe Abschätzung kann bei $3,00 \mathrm{~m}$ langen Vortriebsrohren für die Höhe und Seite von einem zulässigen Mindestradius von $R_{\text {min }} \geq 200 \times D_{\mathrm{a}}$ ausgegangen werden. — printed p.48', verification_note='md-verified 2026-09-05 (§7.1.6, printed p.48) [VC] — quote backfill only; verification_status was already verified_against_standard', verified_at=now() where id='cd0b71c6-d17e-4f96-8bfa-39414a01d767' and verification_quote is null;
