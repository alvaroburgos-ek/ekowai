/**
 * Plan 3 Task 5 — DWA-M-1200-1 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the real `evaluateFormula` over rows prepared by the
 * register contract (Tab. 7 / Tab. 8 / Tab. 23 cells looked up from the seeded
 * tables — the TS fallback, no migration applied). Enum cells and enum scalars
 * reach the formulas as strings (controller amendment D).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/m1200_1';
import { FIELD_CONFIGS } from '../field-configs/m1200_1';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-M-1200-1';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[], symbol?: (s: string) => Value | undefined) => {
  const c = cfg(ws, sym);
  return prepareRegisterRows({ rows }, c.columns, { table, tableRows, symbol }, {});
};
const run = (n: string, opts: { inputs?: Array<{ symbol: string; value: number | string | null; unit: string | null }>; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };

/** Worksheet scope of M12001-09 for a class: the Tab.-8 limit fills resolved from the seeded table (what the lookup_fill widgets store). */
const limitsFor = (klasse: string, aerosol = true, weide = true) => {
  const row = table('TAB8', [klasse])!;
  const m: Record<string, Value> = {
    e_coli_limit: row.e_coli_max, enterokokken_limit: row.enterokokken_max, bsb5_limit: row.bsb5_max, afs_limit: row.afs_max, truebung_limit: row.truebung_max,
    legionella_limit: aerosol ? row.legionella_max : null, nematoden_limit: weide ? row.nematoden_max : null,
  };
  return (s: string) => (s in m ? (m[s] as Value) : undefined);
};

describe('DWA-M-1200-1 Plan-3 equations', () => {
  it('eight entries; every output is a created field of the register worksheet; no prod producer duplicated (EQ-001 risikoniveau_ausgangs); emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual(['M12001-08-D1', 'M12001-07-D1', 'M12001-07-D2', 'M12001-14-D1', 'M12001-16-D1', 'M12001-16-D2', 'M12001-09-D1', 'M12001-09-D2']);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.worksheet} ${e.output_symbol}`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(e.output_symbol).not.toBe('risikoniveau_ausgangs'); // prod EQ-001 (id 978ac484-…) stays the only producer of that symbol (m1200_1-R-1)
    }
    expect(new Set(EQUATIONS.map((e) => `${e.worksheet} ${e.output_symbol}`)).size).toBe(EQUATIONS.length);
    expect(() => emitEquationsSql('m1200_1', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('m1200_1', EQUATIONS);
    const files = equationFilesFor('m1200_1', '20260917100520');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(8);
  });

  it('M12001-08-D1 over kulturen_tab7: rank per Tab.-7 row, the strictest (smallest rank) wins — C-1 + D ⇒ 4 (C-1), A + D ⇒ 1; the C-1 lactating-cattle conflict is flagged; empty ⇒ manual_required', () => {
    const reg = prep('M12001-08', 'kulturen_tab7', [{ id: '1', label: 'Hopfen (Tropf)', klasse_sub: 'C-1', laktierend: false }, { id: '2', label: 'Energiemais', klasse_sub: 'D', laktierend: false }]);
    expect(reg.rows.map((r) => [r.values.klasse_rank, r.values.laktierend_konflikt, r.complete])).toEqual([[4, 0, true], [6, 0, true]]);
    expect(reg.rows[0].values.methode).toContain('Tropfbewässerung oder eine andere');           // L1040
    expect(String(reg.rows[0].values.karenzzeit)).toContain('bis maximal 5 Tage vor dem Schnitt'); // L1038
    expect(computed(run('M12001-08-D1', { registers: { kulturen_tab7: reg } }))).toBe(4);
    const withA = prep('M12001-08', 'kulturen_tab7', [{ id: '1', label: 'Karotten', klasse_sub: 'A', laktierend: false }, { id: '2', label: 'Energiemais', klasse_sub: 'D', laktierend: false }]);
    expect(computed(run('M12001-08-D1', { registers: { kulturen_tab7: withA } }))).toBe(1); // "gelten die Anforderungen der strengsten Kategorie" (L918)
    const lakt = prep('M12001-08', 'kulturen_tab7', [{ id: '1', label: 'Weide', klasse_sub: 'C-1', laktierend: true }, { id: '2', label: 'Weide', klasse_sub: 'B-1', laktierend: true }]);
    expect(lakt.rows.map((r) => r.values.laktierend_konflikt)).toEqual([1, 0]); // L1053: class C excludes lactating cattle; B-1 requires drying (L1006), not exclusion
    expect(run('M12001-08-D1', { registers: { kulturen_tab7: prep('M12001-08', 'kulturen_tab7', []) } }).kind).toBe('manual_required');
    const incomplete = prep('M12001-08', 'kulturen_tab7', [{ id: '1', label: 'x', klasse_sub: 'B-2' }, { id: '2', label: '' , klasse_sub: 'A' }]);
    expect(incomplete.rows.map((r) => r.complete)).toEqual([true, false]);
    expect(computed(run('M12001-08-D1', { registers: { kulturen_tab7: incomplete } }))).toBe(3); // the incomplete A row does not count
  });

  it('M12001-07-D1 / -D2 over risiko_zeilen: Tab. 23 per row (D×4 = Hoch = 4, A×1 = Sehr niedrig = 1), Vorsorgemaßnahmen only from moderat, residual risk from the second assessment, max over rows', () => {
    const rows = [
      { id: '1', gefahr: 'mikrobiologisch', schutzgut: 'M-1', exposition: 'hoch', schadensausmass: '4', wahrscheinlichkeit: 'D', massnahmen: 'Filtration + Desinfektion', rest_schaden: '2', rest_wahrsch: 'B' }, // L2055: D × 4 → Hoch; residual B × 2 → Niedrig (L2053)
      { id: '2', gefahr: 'salze', schutzgut: 'B', exposition: 'hoch', schadensausmass: '1', wahrscheinlichkeit: 'A' },                                                                                        // L2052: A × 1 → Sehr niedrig; no measures needed (L2061)
    ];
    const reg = prep('M12001-07', 'risiko_zeilen', rows);
    expect(reg.rows.map((r) => [r.values.ausgangsrisiko, r.values.ausgangsrisiko_code, r.values.restrisiko_code, r.complete])).toEqual([['hoch', 4, 2, true], ['sehr_niedrig', 1, 1, true]]);
    expect(reg.rows[0].values.expositionsweg).toBe('Wasser - PflanzeMensch'); // TAB18 M-1 (L1891)
    expect(computed(run('M12001-07-D2', { registers: { risiko_zeilen: reg } }))).toBe(4);
    expect(computed(run('M12001-07-D1', { registers: { risiko_zeilen: reg } }))).toBe(2);
    // a moderat/hoch row without the second assessment is INCOMPLETE (measures + residual are required once visible) and does not count
    const open = prep('M12001-07', 'risiko_zeilen', [rows[1], { id: '3', gefahr: 'pfas', schutzgut: 'G', exposition: 'mittel', schadensausmass: '3', wahrscheinlichkeit: 'C' }]); // C × 3 → Moderat (L2054)
    expect(open.rows.map((r) => [r.values.ausgangsrisiko_code, r.complete])).toEqual([[1, true], [3, false]]);
    expect(computed(run('M12001-07-D2', { registers: { risiko_zeilen: open } }))).toBe(1);
    // a residual assessment that stays high is carried as such (never silently lowered): E × 5 → 5, residual D × 3 → Hoch = 4
    const high = prep('M12001-07', 'risiko_zeilen', [{ id: '1', gefahr: 'schwermetalle', schutzgut: 'K', exposition: 'hoch', schadensausmass: '5', wahrscheinlichkeit: 'E', massnahmen: 'x', rest_schaden: '3', rest_wahrsch: 'D' }]);
    expect(computed(run('M12001-07-D1', { registers: { risiko_zeilen: high } }))).toBe(4);
    expect(run('M12001-07-D1', { registers: { risiko_zeilen: prep('M12001-07', 'risiko_zeilen', []) } }).kind).toBe('manual_required');
  });

  it('M12001-14-D1 over stoerfaelle: Tab. 23 per event, max over rows (B × 5 = Hoch = 4, C × 2 = Niedrig = 2)', () => {
    const reg = prep('M12001-14', 'stoerfaelle', [
      { id: '1', teilelement: 'AWT-1', ereignis: 'Ausfall der Desinfektion', schadensausmass: '5', wahrscheinlichkeit: 'B' }, // L2053: B × 5 → Hoch
      { id: '2', teilelement: 'S-1', ereignis: 'Undichtheit Speicher', schadensausmass: '2', wahrscheinlichkeit: 'C' },      // L2054: C × 2 → Niedrig
    ]);
    expect(reg.rows.map((r) => [r.values.risiko, r.values.risiko_code, r.complete])).toEqual([['hoch', 4, true], ['niedrig', 2, true]]);
    expect(computed(run('M12001-14-D1', { registers: { stoerfaelle: reg } }))).toBe(4);
  });

  it('M12001-16-D1 / -D2 over flaechenverzeichnis: count of complete areas and Σ volume (3 + 2 areas, 12.000 + 8.000 m³/a)', () => {
    const reg = prep('M12001-16', 'flaechenverzeichnis', [
      { id: '1', flaeche: 'Flurstück 12', flaeche_ha: 3, kultur: 'Hopfen', klasse_sub: 'C-1', methode: 'Tropfbewässerung', menge_m3: 12000 },
      { id: '2', flaeche: 'Flurstück 13', flaeche_ha: 2, kultur: 'Energiemais', klasse_sub: 'D', methode: 'Beregnung', menge_m3: 8000 },
      { id: '3', flaeche: 'Flurstück 14', kultur: 'Zuckerrüben', klasse_sub: 'D', methode: 'Beregnung' }, // no volume → incomplete
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(reg.rows[0].values.methode_zulaessig).toContain('Tropfbewässerung oder eine andere'); // L1040
    expect(computed(run('M12001-16-D1', { registers: { flaechenverzeichnis: reg } }))).toBe(2);
    expect(computed(run('M12001-16-D2', { registers: { flaechenverzeichnis: reg } }))).toBe(20000);
    expect(computed(run('M12001-16-D1', { registers: { flaechenverzeichnis: prep('M12001-16', 'flaechenverzeichnis', []) } }))).toBe(0); // count_rows over an empty register is 0
  });

  it('M12001-09-D1 over routineproben: limits from the class (row scope), Legionella strict "<", no-limit samples excluded, 3 of 4 = 75 %; no relevant sample ⇒ manual_required', () => {
    const A = limitsFor('A');
    const samples = [
      { id: '1', date: '2026-05-01', parameter: 'e_coli', wert: 10 },       // A: ≤ 10 → ok (L1156)
      { id: '2', date: '2026-05-08', parameter: 'e_coli', wert: 11 },       // exceeds
      { id: '3', date: '2026-05-08', parameter: 'legionella', wert: 1000 }, // "<1.000" strict → NOT ok (L1157)
      { id: '4', date: '2026-05-15', parameter: 'truebung', wert: 2 },      // ≤ 2 → ok (L1159)
    ];
    const reg = prep('M12001-09', 'routineproben', samples, A);
    expect(reg.rows.map((r) => [r.values.limit, r.values.relevant, r.values.ok, r.complete])).toEqual([[10, 1, 1, true], [10, 1, 0, true], [1000, 1, 0, true], [2, 1, 1, true]]);
    expect(computed(run('M12001-09-D1', { registers: { routineproben: reg } }))).toBe(50);
    // class D: Enterokokken and Trübung print "–" → those samples are not relevant; E. coli ≤ 10.000
    const D = limitsFor('D');
    const regD = prep('M12001-09', 'routineproben', [{ id: '1', date: '2026-06-01', parameter: 'e_coli', wert: 9000 }, { id: '2', date: '2026-06-01', parameter: 'enterokokken', wert: 500 }, { id: '3', date: '2026-06-01', parameter: 'truebung', wert: 9 }], D);
    expect(regD.rows.map((r) => [r.values.limit, r.values.relevant, r.values.ok])).toEqual([[10000, 1, 1], [null, 0, 0], [null, 0, 0]]);
    expect(computed(run('M12001-09-D1', { registers: { routineproben: regD } }))).toBe(100);
    // a hidden legionella_limit (no aerosol risk) makes a Legionella sample non-relevant; 3 of 4 → 75
    const noAerosol = prep('M12001-09', 'routineproben', [...samples, { id: '5', date: '2026-05-22', parameter: 'afs', wert: 4 }], limitsFor('A', false));
    expect(noAerosol.rows[2].values.relevant).toBe(0);
    expect(computed(run('M12001-09-D1', { registers: { routineproben: noAerosol } }))).toBe(75);
    // only non-relevant samples → "Division durch Null" → manual_required, never a silent 0 or 100
    const none = prep('M12001-09', 'routineproben', [{ id: '1', date: '2026-06-01', parameter: 'enterokokken', wert: 5 }], D);
    expect(run('M12001-09-D1', { registers: { routineproben: none } }).kind).toBe('manual_required');
    expect(run('M12001-09-D1', { registers: { routineproben: prep('M12001-09', 'routineproben', [], A) } }).kind).toBe('manual_required');
  });

  it('M12001-09-D2: the Tab.-19 category-3 screening value 100 ng/l (scalar, no inputs)', () => {
    expect(computed(run('M12001-09-D2', {}))).toBe(100);
    expect(eq('M12001-09-D2').input_symbols).toEqual([]);
  });
});
