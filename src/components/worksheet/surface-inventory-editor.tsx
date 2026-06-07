'use client';

import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

/**
 * Surface inventory editor for A138-07 `surface_inventory` (json).
 *
 * Per-row schema (Tab. 9 §5.3.3.5 + §5.3.4):
 *   { id, label, surface_type, area_m2, c_i, c_s }
 *
 * c_i is the design-event Abflussbeiwert per Tab. 9 (used by Gl. 2 to
 * compute A_C). c_s is the flood-event Abflussbeiwert from the same
 * table (used by Gl. 10 to compute V_Rück). They are listed side-by-side
 * because the engineer sources both from the same Tab. 9 row per surface
 * type — having them in one inventory avoids a transcription gap.
 *
 * Note: the carrier `surface_inventory` is NOT the same JSON field as
 * `sub_areas_A138_10` (which is the Gl. 2 aggregator's input). A future
 * slice can derive sub_areas_A138_10 from this inventory, or the
 * engineer can fill both. Currently they are independent — this editor
 * fixes the "engineer cannot enter A138-07's required field" defect from
 * the integration-health sweep.
 */

type SurfaceRow = {
  id: string;
  label: string;
  surface_type: string;
  area_m2: number | null;
  c_i: number | null;
  c_s: number | null;
};

type SurfaceInventoryCarrier = {
  rows: SurfaceRow[];
};

type Props = {
  fieldId: string;
};

function emptyCarrier(): SurfaceInventoryCarrier {
  return { rows: [] };
}

function newRow(): SurfaceRow {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: '',
    surface_type: 'dach',
    area_m2: null,
    c_i: null,
    c_s: null,
  };
}

function readCarrier(value: unknown): SurfaceInventoryCarrier {
  if (!value || typeof value !== 'object') return emptyCarrier();
  const v = value as { rows?: unknown };
  if (!Array.isArray(v.rows)) return emptyCarrier();
  const rows: SurfaceRow[] = [];
  for (const raw of v.rows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<SurfaceRow>;
    rows.push({
      id: typeof r.id === 'string' && r.id.length > 0 ? r.id : newRow().id,
      label: typeof r.label === 'string' ? r.label : '',
      surface_type:
        typeof r.surface_type === 'string' && r.surface_type.length > 0 ? r.surface_type : 'dach',
      area_m2: typeof r.area_m2 === 'number' && Number.isFinite(r.area_m2) ? r.area_m2 : null,
      c_i: typeof r.c_i === 'number' && Number.isFinite(r.c_i) ? r.c_i : null,
      c_s: typeof r.c_s === 'number' && Number.isFinite(r.c_s) ? r.c_s : null,
    });
  }
  return { rows };
}

const SURFACE_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'dach', label: 'Dachfläche' },
  { value: 'asphalt', label: 'Asphalt / Beton (dicht)' },
  { value: 'pflaster', label: 'Pflaster' },
  { value: 'pflaster_offen', label: 'Pflaster (offene Fugen)' },
  { value: 'kies', label: 'Kies' },
  { value: 'rasen', label: 'Rasen / Gartenfläche' },
  { value: 'sonstige', label: 'Sonstige' },
];

export function SurfaceInventoryEditor({ fieldId }: Props) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const carrier = useMemo(
    () => readCarrier(raw?.type === 'json' ? raw.value : undefined),
    [raw],
  );

  function write(next: SurfaceInventoryCarrier) {
    setField(fieldId, { type: 'json', value: next });
  }
  function addRow() {
    write({ rows: [...carrier.rows, newRow()] });
  }
  function updateRow(id: string, patch: Partial<SurfaceRow>) {
    write({ rows: carrier.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  }
  function removeRow(id: string) {
    write({ rows: carrier.rows.filter((r) => r.id !== id) });
  }

  const totals = useMemo(() => {
    let area = 0;
    let complete = 0;
    let A_C_preview = 0;
    for (const r of carrier.rows) {
      if (typeof r.area_m2 === 'number' && Number.isFinite(r.area_m2)) area += r.area_m2;
      if (r.area_m2 != null && r.c_i != null && r.c_s != null) complete++;
      if (r.area_m2 != null && r.c_i != null) A_C_preview += r.area_m2 * r.c_i;
    }
    return { area, complete, total: carrier.rows.length, A_C_preview };
  }, [carrier]);

  return (
    <div className="space-y-3" data-testid="surface-inventory-editor">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-medium text-ink">Flächenverzeichnis (Tab. 9)</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">
            §5.3.3.5 Gl. 2 (C_i) · §5.3.4 Gl. 10 (C_s)
          </div>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink"
        >
          + Zeile hinzufügen
        </button>
      </div>

      {carrier.rows.length === 0 ? (
        <p className="text-xs text-subtext italic">
          Keine Flächen erfasst. Pro Oberflächentyp eine Zeile mit Fläche und Abflussbeiwerten C_i (Bemessungsregen) und C_s (Flutereignis) eingeben.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
              <tr>
                <th className="text-left font-normal pb-1 pr-2">Bezeichnung</th>
                <th className="text-left font-normal pb-1 pr-2">Oberflächentyp</th>
                <th className="text-right font-normal pb-1 pr-2">A (m²)</th>
                <th className="text-right font-normal pb-1 pr-2">C_i</th>
                <th className="text-right font-normal pb-1 pr-2">C_s</th>
                <th className="text-right font-normal pb-1 pl-2">A · C_i</th>
                <th aria-hidden="true" className="w-8" />
              </tr>
            </thead>
            <tbody>
              {carrier.rows.map((r) => {
                const product = r.area_m2 != null && r.c_i != null ? r.area_m2 * r.c_i : null;
                return (
                  <tr key={r.id} className="border-t border-hairline">
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={r.label ?? ''}
                        onChange={(e) => updateRow(r.id, { label: e.target.value })}
                        placeholder="z.B. Hauptdach"
                        className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={r.surface_type}
                        onChange={(e) => updateRow(r.id, { surface_type: e.target.value })}
                        className="rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                      >
                        {SURFACE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={r.area_m2 == null ? '' : r.area_m2}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, { area_m2: v === '' ? null : Number(v) });
                        }}
                        className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        max="1"
                        value={r.c_i == null ? '' : r.c_i}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, { c_i: v === '' ? null : Number(v) });
                        }}
                        className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        max="1"
                        value={r.c_s == null ? '' : r.c_s}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, { c_s: v === '' ? null : Number(v) });
                        }}
                        className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pl-2 text-right tabular-nums font-mono text-sm">
                      {product == null ? (
                        <span className="text-subtext">—</span>
                      ) : (
                        formatNum(product)
                      )}
                    </td>
                    <td className="py-1.5 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(r.id)}
                        aria-label="Zeile entfernen"
                        className="text-subtext hover:text-error text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="text-[11px] text-subtext">
              <tr className="border-t border-hairline-strong">
                <td colSpan={3} className="pt-2 pr-2">
                  Σ Fläche: <span className="font-mono">{formatNum(totals.area)} m²</span>
                </td>
                <td colSpan={3} className="pt-2 text-right">
                  A_C-Vorschau (Σ A·C_i): <span className="font-mono">{formatNum(totals.A_C_preview)} m²</span>
                </td>
                <td className="pt-2 text-right">
                  {totals.complete}/{totals.total} vollständig
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function formatNum(v: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v);
}
