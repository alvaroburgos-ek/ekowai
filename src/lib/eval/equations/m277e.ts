/**
 * DWA-M-277E — Plan 3 Task 4 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts m277e` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted from
 * the transcript `Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).md` (line in
 * the comment). Text-only derivations ship `imported_unverified` and carry the
 * printed sentence they encode (sign-off class F).
 *
 * Single-source (checked against the 22 prod equation rows read in-session):
 * prod already carries `Q_GWT = min(Q_GW, Q_SW)` (Eq. (3) / Eq. (4) / "Ex.
 * 9.4" on M277E-08 and -18), `Q_WB = Q_GW - Q_SW` (QWB) and `V_buffer =
 * Q_GWT * 1` (Buffer on M277E-09 / -21) — so the brief's `Q_GWT_calc` and
 * `V_buffer_calc` are NOT emitted (a second equation for a quantity that has
 * one); the duplicate / worked-example rows are m277e-R-3 / -R-4 STAGED.
 * `Q_GW_rows` / `Q_SW_rows` are NEW symbols (the Eq. (2) / Eq. (1) rewrites
 * onto them are m277e-R-1 / -R-2). No output symbol below is produced by a
 * prod equation.
 *
 * Outputs: register aggregates and codes output CREATED fields
 * (field-configs/m277e.ts); the five annual-balance rows output EXISTING,
 * consumer-free manual fields of M277E-18 whose prod description names the
 * quantity (V_GW_annual, V_SW_annual, V_treated_annual, V_surplus_annual,
 * V_topup_annual) — the guideline prints no formula for them (m277e-F-2).
 * `drinking_water_savings_rate` has no printed basis → not emitted (m277e-F-1).
 *
 * Scalar-only equations (M277E-05-D1, M277E-19-D1) compute on the hook /
 * report / snapshot / PDF paths and are not server-materialised (2a design,
 * controller amendment D).
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';

const STD = 'DWA-M-277E';

const L329 = String.raw`According to the Building Law, the installation of a rainwater or greywater reuse system with a storage capacity up to $50 \mathrm{~m}^{3}$ usually requires a mere notification (Model Building Code: MBO 2002 § 61 Para. 5c).`;
const L386_391 = String.raw`- Type A1: greywater from bathtubs and showers
- Type A2: greywater from bathtubs, showers and hand washbasins

I Type B: high grade greywater, i.e. greywater from kitchen drains and/or washing machines
- Type B1: greywater from bathtubs, showers, hand washbasins and washing machines
- Type B2: greywater from bathtubs, showers, hand washbasins, washing machines and/or kitchen.`;
const L495_502 = String.raw`\hline \multirow{4}{*}{Biochemical/chemicalphysical parameters} & Turbidity & - & < 2 NTU \\
\hline & $\mathrm{BOD}_{5}$ & - & $<5 \mathrm{mg} / \mathrm{l}$ \\
\hline & O2 Saturation & > 50 \% & > 50 \% \\
\hline & pH & 6.5-9.5 & 6.5-9.5 \\
\hline \multirow{4}{*}{Hygienic parameters} & Total coliforms & \multirow[t]{3}{*}{No requirement} & $<10,000 / 100 \mathrm{ml}$ \\
\hline & E. coli & & $<1,000 / 100 \mathrm{ml}$ \\
\hline & P. aeroginosa & & $<100 / 100 \mathrm{ml}$ \\
\hline & sampling & - & Reservoir/Consumer \\`;
const L508_509 = String.raw`\hline \multirow{2}{*}{} & & \multirow[b]{2}{*}{FB, SF, FLB, Stabilisation} & FB, SF, FLB, MBR \\
\hline & Exemplary processes and other treatment stages & & + UV, UF, RO \\`;
const L574 = 'It is recommended that the total buffer volume corresponds to one-day treatment capacity.';
const L618 = String.raw`Q_{S W}=\Sigma\left(Q_{S W-P, i} \cdot P_{i}\right)+\Sigma\left(Q_{S W-A, j} \cdot A_{j}\right) \tag{1}`;
const L649 = 'Decisive for system dimensioning is the highest quality standard.';
const L663 = 'Minimum service water quality: C2 due to the irrigation of the kitchen garden.';
const L672 = String.raw`\mathrm{Q}_{\mathrm{GW}}=\Sigma\left(\mathrm{Q}_{\mathrm{GW}-\mathrm{P}, \mathrm{i}} \cdot \mathrm{P}_{\mathrm{i}}\right) \quad(\mathrm{I} / \mathrm{d}) \tag{2}`;
const L718 = 'Decisive for the hydraulic dimensioning is the smaller value in each case.';
const L737 = String.raw`Q_{W B}=Q_{G W}-Q_{S W}=0(l / d)`;
const L747 = String.raw`As a rule, a positive water balance can be determined ( $Q_{W B}>0$ ), which means that the amount of available daily greywater inflow is higher than the demand for service water.`;
const L751 = String.raw`If a negative balance is calculated ( $Q_{W B}<0$ ), this means that the available amount of daily greywater inflow is lower than the demand for service water. Therefore, it should be tested whether less service water consumers can be connected to the service water network than was originally planned. If, for economic reasons, this option is not viable, a lower level of drinking water substitution must then be expected (higher drinking water backfeed).`;
const L755 = 'The daily treatment capacity should be complemented with data on the weekly/monthly capacity of the greywater treatment system.';

export const EQUATIONS: EquationEntry[] = [
  // ---- M277E-06: Grauwasserquellen register → type code (§5) and Σ Q_GW (Eq. 2) ----
  {
    standard: STD, worksheet: 'M277E-06', equation_number: 'M277E-06-D1',
    formula: "greywater_type_code = if(count_rows(grauwasserquellen, source IN {'kitchen_sink', 'dishwasher'}) > 0, 4, if(count_rows(grauwasserquellen, source == 'washing_machine') > 0, 3, if(count_rows(grauwasserquellen, source == 'hand_washbasin') > 0, 2, 1)))",
    input_symbols: ['grauwasserquellen'], output_symbol: 'greywater_type_code', output_unit: null,
    clause_reference: '§5 (type definitions), Tab. 2',
    description: 'Plan 3: Grauwassertyp aus den angeschlossenen Quellen — Küche (Spüle/Geschirrspüler) ⇒ 4 (B2), sonst Waschmaschine ⇒ 3 (B1), sonst Handwaschbecken ⇒ 2 (A2), sonst 1 (A1: Badewanne/Dusche); Label und Gesamtbereich je Code in TABLE2_TYPE; Ableitung des manuellen greywater_type STAGED (m277e-D-1).',
    verification_quote: L386_391,
  },
  {
    standard: STD, worksheet: 'M277E-06', equation_number: 'M277E-06-D2',
    formula: 'Q_GW_rows = sum_rows(grauwasserquellen, q_gw_p * persons)',
    input_symbols: ['grauwasserquellen'], output_symbol: 'Q_GW_rows', output_unit: 'l/d',
    clause_reference: '§9.3, Eq. (2)',
    description: 'Plan 3: Σ Q_GW-P,i · P_i über die Grauwasserquellen-Zeilen (Eq. 2); Übernahme als Q_GW auf M277E-07 / -17 STAGED (m277e-R-1 / m277e-C-1).',
    verification_quote: L672,
  },
  // ---- M277E-16: the two Σ of Eq. (1) and the highest-category rule ----
  {
    standard: STD, worksheet: 'M277E-16', equation_number: 'M277E-16-D1',
    formula: 'Q_SW_rows = sum_rows(verbraucher_sw, q_row) + if(count_rows(bewaesserung_sw) > 0, sum_rows(bewaesserung_sw, q_row), 0)',
    input_symbols: ['verbraucher_sw', 'bewaesserung_sw'], output_symbol: 'Q_SW_rows', output_unit: 'l/d',
    clause_reference: '§9.2, Eq. (1)',
    description: 'Plan 3: Σ Q_SW-P,i · P_i (personenbezogene Zeilen) + Σ Q_SW-A,j · A_j (Bewässerungsflächen; 0 ohne Flächen — mindestens eine personenbezogene Zeile ist nötig, sonst "Keine vollständigen Zeilen"); Ablösung von Eq. (1) STAGED (m277e-R-2).',
    verification_quote: L618,
  },
  {
    standard: STD, worksheet: 'M277E-16', equation_number: 'M277E-16-D2',
    formula: 'quality_category_code_rows = if(count_rows(bewaesserung_sw) > 0, 2, max_rows(verbraucher_sw, min_cat))',
    input_symbols: ['verbraucher_sw', 'bewaesserung_sw'], output_symbol: 'quality_category_code_rows', output_unit: null,
    clause_reference: '§9.2; §6.3, Tab. 4',
    description: 'Plan 3: höchste Tab.-4-Mindestkategorie über die Verbraucher-Zeilen (1 = C1, 2 = C2); jede Bewässerungsfläche ⇒ 2 (Tab. 4: Bewässerung nur unter C2, Beispiel §9.2 "C2 due to the irrigation"); Übernahme in quality_category (M277E-14) STAGED (m277e-D-2 / m277e-C-2).',
    verification_quote: `${L649} — ${L663}`,
  },
  // ---- M277E-05: the MBO 50 m³ threshold from the inherited storage capacity ----
  {
    standard: STD, worksheet: 'M277E-05', equation_number: 'M277E-05-D1',
    formula: 'mbo_authorisation_code = if(storage_capacity_m3 > 50, 1, 0)',
    input_symbols: ['storage_capacity_m3'], output_symbol: 'mbo_authorisation_code', output_unit: null,
    clause_reference: '§4.2',
    description: 'Plan 3: 0 = Speichervolumen bis 50 m³ (Anzeige genügt, "mere notification"), 1 = über 50 m³ (Genehmigung); 50 gedruckt L329; storage_capacity_m3 kommt von M277E-01; die Ableitung der manuellen Booleans MBO_notification_only / MBO_authorisation_required STAGED (m277e-D-3).',
    verification_quote: L329,
  },
  // ---- M277E-19: the Tab.-4 process allow-list as a code ----
  {
    standard: STD, worksheet: 'M277E-19', equation_number: 'M277E-19-D1',
    formula: "treatment_method_allowed = if(quality_category == 'C1', lookup('TABLE4_PROCESSES', treatment_method, 'c1_allowed'), lookup('TABLE4_PROCESSES', treatment_method, 'c2_allowed'))",
    input_symbols: ['quality_category', 'treatment_method'], output_symbol: 'treatment_method_allowed', output_unit: null,
    clause_reference: '§6.3, Tab. 4',
    description: 'Plan 3: 1 wenn das gewählte Verfahren in der Tab.-4-Liste der Kategorie steht (C1: FB, SF, FLB, Stabilisation; C2: FB, SF, FLB, MBR + UV, UF, RO), sonst 0; die Liste ist "not exhaustive" (L480) — Gate == 1 STAGED (m277e-G-2).',
    verification_quote: L508_509,
  },
  // ---- M277E-21: storage rows → Σ volume in m³ ----
  {
    standard: STD, worksheet: 'M277E-21', equation_number: 'M277E-21-D1',
    formula: 'storage_capacity_calc_m3 = sum_rows(speicher_277, volume_l) / 1000',
    input_symbols: ['speicher_277'], output_symbol: 'storage_capacity_calc_m3', output_unit: 'm³',
    clause_reference: '§4.2; §7.1',
    description: 'Plan 3: Σ Speichervolumen über die Speicher-Zeilen (1000 = l → m³); Übernahme als storage_capacity_m3 (M277E-01, MBO-Schwelle 50 m³) STAGED (m277e-R-5).',
    verification_quote: `${L574} — ${L329}`,
  },
  // ---- M277E-24: treated samples vs the Tab.-4 limits ----
  {
    standard: STD, worksheet: 'M277E-24', equation_number: 'M277E-24-D1',
    formula: 'treated_samples_fail = count_rows(ablaufproben_treated, turbidity_ok == 0 OR bod5_ok == 0 OR o2_ok == 0 OR ph_ok == 0 OR total_coliforms_ok == 0 OR e_coli_ok == 0 OR p_aeruginosa_ok == 0)',
    input_symbols: ['ablaufproben_treated'], output_symbol: 'treated_samples_fail', output_unit: null,
    clause_reference: '§6.3, Tab. 4',
    description: 'Plan 3: Anzahl vollständiger Ablaufproben mit mindestens einer verletzten Tab.-4-Anforderung der Kategorie (Vergleich je Zeile mit turbidity_limit … p_aeruginosa_limit; unter C1 gelten nur O2 und pH); Gate == 0 STAGED (m277e-G-6).',
    verification_quote: L495_502,
  },
  {
    standard: STD, worksheet: 'M277E-24', equation_number: 'M277E-24-D2',
    formula: 'treated_samples_count = count_rows(ablaufproben_treated)',
    input_symbols: ['ablaufproben_treated'], output_symbol: 'treated_samples_count', output_unit: null,
    clause_reference: '§6.3, Tab. 4',
    description: 'Plan 3: Anzahl vollständiger Ablaufproben (Bezugsgröße für treated_samples_fail).',
    verification_quote: L495_502,
  },
  // ---- M277E-18: annual balance over the periods register (text-only, m277e-F-2) ----
  {
    standard: STD, worksheet: 'M277E-18', equation_number: 'M277E-18-D1',
    formula: 'V_GW_annual = sum_rows(bilanzperioden, q_gw * days) / 1000',
    input_symbols: ['bilanzperioden'], output_symbol: 'V_GW_annual', output_unit: 'm³/a',
    clause_reference: '§9.4',
    description: 'Plan 3: Jahres-Grauwasseranfall = Σ Q_GW · Tage über die Bilanzperioden (1000 = l → m³); Text-Ableitung ohne gedruckte Formel (m277e-F-2); übernimmt ein bislang manuelles Feld.',
    verification_quote: L755,
  },
  {
    standard: STD, worksheet: 'M277E-18', equation_number: 'M277E-18-D2',
    formula: 'V_SW_annual = sum_rows(bilanzperioden, q_sw * days) / 1000',
    input_symbols: ['bilanzperioden'], output_symbol: 'V_SW_annual', output_unit: 'm³/a',
    clause_reference: '§9.4',
    description: 'Plan 3: Jahres-Brauchwasserbedarf = Σ Q_SW · Tage über die Bilanzperioden (1000 = l → m³); Text-Ableitung (m277e-F-2).',
    verification_quote: L755,
  },
  {
    standard: STD, worksheet: 'M277E-18', equation_number: 'M277E-18-D3',
    formula: 'V_treated_annual = sum_rows(bilanzperioden, min(q_gw, q_sw) * days) / 1000',
    input_symbols: ['bilanzperioden'], output_symbol: 'V_treated_annual', output_unit: 'm³/a',
    clause_reference: '§9.4, Eq. (3) / Eq. (4)',
    description: 'Plan 3: Jahres-Behandlungsvolumen = Σ min(Q_GW, Q_SW) · Tage ("the smaller value in each case", Eq. 3/4 je Periode); Text-Ableitung (m277e-F-2).',
    verification_quote: L718,
  },
  {
    standard: STD, worksheet: 'M277E-18', equation_number: 'M277E-18-D4',
    formula: 'V_surplus_annual = sum_rows(bilanzperioden, if(q_wb > 0, q_wb * days, 0)) / 1000',
    input_symbols: ['bilanzperioden'], output_symbol: 'V_surplus_annual', output_unit: 'm³/a',
    clause_reference: '§9.4',
    description: 'Plan 3: Jahres-Überschuss = Σ Q_WB · Tage der Perioden mit Q_WB > 0 (Überlauf / Versickerung, L747); Text-Ableitung (m277e-F-2).',
    verification_quote: `${L737} — ${L747}`,
  },
  {
    standard: STD, worksheet: 'M277E-18', equation_number: 'M277E-18-D5',
    formula: 'V_topup_annual = sum_rows(bilanzperioden, if(q_wb < 0, -(q_wb * days), 0)) / 1000',
    input_symbols: ['bilanzperioden'], output_symbol: 'V_topup_annual', output_unit: 'm³/a',
    clause_reference: '§9.4',
    description: 'Plan 3: Jahres-Nachspeisung = Σ |Q_WB| · Tage der Perioden mit Q_WB < 0 ("higher drinking water backfeed", L751); Text-Ableitung (m277e-F-2).',
    verification_quote: `${L737} — ${L751}`,
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
