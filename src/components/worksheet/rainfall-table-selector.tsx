'use client';

import type { RainfallTable, RainfallSource } from '@/lib/eval/rainfall-tables';

const SOURCE_BADGE: Record<RainfallSource, string> = {
  'KOSTRA-DWD-2020': 'KOSTRA',
  'DWA-A-531-local': 'DWA-A 531',
  engineer: 'Ingenieur',
};

type Props = {
  tables: RainfallTable[];
  /** The selected table id (the facility's rainfall_table_ref), or null. */
  value: string | null;
  onSelect: (id: string) => void;
  readOnly?: boolean;
};

/** Per-facility selector for WHICH rainfall table this facility uses. It picks
 * a TABLE id only — never an r_D(n) value (the value stays engine-derived). */
export function RainfallTableSelector({ tables, value, onSelect, readOnly = false }: Props) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
        Regenspendentabelle (Quelle für r_D(n))
      </span>
      <select
        value={value ?? ''}
        disabled={readOnly}
        aria-label="Regenspendentabelle wählen"
        onChange={(e) => {
          if (readOnly) return;
          onSelect(e.target.value);
        }}
        className={`block w-full rounded border border-hairline-strong px-2 py-1.5 text-sm text-ink focus:outline-none ${readOnly ? 'bg-paper-2 cursor-default' : 'bg-transparent focus:border-accent'}`}
      >
        {value == null && <option value="">— Tabelle wählen —</option>}
        {tables.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} · {SOURCE_BADGE[t.source]}
          </option>
        ))}
      </select>
    </label>
  );
}
