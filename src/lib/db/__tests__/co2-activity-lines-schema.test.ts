// @vitest-environment node
import './_setup-env';
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { co2ActivityLines } from '@/lib/db/schema';

describe('co2_activity_lines schema', () => {
  it('is queryable with the expected columns', async () => {
    const rows = await db.select({
      id: co2ActivityLines.id, projectId: co2ActivityLines.projectId,
      scope: co2ActivityLines.scope, amount: co2ActivityLines.amount,
      factorUbaId: co2ActivityLines.factorUbaId, computedTco2e: co2ActivityLines.computedTco2e,
    }).from(co2ActivityLines).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});
