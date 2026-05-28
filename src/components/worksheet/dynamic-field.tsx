'use client';
import { useState, useId } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SourceBadge } from '@/components/documents/source-badge';
import { CitationPicker } from '@/components/documents/citation-picker';

type FieldDef = {
  id: string;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  unit: string | null;
  dataType: 'number' | 'text' | 'enum' | 'date' | 'boolean' | 'json';
  isRequired: boolean;
  enumValues:
    | Array<{ value: string; label_de: string | null; label_en: string | null }>
    | null;
  validationRules: { min?: number; max?: number; maxLength?: number; raw?: string } | null;
  clauseReference: string | null;
  verificationStatus: string;
};

type Props = {
  field: FieldDef;
  locale: 'de' | 'en';
  projectId: string;
  sameSymbolHints?: Array<{ worksheetCode: string; value: unknown }>;
  docs: Array<{ id: string; title: string; citationLabel: string }>;
  /** True if this field is the output of an equation (auto-computed sub-total or total). */
  isComputed?: boolean;
};

export function DynamicField({ field, locale, projectId, sameSymbolHints, docs, isComputed = false }: Props) {
  const value = useWorksheetStore((s) => s.values[field.id]);
  const source = useWorksheetStore((s) => s.sources[field.id] ?? null);
  const setField = useWorksheetStore((s) => s.setField);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputId = useId();

  const label = locale === 'de' ? field.labelDe : field.labelEn ?? field.labelDe;
  // SourceBadge expects InputSource ({ docId } | { label }) — adapt from our store shape
  const badgeSource = source ? { docId: source.docId } : undefined;
  const sourceDoc = source ? docs.find((d) => d.id === source.docId) : undefined;

  const required = field.isRequired || undefined;
  const isSubTotal = field.symbol.endsWith('_total');
  const isCurrency = field.unit === 'EUR';

  return (
    <div
      className={
        isSubTotal
          ? 'space-y-1.5 border-t border-hairline-strong pt-3 mt-2 -mx-2 px-2 pb-2 rounded bg-paper-2/40'
          : 'space-y-1.5'
      }
      data-symbol={field.symbol}
    >
      {/* Label + clause + unit */}
      <div>
        <label
          htmlFor={inputId}
          className={`text-sm ${isSubTotal ? 'font-semibold' : 'font-medium'} text-ink leading-snug block`}
        >
          {isSubTotal && <span className="mr-1.5">Σ</span>}
          {label}
          {field.isRequired && field.dataType !== 'json' && <span className="ml-1 text-accent-2">*</span>}
        </label>
        <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5 flex items-baseline gap-1.5 flex-wrap">
          {field.clauseReference && <span>{field.clauseReference}</span>}
          {field.unit && !isCurrency && <span className="text-ink-2">{field.unit}</span>}
          {field.verificationStatus !== 'engineer_verified' && (
            <span className="text-accent-2">imported_unverified</span>
          )}
        </div>
      </div>

      {/* Input control by data_type */}
      {field.dataType === 'number' && (() => {
        const v = value?.type === 'number' ? value.value : null;
        const inputEl = (
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            value={v == null ? '' : v}
            required={field.isRequired}
            aria-required={required}
            readOnly={isComputed}
            tabIndex={isComputed ? -1 : undefined}
            aria-readonly={isComputed || undefined}
            onChange={(e) => {
              if (isComputed) return;
              const raw = e.target.value;
              setField(field.id, {
                type: 'number',
                value: raw === '' ? null : Number(raw),
              });
            }}
            className={`block w-full rounded-md border border-hairline-strong py-2 text-sm tabular-nums focus:outline-none focus:ring-0 ${isCurrency ? 'pl-8 pr-3' : 'px-3'} ${isComputed ? 'bg-paper-2 text-ink font-semibold cursor-default focus:border-hairline-strong' : 'bg-transparent text-ink focus:border-accent'}`}
          />
        );
        return isCurrency ? (
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext pointer-events-none select-none"
            >
              €
            </span>
            {inputEl}
          </div>
        ) : (
          inputEl
        );
      })()}

      {field.dataType === 'text' && (() => {
        const v = value?.type === 'text' ? value.value : null;
        const maxLength = field.validationRules?.maxLength;
        const useTextarea = (maxLength ?? 0) > 200;
        return useTextarea ? (
          <textarea
            id={inputId}
            value={v ?? ''}
            required={field.isRequired}
            aria-required={required}
            onChange={(e) => setField(field.id, { type: 'text', value: e.target.value || null })}
            rows={4}
            className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
          />
        ) : (
          <input
            id={inputId}
            type="text"
            value={v ?? ''}
            required={field.isRequired}
            aria-required={required}
            onChange={(e) => setField(field.id, { type: 'text', value: e.target.value || null })}
            className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
          />
        );
      })()}

      {field.dataType === 'enum' && (() => {
        const v = value?.type === 'enum' ? value.value : null;
        const options = field.enumValues ?? [];
        if (options.length <= 4) {
          return (
            <div role="radiogroup" aria-labelledby={inputId} aria-required={required}>
              <SegmentedControl
                value={v ?? options[0]?.value ?? ''}
                onChange={(val) => setField(field.id, { type: 'enum', value: val })}
                options={options.map((o) => ({
                  value: o.value,
                  label: o.label_de ?? o.label_en ?? o.value,
                }))}
              />
            </div>
          );
        }
        return (
          <select
            id={inputId}
            value={v ?? ''}
            required={field.isRequired}
            onChange={(e) => setField(field.id, { type: 'enum', value: e.target.value || null })}
            className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
          >
            <option value="">—</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label_de ?? o.label_en ?? o.value}
              </option>
            ))}
          </select>
        );
      })()}

      {field.dataType === 'date' && (() => {
        const v = value?.type === 'date' ? value.value : null;
        return (
          <input
            id={inputId}
            type="date"
            value={v ?? ''}
            required={field.isRequired}
            aria-required={required}
            onChange={(e) => setField(field.id, { type: 'date', value: e.target.value || null })}
            className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
          />
        );
      })()}

      {field.dataType === 'boolean' && (() => {
        const v = value?.type === 'boolean' ? value.value : null;
        return (
          <div role="radiogroup" aria-labelledby={inputId} aria-required={required}>
            <SegmentedControl
              value={v === true ? 'true' : v === false ? 'false' : ''}
              onChange={(val) => setField(field.id, { type: 'boolean', value: val === 'true' })}
              options={[
                { value: 'true', label: 'Ja' },
                { value: 'false', label: 'Nein' },
              ]}
            />
          </div>
        );
      })()}

      {field.dataType === 'json' && (
        <div
          aria-disabled="true"
          className="rounded-md border border-hairline-strong bg-paper-2/40 px-3 py-2 text-sm text-subtext italic cursor-not-allowed"
          title="Mehrzeilige Eingabe — Phase 2"
        >
          Mehrzeilige Eingabe — Phase 2
        </div>
      )}

      {/* Same-symbol hint (cross-worksheet) */}
      {sameSymbolHints && sameSymbolHints.length > 0 && (
        <div className="text-xs text-subtext">
          Bereits in {sameSymbolHints.map((h) => h.worksheetCode).join(', ')}:
          {' '}
          {sameSymbolHints.map((h) => String(h.value)).join(', ')}{' '}
          <button
            type="button"
            className="text-xs text-accent-2 px-1.5 py-0.5 rounded hover:bg-accent-2/10 transition-colors"
            onClick={() => copyFirstHint(field, sameSymbolHints[0].value)}
          >
            Übernehmen
          </button>
        </div>
      )}

      {/* Source badge */}
      <SourceBadge
        source={badgeSource}
        docTitle={sourceDoc?.title}
        onClick={() => setPickerOpen(true)}
      />
      <CitationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        projectId={projectId}
        fieldId={field.id}
        symbol={field.symbol}
        docs={docs}
      />
    </div>
  );
}

function copyFirstHint(
  field: FieldDef,
  value: unknown,
): void {
  const setFieldReal = useWorksheetStore.getState().setField;
  switch (field.dataType) {
    case 'number':
      setFieldReal(field.id, { type: 'number', value: value == null ? null : Number(value) });
      break;
    case 'text':
      setFieldReal(field.id, { type: 'text', value: value == null ? null : String(value) });
      break;
    case 'enum':
      setFieldReal(field.id, { type: 'enum', value: value == null ? null : String(value) });
      break;
    case 'date':
      setFieldReal(field.id, { type: 'date', value: value == null ? null : String(value) });
      break;
    case 'boolean':
      setFieldReal(field.id, { type: 'boolean', value: Boolean(value) });
      break;
    case 'json':
      setFieldReal(field.id, { type: 'json', value });
      break;
  }
}
