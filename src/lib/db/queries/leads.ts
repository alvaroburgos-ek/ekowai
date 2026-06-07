import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { leads, profiles, projects } from '@/lib/db/schema';
import { count, desc, eq } from 'drizzle-orm';
import type { LeadStatus } from '@/lib/types/lead';

export type LeadRow = {
  id: string;
  createdAt: Date;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  topic: string;
  message: string | null;
  locale: string;
  standardCode: string | null;
  source: string;
  sourcePath: string | null;
  status: string;
  claimedByUserId: string | null;
  claimedByName: string | null;
  claimedByEmail: string | null;
  claimedAt: Date | null;
  convertedToProjectId: string | null;
  convertedProjectName: string | null;
  archivedAt: Date | null;
};

/** List leads, newest first, optionally filtered by status. Joins the claiming
 * engineer's profile and the converted project's name for display. Reads via
 * the postgres-role `db` client (bypasses RLS) — the /leads page guards access
 * with currentUserIsPlatformEngineer() before calling this. */
export const listLeads = cache(async (status?: LeadStatus): Promise<LeadRow[]> => {
  return db
    .select({
      id: leads.id,
      createdAt: leads.createdAt,
      name: leads.name,
      email: leads.email,
      company: leads.company,
      phone: leads.phone,
      topic: leads.topic,
      message: leads.message,
      locale: leads.locale,
      standardCode: leads.standardCode,
      source: leads.source,
      sourcePath: leads.sourcePath,
      status: leads.status,
      claimedByUserId: leads.claimedByUserId,
      claimedByName: profiles.fullName,
      claimedByEmail: profiles.email,
      claimedAt: leads.claimedAt,
      convertedToProjectId: leads.convertedToProjectId,
      convertedProjectName: projects.name,
      archivedAt: leads.archivedAt,
    })
    .from(leads)
    .leftJoin(profiles, eq(profiles.id, leads.claimedByUserId))
    .leftJoin(projects, eq(projects.id, leads.convertedToProjectId))
    .where(status ? eq(leads.status, status) : undefined)
    .orderBy(desc(leads.createdAt));
});

export type LeadStatusCounts = Record<LeadStatus, number> & { all: number };

/** Per-status counts for the filter tabs + the total. */
export const loadLeadStatusCounts = cache(async (): Promise<LeadStatusCounts> => {
  const rows = await db
    .select({ status: leads.status, n: count() })
    .from(leads)
    .groupBy(leads.status);

  const counts: LeadStatusCounts = { new: 0, contacted: 0, converted: 0, archived: 0, all: 0 };
  for (const r of rows) {
    const n = Number(r.n);
    counts.all += n;
    if (r.status === 'new' || r.status === 'contacted' || r.status === 'converted' || r.status === 'archived') {
      counts[r.status] = n;
    }
  }
  return counts;
});

/** Count of unhandled (`new`) leads — used for the nav badge. */
export const loadNewLeadsCount = cache(async (): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(leads)
    .where(eq(leads.status, 'new'));
  return Number(row?.n ?? 0);
});
