// @vitest-environment node
/**
 * DB-gated integration test for the A_S_m single-source invariant.
 *
 * A_S_m is a single-sourced derived quantity whose canonical home is
 * DWA-A-138-1, worksheet A138-12. There must be EXACTLY ONE active field
 * with symbol='A_S_m' in that standard.
 *
 * This test guards against accidental duplication when standards are imported
 * or when a developer adds A_S_m to another worksheet.
 *
 * REQUIRES: DATABASE_URL in .env.local pointing at a live Supabase instance.
 * SKIPS cleanly if DATABASE_URL is not set (using describe.skip pattern).
 */
import { describe, it, expect } from 'vitest';

// Check if DATABASE_URL is set before importing any DB client.
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const HAS_DB = !!DATABASE_URL;
const maybe = HAS_DB ? describe : describe.skip;

maybe('A_S_m single-source invariant (integration)', () => {
  it('exactly one active A_S_m field exists in DWA-A-138-1', async () => {
    if (!HAS_DB) return; // Redundant but defensive.

    // Lazy import _setup-env here so it only runs if this branch executes.
    // This avoids the "DATABASE_URL not set" throw when tests are skipped.
    await import('../../__tests__/_setup-env');

    const { db } = await import('@/lib/db');
    const { fields, worksheetTemplates, standards } = await import('@/lib/db/schema');
    const { eq, and, count } = await import('drizzle-orm');

    const result = await db
      .select({ cnt: count() })
      .from(fields)
      .innerJoin(worksheetTemplates, eq(fields.worksheetTemplateId, worksheetTemplates.id))
      .innerJoin(standards, eq(worksheetTemplates.standardId, standards.id))
      .where(
        and(
          eq(fields.symbol, 'A_S_m'),
          eq(fields.active, true),
          eq(standards.code, 'DWA-A-138-1')
        )
      );

    const count_val = result[0]?.cnt ?? 0;
    expect(count_val).toBe(1);
  });
});
