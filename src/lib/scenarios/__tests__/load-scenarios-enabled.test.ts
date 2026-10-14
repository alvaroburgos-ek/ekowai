import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { select: () => ({ from: () => ({ where: () => ({ limit: h.limit }) }) }) } }));
import { loadScenariosEnabled, loadScenarioSettings } from '../load-baseline';

const missing = Object.assign(new Error('Failed query'), { cause: { code: '42P01' } });
let err: ReturnType<typeof vi.spyOn>;
beforeEach(() => { h.limit.mockReset(); err = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { err.mockRestore(); });

describe('loadScenariosEnabled / loadScenarioSettings (final review A2-M8)', () => {
  it('reads the setting', async () => {
    h.limit.mockResolvedValue([{ enabled: true }]);
    expect(await loadScenariosEnabled('p')).toBe(true);
    expect(await loadScenarioSettings('p')).toEqual({ available: true, enabled: true });
    h.limit.mockResolvedValue([]);
    expect(await loadScenarioSettings('p')).toEqual({ available: true, enabled: false });
  });
  it('tables absent (42P01) ⇒ not available, false, nothing logged', async () => {
    h.limit.mockRejectedValue(missing);
    expect(await loadScenariosEnabled('p')).toBe(false);
    expect(await loadScenarioSettings('p')).toEqual({ available: false, enabled: false });
    expect(err).not.toHaveBeenCalled();
  });
  it('a transient error never reaches the worksheet page: logged, fails closed (false)', async () => {
    h.limit.mockRejectedValue(new Error('connection reset'));
    await expect(loadScenariosEnabled('p')).resolves.toBe(false);
    await expect(loadScenarioSettings('p')).resolves.toEqual({ available: false, enabled: false });
    expect(err).toHaveBeenCalled();
  });
});
