import 'server-only';
import { loadStandardVisibilityArgs } from '@/lib/actions/approval-gate';
import { countRequiredFieldsByTemplate, requiredFieldState, type RequiredFieldCounts } from './required-field-counts';

export type RequiredFieldState = {
  /** C-7 per-template counts (+ U-1: a stale own answer counts as open; R-14: hidden-at-source occurrences dropped). */
  counts: Map<string, RequiredFieldCounts>;
  /** U-2 / R-14: per template, the active fields hidden by `visible_when` under the saved values (hidden at source). */
  hiddenByTemplate: Map<string, Set<string>>;
  /** R-16: per template, the symbols hidden at their source for that sheet (unioned into every verdict surface). */
  sourceHiddenByTemplate: Map<string, Set<string>>;
};

/**
 * C-7: per-template required-field counts of ONE standard in a project, by the approval gate's rule
 * (`countRequiredFieldsByTemplate`): hidden (`visible_when`) required fields are neither total nor open.
 * Replaces the plain-SQL counts of the worksheet sidebar and `get_standard_progress`.
 */
export async function loadRequiredFieldCounts(projectId: string, standardId: string): Promise<Map<string, RequiredFieldCounts>> {
  const args = await loadStandardVisibilityArgs(projectId, standardId);
  return args ? countRequiredFieldsByTemplate(args) : new Map();
}

/**
 * The counts AND the per-template hidden-at-source sets from ONE load of the rows and one evaluation of each pass
 * (U-2 / L-4: the worksheet page needs both and must not query or evaluate twice).
 */
export async function loadRequiredFieldState(projectId: string, standardId: string): Promise<RequiredFieldState> {
  const args = await loadStandardVisibilityArgs(projectId, standardId);
  if (!args) return { counts: new Map(), hiddenByTemplate: new Map(), sourceHiddenByTemplate: new Map() };
  return requiredFieldState(args);
}
