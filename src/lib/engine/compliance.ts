import type {
  Worksheet,
  ComputedValues,
  InputValues,
  ComplianceStatus,
  ComplianceViolation,
} from './types';

export function evaluateCompliance(
  worksheet: Worksheet,
  computed: ComputedValues,
  inputs: InputValues,
): { status: ComplianceStatus; violations: ComplianceViolation[] } {
  const violations: ComplianceViolation[] = [];
  let unknown = false;

  for (const t of worksheet.thresholds) {
    const observed =
      typeof computed[t.ref] === 'number'
        ? computed[t.ref]
        : typeof inputs[t.ref] === 'number'
          ? (inputs[t.ref] as number)
          : undefined;

    if (observed === undefined || Number.isNaN(observed)) {
      unknown = true;
      continue;
    }

    let violated = false;
    switch (t.rule.kind) {
      case 'lte':
        violated = observed > t.rule.value;
        break;
      case 'gte':
        violated = observed < t.rule.value;
        break;
      case 'eq':
        violated = observed !== t.rule.value;
        break;
    }
    if (violated) {
      violations.push({
        thresholdId: t.id,
        severity: t.severity,
        messageDe: t.messageDe,
        messageEn: t.messageEn,
        observed,
      });
    }
  }

  let status: ComplianceStatus = 'compliant';
  if (violations.some((v) => v.severity === 'blocking')) status = 'blocking_violation';
  else if (violations.some((v) => v.severity === 'warning')) status = 'warning';
  else if (unknown && violations.length === 0) status = 'unknown';

  return { status, violations };
}
