// @vitest-environment node
import '../../__tests__/_setup-env';
import { describe, it, expect } from 'vitest';
import { loadVsmeSummary } from '@/lib/db/queries/vsme-summary';

const NON_EXISTENT_PROJECT = '00000000-0000-0000-0000-000000000001';

describe('loadVsmeSummary (integration)', () => {
  it('returns totalFields between 100 and 200 (≈143 seeded VSME fields)', async () => {
    const summary = await loadVsmeSummary(NON_EXISTENT_PROJECT);
    expect(summary.totalFields).toBeGreaterThanOrEqual(100);
    expect(summary.totalFields).toBeLessThanOrEqual(200);
  });

  it('ownerSplit.ekowai_env.total is greater than 0', async () => {
    const summary = await loadVsmeSummary(NON_EXISTENT_PROJECT);
    expect(summary.ownerSplit.ekowai_env.total).toBeGreaterThan(0);
  });

  it('ownerSplit.client_supplied.total is greater than 0', async () => {
    const summary = await loadVsmeSummary(NON_EXISTENT_PROJECT);
    expect(summary.ownerSplit.client_supplied.total).toBeGreaterThan(0);
  });

  it('scope1, scope2Location, totalLocation are numeric (0 for non-existent project)', async () => {
    const summary = await loadVsmeSummary(NON_EXISTENT_PROJECT);
    expect(typeof summary.scope1).toBe('number');
    expect(typeof summary.scope2Location).toBe('number');
    expect(typeof summary.totalLocation).toBe('number');
  });

  it('completionPct is 0 for a project with no parameters', async () => {
    const summary = await loadVsmeSummary(NON_EXISTENT_PROJECT);
    expect(summary.completionPct).toBe(0);
  });

  it('filledFields is 0 for a non-existent project', async () => {
    const summary = await loadVsmeSummary(NON_EXISTENT_PROJECT);
    expect(summary.filledFields).toBe(0);
  });

  it('ownerSplit has all three keys: ekowai_env, client_supplied, general', async () => {
    const summary = await loadVsmeSummary(NON_EXISTENT_PROJECT);
    expect(summary.ownerSplit).toHaveProperty('ekowai_env');
    expect(summary.ownerSplit).toHaveProperty('client_supplied');
    expect(summary.ownerSplit).toHaveProperty('general');
  });

  it('ownerSplit totals sum to totalFields', async () => {
    const summary = await loadVsmeSummary(NON_EXISTENT_PROJECT);
    const splitTotal =
      summary.ownerSplit.ekowai_env.total +
      summary.ownerSplit.client_supplied.total +
      summary.ownerSplit.general.total;
    expect(splitTotal).toBe(summary.totalFields);
  });
});
