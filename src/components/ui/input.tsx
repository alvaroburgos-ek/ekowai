import { cn } from '@/lib/utils';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <div className="input-wrap">
      <input
        className={cn(
          'block w-full rounded-md border border-hairline-strong bg-transparent',
          'px-3 py-2 text-sm text-ink placeholder:text-subtext/60',
          'focus:border-accent focus:outline-none focus:ring-0 transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'font-body',
          className,
        )}
        {...rest}
      />
    </div>
  );
}
