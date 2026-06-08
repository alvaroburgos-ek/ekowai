import 'server-only';
import { db } from '@/lib/db';
import { complianceDeviations, complianceRequirements } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export type ActiveDeviation = {
  id: string;
  requirementId: string;
  requirementCode: string;
  justification: string;
  /** JSONB array of stored citation entries ({ id?, docId, page?, note? }). */
  basisCitations: unknown;
  /** Optional reference to the authority that approved the deviation. */
  authorityRef: string | null;
};

/** All active deviations for a project, joined to the requirement code. */
export async function loadActiveDeviations(projectId: string): Promise<ActiveDeviation[]> {
  const rows = await db
    .select({
      id: complianceDeviations.id,
      requirementId: complianceDeviations.requirementId,
      requirementCode: complianceRequirements.code,
      justification: complianceDeviations.justification,
      basisCitations: complianceDeviations.basisCitations,
      authorityRef: complianceDeviations.authorityRef,
    })
    .from(complianceDeviations)
    .innerJoin(complianceRequirements, eq(complianceRequirements.id, complianceDeviations.requirementId))
    .where(and(eq(complianceDeviations.projectId, projectId), eq(complianceDeviations.status, 'active')));
  return rows;
}
