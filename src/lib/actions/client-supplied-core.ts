/**
 * Client-supplied flagging pure core (roadmap Stage 5 — AGB input-error
 * carve-out).
 *
 * Validation without any DB or session dependency, so the input contract is
 * unit-testable (mirrors the effort-core pure/DB split). The `'use server'`
 * module (`client-supplied.ts`) wraps this with auth + write-lock + persistence.
 */
import { z } from 'zod';

export const setClientSuppliedSchema = z.object({
  projectId: z.string().uuid(),
  fieldId: z.string().uuid(),
  /** true = Kundenangabe (value delivered by the client, not determined by
   * EKOWAI); false = clear the flag. */
  clientSupplied: z.boolean(),
});

export type SetClientSuppliedInput = z.infer<typeof setClientSuppliedSchema>;

/** Parse + validate a set-client-supplied payload. Returns the safeParse
 * result so the server action can map failure to `ok:false` without throwing. */
export function parseSetClientSupplied(
  input: unknown,
): ReturnType<typeof setClientSuppliedSchema.safeParse> {
  return setClientSuppliedSchema.safeParse(input);
}
