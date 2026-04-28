'use server';

import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { projects, orgMembers } from '@/lib/db/schema';
import { eq, and, isNull, isNotNull, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

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

  const [project] = await db.insert(projects).values({
    orgId: membership.orgId,
    name: parsed.data.name,
    clientName: parsed.data.clientName,
    location: parsed.data.location,
    createdBy: user.id,
  }).returning({ id: projects.id });

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

  return db.select().from(projects)
    .where(and(eq(projects.orgId, memberships[0].orgId), isNull(projects.archivedAt)))
    .orderBy(projects.createdAt);
}

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
});

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

  await db.update(projects)
    .set({
      name: parsed.data.name,
      clientName: parsed.data.clientName,
      location: parsed.data.location,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, parsed.data.id));
  // RLS policy on UPDATE enforces engineer-and-above

  revalidatePath(`/${parsed.data.locale}/projects/${parsed.data.id}`);
  redirect(`/${parsed.data.locale}/projects/${parsed.data.id}`);
}

export async function archiveProject(id: string, locale: 'de' | 'en'): Promise<void> {
  await db.update(projects)
    .set({ archivedAt: new Date() })
    .where(eq(projects.id, id));
  revalidatePath(`/${locale}/projects`);
  redirect(`/${locale}/projects`);
}

export async function unarchiveProject(id: string, locale: 'de' | 'en'): Promise<void> {
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

  return db
    .select()
    .from(projects)
    .where(and(eq(projects.orgId, memberships[0].orgId), isNotNull(projects.archivedAt)))
    .orderBy(desc(projects.archivedAt));
}
