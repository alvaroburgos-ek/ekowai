/**
 * Plan 3 Task 4 — DWA-M-277E seed tables: shape pins, key-token pins against
 * the captured prod enums (G-A3), the printed values read from the transcript
 * `Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).md` (English edition) in this
 * session (line in the comment), and the one table kept `imported_unverified`
 * (m277e-U-1: the Table 4 use-row group header is an image, L503).
 */
import { describe, it, expect } from 'vitest';
import {
  m277eSeedTables, M277E_EDITION, GREYWATER_SOURCE_TOKENS,
  table2AsTable, table2TypeAsTable, table3AsTable, table1SieversAsTable, table4LimitsAsTable, table4UsesAsTable, table4ProcessesAsTable, table5AsTable, table5AreaAsTable,
} from '../regulation-tables-seed-m277e';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DWA-M-277E';

function expectWellFormed(t: RegulationTable) {
  const keys = new Set<string>();
  for (const r of t.rows) {
    expect(keys.has(r.row_key), `${t.table_code} duplicate row_key ${r.row_key}`).toBe(false);
    keys.add(r.row_key);
    expect(r.row_key).toBe(t.key_columns.map((c) => r.keys[c]).join('|'));
    expect(r.verbatim_quote.trim().length, `${t.table_code} ${r.row_key} quote`).toBeGreaterThan(0);
    for (const c of t.value_columns) expect(c.name in r.values, `${t.table_code} ${r.row_key} lacks column ${c.name}`).toBe(true);
  }
  expect(t.standard_code).toBe(STD);
  expect(t.edition).toBe(M277E_EDITION);
}

describe('DWA-M-277E Plan-3 seed tables', () => {
  it('nine tables in the live set; registered as SEED_BUILDERS.m277e (ts 20260917100400); edition 2017-10 (title page L9 "October 2017"); the fallback resolves each', () => {
    const tables = m277eSeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TABLE2', 'TABLE2_TYPE', 'TABLE3', 'TABLE1_SIEVERS', 'TABLE4_LIMITS', 'TABLE4_USES', 'TABLE4_PROCESSES', 'TABLE5', 'TABLE5_AREA']);
    for (const t of tables) expectWellFormed(t);
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(38);
    expect(M277E_EDITION).toBe('2017-10');
    expect(SEED_BUILDERS.m277e).toEqual({ build: m277eSeedTables, ts: '20260917100400', slugFile: 'm277e' });
    expect(liveSeedSlugs()).toContain('m277e');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
  });

  it('TABLE2 (L406–L414): six sources = the prod Q_GW_P_<source> suffixes; ranges as min/max pairs; spanning cells repeated per source; anhaltswert (L393)', () => {
    const t = table2AsTable();
    expect(GREYWATER_SOURCE_TOKENS).toEqual(['shower', 'bathtub', 'hand_washbasin', 'washing_machine', 'kitchen_sink', 'dishwasher']);
    expect(t.rows.map((r) => r.keys.source)).toEqual([...GREYWATER_SOURCE_TOKENS]);
    expect(t.rows.map((r) => [r.values.q_gw_p_min, r.values.q_gw_p_max])).toEqual([[10, 50], [0, 30], [10, 15], [10, 15], [5, 10], [5, 10]]);          // L406
    expect(t.rows.map((r) => r.values.organic_load)).toEqual(['very low', 'very low', 'very low', 'moderate', 'moderate high', 'moderate high']);  // L407
    expect(t.rows.map((r) => [r.values.cod_min, r.values.cod_max])).toEqual([[80, 200], [80, 200], [80, 200], [500, 800], [400, 800], [400, 800]]); // L408
    expect(t.rows.map((r) => [r.values.load_min, r.values.load_max])).toEqual([[0.8, 10], [0.8, 10], [0.8, 10], [5, 12], [2, 8], [2, 8]]);           // L409
    expect(t.rows.map((r) => [r.values.ss_min, r.values.ss_max])).toEqual([[7, 120], [7, 120], [7, 120], [80, 280], [130, 1300], [130, 1300]]);     // L410 ("130-1,300")
    expect(t.rows.map((r) => [r.values.ph_min, r.values.ph_max])).toEqual([[5, 8.6], [5, 8.6], [5, 8.6], [9.3, 10], [6.3, 7.4], [6.3, 7.4]]);       // L411
    expect(t.rows.map((r) => [r.values.hydraulic_min, r.values.hydraulic_max])).toEqual([[6, 25], [20, 50], [3, 15], [20, 30], [10, 20], [10, 30]]); // L414
    expect(t.rows.map((r) => r.values.note)).toEqual([null, '200 l/week', null, null, null, null]);                                                   // L406 "0-30 ( $200 \mathrm{l} /$ week )"
    expect(t.rows.map((r) => r.label_de)).toEqual(['Shower', 'Bathtub', 'Hand washbasin', 'Washing machine', 'Kitchen sink', 'Dish washer']);      // L405
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('The load values listed below serve as orientation values.');
    expect(t.verification_status).toBe('md_verified');
    for (const r of t.rows) expect(r.verbatim_quote).toContain(String.raw`\hline Water volume (l/P•d) & 10-50 & 0-30 ( $200 \mathrm{l} /$ week ) & 10-15 & 10-15 & 5-10 & 5-10 \\`);
    expect(t.value_columns.find((c) => c.name === 'q_gw_p_min')).toEqual({ name: 'q_gw_p_min', type: 'number', unit: 'l/(P·d)' });
    expect(makeTableLookup(STD)('TABLE2', ['kitchen_sink'])?.q_gw_p_max).toBe(10);
  });

  it('TABLE2_TYPE (L416–L419 + §5 L386/L387/L390/L391): prod greywater_type tokens A1/A2/B1/B2, type codes 1–4, total ranges, membership flags, printed definitions; locked (L383)', () => {
    const t = table2TypeAsTable();
    expect(t.rows.map((r) => r.keys.greywater_type)).toEqual(['A1', 'A2', 'B1', 'B2']);
    expect(t.rows.map((r) => r.values.type_code)).toEqual([1, 2, 3, 4]);
    expect(t.rows.map((r) => [r.values.q_gw_total_min, r.values.q_gw_total_max])).toEqual([[20, 85], [40, 100], [50, 115], [60, 130]]);
    expect(t.rows.map((r) => [r.values.includes_shower_bath, r.values.includes_basin, r.values.includes_washing_machine, r.values.includes_kitchen])).toEqual([
      [true, false, false, false], [true, true, false, false], [true, true, true, false], [true, true, true, true],
    ]);
    expect(t.rows[0].values.definition).toBe('- Type A1: greywater from bathtubs and showers');                                                     // L386
    expect(t.rows[3].values.definition).toBe('- Type B2: greywater from bathtubs, showers, hand washbasins, washing machines and/or kitchen.');   // L391
    expect(t.rows[0].verbatim_quote).toBe(String.raw`\hline \multirow{4}{*}{Greywater type} & \multicolumn{2}{|c|}{A1: $20 \mathrm{l} / \mathrm{P} \cdot \mathrm{d}$ ) - $85 \mathrm{l} /(\mathrm{P} \cdot \mathrm{d})$} & \multicolumn{4}{|c|}{} \\`);
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TABLE3 (L434–L435): keyed by the prod greywater_type tokens (A1 and A2 read the "Type A" column); exponent ranges as numbers AND printed strings; anhaltswert (L426)', () => {
    const t = table3AsTable();
    expect(t.rows.map((r) => r.keys.greywater_type)).toEqual(['A1', 'A2', 'B1', 'B2']);
    expect(t.rows.map((r) => [r.values.total_coliforms_min, r.values.total_coliforms_max])).toEqual([[10, 100000], [10, 100000], [100, 1000000], [100000, 100000000]]);
    expect(t.rows.map((r) => [r.values.faecal_coliforms_min, r.values.faecal_coliforms_max])).toEqual([[10, 100000], [10, 100000], [100, 1000000], [100, 1000000]]);
    expect(t.rows.map((r) => r.values.total_coliforms_range)).toEqual(['10^1-10^5', '10^1-10^5', '10^2-10^6', '10^5-10^8']);
    expect(t.rows.map((r) => r.values.faecal_coliforms_range)).toEqual(['10^1-10^5', '10^1-10^5', '10^2-10^6', '10^2-10^6']);
    expect(t.value_columns.find((c) => c.name === 'total_coliforms_min')?.unit).toBe('1/ml');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('the wide range of the microbial loads is clearly evidenced');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TABLE1_SIEVERS (L360–L372): two rows (mean / 85percentile) × eleven Sievers cells; TOS has no Sievers cell (L364) and is not a column; anhaltswert (L353 "recommended as design values")', () => {
    const t = table1SieversAsTable();
    expect(t.rows.map((r) => r.keys.statistic)).toEqual(['mean', 'p85']);
    expect(t.rows.map((r) => r.label_de)).toEqual(['mean', '85percentile']); // L361
    const mean = t.rows[0].values, p85 = t.rows[1].values;
    expect([mean.water_volume_l_pd, p85.water_volume_l_pd]).toEqual([68, 80]);      // L360
    expect([mean.ts_mg_l, p85.ts_mg_l, mean.ts_g_pd, p85.ts_g_pd]).toEqual([103, 137.5, 7, 11]);       // L362/L363
    expect([mean.cod_mg_l, p85.cod_mg_l, mean.cod_g_pd, p85.cod_g_pd]).toEqual([838, 1038, 57, 83]);   // L365/L366 ("1,038")
    expect([mean.bod5_mg_l, p85.bod5_mg_l, mean.bod5_g_pd, p85.bod5_g_pd]).toEqual([456, 650, 31, 42]); // L367/L368
    expect([mean.tn_mg_l, p85.tn_mg_l, mean.tn_g_pd, p85.tn_g_pd]).toEqual([15, 17.5, 1, 1.4]);        // L369/L370
    expect([mean.tp_mg_l, p85.tp_mg_l, mean.tp_g_pd, p85.tp_g_pd]).toEqual([6, 6.5, 0.4, 0.5]);        // L371/L372
    expect(t.value_columns.map((c) => c.name)).not.toContain('tos_g_pd');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe('In the present document, data from Sievers et al. (2014) are recommended as design values.');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TABLE4_LIMITS (L488–L502): one row per prod quality_category token C1/C2; C1 prints "-" / "No requirement" for turbidity, BOD5 and the hygienic parameters (null); locked', () => {
    const t = table4LimitsAsTable();
    expect(t.rows.map((r) => r.keys.quality_category)).toEqual(['C1', 'C2']);
    const c1 = t.rows[0].values, c2 = t.rows[1].values;
    expect([c1.turbidity_max, c2.turbidity_max]).toEqual([null, 2]);                 // L495 "< 2 NTU"
    expect([c1.bod5_max, c2.bod5_max]).toEqual([null, 5]);                           // L496 "<5 mg/l"
    expect([c1.o2_sat_min, c2.o2_sat_min]).toEqual([50, 50]);                        // L497 "> 50 %"
    expect([c1.ph_min, c1.ph_max, c2.ph_min, c2.ph_max]).toEqual([6.5, 9.5, 6.5, 9.5]); // L498
    expect([c1.total_coliforms_max, c2.total_coliforms_max]).toEqual([null, 10000]); // L499 "<10,000 / 100 ml"
    expect([c1.e_coli_max, c2.e_coli_max]).toEqual([null, 1000]);                    // L500
    expect([c1.p_aeruginosa_max, c2.p_aeruginosa_max]).toEqual([null, 100]);         // L501 (printed "P. aeroginosa")
    expect([c1.sampling, c2.sampling]).toEqual(['-', 'Reservoir/Consumer']);          // L502
    expect([c1.treatment_method, c2.treatment_method]).toEqual(['Treatment/Stabilisation', 'Treatment and hygienisation']); // L490
    expect(t.value_columns.find((c) => c.name === 'total_coliforms_max')?.unit).toBe('1/100 ml');
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('md_verified');
    for (const r of t.rows) expect(r.verbatim_quote).toContain(String.raw`\hline & P. aeroginosa & & $<100 / 100 \mathrm{ml}$ \\`);
  });

  it('TABLE4_USES (L503–L507): prod use_category tokens; "+" / "-" cells as 1/0; min category code 1 for private toilet flushing, 2 otherwise; imported_unverified (image group header, m277e-U-1)', () => {
    const t = table4UsesAsTable();
    expect(t.rows.map((r) => r.keys.use_category)).toEqual(['toilet_private', 'irrigation_lawn', 'irrigation_crops', 'laundry_private', 'toilet_public']);
    expect(t.rows.map((r) => [r.values.c1_allowed, r.values.c2_allowed, r.values.min_category_code, r.values.min_category])).toEqual([
      [1, 1, 1, 'C1'], [0, 1, 2, 'C2'], [0, 1, 2, 'C2'], [0, 1, 2, 'C2'], [0, 1, 2, 'C2'],
    ]);
    expect(t.rows[0].verbatim_quote).toBe(String.raw`Toilet flushing (private) & + & + \\`);
    expect(t.rows[3].verbatim_quote).toBe(String.raw`\hline & Laundry (private)* & - & + \\`);
    expect(t.rows[3].values.note).toBe('*UV Transmission > 60 \\% is recommended.'); // L517
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('imported_unverified');
  });

  it('TABLE4_PROCESSES (L508–L509): prod treatment_method tokens; C1 = FB, SF, FLB, Stabilisation; C2 = FB, SF, FLB, MBR + UV, UF, RO; anhaltswert (L480 "not exhaustive")', () => {
    const t = table4ProcessesAsTable();
    expect(t.rows.map((r) => r.keys.treatment_method)).toEqual(['fb', 'sf', 'flb', 'stabilisation', 'mbr', 'uv', 'uf', 'ro']);
    expect(t.rows.map((r) => [r.values.c1_allowed, r.values.c2_allowed])).toEqual([[1, 1], [1, 1], [1, 1], [1, 0], [0, 1], [0, 1], [0, 1], [0, 1]]);
    expect(t.rows.map((r) => r.values.stage)).toEqual(['treatment', 'treatment', 'treatment', 'treatment', 'treatment', 'additional', 'additional', 'additional']);
    expect(t.rows.map((r) => r.values.label)).toEqual(['Fixed bed reactor', 'Soil filter system', 'Fluidised bed reactor', 'Stabilisation', 'Membrane bioreactor', 'UV-system', 'Ultrafiltration', 'Reverse Osmosis']); // L511–L513
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe('This compilation is not exhaustive with regard to technology and allocation of particular uses to the single technologies.');
    expect(t.verification_status).toBe('md_verified');
    expect(makeTableLookup(STD)('TABLE4_PROCESSES', ['mbr'])?.c1_allowed).toBe(0);
  });

  it('TABLE5 (L639–L644) + TABLE5_AREA (L658): six applications in l/(P·d); the worked-example area rate 60 l/m² over 180 d; anhaltswert (L632 "provides assistance")', () => {
    const t = table5AsTable();
    expect(t.rows.map((r) => [r.keys.application, r.values.q_sw_p])).toEqual([
      ['toilets', 33], ['personal_hygiene', 44], ['washing_machine', 15], ['cleaning_irrigation', 7], ['cooking_drinking', 5], ['kitchen_dishwasher', 7],
    ]);
    expect(t.rows.map((r) => r.label_de)).toEqual(['Toilets', 'Personal hygiene', 'Washing machine', 'Cleaning/Irrigation', 'Cooking/Drinking', 'Kitchen/Dishwasher']);
    expect(t.rows[0].verbatim_quote).toBe(String.raw`\hline Toilets & 33 \\`);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe('The following Table 5 provides assistance in determining the service water demand.');
    expect(t.verification_status).toBe('md_verified');
    const a = table5AreaAsTable();
    expect(a.rows.map((r) => [r.keys.use, r.values.q_sw_a_l_m2, r.values.season_d, r.values.area_example_m2])).toEqual([['kitchen_garden', 60, 180, 150]]);
    expect(a.rows[0].verbatim_quote).toContain(String.raw`60 \mathrm{l} / \mathrm{m}^{2} \cdot 150 \mathrm{~m}^{2} / 180 \mathrm{~d} \text { kitchen garden }`);
    expect(a.override_policy).toBe('anhaltswert');
    expect(a.verification_status).toBe('md_verified');
  });
});
