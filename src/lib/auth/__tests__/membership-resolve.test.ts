import { describe, it, expect } from 'vitest';
import { resolveMembership } from '../membership-resolve';

describe('resolveMembership', () => {
  it('returns staff when an org_members row exists', () => {
    expect(resolveMembership({ role: 'engineer' }, null)).toEqual({
      kind: 'staff',
      orgRole: 'engineer',
    });
  });

  it('returns external when only a project_members row exists', () => {
    expect(resolveMembership(null, { project_id: 'p1', role: 'client' })).toEqual({
      kind: 'external',
      projectId: 'p1',
      role: 'client',
    });
  });

  it('prefers staff when both rows exist (no portal downgrade)', () => {
    expect(
      resolveMembership({ role: 'owner' }, { project_id: 'p1', role: 'designer' }),
    ).toEqual({ kind: 'staff', orgRole: 'owner' });
  });

  it('returns null when neither row exists', () => {
    expect(resolveMembership(null, null)).toBeNull();
  });
});
