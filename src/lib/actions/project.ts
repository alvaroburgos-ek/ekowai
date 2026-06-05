'use server';

import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { projects, orgMembers } from '@/lib/db/schema';
import { eq, and, inArray, isNull, isNotNull, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { readSiteProfileFromFormData } from '@/lib/site-profile/form-helpers';
import { createProjectForOrg } from '@/lib/projects/create-project';

const createSchema = z.object({
  name: z.string().min(2).max(200),
  clientName: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  locale: z.enum(['de', 'en']),
});

export async function createProject(formData: FormData): Promise<void> {
  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    clientName: formData.get('clientName') || undefined,
    location: formData.get('location') || undefined,
    locale: formData.get('locale'),
  });
  if (!parsed.success) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // Find user's org (MVP: single org per user)
  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id))
    .limit(1);
  if (!membership) redirect(`/${parsed.data.locale}/verify`);

  const siteProfile = readSiteProfileFromFormData(formData);
  const project = await createProjectForOrg({
    orgId: membership.orgId,
    createdBy: user.id,
    name: parsed.data.name,
    clientName: parsed.data.clientName,
    location: parsed.data.location,
    siteProfile,
  });

  revalidatePath(`/${parsed.data.locale}/projects`);
  redirect(`/${parsed.data.locale}/projects/${project.id}`);
}

export async function listProjectsForUser(userId: string) {
  // RLS scopes this automatically when using the user's session;
  // here we use Drizzle direct (server-side) so we filter manually for now.
  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId));
  if (memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.orgId);
  return db
    .select()
    .from(projects)
    .where(and(inArray(projects.orgId, orgIds), isNull(projects.archivedAt)))
    .orderBy(projects.createdAt);
}

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
});

async function assertProjectMember(userId: string, projectId: string): Promise<void> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, projectId), eq(orgMembers.userId, userId)))
    .limit(1);
  if (!row) redirect('/');
}

export async function updateProject(formData: FormData): Promise<void> {
  const parsed = updateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    clientName: formData.get('clientName') || undefined,
    location: formData.get('location') || undefined,
    locale: formData.get('locale'),
  });
  if (!parsed.success) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  await assertProjectMember(user.id, parsed.data.id);

  const siteProfile = readSiteProfileFromFormData(formData);
  await db.update(projects)
    .set({
      name: parsed.data.name,
      clientName: parsed.data.clientName,
      location: parsed.data.location,
      siteProfile: Object.keys(siteProfile).length > 0 ? siteProfile : null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, parsed.data.id));

  revalidatePath(`/${parsed.data.locale}/projects/${parsed.data.id}`);
  redirect(`/${parsed.data.locale}/projects/${parsed.data.id}`);
}

export async function archiveProject(id: string, locale: 'de' | 'en'): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  await assertProjectMember(user.id, id);

  await db.update(projects)
    .set({ archivedAt: new Date() })
    .where(eq(projects.id, id));
  revalidatePath(`/${locale}/projects`);
  redirect(`/${locale}/projects`);
}

export async function unarchiveProject(id: string, locale: 'de' | 'en'): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  await assertProjectMember(user.id, id);

  await db.update(projects)
    .set({ archivedAt: null })
    .where(eq(projects.id, id));
  revalidatePath(`/${locale}/projects`);
  revalidatePath(`/${locale}/projects/archive`);
  redirect(`/${locale}/projects/${id}`);
}

export async function listArchivedProjectsForUser(userId: string) {
  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId));
  if (memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.orgId);
  return db
    .select()
    .from(projects)
    .where(and(inArray(projects.orgId, orgIds), isNotNull(projects.archivedAt)))
    .orderBy(desc(projects.archivedAt));
}
