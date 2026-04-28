import { cn } from '@/lib/utils';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={cn(
        'block w-full rounded-none border-0 border-b border-hairline-strong bg-transparent',
        'px-1 py-2 text-sm text-ink placeholder:text-subtext/60',
        'focus:border-accent focus:outline-none focus:ring-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'font-body',
        className,
      )}
      {...rest}
    />
  );
}
