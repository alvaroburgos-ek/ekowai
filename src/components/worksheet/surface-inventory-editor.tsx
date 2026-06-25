'use client';

import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { getTab9Entries, lookupTab9 } from '@/lib/eval/tab9';
import {
  normalizeSurfaceCarrier,
  newSurfaceRow,
  rowKind,
  rowComplete,
  rowMismatch,
  type SurfaceRow,
  type SurfaceInventoryCarrier,
} from '@/lib/eval/surface-inventory';

type Props = { fieldId: string };

const GROUP_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Wasserundurchlässige Flächen',
  2: 'Teildurchlässige Flächen',
  3: 'Durchlässige Flächen',
};

function formatNum(v: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v);
}

export function SurfaceInventoryEditor({ fieldId }: Props) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const carrier = useMemo<SurfaceInventoryCarrier>(
    () => normalizeSurfaceCarrier(raw?.type === 'json' ? raw.value : undefined),
    [raw],
  );

  const groups = useMemo(() => {
    const entries = getTab9Entries();
    return ([1, 2, 3] as const).map((g) => ({ g, items: entries.filter((e) => e.group === g) }));
  }, []);

  function write(rows: SurfaceRow[]) {
    setField(fieldId, { type: 'json', value: { rows } });
  }
  function addRow() {
    write([...carrier.rows, newSurfaceRow()]);
  }
  function updateRow(id: string, patch: Partial<SurfaceRow>) {
    write(carrier.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    write(carrier.rows.filter((r) => r.id !== id));
  }
  function selectType(id: string, value: string) {
    const e = lookupTab9(value);
    if (!e) return;
    updateRow(id, { tab9_value: value, c_i: e.cm, c_s: e.cs, coeff_override: false });
  }
  function toggleOverride(id: string, on: boolean) {
    const row = carrier.rows.find((r) => r.id === id);
    if (!row) return;
    if (on) {
      updateRow(id, { coeff_override: true });
    } else {
      // Revert to the Tab. 9 pair for the selected type.
      const e = row.tab9_value ? lookupTab9(row.tab9_value) : undefined;
      updateRow(id, { coeff_override: false, c_i: e?.cm ?? null, c_s: e?.cs ?? null });
    }
  }

  const totals = useMemo(() => {
    let paved = 0;
    let unpaved = 0;
    let complete = 0;
    let A_C_preview = 0;
    for (const r of carrier.rows) {
      if (!rowComplete(r)) continue;
      complete++;
      const area = r.area_m2 as number;
      A_C_preview += area * (r.c_i as number);
      if (rowKind(r) === 'paved') paved += area;
      else unpaved += area;
    }
    return { paved, unpaved, complete, total: carrier.rows.length, A_C_preview };
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
          Keine Flächen erfasst. Pro Oberflächentyp eine Zeile hinzufügen und den Typ aus Tab. 9 wählen — C_i und C_s werden automatisch gesetzt.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[44rem] text-sm">
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
                const entry = r.tab9_value ? lookupTab9(r.tab9_value) : undefined;
                const kind = rowKind(r);
                const product = rowComplete(r) ? (r.area_m2 as number) * (r.c_i as number) : null;
                return (
                  <tr key={r.id} className="border-t border-hairline align-top">
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
                        aria-label="Oberflächentyp"
                        value={r.tab9_value ?? ''}
                        onChange={(e) => selectType(r.id, e.target.value)}
                        className="rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                      >
                        <option value="" disabled>
                          — wählen —
                        </option>
                        {groups.map(({ g, items }) => (
                          <optgroup key={g} label={GROUP_LABEL[g]}>
                            {items.map((it) => (
                              <option key={it.value} value={it.value}>
                                {it.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {!r.tab9_value && (
                        <div className="text-[10px] text-warning mt-1">⚠ Oberflächentyp neu wählen (Tab. 9)</div>
                      )}
                      {kind && (
                        <div data-testid="kind-badge" className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-1">
                          {kind === 'paved' ? 'befestigt' : 'unbefestigt'}
                        </div>
                      )}
                      {r.tab9_value && (
                        <button
                          type="button"
                          onClick={() => toggleOverride(r.id, !r.coeff_override)}
                          className="text-[10px] text-accent hover:underline mt-1"
                        >
                          {r.coeff_override ? 'Tab. 9 übernehmen' : 'abweichend wählen'}
                        </button>
                      )}
                      {r.coeff_override && entry && (
                        <div data-testid="tab9-original" className="text-[10px] text-subtext mt-0.5">
                          Tab. 9: {formatNum(entry.cm)} / {formatNum(entry.cs)}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        aria-label="Fläche"
                        value={r.area_m2 == null ? '' : r.area_m2}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, { area_m2: v === '' ? null : Number(v) });
                        }}
                        className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {r.coeff_override ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          max="1"
                          aria-label="C_i (abweichend)"
                          value={r.c_i == null ? '' : r.c_i}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRow(r.id, { c_i: v === '' ? null : Number(v) });
                          }}
                          className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                        />
                      ) : (
                        <span data-testid="c_i-readonly" className="font-mono text-ink">
                          {r.c_i == null ? '—' : formatNum(r.c_i)}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {r.coeff_override ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          max="1"
                          aria-label="C_s (abweichend)"
                          value={r.c_s == null ? '' : r.c_s}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRow(r.id, { c_s: v === '' ? null : Number(v) });
                          }}
                          className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                        />
                      ) : (
                        <span data-testid="c_s-readonly" className="font-mono text-ink">
                          {r.c_s == null ? '—' : formatNum(r.c_s)}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pl-2 text-right tabular-nums font-mono text-sm">
                      {product == null ? <span className="text-subtext">—</span> : formatNum(product)}
                      {rowMismatch(r) && (
                        <div className="text-[10px] text-warning">C_i weicht von Tab. 9 ab</div>
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
                  Σ Fläche befestigt: <span data-testid="total-paved" className="font-mono">{formatNum(totals.paved)}</span> m² ·
                  unbefestigt: <span data-testid="total-unpaved" className="font-mono">{formatNum(totals.unpaved)}</span> m²
                </td>
                <td colSpan={3} className="pt-2 text-right">
                  A_C-Vorschau (Σ A·C_i): <span className="font-mono">{formatNum(totals.A_C_preview)}</span> m²
                </td>
                <td colSpan={2} className="pt-2 text-right">
                  <span data-testid="rows-complete">{totals.complete}/{totals.total}</span> vollständig
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
