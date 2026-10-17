import { describe, it, expect } from 'vitest';
import { buildSheetView } from '../sheet-view';
import { runScenarioChain } from '@/lib/eval/scenario-chain';
import { buildFixtureBaseline, overridesFor, K5, fid, ENTERED } from '../__fixtures__/c4-a138-chain';
import { fmtNum } from '../format';
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
  it('Gl. 7 row in K5 (geometry method) shows the A_S,m the case actually uses — the tool value, marked', () => {
    const v = buildSheetView(payload, 'A138-12', 'de');
    const g7 = v.rows.find((r) => r.label.startsWith('Gl. 7'))!;
    expect(g7.cells[0]).toMatchObject({ kind: 'value', text: '45' });
    expect(g7.cells[0].materialised).toBeUndefined();
    expect(g7.cells[1]).toMatchObject({ kind: 'value', text: '48,576', materialised: true });
    const en = buildSheetView(payload, 'A138-12', 'en');
    expect(en.rows.find((r) => r.label.startsWith('Gl. 7'))!.cells[1]).toMatchObject({ kind: 'value', text: '48.576', materialised: true });
  });
  it('charts: Gl. 16 with Real + K5; Gl. 10 with T 30 solid and T 100 dashed per run', () => {
    const v17 = buildSheetView(payload, 'A138-17', 'de');
    expect(v17.charts.map((c) => c.kind)).toEqual(['gl16']);
    expect(v17.charts[0].series.map((s) => [s.label, s.slot, s.dashed])).toEqual([['Real', 0, false], ['K5', 2, false]]);
    const v26 = buildSheetView(payload, 'A138-26', 'de');
    expect(v26.charts[0].series.map((s) => s.dashed)).toEqual([false, true, false, true]);
    expect(v26.stepOptions.map((o) => o.label)).toEqual(['Real · T = 30 a', 'Real · T = 100 a (maßgebend)', 'K5 · T = 30 a', 'K5 · T = 100 a (maßgebend)']);
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
  it('a skipped override is listed per case with its reason on every sheet (Review Focus 1), DE/EN', () => {
    const extra = { fieldId: fid('A138-99', 'x'), symbol: 'x', labelDe: 'X-Wert', labelEn: 'X value', unit: null, dataType: 'number', worksheetCode: 'A138-99', standardCode: 'DWA-A-138-1', value: { type: 'number', value: 1 } as never, baseValueAtCreation: null, currentReal: null, drift: false, note: 'n' };
    const run = runScenarioChain(b, [...overridesFor(K5), { fieldId: extra.fieldId, value: { type: 'number', value: 1 } }], { caseId: 'k5', ...opts });
    const p: ScenarioResultsPayload = { ...payload, cases: [{ scenario: { ...k5Summary, overrides: [...k5Summary.overrides, extra] }, run }] };
    for (const code of ['A138-12', 'A138-17', 'A138-26']) {
      expect(buildSheetView(p, code, 'de').warnings).toContain('K5: Annahme nicht angewendet — X-Wert (x): Feld gehört nicht zu dieser Norm oder ist deaktiviert.');
    }
    expect(buildSheetView(p, 'A138-17', 'en').warnings).toContain('K5: assumption not applied — X value (x): field does not belong to this standard or is deactivated.');
    expect(buildSheetView(payload, 'A138-17', 'de').warnings.some((w) => w.includes('nicht angewendet'))).toBe(false);
  });
  it('A138-26: a case whose upstream Q_S differs from the entered flood Q_S gets a warning (DE/EN); the calculation is unchanged', () => {
    const k5Run = payload.cases[0].run;
    const caseQs = Object.values(k5Run.values).find((c) => c.worksheetCode === 'A138-12' && c.symbol === 'Q_S')!.value as number;
    expect(caseQs).not.toBeCloseTo(0.0015, 6);
    const de = buildSheetView(payload, 'A138-26', 'de');
    expect(de.warnings).toContain(`K5: Q_S (Überflutung) ist ein eingegebener Realwert 0,0015 l/s – im Fall nicht übernommen; Fall-Q_S ${fmtNum(caseQs, 'de')} l/s`);
    expect(de.warnings.some((w) => w.startsWith('Real: Q_S'))).toBe(false);
    const en = buildSheetView(payload, 'A138-26', 'en');
    expect(en.warnings).toContain(`K5: Q_S (flood check) is an entered real value 0.0015 l/s – not taken over in the case; case Q_S ${fmtNum(caseQs, 'en')} l/s`);
    // only on A138-26
    expect(buildSheetView(payload, 'A138-17', 'de').warnings.some((w) => w.includes('Überflutung'))).toBe(false);
    // the run itself still uses the entered Q_S (no calculation change)
    expect(Object.values(k5Run.values).find((c) => c.worksheetCode === 'A138-26' && c.symbol === 'Q_S')!).toMatchObject({ value: 0.0015, origin: 'entered' });
  });
  it('A138-26: no Q_S warning when the case keeps the entered Q_S', () => {
    const real = payload.real!;
    const same: ScenarioResultsPayload = { ...payload, cases: [{ scenario: { ...k5Summary, overrides: [] }, run: { ...real, caseId: 'k5' } }] };
    expect(buildSheetView(same, 'A138-26', 'de').warnings.some((w) => w.includes('Überflutung'))).toBe(false);
  });
  it('A138-26: both T series shown; the headline row and the governing marker follow T_n_Ue (record: 100 a)', () => {
    const v = buildSheetView(payload, 'A138-26', 'de');
    const head = v.rows.find((r) => r.label.startsWith('Gl. 10'))!;
    expect(head.label).toBe('Gl. 10 · V_Rueck (maßgebend: T = 100 a)');
    const k5T100 = payload.cases[0].run.iterations.find((i) => i.key === 'A138-26:Gl10:T100')!;
    expect(head.cells.map((c) => c.text)).toEqual(['55,3057', fmtNum(Math.max(0, k5T100.governingValue!), 'de')]);
    expect(v.rows.find((r) => r.key === 'gl10:T30')).toMatchObject({ label: 'Gl. 10 · V_Rueck · T = 30 a', cells: [{ kind: 'value', text: '31,6401' }, expect.anything()] });
    expect(v.rows.find((r) => r.key === 'gl10:T100')).toMatchObject({ label: 'Gl. 10 · V_Rueck · T = 100 a (maßgebend)' });
    expect(v.charts[0].series.map((s) => s.label)).toEqual(['Real · T = 30 a', 'Real · T = 100 a (maßgebend)', 'K5 · T = 30 a', 'K5 · T = 100 a (maßgebend)']);
    const en = buildSheetView(payload, 'A138-26', 'en');
    expect(en.rows.find((r) => r.label.startsWith('Gl. 10'))!.label).toBe('Gl. 10 · V_Rueck (governing: T = 100 a)');
  });
  it('A138-26: T_n_Ue empty ⇒ T = 30 a governs', () => {
    const b30 = buildFixtureBaseline({ entered: Object.fromEntries(Object.entries(ENTERED).filter(([k]) => k !== 'A138-26:T_n_Ue')) });
    const p30: ScenarioResultsPayload = { ...payload, real: runScenarioChain(b30, [], { caseId: 'real', ...opts }), cases: [] };
    const v = buildSheetView(p30, 'A138-26', 'de');
    const head = v.rows.find((r) => r.label.startsWith('Gl. 10'))!;
    expect(head.label).toBe('Gl. 10 · V_Rueck (maßgebend: T = 30 a)');
    expect(head.cells[0].text).toBe('31,6401');
    expect(v.charts[0].series.map((s) => s.label)).toEqual(['Real · T = 30 a (maßgebend)', 'Real · T = 100 a']);
  });
  it('carried values in a case are flagged „Realwert übernommen — im Fall nicht nachgerechnet"', () => {
    const run = payload.cases[0].run;
    const carriedRun = { ...run, notRecomputed: [...run.notRecomputed, { worksheetCode: 'A138-17', symbol: 'X_carried' }] };
    const v = buildSheetView({ ...payload, cases: [{ ...payload.cases[0], run: carriedRun }] }, 'A138-17', 'de');
    expect(v.warnings.some((w) => w.startsWith('K5: Realwert übernommen — im Fall nicht nachgerechnet') && w.includes('X_carried'))).toBe(true);
  });
});
