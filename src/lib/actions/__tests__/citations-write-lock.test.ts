/**
 * Citations write-lock unit tests (DB-free).
 *
 * Verifies that addCitation, removeCitation, and attachCitation all honour
 * the worksheet status guard introduced in Task 3:
 *   - null (field not in project)  → { ok: false, error: 'field_not_in_project' }
 *   - 'final' / 'engineer_approved' → { ok: false, error: '<schreibgeschützt msg>' }
 *   - 'draft'                      → passes the guard (proceeds to DB write)
 *
 * The DB is fully mocked — no live Postgres needed. The supabase auth client
 * is also mocked to return a stable userId so requireUser() resolves.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorksheetStatus } from '@/lib/state-machine';

// ── Locked error message (verbatim from brief) ─────────────────────────────
const LOCKED_ERROR =
  'Arbeitsblatt ist genehmigt/final und schreibgeschützt — Quellen können nicht geändert werden.';

// ── Stable test IDs ─────────────────────────────────────────────────────────
const PROJECT_ID = 'proj-test-123';
const FIELD_ID = 'field-test-456';
const ORG_ID = 'org-test-789';
const USER_ID = 'user-test-000';

// ── DB mock controls ────────────────────────────────────────────────────────
// resolveFieldWorksheetStatus drives the guard; resolveProjectOrgId must
// succeed for the guard to even be reached.
let mockWsStatus: WorksheetStatus | null = 'draft';

// We capture calls to tx.insert/tx.update so we can assert no write happened.
const txInsertMock = vi.fn().mockResolvedValue(undefined);
const txUpdateMock = vi.fn().mockResolvedValue(undefined);

// Build a per-call chain that the Drizzle ORM pattern expects.
// The citations module uses: db.select({ ... }).from(...).innerJoin(...).where(...).limit(1)
// resolveProjectOrgId: db.select({orgId}).from(projects).innerJoin(orgMembers, ...).where(...).limit(1)
// resolveFieldWorksheetStatus: db.select({status}).from(fields).innerJoin(worksheetInstances, ...).where(...).limit(1)
// addCitation/removeCitation/attachCitation also call db.transaction(...)
//
// We distinguish the two select calls by call order within the action:
//   call #1 → resolveProjectOrgId  → returns [{ orgId }]
//   call #2 → resolveFieldWorksheetStatus → returns [{ status }] or []

let selectCallCount = 0;

function makeSelectChain(resultFn: () => unknown[]) {
  const chain = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(resultFn()),
  };
  return chain;
}

vi.mock('@/lib/db', () => ({
  db: {
    select: () => {
      selectCallCount += 1;
      const callNum = selectCallCount;
      return makeSelectChain(() => {
        if (callNum === 1) {
          // resolveProjectOrgId
          return [{ orgId: ORG_ID }];
        }
        // resolveFieldWorksheetStatus
        if (mockWsStatus === null) return [];
        return [{ status: mockWsStatus }];
      });
    },
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: () => makeSelectChain(() => []),
        insert: () => ({ values: txInsertMock }),
        update: () => ({ set: () => ({ where: txUpdateMock }) }),
      };
      return fn(tx);
    }),
  },
}));

// Mock supabase auth so requireUser() resolves to a stable userId.
// NOTE: vi.mock factories are hoisted before variable declarations, so we
// cannot reference USER_ID here — use a literal instead.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-test-000' } },
      }),
    },
  }),
}));

// Import the actions AFTER mocks are set up.
import { addCitation, removeCitation, attachCitation, detachCitation } from '@/lib/actions/citations';

// ── Helpers ──────────────────────────────────────────────────────────────────

const sampleSource = { docId: 'doc-abc', page: 1, note: 'test note' };

function resetMocks() {
  selectCallCount = 0;
  txInsertMock.mockClear();
  txUpdateMock.mockClear();
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('citations write-lock guard', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ── addCitation ────────────────────────────────────────────────────────────

  describe('addCitation', () => {
    it('returns field_not_in_project when resolveFieldWorksheetStatus returns null', async () => {
      mockWsStatus = null;
      const result = await addCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      expect(result).toEqual({ ok: false, error: 'field_not_in_project' });
    });

    it('returns the locked error when status is final', async () => {
      mockWsStatus = 'final';
      const result = await addCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      expect(result).toEqual({ ok: false, error: LOCKED_ERROR });
    });

    it('returns the locked error when status is engineer_approved', async () => {
      mockWsStatus = 'engineer_approved';
      const result = await addCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      expect(result).toEqual({ ok: false, error: LOCKED_ERROR });
    });

    it('returns the locked error when status is deactivated', async () => {
      mockWsStatus = 'deactivated';
      const result = await addCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      expect(result).toEqual({ ok: false, error: LOCKED_ERROR });
    });

    it('passes the guard and proceeds to write when status is draft', async () => {
      mockWsStatus = 'draft';
      const result = await addCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      // The mock tx.select returns [] (no existing row), so an INSERT is attempted.
      expect(result.ok).toBe(true);
      expect(txInsertMock).toHaveBeenCalled();
    });

    it('passes the guard when status is submitted_for_review', async () => {
      mockWsStatus = 'submitted_for_review';
      const result = await addCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      expect(result.ok).toBe(true);
    });

    it('performs NO insert/update when locked (final)', async () => {
      mockWsStatus = 'final';
      await addCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      expect(txInsertMock).not.toHaveBeenCalled();
      expect(txUpdateMock).not.toHaveBeenCalled();
    });
  });

  // ── removeCitation ─────────────────────────────────────────────────────────

  describe('removeCitation', () => {
    it('returns field_not_in_project when resolveFieldWorksheetStatus returns null', async () => {
      mockWsStatus = null;
      const result = await removeCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, citationId: 'cit-1' });
      expect(result).toEqual({ ok: false, error: 'field_not_in_project' });
    });

    it('returns the locked error when status is final', async () => {
      mockWsStatus = 'final';
      const result = await removeCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, citationId: 'cit-1' });
      expect(result).toEqual({ ok: false, error: LOCKED_ERROR });
    });

    it('passes the guard when status is draft', async () => {
      mockWsStatus = 'draft';
      const result = await removeCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, citationId: 'cit-1' });
      expect(result.ok).toBe(true);
      expect(txUpdateMock).toHaveBeenCalled();
    });

    it('performs NO write when locked (engineer_approved)', async () => {
      mockWsStatus = 'engineer_approved';
      await removeCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, citationId: 'cit-1' });
      expect(txInsertMock).not.toHaveBeenCalled();
      expect(txUpdateMock).not.toHaveBeenCalled();
    });
  });

  // ── attachCitation ─────────────────────────────────────────────────────────

  describe('attachCitation', () => {
    it('returns field_not_in_project when resolveFieldWorksheetStatus returns null', async () => {
      mockWsStatus = null;
      const result = await attachCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      expect(result).toEqual({ ok: false, error: 'field_not_in_project' });
    });

    it('returns the locked error when status is final', async () => {
      mockWsStatus = 'final';
      const result = await attachCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      expect(result).toEqual({ ok: false, error: LOCKED_ERROR });
    });

    it('passes the guard when status is draft', async () => {
      mockWsStatus = 'draft';
      const result = await attachCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      expect(result.ok).toBe(true);
      expect(txInsertMock).toHaveBeenCalled();
    });

    it('performs NO write when locked (final)', async () => {
      mockWsStatus = 'final';
      await attachCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID, source: sampleSource });
      expect(txInsertMock).not.toHaveBeenCalled();
      expect(txUpdateMock).not.toHaveBeenCalled();
    });
  });

  // ── detachCitation ─────────────────────────────────────────────────────────

  describe('detachCitation', () => {
    it('returns field_not_in_project when resolveFieldWorksheetStatus returns null', async () => {
      mockWsStatus = null;
      const result = await detachCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID });
      expect(result).toEqual({ ok: false, error: 'field_not_in_project' });
    });

    it('returns the locked error when status is final', async () => {
      mockWsStatus = 'final';
      const result = await detachCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID });
      expect(result).toEqual({ ok: false, error: LOCKED_ERROR });
    });

    it('performs NO write when locked (final)', async () => {
      mockWsStatus = 'final';
      await detachCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID });
      expect(txInsertMock).not.toHaveBeenCalled();
      expect(txUpdateMock).not.toHaveBeenCalled();
    });

    it('passes the guard and proceeds to write when status is draft', async () => {
      mockWsStatus = 'draft';
      const result = await detachCitation({ projectId: PROJECT_ID, fieldId: FIELD_ID });
      expect(result.ok).toBe(true);
      expect(txUpdateMock).toHaveBeenCalled();
    });
  });
});
