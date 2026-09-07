-- ============================================================================
-- SR-1 field-verification pack — DWA-A-226 (Arbeitsblatt DWA-A 226, August 2009, Weißdruck;
--   "Grundsätze für die Abwasserbehandlung in Belebungsanlagen mit gemeinsamer aerober
--   Schlammstabilisierung ab 1.000 Einwohnerwerte"; prod standards.version = "August 2009";
--   standard id 6776b9f9-0129-48fe-80c1-398bc7563bff).
-- EDITION / DRAFT STATUS — the md title block carries "\section*{Arbeitsblatt DWA-A 226}" +
--   "\section*{August 2009}" (md 1–7) and no edition qualifier. It is the WEISSDRUCK (final issue),
--   not a Gelbdruck/Entwurf, on this evidence: (1) grep for "Weißdruck|Weissdruck|Gelbdruck|Entwurf|
--   Einspruch" over the whole md returns ZERO hits — a Gelbdruck always carries the Entwurf label and
--   an Einspruchsfrist notice; (2) the Benutzerhinweis (md 159–163, printed p.7) is the final-issue
--   wording "Dieses Arbeitsblatt ist das Ergebnis ehrenamtlicher, technisch-wissenschaftlicher/
--   wirtschaftlicher Gemeinschaftsarbeit […] Für dieses besteht nach der Rechtsprechung eine
--   tatsächliche Vermutung, dass es inhaltlich und fachlich richtig sowie allgemein anerkannt ist.";
--   (3) the Impressum (md 30–38) carries a print run and ISBN 978-3-941089-81-5. HONEST RESIDUE: the
--   md nowhere prints the word "Weißdruck" itself, so this is an inference from (1)+(2), not a quote.
-- Generated: 2026-09-07 — md-verified pass (owner ruling 2026-09-05: the markdown transcript is the
--   verification source; the PDF only where no markdown exists). Grade: VC (SR-3), stamped on every row.
--   Records evidence only (verification_status / verification_quote / verification_note / verified_at);
--   changes NO structure, enforcement or required-ness — all of that is in dwa-a-226-STAGED-rulings.sql.
-- Source md: C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-A-226\DWA-A-226.md
--   (1,335 lines, German, mathpix LaTeX transcript; read completely, lines 1–1335).
--   Layout: title/Impressum/Vorwort/Verfasser 1–82, Inhalt + Bilder-/Tabellenverzeichnis 84–158,
--   Benutzerhinweis 159–163, §1 164–211, §2 Kurzzeichen 213–302 (three tabulars 215–241, 244–271,
--   274–301), §3.1 303–320, §3.2 322–408 (Gl.1 330–334, Gl.2 337–341, Gl.3 346–350, Gl.4 354–358,
--   Gl.5 359–363, Gl.6 367–371, Tab.1 383–394), §3.3.1 412–437 (Gl.7 417–421, Gl.8 424–428),
--   §3.3.2 439–513 (Gl.9 445–446, Gl.10 448–450, t_TS 452–460, Gl.11 467–471, B_TS,BSB 475–479,
--   Tab.2 481–496, Tab.3 497–513), §3.3.3 515–587 (Gl.12 518–522, O_B 524–526, Gl.13 528–532,
--   Gl.14 535–539, Gl.15 544–548, Gl.16 551–555, t_D/t_T 557–561, alpha 565, Gl.17 570–574,
--   Kennwerte 578–583), §3.4 588–742 (ISV 598, Gl.18 601–603, t_E 605, Gl.19/20 607–611,
--   Gl.21 613–614, RV 616, Gl.22 618–619, q_SV/q_A 621, Gl.24 628–632, Tab.4 636–654,
--   Tab.5 656–674, Bild 1 676–680, Tab.6 684–708, Gl.25 710–714, Bild 2 716–720,
--   h_z/Gl.26–28 723–730, Gl.29 733–737, Anwendungsgrenzen 739–741), §4.1–4.9 743–848,
--   §5.1–5.3 849–884, §6.1 885–898, §6.2 899–933, §6.3 935–953 (Bild 3 945–950, Bild 4 951–956),
--   §7 957–963, §8 965–971, Literatur 973–1041, Anhang A 1043–1247, Zusammenfassung 1249–1335.
--
--   PAGE CONVENTION — the md carries NO standalone page-number lines and no page markers at all.
--   "printed p.N" is DERIVED from the guideline's own printed Inhalt (md 84–127) plus the Bilder- und
--   Tabellenverzeichnis (md 128–155), which map every clause, figure and table to its printed page:
--     Vorwort p.3 · Verfasser p.4 · Benutzerhinweis p.7 · §1 p.7 · §2 p.8 (the Kurzzeichen table runs
--     over three tabulars into p.9, cited "p.8–9") · §3/3.1 p.9 · §3.2 + Tab.1 p.10 (its last
--     paragraphs run onto p.11, cited "p.10–11") · §3.3.1 p.11 · §3.3.2 p.11 with Tab.2 + Tab.3 p.12
--     (cited "p.11–12" where the clause straddles) · §3.3.3 p.13 (its closing paragraphs run onto
--     p.14, cited "p.13–14") · §3.4 p.14 with Tab.4/Tab.5/Tab.6 + Bild 1 + Bild 2 p.15 and the
--     Trichterbecken depth equations running to p.16 · §4/4.1/4.2/4.3 p.16 · §4.4/4.5.1/4.5.2/4.5.3
--     p.17 · §4.6/4.7/4.8 p.18 · §4.9 + §5/5.1 p.19 · §5.2/5.3 p.20 · §6/6.1/6.2 p.21 (§6.2 runs to
--     p.22) · §6.3 p.22 with Bild 3 + Bild 4 p.23 · §7 + §8 + Literatur p.24 · Anhang A.1 p.25 ·
--     A.1.5 + Tab.7 + Tab.8 + A.2 p.26 · A.2.3–A.2.6 p.27 · Bild A.1 + Bild A.2 p.28.
--   CROSS-CHECK: the mathpix per-page image indices embedded in the md agree with that mapping
--   EXACTLY (offset 0, 4/4 figures): Bild 1 and Bild 2 "…-15.jpg" = printed p.15; Bild 3 and Bild 4
--   "…-23.jpg" = p.23; the A.1 inline crops "…-25.jpg" = p.25; Bild A.1/A.2 "…-28.jpg" = p.28.
--   Where a clause demonstrably straddles two printed pages the quote is cited as a span.
--
--   MD DEFECT NOTED (does not affect any value in this pack, but the quotes carry it verbatim):
--   the transcript repeatedly glues the unit "l" onto the preceding digit — "1501 /(E × d)" is
--   "150 l/(E×d)" (md 327), "0,21 /(s × ha) bis 0,71 /(s × ha)" is "0,2 l/(s×ha) bis 0,7 l/(s×ha)"
--   (md 365), "etwa 61 /(E × d)" is "6 l/(E×d)" and "1,21 /(E × d)" is "1,2 l/(E×d)" (md 400/402),
--   "Q_F = 11/s" is "1 l/s" (md 1105), "f_BB = 3051 / EW" is "305 l/EW" (md 1143). The Kurzzeichen
--   table shows the same defect ("ISV & 1/kg" = l/kg, "q_F & 1/(s×ha)" = l/(s×ha)). Quotes are kept
--   BYTE-VERBATIM (mathpix LaTeX, $…$, \hline, table &) so the spot-check can match them; the
--   encoded field units are the corrected reading and agree with the PDF's intent.
--
-- Counts: 87 fields examined / 87 quoted / 0 exempt (app-metadata) / 0 residue;
--         28 equations, all already verified but with verification_quote NULL -> 28 QUOTE BACKFILLS
--         (verification_status deliberately NOT touched, guard "verification_quote is null").
--         Total statements: 115.
-- Rollback: rollback-dwa-a-226-md-verification-pack.sql
-- NOTE: only update statements — apply-pack.mjs supplies the transaction (no begin/commit here).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A226-01 — Anmeldung und Verfahrenswahl (6 fields)
-- ---------------------------------------------------------------------------

-- stabilisierungsart · Art der aeroben Stabilisierung
update public.fields set verification_status='verified_against_standard', verification_quote='Das Bemessungsschlammalter für Anlagen mit gemeinsamer aerober Schlammstabilisierung und Nitrifikation beträgt: $t_{\mathrm{TS}} \geq 20 \mathrm{~d}$ | Das Bemessungsschlammalter für Anlagen mit gemeinsamer aerober Schlammstabilisierung, Nitrifikation und gezielter Denitrifikation beträgt: $t_{\mathrm{TS}} \geq 25 \mathrm{~d}$ — printed p.11–12', verification_note='md-verified 2026-09-07 (§3.3.2, printed p.11–12) [VC]', verified_at=now() where id='bd46e2f5-bd62-40d0-9170-cdf96fa9ace7' and verification_status not in ('verified_against_standard','corrected');

-- betriebsweise_deni · Betriebsweise der Denitrifikation
update public.fields set verification_status='verified_against_standard', verification_quote='Für eine gemeinsame aerobe Schlammstabilisierung mit gezielter Denitrifikation ist ein Schlammalter von $t_{\mathrm{TS}} \geq 25 \mathrm{~d}$ erforderlich. Im Hinblick auf die Forderung nach Einfachheit in baulicher Gestaltung, Ausrüstung und Betrieb ist dazu eine simultane oder intermittierende Betriebsweise zweckmäßig. Bei größeren Stabilisierungsanlagen kommen auch die vorgeschaltete Denitrifikation und die Kaskadendenitrifikation zum Einsatz. — printed p.3', verification_note='md-verified 2026-09-07 (Vorwort, printed p.3) [VC]', verified_at=now() where id='e02e44c8-2639-4eea-8b15-970354a21e1d' and verification_status not in ('verified_against_standard','corrected');

-- entwaesserungssystem · Entwaesserungssystem
update public.fields set verification_status='verified_against_standard', verification_quote='Die hydraulische Bemessung der Anlagen im Trennsystem richtet sich nach dem maximalen stündlichen Abfluss bei Trockenwetter. | Für die hydraulische Bemessung der Anlagen im Mischsystem erfolgt die Ermittlung des maßgeblichen Zuflusses zu: — printed p.10', verification_note='md-verified 2026-09-07 (§3.2, printed p.10) [VC]', verified_at=now() where id='942fcd98-aad0-45b0-b964-2dcf09997a95' and verification_status not in ('verified_against_standard','corrected');

-- nachklaerbeckenart · Art des Nachklaerbeckens
update public.fields set verification_status='verified_against_standard', verification_quote='Im Folgenden wird die Bemessung von Trichterbecken (Dortmundbrunnen, ohne maschinelle Schlammräumeinrichtung) und vorwiegend vertikal durchströmter Rundbecken mit maschineller Schlammräumung vorgestellt. — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, printed p.14) [VC]', verified_at=now() where id='f822e79c-56ef-4015-a404-9fc6b76a1701' and verification_status not in ('verified_against_standard','corrected');

-- belueftungssystem · Belueftungssystem
update public.fields set verification_status='verified_against_standard', verification_quote='Der Sauerstoffzufuhrfaktor $\alpha$ ist bei Druckluft- und Oberflächenbelüftungssystemen unterschiedlich. Für Oberflächenbelüftungssysteme wird der $\alpha$-Wert üblicherweise um 0,9 angesetzt. Bei der Druckluftbelüftung können $\alpha$-Werte von 0,6 bis 0,7 angesetzt werden. — printed p.13–14', verification_note='md-verified 2026-09-07 (§3.3.3, printed p.13–14) [VC]', verified_at=now() where id='e54f244d-6b67-4b6d-adda-a4f1929e3167' and verification_status not in ('verified_against_standard','corrected');

-- raeumertyp_nb · Raeumertyp Nachklaerbecken
update public.fields set verification_status='verified_against_standard', verification_quote='Für den Trockensubstanzgehalt des Rücklaufschlammes ( $T S_{\mathrm{RS}}$ ) kann vereinfacht angenommen werden: - $T S_{\mathrm{RS}} \approx 0,7 \times T S_{\mathrm{BS}}\left[\mathrm{kg} / \mathrm{m}^{3}\right]$ bei Rundbecken mit Schildräumern - $T S_{\mathrm{RS}} \approx 1,0 \times T S_{\mathrm{BS}}\left[\mathrm{kg} / \mathrm{m}^{3}\right]$ bei Trichterbecken — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, printed p.14) [VC]', verified_at=now() where id='9bcea25d-f971-450e-ac70-4dda14a2f795' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- A226-02 — Bemessungsgrundlagen und Belastungsdaten (13 fields)
-- ---------------------------------------------------------------------------

-- EW_BSB5_60 · Einwohnerwert bezogen auf BSB5,60
update public.fields set verification_status='verified_against_standard', verification_quote='Dieses Arbeitsblatt gilt für Planung, Bau und Betrieb von Kläranlagen nach dem Belebungsverfahren mit gemeinsamer aerober Schlammstabilisierung bei Ausbaugrößen zwischen 1.000 E und 5.000 E . — printed p.7', verification_note='md-verified 2026-09-07 (§1, printed p.7) [VC]', verified_at=now() where id='64d3f260-e0cf-4b58-802b-8682614c2f6f' and verification_status not in ('verified_against_standard','corrected');

-- EZ · Einwohnerzahl
update public.fields set verification_status='verified_against_standard', verification_quote='Der tägliche Schmutzwasseranfall berechnet sich zu: | Q_{\mathrm{s}, \mathrm{am}}=E Z \times w_{\mathrm{s}, \mathrm{d}} / 86.400+Q_{\mathrm{G}, \mathrm{aM}}[1 / \mathrm{s}] \tag{1} — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Gl.1, printed p.10) [VC]', verified_at=now() where id='13c9b47d-86d1-49ba-bac2-472f40500b7b' and verification_status not in ('verified_against_standard','corrected');

-- Q_G_aM · Betrieblicher Schmutzwasserabfluss im Jahresmittel
update public.fields set verification_status='verified_against_standard', verification_quote='\hline Kurzzeichen & Einheit & Erläuterung \\ | \hline $Q_{\mathrm{G}, \mathrm{aM}}$ & $\mathrm{m}^{3} / \mathrm{d} ; \mathrm{l} / \mathrm{s}$ & betrieblicher (gewerblicher und industrieller) Schmutzwasserabfluss im Jahresmittel \\ — printed p.8–9', verification_note='md-verified 2026-09-07 (§2 Kurzzeichen, printed p.8–9) [VC]', verified_at=now() where id='f98e0368-7cb3-41e6-b401-e1fbe267078c' and verification_status not in ('verified_against_standard','corrected');

-- B_d_BSB · Taegliche BSB5-Fracht
update public.fields set verification_status='verified_against_standard', verification_quote='Die relevanten einwohnerspezifischen Frachten können Tabelle 1 entnommen werden. | \caption{Tabelle 1: Einwohnerspezifische Frachten in $[\mathrm{g} /(\mathrm{E} \times \mathrm{d})]$, die an $85 \%$ der Tage unterschritten werden} | \hline $\mathrm{BSB}_{5}$ & 60 \\ — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Tab.1, printed p.10) [VC]', verified_at=now() where id='64aa7425-b77c-4ae3-902f-a5a8854a4355' and verification_status not in ('verified_against_standard','corrected');

-- frachtspez_BSB5 · Einwohnerspezifische BSB5-Fracht
update public.fields set verification_status='verified_against_standard', verification_quote='\caption{Tabelle 1: Einwohnerspezifische Frachten in $[\mathrm{g} /(\mathrm{E} \times \mathrm{d})]$, die an $85 \%$ der Tage unterschritten werden} | \hline $\mathrm{BSB}_{5}$ & 60 \\ — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Tab.1, printed p.10) [VC]', verified_at=now() where id='79450a28-40d3-4c76-b2ce-acdd9b45e74f' and verification_status not in ('verified_against_standard','corrected');

-- frachtspez_CSB · Einwohnerspezifische CSB-Fracht
update public.fields set verification_status='verified_against_standard', verification_quote='\caption{Tabelle 1: Einwohnerspezifische Frachten in $[\mathrm{g} /(\mathrm{E} \times \mathrm{d})]$, die an $85 \%$ der Tage unterschritten werden} | \hline CSB & 120 \\ — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Tab.1, printed p.10) [VC]', verified_at=now() where id='77b2edfd-6875-4d09-9c22-7a329d8e22d3' and verification_status not in ('verified_against_standard','corrected');

-- frachtspez_TS · Einwohnerspezifische TS-Fracht (abfiltrierbar)
update public.fields set verification_status='verified_against_standard', verification_quote='\caption{Tabelle 1: Einwohnerspezifische Frachten in $[\mathrm{g} /(\mathrm{E} \times \mathrm{d})]$, die an $85 \%$ der Tage unterschritten werden} | \hline abfiltrierbare Stoffe (TS) & 70 \\ — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Tab.1, printed p.10) [VC]', verified_at=now() where id='3a5966d5-749d-4a88-a33f-484d7d93149d' and verification_status not in ('verified_against_standard','corrected');

-- frachtspez_TKN · Einwohnerspezifische TKN-Fracht
update public.fields set verification_status='verified_against_standard', verification_quote='\caption{Tabelle 1: Einwohnerspezifische Frachten in $[\mathrm{g} /(\mathrm{E} \times \mathrm{d})]$, die an $85 \%$ der Tage unterschritten werden} | \hline TKN & 11 \\ — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Tab.1, printed p.10) [VC]', verified_at=now() where id='7c1355af-a5af-4c68-a744-fe0e10a69549' and verification_status not in ('verified_against_standard','corrected');

-- frachtspez_P · Einwohnerspezifische P-Fracht
update public.fields set verification_status='verified_against_standard', verification_quote='\caption{Tabelle 1: Einwohnerspezifische Frachten in $[\mathrm{g} /(\mathrm{E} \times \mathrm{d})]$, die an $85 \%$ der Tage unterschritten werden} | \hline P & 1,8 \\ — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Tab.1, printed p.10) [VC]', verified_at=now() where id='62d04c1f-83f0-4d0c-add9-dd48be8c5e8e' and verification_status not in ('verified_against_standard','corrected');

-- US_C_BSB · Spezifische Schlammproduktion C-Elimination
update public.fields set verification_status='verified_against_standard', verification_quote='Bei kommunalem Abwasser kann erfahrungsgemäß bei einem Schlammalter von 20 d bis 25 d und einer Temperatur im Ablauf des Belebungsbeckens von $10^{\circ} \mathrm{C}$ bis $12^{\circ} \mathrm{C}$ eine spezifische Schlammproduktion $\ddot{U} S_{\mathrm{C}, \mathrm{BSB}}$ von $1,0 \mathrm{~kg} / \mathrm{kg}$, bezogen auf den zugeführten $\mathrm{BSB}_{5}$, zugrunde gelegt werden. — printed p.10–11', verification_note='md-verified 2026-09-07 (§3.2, printed p.10–11) [VC]', verified_at=now() where id='bdf0300e-efd0-4fa3-9d34-6059c4841f4a' and verification_status not in ('verified_against_standard','corrected');

-- TR_Schl · Trockenrueckstand des Schlammes
update public.fields set verification_status='verified_against_standard', verification_quote='Der daraus ableitbare spezifische Schlammanfall beträgt bei üblichem Abbau der zugeführten organischen Schmutzstoffe: - nicht eingedickt (etwa $1,0 \% T R_{\text {Schl }}$ ) etwa $61 /(\mathrm{E} \times \mathrm{d})$; - voreingedickt (etwa $2,5 \% T R_{\text {Schl }}$ ) etwa $2,4 \mathrm{l} /(\mathrm{E} \times \mathrm{d})$; - gelagert (etwa $5,0 \% T R_{\text {Schl }}$ ) etwa $1,21 /(\mathrm{E} \times \mathrm{d})$. — printed p.10–11', verification_note='md-verified 2026-09-07 (§3.2, printed p.10–11) [VC]', verified_at=now() where id='1135c142-133d-4018-9b69-aff3745b53c9' and verification_status not in ('verified_against_standard','corrected');

-- ISV · Schlammindex
update public.fields set verification_status='verified_against_standard', verification_quote='Der Schlammindex stellt sich in der Regel im Bereich von $100 \mathrm{ml} / \mathrm{g}$ bis $150 \mathrm{ml} / \mathrm{g}$ ein. Liegen keine anderen Erkenntnisse vor, sollte er mit $125 \mathrm{ml} / \mathrm{g}$ angesetzt werden. — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, printed p.14) [VC]', verified_at=now() where id='7bb1afee-7241-4dc7-b452-e3084388963b' and verification_status not in ('verified_against_standard','corrected');

-- w_s_d · Einwohnerspezifischer Schmutzwasseranfall
update public.fields set verification_status='verified_against_standard', verification_quote='Wenn bei Kläranlagen dieser Größenordnung - insbesondere im unteren Geltungsbereich - statistisch auswertbare Daten über den Abwasseranfall und seine Fortentwicklung nicht vorliegen und der erforderliche Untersuchungsaufwand in keinem Verhältnis zum Nutzen stehen sollte, kann vereinfachend von folgenden Werten ausgegangen werden: spezifischer Schmutzwasseranfall $w_{\mathrm{s}, \mathrm{d}} \geq 1501 /(\mathrm{E} \times \mathrm{d})$ (Wasserverbrauch aus Haushalten und Kleingewerbe) — printed p.10', verification_note='md-verified 2026-09-07 (§3.2, printed p.10) [VC]', verified_at=now() where id='0aed04d5-0999-47f4-b7be-cbdc2e2a4288' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- A226-03 — Hydraulische Bemessung (12 fields)
-- ---------------------------------------------------------------------------

-- Q_bem · Massgebender Bemessungszufluss bei Regenwetter (Trennsystem)
update public.fields set verification_status='verified_against_standard', verification_quote='Die hydraulische Bemessung der Anlagen im Trennsystem richtet sich nach dem maximalen stündlichen Abfluss bei Trockenwetter. | Q_{\mathrm{bem}}=Q_{\mathrm{T}, \mathrm{h}, \text { max }}=24 \times Q_{\mathrm{S}, \mathrm{aM}} / x_{\mathrm{Q} \text { max }}+Q_{\mathrm{F}}+Q_{\mathrm{R}, \mathrm{Tr}}[\mathrm{l} / \mathrm{s}] \tag{2} — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Gl.2, printed p.10) [VC]', verified_at=now() where id='ba730ad8-8578-4dc1-ab74-eb4558d842d9' and verification_status not in ('verified_against_standard','corrected');

-- A_E_k · Flaeche des kanalisierten Einzugsgebietes
update public.fields set verification_status='verified_against_standard', verification_quote='\hline Kurzzeichen & Einheit & Erläuterung \\ | \hline $A_{\mathrm{E}, \mathrm{k}}$ & ha & Fläche des kanalisierten bzw. durch ein Entwässerungssystem erfassten Einzugsgebietes \\ — printed p.8–9', verification_note='md-verified 2026-09-07 (§2 Kurzzeichen, printed p.8–9) [VC]', verified_at=now() where id='7f090963-0b65-4ae3-b58b-5dc445291c82' and verification_status not in ('verified_against_standard','corrected');

-- x_Qmax · Divisor Spitzenabfluss Schmutzwasser
update public.fields set verification_status='verified_against_standard', verification_quote='Der stündliche Spitzenabfluss bei kommunalem Schmutzwasser sollte mit $x_{\mathrm{Q} \max }=8$ bis $x_{\mathrm{Q} \max }=11$ angesetzt werden. Der kleinere Kennwert gilt für den unteren ( 1.000 E ), der größere für den oberen Geltungsbereich (5.000 E). Zwischenwerte können interpoliert werden. — printed p.10', verification_note='md-verified 2026-09-07 (§3.2, printed p.10) [VC]', verified_at=now() where id='7780207b-8dab-4d9a-9128-8dc287d02c61' and verification_status not in ('verified_against_standard','corrected');

-- f_S_Qm · Faktor Schmutzwasserabfluss (Mischsystem)
update public.fields set verification_status='verified_against_standard', verification_quote='Für die hydraulische Bemessung der Anlagen im Mischsystem erfolgt die Ermittlung des maßgeblichen Zuflusses zu: | Q_{\text {bem }}=f_{\mathrm{S}, \mathrm{QM}} \times Q_{\mathrm{S}, \mathrm{aM}}+Q_{\mathrm{F}} \quad[1 / \mathrm{s}] \tag{3} | Für $f_{\mathrm{S}, \mathrm{QM}}$ sollten Werte zwischen 6 und 9 gewählt werden. — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Gl.3, printed p.10) [VC]', verified_at=now() where id='905ae2fc-ae98-4129-80e7-2d3eed146f7c' and verification_status not in ('verified_against_standard','corrected');

-- q_F · Fremdwasserabflussspende
update public.fields set verification_status='verified_against_standard', verification_quote='Die Ermittlung des Fremd- und Regenwasserzuflusses sollte in Anlehnung an das Arbeitsblatt DWA-A 118 auf der Basis von $q_{\mathrm{F}}(0,05 \mathrm{l} /(\mathrm{s} \times \mathrm{ha})$ bis $0,15 \mathrm{l} /(\mathrm{s} \times \mathrm{ha}))$ und $q_{\mathrm{R}, \mathrm{Tr}}(0,21 /(\mathrm{s} \times \mathrm{ha})$ bis $0,71 /(\mathrm{s} \times \mathrm{ha}))$ erfolgen. — printed p.10–11', verification_note='md-verified 2026-09-07 (§3.2, printed p.10–11) [VC]', verified_at=now() where id='024b1d58-a017-4cca-891e-95b994a4f836' and verification_status not in ('verified_against_standard','corrected');

-- q_R_Tr · Regenabflussspende im Schmutzwasserkanal
update public.fields set verification_status='verified_against_standard', verification_quote='Die Ermittlung des Fremd- und Regenwasserzuflusses sollte in Anlehnung an das Arbeitsblatt DWA-A 118 auf der Basis von $q_{\mathrm{F}}(0,05 \mathrm{l} /(\mathrm{s} \times \mathrm{ha})$ bis $0,15 \mathrm{l} /(\mathrm{s} \times \mathrm{ha}))$ und $q_{\mathrm{R}, \mathrm{Tr}}(0,21 /(\mathrm{s} \times \mathrm{ha})$ bis $0,71 /(\mathrm{s} \times \mathrm{ha}))$ erfolgen. — printed p.10–11', verification_note='md-verified 2026-09-07 (§3.2, printed p.10–11) [VC]', verified_at=now() where id='dc111fbf-46ee-4605-b8a6-c73930f2c5ba' and verification_status not in ('verified_against_standard','corrected');

-- m · Vielfaches Schmutzwasserabfluss (Fremdwasser pauschal)
update public.fields set verification_status='verified_against_standard', verification_quote='Wird mit $m$ (pauschales Vielfaches) gerechnet, sollte $m$ je nach vorgelagertem Entwässerungssystem (bei Mischsystem kleinere Werte, da kein $Q_{\mathrm{R}, \mathrm{Tr}}$ ) und zu erwartendem | unvermeidlichem Fremdwasseranfall gewählt werden ( $m=0,1$ bis 1). — printed p.10–11', verification_note='md-verified 2026-09-07 (§3.2, printed p.10–11) [VC]', verified_at=now() where id='d417ff99-8315-47cd-b570-4e38dc43679d' and verification_status not in ('verified_against_standard','corrected');

-- Q_S_aM · Schmutzwasserabfluss im Jahresmittel
update public.fields set verification_status='verified_against_standard', verification_quote='Der tägliche Schmutzwasseranfall berechnet sich zu: | Q_{\mathrm{s}, \mathrm{am}}=E Z \times w_{\mathrm{s}, \mathrm{d}} / 86.400+Q_{\mathrm{G}, \mathrm{aM}}[1 / \mathrm{s}] \tag{1} — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Gl.1, printed p.10) [VC]', verified_at=now() where id='a716ff8a-0d3f-436d-8473-98545d8f4ee0' and verification_status not in ('verified_against_standard','corrected');

-- Q_R_Tr · Unvermeidbarer Regenabfluss im Trennkanal
update public.fields set verification_status='verified_against_standard', verification_quote='Fremdwasserzufluss $Q_{\mathrm{F}}$ und unvermeidlicher Regenabfluss im Trennkanal $Q_{\mathrm{R}, \mathrm{Tr}}$ : | Q_{\mathrm{R}, \mathrm{Tr}}=q_{\mathrm{R}, \mathrm{Tr}} \times A_{\mathrm{E}, \mathrm{k}} \quad[1 / \mathrm{s}] \tag{5} — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Gl.5, printed p.10) [VC]', verified_at=now() where id='008620d1-7f0e-41fa-ae7d-787679b6a0a0' and verification_status not in ('verified_against_standard','corrected');

-- Q_F_R_Tr · Pauschale Summe Fremd-/Regenwasser
update public.fields set verification_status='verified_against_standard', verification_quote='Regionalspezifische Besonderheiten müssen beachtet werden. Dann ist: | Q_{\mathrm{F}}+Q_{\mathrm{R}, \mathrm{Tr}}=m \times 24 \times Q_{\mathrm{S}, \mathrm{aM}} / x_{\mathrm{Q} \text { max }} \quad[1 / \mathrm{s}] \tag{6} — printed p.10–11', verification_note='md-verified 2026-09-07 (§3.2 Gl.6, printed p.10–11) [VC]', verified_at=now() where id='562f0984-7ac4-4046-8c28-0f4c7b0feed9' and verification_status not in ('verified_against_standard','corrected');

-- Q_bem_misch · Massgebender Bemessungszufluss bei Regenwetter (Mischsystem)
update public.fields set verification_status='verified_against_standard', verification_quote='Für die hydraulische Bemessung der Anlagen im Mischsystem erfolgt die Ermittlung des maßgeblichen Zuflusses zu: | Q_{\text {bem }}=f_{\mathrm{S}, \mathrm{QM}} \times Q_{\mathrm{S}, \mathrm{aM}}+Q_{\mathrm{F}} \quad[1 / \mathrm{s}] \tag{3} | Für $f_{\mathrm{S}, \mathrm{QM}}$ sollten Werte zwischen 6 und 9 gewählt werden. — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Gl.3, printed p.10) [VC]', verified_at=now() where id='4a01edae-5b92-4c96-b094-20f0abfe5fde' and verification_status not in ('verified_against_standard','corrected');

-- Q_F · Fremdwasserabfluss
update public.fields set verification_status='verified_against_standard', verification_quote='Fremdwasserzufluss $Q_{\mathrm{F}}$ und unvermeidlicher Regenabfluss im Trennkanal $Q_{\mathrm{R}, \mathrm{Tr}}$ : | Q_{\mathrm{F}} \quad=q_{\mathrm{F}} \times A_{\mathrm{E}, \mathrm{k}} \quad[1 / \mathrm{s}] \tag{4} — printed p.10', verification_note='md-verified 2026-09-07 (§3.2 Gl.4, printed p.10) [VC]', verified_at=now() where id='36db1ca4-b554-4891-8198-34b90823133d' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- A226-04 — Ueberschussschlammproduktion (4 fields)
-- ---------------------------------------------------------------------------

-- faellmittel · Faellmittelart fuer P-Elimination
update public.fields set verification_status='verified_against_standard', verification_quote='Eine gezielte P-Elimination wird bei Anlagen des hier behandelten Geltungsbereiches grundsätzlich nicht verlangt. Sofern sie dennoch erfolgt, kann bei typischen kommunalen Zuflussbedingungen und einer angestrebten P -Ablaufkonzentration $<2 \mathrm{mg} / \mathrm{l}$ in Abhängigkeit vom gewählten Fällmittel überschlägig von folgender Überschussschlammproduktion aus der P-Elimination ausgegangen werden: Fällung mit Eisensalz: rd. $10 \%$ von $\ddot{U} S_{\mathrm{d}, \mathrm{c}}$ Fällung mit Aluminiumsalz: rd. $8 \%$ von $\ddot{U} S_{\mathrm{d}, \mathrm{c}}$ — printed p.11', verification_note='md-verified 2026-09-07 (§3.3.1, printed p.11) [VC]', verified_at=now() where id='282474dd-9c5a-4509-a3c7-7be29cb7b5cf' and verification_status not in ('verified_against_standard','corrected');

-- US_d_C · Taegliche Schlammproduktion C-Elimination
update public.fields set verification_status='verified_against_standard', verification_quote='Schlammproduktion aus der Kohlenstoffelimination: | \ddot{U} S_{\mathrm{d}, \mathrm{C}}=\ddot{U} S_{\mathrm{C}, \mathrm{BSB}} \times B_{\mathrm{d}, \mathrm{BSB}}=1,0 \times B_{\mathrm{d}, \mathrm{BSB}}[\mathrm{kg} / \mathrm{d}] \tag{8} — printed p.11', verification_note='md-verified 2026-09-07 (§3.3.1 Gl.8, printed p.11) [VC]', verified_at=now() where id='d81d7aa9-239d-4393-a47b-0380f4b9deb4' and verification_status not in ('verified_against_standard','corrected');

-- US_d_P · Taegliche Schlammproduktion P-Elimination
update public.fields set verification_status='verified_against_standard', verification_quote='Schlammproduktion aus der Phosphorelimination: Eine gezielte P-Elimination wird bei Anlagen des hier behandelten Geltungsbereiches grundsätzlich nicht verlangt. Sofern sie dennoch erfolgt, kann bei typischen kommunalen Zuflussbedingungen und einer angestrebten P -Ablaufkonzentration $<2 \mathrm{mg} / \mathrm{l}$ in Abhängigkeit vom gewählten Fällmittel überschlägig von folgender Überschussschlammproduktion aus der P-Elimination ausgegangen werden: Fällung mit Eisensalz: rd. $10 \%$ von $\ddot{U} S_{\mathrm{d}, \mathrm{c}}$ Fällung mit Aluminiumsalz: rd. $8 \%$ von $\ddot{U} S_{\mathrm{d}, \mathrm{c}}$ — printed p.11', verification_note='md-verified 2026-09-07 (§3.3.1, printed p.11) [VC]', verified_at=now() where id='5a04ff55-2292-4656-874a-3feb7a93a6e8' and verification_status not in ('verified_against_standard','corrected');

-- US_d · Gesamte taegliche Schlammproduktion
update public.fields set verification_status='verified_against_standard', verification_quote='Der in einer Belebungsanlage produzierte Schlamm setzt sich aus den beim Abbau organischer Stoffe entstehenden und eingelagerten Feststoffen sowie dem aus der Phosphorelimination resultierenden Schlamm zusammen: | \ddot{U} S_{\mathrm{d}}=\ddot{U} S_{\mathrm{d}, \mathrm{C}}+\ddot{U} S_{\mathrm{d}, \mathrm{P}}[\mathrm{kg} / \mathrm{d}] \tag{7} — printed p.11', verification_note='md-verified 2026-09-07 (§3.3.1 Gl.7, printed p.11) [VC]', verified_at=now() where id='e05a3cce-1d74-4cb4-8120-9d1b7d8f5fe3' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- A226-05 — Schlammalter und Belebungsbeckenvolumen (6 fields)
-- ---------------------------------------------------------------------------

-- t_TS · Schlammalter
update public.fields set verification_status='verified_against_standard', verification_quote='Das Bemessungsschlammalter für Anlagen mit gemeinsamer aerober Schlammstabilisierung und Nitrifikation beträgt: $t_{\mathrm{TS}} \geq 20 \mathrm{~d}$ | Das Bemessungsschlammalter für Anlagen mit gemeinsamer aerober Schlammstabilisierung, Nitrifikation und gezielter Denitrifikation beträgt: $t_{\mathrm{TS}} \geq 25 \mathrm{~d}$ — printed p.11–12', verification_note='md-verified 2026-09-07 (§3.3.2, printed p.11–12) [VC]', verified_at=now() where id='a78d5a69-be7d-4c3e-be5f-5939d36fde39' and verification_status not in ('verified_against_standard','corrected');

-- f_BB · Spezifisches Belebungsbeckenvolumen
update public.fields set verification_status='verified_against_standard', verification_quote='Der Faktor $f_{\mathrm{BB}}$ ist in Abhängigkeit von dem angestrebten Schlammalter aus Tabelle 2 oder 3 zu entnehmen. | \caption{Tabelle 2: Erforderliches spezifisches Belebungsbeckenvolumen $\boldsymbol{f}_{\mathrm{BB}}$ in Abhängigkeit von ISV, RV und Art der Nachklärbeckenausführung für ein Schlammalter von $\boldsymbol{t}_{\mathrm{TS}}=\mathbf{2 0 ~ d}$ (für $\boldsymbol{t}_{\mathrm{E}}=\mathbf{1 , 5 ~ h}$ )} — printed p.12', verification_note='md-verified 2026-09-07 (§3.3.2 Tab.2/Tab.3, printed p.12) [VC]', verified_at=now() where id='05e7a749-b7f6-41d3-952c-1991e2b3f275' and verification_status not in ('verified_against_standard','corrected');

-- M_TS_BB · Erforderliche Feststoffmasse im Belebungsbecken
update public.fields set verification_status='verified_against_standard', verification_quote='Erforderliche Masse der Feststoffe im Belebungsbecken $M_{\mathrm{TS}, \mathrm{BB}}=t_{\mathrm{TS}} \times \ddot{U} S_{\mathrm{d}} \quad[\mathrm{kg}]$ (Gl. 5-15 aus ATV-DVWK-A 131) — printed p.11', verification_note='md-verified 2026-09-07 (§3.3.2 Gl.9, printed p.11) [VC]', verified_at=now() where id='8d56869e-30dc-4d23-b830-f490c7a94ff7' and verification_status not in ('verified_against_standard','corrected');

-- V_BB · Volumen des Belebungsbeckens
update public.fields set verification_status='verified_against_standard', verification_quote='Volumen des Belebungsbeckens $V_{\mathrm{BB}}=\frac{M_{\mathrm{TS}, \mathrm{BB}}}{T S_{\mathrm{BB}}}\left[\mathrm{m}^{3}\right]$ (Gl. 5-16 aus ATV-DVWK-A 131) — printed p.11', verification_note='md-verified 2026-09-07 (§3.3.2 Gl.10, printed p.11) [VC]', verified_at=now() where id='937fbebc-6974-4117-8613-36bad9909d9a' and verification_status not in ('verified_against_standard','corrected');

-- V_BB_spez · Belebungsbeckenvolumen ueber spezifisches Volumen
update public.fields set verification_status='verified_against_standard', verification_quote='Werden alle Standardvorgaben dieses Arbeitsblattes verwendet, errechnet sich das erforderliche Belebungsbeckenvolumen zu: | V_{\mathrm{BB}}=E W_{\mathrm{BSB} 5,60} \times f_{\mathrm{BB}} / 1.000 \quad\left[\mathrm{~m}^{3}\right] \tag{11} — printed p.12', verification_note='md-verified 2026-09-07 (§3.3.2 Gl.11, printed p.12) [VC]', verified_at=now() where id='7317d00b-49cb-4621-bd53-6318b7611ebd' and verification_status not in ('verified_against_standard','corrected');

-- B_TS_BSB · BSB5-Schlammbelastung
update public.fields set verification_status='verified_against_standard', verification_quote='Bei üblicher kommunaler Abwasserzusammensetzung ergibt sich eine Schlammbelastung ( $B_{\mathrm{TS}, \mathrm{BSB}}$ ) von: Nitrifikation: $\quad B_{\mathrm{TS}, \mathrm{BSB}} \leq 0,05 \mathrm{~kg} /(\mathrm{kg} \times \mathrm{d})$ Nitrifikation/ Denitrifikation: $\quad B_{\mathrm{TS}, \mathrm{BSB}} \leq 0,04 \mathrm{~kg} /(\mathrm{kg} \times \mathrm{d})$ — printed p.12', verification_note='md-verified 2026-09-07 (§3.3.2, printed p.12) [VC]', verified_at=now() where id='0bd0f3ee-ab2d-43f1-871e-92aa82afbb0c' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- A226-06 — Belueftung und Sauerstoffzufuhr (15 fields)
-- ---------------------------------------------------------------------------

-- t_T · Taktdauer intermittierende Verfahren
update public.fields set verification_status='verified_against_standard', verification_quote='Die Taktdauer $t_{\mathrm{T}}$ ergibt sich zu: | t_{\mathrm{T}}=t_{\mathrm{D}}+t_{\mathrm{N}} \quad[\mathrm{~h}] \tag{16} | Dabei sollte der Quotient | \frac{t_{\mathrm{D}}}{t_{\mathrm{T}}} \leq 0,35 | sein, um eine ausreichende Schlammstabilisierung zu gewährleisten und die Gefahr einer Blähschlammbildung zu vermindern. — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3 Gl.16, printed p.13) [VC]', verified_at=now() where id='2a51735f-812c-4b6b-8324-a9c6e5878443' and verification_status not in ('verified_against_standard','corrected');

-- Q_L_St · Luftvolumenstrom fuer Standardbedingungen
update public.fields set verification_status='verified_against_standard', verification_quote='Der Luftvolumenstrom zur Abdeckung der erforderlichen Sauerstoffzufuhr in belebtem Schlamm ( $\alpha O C$ ) errechnet sich in Abhängigkeit von der Einblastiefe $h_{\mathrm{E}}$ zu: | Q_{\mathrm{L}, \mathrm{St}}=\frac{\alpha O C}{\alpha O C_{\mathrm{L}, \mathrm{~h}} \times h_{\mathrm{E}}}\left[\mathrm{~m}^{3} / \mathrm{h}\right] \tag{17} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3 Gl.17, printed p.13) [VC]', verified_at=now() where id='4074b8e2-d94b-48fb-8a76-564b38aca1ff' and verification_status not in ('verified_against_standard','corrected');

-- O_B · Sauerstofflast
update public.fields set verification_status='verified_against_standard', verification_quote='Sauerstofflast: $O_{\mathrm{B}} \geq 3 \mathrm{~kg} / \mathrm{kg}$ für Anlagen mit Nitrifikation $O_{\mathrm{B}} \geq 2,5 \mathrm{~kg} / \mathrm{kg}$ für Anlagen mit Denitrifikation — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3, printed p.13) [VC]', verified_at=now() where id='553819e8-3204-4370-8dce-beb9e475b1a3' and verification_status not in ('verified_against_standard','corrected');

-- O_B_Nitr · Sauerstofflast Nitrifikation (Festwert)
update public.fields set verification_status='verified_against_standard', verification_quote='$O_{\mathrm{B}} \geq 3 \mathrm{~kg} / \mathrm{kg}$ für Anlagen mit Nitrifikation | Somit ist für Anlagen mit Nitrifikation: | \alpha O C=\frac{3 \times B_{\mathrm{d}, \mathrm{BSB}}}{24} \approx 0,12 \times B_{\mathrm{d}, \mathrm{BSB}} \quad[\mathrm{~kg} / \mathrm{h}] \tag{13} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3 Gl.13, printed p.13) [VC]', verified_at=now() where id='7b2a1d51-5d2b-49dd-a3f0-f397e54997d5' and verification_status not in ('verified_against_standard','corrected');

-- O_B_Deni · Sauerstofflast Denitrifikation (Festwert)
update public.fields set verification_status='verified_against_standard', verification_quote='$O_{\mathrm{B}} \geq 2,5 \mathrm{~kg} / \mathrm{kg}$ für Anlagen mit Denitrifikation | Für Anlagen mit Denitrifikation: | \alpha O C=\frac{2,5 \times B_{\mathrm{d}, \mathrm{BSB}}}{24} \approx 0,1 \times B_{\mathrm{d}, \mathrm{BSB}} \quad[\mathrm{~kg} / \mathrm{h}] \tag{14} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3 Gl.14, printed p.13) [VC]', verified_at=now() where id='0257a2cc-e1ce-4512-b85e-cc241500d7b9' and verification_status not in ('verified_against_standard','corrected');

-- t_D · Dauer der Denitrifikationsphase
update public.fields set verification_status='verified_against_standard', verification_quote='\hline Kurzzeichen & Einheit & Erläuterung \\ | \hline $t_{\mathrm{D}}$ & h & Dauer der Denitrifikationsphase bei intermittierenden Verfahren \\ — printed p.8–9', verification_note='md-verified 2026-09-07 (§2 Kurzzeichen, printed p.8–9) [VC]', verified_at=now() where id='19c55bf2-9f99-4d68-baad-82361f17707c' and verification_status not in ('verified_against_standard','corrected');

-- t_N · Dauer der Nitrifikationsphase
update public.fields set verification_status='verified_against_standard', verification_quote='\hline Kurzzeichen & Einheit & Erläuterung \\ | \hline $t_{\mathrm{N}}$ & h & Dauer der Nitrifikationsphase bei intermittierenden Verfahren \\ — printed p.8–9', verification_note='md-verified 2026-09-07 (§2 Kurzzeichen, printed p.8–9) [VC]', verified_at=now() where id='4c9c12a2-70d2-4ff1-a54a-41392324a7b4' and verification_status not in ('verified_against_standard','corrected');

-- alpha · Sauerstoffzufuhrfaktor
update public.fields set verification_status='verified_against_standard', verification_quote='Wird das Sauerstoffzufuhrvermögen in Reinwasser unter Standardbedingungen angegeben, so muss dieses um den Faktor 1/α größer sein als das berechnete erforderliche Sauerstoffzufuhrvermögen in belebtem Schlamm. Der Sauerstoffzufuhrfaktor $\alpha$ ist bei Druckluft- und Oberflächenbelüftungssystemen unterschiedlich. Für Oberflächenbelüftungssysteme wird der $\alpha$-Wert üblicherweise um 0,9 angesetzt. Bei der Druckluftbelüftung können $\alpha$-Werte von 0,6 bis 0,7 angesetzt werden. — printed p.13–14', verification_note='md-verified 2026-09-07 (§3.3.3, printed p.13–14) [VC]', verified_at=now() where id='21800219-a784-40c6-ad41-bbb7798f9ab4' and verification_status not in ('verified_against_standard','corrected');

-- alphaOC_L_h · Spezifische Sauerstoffzufuhr in belebtem Schlamm
update public.fields set verification_status='verified_against_standard', verification_quote='Für eine feinblasige Belüftung in Rundbecken mit getrennter Umwälzung kann für nicht ganz neue Membrane unter Betriebsbedingungen mit einer Sauerstoffausnutzung von $\alpha O C_{\mathrm{L}, \mathrm{h}}$ mit $7 \mathrm{~g} /\left(\mathrm{m}^{3} \times \mathrm{m}\right)$ bis $10 \mathrm{~g} /\left(\mathrm{m}^{3} \times \mathrm{m}\right)$ gerechnet werden. Die höheren Werte gelten nur für sehr flächig verteilte Belüfteranordnung. — printed p.13–14', verification_note='md-verified 2026-09-07 (§3.3.3, printed p.13–14) [VC]', verified_at=now() where id='1e356546-1e65-4ced-9185-7a2c5148ba97' and verification_status not in ('verified_against_standard','corrected');

-- h_E · Einblastiefe
update public.fields set verification_status='verified_against_standard', verification_quote='\hline $h_{\mathrm{E}}$ & m & Einblastiefe; Steighöhe der Druckluft im Wasser \\ | Der Luftvolumenstrom zur Abdeckung der erforderlichen Sauerstoffzufuhr in belebtem Schlamm ( $\alpha O C$ ) errechnet sich in Abhängigkeit von der Einblastiefe $h_{\mathrm{E}}$ zu: — printed p.8–13', verification_note='md-verified 2026-09-07 (§2 Kurzzeichen / §3.3.3, printed p.8–13) [VC]', verified_at=now() where id='c152ddff-be77-479f-aa2e-c28f18cc008d' and verification_status not in ('verified_against_standard','corrected');

-- P_L_h · Umwaelzaufwand
update public.fields set verification_status='verified_against_standard', verification_quote='kann mit einem Energieaufwand $P_{\mathrm{L}, \mathrm{h}}$ von $5 \mathrm{~Wh} /\left(\mathrm{m}^{3} \times \mathrm{m}\right)$ bis $7 \mathrm{~Wh} /\left(\mathrm{m}^{3} \times \mathrm{m}\right)$ gerechnet werden. — printed p.13–14', verification_note='md-verified 2026-09-07 (§3.3.3, printed p.13–14) [VC]', verified_at=now() where id='4e3ef392-3cee-437d-ae2d-98833f685cba' and verification_status not in ('verified_against_standard','corrected');

-- v_L · Luftgeschwindigkeit in Rohrleitungen
update public.fields set verification_status='verified_against_standard', verification_quote='Für die Luftgeschwindigkeit in Rohrleitungen kann als Orientierungswert ein $v_{\mathrm{L}}$ von $\approx 10 \mathrm{~m} / \mathrm{s}$ angenommen werden. — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3, printed p.13) [VC]', verified_at=now() where id='7fd236ad-c8d5-48aa-9139-ab37097aed8d' and verification_status not in ('verified_against_standard','corrected');

-- alphaOP · Sauerstoffertrag in belebtem Schlamm
update public.fields set verification_status='verified_against_standard', verification_quote='Für Oberflächenbelüfter unter Betriebsbedingungen (bei z. B. im Alltagsbetrieb nicht optimaler Eintauchtiefe) kann mit einem Sauerstoffertrag $\alpha O P$ von $1,2 \mathrm{~kg} / \mathrm{kWh}$ bis $1,5 \mathrm{~kg} / \mathrm{kWh}$ gerechnet werden. — printed p.13–14', verification_note='md-verified 2026-09-07 (§3.3.3, printed p.13–14) [VC]', verified_at=now() where id='2c1ffa2b-6f98-43d1-a16d-253e287cf7ba' and verification_status not in ('verified_against_standard','corrected');

-- alphaOC · Erforderliche Sauerstoffzufuhr in belebtem Schlamm
update public.fields set verification_status='verified_against_standard', verification_quote='Folgende Formel ermöglicht die Berechnung der erforderlichen Sauerstoffzufuhr unter Betriebsbedingungen in belebtem Schlamm: | \alpha O C=\frac{O_{\mathrm{B}} \times B_{\mathrm{d}, \mathrm{BSB}}}{24}[\mathrm{~kg} / \mathrm{h}] \tag{12} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3 Gl.12, printed p.13) [VC]', verified_at=now() where id='04ff5d64-88ef-4f01-8553-3d0e0c902538' and verification_status not in ('verified_against_standard','corrected');

-- alphaOC_int · Sauerstoffzufuhr bei intermittierender Denitrifikation
update public.fields set verification_status='verified_against_standard', verification_quote='Die erforderliche Sauerstoffzufuhr unter Betriebsbedingungen ergibt sich unter Berücksichtigung der belüftungsfreien Zeiten bei intermittierender Denitrifikation zu: | \alpha O C=0,1 \times B_{\mathrm{d}, \text { BSB }} \times \frac{1}{1-t_{\mathrm{D}} /\left(t_{\mathrm{D}}+t_{\mathrm{N}}\right)} \quad[\mathrm{kg} / \mathrm{h}] \tag{15} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3 Gl.15, printed p.13) [VC]', verified_at=now() where id='4ae75183-852a-4f5f-8120-c16da844c69d' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- A226-07 — Bemessung der Nachklaerung (17 fields)
-- ---------------------------------------------------------------------------

-- t_E · Erforderliche Eindickzeit
update public.fields set verification_status='verified_against_standard', verification_quote='Die Eindickzeit sollte für Belebungsanlagen mit Nitrifikation zu $t_{\mathrm{E}}=1,5 \mathrm{~h}$; für Belebungsanlagen mit Denitrifikation zu $t_{\mathrm{E}}=2 \mathrm{~h}$ angesetzt werden. — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, printed p.14) [VC]', verified_at=now() where id='cd488974-1de5-4c7c-8b61-a0f695ddea5a' and verification_status not in ('verified_against_standard','corrected');

-- TS_BB · Trockensubstanzgehalt im Belebungsbecken
update public.fields set verification_status='verified_against_standard', verification_quote='Der Trockensubstanzgehalt im Belebungsbecken ( $T S_{\mathrm{BB}}$ ) ergibt sich damit zu: $T S_{\mathrm{BB}}=\frac{R V \times T S_{\mathrm{RS}}}{1+R V}\left[\mathrm{~kg} / \mathrm{m}^{3}\right](\mathrm{Gl} .6-2$ aus ATV-DVWK-A 131) — printed p.14', verification_note='md-verified 2026-09-07 (§3.4 Gl.21, printed p.14) [VC]', verified_at=now() where id='d6d37550-d1af-440f-b0ef-f4016a5f7a4b' and verification_status not in ('verified_against_standard','corrected');

-- RV · Ruecklaufverhaeltnis
update public.fields set verification_status='verified_against_standard', verification_quote='Das Rücklaufverhältnis $R V$ kann bei vorwiegend vertikal durchströmten Nachklärbecken gemäß Arbeitsblatt ATV-DVWK-A 131 bis auf maximal $R V=1$ (entspricht $Q_{\text {bem }}$ ) angehoben werden. Sofern Nachklär- und Belebungsbecken als bautechnische Einheit ausgebildet werden, kann durch Wahl des Rücklaufverhältnisses eine bautechnische Optimierung erreicht werden. — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, printed p.14) [VC]', verified_at=now() where id='c60372a9-fa4d-46b4-8e20-4ce82eddb5c8' and verification_status not in ('verified_against_standard','corrected');

-- TS_RS · Trockensubstanzgehalt des Ruecklaufschlammes
update public.fields set verification_status='verified_against_standard', verification_quote='Für den Trockensubstanzgehalt des Rücklaufschlammes ( $T S_{\mathrm{RS}}$ ) kann vereinfacht angenommen werden: - $T S_{\mathrm{RS}} \approx 0,7 \times T S_{\mathrm{BS}}\left[\mathrm{kg} / \mathrm{m}^{3}\right]$ bei Rundbecken mit Schildräumern - $T S_{\mathrm{RS}} \approx 1,0 \times T S_{\mathrm{BS}}\left[\mathrm{kg} / \mathrm{m}^{3}\right]$ bei Trichterbecken — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, printed p.14) [VC]', verified_at=now() where id='7e96add8-7d2c-4b45-8438-b5e94f742084' and verification_status not in ('verified_against_standard','corrected');

-- q_SV · Schlammvolumenbeschickung
update public.fields set verification_status='verified_against_standard', verification_quote='Die zulässige Schlammvolumenbeschickung $q_{\mathrm{SV}}$ kann bei vorwiegend vertikaler Durchströmung zu maximal $650 \mathrm{l} /\left(\mathrm{m}^{2} \times \mathrm{h}\right)$ gewählt werden. Dabei darf die zulässige Flächenbeschickung $q_{\mathrm{A}}$ nicht größer als nach Gleichung 6-3 aus Arbeitsblatt ATV-DVWK-A 131 und nicht höher als $q_{\mathrm{A}}=2 \mathrm{~m} / \mathrm{h}$ liegen. — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, printed p.14) [VC]', verified_at=now() where id='33915d65-58cc-4d7b-b971-feae62a1b05d' and verification_status not in ('verified_against_standard','corrected');

-- h_z · Tiefe des zylindrischen Aufsatzes Trichterbecken
update public.fields set verification_status='verified_against_standard', verification_quote='Die erforderlichen Beckentiefen betragen: | & h_{\mathrm{z}} \quad \leq 1 \mathrm{~m} \\ — printed p.15–16', verification_note='md-verified 2026-09-07 (§3.4, printed p.15–16) [VC]', verified_at=now() where id='b18db483-bdd8-44a0-b362-313c86ba4547' and verification_status not in ('verified_against_standard','corrected');

-- h_theo · Theoretisch erforderliche Tiefe Trichterbecken
update public.fields set verification_status='verified_against_standard', verification_quote='\caption{Tabelle 6: Zulässige Oberflächenbeschickung bei Trichterbecken in Abhängigkeit vom RV und der Art der Abwasserbehandlung} | \end{tabular}} & 0,75 & 1,3 & 5,30 \\ \hline & 1 & 1,1 & 6,05 \\ | \end{tabular}} & 0,75 & 1,2 & 5,65 \\ \hline & 1 & 1 & 6,55 \\ — printed p.15', verification_note='md-verified 2026-09-07 (§3.4 Tab.6, printed p.15) [VC]', verified_at=now() where id='2b780154-1a0a-44f3-b614-f5d6e54f3f27' and verification_status not in ('verified_against_standard','corrected');

-- TS_BS · Trockensubstanzgehalt im Bodenschlamm
update public.fields set verification_status='verified_against_standard', verification_quote='Der Trockensubstanzgehalt im Bodenschlamm des Nachklärbeckens $\left(T S_{\mathrm{BS}}\right)$ kann wie folgt abgeschätzt werden: | T S_{\mathrm{BS}}=\frac{1.000}{I S V} \sqrt[3]{t_{\mathrm{E}}}\left[\mathrm{~kg} / \mathrm{m}^{3}\right] \text { (Gl. 6-1 aus ATV-DVWK-A 131) } — printed p.14', verification_note='md-verified 2026-09-07 (§3.4 Gl.18, printed p.14) [VC]', verified_at=now() where id='7125c39b-04dd-4ecc-9070-d3b6c33ef752' and verification_status not in ('verified_against_standard','corrected');

-- TS_RS_rund · TS-Gehalt Ruecklaufschlamm Rundbecken
update public.fields set verification_status='verified_against_standard', verification_quote='Für den Trockensubstanzgehalt des Rücklaufschlammes ( $T S_{\mathrm{RS}}$ ) kann vereinfacht angenommen werden: - $T S_{\mathrm{RS}} \approx 0,7 \times T S_{\mathrm{BS}}\left[\mathrm{kg} / \mathrm{m}^{3}\right]$ bei Rundbecken mit Schildräumern — printed p.14', verification_note='md-verified 2026-09-07 (§3.4 Gl.19, printed p.14) [VC]', verified_at=now() where id='7a2f065b-0de4-4d6e-b3c8-caf979543384' and verification_status not in ('verified_against_standard','corrected');

-- TS_RS_trichter · TS-Gehalt Ruecklaufschlamm Trichterbecken
update public.fields set verification_status='verified_against_standard', verification_quote='Für den Trockensubstanzgehalt des Rücklaufschlammes ( $T S_{\mathrm{RS}}$ ) kann vereinfacht angenommen werden: | - $T S_{\mathrm{RS}} \approx 1,0 \times T S_{\mathrm{BS}}\left[\mathrm{kg} / \mathrm{m}^{3}\right]$ bei Trichterbecken — printed p.14', verification_note='md-verified 2026-09-07 (§3.4 Gl.20, printed p.14) [VC]', verified_at=now() where id='55a3fc83-dae2-4249-b86b-2b9d833d1bbd' and verification_status not in ('verified_against_standard','corrected');

-- q_A · Flaechenbeschickung der Nachklaerung
update public.fields set verification_status='verified_against_standard', verification_quote='Die Flächenbeschickung ( $q_{\mathrm{A}}$ ) errechnet sich zu: $q_{\mathrm{A}}=\frac{q_{\mathrm{SV}}}{T S_{\mathrm{BB}} \times I S V}[\mathrm{~m} / \mathrm{h}]$ (Gl. 6-3 aus ATV-DVWK-A 131) | Die zulässige Schlammvolumenbeschickung $q_{\mathrm{SV}}$ kann bei vorwiegend vertikaler Durchströmung zu maximal $650 \mathrm{l} /\left(\mathrm{m}^{2} \times \mathrm{h}\right)$ gewählt werden. Dabei darf die zulässige Flächenbeschickung $q_{\mathrm{A}}$ nicht größer als nach Gleichung 6-3 aus Arbeitsblatt ATV-DVWK-A 131 und nicht höher als $q_{\mathrm{A}}=2 \mathrm{~m} / \mathrm{h}$ liegen. — printed p.14', verification_note='md-verified 2026-09-07 (§3.4 Gl.22, printed p.14) [VC]', verified_at=now() where id='68d7983c-9c91-4270-af79-a00f7c283db0' and verification_status not in ('verified_against_standard','corrected');

-- A_NB · Oberflaeche des Nachklaerbeckens (Rundbecken)
update public.fields set verification_status='verified_against_standard', verification_quote='Die erforderliche Beckenoberfläche ergibt sich zu: | A_{\mathrm{NB}}=\frac{Q_{\mathrm{bem}}}{q_{\mathrm{A}}} \quad\left[\mathrm{~m}^{2}\right] \tag{24} — printed p.15', verification_note='md-verified 2026-09-07 (§3.4 Gl.24, printed p.15) [VC]', verified_at=now() where id='6dd66ebc-23fb-43e1-b519-19c359b58e0c' and verification_status not in ('verified_against_standard','corrected');

-- A_NB_theo · Theoretische Oberflaeche Trichterbecken
update public.fields set verification_status='verified_against_standard', verification_quote='Die theoretisch erforderliche Beckenoberfläche ergibt sich zu: | A_{\mathrm{NB}, \text { theo }}=\frac{Q_{\mathrm{bem}}}{q_{\mathrm{A}}} \quad\left[\mathrm{~m}^{2}\right] \tag{25} — printed p.15', verification_note='md-verified 2026-09-07 (§3.4 Gl.25, printed p.15) [VC]', verified_at=now() where id='a399d5a3-3f68-405c-ba70-93830fd6c2ea' and verification_status not in ('verified_against_standard','corrected');

-- h_ges · Gesamtwassertiefe Nachklaerbecken
update public.fields set verification_status='verified_against_standard', verification_quote='Die erforderlichen Beckentiefen betragen: | & h_{\text {ges }}=\sqrt[3]{A_{\mathrm{NB}, \text { theo }} \times h_{\text {theo }} \times 3}  \tag{26}\\ — printed p.15–16', verification_note='md-verified 2026-09-07 (§3.4 Gl.26, printed p.15–16) [VC]', verified_at=now() where id='b32c5355-96a8-4661-8e8e-c251f8c633ba' and verification_status not in ('verified_against_standard','corrected');

-- h_t · Tiefe des Trichters
update public.fields set verification_status='verified_against_standard', verification_quote='Die erforderlichen Beckentiefen betragen: | & h_{\mathrm{t}}=h_{\text {ges }}-h_{\mathrm{z}}[\mathrm{~m}]  \tag{27}\\ — printed p.15–16', verification_note='md-verified 2026-09-07 (§3.4 Gl.27, printed p.15–16) [VC]', verified_at=now() where id='ccddde25-fd5f-43ba-bfe6-759e0969d301' and verification_status not in ('verified_against_standard','corrected');

-- h_e · Mittlere Tiefe des Einlaufs
update public.fields set verification_status='verified_against_standard', verification_quote='Die erforderlichen Beckentiefen betragen: | & h_{\mathrm{e}} \cong h_{\text {ges }} \times 0,3 \quad[\mathrm{~m}] \tag{28} — printed p.15–16', verification_note='md-verified 2026-09-07 (§3.4 Gl.28, printed p.15–16) [VC]', verified_at=now() where id='af75e890-12cb-4b24-996c-8e9548c59647' and verification_status not in ('verified_against_standard','corrected');

-- r_NB · Radius des Nachklaerbeckens (Trichterbecken)
update public.fields set verification_status='verified_against_standard', verification_quote='Der erforderliche Radius $r_{\mathrm{NB}}$ des Trichterbeckens ermittelt sich zu: | r_{\mathrm{NB}}=\frac{h_{g e s}-h_{z}}{1,7} \quad[\mathrm{~m}] \tag{29} — printed p.16', verification_note='md-verified 2026-09-07 (§3.4 Gl.29, printed p.16) [VC]', verified_at=now() where id='c8902f3b-2037-4877-ace8-39e4250134e5' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- A226-08 — Baugrundsaetze und Schlammbehandlung (7 fields)
-- ---------------------------------------------------------------------------

-- notstromversorgung · Notstromversorgung vorhanden
update public.fields set verification_status='verified_against_standard', verification_quote='Gegen Betriebsstörungen infolge Netzstromausfalls müssen Vorkehrungen getroffen werden. Geeignet sind eine zweiseitige Stromeinspeisung oder ein stationäres Notstromaggregat. Bei Nachweis entsprechender Reaktionszeiten kann insbesondere im unteren Geltungsbereich auch ein Anschluss für ein an anderer Stelle vorzuhaltendes, mobiles Notstromaggregat ausreichen. Betriebswichtige EMSR-Anlagen, insbesondere Computertechnik, müssen mit einer Unterspannungsversorgung (USV) ausgestattet werden. Einzelne Aggregate sollten bei Ausfall von Steuer-/Regeleinheiten von Hand bedienbar sein. — printed p.19', verification_note='md-verified 2026-09-07 (§4.9, printed p.19) [VC]', verified_at=now() where id='5aea5ad5-da06-4921-89a7-019b40821748' and verification_status not in ('verified_against_standard','corrected');

-- reservepumpe · Reservepumpe gleicher Baugroesse
update public.fields set verification_status='verified_against_standard', verification_quote='Diese möglichen Betriebsstörungen erfordern geeignete Einrichtungen, z. B. für die notwendigen Wartungs- und Reparaturarbeiten und eine Reservepumpe gleicher Baugröße. Betriebssicherheit geht vor Kosten- und Energieeinsparungen. — printed p.16', verification_note='md-verified 2026-09-07 (§4.2, printed p.16) [VC]', verified_at=now() where id='a63e1146-3ea1-4d8b-b2a9-46691f39148d' and verification_status not in ('verified_against_standard','corrected');

-- durchtrittsweite_rechen · Durchtrittsweite Rechen/Siebe
update public.fields set verification_status='verified_against_standard', verification_quote='Eingesetzt werden Rechen oder Siebe mit Durchtrittsweiten von 3 mm bis 8 mm . — printed p.17', verification_note='md-verified 2026-09-07 (§4.5.1, printed p.17) [VC]', verified_at=now() where id='6aeb8db6-a8f1-4f60-8606-b9c410b48c07' and verification_status not in ('verified_against_standard','corrected');

-- abscheidegrad_sandfang · Abscheidegrad Sandfang
update public.fields set verification_status='verified_against_standard', verification_quote='In der Regel wird damit eine weitgehende Ausscheidung des Sandes und des anorganischen Materials bis zu einer Korngröße von $0,2 \mathrm{~mm}$ bis $0,1 \mathrm{~mm}$ erreicht. Es sollte ein Abscheidegrad von größer $95 \%$ für die Korngröße $0,2 \mathrm{~mm}$ erreicht werden. — printed p.17', verification_note='md-verified 2026-09-07 (§4.5.2, printed p.17) [VC]', verified_at=now() where id='dc1b3260-20a5-446d-9ae2-964f19d925ef' and verification_status not in ('verified_against_standard','corrected');

-- stapelzeit_schlamm · Speicher-/Stapelzeit Ueberschussschlamm
update public.fields set verification_status='verified_against_standard', verification_quote='Für die erwarteten Überschussschlammmengen sollte möglichst Speichervolumen für folgende Stapelzeiten bereitgestellt werden: - bei ganzjährig gesicherter Abfuhr, entsprechend des Entsorgungskonzeptes $\geq 1$ Monat - bei landwirtschaftlicher Verwertung zur Überbrückung einer Vegetationsperiode oder des Winters $\geq 6$ Monate — printed p.20', verification_note='md-verified 2026-09-07 (§5.2, printed p.20) [VC]', verified_at=now() where id='a0975679-cbeb-49e2-ba97-217e6fff4d11' and verification_status not in ('verified_against_standard','corrected');

-- leistungsdichte_silo · Leistungsdichte Umwaelzung Schlammsilo
update public.fields set verification_status='verified_against_standard', verification_quote='Umwälzeinrichtungen sollten eine Leistungsdichte von $30 \mathrm{~W} / \mathrm{m}^{3}$ bis $70 \mathrm{~W} / \mathrm{m}^{3}$ je nach Behältergröße und Schlammbeschaffenheit aufweisen. — printed p.20', verification_note='md-verified 2026-09-07 (§5.2, printed p.20) [VC]', verified_at=now() where id='910dd6e4-6011-4b4e-82cf-cccfe1f204fb' and verification_status not in ('verified_against_standard','corrected');

-- durchflussmessung · Durchflussmesseinrichtung vorhanden
update public.fields set verification_status='verified_against_standard', verification_quote='Kläranlagen im Geltungsbereich dieses Arbeitsblattes müssen mit einer geeigneten Durchflussmesseinrichtung ausgerüstet werden. Eine Anordnung der Messeinrichtungen im Ablauf hat auch wegen verminderter Verstopfungsgefahr Vorteile. Ein sicherer Zugang zur Messstelle muss gewährleistet sein. Weitere Hinweise zur Ausführung und Anordnung von Messeinrichtungen sind der DIN 19559 „Durchflußmessung von Abwasser in offenen Gerinnen und Freispiegelleitungen" zu entnehmen. — printed p.16–17', verification_note='md-verified 2026-09-07 (§4.3, printed p.16–17) [VC]', verified_at=now() where id='dea3f17a-c9c7-4743-bbde-d276b2e4f1b4' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- A226-09 — Betrieb und Nachweise (7 fields)
-- ---------------------------------------------------------------------------

-- T · Temperatur im Ablauf des Belebungsbeckens
update public.fields set verification_status='verified_against_standard', verification_quote='Die Bemessung der Kläranlagen nach diesem Arbeitsblatt erfolgt für eine Temperatur von $12^{\circ} \mathrm{C}$. Die tatsächlichen Betriebswerte werden von diesen theoretischen Werten abweichen und ergeben sich vor allem aus den tatsächlichen Bedingungen vor Ort, der Auslastung der Anlage und der Wassertemperatur. — printed p.22', verification_note='md-verified 2026-09-07 (§6.3, printed p.22) [VC]', verified_at=now() where id='8cd8cabe-5403-43e2-946a-70d7c13e1bf7' and verification_status not in ('verified_against_standard','corrected');

-- belueftungsanteil · Beluefteter Anteil / anteilige Belueftungszeit
update public.fields set verification_status='verified_against_standard', verification_quote='- Belüftungsdauer bzw. belüfteter Volumenanteil mindestens $65 \%$ bis $70 \%$; | Der belüftete Anteil des Belebungsbeckens, bzw. die anteilige Belüftungszeit können grundsätzlich zwischen mindestens $50 \%$ und maximal $100 \%$ variiert werden, wobei bei < $65 \%$ die Gefahr der Blähschlammbildung besteht. In Bild 3 sind in Abhängigkeit von der Temperatur die Mindestbelüftungsvolumenanteile bzw. -zeitanteile ablesbar, die erforderlich sind, um eine aerobe Schlammstabilisierung zu gewährleisten (Bereich oberhalb der Kurve). — printed p.22', verification_note='md-verified 2026-09-07 (§6.2 / §6.3, printed p.22) [VC]', verified_at=now() where id='f0d7a2fc-e0d0-4f3d-9028-a672c2a405f2' and verification_status not in ('verified_against_standard','corrected');

-- gluehverlust · Glühverlust des Schlammes
update public.fields set verification_status='verified_against_standard', verification_quote='Zum näherungsweisen Nachweis der Stabilisierung dient die Bestimmung des Glühverlustes. Wird ein Glühverlust von ca. 55 \% überschritten, sollte die Betriebsweise der Anlage überprüft werden. — printed p.22', verification_note='md-verified 2026-09-07 (§6.2, printed p.22) [VC]', verified_at=now() where id='4b3e076b-90e0-4306-af2c-8bfc92379691' and verification_status not in ('verified_against_standard','corrected');

-- sauerstoffgehalt_bb · Sauerstoffgehalt im Belebungsbecken
update public.fields set verification_status='verified_against_standard', verification_quote='Zur Sicherstellung der Schlammstabilisierung und Minimierung der Blähschlamm- und Schwimmschlammgefahr können folgende Vorgaben zielführend sein: | - Sauerstoffgehalt im Belebungsbecken mindestens $1,5 \mathrm{mg} / \mathrm{l}$ während der Belüftungszeit. Zu hohe Sauerstoffgehalte, insbesondere gegen Ende der Belüftungsphase sollten im Hinblick auf die Denitrifikation vermieden werden. Das lässt sich durch eine Regelung der Sauerstoffkonzentration erreichen; — printed p.22', verification_note='md-verified 2026-09-07 (§6.2, printed p.22) [VC]', verified_at=now() where id='a16d9479-b4ab-4be2-a501-ca3c984ac467' and verification_status not in ('verified_against_standard','corrected');

-- ammonium_ablauf · Ammonium-Gehalt im Ablauf der Belebung
update public.fields set verification_status='verified_against_standard', verification_quote='Zur Sicherstellung der Schlammstabilisierung und Minimierung der Blähschlamm- und Schwimmschlammgefahr können folgende Vorgaben zielführend sein: | - Ammonium-Gehalt im Ablauf der Belebung ständig unter $1 \mathrm{mg} / \mathrm{l}$ halten - auch bei höchster Belastung (Minimierung durch Verkürzung der Taktdauer möglich); — printed p.22', verification_note='md-verified 2026-09-07 (§6.2, printed p.22) [VC]', verified_at=now() where id='8ceace60-76ed-4f18-b514-4b82c893e63f' and verification_status not in ('verified_against_standard','corrected');

-- restsaeurekapazitaet · Restsaeurekapazitaet im Ablauf
update public.fields set verification_status='verified_against_standard', verification_quote='Zudem ist bei einer derartigen Auslegung auch die Gefahr einer Restsäurekapazitätsunterschreitung von $1,5 \mathrm{mmol} / \mathrm{l}$ im Ablauf der Kläranlage deutlich geringer. — printed p.21–22', verification_note='md-verified 2026-09-07 (§6.2, printed p.21–22) [VC]', verified_at=now() where id='0fa934ff-6f62-469a-9496-d07e665c66f7' and verification_status not in ('verified_against_standard','corrected');

-- TS_BB_betrieb · Einzustellender TS_BB im Betrieb
update public.fields set verification_status='verified_against_standard', verification_quote='Mit steigender Temperatur im Belebungsbecken kann über $12^{\circ} \mathrm{C}$ neben dem Belüftungsanteil auch der $T S_{\mathrm{BB}}$ reduziert werden. In Bild 4 ist der Mindest- $T S_{\text {BB,Betrieb }}$ als $[\%]$ vom $T S_{\text {BB,Bemessung }}$ je nach tatsächlichem Belüftungsvolumenanteil bzw. -zeitanteil dargestellt, bei dem eine aerobe Schlammstabilisierung gewährleistet ist (Bereiche jeweils oberhalb der Kurven). | Da es einen linearen Zusammenhang gibt, kann bei niedrigerer tatsächlicher Auslastung der $T S_{\text {BB,Betrieb }}$ entsprechend prozentual reduziert werden, das heißt z. B. bei 50 \% Auslastung kann $T S_{\text {BB,Betrieb }} \geq 0,5 \times T S_{\text {BB,Bemessung }}$ sein. — printed p.23', verification_note='md-verified 2026-09-07 (§6.3, printed p.23) [VC]', verified_at=now() where id='6ff07a28-3c47-45a9-8154-03427bbdab7b' and verification_status not in ('verified_against_standard','corrected');


-- ---------------------------------------------------------------------------
-- EQUATIONS — quote backfill only.
-- All 28 equations are already verified (23 verified_against_standard, 5 verified_via_cross_reference
-- for the four formulas the Arbeitsblatt cites out of ATV-DVWK-A 131 plus Gl.10) but carry
-- verification_quote = NULL. These statements write the printed formula + its lead-in sentence and a
-- note; the guard "verification_quote is null" and the absence of verification_status from the SET
-- list mean NO status is changed by this pack.
-- ---------------------------------------------------------------------------

-- Gl.1 · A226-03 · Q_S_aM
update public.equations set verification_quote='Der tägliche Schmutzwasseranfall berechnet sich zu: | Q_{\mathrm{s}, \mathrm{am}}=E Z \times w_{\mathrm{s}, \mathrm{d}} / 86.400+Q_{\mathrm{G}, \mathrm{aM}}[1 / \mathrm{s}] \tag{1} — printed p.10', verification_note='md-verified 2026-09-07 (§3.2, Gl. 1, printed p.10) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='ecbfef20-2e5f-4e9a-b069-9547ba0bc7fe' and verification_quote is null;

-- Gl.2 · A226-03 · Q_bem
update public.equations set verification_quote='Die hydraulische Bemessung der Anlagen im Trennsystem richtet sich nach dem maximalen stündlichen Abfluss bei Trockenwetter. | Q_{\mathrm{bem}}=Q_{\mathrm{T}, \mathrm{h}, \text { max }}=24 \times Q_{\mathrm{S}, \mathrm{aM}} / x_{\mathrm{Q} \text { max }}+Q_{\mathrm{F}}+Q_{\mathrm{R}, \mathrm{Tr}}[\mathrm{l} / \mathrm{s}] \tag{2} — printed p.10', verification_note='md-verified 2026-09-07 (§3.2, Gl. 2, printed p.10) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='1830390e-d518-43a0-be89-2fa9503fdeec' and verification_quote is null;

-- Gl.3 · A226-03 · Q_bem_misch
update public.equations set verification_quote='Für die hydraulische Bemessung der Anlagen im Mischsystem erfolgt die Ermittlung des maßgeblichen Zuflusses zu: | Q_{\text {bem }}=f_{\mathrm{S}, \mathrm{QM}} \times Q_{\mathrm{S}, \mathrm{aM}}+Q_{\mathrm{F}} \quad[1 / \mathrm{s}] \tag{3} — printed p.10', verification_note='md-verified 2026-09-07 (§3.2, Gl. 3, printed p.10) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='e0f09052-3a9f-4785-90ed-c97a4680bc59' and verification_quote is null;

-- Gl.4 · A226-03 · Q_F
update public.equations set verification_quote='Fremdwasserzufluss $Q_{\mathrm{F}}$ und unvermeidlicher Regenabfluss im Trennkanal $Q_{\mathrm{R}, \mathrm{Tr}}$ : | Q_{\mathrm{F}} \quad=q_{\mathrm{F}} \times A_{\mathrm{E}, \mathrm{k}} \quad[1 / \mathrm{s}] \tag{4} — printed p.10', verification_note='md-verified 2026-09-07 (§3.2, Gl. 4, printed p.10) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='8884edee-8c7b-46e7-9a8e-ec502ba62f87' and verification_quote is null;

-- Gl.5 · A226-03 · Q_R_Tr
update public.equations set verification_quote='Fremdwasserzufluss $Q_{\mathrm{F}}$ und unvermeidlicher Regenabfluss im Trennkanal $Q_{\mathrm{R}, \mathrm{Tr}}$ : | Q_{\mathrm{R}, \mathrm{Tr}}=q_{\mathrm{R}, \mathrm{Tr}} \times A_{\mathrm{E}, \mathrm{k}} \quad[1 / \mathrm{s}] \tag{5} — printed p.10', verification_note='md-verified 2026-09-07 (§3.2, Gl. 5, printed p.10) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='be5d6bab-faae-4b6a-804d-642bb1116989' and verification_quote is null;

-- Gl.6 · A226-03 · Q_F_R_Tr
update public.equations set verification_quote='Regionalspezifische Besonderheiten müssen beachtet werden. Dann ist: | Q_{\mathrm{F}}+Q_{\mathrm{R}, \mathrm{Tr}}=m \times 24 \times Q_{\mathrm{S}, \mathrm{aM}} / x_{\mathrm{Q} \text { max }} \quad[1 / \mathrm{s}] \tag{6} — printed p.10–11', verification_note='md-verified 2026-09-07 (§3.2, Gl. 6, printed p.10–11) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='df13e6a9-5ab6-4976-b0af-4e1a93365366' and verification_quote is null;

-- Gl.7 · A226-04 · US_d
update public.equations set verification_quote='Der in einer Belebungsanlage produzierte Schlamm setzt sich aus den beim Abbau organischer Stoffe entstehenden und eingelagerten Feststoffen sowie dem aus der Phosphorelimination resultierenden Schlamm zusammen: | \ddot{U} S_{\mathrm{d}}=\ddot{U} S_{\mathrm{d}, \mathrm{C}}+\ddot{U} S_{\mathrm{d}, \mathrm{P}}[\mathrm{kg} / \mathrm{d}] \tag{7} — printed p.11', verification_note='md-verified 2026-09-07 (§3.3.1, Gl. 7, printed p.11) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='602cf9bd-fe1e-4c73-8654-c18cbfb1cac1' and verification_quote is null;

-- Gl.8 · A226-04 · US_d_C
update public.equations set verification_quote='Schlammproduktion aus der Kohlenstoffelimination: | \ddot{U} S_{\mathrm{d}, \mathrm{C}}=\ddot{U} S_{\mathrm{C}, \mathrm{BSB}} \times B_{\mathrm{d}, \mathrm{BSB}}=1,0 \times B_{\mathrm{d}, \mathrm{BSB}}[\mathrm{kg} / \mathrm{d}] \tag{8} — printed p.11', verification_note='md-verified 2026-09-07 (§3.3.1, Gl. 8, printed p.11) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='904ec4e0-c7c2-4491-b123-08e34c25cc05' and verification_quote is null;

-- Gl.9 · A226-05 · M_TS_BB
update public.equations set verification_quote='Erforderliche Masse der Feststoffe im Belebungsbecken $M_{\mathrm{TS}, \mathrm{BB}}=t_{\mathrm{TS}} \times \ddot{U} S_{\mathrm{d}} \quad[\mathrm{kg}]$ (Gl. 5-15 aus ATV-DVWK-A 131) — printed p.11', verification_note='md-verified 2026-09-07 (§3.3.2, Gl. 9 (Gl. 5-15 aus ATV-DVWK-A 131), printed p.11) [VC] — quote backfill only; verification_status left unchanged (was verified_via_cross_reference)', verified_at=now() where id='98f74b78-02e7-403e-a89b-56080b34e7d0' and verification_quote is null;

-- Gl.10 · A226-05 · V_BB
update public.equations set verification_quote='Volumen des Belebungsbeckens $V_{\mathrm{BB}}=\frac{M_{\mathrm{TS}, \mathrm{BB}}}{T S_{\mathrm{BB}}}\left[\mathrm{m}^{3}\right]$ (Gl. 5-16 aus ATV-DVWK-A 131) — printed p.11', verification_note='md-verified 2026-09-07 (§3.3.2, Gl. 10 (Gl. 5-16 aus ATV-DVWK-A 131), printed p.11) [VC] — quote backfill only; verification_status left unchanged (was verified_via_cross_reference)', verified_at=now() where id='3e837c29-ecac-4d27-bbc7-b60411effb85' and verification_quote is null;

-- Gl.11 · A226-05 · V_BB_spez
update public.equations set verification_quote='Werden alle Standardvorgaben dieses Arbeitsblattes verwendet, errechnet sich das erforderliche Belebungsbeckenvolumen zu: | V_{\mathrm{BB}}=E W_{\mathrm{BSB} 5,60} \times f_{\mathrm{BB}} / 1.000 \quad\left[\mathrm{~m}^{3}\right] \tag{11} — printed p.12', verification_note='md-verified 2026-09-07 (§3.3.2, Gl. 11, printed p.12) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='11bc516b-84c2-4c56-95bd-5885ed59b78e' and verification_quote is null;

-- Gl.12 · A226-06 · alphaOC
update public.equations set verification_quote='Folgende Formel ermöglicht die Berechnung der erforderlichen Sauerstoffzufuhr unter Betriebsbedingungen in belebtem Schlamm: | \alpha O C=\frac{O_{\mathrm{B}} \times B_{\mathrm{d}, \mathrm{BSB}}}{24}[\mathrm{~kg} / \mathrm{h}] \tag{12} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3, Gl. 12, printed p.13) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='97dea9eb-79d5-4e67-9cca-65916200627f' and verification_quote is null;

-- Gl.13 · A226-06 · O_B_Nitr
update public.equations set verification_quote='$O_{\mathrm{B}} \geq 3 \mathrm{~kg} / \mathrm{kg}$ für Anlagen mit Nitrifikation | Somit ist für Anlagen mit Nitrifikation: | \alpha O C=\frac{3 \times B_{\mathrm{d}, \mathrm{BSB}}}{24} \approx 0,12 \times B_{\mathrm{d}, \mathrm{BSB}} \quad[\mathrm{~kg} / \mathrm{h}] \tag{13} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3, Gl. 13, printed p.13) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='dc1acce0-5a4b-4113-8f92-831c3dbae887' and verification_quote is null;

-- Gl.14 · A226-06 · O_B_Deni
update public.equations set verification_quote='$O_{\mathrm{B}} \geq 2,5 \mathrm{~kg} / \mathrm{kg}$ für Anlagen mit Denitrifikation | Für Anlagen mit Denitrifikation: | \alpha O C=\frac{2,5 \times B_{\mathrm{d}, \mathrm{BSB}}}{24} \approx 0,1 \times B_{\mathrm{d}, \mathrm{BSB}} \quad[\mathrm{~kg} / \mathrm{h}] \tag{14} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3, Gl. 14, printed p.13) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='547eb7bd-c4da-479a-8498-a43c7678fbd1' and verification_quote is null;

-- Gl.15 · A226-06 · alphaOC_int
update public.equations set verification_quote='Die erforderliche Sauerstoffzufuhr unter Betriebsbedingungen ergibt sich unter Berücksichtigung der belüftungsfreien Zeiten bei intermittierender Denitrifikation zu: | \alpha O C=0,1 \times B_{\mathrm{d}, \text { BSB }} \times \frac{1}{1-t_{\mathrm{D}} /\left(t_{\mathrm{D}}+t_{\mathrm{N}}\right)} \quad[\mathrm{kg} / \mathrm{h}] \tag{15} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3, Gl. 15, printed p.13) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='a22e2ec6-0732-4982-a849-e6388e34b1d8' and verification_quote is null;

-- Gl.16 · A226-06 · t_T
update public.equations set verification_quote='Die Taktdauer $t_{\mathrm{T}}$ ergibt sich zu: | t_{\mathrm{T}}=t_{\mathrm{D}}+t_{\mathrm{N}} \quad[\mathrm{~h}] \tag{16} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3, Gl. 16, printed p.13) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='2a086691-ef97-4fd4-b5ca-b9c0afb1b62c' and verification_quote is null;

-- Gl.17 · A226-06 · Q_L_St
update public.equations set verification_quote='Der Luftvolumenstrom zur Abdeckung der erforderlichen Sauerstoffzufuhr in belebtem Schlamm ( $\alpha O C$ ) errechnet sich in Abhängigkeit von der Einblastiefe $h_{\mathrm{E}}$ zu: | Q_{\mathrm{L}, \mathrm{St}}=\frac{\alpha O C}{\alpha O C_{\mathrm{L}, \mathrm{~h}} \times h_{\mathrm{E}}}\left[\mathrm{~m}^{3} / \mathrm{h}\right] \tag{17} — printed p.13', verification_note='md-verified 2026-09-07 (§3.3.3, Gl. 17, printed p.13) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='a4995d08-b2b9-4c41-b584-bd4931177bdb' and verification_quote is null;

-- Gl.18 · A226-07 · TS_BS
update public.equations set verification_quote='Der Trockensubstanzgehalt im Bodenschlamm des Nachklärbeckens $\left(T S_{\mathrm{BS}}\right)$ kann wie folgt abgeschätzt werden: | T S_{\mathrm{BS}}=\frac{1.000}{I S V} \sqrt[3]{t_{\mathrm{E}}}\left[\mathrm{~kg} / \mathrm{m}^{3}\right] \text { (Gl. 6-1 aus ATV-DVWK-A 131) } — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, Gl. 18 (Gl. 6-1 aus ATV-DVWK-A 131), printed p.14) [VC] — quote backfill only; verification_status left unchanged (was verified_via_cross_reference)', verified_at=now() where id='622e9035-4e55-475d-afb0-ef6a8561400b' and verification_quote is null;

-- Gl.19 · A226-07 · TS_RS_rund
update public.equations set verification_quote='Für den Trockensubstanzgehalt des Rücklaufschlammes ( $T S_{\mathrm{RS}}$ ) kann vereinfacht angenommen werden: - $T S_{\mathrm{RS}} \approx 0,7 \times T S_{\mathrm{BS}}\left[\mathrm{kg} / \mathrm{m}^{3}\right]$ bei Rundbecken mit Schildräumern — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, Gl. 19, printed p.14) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='086dcf50-0be4-4e12-8dc5-b720727ce4d4' and verification_quote is null;

-- Gl.20 · A226-07 · TS_RS_trichter
update public.equations set verification_quote='Für den Trockensubstanzgehalt des Rücklaufschlammes ( $T S_{\mathrm{RS}}$ ) kann vereinfacht angenommen werden: | - $T S_{\mathrm{RS}} \approx 1,0 \times T S_{\mathrm{BS}}\left[\mathrm{kg} / \mathrm{m}^{3}\right]$ bei Trichterbecken — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, Gl. 20, printed p.14) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='9e9a8c92-2207-4f77-8575-142d9841a2d3' and verification_quote is null;

-- Gl.21 · A226-07 · TS_BB
update public.equations set verification_quote='Der Trockensubstanzgehalt im Belebungsbecken ( $T S_{\mathrm{BB}}$ ) ergibt sich damit zu: $T S_{\mathrm{BB}}=\frac{R V \times T S_{\mathrm{RS}}}{1+R V}\left[\mathrm{~kg} / \mathrm{m}^{3}\right](\mathrm{Gl} .6-2$ aus ATV-DVWK-A 131) — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, Gl. 21 (Gl. 6-2 aus ATV-DVWK-A 131), printed p.14) [VC] — quote backfill only; verification_status left unchanged (was verified_via_cross_reference)', verified_at=now() where id='de92761c-0c6f-4847-b691-91c110c60fab' and verification_quote is null;

-- Gl.22 · A226-07 · q_A
update public.equations set verification_quote='Die Flächenbeschickung ( $q_{\mathrm{A}}$ ) errechnet sich zu: $q_{\mathrm{A}}=\frac{q_{\mathrm{SV}}}{T S_{\mathrm{BB}} \times I S V}[\mathrm{~m} / \mathrm{h}]$ (Gl. 6-3 aus ATV-DVWK-A 131) — printed p.14', verification_note='md-verified 2026-09-07 (§3.4, Gl. 22 (Gl. 6-3 aus ATV-DVWK-A 131), printed p.14) [VC] — quote backfill only; verification_status left unchanged (was verified_via_cross_reference)', verified_at=now() where id='56af5df1-aeae-42b1-8527-e87f07bbaad4' and verification_quote is null;

-- Gl.24 · A226-07 · A_NB
update public.equations set verification_quote='Die erforderliche Beckenoberfläche ergibt sich zu: | A_{\mathrm{NB}}=\frac{Q_{\mathrm{bem}}}{q_{\mathrm{A}}} \quad\left[\mathrm{~m}^{2}\right] \tag{24} — printed p.15', verification_note='md-verified 2026-09-07 (§3.4, Gl. 24, printed p.15) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='5c0d7b3c-9d78-4ba3-af58-a3016aa30542' and verification_quote is null;

-- Gl.25 · A226-07 · A_NB_theo
update public.equations set verification_quote='Die theoretisch erforderliche Beckenoberfläche ergibt sich zu: | A_{\mathrm{NB}, \text { theo }}=\frac{Q_{\mathrm{bem}}}{q_{\mathrm{A}}} \quad\left[\mathrm{~m}^{2}\right] \tag{25} — printed p.15', verification_note='md-verified 2026-09-07 (§3.4, Gl. 25, printed p.15) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='59cf83be-1806-4996-8de5-8d9262903afe' and verification_quote is null;

-- Gl.26 · A226-07 · h_ges
update public.equations set verification_quote='Die erforderlichen Beckentiefen betragen: | & h_{\text {ges }}=\sqrt[3]{A_{\mathrm{NB}, \text { theo }} \times h_{\text {theo }} \times 3}  \tag{26}\\ — printed p.15–16', verification_note='md-verified 2026-09-07 (§3.4, Gl. 26, printed p.15–16) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='417681bd-808e-4277-9241-8786d8a95c93' and verification_quote is null;

-- Gl.27 · A226-07 · h_t
update public.equations set verification_quote='Die erforderlichen Beckentiefen betragen: | & h_{\mathrm{t}}=h_{\text {ges }}-h_{\mathrm{z}}[\mathrm{~m}]  \tag{27}\\ — printed p.15–16', verification_note='md-verified 2026-09-07 (§3.4, Gl. 27, printed p.15–16) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='91ba2602-bd6e-4f15-97db-db275931b624' and verification_quote is null;

-- Gl.28 · A226-07 · h_e
update public.equations set verification_quote='Die erforderlichen Beckentiefen betragen: | & h_{\mathrm{e}} \cong h_{\text {ges }} \times 0,3 \quad[\mathrm{~m}] \tag{28} — printed p.15–16', verification_note='md-verified 2026-09-07 (§3.4, Gl. 28, printed p.15–16) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='c7aabaa1-35a2-42fa-a549-20ae00cfe552' and verification_quote is null;

-- Gl.29 · A226-07 · r_NB
update public.equations set verification_quote='Der erforderliche Radius $r_{\mathrm{NB}}$ des Trichterbeckens ermittelt sich zu: | r_{\mathrm{NB}}=\frac{h_{g e s}-h_{z}}{1,7} \quad[\mathrm{~m}] \tag{29} — printed p.16', verification_note='md-verified 2026-09-07 (§3.4, Gl. 29, printed p.16) [VC] — quote backfill only; verification_status left unchanged (was verified_against_standard)', verified_at=now() where id='1bb0ba08-ed4b-4830-8fa9-c4f04f751f6b' and verification_quote is null;
