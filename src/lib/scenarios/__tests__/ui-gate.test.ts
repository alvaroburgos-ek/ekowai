import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ getUser: vi.fn(), resolveProjectAccess: vi.fn(), loadScenarioSettings: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: h.getUser } }) }));
vi.mock('@/lib/auth/project-access', () => ({ resolveProjectAccess: h.resolveProjectAccess }));
vi.mock('../load-baseline', () => ({ loadScenarioSettings: h.loadScenarioSettings }));
import { scenarioUiGate, loadScenarioUiGate } from '../ui-gate';

let err: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  h.getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
  h.resolveProjectAccess.mockResolvedValue({ scope: 'internal', role: 'engineer', orgId: 'o' });
  h.loadScenarioSettings.mockResolvedValue({ available: true, enabled: true });
  err = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { err.mockRestore(); });

describe('scenarioUiGate (final review A1-M1 + A1-M9)', () => {
  it('tab: tables present AND internal viewer; sheet switch additionally needs „Fälle aktiv"', () => {
    expect(scenarioUiGate({ available: true, internal: true, enabled: false })).toEqual({ tab: true, sheetSwitch: false });
    expect(scenarioUiGate({ available: true, internal: true, enabled: true })).toEqual({ tab: true, sheetSwitch: true });
    expect(scenarioUiGate({ available: false, internal: true, enabled: false })).toEqual({ tab: false, sheetSwitch: false });
    expect(scenarioUiGate({ available: true, internal: false, enabled: true })).toEqual({ tab: false, sheetSwitch: false });
  });
});

describe('loadScenarioUiGate — same access rule as the actions (resolveProjectAccess scope internal)', () => {
  it('internal member, tables present, setting on ⇒ tab + switch', async () => {
    expect(await loadScenarioUiGate('p')).toEqual({ tab: true, sheetSwitch: true });
    expect(h.resolveProjectAccess).toHaveBeenCalledWith('u', 'p');
  });
  it('client collaborator ⇒ neither tab nor switch', async () => {
    h.resolveProjectAccess.mockResolvedValue({ scope: 'client', role: 'viewer', orgId: 'o' });
    expect(await loadScenarioUiGate('p')).toEqual({ tab: false, sheetSwitch: false });
  });
  it('not signed in ⇒ hidden, access never resolved', async () => {
    h.getUser.mockResolvedValue({ data: { user: null } });
    expect(await loadScenarioUiGate('p')).toEqual({ tab: false, sheetSwitch: false });
    expect(h.resolveProjectAccess).not.toHaveBeenCalled();
  });
  it('tables absent ⇒ hidden', async () => {
    h.loadScenarioSettings.mockResolvedValue({ available: false, enabled: false });
    expect(await loadScenarioUiGate('p')).toEqual({ tab: false, sheetSwitch: false });
  });
  it('an access lookup error fails closed and never throws into the page', async () => {
    h.resolveProjectAccess.mockRejectedValue(new Error('connection reset'));
    await expect(loadScenarioUiGate('p')).resolves.toEqual({ tab: false, sheetSwitch: false });
    expect(err).toHaveBeenCalled();
  });
});
