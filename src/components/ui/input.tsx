import { cn } from '@/lib/utils';

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { className, ...rest } = props;
  return (
    <input
      className={cn(
        'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm',
        'focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  );
}
