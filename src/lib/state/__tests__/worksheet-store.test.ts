import { describe, it, expect, beforeEach } from 'vitest';
import { useWorksheetStore } from '../worksheet-store';

/**
 * Contract tests for `mergeServerValues` — the cross-worksheet
 * reactivity hook. The store's `init` is intentionally NOT reactive to
 * `initialValues` props (it would wipe in-flight edits). Merge fills
 * the gap: it re-reads server props without clobbering the engineer's
 * unsaved typing.
 *
 * The invariants pinned here:
 *   - non-pending fields update on merge
 *   - pending fields are preserved across merge (engineer wins)
 *   - merge is idempotent (no state change when nothing differs)
 *   - json carriers compare by deep equality
 *   - sources + citations follow the same rules
 */

function reset() {
  useWorksheetStore.setState({
    instanceId: null,
    values: {},
    sources: {},
    citations: {},
    saveStatus: 'idle',
    lastSavedAt: null,
    pendingFieldIds: new Set(),
  });
}

describe('useWorksheetStore.mergeServerValues', () => {
  beforeEach(reset);

  it('overwrites non-pending fields with incoming server values', () => {
    const s = useWorksheetStore.getState();
    s.init(
      'inst-1',
      { 'f-A': { type: 'number', value: 1 } },
      {},
      {},
    );

    useWorksheetStore.getState().mergeServerValues({
      values: { 'f-A': { type: 'number', value: 42 } },
      sources: {},
      citations: {},
    });

    expect(useWorksheetStore.getState().values['f-A']).toEqual({ type: 'number', value: 42 });
  });

  it('preserves pending edits — engineer typing wins over server merge', () => {
    const s = useWorksheetStore.getState();
    s.init(
      'inst-1',
      { 'f-A': { type: 'number', value: 1 }, 'f-B': { type: 'text', value: 'old' } },
      {},
      {},
    );
    // Engineer types in f-A — it lands in pendingFieldIds.
    useWorksheetStore.getState().setField('f-A', { type: 'number', value: 999 });
    expect(useWorksheetStore.getState().pendingFieldIds.has('f-A')).toBe(true);

    // Server re-render arrives with NEW values for both fields. f-A is
    // mid-edit, f-B is not.
    useWorksheetStore.getState().mergeServerValues({
      values: {
        'f-A': { type: 'number', value: 7 }, // would be a clobber
        'f-B': { type: 'text', value: 'new' }, // safe to apply
      },
      sources: {},
      citations: {},
    });

    expect(useWorksheetStore.getState().values['f-A']).toEqual({ type: 'number', value: 999 });
    expect(useWorksheetStore.getState().values['f-B']).toEqual({ type: 'text', value: 'new' });
  });

  it('is idempotent: re-merging the same values does not change state references', () => {
    const initialValues = {
      'f-A': { type: 'number' as const, value: 1 },
      'f-B': { type: 'text' as const, value: 'x' },
    };
    useWorksheetStore.getState().init('inst-1', initialValues, {}, {});
    const refBefore = useWorksheetStore.getState().values;

    // Same content, different object reference — simulates the parent
    // re-rendering with a fresh `initialValues` literal.
    useWorksheetStore.getState().mergeServerValues({
      values: {
        'f-A': { type: 'number', value: 1 },
        'f-B': { type: 'text', value: 'x' },
      },
      sources: {},
      citations: {},
    });
    const refAfter = useWorksheetStore.getState().values;

    expect(refAfter).toBe(refBefore); // same Object reference → subscribers don't re-render
  });

  it('handles json carriers via deep equality', () => {
    useWorksheetStore.getState().init(
      'inst-1',
      { 'f-K': { type: 'json', value: { rows: [{ id: 'r1', D_min: 10, r_D_n: 250 }] } } },
      {},
      {},
    );
    const refBefore = useWorksheetStore.getState().values;

    // Re-merge structurally identical carrier — no state churn.
    useWorksheetStore.getState().mergeServerValues({
      values: {
        'f-K': { type: 'json', value: { rows: [{ id: 'r1', D_min: 10, r_D_n: 250 }] } },
      },
      sources: {},
      citations: {},
    });
    expect(useWorksheetStore.getState().values).toBe(refBefore);

    // Now merge a carrier with a different row — must overwrite.
    useWorksheetStore.getState().mergeServerValues({
      values: {
        'f-K': { type: 'json', value: { rows: [{ id: 'r1', D_min: 15, r_D_n: 250 }] } },
      },
      sources: {},
      citations: {},
    });
    const v = useWorksheetStore.getState().values['f-K'];
    expect(v.type).toBe('json');
    expect(JSON.stringify(v.value)).toContain('"D_min":15');
  });

  it('treats type-change as a difference (number → text overwrites)', () => {
    useWorksheetStore.getState().init(
      'inst-1',
      { 'f-A': { type: 'number', value: 1 } },
      {},
      {},
    );
    useWorksheetStore.getState().mergeServerValues({
      values: { 'f-A': { type: 'text', value: 'one' } },
      sources: {},
      citations: {},
    });
    expect(useWorksheetStore.getState().values['f-A']).toEqual({ type: 'text', value: 'one' });
  });

  it('merges sources only when not pending', () => {
    useWorksheetStore.getState().init(
      'inst-1',
      { 'f-A': { type: 'number', value: 1 }, 'f-B': { type: 'number', value: 2 } },
      { 'f-A': { docId: 'doc-old', page: 1 }, 'f-B': null },
      {},
    );
    // Mark f-A as pending via setField; its source must survive merge.
    useWorksheetStore.getState().setField('f-A', { type: 'number', value: 99 });

    useWorksheetStore.getState().mergeServerValues({
      values: { 'f-A': { type: 'number', value: 1 }, 'f-B': { type: 'number', value: 2 } },
      sources: {
        'f-A': { docId: 'doc-new', page: 2 },
        'f-B': { docId: 'doc-B', page: 5 },
      },
      citations: {},
    });

    expect(useWorksheetStore.getState().sources['f-A']).toEqual({ docId: 'doc-old', page: 1 });
    expect(useWorksheetStore.getState().sources['f-B']).toEqual({ docId: 'doc-B', page: 5 });
  });

  it('citations compare by id+docId+page+note tuples', () => {
    useWorksheetStore.getState().init(
      'inst-1',
      {},
      {},
      { 'f-A': [{ id: 'c1', docId: 'd1', page: 1, note: null }] },
    );
    const refBefore = useWorksheetStore.getState().citations;

    // Same tuple — must be a no-op.
    useWorksheetStore.getState().mergeServerValues({
      values: {},
      sources: {},
      citations: { 'f-A': [{ id: 'c1', docId: 'd1', page: 1, note: null }] },
    });
    expect(useWorksheetStore.getState().citations).toBe(refBefore);

    // Different page → overwrite.
    useWorksheetStore.getState().mergeServerValues({
      values: {},
      sources: {},
      citations: { 'f-A': [{ id: 'c1', docId: 'd1', page: 7, note: null }] },
    });
    expect(useWorksheetStore.getState().citations['f-A'][0].page).toBe(7);
  });

  it('skips fields the server props omit (does not null them out)', () => {
    useWorksheetStore.getState().init(
      'inst-1',
      { 'f-A': { type: 'number', value: 1 }, 'f-B': { type: 'number', value: 2 } },
      {},
      {},
    );

    // Incoming has only f-A — must not touch f-B.
    useWorksheetStore.getState().mergeServerValues({
      values: { 'f-A': { type: 'number', value: 99 } },
      sources: {},
      citations: {},
    });

    expect(useWorksheetStore.getState().values['f-B']).toEqual({ type: 'number', value: 2 });
  });
});
