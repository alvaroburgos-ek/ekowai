'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption {
  value: string;
  label: string;
}

interface Props {
  options: SegmentedOption[];
  /** Controlled value */
  value?: string;
  /** Initial value for uncontrolled usage (e.g. inside a <form>) */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Renders a hidden <input name="…"> so the value is submitted with a form */
  name?: string;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  name,
  disabled,
  className,
}: Props) {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value ?? '',
  );
  const selected = controlledValue !== undefined ? controlledValue : internalValue;

  function pick(val: string) {
    if (disabled) return;
    if (controlledValue === undefined) setInternalValue(val);
    onChange?.(val);
  }

  return (
    <div
      className={cn(
        'inline-flex rounded-full bg-paper-2 p-1 border border-hairline',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {name && <input type="hidden" name={name} value={selected} readOnly />}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => pick(opt.value)}
          aria-pressed={selected === opt.value}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-full transition-all',
            selected === opt.value
              ? 'bg-paper text-ink shadow-soft'
              : 'bg-transparent text-subtext hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
