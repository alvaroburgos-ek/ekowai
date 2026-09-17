/**
 * Plan 3 Task 8 — FLL-Naturteich seed builders: every cell is pinned against the
 * printed transcript line it was read from (the quote spans are lifted by line
 * range; the seed test is the SR-1 record that the typed numbers equal the printed
 * ones), the key tokens equal the captured prod enum strings, the verifier passes
 * on every row, and the committed seed migration is byte-pinned by the shared
 * `generated-sql-freshness.test.ts` (via SEED_BUILDERS).
 */
import { describe, it, expect } from 'vitest';
import {
  fllNaturteichSeedTables, table1AsTable, table2SubmergedAsTable, table7AsTable, table8AsTable, table8PAsTable, table9AsTable, table10AsTable, table11AsTable, table12AsTable, table15AsTable, s1043AsTable,
  norm, deMd, cell, tab15Row, densityRange, FLL_NATURTEICH_EDITION,
  POOL_TYPE_TOKENS, HYDROBOT_TYPE_TOKENS, FLOW_DIRECTION_TOKENS, SUBSTRATE_ROLE_TOKENS, GRAIN_CLASS_TOKENS, PLANT_GROUP_TOKENS,
  Q_T1_BODY, Q_T2_SHARE, Q_T3_SHARE, Q_T7_BODY, Q_T8_BODY, Q_T9_BODY, Q_T10_BODY, Q_T11_BODY, Q_T12_BODY, Q_L3051, Q_L3054, Q_L236_237, Q_L1457,
} from '../regulation-tables-seed-fll_naturteich';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup } from '../regulation-tables-fallback';

const by = (code: string) => fllNaturteichSeedTables().find((t) => t.table_code === code)!;
const row = (code: string, key: string) => by(code).rows.find((r) => r.row_key === key)!;

describe('FLL-Naturteich seed builders (Plan 3 Task 8)', () => {
  it('eleven tables, standard code / edition / key columns / policies / statuses as designed; registered live in SEED_BUILDERS', () => {
    const tables = fllNaturteichSeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TABLE1', 'TABLE2_SUBMERGED', 'TABLE7', 'TABLE8', 'TABLE8_P', 'TABLE9', 'TABLE10', 'TABLE11', 'TABLE12', 'TABLE15', 'S10_4_3']);
    for (const t of tables) {
      expect(t.standard_code).toBe('FLL-Naturteich');
      expect(t.edition).toBe(FLL_NATURTEICH_EDITION);
      expect(t.override_quote!.length).toBeGreaterThan(20);
      for (const r of t.rows) expect(r.verbatim_quote.length, `${t.table_code} ${r.row_key}`).toBeGreaterThan(10);
      expect(new Set(t.rows.map((r) => r.row_key)).size).toBe(t.rows.length);
    }
    expect(FLL_NATURTEICH_EDITION).toBe('2017');
    expect(norm(Q_L236_237)).toContain('nd edition 2017 (German), English Translation 2023, 50 copies and download version, Bonn, May 2024');
    expect(Object.fromEntries(tables.map((t) => [t.table_code, [t.override_policy, t.verification_status]]))).toEqual({
      TABLE1: ['locked', 'md_verified'], TABLE2_SUBMERGED: ['locked', 'md_verified'], TABLE7: ['anhaltswert', 'md_verified'], TABLE8: ['anhaltswert', 'md_verified'], TABLE8_P: ['anhaltswert', 'md_verified'],
      TABLE9: ['locked', 'md_verified'], TABLE10: ['locked', 'imported_unverified'], TABLE11: ['locked', 'imported_unverified'], TABLE12: ['locked', 'imported_unverified'], TABLE15: ['anhaltswert', 'md_verified'], S10_4_3: ['anhaltswert', 'md_verified'],
    });
    expect(SEED_BUILDERS.fll_naturteich).toMatchObject({ ts: '20260917100800', slugFile: 'fll_naturteich' });
    expect(liveSeedSlugs()).toContain('fll_naturteich');
    expect(SEED_BUILDERS.fll_naturteich.build().length).toBe(11);
    // the runtime fallback resolves every table by code for this standard
    const look = makeTableLookup('FLL-Naturteich');
    expect(look('TABLE15', ['8_16'])?.surface_m2_m3).toBe(600);
    expect(look('TABLE1', ['type_III'])?.regeneration_share_min_pct).toBe(30);
  });

  it('helpers: deMd un-escapes the markdown, cell() refuses a string absent from its span, tab15Row / densityRange cut the printed lines', () => {
    expect(deMd('\\> 50%')).toBe('> 50%');
    expect(deMd('\\[Ptotal\\]')).toBe('[Ptotal]');
    expect(() => cell(Q_T1_BODY, 'not printed anywhere')).toThrow(/printed cell not in span/);
    expect(cell(Q_T1_BODY, 'no filter, skimmer operation intermittently')).toBe('no filter, skimmer operation intermittently');
    expect(tab15Row('Grain 8/16 44 600  ')).toEqual({ cls: '8/16', pore: 44, surface: 600 });
    expect(() => tab15Row('Grain 8/16 44')).toThrow(/Tab. 15 row not parsed/);
    expect(densityRange(Q_L3051)).toEqual([6, 10]);
    expect(densityRange(Q_L3054)).toBeNull();
    expect(() => densityRange('• something else')).toThrow(/§10.4.3 bullet not parsed/);
  });

  it('TABLE1: five prod type tokens; shares > 50 / > 50 / > 30 / null / null as printed (L1212, L1214–L1220); every printed cell sits in the lifted body; Tab. 4 prints ≥ 30% (J-3)', () => {
    const t = table1AsTable();
    expect(t.key_columns).toEqual(['pool_type']);
    expect(t.rows.map((r) => r.keys.pool_type)).toEqual([...POOL_TYPE_TOKENS]);
    expect(t.rows.map((r) => r.values.regeneration_share_min_pct)).toEqual([50, 50, 30, null, null]);
    expect(t.rows.map((r) => r.values.share_comparator)).toEqual(['>', '>', '>', null, null]);
    expect(t.rows.map((r) => r.values.share_printed)).toEqual(['> 50%', '> 50%', '> 30%', 'information on construction based on design refer to Tab. 5', 'information on construction based on design refer to Tab. 6']);
    expect(t.rows.map((r) => r.values.share_ref)).toEqual([null, null, null, 'Tab. 5', 'Tab. 6']);
    expect(t.rows.map((r) => r.values.flow_type)).toEqual(['none', 'none', 'slow', 'quick', 'system']);
    expect(t.rows.map((r) => r.values.filter_operation)).toEqual(['no filter', 'no filter, skimmer operation intermittently', 'intermittent/permanent', 'permanent', 'dependent on system']);
    expect(t.rows.map((r) => r.values.p_binding_required)).toEqual([false, false, true, false, false]);
    expect(t.rows.map((r) => r.values.substrate_filter)).toEqual([false, false, true, true, false]);
    expect(t.rows.map((r) => r.values.hydrobotanical)).toEqual([true, true, true, false, false]);
    expect(row('TABLE1', 'type_III').values.technical_name).toBe('with controlled slow flow through the substrate fil- ter and downstream P-binding unit (hydrobo- tanical system and/or technical filter)');
    expect(row('TABLE1', 'type_V').values.regeneration_technique).toBe('Carrier material, e.g. plastic or mineral medium in a technical unit');
    const body = norm(Q_T1_BODY);
    for (const r of t.rows) for (const k of ['share_printed', 'flow_printed', 'filter_operation', 'regeneration_technique', 'technical_name']) expect(body, `${r.row_key}.${k}`).toContain(String(r.values[k]));
    expect(body).toContain('> 50% > 50% > 30%'); // L1212 as printed (interleaved row)
    expect(norm(Q_L1457)).toBe('≥ 30%');           // Tab. 4 prints the non-strict form for type III
    expect(t.override_quote).toContain('in accordance with Table 1.');
  });

  it('TABLE2_SUBMERGED: Type I (Tab. 2) and Type II (Tab. 3) print the same cell; TABLE7 / TABLE8 / TABLE8_P carry the printed limits', () => {
    const s = table2SubmergedAsTable();
    expect(s.rows.map((r) => r.keys.pool_type)).toEqual(['type_I', 'type_II']);
    expect(norm(Q_T2_SHARE)).toBe('> 50% therefrom at least half as submerged hydrobotanical system');
    expect(norm(Q_T3_SHARE)).toBe(norm(Q_T2_SHARE));
    for (const r of s.rows) expect(r.values).toMatchObject({ regeneration_share_min_pct: 50, submerged_share_of_regeneration_min_pct: 50 });
    const t7 = table7AsTable();
    expect(t7.key_columns).toEqual(['source']);
    expect(t7.rows[0].keys).toEqual({ source: 'all' });
    expect(t7.rows[0].values).toMatchObject({ ammonium_max: 0.5, iron_max: 0.2, p_total_max: 0.03, hardness_min: 1.0, hardness_min_dh: 5.6, conductivity_max: 1000, manganese_max: 0.05, nitrate_max: 50.0, orthophosphate_max: 0.01, ph_min: 6.0, ph_max: 9.0, acid_capacity_min: 2, acid_capacity_min_dh: 5.6 });
    const b7 = norm(Q_T7_BODY);
    for (const printed of ['1 1Ammonium ≤ 0.5 mg/l', '2 2Iron ≤ 0.2 mg/l', '3 3Total phosphorus [Ptotal] ≤ 0.03 mg/l', '≥ 1.0 mmol/l ≥ 5.6 dH°', '5 5Conductivity ≤ 1000 μS/cm at 20°C', '6 6Manganese ≤ 0.05 mg/l', '7 7Nitrate ≤ 50.0 mg/l', '8 Orthophosphate (indicated as P) ≤ 0.01 mg/l', '9 8pH value 6.0 – 9.0', '≥ 2 mmol/l ≥ 5.6 dH°']) expect(b7).toContain(printed);
    const t8 = table8AsTable();
    expect(t8.rows[0].values).toMatchObject({ ammonium_max: 0.3, hardness_min: 1.0, conductivity_max: 1000, nitrate_max: 30.0, nitrite_max: 0.01, ph_min: 7.0, ph_max: 9.0, acid_capacity_min: 2 });
    expect(Object.keys(t8.rows[0].values)).not.toContain('p_total_max'); // the type-split parameters live in TABLE8_P
    const b8 = norm(Q_T8_BODY);
    for (const printed of ['1 1Ammonium ≤ 0.3 mg/l', '≤ 0.03 mg/l (type I-III) ≤ 0.01 mg/l (type IV, V)', '4 4Conductivity ≤ 1000 μS/cm at 20°C', '5 5Nitrate ≤ 30.0 mg/l', '6 6Nitrite ≤ 0.01 mg/l', '7 Orthophosphate (indicated as P) ≤ 0.03 mg/l (type I-III) ≤ 0.01 mg/l (type IV, V)', '8 7pH value 7.0 – 9.0']) expect(b8).toContain(printed);
    const p = table8PAsTable();
    expect(p.rows.map((r) => r.keys.pool_type)).toEqual([...POOL_TYPE_TOKENS]);
    expect(p.rows.map((r) => r.values.p_total_max)).toEqual([0.03, 0.03, 0.03, 0.01, 0.01]);
    expect(p.rows.map((r) => r.values.orthophosphate_max)).toEqual([0.03, 0.03, 0.03, 0.01, 0.01]);
    for (const t of [t7, t8, p]) expect(t.override_quote).toContain('If the analysis results deviate from the approximate values');
  });

  it('TABLE9: three printed columns (type III / type IV / plant substrate) with 16 / 32 / 8 mm, ≤ 15 %, ≤ 2 / ≤ 0.5 %, 10^-4 / 10^-3 m/s, frost mandatory, ≤ 5 mg P/kg; "no requirement" → null', () => {
    const t = table9AsTable();
    expect(t.rows.map((r) => r.keys.substrate_role)).toEqual([...SUBSTRATE_ROLE_TOKENS]);
    expect(row('TABLE9', 'filter_iii').values).toMatchObject({ grain_max_mm: 16, oversize_max_pct: 15, fines_max_pct: 2, kf_min: 0.0001, frost_resistance_required: true, elutable_p_max: 5, frost_printed: 'is mandatory' });
    expect(row('TABLE9', 'filter_iv').values).toMatchObject({ grain_max_mm: 32, oversize_max_pct: 15, fines_max_pct: 0.5, kf_min: 0.001, frost_resistance_required: true, elutable_p_max: 5 });
    expect(row('TABLE9', 'plant').values).toMatchObject({ grain_max_mm: 8, oversize_max_pct: null, fines_max_pct: null, kf_min: null, frost_resistance_required: false, elutable_p_max: null, frost_printed: 'no requirement' });
    const b = norm(Q_T9_BODY);
    for (const printed of ['mum grain size 16 mm 32 mm 8 mm', '≤ 15% by weight ≤ 15% by weight no requirement', '≤ 2% by weight ≤ 0.5% by weight no requirement', 'cient ≥ 10-4 m/s ≥ 10-3 m/s no requirement', 'Frost resistance is mandatory is mandatory no requirement', 'level ≤ 5 mg P/kg ≤ 5 mg P/kg no requirement']) expect(b).toContain(printed);
    expect(t.override_quote).toContain('The percentage of oversized grain must not exceed 15% by weight.');
  });

  it('TABLE10: prod hydrobot_type tokens; ≥ 80 cm / 10 – 50 cm, 10 – 20 / 10 – 30 cm, ≤ 8 mm, Qmax 5 (L2607–L2632)', () => {
    const t = table10AsTable();
    expect(t.rows.map((r) => r.keys.hydrobot_type)).toEqual([...HYDROBOT_TYPE_TOKENS]);
    expect(row('TABLE10', 'submergent').values).toMatchObject({ water_column_min_cm: 80, water_column_max_cm: null, substrate_min_cm: 10, substrate_max_cm: 20, grain_max_mm: 8, feed_rate_qmax: 5 });
    expect(row('TABLE10', 'emersed').values).toMatchObject({ water_column_min_cm: 10, water_column_max_cm: 50, substrate_min_cm: 10, substrate_max_cm: 30, grain_max_mm: 8, feed_rate_qmax: 5 });
    const b = norm(Q_T10_BODY);
    for (const printed of ['2 Water column height ≥ 80 cm 10 – 50 cm', '3 Thickness of substrate layer 10 – 20 cm 10 – 30 cm', '≤ 8 mm', '12 Feed rate Qmax 5 m3/(m2 x day) 5 m3/(m2 x day)']) expect(b).toContain(printed);
  });

  it('TABLE11 / TABLE12: prod flow-direction tokens; vertical columns carry the printed cells, horizontal is "Individual verification" (all null); Tab. 11 Qmax 5 / 8, Tab. 12 Qmin 15 / 15', () => {
    const t11 = table11AsTable();
    const t12 = table12AsTable();
    for (const t of [t11, t12]) expect(t.rows.map((r) => r.keys.flow_direction)).toEqual([...FLOW_DIRECTION_TOKENS]);
    expect(row('TABLE11', 'vertical_continuous_overflow').values).toMatchObject({ water_column_min_cm: 10, layer_min_cm: 40, grain_max_mm: 16, oversize_max_pct: 15, fines_max_pct: 2, frost_resistance_required: true, kf_min: 0.0001, tolerance_pct: 10, feed_rate_qmax: 5, individual_verification: false });
    expect(row('TABLE11', 'vertical_no_overflow').values).toMatchObject({ water_column_min_cm: null, layer_min_cm: 40, feed_rate_qmax: 8, individual_verification: false });
    expect(row('TABLE11', 'horizontal').values).toMatchObject({ water_column_min_cm: null, layer_min_cm: null, grain_max_mm: null, kf_min: null, feed_rate_qmax: null, individual_verification: true });
    expect(row('TABLE12', 'vertical_continuous_overflow').values).toMatchObject({ water_column_min_cm: 0, layer_min_cm: 50, grain_max_mm: 32, oversize_max_pct: 15, fines_max_pct: 0.5, frost_resistance_required: true, kf_min: 0.001, tolerance_pct: 10, feed_rate_qmin: 15, individual_verification: false });
    expect(row('TABLE12', 'vertical_no_overflow').values).toMatchObject({ water_column_min_cm: null, feed_rate_qmin: 15 });
    expect(row('TABLE12', 'horizontal').values).toMatchObject({ layer_min_cm: null, feed_rate_qmin: null, individual_verification: true });
    const b11 = norm(Q_T11_BODY);
    for (const printed of ['2 Water column height ≥ 10 cm — Individual verifica- tion', 'layer ≥ 40 cm', 'Filters ≤ 16 mm', '6 Oversized grain (filter) ≤ 15% by weight', '7 Percentage of elutriated parts ≤ 2% by weight', '8 Frost resistance is mandatory', '11 Layer thickness tolerance 10% deviation', '13 Permeability coefficient ≥ 10-4 m/s ≥ 10-4 m/s Individual verifica- tion', '14 Feed rate Qmax 5 m3/(m2 x day) 8 m3/(m2 x day)']) expect(b11).toContain(printed);
    const b12 = norm(Q_T12_BODY);
    for (const printed of ['2 Water column height ≥ 0 cm — Individual verifi- cation', 'layer ≥ 50 cm', 'Filters ≤ 32 mm', '7 Percentage of elutriated parts ≤ 0.5% by weight', '13 Permeability coefficient ≥ 10-3 m/s ≥ 10-3 m/s', '14 Feed rate Qmin ≥ 15 m3/(m2 x day) ≥ 15 m3/(m2 x day)']) expect(b12).toContain(printed);
    expect(t12.override_quote).toContain('Smaller feed rates are permissible if the functionality of pool is ensured.');
  });

  it('TABLE15: nine grain classes cut from their printed lines (L4113–L4121); S10_4_3: 6–10 / 3–5 / 5–7 / null, pot P 0.5 (500 cm3)', () => {
    const t = table15AsTable();
    expect(t.rows.map((r) => r.keys.grain_class)).toEqual([...GRAIN_CLASS_TOKENS]);
    expect(t.rows.map((r) => [r.values.pore_water_pct, r.values.surface_m2_m3])).toEqual([[43, 1400], [43, 1200], [43, 1000], [44, 700], [44, 600], [47, 500], [48, 350], [47, 300], [47, 250]]);
    for (const r of t.rows) expect(norm(r.verbatim_quote)).toBe(`Grain ${r.values.grain_printed} ${r.values.pore_water_pct} ${r.values.surface_m2_m3}`);
    expect(t.override_quote).toContain('The values were determined using dolomite gravel');
    const s = s1043AsTable();
    expect(s.rows.map((r) => r.keys.plant_group)).toEqual([...PLANT_GROUP_TOKENS]);
    expect(s.rows.map((r) => [r.values.density_min, r.values.density_max])).toEqual([[6, 10], [3, 5], [5, 7], [null, null]]);
    for (const r of s.rows) expect(r.values.pot_size).toBe('P 0.5 (500 cm3)');
    expect(s.override_quote).toContain('applies as an approximate value per m2');
  });
});
