import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

type SelectSize = 'sm' | 'md';

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  /** sm = compact pill for inline controls; md = full form input (default). */
  size?: SelectSize;
  /** Match the select width to its content instead of stretching to fill. */
  inline?: boolean;
};

const SIZE_CLASSES: Record<SelectSize, string> = {
  sm: 'px-2.5 py-1 pr-7 text-[11px] rounded-lg',
  md: 'px-3.5 py-2.5 pr-9 text-sm rounded-xl',
};

const CHEVRON_CLASSES: Record<SelectSize, string> = {
  sm: 'right-2 size-3',
  md: 'right-3 size-4',
};

export function Select({
  className,
  size = 'md',
  inline = false,
  ...rest
}: Props) {
  return (
    <div className={cn('relative', inline ? 'inline-block' : 'block')}>
      <select
        className={cn(
          'appearance-none border border-hairline-strong bg-paper text-ink font-body',
          'focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft transition-all',
          'disabled:cursor-not-allowed disabled:opacity-50',
          inline ? 'inline-block w-auto max-w-full' : 'block w-full',
          SIZE_CLASSES[size],
          className,
        )}
        {...rest}
      />
      <ChevronDown
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-subtext',
          CHEVRON_CLASSES[size],
        )}
      />
    </div>
  );
}
