import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import '../../db/__tests__/_setup-env';
import { admin } from '../../../../tests/rls/helpers';
import { resolveProjectAccess, assertInternal, AccessDeniedError } from '../project-access';

const ad = admin();
let orgId = '';
let projectId = '';
let engineerId = '';
let clientId = '';
let outsiderId = '';

beforeAll(async () => {
  const stamp = Date.now();
  const eng = await ad.auth.admin.createUser({ email: `pa-eng-${stamp}@t.local`, email_confirm: true, password: 'rls-test-password' });
  const cli = await ad.auth.admin.createUser({ email: `pa-cli-${stamp}@t.local`, email_confirm: true, password: 'rls-test-password' });
  const out = await ad.auth.admin.createUser({ email: `pa-out-${stamp}@t.local`, email_confirm: true, password: 'rls-test-password' });
  engineerId = eng.data.user!.id;
  clientId = cli.data.user!.id;
  outsiderId = out.data.user!.id;

  const { data: org } = await ad.from('orgs').insert({ name: 'PA', slug: `pa-${stamp}` }).select('id').single();
  orgId = org!.id;
  await ad.from('org_members').insert({ org_id: orgId, user_id: engineerId, role: 'engineer' });
  const { data: proj } = await ad.from('projects').insert({ org_id: orgId, name: 'PA-P', created_by: engineerId }).select('id').single();
  projectId = proj!.id;
  await ad.from('project_collaborators').insert({ project_id: projectId, user_id: clientId, role: 'client', invited_by: engineerId });
});

afterAll(async () => {
  await ad.from('projects').delete().eq('id', projectId);
  await ad.from('orgs').delete().eq('id', orgId);
  for (const id of [engineerId, clientId, outsiderId]) {
    if (id) await ad.auth.admin.deleteUser(id);
  }
});

describe('resolveProjectAccess', () => {
  it('org member → internal with role', async () => {
    const a = await resolveProjectAccess(engineerId, projectId);
    expect(a.scope).toBe('internal');
    expect(a.role).toBe('engineer');
    expect(a.orgId).toBe(orgId);
  });

  it('project collaborator → client', async () => {
    const a = await resolveProjectAccess(clientId, projectId);
    expect(a.scope).toBe('client');
    expect(a.role).toBe('client');
  });

  it('unrelated user → none', async () => {
    const a = await resolveProjectAccess(outsiderId, projectId);
    expect(a.scope).toBe('none');
  });

  it('unknown project → none', async () => {
    const a = await resolveProjectAccess(engineerId, '00000000-0000-0000-0000-000000000000');
    expect(a.scope).toBe('none');
  });
});

describe('assertInternal', () => {
  it('passes for internal', async () => {
    const a = await resolveProjectAccess(engineerId, projectId);
    expect(() => assertInternal(a)).not.toThrow();
  });

  it('throws AccessDeniedError for a collaborator', async () => {
    const a = await resolveProjectAccess(clientId, projectId);
    expect(() => assertInternal(a)).toThrow(AccessDeniedError);
  });
});
