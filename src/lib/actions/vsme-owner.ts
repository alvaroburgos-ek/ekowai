'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { fields } from '@/lib/db/schema';

/** Valid VSME owner values. */
export type VsmeOwner = 'ekowai_env' | 'client_supplied' | 'general';

/**
 * Override the owner of a VSME field. Updates `fields.owner` and revalidates
 * all worklist pages so the UI reflects the change on next navigation.
 */
export async function setFieldOwner(
  fieldId: string,
  owner: VsmeOwner,
): Promise<void> {
  await db.update(fields).set({ owner }).where(eq(fields.id, fieldId));

  // Revalidate all project worklist pages — the path is dynamic per [locale]/[id]
  revalidatePath('/[locale]/(app)/projects/[id]/(overview)/vsme/worklist', 'page');
}
