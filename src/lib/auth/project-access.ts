import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orgMembers, projects, projectCollaborators } from '@/lib/db/schema';

export type AccessScope = 'internal' | 'client' | 'designer' | 'none';

export interface ProjectAccess {
  /** internal = org member; client/designer = external project collaborator; none = no access. */
  scope: AccessScope;
  /** org_members.role for internal callers, the collaborator role for external, else null. */
  role: string | null;
  orgId: string | null;
}

/**
 * Resolve the caller's effective access to a project. Internal staff are
 * identified via org_members on the project's org; external parties via
 * project_collaborators. Returns scope 'none' when neither matches (or the
 * project does not exist). Reads only membership rows — never IP.
 */
export async function resolveProjectAccess(
  userId: string,
  projectId: string,
): Promise<ProjectAccess> {
  const proj = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (proj.length === 0) return { scope: 'none', role: null, orgId: null };
  const orgId = proj[0].orgId;

  const mem = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
    .limit(1);
  if (mem.length > 0) return { scope: 'internal', role: mem[0].role, orgId };

  const collab = await db
    .select({ role: projectCollaborators.role })
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId),
      ),
    )
    .limit(1);
  if (collab.length > 0) {
    const role = collab[0].role;
    return { scope: role === 'designer' ? 'designer' : 'client', role, orgId };
  }

  return { scope: 'none', role: null, orgId };
}

export class AccessDeniedError extends Error {
  constructor(message = 'internal role required') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

/** Throws AccessDeniedError unless the caller is internal (an org member of the project's org). */
export function assertInternal(access: ProjectAccess): void {
  if (access.scope !== 'internal') throw new AccessDeniedError();
}
