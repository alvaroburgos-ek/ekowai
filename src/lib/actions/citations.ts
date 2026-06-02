'use server';
import { db } from '@/lib/db';
import {
  projectParameters,
  auditLog,
  projects,
  orgMembers,
  fields,
  worksheetInstances,
} from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export type CitationSource = {
  docId: string;
  page?: number;
  note?: string;
};

export type StoredCitation = {
  id: string;
  docId: string;
  page: number | null;
  note: string | null;
  attachedBy: string;
  attachedAt: string;
};

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('unauthorized');
  return auth.user.id;
}

/** Resolves orgId iff caller is a member of the project's org. Replaces the
 *  prior boolean-returning helper so callers can stamp orgId into audit_log
 *  without depending on the fill-trigger. Returns null on access denial. */
async function resolveProjectOrgId(
  userId: string,
  projectId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, projectId), eq(orgMembers.userId, userId)))
    .limit(1);
  return row?.orgId ?? null;
}

/** Returns true iff `fieldId` belongs to a worksheet template the project has
 *  instantiated. Blocks IDOR where a member writes citation_sources for a
 *  field from an unrelated standard. */
async function assertFieldInProject(
  fieldId: string,
  projectId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: fields.id })
    .from(fields)
    .innerJoin(
      worksheetInstances,
      eq(worksheetInstances.worksheetTemplateId, fields.worksheetTemplateId),
    )
    .where(
      and(eq(fields.id, fieldId), eq(worksheetInstances.projectId, projectId)),
    )
    .limit(1);
  return !!row;
}

/** Append a citation to a field's citation_sources array. Creates the
 * project_parameters row if it doesn't exist yet. Returns the new id. */
export async function addCitation(input: {
  projectId: string;
  fieldId: string;
  source: CitationSource;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  let userId: string;
  try {
    userId = await requireUser();
  } catch {
    return { ok: false, error: 'Not authenticated' };
  }
  const orgId = await resolveProjectOrgId(userId, input.projectId);
  if (!orgId) return { ok: false, error: 'project_not_found' };
  if (!(await assertFieldInProject(input.fieldId, input.projectId))) {
    return { ok: false, error: 'field_not_in_project' };
  }

  const citation: StoredCitation = {
    id: crypto.randomUUID(),
    docId: input.source.docId,
    page: input.source.page ?? null,
    note: input.source.note ?? null,
    attachedBy: userId,
    attachedAt: new Date().toISOString(),
  };

  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: projectParameters.id })
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
          citationSources: [citation],
          enteredBy: userId,
        });
      } else {
        await tx
          .update(projectParameters)
          .set({
            citationSources: sql`coalesce(${projectParameters.citationSources}, '[]'::jsonb) || ${JSON.stringify(citation)}::jsonb`,
            enteredBy: userId,
            enteredAt: new Date(),
          })
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
        orgId,
        tableName: 'project_parameters',
        recordId: input.fieldId,
        action: 'update',
        changes: { citation_added: citation },
      });
    });
    return { ok: true, id: citation.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Remove a single citation by id from a field's citation_sources array. */
export async function removeCitation(input: {
  projectId: string;
  fieldId: string;
  citationId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let userId: string;
  try {
    userId = await requireUser();
  } catch {
    return { ok: false, error: 'Not authenticated' };
  }
  const orgId = await resolveProjectOrgId(userId, input.projectId);
  if (!orgId) return { ok: false, error: 'project_not_found' };
  if (!(await assertFieldInProject(input.fieldId, input.projectId))) {
    return { ok: false, error: 'field_not_in_project' };
  }

  try {
    await db.transaction(async (tx) => {
      // Filter the array, keeping all entries whose id != citationId.
      await tx
        .update(projectParameters)
        .set({
          citationSources: sql`coalesce((
            SELECT jsonb_agg(elem)
            FROM jsonb_array_elements(${projectParameters.citationSources}) AS elem
            WHERE elem->>'id' <> ${input.citationId}
          ), '[]'::jsonb)`,
        })
        .where(
          and(
            eq(projectParameters.projectId, input.projectId),
            eq(projectParameters.fieldId, input.fieldId),
          ),
        );

      await tx.insert(auditLog).values({
        actorId: userId,
        actorRole: 'engineer',
        projectId: input.projectId,
        orgId,
        tableName: 'project_parameters',
        recordId: input.fieldId,
        action: 'update',
        changes: { citation_removed: input.citationId },
      });
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Legacy single-citation alias: replaces all citations with one entry. Kept
 * so existing callers (older CitationPicker, tests) keep working until they
 * migrate to addCitation. */
export async function attachCitation(input: {
  projectId: string;
  fieldId: string;
  source: CitationSource;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let userId: string;
  try {
    userId = await requireUser();
  } catch {
    return { ok: false, error: 'Not authenticated' };
  }
  const orgId = await resolveProjectOrgId(userId, input.projectId);
  if (!orgId) return { ok: false, error: 'project_not_found' };
  if (!(await assertFieldInProject(input.fieldId, input.projectId))) {
    return { ok: false, error: 'field_not_in_project' };
  }

  const citation: StoredCitation = {
    id: crypto.randomUUID(),
    docId: input.source.docId,
    page: input.source.page ?? null,
    note: input.source.note ?? null,
    attachedBy: userId,
    attachedAt: new Date().toISOString(),
  };

  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: projectParameters.id })
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
          citationSources: [citation],
          enteredBy: userId,
        });
      } else {
        await tx
          .update(projectParameters)
          .set({
            citationSources: [citation],
            enteredBy: userId,
            enteredAt: new Date(),
          })
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
        orgId,
        tableName: 'project_parameters',
        recordId: input.fieldId,
        action: 'update',
        changes: { citation_attached: citation },
      });
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Legacy: clear all citations. Kept for backward compat. */
export async function detachCitation(input: {
  projectId: string;
  fieldId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let userId: string;
  try {
    userId = await requireUser();
  } catch {
    return { ok: false, error: 'Not authenticated' };
  }
  const orgId = await resolveProjectOrgId(userId, input.projectId);
  if (!orgId) return { ok: false, error: 'project_not_found' };
  if (!(await assertFieldInProject(input.fieldId, input.projectId))) {
    return { ok: false, error: 'field_not_in_project' };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(projectParameters)
        .set({ citationSources: [] })
        .where(
          and(
            eq(projectParameters.projectId, input.projectId),
            eq(projectParameters.fieldId, input.fieldId),
          ),
        );

      await tx.insert(auditLog).values({
        actorId: userId,
        actorRole: 'engineer',
        projectId: input.projectId,
        orgId,
        tableName: 'project_parameters',
        recordId: input.fieldId,
        action: 'update',
        changes: { citations_cleared: true },
      });
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Legacy aliases — kept for any older call sites
export const attachSource = attachCitation;
export const detachSource = detachCitation;
