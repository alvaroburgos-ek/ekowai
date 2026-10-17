import { describe, it, expect, vi, beforeEach } from 'vitest';

const actions = vi.hoisted(() => ({
  listScenarios: vi.fn(),
  createScenario: vi.fn(),
  setScenarioOverrides: vi.fn(),
  archiveScenario: vi.fn(),
  getScenarioResults: vi.fn(),
}));
vi.mock('@/lib/actions/scenarios', () => actions);

import { registerScenarioTools } from '../tools/scenarios';
import { compactRun } from '@/lib/scenarios/compact';
import type { ScenarioRun } from '@/lib/scenarios/types';

type Cb = (args: unknown, ctx: unknown) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;
const tools = new Map<string, { cfg: { annotations?: { readOnlyHint?: boolean } }; cb: Cb }>();
registerScenarioTools({ registerTool: (name: string, cfg: never, cb: Cb) => tools.set(name, { cfg, cb }) } as never);
const CTX = { http: { authInfo: { extra: { user: { id: 'u1', email: 'e@x' }, accessToken: 't' } } } };
const call = async (name: string, args: unknown) => tools.get(name)!.cb(args, CTX);

const RUN: ScenarioRun = {
  caseId: 'k5', converged: true, passes: 2, mismatches: [], notRecomputed: [], skippedOverrides: [],
  values: {},
  sheets: { 'A138-12': { code: 'A138-12', hiddenSymbols: [], compliance: [{ code: 'A138-REQ-15', titleDe: 'q', severity: 'block', result: { kind: 'pass' } }],
    equations: [{ equationId: 'e', equationNumber: '7', outputSymbol: 'A_S_m', state: { kind: 'manual_required', reason: 'fehlt A_S_min', missing: ['A_S_min'] } }] } },
  iterations: [{ key: 'A138-17:Gl16', kind: 'gl16', worksheetCode: 'A138-17', equationLabel: 'Gl. 16', outputSymbol: 'A_S_m', unit: 'm²', returnPeriod: 5, scalars: {}, perDuration: [{ D: 180, r_D: 30.6, value: 48.58 }], governingD: 180, r_D_at_governing: 30.6, governingValue: 48.58, boundaryLimited: false, floorAtZero: false }],
};

beforeEach(() => { for (const f of Object.values(actions)) f.mockReset(); });

describe('scenario MCP tools', () => {
  it('registers the five tools; reads are marked read-only', () => {
    expect([...tools.keys()].sort()).toEqual(['archive_scenario', 'create_scenario', 'get_scenario_results', 'list_scenarios', 'set_scenario_overrides']);
    expect(tools.get('list_scenarios')!.cfg.annotations?.readOnlyHint).toBe(true);
    expect(tools.get('get_scenario_results')!.cfg.annotations?.readOnlyHint).toBe(true);
  });
  it('create_scenario creates and then sets the overrides', async () => {
    actions.createScenario.mockResolvedValue({ ok: true, scenario: { id: 's1', overrides: [] } });
    actions.setScenarioOverrides.mockResolvedValue({ ok: true, scenario: { id: 's1', overrides: [{ symbol: 'k_f' }] } });
    const res = await call('create_scenario', { projectId: '00000000-0000-4000-8000-000000000001', name: 'K5', overrides: [{ fieldId: '00000000-0000-4000-8000-000000000002', value: '1e-5', note: 'Feldversuch' }] });
    expect(res.isError).toBeUndefined();
    expect(actions.setScenarioOverrides).toHaveBeenCalledWith('s1', [{ fieldId: '00000000-0000-4000-8000-000000000002', value: '1e-5', note: 'Feldversuch' }]);
  });
  it('a refused override on create_scenario archives the orphaned case', async () => {
    actions.createScenario.mockResolvedValue({ ok: true, scenario: { id: 's9', overrides: [] } });
    actions.setScenarioOverrides.mockResolvedValue({ ok: false, error: 'k_i (k_i) wird berechnet (Gleichungsergebnis)' });
    actions.archiveScenario.mockResolvedValue({ ok: true });
    const res = await call('create_scenario', { projectId: '00000000-0000-4000-8000-000000000001', name: 'K9', overrides: [{ fieldId: '00000000-0000-4000-8000-000000000002', value: 1, note: 'x' }] });
    expect(res.isError).toBe(true);
    expect(actions.archiveScenario).toHaveBeenCalledWith('s9');
    expect(res.content[0].text).toMatch(/wird berechnet/);
    expect(res.content[0].text).toMatch(/s9/);
  });
  it('a refused override comes back as an MCP error the model acts on', async () => {
    actions.setScenarioOverrides.mockResolvedValue({ ok: false, error: 'k_i (k_i) wird berechnet (Gleichungsergebnis)' });
    const res = await call('set_scenario_overrides', { scenarioId: '00000000-0000-4000-8000-000000000003', overrides: [{ fieldId: '00000000-0000-4000-8000-000000000004', value: 1, note: 'x' }] });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/wird berechnet/);
  });
  it('get_scenario_results is compact by default and can include the per-D rows', async () => {
    actions.getScenarioResults.mockResolvedValue({ ok: true, available: true, standardCode: 'DWA-A-138-1', real: RUN, cases: [], ignoredScenarioIds: [] });
    const res = await call('get_scenario_results', { projectId: '00000000-0000-4000-8000-000000000001', standardCode: 'DWA-A-138-1' });
    const body = JSON.parse(res.content[0].text);
    expect(body.real.iterations[0]).toEqual({ key: 'A138-17:Gl16', governingD: 180, governingValue: 48.58, boundaryLimited: false });
    expect(body.real.sheets['A138-12'].results[0]).toEqual({ equation: 'Gl. 7', output: 'A_S_m', value: null, note: 'fehlt A_S_min' });
    expect(body.real.sheets['A138-12'].compliance).toEqual([{ code: 'A138-REQ-15', verdict: 'pass' }]);
    expect(compactRun(RUN, true).iterations[0].perDuration).toHaveLength(1);
  });
  it('get_scenario_results passes a failed case through as an error entry, Real intact', async () => {
    const empty: ScenarioRun = { ...RUN, caseId: 'bad', converged: false, passes: 0, sheets: {}, iterations: [] };
    actions.getScenarioResults.mockResolvedValue({ ok: true, available: true, standardCode: 'DWA-A-138-1', real: RUN, ignoredScenarioIds: [],
      cases: [{ scenario: { id: 'bad', name: 'BAD', slot: 2 }, run: empty, error: 'Fall konnte nicht gerechnet werden.' }, { scenario: { id: 'k5', name: 'K5', slot: 1 }, run: RUN }] });
    const res = await call('get_scenario_results', { projectId: '00000000-0000-4000-8000-000000000001', standardCode: 'DWA-A-138-1' });
    expect(res.isError).toBeUndefined();
    const body = JSON.parse(res.content[0].text);
    expect(body.cases[0]).toMatchObject({ id: 'bad', error: 'Fall konnte nicht gerechnet werden.' });
    expect(body.cases[1].error).toBeUndefined();
    expect(body.real.sheets['A138-12']).toBeTruthy();
  });
});
