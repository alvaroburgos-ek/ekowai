/**
 * Plan 3 Task 20 — ISO-5667-10 seed tables: the printed SENTENCE rules of the
 * Spanish transcript (§4.3.2 formula switch, §7.2.1 interval, §7.2.2.1 tube /
 * pump, §7.2.2.4 CV, §3.4 qualified grab, §9.1 homogeniser, §5 site figures)
 * lifted by line range in this session, every cell asserted inside its span,
 * every table `imported_unverified` (VC source), the SEED_BUILDERS registration
 * and the fallback resolution.
 */
import { describe, it, expect } from 'vitest';
import {
  iso566710SeedTables, s432AsTable, s721AsTable, s7221TubeAsTable, s7221PumpAsTable, s7224AsTable, s34AsTable, s91AsTable, s5SiteAsTable,
  ISO5667_10_EDITION, S4_3_2_ROWS, S7_2_2_1_PUMP_ROWS, S9_1_ROWS,
} from '../regulation-tables-seed-iso5667_10';
import { Q } from '../regulation-tables-quotes-iso5667_10';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'ISO-5667-10';

function expectWellFormed(t: RegulationTable) {
  const keys = new Set<string>();
  for (const r of t.rows) {
    expect(keys.has(r.row_key), `${t.table_code} duplicate row_key ${r.row_key}`).toBe(false);
    keys.add(r.row_key);
    expect(r.row_key).toBe(t.key_columns.map((c) => r.keys[c]).join('|'));
    expect(r.verbatim_quote.trim().length, `${t.table_code} ${r.row_key} quote`).toBeGreaterThan(0);
    expect(r.verbatim_quote).not.toContain('undefined');
    for (const c of t.value_columns) expect(c.name in r.values, `${t.table_code} ${r.row_key} lacks column ${c.name}`).toBe(true);
  }
  expect(t.standard_code).toBe(STD);
  expect(t.edition).toBe(ISO5667_10_EDITION);
  expect(t.override_quote?.trim().length ?? 0).toBeGreaterThan(0);
  expect(t.override_quote).not.toContain('undefined');
}

describe('ISO-5667-10 Plan-3 seed tables', () => {
  it('eight tables in the live set; registered as SEED_BUILDERS.iso5667_10 (ts 20260917102000); the fallback resolves each; edition 2020; EVERY table imported_unverified (Spanish txt = VC)', () => {
    const tables = iso566710SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['S4_3_2', 'S7_2_1', 'S7_2_2_1_TUBE', 'S7_2_2_1_PUMP', 'S7_2_2_4', 'S3_4', 'S9_1', 'S5_SITE']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.iso5667_10).toEqual({ build: iso566710SeedTables, ts: '20260917102000', slugFile: 'iso5667_10' });
    expect(liveSeedSlugs()).toContain('iso5667_10');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(ISO5667_10_EDITION).toBe('2020'); // title page L7–L8 "Segunda edición" / "2020-11"; prod standards.version starts "2020 (ISO 5667-10:2020, second edition …)"
    expect(Q.L7_8).toContain('Segunda edición');
    expect(Q.L7_8).toContain('2020-11');
    for (const t of tables) expect(t.verification_status, t.table_code).toBe('imported_unverified');
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(14);
    // no quote is a generated-constant span gone wrong
    for (const k of Object.keys(Q)) expect((Q as Record<string, string>)[k].trim().length, k).toBeGreaterThan(0);
  });

  it('S4_3_2 (L478–L500): Fórmula (1) days 365 for n above about 25, Fórmula (2) weeks 52 below; A in (−365/n, 0) / (−52/n, 0); the row spans are the printed formula blocks (Formula 2 prints "𝐵+" — U-1); policy anhaltswert from L475–L476 / L502–L503', () => {
    const t = s432AsTable();
    expect(t.key_columns).toEqual(['n_band']);
    expect(t.rows.map((r) => [r.keys.n_band, r.values.formula, r.values.period_unit, r.values.period_length, r.values.a_min_factor])).toEqual([
      ['gt25', '1', 'días', 365, '– 365/n'],
      ['lt25', '2', 'semana', 52, '– 52/n'],
    ]);
    expect(S4_3_2_ROWS).toHaveLength(2);
    expect(t.rows[0].verbatim_quote).toBe(Q.L478_489);
    expect(t.rows[1].verbatim_quote).toBe(Q.L491_500);
    expect(Q.L478_479).toBe('Fórmula (1) para un número de muestras (n), superior a unas 25 y de la Fórmula (2) para un número de\nmuestras inferior a unas 25.');
    expect(Q.L489).toBe('A Número aleatorio en un intervalo entre – 365/n y 0.');
    expect(Q.L500).toBe('A Número aleatorio en un intervalo entre – 52/n y 0.');
    // U-1: the printed Formula (2) block carries "𝐵+" on its first two terms (L495) while the legend defines A only
    expect(Q.L494_496).toContain('𝐵+');
    expect(Q.L494_496).toContain('𝐴 +');
    expect(Q.L483_485).not.toContain('𝐵');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe(`${Q.L475_476} — ${Q.L502_503}`);
    expect(Q.L475_476).toContain('los días de muestreo pueden determinarse mediante una');
    expect(Q.L475_476).toContain('fórmula. Un ejemplo es:');
    const lookup = makeTableLookup(STD);
    expect(lookup('S4_3_2', ['gt25'])?.period_length).toBe(365);
    expect(lookup('S4_3_2', ['lt25'])?.period_length).toBe(52);
    expect(lookup('S4_3_2', ['eq25'])).toBeUndefined();
  });

  it('S7_2_1 (L860–L862): 5 min for the 2-h composite, 30 min for the 24-h composite, both rows share the printed sentence; locked ("No deben superar")', () => {
    const t = s721AsTable();
    expect(t.rows.map((r) => [r.keys.duration, r.values.duration_h, r.values.max_interval_min])).toEqual([['h2', 2, 5], ['h24', 24, 30]]);
    for (const r of t.rows) expect(r.verbatim_quote).toBe(Q.L860_862);
    expect(Q.L860_862).toContain('No deben superar los 5 minutos para la muestra mixta de 2');
    expect(Q.L860_862).toContain('horas y los 30 minutos para la muestra mixta de 24 horas.');
    expect(t.override_policy).toBe('locked');
    expect(makeTableLookup(STD)('S7_2_1', ['h2'])?.max_interval_min).toBe(5);
  });

  it('S7_2_2_1_TUBE (L903 / L922–L923 / L928–L930): ≥ 9 mm → 0,5 m/s (locked, "no debe ser inferior"); NOTA 1: 12 mm or more → 0,3 m/s; the 9 mm cue is L903', () => {
    const t = s7221TubeAsTable();
    expect(t.rows.map((r) => [r.keys.bore_band, r.values.bore_min_mm, r.values.min_velocity_m_s])).toEqual([['ge9', 9, 0.5], ['ge12', 12, 0.3]]);
    expect(t.rows[0].verbatim_quote).toBe(Q.L922_923);
    expect(t.rows[1].verbatim_quote).toBe(Q.L928_930);
    expect(Q.L903).toBe('- debe tener un diámetro interno mayor o igual a 9 mm;');
    expect(Q.L922_923).toContain('Velocidad de aspiración: no debe ser inferior a 0,5 m/s');
    expect(Q.L928_930).toContain('el diámetro interno del tubo de aspiración es de 12 mm o más,');
    expect(Q.L928_930).toContain('una velocidad de aspiración de 0,3 m/s es aceptable');
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toBe(`${Q.L903} — ${Q.L922_923}`);
  });

  it('S7_2_2_1_PUMP (L936–L937): 50 ml vacuum pump, 25 ml inline piston — keyed on the prod pump_technology tokens; peristaltic / external have no row (E-1); anhaltswert ("por ejemplo")', () => {
    const t = s7221PumpAsTable();
    expect(t.key_columns).toEqual(['pump']);
    expect(t.rows.map((r) => [r.keys.pump, r.values.min_unit_volume_ml, r.values.gedruckt])).toEqual([['vacuum', 50, 'bomba de vacío'], ['inline_piston', 25, 'émbolo en línea']]);
    expect(S7_2_2_1_PUMP_ROWS.map((r) => r.pump)).toEqual(['vacuum', 'inline_piston']);
    for (const r of t.rows) expect(r.verbatim_quote).toBe(Q.L936_937);
    // the inventory's "pump-volume sentence NOT located in the Spanish txt" is refuted — it IS printed (O-4)
    expect(Q.L936_937).toBe('- debe ser adecuado para garantizar un muestreo representativo (por ejemplo, al menos 50 ml para\nla bomba de vacío o 25 ml para el émbolo en línea);');
    expect(t.override_policy).toBe('anhaltswert');
    const lookup = makeTableLookup(STD);
    expect(lookup('S7_2_2_1_PUMP', ['peristaltic'])).toBeUndefined();
    expect(lookup('S7_2_2_1_PUMP', ['external'])).toBeUndefined();
  });

  it('S7_2_2_4 (L1026–L1028): CTCV applicable when the flow varies little — CV 20 % on average ("puede aplicarse … por ejemplo" ⇒ anhaltswert)', () => {
    const t = s7224AsTable();
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0].keys).toEqual({ criterio: 'ctcv' });
    expect(t.rows[0].values).toEqual({ cv_max_pct: 20, modal: 'puede aplicarse' });
    expect(Q.L1026_1028).toContain('coeficiente de variación de la repetibilidad del 20 % por término medio');
    expect(t.override_policy).toBe('anhaltswert');
  });

  it('S3_4 (L305–L307): at least five grabs within at most two hours, interval not below two minutes — keyed on the prod token qualified_grab; locked (definition)', () => {
    const t = s34AsTable();
    expect(t.rows[0].keys).toEqual({ definicion: 'qualified_grab' });
    expect(t.rows[0].values).toMatchObject({ min_grabs: 5, max_window_h: 2, min_interval_min: 2, min_grabs_gedruckt: 'cinco', max_window_gedruckt: 'dos horas', min_interval_gedruckt: 'dos minutos' });
    expect(Q.L305_307).toBe('Forma especial de una muestra compuesta (3.1), formada por al menos cinco muestras puntuales,\ntomadas y mezcladas en un plazo un período máximo de dos horas y con un intervalo no inferior a\ndos minutos.');
    expect(t.override_policy).toBe('locked');
    expect(makeTableLookup(STD)('S3_4', ['qualified_grab'])?.min_grabs).toBe(5);
  });

  it('S9_1 (L1474–L1477 / L1486–L1487): > 5 l → mechanical / magnetic homogeniser ("deberían utilizarse"), ≤ 5 l → laboratory method ("puede aplicarse"); cells = prod homogenizer_type tokens', () => {
    const t = s91AsTable();
    expect(t.rows.map((r) => [r.keys.volume_band, r.values.threshold_l, r.values.comparator, r.values.homogenizer, r.values.modal])).toEqual([
      ['gt5', 5, '>', 'mechanical', 'deberían utilizarse'],
      ['le5', 5, '≤', 'laboratory_manual', 'puede aplicarse'],
    ]);
    expect(S9_1_ROWS.map((r) => r.homogenizer)).toEqual(['mechanical', 'laboratory_manual']);
    expect(Q.L1474_1477).toContain('Para volúmenes de muestra mayores (por ejemplo, > 5 l), los homogeneizadores con recipientes de');
    expect(Q.L1486_1487).toContain('Para volúmenes inferiores recogidos (≤5 l), puede aplicarse el método de laboratorio');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.value_columns.find((c) => c.name === 'homogenizer')).toEqual({ name: 'homogenizer', type: 'enum', values: ['mechanical', 'laboratory_manual'] });
  });

  it('S5_SITE (L555–L564 / L705–L706): sewer ≥ 3 × diameter downstream of the restriction, depth one third to one half; cooling run the water ≥ 30 s; keyed on the prod specific_site_type tokens that print a figure', () => {
    const t = s5SiteAsTable();
    expect(t.key_columns).toEqual(['site']);
    expect(t.rows.map((r) => r.keys.site)).toEqual(['sewer_channel_manhole', 'cooling_system']);
    const sewer = t.rows[0].values;
    expect(sewer.restriction_min_diameters).toBe(3);
    expect(sewer.depth_fraction_min).toBeCloseTo(1 / 3, 10);
    expect(sewer.depth_fraction_max).toBe(0.5);
    expect(sewer.runoff_min_s).toBeNull();
    expect(t.rows[1].values).toMatchObject({ restriction_min_diameters: null, depth_fraction_min: null, depth_fraction_max: null, runoff_min_s: 30 });
    expect(t.rows[0].verbatim_quote).toBe(Q.L555_564);
    expect(t.rows[1].verbatim_quote).toBe(Q.L705_706);
    expect(Q.L555_564).toContain('norma general, debe situarse al menos tres veces el diámetro de la tubería, o la anchura del canal,');
    expect(Q.L555_564).toContain('muestreo entre un tercio y la mitad de la profundidad del agua del efluente por debajo de la superficie');
    expect(Q.L705_706).toContain('se dejará correr el agua durante al menos 30 s antes del muestreo.');
    expect(t.override_policy).toBe('locked');
    const lookup = makeTableLookup(STD);
    expect(lookup('S5_SITE', ['wwtp'])).toBeUndefined();
    expect(lookup('S5_SITE', ['industrial_site'])).toBeUndefined();
  });
});
