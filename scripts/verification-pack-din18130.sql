-- ============================================================================
-- SR-1 Verification pack: DIN 18130-1:1998-05 (standard 4a53393a-e875-446f-b153-f47a402a4370)
-- Stage-1 Kampagnen-Verifikation 2026-08-01
-- Method: image-only PDF -> pdftoppm 300dpi -> tesseract 5.5.0 (deu, psm 6) -> every
--         quote visually confirmed against the rendered page image (SR-3 ground truth).
-- Printed page = PDF page (offset 0, verified via "Seite 5" header on PDF page 5).
-- 54 unverified active fields examined: 52 verified below, 2 residue (see end of file).
-- DO NOT APPLY without review. Rollback: rollback-verification-pack-din18130.sql
-- ============================================================================

begin;

-- ---------- DIN-18130-1-01 Versuchsgrundlagen, Bodenauswahl und Versuchsklasse ----------

-- A_min (Mindest-Querschnittsflaeche, §5.8)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Bei bindigen Böden sollte die Querschnittsfläche mindestens A = 10 cm² betragen, bei grobkörnigen Böden mindestens A = 20 cm², sofern die Versuchsgeräte nach Abschnitt 7 keine größeren Abmessungen bedingen. [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §5.8, S.5)',
 verified_at=now()
 where id='3ba4ba52-6c0a-4019-963c-61a69c96e454' and verification_status not in ('verified_against_standard','corrected');

-- alpha (Korrekturbeiwert alpha, §5.7 / Tab.2)
update public.fields set verification_status='verified_against_standard',
 verification_quote='α der Korrekturbeiwert (siehe Tabelle 2). — Tabelle 2: Korrekturbeiwert α zur Berücksichtigung der Zähigkeit des Wassers [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §5.7 Tab.2, S.5)',
 verified_at=now()
 where id='ac2a7a68-7dd2-41c6-b6e8-213f5f9ebd94' and verification_status not in ('verified_against_standard','corrected');

-- bezeichnung (Versuchsbezeichnung, §4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Bezeichnung des Laborversuchs zur Bestimmung des Durchlässigkeitsbeiwerts an feinkörnigem Boden im Kompressions-Durchlässigkeitsgerät (KD) mit Messung des hydraulischen Gefälles in einem Standrohr (ES) und des Wasservolumens im Standrohr (ST) sowie mit statischer Belastung (SB) des Probekörpers, Versuchsklasse 3: Versuch DIN 18130 — KD — ES — ST — SB — 3 [S. 3]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §4, S.3)',
 verified_at=now()
 where id='a386681f-97c9-4e3e-917b-e057f56f1f11' and verification_status not in ('verified_against_standard','corrected');

-- bodenart (Bodenart nach DIN 4022-1, §8.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='2) Angaben zur Probe — Bodenart nach DIN 4022-1 [S. 17]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.4, S.17)',
 verified_at=now()
 where id='597006b7-7a19-4f40-bc02-814552e25c49' and verification_status not in ('verified_against_standard','corrected');

-- bodengruppe (Bodengruppe nach DIN 18196, §8.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='2) Angaben zur Probe — Bodengruppe nach DIN 18196 [S. 17]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.4, S.17)',
 verified_at=now()
 where id='d7a1693d-9968-4e2a-b2d9-8832ec0d3602' and verification_status not in ('verified_against_standard','corrected');

-- dichte_konstant (§5.3)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Die Dichte der Probe darf sich während der Durchströmung nicht ändern. [S. 4]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §5.3, S.4)',
 verified_at=now()
 where id='ef6e2637-66ea-4f58-a735-196e2ac312d1' and verification_status not in ('verified_against_standard','corrected');

-- durchlaessigkeitsbereich (§3.7 / Tab.1)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Eine bestimmte Spanne von Durchlässigkeitsbeiwerten. ANMERKUNG: Für bautechnische Zwecke werden fünf Durchlässigkeitsbereiche definiert (siehe Tabelle 1). [S. 3]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §3.7 Tab.1, S.3)',
 verified_at=now()
 where id='59bc1db9-de60-40cc-8bfb-027362c69253' and verification_status not in ('verified_against_standard','corrected');

-- max_d (Groesstkorn max. d, §5.8)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Die Mindestabmessungen richten sich nach dem in der Probe enthaltenen Größtkorn und nach dem Versuchsgerät. Das Verhältnis Größtkorn zu Probendurchmesser bzw. Probenhöhe sollte 1:5 bei ungleichförmigen und 1:10 bei gleichförmigen Böden nicht unterschreiten. [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §5.8, S.5)',
 verified_at=now()
 where id='08a5ce38-c0da-435c-a0a6-7b35c6bbe158' and verification_status not in ('verified_against_standard','corrected');

-- S_r (Saettigungszahl, §5.5)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Die Sättigungszahl darf sich während der Meßphase nicht ändern, oder es darf sich das Meßergebnis bei Wiederholung der Messung mit gleichem hydraulischen Gefälle nicht mehr ändern. [S. 4]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §5.5, S.4)',
 verified_at=now()
 where id='4cb64643-51ba-4514-aa87-35dc0a698394' and verification_status not in ('verified_against_standard','corrected');

-- ungleichfoermig (§5.8)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Das Verhältnis Größtkorn zu Probendurchmesser bzw. Probenhöhe sollte 1:5 bei ungleichförmigen und 1:10 bei gleichförmigen Böden nicht unterschreiten. [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §5.8, S.5)',
 verified_at=now()
 where id='6d6c6496-cb39-438d-89a7-41ded8a97cf3' and verification_status not in ('verified_against_standard','corrected');

-- versuchsklasse (§3.8 / Tab.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Klasse, in der Durchlässigkeitsversuche erfaßt werden, die unter jeweils gleichen Bedingungen bezüglich Wassersättigung und Art der Strömung (siehe Tabelle 4) ablaufen. [S. 3]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §3.8 Tab.4, S.3; Tab.4 Klassen 1a/1b/2/3 auf S.8 bildbestätigt)',
 verified_at=now()
 where id='0813691e-6a6e-4148-bddf-550cb50b650d' and verification_status not in ('verified_against_standard','corrected');

-- wasser_geeignet (§5.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Das für den Versuch zu verwendende Wasser darf weder aus dem Probekörper Bestandteile herauslösen noch gelöste oder in Schwebe befindliche Teile in dem Probekörper ablagern noch die kolloidchemische Beschaffenheit des Bodens verändern. [S. 4]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §5.4, S.4)',
 verified_at=now()
 where id='b4a22ebc-9e9d-4086-9148-30e4e980c7ef' and verification_status not in ('verified_against_standard','corrected');

-- ---------- DIN-18130-1-02 Versuchsanordnung und Versuchsdurchfuehrung ----------

-- gamma_org (§6.1.1)
update public.fields set verification_status='verified_against_standard',
 verification_quote='γ_org die Wichte der organischen Flüssigkeit, in kN/m³. [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.1.1 Gl.(7), S.5)',
 verified_at=now()
 where id='2469cefe-a11d-48a5-84ac-ce7a718c0ac5' and verification_status not in ('verified_against_standard','corrected');

-- gefaelle_typ (§6.1)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Das hydraulische Gefälle wird als konstant bezeichnet, wenn sich die Differenz zwischen der Standrohrspiegelhöhe des in den Probekörper einströmenden Wassers (Oberwasser) und der Standrohrspiegelhöhe des ausströmenden Wassers (Unterwasser) während einer Messung nicht merklich ändert. [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.1.1, S.5; veränderliches Gefälle §6.1.2 S.6 bildbestätigt)',
 verified_at=now()
 where id='673f92f6-ba13-4e9b-ae09-6730d0bcdfaa' and verification_status not in ('verified_against_standard','corrected');

-- h (Hydraulischer Hoehenunterschied, §3.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='3.4 Hydraulischer Höhenunterschied h — Differenz zweier Standrohrspiegelhöhen in zwei Querschnitten des Probekörpers (siehe Bild 1). [S. 3]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §3.4, S.3)',
 verified_at=now()
 where id='dbac1531-cd84-4cb8-8694-63aadd6a48e6' and verification_status not in ('verified_against_standard','corrected');

-- h_0 (Hoehenunterschied der Trennspiegel, §6.1.1)
update public.fields set verification_status='verified_against_standard',
 verification_quote='h_0 der Höhenunterschied der Trennspiegel, in m (siehe Bild 3); [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.1.1 Gl.(7), S.5)',
 verified_at=now()
 where id='50a6bf3b-d18e-4123-91aa-6027d4aeaeb8' and verification_status not in ('verified_against_standard','corrected');

-- messung_wassermenge (§6.3)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Die zur Berechnung des Durchlässigkeitsbeiwerts maßgebende Wassermenge ist bei stationärer Strömung zu messen. [S. 6]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.3, S.6)',
 verified_at=now()
 where id='954b00dc-ae2e-49a9-9298-73f339783dec' and verification_status not in ('verified_against_standard','corrected');

-- saettigung_aufgebracht (§6.5)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Um den Bedingungen der Versuchsklasse 1 zu genügen, muß die Probe vor dem Versuch gesättigt werden. Feinkörnige und gemischtkörnige Böden sowie Sande werden durch Aufbringen eines Sättigungsdrucks gesättigt. [S. 7]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.5, S.7)',
 verified_at=now()
 where id='36992010-1463-4180-8efc-ba98623d0592' and verification_status not in ('verified_against_standard','corrected');

-- statische_belastung (§6.6)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Um den Einfluß des Porenanteils auf die Durchlässigkeit zu ermitteln, wird der Versuch bei stark zusammendrückbaren Probekörpern unter verschiedenen Spannungszuständen durchgeführt. Eine äußere statische Belastung ist auch bei Aufbringen eines Sättigungsdrucks (siehe 6.6) oder bei Durchströmung von unten nach oben (siehe 6.2) aus Gleichgewichtsgründen erforderlich. [S. 8]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.6, S.8; Querverweise (6.6)/(6.2) so gedruckt)',
 verified_at=now()
 where id='6de4835a-2381-406f-a0d1-fd7e23622645' and verification_status not in ('verified_against_standard','corrected');

-- stroemungsrichtung (§6.1.3)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Bei den Versuchsanordnungen nach 6.1.1 und 6.1.2 sollte der Probekörper grundsätzlich von unten nach oben, darf aber auch von oben nach unten durchströmt werden. [S. 6]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.1.3, S.6)',
 verified_at=now()
 where id='088c758e-9a08-4597-9d7c-82ec64846946' and verification_status not in ('verified_against_standard','corrected');

-- u_0 (Saettigungsdruck, §6.5 / Tab.3)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Tabelle 3: Sättigungsdruck u_0 in Abhängigkeit von der Sättigungszahl S_r — Dazu wird das Porenwasser in dem Probekörper mit einem hydrostatischen Druck (Sättigungsdruck, back pressure) belastet (siehe Tabelle 3). [S. 8 / S. 7]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.5 Tab.3, S.7-8)',
 verified_at=now()
 where id='b3a2b009-9e60-49c5-bd90-b9b9a89a019b' and verification_status not in ('verified_against_standard','corrected');

-- umlaeufigkeit_verhindert (§6.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Bei ungestörten Probekörpern können durch eingelagerte Steine und Fremdkörper sowie Hohlräume entlang der Wand des Versuchszylinders Umläufigkeiten auftreten, die eine höhere Durchlässigkeit vortäuschen. Augenscheinlich vorhandene Gänge an der Zylinderwand sind abzudichten, z. B. mit Bentonit. [S. 7]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.4, S.7)',
 verified_at=now()
 where id='ccbb1e48-980c-4a75-996b-1b2ea5819f48' and verification_status not in ('verified_against_standard','corrected');

-- versuchsanordnung (§6.7 / Tab.5)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Es bestehen verschiedene Möglichkeiten der Versuchsanordnung (siehe Tabelle 5). Die Versuchsanordnung ist entsprechend den jeweiligen Erfordernissen des Anwendungsfalls zusammenzustellen. [S. 8]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.7, S.8)',
 verified_at=now()
 where id='6f55ff07-4824-4278-b49e-d8043fe0362f' and verification_status not in ('verified_against_standard','corrected');

-- ---------- DIN-18130-1-03 Messdatenerfassung ----------

-- a (Querschnittsflaeche Standrohr, §8.2)
update public.fields set verification_status='verified_against_standard',
 verification_quote='a die Querschnittsfläche des Standrohrs, in m²; [S. 16]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.2 Gl.(9), S.16)',
 verified_at=now()
 where id='26d0fac3-5f6a-4504-8418-2239fa86bbbb' and verification_status not in ('verified_against_standard','corrected');

-- A (Querschnittsflaeche Probekoerper, §8.1)
update public.fields set verification_status='verified_against_standard',
 verification_quote='A die Querschnittsfläche des Probekörpers, in m²; [S. 16]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.1 Gl.(8), S.16; Mindestwerte §5.8 S.5 bildbestätigt)',
 verified_at=now()
 where id='904354fc-c526-48a4-8bdf-b8179beef2f0' and verification_status not in ('verified_against_standard','corrected');

-- e (Porenzahl, §8.3)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Zur Darstellung der Abhängigkeit des Durchlässigkeitsbeiwerts k von der Porenzahl e werden k und e im doppelt logarithmischen Maßstab aufgetragen (siehe 5.3). [S. 16]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.3, S.16)',
 verified_at=now()
 where id='cec53830-aa4c-4e9f-b18a-cd1cdfcc6300' and verification_status not in ('verified_against_standard','corrected');

-- gamma_w (§6.1.1)
update public.fields set verification_status='verified_against_standard',
 verification_quote='γ_w die Wichte des Wassers, in kN/m³; [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §6.1.1 Gl.(7), S.5)',
 verified_at=now()
 where id='43335c8a-cde4-4ee6-9172-37d8e5731c0c' and verification_status not in ('verified_against_standard','corrected');

-- h_1 (§8.2)
update public.fields set verification_status='verified_against_standard',
 verification_quote='h_1 die auf den Unterwasserspiegel bezogene Wasserhöhe im Standrohr bei Versuchsbeginn, in m; [S. 16]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.2 Gl.(9), S.16)',
 verified_at=now()
 where id='ef26cd5f-0808-4feb-b5ac-4ad9fae2f0d2' and verification_status not in ('verified_against_standard','corrected');

-- h_2 (§8.2)
update public.fields set verification_status='verified_against_standard',
 verification_quote='h_2 die auf den Unterwasserspiegel bezogene Wasserhöhe im Standrohr bei Versuchsende, in m. [S. 16]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.2 Gl.(9), S.16)',
 verified_at=now()
 where id='5d8e8051-d38e-4a31-9d16-bb231c0f2637' and verification_status not in ('verified_against_standard','corrected');

-- h_o (Standrohrspiegelhoehe Oberstrom, Tab.8)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Standrohrspiegelhöhen Oberstrom h_o m 0,268 — hydraulischer Höhenunterschied h = h_o − h_u [S. 18]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, Tab.8 zu §9.2, S.18; auch Tab.11 S.20 Höhe der Wassersäule Oberwasser h_o)',
 verified_at=now()
 where id='c06e8c96-1b44-4411-82d3-4ce281f32779' and verification_status not in ('verified_against_standard','corrected');

-- h_u (Standrohrspiegelhoehe Unterstrom, Tab.8)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Standrohrspiegelhöhen Unterstrom h_u m 0,186 — hydraulischer Höhenunterschied h = h_o − h_u [S. 18]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, Tab.8 zu §9.2, S.18; auch Tab.11 S.20 Höhe der Wassersäule Unterwasser h_u)',
 verified_at=now()
 where id='b6612290-3535-447f-832f-a36b0f0f5b59' and verification_status not in ('verified_against_standard','corrected');

-- l (durchstroemte Laenge, §3.5)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Quotient aus hydraulischem Höhenunterschied h und der durchströmten Länge l (Abstand der Ansatzpunkte der Standrohre in Fließrichtung) des Probekörpers: i = h/l [S. 3]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §3.5 Gl.(3), S.3)',
 verified_at=now()
 where id='78708f8c-9d0e-4691-bb74-75cf4e05cd88' and verification_status not in ('verified_against_standard','corrected');

-- l_0 (Hoehe des Probekoerpers, §8.2)
update public.fields set verification_status='verified_against_standard',
 verification_quote='l_0 die Höhe des Probekörpers, in m; [S. 16]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.2 Gl.(9), S.16)',
 verified_at=now()
 where id='3eabe319-1183-477b-88cc-8a7699bcbf3c' and verification_status not in ('verified_against_standard','corrected');

-- n_pore (Porenanteil, §8.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='2) Angaben zur Probe — Porenzahl bzw. Porenanteil e bzw. n [S. 17]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.4, S.17)',
 verified_at=now()
 where id='47fc17d6-f99f-46b4-825e-1c6f8763f823' and verification_status not in ('verified_against_standard','corrected');

-- p_o (Oberwasserdruck, Tab.11)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Oberwasserdruck p_o kN/m² — Hydraulischer Höhenunterschied h = h_o − h_u + (p_o − p_u)/γ_w [S. 20]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, Tab.11 zu §9.4, S.20; §8.1/§9.3 verwenden p_2/p_1, S.16/19)',
 verified_at=now()
 where id='4b59cbfc-8caf-4c47-aca3-78908f8a8ac5' and verification_status not in ('verified_against_standard','corrected');

-- p_u (Unterwasserdruck, Tab.11)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Unterwasserdruck p_u kN/m² — Hydraulischer Höhenunterschied h = h_o − h_u + (p_o − p_u)/γ_w [S. 20]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, Tab.11 zu §9.4, S.20; §8.1/§9.3 verwenden p_2/p_1, S.16/19)',
 verified_at=now()
 where id='0ff7675b-e106-4d7f-a731-abc34942bfa4' and verification_status not in ('verified_against_standard','corrected');

-- rho (Dichte, Tab.6)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Tabelle 6: Dichte, Porenanteil und Porenzahl der Probekörper im Anwendungsbeispiel 9.1 — Formelzeichen ϱ [S. 17]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, Tab.6 zu §9.1, S.17; auch §9.3 S.19 Dichte: ϱ = 2,10 g/cm³; Anforderung §5.3 S.4)',
 verified_at=now()
 where id='28abc442-a5dd-49ce-b30d-16fb7801d195' and verification_status not in ('verified_against_standard','corrected');

-- rho_d (Trockendichte, §8.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='2) Angaben zur Probe — Trockendichte ϱ_d [S. 17]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.4, S.17)',
 verified_at=now()
 where id='aa045eb7-3b13-46f2-a782-09081e721c7c' and verification_status not in ('verified_against_standard','corrected');

-- rho_s (Korndichte, §9.3)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Korndichte: ϱ_s = 2,67 g/cm³ [S. 19]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §9.3, S.19; auch Tab.6 S.17 Formelzeichen ϱ_s)',
 verified_at=now()
 where id='e95afe5d-2c6d-41b5-a7fd-3c2b2dc28f74' and verification_status not in ('verified_against_standard','corrected');

-- t (Messzeitspanne, §8.2)
update public.fields set verification_status='verified_against_standard',
 verification_quote='t die Meßzeitspanne, in s; [S. 16]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.2 Gl.(9), S.16; Zeit t auch §3.1 S.2)',
 verified_at=now()
 where id='b477266b-0464-47d6-a1ac-71b6fd3641aa' and verification_status not in ('verified_against_standard','corrected');

-- T (Wassertemperatur, §5.7)
update public.fields set verification_status='verified_against_standard',
 verification_quote='T die Wassertemperatur beim Versuch, in °C; [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §5.7 Gl.(6), S.5)',
 verified_at=now()
 where id='e6acad67-811a-4aec-a005-bec29e2f311e' and verification_status not in ('verified_against_standard','corrected');

-- V_w (Wasservolumen, §3.1)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Quotient aus dem Wasservolumen V_w, das eine bestimmte Querschnittsfläche A (Feststoffe und Poren) eines Probekörpers durchfließt und der dazu benötigten Zeit t (siehe Bild 1): Q = V_w/t [S. 2]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §3.1 Gl.(1), S.2)',
 verified_at=now()
 where id='8ddf3a9b-2feb-48a8-b5c2-d71e530f8926' and verification_status not in ('verified_against_standard','corrected');

-- w_a (Wassergehalt vor Versuch, §8.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='2) Angaben zur Probe — Wassergehalt vor und nach dem Versuch w_a und w_e [S. 17]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.4, S.17)',
 verified_at=now()
 where id='f2dba419-2fc7-445f-b0d3-a61a74ae93a2' and verification_status not in ('verified_against_standard','corrected');

-- w_e (Wassergehalt nach Versuch, §8.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='2) Angaben zur Probe — Wassergehalt vor und nach dem Versuch w_a und w_e [S. 17]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.4, S.17)',
 verified_at=now()
 where id='6174a6af-dac9-4075-b818-88f3d4859bdc' and verification_status not in ('verified_against_standard','corrected');

-- ---------- DIN-18130-1-04 Auswertung ----------

-- i (Hydraulisches Gefaelle, §3.5)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Quotient aus hydraulischem Höhenunterschied h und der durchströmten Länge l (Abstand der Ansatzpunkte der Standrohre in Fließrichtung) des Probekörpers: i = h/l [S. 3]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §3.5 Gl.(3), S.3)',
 verified_at=now()
 where id='2f1f51b2-b264-4352-8488-3bbfb2f884f3' and verification_status not in ('verified_against_standard','corrected');

-- k (Durchlaessigkeitsbeiwert, §3.6)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Quotient aus Filtergeschwindigkeit v und dem hydraulischen Gefälle i bei laminarer Durchströmung des wassergesättigten Bodens — allgemein (Fließgesetz von DARCY): k = v/i = const. [S. 3]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §3.6 Gl.(4), S.3; Gl.(8)/(9) §8.1/§8.2 S.16 bildbestätigt)',
 verified_at=now()
 where id='934803b1-519e-4cb5-aadc-2780731e3b66' and verification_status not in ('verified_against_standard','corrected');

-- k_10 (§5.7 Gl.(6))
update public.fields set verification_status='verified_against_standard',
 verification_quote='Der im Versuch festgestellte k-Wert wird auf eine Vergleichs-Temperatur von 10 °C umgerechnet. Nach Poiseuille ist: k_10 = 1,359/(1 + 0,0337 · T + 0,00022 · T²) · k_T = α · k_T [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §5.7 Gl.(6), S.5; Ergebnisangabe §8.4 S.16-17)',
 verified_at=now()
 where id='defe9a0f-e8c6-4012-863b-1425c0522fe7' and verification_status not in ('verified_against_standard','corrected');

-- k_T (§5.7)
update public.fields set verification_status='verified_against_standard',
 verification_quote='k_T der ermittelte Durchlässigkeitsbeiwert bei der Temperatur T, in m/s; [S. 5]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §5.7 Gl.(6), S.5)',
 verified_at=now()
 where id='970ac97f-e655-4b76-bd40-ff9d544db69e' and verification_status not in ('verified_against_standard','corrected');

-- Q (Durchfluss, §3.1)
update public.fields set verification_status='verified_against_standard',
 verification_quote='3.1 Durchfluß Q — Quotient aus dem Wasservolumen V_w, das eine bestimmte Querschnittsfläche A (Feststoffe und Poren) eines Probekörpers durchfließt und der dazu benötigten Zeit t (siehe Bild 1): Q = V_w/t [S. 2]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §3.1 Gl.(1), S.2)',
 verified_at=now()
 where id='c23e7ec2-da24-480d-989a-19d1e2ed0bcd' and verification_status not in ('verified_against_standard','corrected');

-- v (Filtergeschwindigkeit, §3.2)
update public.fields set verification_status='verified_against_standard',
 verification_quote='3.2 Filtergeschwindigkeit v — Quotient aus Durchfluß Q und zugehöriger Querschnittsfläche A senkrecht zur Fließrichtung: v = Q/A [S. 2]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §3.2 Gl.(2), S.2)',
 verified_at=now()
 where id='bde45807-8eeb-4b8f-9dd0-5f565a59ab4a' and verification_status not in ('verified_against_standard','corrected');

-- ---------- DIN-18130-1-05 Ergebnisangabe ----------

-- i_bereich (§8.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Bei Versuchen mit veränderlichem hydraulischen Gefälle ist dessen Bereich (größtes und kleinstes hydraulisches Gefälle) anzugeben. [S. 17]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.4, S.17)',
 verified_at=now()
 where id='7babd5f2-ba5f-458c-be93-316aad3fc305' and verification_status not in ('verified_against_standard','corrected');

-- versuchsbericht_vollstaendig (§8.4)
update public.fields set verification_status='verified_against_standard',
 verification_quote='Ferner sind mit dem Versuchsergebnis mitzuteilen: 1) Angaben zum Versuch — Bezeichnung nach Abschnitt 4 — Versuchsdauer t — Sättigungsdruck u_0 — Raumtemperatur T — Durchströmungsrichtung 2) Angaben zur Probe [...] [S. 17]',
 verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (OCR+Bildabgleich, §8.4, S.17)',
 verified_at=now()
 where id='281f9678-076b-42be-b542-4bbd4bb7a3f9' and verification_status not in ('verified_against_standard','corrected');

commit;

-- ============================================================================
-- RESIDUE (NOT updated — no defining text in DIN 18130-1:1998-05):
--
-- a25cd636-5652-4791-b624-6977c29b7f45  freigabe_sachverstaendiger (DIN-18130-1-05, §8.4)
--   Reason: "Sachverständiger"/"Freigabe" kommt in der Norm nicht vor (Volltext-OCR
--   geprüft). App-Workflow-Metadatum, kein Normeninhalt.
--
-- 544cbf1c-5adb-4655-a2d5-1f9449ec34f4  k_f "Wasserdurchlässigkeitsbeiwert k_f (Transfer)" (DIN-18130-1-05, §8.4)
--   Reason: Symbol k_f existiert in DIN 18130-1 nicht (Norm verwendet k, k_T, k_10).
--   Transfer-Alias in DWA-A-138-Terminologie; SR-1-Verbatim-Verankerung des Symbols
--   nicht möglich. Die zugrundeliegende Größe (k_10 nach §8.4) ist über Feld k_10 belegt.
-- ============================================================================
