/**
 * DIN-1989-1 — Plan 3 Task 2 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts din1989_1` (NEW equation
 * rows only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted
 * from the transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\DIN-1989-1.md`
 * (line in the comment). Text-only derivations ship `imported_unverified` and
 * carry the printed sentence they encode.
 *
 * NOT emitted (STAGED in scripts/verification/din1989_1-STAGED-plan3-rulings.sql):
 *   - the Gl. 1 rewrite `E_R = sum_a_e * h_N * eta` (replaces the prod equation
 *     '1' `E_R = A_A * e * h_N * eta`, verified_against_standard) → din1989_1-R-1;
 *   - ONE `BW_a = bw_person + bw_flaeche` replacing the two prod rows '2' and '3'
 *     that both output `BW_a` → din1989_1-R-2 (the fail-safe here is a separate
 *     derived field `bw_a_total`, never a second `BW_a` producer);
 *   - the gates hybridbehaelter_volumen <= tagesbedarf / 2 (din1989_1-G-2) and
 *     speicheroeffnung_dn >= speicheroeffnung_min_erf (din1989_1-G-3).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';

const STD = 'DIN-1989-1';

export const EQUATIONS: EquationEntry[] = [
  {
    standard: STD, worksheet: 'DIN-1989-1-04', equation_number: 'DIN-1989-1-04-D1',
    formula: 'sum_a_e = sum_rows(auffangflaechen, a_a * e)',
    input_symbols: ['auffangflaechen'], output_symbol: 'sum_a_e', output_unit: 'm²',
    clause_reference: '§16.3.6, Gl. 1',
    description: 'Plan 3: Σ(A_A · e) über die Auffangflächen-Zeilen (Gl.-1-Term A_A × e je Fläche); Umstellung von Gl. 1 STAGED (din1989_1-R-1).',
    verification_quote: String.raw`E_{\mathrm{R}}=A_{\mathrm{A}} \times e \times h_{\mathrm{N}} \times \eta \tag{1}`, // L860
  },
  {
    standard: STD, worksheet: 'DIN-1989-1-04', equation_number: 'DIN-1989-1-04-D2',
    formula: 'bw_person = sum_rows(verbraucher, p_d_eff * n * 365)',
    input_symbols: ['verbraucher'], output_symbol: 'bw_person', output_unit: 'l/a',
    clause_reference: '§16.3.7, Gl. 2',
    description: 'Plan 3: Σ(P_d · n · 365) über die Verbraucher-Zeilen (P_d wirksam = Tab. 4 + 10 l bei Waschmaschine).',
    verification_quote: String.raw`$B W_{\mathrm{a}}=P_{\mathrm{d}} \times n \times 365$`, // L898
  },
  {
    standard: STD, worksheet: 'DIN-1989-1-04', equation_number: 'DIN-1989-1-04-D3',
    formula: 'bw_flaeche = sum_rows(bewaesserungsflaechen, a_bew * bs_a)',
    input_symbols: ['bewaesserungsflaechen'], output_symbol: 'bw_flaeche', output_unit: 'l/a',
    clause_reference: '§16.3.7, Gl. 3',
    description: 'Plan 3: Σ(A_Bew · BS_a) über die Bewässerungsflächen-Zeilen.',
    verification_quote: String.raw`$B W_{\mathrm{a}}=A_{\text {Bew. }} \times B S_{\mathrm{a}}$`, // L905
  },
  {
    standard: STD, worksheet: 'DIN-1989-1-04', equation_number: 'DIN-1989-1-04-D4',
    formula: 'bw_a_total = bw_person + bw_flaeche',
    input_symbols: ['bw_person', 'bw_flaeche'], output_symbol: 'bw_a_total', output_unit: 'l/a',
    clause_reference: '§16.3.7',
    description: 'Plan 3: Betriebswasserjahresbedarf = personenbezogener + flächenbezogener Anteil ("setzt sich zusammen aus … und aus"); Ablösung der beiden BW_a-Zeilen STAGED (din1989_1-R-2).',
    verification_quote: 'Der Betriebswasserbedarf im Haushalt setzt sich zusammen aus personenbezogenen Angaben (z. B. Toilette) nach', // L897 (+ L904 "und aus flächenbezogenen Angaben (Grünflächen und Garten) nach")
  },
  {
    standard: STD, worksheet: 'DIN-1989-1-04', equation_number: 'DIN-1989-1-04-D5',
    formula: 'tagesbedarf = bw_a_total / 365',
    input_symbols: ['bw_a_total'], output_symbol: 'tagesbedarf', output_unit: 'l/d',
    clause_reference: '§11, §16.3.7',
    description: 'Plan 3: Tagesbedarf an Betriebswasser (Jahresbedarf / 365, der in Gl. 2 gedruckte Jahresfaktor); Grenze für das Hybridbehälter-Volumen (Gate STAGED din1989_1-G-2).',
    verification_quote: 'Ihr Volumen sollte nicht größer als der halbe Tagesbedarf an Betriebswasser sein.', // L591
  },
  {
    standard: STD, worksheet: 'DIN-1989-1-02', equation_number: 'DIN-1989-1-02-D1',
    formula: 'nennvolumen = mindestwasservolumen + V_n',
    input_symbols: ['mindestwasservolumen', 'V_n'], output_symbol: 'nennvolumen', output_unit: 'l',
    clause_reference: '§16.1',
    description: 'Plan 3: Nennvolumen = Mindestwasservolumen + Nutzvolumen (beide von DIN-1989-1-04 übernommen).',
    verification_quote: 'Das vom Hersteller angegebene Nennvolumen besteht aus dem Mindestwasservolumen und dem Nutzvolumen, das Gegenstand der folgenden Bemessungsverfahren ist.', // L783
  },
  {
    standard: STD, worksheet: 'DIN-1989-1-02', equation_number: 'DIN-1989-1-02-D2',
    formula: 'speicher_einzelvolumen_sum = sum_rows(speicher_behaelter, einzelvolumen_l)',
    input_symbols: ['speicher_behaelter'], output_symbol: 'speicher_einzelvolumen_sum', output_unit: 'l',
    clause_reference: '§6.3, §7',
    description: 'Plan 3: Σ Einzelvolumen über die Behälter-Zeilen (mehrere Behälter in Reihe).',
    verification_quote: 'Bei Verwendung mehrerer Behälter zur Speicherung, sind diese unter Berücksichtigung der vorgenannten Faktoren in Reihe zu schalten. Der Zu- und Überlauf ist im ersten Behälter anzuordnen. Die Wasserentnahme sollte im letzten Behälter installiert werden.', // L420
  },
  {
    standard: STD, worksheet: 'DIN-1989-1-02', equation_number: 'DIN-1989-1-02-D3',
    formula: 'speicheroeffnung_min_erf = max_rows(speicher_behaelter, oeffnung_min_mm)',
    input_symbols: ['speicher_behaelter'], output_symbol: 'speicheroeffnung_min_erf', output_unit: 'mm',
    clause_reference: '§7, Tab. 2',
    description: 'Plan 3: maßgebende Mindestöffnung = größte Tab.-2-Mindestöffnung über alle Behälter-Zeilen (jeder Behälter muss seine Zeile einhalten); Gate speicheroeffnung_dn ≥ speicheroeffnung_min_erf STAGED (din1989_1-G-3).',
    verification_quote: 'Zur Durchführung von Inspektion und Wartung dürfen die Öffnungen der Speicher die folgenden Durchmesser nicht unterschreiten (siehe auch E DIN 1989-3):', // L486
  },
  {
    standard: STD, worksheet: 'DIN-1989-1-06', equation_number: 'DIN-1989-1-06-D1',
    formula: 'wartungsplan_rows = count_rows(wartungsplan)',
    input_symbols: ['wartungsplan'], output_symbol: 'wartungsplan_rows', output_unit: null,
    clause_reference: '§18, Tab. 5',
    description: 'Plan 3: Anzahl der im Wartungsplan erfassten Anlagenteile (Tab. 5 druckt 17 — Vollständigkeit ist eine Sichtprüfung, kein Gate).',
    verification_quote: 'Inspektions- und Wartungsarbeiten an Regenwassernutzungsanlagen müssen durch den Betreiber oder einen Fachkundigen in Zeitintervallen nach Tabelle 5 durchgeführt werden und für die in Tabelle 5 aufgeführten Anlagenteile in folgendem Umfang inspiziert bzw. gewartet werden.', // L995
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
