import 'server-only';
import { db } from '@/lib/db';
import {
  reportArchives,
  worksheetInstances,
  worksheetTemplates,
  profiles,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function listReportArchivesForProject(projectId: string) {
  // report_archives has no projectId column — join through worksheet_instances
  return db
    .select({
      id: reportArchives.id,
      generatedAt: reportArchives.generatedAt,
      filePath: reportArchives.filePath,
      worksheetCode: worksheetTemplates.code,
      worksheetTitleDe: worksheetTemplates.titleDe,
      generatedByName: profiles.fullName,
    })
    .from(reportArchives)
    .leftJoin(worksheetInstances, eq(worksheetInstances.id, reportArchives.worksheetInstanceId))
    .leftJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .leftJoin(profiles, eq(profiles.id, reportArchives.generatedBy))
    .where(eq(worksheetInstances.projectId, projectId))
    .orderBy(desc(reportArchives.generatedAt));
}

// Legacy alias for compile compat
export const listProjectArchives = listReportArchivesForProject;
