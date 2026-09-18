/**
 * Plan 3 Task 11 — DWA-M-205 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * through the real `evaluateFormula` over rows prepared by the register contract
 * (TS fallback tables, no migration applied): the Tab. 1 / 2 / 3 targets per row,
 * the printed §4.3.2 factor 500, the §4.3.3.2 O2 factor 10, the Tab.-5 Straubing
 * membrane figure (300 m² × 50 l/(m²·h) = 15 m³/h), the §4.1.3.3 sensor rule and
 * the §4.4.2 dose ranges. The standard prints no worked dose / reduction example
 * to reproduce beyond these figures.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/m205';
import { FIELD_CONFIGS } from '../field-configs/m205';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-M-205';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const scope = (ws: Record<string, Value>) => (s: string): Value | undefined => (s in ws ? ws[s] : undefined);
const prep = (ws: string, sym: string, rows: unknown[], symbols: Record<string, Value> = {}) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: scope(symbols) });
type Input = { symbol: string; value: number | string | null; unit: string | null };
const run = (n: string, opts: { inputs?: Input[]; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const num = (s: string, v: number | string | null, unit: string | null = null): Input => ({ symbol: s, value: v, unit });

/** M205-10 scope: the Gewässerklasse and Eignungsklasse inherited from M205-02 (Tab. 2 "gut", Tab. 3 class 2). */
const WS10: Record<string, Value> = { gewaesserklasse: 'binnen_gut', eignungsklasse_bewaesserung: '2' };

describe('DWA-M-205 Plan-3 equations', () => {
  it('sixteen entries, every output has a created derived field, every input is a symbol or register; single-source; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'M205-10-D1', 'M205-10-D2', 'M205-11-D1', 'M205-11-D2', 'M205-11-D3', 'M205-14-D1', 'M205-14-D2',
      'M205-17-D1', 'M205-17-D2', 'M205-17-D3', 'M205-17-D4', 'M205-17-D5', 'M205-21-D1', 'M205-24-D1', 'M205-24-D2', 'M205-24-D3',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create && f.widget === 'derived').map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    // no Plan-3 row re-produces a prod output (EQ-01…EQ-12 keep uv_dosis, ct_wert, permeabilitaet, spez_energie_ozon, ozon_pro_doc, the range checks)
    for (const e of EQUATIONS) expect(['uv_dosis', 'ct_wert', 'permeabilitaet', 'spez_energie_ozon', 'ozon_pro_doc', 'spez_strom_uv', 'spez_energie_membran', 'clo2_dosis', 'freies_chlor', 'restchlor_betrieb', 'log_reduktion']).not.toContain(e.output_symbol);
    expect(() => emitEquationsSql('m205', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('m205', EQUATIONS);
    const files = equationFilesFor('m205', '20260917101120');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(16);
  });

  it('leitorganismen rows: Tab. 1 G/I per parameter (L301–L305), Tab. 2 limit + percentile for binnen_gut (L322–L323), Tab. 3 class-2 bound (L376), Behörde value; ok per row', () => {
    const reg = prep('M205-10', 'leitorganismen', [
      { id: '1', quelle: 't1', parameter_t1: 'faekalcoliforme', wert_typ: 'g', messwert: 80 },
      { id: '2', quelle: 't1', parameter_t1: 'faekalcoliforme', wert_typ: 'i', messwert: 2500 },
      { id: '3', quelle: 't2', parameter_t2: 'e_coli', messwert: 1200 },
      { id: '4', quelle: 't2', parameter_t2: 'enterokokken', messwert: 300 },
      { id: '5', quelle: 't3', parameter_t3: 'fkstrep', messwert: 50 },
      { id: '6', quelle: 'behoerde', organismus_behoerde: 'E. coli', limit_behoerde: 100, perzentil_behoerde: 95, messwert: 100 },
    ], WS10);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, true, true, true, true]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows.map((r) => [r.values.limit, r.values.perzentil, r.values.ok])).toEqual([
      [100, 80, 1],     // Fäkalcoliforme G-Wert 100 (80): 80 ≤ 100
      [2000, 95, 0],    // Fäkalcoliforme I-Wert 2.000 (95): 2500 > 2000
      [1000, 95, 0],    // E. coli, Binnengewässer gut: 1.000 (95)
      [400, 95, 1],     // Enterokokken, Binnengewässer gut: 400 (95)
      [100, null, 1],   // Tab. 3 class 2 Fäkalstreptokokken ≤ 100
      [100, 95, 1],     // Behörde
    ]);
    expect(reg.rows[2].values.methode_t2).toBe('DIN EN ISO 9308-3 oder DIN EN ISO 9308-1');
    expect(reg.rows[4].values.text_t3).toBe('$\\leq 100^{4)}$');
    // hidden columns of the other Zieltabellen are null and not required
    expect(reg.rows[0].values.limit_t2).toBeNull();
    expect(reg.rows[2].values.g_wert_t1).toBeNull();
    expect(computed(run('M205-10-D1', { registers: { leitorganismen: reg } }))).toBe(2);
    expect(computed(run('M205-10-D2', { registers: { leitorganismen: reg } }))).toBe(6);
  });

  it('M205-10-D1 is undecidable while a row has no numeric target (Tab. 1 "-" for the Strep. faecalis I-Wert, Tab. 3 "nicht nachweisbar" — m205-J-4) or the class is not in scope; 0 on an empty register', () => {
    const strep = prep('M205-10', 'leitorganismen', [{ id: '1', quelle: 't1', parameter_t1: 'strep_faecalis', wert_typ: 'i', messwert: 5 }], WS10);
    expect([strep.rows[0].values.i_wert_t1, strep.rows[0].values.limit, strep.rows[0].values.ok]).toEqual([null, null, null]);
    expect(run('M205-10-D1', { registers: { leitorganismen: strep } })).toMatchObject({ kind: 'manual_required', reason: 'Fehlende Eingabe für count_rows(): ok' });
    const klasse1 = prep('M205-10', 'leitorganismen', [{ id: '1', quelle: 't3', parameter_t3: 'e_coli', messwert: 0 }, { id: '2', quelle: 't3', parameter_t3: 'toc', messwert: 1 }], { eignungsklasse_bewaesserung: '1' });
    expect(klasse1.rows.map((r) => [r.values.limit_t3, r.values.text_t3, r.values.ok])).toEqual([[null, 'nicht nachweisbar', null], [2, '$\\leq 2$', 1]]);
    const noScope = prep('M205-10', 'leitorganismen', [{ id: '1', quelle: 't2', parameter_t2: 'e_coli', messwert: 10 }], {});
    expect([noScope.rows[0].complete, noScope.rows[0].values.limit, noScope.rows[0].values.ok]).toEqual([true, null, null]);
    expect(run('M205-10-D1', { registers: { leitorganismen: noScope } }).kind).toBe('manual_required');
    expect(computed(run('M205-10-D1', { registers: { leitorganismen: prep('M205-10', 'leitorganismen', [], WS10) } }))).toBe(0);
    // the printed Küstengewässer-ausreichend cells are reachable by their (token-less) key — m205-E-1
    expect(table('TABELLE2', ['kueste_ausreichend', 'enterokokken'])).toMatchObject({ limit_cfu_100ml: 185, percentile_pct: 90 });
  });

  it('M205-24-D1/-D2/-D3: log10(c_in / c_out) per sample (10⁷ → 100 = 5,0; 10⁶ → 10⁴ = 2,0), mean 3,5 and min 2 over the samples with c_out > 0; a c_out = 0 sample counts but has no reduction', () => {
    const reg = prep('M205-24', 'proben_desinfektion', [
      { id: '1', datum: '2026-05-01', organismus: 'Escherichia coli', c_in: 1e7, c_out: 100, limit: 500 },
      { id: '2', datum: '2026-06-01', organismus: 'Escherichia coli', c_in: 1e6, c_out: 1e4 },
      { id: '3', datum: '2026-07-01', organismus: 'Escherichia coli', c_in: 1e6, c_out: 0 },
    ]);
    expect(reg.rows.map((r) => [r.complete, r.values.log_red, r.values.ok])).toEqual([[true, 5, 1], [true, 2, null], [true, null, null]]);
    expect(computed(run('M205-24-D1', { registers: { proben_desinfektion: reg } }))).toBeCloseTo(3.5, 10);
    expect(computed(run('M205-24-D2', { registers: { proben_desinfektion: reg } }))).toBe(2);
    expect(computed(run('M205-24-D3', { registers: { proben_desinfektion: reg } }))).toBe(3);
    expect(run('M205-24-D1', { registers: { proben_desinfektion: prep('M205-24', 'proben_desinfektion', []) } }).kind).toBe('manual_required');
  });

  it('M205-11-D1/-D2/-D3: Σ Q = 1600 m³/h over three channels, count 3, one channel violates the §4.1.3.3 sensor rule (two sensors when switched with the flow, L590–L591)', () => {
    const reg = prep('M205-11', 'bestrahlungsgerinne', [
      { id: '1', label: 'G1', q_m3_h: 600, sensoren: 1 },
      { id: '2', label: 'G2', q_m3_h: 600, sensoren: 1, zuschaltbar: true },
      { id: '3', label: 'G3', q_m3_h: 400, sensoren: 2, zuschaltbar: true },
    ]);
    expect(reg.rows.map((r) => [r.values.sensoren_min, r.values.sensoren_ok])).toEqual([[1, 1], [2, 0], [2, 1]]);
    expect(computed(run('M205-11-D1', { registers: { bestrahlungsgerinne: reg } }))).toBe(1600);
    expect(computed(run('M205-11-D2', { registers: { bestrahlungsgerinne: reg } }))).toBe(3);
    expect(computed(run('M205-11-D3', { registers: { bestrahlungsgerinne: reg } }))).toBe(1);
  });

  it('M205-14-D1/-D2: Tab. 5 Straubing 300 m² × 50 l/(m²·h) = 15 m³/h and Ruhleben 630 m² × 63 = 39,69 m³/h → Σ 930 m², 54,69 m³/h (L822 / L824)', () => {
    const reg = prep('M205-14', 'membranmodule', [
      { id: '1', label: 'Straubing', verfahren: 'mikrofiltration', porenweite_um: 0.1, flaeche_m2: 300, netto_flux: 50 },
      { id: '2', label: 'Ruhleben', verfahren: 'mikrofiltration', flaeche_m2: 630, netto_flux: 63 },
    ]);
    expect(reg.rows.map((r) => r.values.permeat_m3_h)).toEqual([15, expect.closeTo(39.69, 6)]);
    expect(computed(run('M205-14-D1', { registers: { membranmodule: reg } }))).toBe(930);
    expect(computed(run('M205-14-D2', { registers: { membranmodule: reg } }))).toBeCloseTo(54.69, 6);
  });

  it('M205-17-D1…-D5: 10 mg/l / 12,5 mg/l DOC = 0,8 mg/mg (L947 threshold); 10 mg/l × 900 m³/h = 9 kg/h; O2 = 90 kg/h for Reinsauerstoff (L899 "etwa 10 kg"), no value for Luft; Σ generators; ct × 500 for Cryptosporidien (L868)', () => {
    expect(computed(run('M205-17-D1', { inputs: [num('ozon_konz', 10, 'mg/l'), num('doc', 12.5, 'mg/l')] }))).toBeCloseTo(0.8, 12);
    expect(computed(run('M205-17-D2', { inputs: [num('ozon_konz', 10, 'mg/l'), num('durchfluss_max', 900, 'm³/h')] }))).toBe(9); // §4.3.5 30.500 EW plant: max. 900 m³/h
    expect(computed(run('M205-17-D3', { inputs: [num('ozonbedarf_kg_h', 9, 'kg/h'), num('ozon_einsatzgas', 'reiner_sauerstoff')] }))).toBe(90);
    expect(run('M205-17-D3', { inputs: [num('ozonbedarf_kg_h', 9, 'kg/h'), num('ozon_einsatzgas', 'luft')] })).toMatchObject({ kind: 'manual_required', reason: 'Operand ist keine Zahl: null' });
    const gen = prep('M205-17', 'ozongeneratoren', [{ id: '1', label: 'A', kapazitaet_kg_h: 5 }, { id: '2', label: 'B', kapazitaet_kg_h: 5.5 }]);
    expect(computed(run('M205-17-D4', { registers: { ozongeneratoren: gen } }))).toBe(10.5);
    expect(computed(run('M205-17-D5', { inputs: [num('ct_wert_zielorganismus', 'cryptosporidien'), num('ct_ecoli_basis', 2, 'mg·min/l')] }))).toBe(1000);
    expect(computed(run('M205-17-D5', { inputs: [num('ct_wert_zielorganismus', 'e_coli'), num('ct_ecoli_basis', 2, 'mg·min/l')] }))).toBe(2);
    expect(run('M205-17-D5', { inputs: [num('ct_wert_zielorganismus', 'e_coli'), num('ct_ecoli_basis', null, 'mg·min/l')] }).kind).toBe('manual_required');
  });

  it('M205-21-D1: chlorungsmittel rows read the §4.4.2 ranges per agent (Chlorgas 1–20 mg/l, Chlordioxid 5–10 g/m³); Restchlor column only for Chlorgas / Hypochlorit; two of three doses out of range', () => {
    const reg = prep('M205-21', 'chlorungsmittel', [
      { id: '1', mittel: 'chlorgas', dosis: 5, kontaktzeit_ist: 20, restchlor: 0.2 },
      { id: '2', mittel: 'chlordioxid', dosis: 12 },
      { id: '3', mittel: 'natriumhypochlorit', dosis: 25 },
    ]);
    expect(reg.rows.map((r) => [r.complete, r.values.dosis_unit, r.values.dosis_min, r.values.dosis_max, r.values.dosis_ok, r.values.kontaktzeit_text, r.values.restchlor])).toEqual([
      [true, 'mg/l freies Chlor', 1, 20, 1, '15 bis 30 Minuten', 0.2],
      [true, 'g/m³', 5, 10, 0, 'wenige Minuten', null],
      [true, 'mg/l freies Chlor', 1, 20, 0, '15 bis 30 Minuten', null],
    ]);
    expect(computed(run('M205-21-D1', { registers: { chlorungsmittel: reg } }))).toBe(2);
  });
});
