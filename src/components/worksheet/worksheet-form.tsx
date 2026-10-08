'use client';
import Link from 'next/link';
import { isValidElement, memo, useEffect, useMemo, useRef, useState } from 'react';
import { useWorksheetStore, type FieldValue } from '@/lib/state/worksheet-store';
import { saveWorksheet } from '@/lib/actions/worksheet';
import { DynamicField } from './dynamic-field';
import { SectionGroup } from './section-group';
import { EquationsBlock } from './equations-block';
import { ComplianceBlock } from './compliance-block';
import { ApprovalBar } from './approval-bar';
import { RationalePanel } from './rationale-panel';
import { EquationEngineCard } from './equation-engine-card';
import {
  ManualOverridePill,
  useManualOverride,
} from './manual-override-pill';
import { facilityReturnPeriod } from '@/lib/eval/rainfall-tables';
import { DesignWindowPanel } from './design-window-panel';
import { FeasibilityTablePanel } from './feasibility-table-panel';
import { GuidelineTablePanel } from './guideline-table-panel';
import { designWindowInputs, tab3Inputs, guidelineTableInputs, sitePortalFieldIds } from './panel-inputs';
import { SitePortalLinks } from './site-portal-links';
import { SurfaceSourceBanner } from './surface-source-banner';
import { carrierSourceState, groupSourceBanners } from '@/lib/eval/carrier-source-state';
import { registerTables, type RegulationTable } from '@/lib/eval/regulation-tables';
import { SourceFormReferencePanel } from '@/components/form-templates/SourceFormReferencePanel';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { equationProfiles } from '@/lib/eval/equation-profiles';
import { withFallbackRegisterEquations, resolveRegisterConfig, registerFlagKeys } from '@/lib/eval/register-configs';
import { renderWidget, widgetPlacement, type WorksheetFormField, type WidgetContext } from './widgets';
import { ReadOnlyRegisterTable, registerPlacement } from './register-editor';
import { visibleFields } from './visible-fields';
import { splitInheritedForPanel, upstreamPanelStorageKey } from './inherited-panel';
import { makeSymbolLookup } from '@/lib/compliance/symbol-lookup';
import { computeVisibility } from '@/lib/compliance/visibility';
import { gateHiddenSymbols } from '@/lib/projects/required-field-counts';
import { staleConfirmCandidates } from './stale-confirm';
import { allOwnFieldsHidden, hiddenSheetDrivers } from '@/lib/compliance/hidden-drivers';
import { isWorksheetEditable, type WorksheetStatus } from '@/lib/state-machine';
import { composeEngineSuppressedSymbols } from '@/lib/eval/asm-source';
import { computeComputedSymbols } from '@/lib/eval/computed-symbols';
import { formatNumberDe } from '@/lib/format-number-de';

// Derived symbols that the materialize pipeline writes on every A138-13 save.
// They are NOT live formula-engine outputs, but share the same single-source
// invariant: the governing-duration iteration is authoritative and the engineer
// must not overwrite these values. `fieldBySymbol.has(sym)` inside
// computedSymbols guards against false positives on other standards.
const BASIN_GOVERNING_SYMBOLS = new Set(['r_D_n', 'D_min']);

// Derived symbols materialized by the Tab.6 loading-check engine on every
// A138-12 save (T3 materialize pass). Read-only for the same reason:
// single-source from the materialize, not hand-editable.
// `fieldBySymbol.has(sym)` means these are harmless on all other standards.
const LOADING_CHECK_SYMBOLS = new Set([
  'ac_as_ratio',
  'ac_as_ratio_limit',
  'ac_as_ratio_check',
  'ac_as_ratio_check_reason',
]);

// Finding G2a — A138-23 has NO equations → computeComputedSymbols returns ∅ →
// recommended_phase_4_gate (a DERIVED engine-written enum) would render as a normal
// EDITABLE SegmentedControl, visually identical to the editable phase_4_gate_result
// verdict beside it (the #15b adjacency; selecting FAIL on it = no dirty → no save).
// Mark it read-only here (same shape as BASIN_GOVERNING_SYMBOLS / LOADING_CHECK_SYMBOLS)
// so DynamicField locks it + labels it as a recommendation. phase_4_gate_result stays
// EDITABLE (it is the engineer-entered verdict, D3 rider). `fieldBySymbol.has(sym)`
// keeps this harmless on every other worksheet/standard.
const PHASE4_READONLY_SYMBOLS = new Set(['recommended_phase_4_gate']);

// ---------------------------------------------------------------------------
// Render-churn control (FLL register stall, 2026-09-30).
//
// The form subscribes to the whole `values` map, so EVERY store write (each
// register keystroke, each engine write-back, each server `derived` apply)
// re-renders it. What must NOT follow it down the tree: the ~N DynamicFields
// whose props did not change, the engine cards (KaTeX) whose verdict did not
// change, the equations block, the compliance/approval/rationale panels.
// Everything below keeps those subtrees on `memo` with reference-stable props.
// ---------------------------------------------------------------------------

/** The card element a DynamicField receives as `inlineEngineCard`. A flat
 * component (no wrapper `<div>` around the element) so the element's props
 * ARE the card's props and `elementPropsEqual` below can compare them. */
function EngineCardSlot(props: Parameters<typeof EquationEngineCard>[0]) {
  return (
    <div className="mt-3">
      <EquationEngineCard {...props} />
    </div>
  );
}

/** Structural equality for plain data (an EvalState: primitives, arrays,
 * plain objects — no functions, no cycles). Kept LOCAL (not imported from
 * equation-engine-card, which carries the same rule for its own memo) because
 * a number of render tests mock that module with only the component export. */
function deepEqualPlain(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    if (a.length !== bb.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqualPlain(a[i], bb[i])) return false;
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ka = Object.keys(ao);
  if (ka.length !== Object.keys(bo).length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
    if (!deepEqualPlain(ao[k], bo[k])) return false;
  }
  return true;
}

/** Two React elements are "the same" when they have the same type and equal
 * props — every prop by reference, `state` (the engine's EvalState) by
 * structure. Used for the two element-valued props of DynamicField, whose
 * elements are rebuilt whenever the engine hook emits a fresh states record —
 * i.e. on every store write — while their props rarely move. */
function elementPropsEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (!isValidElement(a) || !isValidElement(b)) return false;
  if (a.type !== b.type || a.key !== b.key) return false;
  const pa = a.props as Record<string, unknown>;
  const pb = b.props as Record<string, unknown>;
  const keys = new Set([...Object.keys(pa), ...Object.keys(pb)]);
  for (const k of keys) {
    if (k === 'state' ? !deepEqualPlain(pa[k], pb[k]) : !Object.is(pa[k], pb[k])) return false;
  }
  return true;
}

/** DynamicField comparator: shallow on everything except the two element
 * props, which compare by (type, props). All other props the form passes are
 * primitives or references memoised on their real inputs (see the per-field
 * maps below), so this is exact — a parent re-render caused by an unrelated
 * store write is a no-op for the field. `DynamicField` still re-renders on
 * ITS OWN value / citations / pending change through its own store
 * selectors — that is the intended path. */
function dynamicFieldPropsEqual(
  prev: Readonly<Record<string, unknown>>,
  next: Readonly<Record<string, unknown>>,
): boolean {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const k of keys) {
    const a = prev[k];
    const b = next[k];
    if (k === 'inlineEngineCard' || k === 'overridePill') {
      if (!elementPropsEqual(a, b)) return false;
    } else if (!Object.is(a, b)) {
      return false;
    }
  }
  return true;
}

/** Memoised children (see dynamicFieldPropsEqual; the others take primitives
 * or props memoised in the form, so React's default shallow compare is exact). */
const MemoDynamicField = memo(
  DynamicField,
  dynamicFieldPropsEqual as (prev: Readonly<Parameters<typeof DynamicField>[0]>, next: Readonly<Parameters<typeof DynamicField>[0]>) => boolean,
);
const MemoEquationsBlock = memo(EquationsBlock);
const MemoComplianceBlock = memo(ComplianceBlock);
const MemoRationalePanel = memo(RationalePanel);
const MemoApprovalBar = memo(ApprovalBar);
const MemoSourceFormReferencePanel = memo(SourceFormReferencePanel);

/** Reads its own slice of the store so the save-status transitions
 * (idle → saving → saved → idle, three store writes per autosave) re-render
 * this one span and not the whole form. */
function SaveIndicator() {
  const status = useWorksheetStore((s) => s.saveStatus);
  if (status === 'idle') return null;
  if (status === 'saving') {
    return (
      <span className="text-xs text-subtext inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block w-3 h-3 rounded-full border border-subtext border-t-transparent animate-spin"
        />
        Wird gespeichert…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span
        className="text-xs text-success inline-flex items-center gap-1"
        style={{ animation: 'fadeOut 3s ease-out forwards' }}
      >
        Gespeichert ✓
      </span>
    );
  }
  return (
    <span className="text-xs text-error bg-error/10 px-2 py-0.5 rounded">
      ✗ Speichern fehlgeschlagen
    </span>
  );
}

/** Same reasoning as SaveIndicator: `lastWarnings` is written on every flush
 * (cleared at start, set at end) — own subscription, not the form's. */
function SaveWarningsBanner() {
  const lastWarnings = useWorksheetStore((s) => s.lastWarnings);
  if (lastWarnings.length === 0) return null;
  return (
    <div
      role="alert"
      data-testid="save-warnings-banner"
      className="border border-warning/40 rounded p-3 text-sm bg-warning/8 text-ink space-y-1"
    >
      {lastWarnings.map((w, i) => (
        <p key={i} className="flex gap-2">
          <span aria-hidden="true" className="shrink-0 text-warning">⚠</span>
          {w}
        </p>
      ))}
    </div>
  );
}

// WorksheetForm needs sectionId + orderIndex + active on top of what
// DynamicField requires. `active=false` fields are hidden from rendering
// but kept in the store/queries so saved values aren't lost.
// `inheritedFromWorksheet` set ⇒ this field belongs to an upstream worksheet
// that declared the current worksheet a consumer; we show it in a separate
// "Vorgelagerte Werte" panel and feed it to the engine, but don't render
// an editable input here (engineer edits on the origin worksheet).
// Plan 2b (Task 3): the row type lives in widgets.tsx (the registry consumes it).
export type { WorksheetFormField };
type FieldDef = WorksheetFormField;

/** Display value of a field as the upstream panel shows it (number de-DE, enum label, Ja/Nein (EN Yes/No), text, "(Tabelle)" (EN "(table)"),
 * "—" when empty). Shared by the inherited-values panel and the U-5 all-hidden notice. */
function formatPanelValue(f: FieldDef, v: FieldValue | undefined, locale: 'de' | 'en'): string {
  if (v?.type === 'number' && v.value != null && Number.isFinite(v.value)) return formatNumberDe(v.value);
  if (v?.type === 'json' && v.value && typeof v.value === 'object') return locale === 'en' ? '(table)' : '(Tabelle)';
  if (v?.type === 'enum' && v.value != null) {
    if (f.enumValues) {
      const entry = f.enumValues.find((e) => e.value === v.value);
      const label = locale === 'de' ? entry?.label_de : entry?.label_en;
      return label ?? String(v.value);
    }
    return String(v.value);
  }
  if (v?.type === 'boolean' && v.value != null) return locale === 'en' ? (v.value ? 'Yes' : 'No') : v.value ? 'Ja' : 'Nein';
  if (v?.type === 'text' && v.value) return v.value;
  return '—';
}

type Section = Parameters<typeof SectionGroup>[0]['section'];

type Props = {
  locale: 'de' | 'en';
  projectId: string;
  worksheet: {
    template: { code: string; titleDe: string; titleEn: string | null };
  };
  instance: {
    id: string;
    status: 'draft' | 'submitted_for_review' | 'engineer_approved' | 'final' | 'deactivated';
  };
  sections: Section[];
  fields: FieldDef[];
  equations: Parameters<typeof EquationsBlock>[0]['equations'];
  complianceRequirements: Parameters<typeof ComplianceBlock>[0]['requirements'];
  complianceSuggestions: Parameters<typeof ComplianceBlock>[0]['suggestions'];
  initialValues: Record<string, FieldValue>;
  initialSources: Record<string, { docId: string; page?: number; note?: string } | null>;
  initialCitations: Record<string, Array<{ id: string; docId: string; page: number | null; note: string | null }>>;
  sameSymbolValuesBySymbol: Record<string, Array<{ worksheetCode: string; value: unknown; viaSymbol?: string }>>;
  /** symbol → worksheet code from which the initial value was inherited (no
   * local saved value existed). Used to render the "← [code]" hint. */
  inheritedFromBySymbol: Record<string, string>;
  /** symbol → list of producing worksheet codes when an inherited symbol is
   * ambiguous (>1 active producing field for the same symbol). The engine
   * returns manual_required for any equation consuming an ambiguous symbol. */
  ambiguousSymbols?: Record<string, string[]>;
  /** field_id → source of the initial value when it came from a render-only
   * pre-fill (norm default or project site profile). Lets the field display
   * a small "Norm-Default" / "Projekt-Standort" badge until the engineer
   * touches the value. */
  prefillSourceByFieldId?: Record<string, 'standard_default' | 'site_profile' | 'twin'>;
  /** field_id → upstream worksheet + symbol that supplied a TWIN pre-fill (same
   * quantity under another symbol, TWIN_SYMBOLS). Drives the badge and the
   * "Alle Vorbefüllungen übernehmen" bar. */
  twinSourceByFieldId?: Record<string, { worksheetCode: string; symbol: string; standardCode?: string }>;
  /** field_id → note for a value carried over the cross-standard allow-list (src/lib/projects/cross-standard-carry.ts), e.g.
   * "taken from DWA-M 820-1 (M820-06 / M820-07)". Shown under the field's editor while the carried value is untouched; the
   * first edit overwrites it with an own value. */
  carriedNoteByFieldId?: Record<string, string>;
  /** field_id → site-profile JSON key that supplied the pre-fill. Only set
   * for fields where prefillSourceByFieldId is 'site_profile'. Shown in the
   * field's tooltip so the engineer can find the source entry. */
  siteProfileKeyByFieldId?: Record<string, string>;
  /** field_id → persisted project_parameters.client_supplied flag
   * ("Kundenangabe" — value delivered by the client, AGB input-error
   * carve-out). Only true entries need to be present. */
  clientSuppliedByFieldId?: Record<string, boolean>;
  /** U-1 (ruling R-12): field_id → persisted project_parameters.is_stale — the value was last saved while the
   * question was hidden by `visible_when` (or not re-saved since). Only true entries need to be present. */
  staleByFieldId?: Record<string, boolean>;
  /** R-16: symbols hidden on their SOURCE sheet for this sheet (the approval gate's set). Unioned into the compliance
   * block's hiddenSymbols (minus this sheet's own fields) so a gate reading such a leftover shows „–" as the gate decides. */
  hiddenAtSourceSymbols?: string[];
  /** Standard code (e.g. "DWA-A-138-1"). Forwarded to DynamicField so the
   * inheritance badge can deep-link back to the source worksheet. */
  standardCode: string;
  docs: Array<{ id: string; title: string; citationLabel: string }>;
  /** Number of calculation snapshots that exist for this instance — drives
   * the "Änderungen seit letzter Version" affordance in the approval bar. */
  priorSnapshotCount?: number;
  /** Pre-built href to the diff page; passed through to ApprovalBar so the
   * client doesn't need to know the route shape. */
  diffHref?: string;
  /** True when the current viewer is on the platform-engineer allowlist.
   * Gates the "Bestätigen" buttons on every field/equation. */
  isPlatformEngineer?: boolean;
  /** Register carriers this worksheet CONSUMES from an owner worksheet (e.g.
   * the A138-07 surface inventory consumed on A138-10): the owner instance status + the
   * stored carrier + the OWNER field's `{ widget, uiConfig }` (I-3: the config is
   * resolved from that DB row first, the symbol-keyed TS fallback second). Each
   * renders an upstream-cause banner (carrierSourceState under the register's own
   * config) and a read-only mirror table at the bottom. Empty/undefined when this
   * worksheet owns every register. Loaded by `loadRegisterSources` (queries/worksheet.ts). */
  registerSources?: Array<{ symbol: string; ownerCode: string; status: string; carrier: unknown; widget?: string | null; uiConfig?: unknown; producedSymbols?: string[]; isRequired?: boolean | null; labelDe?: string | null; labelEn?: string | null }>;
  /** Field ids whose persisted project_parameters row was written by a
   * SERVER-side engine (source_type='computed', e.g. the VSME CO₂ engine;
   * plus VSME 'derived' rows like the B04 per-medium sums). These render
   * read-only with a provenance hint — single-source rule: derived values
   * are never re-entered by hand. */
  serverComputedFieldIds?: string[];
  /** Regulation reference tables (Tab.9/5/6/13 etc.) for this standard, loaded
   * server-side from `regulation_tables`/`regulation_table_rows`. Registered
   * into the eval-layer registry (registerTables()) on mount so the tab9/
   * tab6-loading accessors read the DB-backed values; undefined/empty leaves
   * the registry empty and accessors fall back to their TS constants. */
  regulationTables?: RegulationTable[];
};

/** VSME-B03.200 symbols written by recomputeB3Co2 (kept in sync with
 * OUTPUT_SYMBOLS in src/lib/actions/co2.ts — not imported because that
 * module is 'use server'). Drives the CO₂-table provenance hint. */
const VSME_CO2_ENGINE_SYMBOLS = new Set([
  'GrossScope1GreenhouseGasEmissions',
  'GrossLocationBasedScope2GreenhouseGasEmissions',
  'TotalGrossLocationBasedScope1AndScope2GHGEmissions',
]);

export function WorksheetForm({
  locale,
  projectId,
  worksheet,
  instance,
  sections,
  fields,
  equations,
  complianceRequirements,
  complianceSuggestions,
  initialValues,
  initialSources,
  initialCitations,
  sameSymbolValuesBySymbol,
  inheritedFromBySymbol,
  ambiguousSymbols,
  prefillSourceByFieldId,
  siteProfileKeyByFieldId,
  twinSourceByFieldId,
  carriedNoteByFieldId,
  clientSuppliedByFieldId,
  staleByFieldId,
  hiddenAtSourceSymbols,
  standardCode,
  docs,
  priorSnapshotCount,
  diffHref,
  isPlatformEngineer = false,
  registerSources,
  serverComputedFieldIds,
  regulationTables,
}: Props) {
  // Register server-loaded regulation tables into the eval-layer registry
  // BEFORE any hook or child that could read the tab9/tab6-loading accessors
  // (e.g. the register editors' TAB9 lookups in the bottom strip). useMemo runs
  // synchronously during render, so this must be the first thing after the
  // props are destructured — no effect delay, no flash of TS-fallback data.
  useMemo(() => {
    if (regulationTables?.length) registerTables(regulationTables);
    return null;
  }, [regulationTables]);

  const init = useWorksheetStore((s) => s.init);
  const flush = useWorksheetStore((s) => s.flush);
  const setField = useWorksheetStore((s) => s.setField);
  const values = useWorksheetStore((s) => s.values);
  // saveStatus / lastWarnings are read by <SaveIndicator/> and
  // <SaveWarningsBanner/> through their own selectors — not here, so the
  // three status writes per autosave do not re-render the whole form.
  const pendingFieldIds = useWorksheetStore((s) => s.pendingFieldIds);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locked = !isWorksheetEditable(instance.status as WorksheetStatus);

  // Initialize the store ONCE per instance change.
  // We intentionally omit initialValues/initialSources from the dependency array —
  // they are new object references on every router.refresh() but contain the same
  // data, and re-running init would wipe unsaved in-flight edits.
  useEffect(() => {
    init(
      instance.id,
      initialValues as Record<string, FieldValue>,
      initialSources as Record<string, { docId: string; page?: number; note?: string } | null>,
      initialCitations,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init, instance.id]);

  // Debounced auto-save
  useEffect(() => {
    if (locked) return;
    if (pendingFieldIds.size === 0) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void flush(saveWorksheet);
    }, 1000);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [locked, pendingFieldIds, flush]);

  // Equations sorted by equation_number — generator emits sub-totals before
  // grand totals (e.g. KG3-01…KG3-09 → KG3-10), so a single forward pass
  // computes everything in dependency order.
  const sortedEquations = useMemo(
    () => [...equations].sort((a, b) => (a.equationNumber ?? '').localeCompare(b.equationNumber ?? '')),
    [equations],
  );

  // Σ badge signal (fix wave 2026-09-30): a field is a genuine sum only when it is the output of an
  // equation whose right-hand side starts with sum_rows( / sum( — never inferred from a `_total`
  // suffix in the symbol (P_total is a concentration, not a sum).
  const sumOutputSymbols = useMemo(() => {
    const s = new Set<string>();
    for (const eq of equations) {
      const rhs = (eq.formula ?? '').split('=').slice(1).join('=').trim();
      if (eq.outputSymbol && /^sum(_rows)?\(/.test(rhs)) s.add(eq.outputSymbol);
    }
    return s;
  }, [equations]);

  const fieldBySymbol = useMemo(() => {
    const m = new Map<string, FieldDef>();
    for (const f of fields) m.set(f.symbol, f);
    return m;
  }, [fields]);

  // HOME SIGNAL (fix-wave 2): the reliable "this symbol's home is elsewhere"
  // signal is the FIELD being inherited — `field.inheritedFromWorksheet` — NOT
  // inheritedFromBySymbol. On A138-17 the A_S_m field is an INJECTED inherited
  // field (inheritedFromWorksheet='A138-12') that ALSO has a project_parameters
  // row by field-id, so the page's initialValues loop resolves it as a "local
  // param" (step 1) and NEVER sets inheritedFromBySymbol['A_S_m']. Keying the
  // home-boundary suppression / render exclusion on inheritedFromBySymbol alone
  // is therefore a no-op for the exact symbol we must protect. We UNION the
  // field-derived homes over inheritedFromBySymbol and feed the union to BOTH
  // home-boundary consumers (composeEngineSuppressedSymbols and
  // computeComputedSymbols). Field homes win on collision (they are the direct
  // field-level truth); non-inherited own fields never add an entry so the
  // home!==current filter inside the helpers leaves owners unsuppressed.
  const inheritedHomeBySymbol = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = { ...inheritedFromBySymbol };
    for (const f of fields) {
      if (f.inheritedFromWorksheet) m[f.symbol] = f.inheritedFromWorksheet;
    }
    return m;
  }, [inheritedFromBySymbol, fields]);

  // Symbols that are equation outputs — the engine writes them; they must not
  // be hand-editable (isComputed=true in DynamicField).
  // BASIN_GOVERNING_SYMBOLS (r_D_n, D_min) are NOT equation outputs in the
  // formula engine (they are persisted by materializeBasinGoverning on save),
  // but they share the same single-source invariant: the value is authoritative
  // from the governing-duration iteration and must not be overwritten by the
  // engineer. We add them to computedSymbols here so DynamicField renders them
  // with the same readOnly treatment as formula-engine outputs (bg-paper-2,
  // cursor-default, tabIndex=-1). No new abstraction — same prop, same render.
  //
  // LOADING_CHECK_SYMBOLS (ac_as_ratio, ac_as_ratio_limit, ac_as_ratio_check,
  // ac_as_ratio_check_reason) are T3-materialized by the Tab.6 loading-check
  // engine on every A138-12 save. They must be read-only for the same reason
  // as BASIN_GOVERNING_SYMBOLS: single-source from the materialize pass, not
  // hand-editable. The gating `fieldBySymbol.has(sym)` ensures these entries
  // are harmless on every other standard where the symbols don't exist.
  // Finding E (home-exclusion): a local equation output whose value is INHERITED
  // from a different worksheet (its home) must NOT render as a local computed
  // output — it renders the inherited value, not a blank client-engine card.
  // computeComputedSymbols folds in the two materialized-derived extra symbol
  // groups (BASIN_GOVERNING / LOADING_CHECK) byte-identically to the previous
  // inline union, and applies the same fieldBySymbol.has() gate, EXCEPT it now
  // drops any symbol whose home (inheritedFromBySymbol) is elsewhere. The engine
  // write-back for those symbols is already suppressed via
  // composeEngineSuppressedSymbols so the inherited store value survives.
  const computedSymbols = useMemo(
    () =>
      computeComputedSymbols(sortedEquations, inheritedHomeBySymbol, {
        hasField: (sym) => fieldBySymbol.has(sym),
        extraSymbols: [...BASIN_GOVERNING_SYMBOLS, ...LOADING_CHECK_SYMBOLS, ...PHASE4_READONLY_SYMBOLS],
      }),
    [sortedEquations, fieldBySymbol, inheritedHomeBySymbol],
  );

  // Resolve the A_S,m determination-method BEFORE wiring the engine so the
  // suppress-write-back set is in scope at the useEquationEngine call site
  // (fieldBySymbol and values are both defined above).
  // On all worksheets other than A138-12 the `a_s_m_determination_method`
  // symbol is absent, asmMethod resolves to null, and suppression is empty
  // (behaviour identical to before this change).
  const asmMethodFieldHoisted = fieldBySymbol.get('a_s_m_determination_method');
  const asmMethodValueHoisted = asmMethodFieldHoisted ? values[asmMethodFieldHoisted.id] : undefined;
  const asmMethod: string | null =
    asmMethodValueHoisted?.type === 'enum' ? (asmMethodValueHoisted.value ?? null) : null;

  // Memoized suppression set fed to the engine's suppressWriteBackSymbols param.
  //
  // OWNERSHIP PRINCIPLE (method): Gl.7 (A138-12 formula engine) owns A_S,m
  // ONLY when method='direct' (and when asmMethod is null/unset, which defaults
  // to direct). For every other method the server (materializeAsm) is the
  // authoritative producer, so the client engine write-back MUST be suppressed:
  //   - 'manual'        → engineer enters directly; Gl.7 must not clobber.
  //   - 'geometry'      → geometry eqs on A138-17/18 produce the value.
  //   - 'soil_estimate' → materializeAsm derives from Tab.13/A_C; without
  //                       suppression Gl.7 (e.g. 45) fights the server (e.g. 967)
  //                       producing an INFINITE SAVE LOOP (~1 write/7 s).
  //
  // OWNERSHIP PRINCIPLE (home boundary, defect #22): A facility worksheet must
  // not let a local equation shadow-write a symbol whose single active-field home
  // is a DIFFERENT worksheet. inheritedHomeBySymbol maps symbol → home worksheet
  // code (field-derived homes UNIONed over inheritedFromBySymbol — see the memo
  // above for why the field signal is the reliable one); every entry is an
  // inherited symbol that the current worksheet does not
  // own. Suppressing these write-backs ensures the inherited home value (e.g.
  // A_S_m from A138-12 on A138-17) is not blanked by a local Gl.16 that cannot
  // yet compute (missing h_M). The server materialize path (Gl.16→A138-12 via
  // registry / worksheet.ts) is untouched.
  //
  // The union of both sets: on A138-12 method='direct' both are empty (no churn);
  // on A138-17 method='geometry' the asm set may already cover A_S_m, but the
  // home-boundary set provides the general guard independent of asmMethod.
  const engineSuppressedSymbols = useMemo<ReadonlySet<string>>(
    () => composeEngineSuppressedSymbols(asmMethod, worksheet.template.code, inheritedHomeBySymbol),
    [asmMethod, worksheet.template.code, inheritedHomeBySymbol],
  );

  // Engine wiring lives in a shared hook so the integration test renders
  // EXACTLY the production code path (not a copy of it).
  // Plan 2a: fallback register equations (VSME-B04.100 per-medium sums) feed
  // the engine while their DB rows are not yet seeded; the equations block
  // below keeps rendering the DB list (`sortedEquations`) unchanged.
  const engineEquations = useMemo(
    () => withFallbackRegisterEquations(worksheet.template.code, sortedEquations),
    [worksheet.template.code, sortedEquations],
  );
  // Plan 2a (Task 10): `visible_when` on fields and sections. One symbol
  // lookup over the store (shared with ComplianceBlock via makeSymbolLookup),
  // one pure visibility pass over the CURRENT values. Only this worksheet's
  // own fields take part — inherited fields render in the read-only panel and
  // are governed by their origin worksheet (the importer forbids visible_when
  // on a produced symbol). hiddenSymbols feed the engine (hidden ⇒ null) and
  // the compliance block (hidden ⇒ not_applicable); hiddenFieldIds /
  // hiddenSectionIds drop the rows from the grid below.
  const symbolLookup = useMemo(() => makeSymbolLookup(fields, values), [fields, values]);
  const ownFields = useMemo(() => fields.filter((f) => !f.inheritedFromWorksheet), [fields]);
  const visibility = useMemo(
    () => computeVisibility(ownFields, sections, symbolLookup),
    [ownFields, sections, symbolLookup],
  );
  // R-16: the verdict view of hidden symbols — own hidden + hidden at source (not an own field), the gate's rule. The
  // engine keeps `visibility.hiddenSymbols`: the page already withholds hidden-at-source inherited values, so the
  // engine sees them absent (hidden ⇒ no value) either way.
  const complianceHiddenSymbols = useMemo(
    () => gateHiddenSymbols(visibility.hiddenSymbols, hiddenAtSourceSymbols ?? [], new Set(ownFields.map((f) => f.symbol))),
    [visibility.hiddenSymbols, hiddenAtSourceSymbols, ownFields],
  );

  // NOTE: `engineStates` is a fresh record (fresh EvalState objects) on every
  // store write. The consumers below that must not re-render on an unchanged
  // verdict compare the state STRUCTURALLY (engineCardPropsEqual on the card,
  // elementPropsEqual on the elements handed to DynamicField).
  const { engineEquationIds, engineStates } = useEquationEngine({
    worksheetCode: worksheet.template.code,
    standardCode,
    fields,
    equations: engineEquations,
    ambiguousSymbols,
    suppressWriteBackSymbols: engineSuppressedSymbols,
    hiddenSymbols: visibility.hiddenSymbols,
  });

  // Symbol → unit lookup for the engine-card drill-down "Eingaben im Detail".
  // Source of truth is the worksheet's own + inherited field list — same
  // source the engine reads expectedUnits from. Built once here so the
  // engine-card factories below stay light.
  const unitBySymbol = useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const f of fields) m[f.symbol] = f.unit ?? null;
    return m;
  }, [fields]);

  // Pre-build inline engine cards keyed by output field id. Each DynamicField
  // renders the matching card directly below its input so inputs and verdict
  // stay together. Equations whose outputSymbol does NOT map to a visible
  // field fall through to the bottom-section fallback below.
  // Rebuilt on every engine emission (= every store write); that is fine —
  // the elements are flat `EngineCardSlot`s whose props DynamicField's
  // comparator reads, so an output field whose verdict did not move bails out.
  const engineCardsByOutputFieldId = useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    // The card beside a field belongs to the equation that WRITES the field. A displayOnly
    // alternative form (e.g. A138-18 Gl. 22 thin-wall s_R next to the Gl. 21 writer) may only
    // take the slot when no writer targets the field — readiness run 2026-09-30: the card said
    // s_R = 0,3959 (Gl. 22) while the saved value was 0,3925 (Gl. 21).
    const slotIsDisplayOnly = new Set<string>();
    // `engineEquations` (DB list + Plan 2a fallback register equations) so a
    // fallback output field (e.g. VSME B04 AmountOfEmissionToAir) gets its card.
    for (const eq of engineEquations) {
      if (!engineEquationIds.has(eq.id)) continue;
      const state = engineStates[eq.id];
      if (!state) continue;
      const outField = eq.outputSymbol ? fieldBySymbol.get(eq.outputSymbol) : undefined;
      if (!outField) continue;
      const displayOnly = equationProfiles[eq.id]?.displayOnly === true;
      if (map.has(outField.id)) {
        if (displayOnly || !slotIsDisplayOnly.has(outField.id)) continue;
      }
      if (displayOnly) slotIsDisplayOnly.add(outField.id); else slotIsDisplayOnly.delete(outField.id);
      map.set(
        outField.id,
        <EngineCardSlot
          equationNumber={eq.equationNumber}
          sourceFormula={eq.formula}
          state={state}
          outputSymbol={eq.outputSymbol ?? ''}
          outputUnit={outField.unit ?? null}
          unitBySymbol={unitBySymbol}
          inheritedFromBySymbol={inheritedFromBySymbol}
        />,
      );
    }
    return map;
  }, [
    engineEquations,
    engineEquationIds,
    engineStates,
    fieldBySymbol,
    unitBySymbol,
    inheritedFromBySymbol,
  ]);

  // Override-pill metadata keyed by output field id. The pill itself is a
  // separate component (rendered via `OverridePillForField` below) because it
  // reads the engineer's typed value from the store via a hook — invoking a
  // hook per output field can't happen inside `useMemo`. Here we only carry
  // the static side: which equation, which output symbol, the engine's value.
  const overrideMetaByOutputFieldId = useMemo(() => {
    const map = new Map<
      string,
      { equationNumber: string; outputSymbol: string; computedValue: number }
    >();
    for (const eq of engineEquations) {
      if (!engineEquationIds.has(eq.id)) continue;
      const state = engineStates[eq.id];
      if (state?.kind !== 'computed') continue;
      const outField = eq.outputSymbol ? fieldBySymbol.get(eq.outputSymbol) : undefined;
      if (!outField) continue;
      map.set(outField.id, {
        equationNumber: eq.equationNumber,
        outputSymbol: eq.outputSymbol ?? '',
        computedValue: state.value,
      });
    }
    return map;
  }, [engineEquations, engineEquationIds, engineStates, fieldBySymbol]);

  // The pill ELEMENT per output field (all-primitive props, so DynamicField's
  // comparator can tell an unchanged pill from a moved one).
  const overridePillByOutputFieldId = useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    for (const [fieldId, meta] of overrideMetaByOutputFieldId) {
      map.set(
        fieldId,
        <OverridePillForField
          fieldId={fieldId}
          projectId={projectId}
          equationNumber={meta.equationNumber}
          outputSymbol={meta.outputSymbol}
          computedValue={meta.computedValue}
        />,
      );
    }
    return map;
  }, [overrideMetaByOutputFieldId, projectId]);

  // Engine equations whose outputSymbol has NO visible field — keep these in
  // the legacy bottom section so the engineer still sees the verdict.
  const orphanEngineEquations = useMemo(() => {
    // Fields that have a WRITER card (non-displayOnly equation) — a displayOnly alternative
    // form for such a field is shown here instead of beside the field.
    const writerFieldIds = new Set<string>();
    for (const eq of sortedEquations) {
      if (!engineEquationIds.has(eq.id) || equationProfiles[eq.id]?.displayOnly) continue;
      const outField = eq.outputSymbol ? fieldBySymbol.get(eq.outputSymbol) : undefined;
      if (outField) writerFieldIds.add(outField.id);
    }
    return sortedEquations.filter((eq) => {
      if (!engineEquationIds.has(eq.id)) return false;
      const outField = eq.outputSymbol ? fieldBySymbol.get(eq.outputSymbol) : undefined;
      if (!outField) return true;
      return equationProfiles[eq.id]?.displayOnly === true && writerFieldIds.has(outField.id);
    });
  }, [sortedEquations, engineEquationIds, fieldBySymbol]);

  // Design return-period for the bespoke rainfall editor (A138-04 KOSTRA
  // carrier, dispatched by the WIDGETS registry via BESPOKE_BY_SYMBOL): resolve project
  // n/T_n via the shared facilityReturnPeriod helper. A pickNumberBySymbol
  // closure reads from the store's current values using the field-by-symbol
  // map built above.
  const rainfallDesignReturnPeriod = useMemo(() => {
    const pick = (sym: string): number | null => {
      const f = fieldBySymbol.get(sym);
      if (!f) return null;
      const v = values[f.id];
      return v?.type === 'number' && v.value != null && Number.isFinite(v.value) ? v.value : null;
    };
    return facilityReturnPeriod(worksheet.template.code, pick);
  }, [fieldBySymbol, values, worksheet.template.code]);

  // origin/main panels (design window, Tab. 3, guideline tables as printed, site
  // portal links): inputs computed by panel-inputs.ts — main's memo bodies moved
  // verbatim so this form keeps no symbol-keyed carrier reads (merge 2026-09-25).
  const designWindow = useMemo(
    () => designWindowInputs({ worksheetCode: worksheet.template.code, fields, fieldBySymbol, values, designReturnPeriod: rainfallDesignReturnPeriod }),
    [worksheet.template.code, fields, fieldBySymbol, values, rainfallDesignReturnPeriod],
  );
  const tab3 = useMemo(() => tab3Inputs(worksheet.template.code, fieldBySymbol), [worksheet.template.code, fieldBySymbol]);
  const guidelineTables = useMemo(
    () => guidelineTableInputs(worksheet.template.code, fieldBySymbol, values),
    [worksheet.template.code, fieldBySymbol, values],
  );
  const sitePortal = useMemo(() => sitePortalFieldIds(fields), [fields]);

  // Plan 2b (Task 4): register-output provenance hint, generic. For every
  // register field of THIS worksheet, the output symbols of the equations
  // (DB rows + Plan 2a fallback) that consume it get "Aus dem Register
  // „<title>“ berechnet (…)" — the old VSME-only pollutant hint generalised (A138-07's six
  // surface outputs now carry it too, label "Flächenverzeichnis").
  const registerOutputHints = useMemo(() => {
    const m = new Map<string, { title: string; placement: 'section' | 'bottom' }>();
    for (const r of fields) {
      const cfg = resolveRegisterConfig({ symbol: r.symbol, dataType: r.dataType, widget: r.widget ?? null, uiConfig: r.uiConfig });
      if (!cfg) continue;
      for (const eq of engineEquations) {
        if (eq.outputSymbol && (eq.inputSymbols ?? []).includes(r.symbol)) {
          m.set(eq.outputSymbol, { title: cfg.title, placement: registerPlacement(cfg) });
        }
      }
    }
    return m;
  }, [fields, engineEquations]);

  // Field ids whose persisted value was engine-written server-side → locked.
  const serverComputedSet = useMemo(
    () => new Set(serverComputedFieldIds ?? []),
    [serverComputedFieldIds],
  );

  // Provenance hint per field (object prop of DynamicField) — built once per
  // (fields, server-computed set, register hints) instead of a fresh literal
  // on every render, so the memoised DynamicField sees a stable reference.
  // The VSME hints render even BEFORE the engine has ever written a value
  // (empty project): without them the CO₂ calculator / register is
  // invisible from the worksheet and the engineer types the totals by
  // hand. Pre-computation the field stays editable — only the hint shows.
  const computedHintByFieldId = useMemo(() => {
    const m = new Map<string, { label: string; href?: string; hrefLabel?: string }>();
    const isVsme = standardCode === 'VSME';
    for (const f of fields) {
      const isServerComputed = serverComputedSet.has(f.id);
      const regHint = registerOutputHints.get(f.symbol);
      const hint = isVsme && VSME_CO2_ENGINE_SYMBOLS.has(f.symbol)
        ? {
            label: isServerComputed
              ? 'Automatisch berechnet aus den CO₂-Aktivitätslinien.'
              : 'Dieses Feld berechnet der CO₂-Rechner aus den erfassten Aktivitäten.',
            href: `/${locale}/projects/${projectId}/vsme/emissions`,
            hrefLabel: '→ CO₂-Rechner öffnen',
          }
        : regHint
          ? {
              label: isServerComputed
                // Neutral wording: the output may be a sum (VSME B04), a weighted mean (A138-07 C_m) or any register-derived value.
                ? `Aus dem Register „${regHint.title}“ berechnet (${regHint.placement === 'bottom' ? 'unten auf dieser Seite' : 'in diesem Abschnitt'}).`
                : `Wird beim Speichern aus dem Register „${regHint.title}“ berechnet.`,
            }
          : isServerComputed
            ? { label: 'Serverseitig berechneter Wert.' }
            : undefined;
      if (hint) m.set(f.id, hint);
    }
    return m;
  }, [fields, serverComputedSet, registerOutputHints, standardCode, locale, projectId]);

  // Plan 2b (Task 3): upstream-cause state per CONSUMED register (the
  // `registerSources` prop — an owner worksheet's carrier this worksheet reads).
  // The gate runs under the register's own config (carrierSourceState, Plan 2a
  // Task 9) so the banner, the read-only mirror and the engine agree on
  // "complete". The config comes from the SOURCE entry's own `{ widget, uiConfig }`
  // (I-3: the owner field's DB row — a `register` widget wins; widget NULL
  // falls through resolveRegisterConfig to the symbol-keyed TS fallback). Sources
  // always resolve via the owner row (loadRegisterSources), so there is no second
  // lookup through the consumer's own field row (2b final review, F-3); no
  // config at all ⇒ state=null → nothing renders.
  const registerSourceStates = useMemo(
    () =>
      (registerSources ?? []).map((src) => {
        const cfg = resolveRegisterConfig({ symbol: src.symbol, dataType: 'json', widget: src.widget ?? null, uiConfig: src.uiConfig ?? null });
        // Round 2: the banner may only claim "abgeleitete Werte ausgeblendet" when this consumer actually carries a
        // produced symbol inherited from the owner (that is what the page withholds — carrierWithholdFieldIds).
        const withholds = (src.producedSymbols ?? []).some((sym) => fields.some((f) => f.symbol === sym && f.inheritedFromWorksheet === src.ownerCode));
        const state = cfg
          ? carrierSourceState(src.carrier, cfg.columns, src.status, {
              ownerLabel: src.ownerCode,
              standardCode,
              withholds,
              legacyMap: cfg.legacy_map,
              overrideFlagKey: cfg.override?.flag_key,
              overrideAppliesTo: cfg.override?.applies_to,
              flagKeys: registerFlagKeys(src.symbol, cfg),
              flags: cfg.flags,
            })
          : null;
        return { ...src, cfg, state, withholds };
      }),
    [registerSources, fields, standardCode],
  );
  // U-4 (UX pass 820): ONE banner per source sheet (owner code) listing its registers by label; an OPTIONAL register
  // (owner field not is_required) that nobody filled yields no banner (groupSourceBanners / suppressOptionalMissing).
  const sourceBanners = useMemo(
    () =>
      groupSourceBanners(
        registerSourceStates.map((s) => ({
          ownerCode: s.ownerCode,
          label: (locale === 'de' ? s.labelDe : (s.labelEn ?? s.labelDe)) ?? s.cfg?.title ?? s.symbol,
          state: s.state,
          isRequired: s.isRequired ?? null,
          withholds: s.withholds,
        })),
        locale,
      ),
    [registerSourceStates, locale],
  );

  // (Retired) The legacy naive sum-evaluator lived here — it ignored `formula`
  // and summed input_symbols for every equation NOT on the old 138-only
  // whitelist. Engine generalization (Layer 0) routes EVERY equation through
  // the real evaluator (useEquationEngine), which computes faithful arithmetic
  // (DIN-276 sums included) and blanks anything it cannot faithfully evaluate.
  // Keeping the legacy sum would naive-sum the deny-listed equations and defeat
  // the deny-set, so it is removed entirely.

  // Hide deprecated AND inherited fields from rendering. visibleFields(...)
  // strips `active=false` rows; the additional filter strips inherited rows
  // (they show in a separate read-only panel since the engineer edits them
  // on the origin worksheet). The engine sees the unfiltered `fields` so
  // every consumed symbol is resolved.
  // Plan 2b (Task 3): ONE pass decides where each visible own field renders —
  // `widgetPlacement(f)` sends registers/bespoke editors/legacy checklists to
  // the bottom strip (`bottom`, sorted by orderIndex) and everything else into
  // its section (`map`). A hidden field is dropped BEFORE placement, so a
  // hidden register renders nothing (the old `shown()` gate, now uniform).
  const fieldsBySectionId = useMemo(() => {
    const map = new Map<string | null, FieldDef[]>();
    const bottom: FieldDef[] = [];
    for (const f of visibleFields(fields)) {
      if (f.inheritedFromWorksheet) continue;
      // Plan 2a (Task 10): hidden by `visible_when` (own rule or hidden
      // section) — leaves the grid entirely; the engine sees it as null.
      if (visibility.hiddenFieldIds.has(f.id)) continue;
      if (widgetPlacement(f).placement === 'bottom') {
        bottom.push(f);
        continue;
      }
      const key = f.sectionId ?? null;
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.orderIndex - b.orderIndex);
    }
    bottom.sort((a, b) => a.orderIndex - b.orderIndex);
    return { map, bottom };
  }, [fields, visibility]);

  // U-5 (UX pass 820): every active own question hidden by `visible_when` ⇒ the sheet says so and names the
  // selections that hide them (driver label = current value ← origin worksheet), capped at 5 (hiddenSheetDrivers).
  const allHiddenNotice = useMemo(() => {
    if (!allOwnFieldsHidden(ownFields, visibility.hiddenFieldIds)) return null;
    const drivers = hiddenSheetDrivers(ownFields, sections, visibility).map((sym) => {
      const f = fieldBySymbol.get(sym);
      const label = f ? (locale === 'de' ? f.labelDe : (f.labelEn ?? f.labelDe)) || sym : sym;
      const value = f ? formatPanelValue(f, values[f.id], locale) : '—';
      const origin = f?.inheritedFromWorksheet ?? inheritedHomeBySymbol[sym] ?? null;
      return { sym, label, value, origin };
    });
    return { drivers };
  }, [ownFields, sections, visibility, fieldBySymbol, values, locale, inheritedHomeBySymbol]);

  // The inherited-values panel content. Built once from `fields` + the
  // store's resolved values.
  const inheritedFieldsForPanel = useMemo(
    () => fields.filter((f) => f.inheritedFromWorksheet && f.active),
    [fields],
  );
  // U-3 (UX pass 820): sheet-specific upstream values first, project identity/metadata last under „Projektdaten".
  const inheritedPanelGroups = useMemo(() => splitInheritedForPanel(inheritedFieldsForPanel), [inheritedFieldsForPanel]);
  // U-3: the panel is collapsed by default; the open state is remembered per worksheet (localStorage, best effort).
  // A sheet without visible own questions (U-5 notice) always starts collapsed — the notice carries the drivers.
  const upstreamPanelKey = upstreamPanelStorageKey(standardCode, worksheet.template.code);
  const [upstreamPanelOpen, setUpstreamPanelOpen] = useState(false);
  const startCollapsed = allHiddenNotice != null;
  // Restore once per worksheet, and only after the store holds THIS instance's values — before that the visibility
  // (and so the U-5 all-hidden decision) is computed on empty values.
  const storeReady = useWorksheetStore((s) => s.instanceId) === instance.id;
  const restoredPanelKey = useRef<string | null>(null);
  useEffect(() => {
    if (!storeReady || restoredPanelKey.current === upstreamPanelKey) return;
    restoredPanelKey.current = upstreamPanelKey;
    let open = false;
    if (!startCollapsed) {
      try {
        open = window.localStorage.getItem(upstreamPanelKey) === 'open';
      } catch {
        /* storage unavailable — stay collapsed */
      }
    }
    setUpstreamPanelOpen(open);
  }, [storeReady, upstreamPanelKey, startCollapsed]);
  const toggleUpstreamPanel = () => {
    const next = !upstreamPanelOpen;
    setUpstreamPanelOpen(next);
    try {
      if (next) window.localStorage.setItem(upstreamPanelKey, 'open');
      else window.localStorage.removeItem(upstreamPanelKey);
    } catch {
      /* storage unavailable — the toggle still works for this view */
    }
  };

  // Sections worth rendering: those holding at least one visible field
  // directly, plus every ancestor on the path up to such a section. DWA
  // worksheets carry many scaffold sections (Output Transfer Table, Notes &
  // Assumptions, Approval, Workflow Connection …) that collect nothing in this
  // form — we hide those empty headers instead of listing blank sections.
  // Plan 2a (Task 10): a section hidden by `visible_when` (own rule or hidden
  // ancestor) never renders, even if a child would — its fields are already
  // gone from fieldsBySectionId, and the ancestor walk skips it too.
  const visibleSectionIds = useMemo(() => {
    const parentBySection = new Map(sections.map((s) => [s.id, s.parentSectionId]));
    const result = new Set<string>();
    for (const [sid, arr] of fieldsBySectionId.map) {
      if (!sid || arr.length === 0) continue;
      let cur: string | null = sid;
      while (cur && !result.has(cur)) {
        if (visibility.hiddenSectionIds.has(cur)) break;
        result.add(cur);
        cur = parentBySection.get(cur) ?? null;
      }
    }
    return result;
  }, [fieldsBySectionId, sections, visibility]);

  // Twin pre-fills not yet persisted: the value is in the store (render-only)
  // but not in pendingFieldIds and there is no saved row — "Alle übernehmen"
  // marks them pending so the next autosave persists them in one go.
  const twinPrefillIds = useMemo(() => {
    if (!twinSourceByFieldId) return [] as string[];
    return Object.keys(twinSourceByFieldId).filter((id) => values[id] != null && !pendingFieldIds.has(id));
  }, [twinSourceByFieldId, values, pendingFieldIds]);
  const acceptAllTwinPrefills = () => {
    if (locked) return;
    for (const id of twinPrefillIds) {
      const v = values[id];
      if (v) setField(id, v);
    }
  };

  // M-3 (fix round 4): bulk confirm of stale answers. A stale field the engineer touched in this mount (pending now or
  // before — the per-field „Bestätigen", typing, or the bar) leaves the candidate list for good: its save clears the
  // flag server-side and the prop is not refreshed after an autosave. Tracked with the render-time state-adjust
  // pattern (no effect).
  const [touchedStale, setTouchedStale] = useState<ReadonlySet<string>>(() => new Set());
  if (staleByFieldId) {
    const newlyTouched = [...pendingFieldIds].filter((id) => staleByFieldId[id] && !touchedStale.has(id));
    if (newlyTouched.length > 0) setTouchedStale(new Set([...touchedStale, ...newlyTouched]));
  }
  const staleConfirmIds = useMemo(
    () => staleConfirmCandidates({ fields, hiddenFieldIds: visibility.hiddenFieldIds, staleByFieldId, values, pendingFieldIds, touched: touchedStale }),
    [fields, visibility.hiddenFieldIds, staleByFieldId, values, pendingFieldIds, touchedStale],
  );
  // Same path as the per-field „Bestätigen": mark the current values pending → ONE autosave re-saves them visible.
  const confirmAllStale = () => {
    if (locked) return;
    for (const id of staleConfirmIds) {
      const v = values[id];
      if (v) setField(id, v);
    }
  };

  const topSections = sections.filter((s) => s.parentSectionId === null);
  const orphanFields = fieldsBySectionId.map.get(null) ?? [];
  // ComplianceBlock's field-ref list — one array per `fields`, not per render.
  const complianceFields = useMemo(() => fields.map((f) => ({ id: f.id, symbol: f.symbol })), [fields]);
  const title = locale === 'de' ? worksheet.template.titleDe : worksheet.template.titleEn ?? worksheet.template.titleDe;

  // asmMethod is resolved above (hoisted before useEquationEngine) so it can be
  // forwarded both to the engine suppress-write-back set and to DynamicField here.
  // asmProvenance + asmNeedsReconfirmation are only consumed by DynamicField
  // (via renderDynamic below) so they stay here.
  const asmProvenanceField = fieldBySymbol.get('a_s_m_provenance');
  const asmProvenanceValue = asmProvenanceField ? values[asmProvenanceField.id] : undefined;
  const asmProvenance: string | null =
    asmProvenanceValue?.type === 'text' ? (asmProvenanceValue.value ?? null) : null;

  const asmReconfField = fieldBySymbol.get('a_s_m_needs_reconfirmation');
  const asmReconfValue = asmReconfField ? values[asmReconfField.id] : undefined;
  const asmNeedsReconfirmation: boolean | null =
    asmReconfValue?.type === 'boolean' ? (asmReconfValue.value ?? null) : null;

  // Today's <DynamicField …/> factory (scalar / select_one / attestation and the
  // json placeholder + json-checklist branches). Owned by the form because it
  // threads per-field context (computedHint, statusReason, override pill, ASM
  // props); the WIDGETS registry calls it for every non-register widget.
  const renderDynamic = (f: FieldDef) => {
    // Server-engine-written value (source_type='computed' / VSME 'derived'):
    // locked via the existing isComputed path + a provenance hint telling the
    // engineer WHERE the value is produced (single-source rule). The hint
    // object comes from the memoised map above (stable prop reference).
    const isServerComputed = serverComputedSet.has(f.id);
    const computedHint = computedHintByFieldId.get(f.id);

    // For ac_as_ratio_check, resolve the sibling reason field's current
    // value and thread it in as statusReason so AcAsRatioCheckStatus can
    // display the distinguishing text (keine Anforderung vs behördlich).
    let statusReason: string | null = null;
    if (f.symbol === 'ac_as_ratio_check') {
      const reasonField = fieldBySymbol.get('ac_as_ratio_check_reason');
      if (reasonField) {
        const rv = values[reasonField.id];
        statusReason = rv?.type === 'text' ? (rv.value ?? null) : null;
      }
    }

    // Every prop below is a primitive or a reference kept stable across an
    // unrelated store write (props of the form, memoised maps, cached
    // elements) — MemoDynamicField's shallow compare is therefore exact.
    return (
      <MemoDynamicField
        field={f}
        locale={locale}
        projectId={projectId}
        standardCode={standardCode}
        sameSymbolHints={sameSymbolValuesBySymbol[f.symbol]}
        inheritedFrom={inheritedFromBySymbol[f.symbol]}
        docs={docs}
        isComputed={(computedSymbols.has(f.symbol) && !(f.symbol === 'A_S_m' && asmMethod === 'manual')) || isServerComputed}
        sumOutput={sumOutputSymbols.has(f.symbol)}
        computedHint={computedHint}
        prefillSource={prefillSourceByFieldId?.[f.id]}
        siteProfileKey={siteProfileKeyByFieldId?.[f.id]}
        twinSource={twinSourceByFieldId?.[f.id]}
        clientSupplied={clientSuppliedByFieldId?.[f.id] ?? false}
        isStale={staleByFieldId?.[f.id] ?? false}
        inlineEngineCard={engineCardsByOutputFieldId.get(f.id)}
        overridePill={overridePillByOutputFieldId.get(f.id)}
        isPlatformEngineer={isPlatformEngineer}
        readOnly={locked}
        statusReason={statusReason}
        asmMethod={asmMethod}
        asmProvenance={asmProvenance}
        asmNeedsReconfirmation={asmNeedsReconfirmation}
      />
    );
  };

  // Plan 2b (Task 3): the ONE renderer path. Every field — section grid and
  // bottom strip alike — goes through the WIDGETS registry with this context.
  const widgetCtx: WidgetContext = {
    standardCode,
    locale,
    projectId,
    readOnly: locked,
    fieldBySymbol,
    values,
    setField,
    symbolLookup,
    engineStates,
    equations: engineEquations,
    computedSymbols,
    serverComputedSet,
    rainfallDesignReturnPeriod,
    renderDynamic,
  };
  const renderField = (sectionId: string | null) =>
    (fieldsBySectionId.map.get(sectionId) ?? []).map((f) => renderWidget(f, widgetCtx));

  // One row of the „Vorgelagerte Werte" panel (U-3: rendered in two groups — sheet-specific, then „Projektdaten").
  const renderInheritedRow = (f: FieldDef) => {
    const display = formatPanelValue(f, values[f.id], locale);
    const label = locale === 'de' ? f.labelDe : (f.labelEn ?? f.labelDe);
    return (
      <li
        key={f.id}
        data-symbol={f.symbol}
        data-inherited-from={f.inheritedFromWorksheet}
        className="border-b border-hairline last:border-b-0 py-1 flex items-start justify-between gap-2 min-w-0"
      >
        <div className="min-w-0">
          <div className="text-ink break-words">
            <code className="font-mono text-xs mr-2">{f.symbol}</code>
            {label}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-subtext">
            {f.inheritedFromWorksheet ? (
              <Link
                href={`/${locale}/projects/${projectId}/standards/${standardCode}/worksheets/${f.inheritedFromWorksheet}`}
                className="hover:text-accent transition-colors underline-offset-2 hover:underline"
                title={`Arbeitsblatt ${f.inheritedFromWorksheet} öffnen`}
              >
                ← {f.inheritedFromWorksheet}
              </Link>
            ) : null}
            {f.unit && <span className="ml-2 text-ink-2">{f.unit}</span>}
          </div>
        </div>
        <div className="font-mono tabular-nums text-ink text-right min-w-0 break-words">{display}</div>
      </li>
    );
  };

  return (
    <article className="space-y-8 max-w-3xl">
      <header className="border-b border-hairline pb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-2">
          {worksheet.template.code}
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
          <SaveIndicator />
        </div>
      </header>

      {locked && (
        <div
          role="status"
          data-testid="worksheet-lock-banner"
          className="border border-hairline rounded p-3 text-sm bg-paper-2 text-ink"
        >
          Schreibgeschützt (genehmigt/final) — zum Bearbeiten „Wieder öffnen“.
        </div>
      )}

      <SaveWarningsBanner />

      <MemoSourceFormReferencePanel standardCode={standardCode} locale={locale} />

      {twinPrefillIds.length > 0 && !locked && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded border border-accent/40 bg-accent/5 px-3 py-2 text-sm"
          data-testid="twin-prefill-bar"
        >
          <span>
            {twinPrefillIds.length === 1
              ? '1 Feld aus vorgelagerten Arbeitsblättern vorbefüllt (noch nicht gespeichert).'
              : `${twinPrefillIds.length} Felder aus vorgelagerten Arbeitsblättern vorbefüllt (noch nicht gespeichert).`}
          </span>
          <button
            type="button"
            onClick={acceptAllTwinPrefills}
            className="text-xs px-3 py-1 rounded border border-hairline-strong hover:bg-paper-2 text-ink"
          >
            Alle Vorbefüllungen übernehmen
          </button>
        </div>
      )}

      {staleConfirmIds.length >= 2 && !locked && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded border border-warning/40 bg-warning-soft px-3 py-2 text-sm"
          data-testid="stale-confirm-bar"
        >
          <span className="text-warning">
            {locale === 'de'
              ? `${staleConfirmIds.length} Antworten sind älter als die aktuelle Auswahl`
              : `${staleConfirmIds.length} answers predate the current selection`}
          </span>
          <button
            type="button"
            onClick={confirmAllStale}
            className="text-xs px-3 py-1 rounded border border-hairline-strong hover:bg-paper-2 text-ink"
            data-testid="stale-confirm-all"
          >
            {locale === 'de' ? 'alle bestätigen' : 'confirm all'}
          </button>
        </div>
      )}

      {allHiddenNotice && (
        <div className="rounded border border-hairline bg-paper-2 px-3 py-2 text-sm text-ink space-y-1" data-testid="all-hidden-notice" role="status">
          <p>{locale === 'de' ? 'Dieses Blatt stellt unter den aktuellen Auswahlen keine Fragen.' : 'Under the current selections this sheet asks no questions.'}</p>
          {allHiddenNotice.drivers.length > 0 && (
            <ul className="text-xs text-subtext space-y-0.5">
              {allHiddenNotice.drivers.map((d) => (
                <li key={d.sym} data-symbol={d.sym} className="break-words">
                  {d.label} = {d.value}
                  {d.origin && <> (← {d.origin})</>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sourceBanners.map((b) => <SurfaceSourceBanner key={b.ownerCode} state={{ ...b.states[0], message: b.message }} />)}

      {inheritedFieldsForPanel.length > 0 && (
        <section
          className="border border-hairline rounded p-4 space-y-2"
          data-testid="inherited-values-panel"
        >
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            <button
              type="button"
              onClick={toggleUpstreamPanel}
              aria-expanded={upstreamPanelOpen}
              aria-controls="inherited-values-panel-body"
              className="flex items-center gap-2 text-left uppercase tracking-[0.25em] hover:text-ink transition-colors"
              data-testid="inherited-values-toggle"
            >
              <span aria-hidden="true">{upstreamPanelOpen ? '▾' : '▸'}</span>
              <span>
                {locale === 'de'
                  ? `${inheritedFieldsForPanel.length} vorgelagerte Werte (aus anderen Arbeitsblättern) — ${upstreamPanelOpen ? 'ausblenden' : 'anzeigen'}`
                  : `${inheritedFieldsForPanel.length} upstream values (from other worksheets) — ${upstreamPanelOpen ? 'hide' : 'show'}`}
              </span>
            </button>
          </h2>
          {/* Collapsed ⇒ `hidden` (kept in the DOM, so engine-facing tests and anchors still find the rows). */}
          <div id="inherited-values-panel-body" hidden={!upstreamPanelOpen} className="space-y-2" data-testid="inherited-values-body">
            <p className="text-[11px] text-subtext">
              {locale === 'de'
                ? 'Diese Werte stammen aus vorgelagerten Arbeitsblättern desselben Projekts. Zum Bearbeiten das angegebene Arbeitsblatt öffnen.'
                : 'These values come from upstream worksheets of the same project. Open the named worksheet to edit them.'}
            </p>
            {inheritedPanelGroups.specific.length > 0 && (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {inheritedPanelGroups.specific.map(renderInheritedRow)}
              </ul>
            )}
            {inheritedPanelGroups.identity.length > 0 && (
              <>
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-subtext pt-2" data-testid="inherited-values-identity-heading">
                  {locale === 'de' ? 'Projektdaten' : 'Project data'}
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm" data-testid="inherited-values-identity">
                  {inheritedPanelGroups.identity.map(renderInheritedRow)}
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      {orphanFields.length > 0 && (
        <section className="space-y-4">{renderField(null)}</section>
      )}

      {topSections
        .filter((s) => visibleSectionIds.has(s.id))
        .map((s) => (
          <SectionGroup
            key={s.id}
            section={s}
            allSections={sections}
            visibleSectionIds={visibleSectionIds}
            renderField={renderField}
            locale={locale}
          />
        ))}

      {/* Consumed registers (`registerSources`, owned by an upstream worksheet):
          a read-only mirror of the owner's carrier under the register's own
          config. Hidden while the source is missing (the banner above says so). */}
      {registerSourceStates.map((s) =>
        s.cfg && s.state && s.state.state !== 'missing' ? (
          <section key={s.symbol} className="border-t border-hairline pt-6 mt-8 space-y-2" data-testid={`source-${s.symbol}`}>
            <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
              {s.cfg.title} (aus {s.ownerCode} — schreibgeschützt)
            </h2>
            <ReadOnlyRegisterTable config={s.cfg} carrier={s.carrier} symbol={s.symbol} standardCode={standardCode} />
          </section>
        ) : null,
      )}

      {/* origin/main panels (site portal links, guideline tables as printed,
          Tab. 3, design window) — before the bottom strip, i.e. before the
          surface inventory / register editors, as on main. */}
      {sitePortal && (
        <section className="border-t border-hairline pt-6 mt-8 space-y-4">
          <SitePortalLinks latFieldId={sitePortal.latFieldId} lonFieldId={sitePortal.lonFieldId} label={title} />
        </section>
      )}

      {guidelineTables.map((g) => (
        <div key={g.code} className="border-t border-hairline pt-6 mt-8">
          <GuidelineTablePanel tableCode={g.code} fieldsBySymbol={g.metas} readOnly={locked} extraValues={g.extra} />
        </div>
      ))}

      {tab3 && (
        <div className="border-t border-hairline pt-6 mt-8">
          <FeasibilityTablePanel fieldsBySymbol={tab3.metas} determinationFieldId={tab3.determinationFieldId} readOnly={locked} locale={locale} projectId={projectId} standardCode={standardCode} />
        </div>
      )}

      {designWindow && !locked && (
        <div className="border-t border-hairline pt-6 mt-8">
          <DesignWindowPanel
            facility={designWindow.facility}
            rows={designWindow.rows}
            designReturnPeriod={designWindow.T}
            compareRows={designWindow.compareRows}
            scalars={designWindow.scalars}
            current={designWindow.current}
          />
        </div>
      )}

      {/* Bottom strip (Plan 2b Task 3): every own visible field whose widget
          places it at the bottom — registers (generic RegisterEditor or a
          bespoke editor: KOSTRA tables, risk register, mitigation plan) and
          legacy TS checklists — in orderIndex order (the `reference` and
          `lookup_fill` widgets render in their section instead), under the
          title widgetPlacement() resolves (config title / today's h2). */}
      {fieldsBySectionId.bottom.map((f) => {
        const { title } = widgetPlacement(f);
        return (
          <section key={f.id} className="border-t border-hairline pt-6 mt-8 space-y-4" data-testid={`bottom-${f.symbol}`}>
            {title && <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">{title}</h2>}
            {carriedNoteByFieldId?.[f.id] && values[f.id] === initialValues[f.id] && (
              <p className="text-xs text-subtext" data-testid={`carried-${f.symbol}`}>{carriedNoteByFieldId[f.id]}</p>
            )}
            {renderWidget(f, widgetCtx)}
          </section>
        );
      })}

      <MemoEquationsBlock equations={equations} isPlatformEngineer={isPlatformEngineer} locale={locale} hiddenSymbols={visibility.hiddenSymbols} />

      {orphanEngineEquations.length > 0 && (
        <section className="border-t border-hairline pt-6 mt-2 space-y-3">
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            Engine-Auswertung (kein Zielfeld)
          </h2>
          {orphanEngineEquations.map((eq) => {
            const state = engineStates[eq.id];
            if (!state) return null;
            return (
              <EquationEngineCard
                key={eq.id}
                equationNumber={eq.equationNumber}
                sourceFormula={eq.formula}
                state={state}
                outputSymbol={eq.outputSymbol ?? ''}
                outputUnit={null}
              />
            );
          })}
        </section>
      )}

      <MemoComplianceBlock
        requirements={complianceRequirements}
        suggestions={complianceSuggestions}
        fields={complianceFields}
        locale={locale}
        projectId={projectId}
        hiddenSymbols={complianceHiddenSymbols}
      />
      <MemoRationalePanel instanceId={instance.id} locale={locale} />
      <MemoApprovalBar
        instanceId={instance.id}
        status={instance.status}
        locale={locale}
        priorSnapshotCount={priorSnapshotCount ?? 0}
        diffHref={diffHref}
      />
    </article>
  );
}

/**
 * Per-field wrapper that runs the override-detection hook and renders the
 * pill ONLY when the engineer's stored value diverges from the engine's
 * computed verdict. Lives here (not in equation-engine-card) so the
 * detection runs once per output field — invoking a hook inside the
 * `engineCardsByOutputFieldId` useMemo would violate the rules of hooks.
 */
function OverridePillForField({
  fieldId,
  projectId,
  equationNumber,
  outputSymbol,
  computedValue,
}: {
  fieldId: string;
  projectId: string;
  equationNumber: string;
  outputSymbol: string;
  computedValue: number;
}) {
  const { isOverridden, manualValue } = useManualOverride({
    fieldId,
    computedValue,
  });
  if (!isOverridden || manualValue === null) return null;
  return (
    <ManualOverridePill
      fieldId={fieldId}
      projectId={projectId}
      equationNumber={equationNumber}
      outputSymbol={outputSymbol}
      computedValue={computedValue}
      manualValue={manualValue}
    />
  );
}
