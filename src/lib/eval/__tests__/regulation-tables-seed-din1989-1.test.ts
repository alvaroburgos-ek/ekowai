/**
 * Plan 3 Task 2 — DIN-1989-1 seed tables: shape pins, key-token pins against the
 * captured prod enums (G-A3), the printed values read from the transcript in
 * this session (line in the comment), and the OCR/unreadable cells that keep
 * three tables `imported_unverified` (sign-off din1989_1-U-1 … U-4).
 */
import { describe, it, expect } from 'vitest';
import {
  tab1AsTable, tab2AsTable, tab3AsTable, tab4PersonAsTable, tab4WaschmaschineAsTable, tab4FlaecheAsTable, tab5AsTable,
  din19891SeedTables, TAB3_AUFFANGFLAECHEN_ART, TAB4_VERBRAUCHER, TAB4_BEWAESSERUNG, TAB5_ANLAGENTEILE, DIN1989_1_EDITION,
} from '../regulation-tables-seed-din1989_1';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DIN-1989-1';

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
  expect(t.edition).toBe(DIN1989_1_EDITION);
}

describe('DIN-1989-1 Plan-3 seed tables', () => {
  it('seven tables in the live set; registered as SEED_BUILDERS.din1989_1 (ts 20260917100200); the fallback resolves each', () => {
    const tables = din19891SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TAB3', 'TAB4_PERSON', 'TAB4_WASCHMASCHINE', 'TAB4_FLAECHE', 'TAB1', 'TAB2', 'TAB5']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.din1989_1).toEqual({ build: din19891SeedTables, ts: '20260917100200', slugFile: 'din1989_1' });
    expect(liveSeedSlugs()).toContain('din1989_1');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
  });

  it('TAB3 (L837–L843): 7 rows keyed by the prod auffangflaechen_art tokens, e as printed; anhaltswert; md_verified', () => {
    const t = tab3AsTable();
    expect(t.rows.map((r) => r.keys.auffangflaechen_art)).toEqual([...TAB3_AUFFANGFLAECHEN_ART]);
    expect(t.rows.map((r) => r.values.e)).toEqual([0.8, 0.8, 0.6, 0.3, 0.5, 0.5, 0.8]);
    expect(t.rows.map((r) => r.label_de)).toEqual(['geneigtes Hartdach', 'Flachdach unbekiest', 'Flachdach bekiest', 'Gründach intensiv', 'Gründach extensiv', 'Pflasterfläche/Verbundpflasterfläche', 'Asphaltbelag']);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('können die Werte nach Tabelle 3 verwendet werden');
    expect(t.override_quote).toContain('Abweichungen je nach Saugfähigkeit und Rauheit');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TAB4_PERSON (L881–L883): 24 / 12 / 6 l/(Person·d); the two "V" cells keep the table imported_unverified (U-1)', () => {
    const t = tab4PersonAsTable();
    expect(t.rows.map((r) => [r.keys.verbraucher_typ, r.values.p_d])).toEqual([['toilette_haushalt', 24], ['toilette_buero', 12], ['toilette_schule', 6]]);
    expect(t.rows.map((r) => r.keys.verbraucher_typ)).toEqual(TAB4_VERBRAUCHER.map((v) => v.value));
    expect(t.rows[1].verbatim_quote).toContain('12 \\mathrm{~V} /'); // printed "V" (OCR) — encoded as l
    expect(t.rows[2].verbatim_quote).toContain('6 \\mathrm{~V} /');
    expect(t.verification_status).toBe('imported_unverified');
    expect(t.override_policy).toBe('anhaltswert');
  });

  it('TAB4_WASCHMASCHINE (L892): one row, +10 l per person and day; md_verified', () => {
    const t = tab4WaschmaschineAsTable();
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0].keys).toEqual({ zusatz: 'waschmaschine' });
    expect(t.rows[0].values.p_d_zusatz).toBe(10);
    expect(t.verification_status).toBe('md_verified');
  });

  it('TAB4_FLAECHE (L884–L890): garten 60, sportanlage 200, Grünland ranges 100–200 / 80–150 (SR-2, J-1); merged OCR row keeps it imported_unverified (U-2)', () => {
    const t = tab4FlaecheAsTable();
    expect(t.rows.map((r) => [r.keys.bewaesserungs_typ, r.values.bs_a_min, r.values.bs_a_max])).toEqual([
      ['garten', 60, 60], ['sportanlage', 200, 200], ['gruenland_leicht', 100, 200], ['gruenland_schwer', 80, 150],
    ]);
    expect(t.rows.map((r) => r.keys.bewaesserungs_typ)).toEqual(TAB4_BEWAESSERUNG.map((v) => v.value));
    expect(t.rows[2].verbatim_quote).toBe(t.rows[3].verbatim_quote); // the two Grünland rows are ONE printed (merged) span
    expect(t.verification_status).toBe('imported_unverified');
  });

  it('TAB1 (L470–L478): 6 rows keyed by the prod belastungsklasse tokens; DIN EN 124 cover per class; class 6 null; locked; blank class numbers 2/3/4 keep it imported_unverified (U-3)', () => {
    const t = tab1AsTable();
    expect(t.rows.map((r) => r.keys.belastungsklasse)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(t.rows.map((r) => r.values.abdeckung_din_en_124)).toEqual(['A 15', 'B 125', 'D 400', 'D 400', 'D 400', null]);
    expect(t.rows.map((r) => r.values.bezeichnung)).toEqual(['begehbar', 'PKW - befahrbar', 'LKW 12 - befahrbar', 'SLW 30 - befahrbar', 'SLW 60 - befahrbar', 'Sonderlasten nach Angabe des AG']);
    expect(t.value_columns.map((c) => c.name)).toEqual(['bezeichnung', 'verkehrslast_beispiele', 'abdeckung_din_en_124']); // no numeric column: header prints no unit (J-4)
    expect(t.rows[1].verbatim_quote).toContain('\\multirow{2}{*}{} &'); // the class number cell is printed EMPTY
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('imported_unverified');
  });

  it('TAB2 (L493–L496): (aufstellung, groesse_band) → minimum opening 200 / 600 / 600 / 600 mm; Dom widening ≥ 800 on the last row; locked; "I" for "l" keeps it imported_unverified (U-4)', () => {
    const t = tab2AsTable();
    expect(t.key_columns).toEqual(['aufstellung', 'groesse_band']);
    expect(t.rows.map((r) => [r.row_key, r.values.oeffnung_min_mm, r.values.dom_aufweitung_min_mm])).toEqual([
      ['oberirdisch|le3000', 200, null], ['oberirdisch|gt3000', 600, null], ['unterirdisch|dom_le450', 600, null], ['unterirdisch|dom_gt450', 600, 800],
    ]);
    expect(t.rows[0].verbatim_quote).toContain('3000$ I Einzelvolumen'); // printed "I" (OCR) — read as litre
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('nicht unterschreiten');
    expect(t.verification_status).toBe('imported_unverified');
    // the two-key positional lookup the register's derived column uses
    const lookup = makeTableLookup(STD);
    expect(lookup('TAB2', ['oberirdisch', 'le3000'])?.oeffnung_min_mm).toBe(200);
    expect(lookup('TAB2', ['unterirdisch', 'dom_gt450'])?.oeffnung_min_mm).toBe(600);
    expect(lookup('TAB2', ['keller', 'le3000'])).toBeUndefined(); // no Tab. 2 row for a basement tank
  });

  it('TAB5 (L1002–L1056): 17 Anlagenteil rows with inspection + maintenance intervals as printed; Hebeanlage carries the three footnoted intervals in one cell (J-2); anhaltswert (L1067); imported_unverified (U-6: truncated L1030 cell)', () => {
    const t = tab5AsTable();
    expect(t.rows).toHaveLength(17);
    expect(t.rows.map((r) => r.keys.anlagenteil)).toEqual(TAB5_ANLAGENTEILE.map((a) => a.value));
    const by = (k: string) => t.rows.find((r) => r.row_key === k)!.values;
    expect(by('dachablaeufe')).toMatchObject({ inspektion_intervall: '6 Monate', wartung_intervall: null });
    expect(by('filtersysteme')).toMatchObject({ inspektion_intervall: '1 Jahr', wartung_intervall: '1 Jahr' });
    expect(by('regenwasserspeicher')).toMatchObject({ inspektion_intervall: '1 Jahr', wartung_intervall: '≈ 10 Jahre' });
    expect(by('wasserzaehler')).toMatchObject({ inspektion_intervall: '1 Jahr', wartung_intervall: '6 Jahre' });
    expect(by('rueckstauverschluesse')).toMatchObject({ inspektion_intervall: '1 Monat', wartung_intervall: '6 Monate' });
    expect(by('abwasserhebeanlage')).toMatchObject({ inspektion_intervall: '1 Monat', wartung_intervall: '3 Monate (b) / 6 Monate (c) / 1 Jahr (d)' });
    expect(by('abwasserhebeanlage').hinweis).toContain('in gewerblichen Betrieben');
    expect(t.rows.filter((r) => r.values.wartung_intervall != null)).toHaveLength(7); // Filter, Speicher, Pumpe, Steuerung, Wasserzähler, Rückstauverschlüsse, Hebeanlage
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe('Längere oder kürzere Zeitintervalle können sich durch spezielle anlagen- und betriebstechnische Randbedingungen ergeben.');
    expect(by('systemsteuerung').wartung_umfang).toMatch(/\(Magnetventil$/); // printed truncated (U-6)
    expect(t.verification_status).toBe('imported_unverified');
  });

  it('a row cell named `e` is the Tab. 3 cell, never Euler’s number: an empty cell yields null in row scope (evaluator shadowing pin)', async () => {
    const { evalValue, parseExpression } = await import('@/lib/expr');
    const node = parseExpression('a_a * e')!;
    const scope = { symbol: () => undefined, table: makeTableLookup(STD) };
    expect(evalValue(node, scope, { a_a: 100, e: 0.8 })).toBeCloseTo(80, 9);
    // a null cell is a MISSING input (recoverable → null derived cell), never the constant 2,718…
    expect(() => evalValue(node, scope, { a_a: 100, e: null })).toThrow(/Unbekanntes Symbol "e"|keine Zahl/);
  });
});
