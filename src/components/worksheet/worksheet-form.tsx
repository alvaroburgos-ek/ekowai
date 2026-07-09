'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { useWorksheetStore, type SaveStatus } from '@/lib/state/worksheet-store';
import { saveWorksheet } from '@/lib/actions/worksheet';
import { DynamicField } from './dynamic-field';
import { SectionGroup } from './section-group';
import { EquationsBlock } from './equations-block';
import { ComplianceBlock } from './compliance-block';
import { ApprovalBar } from './approval-bar';
import { EquationEngineCard } from './equation-engine-card';
import {
  ManualOverridePill,
  useManualOverride,
} from './manual-override-pill';
import { RainfallTablesEditor } from './rainfall-tables-editor';
import { RainfallTableSelector } from './rainfall-table-selector';
import { normalizeRainfallCarrier, facilityReturnPeriod } from '@/lib/eval/rainfall-tables';
import { SurfaceInventoryEditor } from './surface-inventory-editor';
import { SurfaceSourceBanner } from './surface-source-banner';
import { surfaceSourceState } from '@/lib/eval/surface-source-state';
import { normalizeSurfaceCarrier } from '@/lib/eval/surface-inventory';
import { lookupTab9 } from '@/lib/eval/tab9';
import { SourceFormReferencePanel } from '@/components/form-templates/SourceFormReferencePanel';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { FORMULA_ENGINE_WHITELIST } from '@/lib/eval/whitelist';
import { visibleFields } from './visible-fields';
import { isWorksheetEditable, type WorksheetStatus } from '@/lib/state-machine';

// Derived symbols that the materialize pipeline writes on every A138-13 save.
// They are NOT live formula-engine outputs, but share the same single-source
// invariant: the governing-duration iteration is authoritative and the engineer
// must not overwrite these values. `fieldBySymbol.has(sym)` inside
// computedSymbols guards against false positives on other standards.
const BASIN_GOVERNING_SYMBOLS = new Set(['r_D_n', 'D_min']);

// Stable empty set for the engine suppress-write-back feature. A module-level
// constant keeps the object identity stable so useMemo/useEffect deps don't
// churn on non-A138-12 worksheets where no symbols are suppressed.
const EMPTY_SUPPRESSED: ReadonlySet<string> = new Set();

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

function SaveIndicator({ status }: { status: SaveStatus }) {
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

// WorksheetForm needs sectionId + orderIndex + active on top of what
// DynamicField requires. `active=false` fields are hidden from rendering
// but kept in the store/queries so saved values aren't lost.
// `inheritedFromWorksheet` set ⇒ this field belongs to an upstream worksheet
// that declared the current worksheet a consumer; we show it in a separate
// "Vorgelagerte Werte" panel and feed it to the engine, but don't render
// an editable input here (engineer edits on the origin worksheet).
type FieldDef = Parameters<typeof DynamicField>[0]['field'] & {
  sectionId: string | null;
  orderIndex: number;
  active: boolean;
  inheritedFromWorksheet?: string;
};

type Section = Parameters<typeof SectionGroup>[0]['section'];

// FieldValue mirrors the store's FieldValue — avoids a cross-import of the private type.
type FieldValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown };

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
  sameSymbolValuesBySymbol: Record<string, Array<{ worksheetCode: string; value: unknown }>>;
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
  prefillSourceByFieldId?: Record<string, 'standard_default' | 'site_profile'>;
  /** field_id → site-profile JSON key that supplied the pre-fill. Only set
   * for fields where prefillSourceByFieldId is 'site_profile'. Shown in the
   * field's tooltip so the engineer can find the source entry. */
  siteProfileKeyByFieldId?: Record<string, string>;
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
  /** Surface-inventory source data from A138-07 for consumer worksheets (e.g.
   * A138-10). null when this worksheet IS the owner or the standard has no
   * surface_inventory field. */
  surfaceSource?: { status: string; carrier: unknown } | null;
};

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
  standardCode,
  docs,
  priorSnapshotCount,
  diffHref,
  isPlatformEngineer = false,
  surfaceSource,
}: Props) {
  const init = useWorksheetStore((s) => s.init);
  const flush = useWorksheetStore((s) => s.flush);
  const setField = useWorksheetStore((s) => s.setField);
  const values = useWorksheetStore((s) => s.values);
  const saveStatus = useWorksheetStore((s) => s.saveStatus);
  const lastWarnings = useWorksheetStore((s) => s.lastWarnings);
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

  const fieldBySymbol = useMemo(() => {
    const m = new Map<string, FieldDef>();
    for (const f of fields) m.set(f.symbol, f);
    return m;
  }, [fields]);

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
  const computedSymbols = useMemo(() => {
    const set = new Set<string>();
    for (const e of sortedEquations) {
      const out = e.outputSymbol;
      if (out && fieldBySymbol.has(out)) set.add(out);
    }
    // Basin-governing derived outputs: persisted by save (not live engine),
    // but equally non-editable. Add them unconditionally — on non-A138-13
    // worksheets these symbols simply won't appear in fieldBySymbol, so the
    // entries in the set are harmless.
    for (const sym of BASIN_GOVERNING_SYMBOLS) {
      if (fieldBySymbol.has(sym)) set.add(sym);
    }
    // Tab.6 loading-check derived outputs (A138-12): T3-materialized on save.
    // Read-only via the same isComputed=true path. Harmless on other standards
    // because fieldBySymbol.has(sym) gates inclusion.
    for (const sym of LOADING_CHECK_SYMBOLS) {
      if (fieldBySymbol.has(sym)) set.add(sym);
    }
    return set;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedEquations, fieldBySymbol]);

  // Resolve the A_S,m determination-method BEFORE wiring the engine so the
  // suppress-write-back set is in scope at the useEquationEngine call site.
  // fieldBySymbol and values are both defined above (lines ~226 and ~185
  // respectively) — no dependency ordering problem.
  // On all worksheets other than A138-12 the `a_s_m_determination_method`
  // symbol is absent, asmMethod resolves to null, and suppression is empty
  // (behaviour identical to before this change).
  const asmMethodFieldHoisted = fieldBySymbol.get('a_s_m_determination_method');
  const asmMethodValueHoisted = asmMethodFieldHoisted ? values[asmMethodFieldHoisted.id] : undefined;
  const asmMethod: string | null =
    asmMethodValueHoisted?.type === 'enum' ? (asmMethodValueHoisted.value ?? null) : null;

  // Memoized suppression set: only contains 'A_S_m' when the engineer has
  // chosen the manual determination method; empty otherwise. Uses a stable
  // module-level EMPTY_SUPPRESSED constant so the memo/effect dep doesn't
  // churn on worksheets where asmMethod is always null.
  const engineSuppressedSymbols = useMemo<ReadonlySet<string>>(
    () => (asmMethod === 'manual' ? new Set(['A_S_m']) : EMPTY_SUPPRESSED),
    [asmMethod],
  );

  // Engine wiring lives in a shared hook so the integration test renders
  // EXACTLY the production code path (not a copy of it).
  const { engineEquationIds, engineStates } = useEquationEngine({
    worksheetCode: worksheet.template.code,
    fields,
    equations: sortedEquations,
    engineWhitelist: FORMULA_ENGINE_WHITELIST,
    ambiguousSymbols,
    suppressWriteBackSymbols: engineSuppressedSymbols,
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
  const engineCardsByOutputFieldId = useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    for (const eq of sortedEquations) {
      if (!engineEquationIds.has(eq.id)) continue;
      const state = engineStates[eq.id];
      if (!state) continue;
      const outField = eq.outputSymbol ? fieldBySymbol.get(eq.outputSymbol) : undefined;
      if (!outField) continue;
      map.set(
        outField.id,
        <div className="mt-3">
          <EquationEngineCard
            equationNumber={eq.equationNumber}
            sourceFormula={eq.formula}
            state={state}
            outputSymbol={eq.outputSymbol ?? ''}
            outputUnit={outField.unit ?? null}
            unitBySymbol={unitBySymbol}
            inheritedFromBySymbol={inheritedFromBySymbol}
          />
        </div>,
      );
    }
    return map;
  }, [
    sortedEquations,
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
    for (const eq of sortedEquations) {
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
  }, [sortedEquations, engineEquationIds, engineStates, fieldBySymbol]);

  // Engine equations whose outputSymbol has NO visible field — keep these in
  // the legacy bottom section so the engineer still sees the verdict.
  const orphanEngineEquations = useMemo(
    () =>
      sortedEquations.filter((eq) => {
        if (!engineEquationIds.has(eq.id)) return false;
        const outField = eq.outputSymbol ? fieldBySymbol.get(eq.outputSymbol) : undefined;
        return !outField;
      }),
    [sortedEquations, engineEquationIds, fieldBySymbol],
  );

  // A138-04 KOSTRA table: carrier field has symbol `r_D_n_table` and
  // data_type='json'; the engine reads it from the store. The carrier may hold
  // MULTIPLE source-tagged tables (Piece 2); it is EDITED on its owner (A138-04)
  // and merely REFERENCED by a per-facility `rainfall_table_ref` selector on the
  // consumer worksheets that inherit it.
  const kostraField = fields.find((f) => f.symbol === 'r_D_n_table');
  const rainfallRefField = fields.find((f) => f.symbol === 'rainfall_table_ref');
  const rainfallRefValue = rainfallRefField ? values[rainfallRefField.id] : undefined;
  const rainfallTableRef =
    (rainfallRefValue?.type === 'text' || rainfallRefValue?.type === 'enum') &&
    typeof rainfallRefValue.value === 'string'
      ? rainfallRefValue.value
      : null;
  const kostraValue = kostraField ? values[kostraField.id] : undefined;
  const rainfallTables = normalizeRainfallCarrier(
    kostraValue?.type === 'json' ? kostraValue.value : undefined,
  ).tables;

  // Design return-period for the rainfall editor: resolve project n/T_n via the
  // shared facilityReturnPeriod helper.  A pickNumberBySymbol closure reads from
  // the store's current values using the field-by-symbol map built above.
  const rainfallDesignReturnPeriod = useMemo(() => {
    const pick = (sym: string): number | null => {
      const f = fieldBySymbol.get(sym);
      if (!f) return null;
      const v = values[f.id];
      return v?.type === 'number' && v.value != null && Number.isFinite(v.value) ? v.value : null;
    };
    return facilityReturnPeriod(worksheet.template.code, pick);
  }, [fieldBySymbol, values, worksheet.template.code]);

  // A138-07 surface inventory: per-row Tab. 9 entries with C_i and C_s.
  const surfaceInventoryField = fields.find((f) => f.symbol === 'surface_inventory');

  // Upstream-cause state for consumer worksheets (A138-10). null when this
  // worksheet does not consume a surface-inventory source.
  const srcState = surfaceSource ? surfaceSourceState(surfaceSource.carrier, surfaceSource.status) : null;

  // Legacy naive sum-evaluator for everything NOT on the engine whitelist.
  // It ignores `formula` and just sums input_symbols — built for DIN-276 cost
  // roll-ups. Skips whitelisted equations so the engine output isn't clobbered.
  useEffect(() => {
    const numBySymbol: Record<string, number> = {};
    for (const f of fields) {
      const v = values[f.id];
      if (v?.type === 'number' && v.value != null && Number.isFinite(v.value)) {
        numBySymbol[f.symbol] = v.value;
      }
    }
    for (const eq of sortedEquations) {
      if (engineEquationIds.has(eq.id)) continue; // skip — engine owns this one
      const outSym = eq.outputSymbol;
      if (!outSym) continue;
      const outField = fieldBySymbol.get(outSym);
      if (!outField) continue;
      const inputs = eq.inputSymbols ?? [];
      let sum = 0;
      let hasInput = false;
      for (const s of inputs) {
        const n = numBySymbol[s];
        if (n !== undefined) {
          sum += n;
          hasInput = true;
        }
      }
      const computed = hasInput ? sum : null;
      if (computed !== null) numBySymbol[outSym] = computed;
      const current = values[outField.id];
      const currentNum = current?.type === 'number' ? current.value : null;
      if (currentNum !== computed) {
        setField(outField.id, { type: 'number', value: computed });
      }
    }
  }, [values, fields, sortedEquations, fieldBySymbol, setField, engineEquationIds]);

  // Hide deprecated AND inherited fields from rendering. visibleFields(...)
  // strips `active=false` rows; the additional filter strips inherited rows
  // (they show in a separate read-only panel since the engineer edits them
  // on the origin worksheet). The engine sees the unfiltered `fields` so
  // every consumed symbol is resolved.
  const fieldsBySectionId = useMemo(() => {
    const map = new Map<string | null, FieldDef[]>();
    for (const f of visibleFields(fields)) {
      if (f.inheritedFromWorksheet) continue;
      // rainfall_table_ref is rendered by its dedicated RainfallTableSelector
      // section (table-id picker), not as a raw text input in the field grid.
      if (f.symbol === 'rainfall_table_ref') continue;
      const key = f.sectionId ?? null;
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.orderIndex - b.orderIndex);
    }
    return map;
  }, [fields]);

  // The inherited-values panel content. Built once from `fields` + the
  // store's resolved values.
  const inheritedFieldsForPanel = useMemo(
    () => fields.filter((f) => f.inheritedFromWorksheet && f.active),
    [fields],
  );

  // Sections worth rendering: those holding at least one visible field
  // directly, plus every ancestor on the path up to such a section. DWA
  // worksheets carry many scaffold sections (Output Transfer Table, Notes &
  // Assumptions, Approval, Workflow Connection …) that collect nothing in this
  // form — we hide those empty headers instead of listing blank sections.
  const visibleSectionIds = useMemo(() => {
    const parentBySection = new Map(sections.map((s) => [s.id, s.parentSectionId]));
    const result = new Set<string>();
    for (const [sid, arr] of fieldsBySectionId) {
      if (!sid || arr.length === 0) continue;
      let cur: string | null = sid;
      while (cur && !result.has(cur)) {
        result.add(cur);
        cur = parentBySection.get(cur) ?? null;
      }
    }
    return result;
  }, [fieldsBySectionId, sections]);

  const topSections = sections.filter((s) => s.parentSectionId === null);
  const orphanFields = fieldsBySectionId.get(null) ?? [];
  const title = locale === 'de' ? worksheet.template.titleDe : worksheet.template.titleEn ?? worksheet.template.titleDe;

  // asmMethod is resolved above (hoisted before useEquationEngine) so it can be
  // forwarded both to the engine suppress-write-back set and to DynamicField here.
  // asmProvenance + asmNeedsReconfirmation are only consumed by DynamicField
  // (~line 558) so they stay here.
  const asmProvenanceField = fieldBySymbol.get('a_s_m_provenance');
  const asmProvenanceValue = asmProvenanceField ? values[asmProvenanceField.id] : undefined;
  const asmProvenance: string | null =
    asmProvenanceValue?.type === 'text' ? (asmProvenanceValue.value ?? null) : null;

  const asmReconfField = fieldBySymbol.get('a_s_m_needs_reconfirmation');
  const asmReconfValue = asmReconfField ? values[asmReconfField.id] : undefined;
  const asmNeedsReconfirmation: boolean | null =
    asmReconfValue?.type === 'boolean' ? (asmReconfValue.value ?? null) : null;

  const renderField = (sectionId: string | null) => {
    const fs = fieldsBySectionId.get(sectionId) ?? [];
    return fs.map((f) => {
      const overrideMeta = overrideMetaByOutputFieldId.get(f.id);

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

      return (
        <DynamicField
          key={f.id}
          field={f}
          locale={locale}
          projectId={projectId}
          standardCode={standardCode}
          sameSymbolHints={sameSymbolValuesBySymbol[f.symbol]}
          inheritedFrom={inheritedFromBySymbol[f.symbol]}
          docs={docs}
          isComputed={computedSymbols.has(f.symbol) && !(f.symbol === 'A_S_m' && asmMethod === 'manual')}
          prefillSource={prefillSourceByFieldId?.[f.id]}
          siteProfileKey={siteProfileKeyByFieldId?.[f.id]}
          inlineEngineCard={engineCardsByOutputFieldId.get(f.id)}
          overridePill={
            overrideMeta ? (
              <OverridePillForField
                fieldId={f.id}
                projectId={projectId}
                equationNumber={overrideMeta.equationNumber}
                outputSymbol={overrideMeta.outputSymbol}
                computedValue={overrideMeta.computedValue}
              />
            ) : undefined
          }
          isPlatformEngineer={isPlatformEngineer}
          readOnly={locked}
          statusReason={statusReason}
          asmMethod={asmMethod}
          asmProvenance={asmProvenance}
          asmNeedsReconfirmation={asmNeedsReconfirmation}
        />
      );
    });
  };

  return (
    <article className="space-y-8 max-w-3xl">
      <header className="border-b border-hairline pb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-2">
          {worksheet.template.code}
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
          <SaveIndicator status={saveStatus} />
        </div>
      </header>

      {locked && (
        <div
          role="status"
          data-testid="worksheet-lock-banner"
          className="border border-hairline rounded p-3 text-sm bg-paper-2 text-ink"
        >
          Schreibgeschützt (genehmigt/final) — zum Bearbeiten „Wieder öffnen".
        </div>
      )}

      {lastWarnings.length > 0 && (
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
      )}

      <SourceFormReferencePanel standardCode={standardCode} locale={locale} />

      {srcState && <SurfaceSourceBanner state={srcState} />}

      {inheritedFieldsForPanel.length > 0 && (
        <section
          className="border border-hairline rounded p-4 space-y-2"
          data-testid="inherited-values-panel"
        >
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            Vorgelagerte Werte (aus anderen Arbeitsblättern)
          </h2>
          <p className="text-[11px] text-subtext">
            Diese Werte stammen aus vorgelagerten Arbeitsblättern desselben
            Projekts. Zum Bearbeiten das angegebene Arbeitsblatt öffnen.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {inheritedFieldsForPanel.map((f) => {
              const v = values[f.id];
              const display =
                v?.type === 'number' && v.value != null && Number.isFinite(v.value)
                  ? new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v.value)
                  : v?.type === 'json' && v.value && typeof v.value === 'object'
                  ? '(Tabelle)'
                  : v?.type === 'enum' && v.value != null
                  ? (() => {
                      if (f.enumValues) {
                        const entry = f.enumValues.find((e) => e.value === v.value);
                        const label = locale === 'de' ? entry?.label_de : entry?.label_en;
                        return label ?? String(v.value);
                      }
                      return String(v.value);
                    })()
                  : v?.type === 'boolean' && v.value != null
                  ? (v.value ? 'Ja' : 'Nein')
                  : v?.type === 'text' && v.value
                  ? v.value
                  : '—';
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
            })}
          </ul>
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

      {surfaceSource && srcState && srcState.state !== 'missing' && (
        <section className="border-t border-hairline pt-6 mt-8 space-y-2">
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            Flächenverzeichnis (aus A138-07 — schreibgeschützt)
          </h2>
          <ReadOnlySurfaceTable carrier={surfaceSource.carrier} />
        </section>
      )}

      {/* Owner (A138-04): manage the project's rainfall table(s). */}
      {kostraField && !kostraField.inheritedFromWorksheet && (
        <section className="border-t border-hairline pt-6 mt-8 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            Regenspendentabellen (für V_VA nach Gl. 8)
          </h2>
          <RainfallTablesEditor fieldId={kostraField.id} readOnly={locked} designReturnPeriod={rainfallDesignReturnPeriod} />
        </section>
      )}

      {/* Consumer facility: choose WHICH table this facility uses (table id
          only — never an r_D(n) value). Rendered whenever the facility carries
          the rainfall_table_ref field; the table options come from the
          inherited carrier (empty list if none is inherited yet). Robust to
          carrier-inheritance state — never falls back to a raw text input. */}
      {rainfallRefField && !rainfallRefField.inheritedFromWorksheet && (
        <section className="border-t border-hairline pt-6 mt-8 space-y-2" data-testid="rainfall-table-ref-section">
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            Verwendete Regenspendentabelle
          </h2>
          <RainfallTableSelector
            tables={rainfallTables}
            value={rainfallTableRef}
            onSelect={(id) => setField(rainfallRefField.id, { type: 'text', value: id })}
            readOnly={locked}
          />
        </section>
      )}

      {surfaceInventoryField && (
        <section className="border-t border-hairline pt-6 mt-8 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            Flächenverzeichnis (Tab. 9 — C_i für Gl. 2 und C_s für Gl. 10)
          </h2>
          <SurfaceInventoryEditor fieldId={surfaceInventoryField.id} readOnly={locked} />
        </section>
      )}

      <EquationsBlock equations={equations} isPlatformEngineer={isPlatformEngineer} />

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

      <ComplianceBlock
        requirements={complianceRequirements}
        suggestions={complianceSuggestions}
        fields={fields.map((f) => ({ id: f.id, symbol: f.symbol }))}
        locale={locale}
        projectId={projectId}
      />
      <ApprovalBar
        instanceId={instance.id}
        status={instance.status}
        locale={locale}
        priorSnapshotCount={priorSnapshotCount ?? 0}
        diffHref={diffHref}
      />
    </article>
  );
}

const NUM_FMT = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 });
function fmt(v: number | null): string {
  return v != null && Number.isFinite(v) ? NUM_FMT.format(v) : '—';
}

/** Read-only mirror of the A138-07 surface-inventory carrier for consumer
 * worksheets (e.g. A138-10). No inputs; no store writes. */
function ReadOnlySurfaceTable({ carrier }: { carrier: unknown }) {
  const { rows } = normalizeSurfaceCarrier(carrier);
  if (rows.length === 0) return <p className="text-sm text-subtext">Keine Zeilen erfasst.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-subtext border-b border-hairline">
            <th className="pr-4 pb-1 font-normal">Bezeichnung</th>
            <th className="pr-4 pb-1 font-normal">Oberflächentyp</th>
            <th className="pr-4 pb-1 font-normal text-right">A (m²)</th>
            <th className="pr-4 pb-1 font-normal text-right">C_i</th>
            <th className="pr-4 pb-1 font-normal text-right">C_s</th>
            <th className="pb-1 font-normal text-right">A·C_i</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const typeLabel = row.tab9_value ? (lookupTab9(row.tab9_value)?.label ?? '—') : '—';
            const aCi = row.area_m2 != null && row.c_i != null ? row.area_m2 * row.c_i : null;
            return (
              <tr key={row.id} className="border-b border-hairline last:border-b-0">
                <td className="pr-4 py-1 text-ink">{row.label || '—'}</td>
                <td className="pr-4 py-1 text-ink">{typeLabel}</td>
                <td className="pr-4 py-1 font-mono tabular-nums text-right text-ink">{fmt(row.area_m2)}</td>
                <td className="pr-4 py-1 font-mono tabular-nums text-right text-ink">{fmt(row.c_i)}</td>
                <td className="pr-4 py-1 font-mono tabular-nums text-right text-ink">{fmt(row.c_s)}</td>
                <td className="py-1 font-mono tabular-nums text-right text-ink">{fmt(aCi)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
