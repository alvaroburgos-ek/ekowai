import { cn } from '@/lib/utils';
import { Info, CheckCircle2, AlertCircle } from 'lucide-react';

export function Alert({
  className,
  variant = 'info',
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'info' | 'success' | 'error' }) {
  const Icon = variant === 'success' ? CheckCircle2 : variant === 'error' ? AlertCircle : Info;
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl px-4 py-3 text-sm leading-relaxed',
        variant === 'info' && 'bg-accent-soft/60 text-ink-2',
        variant === 'success' && 'bg-success-soft/70 text-success',
        variant === 'error' && 'bg-error-soft/70 text-error',
        className,
      )}
      {...rest}
    >
      <Icon className="size-4 mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
}
