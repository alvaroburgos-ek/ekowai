import { describe, it, expect } from 'vitest';
import { applyDeviations } from '../approval-gate';

const base = {
  ok: false,
  failingBlockConditions: [
    { code: 'A138-REQ-03', titleDe: 'Permeability', condition: 'k_f IS NOT NULL' },
    { code: 'A138-REQ-04', titleDe: 'GW clearance', condition: 'gw_clearance >= 1.0' },
  ],
  missingRequiredFields: [] as Array<{ symbol: string; labelDe: string }>,
};

describe('applyDeviations', () => {
  it('moves a deviated failing condition into deviatedConditions and unblocks if all clear', () => {
    const r = applyDeviations(base, [{ requirementCode: 'A138-REQ-03', deviationId: 'dev-1' }]);
    expect(r.failingBlockConditions.map((c) => c.code)).toEqual(['A138-REQ-04']);
    expect(r.deviatedConditions).toEqual([{ code: 'A138-REQ-03', titleDe: 'Permeability', deviationId: 'dev-1' }]);
    expect(r.ok).toBe(false);
  });
  it('ok=true when every failing condition is deviated and no missing required', () => {
    const r = applyDeviations(base, [
      { requirementCode: 'A138-REQ-03', deviationId: 'd1' },
      { requirementCode: 'A138-REQ-04', deviationId: 'd2' },
    ]);
    expect(r.failingBlockConditions).toEqual([]);
    expect(r.deviatedConditions.map((c) => c.code).sort()).toEqual(['A138-REQ-03','A138-REQ-04']);
    expect(r.ok).toBe(true);
  });
  it('ignores deviations for codes that are not failing', () => {
    const r = applyDeviations(base, [{ requirementCode: 'A138-REQ-99', deviationId: 'x' }]);
    expect(r.failingBlockConditions.length).toBe(2);
    expect(r.deviatedConditions).toEqual([]);
  });
});
