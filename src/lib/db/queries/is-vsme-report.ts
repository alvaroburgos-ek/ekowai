import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectStandards, standards } from '@/lib/db/schema';

/** True iff the project links the VSME standard (code 'VSME'). */
export async function isVsmeReport(projectId: string): Promise<boolean> {
  const rows = await db
    .select({ id: projectStandards.id })
    .from(projectStandards)
    .innerJoin(standards, eq(projectStandards.standardId, standards.id))
    .where(and(eq(projectStandards.projectId, projectId), eq(standards.code, 'VSME')))
    .limit(1);
  return rows.length > 0;
}
