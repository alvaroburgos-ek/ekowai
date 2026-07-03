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
      // Apply server-materialized derived values surgically to the store.
      // Only the field ids returned in `derived` are updated; all other fields —
      // including any dirty/pending user edits — are untouched (non-interference).
      // These are read-only computed fields the user never edits, so updating
      // them cannot clobber in-flight work.
      const derivedUpdates: Record<string, FieldValue> = {};
      if (result.derived && result.derived.length > 0) {
        const currentValues = get().values;
        for (const row of result.derived) {
          // Determine the FieldValue type from the existing store entry for this
          // field id (if any), or infer from which column is non-null.
          // Priority: existing type from store (preserves the field's data type);
          // fallback: valueText → 'text', valueNumber → 'number'.
          const existing = currentValues[row.fieldId];
          if (existing?.type === 'text' || (!existing && row.valueText !== null && row.valueNumber === null)) {
            derivedUpdates[row.fieldId] = { type: 'text', value: row.valueText };
          } else if (existing?.type === 'number' || (!existing && row.valueNumber !== null)) {
            const num = row.valueNumber != null ? Number(row.valueNumber) : null;
            derivedUpdates[row.fieldId] = { type: 'number', value: num != null && Number.isFinite(num) ? num : null };
          } else if (existing) {
            // Existing type is neither text nor number (enum/boolean/etc.) — leave alone;
            // the materialize passes only write number/text columns.
          }
          // If no existing entry and both columns are null, skip (nothing to write).
        }
      }
      set((s) => ({
        saveStatus: 'saved',
        lastSavedAt: new Date().toISOString(),
        pendingFieldIds: new Set(),
        // Merge derived updates on top of current values. pendingFieldIds was
        // cleared above so there are no dirty fields to protect at this point;
        // but this spread preserves any fields not in derivedUpdates untouched.
        values: Object.keys(derivedUpdates).length > 0
          ? { ...s.values, ...derivedUpdates }
          : s.values,
      }));
      // Auto-clear 'saved' after 3s
      setTimeout(() => {
        if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
      }, 3000);
    } else {
      set({ saveStatus: 'error' });
    }
  },
}));
