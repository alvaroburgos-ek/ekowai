import { AsyncLocalStorage } from 'node:async_hooks';
import type { User } from '@supabase/supabase-js';

/**
 * Per-request identity for calls arriving over MCP instead of the browser.
 *
 * The app's server actions authenticate by calling `createClient()` from
 * `@/lib/supabase/server`, which reads the session from cookies. An MCP request
 * carries a Bearer token instead — there is no cookie jar to read. Rather than
 * rewriting ~73 actions to take an explicit userId, the MCP route opens this
 * store for the duration of the request and `createClient()` consults it first.
 * Every action then resolves the same user it would have resolved in the app,
 * and `resolveProjectAccess` keeps working untouched.
 *
 * AsyncLocalStorage is per async call chain, never global: two concurrent MCP
 * requests each see their own user. NEVER replace this with a module-level
 * variable — that would leak one caller's identity into another's request.
 */
export type McpAuthContext = {
  /** The Supabase user this MCP request acts as. */
  user: User;
  /** The raw access token, forwarded so Storage/PostgREST calls carry the identity too. */
  accessToken: string;
};

const store = new AsyncLocalStorage<McpAuthContext>();

/** Run `fn` with the MCP caller's identity visible to `createClient()`. */
export function runWithMcpAuth<T>(ctx: McpAuthContext, fn: () => T): T {
  return store.run(ctx, fn);
}

/** The current MCP identity, or undefined when not inside an MCP request. */
export function getMcpAuth(): McpAuthContext | undefined {
  return store.getStore();
}
