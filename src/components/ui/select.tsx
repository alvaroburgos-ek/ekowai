import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <div className="relative">
      <select
        className={cn(
          'block w-full appearance-none rounded-xl border border-hairline-strong bg-paper',
          'px-3.5 py-2.5 pr-9 text-sm text-ink',
          'focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft transition-all',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'font-body',
          className,
        )}
        {...rest}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-subtext"
      />
    </div>
  );
}
