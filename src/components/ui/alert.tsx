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
        'border-l-2 px-4 py-3 text-sm leading-relaxed bg-paper-2/60',
        variant === 'info' && 'border-accent text-ink-2',
        variant === 'success' && 'border-success text-success bg-success-soft/40',
        variant === 'error' && 'border-error text-error bg-error-soft/50',
        className,
      )}
      {...rest}
    />
  );
}
