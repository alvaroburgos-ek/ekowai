import { cn } from '@/lib/utils';

export function Alert({
  className,
  variant = 'info',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'info' | 'success' | 'error' }) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border p-3 text-sm',
        variant === 'info' && 'border-slate-200 bg-slate-50 text-slate-700',
        variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        variant === 'error' && 'border-red-200 bg-red-50 text-red-800',
        className,
      )}
      {...rest}
    />
  );
}
