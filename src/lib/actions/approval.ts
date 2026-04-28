'use server';

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import {
  approvals,
  calculations,
  decisions,
  orgMembers,
  projects,
} from '@/lib/db/schema';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.2';
import { compute, openDecisionPoints } from '@/lib/engine';

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
  return db.select().from(calculations).where(eq(calculations.status, 'submitted'));
}
