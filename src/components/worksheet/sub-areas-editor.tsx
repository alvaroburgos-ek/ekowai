'use client';

import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import type { SubArea, SubAreasCarrier } from '@/lib/eval/aggregators';
import { Select } from '@/components/ui/select';

type Props = {
  fieldId: string;
};

function emptyCarrier(): SubAreasCarrier {
  return { rows: [] };
}

function newRow(): SubArea {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: '',
    kind: 'paved',
    area_m2: null,
    c: null,
  };
}

function readCarrier(value: unknown): SubAreasCarrier {
  if (!value || typeof value !== 'object') return emptyCarrier();
  const v = value as { rows?: unknown };
  if (!Array.isArray(v.rows)) return emptyCarrier();
  const rows: SubArea[] = [];
  for (const raw of v.rows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<SubArea> & { kind?: string };
    rows.push({
      id: typeof r.id === 'string' && r.id.length > 0 ? r.id : newRow().id,
      label: typeof r.label === 'string' ? r.label : '',
      kind: r.kind === 'unpaved' ? 'unpaved' : 'paved',
      area_m2:
        typeof r.area_m2 === 'number' && Number.isFinite(r.area_m2) ? r.area_m2 : null,
      c: typeof r.c === 'number' && Number.isFinite(r.c) ? r.c : null,
    });
  }
  return { rows };
}

export function SubAreasEditor({ fieldId }: Props) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const carrier = useMemo(
    () => readCarrier(raw?.type === 'json' ? raw.value : undefined),
    [raw],
  );

  function write(next: SubAreasCarrier) {
    setField(fieldId, { type: 'json', value: next });
  }

  function addRow() {
    write({ rows: [...carrier.rows, newRow()] });
  }

  function updateRow(id: string, patch: Partial<SubArea>) {
    write({
      rows: carrier.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  }

  function removeRow(id: string) {
    write({ rows: carrier.rows.filter((r) => r.id !== id) });
  }

  const totals = useMemo(() => {
    let pavedArea = 0;
    let unpavedArea = 0;
    let complete = 0;
    for (const r of carrier.rows) {
      if (typeof r.area_m2 === 'number' && Number.isFinite(r.area_m2)) {
        if (r.kind === 'paved') pavedArea += r.area_m2;
        else unpavedArea += r.area_m2;
      }
      if (r.area_m2 != null && r.c != null) complete++;
    }
    return { pavedArea, unpavedArea, complete, total: carrier.rows.length };
  }, [carrier]);

  return (
    <div className="space-y-3" data-testid="sub-areas-editor">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-medium text-ink">Teilflächen (per Sub-Areal)</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">
            §5.3.3.5 Gl. 2 · A_C = Σ(Aᵢ · Cᵢ)
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
          Keine Teilflächen erfasst. Fügen Sie pro Sub-Areal eine Zeile mit Fläche und Abflussbeiwert (Tab. 9) hinzu.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
              <tr>
                <th className="text-left font-normal pb-1 pr-2">Bezeichnung</th>
                <th className="text-left font-normal pb-1 pr-2">Versiegelung</th>
                <th className="text-right font-normal pb-1 pr-2">A (m²)</th>
                <th className="text-right font-normal pb-1 pr-2">C</th>
                <th className="text-right font-normal pb-1 pl-2">A · C</th>
                <th aria-hidden="true" className="w-8" />
              </tr>
            </thead>
            <tbody>
              {carrier.rows.map((r) => {
                const product =
                  r.area_m2 != null && r.c != null ? r.area_m2 * r.c : null;
                return (
                  <tr key={r.id} className="border-t border-hairline">
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={r.label ?? ''}
                        onChange={(e) => updateRow(r.id, { label: e.target.value })}
                        placeholder="z.B. Steildach"
                        className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Select
                        size="sm"
                        inline
                        value={r.kind}
                        onChange={(e) =>
                          updateRow(r.id, {
                            kind: e.target.value === 'unpaved' ? 'unpaved' : 'paved',
                          })
                        }
                      >
                        <option value="paved">befestigt</option>
                        <option value="unpaved">unversiegelt</option>
                      </Select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={r.area_m2 == null ? '' : r.area_m2}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, {
                            area_m2: v === '' ? null : Number(v),
                          });
                        }}
                        className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={r.c == null ? '' : r.c}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, { c: v === '' ? null : Number(v) });
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
                <td colSpan={2} className="pt-2 pr-2">
                  Σ befestigt: <span className="font-mono">{formatNum(totals.pavedArea)} m²</span> · Σ unversiegelt:{' '}
                  <span className="font-mono">{formatNum(totals.unpavedArea)} m²</span>
                </td>
                <td colSpan={4} className="pt-2 text-right">
                  {totals.complete}/{totals.total} Zeilen vollständig
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
