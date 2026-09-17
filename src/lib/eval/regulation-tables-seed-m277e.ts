/**
 * DWA-M-277E regulation-table seed builders (Plan 3 Task 4, 2026-09-17).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).md`
 * (English edition, 1108 lines, LaTeX tables; the line is in the comment next
 * to each span; the spans were lifted mechanically by line range, never
 * retyped). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts m277e "<transcript>"`.
 * Emitted as `20260917100400_regulation_tables_seed_m277e.sql` (no earlier
 * DWA-M-277E table seed exists — nothing superseded; the Plan-1 selection
 * config `20260911120000_selection_configs_DWA_M_277E.sql` touches `fields`,
 * not `regulation_tables`).
 *
 * Edition: the title page prints "October 2017" (L9, L24) → `'2017-10'`;
 * prod `standards.version` reads "October 2017" (read-only query in-session).
 *
 * Key tokens (G-A3): `greywater_type` = prod `M277E-06.greywater_type` enum
 * values (A1 A2 B1 B2), `quality_category` = prod `M277E-14.quality_category`
 * (C1 C2), `use_category` = prod `M277E-10.use_category`, `treatment_method` =
 * prod `M277E-19.treatment_method` (captured m277e.prior.json, 2026-09-17).
 * TABLE2's `source` tokens are the suffixes of the prod `Q_GW_P_<source>`
 * scalars (shower … dishwasher) — the Plan-1 `source_set` select_many carries
 * German label tokens ("Dusche" …) for a DIFFERENT field and is left as is
 * (D-1; retirement m277e-X-1). TABLE5's `application` tokens and
 * TABLE1_SIEVERS's `statistic` tokens drive CREATED columns/selects only.
 *
 * Transposed tables (parameters printed as rows, the key as columns — Tab. 1
 * Sievers column, Tab. 2, Tab. 3, Tab. 4 parameter block) quote the whole
 * printed body as the quote of every key row (the A138 TAB14 precedent);
 * row-shaped tables (Tab. 4 use rows, Tab. 5) quote their own printed line.
 *
 * Verification status: `md_verified` where every seeded row is lifted and
 * every cell is legible. TABLE4_USES stays `imported_unverified`: its printed
 * row-group header cell is an image (L503, m277e-U-1) — the five use rows
 * themselves are legible and encoded as printed.
 */
import type { RegulationTable, RegulationRow, ValueColumn } from './regulation-tables';

const STD = 'DWA-M-277E';
export const M277E_EDITION = '2017-10';
const ED = M277E_EDITION;

// ---------------------------------------------------------------------------
// Verbatim spans (transcript line ranges in the doc comments).
// ---------------------------------------------------------------------------
/** L360–L372 (Tab. 1 body — the Sievers et al. 2014 cells are the last two columns) */
const Q_T1_BODY = String.raw`\hline Water volume & l/(P•d) & \multicolumn{2}{|c|}{75} & \multicolumn{3}{|c|}{75} & 68 & 80 \\
\hline & & from & to & from & to & median & mean & 85percentile \\
\hline \multirow{2}{*}{TS} & mg/l & - & - & - & - & - & 103 & 137.5 \\
\hline & g/(P•d) & - & - & - & - & - & 7 & 11 \\
\hline TOS (organic) & g/(P•d) & - & - & 28 & 45 & 44 & & \\
\hline \multirow{2}{*}{COD} & mg/l & 400 & 700 & 93 & 1,360 & 627 & 838 & 1,038 \\
\hline & g/(P.d) & 30 & 53 & 7 & 102 & 47 & 57 & 83 \\
\hline \multirow{2}{*}{$\mathrm{BOD}_{5}$} & mg/l & - & - & 13 & 413 & 240 & 456 & 650 \\
\hline & g/(P•d) & - & - & 1 & 31 & 18 & 31 & 42 \\
\hline \multirow{2}{*}{TN} & mg/l & 10 & 17 & 1 & 23 & 13.3 & 15 & 17.5 \\
\hline & g/(P.d) & 0.8 & 1.3 & 0.1 & 1.7 & 1 & 1 & 1.4 \\
\hline \multirow{2}{*}{TP} & mg/l & 3 & 8 & 1 & 29 & 6.7 & 6 & 6.5 \\
\hline & g/(P.d) & 0.2 & 0.6 & 0.1 & 2.2 & 0.5 & 0.4 & 0.5 \\`;
/** L353 (last sentence) */
const Q_L353_SIEVERS = 'In the present document, data from Sievers et al. (2014) are recommended as design values.';
/** L383 (last sentence) */
const Q_L383_TYPES = 'Therefore, within the scope of this document a distinction is made between two types of greywater (Table 2):';
/** L386 / L387 / L390 / L391 (§5 type definitions) */
const Q_L386 = '- Type A1: greywater from bathtubs and showers';
const Q_L387 = '- Type A2: greywater from bathtubs, showers and hand washbasins';
const Q_L390 = '- Type B1: greywater from bathtubs, showers, hand washbasins and washing machines';
const Q_L391 = '- Type B2: greywater from bathtubs, showers, hand washbasins, washing machines and/or kitchen.';
/** L393 */
const Q_L393 = 'The considered sources of origin are listed in Table 2. The load values listed below serve as orientation values.';
/** L609 (fragment) */
const Q_L609_FRAG = 'it is recommended to draw up a profound water balance (determination of demand and supply not only based on data from the literature) depending on the building under consideration as a significant design value.';
/** L406–L414 (Tab. 2 body, Water volume … Hydraulic loading) */
const Q_T2_BODY = String.raw`\hline Water volume (l/P•d) & 10-50 & 0-30 ( $200 \mathrm{l} /$ week ) & 10-15 & 10-15 & 5-10 & 5-10 \\
\hline Organic load & \multicolumn{3}{|c|}{very low} & moderate & moderate high & moderate high \\
\hline \multirow{2}{*}{COD} & \multicolumn{3}{|c|}{80-200} & 500-800 & \multicolumn{2}{|c|}{400-800} \\
\hline Load (g/d) & \multicolumn{3}{|c|}{0.8-10} & 5-12 & \multicolumn{2}{|c|}{2-8} \\
\hline SS (mg/l) & \multicolumn{3}{|c|}{7-120} & 80-280 & \multicolumn{2}{|c|}{130-1,300} \\
\hline pH-Value (-) & \multicolumn{3}{|c|}{5-8.6} & 9.3-10 & \multicolumn{2}{|c|}{6.3-7.4} \\
\hline Nutrient load & \multicolumn{2}{|c|}{very low - low (moderate)} & very low & moderate & high & very high \\
\hline Microbial load & \multicolumn{2}{|c|}{very low - low (moderate)} & very low & very high & high & high very high \\
\hline Hydraulic loading (l/min) & 6-25 & 20-50 & 3-15 & 20-30 & 10-20 & 10-30 \\`;
/** L416 / L417 / L418 / L419 (Tab. 2 "Greywater type" rows; L416 prints a stray ")" after "P·d", L418 a doubled "))" — as printed) */
const Q_T2_A1 = String.raw`\hline \multirow{4}{*}{Greywater type} & \multicolumn{2}{|c|}{A1: $20 \mathrm{l} / \mathrm{P} \cdot \mathrm{d}$ ) - $85 \mathrm{l} /(\mathrm{P} \cdot \mathrm{d})$} & \multicolumn{4}{|c|}{} \\`;
const Q_T2_A2 = String.raw`\hline & \multicolumn{3}{|l|}{A2: $40 \mathrm{l} /(\mathrm{P} \cdot \mathrm{d})-100 \mathrm{l} /(\mathrm{P} \cdot \mathrm{d})$} & \multicolumn{3}{|c|}{} \\`;
const Q_T2_B1 = String.raw`\hline & \multicolumn{4}{|l|}{B1: $50 \mathrm{l} /(\mathrm{P} \cdot \mathrm{d})-115 \mathrm{l} /(\mathrm{P} \cdot \mathrm{d}))$} & \multicolumn{2}{|c|}{} \\`;
const Q_T2_B2 = String.raw`\hline & \multicolumn{6}{|l|}{B2: $60 \mathrm{l} /(\mathrm{P} \cdot \mathrm{d})-130 \mathrm{l} /(\mathrm{P} \cdot \mathrm{d})$} \\`;
/** L426 (fragment) */
const Q_L426_FRAG = 'In Table 3 as well as in Annex B, the wide range of the microbial loads is clearly evidenced. Maximum values result from the analysis of random samples, which could be high in the separated greywater flows.';
/** L434–L435 (Tab. 3 body) */
const Q_T3_BODY = String.raw`\hline Total coliforms ( $1 / \mathrm{ml}$ ) & $10^{1}-10^{5}$ & $10^{2}-10^{6}$ & $10^{5}-10^{8}$ \\
\hline Faecal coliforms ( $1 / \mathrm{ml}$ ) & $10^{1}-10^{5}$ & $10^{2}-10^{6}$ & $10^{2}-10^{6}$ \\`;
/** L446 (fragment) */
const Q_L446_FRAG = 'Quality requirements for service water should be orientated towards the specific intended use.';
/** L476 / L478 */
const Q_L476 = 'I C1: mechanical, biological treatment and stabilization of greywater of the Type A Characterisation: storage and aeration for reuse as toilet flush water in private sector';
const Q_L478 = 'I C2: mechanical, biological treatment and hygienisation of greywater of the Type A and Type B Characterisation: storage and treatment for reuse in private and public sectors.';
/** L480 (fragment) */
const Q_L480_FRAG = 'This compilation is not exhaustive with regard to technology and allocation of particular uses to the single technologies.';
/** L482 (fragment) */
const Q_L482_FRAG = 'It should be appropriately equipped and dimensioned according to the type of use (see also Table 4).';
/** L488–L502 (Tab. 4 head + parameter block) */
const Q_T4_LIMITS = String.raw`\hline \multicolumn{2}{|l|}{Criteria} & \multicolumn{2}{|l|}{Quality requirements for treated greywater} \\
\hline \multicolumn{2}{|l|}{Use category} & C1 & C2 \\
\hline \multicolumn{2}{|l|}{Treatment method} & Treatment/Stabilisation & Treatment and hygienisation \\
\hline \multicolumn{2}{|l|}{Greywater} & Type A & \begin{tabular}{l}
Type A \\
Type B
\end{tabular} \\
\hline \multirow{4}{*}{Biochemical/chemicalphysical parameters} & Turbidity & - & < 2 NTU \\
\hline & $\mathrm{BOD}_{5}$ & - & $<5 \mathrm{mg} / \mathrm{l}$ \\
\hline & O2 Saturation & > 50 \% & > 50 \% \\
\hline & pH & 6.5-9.5 & 6.5-9.5 \\
\hline \multirow{4}{*}{Hygienic parameters} & Total coliforms & \multirow[t]{3}{*}{No requirement} & $<10,000 / 100 \mathrm{ml}$ \\
\hline & E. coli & & $<1,000 / 100 \mathrm{ml}$ \\
\hline & P. aeroginosa & & $<100 / 100 \mathrm{ml}$ \\
\hline & sampling & - & Reservoir/Consumer \\`;
/** L503 (fragment — the row-group header cell before it is an image, m277e-U-1) / L504 / L505 / L506 / L507 */
const Q_T4_USE_TOILET_PRIVATE = String.raw`Toilet flushing (private) & + & + \\`;
const Q_T4_USE_IRR_LAWN = String.raw`\hline & Irrigation (private) lawn, ornamental plants & - & + \\`;
const Q_T4_USE_IRR_CROPS = String.raw`\hline & Irrigation crop plants (for consumption) & - & + \\`;
const Q_T4_USE_LAUNDRY = String.raw`\hline & Laundry (private)* & - & + \\`;
const Q_T4_USE_TOILET_PUBLIC = String.raw`\hline & Toilet flushing (public) & - & + \\`;
/** L508–L509 (Tab. 4 "Exemplary processes" row) */
const Q_T4_PROCESSES = String.raw`\hline \multirow{2}{*}{} & & \multirow[b]{2}{*}{FB, SF, FLB, Stabilisation} & FB, SF, FLB, MBR \\
\hline & Exemplary processes and other treatment stages & & + UV, UF, RO \\`;
/** L517 */
const Q_L517 = String.raw`*UV Transmission > 60 \% is recommended.`;
/** L632 (last sentence) */
const Q_L632_FRAG = 'The following Table 5 provides assistance in determining the service water demand.';
/** L639–L644 (Tab. 5 rows) */
const Q_T5_TOILETS = String.raw`\hline Toilets & 33 \\`;
const Q_T5_HYGIENE = String.raw`\hline Personal hygiene & 44 \\`;
const Q_T5_WASHING = String.raw`\hline Washing machine & 15 \\`;
const Q_T5_CLEANING = String.raw`\hline Cleaning/Irrigation & 7 \\`;
const Q_T5_COOKING = String.raw`\hline Cooking/Drinking & 5 \\`;
const Q_T5_KITCHEN = String.raw`\hline Kitchen/Dishwasher & 7 \\`;
/** L655 */
const Q_L655 = String.raw`I Service water consumers: toilets, irrigation of kitchen garden ( $150 \mathrm{~m}^{2}$, season with 180 days)`;
/** L658 (worked example, Q_SW) */
const Q_EX_QSW = String.raw`& Q_{S W}=25 \mathrm{P} \cdot 33 \mathrm{l} /(\mathrm{P} \cdot \mathrm{~d}) \text { toilet }+60 \mathrm{l} / \mathrm{m}^{2} \cdot 150 \mathrm{~m}^{2} / 180 \mathrm{~d} \text { kitchen garden } \\`;

// ---------------------------------------------------------------------------
// TABLE2 — §5 Tab. 2 (L399–L422): one row per source of origin. Keys = the prod `Q_GW_P_<source>` suffixes.
// Cells spanning several source columns (`\multicolumn{3}` over Shower/Bathtub/Hand washbasin, `\multicolumn{2}`
// over Kitchen sink/Dish washer) are repeated per source with the same body quote. Ranges "a-b" → (min, max);
// "130-1,300" → 130 / 1300. Policy `anhaltswert`: L393 "serve as orientation values" — L609 (water balance not
// only from literature). The per-source Q_GW-P,i the engineer picks inside the printed range is SR-2 (m277e-J-1).
// The Nutrient / Microbial load rows (L412/L413) are qualitative text and are not seeded (report residue).
// ---------------------------------------------------------------------------
export const GREYWATER_SOURCE_TOKENS = ['shower', 'bathtub', 'hand_washbasin', 'washing_machine', 'kitchen_sink', 'dishwasher'] as const;
export type GreywaterSource = (typeof GREYWATER_SOURCE_TOKENS)[number];

type T2Row = { source: GreywaterSource; label: string; q: [number, number]; organic: string; cod: [number, number]; load: [number, number]; ss: [number, number]; ph: [number, number]; hyd: [number, number]; note: string | null };
const T2_ROWS: T2Row[] = [
  { source: 'shower',          label: 'Shower',          q: [10, 50], organic: 'very low',      cod: [80, 200],  load: [0.8, 10], ss: [7, 120],    ph: [5, 8.6],   hyd: [6, 25],  note: null },
  { source: 'bathtub',         label: 'Bathtub',         q: [0, 30],  organic: 'very low',      cod: [80, 200],  load: [0.8, 10], ss: [7, 120],    ph: [5, 8.6],   hyd: [20, 50], note: '200 l/week' }, // L406 "0-30 ( $200 \mathrm{l} /$ week )"
  { source: 'hand_washbasin',  label: 'Hand washbasin',  q: [10, 15], organic: 'very low',      cod: [80, 200],  load: [0.8, 10], ss: [7, 120],    ph: [5, 8.6],   hyd: [3, 15],  note: null },
  { source: 'washing_machine', label: 'Washing machine', q: [10, 15], organic: 'moderate',      cod: [500, 800], load: [5, 12],   ss: [80, 280],   ph: [9.3, 10],  hyd: [20, 30], note: null },
  { source: 'kitchen_sink',    label: 'Kitchen sink',    q: [5, 10],  organic: 'moderate high', cod: [400, 800], load: [2, 8],    ss: [130, 1300], ph: [6.3, 7.4], hyd: [10, 20], note: null },
  { source: 'dishwasher',      label: 'Dish washer',     q: [5, 10],  organic: 'moderate high', cod: [400, 800], load: [2, 8],    ss: [130, 1300], ph: [6.3, 7.4], hyd: [10, 30], note: null },
];

export function table2AsTable(): RegulationTable {
  const rows: RegulationRow[] = T2_ROWS.map((r, i) => ({
    row_key: r.source, keys: { source: r.source }, group_label: null, label_de: r.label, order_index: i,
    values: {
      q_gw_p_min: r.q[0], q_gw_p_max: r.q[1], organic_load: r.organic, cod_min: r.cod[0], cod_max: r.cod[1], load_min: r.load[0], load_max: r.load[1],
      ss_min: r.ss[0], ss_max: r.ss[1], ph_min: r.ph[0], ph_max: r.ph[1], hydraulic_min: r.hyd[0], hydraulic_max: r.hyd[1], note: r.note,
    },
    verbatim_quote: Q_T2_BODY,
  }));
  const value_columns: ValueColumn[] = [
    { name: 'q_gw_p_min', type: 'number', unit: 'l/(P·d)' }, { name: 'q_gw_p_max', type: 'number', unit: 'l/(P·d)' },
    { name: 'organic_load', type: 'string' },
    { name: 'cod_min', type: 'number', unit: 'mg/l' }, { name: 'cod_max', type: 'number', unit: 'mg/l' },
    { name: 'load_min', type: 'number', unit: 'g/d' }, { name: 'load_max', type: 'number', unit: 'g/d' },
    { name: 'ss_min', type: 'number', unit: 'mg/l' }, { name: 'ss_max', type: 'number', unit: 'mg/l' },
    { name: 'ph_min', type: 'number', unit: '-' }, { name: 'ph_max', type: 'number', unit: '-' },
    { name: 'hydraulic_min', type: 'number', unit: 'l/min' }, { name: 'hydraulic_max', type: 'number', unit: 'l/min' },
    { name: 'note', type: 'string' },
  ];
  return { standard_code: STD, edition: ED, table_code: 'TABLE2', title_de: 'Qualität der Grauwasserteilströme je Herkunftsbereich (Tab. 2)', clause_reference: '§5, Tab. 2', page_ref: null,
    key_columns: ['source'], value_columns,
    override_policy: 'anhaltswert', override_quote: `${Q_L393} — ${Q_L609_FRAG}`, // L393 — L609
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// TABLE2_TYPE — the four greywater types: total range from the Tab. 2 "Greywater type" rows (L416–L419), the
// membership flags and the printed definition from §5 (L386/L387/L390/L391). Keys = prod `greywater_type` tokens.
// `type_code` 1–4 is the value the M277E-06-D1 equation outputs (G-6: equations output numbers; the label lives
// here). B2 prints "washing machines and/or kitchen" — its washing-machine flag follows the sentence (m277e-J-4).
// Policy `locked` (definitions): L383 "a distinction is made between two types of greywater (Table 2)".
// ---------------------------------------------------------------------------
export const GREYWATER_TYPE_TOKENS = ['A1', 'A2', 'B1', 'B2'] as const;

export function table2TypeAsTable(): RegulationTable {
  type R = { type: string; code: number; range: [number, number]; flags: [boolean, boolean, boolean, boolean]; definition: string; quote: string };
  const R: R[] = [
    { type: 'A1', code: 1, range: [20, 85],  flags: [true, false, false, false], definition: Q_L386, quote: Q_T2_A1 },
    { type: 'A2', code: 2, range: [40, 100], flags: [true, true, false, false],  definition: Q_L387, quote: Q_T2_A2 },
    { type: 'B1', code: 3, range: [50, 115], flags: [true, true, true, false],   definition: Q_L390, quote: Q_T2_B1 },
    { type: 'B2', code: 4, range: [60, 130], flags: [true, true, true, true],    definition: Q_L391, quote: Q_T2_B2 },
  ];
  const rows: RegulationRow[] = R.map((r, i) => ({
    row_key: r.type, keys: { greywater_type: r.type }, group_label: null, label_de: r.definition.replace(/^- /, ''), order_index: i,
    values: { type_code: r.code, q_gw_total_min: r.range[0], q_gw_total_max: r.range[1], includes_shower_bath: r.flags[0], includes_basin: r.flags[1], includes_washing_machine: r.flags[2], includes_kitchen: r.flags[3], definition: r.definition },
    verbatim_quote: r.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TABLE2_TYPE', title_de: 'Grauwassertypen A1/A2/B1/B2 — Gesamtanfall und Herkunftsbereiche (§5, Tab. 2)', clause_reference: '§5, Tab. 2', page_ref: null,
    key_columns: ['greywater_type'],
    value_columns: [
      { name: 'type_code', type: 'number' }, { name: 'q_gw_total_min', type: 'number', unit: 'l/(P·d)' }, { name: 'q_gw_total_max', type: 'number', unit: 'l/(P·d)' },
      { name: 'includes_shower_bath', type: 'boolean' }, { name: 'includes_basin', type: 'boolean' }, { name: 'includes_washing_machine', type: 'boolean' }, { name: 'includes_kitchen', type: 'boolean' },
      { name: 'definition', type: 'string' },
    ],
    override_policy: 'locked', override_quote: Q_L383_TYPES, // L383
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// TABLE3 — §5 Tab. 3 (L428–L438): microbial load of untreated greywater per type. The printed columns are
// "Greywater Type A" / "Type B1" / "Type B2"; keyed by the prod `greywater_type` tokens so A1 and A2 both read the
// Type-A column (G-A3 — the brief's a/b1/b2 group key would need a mapping the driver does not have). Exponent
// ranges are stored as numbers (10^1 = 10 …) AND as the printed exponent string. Policy `anhaltswert` (L426).
// ---------------------------------------------------------------------------
export function table3AsTable(): RegulationTable {
  type R = { type: string; total: [number, number, string]; faecal: [number, number, string]; label: string };
  const R: R[] = [
    { type: 'A1', label: 'Greywater Type A (A1)', total: [10, 100000, '10^1-10^5'], faecal: [10, 100000, '10^1-10^5'] },
    { type: 'A2', label: 'Greywater Type A (A2)', total: [10, 100000, '10^1-10^5'], faecal: [10, 100000, '10^1-10^5'] },
    { type: 'B1', label: 'Greywater Type B1',     total: [100, 1000000, '10^2-10^6'], faecal: [100, 1000000, '10^2-10^6'] },
    { type: 'B2', label: 'Greywater Type B2',     total: [100000, 100000000, '10^5-10^8'], faecal: [100, 1000000, '10^2-10^6'] },
  ];
  const rows: RegulationRow[] = R.map((r, i) => ({
    row_key: r.type, keys: { greywater_type: r.type }, group_label: null, label_de: r.label, order_index: i,
    values: { total_coliforms_min: r.total[0], total_coliforms_max: r.total[1], total_coliforms_range: r.total[2], faecal_coliforms_min: r.faecal[0], faecal_coliforms_max: r.faecal[1], faecal_coliforms_range: r.faecal[2] },
    verbatim_quote: Q_T3_BODY,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TABLE3', title_de: 'Mikrobiologische Belastung von unbehandeltem Grauwasser je Typ (Tab. 3)', clause_reference: '§5, Tab. 3', page_ref: null,
    key_columns: ['greywater_type'],
    value_columns: [
      { name: 'total_coliforms_min', type: 'number', unit: '1/ml' }, { name: 'total_coliforms_max', type: 'number', unit: '1/ml' }, { name: 'total_coliforms_range', type: 'string', unit: '1/ml' },
      { name: 'faecal_coliforms_min', type: 'number', unit: '1/ml' }, { name: 'faecal_coliforms_max', type: 'number', unit: '1/ml' }, { name: 'faecal_coliforms_range', type: 'string', unit: '1/ml' },
    ],
    override_policy: 'anhaltswert', override_quote: Q_L426_FRAG, // L426
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// TABLE1_SIEVERS — §5 Tab. 1 (L355–L381), the "Sievers et al. 2014" columns only (L353: "recommended as design
// values"). Keyed by the printed statistic (L361 "mean" / "85percentile"); one value column per printed cell.
// TOS prints no Sievers cell (L364 "& &") — not a column; Potassium / Sulphur likewise. The fbr 2005 / DWA 2008
// columns are m277e-J-2 (optional second table). "1,038" → 1038. Policy `anhaltswert` (L353).
// ---------------------------------------------------------------------------
export const SIEVERS_STATISTIC_TOKENS = ['mean', 'p85'] as const;

export function table1SieversAsTable(): RegulationTable {
  const cols = ['water_volume_l_pd', 'ts_mg_l', 'ts_g_pd', 'cod_mg_l', 'cod_g_pd', 'bod5_mg_l', 'bod5_g_pd', 'tn_mg_l', 'tn_g_pd', 'tp_mg_l', 'tp_g_pd'] as const;
  const units: Record<(typeof cols)[number], string> = { water_volume_l_pd: 'l/(P·d)', ts_mg_l: 'mg/l', ts_g_pd: 'g/(P·d)', cod_mg_l: 'mg/l', cod_g_pd: 'g/(P·d)', bod5_mg_l: 'mg/l', bod5_g_pd: 'g/(P·d)', tn_mg_l: 'mg/l', tn_g_pd: 'g/(P·d)', tp_mg_l: 'mg/l', tp_g_pd: 'g/(P·d)' };
  const mean = [68, 103, 7, 838, 57, 456, 31, 15, 1, 6, 0.4];      // L360, L362/L363, L365/L366, L367/L368, L369/L370, L371/L372 (column "mean")
  const p85 = [80, 137.5, 11, 1038, 83, 650, 42, 17.5, 1.4, 6.5, 0.5]; // same lines, column "85percentile"
  const mk = (token: string, label: string, vals: number[], i: number): RegulationRow => ({
    row_key: token, keys: { statistic: token }, group_label: null, label_de: label, order_index: i,
    values: Object.fromEntries(cols.map((c, k) => [c, vals[k]])), verbatim_quote: Q_T1_BODY,
  });
  return { standard_code: STD, edition: ED, table_code: 'TABLE1_SIEVERS', title_de: 'Grauwasserqualität — Bemessungswerte nach Sievers et al. 2014 (Tab. 1)', clause_reference: '§5, Tab. 1', page_ref: null,
    key_columns: ['statistic'],
    value_columns: cols.map((c) => ({ name: c, type: 'number' as const, unit: units[c] })),
    override_policy: 'anhaltswert', override_quote: Q_L353_SIEVERS, // L353
    verification_status: 'md_verified', rows: [mk('mean', 'mean', mean, 0), mk('p85', '85percentile', p85, 1)] };
}

// ---------------------------------------------------------------------------
// TABLE4_LIMITS — §6.3 Tab. 4 (L484–L521), the parameter block as ONE row per quality category (prod tokens C1 /
// C2). "-" and "No requirement" → null (no limit); comparators are the printed ones: turbidity "< 2 NTU", BOD5
// "<5 mg/l", O2 "> 50 %", pH "6.5-9.5" (range → ph_min / ph_max), hygienic parameters "<10,000 / 100 ml" etc.
// (strict "<", as prod REQ-08/-09/-14/-14E/-15 already compare). Policy `locked` (requirements): L446 — L482.
// A single-key table so `lookup_fill` fields can bind each limit by value column (G-12 needs no key literal).
// ---------------------------------------------------------------------------
export const QUALITY_CATEGORY_TOKENS = ['C1', 'C2'] as const;

export function table4LimitsAsTable(): RegulationTable {
  const rows: RegulationRow[] = [
    { row_key: 'C1', keys: { quality_category: 'C1' }, group_label: null, label_de: 'C1 — Treatment/Stabilisation (Type A)', order_index: 0,
      values: { treatment_method: 'Treatment/Stabilisation', turbidity_max: null, bod5_max: null, o2_sat_min: 50, ph_min: 6.5, ph_max: 9.5, total_coliforms_max: null, e_coli_max: null, p_aeruginosa_max: null, sampling: '-' },
      verbatim_quote: Q_T4_LIMITS },
    { row_key: 'C2', keys: { quality_category: 'C2' }, group_label: null, label_de: 'C2 — Treatment and hygienisation (Type A, Type B)', order_index: 1,
      values: { treatment_method: 'Treatment and hygienisation', turbidity_max: 2, bod5_max: 5, o2_sat_min: 50, ph_min: 6.5, ph_max: 9.5, total_coliforms_max: 10000, e_coli_max: 1000, p_aeruginosa_max: 100, sampling: 'Reservoir/Consumer' },
      verbatim_quote: Q_T4_LIMITS },
  ];
  return { standard_code: STD, edition: ED, table_code: 'TABLE4_LIMITS', title_de: 'Qualitätsanforderungen an behandeltes Grauwasser je Kategorie C1/C2 (Tab. 4)', clause_reference: '§6.3, Tab. 4', page_ref: null,
    key_columns: ['quality_category'],
    value_columns: [
      { name: 'treatment_method', type: 'string' },
      { name: 'turbidity_max', type: 'number', unit: 'NTU' }, { name: 'bod5_max', type: 'number', unit: 'mg/l' }, { name: 'o2_sat_min', type: 'number', unit: '%' },
      { name: 'ph_min', type: 'number', unit: '-' }, { name: 'ph_max', type: 'number', unit: '-' },
      { name: 'total_coliforms_max', type: 'number', unit: '1/100 ml' }, { name: 'e_coli_max', type: 'number', unit: '1/100 ml' }, { name: 'p_aeruginosa_max', type: 'number', unit: '1/100 ml' },
      { name: 'sampling', type: 'string' },
    ],
    override_policy: 'locked', override_quote: `${Q_L446_FRAG} — ${Q_L482_FRAG}`, // L446 — L482
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// TABLE4_USES — Tab. 4 use rows (L503–L507): "+" = allowed (1), "-" = not allowed (0) per category; the minimum
// category is C1 (code 1) where the C1 cell prints "+", else C2 (code 2). Keys = prod `use_category` tokens (same
// order as the printed rows). The laundry row's "*" footnote (L517) is the `note`; §6.2.2 "strongly recommended"
// (L458) vs the printed "-" is m277e-P-1. Policy `locked`: L476 — L478 (the C1/C2 scope statements).
// `imported_unverified`: the row-group header cell (L503) is an image (m277e-U-1).
// ---------------------------------------------------------------------------
export const USE_CATEGORY_TOKENS = ['toilet_private', 'irrigation_lawn', 'irrigation_crops', 'laundry_private', 'toilet_public'] as const;

export function table4UsesAsTable(): RegulationTable {
  type R = { token: string; label: string; c1: 0 | 1; c2: 0 | 1; note: string | null; quote: string };
  const R: R[] = [
    { token: 'toilet_private',   label: 'Toilet flushing (private)',                     c1: 1, c2: 1, note: null,   quote: Q_T4_USE_TOILET_PRIVATE }, // L503
    { token: 'irrigation_lawn',  label: 'Irrigation (private) lawn, ornamental plants',   c1: 0, c2: 1, note: null,   quote: Q_T4_USE_IRR_LAWN },       // L504
    { token: 'irrigation_crops', label: 'Irrigation crop plants (for consumption)',       c1: 0, c2: 1, note: null,   quote: Q_T4_USE_IRR_CROPS },      // L505
    { token: 'laundry_private',  label: 'Laundry (private)*',                             c1: 0, c2: 1, note: Q_L517, quote: Q_T4_USE_LAUNDRY },        // L506 (+ L517)
    { token: 'toilet_public',    label: 'Toilet flushing (public)',                       c1: 0, c2: 1, note: null,   quote: Q_T4_USE_TOILET_PUBLIC },  // L507
  ];
  const rows: RegulationRow[] = R.map((r, i) => ({
    row_key: r.token, keys: { use_category: r.token }, group_label: null, label_de: r.label, order_index: i,
    values: { c1_allowed: r.c1, c2_allowed: r.c2, min_category_code: r.c1 === 1 ? 1 : 2, min_category: r.c1 === 1 ? 'C1' : 'C2', note: r.note },
    verbatim_quote: r.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TABLE4_USES', title_de: 'Zulässige Nutzungen je Qualitätskategorie und Mindestkategorie (Tab. 4)', clause_reference: '§6.3, Tab. 4', page_ref: null,
    key_columns: ['use_category'],
    value_columns: [{ name: 'c1_allowed', type: 'number' }, { name: 'c2_allowed', type: 'number' }, { name: 'min_category_code', type: 'number' }, { name: 'min_category', type: 'string' }, { name: 'note', type: 'string' }],
    override_policy: 'locked', override_quote: `${Q_L476} — ${Q_L478}`, // L476 — L478
    verification_status: 'imported_unverified', rows }; // m277e-U-1
}

// ---------------------------------------------------------------------------
// TABLE4_PROCESSES — Tab. 4 last row (L508–L509): C1 "FB, SF, FLB, Stabilisation"; C2 "FB, SF, FLB, MBR" + "UV,
// UF, RO" (additional stages). Keys = prod `treatment_method` tokens; labels from the legend (L511–L513;
// "Stabilisation" is its own §2.1 term). A process the C2 cell does not list (Stabilisation) is 0 as printed —
// the compilation is "not exhaustive" (L480), hence policy `anhaltswert`.
// ---------------------------------------------------------------------------
export const TREATMENT_METHOD_TOKENS = ['fb', 'sf', 'flb', 'stabilisation', 'mbr', 'uv', 'uf', 'ro'] as const;

export function table4ProcessesAsTable(): RegulationTable {
  type R = { token: string; label: string; c1: 0 | 1; c2: 0 | 1; stage: 'treatment' | 'additional' };
  const R: R[] = [
    { token: 'fb',            label: 'Fixed bed reactor',     c1: 1, c2: 1, stage: 'treatment' },
    { token: 'sf',            label: 'Soil filter system',    c1: 1, c2: 1, stage: 'treatment' },
    { token: 'flb',           label: 'Fluidised bed reactor', c1: 1, c2: 1, stage: 'treatment' },
    { token: 'stabilisation', label: 'Stabilisation',         c1: 1, c2: 0, stage: 'treatment' },
    { token: 'mbr',           label: 'Membrane bioreactor',   c1: 0, c2: 1, stage: 'treatment' },
    { token: 'uv',            label: 'UV-system',             c1: 0, c2: 1, stage: 'additional' },
    { token: 'uf',            label: 'Ultrafiltration',       c1: 0, c2: 1, stage: 'additional' },
    { token: 'ro',            label: 'Reverse Osmosis',       c1: 0, c2: 1, stage: 'additional' },
  ];
  const rows: RegulationRow[] = R.map((r, i) => ({
    row_key: r.token, keys: { treatment_method: r.token }, group_label: null, label_de: r.label, order_index: i,
    values: { c1_allowed: r.c1, c2_allowed: r.c2, stage: r.stage, label: r.label }, verbatim_quote: Q_T4_PROCESSES,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TABLE4_PROCESSES', title_de: 'Beispielhafte Verfahren je Qualitätskategorie (Tab. 4)', clause_reference: '§6.3, Tab. 4', page_ref: null,
    key_columns: ['treatment_method'],
    value_columns: [{ name: 'c1_allowed', type: 'number' }, { name: 'c2_allowed', type: 'number' }, { name: 'stage', type: 'string' }, { name: 'label', type: 'string' }],
    override_policy: 'anhaltswert', override_quote: Q_L480_FRAG, // L480
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// TABLE5 — §9.2 Tab. 5 (L634–L647): household consumption per application, "litres per capita and day" (L638).
// Tokens are new (a created register column drives them). Policy `anhaltswert` (L632 "provides assistance").
// TABLE5_AREA — the worked example's area-specific rate (L655/L658): 60 l/m² over a 180-day season on 150 m²;
// an EXAMPLE value, offered as a reference next to the engineer's own Q_SW-A (m277e-J-3), never auto-picked.
// ---------------------------------------------------------------------------
export const APPLICATION_TOKENS = ['toilets', 'personal_hygiene', 'washing_machine', 'cleaning_irrigation', 'cooking_drinking', 'kitchen_dishwasher'] as const;

export function table5AsTable(): RegulationTable {
  type R = { token: string; label: string; v: number; quote: string };
  const R: R[] = [
    { token: 'toilets',             label: 'Toilets',             v: 33, quote: Q_T5_TOILETS },  // L639
    { token: 'personal_hygiene',    label: 'Personal hygiene',    v: 44, quote: Q_T5_HYGIENE },  // L640
    { token: 'washing_machine',     label: 'Washing machine',     v: 15, quote: Q_T5_WASHING },  // L641
    { token: 'cleaning_irrigation', label: 'Cleaning/Irrigation', v: 7,  quote: Q_T5_CLEANING }, // L642
    { token: 'cooking_drinking',    label: 'Cooking/Drinking',    v: 5,  quote: Q_T5_COOKING },  // L643
    { token: 'kitchen_dishwasher',  label: 'Kitchen/Dishwasher',  v: 7,  quote: Q_T5_KITCHEN },  // L644
  ];
  const rows: RegulationRow[] = R.map((r, i) => ({ row_key: r.token, keys: { application: r.token }, group_label: null, label_de: r.label, order_index: i, values: { q_sw_p: r.v }, verbatim_quote: r.quote }));
  return { standard_code: STD, edition: ED, table_code: 'TABLE5', title_de: 'Täglicher Wasserverbrauch im Haushalt je Anwendung (Tab. 5, BDEW 2015)', clause_reference: '§9.2, Tab. 5', page_ref: null,
    key_columns: ['application'], value_columns: [{ name: 'q_sw_p', type: 'number', unit: 'l/(P·d)' }],
    override_policy: 'anhaltswert', override_quote: Q_L632_FRAG, // L632
    verification_status: 'md_verified', rows };
}

export function table5AreaAsTable(): RegulationTable {
  const rows: RegulationRow[] = [
    { row_key: 'kitchen_garden', keys: { use: 'kitchen_garden' }, group_label: null, label_de: 'irrigation of kitchen garden (150 m², season with 180 days) — worked example §9.2', order_index: 0,
      values: { q_sw_a_l_m2: 60, season_d: 180, area_example_m2: 150 }, verbatim_quote: Q_EX_QSW }, // L658
  ];
  return { standard_code: STD, edition: ED, table_code: 'TABLE5_AREA', title_de: 'Flächenbezogener Brauchwasserbedarf — Rechenbeispiel §9.2 (60 l/m² je Saison von 180 d)', clause_reference: '§9.2, Example calculation Part 1', page_ref: null,
    key_columns: ['use'], value_columns: [{ name: 'q_sw_a_l_m2', type: 'number', unit: 'l/m²' }, { name: 'season_d', type: 'number', unit: 'd' }, { name: 'area_example_m2', type: 'number', unit: 'm²' }],
    override_policy: 'anhaltswert', override_quote: `${Q_L655} — ${Q_L632_FRAG}`, // L655 — L632
    verification_status: 'md_verified', rows };
}

/** The live DWA-M-277E set (nine tables), in the order the brief's Step 2 lists them. */
export function m277eSeedTables(): RegulationTable[] {
  return [table2AsTable(), table2TypeAsTable(), table3AsTable(), table1SieversAsTable(), table4LimitsAsTable(), table4UsesAsTable(), table4ProcessesAsTable(), table5AsTable(), table5AreaAsTable()];
}
