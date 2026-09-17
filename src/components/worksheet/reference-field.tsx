'use client';

/**
 * `reference` widget (Plan 2b, Task 6): a select over ANOTHER carrier's rows
 * that stores the chosen row ID — never an r_D(n) value, never a copied row.
 * Replaces RainfallTableSelector (deleted); `rainfall_table_ref` renders here
 * through REFERENCE_CONFIGS_FALLBACK while its `widget IS NULL`.
 *
 * Testids: `reference-field` [data-symbol] (wrapper — was the form's
 * `rainfall-table-ref-section` / `bottom-rainfall_table_ref` sections),
 * `reference-select`, `reference-empty` (carrier absent/empty — never a raw
 * text input), `reference-unconfigured` (reference widget without a usable
 * ui_config ⇒ visible notice + today's dynamic input, never silent).
 */
import { resolveReferenceConfig, resolveReferenceRows } from '@/lib/eval/reference-configs';
import type { WidgetContext, WorksheetFormField } from './widgets';

export function ReferenceField({ field, ctx }: { field: WorksheetFormField; ctx: WidgetContext }) {
  const ui = resolveReferenceConfig(field);
  if (!ui) {
    return (
      <div className="space-y-1">
        <p data-testid="reference-unconfigured" className="text-[11px] text-warning">
          Referenz nicht konfiguriert (ui_config fehlt)
        </p>
        {ctx.renderDynamic(field)}
      </div>
    );
  }
  const carrierField = ctx.fieldBySymbol.get(ui.carrier_symbol);
  const raw = carrierField ? ctx.values[carrierField.id] : undefined;
  const rows = resolveReferenceRows(ui, raw?.type === 'json' ? raw.value : undefined);
  const v = ctx.values[field.id];
  const current = (v?.type === 'text' || v?.type === 'enum') && typeof v.value === 'string' ? v.value : null;
  const title = ui.title ?? field.labelDe;
  const readOnly = ctx.readOnly;
  const empty = rows.length === 0;
  return (
    <label className="block space-y-1" data-testid="reference-field" data-symbol={field.symbol}>
      <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">{title}</span>
      <select
        value={current ?? ''}
        disabled={readOnly || empty}
        aria-label={ui.aria_label ?? title}
        data-testid="reference-select"
        onChange={(e) => {
          if (readOnly) return;
          // Stored shape unchanged: a row-id string under the field's own data_type tag
          // (engine / report / snapshot read `rainfall_table_ref` as text/enum).
          ctx.setField(field.id, { type: field.dataType === 'enum' ? 'enum' : 'text', value: e.target.value });
        }}
        className={`block w-full rounded border border-hairline-strong px-2 py-1.5 text-sm text-ink focus:outline-none ${readOnly ? 'bg-paper-2 cursor-default' : 'bg-transparent focus:border-accent'}`}
      >
        {current == null && <option value="">{ui.empty_label ?? '— wählen —'}</option>}
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {r.badge ? `${r.label} · ${r.badge}` : r.label}
          </option>
        ))}
      </select>
      {empty && (
        <p data-testid="reference-empty" className="text-[11px] text-subtext">
          Keine Einträge in „{ui.carrier_symbol}“ — zuerst im vorgelagerten Arbeitsblatt erfassen.
        </p>
      )}
    </label>
  );
}
