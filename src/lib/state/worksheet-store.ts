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
