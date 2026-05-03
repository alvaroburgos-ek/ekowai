import { db } from '@/lib/db';
import { reportArchives, calculations } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function listProjectArchives(projectId: string) {
  return db
    .select({
      archive: reportArchives,
      calc: calculations,
    })
    .from(reportArchives)
    .innerJoin(calculations, eq(calculations.id, reportArchives.calculationId))
    .where(eq(calculations.projectId, projectId))
    .orderBy(desc(reportArchives.generatedAt));
}
