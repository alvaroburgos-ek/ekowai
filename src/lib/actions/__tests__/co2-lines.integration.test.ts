// @vitest-environment node
// Must be FIRST import — populates process.env before any DB client initialises
import '../../db/__tests__/_setup-env';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { vi } from 'vitest';

// revalidatePath requires a Next.js request context — stub it before importing actions.
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

import { db } from '@/lib/db';
import { co2ActivityLines } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { seedCo2Fixture } from './_co2-fixture';
import type { Co2FixtureCtx } from './_co2-fixture';
import { addCo2Line, deleteCo2Line } from '@/lib/actions/co2-lines';
import { recomputeB3Co2 } from '@/lib/actions/co2';

describe('co2-lines actions (integration)', () => {
  let ctx: Co2FixtureCtx;
  let insertedLineId: string;

  beforeAll(async () => {
    ctx = await seedCo2Fixture(db);
  });

  afterAll(async () => {
    // Clean up the line we inserted (if it still exists after the deleteCo2Line test)
    if (insertedLineId) {
      await db
        .delete(co2ActivityLines)
        .where(eq(co2ActivityLines.id, insertedLineId))
        .catch(() => {/* already deleted — ignore */});
    }
    if (ctx?.cleanup) await ctx.cleanup();
  });

  it('addCo2Line inserts a row and returns its id', async () => {
    const result = await addCo2Line({
      projectId: ctx.projectId,
      worksheetInstanceId: ctx.worksheetInstanceId,
      scope: 'Scope 1',
      category: 'Dieselgenerator',
      subcategory: null,
      amount: 500,
      unit: 'l',
      factorUbaId: '01_10_01_001_04',
      factorSourceVersion: 'v2.1',
      createdBy: ctx.userId,
    });

    expect(result.id).toBeTruthy();
    insertedLineId = result.id;

    // Read-back confirms the row exists in the DB
    const [row] = await db
      .select({ id: co2ActivityLines.id, category: co2ActivityLines.category, scope: co2ActivityLines.scope })
      .from(co2ActivityLines)
      .where(eq(co2ActivityLines.id, result.id));

    expect(row).toBeDefined();
    expect(row.category).toBe('Dieselgenerator');
    expect(row.scope).toBe('Scope 1');
  });

  it('addCo2Line rejects invalid scope', async () => {
    await expect(
      addCo2Line({
        projectId: ctx.projectId,
        worksheetInstanceId: ctx.worksheetInstanceId,
        scope: 'Scope 3' as 'Scope 1',
        category: 'Invalid',
        subcategory: null,
        amount: 100,
        unit: 'kg',
        factorUbaId: '01_10_01_001_04',
        factorSourceVersion: 'v2.1',
        createdBy: ctx.userId,
      }),
    ).rejects.toThrow(/scope/i);
  });

  it('recompute returns scope1 > 0 and sets computed_tco2e on inserted line', async () => {
    // The fixture has Scope 1 + Scope 2 lines; we also added a Scope 1 line above.
    // Call recomputeB3Co2 directly (bypasses the auth layer — no GoTrue in tests).
    const totals = await recomputeB3Co2(ctx.projectId, ctx.worksheetInstanceId, ctx.userId);

    expect(totals.scope1).toBeGreaterThan(0);
    expect(totals.totalLocation).toBeGreaterThan(0);
    expect(totals.lineCount).toBeGreaterThanOrEqual(2);

    // Read back the inserted line — computed_tco2e must now be set
    const [line] = await db
      .select({ computedTco2e: co2ActivityLines.computedTco2e })
      .from(co2ActivityLines)
      .where(eq(co2ActivityLines.id, insertedLineId));

    expect(line).toBeDefined();
    expect(line.computedTco2e).not.toBeNull();
    expect(Number(line.computedTco2e)).toBeGreaterThan(0);
  });

  it('deleteCo2Line removes the row from the DB', async () => {
    await deleteCo2Line(insertedLineId, ctx.userId);

    const rows = await db
      .select({ id: co2ActivityLines.id })
      .from(co2ActivityLines)
      .where(eq(co2ActivityLines.id, insertedLineId));

    expect(rows.length).toBe(0);

    // Mark as cleaned up so afterAll doesn't try again
    insertedLineId = '';
  });
});
