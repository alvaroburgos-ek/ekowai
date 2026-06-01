// @vitest-environment node
import './_setup-env'; // sets BYPASS_AUTH + BYPASS_AUTH_USER_ID before any other imports
import { describe, it, expect, beforeAll, vi } from 'vitest';

// revalidatePath() / next.cache APIs require Next.js request context that
// vitest doesn't provide; stub before importing the action.
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

import { recordManualOverride } from '@/lib/actions/overrides';
import { db } from '@/lib/db';
import { auditLog, projects, orgMembers } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';

describe('recordManualOverride server action', () => {
  let projectId: string;

  beforeAll(async () => {
    const userId = process.env.BYPASS_AUTH_USER_ID!;
    const [row] = await db
      .select({ projectId: projects.id })
      .from(projects)
      .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
      .where(eq(orgMembers.userId, userId))
      .limit(1);
    if (!row) throw new Error('seed required: pnpm tsx scripts/seed-demo.ts');
    projectId = row.projectId;
  });

  it('writes one audit_log row with action="manual_override" and the reason in changes', async () => {
    const fieldId = crypto.randomUUID();
    const reason = `Engineer override at ${new Date().toISOString()} — measured A_C in the field, soil survey diverges from the catalog default`;

    const r = await recordManualOverride({
      projectId,
      fieldId,
      equationNumber: '2',
      reason,
    });
    expect(r.ok).toBe(true);

    // Find the row we just inserted
    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.projectId, projectId),
          eq(auditLog.action, 'manual_override'),
          eq(auditLog.recordId, fieldId),
        ),
      )
      .orderBy(desc(auditLog.occurredAt))
      .limit(1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.tableName).toBe('project_parameters');
    expect(row.actorRole).toBe('engineer');
    const changes = row.changes as {
      fieldId: string;
      equationNumber: string;
      reason: string;
    };
    expect(changes.fieldId).toBe(fieldId);
    expect(changes.equationNumber).toBe('2');
    expect(changes.reason).toBe(reason.trim());

    // Cleanup: drop the row so re-runs of this test don't pile up audit data
    await db.delete(auditLog).where(eq(auditLog.id, row.id));
  });

  it('rejects a reason shorter than 10 characters', async () => {
    const r = await recordManualOverride({
      projectId,
      fieldId: crypto.randomUUID(),
      equationNumber: '2',
      reason: 'too short',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // Just sanity-check that we got an error message back; the exact wording
      // is the zod issue text and not load-bearing for any caller.
      expect(typeof r.error).toBe('string');
      expect(r.error.length).toBeGreaterThan(0);
    }
  });

  it('rejects an unknown project id (no row inserted)', async () => {
    const fakeProjectId = '00000000-0000-0000-0000-000000000000';
    const fieldId = crypto.randomUUID();
    const r = await recordManualOverride({
      projectId: fakeProjectId,
      fieldId,
      equationNumber: '2',
      reason: 'A long-enough reason that passes the 10-char check',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('project_not_found');

    // No audit_log row should have been created for that field+project
    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, 'manual_override'),
          eq(auditLog.recordId, fieldId),
        ),
      );
    expect(rows).toHaveLength(0);
  });
});
