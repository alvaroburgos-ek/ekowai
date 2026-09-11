# DWA-M-205 — Surface-inventory pattern inventory

## 0. Sources used
- Transcript: `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-205\DWA-M_205.md` (German, LaTeX; copy in `Desktop\Format data\DWA 205\`). The Merkblatt has **no numbered equations** (no `\tag{}`); Tabelle 1–8 present.
- Prod dump: `scratchpad/std/DWA-M-205.json` — **26 worksheets, 237 fields** (M205-16 empty), 24 equation rows (≈9 unique, several are range-checks not equations), 82 requirements (≈30 `-2` duplicates).
- Vault: `encoding-audit-2026-07-01/DEEP-DWA-M-205.md`, `form-guides/DWA-M-205.md`, `ekowai-agent/subprojects/dwa-m-205-niederschlagsbehandlung/`.

## 1. Table-lookup candidates

| worksheet | selector field | dependent fields filled | guideline table | override allowed? (quote) | table in transcript? |
|---|---|---|---|---|---|
| M205-04 / M205-10 / M205-25 | `eg_badegewaesser_richtlinie` (alt/neu) × `gewaessertyp` (binnen/kueste) × `guetekategorie` (ausgezeichnet/gut/ausreichend) — enums present (plus redundant `gewaesserklasse`, `badegewaesser_guete`) | target limits `e_coli_ablauf`, `enterokokken_ablauf` (neu) or `gesamtcoliforme_ablauf`, `faekalcoliforme_ablauf`, `strep_faecalis`, `salmonellen`, `darmviren` (alt) + percentile | Tabelle 1 (76/160/EWG), Tabelle 2 (2006/7/EG) §3.2 | "Die Festlegung des Behandlungsziels für die Abwasserdesinfektion erfolgt in der Regel durch die zuständige Behörde." (§2.1) → authority value overrides table | yes — T1, T2 below |
| M205-02 / M205-05 | `eignungsklasse_bewaesserung` (1–4, enum present) | `fkstrep` (n.n. / ≤100 / 100–400 / >400), `e_coli` (n.n. / ≤200 / 200–2000 / >2000), `toc` (≤2 / ≤10 / 10–20 / >20), Anwendungsbereiche, Nichtanwendung | Tabelle 3 §3.3 (TLL 2003 / DIN 19650) | Fn 4) "Richtwert, der … so weit unterschritten werden sollte, wie dies nach dem Stand der Technik mit vertretbarem Aufwand … möglich ist." Fn 1) restriction waived if no wetting of edible parts | yes — T3 |
| M205-05 / M205-10 / M205-11 | `strahlertyp` (niederdruck/mitteldruck, enum present) | `strahler_quecksilberdampfdruck` (≈0,01 / 1.000–10.000), `strahler_wellenlaenge` (254 / 240–280), `strahler_leistungsdichte` (1–4 / 100–200), `uvc_anteil` (20–35 / 8–15), `strahler_oberflaechentemperatur` (40–120 / 600–950), `strahler_nutzungsdauer` (8.000–16.000 / 4.000–12.000) | Tabelle 4 §4.1.3.1 (figawa) | typical ranges ("Typische…", "Mittlere…") — manufacturer data override | yes — T4 |
| M205-05 / M205-10 | `uv_dosis_zielband` (3 values present) | `uv_dosis` range 300–450 / 400–700 | §4.1.2.3 text | "Entsprechend den Anforderungen kann die notwendige Mindestbestrahlung aber auch höher liegen." | text (quoted) |
| M205-09 | `verfahren` (uv/membran/ozon/chlorung/paa/h2o2) → `empfohlenes_verfahren` | comparison row values: E. coli erreichbar (<10 / <10 / <100), spez. Energie (30–60 / 100–400 / 100–150 Wh/m³), Kosten (0,03–0,06 / 0,2–0,4 / 0,01–0,05 €/m³), Vorbehandlung, Zusatzeffekte; `ziel_spurenstoffabbau` → Ozonung, `ziel_brauchwasser_oder_vollentkeimung` → Membran | Tabelle 8 §5 | informative overview ("Überblick") | yes — T8 |
| M205-06 / M205-14 | `membranverfahren` (MF/UF) + `membranbetrieb` | `porenweite` (MF 0,1–0,2 / UF 0,01–0,04), `netto_permeatfluss` (50 / 12,5 / 63), `arbeitsdruck` (0,2–2 / 0,3–0,5 / 0,4–1,3 bar), `spez_energie_membran` (0,4 / 0,115 / 0,15–0,2), cleaning frequency | Tabelle 5 §4.2 (three reference plants) | reference data, not limits | yes — T5 (excerpt) |
| M205-07 / M205-17 | `ozon_einsatzgas` (luft/reinsauerstoff) | `spez_energie_ozon` (10 kWh/kg; Luft +60 %), `ozon_pro_o2` (10), `ozon_pro_m3_o2` (150–200), `ozon_aus_o2_anteil` (10–13 %) | §4.3.3.2 text | "etwa 10 kWh/kg Ozon. Bei Verwendung von Luft beträgt er ca. 60 % mehr." | text |
| M205-17 / M205-20 | `ct_wert_zielorganismus` (e_coli / cryptosporidien) | ct factor ×500; `ozon_konz` 2–10 mg/l, `ozon_aufenthaltszeit` 5–10 (15–20) min; Tabelle 6 reference results | §4.3.2, Tabelle 6 | "übersteigt der ct-Wert für Cryptosporidien-Oozysten den für Escherichia coli um ca. das Fünfhundertfache" | yes — T6 |
| M205-08 / M205-21 | `chlormittel_typ` (cl2 / naocl / clo2) | `freies_chlor` 1–20 mg/l + `kontaktzeit_chlor` 15–30 min (Cl2/NaOCl); `clo2_dosis` 5–10 g/m³ (1–5 sandfiltriert) + "wenige Minuten" (ClO2); `clo2_konzentration` <30 vol% | §4.4.2 text | "Je nach dem Gehalt an organischen Stoffen im Abwasser sind 1 mg bis 20 mg freies Chlor pro Liter … erforderlich." | text |
| M205-22 | PES dose/contact-time pair from Tabelle 7 (no selector; `pes_dosis` + `kontaktzeit_pes`) | log-reduction achievable | Tabelle 7 §4.4.3 | reference studies | yes — T7 |
| M205-18 | `verbrennung_typ` (thermisch/katalytisch) | `temperatur_ozonentfernung` ≥350 + `verbrennung_haltezeit_s` ≥2 (thermisch) vs 60–80 °C (katalytisch) | §4.3.3.4 | fixed | text |

Missing-field gaps: no `percentile` field for Tabelle 1/2 (95 vs 90 %); no Tabelle-3 Anwendungsbereich/Fruchtart selector (Gewächshaus, Rohverzehr, Sportplatz…) that would derive `eignungsklasse_bewaesserung`; no target-organism selector for PES (Tabelle 7); Tabelle 8 rows only as two free-text "Vergleich" fields; `nutzung` (restricted/unrestricted, WHO) exists but does not drive `log_reduktion` target (6–7 vs 3–4).

Verbatim (file `DWA-M_205.md`):
```
Tabelle 1 (76/160/EWG): Mikrobiologische Parameter | Leitwert (G-Wert) | Grenzwert (I-Wert)
Gesamtcoliforme Bakterien in 100 ml | 500 (80) | 10.000 (95) ; Fäkalcoliforme Bakterien in 100 ml | 100 (80) | 2.000 (95) ; Streptococcus faecalis in 100 ml*) | 100 (90) | - ; Salmonellen in 1000 ml*) | - | 0 (95) ; Darmviren in 10 l*) | - | 0 (95)
*) Untersuchung auf Anforderung. Die Ziffern in Klammern geben an, in wie viel Prozent der Proben die Werte eingehalten sein müssen.

Tabelle 2 (2006/7/EG) — Binnengewässer: Parameter | Ausgezeichnet | Gut | Ausreichend | Referenzanalysemethode
Intestinale Enterokokken (cfu/100 ml) | 200 (95) | 400 (95) | 330 (90) | DIN EN ISO 7899-1 oder -2
Escherichia coli (cfu/100 ml) | 500 (95) | 1.000 (95) | 900 (90) | DIN EN ISO 9308-3 oder -1
Küstengewässer und Übergangsgewässer: Intestinale Enterokokken | 100 (95) | 200 (95) | 185 (90) ; Escherichia coli | 250 (95) | 500 (95) | 500 (90)
"Die Werte in Klammern geben die Art der Perzentil-Bewertung an."

Tabelle 3 (TLL 2003): Eignungsklasse | Fäkalstreptokokken KBE/100 ml | Escherichia coli KBE/100 ml | TOC mg/l
1 (Gewächshaus-/Freilandkulturen, Schulsportplätze, öffentliche Parkanlagen) | nicht nachweisbar | nicht nachweisbar | ≤ 2
2 1) (Kulturen für den Rohverzehr, Schulsportplätze, Parkanlagen) | ≤ 100 4) | ≤ 200 4) | ≤ 10
3 1) (nicht zum Verzehr bestimmte Gewächshauskulturen; Frischmarkt bis 2 Wochen vor Ernte; sonstige Sportplätze) | 100 bis 400 4) | 200 bis 2000 4) | 10 bis 20 5)
4 1)+2) (Heil-/Gewürzpflanzen, Grünland zur Konservierung, Getreide bis Milchreife, Industriepflanzen, Frostschutzberegnung) | > 400 6) | > 2000 6) | > 20 6)
3) Salmonellen … nicht nachweisbar in 1000 ml. 5) Wert, bei dessen Überschreitung der BSB5-Wert zu ermitteln ist. 6) Die 10-fache Menge sollte nicht überschritten werden.

Tabelle 4 (figawa): Merkmal | Einheit | Niederdruckstrahler | Mitteldruckstrahler
Quecksilberdampfdruck | hPa | ca. 0,01 | 1.000-10.000 ; Spektrum | - | Linienspektrum | Breitbandig ; Wellenlänge im UV-C-Bereich | nm | 254 nm | 240 nm-280 nm ; Typische Leistungsaufnahme | W | 10 W-600 W | 1.000-30.000 W ; Typische Leistungsdichte bezogen auf die Lichtbogenlänge | W/cm | 1-4 | 100-200 ; UV-C-Leistung (254 nm) % bezogen auf die eingespeiste elektr. Leistung bei neuem Strahler | % | ca. 20-35 | ca. 8-15 ; Oberflächentemperatur Strahler | °C | 40-120 | 600-950 ; Mittlere Nutzungsdauer | h | 8.000-16.000 | 4.000-12.000

§4.1.2.3: "Mindestbestrahlung etwa 300 J/m² bis 450 J/m²" (prod vq) / "Schwankungsbreite für die eingestellte Mindestbestrahlung von 400 J/m² bis 600 J/m² und im Einzelfall bis zu 700 J/m² [16]. Die Bemessungsvorgaben dieser UV-Anlagen für die Transmission liegen im Bereich > 60 % bis > 70 % (in der Regel > 65 %) und für die abfiltrierbaren Stoffe bei < 10 mg/l bzw. zum Teil auch < 5 mg/l."

Tabelle 5 (excerpt): KA Straubing | Rottenburg-Hailfingen | Ruhleben ; Typ (Porengröße) | MF (0,1 µm) | UF (0,02 µm) | MF (0,2 µm) ; Verfahrensart | Semi-Cross-Flow | Dead-End | Dead-End ; Netto-Permeatfluss l/(m²·h) | 50 | 12,5 | 63 ; Arbeitsdruck bar | 0,2-2 | 0,3-0,5 | 0,4-1,3 ; Energiebedarf kWh/m³ | 0,4 | 0,115 | 0,15-0,2 ; Gesamtkosten €/m³ | 0,42 | 0,20 | 0,27

Tabelle 6 (Ozon): Ozon-Konzentration | Kontaktzeit min | Parameter | Reinigungsergebnis
5 mg/l | 10 | Gesamt- und Fäkalcoliforme, Fäkale Streptokokken | ~ 3 Log-Stufen ; 7 mg/l | 5 | Fäkalcoliforme | < 1000/100 ml ; 0,36 g-1,07 g O3/g DOC | > 5 | Escherichia coli | 99 %-Reduktion ; (same) | Enterokokken | 93,5 %-Reduktion

Tabelle 7 (PES): PES-Konzentration mg/l | Kontaktzeit min | Parameter | Reinigungsergebnis
15 | 36 | Gesamt- und Fäkalcoliforme | ~ 4 Log-Stufen ; 5-7 | 60 | Gesamtcoliforme | < 1000/100 ml ; 5-7 | 60 | Fäkale Streptokokken | < 100/100 ml ; 5-10 | 35-50 | Escherichia coli | ~ 4 Log-Stufen ; 8 | 30 | Gesamtcoliforme | ~ 4 Log-Stufen ; 8 | 30 | Fäkalcoliforme | ~ 4,2 Log-Stufen ; 10 | 10 | Gesamt- und Fäkalcoliforme | ~ 3 Log-Stufen ; 400 | 20 | Gesamtcoliforme | < 2/100 ml ; 10 | 30 | Fäkalcoliforme | < 1000/100 ml

Tabelle 8: Aspekt | UV-Bestrahlung | Nachgeschaltete Membrandesinfektion | Ozonung
Einhaltbare Konzentration (E. coli/100 ml) | + < 10 (bei 400 mJ/s-700 mJ/s) | + < 10 (Mikro-/Ultrafiltration) | + < 100 (0,8 g Ozon/g DOC)
Transformationsprodukte | + nicht signifikant 1) | + keine 1) | - signifikant ; Aufwand für Arbeitssicherheit | o mäßig | o mäßig | - erhöht
Spezifischer Energieeinsatz (Wh m⁻³) | + 30-60 | o 100-400 | o 100-150 ; Kosten (€/m³ bei ganzjährigem Betrieb) | + 0,03-0,06 | - 0,2-0,4 | + 0,01-0,05
Notwendigkeit der Vorbehandlung | (-) gegebenenfalls Filtration erforderlich | (-) gegebenenfalls Vorfiltration erforderlich | + Filtration nicht erforderlich ; Zusätzliche Reinigungseffekte | o | + Feststoffelimination | + Elimination anthropogener Spurenstoffe
§4.3.3.2: "Für 1 kg Ozon werden etwa 10 kg Sauerstoff benötigt (bei ca. 10 % bis 13 %" ; §4.3.3.3 (prod vq): "2 mg bis 10 mg Ozon/l bzw. ca. 0,5 mg bis 1 mg Ozon/mg DOC" ; §4.4.2: "etwa 5 g bis 10 g Chlordioxid pro Kubikmeter … um drei Zehnerpotenzen …, bei sandfiltriertem Abwasser … nur 1 g/m³ bis 5 g/m³. Die erforderliche Einwirkzeit beträgt wenige Minuten." ; "in Konzentration über 30 Volumenprozent explosiv"
```

## 2. Repeatable-group candidates

| worksheet | the thing | member fields | currently modelled | aggregation + consumers |
|---|---|---|---|---|
| M205-10 / M205-25 | **Leitorganismus / Zielwert** row (organism, unit, limit, percentile, method — from Tabelle 1/2/3) | `e_coli_ablauf`, `enterokokken_ablauf`, `gesamtcoliforme_ablauf`, `faekalcoliforme_ablauf`, `faekalstreptokokken_ablauf`, `salmonellen`, `darmviren`, `fkstrep`, `toc` | 9 scalars ×2 worksheets; 14 CR gates hard-coding every Tabelle-2 cell (CR-03/04/05/14/15/16/17 + `-2`) | per-row pass/fail → `projekt_konform`; percentile compliance needs a sample series (n samples, x % within limit) |
| M205-24/25 | **Probe** (monthly microbiological sample in/out of the disinfection stage) | `monatlicher_nachweis`, `pruefintervall_mikrobio`, concentrations before/after | booleans + interval | log-reduction = log10(C_in/C_out) per sample → `log_reduktion`; percentile evaluation for Tabelle 1/2 |
| M205-10/11 | **Bestrahlungsgerinne / Bank** (parallel channels when Q > 1000 m³/h, sensors per bank, zu-/abschaltbar) | `mehrstrassige_anlage`, `uv_sensor_anzahl_pro_bank`, `gerinne_zuschaltbar`, `durchfluss_max` | booleans + one count | Σ Q per channel = `durchfluss_max`; count ≥2 if >1000; sensors ≥1 per bank |
| M205-12 | **UV-Strahler** (type, hours, utilisation, replacement) | `strahler_nutzungsdauer`, `strahler_auslastung_pct`, `hg_strahler_sonderentsorgung` | scalars | Σ lamp-hours → replacement schedule; energy = Σ P·h |
| M205-14 | **Membranmodul / Filtrationseinheit** (Tabelle 5 columns: Hohlfaser/Kapillar, pore size, area, flux, pressure) | `membranverfahren`, `membranbetrieb`, `porenweite`, `brutto_permeatfluss`, `netto_permeatfluss`, `transmembrandruck`, `arbeitsdruck` | scalars | Σ membrane area × netto flux = design permeate flow vs `durchfluss_max` |
| M205-06/14 | **Zulauf-Störstoff** characterisation (AFS, Fe/Al/Ca scaling, Fette, Faserstoffe, EPS) | `scaling_verursacher` (free text), `eps_potenzial`, `afs` | text + enum | per-substance presence → `vorsiebung_erforderlich` |
| M205-17 | **Ozonreaktor / Generator** (n generators, kg O3/h, kV, Hz) | `ozongenerator_spannung`, `ozongenerator_frequenz`, `reaktor_gasdicht` | scalars | Σ O3 capacity = ozon_konz × durchfluss_max |
| M205-13/19/26 | **Kostenposition** (Kapital vs Betrieb; baulich 25 a vs EMT 12,5 a) | `invest_kosten_uv`, `spez_strom_uv`, `kosten_uv_cent_m3`, `kapitalkostenanteil`, `abschreibungsdauer_baulich`, `abschreibungsdauer_emt`, `kosten_ozon_cent_m3` | scalars, per-process copies | Σ annualised cost / m³ → `kosten_*_cent_m3` (KVR) |
| M205-08/21 | **Chlorungsmittel** (Cl2 / NaOCl / ClO2) with dose, contact time, by-products | `chlormittel_typ`/`chlormittel`, `freies_chlor`, `clo2_dosis`, `kontaktzeit_chlor`/`chlor_kontaktzeit`, `clo2_konzentration` | duplicated scalars | one row per agent actually used |

## 3. Conditional dependencies

| worksheet | driver | affected | rule + quote | encoded? |
|---|---|---|---|---|
| M205-03 | `behandlungsziel` / `nutzungsziel` | which target table applies: Badegewässer (T1/T2) vs Bewässerung (T3) vs Trinkwassergewinnung (TrinkwV: 0/100 ml) vs Brauchwasser (§3.5 Standzeit, BioStoffV) | §3.1–3.5 | CR-05 (== 0) fires unconditionally alongside CR-03/04/14–17 → **mutually exclusive gates all active** |
| M205-04 | `eg_badegewaesser_richtlinie == alt` | T1 fields (`gesamtcoliforme`, `faekalcoliforme`, `strep_faecalis`, `salmonellen`, `darmviren`) visible; else T2 | "Der Parameter „Gesamtcoliforme" ist weggefallen" (§3.2) | nothing |
| M205-04 | `gewaessertyp` × `guetekategorie` | E. coli / Enterokokken limit + percentile (6 cells) | Tabelle 2 | 6 separate unguarded CRs (CR-03 500/200, CR-14 1000/400, CR-15 900/330, CR-04 250/100, CR-16 500/200, CR-17 500/185) |
| M205-05 | `eignungsklasse_bewaesserung` | `fkstrep`, `e_coli`, `toc` thresholds; Nichtanwendung list | Tabelle 3 | CR-18 checks membership only |
| M205-05 | `nutzung` (restricted/unrestricted) | `log_reduktion` target 6–7 vs 3–4 | "Für die uneingeschränkte Nutzung wird eine Keimreduzierung um 6 bis 7 Log-Stufen empfohlen …, für die eingeschränkte Nutzung um 4 Log-Stufen" (prod vq) | CR-20 fixed ≥3 |
| M205-09 | `verfahren` | visibility of M205-10..13 (UV), 14–15 (Membran), 16–20 (Ozon), 21 (Chlor), 22 (PES), 23 (H2O2); `chlorung_routine` must be false | §4, §5 | nothing — all process gates (CR-07..12, 21–24, 26, 28, 29, 34–36) fire regardless of `verfahren` |
| M205-09 | `ziel_spurenstoffabbau` / `ziel_brauchwasser_oder_vollentkeimung` | `empfohlenes_verfahren` → ozonung / membrandesinfektion | Tabelle 8 "Zusätzliche Reinigungseffekte"; §4.2.1 | nothing |
| M205-05/10 | `uv_dosis_zielband` | `uv_dosis` band 300–450 vs 400–700 | §4.1.2.3 | EQ-02 / EQ-12 both registered as "equations" with same output; CR-07 uses union 300–700 |
| M205-03/10 | `uvt` / `uvt_min` (<55–50 %) | "sollte ... Filtration vorgeschaltet" (prod vq); `afs` <20 (better <5 with filtration) | §4.1.2.2 | CR-06 (afs ≤20) only |
| M205-03/11 | `durchfluss_max > 1000` | `mehrstrassige_anlage` required | "immer aber bei Durchflüssen über 1000 m³/h ist die Aufteilung des Gesamtdurchflusses auf parallel angeordnete Gerinne zweckmäßig" | CR-28 ✓ |
| M205-17 | `ozon_einsatzgas` | `spez_energie_ozon` 10 vs 16 kWh/kg | §4.3.3.2 | EQ-05 fixed `= 10` |
| M205-17 | `ct_wert_zielorganismus == cryptosporidien` | ct target ×500 | §4.3.2 | nothing |
| M205-03/17 | `bromid > 0` | `ozon_pro_doc` <0,8; `bromat_bildung` monitoring | "Die Bromatbildung kann minimiert werden, wenn Ozon proportional zum DOC (< 0,8 mg/mg) dosiert wird" | CR-21 unguarded |
| M205-18 | `verbrennung_typ` | thermisch: `temperatur_ozonentfernung` ≥350 + `verbrennung_haltezeit_s` ≥2; katalytisch: 60–80 °C | §4.3.3.4 | CR-26 (≥350 OR katalytisch) |
| M205-21 | `chlormittel_typ` | Cl2/NaOCl: `freies_chlor` 1–20, `kontaktzeit_chlor` 15–30, `ph_chlorung` 6–8, `restchlor_betrieb` ≥0,2, `entchlorungsstufe`; ClO2: `clo2_dosis` 5–10 (1–5), Einwirkzeit "wenige Minuten", `clo2_konzentration` <30 vol% | §4.4.2 | CR-11/22/23/24 unguarded |
| M205-21 | `entchlorungsstufe` | `restchlor` (Gewässer) ≤0,005 | 2006/44/EG | CR-12 ✓ (unguarded) |
| M205-22/23 | `h2o2_einsatz` | H2O2 dose/contact visible (higher than PES, pilot) | §4.4.4 | nothing |
| M205-07 | `brauchwasser_standzeit_h` long | `wiederverkeimungsbeurteilung` required | "Insbesondere bei längeren Standzeiten ist die Möglichkeit der Wiederverkeimung zu berücksichtigen." | CR-31 == True unconditionally |

## 4. Derived values + inheritance

| Eq. | output ← inputs | consumed by | notes |
|---|---|---|---|
| EQ-01 | `uv_dosis` ← uv_intensitaet · verweildauer | M205-10, -25 | duplicated on M205-05/-10; units W/m²·s = J/m² ✓ |
| EQ-02 / EQ-12 | `uv_dosis` range checks (300–450 / 400–700) | — | **not equations** (validation rules); same output symbol as EQ-01 → conflict |
| EQ-03 | `ct_wert` ← ozon_konz · ozon_aufenthaltszeit | M205-25 | duplicated -07/-17 |
| EQ-04 | `ozon_pro_doc < 0.8` | — | rule, not equation; true derivation `ozon_pro_doc = ozon_konz / doc` **missing** |
| EQ-05 | `spez_energie_ozon = 10` | M205-26 | constant; should be `10 · (1 + 0.6·[luft])` |
| EQ-06/07/09/10/11 | range checks on `spez_strom_uv`, `spez_energie_membran`, `clo2_dosis`, `freies_chlor`, `restchlor_betrieb` | — | rules, `input_symbols: null` |
| EQ-08 | `permeabilitaet` ← brutto_permeatfluss / transmembrandruck | M205-24 | duplicated -06/-14 |
| missing | `log_reduktion = log10(C_in / C_out)`; `verweildauer = V_reactor / Q`; `ozon_pro_doc = ozon_konz / doc`; ozone demand kg/h = ozon_konz·durchfluss_max/1000; O2 demand = 10·O3; membrane area = Q / netto_permeatfluss; `kosten_*_cent_m3` from invest + Strom + Auslastung (KVR 25 / 12,5 a); `kapitalkostenanteil` | — | all described in text, none registered |
| inherit | `e_coli_ablauf`/`enterokokken_ablauf` limits from Tabelle 2 by class; `uvt`→`uvt_min`; `afs`; `doc`; `bromid` | — | typed in 2–3 worksheets each |

Re-typed duplicates (≈95 of 237 fields): `nutzungsziel`/`behandlungsziel` (-02, -03); `badegewaesser_guete`/`guetekategorie`, `gewaesserklasse`/`gewaessertyp`, `eg_badegewaesser_richtlinie` (-02, -04); `eignungsklasse_bewaesserung`, `toc_bewaesserung`/`toc`, `daly_wert` (-02, -05); `ziel_*` booleans (-02, -03, -07); `brauchwasser_standzeit_h` (-02, -07); `uvt`, `afs`, `durchfluss_max`, `doc`, `bromid`, `behoerdliche_freigabe` (-03, -08); whole UV block (`uv_dosis`, `uv_intensitaet`, `verweildauer`, `uvt_min`, `uvc_anteil`, `strahlertyp`, `uv_dosis_zielband`, Tabelle-4 lamp props, `gerinne_abdeckung_lichtdicht`, `ip_schutzart`, `nicht_bestrahltes_volumen`, `strahler_nutzungsdauer`, `strahler_auslastung_pct`, cost trio) on -05 vs -10/-11/-12/-13; membrane block (-06 vs -14/-15, plus `porenweite` vs `membran_porenweite`); ozone block (-07 vs -17/-18/-19/-20, `restozon_abluft` vs `restozon_abgas`, `verbrennung_typ` vs `katalytisch`); chlorine block (-08 vs -21, `chlormittel_typ` vs `chlormittel`, `kontaktzeit_chlor` vs `chlor_kontaktzeit`, `ph_chlorung` vs `chlor_ph`, `restchlor` vs `restchlor_gewaesser`); PES (`pes_dosis` vs `paa_dosis`; -08 vs -22); H2O2 (-08 vs -23); monitoring intervals (-09 vs -24); Tabelle-1/2 targets (-04, -10, -25); cost/depreciation (-11 vs -26). Worksheet titles do not match content: M205-05 "Bewässerung" holds the UV design block, M205-06 "Trinkwassergewinnung" holds membranes, M205-07 "Brauchwasser/BioStoffV" holds ozone, M205-08 "Zulaufcharakterisierung" holds chlorine/PES/H2O2.

## 5. Summary
Counts: **11 table-lookup candidates** (Tabelle 1–8 + 3 text lookups) / **9 repeatable groups** / **18 conditionals** / **~9 unique equation rows of which only 3 are real derivations (EQ-01, -03, -08); +8 described, unregistered**.

Top 5 UX wins:
1. `behandlungsziel` + (`eg_badegewaesser_richtlinie`, `gewaessertyp`, `guetekategorie` | `eignungsklasse_bewaesserung`) → auto-fill the **Leitorganismus target table** (limit + percentile + method) from Tabelle 1/2/3 and run one generic gate per row — replaces 14 hard-coded, mutually contradictory CR-03/04/05/14–17 gates.
2. `verfahren` as the process switch: show only the UV / Membran / Ozon / Chlor / PES / H2O2 branch and arm only its gates (today every process limit fires on every project, e.g. Restchlor ≥0,2 on a UV plant).
3. `strahlertyp` → pre-fill the six Tabelle-4 lamp properties (Hg pressure, wavelength, W/cm, UV-C %, temperature, lifetime) with manufacturer override; `ozon_einsatzgas` → energy factor (10 kWh/kg, +60 % for air); `chlormittel_typ` → dose/contact/by-product block.
4. Collapse ≈95 duplicate fields so each symbol has one owner worksheet (fix the four mis-titled worksheets -05/-06/-07/-08) and inherit `durchfluss_max`, `afs`, `uvt`, `doc`, `bromid` from M205-03/-08.
5. Register the real derivations: `log_reduktion = log10(C_in/C_out)` from a repeatable sample table, `ozon_pro_doc = ozon_konz/doc`, ozone/O2 demand, membrane area = Q/netto flux, and KVR cost per m³ — and demote EQ-02/04/06/07/09/10/11/12 to validation rules.

Data-quality gaps: 8 of 24 "equations" are range checks with `input_symbols: null`; EQ-01/02/12 share output `uv_dosis`; ≈30 `-2` duplicate CR codes plus REQ-M205-ES1-04/-11 duplicates of CR-21/CR-23; `ip_schutzart` VR lists IP54/65/66/67 while CR-29 lists IP54/55/56/65/66/67; `ct_wert_zielorganismus` enum 2 values vs VR 5; `eps_potenzial` enum gering/mittel/hoch vs VR niedrig/mittel/hoch/unbekannt; `chlormittel_typ` values cl2_gas/naocl/clo2 vs `chlormittel` cl2/naocl/clo2; `kosten_ozon_cent_m3` VR 1–5.7 vs Tabelle 8 0,01–0,05 €/m³ (consistent) but `kosten_uv_cent_m3` VR 2–10 vs text "ca. 3 Cent/m³ bis 10 Cent/m³" (halbjährig) / "2 bis 6" (ganzjährig); `uv_dosis` VR `>= 400` on -05/-10 contradicts the 300–450 band; `abwassertemperatur_bereich` is text "Min-Max" (needs two numbers); `abschreibungsdauer_*` and `ozon_pro_o2` are constants modelled as inputs; M205-16 empty; Tabelle 8 "400 mJ/s-700 mJ/s" is a transcript unit typo for J/m².
