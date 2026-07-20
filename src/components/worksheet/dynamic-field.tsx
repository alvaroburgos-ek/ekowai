'use client';
import { useState, useId, useMemo } from 'react';
import Link from 'next/link';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { CitationPicker } from '@/components/documents/citation-picker';
import { CitationChips } from '@/components/documents/citation-chips';
import { ClauseChip } from '@/components/norm-text/clause-chip';
import { VerifyButton } from './verify-button';
import { AcAsRatioCheckStatus } from './ac-as-ratio-check-status';
import { AsmMethodStatus, type AsmMethodBadgeState } from './asm-method-status';

type FieldDef = {
  id: string;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  unit: string | null;
  dataType: 'number' | 'text' | 'enum' | 'date' | 'boolean' | 'json';
  isRequired: boolean;
  enumValues:
    | Array<{ value: string; label_de: string | null; label_en: string | null }>
    | null;
  validationRules: { min?: number; max?: number; maxLength?: number; raw?: string } | null;
  clauseReference: string | null;
  verificationStatus: string;
  description: string | null;
  verifiedByLabel?: string | null;
  verifiedAt?: string | null;
  verificationNote?: string | null;
};

type Props = {
  field: FieldDef;
  locale: 'de' | 'en';
  projectId: string;
  /** Standard code (e.g. "DWA-A-138-1"). Needed to build the deep-link URL on
   * the inheritance badge so the engineer can jump to the source worksheet. */
  standardCode: string;
  sameSymbolHints?: Array<{ worksheetCode: string; value: unknown }>;
  docs: Array<{ id: string; title: string; citationLabel: string }>;
  /** True if this field is the output of an equation (auto-computed sub-total or total). */
  isComputed?: boolean;
  /** Worksheet code that this value was inherited from (no local saved value).
   * When set, the field renders a small "← [code]" hint below the label. */
  inheritedFrom?: string;
  /** Source of the initial value if not yet user-touched. Drives the small
   * badge that tells the engineer where the pre-fill came from. */
  prefillSource?: 'standard_default' | 'site_profile';
  /** Site-profile JSON key that supplied the pre-fill (when prefillSource ===
   * 'site_profile'). Shown in the tooltip so the engineer can find the source
   * entry in the project's Standortprofil. */
  siteProfileKey?: string;
  /** Optional engine card rendered directly below this field when this is an
   * equation's output symbol — keeps inputs and verdict in one place. */
  inlineEngineCard?: React.ReactNode;
  /** Optional pill rendered next to the field label — surfaces e.g. a
   * "Manueller Override" affordance when the engineer's typed value diverges
   * from the engine's computed verdict. */
  overridePill?: React.ReactNode;
  /** True when the current viewer is on the platform-engineer allowlist.
   * Gates the "Bestätigen" button next to the verification chip. */
  isPlatformEngineer?: boolean;
  /** When true, the whole field is locked (worksheet approved/final).
   * All editable controls are read-only/disabled and their onChange
   * handlers early-return without writing to the store. */
  readOnly?: boolean;
  /** Current value of the sibling `ac_as_ratio_check_reason` field. Only
   * consumed when field.symbol === 'ac_as_ratio_check' and isComputed=true,
   * where it is forwarded to AcAsRatioCheckStatus as the reason text. */
  statusReason?: string | null;
  /** Current value of the sibling `a_s_m_determination_method` field. Only
   * consumed when field.symbol is one of the A_S,m-related fields
   * (A_S_m, soil_bodenart_tab13, a_s_m_provenance). Drives read-only gating,
   * conditional visibility, and badge state. */
  asmMethod?: string | null;
  /** Current value of the sibling `a_s_m_provenance` field. Forwarded to the
   * AsmMethodStatus badge when the badge state is 'manual'. */
  asmProvenance?: string | null;
  /** Current value of the sibling `a_s_m_needs_reconfirmation` field. When
   * true, the AsmMethodStatus badge shows the amber "Typ geändert" state. */
  asmNeedsReconfirmation?: boolean | null;
};

export function DynamicField({ field, locale, projectId, standardCode, sameSymbolHints, docs, isComputed = false, inheritedFrom, prefillSource, siteProfileKey, inlineEngineCard, overridePill, isPlatformEngineer = false, readOnly = false, statusReason = null, asmMethod = null, asmProvenance = null, asmNeedsReconfirmation = null }: Props) {
  const value = useWorksheetStore((s) => s.values[field.id]);
  const citations = useWorksheetStore((s) => s.citations[field.id]) ?? [];
  const setField = useWorksheetStore((s) => s.setField);
  // The prefill badges (Norm-Default / Projekt-Standort / ← {WS}) describe the
  // ORIGIN of the rendered value. Once the engineer touches the field, the
  // value in the store is theirs — keeping the badge visible would be a lie
  // until the next save. `pendingFieldIds` tracks unsaved edits; we hide the
  // provenance hint as soon as the field appears in it. After save+refresh
  // the field falls through to Tier 1 (local param) and the prop disappears
  // entirely.
  const isDirty = useWorksheetStore((s) => s.pendingFieldIds.has(field.id));
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputId = useId();

  const label = locale === 'de' ? field.labelDe : field.labelEn ?? field.labelDe;
  const docLookup = useMemo(() => {
    const m: Record<string, { title: string; citationLabel: string }> = {};
    for (const d of docs) m[d.id] = { title: d.title, citationLabel: d.citationLabel };
    return m;
  }, [docs]);

  // `required` drives aria-required on enum/date/boolean branches (static DB flag).
  // `effectiveRequired` extends this with the dynamic a_s_m_provenance requirement;
  // it is computed after the asmProvenanceRequired block and used in the
  // text/number branches where the dynamic requirement applies.
  const required = field.isRequired || undefined;
  const isSubTotal = field.symbol.endsWith('_total');
  const isCurrency = field.unit === 'EUR';
  const min = field.validationRules?.min;
  const max = field.validationRules?.max;
  const hasRange = typeof min === 'number' || typeof max === 'number';
  const rangeHintDe = hasRange
    ? `Bereich: ${typeof min === 'number' ? formatHintNumber(min) : '−∞'} – ${typeof max === 'number' ? formatHintNumber(max) : '∞'}${field.unit ? ` ${field.unit}` : ''}`
    : null;

  // --- A_S,m determination-method gating -----------------------------------
  //
  // Three fields are conditionally visible or locked depending on the sibling
  // `a_s_m_determination_method` value (passed as `asmMethod`).
  //
  // soil_bodenart_tab13 — only shown when method='soil_estimate'
  // a_s_m_provenance    — only shown when method='manual'
  // A_S_m               — read-only UNLESS method='manual'; when manual the
  //                        provenance field is dynamically required.
  //
  // The hiding is implemented by returning null early — same pattern used for
  // other conditional fields in the sheet (rainfall_table_ref, etc.).

  if (field.symbol === 'soil_bodenart_tab13' && asmMethod !== 'soil_estimate') {
    return null;
  }
  if (field.symbol === 'a_s_m_provenance' && asmMethod !== 'manual') {
    return null;
  }

  // When method is not 'manual', A_S_m is server-derived (read-only).
  // We add this on top of the existing isComputed/readOnly path.
  const asmIsLocked = field.symbol === 'A_S_m' && asmMethod !== 'manual';

  // Provenance is required when method='manual' — surface a * indicator and
  // HTML required attribute via the dynamic flag below.
  const asmProvenanceRequired =
    field.symbol === 'a_s_m_provenance' && asmMethod === 'manual';

  // Badge state for A_S_m field:
  //   needs_reconfirmation beats everything (persisted flag from server)
  //   manual when asmMethod='manual'
  //   derived for all other methods
  const asmBadgeState: AsmMethodBadgeState | null =
    field.symbol === 'A_S_m'
      ? asmNeedsReconfirmation
        ? 'needs_reconfirmation'
        : asmMethod === 'manual'
        ? 'manual'
        : 'derived'
      : null;

  // Effective isRequired: static DB flag OR dynamic provenance requirement.
  const effectiveRequired = field.isRequired || asmProvenanceRequired;

  return (
    <div
      className={
        isSubTotal
          ? 'space-y-1.5 border-t border-hairline-strong pt-3 mt-2 -mx-2 px-2 pb-2 rounded bg-paper-2/40'
          : 'space-y-1.5'
      }
      data-symbol={field.symbol}
    >
      {/* Label + clause + unit */}
      <div>
        <label
          id={`${inputId}-label`}
          htmlFor={inputId}
          className={`text-sm ${isSubTotal ? 'font-semibold' : 'font-medium'} text-ink leading-snug block`}
        >
          {isSubTotal && <span className="mr-1.5">Σ</span>}
          {label}
          {effectiveRequired && field.dataType !== 'json' && <span className="ml-1 text-accent-2">*</span>}
        </label>
        <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5 flex items-baseline gap-1.5 flex-wrap">
          {field.clauseReference && (
            <ClauseChip clauseReference={field.clauseReference} />
          )}
          {field.unit && !isCurrency && <span className="text-ink-2">{field.unit}</span>}
          {field.verificationStatus !== 'engineer_verified' && (
            <span
              className="text-accent-2 normal-case tracking-normal"
              title={verificationStatusTitle(field.verificationStatus)}
            >
              {verificationStatusLabel(field.verificationStatus)}
            </span>
          )}
          {isPlatformEngineer && (
            <VerifyButton
              target="field"
              id={field.id}
              status={field.verificationStatus}
              verifiedByLabel={field.verifiedByLabel}
              verifiedAt={field.verifiedAt}
              verificationNote={field.verificationNote}
            />
          )}
          {inheritedFrom && !isDirty && (
            <Link
              href={`/${locale}/projects/${projectId}/standards/${standardCode}/worksheets/${inheritedFrom}`}
              className="text-subtext normal-case tracking-normal hover:text-accent transition-colors underline-offset-2 hover:underline"
              title={buildInheritedTooltip(field, value, inheritedFrom)}
            >
              ← {inheritedFrom}
            </Link>
          )}
          {prefillSource === 'standard_default' && !isDirty && (
            <span
              className="text-accent normal-case tracking-normal"
              title={buildPrefillTooltip('standard_default', field, value)}
            >
              Norm-Default
            </span>
          )}
          {prefillSource === 'site_profile' && !isDirty && (
            <span
              className="text-accent normal-case tracking-normal"
              title={buildPrefillTooltip('site_profile', field, value, siteProfileKey)}
            >
              Projekt-Standort
            </span>
          )}
          {overridePill}
        </div>
        {field.description && (
          <p className="text-xs text-subtext mt-1.5 leading-snug">{field.description}</p>
        )}
        {rangeHintDe && (
          <p className="text-[11px] text-subtext mt-0.5 tabular-nums">{rangeHintDe}</p>
        )}
      </div>

      {/* Input control by data_type */}
      {field.dataType === 'number' && (() => {
        const v = value?.type === 'number' ? value.value : null;

        // ac_as_ratio_limit is null in not_applicable / indeterminate cases.
        // Show a clear label instead of a blank number box.
        if (field.symbol === 'ac_as_ratio_limit' && isComputed && v == null) {
          return (
            <div
              data-testid="ac-as-ratio-limit-null"
              className="block w-full rounded-md border border-hairline-strong px-3 py-2 text-sm text-subtext italic bg-paper-2 cursor-default"
            >
              — (kein Tab.6-Grenzwert)
            </div>
          );
        }

        // ac_as_ratio is a raw float (e.g. 108.68382022471911). When computed/
        // read-only, display it rounded to 2 decimals in German locale so the
        // engineer sees "108,68" instead of the full mantissa. Scoped strictly
        // to this symbol — other computed numbers (k_i, etc.) keep their raw value.
        if (field.symbol === 'ac_as_ratio' && isComputed) {
          const formatted =
            v != null && Number.isFinite(v)
              ? new Intl.NumberFormat('de-DE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(v)
              : '—';
          return (
            <div
              data-testid="ac-as-ratio-display"
              className="block w-full rounded-md border border-hairline-strong px-3 py-2 text-sm tabular-nums font-semibold bg-paper-2 text-ink cursor-default"
            >
              {formatted}
            </div>
          );
        }

        // A_S_m: locked (read-only) unless the engineer selected method='manual'.
        // `asmIsLocked` is true when this is the A_S_m field AND the method is
        // not 'manual'. This is layered on top of the existing isComputed/readOnly
        // flags so that the A_S_m server-derived value is protected on all paths.
        const effectiveLocked = isComputed || readOnly || asmIsLocked;

        const inputEl = (
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            value={v == null ? '' : v}
            required={effectiveRequired}
            aria-required={effectiveRequired || undefined}
            readOnly={effectiveLocked}
            tabIndex={effectiveLocked ? -1 : undefined}
            aria-readonly={effectiveLocked || undefined}
            min={typeof min === 'number' ? min : undefined}
            max={typeof max === 'number' ? max : undefined}
            onChange={(e) => {
              if (isComputed) return;
              if (readOnly) return;
              if (asmIsLocked) return;
              const raw = e.target.value;
              setField(field.id, {
                type: 'number',
                value: raw === '' ? null : Number(raw),
              });
            }}
            className={`block w-full rounded-md border border-hairline-strong py-2 text-sm tabular-nums focus:outline-none focus:ring-0 ${isCurrency ? 'pl-8 pr-3' : 'px-3'} ${effectiveLocked ? 'bg-paper-2 text-ink font-semibold cursor-default focus:border-hairline-strong' : 'bg-transparent text-ink focus:border-accent'}`}
          />
        );

        // A_S_m field: render the method-status badge directly below the input.
        if (asmBadgeState !== null) {
          const wrappedInput = isCurrency ? (
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext pointer-events-none select-none"
              >
                €
              </span>
              {inputEl}
            </div>
          ) : (
            inputEl
          );
          return (
            <div className="space-y-2">
              {wrappedInput}
              <AsmMethodStatus
                state={asmBadgeState}
                derivedMethod={asmMethod ?? undefined}
                provenance={asmProvenance ?? undefined}
              />
            </div>
          );
        }

        return isCurrency ? (
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext pointer-events-none select-none"
            >
              €
            </span>
            {inputEl}
          </div>
        ) : (
          inputEl
        );
      })()}

      {field.dataType === 'text' && (() => {
        const v = value?.type === 'text' ? value.value : null;

        // ac_as_ratio_check is a T3-materialized status field. When computed,
        // replace the raw read-only text input with the four-state badge.
        if (field.symbol === 'ac_as_ratio_check' && isComputed) {
          const status = v ?? 'indeterminate';
          return (
            <AcAsRatioCheckStatus
              status={status}
              reason={statusReason ?? null}
            />
          );
        }

        const maxLength = field.validationRules?.maxLength;
        const useTextarea = (maxLength ?? 0) > 200;
        const textLocked = isComputed || readOnly;

        // a_s_m_provenance: when method='manual' this field is required.
        // Surface a German validation message via the title attribute so the
        // browser's built-in constraint UI shows the correct text.
        const provenanceRequiredTitle =
          asmProvenanceRequired && !v
            ? 'Herkunftsangabe erforderlich'
            : undefined;

        return useTextarea ? (
          <textarea
            id={inputId}
            value={v ?? ''}
            required={effectiveRequired}
            aria-required={effectiveRequired || undefined}
            readOnly={textLocked}
            tabIndex={textLocked ? -1 : undefined}
            aria-readonly={textLocked || undefined}
            title={provenanceRequiredTitle}
            onChange={(e) => {
              if (isComputed) return;
              if (readOnly) return;
              setField(field.id, { type: 'text', value: e.target.value || null });
            }}
            rows={4}
            className={`block w-full rounded-md border border-hairline-strong px-3 py-2 text-sm text-ink focus:outline-none focus:ring-0 ${textLocked ? 'bg-paper-2 cursor-default focus:border-hairline-strong' : 'bg-transparent focus:border-accent'}`}
          />
        ) : (
          <>
            <input
              id={inputId}
              type="text"
              value={v ?? ''}
              required={effectiveRequired}
              aria-required={effectiveRequired || undefined}
              readOnly={textLocked}
              tabIndex={textLocked ? -1 : undefined}
              aria-readonly={textLocked || undefined}
              title={provenanceRequiredTitle}
              onChange={(e) => {
                if (isComputed) return;
                if (readOnly) return;
                setField(field.id, { type: 'text', value: e.target.value || null });
              }}
              className={`block w-full rounded-md border border-hairline-strong px-3 py-2 text-sm text-ink focus:outline-none focus:ring-0 ${textLocked ? 'bg-paper-2 cursor-default focus:border-hairline-strong' : 'bg-transparent focus:border-accent'}`}
            />
            {asmProvenanceRequired && !v && (
              <p className="text-xs text-error mt-0.5">Herkunftsangabe erforderlich</p>
            )}
          </>
        );
      })()}

      {field.dataType === 'enum' && (() => {
        const v = value?.type === 'enum' ? value.value : null;
        const options = field.enumValues ?? [];
        // G2 (Finding G2a/b): a derived/computed enum (e.g. recommended_phase_4_gate)
        // is a READ-ONLY recommendation, not an editable verdict. It must not be a
        // click-target (the #15b adjacency: selecting FAIL on it = no dirty → no save,
        // which the user mistook for "my FAIL didn't persist"). Lock it (no onChange,
        // disabled) and mark it visually distinct from the editable verdict beside it.
        const enumLocked = isComputed || readOnly;
        const isReadOnlyRecommendation = isComputed && !readOnly;
        if (options.length === 0) {
          // The field is an enum but its allowed values are not configured
          // (enum_values NULL/empty in the DB). The correct values are unknown
          // and must NOT be fabricated, so render no selectable control — but
          // surface the gap with a visible, non-interactive notice instead of
          // a silent, empty widget the engineer cannot use.
          return (
            <div
              role="status"
              data-testid="enum-no-options"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
              {locale === 'de'
                ? 'Keine Auswahloptionen hinterlegt — dieses Feld ist noch nicht konfiguriert und kann derzeit nicht ausgefüllt werden.'
                : 'No selectable options configured — this field is not yet set up and cannot be filled in.'}
            </div>
          );
        }
        if (options.length <= 4) {
          return (
            <div
              role="radiogroup"
              aria-labelledby={`${inputId}-label`}
              aria-required={required}
              // G2b marker: a stable, fingerprint-able signal that this enum is a
              // locked read-only recommendation (distinct from the editable verdict).
              data-readonly-recommendation={isReadOnlyRecommendation || undefined}
            >
              {isReadOnlyRecommendation && (
                <span
                  data-testid="readonly-recommendation-lock"
                  className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-subtext"
                >
                  <span aria-hidden="true">🔒</span>
                  {locale === 'de' ? 'Empfehlung (schreibgeschützt)' : 'Recommendation (read-only)'}
                </span>
              )}
              <SegmentedControl
                value={v ?? options[0]?.value ?? ''}
                onChange={(val) => {
                  if (enumLocked) return;
                  setField(field.id, { type: 'enum', value: val });
                }}
                options={options.map((o) => ({
                  value: o.value,
                  label: pickEnumLabel(o, locale),
                }))}
                disabled={enumLocked}
              />
            </div>
          );
        }
        return (
          <Select
            id={inputId}
            value={v ?? ''}
            required={field.isRequired}
            disabled={enumLocked}
            data-readonly-recommendation={isReadOnlyRecommendation || undefined}
            onChange={(e) => {
              if (enumLocked) return;
              setField(field.id, { type: 'enum', value: e.target.value || null });
            }}
          >
            <option value="">—</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {pickEnumLabel(o, locale)}
              </option>
            ))}
          </Select>
        );
      })()}

      {field.dataType === 'date' && (() => {
        const v = value?.type === 'date' ? value.value : null;
        return (
          <input
            id={inputId}
            type="date"
            value={v ?? ''}
            required={field.isRequired}
            aria-required={required}
            readOnly={readOnly}
            aria-readonly={readOnly || undefined}
            onChange={(e) => {
              if (readOnly) return;
              setField(field.id, { type: 'date', value: e.target.value || null });
            }}
            className={`block w-full rounded-md border border-hairline-strong px-3 py-2 text-sm text-ink focus:outline-none focus:ring-0 ${readOnly ? 'bg-paper-2 cursor-default focus:border-hairline-strong' : 'bg-transparent focus:border-accent'}`}
          />
        );
      })()}

      {field.dataType === 'boolean' && (() => {
        const v = value?.type === 'boolean' ? value.value : null;
        return (
          <div role="radiogroup" aria-labelledby={`${inputId}-label`} aria-required={required}>
            <SegmentedControl
              value={v === true ? 'true' : v === false ? 'false' : ''}
              onChange={(val) => {
                if (readOnly) return;
                setField(field.id, { type: 'boolean', value: val === 'true' });
              }}
              options={[
                { value: 'true', label: 'Ja' },
                { value: 'false', label: 'Nein' },
              ]}
              disabled={readOnly}
            />
          </div>
        );
      })()}

      {field.dataType === 'json' && (
        <div
          aria-disabled="true"
          className="rounded-md border border-hairline-strong bg-paper-2/40 px-3 py-2 text-sm text-subtext italic cursor-not-allowed"
          title="Mehrzeilige Eingabe — Phase 2"
        >
          Mehrzeilige Eingabe — Phase 2
        </div>
      )}

      {/* Same-symbol hint (cross-worksheet) — only shown when the value was
          NOT auto-inherited (i.e. engineer has their own local value). When
          inherited, the small "← code" badge above already communicates the
          source, and the value already matches upstream, so the Übernehmen
          button would be a no-op. */}
      {!inheritedFrom && sameSymbolHints && sameSymbolHints.length > 0 && (
        <div className="text-xs text-subtext">
          Bereits in {sameSymbolHints.map((h) => h.worksheetCode).join(', ')}:
          {' '}
          {sameSymbolHints.map((h) => String(h.value)).join(', ')}{' '}
          <button
            type="button"
            className="text-xs text-accent-2 px-1.5 py-0.5 rounded hover:bg-accent-2/10 transition-colors"
            onClick={() => copyFirstHint(field, sameSymbolHints[0].value)}
          >
            Übernehmen
          </button>
        </div>
      )}

      {/* Citation chips (0…n) */}
      <CitationChips
        citations={citations}
        docs={docLookup}
        projectId={projectId}
        fieldId={field.id}
        onAdd={() => setPickerOpen(true)}
      />
      <CitationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        projectId={projectId}
        fieldId={field.id}
        symbol={field.symbol}
        docs={docs}
      />

      {inlineEngineCard}
    </div>
  );
}

const VERIFICATION_LABELS_DE: Record<string, { short: string; title: string }> = {
  imported_unverified: {
    short: 'Quelle ungeprüft',
    title: 'Aus Pass3c-Workbook importiert, noch nicht gegen die Norm geprüft.',
  },
  engineer_verified: {
    short: 'Ingenieur bestätigt',
    title: 'Von einem Ingenieur gegen die Quellnorm bestätigt.',
  },
  verified_against_standard: {
    short: 'Quelle bestätigt',
    title: 'Inhalt wurde gegen die Quellnorm verifiziert (Pile-Audit).',
  },
  needs_engineer_review: {
    short: 'Engineer-Review nötig',
    title: 'Quellebenenfrage offen — Ingenieur muss prüfen.',
  },
  inferred_from_worksheet: {
    short: 'Wizard-intern',
    title: 'Aus Wizard-Logik abgeleitet, nicht direkt in der Norm.',
  },
};

function verificationStatusLabel(status: string): string {
  return VERIFICATION_LABELS_DE[status]?.short ?? status;
}

function verificationStatusTitle(status: string): string {
  return VERIFICATION_LABELS_DE[status]?.title ?? status;
}

function formatHintNumber(n: number): string {
  if (Math.abs(n) !== 0 && (Math.abs(n) < 0.01 || Math.abs(n) >= 100000)) {
    return n.toExponential(0);
  }
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(n);
}

type StoreValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown }
  | undefined;

function formatProvenanceValue(value: StoreValue, unit: string | null): string {
  if (!value) return '—';
  switch (value.type) {
    case 'number':
      if (value.value == null) return '—';
      return `${formatHintNumber(value.value)}${unit ? ` ${unit}` : ''}`;
    case 'text':
    case 'enum':
    case 'date':
      return value.value ?? '—';
    case 'boolean':
      if (value.value == null) return '—';
      return value.value ? 'Ja' : 'Nein';
    case 'json':
      return '(Tabelle)';
  }
}

function buildInheritedTooltip(
  field: { symbol: string; unit: string | null },
  value: StoreValue,
  fromWorksheetCode: string,
): string {
  const formatted = formatProvenanceValue(value, field.unit);
  return `${field.symbol} = ${formatted} aus ${fromWorksheetCode} — klicken zum Springen, oder überschreiben durch Eingabe`;
}

function buildPrefillTooltip(
  source: 'standard_default' | 'site_profile',
  field: { symbol: string; unit: string | null },
  value: StoreValue,
  siteProfileKey?: string,
): string {
  const formatted = formatProvenanceValue(value, field.unit);
  if (source === 'standard_default') {
    return `${field.symbol} = ${formatted} — Norm-Default. Bestätigen oder überschreiben.`;
  }
  const keyPart = siteProfileKey ? ` (Schlüssel: ${siteProfileKey})` : '';
  return `${field.symbol} = ${formatted} aus Projekt-Standortprofil${keyPart} — bestätigen oder überschreiben.`;
}

function pickEnumLabel(
  o: { value: string; label_de: string | null; label_en: string | null },
  locale: 'de' | 'en',
): string {
  if (locale === 'de') return o.label_de ?? o.label_en ?? o.value;
  return o.label_en ?? o.label_de ?? o.value;
}

function copyFirstHint(
  field: FieldDef,
  value: unknown,
): void {
  const setFieldReal = useWorksheetStore.getState().setField;
  switch (field.dataType) {
    case 'number':
      setFieldReal(field.id, { type: 'number', value: value == null ? null : Number(value) });
      break;
    case 'text':
      setFieldReal(field.id, { type: 'text', value: value == null ? null : String(value) });
      break;
    case 'enum':
      setFieldReal(field.id, { type: 'enum', value: value == null ? null : String(value) });
      break;
    case 'date':
      setFieldReal(field.id, { type: 'date', value: value == null ? null : String(value) });
      break;
    case 'boolean':
      // Boolean(value) treats the string "false" as truthy; explicitly parse
      // string-encoded booleans (sameSymbolHints may carry them through the
      // jsonb round-trip) so the copied value matches what the engineer saw
      // on the originating worksheet.
      setFieldReal(field.id, {
        type: 'boolean',
        value:
          value === true ||
          (typeof value === 'string' && value.toLowerCase() === 'true'),
      });
      break;
    case 'json':
      setFieldReal(field.id, { type: 'json', value });
      break;
  }
}
