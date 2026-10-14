// src/lib/eval/__tests__/scenario-chain.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { runScenarioChain, MAX_PASSES } from '../scenario-chain';
import {
  buildFixtureBaseline, overridesFor, fid, ENTERED, K5, K6, K6_GL9, KOSTRA_151093, rainfallCarrier, rows,
} from '@/lib/scenarios/__fixtures__/hellenthal-a138';
import { computeMuldeGeometrySweep } from '../materialize-asm';
import type { ScenarioBaseline } from '@/lib/scenarios/baseline';
import type { ScenarioRun, ScenarioValue } from '@/lib/scenarios/types';

const OPTS = { approvalWithholding: 'bypass' as const };
const run = (b: ScenarioBaseline, o: ReturnType<typeof overridesFor> = [], caseId = 'real') => runScenarioChain(b, o, { caseId, ...OPTS });
const v = (r: ScenarioRun, code: string, sym: string) => r.values[fid(code, sym)]?.value ?? null;
const close = (a: unknown, b: number, rel = 1e-9) => {
  expect(typeof a).toBe('number');
  expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));
};
const verdict = (r: ScenarioRun, code: string, req: string) => r.sheets[code].compliance.find((c) => c.code === req)?.result.kind;
const eqState = (r: ScenarioRun, code: string, number: string) => r.sheets[code].equations.find((e) => e.equationNumber === number)?.state;

describe('Real run (zero overrides) — C4 hand values, spec §6 / ledger 2026-10-14', () => {
  const r = run(buildFixtureBaseline());
  it('converges', () => {
    expect(r.converged).toBe(true);
    expect(r.passes).toBeLessThan(MAX_PASSES);
  });
  it('k_i = 3·10⁻⁸ (Gl. 5/6), Q_S = 0.0015 l/s, A_S,m = 45 m² (Gl. 7)', () => {
    close(v(r, 'A138-11', 'f_K'), 0.03);
    close(v(r, 'A138-11', 'k_i'), 3e-8);
    close(v(r, 'A138-12', 'Q_S'), 0.0015);
    close(v(r, 'A138-12', 'A_S_m'), 45);
  });
  it('V_VA = 70.0038 m³ at D 10080 min, boundary-limited (Gl. 8)', () => {
    close(v(r, 'A138-13', 'V_VA'), 70.0037505216);
    expect(v(r, 'A138-13', 'D_min')).toBe(10080);
    expect(v(r, 'A138-13', 'r_D_n')).toBe(1.7);
    const s = r.iterations.find((x) => x.key === 'A138-13:Gl8');
    expect(s?.boundaryLimited).toBe(true);
  });
  it('q_S,AC = 0.02566 l/(s·ha) ⇒ REQ-15 fails (cross-sheet, via the gate fallback)', () => {
    close(v(r, 'A138-13', 'q_S_AC'), 0.025655132309218457);
    expect(verdict(r, 'A138-10', 'A138-REQ-15')).toBe('fail');
  });
  it('Mulde mirror: k_i_Mulde, V_M = 13.5 m³, V_M,erf = 70.1126 m³', () => {
    close(v(r, 'A138-17', 'k_i_Mulde'), 3e-8);
    close(v(r, 'A138-17', 'V_M'), 13.5);
    close(v(r, 'A138-17', 'V_M_erf'), 70.1126145216);
    expect(v(r, 'A138-17', 'D_used_M')).toBe(10080);
  });
  it('Gl. 10 record state (T 30 a column per F-A7) and both flood series', () => {
    close(v(r, 'A138-26', 'V_Rueck'), 31.640062406400006);
    close(r.iterations.find((x) => x.key === 'A138-26:Gl10:T30')?.governingValue, 31.640062406400006);
    close(r.iterations.find((x) => x.key === 'A138-26:Gl10:T100')?.governingValue, 55.30568077439999);
  });
  it('has nothing to compare when the record carries no derived rows', () => {
    expect(r.mismatches).toEqual([]);
    expect(r.notRecomputed).toEqual([]);
  });
});

describe('cases — overrides propagate through the whole chain (spec §1, §3)', () => {
  it('K5 (k_f 1·10⁻⁵, f_Methode 1, f_Ort 1, geometry): A_S,m 48.58 m² @ D 180, V_M 14.57 m³, q_S,AC 9.23 ⇒ REQ-15 passes', () => {
    const r = run(buildFixtureBaseline(), overridesFor(K5), 'k5');
    close(v(r, 'A138-11', 'k_i'), 1e-5);
    close(v(r, 'A138-12', 'A_S_m'), 48.57599051396648);
    close(v(r, 'A138-17', 'V_M'), 14.572797154189944);
    close(v(r, 'A138-17', 'V_M_erf'), 16.555677154189944);
    close(v(r, 'A138-13', 'q_S_AC'), 9.231284916201119);
    expect(verdict(r, 'A138-10', 'A138-REQ-15')).toBe('pass');
    const s = r.iterations.find((x) => x.key === 'A138-17:Gl16');
    expect(s?.governingD).toBe(180);
    expect(v(r, 'A138-12', 'a_s_m_determination_method')).toBe('geometry');
    expect(r.values[fid('A138-05', 'k_f')].origin).toBe('override');
  });
  it('K5: the direct inputs are hidden under geometry and Gl. 7 does not write A_S,m', () => {
    const r = run(buildFixtureBaseline(), overridesFor(K5), 'k5');
    expect(r.sheets['A138-12'].hiddenSymbols).toEqual(expect.arrayContaining(['A_S_min', 'A_S_max']));
    expect(eqState(r, 'A138-12', '7')?.kind).not.toBe('computed');
  });
  it('K6 (k_f 1·10⁻⁶): A_S,m 93.25 m² @ D 1440 by Gl. 16, q_S,AC 1.77 ⇒ REQ-15 fails', () => {
    const r = run(buildFixtureBaseline(), overridesFor(K6), 'k6');
    close(v(r, 'A138-12', 'A_S_m'), 93.2537609036861);
    expect(r.iterations.find((x) => x.key === 'A138-17:Gl16')?.governingD).toBe(1440);
    close(v(r, 'A138-13', 'q_S_AC'), 1.77217598097503);
    expect(verdict(r, 'A138-10', 'A138-REQ-15')).toBe('fail');
  });
  it('K6 sized by Gl. 9 (A_S,m 105.2 m², direct): q_S,AC = 2', () => {
    const r = run(buildFixtureBaseline(), overridesFor(K6_GL9), 'k6gl9');
    close(v(r, 'A138-12', 'A_S_m'), 105.2421);
    close(v(r, 'A138-13', 'q_S_AC'), 2, 1e-9);
  });
  // KNOWN DEFECT (escalated in task-7-report.md, not fixed here): Gl. 9 in IEEE-754 gives
  // (1e-6·105.2421·1000 + 0) / 526.2105 · 10^4 = 1.9999999999999998, and the shared compliance evaluator
  // (src/lib/expr/evaluate.ts compare(): `ln >= rn`, no tolerance) reads that as < 2 ⇒ REQ-15 'fail' — for the
  // record exactly as for the case. Hand value 2 ⇒ 'pass'. `it.fails` flips red once the boundary is handled.
  it.fails('K6 sized by Gl. 9: q_S,AC = 2 ⇒ REQ-15 passes (exact boundary, see KNOWN DEFECT)', () => {
    const r = run(buildFixtureBaseline(), overridesFor(K6_GL9), 'k6gl9');
    expect(verdict(r, 'A138-10', 'A138-REQ-15')).toBe('pass');
  });
  it('a case never changes the Real run or the baseline (no shared mutable state)', () => {
    const b = buildFixtureBaseline();
    const before = JSON.stringify(b);
    const real1 = run(b);
    run(b, overridesFor(K5), 'k5');
    expect(JSON.stringify(b)).toBe(before);
    expect(run(b)).toEqual(real1);
  });
});

describe('stored-value consistency (spec §3 step 6) and carried values (spec gap G-2)', () => {
  it('flags a stored derived value that differs from the Real run', () => {
    const r = run(buildFixtureBaseline({ storedDerived: { 'A138-11:k_i': { type: 'number', value: 4e-8 } } }));
    expect(r.mismatches).toEqual([{ fieldId: fid('A138-11', 'k_i'), worksheetCode: 'A138-11', symbol: 'k_i', stored: 4e-8, computed: expect.closeTo(3e-8, 20) }]);
  });
  it('carries a stored derived value nothing recomputes and lists it', () => {
    const r = run(buildFixtureBaseline({ storedDerived: { 'A138-13:t_E': { type: 'number', value: 5 } } }), overridesFor(K5), 'k5');
    expect(r.notRecomputed).toEqual([{ worksheetCode: 'A138-13', symbol: 't_E' }]);
    expect(r.values[fid('A138-13', 't_E')]).toMatchObject({ value: 5, origin: 'carried' });
  });
});

describe('visibility — same rules as the record (spec §3 step 3, R-14…R-16)', () => {
  const FLAECHE = { 'A138-15:facility_type_selected': { type: 'enum' as const, value: 'flaeche' } };
  it('visibility: case hides A_VA at source — own on A138-10, at source on A138-13/-26, Gl. 8 and Gl. 10 not computed', () => {
    const r = run(buildFixtureBaseline(), overridesFor(FLAECHE), 'fl');
    expect(r.sheets['A138-10'].hiddenSymbols).toContain('A_VA');
    expect(r.sheets['A138-13'].hiddenSymbols).toContain('A_VA');
    expect(r.sheets['A138-26'].hiddenSymbols).toContain('A_VA');
    expect(eqState(r, 'A138-13', '8')?.kind).toBe('manual_required');
    expect(v(r, 'A138-13', 'V_VA')).toBeNull();
    expect(eqState(r, 'A138-26', '10')?.kind).toBe('manual_required');
    expect(r.iterations.some((x) => x.key.startsWith('A138-26'))).toBe(false);
  });
  it('a case hides exactly what the record hides with the same driver', () => {
    const asCase = run(buildFixtureBaseline(), overridesFor(FLAECHE), 'fl');
    const asRecord = run(buildFixtureBaseline({ entered: { ...ENTERED, ...FLAECHE } }));
    for (const code of Object.keys(asRecord.sheets)) {
      expect(asCase.sheets[code].hiddenSymbols).toEqual(asRecord.sheets[code].hiddenSymbols);
    }
  });
  it('an override on a field the case hides is not silently used', () => {
    const r = run(buildFixtureBaseline(), overridesFor({ ...FLAECHE, 'A138-10:A_VA': { type: 'number', value: 0 } }), 'fl0');
    expect(eqState(r, 'A138-13', '8')?.kind).toBe('manual_required');
  });
});

describe('robustness', () => {
  it('skips overrides on unknown fields and keeps the others', () => {
    const r = run(buildFixtureBaseline(), [
      { fieldId: 'f:OTHER:x', value: { type: 'number', value: 1 } },
      ...overridesFor({ 'A138-05:k_f': { type: 'number', value: 1e-5 } }),
    ], 'mix');
    expect(r.skippedOverrides).toEqual([{ fieldId: 'f:OTHER:x', reason: expect.stringMatching(/gehört nicht/), reasonEn: expect.stringMatching(/does not belong/) }]);
    close(v(r, 'A138-11', 'k_i'), 3e-7);
  });
  it('skips an override whose value type does not match the field', () => {
    const r = run(buildFixtureBaseline(), [{ fieldId: fid('A138-05', 'k_f'), value: { type: 'text', value: 'x' } }], 'bad');
    expect(r.skippedOverrides[0].reason).toMatch(/Datentyp/);
  });
  it('non-converging chain: stops after MAX_PASSES and says so', () => {
    const b: ScenarioBaseline = {
      projectId: 'p', standardId: 's', standardCode: 'TEST-CYCLE',
      sections: [{ id: 's1', templateId: 't1', parentSectionId: null, visibleWhen: null }, { id: 's2', templateId: 't2', parentSectionId: null, visibleWhen: null }],
      fields: [
        { id: 'a', templateId: 't1', templateCode: 'S1', symbol: 'a', labelDe: 'a', labelEn: null, unit: null, dataType: 'number', isRequired: false, sectionId: 's1', visibleWhen: null, widget: null, uiConfig: null, consumerWorksheets: ['S2'], enumValues: null, validationRules: null },
        { id: 'b', templateId: 't2', templateCode: 'S2', symbol: 'b', labelDe: 'b', labelEn: null, unit: null, dataType: 'number', isRequired: false, sectionId: 's2', visibleWhen: null, widget: null, uiConfig: null, consumerWorksheets: ['S1'], enumValues: null, validationRules: null },
      ],
      sheets: [
        { instanceId: 'i1', templateId: 't1', code: 'S1', titleDe: 'S1', titleEn: null, phase: 1, orderIndex: 1, compliance: [], equations: [{ id: 'e1', equationNumber: '1', formula: 'a = b + 1', inputSymbols: ['b'], outputSymbol: 'a', outputUnit: null }] },
        { instanceId: 'i2', templateId: 't2', code: 'S2', titleDe: 'S2', titleEn: null, phase: 2, orderIndex: 2, compliance: [], equations: [{ id: 'e2', equationNumber: '2', formula: 'b = a + 1', inputSymbols: ['a'], outputSymbol: 'b', outputUnit: null }] },
      ],
      stored: { b: { fieldId: 'b', valueNumber: 1, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null, sourceType: 'derived' } },
    };
    const r = run(b);
    expect(r.converged).toBe(false);
    expect(r.passes).toBe(MAX_PASSES);
  });
  it('refuses to run without the explicit approval-withholding bypass', () => {
    expect(() => runScenarioChain(buildFixtureBaseline(), [], { caseId: 'x', approvalWithholding: 'apply' as unknown as 'bypass' })).toThrow(/approvalWithholding/);
  });
});

describe('controller rulings R1 / R2 (2026-10-14)', () => {
  it('skips overrides on non-instantiated templates', () => {
    // R1 (preflight F-1, Review Focus 1): the field exists in the standard, but its template has no instance in the chain.
    const b = buildFixtureBaseline();
    b.sheets = b.sheets.filter((s) => s.code !== 'A138-26');
    const r = run(b, overridesFor({ 'A138-26:T_n_Ue': { type: 'number', value: 30 }, 'A138-05:k_f': { type: 'number', value: 1e-5 } }), 'ni');
    expect(r.skippedOverrides).toEqual([{ fieldId: fid('A138-26', 'T_n_Ue'), reason: expect.stringMatching(/nicht angelegt/), reasonEn: expect.stringMatching(/not set up/) }]);
    expect(r.values[fid('A138-26', 'T_n_Ue')]?.origin).not.toBe('override');
    close(v(r, 'A138-11', 'k_i'), 3e-7);
  });

  it('A138-12 geometry branch reads h_M, n_M_Bemessung and rainfall_table_ref from A138-17 (save-path parity)', () => {
    // R2 (Task 5 review): the save path (worksheet.ts ~1872–1946) reads rainfall_table_ref from A138-17 and the scalars
    // by symbol with A138-17 first. Here the same symbols also live on A138-26 with other values, so the conflict-free
    // project fallback drops them — only an A138-17-first lookup can find the values set on A138-17.
    const carrier = rainfallCarrier();
    const ALT_T30 = KOSTRA_151093.T30.map((x) => x * 2);
    const alt = {
      ...carrier.tables[0], id: 'alt', name: 'alt',
      rows: KOSTRA_151093.D.map((d, i) => ({ D_min: d, r: { '5': KOSTRA_151093.T5[i], '30': ALT_T30[i], '100': KOSTRA_151093.T100[i] } })),
    };
    const extra: Array<[string, string, 'number' | 'text', ScenarioValue]> = [
      ['A138-17', 'n_M_Bemessung', 'number', { type: 'number', value: 1 / 30 }],
      ['A138-17', 'rainfall_table_ref', 'text', { type: 'text', value: 'alt' }],
      ['A138-26', 'n_M_Bemessung', 'number', { type: 'number', value: 0.01 }],
      ['A138-26', 'rainfall_table_ref', 'text', { type: 'text', value: 'kostra-151093' }],
      ['A138-26', 'h_M', 'number', { type: 'number', value: 0.5 }],
    ];
    const entered: Record<string, ScenarioValue> = {
      ...ENTERED, 'A138-04:r_D_n_table': { type: 'json', value: { tables: [carrier.tables[0], alt] } },
    };
    for (const [code, sym, , val] of extra) entered[`${code}:${sym}`] = val;
    const b = buildFixtureBaseline({ entered });
    for (const [code, sym, dataType] of extra) {
      const tmpl = b.fields.find((f) => f.templateCode === code)!;
      b.fields.push({ ...tmpl, id: fid(code, sym), symbol: sym, labelDe: sym, dataType, unit: null, visibleWhen: null, consumerWorksheets: null, enumValues: null });
    }
    const r = run(b, overridesFor(K5), 'r2');
    const altRows = KOSTRA_151093.D.map((d, i) => ({ D_min: d, r_D_n: ALT_T30[i] }));
    const expected = computeMuldeGeometrySweep(altRows, { A_C: 526.2105, h_M: 0.3, f_Z: 1.2, k_i: 1e-5 }).A_S_m!;
    const projectNDefault = computeMuldeGeometrySweep(rows(5), { A_C: 526.2105, h_M: 0.3, f_Z: 1.2, k_i: 1e-5 }).A_S_m!;
    expect(Math.abs(expected - projectNDefault)).toBeGreaterThan(1);
    close(v(r, 'A138-12', 'A_S_m'), expected);
  });
});
