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
  sameSymbolHints?: Array<{ worksheetCode: string; value: unknown }>;
  docs: Array<{ id: string; title: string }>;
};

export function DynamicField({ field, locale, sameSymbolHints, docs }: Props) {
  const value = useWorksheetStore((s) => s.values[field.id]);
  const source = useWorksheetStore((s) => s.sources[field.id] ?? null);
  const setField = useWorksheetStore((s) => s.setField);
  const instanceId = useWorksheetStore((s) => s.instanceId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputId = useId();

  const label = locale === 'de' ? field.labelDe : field.labelEn ?? field.labelDe;
  // SourceBadge expects InputSource ({ docId } | { label }) — adapt from our store shape
  const badgeSource = source ? { docId: source.docId } : undefined;
  const sourceDoc = source ? docs.find((d) => d.id === source.docId) : undefined;

  return (
    <div className="space-y-1.5" data-symbol={field.symbol}>
      {/* Label + clause + unit */}
      <div>
        <label htmlFor={inputId} className="text-sm font-medium text-ink leading-snug block">
          {label}
          {field.isRequired && <span className="ml-1 text-accent-2">*</span>}
        </label>
        <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5 flex items-baseline gap-1.5 flex-wrap">
          {field.clauseReference && <span>{field.clauseReference}</span>}
          {field.unit && <span className="text-ink-2">{field.unit}</span>}
          {field.verificationStatus !== 'engineer_verified' && (
            <span className="text-accent-2">imported_unverified</span>
          )}
        </div>
      </div>

      {/* Input control by data_type */}
      {renderInput(field, value, inputId, setField)}

      {/* Same-symbol hint (cross-worksheet) */}
      {sameSymbolHints && sameSymbolHints.length > 0 && (
        <div className="text-xs text-subtext">
          Bereits in {sameSymbolHints.map((h) => h.worksheetCode).join(', ')}:
          {' '}
          {sameSymbolHints.map((h) => String(h.value)).join(', ')}{' '}
          <button
            type="button"
            className="underline text-accent-2"
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
      {/* CitationPicker.calcId requires string — only mount when instanceId is available.
          Plan 5 will retarget calcId to project_parameter_id; for now instanceId acts as
          a stand-in so the picker can attach sources. */}
      {instanceId && (
        <CitationPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          calcId={instanceId}
          symbol={field.symbol}
          docs={[]}
        />
      )}
    </div>
  );
}

function renderInput(
  field: FieldDef,
  current: ReturnType<typeof useWorksheetStore.getState>['values'][string] | undefined,
  inputId: string,
  _setField: unknown,
) {
  // _setField is unused — we call getState().setField directly so the store's
  // FieldValue discriminated union resolves correctly at call sites.
  const setFieldReal = useWorksheetStore.getState().setField;

  switch (field.dataType) {
    case 'number': {
      const v = current?.type === 'number' ? current.value : null;
      return (
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          value={v == null ? '' : v}
          onChange={(e) => {
            const raw = e.target.value;
            setFieldReal(field.id, {
              type: 'number',
              value: raw === '' ? null : Number(raw),
            });
          }}
          className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink tabular-nums focus:border-accent focus:outline-none focus:ring-0"
        />
      );
    }
    case 'text': {
      const v = current?.type === 'text' ? current.value : null;
      const maxLength = field.validationRules?.maxLength;
      const useTextarea = (maxLength ?? 0) > 200;
      return useTextarea ? (
        <textarea
          id={inputId}
          value={v ?? ''}
          onChange={(e) => setFieldReal(field.id, { type: 'text', value: e.target.value || null })}
          rows={4}
          className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
        />
      ) : (
        <input
          id={inputId}
          type="text"
          value={v ?? ''}
          onChange={(e) => setFieldReal(field.id, { type: 'text', value: e.target.value || null })}
          className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
        />
      );
    }
    case 'enum': {
      const v = current?.type === 'enum' ? current.value : null;
      const options = field.enumValues ?? [];
      if (options.length <= 4) {
        return (
          <SegmentedControl
            value={v ?? options[0]?.value ?? ''}
            onChange={(val) => setFieldReal(field.id, { type: 'enum', value: val })}
            options={options.map((o) => ({
              value: o.value,
              label: o.label_de ?? o.label_en ?? o.value,
            }))}
          />
        );
      }
      return (
        <select
          id={inputId}
          value={v ?? ''}
          onChange={(e) => setFieldReal(field.id, { type: 'enum', value: e.target.value || null })}
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
    }
    case 'date': {
      const v = current?.type === 'date' ? current.value : null;
      return (
        <input
          id={inputId}
          type="date"
          value={v ?? ''}
          onChange={(e) => setFieldReal(field.id, { type: 'date', value: e.target.value || null })}
          className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
        />
      );
    }
    case 'boolean': {
      const v = current?.type === 'boolean' ? current.value : null;
      return (
        <SegmentedControl
          value={v === true ? 'true' : v === false ? 'false' : ''}
          onChange={(val) => setFieldReal(field.id, { type: 'boolean', value: val === 'true' })}
          options={[
            { value: 'true', label: 'Ja' },
            { value: 'false', label: 'Nein' },
          ]}
        />
      );
    }
    case 'json': {
      return (
        <div className="rounded-md border border-hairline-strong bg-paper-2/40 px-3 py-2 text-sm text-subtext italic">
          Mehrzeilige Eingabe — Phase 2
        </div>
      );
    }
  }
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
