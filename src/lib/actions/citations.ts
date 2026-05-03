'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import {
  calculations,
  projectDocuments,
  orgMembers,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { normalizeInputs } from '@/lib/engine/inputs-reader';
import { revalidatePath } from 'next/cache';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return user;
}

const SourceInput = z.union([
  z.object({
    docId: z.string().uuid(),
    page: z.number().int().positive().optional(),
  }),
  z.object({ label: z.string().min(1).max(200) }),
]);

const AttachInput = z.object({
  calcId: z.string().uuid(),
  symbol: z.string().min(1),
  source: SourceInput,
});

async function loadCalcWithMembership(calcId: string, userId: string) {
  const [row] = await db
    .select({
      id: calculations.id,
      projectId: calculations.projectId,
      orgId: calculations.orgId,
      inputs: calculations.inputs,
    })
    .from(calculations)
    .innerJoin(orgMembers, eq(orgMembers.orgId, calculations.orgId))
    .where(and(eq(calculations.id, calcId), eq(orgMembers.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function attachSource(args: z.infer<typeof AttachInput>) {
  const user = await requireUser();
  const parsed = AttachInput.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: 'invalid_input' };

  const calc = await loadCalcWithMembership(parsed.data.calcId, user.id);
  if (!calc) return { ok: false as const, error: 'calc_not_found' };

  // For docId source, verify the doc belongs to the same project
  if ('docId' in parsed.data.source) {
    const [doc] = await db
      .select({ id: projectDocuments.id })
      .from(projectDocuments)
      .where(
        and(
          eq(projectDocuments.id, parsed.data.source.docId),
          eq(projectDocuments.projectId, calc.projectId),
        ),
      )
      .limit(1);
    if (!doc) return { ok: false as const, error: 'doc_not_in_project' };
  }

  const cells = normalizeInputs(calc.inputs as Record<string, any>);
  const cell = cells[parsed.data.symbol];
  if (!cell) return { ok: false as const, error: 'symbol_not_found' };

  cells[parsed.data.symbol] = { value: cell.value, source: parsed.data.source };

  await db
    .update(calculations)
    .set({ inputs: cells, updatedAt: new Date() })
    .where(eq(calculations.id, parsed.data.calcId));

  revalidatePath(`/projects/${calc.projectId}/calc/${calc.id}`);
  return { ok: true as const };
}

const DetachInput = z.object({
  calcId: z.string().uuid(),
  symbol: z.string().min(1),
});

export async function detachSource(args: z.infer<typeof DetachInput>) {
  const user = await requireUser();
  const parsed = DetachInput.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: 'invalid_input' };

  const calc = await loadCalcWithMembership(parsed.data.calcId, user.id);
  if (!calc) return { ok: false as const, error: 'calc_not_found' };

  const cells = normalizeInputs(calc.inputs as Record<string, any>);
  const cell = cells[parsed.data.symbol];
  if (!cell) return { ok: false as const, error: 'symbol_not_found' };

  cells[parsed.data.symbol] = { value: cell.value };

  await db
    .update(calculations)
    .set({ inputs: cells, updatedAt: new Date() })
    .where(eq(calculations.id, parsed.data.calcId));

  revalidatePath(`/projects/${calc.projectId}/calc/${calc.id}`);
  return { ok: true as const };
}
