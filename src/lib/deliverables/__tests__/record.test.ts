/**
 * Deliverable-register unit tests (roadmap Stage 10, AGB §3(2)).
 *
 * Covers the pure kind-label map (kinds.ts) and the recordDeliverable
 * swallow contract: a register failure must NEVER break a document emission,
 * so the helper resolves even when the db insert throws (sync or async).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DELIVERABLE_KINDS,
  DELIVERABLE_KIND_LABELS,
  deliverableKindLabel,
} from '../kinds';

// Controlled db mock — overrides the global test-setup stub for this file.
// `insert` is swapped per-test to exercise the swallow contract.
const insertMock = vi.fn();
vi.mock('@/lib/db', () => ({
  db: {
    insert: (...args: unknown[]) => insertMock(...args),
  },
}));

import { recordDeliverable } from '../record';

const input = {
  projectId: '11111111-2222-4333-8444-555555555555',
  standardCode: 'DWA-A-138-1',
  kind: 'bericht' as const,
  title: 'Bericht DWA-A-138-1',
  userId: '99999999-8888-4777-a666-555555555555',
};

afterEach(() => {
  insertMock.mockReset();
  vi.restoreAllMocks();
});

describe('deliverable kinds — pure label map', () => {
  it('has exactly the nine register kinds', () => {
    expect([...DELIVERABLE_KINDS]).toEqual([
      'bericht',
      'konformitaetserklaerung',
      'wertetabelle',
      'einreichungs_checkliste',
      'pruefmemo',
      'angebot',
      'kostenschaetzung',
      'vsme_export',
      'projektbericht',
    ]);
  });

  it('maps every kind to its German label', () => {
    expect(DELIVERABLE_KIND_LABELS).toEqual({
      bericht: 'Bericht',
      konformitaetserklaerung: 'Konformitätserklärung',
      wertetabelle: 'Wertetabelle',
      einreichungs_checkliste: 'Einreichungs-Checkliste',
      pruefmemo: 'Prüf-Memo',
      angebot: 'Angebot',
      kostenschaetzung: 'Kostenschätzung',
      vsme_export: 'VSME-Export',
      projektbericht: 'Projektbericht',
    });
    for (const k of DELIVERABLE_KINDS) {
      expect(deliverableKindLabel(k)).toBe(DELIVERABLE_KIND_LABELS[k]);
    }
  });

  it('falls back to the raw value for an unknown stored kind', () => {
    expect(deliverableKindLabel('sonstiges_dokument')).toBe('sonstiges_dokument');
  });
});

describe('recordDeliverable — swallow contract', () => {
  it('resolves without throwing when the db insert throws synchronously', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    insertMock.mockImplementation(() => {
      throw new Error('db down');
    });

    await expect(recordDeliverable(input)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('resolves without throwing when the insert rejects asynchronously', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    insertMock.mockReturnValue({
      values: () => Promise.reject(new Error('constraint violation')),
    });

    await expect(recordDeliverable(input)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('inserts the row (defaults applied) on the happy path', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values });

    await expect(recordDeliverable(input)).resolves.toBeUndefined();
    expect(values).toHaveBeenCalledWith({
      projectId: input.projectId,
      standardCode: input.standardCode,
      kind: 'bericht',
      title: input.title,
      snapshotId: null,
      emittedBy: input.userId,
      meta: null,
    });
  });
});
