/**
 * Resolve which worksheet a compliance requirement is hosted on.
 *
 * Order: explicit `worksheet_code` (typo = hard error, because the silent
 * phase-fallback is exactly how the VSME B01-collapse shipped) → first
 * worksheet with the row's `phase` (legacy behaviour, byte-for-byte) →
 * first phase-1 worksheet → first worksheet.
 */
export function resolveComplianceWorksheet(
  cr: { worksheet_code: string | null; phase: number | null },
  worksheets: Array<{ worksheet_code: string; phase: number | null }>,
): { worksheet_code: string; via: 'explicit' | 'phase' | 'first_phase1' } {
  const explicit = cr.worksheet_code?.trim();
  if (explicit) {
    const hit = worksheets.find((w) => w.worksheet_code === explicit);
    if (!hit) {
      throw new Error(
        `unknown worksheet_code "${explicit}" on compliance requirement — `
        + `known: ${worksheets.map((w) => w.worksheet_code).join(', ')}`,
      );
    }
    return { worksheet_code: hit.worksheet_code, via: 'explicit' };
  }
  const byPhase = cr.phase != null ? worksheets.find((w) => w.phase === cr.phase) : undefined;
  if (byPhase) return { worksheet_code: byPhase.worksheet_code, via: 'phase' };
  const first = worksheets.find((w) => w.phase === 1) ?? worksheets[0];
  return { worksheet_code: first.worksheet_code, via: 'first_phase1' };
}
