'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { fields } from '@/lib/db/schema';

/** Valid VSME owner values. */
export type VsmeOwner = 'ekowai_env' | 'client_supplied' | 'general';

/**
 * Override the owner of a VSME field. Updates `fields.owner` (template-level, standard-wide)
 * and revalidates all worklist pages so the UI reflects the change on next navigation.
 *
 * @note This edits the template-level `fields.owner` attribute, affecting all projects
 * that use this VSME standard — not just the current project.
 *
 * @todo(pre-prod): Add authentication and restrict to platform engineers before production.
 * See Plan 4 final review.
 */
export async function setFieldOwner(
  fieldId: string,
  owner: VsmeOwner,
): Promise<void> {
  const VALID_OWNERS = ['ekowai_env', 'client_supplied', 'general'] as const;
  if (!VALID_OWNERS.includes(owner as (typeof VALID_OWNERS)[number])) {
    throw new Error(`Invalid owner value: ${owner}`);
  }

  await db.update(fields).set({ owner }).where(eq(fields.id, fieldId));

  // Revalidate all project worklist pages — route-group folders are NOT part of the URL
  revalidatePath('/[locale]/projects/[id]/vsme/worklist', 'page');
}
