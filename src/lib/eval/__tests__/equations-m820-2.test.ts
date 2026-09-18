/**
 * Plan 3 Task 19 — DWA-M-820-2 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each register-fed
 * formula computes through the real `evaluateFormula` over rows prepared by the
 * register contract (TS fallback tables, no migration applied). Pinned: the
 * counts / Σ per register, the "empty cell counts as 0" Σ forms, the required
 * status / boolean semantics, empty-register behaviour (counts 0, Σ open) and the
 * F-1 fact that a date column cannot be aggregated.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS, sumOptional } from '../equations/m820_2';
import { FIELD_CONFIGS } from '../field-configs/m820_2';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-M-820-2';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[]) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: () => undefined }, {});
const run = (n: string, registers: Record<string, ReturnType<typeof prep>>): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: [], registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const reason = (r: EvalState): string => (r.kind === 'manual_required' ? r.reason : `<${r.kind}>`);

describe('DWA-M-820-2 Plan-3 equations', () => {
  it('14 entries, every output has a created derived field on its register\'s worksheet, every input is a register of the same worksheet, no new output chained, no prod symbol re-produced; emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      '820-2-06-D1', '820-2-06-D2', '820-2-12-D1', '820-2-12-D2', '820-2-13-D1', '820-2-16-D1', '820-2-16-D2',
      '820-2-19-D1', '820-2-19-D2', '820-2-21-D1', '820-2-21-D2', '820-2-21-D3', '820-2-24-D1', '820-2-24-D2',
    ]);
    const created = new Map(FIELD_CONFIGS.filter((f) => f.create).map((f) => [`${f.worksheet} ${f.symbol}`, f.widget]));
    const registers = new Map(FIELD_CONFIGS.filter((f) => f.widget === 'register').map((f) => [f.symbol, f.worksheet]));
    for (const e of EQUATIONS) {
      expect(created.get(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe('derived');
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(e.input_symbols).toHaveLength(1);
      expect(registers.get(e.input_symbols[0]), `${e.equation_number} register ${e.input_symbols[0]}`).toBe(e.worksheet); // register-fed, on the register's worksheet (m277e trap 2)
    }
    // single-source: no Plan-3 equation outputs a prod symbol (the typed Auftragswert / date pair / booleans keep their fields — D- / G-blocks)
    const prodInputs = ['final_contract_value', 'vergabeverfahren_used', 'zuschlag_erteilt_datum', 'warranty_start_date', 'warranty_end_date', 'defect_tracking_active', 'decisions_documented', 'change_log_present', 'change_impact_documented', 'permit_conditions_tracked', 'third_parties_engaged_early', 'lot_strategy_documented', 'project_handbook_complete'];
    for (const e of EQUATIONS) expect(prodInputs).not.toContain(e.output_symbol);
    // no boolean / scalar input anywhere (every row is register-fed ⇒ every output is materialised by the save path)
    const newOutputs = new Set(EQUATIONS.map((e) => e.output_symbol));
    for (const e of EQUATIONS) for (const s of e.input_symbols) expect(newOutputs.has(s), `${e.equation_number} reads new output ${s}`).toBe(false);
    // every footer symbol of every register is an equation output of that worksheet
    for (const f of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      for (const s of (f.ui_config as RegisterUiConfig).footer ?? []) expect(EQUATIONS.find((e) => e.output_symbol === s)?.worksheet, `${f.symbol} footer ${s}`).toBe(f.worksheet);
    }
    expect(sumOptional('r', 'x')).toBe('sum_rows(r, if(x IS NULL, 0, x))');
    expect(() => emitEquationsSql('m820_2', EQUATIONS)).not.toThrow();
    expect(emitEquationsSql('m820_2', EQUATIONS).warnings).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('m820_2', EQUATIONS);
    const files = equationFilesFor('m820_2', '20260917101920');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/INSERT INTO equations/g) ?? []).length).toBe(14);
  });

  it('820-2-21: change_orders count / Σ / open — an empty Kostenwirkung counts as 0, a bare Σ over it would be open (probed); status required; empty register ⇒ counts 0, Σ open', () => {
    const rows = [
      { id: '1', aenderung: 'Nachtrag 1 — Rohrtrasse', datum: '2026-03-02', kosten_eur: 12000, status: 'offen' },
      { id: '2', aenderung: 'Nachtrag 2 — Terminverschiebung', datum: '2026-03-20', kosten_eur: null, terminwirkung: '+3 Wochen', status: 'genehmigt' },
      { id: '3', aenderung: 'Nachtrag 3 — Pumpen', datum: '2026-04-11', kosten_eur: 3000.5, status: 'offen' },
    ];
    const reg = { change_orders: prep('820-2-21', 'change_orders', rows) };
    expect(reg.change_orders.rows.map((r) => r.complete)).toEqual([true, true, true]);
    expect(computed(run('820-2-21-D1', reg))).toBe(3);
    expect(computed(run('820-2-21-D2', reg))).toBeCloseTo(15000.5, 6);
    expect(computed(run('820-2-21-D3', reg))).toBe(2);
    // the bare Σ form breaks on the empty cell — why the module uses sumOptional()
    const bare = evaluateFormula({ equationId: 'bare', formula: 'x = sum_rows(change_orders, kosten_eur)', inputSymbols: ['change_orders'], outputSymbol: 'x', inputs: [], registers: reg, tableLookup: table });
    expect(reason(bare)).toMatch(/kosten_eur/);
    // a row without status is incomplete under the upgraded config (required) — it neither counts nor breaks the count
    const withUnset = { change_orders: prep('820-2-21', 'change_orders', [...rows, { id: '4', aenderung: 'Nachtrag 4' }]) };
    expect(withUnset.change_orders.rows[3].complete).toBe(false);
    expect(computed(run('820-2-21-D1', withUnset))).toBe(3);
    expect(computed(run('820-2-21-D3', withUnset))).toBe(2);
    const empty = { change_orders: prep('820-2-21', 'change_orders', []) };
    expect(computed(run('820-2-21-D1', empty))).toBe(0);
    expect(computed(run('820-2-21-D3', empty))).toBe(0);
    expect(reason(run('820-2-21-D2', empty))).toMatch(/Keine vollständigen Zeilen/);
  });

  it('820-2-24: Gewährleistungskalender count / open defects; a date column is a string and cannot be aggregated (F-1)', () => {
    const rows = [
      { id: '1', auftragnehmer: 'Firma A (Rohbau)', abnahme: '2026-03-01', beginn: '2026-03-01', ende: '2030-03-01', maengel_offen: 2 },
      { id: '2', auftragnehmer: 'Firma B (Maschinentechnik)', abnahme: '2026-05-15', beginn: '2026-05-15', ende: '2028-05-15' },
      { id: '3', auftragnehmer: 'Ingenieurbüro C', abnahme: '2026-06-30', beginn: '2026-06-30', ende: '2031-06-30', maengel_offen: 0 },
    ];
    const reg = { gewaehrleistungen: prep('820-2-24', 'gewaehrleistungen', rows) };
    expect(reg.gewaehrleistungen.rows.map((r) => r.complete)).toEqual([true, true, true]);
    expect(computed(run('820-2-24-D1', reg))).toBe(3);
    expect(computed(run('820-2-24-D2', reg))).toBe(2);
    // F-1: min / max over the date columns is not computable (strings) — recorded, never encoded
    for (const f of ['x = min_rows(gewaehrleistungen, beginn)', 'x = max_rows(gewaehrleistungen, ende)']) {
      const r = evaluateFormula({ equationId: 'f1', formula: f, inputSymbols: ['gewaehrleistungen'], outputSymbol: 'x', inputs: [], registers: reg, tableLookup: table });
      expect(reason(r)).toMatch(/Operand ist keine Zahl: 20/);
    }
    // a row missing one of the three required dates is incomplete
    const partial = { gewaehrleistungen: prep('820-2-24', 'gewaehrleistungen', [...rows, { id: '4', auftragnehmer: 'Firma D', abnahme: '2026-07-01', beginn: '2026-07-01' }]) };
    expect(partial.gewaehrleistungen.rows[3].complete).toBe(false);
    expect(computed(run('820-2-24-D1', partial))).toBe(3);
    const empty = { gewaehrleistungen: prep('820-2-24', 'gewaehrleistungen', []) };
    expect(computed(run('820-2-24-D1', empty))).toBe(0);
    expect(reason(run('820-2-24-D2', empty))).toMatch(/Keine vollständigen Zeilen/);
  });

  it('820-2-06 / -12 / -13 / -16 / -19: LOP open, decisions (without reason: absent AND empty string), third parties, Auflagen open (unset box = open), lots Σ / count', () => {
    const lop = { offene_punkte: prep('820-2-06', 'offene_punkte', [{ id: '1', punkt: 'Bestandsplan Kanal', status: 'offen' }, { id: '2', punkt: 'Bodengutachten', status: 'erledigt' }, { id: '3', punkt: 'Ex-Schutz-Dokument', status: 'offen', termin: '2026-05-01' }]) };
    expect(computed(run('820-2-06-D1', lop))).toBe(3);
    expect(computed(run('820-2-06-D2', lop))).toBe(2);
    const dec = { entscheidungen: prep('820-2-12', 'entscheidungen', [
      { id: '1', nr: 1, datum: '2026-01-10', entscheidung: 'Variante A', begruendung: 'geringere Betriebskosten', entscheider: 'Lenkungsausschuss' },
      { id: '2', nr: 2, datum: '2026-02-01', entscheidung: 'Variante B' },
      { id: '3', nr: 3, datum: '2026-02-02', entscheidung: 'Bauabschnitt 2 vorziehen', begruendung: '' },
    ]) };
    expect(computed(run('820-2-12-D1', dec))).toBe(3);
    expect(computed(run('820-2-12-D2', dec))).toBe(2);
    const dritte = { dritte: prep('820-2-13', 'dritte', [{ id: '1', leistung: 'Gutachten Baugrund', buero: 'Büro X', beauftragt: '2026-01-15' }, { id: '2', leistung: 'Rechtsberatung Vergabe' }]) };
    expect(computed(run('820-2-13-D1', dritte))).toBe(2);
    expect(computed(run('820-2-13-D1', { dritte: prep('820-2-13', 'dritte', []) }))).toBe(0);
    const au = { auflagen: prep('820-2-16', 'auflagen', [{ id: '1', auflage: 'Monitoring Grundwasser', genehmigung: 'Wasserrechtliche Erlaubnis', erledigt: true }, { id: '2', auflage: 'Lärmschutz Bauphase' }, { id: '3', auflage: 'Ex-Schutz-Dokument', erledigt: false, frist: '2026-09-30' }]) };
    expect(computed(run('820-2-16-D1', au))).toBe(3);
    expect(computed(run('820-2-16-D2', au))).toBe(2); // the unset box counts as open
    const lots = { vergaben_los: prep('820-2-19', 'vergaben_los', [{ id: '1', los: 'Los 1 Rohbau', verfahren: 'Offenes Verfahren', zuschlag: '2026-02-01', auftragswert: 250000 }, { id: '2', los: 'Los 2 Maschinentechnik', auftragswert: 75000.25 }]) };
    expect(computed(run('820-2-19-D1', lots))).toBe(2);
    expect(computed(run('820-2-19-D2', lots))).toBeCloseTo(325000.25, 6);
    const noValue = { vergaben_los: prep('820-2-19', 'vergaben_los', [{ id: '1', los: 'Los 3' }]) };
    expect(noValue.vergaben_los.rows[0].complete).toBe(false); // auftragswert required
    expect(computed(run('820-2-19-D1', noValue))).toBe(0);
    expect(reason(run('820-2-19-D2', noValue))).toMatch(/Keine vollständigen Zeilen/); // never a phantom 0 €
  });
});
