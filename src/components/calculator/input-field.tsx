'use client';

import { useCalculatorStore } from '@/lib/state/calculator-store';
import type { InputField as FieldDef } from '@/lib/engine';

export function InputField({ field, locale }: { field: FieldDef; locale: 'de' | 'en' }) {
  const value = useCalculatorStore((s) => s.inputs[field.id]);
  const setField = useCalculatorStore((s) => s.setField);
  const label = locale === 'de' ? field.labelDe : field.labelEn;

  if (field.type === 'select') {
    return (
      <label className="block">
        <span className="text-sm text-slate-700">
          {label}
          {field.unit && <span className="text-slate-500"> ({field.unit})</span>}
        </span>
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setField(field.id, e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm text-slate-700"
        >
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {locale === 'de' ? o.labelDe : o.labelEn}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">{field.citation}</span>
      </label>
    );
  }

  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => setField(field.id, e.target.checked)}
        />
        {label}
        <span className="ml-auto text-xs text-slate-500">{field.citation}</span>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm text-slate-700">
        {label}
        {field.unit && <span className="text-slate-500"> ({field.unit})</span>}
      </span>
      <input
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
        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm text-slate-700"
      />
      <span className="text-xs text-slate-500">{field.citation}</span>
    </label>
  );
}
