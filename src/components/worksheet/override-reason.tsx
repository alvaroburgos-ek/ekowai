'use client';

/**
 * Shared "abweichend → Begründung" logic for table-backed values (lookup_fill
 * widget, register rows — I-4). The REASON is the only thing persisted, through
 * the existing `recordManualOverride` audit path (`audit_log`); the override
 * itself stays derived (stored ≠ table value / the row's override flag).
 *
 * The "✓ Abweichung begründet" confirmation is module-scoped (like
 * manual-override-pill.tsx) so it survives parent re-renders, keyed by
 * `(instanceId, fieldId[, rowId])` and valid ONLY while the justified value is
 * still the stored one — a later different override drops it. Reset on page
 * refresh (audit_log is the truth).
 */
import { useState, useTransition } from 'react';
import { recordManualOverride } from '@/lib/actions/overrides';

/** The server action's own floor (overrides.ts `reason: z.string().min(10)`) — a smaller ui value would always be rejected. */
export const SERVER_MIN_REASON = 10;

const savedReasons = new Map<string, { reason: string; value: string }>();
/** Test isolation only — clears the in-memory confirmation map (no production caller). */
export function resetSavedOverrideReasons(): void {
  savedReasons.clear();
}
/** Drop one saved confirmation (the engineer took the table value back). */
export function clearSavedOverrideReason(storeKey: string): void {
  savedReasons.delete(storeKey);
}
export function overrideReasonKey(instanceId: string | null, fieldId: string, rowId?: string): string {
  return `${instanceId ?? ''}:${fieldId}${rowId ? `:${rowId}` : ''}`;
}
/** Stable snapshot of the justified value(s) — scalars verbatim, objects/arrays as JSON. */
export function overrideValueKey(value: unknown): string {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : `${typeof value}:${String(value)}`;
}

export type OverrideReasonState = {
  /** The saved reason when the CURRENT value is the one that was justified; else null (⇒ "Begründung fehlt"). */
  savedReason: string | null;
  reason: string;
  setReason: (s: string) => void;
  error: string | null;
  pending: boolean;
  /** Post the reason for the current value; no-op below the minimum length. */
  submit: (args: { projectId: string; fieldId: string; equationNumber: string }) => void;
  /** Drop the confirmation (the engineer took the table value back / the row moved). */
  clear: () => void;
  minReason: number;
};

export function useOverrideReason(storeKey: string, currentValue: unknown, uiMinReason?: number): OverrideReasonState {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<{ reason: string; value: string } | null>(() => savedReasons.get(storeKey) ?? null);
  const valueKey = overrideValueKey(currentValue);
  const savedReason = saved && saved.value === valueKey ? saved.reason : null;
  const minReason = Math.max(uiMinReason ?? SERVER_MIN_REASON, SERVER_MIN_REASON);

  const submit: OverrideReasonState['submit'] = ({ projectId, fieldId, equationNumber }) => {
    setError(null);
    const trimmed = reason.trim();
    if (trimmed.length < minReason) return;
    const justified = valueKey;
    startTransition(async () => {
      const res = await recordManualOverride({ projectId, fieldId, equationNumber, reason: trimmed });
      if (res.ok) {
        const entry = { reason: trimmed, value: justified };
        savedReasons.set(storeKey, entry);
        setSaved(entry);
        setReason('');
      } else {
        setError(res.error);
      }
    });
  };
  const clear = () => {
    savedReasons.delete(storeKey);
    setSaved(null);
    setError(null);
  };
  return { savedReason, reason, setReason, error, pending, submit, clear, minReason };
}

const inputBox = 'block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none';
const smallBtn = 'text-[11px] font-medium text-accent underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline';

/** The reason form (textarea + "Abweichung begründen") or the ✓ confirmation. `canSubmit=false` keeps the button disabled (e.g. nothing stored yet). */
export function OverrideReasonForm({ state, canSubmit = true, onSubmit }: { state: OverrideReasonState; canSubmit?: boolean; onSubmit: () => void }) {
  if (state.savedReason) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-success" title={state.savedReason}>
        ✓ Abweichung begründet
      </span>
    );
  }
  return (
    <div className="space-y-1">
      <textarea
        aria-label="Begründung der Abweichung"
        value={state.reason}
        onChange={(e) => state.setReason(e.target.value)}
        rows={2}
        placeholder={`Begründung (mind. ${state.minReason} Zeichen — wird im Auditprotokoll gespeichert)`}
        className={inputBox}
      />
      {state.error && <p className="text-xs text-error">{state.error}</p>}
      <button type="button" className={smallBtn} disabled={state.pending || !canSubmit || state.reason.trim().length < state.minReason} onClick={onSubmit}>
        {state.pending ? 'Speichere…' : 'Abweichung begründen'}
      </button>
    </div>
  );
}

/** The "Begründung fehlt" marker (visible state only, no save-time gate — sign-off D-2b-10). */
export function ReasonMissing({ testId }: { testId: string }) {
  return (
    <span data-testid={testId} className="normal-case tracking-normal text-warning" title="Abweichung ohne gespeicherte Begründung (Auditprotokoll)">
      Begründung fehlt
    </span>
  );
}
