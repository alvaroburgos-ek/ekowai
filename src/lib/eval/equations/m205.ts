/**
 * DWA-M-205 — Plan 3 Task 11 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts m205` (NEW equation rows only;
 * `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted from the
 * transcript `Desktop\Guidelines\DWA-M-205\DWA-M_205.md` (the `Q` spans of the
 * seed module; line in the comment).
 *
 * Single-source: no row here outputs a symbol prod already produces (uv_dosis,
 * ct_wert, permeabilitaet, spez_energie_ozon, ozon_pro_doc and the range-check
 * outputs keep their rows). Register-fed rows live on the register's worksheet
 * (M205-10 leitorganismen, -11 bestrahlungsgerinne, -14 membranmodule, -17
 * ozongeneratoren, -21 chlorungsmittel, -24 proben_desinfektion) and are
 * materialised on save; the four scalar rows on M205-17 (ozon_pro_doc_calc,
 * ozonbedarf_kg_h, o2_bedarf_kg_h, ct_ziel) are computed on hook / report /
 * snapshot / PDF only (amendment D).
 *
 * NOT emitted (STAGED in scripts/verification/m205-STAGED-plan3-rulings.sql):
 *   - EQ-05 `spez_energie_ozon = 10` → the S4_3_3_2 lookup by Einsatzgas (m205-R-1);
 *   - EQ-04 `ozon_pro_doc < 0.8` → `ozon_pro_doc = ozon_konz / doc` (m205-R-2);
 *   - EQ-02/06/07/09/10/11/12 range checks → validation rules, not equations (m205-R-3);
 *   - `verweildauer = V_reaktor / Q` — the relation is not printed (§4.1.1 L439 defines
 *     the dose as the product of intensity and Verweildauer) → m205-F-2;
 *   - KVR cost per m³ (§4.1.5.3: 25 a / 12,5 a, no formula) → m205-F-3.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';
import { Q } from '../regulation-tables-seed-m205';

const STD = 'DWA-M-205';

export const EQUATIONS: EquationEntry[] = [
  {
    standard: STD, worksheet: 'M205-10', equation_number: 'M205-10-D1',
    formula: 'leitorganismen_verletzungen = count_rows(leitorganismen, ok == 0)',
    input_symbols: ['leitorganismen'], output_symbol: 'leitorganismen_verletzungen', output_unit: null,
    clause_reference: '§2.1, §3.2, §3.3, Tab. 1, Tab. 2, Tab. 3',
    description: 'Plan 3: Anzahl der Leitorganismen, deren Ablaufwert den Zielwert (Tab. 1 G/I-Wert, Tab. 2 Grenzwert der Gewässerklasse, Tab. 3 Obergrenze der Eignungsklasse oder behördlicher Wert) überschreitet; eine Zeile ohne numerischen Zielwert (Tab. 1 "-", Tab. 3 "nicht nachweisbar" / "> 400") lässt den Zähler unentscheidbar (m205-J-4). Gate == 0 als Ersatz der 14 Einzelgates STAGED (m205-G-1).',
    verification_quote: Q.L228, // L228 "Als Behandlungsziel wird eine maximal zulässige Anzahl … vorgegeben."
  },
  {
    standard: STD, worksheet: 'M205-10', equation_number: 'M205-10-D2',
    formula: 'leitorganismen_count = count_rows(leitorganismen)',
    input_symbols: ['leitorganismen'], output_symbol: 'leitorganismen_count', output_unit: null,
    clause_reference: '§2.1',
    description: 'Plan 3: Anzahl der erfassten Leitorganismen (vollständige Zeilen).',
    verification_quote: Q.L228,
  },
  {
    standard: STD, worksheet: 'M205-11', equation_number: 'M205-11-D1',
    formula: 'durchfluss_gerinne_sum = sum_rows(bestrahlungsgerinne, q_m3_h)',
    input_symbols: ['bestrahlungsgerinne'], output_symbol: 'durchfluss_gerinne_sum', output_unit: 'm³/h',
    clause_reference: '§4.1.3.2',
    description: 'Plan 3: Summe der Bemessungsdurchflüsse der parallelen Gerinne; Abgleich mit durchfluss_max STAGED (m205-G-8).',
    verification_quote: Q.L548, // L548 "… bei Durchflüssen über 1000 m³/h ist die Aufteilung des Gesamtdurchflusses auf parallel angeordnete Gerinne zweckmäßig."
  },
  {
    standard: STD, worksheet: 'M205-11', equation_number: 'M205-11-D2',
    formula: 'gerinne_count = count_rows(bestrahlungsgerinne)',
    input_symbols: ['bestrahlungsgerinne'], output_symbol: 'gerinne_count', output_unit: null,
    clause_reference: '§4.1.3.2',
    description: 'Plan 3: Anzahl der Bestrahlungsgerinne; > 1000 m³/h ⇒ mehrere Gerinne (CR-28 liest heute den Boolean mehrstrassige_anlage; STAGED m205-G-8).',
    verification_quote: Q.L548,
  },
  {
    standard: STD, worksheet: 'M205-11', equation_number: 'M205-11-D3',
    formula: 'gerinne_sensor_verletzungen = count_rows(bestrahlungsgerinne, sensoren_ok == 0)',
    input_symbols: ['bestrahlungsgerinne'], output_symbol: 'gerinne_sensor_verletzungen', output_unit: null,
    clause_reference: '§4.1.3.3',
    description: 'Plan 3: Gerinne mit weniger UV-Sensoren als gefordert (mindestens einer je Bank, mindestens zwei bei durchflussabhängig zu-/abgeschalteten Bestrahlungsräumen).',
    verification_quote: Q.L590, // L590–L591
  },
  {
    standard: STD, worksheet: 'M205-14', equation_number: 'M205-14-D1',
    formula: 'membranflaeche_sum = sum_rows(membranmodule, flaeche_m2)',
    input_symbols: ['membranmodule'], output_symbol: 'membranflaeche_sum', output_unit: 'm²',
    clause_reference: '§4.2.3.1, Tab. 5',
    description: 'Plan 3: Gesamtmembranfläche als Summe der Filtrationseinheiten (Tab. 5: Gesamtmembranfläche 300 / 6.720 / 630 m²).',
    verification_quote: Q.L748, // L748 Netto-Permeatfluss definition
  },
  {
    standard: STD, worksheet: 'M205-14', equation_number: 'M205-14-D2',
    formula: 'permeat_design = sum_rows(membranmodule, flaeche_m2 * netto_flux / 1000)',
    input_symbols: ['membranmodule'], output_symbol: 'permeat_design', output_unit: 'm³/h',
    clause_reference: '§4.2.3.1, Tab. 5',
    description: 'Plan 3: Netto-Permeatvolumenstrom der Auslegung = Σ Membranfläche [m²] · Netto-Permeatfluss [l/(m²·h)] / 1000; die Umrechnung auf m³/d braucht die (nicht gedruckte) Betriebszeit.',
    verification_quote: Q.L748,
  },
  {
    standard: STD, worksheet: 'M205-17', equation_number: 'M205-17-D1',
    formula: 'ozon_pro_doc_calc = ozon_konz / doc',
    input_symbols: ['ozon_konz', 'doc'], output_symbol: 'ozon_pro_doc_calc', output_unit: 'mg O3/mg DOC',
    clause_reference: '§4.3.3.3, §4.3.6',
    description: 'Plan 3: spezifische Ozondosis je DOC aus Ozonkonzentration [mg/l] und DOC [mg/l] (M205-08 → M205-17); Orientierung 0,5–1 mg/mg, Bromatminimierung < 0,8 mg/mg; Umstellung von EQ-04 STAGED (m205-R-2).',
    verification_quote: Q.L920, // L920 "Erforderliche Ozonkonzentration: 2 mg bis 10 mg Ozon/l bzw. ca. 0,5 mg bis 1 mg Ozon/mg DOC,"
  },
  {
    standard: STD, worksheet: 'M205-17', equation_number: 'M205-17-D2',
    formula: 'ozonbedarf_kg_h = ozon_konz * durchfluss_max / 1000',
    input_symbols: ['ozon_konz', 'durchfluss_max'], output_symbol: 'ozonbedarf_kg_h', output_unit: 'kg/h',
    clause_reference: '§4.3.3.2, §4.3.3.3',
    description: 'Plan 3: Ozonbedarf = Ozonkonzentration [mg/l = g/m³] · maximaler Zufluss [m³/h] / 1000 (durchfluss_max aus M205-08).',
    verification_quote: Q.L920,
  },
  {
    standard: STD, worksheet: 'M205-17', equation_number: 'M205-17-D3',
    formula: "o2_bedarf_kg_h = ozonbedarf_kg_h * lookup('S4_3_3_2', ozon_einsatzgas, 'o2_pro_o3_kg')",
    input_symbols: ['ozonbedarf_kg_h', 'ozon_einsatzgas'], output_symbol: 'o2_bedarf_kg_h', output_unit: 'kg/h',
    clause_reference: '§4.3.3.2',
    description: 'Plan 3: Sauerstoffbedarf = Ozonbedarf · 10 kg O2/kg O3 (Reinsauerstoff, "etwa 10 kg"); für Luft druckt der Text keinen Faktor → kein Wert.',
    verification_quote: Q.L899,
  },
  {
    standard: STD, worksheet: 'M205-17', equation_number: 'M205-17-D4',
    formula: 'ozon_kapazitaet_sum = sum_rows(ozongeneratoren, kapazitaet_kg_h)',
    input_symbols: ['ozongeneratoren'], output_symbol: 'ozon_kapazitaet_sum', output_unit: 'kg/h',
    clause_reference: '§4.3.3.2',
    description: 'Plan 3: installierte Ozonleistung als Summe der Generatoren; Abgleich mit ozonbedarf_kg_h STAGED (m205-G-11).',
    verification_quote: Q.L899,
  },
  {
    standard: STD, worksheet: 'M205-17', equation_number: 'M205-17-D5',
    formula: "ct_ziel = if(ct_wert_zielorganismus == 'cryptosporidien', ct_ecoli_basis * 500, ct_ecoli_basis)",
    input_symbols: ['ct_wert_zielorganismus', 'ct_ecoli_basis'], output_symbol: 'ct_ziel', output_unit: 'mg·min/l',
    clause_reference: '§4.3.2',
    description: 'Plan 3: ct-Zielwert für den Zielorganismus — Cryptosporidien-Oozysten: das Fünfhundertfache des E.-coli-Werts (bezüglich 99 % Reduktion), sonst der E.-coli-Basiswert; Abgleich ct_wert ≥ ct_ziel STAGED (m205-G-12).',
    verification_quote: Q.L868, // L868 "So übersteigt der ct-Wert für CryptosporidienOozysten den für Escherichia coli um ca. das Fünfhundertfache …"
  },
  {
    standard: STD, worksheet: 'M205-21', equation_number: 'M205-21-D1',
    formula: 'chlordosis_verletzungen = count_rows(chlorungsmittel, dosis_ok == 0)',
    input_symbols: ['chlorungsmittel'], output_symbol: 'chlordosis_verletzungen', output_unit: null,
    clause_reference: '§4.4.2',
    description: 'Plan 3: Chlorungsmittel, deren Dosis außerhalb des gedruckten Bereichs liegt (Chlorgas / Hypochlorit 1–20 mg/l freies Chlor; Chlordioxid 5–10 g/m³).',
    verification_quote: Q.L973,
  },
  {
    standard: STD, worksheet: 'M205-24', equation_number: 'M205-24-D1',
    formula: 'log_reduktion_mean = mean_rows(proben_desinfektion, log_red, c_out > 0)',
    input_symbols: ['proben_desinfektion'], output_symbol: 'log_reduktion_mean', output_unit: 'log10',
    clause_reference: '§2.1, §4.1.4.2',
    description: 'Plan 3: Mittel der je Probe berechneten Log-Reduktion log10(c_in / c_out) über die Proben mit c_out > 0 (c_out = 0 ist als Log-Reduktion nicht definiert — Nachweisgrenze eintragen); die statistische Einhaltungsregel ist nicht gedruckt (m205-F-1).',
    verification_quote: Q.L224, // L224 "… Die Reduktionsrate wird in der Regel in Log-Stufen oder Zehnerpotenzen angegeben …"
  },
  {
    standard: STD, worksheet: 'M205-24', equation_number: 'M205-24-D2',
    formula: 'log_reduktion_min = min_rows(proben_desinfektion, log_red, c_out > 0)',
    input_symbols: ['proben_desinfektion'], output_symbol: 'log_reduktion_min', output_unit: 'log10',
    clause_reference: '§2.1, §4.1.4.2',
    description: 'Plan 3: kleinste Log-Reduktion der Probenreihe (Proben mit c_out > 0).',
    verification_quote: Q.L224,
  },
  {
    standard: STD, worksheet: 'M205-24', equation_number: 'M205-24-D3',
    formula: 'proben_count = count_rows(proben_desinfektion)',
    input_symbols: ['proben_desinfektion'], output_symbol: 'proben_count', output_unit: null,
    clause_reference: '§4.1.4.2',
    description: 'Plan 3: Anzahl der vollständigen Proben; monatliche Nachweise sind in der Regel ausreichend.',
    verification_quote: Q.L640, // L640 "… sind monatliche Nachweise in der Regel ausreichend."
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
