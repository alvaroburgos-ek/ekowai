'use client';

import type { KostraRow } from '@/lib/eval/aggregators';
import { useJsonTableCarrier, freshRowId } from './use-json-table-carrier';

type Props = {
  fieldId: string;
};

const KOSTRA_DEFAULT_DURATIONS = [5, 10, 15, 30, 60, 120];

function newRow(D?: number): KostraRow {
  return {
    id: freshRowId(),
    label: '',
    D_min: typeof D === 'number' ? D : null,
    r_D_n: null,
  };
}

function readRow(raw: unknown): KostraRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<KostraRow>;
  return {
    id: typeof r.id === 'string' && r.id.length > 0 ? r.id : freshRowId(),
    label: typeof r.label === 'string' ? r.label : '',
    D_min:
      typeof r.D_min === 'number' && Number.isFinite(r.D_min) ? r.D_min : null,
    r_D_n:
      typeof r.r_D_n === 'number' && Number.isFinite(r.r_D_n) ? r.r_D_n : null,
  };
}

export function KostraTableEditor({ fieldId }: Props) {
  const { rows, addRow, updateRow, removeRow } = useJsonTableCarrier<KostraRow>({
    fieldId,
    newRow: () => newRow(),
    readRow,
  });

  function seedDefaults() {
    const usedD = new Set(
      rows.map((r) => r.D_min).filter((d): d is number => d != null),
    );
    for (const d of KOSTRA_DEFAULT_DURATIONS) {
      if (!usedD.has(d)) addRow({ D_min: d });
    }
  }

  const complete = rows.filter(
    (r) => r.D_min != null && r.r_D_n != null,
  ).length;
  const seedDisabled = KOSTRA_DEFAULT_DURATIONS.every((d) =>
    rows.some((r) => r.D_min === d),
  );

  return (
    <div className="space-y-3" data-testid="kostra-table-editor">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-medium text-ink">
            KOSTRA r_D(n) Tabelle
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">
            §5.3.3.5 Gl. 3 + §5.3.3.7 Gl. 8 · r_D(n) in l/(s·ha)
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={seedDefaults}
            className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink"
            disabled={seedDisabled}
          >
            Standard-Dauerstufen einfügen
          </button>
          <button
            type="button"
            onClick={() => addRow()}
            className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink"
          >
            + Zeile
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-subtext italic">
          Keine KOSTRA-Daten erfasst. Fügen Sie Dauerstufen mit zugehöriger
          Regenspende r_D(n) ein.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
              <tr>
                <th className="text-left font-normal pb-1 pr-2">Bezeichnung</th>
                <th className="text-right font-normal pb-1 pr-2">D (min)</th>
                <th className="text-right font-normal pb-1 pr-2">
                  r_D(n) (l/(s·ha))
                </th>
                <th aria-hidden="true" className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-hairline">
                  <td className="py-1.5 pr-2">
                    <input
                      type="text"
                      value={r.label ?? ''}
                      onChange={(e) =>
                        updateRow(r.id, { label: e.target.value })
                      }
                      placeholder="optional"
                      className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={r.D_min == null ? '' : r.D_min}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateRow(r.id, { D_min: v === '' ? null : Number(v) });
                      }}
                      className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      value={r.r_D_n == null ? '' : r.r_D_n}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateRow(r.id, { r_D_n: v === '' ? null : Number(v) });
                      }}
                      className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
                    />
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
              ))}
            </tbody>
            <tfoot className="text-[11px] text-subtext">
              <tr className="border-t border-hairline-strong">
                <td colSpan={4} className="pt-2 text-right">
                  {complete}/{rows.length} Zeilen vollständig
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
