/**
 * Plan 3 Task 23 — ISO-5667-6 seed tables: the Anexo A Chézy example, the §13.1
 * report items a) – q) and the four printed SENTENCE rules (§7.1 30 cm, §5.1.3
 * five flows / 10 %, §5.1.4 six samples / three flows / 90 %, §10.8 5 min) of the
 * Spanish transcript, lifted by line range in this session, every cell asserted
 * inside its span, every table `imported_unverified` (VC source), the
 * SEED_BUILDERS registration and the fallback resolution.
 */
import { describe, it, expect } from 'vitest';
import {
  iso56676SeedTables, annexAAsTable, s131AsTable, s71AsTable, s513AsTable, s514AsTable, s108AsTable, s131ItemFragments,
  ISO5667_6_EDITION, ANNEXA_ROWS, S13_1_ROWS,
} from '../regulation-tables-seed-iso5667_6';
import { Q } from '../regulation-tables-quotes-iso5667_6';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'ISO-5667-6';
const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

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
  expect(t.edition).toBe(ISO5667_6_EDITION);
  expect(t.override_quote?.trim().length ?? 0).toBeGreaterThan(0);
  expect(t.override_quote).not.toContain('undefined');
}

describe('ISO-5667-6 Plan-3 seed tables', () => {
  it('six tables in the live set; registered as SEED_BUILDERS.iso5667_6 (ts 20260917102300); the fallback resolves each; edition 2015; EVERY table imported_unverified (Spanish txt = VC); 23 rows', () => {
    const tables = iso56676SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['ANNEXA', 'S13_1', 'S7_1', 'S5_1_3', 'S5_1_4', 'S10_8']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.iso5667_6).toEqual({ build: iso56676SeedTables, ts: '20260917102300', slugFile: 'iso5667_6' });
    expect(liveSeedSlugs()).toContain('iso5667_6');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(ISO5667_6_EDITION).toBe('2015'); // title page L4–L5 "Primera edición" / "2015.02.24"; reference number L28–L29 "NCh-ISO 5667/6:2015"; prod standards.version "2014 (ISO 5667-6:2014; NCh-ISO 5667/6:2015 declared identical)"
    expect(Q.L4_5).toBe('Primera edición\n2015.02.24');
    expect(Q.L28_29).toContain('NCh-ISO 5667/6:2015');
    for (const t of tables) expect(t.verification_status, t.table_code).toBe('imported_unverified');
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(23);
    expect(tables.every((t) => t.override_policy === 'anhaltswert')).toBe(true); // informative annex, "podrían considerar", "suelen ser", "deberían", "debería"
    // no quote is a generated-constant span gone wrong
    for (const k of Object.keys(Q)) expect((Q as Record<string, string>)[k].trim().length, k).toBeGreaterThan(0);
  });

  it('ANNEXA (L2165 / L2179–L2183): c = 15 (fondo muy irregular) / 50 (fondo muy liso) as printed in the EJEMPLO, the range 15 < c < 50 as bounds; the example results 83 m / 683 m kept as text; anhaltswert ("(informativo)", "aproximadamente")', () => {
    const t = annexAAsTable();
    expect(t.key_columns).toEqual(['roughness']);
    expect(t.rows.map((r) => [r.keys.roughness, r.values.c_example, r.values.c_min, r.values.c_max, r.values.l_example_m])).toEqual([
      ['muy_irregular', 15, 15, 50, '83 m'],
      ['liso', 50, 15, 50, '683 m'],
    ]);
    expect(ANNEXA_ROWS.map((r) => r.roughness)).toEqual(['muy_irregular', 'liso']);
    for (const r of t.rows) expect(r.verbatim_quote).toBe(Q.L2179_2183);
    expect(Q.L2165).toBe('c    = coeficiente de Chézy para el tramo (15 < c < 50);');
    expect(collapse(Q.L2179_2183)).toContain('uno de 15 (fondo muy irregular, es decir, el curso de agua es muy rápido y turbulento) y el otro de 50 (fondo muy liso, es decir, un curso de agua muy tranquilo, de movimiento lento)');
    expect(collapse(Q.L2179_2183)).toContain('completan la homogeneidad después de 83 m, mientras que el último no es homogéneo hasta que haya recorrido 683 m.');
    // U-1: the printed formula block loses its radical — "0,13b 2c 0,7c + 2 g" over "gd"; no cell depends on the reading
    expect(Q.L2152_2155).toContain('0,13b 2c 0,7c + 2 g');
    expect(Q.L2152_2155).toContain('gd');
    expect(Q.L2152_2155).not.toContain('√');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe(`${Q.L2139_2140} — ${Q.L2146_2148}`);
    expect(Q.L2139_2140).toContain('(informativo)');
    expect(Q.L2146_2148).toContain('se puede calcular aproximadamente con Ecuación (A.1)');
    // D-2: no numeric g is printed — only the legend word "aceleración debido a la gravedad"
    expect(Q.L2167).toContain('aceleración debido a la gravedad');
    expect(Q.L2167).not.toMatch(/9[,.]81/);
    const lookup = makeTableLookup(STD);
    expect(lookup('ANNEXA', ['muy_irregular'])?.c_example).toBe(15);
    expect(lookup('ANNEXA', ['liso'])?.c_example).toBe(50);
    expect(lookup('ANNEXA', ['medio'])).toBeUndefined();
  });

  it('S13_1 (L1946–L2006): seventeen rows a) – q), each the printed item; item i) is two printed fragments around the page-furniture line L1984; anhaltswert ("podrían considerar para su inclusión")', () => {
    const t = s131AsTable();
    expect(t.key_columns).toEqual(['item']);
    expect(t.rows.map((r) => r.keys.item)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q']);
    expect(S13_1_ROWS).toHaveLength(17);
    expect(t.rows[0].values).toEqual({ letter: 'a)', text: 'nombre del río o curso de agua;' });
    expect(t.rows[1].values.text).toBe('punto de muestreo (es decir, la posición de muestreo en la sección transversal en el sitio de muestreo);');
    expect(t.rows[2].values.text).toBe('información sobre el muestreo en lugares específicos (puente, en el curso de agua, desde la orilla);');
    expect(t.rows[8].values.text).toBe('apariencia de la muestra (por ejemplo, el color del agua y de los sólidos suspendidos, claridad, naturaleza y cantidad de sólidos suspendidos, olor);');
    expect(s131ItemFragments('i', Q.L1979_1985)).toHaveLength(2);
    expect(Q.L1979_1985).toContain('USO EXCLUSIVO'); // the furniture line is inside the span (kept verbatim)
    expect(t.rows[16].values.text).toBe('referencia a esta parte de NCh-ISO 5667 (NCh-ISO 5667/6:2015).');
    for (const r of t.rows) expect(r.label_de.startsWith(`${r.keys.item}) `), r.row_key).toBe(true);
    expect(t.override_policy).toBe('anhaltswert');
    expect(Q.L1946_1948).toContain('Los asuntos que se');
    expect(Q.L1946_1948).toContain('podrían considerar para su inclusión son:');
    expect(() => s131ItemFragments('b', Q.L1950)).toThrow(/does not start with/);
  });

  it('S7_1 (L1165–L1169): at least 30 cm above the bed and a similar distance below the surface — 30 / 30 keyed `general`; anhaltswert ("suelen ser satisfactorias")', () => {
    const t = s71AsTable();
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0].keys).toEqual({ regla: 'general' });
    expect(t.rows[0].values).toMatchObject({ height_above_bed_min_cm: 30, depth_below_surface_min_cm: 30, modal: 'suelen ser satisfactorias' });
    expect(Q.L1168_1169).toBe('obtenidas de posiciones al menos 30 cm por encima del fondo de un curso de agua y a una distancia\nsimilar debajo de la superficie, suelen ser satisfactorias.');
    // J-1: the §7.3 / §7.4 / §7.5 wording is "alrededor de 30 cm … o … a media altura"; §8.1 "dentro de 30 cm de la superficie"
    expect(Q.L1284_1285).toContain('a alrededor');
    expect(Q.L1284_1285).toContain('de 30 cm por debajo de la superficie, o de otra manera, a media altura entre el lecho y la superficie.');
    expect(Q.L1370_1371).toContain('dentro de 30 cm de la superficie');
    expect(t.override_policy).toBe('anhaltswert');
    expect(makeTableLookup(STD)('S7_1', ['general'])?.height_above_bed_min_cm).toBe(30);
  });

  it('S5_1_3 (L859–L863): a minimum of five different flows ("cinco"), extrapolation outside 10 % unreliable; anhaltswert ("se deberían realizar")', () => {
    const t = s513AsTable();
    expect(t.rows[0].keys).toEqual({ regla: 'travel_time' });
    expect(t.rows[0].values).toEqual({ flows_min: 5, flows_min_gedruckt: 'cinco', extrapolation_max_pct: 10, modal: 'se deberían realizar' });
    expect(Q.L859_863).toContain('Las mediciones se deberían realizar en un mínimo de cinco caudales diferentes');
    expect(Q.L859_863).toContain('extrapolación fuera del 10% de un valor de medición del caudal puede proporcionar información');
    expect(t.override_quote).toBe(`${Q.L846_849} — ${Q.L859_863}`);
    expect(Q.L846_849).toContain('flotadores de superficie (ver ISO 748), el uso de trazadores');
    expect(makeTableLookup(STD)('S5_1_3', ['travel_time'])?.extrapolation_max_pct).toBe(10);
  });

  it('S5_1_4 (L897–L905): about 90 % of the flow, about six samples ("aproximadamente seis" → 6, J-2), at least three flows ("al menos tres"); anhaltswert', () => {
    const t = s514AsTable();
    expect(t.rows[0].keys).toEqual({ regla: 'heterogeneity' });
    expect(t.rows[0].values).toEqual({ flow_share_pct: 90, samples_approx: 6, samples_gedruckt: 'aproximadamente seis', flows_min: 3, flows_min_gedruckt: 'al menos tres', modal: 'se deberían tomar' });
    expect(t.rows[0].verbatim_quote).toBe(Q.L897_905);
    expect(Q.L897_899).toContain('parte (alrededor del 90%) de los pasos totales de flujo');
    expect(Q.L897_899).toContain('se deberían tomar aproximadamente seis muestras repartidas a través de la parte');
    expect(Q.L904_905).toContain('las muestras se deberían tomar de al menos tres caudales correspondientes');
    expect(makeTableLookup(STD)('S5_1_4', ['heterogeneity'])?.samples_approx).toBe(6);
  });

  it('S10_8 (L1765–L1768): the total time of all increments should be less than 5 min (strict "<"); anhaltswert ("debería ser menor")', () => {
    const t = s108AsTable();
    expect(t.rows[0].keys).toEqual({ regla: 'incremental' });
    expect(t.rows[0].values).toEqual({ total_time_max_min: 5, comparator: '<', modal: 'debería ser menor' });
    expect(Q.L1765_1768).toContain('el tiempo para todos los incrementos que se adopten debería ser menor');
    expect(Q.L1765_1768).toContain('que 5 min.');
    expect(makeTableLookup(STD)('S10_8', ['incremental'])?.total_time_max_min).toBe(5);
  });
});
