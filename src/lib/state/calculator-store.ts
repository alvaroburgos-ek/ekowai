'use client';

import { create } from 'zustand';
import type { InputValues, Worksheet } from '@/lib/engine';
import { compute } from '@/lib/engine';
import { saveLocal, clearLocal } from './persistence';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'offline' | 'error';

type ComputeResult = ReturnType<typeof compute>;

interface CalculatorState {
  calcId: string | null;
  worksheet: Worksheet | null;
  inputs: InputValues;
  result: ComputeResult | null;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;

  init(args: {
    calcId: string;
    worksheet: Worksheet;
    inputs: InputValues;
    lastSavedAt: string | null;
  }): void;
  setField(id: string, value: number | string | boolean | null): void;
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

  init({ calcId, worksheet, inputs, lastSavedAt }) {
    const result = compute(worksheet, inputs);
    set({ calcId, worksheet, inputs, result, saveStatus: 'idle', lastSavedAt });
  },

  setField(id, value) {
    const { worksheet, calcId } = get();
    if (!worksheet || !calcId) return;
    const inputs = { ...get().inputs, [id]: value };
    const result = compute(worksheet, inputs);
    saveLocal(calcId, inputs);
    set({ inputs, result, saveStatus: 'dirty' });
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
