import type { InputValues } from '@/lib/engine';

const KEY_PREFIX = 'ekowai.calc.';

export interface PersistedCalc {
  inputs: InputValues;
  updatedAt: string;
}

export function loadLocal(calcId: string): PersistedCalc | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + calcId);
    return raw ? (JSON.parse(raw) as PersistedCalc) : null;
  } catch {
    return null;
  }
}

export function saveLocal(calcId: string, inputs: InputValues): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      KEY_PREFIX + calcId,
      JSON.stringify({ inputs, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* quota / disabled — silent */
  }
}

export function clearLocal(calcId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY_PREFIX + calcId);
}
