'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { projectDocuments, projects, orgMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import {
  uploadProjectDocument,
  deleteProjectDocument,
} from '@/lib/storage/documents';
import { getProjectDocument } from '@/lib/db/queries/documents';
import { revalidatePath } from 'next/cache';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return user;
}

const KIND = z.enum([
  'lab_analysis',
  'authority_decision',
  'soil_report',
  'hydrology',
  'correspondence',
  'other',
]);

const UploadInput = z.object({
  projectId: z.string().uuid(),
  kind: KIND,
  title: z.string().min(1).max(200),
  citationLabel: z.string().min(1).max(200),
  issuedAt: z.string().date().optional(),
});

export async function uploadDocument(formData: FormData) {
  const user = await requireUser();

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false as const, error: 'no_file' };
  if (file.size > 25 * 1024 * 1024) return { ok: false as const, error: 'too_large' };

  const parsed = UploadInput.safeParse({
    projectId: formData.get('projectId'),
    kind: formData.get('kind'),
    title: formData.get('title'),
    citationLabel: formData.get('citationLabel'),
    issuedAt: formData.get('issuedAt') || undefined,
  });
  if (!parsed.success) return { ok: false as const, error: 'invalid_input' };

  // Ownership check: project must exist and user must be a member of its org.
  // Replaces table-RLS for the admin-client storage path.
  const [proj] = await db
    .select({ id: projects.id, orgId: projects.orgId })
    .from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, parsed.data.projectId), eq(orgMembers.userId, user.id)))
    .limit(1);
  if (!proj) return { ok: false as const, error: 'project_not_found' };

  const documentId = crypto.randomUUID();
  const bytes = Buffer.from(await file.arrayBuffer());
  let filePath: string;
  let sha256: string;
  try {
    const result = await uploadProjectDocument({
      orgId: proj.orgId,
      projectId: proj.id,
      documentId,
      fileName: file.name,
      bytes,
      mimeType: file.type,
    });
    filePath = result.filePath;
    sha256 = result.sha256;
  } catch {
    return { ok: false as const, error: 'storage_failed' };
  }

  await db.insert(projectDocuments).values({
    id: documentId,
    projectId: proj.id,
    orgId: proj.orgId,
    kind: parsed.data.kind,
    title: parsed.data.title,
    citationLabel: parsed.data.citationLabel,
    issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : null,
    filePath,
    fileSize: file.size,
    mimeType: file.type,
    sha256,
    uploadedBy: user.id,
  });

  revalidatePath(`/projects/${proj.id}/documents`);
  return { ok: true as const, documentId };
}

export async function deleteDocument(documentId: string) {
  const user = await requireUser();
  const doc = await getProjectDocument(documentId);
  if (!doc) return { ok: false as const, error: 'not_found' };

  // Ownership check: user must be a member of the document's org.
  const [member] = await db
    .select({ userId: orgMembers.userId })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, user.id), eq(orgMembers.orgId, doc.orgId)))
    .limit(1);
  if (!member) return { ok: false as const, error: 'forbidden' };

  try {
    await deleteProjectDocument(doc.filePath);
  } catch {
    return { ok: false as const, error: 'storage_failed' };
  }
  await db.delete(projectDocuments).where(eq(projectDocuments.id, documentId));
  revalidatePath(`/projects/${doc.projectId}/documents`);
  return { ok: true as const };
}
