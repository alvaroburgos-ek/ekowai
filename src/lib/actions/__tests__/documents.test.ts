// @vitest-environment node
import './_setup-env'; // sets BYPASS_AUTH + BYPASS_AUTH_USER_ID before any other imports
import { describe, it, expect, beforeAll, vi } from 'vitest';

// revalidatePath() requires Next.js request/static-generation context that
// vitest doesn't provide; stub it before importing the actions module.
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

import { uploadDocument, deleteDocument } from '@/lib/actions/documents';
import { db } from '@/lib/db';
import { projectDocuments, projects, orgMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('documents server actions', () => {
  let projectId: string;

  beforeAll(async () => {
    // The bypass user_id is set by _setup-env.ts; pick any project that
    // user is a member of via their org membership.
    const userId = process.env.BYPASS_AUTH_USER_ID!;
    const [row] = await db
      .select({ projectId: projects.id })
      .from(projects)
      .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
      .where(eq(orgMembers.userId, userId))
      .limit(1);
    if (!row) throw new Error('seed required: pnpm tsx scripts/seed-demo.ts');
    projectId = row.projectId;
  });

  it('uploads a small PDF and lists it', async () => {
    const fd = new FormData();
    const blob = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], {
      type: 'application/pdf',
    });
    fd.append('file', new File([blob], 'test.pdf', { type: 'application/pdf' }));
    fd.append('projectId', projectId);
    fd.append('kind', 'lab_analysis');
    fd.append('title', 'Test lab analysis');
    fd.append('citationLabel', 'Test 2026-05-03');

    const r = await uploadDocument(fd);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const [row] = await db
        .select()
        .from(projectDocuments)
        .where(eq(projectDocuments.id, r.documentId));
      expect(row.title).toBe('Test lab analysis');
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.fileSize).toBe(4); // %PDF = 4 bytes
      // cleanup (also exercises deleteDocument)
      const dr = await deleteDocument(r.documentId);
      expect(dr.ok).toBe(true);
    }
  });

  it('rejects oversized files', async () => {
    const fd = new FormData();
    const big = new Blob([new Uint8Array(26 * 1024 * 1024)], {
      type: 'application/pdf',
    });
    fd.append('file', new File([big], 'big.pdf', { type: 'application/pdf' }));
    fd.append('projectId', projectId);
    fd.append('kind', 'other');
    fd.append('title', 't');
    fd.append('citationLabel', 'l');

    const r = await uploadDocument(fd);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('too_large');
  });
});
