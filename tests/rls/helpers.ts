import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.CI_SUPABASE_URL!;
const ANON = process.env.CI_SUPABASE_ANON_KEY!;
const SERVICE = process.env.CI_SUPABASE_SERVICE_ROLE_KEY!;

export const admin = () =>
  createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

export async function makeUser(email: string): Promise<{ id: string; client: SupabaseClient }> {
  const a = admin();
  const { data: existing } = await a.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === email);
  if (found) await a.auth.admin.deleteUser(found.id);
  const { data, error } = await a.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'rls-test-password',
  });
  if (error || !data.user) throw error ?? new Error('createUser failed');
  const client = createClient(URL, ANON);
  const { error: signErr } = await client.auth.signInWithPassword({
    email,
    password: 'rls-test-password',
  });
  if (signErr) throw signErr;
  return { id: data.user.id, client };
}

export async function cleanup(emails: string[]): Promise<void> {
  const a = admin();
  const { data } = await a.auth.admin.listUsers();
  for (const e of emails) {
    const u = data.users.find((u) => u.email === e);
    if (u) await a.auth.admin.deleteUser(u.id);
  }
}

export async function makeOrg(
  _client: SupabaseClient,
  userId: string,
  name: string,
): Promise<string> {
  const a = admin();
  const slug = `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: org, error } = await a.from('orgs').insert({ name, slug }).select('id').single();
  if (error) throw error;
  const { error: memErr } = await a
    .from('org_members')
    .insert({ org_id: org.id, user_id: userId, role: 'owner' });
  if (memErr) throw memErr;
  return org.id;
}
