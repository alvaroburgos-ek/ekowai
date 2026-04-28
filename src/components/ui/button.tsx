import { cn } from '@/lib/utils';

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'ghost' | 'outline';
    size?: 'sm' | 'md';
  },
) {
  const { className, variant = 'primary', size = 'md', ...rest } = props;
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium tracking-wide transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-5 py-2.5 text-sm',
        variant === 'primary' && 'bg-ink text-paper hover:bg-ink-2 rounded-none border border-ink',
        variant === 'outline' &&
          'bg-transparent text-ink hover:bg-ink hover:text-paper rounded-none border border-ink',
        variant === 'ghost' &&
          'bg-transparent text-ink-2 hover:text-ink hover:bg-paper-2 rounded-none border border-transparent',
        className,
      )}
      {...rest}
    />
  );
}
