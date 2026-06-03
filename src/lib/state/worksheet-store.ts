'use client';
import { create } from 'zustand';
import type { saveWorksheet } from '@/lib/actions/worksheet';

type FieldValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown };

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type Citation = {
  id: string;
  docId: string;
  page: number | null;
  note: string | null;
};

type WorksheetStore = {
  instanceId: string | null;
  /** field_id → value */
  values: Record<string, FieldValue>;
  /** field_id → citation payload | null (legacy single-citation accessor; new
   * code should read `citations` instead). Kept so older subscribers don't
   * crash during the migration window. */
  sources: Record<string, { docId: string; page?: number; note?: string } | null>;
  /** field_id → list of citations attached to that field. Initial seed comes
   * from the server; user actions (addCitation/removeCitation) update the DB
   * directly and a router refresh re-seeds. */
  citations: Record<string, Citation[]>;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  pendingFieldIds: Set<string>;
  init: (
    instanceId: string,
    initialValues: Record<string, FieldValue>,
    initialSources: Record<string, { docId: string; page?: number; note?: string } | null>,
    initialCitations: Record<string, Citation[]>,
  ) => void;
  /**
   * Merge fresh server-side props into the store WITHOUT clobbering
   * in-flight edits. Used by the worksheet form on initialValues changes
   * (e.g. cross-worksheet inheritance updates after a save on a sibling
   * worksheet, soft-nav back to a page whose props re-ran on the server).
   *
   * Contract:
   *   - Any field id present in `pendingFieldIds` is skipped — the
   *     engineer's unsaved edit wins.
   *   - Any other field whose incoming value differs from the current
   *     stored value (deep equality for json carriers, shallow for the
   *     primitives) is overwritten.
   *   - If nothing changes, no `set` call fires — the action is
   *     idempotent so the form can attach it to a useEffect that
   *     re-runs on every parent render without triggering re-renders
   *     in subscribers.
   */
  mergeServerValues: (
    incoming: {
      values: Record<string, FieldValue>;
      sources: Record<string, { docId: string; page?: number; note?: string } | null>;
      citations: Record<string, Citation[]>;
    },
  ) => void;
  setField: (fieldId: string, value: FieldValue) => void;
  setSource: (
    fieldId: string,
    source: { docId: string; page?: number; note?: string } | null,
  ) => void;
  flush: (saveFn: typeof saveWorksheet) => Promise<void>;
};

export const useWorksheetStore = create<WorksheetStore>((set, get) => ({
  instanceId: null,
  values: {},
  sources: {},
  citations: {},
  saveStatus: 'idle',
  lastSavedAt: null,
  pendingFieldIds: new Set(),

  init: (instanceId, initialValues, initialSources, initialCitations) =>
    set({
      instanceId,
      values: initialValues,
      sources: initialSources,
      citations: initialCitations,
      saveStatus: 'idle',
      pendingFieldIds: new Set(),
    }),

  mergeServerValues: (incoming) => {
    const s = get();
    let nextValues = s.values;
    let nextSources = s.sources;
    let nextCitations = s.citations;
    let changed = false;

    for (const id of Object.keys(incoming.values)) {
      if (s.pendingFieldIds.has(id)) continue;
      const cur = nextValues[id];
      const inc = incoming.values[id];
      if (!fieldValueEquals(cur, inc)) {
        if (nextValues === s.values) nextValues = { ...s.values };
        nextValues[id] = inc;
        changed = true;
      }
    }

    for (const id of Object.keys(incoming.sources)) {
      if (s.pendingFieldIds.has(id)) continue;
      const cur = nextSources[id] ?? null;
      const inc = incoming.sources[id] ?? null;
      if (!sourceEquals(cur, inc)) {
        if (nextSources === s.sources) nextSources = { ...s.sources };
        nextSources[id] = inc;
        changed = true;
      }
    }

    for (const id of Object.keys(incoming.citations)) {
      if (s.pendingFieldIds.has(id)) continue;
      const cur = nextCitations[id] ?? [];
      const inc = incoming.citations[id] ?? [];
      if (!citationsEqual(cur, inc)) {
        if (nextCitations === s.citations) nextCitations = { ...s.citations };
        nextCitations[id] = inc;
        changed = true;
      }
    }

    if (!changed) return;
    set({ values: nextValues, sources: nextSources, citations: nextCitations });
  },

  setField: (fieldId, value) =>
    set((s) => ({
      values: { ...s.values, [fieldId]: value },
      pendingFieldIds: new Set([...s.pendingFieldIds, fieldId]),
      saveStatus: 'idle',
    })),

  setSource: (fieldId, source) =>
    set((s) => ({ sources: { ...s.sources, [fieldId]: source } })),

  flush: async (saveFn) => {
    const state = get();
    if (!state.instanceId || state.pendingFieldIds.size === 0) return;
    const valuesToSave: Record<string, FieldValue> = {};
    for (const id of state.pendingFieldIds) {
      valuesToSave[id] = state.values[id];
    }
    set({ saveStatus: 'saving' });
    const result = await saveFn({ instanceId: state.instanceId, values: valuesToSave });
    if (result.ok) {
      set({
        saveStatus: 'saved',
        lastSavedAt: new Date().toISOString(),
        pendingFieldIds: new Set(),
      });
      // Auto-clear 'saved' after 3s
      setTimeout(() => {
        if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
      }, 3000);
    } else {
      set({ saveStatus: 'error' });
    }
  },
}));

function fieldValueEquals(a: FieldValue | undefined, b: FieldValue | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.type !== b.type) return false;
  if (a.type === 'json') {
    // Deep equality via JSON serialisation. Carriers are small objects
    // (sub-areas + KOSTRA rows), so the cost is negligible and the
    // semantics are exact for the JSON-safe shapes our forms produce.
    try {
      return JSON.stringify(a.value) === JSON.stringify(b.value);
    } catch {
      return false;
    }
  }
  return a.value === (b as { value: unknown }).value;
}

function sourceEquals(
  a: { docId: string; page?: number; note?: string } | null,
  b: { docId: string; page?: number; note?: string } | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;
  return a.docId === b.docId && a.page === b.page && a.note === b.note;
}

function citationsEqual(a: Citation[], b: Citation[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.id !== y.id || x.docId !== y.docId || x.page !== y.page || x.note !== y.note) {
      return false;
    }
  }
  return true;
}
