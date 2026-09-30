'use client';
import { create } from 'zustand';
import type { saveWorksheet } from '@/lib/actions/worksheet';

/** The store's value union — the ONE FieldValue type (Plan 2b Task 3 fix round 1: the form and the widgets registry import it instead of keeping copies). */
export type FieldValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown };

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Warnings from the last completed save (e.g. rejected A_S,m field notices).
 * Set to [] at the start of each flush so stale warnings don't linger across
 * saves. Populated from result.warnings on ok=true. Empty on ok=false (hard
 * error shown via saveStatus='error' is sufficient). */
export type SaveWarnings = string[];

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
  /** Warnings from the most recent save (server-provided, already in German).
   * Non-empty when the server rejected one or more fields (e.g. manual A_S,m
   * without provenance). Cleared at the start of each new flush. */
  lastWarnings: string[];
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

export const useWorksheetStore = create<WorksheetStore>((set, get) => {
  /**
   * The save currently on the wire, or null. `flush` is called by the form's
   * debounced autosave; while a save is in flight a second call must NOT open
   * a second server round-trip over the same field ids (two concurrent
   * saveWorksheet transactions race their materialize passes and doubled the
   * network churn observed on the FLL register sheets). The caller gets the
   * in-flight promise instead; ids that were edited during the flight stay in
   * `pendingFieldIds` when it lands (see the success branch), the store's
   * pendingFieldIds identity changes, and the form's debounce effect schedules
   * the follow-up save — one flush at a time, nothing dropped.
   */
  let inFlight: Promise<void> | null = null;

  return {
  instanceId: null,
  values: {},
  sources: {},
  citations: {},
  saveStatus: 'idle',
  lastSavedAt: null,
  pendingFieldIds: new Set(),
  lastWarnings: [],

  init: (instanceId, initialValues, initialSources, initialCitations) =>
    set({
      instanceId,
      values: initialValues,
      sources: initialSources,
      citations: initialCitations,
      saveStatus: 'idle',
      pendingFieldIds: new Set(),
      lastWarnings: [],
    }),

  setField: (fieldId, value) =>
    set((s) => ({
      values: { ...s.values, [fieldId]: value },
      pendingFieldIds: new Set([...s.pendingFieldIds, fieldId]),
      saveStatus: 'idle',
    })),

  setSource: (fieldId, source) =>
    set((s) => ({ sources: { ...s.sources, [fieldId]: source } })),

  flush: (saveFn) => {
    if (inFlight) return inFlight;
    const state = get();
    if (!state.instanceId || state.pendingFieldIds.size === 0) return Promise.resolve();
    const valuesToSave: Record<string, FieldValue> = {};
    for (const id of state.pendingFieldIds) {
      valuesToSave[id] = state.values[id];
    }
    inFlight = runFlush(saveFn, state.instanceId, valuesToSave).finally(() => {
      inFlight = null;
    });
    return inFlight;
  },
  };

  async function runFlush(
    saveFn: typeof saveWorksheet,
    instanceId: string,
    valuesToSave: Record<string, FieldValue>,
  ): Promise<void> {
    // Clear stale warnings at the start of each new flush so a prior rejected-save
    // message does not persist across a subsequent clean save.
    set({ saveStatus: 'saving', lastWarnings: [] });
    const result = await saveFn({ instanceId, values: valuesToSave });
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
      set((s) => {
        // An id leaves `pending` only if the value we just persisted is still
        // the value in the store. A field edited while this save was on the
        // wire (setField always stores a fresh object) keeps its pending mark
        // and rides the follow-up flush — previously the blanket `new Set()`
        // here dropped such edits: the form's debounce effect saw size 0,
        // cleared its timer, and the edit was never saved (register rows
        // typed during a save vanished on the next reload).
        const stillPending = new Set<string>();
        for (const id of s.pendingFieldIds) {
          if (!(id in valuesToSave) || s.values[id] !== valuesToSave[id]) stillPending.add(id);
        }
        return {
          saveStatus: 'saved',
          lastSavedAt: new Date().toISOString(),
          pendingFieldIds: stillPending,
          // Surface server warnings (e.g. rejected A_S,m without provenance) so the
          // UI can display them. The server already returned the persisted value via
          // derived rows, so the field reverts automatically via the derivedUpdates
          // merge below. lastWarnings was cleared at the START of this flush (above).
          lastWarnings: result.warnings ?? [],
          // Merge derived updates on top of current values. Derived fields are
          // never engineer-edited, so this spread only touches server-owned
          // ids and preserves every other field (dirty or not) untouched.
          values: Object.keys(derivedUpdates).length > 0
            ? { ...s.values, ...derivedUpdates }
            : s.values,
        };
      });
      // Auto-clear 'saved' after 3s
      setTimeout(() => {
        if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
      }, 3000);
    } else {
      set({ saveStatus: 'error' });
    }
  }
});
