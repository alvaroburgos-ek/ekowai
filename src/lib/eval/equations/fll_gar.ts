/**
 * FLL-GAR-2023 — Plan 3 Task 7 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts fll_gar` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is a span lifted
 * from the transcript `Desktop\Supabase data\Guidelines knowledge markdown\
 * FLL-Gewässerabdichtungsrichtlinien.md` (the `Q_*` constants carry their line
 * ranges). Text-only derivations ship `imported_unverified` and carry the
 * printed sentence / table they encode (class F on the sign-off sheet).
 *
 * Single-source (checked against the FOUR prod equation rows read in-session —
 * Anhang 2 Gl. 2a `g_prime = gamma_D_prime * d_D`, Gl. 2b `g_prime >= …`
 * (displayOnly via equation-profiles, FLL-revision GAR-22 F-05), Gl. 2c
 * `Delta_u = (Delta_h_W + z_a) * gamma_w` on FLL-GAR-22; Anhang 1 Gl. 1
 * `Q_NOT = (r_5_100 - r_5_5 * C) * (A / 10000)` on FLL-GAR-27): nothing below
 * outputs `g_prime`, `Delta_u` or `Q_NOT`. The register sums `sum_a_m2` /
 * `sum_ac` are NEW quantities; rewriting Gl. 1 onto them is fll_gar-R-1
 * (STAGED); splitting Gl. 2b into `g_prime_required` is fll_gar-R-2 (STAGED).
 *
 * Every output is a CREATED field (field-configs/fll_gar.ts) of the equation's
 * own worksheet; the register-fed ones are server-materialised, the scalar-only
 * ones compute on the hook / report / snapshot / PDF paths only (2a design,
 * controller amendment D). The equations keyed on `abdichtungs_art` (FLL-GAR-07-D2
 * through the register's `limit_1m` column) stay `manual_required` until the
 * consumer edit fll_gar-C-1 lands. `evaluateFormula` checks every named scalar
 * input BEFORE evaluating (an `if()` branch does not exempt its inputs) — so
 * FLL-GAR-05-D2 needs all three inputs, and FLL-GAR-18-D2 all three PEHD values.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import {
  Q_L509_513, Q_L1313_1317, Q_L1383_1384, Q_T1_HEAD, Q_L1415_1418, Q_L1487_1489, Q_L2221_2222, Q_T5_2, Q_T6_LE40, Q_T6_GT40, Q_L3435_3438,
  Q_T18_HEAD, Q_T18_W1, Q_T18_W2, Q_T18_W3, Q_T18_R0, Q_T18_R1, Q_T18_R2, Q_T18_R3, Q_T18_S1, Q_T18_S2, Q_L3765_3766, Q_L4064_4068, Q_L4098_4102, Q_T22_HEAD,
  Q_L4460_4462, Q_T24_DICHTE, Q_T24_MFR, Q_T24_RUSS, Q_L4511_4515, Q_T28_HEAD, Q_L5748, Q_L6477_6485, Q_L6484,
} from '../regulation-tables-seed-fll_gar';

const STD = 'FLL-GAR-2023';

export const EQUATIONS: EquationEntry[] = [
  // ---- FLL-GAR-02: §1.1 scope partition ----
  {
    standard: STD, worksheet: 'FLL-GAR-02', equation_number: 'FLL-GAR-02-D1',
    formula: "gewaesser_in_scope_code = if(gewaesser_type IN {'deponie', 'fischerei', 'talsperre', 'wasserstrasse'}, 0, 1)",
    input_symbols: ['gewaesser_type'], output_symbol: 'gewaesser_in_scope_code', output_unit: null,
    clause_reference: '§1.1',
    description: 'Plan 3: 0 für die vier §1.1-Ausschlüsse (L509–L513 "Die Gewässerabdichtungsrichtlinien gelten nicht für: Deponien; Fischereieinrichtungen; Talsperren und Speicherbecken; Wasserstraßen." — prod-Tokens deponie / fischerei / talsperre / wasserstrasse), sonst 1; der manuelle Boolean gewaesser_in_scope (REQ-01) bleibt Produzent — Ablösung STAGED (fll_gar-D-2).',
    verification_quote: Q_L509_513,
  },
  // ---- FLL-GAR-05: Tab. 18 classes ----
  {
    standard: STD, worksheet: 'FLL-GAR-05', equation_number: 'FLL-GAR-05-D1',
    formula: 'w_klasse_code = if(fuellhoehe_m <= 5, 1, if(fuellhoehe_m <= 10, 2, 3))',
    input_symbols: ['fuellhoehe_m'], output_symbol: 'w_klasse_code', output_unit: null,
    clause_reference: '§6, Tab. 18',
    description: 'Plan 3: Wassereinwirkungsklasse aus der Füllhöhe — W1-B ≤ 5 m (L3673), W2-B ≤ 10 m (L3674), W3-B > 10 m (L3675) — als Code 1 / 2 / 3; die manuelle wassereinwirkungsklasse bleibt Produzent für -15 / -16 / -17 (fll_gar-D-1).',
    verification_quote: `${Q_T18_HEAD} — ${Q_T18_W1} — ${Q_T18_W2} — ${Q_T18_W3}`,
  },
  {
    standard: STD, worksheet: 'FLL-GAR-05', equation_number: 'FLL-GAR-05-D2',
    formula: "r_klasse_code = if(neurissbildung == 'ausgeschlossen', 0, if(rissbreite_erwartet_mm <= 0.2, 1, if(rissbreite_erwartet_mm <= 0.5, 2, if(rissbreite_erwartet_mm <= 1.0 AND rissversatz_erwartet_mm <= 0.5, 3, 9))))",
    input_symbols: ['neurissbildung', 'rissbreite_erwartet_mm', 'rissversatz_erwartet_mm'], output_symbol: 'r_klasse_code', output_unit: null,
    clause_reference: '§6, Tab. 18',
    description: 'Plan 3: Rissklasse aus den Tab.-18-Kriterien — R0-B "keine Rissbreitenveränderung bzw. Neurissbildung" (L3677) ⇒ 0; R1-B bis max. 0,2 mm (L3680) ⇒ 1; R2-B bis max. 0,5 mm (L3684) ⇒ 2; R3-B bis max. 1,0 mm, Rissversatz bis 0,5 mm (L3688) ⇒ 3; außerhalb der gedruckten Klassen ⇒ 9 (fll_gar-J-2); alle drei Eingaben sind erforderlich (0 eintragen, wenn keine); die manuelle rissklasse bleibt Produzent (fll_gar-D-3).',
    verification_quote: `${Q_T18_R0} — ${Q_T18_R1} — ${Q_T18_R2} — ${Q_T18_R3}`,
  },
  {
    standard: STD, worksheet: 'FLL-GAR-05', equation_number: 'FLL-GAR-05-D3',
    formula: "s_klasse_code = if(standort_tab18 == 'aussen_frei', 1, 2)",
    input_symbols: ['standort_tab18'], output_symbol: 's_klasse_code', output_unit: null,
    clause_reference: '§6, Tab. 18',
    description: 'Plan 3: Standortklasse — S1-B "Behälter im Außenbereich, der nicht mit einem Bauwerk verbunden ist." (L3692–L3693) ⇒ 1; S2-B "Behälter im Außenbereich, der an ein Bauwerk angrenzt und mit diesem verbunden ist sowie Behälter im Innenbereich." (L3695–L3696) ⇒ 2; die manuelle standortklasse bleibt Produzent (fll_gar-D-4).',
    verification_quote: `${Q_T18_S1} — ${Q_T18_S2}`,
  },
  // ---- FLL-GAR-07: slope sections ----
  {
    standard: STD, worksheet: 'FLL-GAR-07', equation_number: 'FLL-GAR-07-D1',
    formula: 'boeschung_steilste_1m = min_rows(boeschungsabschnitte, neigung_1m)',
    input_symbols: ['boeschungsabschnitte'], output_symbol: 'boeschung_steilste_1m', output_unit: 'm (1:m)',
    clause_reference: '§4.5',
    description: 'Plan 3: die steilste Böschung über die Abschnitte = kleinstes m der Schreibweise 1:m (Zonierung Sumpf-, Flach-, Tiefwasserzone, L1415–L1418) — Text-Ableitung ohne gedruckte Formel; Vergleichswert zum Tab.-1-Fill boeschungsneigung_limit (Gate STAGED fll_gar-G-6).',
    verification_quote: Q_L1415_1418,
  },
  {
    standard: STD, worksheet: 'FLL-GAR-07', equation_number: 'FLL-GAR-07-D2',
    formula: 'boeschung_verletzungen = count_rows(boeschungsabschnitte, ok == 0)',
    input_symbols: ['boeschungsabschnitte'], output_symbol: 'boeschung_verletzungen', output_unit: null,
    clause_reference: '§4.5, Tab. 1',
    description: 'Plan 3: Anzahl der Abschnitte, deren Neigung steiler ist als der Tab.-1-Richtwert der Abdichtungsart (Zeilen-Grenzwert aus TAB1 über abdichtungs_art — auf -07 erst nach fll_gar-C-1 lesbar, bis dahin unentscheidbar); Richtwerte "entbinden nicht von einer rechnerischen Überprüfung" (L1383); REQ-08 STAGED (fll_gar-G-6).',
    verification_quote: `${Q_T1_HEAD} — ${Q_L1383_1384}`,
  },
  // ---- FLL-GAR-09: layer build-up ----
  {
    standard: STD, worksheet: 'FLL-GAR-09', equation_number: 'FLL-GAR-09-D1',
    formula: "lagen_gesamtdicke_mm = sum_rows(abdichtungslagen, if(rolle == 'abdichtung', dicke_mm, 0))",
    input_symbols: ['abdichtungslagen'], output_symbol: 'lagen_gesamtdicke_mm', output_unit: 'mm',
    clause_reference: '§4.7',
    description: 'Plan 3: Σ Dicke der Zeilen mit Rolle Abdichtung (Schutzlagen und Auflast zählen 0) — Text-Ableitung aus L1487 "Die Art der Abdichtungsstoffe, die Anzahl der Lagen und deren Anordnung …"; Vergleichswert zu den Nenndicken-Fills der Materialblätter.',
    verification_quote: Q_L1487_1489,
  },
  {
    standard: STD, worksheet: 'FLL-GAR-09', equation_number: 'FLL-GAR-09-D2',
    formula: "abdichtungslagen_count = count_rows(abdichtungslagen, rolle == 'abdichtung')",
    input_symbols: ['abdichtungslagen'], output_symbol: 'abdichtungslagen_count', output_unit: null,
    clause_reference: '§4.7; §6.1.1.2',
    description: 'Plan 3: Anzahl der Abdichtungslagen im Aufbau; Bitumenbahnen "i. d. R. mehrlagig" (L3765) — REQ-17 (anzahl_lagen ≥ 2) bleibt auf dem Skalar anzahl_lagen (Re-Point STAGED fll_gar-C-4).',
    verification_quote: Q_L3765_3766,
  },
  // ---- FLL-GAR-11: the single Tab.-5 row ----
  {
    standard: STD, worksheet: 'FLL-GAR-11', equation_number: 'FLL-GAR-11-D1',
    formula: "mz_dicke_min_tab5 = lookup('TAB5', 'verguetet', 'abdichtung_min_cm')",
    input_symbols: [], output_symbol: 'mz_dicke_min_tab5', output_unit: 'cm',
    clause_reference: '§5.2.1.2, Tab. 5',
    description: 'Plan 3: Mindestdicke der Abdichtungsschicht aus der einzigen Tab.-5-Zeile ("≥ 30 cm, in 2 Lagen von 15 bis 20 cm", L2240–L2242; Nenndicken "einzuhalten" L2222, 10 % Abweichung L2248) — Vergleichswert für mz_dicke; skalare Gleichung, nicht materialisiert (Amendment D).',
    verification_quote: `${Q_L2221_2222} — ${Q_T5_2}`,
  },
  // ---- FLL-GAR-12: Tab. 6 by thickness band ----
  {
    standard: STD, worksheet: 'FLL-GAR-12', equation_number: 'FLL-GAR-12-D1',
    formula: "wz_max = lookup('TAB6', if(bauteildicke_cm <= 40, 'le40', 'gt40'), 'wz_max')",
    input_symbols: ['bauteildicke_cm'], output_symbol: 'wz_max', output_unit: null,
    clause_reference: '§5.3.1, Tab. 6',
    description: 'Plan 3: Höchstwert w/z nach Tab. 6 — d ≤ 40 cm ⇒ 0,60 (L2437), d > 40 cm ⇒ 0,70 (L2440); REQ-14 liest die Literale 0.60 / 0.70 / 280 weiter (Re-Point STAGED fll_gar-G-5); skalare Gleichung, nicht materialisiert (Amendment D).',
    verification_quote: `${Q_T6_LE40} — ${Q_T6_GT40}`,
  },
  // ---- FLL-GAR-14: §5.5.2.1 Größtkorn ----
  {
    standard: STD, worksheet: 'FLL-GAR-14', equation_number: 'FLL-GAR-14-D1',
    formula: 'groesstkorn_max_mm = if(ungleichfoermigkeit_u >= 5, 32, 16)',
    input_symbols: ['ungleichfoermigkeit_u'], output_symbol: 'groesstkorn_max_mm', output_unit: 'mm',
    clause_reference: '§5.5.2.1',
    description: 'Plan 3: zulässiger Größtkorndurchmesser der Bodenauflast — L3438 "Der Größtkorndurchmesser darf 16 mm bzw. 32 mm bei U ≥ 5 nicht überschreiten." (Text-Ableitung, fll_gar-F-1); Vergleichswert für groesstkorn_auflast_mm (Gate STAGED fll_gar-G-1); skalare Gleichung, nicht materialisiert.',
    verification_quote: Q_L3435_3438,
  },
  // ---- FLL-GAR-16: seams, sheet thickness ----
  {
    standard: STD, worksheet: 'FLL-GAR-16', equation_number: 'FLL-GAR-16-D1',
    formula: 'naht_verletzungen = count_rows(naehte, ok == 0)',
    input_symbols: ['naehte'], output_symbol: 'naht_verletzungen', output_unit: null,
    clause_reference: '§6.2.2.1, Tab. 22',
    description: 'Plan 3: Anzahl der Nähte unter der Mindestfügebreite der Tab. 22 (Zeilen-Grenzwert aus TAB22 über Fügeverfahren × Stoffart; eine nicht gedruckte Kombination bleibt unentscheidbar); Gate STAGED (fll_gar-G-10).',
    verification_quote: `${Q_L4098_4102} — ${Q_T22_HEAD}`,
  },
  {
    standard: STD, worksheet: 'FLL-GAR-16', equation_number: 'FLL-GAR-16-D2',
    formula: "bahnendicke_min_mm = if(bahn_vorkonfektioniert == 'ja', 1.0, 1.2)",
    input_symbols: ['bahn_vorkonfektioniert'], output_symbol: 'bahnendicke_min_mm', output_unit: 'mm',
    clause_reference: '§6.2.1.2',
    description: 'Plan 3: Mindestdicke der Kunststoff-/Elastomerbahn — L4064 "Die Bahnen müssen eine Mindestdicke von 1,2 mm aufweisen. Bei werkseitig vorkonfektionierten Bahnen für gering beanspruchte Nutzungen (z. B. Gartenteiche) sind Bahnendicken ≥ 1,0 mm zulässig." (Text-Ableitung, fll_gar-F-2); REQ-18 (fest 1,2) STAGED (fll_gar-G-2); skalare Gleichung, nicht materialisiert.',
    verification_quote: Q_L4064_4068,
  },
  // ---- FLL-GAR-18: PE ----
  {
    standard: STD, worksheet: 'FLL-GAR-18', equation_number: 'FLL-GAR-18-D1',
    formula: "pe_rhizom_nachweis_code = if(pe_werkstoff == 'PEHD', 0, 1)",
    input_symbols: ['pe_werkstoff'], output_symbol: 'pe_rhizom_nachweis_code', output_unit: null,
    clause_reference: '§6.4.1.1',
    description: 'Plan 3: Nachweis der Wurzel-/Rhizomfestigkeit — PEHD "Auf eine Prüfung der Wurzel- und Rhizomfestigkeit kann verzichtet werden." (L4512) ⇒ 0; PELD "ist vom Hersteller zusätzlich ein Nachweis der Wurzel- bzw. Rhizomfestigkeit gemäß FLL zu erbringen." (L4514–L4515) ⇒ 1; der Boolean wurzel_rhizomfestigkeit_required (-09) bleibt Produzent (fll_gar-D-5); skalare Gleichung, nicht materialisiert.',
    verification_quote: Q_L4511_4515,
  },
  {
    standard: STD, worksheet: 'FLL-GAR-18', equation_number: 'FLL-GAR-18-D2',
    formula: "pehd_tab24_code = if(peeh_dichte_g_cm3 > lookup('TAB24', 'dichte', 'min') AND peeh_mfr >= lookup('TAB24', 'mfr', 'min') AND peeh_mfr <= lookup('TAB24', 'mfr', 'max') AND peeh_russgehalt_pct >= lookup('TAB24', 'russgehalt', 'min') AND peeh_russgehalt_pct <= lookup('TAB24', 'russgehalt', 'max'), 1, 0)",
    input_symbols: ['peeh_dichte_g_cm3', 'peeh_mfr', 'peeh_russgehalt_pct'], output_symbol: 'pehd_tab24_code', output_unit: null,
    clause_reference: '§6.4.1, Tab. 24',
    description: 'Plan 3: die drei Tab.-24-Anforderungen, die prod als Eingaben führt — Dichte > 0,940 g/cm3 (L4471, strikt), MFR ≥ 1,0 / ≤ 3,0 g/10 min (L4474), Rußgehalt 2-3 % (L4476) — aus TAB24 statt Literalen; REQ-20 prüft dieselben Werte als Literale (Re-Point STAGED fll_gar-G-9); skalare Gleichung, nicht materialisiert.',
    verification_quote: `${Q_L4460_4462} — ${Q_T24_DICHTE} — ${Q_T24_MFR} — ${Q_T24_RUSS}`,
  },
  // ---- FLL-GAR-23: Tab. 28 ----
  {
    standard: STD, worksheet: 'FLL-GAR-23', equation_number: 'FLL-GAR-23-D1',
    formula: "randabschnitte_sonder = count_rows(randabschnitte, zulaessig == 'sonder')",
    input_symbols: ['randabschnitte'], output_symbol: 'randabschnitte_sonder', output_unit: null,
    clause_reference: '§4.8, Tab. 28',
    description: 'Plan 3: Anzahl der Randabschnitte, deren Tab.-28-Zelle "-¹" druckt (Fußnote 1 "Nur als Sonderkonstruktion, d. h. als besondere planerische und technische Lösung.", L5748); Tab. 28 druckt keine "nicht zugelassen"-Zelle; die Zeile 0 für Freifläche / Schwimmteich ist leer gedruckt (fll_gar-U-4 — unentscheidbar); REQ-23 (§4.8-Literale 5 / 30 cm) STAGED (fll_gar-G-4).',
    verification_quote: `${Q_T28_HEAD} — ${Q_L5748}`,
  },
  // ---- FLL-GAR-24: penetrations, plants ----
  {
    standard: STD, worksheet: 'FLL-GAR-24', equation_number: 'FLL-GAR-24-D1',
    formula: 'durchdringungen_count = count_rows(durchdringungen)',
    input_symbols: ['durchdringungen'], output_symbol: 'durchdringungen_count', output_unit: null,
    clause_reference: '§4.12',
    description: 'Plan 3: Anzahl der Durchdringungs-/Einbauten-Zeilen — ersetzt den manuellen Zähler bep_durchdringungen_anzahl nach Ratifizierung (fll_gar-D-6); Text-Ableitung ohne gedruckte Formel (L1479 "Durchdringungen und technische Einbauten").',
    verification_quote: Q_L1487_1489,
  },
  {
    standard: STD, worksheet: 'FLL-GAR-24', equation_number: 'FLL-GAR-24-D2',
    formula: 'pflanzen_aggressiv_count = count_rows(pflanzenarten, aggressiv == true)',
    input_symbols: ['pflanzenarten'], output_symbol: 'pflanzen_aggressiv_count', output_unit: null,
    clause_reference: '§4.7; §10.4',
    description: 'Plan 3: Anzahl der als aggressiv wurzelnd / rhizombildend markierten Pflanzenarten (L1313 "Im Einzelfall ist der Nachweis auf Wurzel- und Rhizomfestigkeit zu führen. Bei vorgesehener Bepflanzung …"); Grundlage für REQ-11 (leere Bedingung) — Gate STAGED (fll_gar-G-13).',
    verification_quote: Q_L1313_1317,
  },
  // ---- FLL-GAR-27: Anhang 1 Gl. 1 sums ----
  {
    standard: STD, worksheet: 'FLL-GAR-27', equation_number: 'FLL-GAR-27-D1',
    formula: 'sum_a_m2 = sum_rows(einzugsflaechen_not, a_m2)',
    input_symbols: ['einzugsflaechen_not'], output_symbol: 'sum_a_m2', output_unit: 'm²',
    clause_reference: 'Anhang 1, Gl. 1',
    description: 'Plan 3: Σ abflusswirksame Fläche über die Teilflächen (Beispiel L6480 "Abflusswirksame Fläche = 800 m2"); Eingang der Summenform von Gl. 1 (fll_gar-R-1) — die prod-Gleichung Gl. 1 liest den Skalar A weiter.',
    verification_quote: Q_L6477_6485,
  },
  {
    standard: STD, worksheet: 'FLL-GAR-27', equation_number: 'FLL-GAR-27-D2',
    formula: 'sum_ac = sum_rows(einzugsflaechen_not, a_m2 * c)',
    input_symbols: ['einzugsflaechen_not'], output_symbol: 'sum_ac', output_unit: 'm²',
    clause_reference: 'Anhang 1, Gl. 1',
    description: 'Plan 3: Σ A · C über die Teilflächen; Gl. 1 (L6484 "Q NOT = [ (r5,100 – (r5,5 * C) ] * (A / 10.000)") in Summenform Q_NOT = (r5,100 · Σ A − r5,5 · Σ A·C) / 10.000 — die Umstellung der prod-Gleichung ist STAGED (fll_gar-R-1); keine zweite Q_NOT-Gleichung.',
    verification_quote: `${Q_L6484} — ${Q_L6477_6485}`,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
