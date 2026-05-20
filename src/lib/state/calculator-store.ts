'use client';

import { create } from 'zustand';
import type { InputValues, Worksheet } from '@/lib/engine';
import { compute } from '@/lib/engine';
import type { InputSource } from '@/lib/engine/inputs-reader';
import type { projectDocuments } from '@/lib/db/schema';
import { saveLocal, clearLocal } from './persistence';

type Doc = typeof projectDocuments.$inferSelect;

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'offline' | 'error';

type ComputeResult = ReturnType<typeof compute>;

export interface DerivedSource {
  worksheetId: string;
  calcName: string;
}

interface CalculatorState {
  calcId: string | null;
  worksheet: Worksheet | null;
  inputs: InputValues;
  result: ComputeResult | null;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  derivedSources: Record<string, DerivedSource>;
  inputSources: Record<string, InputSource | undefined>;
  docs: Doc[];

  init(args: {
    calcId: string;
    worksheet: Worksheet;
    inputs: InputValues;
    lastSavedAt: string | null;
    derivedSources?: Record<string, DerivedSource>;
    inputSources?: Record<string, InputSource | undefined>;
    docs?: Doc[];
  }): void;
  setField(id: string, value: number | string | boolean | null): void;
  isDerived(id: string): boolean;
  markSaving(): void;
  markSaved(at: string): void;
  markOffline(): void;
  markError(): void;
}

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  calcId: null,
  worksheet: null,
  inputs: {},
  result: null,
  saveStatus: 'idle',
  lastSavedAt: null,
  derivedSources: {},
  inputSources: {},
  docs: [],

  init({ calcId, worksheet, inputs, lastSavedAt, derivedSources, inputSources, docs }) {
    const result = compute(worksheet, inputs);
    set({
      calcId,
      worksheet,
      inputs,
      result,
      saveStatus: 'idle',
      lastSavedAt,
      derivedSources: derivedSources ?? {},
      inputSources: inputSources ?? {},
      docs: docs ?? [],
    });
  },

  setField(id, value) {
    const { worksheet, calcId, derivedSources } = get();
    if (!worksheet || !calcId) return;
    // Refuse client-side edits on derived fields. The value is owned by
    // the upstream calc; the engineer must change it there.
    if (derivedSources[id]) return;
    const inputs = { ...get().inputs, [id]: value };
    const result = compute(worksheet, inputs);
    saveLocal(calcId, inputs);
    set({ inputs, result, saveStatus: 'dirty' });
  },

  isDerived(id) {
    return !!get().derivedSources[id];
  },

  markSaving: () => set({ saveStatus: 'saving' }),
  markSaved(at) {
    const id = get().calcId;
    if (id) clearLocal(id);
    set({ saveStatus: 'saved', lastSavedAt: at });
  },
  markOffline: () => set({ saveStatus: 'offline' }),
  markError: () => set({ saveStatus: 'error' }),
}));
