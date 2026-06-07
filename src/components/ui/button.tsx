import { cn } from '@/lib/utils';

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'icon' | 'icon-sm';
  },
) {
  const { className, variant = 'primary', size = 'md', style, ...rest } = props;

  return (
    <button
      style={style}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold tracking-[0.01em] transition-all rounded-full whitespace-nowrap',
        '[&>svg]:size-4 [&>svg]:shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eko-green focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' && 'px-3.5 py-1.5 text-xs',
        size === 'md' && 'px-5 py-2.5 text-sm',
        // Square icon-only buttons — for compact mobile actions.
        size === 'icon' && 'size-10 p-0 text-sm',
        size === 'icon-sm' && 'size-8 p-0 text-xs',
        variant === 'primary' && 'bg-ink text-paper hover:bg-ink-2 shadow-soft hover:shadow-soft-hover',
        variant === 'outline' &&
          'bg-paper text-ink hover:bg-paper-2 border border-hairline-strong shadow-soft',
        variant === 'ghost' &&
          'bg-transparent text-ink-2 hover:text-ink hover:bg-paper-2 border border-transparent',
        className,
      )}
      {...rest}
    />
  );
}
