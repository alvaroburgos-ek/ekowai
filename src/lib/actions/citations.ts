'use server';
import { db } from '@/lib/db';
import { projectParameters, auditLog } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export type CitationSource = {
  docId: string;
  page?: number;
  note?: string;
};

export async function attachCitation(input: {
  projectId: string;
  fieldId: string;
  source: CitationSource;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };
  const userId = auth.user.id;

  const citationSource = {
    docId: input.source.docId,
    page: input.source.page ?? null,
    note: input.source.note ?? null,
    attachedBy: userId,
    attachedAt: new Date().toISOString(),
  };

  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(projectParameters)
        .where(
          and(
            eq(projectParameters.projectId, input.projectId),
            eq(projectParameters.fieldId, input.fieldId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await tx.insert(projectParameters).values({
          projectId: input.projectId,
          fieldId: input.fieldId,
          sourceType: 'entered',
          citationSource,
          enteredBy: userId,
        });
      } else {
        await tx
          .update(projectParameters)
          .set({ citationSource, enteredBy: userId, enteredAt: new Date() })
          .where(
            and(
              eq(projectParameters.projectId, input.projectId),
              eq(projectParameters.fieldId, input.fieldId),
            ),
          );
      }

      await tx.insert(auditLog).values({
        actorId: userId,
        actorRole: 'engineer',
        projectId: input.projectId,
        tableName: 'project_parameters',
        recordId: input.fieldId,
        action: 'update',
        changes: { citation_attached: citationSource },
      });
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function detachCitation(input: {
  projectId: string;
  fieldId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };

  try {
    await db
      .update(projectParameters)
      .set({ citationSource: null })
      .where(
        and(
          eq(projectParameters.projectId, input.projectId),
          eq(projectParameters.fieldId, input.fieldId),
        ),
      );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Legacy aliases — kept for any older call sites
export const attachSource = attachCitation;
export const detachSource = detachCitation;
