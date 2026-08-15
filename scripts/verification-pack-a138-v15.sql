-- ============================================================================
-- SR-1 Stage-1 field-verification pack — DWA-A-138-1 V1.5 infiltration chain
-- Generated: 2026-08-01 (session extraction; SR-1/SR-3 compliant)
-- Source PDF: C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).pdf
--   extracted with: pdftotext -layout  (scoop/poppler, Windows side)
-- Page-offset proof: PDF page = printed page + 2
--   (PDF p.10 footer prints "8", PDF p.11 footer prints "9")
-- Scope: worksheets A138-01, -04, -05, -07, -10, -11, -12, -13
--   fields with verification_status NOT IN ('verified_against_standard','corrected')
-- Counts: 61 fields examined / 43 quoted here / 18 residue (see campaign report)
-- Quote conventions: line-break hyphenation joined; superscripts (m², 10⁻³)
--   reassembled from -layout column output; table rows quoted columnar as printed.
-- READ-ONLY PACK: review before applying. Rollback:
--   scripts/rollback-verification-pack-a138-v15.sql
-- ============================================================================

-- ---------- A138-01 Projektregistrierung (7) ----------

-- a138_applicable
update public.fields set verification_status='verified_against_standard', verification_quote='Das vorliegende Arbeitsblatt bezieht sich auf die Versickerung von Niederschlagswasser im Sinne der Definition des Abwasserbegriffs nach § 54 WHG, also Wasser, das von Niederschlägen aus dem Bereich von befestigten oder bebauten Flächen gesammelt abfließt. [S. 10]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§1, S.10)', verified_at=now() where id='de96b550-5a3e-40e2-953b-8546492e79c2' and verification_status not in ('verified_against_standard','corrected');

-- attest_a138_01_a138_req_25 (Nachweis: 5.1)
update public.fields set verification_status='verified_against_standard', verification_quote='Im Frühstadium der Planung sollte eine Ersteinschätzung erfolgen, ob eine Versickerung von Niederschlagswasser grundsätzlich möglich ist. Mit Tabelle 3 sind wesentliche Kriterien zur Überprüfung der Umsetzbarkeit einer entwässerungstechnischen Versickerung gegeben. [S. 22]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.1.1, S.22)', verified_at=now() where id='24c144f4-4a68-4687-b964-5964c8f14300' and verification_status not in ('verified_against_standard','corrected');

-- attest_a138_01_a138_req_29 (Nachweis: 5.1)
update public.fields set verification_status='verified_against_standard', verification_quote='Im Frühstadium der Planung sollte eine Ersteinschätzung erfolgen, ob eine Versickerung von Niederschlagswasser grundsätzlich möglich ist. Mit Tabelle 3 sind wesentliche Kriterien zur Überprüfung der Umsetzbarkeit einer entwässerungstechnischen Versickerung gegeben. [S. 22]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.1.1, S.22)', verified_at=now() where id='d151b9f8-c5c6-472b-aa9b-f4aaa7428074' and verification_status not in ('verified_against_standard','corrected');

-- design_method
update public.fields set verification_status='verified_against_standard', verification_quote='Für die Bemessung von dezentralen Versickerungsanlagen kann in der Regel das Einfache Verfahren angewendet werden. Die Einhaltung der Bedingungen für das Einfache Verfahren sind bei der Bemessung nachzuweisen. [S. 37]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.2, S.37)', verified_at=now() where id='3b3937e7-bd15-477c-b717-163f5a9e7051' and verification_status not in ('verified_against_standard','corrected');

-- kostra_grid_cell
update public.fields set verification_status='verified_against_standard', verification_quote='Als Regendaten sind örtliche Niederschlag-/Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. [S. 42]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.42)', verified_at=now() where id='21941a60-3bda-4ac1-90c2-ad2b5760c952' and verification_status not in ('verified_against_standard','corrected');

-- wasserbehoerde
update public.fields set verification_status='verified_against_standard', verification_quote='Eine solche Gewässerbenutzung bedarf im Regelfall einer wasserrechtlichen Erlaubnis gemäß § 8 WHG durch die zuständige Wasserbehörde. [S. 83]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§Anh. B.2, S.83)', verified_at=now() where id='3bbcb2a7-6be0-420b-a4df-b4043ce7f40e' and verification_status not in ('verified_against_standard','corrected');

-- water_protection_zone
update public.fields set verification_status='verified_against_standard', verification_quote='Das Versickern von gesammeltem Niederschlagswasser ist in der Regel in Zone I nicht zulässig und in Zone II und III stark eingeschränkt. [S. 23]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.1.1, S.23)', verified_at=now() where id='6cdf34f3-ba25-4fcc-ae89-b95ed4a6bfae' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-04 Niederschlagsdaten (KOSTRA) (5) ----------

-- a138_dauerstufe_D
update public.fields set verification_status='verified_against_standard', verification_quote='Die Ermittlung der maßgeblichen Dauerstufe D und der Regenspende rD(n) erfolgt bei Versickerungsanlagen mit Speicherfunktion iterativ (siehe Abschnitt 6). [S. 42]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.42)', verified_at=now() where id='71051b96-0b88-4c12-9270-40ecc41b415d' and verification_status not in ('verified_against_standard','corrected');

-- a138_regenspende_r_DT
update public.fields set verification_status='verified_against_standard', verification_quote='rD(n) l/(s · ha) Regenspende der Dauerstufe D und Bemessungshäufigkeit n [S. 42]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5 Gl. 3, S.42)', verified_at=now() where id='1f803cf6-0b02-4c0e-b12b-fc9d95b8e3e9' and verification_status not in ('verified_against_standard','corrected');

-- attest_a138_04_a138_req_28 (Nachweis: 5.3.3.5)
update public.fields set verification_status='verified_against_standard', verification_quote='Für die Berechnung der Zuflüsse zu Versickerungsanlagen im Einfachen Verfahren ergibt sich der Rechenwert AC gemäß Gl. (2): AC = ∑(AE,b,a,i · Ci) + ∑(AE,nb,a,i · Ci) [S. 41]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.41)', verified_at=now() where id='41a43c4c-f8ad-44f2-b34e-a2abba4882bc' and verification_status not in ('verified_against_standard','corrected');

-- kostra_data_date
update public.fields set verification_status='verified_against_standard', verification_quote='Der aktuelle Stand des Arbeitsblatts DWA-A 138-1:2024 bezieht sich auf KOSTRA-DWD-2020 (2023). [S. 42]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.42)', verified_at=now() where id='bb57e7dc-bb96-42d7-b5fe-7da15762eadf' and verification_status not in ('verified_against_standard','corrected');

-- r_D_n_table
update public.fields set verification_status='verified_against_standard', verification_quote='Bei KOSTRA-Datensätzen können die exakten Werte des DWD (DWD-Vorgabe) verwendet werden. Der aktuelle Stand des Arbeitsblatts DWA-A 138-1:2024 bezieht sich auf KOSTRA-DWD-2020 (2023). [S. 42]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.42)', verified_at=now() where id='c610cf69-2f82-4b66-825a-28e76ca29d17' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-05 Boden- und Hydrogeologische Daten (5) ----------

-- clearance_a
update public.fields set verification_status='verified_against_standard', verification_quote='Bei einem Abstand der Sohle der Versickerungsanlage zum maßgeblichen mittleren höchsten Grundwasserstand (MHGW) von ≥ 1 m (siehe 5.2.1) kann in der Regel auf diese Abstimmung verzichtet werden [S. 22]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.1.1, S.22)', verified_at=now() where id='3d835b1b-9ce5-4ee6-aa61-4122d5cd7ed1' and verification_status not in ('verified_against_standard','corrected');

-- kf_test_density_check
update public.fields set verification_status='verified_against_standard', verification_quote='Bei kompakten/flächenhaften Versickerungsanlagen ist mindestens ein Versuchsstandort je 150 m² Sohlenfläche der Versickerungsanlage erforderlich. [S. 45]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.6, S.45)', verified_at=now() where id='afd460d2-63c5-42f4-8511-7c51aac8e574' and verification_status not in ('verified_against_standard','corrected');

-- kf_too_high_flag
update public.fields set verification_status='verified_against_standard', verification_quote='Eine Versickerung bei kf-Werten > 1 · 10⁻³ m/s ist möglich, jedoch muss das Erfordernis zusätzlicher Maßnahmen zum Stoffrückhalt im Einzelfall geprüft und mit der Genehmigungsbehörde abgestimmt werden. [S. 34]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.1, S.34)', verified_at=now() where id='b966716b-783a-470a-80de-1056fc297ba2' and verification_status not in ('verified_against_standard','corrected');

-- mhgw
update public.fields set verification_status='verified_against_standard', verification_quote='MHGW m Mittlerer höchster Grundwasserstand [S. 19]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§3.2 Tab. 2, S.19)', verified_at=now() where id='7f478cf1-8c99-45e7-a92d-2c5da0edb8ef' and verification_status not in ('verified_against_standard','corrected');

-- soil_classification
update public.fields set verification_status='verified_against_standard', verification_quote='Hat eine Bodenansprache nach DIN EN ISO 14688-1 stattgefunden, kann diesem Boden ein Durchlässigkeitsbeiwert als kf-Wert überschlägig zugeordnet werden. [S. 80]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§Anh. A, S.80)', verified_at=now() where id='9978420d-2d14-4a4e-b1d9-6c30278f3dbd' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-07 Flächen-Inventar und Abflussbeiwerte (7) ----------

-- A_C
update public.fields set verification_status='verified_against_standard', verification_quote='AC: Rechenwert für die Bemessung, der sich aus der Summe aller an die Versickerungsanlage angeschlossenen Teilflächen, multipliziert mit dem jeweils zugehörigen Abflussbeiwert ergibt [S. 41]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5 Gl. 2, S.41)', verified_at=now() where id='a1380700-0000-4000-8000-000000000001' and verification_status not in ('verified_against_standard','corrected');

-- A_C_sealed
update public.fields set verification_status='verified_against_standard', verification_quote='AC = ∑(AE,b,a,i · Ci) + ∑(AE,nb,a,i · Ci); AE,b,a,i m² Befestigte, angeschlossene Teilfläche im Einzugsgebiet der Versickerungsanlage [S. 41]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5 Gl. 2, S.41)', verified_at=now() where id='a1380700-0000-4000-8000-000000000005' and verification_status not in ('verified_against_standard','corrected');

-- A_C_unsealed
update public.fields set verification_status='verified_against_standard', verification_quote='AC = ∑(AE,b,a,i · Ci) + ∑(AE,nb,a,i · Ci); AE,nb,a,i m² Nicht befestigte, angeschlossene Teilfläche im Einzugsgebiet der Versickerungsanlage [S. 41]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5 Gl. 2, S.41)', verified_at=now() where id='a1380700-0000-4000-8000-000000000006' and verification_status not in ('verified_against_standard','corrected');

-- A_E_ba
update public.fields set verification_status='verified_against_standard', verification_quote='AE,b,a m² Befestigte, angeschlossene Fläche im Einzugsgebiet [S. 17]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§3.2 Tab. 2, S.17)', verified_at=now() where id='a1380700-0000-4000-8000-000000000003' and verification_status not in ('verified_against_standard','corrected');

-- A_E_nba
update public.fields set verification_status='verified_against_standard', verification_quote='AE,nb,a,i m² Nicht befestigte, angeschlossene Teilfläche im Einzugsgebiet [S. 17]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§3.2 Tab. 2, S.17)', verified_at=now() where id='a1380700-0000-4000-8000-000000000004' and verification_status not in ('verified_against_standard','corrected');

-- C_m
update public.fields set verification_status='verified_against_standard', verification_quote='In der Regel ist eine Bemessung mit dem mittleren Abflussbeiwert im Einfachen Verfahren bis Bemessungshäufigkeiten ≥ 0,1/a möglich. [S. 41]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.41)', verified_at=now() where id='a1380700-0000-4000-8000-000000000002' and verification_status not in ('verified_against_standard','corrected');

-- flood_check_trigger
update public.fields set verification_status='verified_against_standard', verification_quote='Für Versickerungsanlagen zur Grundstücksentwässerung innerörtlicher Grundstücke muss ein Überflutungsnachweis nach DIN 1986-100 erbracht werden, wenn der Rechenwert AC als Summenwert aller abflusswirksamen Flächen des Grundstücks größer als 800 m² ist. [S. 49]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.4.1, S.49)', verified_at=now() where id='3e0d90dd-8c6a-425e-9c9f-73e7e18c923e' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-10 Bemessungswert A_C und Zufluss (7) ----------

-- A_C_sealed
update public.fields set verification_status='verified_against_standard', verification_quote='AC = ∑(AE,b,a,i · Ci) + ∑(AE,nb,a,i · Ci); AE,b,a,i m² Befestigte, angeschlossene Teilfläche im Einzugsgebiet der Versickerungsanlage [S. 41]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5 Gl. 2, S.41)', verified_at=now() where id='d1a38110-0000-0000-0000-0000000000a1' and verification_status not in ('verified_against_standard','corrected');

-- A_C_unsealed
update public.fields set verification_status='verified_against_standard', verification_quote='AC = ∑(AE,b,a,i · Ci) + ∑(AE,nb,a,i · Ci); AE,nb,a,i m² Nicht befestigte, angeschlossene Teilfläche im Einzugsgebiet der Versickerungsanlage [S. 41]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5 Gl. 2, S.41)', verified_at=now() where id='d1a38110-0000-0000-0000-0000000000a2' and verification_status not in ('verified_against_standard','corrected');

-- A_E_b_a_total
update public.fields set verification_status='verified_against_standard', verification_quote='AE,b,a m² Befestigte, angeschlossene Fläche im Einzugsgebiet [S. 17]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§3.2 Tab. 2, S.17)', verified_at=now() where id='dd3945c7-477c-4acb-a065-012e745e359e' and verification_status not in ('verified_against_standard','corrected');

-- A_E_nb_a_total
update public.fields set verification_status='verified_against_standard', verification_quote='AE,nb,a,i m² Nicht befestigte, angeschlossene Teilfläche im Einzugsgebiet [S. 17]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§3.2 Tab. 2, S.17)', verified_at=now() where id='a514ba2e-5077-4ae5-80ed-8db90eb21567' and verification_status not in ('verified_against_standard','corrected');

-- C_m
update public.fields set verification_status='verified_against_standard', verification_quote='In der Regel ist eine Bemessung mit dem mittleren Abflussbeiwert im Einfachen Verfahren bis Bemessungshäufigkeiten ≥ 0,1/a möglich. [S. 41]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.41)', verified_at=now() where id='393925ec-7ddd-4a76-9829-059b2a64a3b7' and verification_status not in ('verified_against_standard','corrected');

-- D_min
update public.fields set verification_status='verified_against_standard', verification_quote='Die Ermittlung der maßgeblichen Dauerstufe D und der Regenspende rD(n) erfolgt bei Versickerungsanlagen mit Speicherfunktion iterativ (siehe Abschnitt 6). [S. 42]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.42)', verified_at=now() where id='e8f2de04-8434-4998-8a67-0e2bf772cc0d' and verification_status not in ('verified_against_standard','corrected');

-- sub_areas_A138_10
update public.fields set verification_status='verified_against_standard', verification_quote='Für die Berechnung der Zuflüsse zu Versickerungsanlagen im Einfachen Verfahren ergibt sich der Rechenwert AC gemäß Gl. (2): AC = ∑(AE,b,a,i · Ci) + ∑(AE,nb,a,i · Ci) [S. 41]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5 Gl. 2, S.41)', verified_at=now() where id='be517c98-bd49-4dd3-87bb-85d41c601021' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-11 Versickerungsrate und Korrekturfaktoren (2) ----------

-- a138_k_f_geo  (Hinweis: "geometrisches Mittel" ist App-Aggregation; Norm definiert kf)
update public.fields set verification_status='verified_against_standard', verification_quote='kf m/s Durchlässigkeitsbeiwert bzw. hydraulische Leitfähigkeit eines wassergesättigten Bodens [S. 18]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§3.2 Tab. 2, S.18)', verified_at=now() where id='7af2b6e8-18ce-443e-942f-6a1de3b8895f' and verification_status not in ('verified_against_standard','corrected');

-- a138_korrekturfaktor
update public.fields set verification_status='verified_against_standard', verification_quote='Der resultierende Korrekturfaktor berechnet sich wie folgt: fK = fOrt · fMethode ≤ 1 [S. 45]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.6 Gl. 6, S.45)', verified_at=now() where id='52b6f9cb-0821-448e-85e5-1aca402f11a7' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-12 Versickerungsleistung und mittlere Fläche (5) ----------

-- a_s_m_determination_method
update public.fields set verification_status='verified_against_standard', verification_quote='Im Einfachen Verfahren kann die mittlere Versickerungsfläche AS,m in Gl. (7) entweder auf Grundlage einer vorgegebenen Geometrie oder vereinfacht vorgegeben werden. In Tabelle 13 werden in Abhängigkeit der Bodenart Größenordnungen zur Abschätzung von AS,m unabhängig von der Geometrie der Anlage gegeben. [S. 56]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§6.3, S.56)', verified_at=now() where id='1c8c9d12-5919-45a0-93f1-fd2d8b3b7c63' and verification_status not in ('verified_against_standard','corrected');

-- ac_as_ratio
update public.fields set verification_status='verified_against_standard', verification_quote='… werden deshalb in Tabelle 6 Anforderungen an die Mindestmächtigkeit und die maximale stoffliche und hydraulische Flächenbelastung (ausgedrückt durch das Verhältnis des Rechenwerts AC gemäß Gl. (2) zur mittleren Versickerungsfläche AS,m gemäß Gl. (7)) der bewachsenen Bodenzone gestellt. [S. 30-31]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.2.3.2, S.30-31)', verified_at=now() where id='ed25fd54-51a5-4749-89fd-24192ec7ae73' and verification_status not in ('verified_against_standard','corrected');

-- ac_as_ratio_check
update public.fields set verification_status='verified_against_standard', verification_quote='Das aus qualitativer Sicht erforderliche Verhältnis AC / AS,m (Tabelle 6) ist nachzuweisen. [S. 57]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§6.3, S.57)', verified_at=now() where id='d3511149-a224-40ad-95d6-05708f3d7d60' and verification_status not in ('verified_against_standard','corrected');

-- ac_as_ratio_limit  (Tabellenzeilen kolumnar wie gedruckt)
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 6 (Mindestmächtigkeit bewachsene Bodenzone ≥ 20 cm / ≥ 30 cm): BK II: AC / AS,m ≤ 30 | AC / AS,m ≤ 50; BK III: AC / AS,m ≤ 15 | AC / AS,m ≤ 30 [S. 31]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.2.3.2 Tab. 6, S.31)', verified_at=now() where id='232fdcbe-26c1-42c1-87c7-646efe2faa4a' and verification_status not in ('verified_against_standard','corrected');

-- soil_bodenart_tab13  (Tabellenzeilen kolumnar wie gedruckt)
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 13: Größenordnungen AS,m nach Bodenart — Mittel-/Feinsand: 0,10 · AC; schluffiger Sand, sandiger Schluff, Schluff: 0,20 · AC [S. 56]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§6.3 Tab. 13, S.56)', verified_at=now() where id='a0cd8e61-006c-44f9-bdeb-df761d8b05a8' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-13 Speichervolumen und Bemessungsprüfung (5) ----------

-- a138_speichertyp
update public.fields set verification_status='verified_against_standard', verification_quote='VVA m³ Erforderliches Speichervolumen der Versickerungsanlage (VA), zum Beispiel VM (Erforderliches Speichervolumen der Mulde), VR (Erforderliches Speichervolumen der Rigole), VMR (Erforderliches Speichervolumen des Mulden-Rigolen-Elements) [S. 20]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§3.2 Tab. 2, S.20)', verified_at=now() where id='3a327d2d-8013-464c-be6f-112402e8904b' and verification_status not in ('verified_against_standard','corrected');

-- a138_V_Sp_vorhanden
update public.fields set verification_status='verified_against_standard', verification_quote='Außer bei der Flächenversickerung stellt das erforderliche Speichervolumen der Versickerungsanlage die Bemessungszielgröße dar. [S. 47]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.7, S.47)', verified_at=now() where id='0c5051cd-c992-4287-a8b1-187eb3af9393' and verification_status not in ('verified_against_standard','corrected');

-- D_min
update public.fields set verification_status='verified_against_standard', verification_quote='Die Ermittlung der maßgeblichen Dauerstufe D und der Regenspende rD(n) erfolgt bei Versickerungsanlagen mit Speicherfunktion iterativ (siehe Abschnitt 6). [S. 42]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.42)', verified_at=now() where id='d1381310-0000-4000-8000-000000000002' and verification_status not in ('verified_against_standard','corrected');

-- r_D_n
update public.fields set verification_status='verified_against_standard', verification_quote='Die Ermittlung der maßgeblichen Dauerstufe D und der Regenspende rD(n) erfolgt bei Versickerungsanlagen mit Speicherfunktion iterativ (siehe Abschnitt 6). [S. 42]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.42)', verified_at=now() where id='d1381310-0000-4000-8000-000000000001' and verification_status not in ('verified_against_standard','corrected');

-- rainfall_table_ref
update public.fields set verification_status='verified_against_standard', verification_quote='Als Regendaten sind örtliche Niederschlag-/Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. [S. 42]', verification_note='SR-1 Kampagnen-Verifikation 2026-08-01 (§5.3.3.5, S.42)', verified_at=now() where id='d1384013-0000-4000-8000-000000000001' and verification_status not in ('verified_against_standard','corrected');

-- ============================================================================
-- End of pack: 43 UPDATE statements.
-- ============================================================================
