import { cn } from '@/lib/utils';

/**
 * Friendly card — rounded corners, soft shadow, no harsh hairlines.
 * Background is a faint paper tone so it lifts gently off the page.
 */
export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-hairline bg-paper shadow-soft transition-shadow',
        className,
      )}
      {...rest}
    />
  );
}
