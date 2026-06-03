'use client';
import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

/**
 * Headless hook that shares the JSON-carrier row plumbing between
 * KostraTableEditor and SurfaceInventoryEditor. Both write/read a
 * `{ rows: RowT[] }` shape into a single json field via the worksheet
 * store; the only thing that varies is the row schema and per-row
 * validation. Capturing the shared bit here keeps the two editors thin
 * and ensures any future fix to the carrier semantics (e.g. F2 sentinel,
 * future cross-worksheet sync) lands in one place.
 *
 * Generic over the row type `RowT`. Callers provide:
 *  - `newRow()` — produces a fresh row with a stable id
 *  - `readRow(raw)` — sanitises a single row from untrusted JSON, returns
 *    null to drop malformed rows on read
 *
 * Returns the live `rows` array plus `addRow / updateRow / removeRow`
 * mutators that write a new carrier object back to the store. The
 * carrier value is always `{ rows: [...] }`; mutators preserve that
 * shape exactly so a `surface_inventory IS NOT NULL` presence check
 * stays truthy as long as any row exists.
 */
export function useJsonTableCarrier<RowT extends { id: string }>(opts: {
  fieldId: string;
  newRow: () => RowT;
  readRow: (raw: unknown) => RowT | null;
}): {
  rows: RowT[];
  addRow: (seed?: Partial<RowT>) => void;
  updateRow: (id: string, patch: Partial<RowT>) => void;
  removeRow: (id: string) => void;
  replaceRow: (id: string, next: RowT) => void;
} {
  const { fieldId, newRow, readRow } = opts;
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);

  const rows = useMemo<RowT[]>(() => {
    if (!raw || raw.type !== 'json') return [];
    const v = raw.value as { rows?: unknown } | null | undefined;
    if (!v || !Array.isArray(v.rows)) return [];
    const out: RowT[] = [];
    for (const r of v.rows) {
      const parsed = readRow(r);
      if (parsed) out.push(parsed);
    }
    return out;
    // readRow is supplied by the caller; we intentionally do NOT make it
    // a dep — the row shape is fixed per call site, so changing it
    // mid-render would indicate a bug, not a legitimate refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  function write(next: RowT[]) {
    setField(fieldId, { type: 'json', value: { rows: next } });
  }

  return {
    rows,
    addRow(seed) {
      const row = { ...newRow(), ...(seed ?? {}) } as RowT;
      write([...rows, row]);
    },
    updateRow(id, patch) {
      write(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    removeRow(id) {
      write(rows.filter((r) => r.id !== id));
    },
    replaceRow(id, next) {
      write(rows.map((r) => (r.id === id ? next : r)));
    },
  };
}

/** Tiny helper used by both row constructors to produce a stable id. */
export function freshRowId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
