import { and, eq } from 'drizzle-orm';
import type { Database } from '@/lib/db';
import { emissionFactors } from '@/lib/db/schema';

export type ResolvedFactor = {
  ubaId: string;
  sourceVersion: string;
  scope: string;
  category: string;
  unit: string;
  kgCo2e: number;
};

export async function resolveFactor(
  db: Database,
  ubaId: string,
  sourceVersion: string,
): Promise<ResolvedFactor | null> {
  const rows = await db
    .select()
    .from(emissionFactors)
    .where(and(eq(emissionFactors.ubaId, ubaId), eq(emissionFactors.sourceVersion, sourceVersion)))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    ubaId: r.ubaId,
    sourceVersion: r.sourceVersion,
    scope: r.scope,
    category: r.category,
    unit: r.unit,
    kgCo2e: Number(r.kgCo2e),
  };
}
