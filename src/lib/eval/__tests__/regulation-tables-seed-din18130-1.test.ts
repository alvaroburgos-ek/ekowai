/**
 * Plan 3 Task 10 — DIN-18130-1 seed tables: shape pins, key-token pins against
 * the captured prod enums (G-A3), the printed values read from the transcript in
 * this session (line in the comment), the Tab. 5 rows that are deliberately NOT
 * seeded (sign-off din18130_1-U-1) and the lower-case marks (U-2).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  tab1AsTable, tab2AsTable, tab3AsTable, tab4AsTable, tab5AsTable, s58AsTable, s58KornAsTable,
  din181301SeedTables, TAB1_BEREICHE, TAB2_ALPHA, TAB3_U0, TAB4_KLASSEN, TAB5_BODENARTEN, TAB5_ANORDNUNGEN, TAB5_UNSEEDED, S5_8_BODENKLASSEN, S5_8_KORN, DIN18130_1_EDITION,
} from '../regulation-tables-seed-din18130_1';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DIN-18130-1';
const ROOT = join(__dirname, '..', '..', '..', '..');
const prior = JSON.parse(readFileSync(join(ROOT, 'src/lib/eval/field-configs/din18130_1.prior.json'), 'utf8')) as Record<string, { enum_values?: Array<{ value: string }> | null; data_type?: string }>;
const enumValues = (key: string): string[] => (prior[key].enum_values ?? []).map((e) => e.value);

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
  expect(t.edition).toBe(DIN18130_1_EDITION);
}

describe('DIN-18130-1 Plan-3 seed tables', () => {
  it('seven tables in the live set; registered as SEED_BUILDERS.din18130_1 (ts 20260917101000); the fallback resolves each; edition = prod standards.version token', () => {
    const tables = din181301SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TAB1', 'TAB2', 'TAB3', 'TAB4', 'TAB5', 'S5_8', 'S5_8_KORN']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.din18130_1).toEqual({ build: din181301SeedTables, ts: '20260917101000', slugFile: 'din18130_1' });
    expect(liveSeedSlugs()).toContain('din18130_1');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(DIN18130_1_EDITION).toBe('1998-05'); // prod standards.version '1998-05 (Ersatz für 1989-11)' (read-only 2026-09-18); title page prints no own date (din18130_1-I-1)
  });

  it('TAB1 (L205–L209): five printed bands in caption order, bounds as printed, locked; md_verified', () => {
    const t = tab1AsTable();
    expect(t.rows.map((r) => [r.keys.bereich_code, r.values.bereich, r.values.k_lower, r.values.k_upper])).toEqual([
      ['1', 'sehr schwach durchlässig', null, 1e-8],   // "unter 10⁻⁸"
      ['2', 'schwach durchlässig', 1e-8, 1e-6],        // "10⁻⁸ bis 10⁻⁶"
      ['3', 'durchlässig', 1e-6, 1e-4],                // "über 10⁻⁶ bis 10⁻⁴"
      ['4', 'stark durchlässig', 1e-4, 1e-2],          // "über 10⁻⁴ bis 10⁻²"
      ['5', 'sehr stark durchlässig', 1e-2, null],     // "über 10⁻²"
    ]);
    expect(TAB1_BEREICHE).toHaveLength(5);
    // the five printed names are prod's durchlaessigkeitsbereich labels in the same order (tokens differ: prod uses snake_case names)
    expect(enumValues('DIN-18130-1-01 durchlaessigkeitsbereich')).toEqual(['sehr_schwach_durchlaessig', 'schwach_durchlaessig', 'durchlaessig', 'stark_durchlaessig', 'sehr_stark_durchlaessig']);
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TAB2 (L321–L322): α = 1,158 / 1,000 / 0,874 / 0,771 / 0,686 at 5/10/15/20/25 °C — transposed table, one two-line span as every row quote; anhaltswert (L327)', () => {
    const t = tab2AsTable();
    expect(t.rows.map((r) => [r.keys.t_c, r.values.alpha])).toEqual([['5', 1.158], ['10', 1.0], ['15', 0.874], ['20', 0.771], ['25', 0.686]]);
    expect(TAB2_ALPHA.map((a) => a.printed)).toEqual(['1,158', '1,000', '0,874', '0,771', '0,686']);
    expect(new Set(t.rows.map((r) => r.verbatim_quote)).size).toBe(1);
    expect(t.override_quote).toBe('Zwischenwerte können geradlinig eingeschaltet werden.');
    expect(t.verification_status).toBe('md_verified');
    // the Gl. 6 closed form (L305) reproduces every printed value within the printed precision
    for (const a of TAB2_ALPHA) expect(1.359 / (1 + 0.0337 * Number(a.t_c) + 0.00022 * Number(a.t_c) ** 2)).toBeCloseTo(a.alpha, 3);
  });

  it('TAB3 (L427–L429): ≥ 0,95 → 300 · 0,90 → 600 · 0,85 → 900 kN/m²; three discrete bands (SR-2 select); anhaltswert per example 9.3 (u_o = 720 for S_ra = 0,88, L1205/L1215)', () => {
    const t = tab3AsTable();
    expect(t.rows.map((r) => [r.keys.s_r_band, r.values.u_0_kn_m2])).toEqual([['ge095', 300], ['e090', 600], ['e085', 900]]);
    expect(TAB3_U0.map((r) => r.band)).toEqual(['ge095', 'e090', 'e085']);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('S_{\\mathrm{ra}}=0,88');
    expect(t.override_quote).toContain('u_{\\mathrm{o}}=720');
    expect(t.verification_status).toBe('md_verified');
    // linear interpolation between the 0,90 and 0,85 rows reproduces the example's 720 (900 − 0,03/0,05 · 300)
    expect(900 - ((0.88 - 0.85) / (0.9 - 0.85)) * 300).toBeCloseTo(720, 9);
  });

  it('TAB4 (L480–L483): 1a/1b/2/3 by (Wassersättigung, Strömung stationär) — keys are stringified booleans; the 1b footnote *) is carried (L484); cells = prod versuchsklasse tokens; locked', () => {
    const t = tab4AsTable();
    expect(t.rows.map((r) => [r.keys.saettigung, r.keys.stationaer, r.values.versuchsklasse])).toEqual([
      ['true', 'true', '1a'], ['true', 'false', '1b'], ['false', 'true', '2'], ['false', 'false', '3'],
    ]);
    expect(t.rows.map((r) => r.values.versuchsklasse)).toEqual(enumValues('DIN-18130-1-01 versuchsklasse'));
    expect(t.rows[1].values.fussnote).toContain('kann aber angenommen werden, daß die Strömung stationär ist.');
    expect(t.rows.filter((r) => r.values.fussnote === null)).toHaveLength(3);
    expect(TAB4_KLASSEN).toHaveLength(4);
    expect(prior['DIN-18130-1-02 saettigung_aufgebracht'].data_type).toBe('boolean'); // String(true) = 'true' matches the key token
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TAB5 (L540–L551): 15 (bodenart, anordnung) rows whose Bauteil mark is printed on the row itself; anordnung = prod versuchsanordnung tokens; the three multirow-covered sub-rows are NOT seeded (U-1); imported_unverified', () => {
    const t = tab5AsTable();
    expect(t.key_columns).toEqual(['bodenart', 'anordnung']);
    expect(t.rows).toHaveLength(15);
    expect(TAB5_BODENARTEN.map((b) => b.value)).toEqual(['ton_schluff', 'feinsand', 'mittel_grobsand', 'sand_kies', 'sand_ton', 'kies_sand_ton']);
    expect([...TAB5_ANORDNUNGEN].sort()).toEqual([...enumValues('DIN-18130-1-02 versuchsanordnung')].sort());
    for (const r of t.rows) expect(enumValues('DIN-18130-1-02 versuchsanordnung')).toContain(r.keys.anordnung);
    const row = (k: string) => t.rows.find((r) => r.row_key === k)!.values;
    // L540 Ton/Schluff Klasse 3 — ZY marked "x" on the row; (X) Meßzylinder, (X) SB, no U0
    expect(row('ton_schluff|ZY')).toEqual({ erreichbare_klasse: '3', geeignet: 'geeignet', ms: 'geeignet', es: 'geeignet', de: 'geeignet', mz: 'bedingt geeignet', st: 'geeignet', kp: 'nicht geeignet', sb: 'bedingt geeignet', u0: 'nicht geeignet' });
    // L543 Feinsand Klasse 2 (ZY X, KD -) and L544 Feinsand "2 (1)" (TX X, SB X, U0 X)
    expect(row('feinsand|ZY')).toEqual({ erreichbare_klasse: '2', geeignet: 'geeignet', ms: 'geeignet', es: 'geeignet', de: 'nicht geeignet', mz: 'geeignet', st: 'geeignet', kp: 'nicht geeignet', sb: 'nicht geeignet', u0: 'nicht geeignet' });
    expect(row('feinsand|KD')).toEqual({ erreichbare_klasse: null, geeignet: 'nicht geeignet', ms: null, es: null, de: null, mz: null, st: null, kp: null, sb: null, u0: null });
    expect(row('feinsand|TX')).toEqual({ erreichbare_klasse: '2 (1)', geeignet: 'geeignet', ms: 'nicht geeignet', es: 'nicht geeignet', de: 'geeignet', mz: 'geeignet', st: 'nicht geeignet', kp: 'nicht geeignet', sb: 'geeignet', u0: 'geeignet' });
    // L545 / L546: single rows, KD and TX printed "-"
    expect(row('mittel_grobsand|KD').geeignet).toBe('nicht geeignet');
    expect(row('mittel_grobsand|TX').geeignet).toBe('nicht geeignet');
    expect(row('sand_kies|ZY')).toEqual({ erreichbare_klasse: '2', geeignet: 'geeignet', ms: 'geeignet', es: 'bedingt geeignet', de: 'nicht geeignet', mz: 'geeignet', st: 'bedingt geeignet', kp: 'nicht geeignet', sb: 'nicht geeignet', u0: 'nicht geeignet' });
    // L547 Sand-Ton Klasse 2 (ZY X on the row) and L548 Klasse 3 with its own "x" in the KD cell
    expect(row('sand_ton|ZY').erreichbare_klasse).toBe('2');
    expect(row('sand_ton|KD')).toEqual({ erreichbare_klasse: '3', geeignet: 'geeignet', ms: 'nicht geeignet', es: 'geeignet', de: 'nicht geeignet', mz: 'nicht geeignet', st: 'geeignet', kp: 'nicht geeignet', sb: 'geeignet', u0: 'nicht geeignet' });
    // L550 / L551 Kies-Sand-Ton: ZY X (KD -), TX "x" with (X) Meßzylinder, Kapillare x, SB X, U0 x
    expect(row('kies_sand_ton|KD').geeignet).toBe('nicht geeignet');
    expect(row('kies_sand_ton|TX')).toEqual({ erreichbare_klasse: '1', geeignet: 'geeignet', ms: 'nicht geeignet', es: 'nicht geeignet', de: 'geeignet', mz: 'bedingt geeignet', st: 'nicht geeignet', kp: 'geeignet', sb: 'geeignet', u0: 'geeignet' });
    // NOT seeded: the sub-rows whose Bauteil cell is a multirow span from the line above (U-1)
    expect(TAB5_UNSEEDED.map((u) => `${u.bodenart}|${u.anordnung}`)).toEqual(['ton_schluff|KD', 'ton_schluff|TX', 'sand_ton|TX']);
    for (const u of TAB5_UNSEEDED) expect(t.rows.find((r) => r.row_key === `${u.bodenart}|${u.anordnung}`)).toBeUndefined();
    expect(t.rows.find((r) => r.row_key === 'ton_schluff|ZY')!.verbatim_quote).toContain('\\multirow{3}{*}{x} & \\multirow[b]{3}{*}{X}');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.verification_status).toBe('imported_unverified');
    // every enum value column offers the three printed legend states (L553–L555)
    for (const c of t.value_columns.filter((c) => c.type === 'enum')) expect(c.values).toEqual(['geeignet', 'bedingt geeignet', 'nicht geeignet']);
  });

  it('S5_8 / S5_8_KORN (L336 / L335): A ≥ 10 cm² bindig · 20 cm² grobkörnig; 1 : 5 ungleichförmig · 1 : 10 gleichförmig keyed on the prod boolean; anhaltswert ("sollte … nicht unterschreiten")', () => {
    const a = s58AsTable();
    expect(a.rows.map((r) => [r.keys.bodenklasse, r.values.a_min_cm2])).toEqual([['bindig', 10], ['grobkoernig', 20]]);
    expect(S5_8_BODENKLASSEN.map((b) => b.value)).toEqual(['bindig', 'grobkoernig']);
    expect(a.override_policy).toBe('anhaltswert');
    expect(a.verification_status).toBe('md_verified');
    const k = s58KornAsTable();
    expect(k.rows.map((r) => [r.keys.ungleichfoermig, r.values.verhaeltnis])).toEqual([['true', '1 : 5'], ['false', '1 : 10']]);
    expect(S5_8_KORN.map((r) => r.value)).toEqual(['true', 'false']);
    expect(prior['DIN-18130-1-01 ungleichfoermig'].data_type).toBe('boolean');
    expect(k.override_quote).toContain('nicht unterschreiten');
    expect(k.verification_status).toBe('md_verified');
  });

  it('the fallback lookup resolves two-key rows positionally (TAB4, TAB5) and the single-key tables', () => {
    const table = makeTableLookup(STD);
    expect(table('TAB4', ['true', 'false'])?.versuchsklasse).toBe('1b');
    expect(table('TAB4', ['false', 'true'])?.versuchsklasse).toBe('2');
    expect(table('TAB5', ['feinsand', 'TX'])?.erreichbare_klasse).toBe('2 (1)');
    expect(table('TAB5', ['ton_schluff', 'KD'])).toBeUndefined(); // U-1: no row until the PDF check
    expect(table('TAB3', ['e090'])?.u_0_kn_m2).toBe(600);
    expect(table('S5_8', ['grobkoernig'])?.a_min_cm2).toBe(20);
    expect(table('S5_8_KORN', ['true'])?.verhaeltnis).toBe('1 : 5');
    expect(table('TAB1', ['3'])?.bereich).toBe('durchlässig');
    expect(table('TAB2', ['20'])?.alpha).toBe(0.771);
  });
});
