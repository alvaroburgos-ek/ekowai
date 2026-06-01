import { env } from '@/env';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/** Parse PLATFORM_ENGINEER_EMAILS once. Returns a lowercased set so we can
 * tolerate trailing whitespace and case mismatch. Empty when the env var is
 * unset → no one is a platform engineer. */
function platformEngineerEmails(): Set<string> {
  const raw = env.PLATFORM_ENGINEER_EMAILS;
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformEngineerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return platformEngineerEmails().has(email.toLowerCase());
}

export function isPlatformEngineer(user: User | null | undefined): boolean {
  return isPlatformEngineerEmail(user?.email);
}

/** Read current user via the SSR Supabase client and return whether they are
 * on the platform-engineer allowlist. Server-only — call from server actions
 * and server components. */
export async function currentUserIsPlatformEngineer(): Promise<boolean> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isPlatformEngineer(user);
}

/** Throw if the current user is not a platform engineer. Use at the top of
 * any server action that mutates global template state. */
export async function requirePlatformEngineer(): Promise<User> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isPlatformEngineer(user)) {
    throw new Error('Not authorized: platform-engineer role required');
  }
  return user!;
}
