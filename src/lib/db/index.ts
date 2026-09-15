import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';
import * as schema from './schema';

// Serverless connection sizing. Every Vercel lambda instance gets its own
// postgres-js pool, but they all share ONE Supabase pooler budget. The
// postgres-js defaults (max: 10, idle_timeout: null — connections are never
// released) meant a single warm instance could hold 10 of the pooler's 15
// session-mode slots forever; two instances exhausted it and every query
// afterwards died with EMAXCONNSESSION, which the App Router surfaces as
// "This page couldn't load".
//
// max: 1          — one connection per instance, so N warm instances cost N slots.
// idle_timeout    — hand the connection back between requests instead of pinning it.
// max_lifetime    — recycle, so a pooler restart can't leave us on a dead socket.
// connect_timeout — fail fast rather than stalling a render for the 30s default.
const queryClient = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 10,
});
export const db = drizzle(queryClient, { schema });
export type Database = typeof db;
