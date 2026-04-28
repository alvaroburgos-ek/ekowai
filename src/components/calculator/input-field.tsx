'use client';

import { useCalculatorStore } from '@/lib/state/calculator-store';
import type { InputField as FieldDef } from '@/lib/engine';

export function InputField({ field, locale }: { field: FieldDef; locale: 'de' | 'en' }) {
  const value = useCalculatorStore((s) => s.inputs[field.id]);
  const setField = useCalculatorStore((s) => s.setField);
  const derivedSource = useCalculatorStore((s) => s.derivedSources[field.id]);
  const label = locale === 'de' ? field.labelDe : field.labelEn;
  const isDerived = !!field.derivedFrom;
  const derivedReady = !!derivedSource;

  const derivedAnnotation = field.derivedFrom ? (
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-2">
      ←{' '}
      {derivedReady
        ? `${derivedSource!.worksheetId} · ${derivedSource!.calcName}`
        : `${field.derivedFrom.worksheetId} (noch keine Berechnung)`}
    </span>
  ) : null;

  return (
    <div className="grid grid-cols-12 gap-4 items-baseline">
      {/* Left: label + citation */}
      <div className="col-span-5 space-y-1">
        <label htmlFor={field.id} className="font-display text-[15px] text-ink leading-tight block">
          {label}
        </label>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtext block">
          {field.citation}
          {field.unit && (
            <>
              <span className="mx-1.5 text-hairline-strong">/</span>
              <span className="text-ink-2">{field.unit}</span>
            </>
          )}
        </span>
        {derivedAnnotation}
      </div>

      {/* Right: input */}
      <div className="col-span-7">
        {field.type === 'select' ? (
          <select
            id={field.id}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => setField(field.id, e.target.value)}
            disabled={isDerived}
            className={`block w-full rounded-none border-0 border-b border-hairline-strong bg-transparent px-1 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0 font-body ${
              isDerived ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <option value="">—</option>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {locale === 'de' ? o.labelDe : o.labelEn}
              </option>
            ))}
          </select>
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
            className={`block w-full rounded-none border-0 border-b border-hairline-strong bg-transparent px-1 py-2 text-base text-ink font-mono tabular-nums focus:border-accent focus:outline-none focus:ring-0 ${
              isDerived ? 'cursor-not-allowed bg-paper-2/40' : ''
            }`}
          />
        )}
      </div>
    </div>
  );
}
