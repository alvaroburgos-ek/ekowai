import 'server-only';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';

export type CreateProjectInput = {
  orgId: string;
  createdBy: string;
  name: string;
  clientName?: string | null;
  location?: string | null;
  siteProfile?: Record<string, unknown> | null;
};

/** Insert a project row and return its id. Shared by the `createProject` form
 * action (which then redirects) and the `convertLeadToProject` action (which
 * needs the id back). Applies the same defaults the form path uses — siteProfile
 * is stored as null when empty. */
export async function createProjectForOrg(input: CreateProjectInput): Promise<{ id: string }> {
  const siteProfile =
    input.siteProfile && Object.keys(input.siteProfile).length > 0 ? input.siteProfile : null;
  const [project] = await db
    .insert(projects)
    .values({
      orgId: input.orgId,
      name: input.name,
      clientName: input.clientName ?? undefined,
      location: input.location ?? undefined,
      siteProfile,
      createdBy: input.createdBy,
    })
    .returning({ id: projects.id });
  return project;
}
