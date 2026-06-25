// @vitest-environment node
import './_setup-env'; // sets BYPASS_AUTH + BYPASS_AUTH_USER_ID before any other imports
import { describe, it, expect, afterAll } from 'vitest';

// revalidatePath() requires Next.js request context; stub before importing the action.
import { vi } from 'vitest';
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

import { setFieldOwner } from '@/lib/actions/vsme-owner';
import { db } from '@/lib/db';
import { fields, worksheetTemplates, standards } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

async function findAnyVsmeField(): Promise<{ id: string; originalOwner: string | null }> {
  const rows = await db
    .select({ id: fields.id, owner: fields.owner })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(and(eq(standards.code, 'VSME'), eq(fields.active, true)))
    .limit(1);
  if (rows.length === 0) throw new Error('No VSME fields found — run the VSME seeder first');
  return { id: rows[0].id, originalOwner: rows[0].owner };
}

describe('setFieldOwner (integration)', () => {
  let testFieldId: string;
  let originalOwner: string | null;

  afterAll(async () => {
    // Restore original owner to avoid polluting the DB
    if (testFieldId && originalOwner !== undefined) {
      await db
        .update(fields)
        .set({ owner: originalOwner })
        .where(eq(fields.id, testFieldId));
    }
  });

  it('flips a VSME field owner and the read-back confirms the new value', async () => {
    const field = await findAnyVsmeField();
    testFieldId = field.id;
    originalOwner = field.originalOwner;

    // Pick a different owner than the current one so we can observe the change
    const newOwner: 'ekowai_env' | 'client_supplied' | 'general' =
      originalOwner === 'ekowai_env' ? 'client_supplied' : 'ekowai_env';

    await setFieldOwner(testFieldId, newOwner);

    const [updated] = await db
      .select({ owner: fields.owner })
      .from(fields)
      .where(eq(fields.id, testFieldId))
      .limit(1);

    expect(updated.owner).toBe(newOwner);
  });
});
