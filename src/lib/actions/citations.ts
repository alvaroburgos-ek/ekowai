'use server';

/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * The citation flow originally attached source pointers to
 * calculations.inputs[symbol].source (JSONB on the now-dropped
 * calculations table). Plan 6 retargets to
 * project_parameters.citation_source.
 *
 * Until then, the UI (<SourceBadge>, <CitationPicker>) still renders
 * but its server actions are no-ops that return an error.
 */

export type CitationSource =
  | { docId: string; page?: number; note?: string }
  | { label: string };

export async function attachCitation(
  _input: { calcId: string; symbol: string; source: CitationSource },
): Promise<{ ok: false; error: string }> {
  return { ok: false, error: 'Citations pending Plan 6 reattachment' };
}

export async function detachCitation(
  _input: { calcId: string; symbol: string },
): Promise<{ ok: false; error: string }> {
  return { ok: false, error: 'Citations pending Plan 6 reattachment' };
}

// Legacy names used by citation-picker.tsx — alias to stub for compile compat.
export const attachSource = attachCitation;
export const detachSource = detachCitation;
