/**
 * Plan 3 Task 17 — DIN-1989-2 seed tables: shape pins, key-token pins against the
 * captured prod enums (G-A3), the printed values read from the transcript in
 * this session (line in the comment), and the header-image cell that keeps
 * Tab. 1 `imported_unverified` (sign-off din1989_2-U-1).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  tab1AsTable, tab2AsTable, tab3AsTable, tab4AsTable, tab5AsTable, din19892SeedTables,
  TAB1_FILTERART, TAB1_SEDIMENTATIONSVOLUMEN, TAB2_STUFEN, TAB3_PRUEFSTOFFE, TAB4_KORNKLASSEN, TAB5_WPK, DIN1989_2_EDITION,
} from '../regulation-tables-seed-din1989_2';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DIN-1989-2';
const ROOT = join(__dirname, '..', '..', '..', '..');
const prior = JSON.parse(readFileSync(join(ROOT, 'src/lib/eval/field-configs/din1989_2.prior.json'), 'utf8')) as Record<string, { enum_values?: Array<{ value: string }> | null }>;
const enumValues = (key: string): string[] => (prior[key].enum_values ?? []).map((e) => e.value);

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
  expect(t.edition).toBe(DIN1989_2_EDITION);
}

describe('DIN-1989-2 Plan-3 seed tables', () => {
  it('five tables in the live set; registered as SEED_BUILDERS.din1989_2 (ts 20260917101700); the fallback resolves each', () => {
    const tables = din19892SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TAB1', 'TAB2', 'TAB3', 'TAB4', 'TAB5']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.din1989_2).toEqual({ build: din19892SeedTables, ts: '20260917101700', slugFile: 'din1989_2' });
    expect(liveSeedSlugs()).toContain('din1989_2');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(DIN1989_2_EDITION).toBe('2004'); // prod standards.version "2004 (DIN 1989-2)" — the title page prints no date (I-1)
  });

  it('TAB1 (L273–L274): 5 rows (the printed "-" cell is not a row) keyed by the prod funktionsprinzip tokens × gross/klein/keines; typ = prod filtertyp tokens; locked; header image ⇒ imported_unverified (U-1)', () => {
    const t = tab1AsTable();
    expect([...TAB1_FILTERART]).toEqual(enumValues('DIN-1989-2-01 funktionsprinzip'));
    expect(t.key_columns).toEqual(['filterart', 'sedimentationsvolumen']);
    expect(t.rows.map((r) => [r.keys.filterart, r.keys.sedimentationsvolumen, r.values.typ, r.values.typ_gedruckt])).toEqual([
      ['fremdstoffrueckhalt', 'gross', 'typ_a', 'TYP A'],
      ['fremdstoffrueckhalt', 'klein', 'typ_b', 'TYP B'],
      ['fremdstoffableitung', 'gross', 'typ_a', 'TYP A'],
      ['fremdstoffableitung', 'klein', 'typ_b', 'TYP B'],
      ['fremdstoffableitung', 'keines', 'typ_c', 'TYP C'],
    ]);
    expect(t.rows.find((r) => r.row_key === 'fremdstoffrueckhalt|keines')).toBeUndefined();
    for (const r of t.rows) expect(enumValues('DIN-1989-2-01 filtertyp')).toContain(r.values.typ);
    for (const r of t.rows) expect([...TAB1_SEDIMENTATIONSVOLUMEN]).toContain(r.keys.sedimentationsvolumen);
    expect(t.rows[0].verbatim_quote).toBe(t.rows[1].verbatim_quote); // one printed row (L273) carries both Rückhalt types
    expect(t.rows[0].verbatim_quote).toContain('& TYP A & TYP B & - \\\\');
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('sind Filter den in Tabelle 1 aufgeführten Typen zuzuordnen');
    expect(t.verification_status).toBe('imported_unverified');
    // two-key lookup resolves positionally through the fallback registry
    expect(makeTableLookup(STD)('TAB1', ['fremdstoffableitung', 'keines'])?.typ).toBe('typ_c');
    expect(makeTableLookup(STD)('TAB1', ['fremdstoffrueckhalt', 'keines'])).toBeUndefined();
  });

  it('TAB2 (L495–L501): 7 steps 100/50/20/10/5/2,5/1 % with 2/2/3/4/8/8/8 min; locked; md_verified', () => {
    const t = tab2AsTable();
    expect(t.rows.map((r) => [r.keys.stufe, r.values.q_pct, r.values.pruefzeit_min])).toEqual([
      ['p100', 100, 2], ['p50', 50, 2], ['p20', 20, 3], ['p10', 10, 4], ['p5', 5, 8], ['p2_5', 2.5, 8], ['p1', 1, 8],
    ]);
    expect(t.rows.map((r) => r.keys.stufe)).toEqual(TAB2_STUFEN.map((s) => s.value));
    expect(t.rows[5].label_de).toBe('2,5 % Q_Zu,max');
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('über eine jeweils festgelegte Dauer angeströmt');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TAB3 (L572–L588): LDPE 15 Stück / 150 g / 0,15 g/l (footnote a: 10 g/Stück), PP 150 g (75 + 75) / 0,15, Quarzsand 200 g / 0,20; Σ 0,50 g/l; locked; md_verified', () => {
    const t = tab3AsTable();
    expect(t.rows.map((r) => [r.keys.pruefstoff, r.values.stueck, r.values.masse_g, r.values.konzentration_g_l])).toEqual([
      ['ldpe_folie', 15, 150, 0.15], ['pp_kugeln', null, 150, 0.15], ['quarzsand', null, 200, 0.2],
    ]);
    expect(t.rows.map((r) => r.keys.pruefstoff)).toEqual(TAB3_PRUEFSTOFFE.map((p) => p.value));
    expect(t.rows.reduce((s, r) => s + (r.values.konzentration_g_l as number), 0)).toBeCloseTo(0.5, 12);
    expect(t.rows.reduce((s, r) => s + (r.values.masse_g as number), 0)).toBe(500);
    expect(t.rows[0].values.fussnote).toBe('a Die LDPE-Folie geht fiktiv mit 10 g/Stück in die Massenbilanz ein.');
    expect(15 * 10).toBe(t.rows[0].values.masse_g); // the fictitious 10 g/Stück × 15 Stück = the printed 150 g
    expect(t.rows[0].verbatim_quote).toContain('$150{ }^{\\text {a }}$'); // the `${ }` token survives String.raw
    expect(t.rows[1].values.masse_anteile).toBe('75 (d = 3,5 mm) / 75 (d = 2 mm)');
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TAB4 (L606–L607): 125–250 µm → 0 %, > 250 µm → 100 %; locked; md_verified', () => {
    const t = tab4AsTable();
    expect(t.rows.map((r) => [r.keys.kornklasse, r.values.anteil_pct, r.values.kornklasse_gedruckt])).toEqual([['k125_250', 0, '125 bis 250'], ['gt250', 100, '> 250']]);
    expect(t.rows.map((r) => r.keys.kornklasse)).toEqual(TAB4_KORNKLASSEN.map((k) => k.value));
    expect(t.verification_status).toBe('md_verified');
    expect(t.override_policy).toBe('locked');
  });

  it('TAB5 (L735–L736): Werkstoff / Maße with the printed Anforderung, Prüfung and Häufigkeit cells; locked; md_verified', () => {
    const t = tab5AsTable();
    expect(t.rows.map((r) => [r.keys.merkmal, r.values.anforderung_nach, r.values.pruefung, r.values.haeufigkeit])).toEqual([
      ['werkstoff', 'Abschnitt 5', 'Inaugenscheinnahme des Lieferscheines', 'Jede Anlieferung'],
      ['masse', 'Herstellerunterlagen', 'Vergleich mit Erstprüfstück', 'Halbjährlich an einem Prüfstück'],
    ]);
    expect(t.rows.map((r) => r.keys.merkmal)).toEqual(TAB5_WPK.map((w) => w.value));
    expect(t.override_quote).toBe('Der Mindestumfang der durchzuführenden Prüfungen und Kontrollen muss Tabelle 5 entsprechen.');
    expect(t.verification_status).toBe('md_verified');
  });
});
