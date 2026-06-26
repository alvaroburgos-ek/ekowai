// @vitest-environment node
import './_setup-env';
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { emissionFactors } from '@/lib/db/schema';
import { emissionFactors as ef } from '@/lib/db/schema';

describe('emission_factors schema', () => {
  it('is queryable and exposes the citation + value columns', async () => {
    const rows = await db
      .select({
        id: emissionFactors.id,
        ubaId: emissionFactors.ubaId,
        scope: emissionFactors.scope,
        category: emissionFactors.category,
        subcategory: emissionFactors.subcategory,
        unit: emissionFactors.unit,
        kgCo2e: emissionFactors.kgCo2e,
        sourceVersion: emissionFactors.sourceVersion,
        datasetYear: emissionFactors.datasetYear,
      })
      .from(emissionFactors)
      .limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('rejects duplicate (uba_id, source_version)', async () => {
    const row = {
      ubaId: 'TEST_DUP_01', scope: 'Scope 2', category: 'Test', unit: 'kWh',
      kgCo2e: '0.1', sourceVersion: 'vtest', datasetYear: 2026,
    };
    await db.insert(ef).values(row);
    await expect(db.insert(ef).values(row)).rejects.toThrow();
    // cleanup
    await db.delete(ef).where(eq(ef.ubaId, 'TEST_DUP_01'));
  });
});
