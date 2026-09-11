# FLL-GAR-2023 — Inventory (surface-inventory pattern)

## 0. Sources used
- Transcript: `C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\FLL-Gewässerabdichtungsrichtlinien.md` (German FLL Gewässerabdichtungsrichtlinien 2023, flattened text; Tab. 1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 16, 18, 19, 22, 24, 25, 26, 27, 28 located; Tab. 9–11, 15, 17, 20, 21, 23, 29 not read). Companion: `FLL-TP Rhizomfestigkeit Gewässer-.md` (not used).
- Prod dump: `scratchpad/std/FLL-GAR-2023.json` — 29 worksheets, 174 fields, 4 equations, 30 requirements.

## 1. Table-lookup candidates (category → predetermined values)

| worksheet | selector field | dependent fields filled | guideline table | override allowed? | table in transcript |
|---|---|---|---|---|---|
| FLL-GAR-09 → -07 | `abdichtungs_art` (enum, 12 values present) | max `boeschungsneigung_ratio` / `gefaelle_percent` | Tab. 1 §4.5 | "Die angegebenen Werte sind Richtwerte und hängen u. a. von den örtlichen Gegebenheiten ab"; "entbinden nicht von einer rechnerischen Überprüfung der Stand- und Gleitsicherheit" → override with shear-test proof | yes — block A |
| FLL-GAR-09 | `abdichtungs_art` | which material worksheet (10…21) is active; `wurzel_rhizomfestigkeit_required` (PEHD: "Auf eine Prüfung ... kann verzichtet werden"; PELD/Bitumen/GTD/Fugen: "Nachweis ... gemäß FLL zu erbringen") | §4.7, §5–7 | fixed | text |
| FLL-GAR-10 | mineral type (natürlich vorkommend / industriell aufbereitet; no field) | `schichtdicke_abdichtung_cm` (≥30 in 2 Lagen 15–20 / ≥10), `schichtdicke_auflast_cm` (≥30 / ≥20) | Tab. 4 §5.1.1.2 | "Abweichungen von 10% der vorgegebenen Schichtdicken sind zulässig"; "nach Eignungsprüfung" | yes — block B |
| FLL-GAR-10 | mineral soil class (Tab. 2 rows) | `kf_abdichtung` range, water loss m³/(a·m²) | Tab. 2 §5.1 | "rechnerisch ermittelte Richtwerte ... bei einer Druckhöhe 3 m" | partly (rows garbled) — block B |
| FLL-GAR-11 | — | `mz_dicke` ≥30 cm in 2 Lagen 15–20; Auflast ≥30 | Tab. 5 | 10 % deviation allowed | yes — block B |
| FLL-GAR-12 | `bauteildicke_cm` (≤40 / >40) | `wasserzementwert` (≤0,60 / ≤0,70), `zementgehalt_kg_m3` (≥280), `druckfestigkeit_fck` (≥C25/30) | Tab. 6 §5.3.1 | requirement | yes — block C |
| FLL-GAR-12 | `anwendungsfall_concrete` (enum, present) | Festigkeitsklasse, Expositionsklasse, Feuchtigkeitsklasse, Bewehrungsüberdeckung c_nom | Tab. 7 | requirement | yes — block C |
| FLL-GAR-12 | `bauteil_type` × `beton_ausfuehrungsart` (both enum, present) | `bauteildicke_cm` min | Tab. 8 §5.3.1.2 | requirement (Beanspruchungsklasse 1 WU-Richtlinie) | yes — block C |
| FLL-GAR-13 | Mischgutart (`asph_bindemittel` text today) | `asph_dicke` min/max/mean; `hohlraumgehalt_asphaltbeton_vol_pct` ≤3 | Tab. 12 §5.4.1.2 | "Nenndicken ... einzuhalten" | yes — block D |
| FLL-GAR-14 | `bentonit_type` (Na/Ca, present) | `bentonit_flaecheneinheit_g_m2` (≥3.600 / ≥8.000), Wassergehalt ≤15 %, `quellvermoegen_ml` (≥24 / ≥8), Montmorillonit ≥300 mg/g | Tab. 13 §5.5.1 | requirement | yes — block E |
| FLL-GAR-14 | `gtd_polyolefin_beschichtung` × `gtd_auflast_funktion` (present) | Auflast thickness ≥0,30 / ≥0,60 m | Tab. 16 §5.5.2 | "Anhaltswerte"; "Bei Abweichungen ... nutzungs- und ..." (justify) | yes — block E |
| FLL-GAR-05 | `fuellhoehe_m` | `wassereinwirkungsklasse` (W1-B ≤5 m, W2-B ≤10 m, W3-B >10 m); `rissklasse` from expected crack width; `standortklasse` from building connection | Tab. 18 §6 | classification (fixed) | yes — block F |
| FLL-GAR-16 | `fuegeverfahren` × `bahn_material_naht` (both enum, present) | `nahtbreite_min_mm` (20/30/40); `naht_ueberlappung_kunststoff_mm` (≥40, ≥60 with Polymerbitumen) | Tab. 22 §6.2.2.1 | requirement | yes — block G |
| FLL-GAR-18 | `pe_beanspruchung_klasse` (enum gering/mittel/hoch/freiliegend, present) | PELD/PEHD Nenndicke (≥0,8 / ≥1,5 & ≥1,0 / ≥2,0 / ≥2,5 mm) | Tab. 25 §6.4.1 | "Eine Kategorisierung der projektspezifischen Einwirkungen ... obliegt dem Objektplanenden" | yes — block H |
| FLL-GAR-18 | — | PEHD Dichte >0,940, MFR ≥1,0/≤3,0, Ruß 2–3 %, NCTL >500 h, OIT >100 min | Tab. 24 | requirement | yes — block H |
| FLL-GAR-22 | Baugrund class DIN 18196 (`baugrund_typ` text today) | Schutzlage unten: Sand-Mindestdicke cm and allowed materials (Vlies ≥300 g/m² GRK 5, Bautenschutzmatten, PE-Granulat >6 mm, Kunststoffbahn >1 mm, Beton/Mörtel >50 mm) | Tab. 26 §8.3.1 | requirement "Andernfalls sind die in Tabelle 26 enthaltenen Werkstoffe ..." | yes (partly) — block I |
| FLL-GAR-22 | Nutzung / dynamic load (no field) | SWK 1/2/3 → `sl_schutzlage_oben_flaechengewicht` ≥300 / ≥500 / ≥800 g/m² | Tab. 27 §8.3.2 | "Mindestanforderungen" | yes — block I |
| FLL-GAR-23 | `abschluss_anwendungsfall` (enum bauteil_bauwerk/freiflaeche/schwimmteich, present) | An-/Abschlusshöhe ≥15 / ≥10 / ≥5 / 0 cm allowed matrix | Tab. 28 §4.8 | "gelten als Mindesthöhen"; footnote 1 "Nur als Sonderkonstruktion" | yes — block J |

**Block A — Tab. 1 (l.1394):**
```
Art der Abdichtung | Neigungsverhältnis | Gefälle in %
rohe oder homogenisierte Grubentone/Lehm, vakuumverpresste Grubentone | ≤ 1:3 | ≤ 33 %
mit Bentonit/Tonmehl/Kunststoff vergütete Böden | ≤ 1:3 | ≤ 33 %
Ortbeton (ohne Schalung) | ≤ 1:2 | ≤ 50 %
Asphaltmastix | ≤ 1:3 | ≤ 33 %
Gussasphalt | ≤ 1:5 | ≤ 20 %
Asphaltbeton | ≤ 1:2 | ≤ 50 %
Geosynthetische Tondichtungsbahnen (GTD) | ≤ 1:3 | ≤ 33 %
Bitumenbahnen | ≤ 1:3 | ≤ 33 %
Kunststoff- und Elastomerbahnen | ≤ 1:1,5 | ≤ 66 %
Abdichtungen mit Flüssigkunststoffen | ≤ 1:1 | ≤ 100 %
Kunststoffbahnen aus PEHD | ≤ 1:1,5 | ≤ 66 %
```

**Block B — Tab. 3 / 4 / 5 (l.1895, 1921, 2222):**
```
Tab. 3: Kornanteil < 0,002 mm ≥ 15 Masse-% (DIN EN ISO 17892-4); organische Substanz VGL ≤ 5 Masse-% (DIN 18128); Kalkgehalt VCA ≤ 15 Masse-% (DIN 18129); kf bei i = 30 ≤ 1 * 10-9 m/s (DIN EN ISO 17892-11); Verdichtungsgrad DPr ≥ 97 % (DIN 18125-2); Einbauwassergehalt wPr ≤ w ≤ w0,97Pr, bei w ≤ wPr: Luftporenanteil na ≤ 5 %
Tab. 4: natürlich vorkommende Böden (rohe/homogenisierte Grubentone/Lehm): Abdichtungsschicht nach Eignungsprüfung ≥ 30 cm, in 2 Lagen von ≥ 15 bis ≤ 20 cm; Auflast/Schutzschicht ≥ 30 cm | industriell aufbereitete Böden (vakuumverpresste Grubentone als Teichbauelemente): ≥ 10 cm ; ≥ 20 cm | Abweichungen von 10% ... zulässig
Tab. 5: natürlich vorkommende Mineralböden mit Bentonit/Tonmehl bzw. Kunststoffen: ≥ 30 cm in 2 Lagen von 15 bis 20 cm; Auflast ≥ 30 cm
Tab. 2 (row 2): durchlässig bis schwach durchlässig, natürlich vorkommende Böden (rohe Tone, Grubentone, Lehme): kf 1*10-6 bis 1*10-7 m/s → Q 946,00 bis 94,60 m³/(Jahr*m²) → 946.000 bis 94.600 m³/Jahr bei 1.000 m² → 2.591.780 bis 259.178 Liter/Tag   (further rows garbled in transcript)
```

**Block C — Tab. 6 / 7 / 8 (l.2437, 2520, 2570):**
```
Tab. 6: d ≤ 40 cm: w/z ≤ 0,60 ; Zementgehalt Z ≥ 280 kg/m3 ; fck ≥ C25/30 | d > 40 cm: w/z ≤ 0,70
Tab. 7: Wasserbecken und Teiche | C25/30 (35/45)¹ | XC4, XF1 (3)¹ | WF | 40 mm
        Bachläufe (offene Gerinne) | C25/30 (35/45)¹ | XC4, XF1 (3)¹ | WF | 40 mm
        Schwimmbecken/Schwimmteiche mit Badewasserqualität | C25/30 (35/45)¹ | XC4, XF1 (3)¹ | WF | 40 mm
        Schwimmbecken mit Sole-/Meerwasserqualität | C35/45 | XC4, XF2, XD2, XS2 (3) je nach Salzgehalt | WA | 55 mm
        Pflanzenkläranlagen/Bodenretentionsfilter | C35/45 | XC4, XF3, XA1 | WA | 40 mm
        ¹ Bei häufig schwankendem Wasserstand (Wasserwechselzone)
Tab. 8: Bauteildicke d in mm | Ortbeton | Elementwände | Fertigteile | Spritzbeton
        Wände | ≥ 240 | ≥ 240¹ | ≥ 200 | ≥ 240²
        Bodenplatte | ≥ 250 | – | ≥ 200 | ≥ 250²
```

**Block D — Tab. 12 (l.2916):** `Asphaltmastix 7 mm / 15 mm / 10 mm (Mittelwert)`; `Gussasphalt 25 mm / 40 mm² / –`; `wasserdichter Asphaltbeton 40 mm¹ / – / –`; ¹ Hohlraumgehalt ≤ 3 Vol.-%; ² bei einlagigem Einbau.

**Block E — Tab. 13 / 16 (l.3106, 3279):**
```
Tab. 13: Bentonit-Flächeneinheit Mclay (DIN EN 14196) ≥ 3.600 g/m2 (Na) / ≥ 8.000 g/m2 (Ca); Wassergehalt w ≤ 15% / ≤ 15%; Quellvermögen (ASTM D 5890) ≥ 24 ml / ≥ 8 ml; Montmorillonitgehalt MB (VDG P 69) ≥ 300 mg/g / ≥ 300 mg/g
Tab. 14: Geotextil Flächeneinheit MA: Bändchengewebe ≥ 100 g/m2; mechanisch verfestigter PP Vliesstoff ≥ 200 g/m2
Tab. 16: Ohne polyolefine Beschichtung: Quellgegendruck ≥ 0,30 m ; Schutz vor Austrocknung und Frost ≥ 0,60 m | Mit polyolefiner Beschichtung: Quellgegendruck + Austrocknung ≥ 0,30 m ; Frost ≥ 0,60 m
```

**Block F — Tab. 18 (l.3670):**
```
Wassereinwirkungsklasse: W1-B ≤ 5 m ; W2-B ≤ 10 m ; W3-B > 10 m (Füllhöhe)
Rissklasse: R0-B keine Rissbreitenveränderung bzw. Neurissbildung ; R1-B bis max. 0,2 mm ; R2-B bis max. 0,5 mm ; R3-B bis max. 1,0 mm, Rissversatz bis 0,5 mm
Standort: S1-B Behälter im Außenbereich, nicht mit einem Bauwerk verbunden ; S2-B Behälter im Außenbereich, an ein Bauwerk angrenzt und verbunden, sowie Behälter im Innenbereich
```

**Block G — Tab. 22 (l.4105):**
```
Quellschweißen | EVA 30 ; PIB 30 ; PVC-P 30
Heißluft-/Heizkeilschweißen | ECB 20 ; EVA 20 ; PIB 20 ; FPO 20 ; PVC-P 20 ; TPE 20 ; EPDM 30
Heißvulkanisation (Hot Bonding) | EPDM 20
Heißluftschweißen | EPDM mit PBS 40
Text: Überlappung Längs-/Quernähte ≥ 40 mm; mit Polymerbitumenbeschichtung ≥ 60 mm
```

**Block H — Tab. 24 / 25 (l.4466, 4531):**
```
Tab. 24 PEHD: Dichte > 0,940 g/cm3 (DIN EN ISO 1183); MFR ≥ 1,0 / ≤ 3,0 g/10 min (DIN EN ISO 1133); Rußgehalt 2-3 % (ASTM D 1603/D 4218); Rußverteilung 2-3 Kategorie (ASTM D 5596); Maßänderung 1 h/100 °C ≤ 2 % (DIN EN 1107-2); NCTL > 500 h (ASTM D 5397 app.); OIT > 100 min bei 200 °C (DIN EN ISO 11357-6)
Tab. 25: geringe Gradienten/Beanspruchung, keine Exposition → PELD ≥ 0,8 mm (private Zier- und Badeteiche, Rhizomsperre) | mittlere → PELD ≥ 1,5 mm / PEHD ≥ 1,0 mm (öffentliche Zierteiche, Bachläufe) | hohe/moderate Exposition → PEHD ≥ 2,0 mm (öffentliche Badeteiche, befahrbare Bereiche, Fließgewässer) | freiliegend/hohe Exposition → PEHD ≥ 2,5 mm (Regenrückhaltebecken, Beschneiungsteiche)
```

**Block I — Tab. 26 / 27 (l.5345, 5423):**
```
Tab. 26 (Baugrund DIN 18196 → Sand-Mindestdicke cm | Vlies ≥300 g/m² GRK 5 | Bautenschutzmatten | PE-Granulat >6 mm | Kunststoffbahn >1 mm | Beton/Mörtel >50 mm):
 GE, GW, GI: 10 | – | – | – | x ; SE, SW, SI: – ... ; GU, GU*, GT, GT*: 10 | – | – | – | x ; SU, SU*, ST, ST*: 5 | – | x | x | x ; UL, UM, UA: 5 | x | x | x | x ; TL, TM, TA: 5 | x | x | x | x   (column alignment uncertain in transcript)
Tab. 27: SWK 1 dynamische Belastung 8,2 kN (begehbar) → Vliesstoff/Geotextil ≥ 300 g GRK 5 ; SWK 2 17,1 kN (leichte Fahrzeuge bis 2,5 t) → ≥ 500 g ; SWK 3 43,7 kN (Fahrzeuge bis 16 t) → ≥ 800 g
```

**Block J — Tab. 28 (l.5735):**
```
An-/Abschlusshöhe über max. Wasserstand | Bauteil/Bauwerk | Freifläche | Schwimmteich
≥ 15 cm | (X) | X | X
≥ 10 cm | –¹ | X | X
≥ 5 cm  | –¹ | X | –¹
0       | –¹ | | 
¹ Nur als Sonderkonstruktion. (X) = nur mit geeigneter Randbefestigung und Sicherung gegen Hinter- und Unterläufigkeit
```

**Class tables without selector in prod:** Tab. 15 (needled Na-GTD properties with/without coating), Tab. 17 (GTD raw materials), Tab. 19 (Bitumenbahn Kurzzeichen — `bb_bahnentyp` is free text), Tab. 20/21/23 (Kunststoffbahn / Flüssigkunststoff types — `fk_systemtyp` free text), Tab. 29 (plant list for rhizome risk — `bep_pflanzenarten` free text), Tab. 9–11 (concrete curing).

## 2. Repeatable-group candidates (one of N)

| worksheet | the thing | member fields | currently modelled | aggregation + consumers |
|---|---|---|---|---|
| FLL-GAR-09…21 | **Abdichtungslage / layer in the sealing build-up** (Regelaufbau: Schutzlage unten, Abdichtung ggf. mehrlagig, Schutzlage/-schicht oben, Auflast) | layer role, material (`abdichtungs_art`), thickness, Flächengewicht, position | one `abdichtungs_art` + `anzahl_lagen` + 12 material worksheets with fixed scalars | Σ thickness; count(lagen) ≥ 2 for Bitumen (REQ-17); consumer FLL-GAR-22, -25 |
| FLL-GAR-07/-08 | **Böschungsabschnitt / basin zone** (Sumpf-, Flach-, Tiefwasserzone; each with own slope) | zone, `boeschungsneigung_ratio`, `gefaelle_percent`, length | single ratio + single % | max slope vs Tab. 1 → REQ-08 |
| FLL-GAR-23 | **Randabschnitt / Anschluss** (per adjoining use: Bauwerk, Freifläche, Schwimmteich) | `abschluss_anwendungsfall`, height cm, Randbefestigung type, Kapillarsperre | single enum + 2 freibord scalars | min height per case vs Tab. 28 → REQ-23 |
| FLL-GAR-24 | **Durchdringung / Einbau** (§4.12, §10.5) | type, position, Fugenabdichtung, rhizome proof | `bep_durchdringungen_anzahl` count + `bep_einbauten_typen` text | count → `bep_durchdringungen_anzahl` |
| FLL-GAR-24 | **Pflanzenart** (Tab. 29 screening) | species, aggressive?, rhizome-proof required | `bep_pflanzenarten` text | any aggressive → `wurzel_rhizomfestigkeit_required` (REQ-11/25) |
| FLL-GAR-25 | **Prüfung** (Eignungs-/Eigen-/Fremd-/Kontrollprüfung per Werkstoff, §5.x.3/6.x.3/7.x.3) | type, material, date, certificate | 3 booleans + text | all passed → REQ-26 |
| FLL-GAR-16 | **Naht** (per seam type/material) | `fuegeverfahren`, `bahn_material_naht`, width, test result | single set | min width ≥ Tab. 22 |
| FLL-GAR-27 | **Einzugsfläche für Notentwässerung** (Anhang 1) | `A`, `C` per sub-area | single `A`, `C`, plus stray `A_einzugsflaeche` | Σ(A×C) → `Q_NOT` |
| FLL-GAR-28 | **Inspektions-/Wartungsmaßnahme** | item, interval, qualification | 4 text fields + interval | min interval ≤ 1 a → REQ-29 |

## 3. Conditional dependencies

| worksheet | driver | affected | rule + quote | encoded? |
|---|---|---|---|---|
| FLL-GAR-10…21 | `abdichtungs_art` | only the matching material worksheet is relevant; all others N/A | §5–7 | REQ-12…22 use `IF abdichtungs_art == …` ✓ but no visibility gating |
| FLL-GAR-04/-05 | `abdichtungs_art` ∈ {bahn_bitumen, bahn_kunststoff_elastomer, fluessigkunststoff, bahn_pe} | W/R/S classes required | Tab. 18 | REQ-05 ✓ |
| FLL-GAR-05 | `fuellhoehe_m` | `wassereinwirkungsklasse` | W1-B ≤5 m, W2-B ≤10 m, W3-B >10 m | nothing (typed enum) |
| FLL-GAR-07 | `abdichtungs_art` | slope limit | Tab. 1 | REQ-08 empty condition |
| FLL-GAR-12 | `bauteildicke_cm` ≤40 / >40 | w/z, Zement, fck | Tab. 6 | REQ-14 ✓ |
| FLL-GAR-12 | `anwendungsfall_concrete` | Festigkeits-/Expositionsklasse, c_nom | Tab. 7 | nothing |
| FLL-GAR-12 | `bauteil_type` × `beton_ausfuehrungsart` | min `bauteildicke_cm` | Tab. 8 | nothing |
| FLL-GAR-14 | `bentonit_type` | Tab. 13 limits | Tab. 13 | REQ-16 ✓ |
| FLL-GAR-14 | `gtd_polyolefin_beschichtung` × `gtd_auflast_funktion` | Auflast ≥0,30 / ≥0,60 m | Tab. 16 | nothing (`schichtdicke_auflast_cm` free) |
| FLL-GAR-14 | Ungleichförmigkeit U ≥ 5 | `groesstkorn_auflast_mm` ≤32 instead of ≤16 | §5.5.2.1 (VR text) | VR string only |
| FLL-GAR-09/-15 | `abdichtungs_art` = bahn_bitumen | `anzahl_lagen` ≥ 2 ("i. d. R. mehrlagig") | §6.1.1.2 | REQ-17 warn ✓ |
| FLL-GAR-16 | `polymerbitumen_beschichtung` | overlap ≥60 instead of ≥40 mm | §6.2.2.1 | VR string only |
| FLL-GAR-16 | `fuegeverfahren` × `bahn_material_naht` | `nahtbreite_min_mm` | Tab. 22 | nothing |
| FLL-GAR-16 | Gartenteich (prefab) | `bahnendicke_mm` ≥1,0 instead of ≥1,2 | §6.2.1.2 | REQ-18 fixed at 1,2 |
| FLL-GAR-18 | `pe_beanspruchung_klasse` | Nenndicke per Tab. 25; PELD requires FLL root test | Tab. 25 / §6.4.1.1 | nothing |
| FLL-GAR-19 | `stahl_typ` = unlegiert | `verzinkung_dicke_um` ≥100 | §7.1.3.2 | REQ-21 attest only |
| FLL-GAR-22 | `baugrund_typ` (DIN 18196 class) | Schutzlage unten material/thickness | Tab. 26 | REQ-24 empty condition |
| FLL-GAR-22 | Nutzung begehbar/befahrbar | SWK → Flächengewicht oben | Tab. 27 | nothing |
| FLL-GAR-22 | `mit_bepflanzung` & aggressive species | rhizome-proof sealing / Wurzelschutzbahn | REQ-11 | empty condition |
| FLL-GAR-23 | `abschluss_anwendungsfall` | min An-/Abschlusshöhe | Tab. 28 | REQ-23 uses fixed 5/30 cm (§4.8 text), not Tab. 28 matrix |
| FLL-GAR-04 | `eisbildung_moeglich` | edge protection against ice pressure | §4.4 | REQ-06 empty condition |
| FLL-GAR-02 | `gewaesser_type` ∈ {deponie, fischerei, talsperre, wasserstrasse} | out of scope → `gewaesser_in_scope` = false | §1.1 | REQ-01 (typed boolean, VR says "computed") |

## 4. Derived values (equations) + inheritance
- Anhang 1 Gl. 1 `Q_NOT` ← (`r_5_100` − `r_5_5`·`C`)·`A`/10000 (informative Notüberlauf example, references DIN 1986-100). `A` and `A_einzugsflaeche` are the same quantity twice (FLL-GAR-27).
- Anhang 2 (informativ) Gl. 2a `g_prime` ← `gamma_D_prime`·`d_D`; Gl. 2b `g_prime` ≥ (`Delta_u`·`gamma_A` − (`gamma_F_prime`·`d_F` + `gamma_Di_prime`·`d_Di`))/cos(`beta`); Gl. 2c `Delta_u` ← (`Delta_h_W` + `z_a`)·`gamma_w`. `g_prime` is output of two equations (definition + check) → should be split into `g_prime` and `g_prime_required`. `d_Di` duplicates `schichtdicke_abdichtung_cm` (cm vs m); `d_D` duplicates `schichtdicke_auflast_cm`; `beta` duplicates `boeschungsneigung_ratio`/`gefaelle_percent` (3 representations of the same slope).
- Missing lookups that should be equations: `wassereinwirkungsklasse` ← `fuellhoehe_m`; `gewaesser_in_scope` ← `gewaesser_type`; `nahtbreite_min_mm` ← Tab. 22; Nenndicke ← Tab. 25; slope limit ← Tab. 1.
- Re-typed duplicates inside the standard: `gewaesser_tiefe_m` (04) vs `wassertiefe_max` (08); `gewaesser_volumen_m3` (04) vs `beckenvolumen` (08); `anzahl_lagen` (09) vs `bb_lagen_anzahl` (15); `kf_abdichtung` (10) vs `mz_durchlaessigkeit_kf` (11); `schichtdicke_abdichtung_cm` (10) vs `mz_dicke` (11) / `asph_dicke` (13) / `gtd_schichtdicke_mm` (14) / `bb_dicke` (15) / `bahnendicke_mm` (16) / `fk_trockenschichtdicke` (17) / `gup_laminatdicke` (21); `inspektion_intervall_jahr` vs `inst_inspektionsintervall` (28); `wurzel_rhizomfestigkeit_required` (09) vs `bep_rhizomfestigkeit_erforderlich` (24).
- Cross-standard: FLL-Naturteich `sealing_type`, `freeboard_water_to_seal` (≥5 cm) ↔ Tab. 28 Schwimmteich column; DIN 1986-100 r_5,100 / r_5,5 ↔ KOSTRA accessor.

## 5. Summary
Counts: 18 table-lookups / 9 repeatable groups / 22 conditionals / 4 equations.

Top 5 UX wins:
1. `abdichtungs_art` as master selector: shows only the matching material worksheet, fills Tab. 1 slope limit, decides rhizome-proof requirement, and pre-fills the material's Nenndicke table (Tab. 4/5/8/12/25).
2. Tab. 18 classification derived, not typed: `fuellhoehe_m` → W-class; crack width → R-class; `standortklasse` from "an Bauwerk angrenzend".
3. Concrete track: `anwendungsfall_concrete` + `bauteil_type` × `beton_ausfuehrungsart` + `bauteildicke_cm` fill Festigkeits-/Expositionsklasse, c_nom, min thickness, w/z, Zement (Tab. 6/7/8).
4. Seams and PE: `fuegeverfahren` × `bahn_material_naht` → `nahtbreite_min_mm` (Tab. 22); `pe_beanspruchung_klasse` → Nenndicke (Tab. 25); `bentonit_type` → Tab. 13 limits; coating × function → Tab. 16 Auflast.
5. Sealing build-up as repeatable layers (Schutzlage unten / Abdichtung ×n / Schutzlage oben / Auflast) with Tab. 26 (Baugrund class) and Tab. 27 (SWK) lookups feeding `sl_*` fields and Σ thickness.

Data-quality gaps: FLL-GAR-10 contains 9 orphan numeric fields named after enum values (`mineralisch_ohne_zusatzstoffe` … `alkalisilikat`); 7 REQs with empty conditions (06, 08, 09, 11, 24 + informational); REQ-23 uses §4.8 5/30 cm and ignores Tab. 28 matrix; slope stored three ways (ratio text, %, β degrees); thickness symbols per material with mixed cm/mm; `A`/`A_einzugsflaeche` duplicate; `g_prime` double-defined; `baugrund_typ` free text although Tab. 26 keys on DIN 18196 classes; Tab. 19/20/21/23/29 lists not in prod (free-text types); `gewaesser_in_scope` typed though "computed from gewaesser_type"; consumer_worksheets "FLL-GAR-10..21"/"All" are not resolvable codes.
