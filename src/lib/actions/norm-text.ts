'use server';

/**
 * Server action for the split-view norm-text reader.
 *
 * Read-only: this never mutates DB or filesystem. It opens the appropriate
 * markdown file under `data/norm-text/` and returns the matching section.
 *
 * Matching is delegated to `extractSection` which is source-faithful: an
 * inexact clause reference returns `{ found: false }` rather than guessing.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { extractSection } from '@/lib/norm-text/extract-section';
import { normTextFilename } from '@/lib/norm-text/source-map';

export type GetNormSectionResult = {
  found: boolean;
  title?: string;
  markdown?: string;
  sourceFile?: string;
  /** Human-readable explanation when `found` is false. */
  reason?: 'unknown_standard' | 'clause_not_found' | 'source_missing';
};

/**
 * Look up the section in the given standard's markdown that matches
 * `clauseReference`. Both inputs come from the DB:
 *   - `standardCode` from `standards.code` (e.g. `DWA-A-138-1`)
 *   - `clauseReference` from `fields.clause_reference` /
 *     `equations.clause_reference` / `compliance_requirements.clause_reference`
 *     (e.g. `§5.3.3.5`, `§6.4.2`, `Anh. A`)
 *
 * Filesystem access happens only inside `data/norm-text/<known filename>.md`
 * — the source map is an explicit allow-list, so this isn't a path-traversal
 * surface even though we read from disk.
 */
export async function getNormSection({
  standardCode,
  clauseReference,
}: {
  standardCode: string;
  clauseReference: string;
}): Promise<GetNormSectionResult> {
  const filename = normTextFilename(standardCode);
  if (!filename) {
    return { found: false, reason: 'unknown_standard' };
  }

  const fullPath = path.join(process.cwd(), 'data', 'norm-text', filename);
  let source: string;
  try {
    source = await fs.readFile(fullPath, 'utf8');
  } catch {
    // File mapped but missing on this deployment — surface a distinct reason
    // so the UI can render "norm text not deployed" rather than "clause not
    // found in the norm".
    return { found: false, reason: 'source_missing' };
  }

  const match = extractSection(source, clauseReference);
  if (!match.found) {
    return { found: false, reason: 'clause_not_found' };
  }

  return {
    found: true,
    title: match.title,
    markdown: match.markdown,
    sourceFile: filename,
  };
}
