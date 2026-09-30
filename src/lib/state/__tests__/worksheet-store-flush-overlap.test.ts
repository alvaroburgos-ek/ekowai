/**
 * Store-level contract for the autosave flush (FLL register stall, 2026-09-30):
 *
 *  1. Two `flush` calls while a save is on the wire open ONE server
 *     round-trip — the second call returns the in-flight promise.
 *  2. A field edited DURING the in-flight save keeps its pending mark when
 *     the save lands (previously `pendingFieldIds: new Set()` dropped it and
 *     the form's debounce effect, seeing size 0, never scheduled the save →
 *     the register row typed during a save was lost on the next reload).
 *  3. Ids whose value did not change during the flight are cleared as before.
 *  4. Nothing else moved: saveStatus / lastSavedAt / warnings / derived apply
 *     behave as the derived-apply suite already pins.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useWorksheetStore } from '../worksheet-store';
import type { SaveWorksheetResult, saveWorksheet } from '@/lib/actions/worksheet';

type SaveFn = typeof saveWorksheet;
const OK: SaveWorksheetResult = { ok: true, saved: 1, warnings: [], derived: [] };
const A = 'field-a';
const B = 'field-b';

function deferred() {
  let resolve!: (v: SaveWorksheetResult) => void;
  const promise = new Promise<SaveWorksheetResult>((res) => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
  useWorksheetStore.getState().init('inst', {}, {}, {});
});
afterEach(() => {
  vi.useRealTimers();
});

describe('flush — overlap guard', () => {
  it('a second flush during an in-flight save does not call saveFn again and resolves with the same promise', async () => {
    const d = deferred();
    const saveFn = vi.fn<SaveFn>(() => d.promise);
    const store = useWorksheetStore.getState();
    store.setField(A, { type: 'number', value: 1 });

    const p1 = store.flush(saveFn as never);
    const p2 = store.flush(saveFn as never);
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(p2).toBe(p1);
    expect(useWorksheetStore.getState().saveStatus).toBe('saving');

    d.resolve(OK);
    await p1;
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(useWorksheetStore.getState().saveStatus).toBe('saved');
    expect(useWorksheetStore.getState().pendingFieldIds.size).toBe(0);
  });

  it('after the in-flight save lands, a new flush is possible again (guard released)', async () => {
    const saveFn = vi.fn<SaveFn>(async () => OK);
    const store = useWorksheetStore.getState();
    store.setField(A, { type: 'number', value: 1 });
    await store.flush(saveFn as never);
    store.setField(A, { type: 'number', value: 2 });
    await store.flush(saveFn as never);
    expect(saveFn).toHaveBeenCalledTimes(2);
    expect(saveFn.mock.calls[1]![0]).toMatchObject({ values: { [A]: { type: 'number', value: 2 } } });
  });
});

describe('flush — edits made during the flight survive', () => {
  it('a field set while the save is on the wire stays pending; the saved, unchanged field is cleared', async () => {
    const d = deferred();
    const saveFn = vi.fn<SaveFn>(() => d.promise);
    const store = useWorksheetStore.getState();
    store.setField(A, { type: 'number', value: 1 });
    const p = store.flush(saveFn as never);
    expect(saveFn.mock.calls[0]![0]).toMatchObject({ values: { [A]: { type: 'number', value: 1 } } });

    // In-flight edits: a NEW field, and the SAME field with a new value.
    useWorksheetStore.getState().setField(B, { type: 'text', value: 'typed during save' });
    useWorksheetStore.getState().setField(A, { type: 'number', value: 99 });

    d.resolve(OK);
    await p;
    const s = useWorksheetStore.getState();
    expect(s.saveStatus).toBe('saved');
    expect(s.pendingFieldIds.has(B)).toBe(true); // never sent → still pending
    expect(s.pendingFieldIds.has(A)).toBe(true); // sent as 1, now 99 → still pending
    expect(s.values[A]).toEqual({ type: 'number', value: 99 }); // the in-flight edit is not clobbered

    // The follow-up flush carries exactly those two.
    const saveFn2 = vi.fn<SaveFn>(async () => OK);
    await useWorksheetStore.getState().flush(saveFn2 as never);
    expect(saveFn2).toHaveBeenCalledTimes(1);
    expect(Object.keys(saveFn2.mock.calls[0]![0].values).sort()).toEqual([A, B].sort());
    expect(useWorksheetStore.getState().pendingFieldIds.size).toBe(0);
  });

  it('a value re-set to the identical object during the flight is treated as saved (reference rule)', async () => {
    const d = deferred();
    const saveFn = vi.fn<SaveFn>(() => d.promise);
    const store = useWorksheetStore.getState();
    const v = { type: 'number' as const, value: 7 };
    store.setField(A, v);
    const p = store.flush(saveFn as never);
    useWorksheetStore.getState().setField(A, v); // same object (acceptAllTwinPrefills does this)
    d.resolve(OK);
    await p;
    expect(useWorksheetStore.getState().pendingFieldIds.size).toBe(0);
  });

  it('a failed save leaves every pending id in place (unchanged behaviour)', async () => {
    const saveFn = vi.fn<SaveFn>(async () => ({ ok: false as const, error: 'boom' }));
    const store = useWorksheetStore.getState();
    store.setField(A, { type: 'number', value: 1 });
    await store.flush(saveFn as never);
    const s = useWorksheetStore.getState();
    expect(s.saveStatus).toBe('error');
    expect(s.pendingFieldIds.has(A)).toBe(true);
    // Guard released after the failure too.
    await useWorksheetStore.getState().flush(saveFn as never);
    expect(saveFn).toHaveBeenCalledTimes(2);
  });
});
