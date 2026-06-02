'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { eq, ne, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  fields,
  equations,
  worksheetTemplates,
  standards,
} from '@/lib/db/schema';
import { requirePlatformEngineer } from '@/lib/auth/platform-engineer';

const VERIFIED = 'engineer_verified';
const UNVERIFIED = 'imported_unverified';

const idSchema = z.string().uuid();
const noteSchema = z.string().trim().max(500).optional();

/** Look up the standard code + worksheet code for a field, so we can
 * revalidate the right project-scoped + library-scoped paths. Returns null
 * when the field row no longer exists. */
async function lookupFieldPaths(fieldId: string) {
  const rows = await db
    .select({
      standardCode: standards.code,
      worksheetCode: worksheetTemplates.code,
    })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(eq(fields.id, fieldId))
    .limit(1);
  return rows[0] ?? null;
}

async function lookupEquationPaths(equationId: string) {
  const rows = await db
    .select({
      standardCode: standards.code,
      worksheetCode: worksheetTemplates.code,
    })
    .from(equations)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, equations.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(eq(equations.id, equationId))
    .limit(1);
  return rows[0] ?? null;
}

function revalidateForWorksheet(standardCode: string, worksheetCode: string) {
  // Project-scoped worksheet pages are dynamic per [id], so revalidate the
  // library route precisely and let the project pages refresh on next nav.
  revalidatePath(`/[locale]/standards/${standardCode}/worksheets/${worksheetCode}`, 'page');
  revalidatePath(`/[locale]/standards/${standardCode}`, 'page');
  revalidatePath(`/[locale]/standards`, 'page');
}

export async function verifyField(fieldId: string, note?: string): Promise<void> {
  const id = idSchema.parse(fieldId);
  const parsedNote = noteSchema.parse(note) ?? null;
  const user = await requirePlatformEngineer();

  const paths = await lookupFieldPaths(id);
  if (!paths) throw new Error('Field not found');

  await db
    .update(fields)
    .set({
      verificationStatus: VERIFIED,
      verifiedByUserId: user.id,
      verifiedAt: sql`now()`,
      verificationNote: parsedNote,
    })
    .where(eq(fields.id, id));

  revalidateForWorksheet(paths.standardCode, paths.worksheetCode);
}

export async function unverifyField(fieldId: string): Promise<void> {
  const id = idSchema.parse(fieldId);
  await requirePlatformEngineer();

  const paths = await lookupFieldPaths(id);
  if (!paths) throw new Error('Field not found');

  await db
    .update(fields)
    .set({
      verificationStatus: UNVERIFIED,
      verifiedByUserId: null,
      verifiedAt: null,
      verificationNote: null,
    })
    .where(eq(fields.id, id));

  revalidateForWorksheet(paths.standardCode, paths.worksheetCode);
}

export async function verifyEquation(equationId: string, note?: string): Promise<void> {
  const id = idSchema.parse(equationId);
  const parsedNote = noteSchema.parse(note) ?? null;
  const user = await requirePlatformEngineer();

  const paths = await lookupEquationPaths(id);
  if (!paths) throw new Error('Equation not found');

  await db
    .update(equations)
    .set({
      verificationStatus: VERIFIED,
      verifiedByUserId: user.id,
      verifiedAt: sql`now()`,
      verificationNote: parsedNote,
    })
    .where(eq(equations.id, id));

  revalidateForWorksheet(paths.standardCode, paths.worksheetCode);
}

export async function unverifyEquation(equationId: string): Promise<void> {
  const id = idSchema.parse(equationId);
  await requirePlatformEngineer();

  const paths = await lookupEquationPaths(id);
  if (!paths) throw new Error('Equation not found');

  await db
    .update(equations)
    .set({
      verificationStatus: UNVERIFIED,
      verifiedByUserId: null,
      verifiedAt: null,
      verificationNote: null,
    })
    .where(eq(equations.id, id));

  revalidateForWorksheet(paths.standardCode, paths.worksheetCode);
}

/** Bulk verify every imported_unverified field in a worksheet template.
 * Used by the "Alle Felder dieses Worksheets bestätigen" action. Returns
 * the count of rows flipped. Already-verified rows are left untouched. */
export async function verifyAllFieldsInWorksheet(
  worksheetTemplateId: string,
  note?: string,
): Promise<number> {
  const id = idSchema.parse(worksheetTemplateId);
  const parsedNote = noteSchema.parse(note) ?? null;
  const user = await requirePlatformEngineer();

  const rows = await db
    .select({
      standardCode: standards.code,
      worksheetCode: worksheetTemplates.code,
    })
    .from(worksheetTemplates)
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(eq(worksheetTemplates.id, id))
    .limit(1);
  if (!rows[0]) throw new Error('Worksheet template not found');

  // Three-state contract: flip every row that is NOT engineer_verified —
  // catches imported_unverified plus needs_engineer_review and any other
  // non-verified state. Previous version only caught imported_unverified
  // and silently skipped needs_engineer_review rows.
  const updated = await db
    .update(fields)
    .set({
      verificationStatus: VERIFIED,
      verifiedByUserId: user.id,
      verifiedAt: sql`now()`,
      verificationNote: parsedNote,
    })
    .where(
      and(
        eq(fields.worksheetTemplateId, id),
        ne(fields.verificationStatus, VERIFIED),
      ),
    )
    .returning({ id: fields.id });

  revalidateForWorksheet(rows[0].standardCode, rows[0].worksheetCode);
  return updated.length;
}
