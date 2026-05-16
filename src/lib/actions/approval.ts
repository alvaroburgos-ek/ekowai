'use server';

import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import {
  approvals,
  calculations,
  decisions,
  orgMembers,
  profiles,
  projects,
} from '@/lib/db/schema';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.1';
import { compute, openDecisionPoints } from '@/lib/engine';
import { sendEmail } from '@/lib/email/client';
import {
  submittedTemplate,
  approvedTemplate,
  changesRequestedTemplate,
} from '@/lib/email/templates';
import { env } from '@/env';

const submitSchema = z.object({ calcId: z.string().uuid() });
const reviewSchema = z.object({
  calcId: z.string().uuid(),
  comment: z.string().max(2000).optional(),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return user;
}

async function userOrgForCalc(calcId: string, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ orgId: calculations.orgId })
    .from(calculations)
    .innerJoin(projects, eq(projects.id, calculations.projectId))
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(calculations.id, calcId), eq(orgMembers.userId, userId)))
    .limit(1);
  return row?.orgId ?? null;
}

function calcUrl(calcId: string, projectId: string, locale: 'de' | 'en') {
  return `${env.NEXT_PUBLIC_APP_URL}/${locale}/projects/${projectId}/calc/${calcId}`;
}

async function reviewerEmailsForOrg(orgId: string, excludeUserId: string): Promise<string[]> {
  const rows = await db
    .select({ email: profiles.email })
    .from(orgMembers)
    .innerJoin(profiles, eq(profiles.id, orgMembers.userId))
    .where(
      and(
        eq(orgMembers.orgId, orgId),
        inArray(orgMembers.role, ['owner', 'admin', 'engineer']),
      ),
    );
  return rows.map((r) => r.email).filter((e) => !!e);
  void excludeUserId;
}

async function profileForUser(userId: string) {
  const [p] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return p;
}

export async function submitForReview(input: {
  calcId: string;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      error: 'no_permission' | 'not_found' | 'blocking_violation' | 'open_decisions';
    }
> {
  const parsed = submitSchema.parse(input);
  const user = await requireUser();
  const orgId = await userOrgForCalc(parsed.calcId, user.id);
  if (!orgId) return { ok: false, error: 'no_permission' };

  const [calc] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, parsed.calcId))
    .limit(1);
  if (!calc) return { ok: false, error: 'not_found' };

  const worksheet = ALL_WORKSHEETS.find((w) => w.id === calc.worksheetId);
  if (!worksheet) return { ok: false, error: 'not_found' };

  const inputs = (calc.inputs ?? {}) as Record<string, number | string | boolean | null>;
  const result = compute(worksheet, inputs);

  if (Object.keys(result.validationErrors).length > 0) {
    return { ok: false, error: 'blocking_violation' };
  }

  if (result.compliance.status === 'blocking_violation') {
    return { ok: false, error: 'blocking_violation' };
  }

  const recorded = await db
    .select({ id: decisions.decisionPointId })
    .from(decisions)
    .where(eq(decisions.calculationId, calc.id));
  const open = openDecisionPoints(
    worksheet,
    inputs,
    result.computed,
    new Set(recorded.map((r) => r.id)),
  );
  if (open.length > 0) return { ok: false, error: 'open_decisions' };

  await db.insert(approvals).values({
    calculationId: calc.id,
    orgId,
    action: 'submitted',
    reviewerId: null,
  });

  await db.update(calculations).set({ status: 'submitted' }).where(eq(calculations.id, calc.id));

  // Notify all reviewers (other engineers/admins/owners) in the org.
  const recipients = await reviewerEmailsForOrg(orgId, user.id);
  if (recipients.length > 0) {
    const tpl = submittedTemplate({
      calcName: calc.name,
      calcUrl: calcUrl(calc.id, calc.projectId, 'de'),
      locale: 'de',
    });
    void sendEmail({ to: recipients, ...tpl });
  }

  return { ok: true };
}

async function reviewAction(
  action: 'approved' | 'rejected' | 'changes_requested',
  input: { calcId: string; comment?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = reviewSchema.parse(input);
  if ((action === 'rejected' || action === 'changes_requested') && !parsed.comment?.trim()) {
    return { ok: false, error: 'comment_required' };
  }

  const user = await requireUser();
  const orgId = await userOrgForCalc(parsed.calcId, user.id);
  if (!orgId) return { ok: false, error: 'no_permission' };

  const [calc] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, parsed.calcId))
    .limit(1);
  if (!calc) return { ok: false, error: 'not_found' };
  if (calc.status !== 'submitted') return { ok: false, error: 'not_in_review' };

  await db.insert(approvals).values({
    calculationId: calc.id,
    orgId,
    action,
    reviewerId: user.id,
    comment: parsed.comment ?? null,
  });

  await db.update(calculations).set({ status: action }).where(eq(calculations.id, calc.id));

  // Notify the calc creator.
  const creator = await profileForUser(calc.createdBy);
  const reviewer = await profileForUser(user.id);
  if (creator?.email) {
    const inputs = {
      calcName: calc.name,
      calcUrl: calcUrl(calc.id, calc.projectId, 'de'),
      reviewerName: reviewer?.fullName ?? reviewer?.email ?? null,
      comment: parsed.comment ?? null,
      locale: 'de' as const,
    };
    const tpl =
      action === 'approved'
        ? approvedTemplate(inputs)
        : changesRequestedTemplate({ ...inputs, rejected: action === 'rejected' });
    void sendEmail({ to: creator.email, ...tpl });
  }

  return { ok: true };
}

export async function approveCalculation(input: { calcId: string; comment?: string }) {
  return reviewAction('approved', input);
}
export async function rejectCalculation(input: { calcId: string; comment?: string }) {
  return reviewAction('rejected', input);
}
export async function requestChanges(input: { calcId: string; comment?: string }) {
  return reviewAction('changes_requested', input);
}

export async function listInbox() {
  const user = await requireUser();
  const memberships = await db.select().from(orgMembers).where(eq(orgMembers.userId, user.id));
  if (memberships.length === 0) return [];
  const orgIds = memberships.map((m) => m.orgId);
  return db
    .select()
    .from(calculations)
    .where(and(eq(calculations.status, 'submitted'), inArray(calculations.orgId, orgIds)));
}
