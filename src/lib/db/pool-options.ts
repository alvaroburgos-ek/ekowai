/**
 * postgres.js pool options for the server-side Drizzle client.
 *
 * Why these values (prod evidence 2026-09-19, project TEST-A138-BESS-Mulde):
 * the Supabase pooler answered `EMAXCONNSESSION max clients reached in
 * session mode - max clients are limited to pool_size: 15` while
 * `pg_stat_activity` showed 19–20 backend sessions ALL idle and none in a
 * transaction. postgres.js keeps up to `max` (default 10) connections per
 * client and, with the default `idle_timeout: 0`, NEVER closes an idle one —
 * so two warm Vercel instances alone pin 20 pooler clients and every further
 * page render or autosave waits forever ("Wird gespeichert…", "This page
 * couldn't load").
 *
 * - `max: 3` — a page render issues a handful of short sequential/parallel
 *   selects; three connections per instance keep several warm instances
 *   under the 15-client session pool.
 * - `idle_timeout: 20` (s) — release a connection that sat idle, so a warm
 *   but quiet instance holds none.
 * - `connect_timeout: 10` (s) — fail fast instead of hanging a request when
 *   the pooler is saturated (surfaces as an error, not an endless spinner).
 * - `prepare: false` — required by the Supabase pooler (transaction mode
 *   forbids prepared statements; harmless in session mode).
 */
export const POOL_OPTIONS = {
  prepare: false,
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
} as const;
