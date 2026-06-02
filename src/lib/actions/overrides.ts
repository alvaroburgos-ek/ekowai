'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import {
  auditLog,
  projects,
  orgMembers,
  fields,
  worksheetInstances,
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return user;
}

const Input = z.object({
  projectId: z.string().uuid(),
  fieldId: z.string().uuid(),
  equationNumber: z.string().min(1).max(50),
  reason: z.string().min(10).max(2000),
});

export type RecordManualOverrideInput = z.infer<typeof Input>;
export type RecordManualOverrideResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Record an engineer's deliberate manual override of an equation's computed
 * output value. The override itself lives in `project_parameters` (written by
 * saveWorksheet); this action only persists the engineer's justification into
 * `audit_log` so the report timeline shows WHY the computed verdict was set
 * aside.
 *
 * No new DB tables — the reason payload rides on the existing jsonb `changes`
 * column with `action='manual_override'` so it sorts alongside other
 * field-level audit events.
 */
export async function recordManualOverride(
  input: RecordManualOverrideInput,
): Promise<RecordManualOverrideResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  const parsed = Input.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? 'invalid_input',
    };
  }
  const { projectId, fieldId, equationNumber, reason } = parsed.data;

  // Ownership check: project must exist and user must be a member of its org.
  const [proj] = await db
    .select({ id: projects.id, orgId: projects.orgId })
    .from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, projectId), eq(orgMembers.userId, user.id)))
    .limit(1);
  if (!proj) return { ok: false, error: 'project_not_found' };

  // Field-belongs-to-project check: the fieldId must live in a worksheet
  // template that this project has instantiated. Without this, an engineer
  // could plant a manual_override audit row referencing a field from any
  // standard not actually used in their project — corrupting the report
  // timeline with phantom overrides.
  const [fieldMembership] = await db
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
  if (!fieldMembership) return { ok: false, error: 'field_not_in_project' };

  await db.insert(auditLog).values({
    actorId: user.id,
    actorRole: 'engineer',
    projectId: proj.id,
    orgId: proj.orgId,
    tableName: 'project_parameters',
    recordId: fieldId,
    action: 'manual_override',
    changes: {
      fieldId,
      equationNumber,
      reason: reason.trim(),
    },
  });

  return { ok: true };
}
