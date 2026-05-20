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

type WorksheetStore = {
  instanceId: string | null;
  /** field_id → value */
  values: Record<string, FieldValue>;
  /** field_id → citation payload | null */
  sources: Record<string, { docId: string; page?: number; note?: string } | null>;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  pendingFieldIds: Set<string>;
  init: (
    instanceId: string,
    initialValues: Record<string, FieldValue>,
    initialSources: Record<string, { docId: string; page?: number; note?: string } | null>,
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
  saveStatus: 'idle',
  lastSavedAt: null,
  pendingFieldIds: new Set(),

  init: (instanceId, initialValues, initialSources) =>
    set({
      instanceId,
      values: initialValues,
      sources: initialSources,
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
    } else {
      set({ saveStatus: 'error' });
    }
  },
}));
