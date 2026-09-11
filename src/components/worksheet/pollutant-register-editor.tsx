'use client';

import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { POLLUTANTS } from '@/lib/vsme/pollutants';
import {
  normalizePollutantCarrier,
  newPollutantRow,
  pollutantRowComplete,
  summarizePollutants,
  POLLUTANT_MEDIA,
  type PollutantMedium,
  type PollutantRow,
  type PollutantRegisterCarrier,
} from '@/lib/eval/pollutant-register';

type Props = { fieldId: string; readOnly?: boolean };

const MEDIUM_LABEL: Record<PollutantMedium, string> = {
  air: 'Luft',
  water: 'Wasser',
  soil: 'Boden',
};

function formatNum(v: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 }).format(v);
}

export function PollutantRegisterEditor({ fieldId, readOnly = false }: Props) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const carrier = useMemo<PollutantRegisterCarrier>(
    () => normalizePollutantCarrier(raw?.type === 'json' ? raw.value : undefined),
    [raw],
  );

  // E-PRTR list sorted for the dropdown; values persist as member names.
  const options = useMemo(
    () => [...POLLUTANTS].sort((a, b) => a.labelEn.localeCompare(b.labelEn)),
    [],
  );

  function write(next: PollutantRegisterCarrier) {
    if (readOnly) return;
    setField(fieldId, { type: 'json', value: next });
  }
  function addRow() {
    write({ ...carrier, rows: [...carrier.rows, newPollutantRow()] });
  }
  function updateRow(id: string, patch: Partial<PollutantRow>) {
    write({ ...carrier, rows: carrier.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  }
  function removeRow(id: string) {
    write({ ...carrier, rows: carrier.rows.filter((r) => r.id !== id) });
  }
  function toggleNotApplicable(on: boolean) {
    write({ ...carrier, not_applicable: on });
  }

  const totals = useMemo(() => summarizePollutants(carrier), [carrier]);

  return (
    <div className="space-y-3" data-testid="pollutant-register-editor">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-medium text-ink">Schadstoffregister (E-PRTR)</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">
            VSME Abs. 32 — je Schadstoff und Medium (Luft / Wasser / Boden)
          </div>
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={readOnly || carrier.not_applicable}
          className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Zeile hinzufügen
        </button>
      </div>

      <label className="flex items-start gap-2 text-xs text-ink cursor-pointer">
        <input
          type="checkbox"
          checked={carrier.not_applicable}
          disabled={readOnly}
          onChange={(e) => toggleNotApplicable(e.target.checked)}
          className="mt-0.5"
          data-testid="pollutant-na-toggle"
        />
        <span>
          Keine berichtspflichtigen Schadstoffemissionen
          <span className="block text-[11px] text-subtext">
            Explizite Null-Meldung (z.&nbsp;B. keine E-PRTR-Berichtspflicht) — setzt alle drei
            Summen auf 0&nbsp;t. Ohne diese Bestätigung bleiben leere Summen „fehlend&ldquo;.
          </span>
        </span>
      </label>

      {carrier.not_applicable ? null : carrier.rows.length === 0 ? (
        <p className="text-xs text-subtext italic">
          Keine Emissionen erfasst. Pro Schadstoff und Medium eine Zeile hinzufügen — die drei
          Summenfelder (Luft/Wasser/Boden) werden beim Speichern automatisch berechnet.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
              <tr>
                <th className="text-left font-normal pb-1 pr-2">Quelle / Anlage</th>
                <th className="text-left font-normal pb-1 pr-2">Schadstoff (E-PRTR)</th>
                <th className="text-left font-normal pb-1 pr-2">Medium</th>
                <th className="text-right font-normal pb-1 pr-2">Menge (t)</th>
                <th aria-hidden="true" className="w-8" />
              </tr>
            </thead>
            <tbody>
              {carrier.rows.map((r) => (
                <tr key={r.id} className="border-t border-hairline align-top">
                  <td className="py-1.5 pr-2">
                    <input
                      type="text"
                      value={r.label}
                      readOnly={readOnly}
                      onChange={(e) => {
                        if (readOnly) return;
                        updateRow(r.id, { label: e.target.value });
                      }}
                      placeholder="z.B. Heizanlage, Lackiererei"
                      className={`block w-full rounded border border-hairline px-2 py-1 text-sm text-ink focus:outline-none ${readOnly ? 'bg-paper-2 cursor-default focus:border-hairline' : 'bg-transparent focus:border-accent'}`}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <select
                      aria-label="Schadstoff"
                      value={r.pollutant ?? ''}
                      disabled={readOnly}
                      onChange={(e) => {
                        if (readOnly) return;
                        updateRow(r.id, { pollutant: e.target.value || null });
                      }}
                      className="w-full max-w-[16rem] rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>
                        — wählen —
                      </option>
                      {options.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.labelEn}
                        </option>
                      ))}
                    </select>
                    {!r.pollutant && (
                      <div className="text-[10px] text-warning mt-1">⚠ Schadstoff wählen</div>
                    )}
                  </td>
                  <td className="py-1.5 pr-2">
                    <select
                      aria-label="Medium"
                      value={r.medium ?? ''}
                      disabled={readOnly}
                      onChange={(e) => {
                        if (readOnly) return;
                        const v = e.target.value as PollutantMedium | '';
                        updateRow(r.id, { medium: v === '' ? null : v });
                      }}
                      className="rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>
                        — wählen —
                      </option>
                      {POLLUTANT_MEDIA.map((m) => (
                        <option key={m} value={m}>
                          {MEDIUM_LABEL[m]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      aria-label="Menge (t)"
                      value={r.amount_t == null ? '' : r.amount_t}
                      readOnly={readOnly}
                      onChange={(e) => {
                        if (readOnly) return;
                        const v = e.target.value;
                        updateRow(r.id, { amount_t: v === '' ? null : Number(v) });
                      }}
                      className={`block w-full rounded border border-hairline px-2 py-1 text-sm text-ink text-right tabular-nums focus:outline-none ${readOnly ? 'bg-paper-2 cursor-default focus:border-hairline' : 'bg-transparent focus:border-accent'}`}
                    />
                    {!pollutantRowComplete(r) && r.amount_t != null && r.amount_t < 0 && (
                      <div className="text-[10px] text-warning mt-1">Menge muss ≥ 0 sein</div>
                    )}
                  </td>
                  <td className="py-1.5 pl-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(r.id)}
                      aria-label="Zeile entfernen"
                      disabled={readOnly}
                      className="text-subtext hover:text-error text-lg leading-none px-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="text-[11px] text-subtext">
              <tr className="border-t border-hairline-strong">
                <td colSpan={4} className="pt-2 pr-2">
                  Σ Luft:{' '}
                  <span data-testid="sum-air" className="font-mono">
                    {totals.air == null ? '—' : formatNum(totals.air)}
                  </span>{' '}
                  t · Wasser:{' '}
                  <span data-testid="sum-water" className="font-mono">
                    {totals.water == null ? '—' : formatNum(totals.water)}
                  </span>{' '}
                  t · Boden:{' '}
                  <span data-testid="sum-soil" className="font-mono">
                    {totals.soil == null ? '—' : formatNum(totals.soil)}
                  </span>{' '}
                  t
                </td>
                <td className="pt-2 text-right">
                  <span data-testid="rows-complete">
                    {totals.complete}/{totals.total}
                  </span>{' '}
                  vollständig
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
