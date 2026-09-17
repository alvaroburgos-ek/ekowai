/**
 * DWA-M-277E — Plan 3 Task 4 field configs (registers, selections, lookup_fill,
 * visibility) as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts m277e`.
 *
 * Every `verification_quote` is lifted verbatim (whitespace-normalised) from
 * the transcript `Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).md` (English
 * edition, October 2017); the line is in the constant's name. Prod facts come
 * from the captured `m277e.prior.json` (2026-09-17, read-only): every
 * worksheet carries the same nine coded sections A B C D F J K L M (fields
 * live in B and D; 109 of 198 fields are orphans); 22 equations (5 real +
 * duplicates / worked examples); 63 compliance rows (the brief's "88" was the
 * inventory's count — see the report). Enum tokens below are the captured
 * prod `enum_values` (G-A3: table key strings equal them exactly — note the
 * UPPER-CASE `A1 … B2` and `C1 / C2`).
 *
 * Placement decisions (codebase reality over the brief — each recorded in the
 * report §8 and on the sign-off sheet):
 *   - the Grauwasserquellen register AND both of its outputs (type code, Σ
 *     Q_GW) live on M277E-06: an equation only sees a register on its own
 *     worksheet, and a `create` never sets `consumer_worksheets`; feeding
 *     prod's Eq. (2) on M277E-07 / -17 from `Q_GW_rows` is m277e-R-1 / -C-1;
 *   - the Verbraucher registers (person-based + area-based, the two Σ of
 *     Eq. (1)) and `Q_SW_rows` / `quality_category_code_rows` live on
 *     M277E-16 where prod's Eq. (1) is; the M277E-14 `quality_category`
 *     derivation is m277e-D-2 / -C-2;
 *   - the Table-4 limit fills and the treated-sample register live on
 *     M277E-24 (it inherits `quality_category` from M277E-14 and already holds
 *     the treated-water scalars) — not on M277E-14, which holds only the
 *     category itself; the per-row pass columns read the limit symbols in row
 *     scope (G-13);
 *   - `mbo_authorisation_code` computes on M277E-05 from the EXISTING
 *     inherited `storage_capacity_m3`; the register-derived
 *     `storage_capacity_calc_m3` on M277E-21 replacing it is m277e-R-5.
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/m277e-STAGED-plan3-rulings.sql):
 *   - visible_when on consumed producers: M277E-20 `UV_transmission_pct`
 *     (consumed by -24), M277E-11 `DIN_19650_class_documented` (-24) and `A`
 *     (-16), M277E-15 `Q_SW_A` (-16) → m277e-C-3; M277E-15
 *     `irrigation_season_length` has no `use_category` in scope (never hides)
 *     → same block; `source_set` is never hidden (X-1 retirement);
 *   - `turbidity_NTU_C1` (M277E-10 / -24, "no requirement" placeholder) —
 *     never hidden, deactivation m277e-S-1;
 *   - the `treatment_method` allow-list gate (m277e-G-2), the limit-symbol
 *     gates (m277e-G-1), the treated-sample gate (m277e-G-6).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { GREYWATER_TYPE_TOKENS, QUALITY_CATEGORY_TOKENS, USE_CATEGORY_TOKENS, APPLICATION_TOKENS, SIEVERS_STATISTIC_TOKENS } from '../regulation-tables-seed-m277e';

const STD = 'DWA-M-277E';
export { GREYWATER_TYPE_TOKENS, QUALITY_CATEGORY_TOKENS, USE_CATEGORY_TOKENS, APPLICATION_TOKENS, SIEVERS_STATISTIC_TOKENS };

/** Printed Tab. 4 row labels per prod `use_category` token (L503–L507). */
export const USE_CATEGORY_LABELS: Record<(typeof USE_CATEGORY_TOKENS)[number], string> = {
  toilet_private: 'Toilet flushing (private)', irrigation_lawn: 'Irrigation (private) lawn, ornamental plants', irrigation_crops: 'Irrigation crop plants (for consumption)',
  laundry_private: 'Laundry (private)*', toilet_public: 'Toilet flushing (public)',
};

// ---- lifted cue sentences (transcript line in the name) ----
const L329 = String.raw`According to the Building Law, the installation of a rainwater or greywater reuse system with a storage capacity up to $50 \mathrm{~m}^{3}$ usually requires a mere notification (Model Building Code: MBO 2002 § 61 Para. 5c).`;
const L333 = 'According to the Federal Water Act (WHG), the discharge of treated greywater implies the use of a water body and therefore, it requires an official permit in compliance with § 8 of the WHG.';
const L353 = 'In the present document, data from Sievers et al. (2014) are recommended as design values.';
const L361 = String.raw`\hline & & from & to & from & to & median & mean & 85percentile \\`;
const L386_391 = String.raw`- Type A1: greywater from bathtubs and showers
- Type A2: greywater from bathtubs, showers and hand washbasins

I Type B: high grade greywater, i.e. greywater from kitchen drains and/or washing machines
- Type B1: greywater from bathtubs, showers, hand washbasins and washing machines
- Type B2: greywater from bathtubs, showers, hand washbasins, washing machines and/or kitchen.`;
const L393 = 'The considered sources of origin are listed in Table 2. The load values listed below serve as orientation values.';
const L426 = 'In Table 3 as well as in Annex B, the wide range of the microbial loads is clearly evidenced.';
const L434 = String.raw`\hline Total coliforms ( $1 / \mathrm{ml}$ ) & $10^{1}-10^{5}$ & $10^{2}-10^{6}$ & $10^{5}-10^{8}$ \\`;
const L435 = String.raw`\hline Faecal coliforms ( $1 / \mathrm{ml}$ ) & $10^{1}-10^{5}$ & $10^{2}-10^{6}$ & $10^{2}-10^{6}$ \\`;
const L446 = 'Quality requirements for service water should be orientated towards the specific intended use.';
const L460 = 'In rented apartments the user must also have the possibility to use drinking water for these purposes (BVerwG Az. 8 C 41.09, 2010).';
const L470 = 'Quality requirements for irrigation water are regulated by DIN 19650. These quality requirements address hygienic/microbiological concerns of irrigation water in agriculture, horticulture, landscaping as well as in parks and sports facilities. The hygienic safety is subdivided into four suitability classes, each of which must be verified depending on the intended use (see DIN 19650: Table 4).';
const L480 = 'This compilation is not exhaustive with regard to technology and allocation of particular uses to the single technologies.';
const L495 = String.raw`\hline \multirow{4}{*}{Biochemical/chemicalphysical parameters} & Turbidity & - & < 2 NTU \\`;
const L496 = String.raw`\hline & $\mathrm{BOD}_{5}$ & - & $<5 \mathrm{mg} / \mathrm{l}$ \\`;
const L497 = String.raw`\hline & O2 Saturation & > 50 \% & > 50 \% \\`;
const L498 = String.raw`\hline & pH & 6.5-9.5 & 6.5-9.5 \\`;
const L499 = String.raw`\hline \multirow{4}{*}{Hygienic parameters} & Total coliforms & \multirow[t]{3}{*}{No requirement} & $<10,000 / 100 \mathrm{ml}$ \\`;
const L500 = String.raw`\hline & E. coli & & $<1,000 / 100 \mathrm{ml}$ \\`;
const L501 = String.raw`\hline & P. aeroginosa & & $<100 / 100 \mathrm{ml}$ \\`;
const L502 = String.raw`\hline & sampling & - & Reservoir/Consumer \\`;
const L503_507 = String.raw`Toilet flushing (private) & + & + \\
\hline & Irrigation (private) lawn, ornamental plants & - & + \\
\hline & Irrigation crop plants (for consumption) & - & + \\
\hline & Laundry (private)* & - & + \\
\hline & Toilet flushing (public) & - & + \\`;
const L508_509 = String.raw`\hline \multirow{2}{*}{} & & \multirow[b]{2}{*}{FB, SF, FLB, Stabilisation} & FB, SF, FLB, MBR \\
\hline & Exemplary processes and other treatment stages & & + UV, UF, RO \\`;
const L517 = String.raw`*UV Transmission > 60 \% is recommended.`;
const L574 = 'Depending on the type of technology used, storage of the greywater should be provided for before and/or after treatment. It is recommended that the total buffer volume corresponds to one-day treatment capacity.';
const L615 = String.raw`The daily total service water demand $\left(\mathrm{Q}_{\mathrm{SW}}\right)$ can be calculated from the subtotals of the single application areas according to the following formula:`;
const L618 = String.raw`Q_{S W}=\Sigma\left(Q_{S W-P, i} \cdot P_{i}\right)+\Sigma\left(Q_{S W-A, j} \cdot A_{j}\right) \tag{1}`;
const L632 = 'The following Table 5 provides assistance in determining the service water demand.';
const L649 = 'Decisive for system dimensioning is the highest quality standard.';
const L655 = String.raw`I Service water consumers: toilets, irrigation of kitchen garden ( $150 \mathrm{~m}^{2}$, season with 180 days)`;
const L658 = String.raw`& Q_{S W}=25 \mathrm{P} \cdot 33 \mathrm{l} /(\mathrm{P} \cdot \mathrm{~d}) \text { toilet }+60 \mathrm{l} / \mathrm{m}^{2} \cdot 150 \mathrm{~m}^{2} / 180 \mathrm{~d} \text { kitchen garden } \\`;
const L663 = 'Minimum service water quality: C2 due to the irrigation of the kitchen garden.';
const L669 = 'The daily total greywater inflow can be determined using Table 2 (see Section 5) und is calculated from the subtotals of the single greywater sources according to the following formula:';
const L672 = String.raw`\mathrm{Q}_{\mathrm{GW}}=\Sigma\left(\mathrm{Q}_{\mathrm{GW}-\mathrm{P}, \mathrm{i}} \cdot \mathrm{P}_{\mathrm{i}}\right) \quad(\mathrm{I} / \mathrm{d}) \tag{2}`;
const L737 = String.raw`Q_{W B}=Q_{G W}-Q_{S W}=0(l / d)`;
const L747 = String.raw`As a rule, a positive water balance can be determined ( $Q_{W B}>0$ ), which means that the amount of available daily greywater inflow is higher than the demand for service water.`;
const L751 = String.raw`If a negative balance is calculated ( $Q_{W B}<0$ ), this means that the available amount of daily greywater inflow is lower than the demand for service water.`;
const L755 = 'The daily treatment capacity should be complemented with data on the weekly/monthly capacity of the greywater treatment system. This dimensioning point has a decisive influence on possible upstream and downstream buffer reservoirs or it rather gives specific information on the mode of operation of the greywater reuse system.';
const L826_827 = String.raw`Grey-/rainwater inflow via: ◯ gravity
◯ pump station □ m³/h`;

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS05 = on('M277E-05');
const WS06 = on('M277E-06');
const WS08 = on('M277E-08');
const WS09 = on('M277E-09');
const WS10 = on('M277E-10');
const WS11 = on('M277E-11');
const WS12 = on('M277E-12');
const WS16 = on('M277E-16');
const WS18 = on('M277E-18');
const WS19 = on('M277E-19');
const WS20 = on('M277E-20');
const WS21 = on('M277E-21');
const WS24 = on('M277E-24');

export const C2 = "quality_category == 'C2'";
const CAT_LABELS = { '1': 'C1', '2': 'C2' } as const;

/** Sievers design-value fill created next to the statistic select on M277E-08 (the existing COD … TS stay the engineer's measured values, m277e-J-2). */
const sieversFill = (symbol: string, value: string, param: string, unit: string, printed: string): FieldConfigEntry => WS08({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1 (Sievers et al. 2014)' },
  lookup: { table_code: 'TABLE1_SIEVERS', role: 'value', keys: [{ column: 'statistic', from_symbol: 'sievers_statistic' }], value },
  verification_quote: L353,
  create: { section_code: 'B', label_de: `${param} — Bemessungswert nach Sievers et al. 2014 (Tab. 1: ${printed})`, data_type: 'number', unit, clause_reference: '§5, Tab. 1',
    description: `Plan 3: Tab.-1-Wert (Sievers et al. 2014) zur gewählten Statistik (mean / 85percentile); die gemessenen Werte auf diesem Arbeitsblatt gehen vor (m277e-J-2).` },
});

/** Table-4 limit fill on M277E-24, keyed on the inherited `quality_category`; C2-only limits hide under C1 (printed "-" / "No requirement"). */
const limitFill = (symbol: string, value: string, label: string, unit: string, quote: string, c2only: boolean): FieldConfigEntry => WS24({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 4' },
  lookup: { table_code: 'TABLE4_LIMITS', role: 'limit', keys: [{ column: 'quality_category', from_symbol: 'quality_category' }], value },
  visible_when: c2only ? C2 : null,
  verification_quote: quote,
  create: { section_code: 'B', label_de: label, data_type: 'number', unit, clause_reference: '§6.3, Tab. 4',
    description: `Plan 3: Grenzwert aus TABLE4_LIMITS zur Qualitätskategorie (${c2only ? 'nur C2 — C1 druckt "-" / "No requirement"' : 'C1 und C2'}); die Ablaufproben-Zeilen vergleichen dagegen (M277E-24-D1); Gates auf diesem Symbol STAGED (m277e-G-1).` },
});

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- M277E-06 (Grauwasser-Quellenklassifikation): the source register, its two outputs, the Tab.-3 range fills ----
  WS06({
    symbol: 'grauwasserquellen', widget: 'register',
    ui_config: {
      title: 'Grauwasserquellen', subtitle: '§5 Tab. 2 — je Quelle Personen und spezifischer Anfall Q_GW-P,i (gewählt im gedruckten Bereich)', add_label: '+ Quelle', placement: 'section',
      columns: [
        { key: 'source', label: 'Quelle', type: 'lookup_key', required: true, lookup: { table_code: 'TABLE2' } },
        { key: 'persons', label: 'P_i', type: 'number', required: true, min: 0, aria_label: 'Personen an dieser Quelle' },
        { key: 'q_min', label: 'Q_GW-P min (Tab. 2)', type: 'lookup_value', unit: 'l/(P·d)', lookup: { table_code: 'TABLE2', key_column: 'source', value: 'q_gw_p_min' } },
        { key: 'q_max', label: 'Q_GW-P max (Tab. 2)', type: 'lookup_value', unit: 'l/(P·d)', lookup: { table_code: 'TABLE2', key_column: 'source', value: 'q_gw_p_max' } },
        { key: 'q_gw_p', label: 'Q_GW-P,i gewählt', type: 'number', unit: 'l/(P·d)', required: true, min: 0, aria_label: 'gewählter spezifischer Grauwasseranfall' },
        { key: 'in_range', label: 'im Bereich', type: 'derived', expr: 'if(q_gw_p >= q_min AND q_gw_p <= q_max, 1, 0)', display: 'badge', value_labels: { '1': 'im Bereich Tab. 2', '0': 'außerhalb Tab. 2' } },
        { key: 'q_row', label: 'Q_GW,i', type: 'derived', expr: 'q_gw_p * persons', unit: 'l/d' },
      ],
      footer: ['Q_GW_rows', 'greywater_type_code'],
      note: L393,
    },
    verification_quote: `${L393} — ${L669} — ${L672}`,
    create: { section_code: 'B', label_de: 'Grauwasserquellen (Tab. 2 → Typ A1/A2/B1/B2, Σ Q_GW)', data_type: 'json', unit: null, clause_reference: '§5, Tab. 2; §9.3, Eq. (2)',
      description: 'Plan 3: Zeilen je Herkunftsbereich (Quelle, P_i, Q_GW-P,i im Bereich von Tab. 2); Typ-Code → greywater_type_code (M277E-06-D1), Σ Q_GW-P,i · P_i → Q_GW_rows (M277E-06-D2); ersetzt funktional source_set + die sechs Q_GW_P_<Quelle>-Skalare (Ablösung m277e-X-1); Übernahme in Eq. (2) auf M277E-07/-17 STAGED (m277e-R-1 / m277e-C-1).' },
  }),
  WS06({ symbol: 'greywater_type_code', widget: 'derived', ui_config: null, verification_quote: L386_391,
    create: { section_code: 'D', label_de: 'Grauwassertyp aus den Quellen als Code (1 = A1 Badewanne/Dusche · 2 = A2 + Handwaschbecken · 3 = B1 + Waschmaschine · 4 = B2 + Küche)', data_type: 'number', unit: null, clause_reference: '§5',
      description: 'Plan 3: Ausgabe der Gleichung M277E-06-D1 (count_rows über grauwasserquellen nach den §5-Definitionen); TABLE2_TYPE trägt Label und Gesamtbereich je Code; die Ableitung des manuellen greywater_type ist STAGED (m277e-D-1).' } }),
  WS06({ symbol: 'Q_GW_rows', widget: 'derived', ui_config: null, verification_quote: L672,
    create: { section_code: 'D', label_de: 'Σ Q_GW-P,i · P_i über die Grauwasserquellen (Eq. 2)', data_type: 'number', unit: 'l/d', clause_reference: '§9.3, Eq. (2)',
      description: 'Plan 3: Ausgabe der Gleichung M277E-06-D2 (sum_rows über grauwasserquellen); Übernahme als Q_GW auf M277E-07/-17 STAGED (m277e-R-1 / m277e-C-1).' } }),
  WS06({
    symbol: 'total_coliforms_untreated_range', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 3' },
    lookup: { table_code: 'TABLE3', role: 'value', keys: [{ column: 'greywater_type', from_symbol: 'greywater_type' }], value: 'total_coliforms_range' },
    verification_quote: `${L426} — ${L434}`,
    create: { section_code: 'B', label_de: 'Gesamtcoliforme im unbehandelten Grauwasser — Bereich nach Tab. 3 (1/ml)', data_type: 'text', unit: '1/ml', clause_reference: '§5, Tab. 3',
      description: 'Plan 3: gedruckter Größenordnungsbereich (10^1-10^5 Typ A · 10^2-10^6 B1 · 10^5-10^8 B2) zum gewählten Grauwassertyp; Orientierungswert (anhaltswert), die Messwerte total_coliforms_untreated bleiben.' },
  }),
  WS06({
    symbol: 'faecal_coliforms_untreated_range', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 3' },
    lookup: { table_code: 'TABLE3', role: 'value', keys: [{ column: 'greywater_type', from_symbol: 'greywater_type' }], value: 'faecal_coliforms_range' },
    verification_quote: `${L426} — ${L435}`,
    create: { section_code: 'B', label_de: 'Fäkalcoliforme im unbehandelten Grauwasser — Bereich nach Tab. 3 (1/ml)', data_type: 'text', unit: '1/ml', clause_reference: '§5, Tab. 3',
      description: 'Plan 3: gedruckter Größenordnungsbereich (10^1-10^5 Typ A · 10^2-10^6 B1 · 10^2-10^6 B2) zum gewählten Grauwassertyp; Orientierungswert (anhaltswert), die Messwerte faecal_coliforms_untreated bleiben.' },
  }),

  // ---- M277E-08 (Grauwasser-Qualitätsdaten): Sievers design values keyed on the printed statistic ----
  WS08({
    symbol: 'sievers_statistic', widget: 'select_one', ui_config: null,
    enum_values: [
      { value: 'mean', label_de: 'mean (Sievers et al. 2014)', order_index: 0 },          // L361
      { value: 'p85', label_de: '85percentile (Sievers et al. 2014)', order_index: 1 },   // L361
    ],
    verification_quote: `${L353} — ${L361}`,
    create: { section_code: 'B', label_de: 'Bemessungsstatistik nach Sievers et al. 2014 (Tab. 1: mean / 85percentile)', data_type: 'enum', unit: null, clause_reference: '§5, Tab. 1',
      description: 'Plan 3: Treiber der TABLE1_SIEVERS-Zeile für die Bemessungswerte (Q_GW_P, COD, BOD5, TN, TP, TS); die Spalten fbr 2005 / DWA 2008 sind m277e-J-2.' },
  }),
  sieversFill('Q_GW_P_sievers', 'water_volume_l_pd', 'Wasseranfall', 'l/(P·d)', '68 / 80'),
  sieversFill('COD_sievers', 'cod_mg_l', 'COD', 'mg/l', '838 / 1,038'),
  sieversFill('BOD5_sievers', 'bod5_mg_l', 'BOD5', 'mg/l', '456 / 650'),
  sieversFill('TN_sievers', 'tn_mg_l', 'TN', 'mg/l', '15 / 17.5'),
  sieversFill('TP_sievers', 'tp_mg_l', 'TP', 'mg/l', '6 / 6.5'),
  sieversFill('TS_sievers', 'ts_mg_l', 'TS', 'mg/l', '103 / 137.5'),

  // ---- M277E-10 (Nutzungsart Toilettenspülung): the use inventory + C2-only limit scalars hidden under C1 ----
  WS10({
    symbol: 'nutzungsarten', widget: 'register',
    ui_config: {
      title: 'Nutzungsarten', subtitle: '§6.2 / Tab. 4 — je Nutzung die Mindest-Qualitätskategorie und die nutzungsspezifischen Nachweise', add_label: '+ Nutzung', placement: 'section',
      columns: [
        { key: 'use_category', label: 'Nutzung', type: 'enum', required: true, options: [...USE_CATEGORY_TOKENS], option_labels: USE_CATEGORY_LABELS, discriminator: true },
        { key: 'min_cat', label: 'Mindestkategorie (Tab. 4)', type: 'derived', expr: "lookup('TABLE4_USES', use_category, 'min_category_code')", display: 'badge', value_labels: CAT_LABELS },
        { key: 'din_19650_class', label: 'DIN 19650 Eignungsklasse (Nachweis)', type: 'text', visible_when: "use_category IN {'irrigation_lawn', 'irrigation_crops'}", placeholder: 'Klasse nach DIN 19650 Tab. 4 (externe Norm — nur Verweis)' },
        { key: 'drinking_water_option', label: 'Trinkwasser-Option vorhanden (Mietwohnung)', type: 'boolean', visible_when: "use_category == 'laundry_private'" },
        { key: 'remark', label: 'Bemerkung', type: 'text' },
      ],
      note: L649,
    },
    verification_quote: `${L446} — ${L503_507} — ${L649} — ${L470}`,
    create: { section_code: 'B', label_de: 'Nutzungsarten des Projekts (Tab. 4 → Mindestkategorie je Nutzung)', data_type: 'json', unit: null, clause_reference: '§6.2, §6.3, Tab. 4',
      description: 'Plan 3: Zeilen je Nutzungsart (prod use_category-Token) mit der Mindestkategorie aus TABLE4_USES; DIN-19650-Klasse nur als Verweis (Content-Boundary), Trinkwasser-Option nach BVerwG (L460); die Ableitung der Kategorie erfolgt aus den Verbraucher-Zeilen auf M277E-16 (M277E-16-D2).' },
  }),
  WS10({ symbol: 'turbidity_NTU', widget: 'scalar', ui_config: null, visible_when: C2, verification_quote: L495 }),
  WS10({ symbol: 'BOD5', widget: 'scalar', ui_config: null, visible_when: C2, verification_quote: L496 }),
  WS10({ symbol: 'total_coliforms_treated', widget: 'scalar', ui_config: null, visible_when: C2, verification_quote: L499 }),
  WS10({ symbol: 'e_coli', widget: 'scalar', ui_config: null, visible_when: C2, verification_quote: L500 }),
  WS10({ symbol: 'p_aeruginosa', widget: 'scalar', ui_config: null, visible_when: C2, verification_quote: L501 }),
  WS10({ symbol: 'sampling_location', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: C2, verification_quote: L502 }),

  // ---- M277E-12 (Wäsche & Reinigung): the rented-apartment rule (REQ-30 guards it; visibility added) ----
  WS12({ symbol: 'drinking_water_option_available', widget: 'attestation', ui_config: null, visible_when: "building_type == 'rented_apartment'", verification_quote: L460 }),

  // ---- M277E-16 (Brauchwasser-Bedarf Q_SW): the two Σ of Eq. (1) as registers + the highest-category rule ----
  WS16({
    symbol: 'verbraucher_sw', widget: 'register',
    ui_config: {
      title: 'Brauchwasser-Verbraucher (personenbezogen)', subtitle: '§9.2 Tab. 5 / Eq. (1) erste Summe — je Anwendung Personen P_i und Q_SW-P,i aus Tab. 5; Nutzung nach Tab. 4 für die Mindestkategorie', add_label: '+ Verbraucher', placement: 'section',
      columns: [
        { key: 'application', label: 'Anwendung (Tab. 5)', type: 'lookup_key', required: true, lookup: { table_code: 'TABLE5' } },
        { key: 'use_category', label: 'Nutzung (Tab. 4)', type: 'enum', required: true, options: [...USE_CATEGORY_TOKENS], option_labels: USE_CATEGORY_LABELS },
        { key: 'persons', label: 'P_i', type: 'number', required: true, min: 0, aria_label: 'Personen dieser Anwendung' },
        { key: 'q_sw_p', label: 'Q_SW-P,i (Tab. 5)', type: 'lookup_value', unit: 'l/(P·d)', lookup: { table_code: 'TABLE5', key_column: 'application', value: 'q_sw_p' } },
        { key: 'q_sw_p_override', label: 'abweichend', type: 'boolean' },
        { key: 'q_row', label: 'Q_SW,i', type: 'derived', expr: 'q_sw_p * persons', unit: 'l/d' },
        { key: 'min_cat', label: 'Mindestkategorie (Tab. 4)', type: 'derived', expr: "lookup('TABLE4_USES', use_category, 'min_category_code')", display: 'badge', value_labels: CAT_LABELS },
      ],
      override: { flag_key: 'q_sw_p_override', applies_to: ['q_sw_p'], policy: 'anhaltswert' },
      footer: ['Q_SW_rows', 'quality_category_code_rows'],
      note: L632,
    },
    verification_quote: `${L615} — ${L618} — ${L632}`,
    create: { section_code: 'B', label_de: 'Brauchwasser-Verbraucher personenbezogen (Tab. 5 → Σ Q_SW-P,i · P_i)', data_type: 'json', unit: null, clause_reference: '§9.2, Eq. (1), Tab. 5',
      description: 'Plan 3: Zeilen je Anwendung (Tab. 5 Q_SW-P,i mit Begründungspflicht bei Abweichung, P_i, Nutzung nach Tab. 4); Σ → Q_SW_rows (M277E-16-D1, zusammen mit bewaesserung_sw); höchste Mindestkategorie → quality_category_code_rows (M277E-16-D2); Ablösung von Eq. (1) STAGED (m277e-R-2).' },
  }),
  WS16({
    symbol: 'bewaesserung_sw', widget: 'register',
    ui_config: {
      title: 'Bewässerungsflächen (flächenbezogen)', subtitle: '§9.2 Eq. (1) zweite Summe — je Fläche A_j und Q_SW-A,j (l/m² je Saison ÷ Saisonlänge); Beispiel §9.2: 60 l/m², 180 d', add_label: '+ Fläche', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text' },
        { key: 'use_category', label: 'Nutzung (Tab. 4)', type: 'enum', required: true, options: ['irrigation_lawn', 'irrigation_crops'], option_labels: { irrigation_lawn: USE_CATEGORY_LABELS.irrigation_lawn, irrigation_crops: USE_CATEGORY_LABELS.irrigation_crops } },
        { key: 'area_m2', label: 'A_j', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'Bewässerungsfläche' },
        { key: 'q_sw_a', label: 'Q_SW-A,j je Saison', type: 'number', unit: 'l/m²', required: true, min: 0, aria_label: 'flächenspezifischer Bedarf je Saison' },
        { key: 'season_d', label: 'Saisonlänge', type: 'number', unit: 'd', required: true, min: 1, aria_label: 'Saisonlänge in Tagen' },
        { key: 'q_sw_a_ref', label: 'Beispiel §9.2 (l/m²)', type: 'derived', expr: "lookup('TABLE5_AREA', 'kitchen_garden', 'q_sw_a_l_m2')", display: 'badge', value_labels: { '60': 'Beispiel §9.2: 60 l/m² über 180 d' } },
        { key: 'q_row', label: 'Q_SW,j', type: 'derived', expr: 'q_sw_a * area_m2 / season_d', unit: 'l/d' },
        { key: 'min_cat', label: 'Mindestkategorie (Tab. 4)', type: 'derived', expr: "lookup('TABLE4_USES', use_category, 'min_category_code')", display: 'badge', value_labels: CAT_LABELS },
      ],
      footer: ['Q_SW_rows'],
      note: L655,
    },
    verification_quote: `${L618} — ${L655} — ${L658}`,
    create: { section_code: 'B', label_de: 'Bewässerungsflächen flächenbezogen (Eq. (1) → Σ Q_SW-A,j · A_j)', data_type: 'json', unit: null, clause_reference: '§9.2, Eq. (1); Example calculation Part 1',
      description: 'Plan 3: Zeilen je Bewässerungsfläche (A_j, Q_SW-A,j je Saison, Saisonlänge — der Bedarf je Tag ist Q_SW-A · A / Saison wie im Beispiel §9.2; 60 l/m² und 180 d sind Beispielwerte, m277e-J-3); Σ → Q_SW_rows (M277E-16-D1); jede Bewässerung ⇒ C2 (Tab. 4).' },
  }),
  WS16({ symbol: 'Q_SW_rows', widget: 'derived', ui_config: null, verification_quote: L618,
    create: { section_code: 'D', label_de: 'Σ Q_SW-P,i · P_i + Σ Q_SW-A,j · A_j über die Verbraucher-Zeilen (Eq. 1)', data_type: 'number', unit: 'l/d', clause_reference: '§9.2, Eq. (1)',
      description: 'Plan 3: Ausgabe der Gleichung M277E-16-D1 (sum_rows über verbraucher_sw und bewaesserung_sw); Ablösung von Eq. (1) / Q_SW STAGED (m277e-R-2).' } }),
  WS16({ symbol: 'quality_category_code_rows', widget: 'derived', ui_config: null, verification_quote: `${L649} — ${L663}`,
    create: { section_code: 'D', label_de: 'Erforderliche Qualitätskategorie aus den Nutzungen als Code (1 = C1 · 2 = C2 — die höchste Anforderung entscheidet)', data_type: 'number', unit: null, clause_reference: '§9.2; §6.3, Tab. 4',
      description: 'Plan 3: Ausgabe der Gleichung M277E-16-D2 (max_rows der Tab.-4-Mindestkategorie über verbraucher_sw; jede Bewässerungsfläche ⇒ 2); Übernahme in quality_category auf M277E-14 STAGED (m277e-D-2 / m277e-C-2).' } }),

  // ---- M277E-05 (MBO): the 50 m³ threshold as a code from the inherited storage capacity ----
  WS05({ symbol: 'mbo_authorisation_code', widget: 'derived', ui_config: null, verification_quote: L329,
    create: { section_code: 'D', label_de: 'MBO-Einordnung aus dem Speichervolumen als Code (0 = bis 50 m³ Anzeige genügt · 1 = über 50 m³ Genehmigung)', data_type: 'number', unit: null, clause_reference: '§4.2',
      description: 'Plan 3: Ausgabe der Gleichung M277E-05-D1 (if(storage_capacity_m3 > 50, 1, 0), 50 m³ gedruckt L329); die Ableitung der beiden manuellen MBO-Booleans ist STAGED (m277e-D-3).' } }),

  // ---- M277E-19 / -20 (Behandlungstechnologie): C2-only stages hidden under C1; the allow-list as a code ----
  WS19({ symbol: 'selected_hygienisation', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: C2, verification_quote: L508_509 }),
  WS19({ symbol: 'treatment_method_allowed', widget: 'derived', ui_config: null, verification_quote: `${L508_509} — ${L480}`,
    create: { section_code: 'D', label_de: 'Gewähltes Verfahren in der Tab.-4-Liste der Kategorie (1 = gelistet · 0 = nicht gelistet)', data_type: 'number', unit: null, clause_reference: '§6.3, Tab. 4',
      description: 'Plan 3: Ausgabe der Gleichung M277E-19-D1 (lookup TABLE4_PROCESSES nach quality_category und treatment_method); "Exemplary processes … not exhaustive" (L480) — Gate == 1 STAGED (m277e-G-2).' } }),
  WS20({ symbol: 'membrane_process_selected', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: C2, verification_quote: L508_509 }),
  WS20({ symbol: 'uv_disinfection_used', widget: 'attestation', ui_config: null, visible_when: C2, verification_quote: `${L508_509} — ${L517}` }),

  // ---- M277E-21 / -09 (Komponenten): storage rows, pump-station capacity only for pump-station inflow ----
  WS21({
    symbol: 'speicher_277', widget: 'register',
    ui_config: {
      title: 'Speicher', subtitle: '§7.1 — Speicherung vor und/oder nach der Behandlung; Puffervolumen entsprechend einer Tagesbehandlungskapazität', add_label: '+ Speicher', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text' },
        { key: 'role', label: 'Funktion', type: 'enum', required: true, options: ['pre', 'post', 'buffer'], option_labels: { pre: 'vor der Behandlung (Grauwasserspeicher)', post: 'nach der Behandlung (Brauchwasserspeicher)', buffer: 'Puffer' } },
        { key: 'volume_l', label: 'Volumen', type: 'number', unit: 'l', required: true, min: 0, aria_label: 'Speichervolumen' },
      ],
      footer: ['storage_capacity_calc_m3'],
      note: L574,
    },
    verification_quote: `${L574} — ${L329}`,
    create: { section_code: 'B', label_de: 'Speicher (vor / nach der Behandlung, Puffer) → Σ Speichervolumen', data_type: 'json', unit: null, clause_reference: '§7.1; §4.2',
      description: 'Plan 3: Zeilen je Speicher (Funktion, Volumen in l); Σ / 1000 → storage_capacity_calc_m3 (M277E-21-D1); Ablösung der Skalare pre_storage_volume_l / post_storage_volume_l und des manuellen storage_capacity_m3 (M277E-01) STAGED (m277e-R-5).' },
  }),
  WS21({ symbol: 'storage_capacity_calc_m3', widget: 'derived', ui_config: null, verification_quote: L329,
    create: { section_code: 'D', label_de: 'Σ Speichervolumen aus den Speicher-Zeilen (MBO-Schwelle 50 m³)', data_type: 'number', unit: 'm³', clause_reference: '§4.2; §7.1',
      description: 'Plan 3: Ausgabe der Gleichung M277E-21-D1 (sum_rows über speicher_277 / 1000, 1000 = l → m³); Übernahme als storage_capacity_m3 (M277E-01) STAGED (m277e-R-5).' } }),
  WS21({ symbol: 'pump_station_capacity', widget: 'scalar', ui_config: null, visible_when: "inflow_type == 'pump_station'", verification_quote: L826_827 }),
  WS09({ symbol: 'pump_station_capacity', widget: 'scalar', ui_config: null, visible_when: "inflow_type == 'pump_station'", verification_quote: L826_827 }),

  // ---- M277E-11 / -24 (WHG): the permit only when treated greywater is discharged ----
  WS11({ symbol: 'WHG_permit_present', widget: 'attestation', ui_config: null, visible_when: 'discharge_into_water_body == true', verification_quote: L333 }),
  WS24({ symbol: 'WHG_permit_present', widget: 'attestation', ui_config: null, visible_when: 'discharge_into_water_body == true', verification_quote: L333 }),

  // ---- M277E-24 (Konformität): Tab.-4 limits keyed on the inherited category, the treated-sample register, C2-only scalars ----
  limitFill('turbidity_limit', 'turbidity_max', 'Trübung — Grenzwert Tab. 4 (C2: < 2 NTU)', 'NTU', L495, true),
  limitFill('bod5_limit', 'bod5_max', 'BOD5 — Grenzwert Tab. 4 (C2: < 5 mg/l)', 'mg/l', L496, true),
  limitFill('o2_sat_min', 'o2_sat_min', 'O2-Sättigung — Mindestwert Tab. 4 (C1 und C2: > 50 %)', '%', L497, false),
  limitFill('ph_min_limit', 'ph_min', 'pH — untere Grenze Tab. 4 (C1 und C2: 6.5)', '-', L498, false),
  limitFill('ph_max_limit', 'ph_max', 'pH — obere Grenze Tab. 4 (C1 und C2: 9.5)', '-', L498, false),
  limitFill('total_coliforms_limit', 'total_coliforms_max', 'Gesamtcoliforme — Grenzwert Tab. 4 (C2: < 10,000 / 100 ml)', '1/100 ml', L499, true),
  limitFill('e_coli_limit', 'e_coli_max', 'E. coli — Grenzwert Tab. 4 (C2: < 1,000 / 100 ml)', '1/100 ml', L500, true),
  limitFill('p_aeruginosa_limit', 'p_aeruginosa_max', 'P. aeruginosa — Grenzwert Tab. 4 (C2: < 100 / 100 ml)', '1/100 ml', L501, true),
  WS24({
    symbol: 'ablaufproben_treated', widget: 'register',
    ui_config: {
      title: 'Ablaufproben (behandeltes Grauwasser)', subtitle: '§6.3 Tab. 4 — je Probe Ort (Speicher / Verbraucher) und Parameter; Vergleich mit den Tab.-4-Grenzwerten der Kategorie', add_label: '+ Probe', placement: 'section',
      columns: [
        { key: 'date', label: 'Datum', type: 'date', required: true },
        { key: 'location', label: 'Probenahme', type: 'enum', required: true, options: ['reservoir', 'consumer'], option_labels: { reservoir: 'Reservoir', consumer: 'Consumer' } },
        { key: 'turbidity_ntu', label: 'Trübung', type: 'number', unit: 'NTU', required: true, min: 0, visible_when: C2, aria_label: 'Trübung der Probe' },
        { key: 'bod5', label: 'BOD5', type: 'number', unit: 'mg/l', required: true, min: 0, visible_when: C2, aria_label: 'BOD5 der Probe' },
        { key: 'o2_sat_pct', label: 'O2-Sättigung', type: 'number', unit: '%', required: true, min: 0, aria_label: 'O2-Sättigung der Probe' },
        { key: 'ph', label: 'pH', type: 'number', unit: '-', required: true, min: 0, max: 14, aria_label: 'pH-Wert der Probe' },
        { key: 'total_coliforms', label: 'Gesamtcoliforme', type: 'number', unit: '1/100 ml', required: true, min: 0, visible_when: C2, aria_label: 'Gesamtcoliforme der Probe' },
        { key: 'e_coli', label: 'E. coli', type: 'number', unit: '1/100 ml', required: true, min: 0, visible_when: C2, aria_label: 'E. coli der Probe' },
        { key: 'p_aeruginosa', label: 'P. aeruginosa', type: 'number', unit: '1/100 ml', required: true, min: 0, visible_when: C2, aria_label: 'P. aeruginosa der Probe' },
        // pass columns: strict "<" / ">" as printed; C1 has no requirement for the C2-only parameters (→ 1); the limit symbols are read from the worksheet scope (G-13)
        { key: 'turbidity_ok', label: 'Trübung ok', type: 'derived', expr: "if(quality_category == 'C2', if(turbidity_ntu < turbidity_limit, 1, 0), 1)", display: 'badge', value_labels: { '1': 'ok', '0': 'überschritten' } },
        { key: 'bod5_ok', label: 'BOD5 ok', type: 'derived', expr: "if(quality_category == 'C2', if(bod5 < bod5_limit, 1, 0), 1)", display: 'badge', value_labels: { '1': 'ok', '0': 'überschritten' } },
        { key: 'o2_ok', label: 'O2 ok', type: 'derived', expr: 'if(o2_sat_pct > o2_sat_min, 1, 0)', display: 'badge', value_labels: { '1': 'ok', '0': 'unterschritten' } },
        { key: 'ph_ok', label: 'pH ok', type: 'derived', expr: 'if(ph >= ph_min_limit AND ph <= ph_max_limit, 1, 0)', display: 'badge', value_labels: { '1': 'ok', '0': 'außerhalb' } },
        { key: 'total_coliforms_ok', label: 'Gesamtcoliforme ok', type: 'derived', expr: "if(quality_category == 'C2', if(total_coliforms < total_coliforms_limit, 1, 0), 1)", display: 'badge', value_labels: { '1': 'ok', '0': 'überschritten' } },
        { key: 'e_coli_ok', label: 'E. coli ok', type: 'derived', expr: "if(quality_category == 'C2', if(e_coli < e_coli_limit, 1, 0), 1)", display: 'badge', value_labels: { '1': 'ok', '0': 'überschritten' } },
        { key: 'p_aeruginosa_ok', label: 'P. aeruginosa ok', type: 'derived', expr: "if(quality_category == 'C2', if(p_aeruginosa < p_aeruginosa_limit, 1, 0), 1)", display: 'badge', value_labels: { '1': 'ok', '0': 'überschritten' } },
        { key: 'sample_ok', label: 'Probe', type: 'derived', expr: 'if(turbidity_ok == 1 AND bod5_ok == 1 AND o2_ok == 1 AND ph_ok == 1 AND total_coliforms_ok == 1 AND e_coli_ok == 1 AND p_aeruginosa_ok == 1, 1, 0)', display: 'badge', value_labels: { '1': 'alle Anforderungen erfüllt', '0': 'Anforderung verletzt' } },
      ],
      footer: ['treated_samples_count', 'treated_samples_fail'],
      note: L502,
    },
    verification_quote: `${L446} — ${L495} ${L496} ${L497} ${L498} ${L499} ${L500} ${L501} ${L502}`,
    create: { section_code: 'B', label_de: 'Ablaufproben des behandelten Grauwassers (Tab. 4 je Kategorie)', data_type: 'json', unit: null, clause_reference: '§6.3, Tab. 4',
      description: 'Plan 3: Zeilen je Probe (Datum, Probenahmeort, Trübung, BOD5, O2, pH, Gesamtcoliforme, E. coli, P. aeruginosa — die C2-Parameter sind unter C1 ausgeblendet); je Zeile Vergleich mit den Tab.-4-Grenzwerten (turbidity_limit …); Anzahl Proben → treated_samples_count (M277E-24-D2), Anzahl Proben mit Verletzung → treated_samples_fail (M277E-24-D1); Gate == 0 STAGED (m277e-G-6).' },
  }),
  WS24({ symbol: 'treated_samples_count', widget: 'derived', ui_config: null, verification_quote: L502,
    create: { section_code: 'D', label_de: 'Anzahl vollständiger Ablaufproben', data_type: 'number', unit: null, clause_reference: '§6.3, Tab. 4', description: 'Plan 3: Ausgabe der Gleichung M277E-24-D2 (count_rows über ablaufproben_treated).' } }),
  WS24({ symbol: 'treated_samples_fail', widget: 'derived', ui_config: null, verification_quote: `${L495} ${L496} ${L497} ${L498} ${L499} ${L500} ${L501}`,
    create: { section_code: 'D', label_de: 'Anzahl Ablaufproben mit mindestens einer verletzten Tab.-4-Anforderung', data_type: 'number', unit: null, clause_reference: '§6.3, Tab. 4', description: 'Plan 3: Ausgabe der Gleichung M277E-24-D1 (count_rows über ablaufproben_treated mit einer 0 in den Prüfspalten); Gate == 0 STAGED (m277e-G-6).' } }),
  WS24({ symbol: 'turbidity_NTU', widget: 'scalar', ui_config: null, visible_when: C2, verification_quote: L495 }),
  WS24({ symbol: 'total_coliforms_treated', widget: 'scalar', ui_config: null, visible_when: C2, verification_quote: L499 }),
  WS24({ symbol: 'e_coli', widget: 'scalar', ui_config: null, visible_when: C2, verification_quote: L500 }),
  WS24({ symbol: 'p_aeruginosa', widget: 'scalar', ui_config: null, visible_when: C2, verification_quote: L501 }),

  // ---- M277E-18 (Kapazität & Wasserbilanz): balance periods behind the annual volumes ----
  WS18({
    symbol: 'bilanzperioden', widget: 'register',
    ui_config: {
      title: 'Bilanzperioden', subtitle: '§9.4 — je Periode (z. B. Grundperiode / Bewässerungssaison) Tage, Q_GW und Q_SW; Q_WB = Q_GW − Q_SW, Q_GWT = min(Q_GW, Q_SW)', add_label: '+ Periode', placement: 'section',
      columns: [
        { key: 'label', label: 'Periode', type: 'text', required: true },
        { key: 'days', label: 'Tage', type: 'number', unit: 'd', required: true, min: 0, aria_label: 'Tage der Periode' },
        { key: 'q_gw', label: 'Q_GW', type: 'number', unit: 'l/d', required: true, min: 0, aria_label: 'Grauwasseranfall der Periode' },
        { key: 'q_sw', label: 'Q_SW', type: 'number', unit: 'l/d', required: true, min: 0, aria_label: 'Brauchwasserbedarf der Periode' },
        { key: 'q_wb', label: 'Q_WB', type: 'derived', expr: 'q_gw - q_sw', unit: 'l/d' },
        { key: 'q_gwt', label: 'Q_GWT', type: 'derived', expr: 'min(q_gw, q_sw)', unit: 'l/d' },
        { key: 'balance', label: 'Bilanz', type: 'derived', expr: 'if(q_wb > 0, 1, if(q_wb < 0, -1, 0))', display: 'badge', value_labels: { '1': 'Überschuss (Q_WB > 0)', '-1': 'Defizit (Q_WB < 0)', '0': 'ausgeglichen' } },
      ],
      footer: ['V_GW_annual', 'V_SW_annual', 'V_treated_annual', 'V_surplus_annual', 'V_topup_annual'],
      note: L755,
    },
    verification_quote: `${L737} — ${L747} — ${L751} — ${L755}`,
    create: { section_code: 'B', label_de: 'Bilanzperioden (Tage × Q_GW / Q_SW → Jahresvolumina)', data_type: 'json', unit: null, clause_reference: '§9.4',
      description: 'Plan 3: Zeilen je Bilanzperiode (Tage, Q_GW, Q_SW; Q_WB und Q_GWT je Zeile); Σ über die Perioden → V_GW_annual, V_SW_annual, V_treated_annual, V_surplus_annual, V_topup_annual (M277E-18-D1…D5, Text-Ableitungen m277e-F-2); ersetzt Q_WB_base / Q_WB_irrig (m277e-X-2); drinking_water_savings_rate bleibt manuell (m277e-F-1).' },
  }),
];

/** No section rules for this standard: every worksheet's B/D section holds a produced symbol or a driver that is not consumed there. */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
