// @vitest-environment node
/**
 * Schema smoke test for calculation_snapshots — verifies the migration
 * landed on the test DB and the table is selectable through Drizzle. Mirrors
 * the pattern from documents-schema.test.ts (lives in the integration
 * project so it only runs when DATABASE_URL points at a real DB).
 */
import './_setup-env';
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { calculationSnapshots } from '@/lib/db/schema';

describe('calculation_snapshots schema', () => {
  it('table is queryable through Drizzle', async () => {
    const rows = await db.select().from(calculationSnapshots).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('exposes the three JSONB columns + trigger column', async () => {
    // Touch every column the diff feature relies on so a missing migration
    // surfaces as a typed/runtime error here instead of a 500 in prod.
    const rows = await db
      .select({
        id: calculationSnapshots.id,
        worksheetInstanceId: calculationSnapshots.worksheetInstanceId,
        projectId: calculationSnapshots.projectId,
        takenAt: calculationSnapshots.takenAt,
        takenByUserId: calculationSnapshots.takenByUserId,
        trigger: calculationSnapshots.trigger,
        parameters: calculationSnapshots.parameters,
        equationOutputs: calculationSnapshots.equationOutputs,
        complianceResults: calculationSnapshots.complianceResults,
      })
      .from(calculationSnapshots)
      .limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});
