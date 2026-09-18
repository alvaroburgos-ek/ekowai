import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { env } from '@/env';
import type { McpAuthContext } from './auth-context';

/**
 * Verifies a Bearer token issued by Supabase's OAuth 2.1 server.
 *
 * Supabase Auth acts as the authorization server for the MCP endpoint: the
 * Claude app discovers it, registers itself, and runs the consent flow, and the
 * access token it ends up with is a normal Supabase token. Verifying it is
 * therefore just `auth.getUser(token)` — GoTrue checks the signature and
 * expiry, so we never parse the JWT ourselves.
 *
 * Returns undefined for anything that doesn't resolve to a user; the caller
 * (`withMcpAuth`) turns that into an RFC 9728 401 pointing at the auth server.
 */
export async function verifyMcpToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const supabase = createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabase.auth.getUser(bearerToken);
  if (error || !data.user) return undefined;

  return {
    token: bearerToken,
    clientId: data.user.id,
    scopes: [],
    // Carried through to the tool handlers, which open the AsyncLocalStorage
    // scope with it so the app's server actions see this user.
    extra: {
      user: data.user,
      accessToken: bearerToken,
    } satisfies McpAuthContext,
  };
}

/** Reads back the context `verifyMcpToken` stashed in `AuthInfo.extra`. */
export function authContextFrom(authInfo: AuthInfo | undefined): McpAuthContext {
  const ctx = authInfo?.extra as McpAuthContext | undefined;
  if (!ctx?.user || !ctx.accessToken) {
    // withMcpAuth runs with `required: true`, so an unauthenticated request
    // never reaches a tool. Reaching here means the wiring broke, not that a
    // caller did something wrong — fail loudly rather than acting anonymously.
    throw new Error('MCP tool invoked without a verified auth context');
  }
  return ctx;
}
