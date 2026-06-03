'use client';

import { useMemo } from 'react';
import {
  SURFACE_TYPE_OPTIONS,
  SURFACE_TYPE_PROFILES,
  asSurfaceTypeId,
  isDefaultForType,
  type SurfaceInventoryRow,
  type SurfaceTypeId,
} from '@/lib/eval/surface-types';
import { useJsonTableCarrier, freshRowId } from './use-json-table-carrier';

/**
 * Surface inventory editor for A138-07 `surface_inventory` (json).
 *
 * Per-row schema:
 *   { id, label, surface_type, area_m2, c_i, c_s }
 *
 * c_i is the design-event Abflussbeiwert per Tab. 9 (used by Gl. 2 to
 * compute A_C). c_s is the flood-event Abflussbeiwert from the same
 * table (used by Gl. 10 to compute V_Rück). Both live in this single
 * carrier so the engineer sources them together from one Tab. 9 row.
 *
 * Tab. 9 derive-and-confirm: changing the surface type writes the
 * type's default C_i / C_s into the row's cells when the cells are
 * empty OR currently match the previous type's defaults (i.e. the
 * engineer hasn't customised). A small "← Tab. 9" badge marks values
 * still equal to the current type's default; a customised value
 * suppresses the badge. No Tab. 9 content/wording is rendered — only
 * the citation reference.
 */

/** Re-exported under the editor's historical name so existing imports
 *  (snapshots, tests) keep working. Definition lives in surface-types.ts
 *  alongside the aggregator's carrier type to avoid a UI→engine cycle. */
export type SurfaceRow = SurfaceInventoryRow;

type Props = {
  fieldId: string;
};

function newRow(): SurfaceRow {
  const defaultType: SurfaceTypeId = 'dach';
  const profile = SURFACE_TYPE_PROFILES[defaultType];
  return {
    id: freshRowId(),
    label: '',
    surface_type: defaultType,
    area_m2: null,
    // Pre-seed defaults so the engineer can validate-and-confirm
    // rather than re-type the canonical values for every row.
    c_i: profile.C_i_default,
    c_s: profile.C_s_default,
  };
}

function readRow(raw: unknown): SurfaceRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SurfaceRow> & { surface_type?: unknown };
  return {
    id: typeof r.id === 'string' && r.id.length > 0 ? r.id : freshRowId(),
    label: typeof r.label === 'string' ? r.label : '',
    surface_type: asSurfaceTypeId(r.surface_type),
    area_m2: typeof r.area_m2 === 'number' && Number.isFinite(r.area_m2) ? r.area_m2 : null,
    c_i: typeof r.c_i === 'number' && Number.isFinite(r.c_i) ? r.c_i : null,
    c_s: typeof r.c_s === 'number' && Number.isFinite(r.c_s) ? r.c_s : null,
  };
}

export function SurfaceInventoryEditor({ fieldId }: Props) {
  const { rows, addRow, updateRow, replaceRow, removeRow } =
    useJsonTableCarrier<SurfaceRow>({
      fieldId,
      newRow,
      readRow,
    });

  function changeSurfaceType(row: SurfaceRow, nextType: SurfaceTypeId) {
    if (row.surface_type === nextType) return;
    const prevDefaults = isDefaultForType(row.surface_type, row.c_i, row.c_s);
    const nextProfile = SURFACE_TYPE_PROFILES[nextType];
    // Derive-and-confirm semantics: refresh c_i / c_s ONLY when the
    // current value matches the previous type's default (engineer
    // hasn't customised) OR is empty. Any custom override survives.
    const c_i =
      row.c_i == null || prevDefaults.c_i ? nextProfile.C_i_default : row.c_i;
    const c_s =
      row.c_s == null || prevDefaults.c_s ? nextProfile.C_s_default : row.c_s;
    replaceRow(row.id, { ...row, surface_type: nextType, c_i, c_s });
  }

  const totals = useMemo(() => {
    let area = 0;
    let complete = 0;
    let A_C_preview = 0;
    for (const r of rows) {
      if (typeof r.area_m2 === 'number' && Number.isFinite(r.area_m2)) area += r.area_m2;
      if (r.area_m2 != null && r.c_i != null && r.c_s != null) complete++;
      if (r.area_m2 != null && r.c_i != null) A_C_preview += r.area_m2 * r.c_i;
    }
    return { area, complete, total: rows.length, A_C_preview };
  }, [rows]);

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
          onClick={() => addRow()}
          className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink"
        >
          + Zeile hinzufügen
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-subtext italic">
          Keine Flächen erfasst. Pro Oberflächentyp eine Zeile mit Fläche und Abflussbeiwerten C_i (Bemessungsregen) und C_s (Flutereignis) eingeben.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
              {rows.map((r) => {
                const profile = SURFACE_TYPE_PROFILES[r.surface_type];
                const matches = isDefaultForType(r.surface_type, r.c_i, r.c_s);
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
                        onChange={(e) =>
                          changeSurfaceType(r, asSurfaceTypeId(e.target.value))
                        }
                        className="rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                      >
                        {SURFACE_TYPE_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">
                        {profile.paved ? 'befestigt' : 'nicht befestigt'} · {profile.clauseRef}
                      </div>
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
                    <CoefficientCell
                      value={r.c_i}
                      onChange={(v) => updateRow(r.id, { c_i: v })}
                      atDefault={matches.c_i && profile.C_i_default != null}
                    />
                    <CoefficientCell
                      value={r.c_s}
                      onChange={(v) => updateRow(r.id, { c_s: v })}
                      atDefault={matches.c_s && profile.C_s_default != null}
                    />
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

/**
 * Coefficient input + a small "← Tab. 9" badge below it when the value
 * is still at the surface-type's default. The badge is the citation
 * affordance — no table content is reproduced. When the engineer
 * overrides the value the badge disappears, signalling the override.
 */
function CoefficientCell({
  value,
  onChange,
  atDefault,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  atDefault: boolean;
}) {
  return (
    <td className="py-1.5 pr-2">
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        max="1"
        value={value == null ? '' : value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : Number(v));
        }}
        className="block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink text-right tabular-nums focus:border-accent focus:outline-none"
      />
      {atDefault && (
        <div
          className="text-[10px] uppercase tracking-[0.18em] text-accent mt-0.5 text-right"
          title="Wert entspricht dem Vorschlag nach Tab. 9 für den gewählten Oberflächentyp."
        >
          ← Tab. 9
        </div>
      )}
    </td>
  );
}

function formatNum(v: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v);
}
