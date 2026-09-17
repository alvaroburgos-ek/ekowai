'use client';

/**
 * `lookup_fill` widget (Plan 2b, Task 7): a scalar whose figure comes from ONE
 * `regulation_tables` row, shown with a source badge, and — where the table's
 * `override_policy` allows — a policy-driven "abweichend" with an audited reason.
 *
 * Two modes, one producer per value (brief "Ownership decision"):
 * - DISPLAY — the form declares the symbol server-owned (`computedSymbols`, e.g.
 *   A138-12 `ac_as_ratio_limit` via LOADING_CHECK_SYMBOLS, or `serverComputedSet`).
 *   The persisted value renders read-only with the badge; the widget never writes
 *   the store and offers no override control — the materialiser stays the producer.
 * - FILL — nobody else owns the symbol (Plan 3: DIN 1989-1 `e`, FLL-GAR
 *   `nahtbreite_min_mm`). When the bound row resolves and the stored value is null
 *   (or the keys moved and the stored value still equals the previous row's figure),
 *   the widget writes `{ type: 'number', value: tableValue }` through `setField` —
 *   the engineer's confirmed value with the source badge. An override is derived
 *   (`stored !== tableValue`), never stored; its REASON is persisted through the
 *   existing `recordManualOverride` audit path (`equationNumber = 'lookup:<TABLE>'`).
 *
 * Policies (spec §7): `locked` ⇒ no affordance (`lookup-locked` note);
 * `anhaltswert` ⇒ number input + reason; `kann` ⇒ select over the table's printed
 * alternatives (`value_columns[value].values`) when present, else number input;
 * `messwert` ⇒ number input labelled "(Messwert)" + reason (provenance).
 *
 * Testids: `lookup-fill` [data-mode, data-symbol], `lookup-source` (badge,
 * title = row.verbatim_quote), `lookup-fill-value` (read-only span), `lookup-locked`.
 */
import { useEffect, useRef, useState, useTransition } from 'react';
import { recordManualOverride } from '@/lib/actions/overrides';
import { isOverridden, resolveLookupFill, resolveLookupFillConfig, type LookupFillState } from '@/lib/eval/lookup-fill';
import type { LookupBinding } from '@/lib/eval/field-config';
import { fmt } from './register-editor';
import type { WidgetContext, WorksheetFormField } from './widgets';

/** The server action's own floor (overrides.ts `reason: z.string().min(10)`) — a smaller ui value would always be rejected. */
const SERVER_MIN_REASON = 10;

// fieldId → saved reason, module-scoped like manual-override-pill.tsx so the "✓ Abweichung
// begründet" confirmation survives parent re-renders; reset on page refresh (audit_log is the truth).
const savedReasons = new Map<string, string>();
/** Test isolation only — clears the in-memory confirmation map (no production caller). */
export function resetSavedLookupReasons(): void {
  savedReasons.clear();
}

function badgeText(state: LookupFillState, label: string, role: LookupBinding['role']): string {
  const suffix = role === 'limit' ? ' (Grenzwert)' : '';
  switch (state.kind) {
    case 'resolved':
      return `${label}: ${fmt(state.tableValue ?? undefined)}${suffix}`;
    case 'keys_missing':
      return `${label}: — (Schlüssel fehlt: ${state.missing.join(', ')})${suffix}`;
    case 'no_row':
      return `${label}: — (keine Zeile für [${state.keys.map(String).join(', ')}])${suffix}`;
    case 'no_table':
      return `${label}: — (Tabelle nicht geladen)${suffix}`;
  }
}

const readOnlyBox = 'block w-full rounded-md border border-hairline-strong px-3 py-2 text-sm bg-paper-2 cursor-default tabular-nums';
const inputBox = 'block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none';
const smallBtn = 'text-[11px] font-medium text-accent underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline';

export function LookupFillField({ field, ctx }: { field: WorksheetFormField; ctx: WidgetContext }) {
  const cfg = resolveLookupFillConfig(field);
  if (!cfg) return <>{ctx.renderDynamic(field)}</>;
  return <LookupFillInner field={field} ctx={ctx} binding={cfg.binding} ui={cfg.ui} />;
}

function LookupFillInner({ field, ctx, binding, ui }: { field: WorksheetFormField; ctx: WidgetContext; binding: LookupBinding; ui: { source_label?: string; reason_min_length?: number } | null }) {
  const state = resolveLookupFill(binding, ctx.standardCode, ctx.symbolLookup);
  const label = ui?.source_label ?? state.label;
  const v = ctx.values[field.id];
  const stored = v?.type === 'number' ? v.value : null;
  const owned = ctx.computedSymbols.has(field.symbol) || ctx.serverComputedSet.has(field.id);
  const mode: 'display' | 'fill' = owned ? 'display' : 'fill';
  const readOnly = ctx.readOnly;
  const tableNumber = state.kind === 'resolved' && typeof state.tableValue === 'number' ? state.tableValue : null;
  const overridden = isOverridden(state, stored);
  const policy = state.kind === 'resolved' ? state.policy : null;

  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savedReason, setSavedReason] = useState<string | null>(() => savedReasons.get(field.id) ?? null);
  const minReason = Math.max(ui?.reason_min_length ?? SERVER_MIN_REASON, SERVER_MIN_REASON);

  // FILL mode — the one client-side write. Fill when nothing is stored; on a key change
  // (different row) re-fill only when the stored value still equals the PREVIOUS row's
  // figure — an engineer's override (stored ≠ previous table value) is never overwritten.
  const rowKey = state.kind === 'resolved' ? state.row.row_key : null;
  const prev = useRef<{ rowKey: string | null; tableNumber: number | null }>({ rowKey, tableNumber });
  const { setField, values } = ctx;
  useEffect(() => {
    const before = prev.current;
    prev.current = { rowKey, tableNumber };
    if (mode !== 'fill' || readOnly || tableNumber == null || rowKey == null) return;
    const keysMoved = before.rowKey != null && before.rowKey !== rowKey;
    const followsTable = stored == null || (keysMoved && before.tableNumber != null && stored === before.tableNumber);
    if (followsTable && stored !== tableNumber) setField(field.id, { type: 'number', value: tableNumber });
    // `values` is a dependency on purpose: the form's store init (parent effect, runs AFTER this child effect on
    // mount) can reset the store to a state whose derived deps equal the previous run's — re-run on every store
    // change so a fill lost to that reset is re-applied; the write itself is idempotent (stored === table ⇒ no-op).
  }, [mode, readOnly, rowKey, tableNumber, stored, field.id, setField, values]);

  const canOverride = mode === 'fill' && !readOnly && state.kind === 'resolved' && policy !== 'locked' && tableNumber != null;
  const showInput = canOverride && (editing || overridden);
  const inputLabel = `${field.labelDe}${policy === 'messwert' ? ' (Messwert)' : ' (abweichend)'}`;
  const alternatives = policy === 'kann' && state.kind === 'resolved' && state.valueColumn?.values?.length ? state.valueColumn.values : null;

  const write = (n: number | null) => {
    if (n == null || !Number.isFinite(n)) return;
    setField(field.id, { type: 'number', value: n });
  };
  const takeTable = () => {
    if (tableNumber != null) write(tableNumber);
    setEditing(false);
    setError(null);
  };
  const submitReason = () => {
    setError(null);
    const trimmed = reason.trim();
    if (trimmed.length < minReason) return;
    startTransition(async () => {
      const res = await recordManualOverride({ projectId: ctx.projectId, fieldId: field.id, equationNumber: `lookup:${binding.table_code}`, reason: trimmed });
      if (res.ok) {
        savedReasons.set(field.id, trimmed);
        setSavedReason(trimmed);
        setReason('');
      } else {
        setError(res.error);
      }
    });
  };

  const valueText = stored != null ? fmt(stored) : binding.role === 'limit' ? `— (kein ${label}-Grenzwert)` : '—';

  return (
    <div className="space-y-1.5" data-testid="lookup-fill" data-mode={mode} data-symbol={field.symbol}>
      <div>
        <span className="text-sm font-medium text-ink leading-snug block">{field.labelDe}</span>
        <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5 flex items-baseline gap-1.5 flex-wrap">
          {field.unit && <span className="text-ink-2">{field.unit}</span>}
          <span
            data-testid="lookup-source"
            className="normal-case tracking-normal rounded-full border border-hairline-strong bg-paper-2/60 px-2 py-0.5 text-[10px] text-ink-2"
            title={state.kind === 'resolved' ? state.row.verbatim_quote : undefined}
          >
            {badgeText(state, label, binding.role)}
          </span>
          {overridden && <span className="normal-case tracking-normal text-accent-2">abweichend</span>}
        </div>
        {field.description && <p className="text-xs text-subtext mt-1.5 leading-snug">{field.description}</p>}
      </div>

      {showInput ? (
        alternatives ? (
          <select
            aria-label={inputLabel}
            value={stored != null ? String(stored) : ''}
            onChange={(e) => write(Number(e.target.value))}
            className={inputBox}
          >
            {stored == null && <option value="">— wählen —</option>}
            {alternatives.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            inputMode="decimal"
            step="any"
            aria-label={inputLabel}
            value={stored ?? ''}
            onChange={(e) => write(e.target.value === '' ? null : Number(e.target.value))}
            className={inputBox}
          />
        )
      ) : (
        <div data-testid="lookup-fill-value" className={`${readOnlyBox} ${stored != null ? 'text-ink' : 'text-subtext italic'}`}>
          {valueText}
        </div>
      )}

      {mode === 'fill' && policy === 'locked' && (
        <p data-testid="lookup-locked" className="text-[11px] text-subtext">
          nach {label} festgelegt — keine Abweichung (Dokumentierte Abweichung: eigener Workflow)
        </p>
      )}

      {canOverride && (
        <div className="space-y-1.5">
          <button type="button" className={smallBtn} onClick={showInput ? takeTable : () => setEditing(true)}>
            {showInput ? `${label} übernehmen` : 'abweichend wählen'}
          </button>
          {showInput && (savedReason ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-success" title={savedReason}>
              ✓ Abweichung begründet
            </span>
          ) : (
            <div className="space-y-1">
              <textarea
                aria-label="Begründung der Abweichung"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder={`Begründung (mind. ${minReason} Zeichen — wird im Auditprotokoll gespeichert)`}
                className={inputBox}
              />
              {error && <p className="text-xs text-error">{error}</p>}
              <button type="button" className={smallBtn} disabled={pending || reason.trim().length < minReason} onClick={submitReason}>
                {pending ? 'Speichere…' : 'Abweichung begründen'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
