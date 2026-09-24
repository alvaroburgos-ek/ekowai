'use client';

/**
 * `lookup_fill` widget (Plan 2b, Task 7): a scalar whose figure comes from ONE
 * `regulation_tables` row, shown with a source badge, and — where the table's
 * `override_policy` allows — a policy-driven "abweichend" with an audited reason.
 *
 * Two modes, one producer per value (brief "Ownership decision"):
 * - DISPLAY — the form declares the symbol server-owned (`computedSymbols`, e.g.
 *   A138-12 `ac_as_ratio_limit` via LOADING_CHECK_SYMBOLS, or `serverComputedSet`),
 *   or the field is an INHERITED copy (`inheritedFromWorksheet` — a copy is never a
 *   producer). The persisted value renders read-only; the badge names the SOURCE
 *   only (`Tab. 6 (Grenzwert)`, with the figure when the row resolves) — the
 *   key diagnostics belong to fill mode. No store write, no override control.
 * - FILL — nobody else owns the symbol (Plan 3: DIN 1989-1 `e`, FLL-GAR
 *   `nahtbreite_min_mm`). When the bound row resolves and the stored value is null
 *   (or the keys moved to another row and the stored value still equals the LAST
 *   RESOLVED row's figure), the widget writes the cell TYPED BY `field.dataType`
 *   (I-1, final review): `number` → `{ type: 'number', value }` (a non-numeric
 *   cell is never written), `text` → `{ type: 'text', value: String(cell) }`,
 *   `enum` → `{ type: 'enum', value }` ONLY when the cell string is one of the
 *   field's `enumValues` (else the badge says so and nothing is written —
 *   `saveWorksheet` would otherwise persist the value into the wrong column and
 *   readers would get null back). An override is derived (`stored !== tableValue`),
 *   never stored; its REASON is persisted through the existing
 *   `recordManualOverride` audit path (`equationNumber = 'lookup:<TABLE>'`). An
 *   override whose reason has not been saved for the CURRENT value shows
 *   `Begründung fehlt` (`lookup-reason-missing`) — visible state only, no save-time
 *   gate (sign-off D-2b-10).
 *
 * Policies (spec §7): `locked` ⇒ no affordance (`lookup-locked` note);
 * `anhaltswert` ⇒ typed input + reason; `kann` ⇒ select over the table's printed
 * alternatives (`value_columns[value].values`) when present, else the typed input;
 * `messwert` ⇒ typed input labelled "(Messwert)" + reason (provenance). The typed
 * input is a number input (number), a text input (text) or a select over the
 * field's enum values (enum).
 *
 * Testids: `lookup-fill` [data-mode, data-symbol], `lookup-source` (badge,
 * title = row.verbatim_quote), `lookup-fill-value` (read-only span), `lookup-locked`,
 * `lookup-reason-missing`.
 */
import { useEffect, useRef, useState } from 'react';
import { useWorksheetStore, type FieldValue } from '@/lib/state/worksheet-store';
import { OverrideReasonForm, ReasonMissing, overrideReasonKey, resetSavedOverrideReasons, useOverrideReason } from './override-reason';
import { resolveLookupFill, resolveLookupFillConfig, type LookupFillState } from '@/lib/eval/lookup-fill';
import type { LookupBinding } from '@/lib/eval/field-config';
import { printedAlternatives } from '@/lib/eval/regulation-tables';
import { fmt } from './register-editor';
import type { WidgetContext, WorksheetFormField } from './widgets';

type Scalar = number | string;
type ScalarType = 'number' | 'text' | 'enum';

// The "✓ Abweichung begründet" confirmation lives in override-reason.tsx (shared with the register
// editor, I-4), keyed by (instanceId, fieldId) — the same field id cannot carry another instance's
// confirmation across a client-side navigation — and valid ONLY while the stored value is still the
// one that was justified; a later different override (or `takeTable`) drops it.
/** Test isolation only — clears the shared in-memory confirmation map (no production caller). */
export function resetSavedLookupReasons(): void {
  resetSavedOverrideReasons();
}

/** The widget's scalar type for the field — `lookup_fill` is number | text | enum only (importer rule, _pass3c-validate.ts). */
function scalarTypeOf(dataType: string): ScalarType | null {
  return dataType === 'number' || dataType === 'text' || dataType === 'enum' ? dataType : null;
}

/** Stored value read under the field's own type — a number persisted into a text field (or vice versa) reads as null. */
function storedScalar(v: FieldValue | undefined, t: ScalarType): Scalar | null {
  if (!v) return null;
  if (t === 'number') return v.type === 'number' ? v.value : null;
  if (t === 'text') return v.type === 'text' ? v.value : null;
  return v.type === 'enum' ? v.value : null;
}

/** The table cell coerced to the field's type; `null` when it cannot be represented (never coerced across types). */
function cellScalar(cell: number | string | boolean | null, t: ScalarType, enumValues: readonly string[]): Scalar | null {
  if (cell == null) return null;
  if (t === 'number') return typeof cell === 'number' ? cell : null;
  const s = String(cell);
  if (t === 'text') return s;
  return enumValues.includes(s) ? s : null;
}

function tagged(t: ScalarType, value: Scalar | null): FieldValue {
  if (t === 'number') return { type: 'number', value: typeof value === 'number' ? value : null };
  if (t === 'text') return { type: 'text', value: value == null ? null : String(value) };
  return { type: 'enum', value: value == null ? null : String(value) };
}

function badgeText(state: LookupFillState, label: string, role: LookupBinding['role'], mode: 'display' | 'fill', enumMismatch: boolean): string {
  const suffix = role === 'limit' ? ' (Grenzwert)' : '';
  if (state.kind === 'resolved') {
    // I-1: the cell string is not one of the field's enum values — say so instead of writing it.
    if (enumMismatch && mode === 'fill') return `${label}: Wert „${String(state.tableValue)}“ nicht in den zulässigen Optionen${suffix}`;
    return `${label}: ${fmt(state.tableValue ?? undefined)}${suffix}`;
  }
  // Display mode names the SOURCE only — the value is server-produced, the key diagnostics are fill-mode information.
  if (mode === 'display') return `${label}${suffix}`;
  switch (state.kind) {
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
  const scalarType = scalarTypeOf(field.dataType);
  if (!cfg || !scalarType) return <>{ctx.renderDynamic(field)}</>;
  return <LookupFillInner field={field} ctx={ctx} binding={cfg.binding} ui={cfg.ui} scalarType={scalarType} />;
}

function LookupFillInner({ field, ctx, binding, ui, scalarType }: { field: WorksheetFormField; ctx: WidgetContext; binding: LookupBinding; ui: { source_label?: string; reason_min_length?: number } | null; scalarType: ScalarType }) {
  const state = resolveLookupFill(binding, ctx.standardCode, ctx.symbolLookup);
  const label = ui?.source_label ?? state.label;
  const instanceId = useWorksheetStore((s) => s.instanceId);
  const enumOptions = field.enumValues ?? [];
  const enumValues = enumOptions.map((o) => o.value);
  const stored = storedScalar(ctx.values[field.id], scalarType);
  // Ownership: server materialiser (computedSymbols / serverComputedSet) or an inherited copy ⇒ display only.
  const owned = ctx.computedSymbols.has(field.symbol) || ctx.serverComputedSet.has(field.id) || field.inheritedFromWorksheet != null;
  const mode: 'display' | 'fill' = owned ? 'display' : 'fill';
  const readOnly = ctx.readOnly;
  // The cell under the field's type: null when the row resolved but the cell cannot be represented
  // (non-numeric cell on a number field, enum cell outside the field's options) — nothing is written then.
  const tableScalar = state.kind === 'resolved' ? cellScalar(state.tableValue, scalarType, enumValues) : null;
  const enumMismatch = scalarType === 'enum' && state.kind === 'resolved' && state.tableValue != null && tableScalar === null;
  // Round 2: compare against the dataType-COERCED cell, never the raw cell — a text field over a numeric cell
  // ("5" vs 5) is not a deviation. A stored value over an UNREPRESENTABLE cell (tableScalar === null: non-numeric cell on a
  // number field, enum cell outside the options) is not "abweichend" either — there is no table figure to deviate from.
  const overridden = mode === 'fill' && state.kind === 'resolved' && stored != null && tableScalar != null && stored !== tableScalar;
  const policy = state.kind === 'resolved' ? state.policy : null;

  const [editing, setEditing] = useState(false);
  const reasonState = useOverrideReason(overrideReasonKey(instanceId, field.id), stored, ui?.reason_min_length);
  const savedReason = stored != null ? reasonState.savedReason : null;

  // FILL mode — the one client-side write. Fill when nothing is stored; on a key change
  // (a different row than the LAST RESOLVED one) re-fill only when the stored value still
  // equals that row's figure — an engineer's override (stored ≠ last table value) is never
  // overwritten. `lastResolved` is updated only on resolved rows, so keys cleared in between
  // (keys_missing) do not fake a fresh row and turn the old fill into a phantom "abweichend".
  // While the engineer is editing (opened "abweichend", or typed/cleared the input) nothing is
  // filled — a cleared input stays empty instead of snapping back to the table value. The one
  // exception (Plan 2b close-out): the keys move to ANOTHER row while editing — the in-progress
  // deviation was against the previous row, so it is dropped like "übernehmen" (editing closed,
  // confirmation cleared) and the new row's figure is filled; otherwise the old typed value
  // would read as a phantom "abweichend" against a row the engineer never saw.
  const rowKey = state.kind === 'resolved' ? state.row.row_key : null;
  const lastResolved = useRef<{ rowKey: string; tableScalar: Scalar } | null>(null);
  const { setField, values } = ctx;
  useEffect(() => {
    if (mode !== 'fill' || rowKey == null || tableScalar == null) return;
    const before = lastResolved.current;
    lastResolved.current = { rowKey, tableScalar };
    if (readOnly) return;
    const keysMoved = before != null && before.rowKey !== rowKey;
    if (editing) {
      if (!keysMoved) return;
      reasonState.clear();
      setEditing(false);
      if (stored !== tableScalar) setField(field.id, tagged(scalarType, tableScalar));
      return;
    }
    const followsTable = stored == null || (keysMoved && stored === before.tableScalar);
    if (followsTable && stored !== tableScalar) setField(field.id, tagged(scalarType, tableScalar));
    // `values` is a dependency on purpose: the form's store init (parent effect, runs AFTER this child effect on
    // mount) can reset the store to a state whose derived deps equal the previous run's — re-run on every store
    // change so a fill lost to that reset is re-applied; the write itself is idempotent (stored === table ⇒ no-op).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reasonState.clear is stable per key; listing the state object would re-run on every keystroke in the reason textarea
  }, [mode, readOnly, editing, rowKey, tableScalar, stored, field.id, setField, values, scalarType, instanceId]);

  const canOverride = mode === 'fill' && !readOnly && state.kind === 'resolved' && policy !== 'locked' && tableScalar != null;
  const showInput = canOverride && (editing || overridden);
  const inputLabel = `${field.labelDe}${policy === 'messwert' ? ' (Messwert)' : ' (abweichend)'}`;
  // `kann`: the printed alternatives — the RESOLVED ROW's own list first (wave B defect 6,
  // `a178-O-4`: DWA-A 178 Tab. 1 prints η_VS per Vorstufe type), else the value column's
  // table-wide list. An enum field always selects over its own values.
  const alternatives = policy === 'kann' && scalarType !== 'enum' && state.kind === 'resolved'
    ? printedAlternatives(state.row, state.valueColumn)
    : null;

  /** Engineer-typed value; `null` clears the input (kept empty — no re-fill while editing). */
  const write = (v: Scalar | null) => {
    if (typeof v === 'number' && !Number.isFinite(v)) return;
    setEditing(true);
    setField(field.id, tagged(scalarType, v));
  };
  const takeTable = () => {
    reasonState.clear();
    setEditing(false);
    if (tableScalar != null && stored !== tableScalar) setField(field.id, tagged(scalarType, tableScalar));
  };
  const submitReason = () => {
    if (stored == null) return;
    reasonState.submit({ projectId: ctx.projectId, fieldId: field.id, equationNumber: `lookup:${binding.table_code}` });
  };

  const displayValue = (v: Scalar): string => (scalarType === 'enum' ? (enumOptions.find((o) => o.value === v)?.label_de ?? String(v)) : fmt(v));
  const valueText = stored != null ? displayValue(stored) : binding.role === 'limit' ? `— (kein ${label}-Grenzwert)` : '—';

  const renderInput = () => {
    if (scalarType === 'enum') {
      return (
        <select aria-label={inputLabel} value={stored != null ? String(stored) : ''} onChange={(e) => write(e.target.value === '' ? null : e.target.value)} className={inputBox}>
          {stored == null && <option value="">— wählen —</option>}
          {enumOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label_de ?? o.value}</option>
          ))}
        </select>
      );
    }
    if (alternatives) {
      return (
        <select
          aria-label={inputLabel}
          value={stored != null ? String(stored) : ''}
          onChange={(e) => {
            if (e.target.value === '') return; // placeholder — never writes 0
            write(scalarType === 'number' ? Number(e.target.value) : e.target.value);
          }}
          className={inputBox}
        >
          {stored == null && <option value="">— wählen —</option>}
          {alternatives.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      );
    }
    if (scalarType === 'text') {
      return (
        <input
          type="text"
          aria-label={inputLabel}
          value={stored != null ? String(stored) : ''}
          onChange={(e) => write(e.target.value === '' ? null : e.target.value)}
          className={inputBox}
        />
      );
    }
    return (
      <input
        type="number"
        inputMode="decimal"
        step="any"
        aria-label={inputLabel}
        value={stored ?? ''}
        onChange={(e) => write(e.target.value === '' ? null : Number(e.target.value))}
        className={inputBox}
      />
    );
  };

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
            {badgeText(state, label, binding.role, mode, enumMismatch)}
          </span>
          {overridden && <span className="normal-case tracking-normal text-accent-2">abweichend</span>}
          {overridden && policy !== 'locked' && !savedReason && <ReasonMissing testId="lookup-reason-missing" />}
        </div>
        {field.description && <p className="text-xs text-subtext mt-1.5 leading-snug">{field.description}</p>}
      </div>

      {showInput ? renderInput() : (
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
          {showInput && <OverrideReasonForm state={{ ...reasonState, savedReason }} canSubmit={stored != null} onSubmit={submitReason} />}
        </div>
      )}
    </div>
  );
}
