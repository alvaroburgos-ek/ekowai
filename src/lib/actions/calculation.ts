'use server';

import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { calculations, calculationHistory, orgMembers, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.1';
import { compute } from '@/lib/engine';
import {
  normalizeInputs,
  type InputCell,
  type InputRaw,
} from '@/lib/engine/inputs-reader';
import type { FieldValue } from '@/lib/engine/types';

const createSchema = z.object({
  projectId: z.string().uuid(),
  worksheetId: z.string(),
  name: z.string().min(1).max(200),
  locale: z.enum(['de', 'en']),
});

const saveSchema = z.object({
  calcId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  inputs: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.null()])),
});

const rationaleSchema = z.object({
  calcId: z.string().uuid(),
  rationale: z.string().max(5000),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return user;
}

async function userOrgForProject(projectId: string, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, projectId), eq(orgMembers.userId, userId)))
    .limit(1);
  return row?.orgId ?? null;
}

function findWorksheet(id: string) {
  return ALL_WORKSHEETS.find((w) => w.id === id);
}

export async function createCalculation(formData: FormData): Promise<void> {
  const parsed = createSchema.parse({
    projectId: formData.get('projectId'),
    worksheetId: formData.get('worksheetId'),
    name: formData.get('name'),
    locale: formData.get('locale'),
  });
  const user = await requireUser();
  const orgId = await userOrgForProject(parsed.projectId, user.id);
  if (!orgId) throw new Error('no permission for project');
  const worksheet = findWorksheet(parsed.worksheetId);
  if (!worksheet) throw new Error(`unknown worksheet ${parsed.worksheetId}`);

  const initialInputs = Object.fromEntries(
    worksheet.inputs
      .filter((f) => f.defaultValue !== undefined)
      .map((f) => [f.id, f.defaultValue as number | string | boolean]),
  );
  const result = compute(worksheet, initialInputs);

  const [created] = await db
    .insert(calculations)
    .values({
      projectId: parsed.projectId,
      orgId,
      regulationCode: worksheet.regulation,
      regulationVersion: worksheet.regulationVersion,
      worksheetId: worksheet.id,
      name: parsed.name,
      inputs: initialInputs,
      results: result.computed,
      complianceStatus: result.compliance.status,
      complianceViolations: result.compliance.violations,
      createdBy: user.id,
    })
    .returning({ id: calculations.id });

  redirect(`/${parsed.locale}/projects/${parsed.projectId}/calc/${created.id}`);
}

export async function saveCalculation(input: {
  calcId: string;
  name?: string;
  inputs: Record<string, number | string | boolean | null>;
}): Promise<{ ok: true; computedAt: string } | { ok: false; error: string }> {
  const parsed = saveSchema.parse(input);
  const user = await requireUser();

  const [calc] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, parsed.calcId))
    .limit(1);
  if (!calc) return { ok: false, error: 'not_found' };

  const orgId = await userOrgForProject(calc.projectId, user.id);
  if (!orgId || orgId !== calc.orgId) return { ok: false, error: 'no_permission' };

  const worksheet = findWorksheet(calc.worksheetId);
  if (!worksheet) return { ok: false, error: 'unknown_worksheet' };

  // Merge incoming bare-value record onto existing cells, preserving any
  // attached `source` per key. Without this merge, every autosave would
  // strip citations attached via attachSource.
  const existingCells = normalizeInputs(
    (calc.inputs ?? {}) as Record<string, InputRaw>,
  );
  const mergedCells: Record<string, InputCell> = { ...existingCells };
  for (const [k, v] of Object.entries(parsed.inputs)) {
    const existing = mergedCells[k];
    if (existing?.source) {
      mergedCells[k] = { value: v as FieldValue, source: existing.source };
    } else {
      mergedCells[k] = { value: v as FieldValue };
    }
  }

  const result = compute(worksheet, mergedCells);
  if (Object.keys(result.validationErrors).length > 0) {
    return { ok: false, error: 'validation_failed' };
  }

  // Snapshot the current state before overwriting
  await db.insert(calculationHistory).values({
    calculationId: calc.id,
    inputs: calc.inputs as Record<string, number | string | boolean | null>,
    results: calc.results as Record<string, number | string | boolean | null>,
    rationale: calc.rationale ?? null,
    changedBy: user.id,
  });

  await db
    .update(calculations)
    .set({
      name: parsed.name ?? calc.name,
      inputs: mergedCells,
      results: result.computed,
      complianceStatus: result.compliance.status,
      complianceViolations: result.compliance.violations,
      updatedAt: new Date(),
    })
    .where(eq(calculations.id, parsed.calcId));

  return { ok: true, computedAt: new Date().toISOString() };
}

export async function listCalculationsForProject(projectId: string) {
  const user = await requireUser();
  const orgId = await userOrgForProject(projectId, user.id);
  if (!orgId) return [];
  return db
    .select()
    .from(calculations)
    .where(and(eq(calculations.projectId, projectId), eq(calculations.orgId, orgId)));
}

export async function saveRationale(input: {
  calcId: string;
  rationale: string;
}): Promise<{ ok: boolean }> {
  const parsed = rationaleSchema.parse(input);
  const user = await requireUser();
  const [calc] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, parsed.calcId))
    .limit(1);
  if (!calc) return { ok: false };
  const orgId = await userOrgForProject(calc.projectId, user.id);
  if (!orgId || orgId !== calc.orgId) return { ok: false };
  await db
    .update(calculations)
    .set({ rationale: parsed.rationale, updatedAt: new Date() })
    .where(eq(calculations.id, calc.id));
  return { ok: true };
}
