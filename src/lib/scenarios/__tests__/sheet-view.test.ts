import { describe, it, expect } from 'vitest';
import { buildSheetView } from '../sheet-view';
import { runScenarioChain } from '@/lib/eval/scenario-chain';
import { buildFixtureBaseline, overridesFor, K5, fid } from '../__fixtures__/hellenthal-a138';
import type { ScenarioResultsPayload, ScenarioSummary } from '../types';

const b = buildFixtureBaseline();
const opts = { approvalWithholding: 'bypass' as const };
const k5Summary: ScenarioSummary = {
  id: 'k5', name: 'K5', reason: null, slot: 2, includeInReport: false, archivedAt: null, createdAt: '2026-10-14T00:00:00.000Z',
  overrides: Object.entries(K5).map(([k, value]) => {
    const [code, symbol] = k.split(':');
    return { fieldId: fid(code, symbol), symbol, labelDe: symbol, labelEn: null, unit: null, dataType: value.type, worksheetCode: code, standardCode: 'DWA-A-138-1', value, baseValueAtCreation: null, currentReal: b.stored[fid(code, symbol)] ? { type: value.type, value: (code === 'A138-12' ? 'direct' : b.stored[fid(code, symbol)].valueNumber) } as never : null, drift: false, note: 'n' };
  }),
};
const payload: ScenarioResultsPayload = {
  available: true, standardCode: 'DWA-A-138-1', ignoredScenarioIds: [],
  real: runScenarioChain(b, [], { caseId: 'real', ...opts }),
  cases: [{ scenario: k5Summary, run: runScenarioChain(b, overridesFor(K5), { caseId: 'k5', ...opts }) }],
};

describe('buildSheetView', () => {
  it('Real + one column per case, coloured by slot', () => {
    const v = buildSheetView(payload, 'A138-17', 'de');
    expect(v.columns).toEqual([{ id: 'real', label: 'Real', slot: 0 }, { id: 'k5', label: 'K5', slot: 2 }]);
  });
  it('per-case values on the swale sheet: V_M (Gl. 15 row) and the mirrored k_i_Mulde row', () => {
    const v = buildSheetView(payload, 'A138-17', 'de');
    const vm = v.rows.find((r) => r.label === 'Gl. 15 · V_M')!;
    expect(vm.cells.map((c) => c.text)).toEqual(['13,5', '14,5728']);
    const ki = v.rows.find((r) => r.key === 'field:k_i_Mulde')!;
    expect(ki.cells.map((c) => c.text)).toEqual(['3·10⁻⁸', '1·10⁻⁵']);
  });
  it('per-case compliance on A138-10: Real fails REQ-15, K5 passes', () => {
    const v = buildSheetView(payload, 'A138-10', 'de');
    expect(v.compliance).toEqual([{ code: 'A138-REQ-15', title: 'A138-REQ-15', cells: ['fail', 'pass'] }]);
  });
  it('badges list the case inputs on this sheet', () => {
    const v = buildSheetView(payload, 'A138-12', 'de');
    expect(v.badges).toEqual([{ caseLabel: 'K5', slot: 2, label: 'a_s_m_determination_method (a_s_m_determination_method)', caseValue: 'geometry', realValue: 'direct' }]);
  });
  it('Gl. 7 in K5 reads „ausgeblendet" or „nicht berechnet", never a number', () => {
    const v = buildSheetView(payload, 'A138-12', 'de');
    const g7 = v.rows.find((r) => r.label.startsWith('Gl. 7'))!;
    expect(g7.cells[0]).toMatchObject({ kind: 'value', text: '45' });
    expect(g7.cells[1].kind).not.toBe('value');
  });
  it('charts: Gl. 16 with Real + K5; Gl. 10 with T 30 solid and T 100 dashed per run', () => {
    const v17 = buildSheetView(payload, 'A138-17', 'de');
    expect(v17.charts.map((c) => c.kind)).toEqual(['gl16']);
    expect(v17.charts[0].series.map((s) => [s.label, s.slot, s.dashed])).toEqual([['Real', 0, false], ['K5', 2, false]]);
    const v26 = buildSheetView(payload, 'A138-26', 'de');
    expect(v26.charts[0].series.map((s) => s.dashed)).toEqual([false, true, false, true]);
    expect(v26.stepOptions.map((o) => o.label)).toEqual(['Real · T = 30 a', 'Real · T = 100 a', 'K5 · T = 30 a', 'K5 · T = 100 a']);
  });
  it('a run that did not settle: warning, and that column never shows a final-looking number', () => {
    const unsettled: ScenarioResultsPayload = { ...payload, cases: [{ ...payload.cases[0], run: { ...payload.cases[0].run, converged: false } }] };
    const v = buildSheetView(unsettled, 'A138-17', 'de');
    expect(v.warnings).toContain('K5: Rechnung nicht stabil — Ergebnis vorläufig');
    const vm = v.rows.find((r) => r.label === 'Gl. 15 · V_M')!;
    expect(vm.cells.map((c) => c.text)).toEqual(['13,5', '14,5728 (vorläufig)']);
    expect(v.charts[0].series.map((s) => s.label)).toEqual(['Real', 'K5 (vorläufig)']);
    const en = buildSheetView(unsettled, 'A138-17', 'en');
    expect(en.rows.find((r) => r.label === 'Gl. 15 · V_M')!.cells[1].text).toBe('14.5728 (provisional)');
  });
  it('carried values in a case are flagged „Realwert übernommen — im Fall nicht nachgerechnet"', () => {
    const run = payload.cases[0].run;
    const carriedRun = { ...run, notRecomputed: [...run.notRecomputed, { worksheetCode: 'A138-17', symbol: 'X_carried' }] };
    const v = buildSheetView({ ...payload, cases: [{ ...payload.cases[0], run: carriedRun }] }, 'A138-17', 'de');
    expect(v.warnings.some((w) => w.startsWith('K5: Realwert übernommen — im Fall nicht nachgerechnet') && w.includes('X_carried'))).toBe(true);
  });
});
