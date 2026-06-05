import { describe, it, expect } from 'vitest';
import { complianceDeviations } from '../schema';

describe('complianceDeviations schema', () => {
  it('exposes the expected columns', () => {
    const cols = Object.keys(complianceDeviations);
    for (const c of ['id','projectId','requirementId','worksheetInstanceId','justification','basisCitations','authorityRef','status','createdBy','createdAt','withdrawnBy','withdrawnAt']) {
      expect(cols).toContain(c);
    }
  });
});
