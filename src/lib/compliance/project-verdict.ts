export type ProjectVerdict = 'compliant' | 'compliant_with_documented_deviations' | 'non_compliant';

/** `blockFailingCodes` = codes of block reqs currently failing across the project;
 * `deviatedCodes` = codes with an active deviation. A project is:
 *  - non_compliant if any failing block req has no deviation;
 *  - compliant_with_documented_deviations if all failing are covered AND >=1 deviation exists;
 *  - compliant otherwise. */
export function computeProjectVerdict(input: { blockFailingCodes: string[]; deviatedCodes: string[] }): ProjectVerdict {
  const deviated = new Set(input.deviatedCodes);
  const uncovered = input.blockFailingCodes.filter((c) => !deviated.has(c));
  if (uncovered.length > 0) return 'non_compliant';
  return input.deviatedCodes.length > 0 ? 'compliant_with_documented_deviations' : 'compliant';
}

export const PROJECT_VERDICT_LABEL_DE: Record<ProjectVerdict, string> = {
  compliant: 'Konform',
  compliant_with_documented_deviations: 'Konform mit dokumentierten Abweichungen',
  non_compliant: 'Nicht konform',
};
