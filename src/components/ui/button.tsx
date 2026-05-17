import { cn } from '@/lib/utils';

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'ghost' | 'outline';
    size?: 'sm' | 'md';
  },
) {
  const { className, variant = 'primary', size = 'md', style, ...rest } = props;

  return (
    <button
      style={style}
      className={cn(
        'inline-flex items-center justify-center font-semibold tracking-[0.02em] transition-opacity rounded-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eko-green focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-5 py-2.5 text-sm',
        variant === 'primary' && 'bg-ink text-paper hover:bg-ink-2 border-0',
        variant === 'outline' &&
          'bg-transparent text-ink hover:bg-paper-2 border border-hairline-strong',
        variant === 'ghost' &&
          'bg-transparent text-ink-2 hover:text-ink hover:bg-paper-2 border border-transparent',
        className,
      )}
      {...rest}
    />
  );
}
