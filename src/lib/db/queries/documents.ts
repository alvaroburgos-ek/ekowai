import { db } from '@/lib/db';
import { projectDocuments } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function listProjectDocuments(projectId: string) {
  return db
    .select()
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId))
    .orderBy(desc(projectDocuments.uploadedAt));
}

export async function getProjectDocument(id: string) {
  const rows = await db
    .select()
    .from(projectDocuments)
    .where(eq(projectDocuments.id, id))
    .limit(1);
  return rows[0] ?? null;
}
