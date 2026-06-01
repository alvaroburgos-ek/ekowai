import { cn } from '@/lib/utils';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={cn(
        'block w-full rounded-xl border border-hairline-strong bg-paper',
        'px-3.5 py-2.5 text-sm text-ink placeholder:text-subtext/60',
        'focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft transition-all',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'font-body',
        className,
      )}
      {...rest}
    />
  );
}
