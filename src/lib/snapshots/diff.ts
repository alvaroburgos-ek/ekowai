/**
 * Pure diff utility over two calculation snapshots. No DB access, no React.
 * Exported so the diff page and tests share one implementation.
 *
 * Algorithm — handling schema drift ("this field existed before but doesn't
 * exist anymore because the worksheet template was reimported"):
 *
 *   For each key (fieldId / equationNumber / requirementId) that appears in
 *   EITHER snapshot we emit a row tagged with a `presence` flag:
 *     - 'both'      : value present in both snapshots — compute delta
 *     - 'only_from' : present in the `from` snapshot only — render as
 *                     "entfernt" (removed)
 *     - 'only_to'   : present in the `to` snapshot only — render as
 *                     "neu" (new)
 *
 *   This is deliberately schema-agnostic: if the template changed, the diff
 *   shows the drift instead of silently dropping rows.
 *
 * Three-state contract:
 *   For equation outputs we compare on the (kind, value) pair. A transition
 *   like manual_required → computed is reported as a `state_changed` delta,
 *   NOT a value delta — the renderer surfaces it as a verdict transition.
 *
 *   For parameters the contract is simpler: we compare on (type, value).
 *   When types differ the row is `changed` (rare — happens only when the
 *   template changes a field's data_type, which the importer documents as
 *   a breaking change).
 *
 *   For compliance we compare on the bare verdict ('pass'|'fail'|'open').
 */

import type {
  SnapshotParameterValue,
  SnapshotEquationOutput,
  SnapshotComplianceVerdict,
  SnapshotPayload,
} from './payload';

export type Presence = 'both' | 'only_from' | 'only_to';

export type ParameterDelta = {
  fieldId: string;
  presence: Presence;
  from: SnapshotParameterValue | null;
  to: SnapshotParameterValue | null;
  /** True iff (presence='both') AND values differ — used to drive
   * "Unverändert anzeigen" toggle. */
  changed: boolean;
};

export type EquationDelta = {
  equationNumber: string;
  presence: Presence;
  from: SnapshotEquationOutput | null;
  to: SnapshotEquationOutput | null;
  /** 'kind_change' is the manual_required ↔ computed transition. The renderer
   * treats it specially so the engineer sees a verdict-change, not "value
   * went from null to X". */
  changeType: 'unchanged' | 'value_change' | 'kind_change' | 'added' | 'removed';
};

export type ComplianceDelta = {
  requirementId: string;
  presence: Presence;
  from: SnapshotComplianceVerdict | null;
  to: SnapshotComplianceVerdict | null;
  changed: boolean;
};

export type SnapshotDiff = {
  parameters: ParameterDelta[];
  equations: EquationDelta[];
  compliance: ComplianceDelta[];
  summary: {
    parametersChanged: number;
    parametersUnchanged: number;
    /** Equations whose output kind OR value moved. */
    equationOutputsAffected: number;
    /** Compliance requirements whose verdict flipped. */
    complianceFlipped: number;
  };
};

/** Numeric tolerance for "values are equal" — same threshold the worksheet
 * page uses for upstream-value-equality. */
const EPS = 1e-9;

function paramValuesEqual(a: SnapshotParameterValue, b: SnapshotParameterValue): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'number' && b.type === 'number') {
    const an = typeof a.value === 'number' ? a.value : Number(a.value);
    const bn = typeof b.value === 'number' ? b.value : Number(b.value);
    if (!Number.isFinite(an) || !Number.isFinite(bn)) return a.value === b.value;
    return Math.abs(an - bn) < EPS;
  }
  if (a.type === 'json') {
    // JSON carriers — deep-compare via canonical JSON. Order-insensitive
    // would be nicer but JSON.stringify ordering is keyed off insertion,
    // which is fine for our carriers (they're array-of-row shapes the form
    // emits deterministically).
    return safeStringify(a.value) === safeStringify(b.value);
  }
  return a.value === b.value;
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function equationOutputsEqual(
  a: SnapshotEquationOutput,
  b: SnapshotEquationOutput,
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'computed' && b.kind === 'computed') {
    return Math.abs(a.value - b.value) < EPS;
  }
  if (
    (a.kind === 'manual_required' || a.kind === 'error' || a.kind === 'skipped') &&
    (b.kind === 'manual_required' || b.kind === 'error' || b.kind === 'skipped')
  ) {
    return a.manualRequiredReason === b.manualRequiredReason;
  }
  return false;
}

function diffParameters(
  fromMap: Record<string, SnapshotParameterValue>,
  toMap: Record<string, SnapshotParameterValue>,
): ParameterDelta[] {
  const keys = new Set<string>([...Object.keys(fromMap), ...Object.keys(toMap)]);
  const out: ParameterDelta[] = [];
  for (const fieldId of keys) {
    const from = fromMap[fieldId] ?? null;
    const to = toMap[fieldId] ?? null;
    if (from && to) {
      out.push({
        fieldId,
        presence: 'both',
        from,
        to,
        changed: !paramValuesEqual(from, to),
      });
    } else if (from) {
      out.push({ fieldId, presence: 'only_from', from, to: null, changed: true });
    } else if (to) {
      out.push({ fieldId, presence: 'only_to', from: null, to, changed: true });
    }
  }
  return out;
}

function diffEquations(
  fromMap: Record<string, SnapshotEquationOutput>,
  toMap: Record<string, SnapshotEquationOutput>,
): EquationDelta[] {
  const keys = new Set<string>([...Object.keys(fromMap), ...Object.keys(toMap)]);
  const out: EquationDelta[] = [];
  for (const equationNumber of keys) {
    const from = fromMap[equationNumber] ?? null;
    const to = toMap[equationNumber] ?? null;
    if (from && to) {
      if (equationOutputsEqual(from, to)) {
        out.push({ equationNumber, presence: 'both', from, to, changeType: 'unchanged' });
      } else if (from.kind !== to.kind) {
        out.push({ equationNumber, presence: 'both', from, to, changeType: 'kind_change' });
      } else {
        out.push({ equationNumber, presence: 'both', from, to, changeType: 'value_change' });
      }
    } else if (from) {
      out.push({
        equationNumber,
        presence: 'only_from',
        from,
        to: null,
        changeType: 'removed',
      });
    } else if (to) {
      out.push({
        equationNumber,
        presence: 'only_to',
        from: null,
        to,
        changeType: 'added',
      });
    }
  }
  // Sort equations by equationNumber for stable rendering (the engineer
  // reads them in source order, not Map-insertion order).
  out.sort((a, b) => a.equationNumber.localeCompare(b.equationNumber, undefined, { numeric: true }));
  return out;
}

function diffCompliance(
  fromMap: Record<string, SnapshotComplianceVerdict>,
  toMap: Record<string, SnapshotComplianceVerdict>,
): ComplianceDelta[] {
  const keys = new Set<string>([...Object.keys(fromMap), ...Object.keys(toMap)]);
  const out: ComplianceDelta[] = [];
  for (const requirementId of keys) {
    const from = fromMap[requirementId] ?? null;
    const to = toMap[requirementId] ?? null;
    if (from && to) {
      out.push({
        requirementId,
        presence: 'both',
        from,
        to,
        changed: from !== to,
      });
    } else if (from) {
      out.push({
        requirementId,
        presence: 'only_from',
        from,
        to: null,
        changed: true,
      });
    } else if (to) {
      out.push({
        requirementId,
        presence: 'only_to',
        from: null,
        to,
        changed: true,
      });
    }
  }
  return out;
}

export function computeSnapshotDiff(
  fromPayload: SnapshotPayload,
  toPayload: SnapshotPayload,
): SnapshotDiff {
  const parameters = diffParameters(fromPayload.parameters, toPayload.parameters);
  const equations = diffEquations(
    fromPayload.equationOutputs,
    toPayload.equationOutputs,
  );
  const compliance = diffCompliance(
    fromPayload.complianceResults,
    toPayload.complianceResults,
  );

  return {
    parameters,
    equations,
    compliance,
    summary: {
      parametersChanged: parameters.filter((p) => p.changed).length,
      parametersUnchanged: parameters.filter((p) => !p.changed).length,
      equationOutputsAffected: equations.filter(
        (e) => e.changeType !== 'unchanged',
      ).length,
      complianceFlipped: compliance.filter((c) => c.changed).length,
    },
  };
}

/**
 * Format a single parameter value for display (used by the diff renderer).
 * Number formatting uses the German locale (1.234,56) to match the rest of
 * the app.
 */
export function formatParameterValue(v: SnapshotParameterValue | null): string {
  if (!v) return '—';
  if (v.value === null || v.value === undefined) return '—';
  switch (v.type) {
    case 'number': {
      const n = typeof v.value === 'number' ? v.value : Number(v.value);
      if (!Number.isFinite(n)) return String(v.value);
      const formatted = new Intl.NumberFormat('de-DE', {
        maximumFractionDigits: 6,
      }).format(n);
      return v.unit ? `${formatted} ${v.unit}` : formatted;
    }
    case 'boolean':
      return v.value ? 'ja' : 'nein';
    case 'json':
      return '[JSON]';
    default:
      return String(v.value);
  }
}

/** Format an equation output verdict for display. */
export function formatEquationVerdict(o: SnapshotEquationOutput | null): {
  badge: string;
  detail: string;
} {
  if (!o) return { badge: '—', detail: '' };
  switch (o.kind) {
    case 'computed':
      return {
        badge: 'berechnet',
        detail: new Intl.NumberFormat('de-DE', {
          maximumFractionDigits: 6,
        }).format(o.value),
      };
    case 'manual_required':
      return { badge: 'manuell prüfen', detail: o.manualRequiredReason };
    case 'error':
      return { badge: 'Fehler', detail: o.manualRequiredReason };
    case 'skipped':
      return { badge: 'nicht verdrahtet', detail: o.manualRequiredReason };
  }
}
