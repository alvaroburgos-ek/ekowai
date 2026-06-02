'use client';

import { useEffect, useState, useTransition } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { recordManualOverride } from '@/lib/actions/overrides';
import { Button } from '@/components/ui/button';
import { useFocusTrap } from '@/lib/hooks/use-focus-trap';

const MIN_REASON_LENGTH = 10;

// Module-scoped Map of fieldId → most-recently-saved reason. Lives outside
// the component so the "✓ Override begründet" confirmation survives parent
// re-renders (which would otherwise remount the pill and wipe its local
// `savedReason` state every time `isOverridden` flips back through false).
// Reset on full page refresh — the source of truth lives in audit_log.
const savedReasons = new Map<string, string>();

type Props = {
  /** project_parameters.field_id of the output field (the equation's
   * outputSymbol). Required for the audit_log write. */
  fieldId: string;
  /** The equation whose computed result is being overridden — surfaced in the
   * audit row so the report timeline can reference the source equation. */
  equationNumber: string;
  /** projects.id — used by the server action for the ownership check. */
  projectId: string;
  /** Output symbol (e.g. 'A_C'), shown to the engineer in the modal header. */
  outputSymbol: string;
  /** Engine-computed value the engineer is overriding. Shown side-by-side
   * with their typed value so they know what they're walking away from. */
  computedValue: number;
  /** The engineer-typed value currently in the store. */
  manualValue: number;
};

/**
 * Detection contract: a field is "manually overridden" when the engine state
 * is `computed` AND the local stored value (engineer-typed) differs from the
 * engine's computed `state.value`. The parent component decides — this pill
 * just renders the affordance + records the engineer's justification.
 *
 * The pill keeps a small in-memory `begründet` flag so the engineer sees an
 * immediate "Override begründet" confirmation after save. A page refresh
 * resets the flag — the source of truth lives in `audit_log` and is surfaced
 * in the report timeline, not re-queried for this pill.
 */
export function ManualOverridePill({
  fieldId,
  equationNumber,
  projectId,
  outputSymbol,
  computedValue,
  manualValue,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Seed from the module-scoped map so a remount (parent re-render that
  // briefly flips isOverridden) recovers the prior confirmation instead of
  // showing the "Begründen" affordance again.
  const [savedReason, setSavedReason] = useState<string | null>(
    () => savedReasons.get(fieldId) ?? null,
  );
  const dialogRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = () => {
    setError(null);
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON_LENGTH) {
      setError(`Bitte mindestens ${MIN_REASON_LENGTH} Zeichen begründen.`);
      return;
    }
    startTransition(async () => {
      const result = await recordManualOverride({
        projectId,
        fieldId,
        equationNumber,
        reason: trimmed,
      });
      if (result.ok) {
        savedReasons.set(fieldId, trimmed);
        setSavedReason(trimmed);
        setOpen(false);
        setReason('');
      } else {
        setError(result.error);
      }
    });
  };

  if (savedReason) {
    return (
      <span
        data-testid={`override-pill-saved-${fieldId}`}
        className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-success"
        title={savedReason}
      >
        ✓ Override begründet
      </span>
    );
  }

  return (
    <>
      <span
        data-testid={`override-pill-${fieldId}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-accent-2/50 bg-accent-2/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-accent-2"
      >
        Manueller Override
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[10px] font-semibold underline-offset-2 hover:underline"
          data-testid={`override-pill-button-${fieldId}`}
        >
          Begründen
        </button>
      </span>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="override-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg space-y-4 rounded-lg border border-hairline-strong bg-paper p-6 shadow-lg">
            <h2
              id="override-modal-title"
              className="text-lg font-semibold text-ink"
            >
              Manuelle Überschreibung begründen — Gl. {equationNumber}
            </h2>
            <div className="rounded border border-hairline bg-paper-2/40 p-3 text-xs text-subtext space-y-1">
              <div>
                <span className="font-mono">{outputSymbol}</span> — Engine:{' '}
                <span className="font-mono tabular-nums text-ink">
                  {formatNumber(computedValue)}
                </span>
              </div>
              <div>
                Manuell:{' '}
                <span className="font-mono tabular-nums text-ink">
                  {formatNumber(manualValue)}
                </span>
              </div>
            </div>
            <label className="block text-sm text-subtext">
              Begründung (Pflicht, mind. {MIN_REASON_LENGTH} Zeichen — wird im
              Auditprotokoll gespeichert):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0"
              autoFocus
              data-testid="override-modal-textarea"
            />
            {error && (
              <div className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
                type="button"
              >
                Abbrechen
              </Button>
              <Button
                onClick={submit}
                disabled={pending || reason.trim().length < MIN_REASON_LENGTH}
                type="button"
                data-testid="override-modal-save"
              >
                {pending ? 'Speichere…' : 'Speichern'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hook: decide whether the engineer's stored value diverges from the engine's
 * computed value for the given output field. Returns the data needed to drive
 * the pill, or `null` when not in an override state. NEVER returns true while
 * the engine is in `manual_required` or `error` — that case is "no engine
 * verdict to override".
 */
export function useManualOverride(args: {
  fieldId: string;
  /** The engine-computed value for this field, or null when the engine is
   * not in `computed` state. */
  computedValue: number | null;
  /** Tolerance for floating-point drift — only treats `manual` ≠ `computed`
   * as an override when the relative difference exceeds this. Default 1e-9. */
  rtol?: number;
}): { isOverridden: boolean; manualValue: number | null } {
  const { fieldId, computedValue, rtol = 1e-9 } = args;
  const stored = useWorksheetStore((s) => s.values[fieldId]);
  const manualValue =
    stored?.type === 'number' &&
    stored.value !== null &&
    Number.isFinite(stored.value)
      ? stored.value
      : null;

  if (computedValue === null || manualValue === null) {
    return { isOverridden: false, manualValue };
  }
  const denom = Math.max(Math.abs(computedValue), Math.abs(manualValue), 1);
  const isOverridden = Math.abs(manualValue - computedValue) / denom > rtol;
  return { isOverridden, manualValue };
}

function formatNumber(v: number): string {
  if (Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01)) {
    return v.toPrecision(6);
  }
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 }).format(v);
}
