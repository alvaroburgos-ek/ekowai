import 'server-only';
import { db } from '@/lib/db';
import { complianceDeviations, complianceRequirements } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export type ActiveDeviation = { id: string; requirementId: string; requirementCode: string; justification: string };

/** All active deviations for a project, joined to the requirement code. */
export async function loadActiveDeviations(projectId: string): Promise<ActiveDeviation[]> {
  const rows = await db
    .select({
      id: complianceDeviations.id,
      requirementId: complianceDeviations.requirementId,
      requirementCode: complianceRequirements.code,
      justification: complianceDeviations.justification,
    })
    .from(complianceDeviations)
    .innerJoin(complianceRequirements, eq(complianceRequirements.id, complianceDeviations.requirementId))
    .where(and(eq(complianceDeviations.projectId, projectId), eq(complianceDeviations.status, 'active')));
  return rows;
}
