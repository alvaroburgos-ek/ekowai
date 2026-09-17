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
 * text input), `reference-stale` (stored id not among the rows — placeholder
 * shown, id left in the store, hint names rows[0] because that is what the
 * engine's resolveSelectedTable falls back to), `reference-unconfigured` (reference widget
 * without a usable ui_config ⇒ visible notice + today's dynamic input, never
 * silent). The notices are `<span class=block>` (phrasing content — they sit
 * inside the `<label>`) and describe the select via aria-describedby.
 */
import { useId } from 'react';
import { resolveReferenceConfig, resolveReferenceRows } from '@/lib/eval/reference-configs';
import type { WidgetContext, WorksheetFormField } from './widgets';

export function ReferenceField({ field, ctx }: { field: WorksheetFormField; ctx: WidgetContext }) {
  const noticeId = useId();
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
  // Stored id no longer among the rows (carrier row deleted/renamed upstream):
  // select the placeholder, say so, and leave the stored id alone — the store
  // is only written by the engineer's own choice, never by a render.
  // The hint must tell the truth about what computes meanwhile: every engine
  // reader resolves a stale/unset ref to the carrier's FIRST row (the
  // resolveSelectedTable rule — `tables[0]`), so the hint names rows[0] by its
  // label. Generic: the fallback label comes from the resolved rows, never from
  // carrier-specific code.
  const stale = current != null && !rows.some((r) => r.id === current);
  const fallbackLabel = rows[0]?.label;
  const staleHint = stale
    ? `Verweis „${current}“ nicht gefunden — die Berechnung verwendet ${readOnly ? '' : 'bis zur Neuauswahl '}„${fallbackLabel}“.${readOnly ? '' : ' Bitte neu wählen.'}`
    : null;
  const notice = empty || stale ? noticeId : undefined;
  return (
    <label className="block space-y-1" data-testid="reference-field" data-symbol={field.symbol}>
      <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">{title}</span>
      <select
        value={stale ? '' : current ?? ''}
        disabled={readOnly || empty}
        aria-label={ui.aria_label ?? title}
        aria-describedby={notice}
        data-testid="reference-select"
        onChange={(e) => {
          if (readOnly) return;
          // Stored shape unchanged: a row-id string under the field's own data_type tag.
          // The tag matters because the server readers of `rainfall_table_ref` are
          // TEXT-only: saveWorksheet's basin-governing materialize and its A138-17
          // Mulde path (src/lib/actions/worksheet.ts) take the save-batch value only
          // when `savedRef?.type === 'text'`, else fall back to the persisted
          // project_parameters.value_text; snapshots/payload.ts reads value_text ??
          // value_enum; evaluate-for-report.ts reads the column matching the field's
          // data_type. A `text` field therefore MUST store { type: 'text' } — an
          // enum-tagged write would be ignored by the save-batch reader.
          ctx.setField(field.id, { type: field.dataType === 'enum' ? 'enum' : 'text', value: e.target.value });
        }}
        className={`block w-full rounded border border-hairline-strong px-2 py-1.5 text-sm text-ink focus:outline-none ${readOnly ? 'bg-paper-2 cursor-default' : 'bg-transparent focus:border-accent'}`}
      >
        {(current == null || stale) && <option value="">{ui.empty_label ?? '— wählen —'}</option>}
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {r.badge ? `${r.label} · ${r.badge}` : r.label}
          </option>
        ))}
      </select>
      {empty && (
        <span id={noticeId} data-testid="reference-empty" className="block text-[11px] text-subtext">
          Keine Einträge in „{ui.carrier_symbol}“ — zuerst im vorgelagerten Arbeitsblatt erfassen.
        </span>
      )}
      {!empty && stale && (
        <span id={noticeId} data-testid="reference-stale" className="block text-[11px] text-warning">
          {staleHint}
        </span>
      )}
    </label>
  );
}
