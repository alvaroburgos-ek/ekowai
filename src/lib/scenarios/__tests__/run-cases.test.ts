import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runScenarioCases } from '../run-cases';
import { runScenarioChain } from '@/lib/eval/scenario-chain';
import { buildFixtureBaseline, K5, fid } from '../__fixtures__/hellenthal-a138';
import { buildSheetView } from '../sheet-view';
import type { OverrideSummary, ScenarioSummary } from '../types';
import type { ScenarioValue } from '../types';

const b = buildFixtureBaseline();
const ov = (code: string, symbol: string, value: ScenarioValue): OverrideSummary => ({
  fieldId: fid(code, symbol), symbol, labelDe: symbol, labelEn: null, unit: null, dataType: value.type, worksheetCode: code,
  standardCode: 'DWA-A-138-1', value, baseValueAtCreation: null, currentReal: null, drift: false, note: 'n',
});
const summary = (id: string, slot: number, overrides: OverrideSummary[]): ScenarioSummary => ({
  id, name: id.toUpperCase(), reason: null, slot, includeInReport: false, archivedAt: null, createdAt: '2026-10-14T00:00:00.000Z', overrides,
});
const k5 = summary('k5', 1, Object.entries(K5).map(([k, v]) => { const [c, s] = k.split(':'); return ov(c, s, v); }));
// Stored before the JSON rule existed (or written directly): a malformed rainfall carrier makes the runner throw.
const bad = summary('bad', 2, [ov('A138-04', 'r_D_n_table', { type: 'json', value: { rows: [null] } } as ScenarioValue)]);

let err: ReturnType<typeof vi.spyOn>;
beforeEach(() => { err = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { err.mockRestore(); });

describe('runScenarioCases — one failing case never takes down Real or the other cases (final review A2-I1 c)', () => {
  it('the malformed override really throws in the runner', () => {
    expect(() => runScenarioChain(b, [{ fieldId: fid('A138-04', 'r_D_n_table'), value: bad.overrides[0].value }], { caseId: 'bad', approvalWithholding: 'bypass' })).toThrow();
  });
  it('returns an error entry for the failing case; Real and K5 are computed', () => {
    const r = runScenarioCases(b, [bad, k5]);
    expect(r.real.caseId).toBe('real');
    expect(r.real.sheets['A138-17']).toBeTruthy();
    expect(r.cases.map((c) => [c.scenario.id, c.error ?? null])).toEqual([['bad', expect.stringMatching(/konnte nicht gerechnet werden/)], ['k5', null]]);
    expect(r.cases[1].run.sheets['A138-17']).toBeTruthy();
    expect(r.cases[0].run.sheets).toEqual({});
    expect(err).toHaveBeenCalled();
  });
  it('the sheet view shows the failed column as „nicht berechnet" with a warning, the others as values', () => {
    const r = runScenarioCases(b, [bad, k5]);
    const v = buildSheetView({ available: true, standardCode: 'DWA-A-138-1', ignoredScenarioIds: [], ...r }, 'A138-17', 'de');
    const vm = v.rows.find((x) => x.label === 'Gl. 15 · V_M')!;
    expect(vm.cells.map((c) => c.kind)).toEqual(['value', 'missing', 'value']);
    expect(vm.cells[1].text).toBe('nicht berechnet: Fehler im Fall');
    expect(v.warnings).toContain('BAD: Fall konnte nicht gerechnet werden — Real und die anderen Fälle sind nicht betroffen');
    expect(v.warnings.some((w) => w.startsWith('BAD: Rechnung nicht stabil'))).toBe(false);
    const en = buildSheetView({ available: true, standardCode: 'DWA-A-138-1', ignoredScenarioIds: [], ...r }, 'A138-17', 'en');
    expect(en.warnings).toContain('BAD: case could not be computed — Real and the other cases are unaffected');
  });
});
