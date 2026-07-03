/**
 * Task B — Store derived-value surgical apply after save.
 *
 * TDD RED → GREEN tests for the `applyDerived` capability added to the store.
 *
 * CONTRACT:
 * - After a successful flush that returns `derived` rows, the store updates
 *   those field values without touching any dirty/pending field.
 * - Only the field ids returned in `derived` are written.
 * - In-flight (dirty) user edits on OTHER fields are untouched.
 * - A field that is both dirty AND returned in `derived` (impossible by design,
 *   but guarded here) is covered by the non-interference rule: the spec says
 *   only computed/read-only fields are ever returned; the test confirms it.
 *
 * These tests are purely in-memory — no DB, no network.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useWorksheetStore } from '../worksheet-store';
import type { SaveWorksheetResult } from '@/lib/actions/worksheet';

// Mock saveWorksheet so we can control what the server returns
const mockSaveWorksheet = vi.fn<Parameters<typeof import('@/lib/actions/worksheet').saveWorksheet>, ReturnType<typeof import('@/lib/actions/worksheet').saveWorksheet>>();

function initStore(
  values: Record<string, { type: string; value: unknown }> = {},
  pendingFieldIds: string[] = [],
) {
  const store = useWorksheetStore.getState();
  store.init(
    'test-instance-id',
    values as never,
    {},
    {},
  );
  // Artificially put some fields into pending state to simulate in-flight edits
  if (pendingFieldIds.length > 0) {
    // setField adds each id to pendingFieldIds
    for (const fid of pendingFieldIds) {
      const v = values[fid];
      if (v) store.setField(fid, v as never);
    }
  }
}

const DERIVED_FIELD_1 = 'ac_as_ratio-field-id-0001';
const DERIVED_FIELD_2 = 'ac_as_ratio_check-field-id-0002';
const DIRTY_FIELD_ID  = 'A_S_m-field-id-0003'; // user-edited, must not be touched

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 1. Baseline: flush with no derived fields still clears pending
// ---------------------------------------------------------------------------

describe('flush (no derived) — baseline', () => {
  it('clears pendingFieldIds and sets saved status on ok result', async () => {
    mockSaveWorksheet.mockResolvedValueOnce({
      ok: true,
      saved: 1,
      warnings: [],
      derived: [],
    } satisfies SaveWorksheetResult);

    initStore(
      { [DIRTY_FIELD_ID]: { type: 'number', value: 42 } },
      [DIRTY_FIELD_ID],
    );

    const store = useWorksheetStore.getState();
    expect(store.pendingFieldIds.has(DIRTY_FIELD_ID)).toBe(true);

    await store.flush(mockSaveWorksheet as never);

    const after = useWorksheetStore.getState();
    expect(after.saveStatus).toBe('saved');
    expect(after.pendingFieldIds.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Core: derived values are applied to the store after flush
// ---------------------------------------------------------------------------

describe('flush with derived rows — store applies derived values', () => {
  it('updates derived field values when server returns derived rows', async () => {
    // Seed the store with stale derived values (simulating pre-save state)
    initStore({
      [DERIVED_FIELD_1]: { type: 'number', value: null },    // stale: no value yet
      [DERIVED_FIELD_2]: { type: 'text',   value: null },    // stale: no value yet
      [DIRTY_FIELD_ID]:  { type: 'number', value: 100 },     // user edit
    }, [DIRTY_FIELD_ID]);

    mockSaveWorksheet.mockResolvedValueOnce({
      ok: true,
      saved: 1,
      warnings: [],
      derived: [
        { fieldId: DERIVED_FIELD_1, valueNumber: '108.68', valueText: null },
        { fieldId: DERIVED_FIELD_2, valueNumber: null,     valueText: 'fail' },
      ],
    } satisfies SaveWorksheetResult);

    await useWorksheetStore.getState().flush(mockSaveWorksheet as never);

    const state = useWorksheetStore.getState();

    // DERIVED_FIELD_1 (number): store must show the server-materialized value
    const v1 = state.values[DERIVED_FIELD_1];
    expect(v1).toBeDefined();
    expect(v1?.type).toBe('number');
    expect((v1 as { type: 'number'; value: number | null }).value).toBeCloseTo(108.68, 4);

    // DERIVED_FIELD_2 (text): store must show the server-materialized value
    const v2 = state.values[DERIVED_FIELD_2];
    expect(v2).toBeDefined();
    expect(v2?.type).toBe('text');
    expect((v2 as { type: 'text'; value: string | null }).value).toBe('fail');
  });

  it('does NOT touch dirty user-edited field when server returns derived rows', async () => {
    const DIRTY_VALUE = 999;
    initStore({
      [DERIVED_FIELD_1]: { type: 'number', value: null },
      [DIRTY_FIELD_ID]:  { type: 'number', value: DIRTY_VALUE },
    }, [DIRTY_FIELD_ID]);

    mockSaveWorksheet.mockResolvedValueOnce({
      ok: true,
      saved: 1,
      warnings: [],
      derived: [
        { fieldId: DERIVED_FIELD_1, valueNumber: '5.0', valueText: null },
      ],
    } satisfies SaveWorksheetResult);

    await useWorksheetStore.getState().flush(mockSaveWorksheet as never);

    const state = useWorksheetStore.getState();

    // DIRTY_FIELD_ID must still have the user's value — not clobbered
    const dirty = state.values[DIRTY_FIELD_ID];
    expect(dirty?.type).toBe('number');
    expect((dirty as { type: 'number'; value: number | null }).value).toBe(DIRTY_VALUE);
  });

  it('handles null valueNumber (clearing a derived number field)', async () => {
    // Need a pending field so flush() doesn't bail early
    initStore({
      [DERIVED_FIELD_1]: { type: 'number', value: 108.68 }, // previously set
      [DIRTY_FIELD_ID]:  { type: 'number', value: 1 },
    }, [DIRTY_FIELD_ID]);

    mockSaveWorksheet.mockResolvedValueOnce({
      ok: true,
      saved: 1,
      warnings: [],
      derived: [
        // Server clears the value (e.g. inputs no longer available)
        { fieldId: DERIVED_FIELD_1, valueNumber: null, valueText: null },
      ],
    } satisfies SaveWorksheetResult);

    await useWorksheetStore.getState().flush(mockSaveWorksheet as never);

    const state = useWorksheetStore.getState();
    const v = state.values[DERIVED_FIELD_1];
    // After clearing, the store must hold null (not the stale 108.68)
    expect(v?.type).toBe('number');
    expect((v as { type: 'number'; value: number | null }).value).toBeNull();
  });

  it('ignores derived rows for unknown field ids gracefully', async () => {
    const UNKNOWN_ID = 'does-not-exist-in-store-ffff';
    initStore({
      [DERIVED_FIELD_1]: { type: 'number', value: null },
      [DIRTY_FIELD_ID]:  { type: 'number', value: 1 },
    }, [DIRTY_FIELD_ID]);

    mockSaveWorksheet.mockResolvedValueOnce({
      ok: true,
      saved: 1,
      warnings: [],
      derived: [
        { fieldId: DERIVED_FIELD_1, valueNumber: '3.14', valueText: null },
        { fieldId: UNKNOWN_ID,      valueNumber: '99',   valueText: null },
      ],
    } satisfies SaveWorksheetResult);

    // Must not throw
    await useWorksheetStore.getState().flush(mockSaveWorksheet as never);

    const state = useWorksheetStore.getState();
    const v = state.values[DERIVED_FIELD_1];
    expect(v?.type).toBe('number');
    expect((v as { type: 'number'; value: number | null }).value).toBeCloseTo(3.14, 4);
    // Unknown id: simply absent from store (no crash, no phantom key required)
  });
});

// ---------------------------------------------------------------------------
// 3. Error path: derived not applied when save fails
// ---------------------------------------------------------------------------

describe('flush error — derived values are NOT applied', () => {
  it('leaves store unchanged (except saveStatus=error) when server returns ok=false', async () => {
    initStore({
      [DERIVED_FIELD_1]: { type: 'number', value: 42 },
      [DIRTY_FIELD_ID]:  { type: 'number', value: 7 },
    }, [DIRTY_FIELD_ID]);

    mockSaveWorksheet.mockResolvedValueOnce({
      ok: false,
      error: 'DB error',
    } satisfies SaveWorksheetResult);

    await useWorksheetStore.getState().flush(mockSaveWorksheet as never);

    const state = useWorksheetStore.getState();
    expect(state.saveStatus).toBe('error');
    // Stale derived value must not be overwritten with phantom data
    expect((state.values[DERIVED_FIELD_1] as { type: 'number'; value: number | null }).value).toBe(42);
    // Dirty field must be untouched
    expect((state.values[DIRTY_FIELD_ID] as { type: 'number'; value: number | null }).value).toBe(7);
    // pendingFieldIds must still hold the dirty field (save failed, must retry)
    expect(state.pendingFieldIds.has(DIRTY_FIELD_ID)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Text derived field (ac_as_ratio_check) — specific regression guard
// ---------------------------------------------------------------------------

describe('ac_as_ratio_check derived text field — specific case', () => {
  it('applies "fail" text value to store after save', async () => {
    initStore({
      [DERIVED_FIELD_2]: { type: 'text', value: null },
      [DIRTY_FIELD_ID]:  { type: 'number', value: 1 },
    }, [DIRTY_FIELD_ID]);

    mockSaveWorksheet.mockResolvedValueOnce({
      ok: true,
      saved: 1,
      warnings: [],
      derived: [
        { fieldId: DERIVED_FIELD_2, valueNumber: null, valueText: 'fail' },
      ],
    } satisfies SaveWorksheetResult);

    await useWorksheetStore.getState().flush(mockSaveWorksheet as never);

    const state = useWorksheetStore.getState();
    const v = state.values[DERIVED_FIELD_2];
    expect(v).toEqual({ type: 'text', value: 'fail' });
  });

  it('applies null text value (indeterminate) to store after save', async () => {
    initStore({
      [DERIVED_FIELD_2]: { type: 'text', value: 'fail' }, // stale
      [DIRTY_FIELD_ID]:  { type: 'number', value: 1 },
    }, [DIRTY_FIELD_ID]);

    mockSaveWorksheet.mockResolvedValueOnce({
      ok: true,
      saved: 1,
      warnings: [],
      derived: [
        { fieldId: DERIVED_FIELD_2, valueNumber: null, valueText: null },
      ],
    } satisfies SaveWorksheetResult);

    await useWorksheetStore.getState().flush(mockSaveWorksheet as never);

    const state = useWorksheetStore.getState();
    const v = state.values[DERIVED_FIELD_2];
    expect(v?.type).toBe('text');
    expect((v as { type: 'text'; value: string | null }).value).toBeNull();
  });
});
