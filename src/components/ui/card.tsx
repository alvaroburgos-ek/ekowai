import { cn } from '@/lib/utils';

/**
 * Editorial card — hairline border, no shadow. Bg is paper-2 (warmer) so it
 * subtly lifts off the paper background without the SaaS shadow look.
 */
export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-none border border-hairline bg-paper-2/40 backdrop-blur-[1px]',
        className,
      )}
      {...rest}
    />
  );
}
