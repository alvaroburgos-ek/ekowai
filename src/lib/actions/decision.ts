'use server';

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { calculations, decisions, orgMembers, projects } from '@/lib/db/schema';

const captureSchema = z.object({
  calcId: z.string().uuid(),
  decisionPointId: z.string().min(1),
  choice: z.string().min(1),
  rationale: z.string().max(2000).optional(),
  rationaleDraft: z.string().max(5000).optional(),
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

export async function captureDecision(
  input: z.infer<typeof captureSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = captureSchema.parse(input);
  const user = await requireUser();
  const orgId = await userOrgForCalc(parsed.calcId, user.id);
  if (!orgId) return { ok: false, error: 'no_permission' };

  await db
    .insert(decisions)
    .values({
      calculationId: parsed.calcId,
      orgId,
      decisionPointId: parsed.decisionPointId,
      choice: parsed.choice,
      rationale: parsed.rationale,
      rationaleDraft: parsed.rationaleDraft,
      madeBy: user.id,
    })
    .onConflictDoUpdate({
      target: [decisions.calculationId, decisions.decisionPointId],
      set: {
        choice: parsed.choice,
        rationale: parsed.rationale,
        rationaleDraft: parsed.rationaleDraft,
        madeBy: user.id,
        madeAt: new Date(),
      },
    });

  return { ok: true };
}

export async function listDecisionsForCalc(calcId: string) {
  await requireUser();
  return db.select().from(decisions).where(eq(decisions.calculationId, calcId));
}
