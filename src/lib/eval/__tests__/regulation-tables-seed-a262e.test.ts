/**
 * Plan 3 Task 3 — DWA-A-262E seed tables: shape pins, key-token pins against
 * the captured prod enums (G-A3), the printed values read from the transcript
 * `Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).md` in this session (line in
 * the comment), and the cells that keep two tables `imported_unverified`
 * (sign-off a262e-U-2 Tab. 13 "≤ 4", a262e-U-3 Tab. 18 lava orifice cell).
 */
import { describe, it, expect } from 'vitest';
import {
  a262eSeedTables, A262E_EDITION, TABLE1_PRETREATMENT_MAP, TABLE_LIMITS_ROWS, LIMITS_VALUE_COLUMNS,
  table1CsbAsTable, table1Bsb5AsTable, table1TknAsTable, table2CsbAsTable, s42VorbehandlungAsTable,
  tableLimitsAsTable, table15AsTable, table16AsTable, table18OrificeAsTable, table21AsTable,
} from '../regulation-tables-seed-a262e';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DWA-A-262E';

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
  expect(t.edition).toBe(A262E_EDITION);
}

describe('DWA-A-262E Plan-3 seed tables', () => {
  it('ten tables in the live set; registered as SEED_BUILDERS.a262e (ts 20260917100300); edition 2017-11 (title page L7); the fallback resolves each', () => {
    const tables = a262eSeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TABLE1_CSB', 'TABLE1_BSB5', 'TABLE1_TKN', 'TABLE2_CSB', 'S4_2_VORBEHANDLUNG', 'TABLE_LIMITS', 'TABLE15', 'TABLE16', 'TABLE18_ORIFICE', 'TABLE21']);
    for (const t of tables) expectWellFormed(t);
    expect(A262E_EDITION).toBe('2017-11');
    expect(SEED_BUILDERS.a262e).toEqual({ build: a262eSeedTables, ts: '20260917100300', slugFile: 'a262e' });
    expect(liveSeedSlugs()).toContain('a262e');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
  });

  it('TABLE1_* (L617/L618/L620): pretreatment tokens = prod pretreatment_selected minus rotting_tank (E-2); columns 2–4 mapped; messwert policy (L573)', () => {
    expect(TABLE1_PRETREATMENT_MAP.map((m) => m.token)).toEqual(['multicompartment_septic_tank', 'settling_pond', 'imhoff_tank', 'raw_wastewater_filter', 'aerated_settling_pond']);
    const csb = table1CsbAsTable();
    expect(csb.rows.map((r) => [r.keys.pretreatment, r.values.load_g_pd])).toEqual([
      ['multicompartment_septic_tank', 80], ['settling_pond', 80], ['imhoff_tank', 80], ['raw_wastewater_filter', 25], ['aerated_settling_pond', 60],
    ]);
    expect(table1Bsb5AsTable().rows.map((r) => r.values.load_g_pd)).toEqual([40, 40, 40, 10, 30]);
    const tkn = table1TknAsTable();
    expect(tkn.rows.map((r) => r.values.load_g_pd)).toEqual([10, 10, 10, 4.4, 8.5]);
    expect(tkn.rows.map((r) => r.values.note)).toEqual([null, null, null, '(>12 °C)', null]);
    for (const t of [csb, table1Bsb5AsTable(), tkn]) {
      expect(t.override_policy).toBe('messwert');
      expect(t.override_quote).toContain('the wastewater pollutant loads per population equivalent given in Table 1 must be used');
      expect(t.verification_status).toBe('md_verified');
      expect(t.value_columns[0]).toEqual({ name: 'load_g_pd', type: 'number', unit: 'g/(P·d)' });
    }
    expect(csb.rows[0].verbatim_quote).toBe(String.raw`\hline CSB (COD) & 120 & 80 & 25 & 60 \\`);
  });

  it('TABLE2_CSB (L678): median 47 / average 57 g/(P·d); anhaltswert (L670)', () => {
    const t = table2CsbAsTable();
    expect(t.rows.map((r) => [r.keys.source, r.values.load_g_pd])).toEqual([['median', 47], ['average', 57]]);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe('Table 2 gives informative specific loads for greywater.');
    expect(t.verification_status).toBe('md_verified');
  });

  it('S4_2_VORBEHANDLUNG (L700/L705/L709/L721/L777): volume floors per pretreatment; locked ("must be at least")', () => {
    const t = s42VorbehandlungAsTable();
    expect(t.key_columns).toEqual(['pretreatment']);
    expect(t.rows.map((r) => [r.keys.pretreatment, r.values.v_min_l_p, r.values.v_min_l, r.values.hrt_min_h, r.values.a_spez_min_m2_p])).toEqual([
      ['multicompartment_septic_tank', 300, 3000, null, null],
      ['rotting_tank', 200, null, null, null],
      ['settling_pond', null, null, null, 1.5],
      ['imhoff_tank', 75, null, 2, null],
      ['aerated_settling_pond', 1200, null, null, null], // printed 1.2 m³/P (L777) = 1200 l/P
    ]);
    expect(t.rows[1].values.note).toContain('300');
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('md_verified');
    expect(t.rows.find((r) => r.row_key === 'raw_wastewater_filter')).toBeUndefined(); // Tab. 3 is area-based (E-2)
  });

  it('TABLE_LIMITS: 26 rows = (7 small + 6 municipal filter types) × {tr, m}; keys = prod filter_type / system_size_category tokens; sewer tokens tr|m', () => {
    const t = tableLimitsAsTable();
    expect(t.key_columns).toEqual(['filter_type', 'system_size', 'sewer']);
    expect(t.rows).toHaveLength(26);
    expect(TABLE_LIMITS_ROWS).toHaveLength(26);
    expect(new Set(t.rows.map((r) => r.keys.sewer))).toEqual(new Set(['tr', 'm']));
    expect(new Set(t.rows.map((r) => r.keys.system_size))).toEqual(new Set(['small_wwts', 'municipal_wwtp']));
    expect(t.value_columns.map((c) => c.name)).toEqual(LIMITS_VALUE_COLUMNS.map((c) => c.name));
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('imported_unverified'); // U-2: Tab. 13 prints "≤ 4" for t_Sicker
    const lookup = makeTableLookup(STD);
    const row = (ft: string, size: string, sewer: string) => lookup('TABLE_LIMITS', [ft, size, sewer])!;
    // Tab. 3 (L749–L755): raw wastewater filter, sewer split 1.2 (Tr, min 4.8) / 1.5 (M)
    expect(row('raw_wastewater_filter', 'small_wwts', 'tr')).toMatchObject({ a_spez_min: 1.2, a_min_m2: 4.8, f_a_f_csb_max: 100, q_f_t_max: 250, q_beschickung_min: 10, h_beschickung_min: 20, h_beschickung_max: 50, area_ref: 'upper_surface' });
    expect(row('raw_wastewater_filter', 'small_wwts', 'm')).toMatchObject({ a_spez_min: 1.5, a_min_m2: null });
    expect(row('raw_wastewater_filter', 'municipal_wwtp', 'tr')).toMatchObject({ a_spez_min: 1.2, a_min_m2: 4.8 });
    // Tab. 4 (L804–L805) / Tab. 5 (L819–L821) / Tab. 6 (L836–L840) / Tab. 7 (L856–L857)
    expect(row('vf_sand_0_2', 'small_wwts', 'tr')).toMatchObject({ a_spez_min: 4, a_min_m2: 16, f_a_f_csb_max: null });
    expect(row('two_stage_vf_gravel_sand', 'small_wwts', 'm')).toMatchObject({ a_spez_min: 1, a_min_m2: 4, a_spez_1_min: 1, a_spez_2_min: 1 });
    expect(row('vf_coarse_sand_0_4', 'small_wwts', 'tr')).toMatchObject({ a_spez_min: 1, a_min_m2: 4, area_ref: 'upper_surface' });
    expect(row('aerated_vf_gravel_8_16', 'small_wwts', 'tr')).toMatchObject({ a_spez_min: 1, a_min_m2: 4, area_ref: 'basin_bottom' });
    // Tab. 8 (L873–L879): trench
    expect(row('two_layer_filter_trench', 'small_wwts', 'tr')).toMatchObject({ a_spez_min: 3, a_min_m2: 12, l_rieselr_min_m_p: 6, l_rieselr_each_max: 18, b_rieselr_min: 0.5, b_fgr_min: 0.5, h_beschickung_min: 20, area_ref: 'basin_bottom' });
    // Tab. 9 (L899–L916): aerated HF
    expect(row('aerated_hf_gravel_8_16', 'small_wwts', 'm')).toMatchObject({ a_spez_min: 1, a_min_m2: 4, f_a_anf_csb_max: 200, f_v_csb_max: 100, l_hf_min: 2 });
    expect(lookup('TABLE_LIMITS', ['aerated_hf_gravel_8_16', 'municipal_wwtp', 'tr'])).toBeUndefined(); // Tab. 18 prints no aerated-HF column
    // Tab. 10 (L936–L942)
    expect(row('vf_sand_0_2', 'municipal_wwtp', 'tr')).toMatchObject({ a_spez_min: 4, a_min_m2: null, f_a_f_csb_max: 20, f_a_f_csb_betrieb_max: 27, q_f_t_max: 80, t_sicker_min: 6, q_beschickung_min: 6, h_beschickung_min: 20, h_beschickung_min_tight: 10 });
    // Tab. 11 (L968–L973)
    expect(row('two_stage_vf_gravel_sand', 'municipal_wwtp', 'tr')).toMatchObject({ a_spez_min: 1, a_spez_1_min: 1, a_spez_2_min: 1, f_a_f01_csb_max: 80, t_sicker_min: 3, q_beschickung_min: 10, h_beschickung_min: 20 });
    // Tab. 12 (L994–L997): sewer split 0.8 / 1
    expect(row('vf_coarse_sand_0_4', 'municipal_wwtp', 'tr')).toMatchObject({ a_spez_min: 0.8, q_beschickung_min: 6, h_beschickung_min: 20 });
    expect(row('vf_coarse_sand_0_4', 'municipal_wwtp', 'm')).toMatchObject({ a_spez_min: 1 });
    // Tab. 13 (L1017–L1020): t_Sicker printed "≤ 4" — encoded as printed (t_sicker_max), U-2
    expect(row('aerated_vf_gravel_8_16', 'municipal_wwtp', 'tr')).toMatchObject({ a_spez_min: 1, f_v_csb_max: 100, t_sicker_max: 4, t_sicker_min: null, h_beschickung_min: 6, area_ref: 'basin_bottom' });
    // Tab. 14 (L1046–L1053): lava sand; overflow filter cells only on the combined-sewer row
    expect(row('vf_lava_sand_0_4', 'municipal_wwtp', 'tr')).toMatchObject({ a_spez_min: 3, f_a_f_csb_max: 20, q_f_betrieb_max: 240, t_sicker_min: 4, q_beschickung_min: 10, h_beschickung_min: 20, a_awf_spez_min: null, q_awf_max: null });
    expect(row('vf_lava_sand_0_4', 'municipal_wwtp', 'm')).toMatchObject({ a_awf_spez_min: 1, q_awf_max: 500 });
    // the two sewer rows of a table without a sewer split carry the same printed span
    expect(row('vf_sand_0_2', 'small_wwts', 'tr')).toEqual(row('vf_sand_0_2', 'small_wwts', 'm'));
  });

  it('TABLE15 (L1134–L1141): temperature bands — q_Fo,T ≤ 80 / ≤ 120, t_Sicker ≥ 6 / ≥ 3; locked with the redox footnote (L1147) in override_quote', () => {
    const t = table15AsTable();
    expect(t.rows.map((r) => [r.keys.temp_band, r.values.q_f_t_max, r.values.t_sicker_min, r.values.f_a_f_csb_max, r.values.f_a_f_csb_betrieb_max, r.values.q_beschickung_min, r.values.h_beschickung_min])).toEqual([
      ['lt12', 80, 6, 20, 27, 6, 20], ['ge12', 120, 3, 20, 27, 6, 20],
    ]);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('when monitoring the filter effluent for redox potential');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TABLE16 (L1158–L1160): coarse sand ≤ 40 / gravel ≤ 200 on the cross-section; f_A,Fu,CSB ≤ 16 for both; locked', () => {
    const t = table16AsTable();
    expect(t.rows.map((r) => [r.keys.material, r.values.f_a_anf_csb_max, r.values.f_a_fu_csb_max])).toEqual([['coarse_sand', 40, 16], ['gravel', 200, 16]]);
    expect(t.rows.map((r) => r.label_de)).toEqual(['coarse sand', 'gravel']);
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TABLE18_ORIFICE (L1244): filter area per orifice, keyed (filter_type, stage_role); lava cell printed "≤ 25-<5**" stays null (U-3)', () => {
    const t = table18OrificeAsTable();
    expect(t.key_columns).toEqual(['filter_type', 'stage_role']);
    expect(t.rows.map((r) => [r.row_key, r.values.orifice_area_max, r.values.orifice_area_better])).toEqual([
      ['raw_wastewater_filter|primary', 50, null], ['vf_coarse_sand_0_4|main', 1, null], ['vf_sand_0_2|main', 5, 1], ['two_stage_vf_gravel_sand|main', 1, null],
      ['aerated_vf_gravel_8_16|main', 1, null], ['vf_lava_sand_0_4|main', null, null], ['vf_sand_0_2|polishing', 1, null],
    ]);
    expect(t.rows[5].values.orifice_printed).toBe('≤ 25 - < 5**');
    expect(t.verification_status).toBe('imported_unverified');
  });

  it('TABLE21 (L1450–L1495): ten recommended-media rows keyed (filter_type, material); d10 ranges, U < 5, fines ≤ 2 % (lava < 8 %); anhaltswert (L1426); md_verified', () => {
    const t = table21AsTable();
    expect(t.key_columns).toEqual(['filter_type', 'material']);
    expect(t.rows.map((r) => r.row_key)).toEqual([
      'raw_wastewater_filter|fine_gravel', 'vf_sand_0_2|sand', 'two_stage_vf_gravel_sand|fine_gravel_coarse_sand', 'vf_coarse_sand_0_4|coarse_sand',
      'aerated_vf_gravel_8_16|medium_gravel', 'vf_lava_sand_0_4|lava_sand', 'two_layer_filter_trench|fine_gravel_coarse_sand',
      'hf_coarse_sand_or_gravel_downstream|coarse_sand', 'hf_coarse_sand_or_gravel_downstream|fine_gravel', 'aerated_hf_gravel_8_16|medium_gravel',
    ]);
    const by = (k: string) => t.rows.find((r) => r.row_key === k)!.values;
    expect(by('vf_sand_0_2|sand')).toMatchObject({ section: '5.4.2.2', sieve_mm: '0 to 2', symbol_din: 'S', fines_max_pct: 2, u_max: 5, d10_min: 0.2, d10_max: 0.4, d10_printed: '0.20 to 0.4', k_fa_optimal: '≈ 10^-4', k_fa_calc: '4.0 × 10^-4 to 1.6 × 10^-3' });
    expect(by('vf_lava_sand_0_4|lava_sand')).toMatchObject({ fines_max_pct: 8, fines_printed: '<8', d10_min: 0.05, d10_max: 0.3 });
    expect(by('aerated_vf_gravel_8_16|medium_gravel')).toMatchObject({ d10_min: 5, d10_max: null, d10_printed: '≥ 5', k_fa_optimal: '≈ 1' });
    expect(by('raw_wastewater_filter|fine_gravel')).toMatchObject({ d10_min: 3, d10_max: 3, d10_printed: '3' });
    expect(by('two_stage_vf_gravel_sand|fine_gravel_coarse_sand')).toMatchObject({ d10_min: null, d10_max: null, d10_printed: '3 / 0.25 to 0.4', sieve_mm: '2 to 8 / 0 to 4' });
    expect(by('hf_coarse_sand_or_gravel_downstream|coarse_sand')).toMatchObject({ d10_min: 0.3, d10_max: 0.4, section: '5.4.3.1' });
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('recommended filter media');
    expect(t.verification_status).toBe('md_verified');
  });

  it('the three-key positional lookup the filterstufen register uses resolves rows and misses cleanly', () => {
    const lookup = makeTableLookup(STD);
    expect(lookup('TABLE_LIMITS', ['vf_sand_0_2', 'small_wwts', 'tr'])?.a_spez_min).toBe(4);
    expect(lookup('TABLE_LIMITS', ['vf_coarse_sand_0_4', 'municipal_wwtp', 'm'])?.a_spez_min).toBe(1);
    expect(lookup('TABLE_LIMITS', ['hf_coarse_sand_or_gravel_downstream', 'municipal_wwtp', 'tr'])).toBeUndefined(); // Tab. 16 is TABLE16 (material-keyed)
    expect(lookup('TABLE16', ['gravel'])?.f_a_anf_csb_max).toBe(200);
    expect(lookup('TABLE15', ['ge12'])?.q_f_t_max).toBe(120);
    expect(lookup('S4_2_VORBEHANDLUNG', ['imhoff_tank'])?.hrt_min_h).toBe(2);
  });
});
