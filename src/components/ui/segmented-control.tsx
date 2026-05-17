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
        'inline-flex rounded-md overflow-hidden border border-hairline-strong',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {name && <input type="hidden" name={name} value={selected} readOnly />}
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => pick(opt.value)}
          aria-pressed={selected === opt.value}
          className={cn(
            'px-3 py-2 text-sm font-medium transition-colors',
            i > 0 && 'border-l border-hairline-strong',
            selected === opt.value
              ? 'bg-ink text-paper'
              : 'bg-transparent text-ink-2 hover:bg-paper-2 hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
