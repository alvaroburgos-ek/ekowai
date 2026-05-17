import { cn } from '@/lib/utils';

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <div className="relative">
      <select
        className={cn(
          'block w-full appearance-none rounded-none border-0 border-b border-hairline-strong bg-transparent',
          'px-1 py-2 pr-7 text-sm text-ink',
          'focus:border-accent focus:outline-none focus:ring-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'font-body',
          className,
        )}
        {...rest}
      />
      {/* Custom chevron — matches editorial angular style */}
      <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-subtext">
        <svg width="11" height="7" viewBox="0 0 11 7" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M1 1L5.5 6L10 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" />
        </svg>
      </span>
    </div>
  );
}
