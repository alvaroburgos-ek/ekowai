'use client';

import { useState } from 'react';
import { useCalculatorStore } from '@/lib/state/calculator-store';
import type { InputField as FieldDef } from '@/lib/engine';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SourceBadge } from '@/components/documents/source-badge';
import { CitationPicker } from '@/components/documents/citation-picker';

export function InputField({ field, locale }: { field: FieldDef; locale: 'de' | 'en' }) {
  const value = useCalculatorStore((s) => s.inputs[field.id]);
  const setField = useCalculatorStore((s) => s.setField);
  const derivedSource = useCalculatorStore((s) => s.derivedSources[field.id]);
  const calcId = useCalculatorStore((s) => s.calcId);
  const inputSource = useCalculatorStore((s) => s.inputSources[field.id]);
  const docs = useCalculatorStore((s) => s.docs);
  const [pickerOpen, setPickerOpen] = useState(false);

  const label = locale === 'de' ? field.labelDe : field.labelEn;
  const isDerived = !!field.derivedFrom;
  const derivedReady = !!derivedSource;

  const sourceDoc =
    inputSource && 'docId' in inputSource
      ? docs.find((d) => d.id === inputSource.docId)
      : undefined;

  return (
    <div className="space-y-1.5">
      {/* Label + citation */}
      <div>
        <label htmlFor={field.id} className="text-sm font-medium text-ink leading-snug block">
          {label}
        </label>
        <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5 flex items-baseline gap-1.5 flex-wrap">
          <span>{field.citation}</span>
          {field.unit && (
            <span className="text-ink-2">{field.unit}</span>
          )}
          {field.derivedFrom && (
            <span className="text-accent-2">
              ← {derivedReady
                ? `${derivedSource!.worksheetId} · ${derivedSource!.calcName}`
                : `${field.derivedFrom.worksheetId} (noch keine Berechnung)`}
            </span>
          )}
        </div>
      </div>

      {/* Input control */}
      {field.type === 'select' ? (
        <SegmentedControl
          value={typeof value === 'string' ? value : (field.options?.[0]?.value ?? '')}
          onChange={(val) => setField(field.id, val)}
          disabled={isDerived}
          options={(field.options ?? []).map((o) => ({
            value: o.value,
            label: locale === 'de' ? o.labelDe : o.labelEn,
          }))}
        />
      ) : field.type === 'boolean' ? (
        <input
          id={field.id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => setField(field.id, e.target.checked)}
          disabled={isDerived}
          className="h-4 w-4 accent-accent-2 disabled:opacity-50"
        />
      ) : (
        <input
          id={field.id}
          type={field.type === 'number' ? 'number' : 'text'}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (field.type === 'number') {
              setField(field.id, raw === '' ? null : Number(raw));
            } else {
              setField(field.id, raw);
            }
          }}
          readOnly={isDerived}
          placeholder={isDerived && !derivedReady ? `→ ${field.derivedFrom!.worksheetId}` : undefined}
          className={`block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink tabular-nums focus:border-accent focus:outline-none focus:ring-0 transition-colors ${
            isDerived ? 'cursor-not-allowed bg-paper-2/40 text-subtext' : ''
          }`}
        />
      )}

      {/* Source badge — citation trigger */}
      {calcId && !isDerived && (
        <SourceBadge
          source={inputSource}
          docTitle={sourceDoc?.title}
          onClick={() => setPickerOpen(true)}
        />
      )}

      {/* Citation picker modal */}
      {calcId && (
        <CitationPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          calcId={calcId}
          symbol={field.id}
          docs={docs}
        />
      )}
    </div>
  );
}
