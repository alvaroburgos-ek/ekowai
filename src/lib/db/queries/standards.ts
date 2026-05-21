import 'server-only';
import { db } from '@/lib/db';
import { standards, projectStandards } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function listStandards() {
  return db.select().from(standards).orderBy(desc(standards.createdAt));
}

export async function listProjectStandards(projectId: string) {
  return db
    .select({
      projectStandardId: projectStandards.id,
      status: projectStandards.status,
      addedAt: projectStandards.addedAt,
      standard: {
        id: standards.id,
        code: standards.code,
        titleDe: standards.titleDe,
        titleEn: standards.titleEn,
        version: standards.version,
      },
    })
    .from(projectStandards)
    .innerJoin(standards, eq(standards.id, projectStandards.standardId))
    .where(
      and(
        eq(projectStandards.projectId, projectId),
        eq(projectStandards.status, 'active'),
      ),
    );
}
