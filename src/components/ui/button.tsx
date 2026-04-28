import { cn } from '@/lib/utils';

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'ghost';
  },
) {
  const { className, variant = 'primary', ...rest } = props;
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition',
        variant === 'primary' && 'bg-slate-900 text-white hover:bg-slate-800',
        variant === 'ghost' && 'text-slate-700 hover:bg-slate-100',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      {...rest}
    />
  );
}
