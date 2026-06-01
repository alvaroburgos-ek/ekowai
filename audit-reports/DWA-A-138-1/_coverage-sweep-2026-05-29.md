# DWA-A 138-1 — Source→DB Coverage Sweep §5 + §6
Date: 2026-05-29. Source: `data/norm-text/DWA-A-138-1.md` L695–2270.
Scope: every normative requirement (muss/müssen, sollte/soll, darf nicht, einzuhalten, numeric thresholds, Tab. 3–14, Gl. 1–41) in §5 (Planung) and §6 (Versickerungsanlagen). §7 (Bau) explicitly out of scope.

## Summary
- §5 requirements catalogued: **38** total → 27 covered, 6 partial, 4 missing, 1 n/a
- §6 requirements catalogued: **42** total → 32 covered, 6 partial, 3 missing, 1 n/a
- Equations Gl. 1–41 in DB: **all 41 present** (A138-10/11/12/13/16-22/26), source→DB equation coverage is 100%.
- Tabellen 1–14 status: Tab. 1, 2 are in §4 (out of scope). Tab. 3 covered indirectly via A138-02 feasibility fields. Tab. 4 is reference (n/a). Tab. 5 covered (enum on `belastungskategorie`). Tab. 6 / Tab. 7 partially covered (BK→AFS63/η fields exist on A138-06; numeric `AC/A_S,m` ratio limits and bewachsene-Bodenzone thickness branches NOT enforced as compliance rules). Tab. 8 covered (n/T_n on A138-08). Tab. 9 covered (C_m / C_S on A138-07 / A138-26). Tab. 10/11 covered (f_Ort, f_Methode on A138-08/11). Tab. 12 reference (n/a). Tab. 13 (A_S,m by Bodenart) NOT in DB. Tab. 14 (summary thresholds per Anlagentyp) partially covered via individual `*_check` fields but no single Tab.-14 compliance ruleset.
- Top-3 gap categories:
  1. **Qualitative Standort-/Verbot-Regeln** (§5.2.1 Brunneneinleitung-Verbot; §6.7.2 Versickerungsschacht-Filter k_f ≤ 1·10⁻³ Schutz; Vermeidung Einbauten in Anlagen): no compliance rows enforce them.
  2. **Behandlungs-Wirkungsgrad-Zuordnung** (Tab. 6 + Tab. 7): η-Felder existieren in A138-06, aber kein automatischer Soll-Wert pro BK (40/70/80 % AFS63; 50/65/75 % gelöste Stoffe) und keine `AC/A_S,m`-Schwelle als Compliance.
  3. **Tab. 14 Anlagen-Steckbrief**: Einstauhöhen, Freibord, Böschungs- und Entleerungs-Grenzwerte je Anlagentyp sind teils als Felder, aber nicht als einheitliche Compliance-Regeln verankert (z. B. h_M ≤ 30 cm, h_Becken ≥ 50 cm, t_E ≤ 84 h, Freibord ≥ 35 cm Becken).

## §5 — Planung

| Source clause | Source line(s) | Requirement (short) | DB target (table:id) | Status |
|---|---:|---|---|---|
| §5.1.1 GW-Flurabstand | L705 | Abstand Sohle→MHGW ≥ 1 m i. d. R. (sonst Behördenabstimmung) | fields:A138-02.gw_clearance, A138-05.clearance_a; compliance:A138-REQ-04 | covered |
| §5.1.1 Bodenbelastungen | L709 | Horizontaler Mindestabstand zu Altlasten (Einzelfall) | fields:A138-02.contaminated_land_status | partial (kein Mindest-m) |
| §5.1.1 Wasserschutzgebiete | L713–714 | Zone I nicht zulässig; Zone II/III stark eingeschränkt | — | missing |
| §5.1.1 k_f-Untergrenze | L718 | k_f ≥ 1·10⁻⁶ m/s für reine Versickerung (ausser breitflächig) | fields:A138-05.k_f, A138-05.kf_too_high_flag; clause refs §5.3.1 | covered |
| §5.1.2 Tab. 3 Umsetzbarkeit | L739–755 | Drei-Spalten-Bewertung (möglich/potenziell/nicht) | fields:A138-02.feasibility_determination; compliance:A138-REQ-02 | covered |
| §5.2.1 Sickerraum a | L777 | Mächtigkeit a abhängig Belastung/Boden, BehördAbst., a ≥ 1 m ⇒ verzichtbar | fields:A138-05.clearance_a | covered |
| §5.2.1 Brunneneinleitung | L779 | "Einleiten direkt in Grundwasser über Brunnen ist NICHT zulässig" | — | **missing** |
| §5.2.1 Bankett-Versickerung | L781 | Mindestabstand 1 m MHGW↔Fahrbahnrand | — | missing |
| §5.2.2 Tab. 5 BK-Zuordnung | L798–866 | Flächengruppen→BK I/II/III | fields:A138-06.belastungskategorie (enum), A138-07 Abflussbeiwert-Inventar | covered |
| §5.2.3.1 GFS / BBodSchV | L899–901 | Schwellenwerte GrwV einhalten; BBodSchV "muss" eingehalten | — | partial (kein Compliance-Row) |
| §5.2.3.2 Tab. 6 BBZ Mindestmächtigkeit | L910–940 | ≥ 20 / 30 cm je BK; n_M max 1–2/a | fields:A138-06.bbz_thickness; A138-19.n_M_overflow_limit, n_M_overflow_check | partial (Mindestmacht. keine harte Compliance) |
| §5.2.3.2 Tab. 6 AC/A_S,m ≤ 15/30/50 | L920–926 | hydraul. Flächenbelastung obergrenze je BK | — | **missing** |
| §5.2.3.2 BBZ-Boden Anforderungen | L948–956 | Sieblinie/Schlämmkorn ≤ 20 %; Humus 1–4 %; pH 6–8; k_f,max ≤ 1·10⁻⁴ | fields:A138-06.bbz_schlaemmkorn, bbz_organisch, bbz_ph, bbz_kf_max_check | covered |
| §5.2.3.3 Tab. 7 η_AFS63 / η_gelöst | L982–1023 | 40/70/80 % AFS63; 50/65/75 % gelöste Stoffe je BK | fields:A138-06.eta_AFS63, eta_geloest, treatment_efficiency_check | partial (Sollwert pro BK nicht hart codiert) |
| §5.2.3.3 Kritische Regenspende | L967 | Bemessung dezentr. Behandl. mit r_krit = 25 l/(s·ha) | fields:A138-06.r_krit | covered |
| §5.3.1 k_f-Bandbreite | L1031 | 1·10⁻³ ≤ k_f ≤ 1·10⁻⁶; > 10⁻³ ⇒ Behörde | fields:A138-05.kf_too_high_flag | covered |
| §5.3.1 Maßgebliche Bodenschicht | L1039 | Bei oberird. Anlagen: BBZ berücksichtigen (kleinerer Wert maßgebend) | clause_ref auf §5.3.3.6 in A138-11 Felder | covered |
| §5.3.1 Aushub/Bohrungen | L1039 | Aushubmaterial BM-0 / filterstabil / BBodSchV § 8 | — | missing |
| §5.3.1 Kolmation-Vermeidung | L1050 | Anlagen frei von Schicht-/Stau-/Sickerwasser | — | n/a (operativ) |
| §5.3.2 Mindestabstand Gebäude | L1058 | 1,5 × Baugrubentiefe + ≥ 0,50 m von Böschungsoberkante | fields:A138-02.building_pit_depth_a, distance_to_building_actual, building_clearance_status, distance_to_building_check | covered |
| §5.3.2 Zentralanlage > mittl. Beckenbreite | L1066 | Beckenrand-Bebauung > mittl. Beckenbreite | — | missing |
| §5.3.2 Grenzabstand | L1068 | Nachbarschutz Sickerwasser/Überflutung | fields:A138-02.distance_to_building_actual (proxy) | partial |
| §5.3.3.2 Einfaches Verfahren Bedingungen | L1088–1094 | A_E ≤ 200 ha oder t_f ≤ 15 min; n ≥ 0,1/a; q_S ≥ 2 l/(s·ha) | fields:A138-08.A_E, t_f, n, simple_method_applicable; equations:Gl.9; compliance:A138-REQ-15 | covered |
| §5.3.3.3 Nachweisverf. — 10 a Reihe, ≤ 5 min Aufl. | L1107 | M ≥ 3·T_n (Gl. 1) | equations:A138-13 Gl. 1 | covered |
| §5.3.3.4 Tab. 8 n / T_n | L1130–1196 | Bemessungs- u. Überflutungshäufigkeit je Schutzkat. | fields:A138-08.n, T_n; compliance:A138-REQ-08 | covered |
| §5.3.3.5 Gl. 2 A_C | L1206–1220 | A_C = Σ(A_E·C_i) | equations:A138-10 Gl. 2; compliance:A138-REQ-10 | covered |
| §5.3.3.5 Gl. 3 Q_zu | L1226–1240 | Q_zu = r_D(n)·(A_C+A_VA)·10⁻⁴ | equations:A138-10 Gl. 3; compliance:A138-REQ-11 | covered |
| §5.3.3.5 Tab. 9 C_m/C_S | L1246–1315 | Abflussbeiwerte Spitzen-/Mittel | fields:A138-07; A138-26.C_S | covered |
| §5.3.3.6 Gl. 4 Q_S | L1320–1329 | Q_S = k_i·A_S·10³ | equations:A138-12 Gl. 4; compliance:A138-REQ-13 | covered |
| §5.3.3.6 Gl. 5/6 k_i / f_K | L1344–1367 | k_i = k·f_K; f_K = f_Ort·f_Methode ≤ 1 | equations:A138-11 Gl. 5,6; fields:A138-08.f_ort, A138-11.k_i, f_K; compliance:A138-REQ-12 | covered |
| §5.3.3.6 Probestellen-Dichte | L1336–1340 | ≥ 1 Versuch/150 m²; +25 m bei Heterogenität | fields:A138-05.kf_test_sites_count, kf_test_density_check | covered |
| §5.3.3.6 Tab. 10 f_Ort | L1371–1375 | Wertebereich 0,3–1,0 | fields:A138-08.f_ort (enum/numeric) | covered |
| §5.3.3.6 Tab. 11 f_Methode | L1379–1393 | 0,1–1,0 je Methode | fields:A138-08 (clause refs Tab.10/11); enum A138-11 | covered |
| §5.3.3.7 Gl. 7 A_S,m | L1405–1417 | A_S,m = (A_S,min+A_S,max)/2 | equations:A138-12 Gl. 7 | covered |
| §5.3.3.7 Gl. 8 V_VA | L1422–1440 | erforderl. Speichervolumen | equations:A138-13 Gl. 8; compliance:A138-REQ-14 | covered |
| §5.3.3.7 f_Z 1,1–1,2 | L1446 | Zuschlagsfaktor 1,1–1,2, ggf. 1,2 wenn q_S ≤ 5 | fields:A138-08.f_Z | partial (Wertebereich nicht erzwungen) |
| §5.3.3.7 Gl. 9 q_S,AC ≥ 2 | L1448–1463 | spez. Versickerungsleistung ≥ 2 l/(s·ha) | equations:A138-13 Gl. 9; compliance:A138-REQ-15, A138-REQ-21 | covered |
| §5.3.4.1 Überflutungs-Trigger | L1498 | AC > 800 m² ⇒ Überflutungsnachweis nach DIN 1986-100 | compliance:A138-REQ-22; fields:A138-26.A_E_b_a_flood | covered |
| §5.3.4.1 Gl. 10 V_Rück | L1499–1521 | Rückhaltevolumen, n = 0,033/a (T_n = 30 a) | equations:A138-26 Gl. 10; fields:A138-26.V_Rueck, T_n_Ue, r_D_30; compliance:A138-REQ-23 | covered |
| §5.3.4.1 70 % Dächer ⇒ T_n = 100 a | L1528 | bei > 70 % nicht überflutbar T_n=100 a | fields:A138-26.T_n_Ue (Wertebereich) | partial (kein automatischer Switch) |
| §5.3.5 Wassertiefe ≤ 40 cm Wohn | L1546 | DIN 18034-1 max 40 cm inkl. Freibord | fields:A138-02.residential_accessibility, A138-22.residential_depth_check | covered |
| §5.3.5 Böschungsneigung 1:3 / max 1:1,5 | L1548 | Tab. 14 | fields:A138-17.boeschungsneigung | covered |

## §6 — Versickerungsanlagen

### §6.1 Allgemeines

| Source clause | Source line(s) | Requirement (short) | DB target | Status |
|---|---:|---|---|---|
| §6.1 Anlagentyp-Auswahl | L1581–1592 | Auswahl gemäß Bild 7; Varianten zulässig mit Begründung | fields:A138-15.facility_type_selected; compliance:A138-REQ-17, A138-REQ-18 | covered |
| §6.1 Zisternen-Anrechenbarkeit | L1596 | nur mit Zwangsentleerung anrechenbar | — | missing |

### §6.2 Versickerungsfläche

| Source clause | Source line(s) | Requirement (short) | DB target | Status |
|---|---:|---|---|---|
| §6.2.1 DIBt-Beläge 270 l/(s·ha) | L1613 | durchläss. Beläge: dauerhaft 270 l/(s·ha) | — | missing |
| §6.2.2 Gl. 11 / 12 A_S | L1617–1629 | erforderl. Versickerungsfläche | equations:A138-16 Gl. 11, 12 | covered |
| §6.2.2 Gl. 13 Bedingung k_i > r·10⁻⁷ | L1640–1645 | Mindestinfiltration | equations:A138-16 Gl. 13; fields:A138-16.k_i_ge_r_check | covered |
| §6.2.2 D = 10 (15) min | L1652 | Dauerstufe 10 min, ggf. 15 min | fields:A138-16.D_min_used | covered |

### §6.3 Versickerungsmulde

| Source clause | Source line(s) | Requirement (short) | DB target | Status |
|---|---:|---|---|---|
| §6.3.1 h_max ≤ 30 cm | L1659 | maximaler Bemessungseinstau Mulde 30 cm | fields:A138-17.h_M (Bereich nicht hart) | partial (kein Compliance-Check) |
| §6.3.1 Sohlen horizontal | L1659 | Sohlenebenen horizontal, Kaskaden bei Gefälle | — | n/a (geometrisch) |
| §6.3.2 Gl. 14 V_M | L1678–1696 | Muldenspeichervolumen | equations:A138-17 Gl. 14 | covered |
| §6.3.2 Gl. 15 / 16 A_S,m | L1717–1735 | A_S,m über h_M | equations:A138-17 Gl. 15, 16 | covered |
| §6.3.2 Tab. 13 A_S,m je Bodenart | L1706–1713 | Mittel-/Feinsand 0,10·AC; Schluff 0,20·AC | — | **missing** |
| §6.3.2 t_E ≤ 84 h | L1740 | Entleerungszeit bei n = 1/a | fields:A138-17.t_E (Wert vorhanden, kein Limit) | partial |

### §6.4 Rigole

| Source clause | Source line(s) | Requirement (short) | DB target | Status |
|---|---:|---|---|---|
| §6.4.1 Filterstabilität | L1755 | abgestufte Körnung / Vliesstoff | — | missing |
| §6.4.1 Kontrollöffnungen | L1757 | Inspektionsfreundliche Öffnungen | — | n/a (operativ) |
| §6.4.2 Gl. 17 A_S,m | L1763 | A_S,m Rigole | equations:A138-18 Gl. 17 | covered |
| §6.4.2 Gl. 18 Q_S | L1778 | Versickerungsleistung Rigole | equations:A138-18 Gl. 18 | covered |
| §6.4.2 Gl. 19 V_R | L1789 | Speichervolumen Rigole | equations:A138-18 Gl. 19 | covered |
| §6.4.2 Gl. 20–23 s_R / L_R | L1807–1850 | Speicherkoeffizient, Länge | equations:A138-18 Gl. 20, 21, 22, 23 | covered |
| §6.4.2 Gl. 24 / 25 q_VS / L_VS Nachweis | L1852–1887 | Wasseraustritt Vollsickerohr (v ≈ 0,1 m/s); L_VS·q_VS ≥ r_5·AC·10⁻⁴ | equations:A138-18 Gl. 24, 25; fields:A138-18.q_VS, L_VS, r_5_n | covered |

### §6.5 Mulden-Rigolen-Element

| Source clause | Source line(s) | Requirement (short) | DB target | Status |
|---|---:|---|---|---|
| §6.5.1 k_f BBZ ≥ 1·10⁻⁵ MRE | L1895 | BBZ-Mindestdurchlässigkeit langfristig | — | missing |
| §6.5.1 Tab. 6/7 für MRE einhalten | L1903 | n_M-Überlauf in Rigole limitiert | fields:A138-19.n_M_overflow_limit, n_M_overflow_check | covered |
| §6.5.2 Gl. 26 V_MR | L1911–1916 | V_MR = V_M + V_R | equations:A138-19 Gl. 26 | covered |
| §6.5.2 Gl. 27 / 28 | L1928–1940 | V_R via Volumenbilanz, V_MR allgemein | equations:A138-19 Gl. 27, 28 | covered |
| §6.5.2 n_Mulde = 1/a (i.d.R.) | L1925 | Bemessungshäufigkeit Mulde im MRE | fields:A138-19.n_R; A138-17.n_M_Bemessung | covered |
| §6.5.2 Gl. 29 L_R | L1944–1948 | Rigolenlänge im MRE | equations:A138-19 Gl. 29 | covered |
| §6.5.2 Gl. 30 / 31 V_MÜ / Q_MÜ | L1972–1996 | Muldenüberlauf-Dimensionierung | equations:A138-20 Gl. 30, 31; fields:A138-20.V_MUE, r_MUE, Q_MUE | covered |

### §6.6 Mulden-Rigolen-System

| Source clause | Source line(s) | Requirement (short) | DB target | Status |
|---|---:|---|---|---|
| §6.6.1 k_f < 1·10⁻⁶ ⇒ Ableitung | L2011 | MRS erst bei kleiner Durchlässigkeit | fields:A138-05.k_f (Eingangswert) | partial (kein automatischer Switch) |
| §6.6.2 Gl. 32 L_R MRS | L2029–2031 | Rigolenlänge mit Q_Dr | equations:A138-20 Gl. 32 | covered |
| §6.6.2 Gl. 33 Q_Dr mittel | L2057 | mittlerer Drosselabfluss | equations:A138-20 Gl. 33; fields:A138-20.Q_Dr, Q_Dr_min, Q_Dr_max | covered |
| §6.6.2 Drossel-Abstimmung Behörde | L2055 | Drosselleistung mit Wasserbehörde abstimmen | — | n/a (procedural) |

### §6.7 Versickerungsschacht

| Source clause | Source line(s) | Requirement (short) | DB target | Status |
|---|---:|---|---|---|
| §6.7.1 Mindestdurchmesser DN 1000 | L2075 | "darf nicht unterschritten werden" | fields:A138-21.schacht_d_i_check, d_S_innen | covered |
| §6.7.1 Schacht Typ B Filterschicht ≥ 50 cm | L2085 | carbonathaltiger Sand 0–4 mm, ≥ 50 cm | fields:A138-21.schacht_filter_thickness, schacht_filter_thickness_check | covered |
| §6.7.1 Typ B k_f ≤ 1·10⁻³ Filter | L2085 / L2169 | Durchlässigkeit Filter muss gewährleistet | fields:A138-21.k_f_FS; equations:A138-21 Gl. 39 | covered |
| §6.7.1 Schacht-Abstand a ≥ §5.2.1 | L2093 | Abstand MHGW ↔ Schachtsohle/UK Filter | fields:A138-05.clearance_a (gemeinsame Größe) | covered |
| §6.7.2 Gl. 34–37 A_S/V_S/h_S | L2100–2151 | Versickerungsfläche, Volumen, Einstau | equations:A138-21 Gl. 34, 35, 36, 37 | covered |
| §6.7.2 Gl. 38/39 Filterschicht-Bedingung | L2155–2167 | A_S,FS·k_f,FS ≥ A_S,Schacht·k_i | equations:A138-21 Gl. 38, 39 | covered |
| §6.7.2 erf. k_f,FS ≤ 1·10⁻³ | L2169 | Grundwasserschutz-Obergrenze Filter | — | **missing** (kein Compliance-Row) |
| §6.7.2 Gl. 40 h_S wenn Filter maßgebend | L2172–2176 | Bemessung bei Filterschicht-Limitierung | equations:A138-21 Gl. 40 | covered |

### §6.8 Versickerungsbecken

| Source clause | Source line(s) | Requirement (short) | DB target | Status |
|---|---:|---|---|---|
| §6.8.1 AC/A_S,m > 15 | L2204 | i. d. R. > 15 | — | missing |
| §6.8.1 k_i ≥ 1·10⁻⁵ Becken | L2204 | hohe Belastung erfordert k_i ≥ 1e-5 | fields:A138-22.basin_ki_min_check | covered |
| §6.8.1 h ≥ 0,5 m Einstau | L2204 | Einstauhöhe i. d. R. ≥ 0,5 m | fields:A138-22.h_B, basin_h_check | covered |
| §6.8.2 Gl. 41 V_VA Becken | L2212–2236 | erforderl. Speichervolumen Becken | equations:A138-22 Gl. 41; fields:A138-22.V_B, A_S_m_Becken, A_VA_Becken | covered |
| §6.8.2 Sohlen-/Böschungs-k_f differenziert | L2240 | bei großen h und Bodenprofilen | — | n/a (Modellierungsfeinheit) |

### §6.9 / Tab. 14 — Anlagen-Übersicht

| Source clause | Source line(s) | Requirement (short) | DB target | Status |
|---|---:|---|---|---|
| Tab. 14 k_f maßgebliche Bodenschicht | L2254 | ≥ 1·10⁻⁶ (Becken: ≥ 1·10⁻⁵) | fields:A138-05.k_f, A138-22.basin_ki_min_check | covered |
| Tab. 14 BBZ-Mächtigkeit ≥ 20 cm | L2255 | außer Rigole/Schacht | fields:A138-06.bbz_thickness | partial (Schwelle nicht erzwungen) |
| Tab. 14 BBZ k_f ca. 1·10⁻⁵ langjährig | L2256 | langjähriger Betriebswert | — | missing |
| Tab. 14 Einstauhöhe Mulde ≤ 30 cm | L2257 | Tab. 14-Spalte Mulde | fields:A138-17.h_M | partial |
| Tab. 14 Einstau Becken ≥ 50 cm | L2257 | Tab. 14-Spalte Becken | fields:A138-22.h_B | covered |
| Tab. 14 Freibord ≥ 10 cm MRE / ≥ 35 cm Becken | L2258 | Überlauf-Freibord | fields:A138-17.freibord (Mulde) | partial (kein Becken-Freibord-Feld) |
| Tab. 14 Böschungsneigung ≤ 1:1,5 | L2259 | i. d. R. flacher | fields:A138-17.boeschungsneigung | covered |
| Tab. 14 Entleerungszeit ≤ 84 h | L2260 | t_E bei n = 1/a | fields:A138-17.t_E | partial |

## Gaps requiring decision (≤10 highest-priority)

1. **§5.2.1 L779 — Brunnen-Verbot.** "Das Einleiten von Niederschlagswasser direkt in das Grundwasser, zum Beispiel über Brunnen, ist nicht zulässig." Kein Compliance-Row in A138-02. → Compliance row in A138-02: `clause_ref = §5.2.1`, severity = `blocker`, mit Boolean-Field `direct_gw_injection` oder Erweiterung `feasibility_determination` enum.
2. **§5.2.3.2 Tab. 6 — AC/A_S,m ≤ 15/30/50.** Hydraul. Flächenbelastung-Obergrenzen je BK existieren weder als Field noch als Compliance. → Neue Felder auf A138-17 (Mulde) und A138-22 (Becken): `AC_AS_ratio_actual`, `AC_AS_ratio_limit`, `AC_AS_ratio_check`, abgeleitet aus `belastungskategorie` + BBZ-Mächtigkeit-Switch.
3. **§5.2.3.3 Tab. 7 — η-Soll je BK.** Felder `eta_AFS63` / `eta_geloest` existieren, aber kein Sollwert-Lookup (40/70/80 % bzw. 50/65/75 %). → Compliance auf A138-06: `verify_AFS63_against_BK`, `verify_dissolved_against_BK`.
4. **§6.3.2 Tab. 13 — A_S,m Größenordnung je Bodenart.** Faustwerte 0,10·AC / 0,20·AC nicht in DB. → Neues Feld `A_S_m_recommended` (Berechnung) auf A138-17.
5. **§6.7.2 L2169 — erf. k_f,FS ≤ 1·10⁻³.** Gl. 39 berechnet erforderliche Filter-Durchlässigkeit, aber Obergrenze 1·10⁻³ m/s wird nicht geprüft. → Compliance row in A138-21: `kf_FS_upper_limit_check`.
6. **§6.5.1 L1895 / Tab. 14 — k_f BBZ ≥ 1·10⁻⁵ langjährig.** MRE-Spezifikum + Tab. 14 Aussage „ca. 1·10⁻⁵". Keine DB-Verankerung. → Compliance row in A138-19 oder global Feld `bbz_kf_long_term`.
7. **§5.3.3.7 L1446 — f_Z Wertebereich 1,1–1,2.** Field `f_Z` ohne validation_rules. → `validation_rules: {min:1.1, max:1.2}` + Compliance „f_Z = 1,2 erforderlich bei q_S,AC ≤ 5".
8. **Tab. 14 Freibord Becken ≥ 35 cm.** Field nur auf A138-17 (Mulde), nicht auf A138-22. → Feld `freibord_B` auf A138-22 + Compliance.
9. **§6.1 L1596 — Zisternen-Anrechenbarkeit.** Nur mit Zwangsentleerung anrechenbar; im Wizard nicht modelliert. → Feld + Compliance auf A138-15 oder neuer „Zisterne"-Anlagentyp.
10. **§5.3.4.1 L1528 — 70 %-Regel T_n = 100 a Switch.** `T_n_Ue` ist auf A138-26 freier Wert; automatischer Trigger bei `Anteil_unueberflutbar > 70 %` fehlt. → derived field `Tn_Ue_recommended` + Validation gegen `T_n_Ue`.
