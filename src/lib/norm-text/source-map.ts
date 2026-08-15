/**
 * Maps a standard's `code` (e.g. `DWA-A-138-1`) to its raw markdown filename
 * under `data/norm-text/`.
 *
 * Keep this in sync with whatever lives in `data/norm-text/`. When a new
 * standard is added, drop the markdown there and add an entry here.
 *
 * Why an explicit map and not a `<code>.md` convention?
 *  - The source files have funky upstream names like `DWA-A_138-1_WD (5).md`.
 *    Centralising the map lets us rename the in-repo copy to a clean
 *    `<code>.md` and document the provenance in one place. Today every entry
 *    follows the `<code>.md` convention, but the indirection lets us deviate
 *    if a future drop has multiple variants for the same code.
 *  - Treating this as an allow-list keeps `getNormSection` from being a
 *    file-system probe of arbitrary filenames.
 */
export const NORM_TEXT_SOURCE_MAP: Record<string, string> = {
  'DWA-A-138-1': 'DWA-A-138-1.md',
  'VSME': 'VSME.md',
};

/** Returns the in-repo filename for the given standard code, or null. */
export function normTextFilename(standardCode: string): string | null {
  return NORM_TEXT_SOURCE_MAP[standardCode] ?? null;
}

/** Public list of standards we have norm-text loaded for. */
export function listSupportedStandards(): string[] {
  return Object.keys(NORM_TEXT_SOURCE_MAP);
}
