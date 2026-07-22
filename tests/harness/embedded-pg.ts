/**
 * REAL-save-path integration harness — a self-provided, disposable Postgres.
 *
 * Stands up a genuine PostgreSQL 18 server via `embedded-postgres` (a real PG
 * binary — NO Docker, NO prod, NO prod credentials), applies the app's Drizzle
 * schema (generated from `src/lib/db/schema.ts`, so no Supabase RLS/role SQL),
 * and hands back a connection string. The application's `postgres.js` client
 * (`src/lib/db`) connects over TCP exactly as in production — this exercises the
 * REAL `saveWorksheet`, not a proxy.
 *
 * WHY embedded-postgres (chosen mechanism, per HARNESS DB DECISION 2026-07-22):
 *   - postgres.js needs a real TCP Postgres. embedded-postgres ships the PG
 *     binary and starts it locally on this Windows box (verified: PG 18.4,
 *     initdb/postgres/pg_ctl present under @embedded-postgres/windows-x64).
 *   - pg-mem was the fallback but is unnecessary — the real binary works, so we
 *     get true SQL/transaction fidelity (the F/G1 tx behaviors are the point).
 *
 * The schema is applied from the Drizzle model (generateMigration on an empty
 * snapshot) rather than the committed migrations, because those migrations carry
 * Supabase-only SQL (RLS policies, GRANTs to the `anon`/`authenticated` roles,
 * `auth.users`) that a bare Postgres does not have. The app tables + enums are
 * identical; only the Supabase security layer (which `db` bypasses as the
 * postgres role anyway) is omitted.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

export type Harness = {
  databaseUrl: string;
  /** A raw postgres.js client on the harness DB (for seeding + verification reads). */
  sql: postgres.Sql;
  stop: () => Promise<void>;
};

// Each harness test file runs in its OWN vitest worker process, so a fixed
// starting port collides when 2+ harness files run in the same run (EADDRINUSE on
// 55432). Seed the counter per-process from the PID so distinct workers pick
// distinct port ranges; `startHarness` additionally retries adjacent ports on a
// bind failure (belt-and-suspenders against an unlucky PID overlap).
let portCounter = 50000 + (process.pid % 12000);

/** Generate the full CREATE DDL for the app schema from the Drizzle model. */
async function schemaDdl(): Promise<string[]> {
  const cur = generateDrizzleJson(schema as Record<string, unknown>);
  const empty = generateDrizzleJson({});
  return generateMigration(empty, cur);
}

/**
 * Start a disposable embedded Postgres, apply the app schema, return handles.
 * The caller MUST call `stop()` in afterAll to shut the server down and delete
 * its data dir.
 */
export async function startHarness(): Promise<Harness> {
  const dataDir = mkdtempSync(join(tmpdir(), 'ekowai-harness-'));

  // Bring up the PG binary, retrying adjacent ports if the chosen one is taken.
  let pg: EmbeddedPostgres | null = null;
  let port = 0;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 20; attempt++) {
    port = portCounter++;
    const candidate = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: 'postgres',
      password: 'postgres',
      port,
      persistent: false,
      // Force a UTF-8 cluster. On Windows the default initdb encoding is WIN1252
      // (from the host locale), and template1 inherits it — so a CREATE DATABASE
      // inherits WIN1252 too, and any non-ASCII write (e.g. the loading-check
      // reason string 'A_S,m ≤ 0.') fails with 22P05 report_untranslatable_char.
      // --locale=C keeps collation deterministic; --encoding=UTF8 is the fix.
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
    });
    try {
      if (attempt === 0) await candidate.initialise();
      await candidate.start();
      pg = candidate;
      break;
    } catch (e) {
      lastErr = e;
      try { await candidate.stop(); } catch { /* ignore */ }
      // initialise() only needs to run once (it writes the data dir); on a bind
      // failure we retry start() on the next port with the same initialised dir.
    }
  }
  if (!pg) throw lastErr ?? new Error('embedded-postgres failed to bind a port');
  await pg.createDatabase('harness');

  const databaseUrl = `postgres://postgres:postgres@localhost:${port}/harness`;
  const sql = postgres(databaseUrl, { prepare: false });

  // Apply schema DDL statement-by-statement.
  const stmts = await schemaDdl();
  for (const stmt of stmts) {
    await sql.unsafe(stmt);
  }

  const stop = async () => {
    try {
      await sql.end({ timeout: 5 });
    } catch {
      /* ignore */
    }
    try {
      await pg.stop();
    } catch {
      /* ignore */
    }
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  };

  return { databaseUrl, sql, stop };
}
