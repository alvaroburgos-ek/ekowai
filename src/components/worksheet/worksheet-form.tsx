'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useWorksheetStore, type SaveStatus } from '@/lib/state/worksheet-store';
import { saveWorksheet } from '@/lib/actions/worksheet';
import { DynamicField } from './dynamic-field';
import { SectionGroup } from './section-group';
import { EquationsBlock } from './equations-block';
import { ComplianceBlock } from './compliance-block';
import { ApprovalBar } from './approval-bar';
import { EquationEngineCard } from './equation-engine-card';
import { SubAreasEditor } from './sub-areas-editor';
import { evaluateFormula, type EvalState } from '@/lib/eval/formula';
import { rewriteRules } from '@/lib/eval/rewrites';
import type { SubAreasCarrier } from '@/lib/eval/aggregators';

/**
 * Whitelist of (worksheetCode, equationNumber) the new mathjs evaluator
 * handles. Everything else falls through to the legacy naive sum-evaluator
 * below. Keep this VERY small until each entry has a hand-calc reference and
 * a unit test.
 */
const FORMULA_ENGINE_WHITELIST = new Set<string>(['A138-10:2']);

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

// WorksheetForm needs sectionId + orderIndex on top of what DynamicField requires.
type FieldDef = Parameters<typeof DynamicField>[0]['field'] & {
  sectionId: string | null;
  orderIndex: number;
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
  docs: Array<{ id: string; title: string; citationLabel: string }>;
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
  docs,
}: Props) {
  const init = useWorksheetStore((s) => s.init);
  const flush = useWorksheetStore((s) => s.flush);
  const setField = useWorksheetStore((s) => s.setField);
  const values = useWorksheetStore((s) => s.values);
  const saveStatus = useWorksheetStore((s) => s.saveStatus);
  const pendingFieldIds = useWorksheetStore((s) => s.pendingFieldIds);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (pendingFieldIds.size === 0) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void flush(saveWorksheet);
    }, 1000);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [pendingFieldIds, flush]);

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

  const computedSymbols = useMemo(() => {
    const set = new Set<string>();
    for (const e of sortedEquations) {
      const out = e.outputSymbol;
      if (out && fieldBySymbol.has(out)) set.add(out);
    }
    return set;
  }, [sortedEquations, fieldBySymbol]);

  // Equations the new mathjs engine handles for THIS worksheet. Everything
  // else stays on the legacy naive sum-evaluator below.
  const engineEquationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const eq of sortedEquations) {
      const key = `${worksheet.template.code}:${eq.equationNumber}`;
      if (FORMULA_ENGINE_WHITELIST.has(key)) ids.add(eq.id);
    }
    return ids;
  }, [sortedEquations, worksheet.template.code]);

  // A138-10 Gl. 2: the sub-areas carrier lives in the field with
  // symbol 'sub_areas_A138_10' as data_type=json. Read it from the store.
  const subAreasField = fieldBySymbol.get('sub_areas_A138_10');
  const subAreasCarrier = useMemo<SubAreasCarrier | null>(() => {
    if (!subAreasField) return null;
    const v = values[subAreasField.id];
    if (v?.type !== 'json') return null;
    const raw = v.value as { rows?: unknown } | null | undefined;
    if (!raw || !Array.isArray(raw.rows)) return { rows: [] };
    return raw as SubAreasCarrier;
  }, [values, subAreasField]);

  // Resolve eval state for each whitelisted equation. Pure derivation from
  // values + fields, so a memo (not an effect) is the right primitive — it
  // re-computes on dependency change without scheduling an extra render.
  const engineStates = useMemo<Record<string, EvalState>>(() => {
    const next: Record<string, EvalState> = {};
    for (const eq of sortedEquations) {
      if (!engineEquationIds.has(eq.id)) continue;

      // Determine the symbols the engine needs (after any rewrite remap)
      // and collect their resolved values + units from the wizard's fields.
      // The aggregator path (e.g. A138-10 Gl. 2) skips symbol resolution.
      const rewrite = rewriteRules[eq.id];
      const neededSymbols = rewrite
        ? Object.values(rewrite.remap)
        : eq.inputSymbols ?? [];

      const evalInputs = neededSymbols.map((sym) => {
        const f = fieldBySymbol.get(sym);
        const v = f ? values[f.id] : undefined;
        const num = v?.type === 'number' ? v.value : null;
        return { symbol: sym, value: num, unit: f?.unit ?? null };
      });

      const expectedUnits: Record<string, string | null> = {};
      for (const sym of neededSymbols) {
        const f = fieldBySymbol.get(sym);
        expectedUnits[sym] = f?.unit ?? null;
      }

      next[eq.id] = evaluateFormula({
        equationId: eq.id,
        formula: eq.formula,
        inputSymbols: eq.inputSymbols ?? [],
        outputSymbol: eq.outputSymbol ?? '',
        expectedUnits,
        inputs: evalInputs,
        aggregator: subAreasCarrier
          ? { subAreas: subAreasCarrier }
          : undefined,
      });
    }
    return next;
  }, [values, sortedEquations, fieldBySymbol, engineEquationIds, subAreasCarrier]);

  // For whitelisted equations: write the computed value into the output field
  // (so it lands in project_parameters via the normal save path). For non-
  // computed states, REVERT any auto-computed value back to null so the UI
  // never carries a stale number when the engine says manual_required/error.
  useEffect(() => {
    for (const eq of sortedEquations) {
      if (!engineEquationIds.has(eq.id)) continue;
      const outSym = eq.outputSymbol;
      if (!outSym) continue;
      const outField = fieldBySymbol.get(outSym);
      if (!outField) continue;
      const state = engineStates[eq.id];
      const current = values[outField.id];
      const currentNum = current?.type === 'number' ? current.value : null;
      const desired = state?.kind === 'computed' ? state.value : null;
      if (currentNum !== desired) {
        setField(outField.id, { type: 'number', value: desired });
      }
    }
  }, [engineStates, engineEquationIds, sortedEquations, fieldBySymbol, values, setField]);

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

  const fieldsBySectionId = useMemo(() => {
    const map = new Map<string | null, FieldDef[]>();
    for (const f of fields) {
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

  const topSections = sections.filter((s) => s.parentSectionId === null);
  const orphanFields = fieldsBySectionId.get(null) ?? [];
  const title = locale === 'de' ? worksheet.template.titleDe : worksheet.template.titleEn ?? worksheet.template.titleDe;

  const renderField = (sectionId: string | null) => {
    const fs = fieldsBySectionId.get(sectionId) ?? [];
    return fs.map((f) => (
      <DynamicField
        key={f.id}
        field={f}
        locale={locale}
        projectId={projectId}
        sameSymbolHints={sameSymbolValuesBySymbol[f.symbol]}
        inheritedFrom={inheritedFromBySymbol[f.symbol]}
        docs={docs}
        isComputed={computedSymbols.has(f.symbol)}
      />
    ));
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

      {orphanFields.length > 0 && (
        <section className="space-y-4">{renderField(null)}</section>
      )}

      {topSections.map((s) => (
        <SectionGroup
          key={s.id}
          section={s}
          allSections={sections}
          renderField={renderField}
          locale={locale}
        />
      ))}

      {subAreasField && (
        <section className="border-t border-hairline pt-6 mt-8 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            Teilflächen-Erfassung (für A_C nach Gl. 2)
          </h2>
          <SubAreasEditor fieldId={subAreasField.id} />
        </section>
      )}

      <EquationsBlock equations={equations} />

      {sortedEquations.some((eq) => engineEquationIds.has(eq.id)) && (
        <section className="border-t border-hairline pt-6 mt-2 space-y-3">
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            Engine-Auswertung (Vorschau)
          </h2>
          {sortedEquations
            .filter((eq) => engineEquationIds.has(eq.id))
            .map((eq) => {
              const state = engineStates[eq.id];
              if (!state) return null;
              const outField = eq.outputSymbol ? fieldBySymbol.get(eq.outputSymbol) : undefined;
              return (
                <EquationEngineCard
                  key={eq.id}
                  equationNumber={eq.equationNumber}
                  sourceFormula={eq.formula}
                  state={state}
                  outputSymbol={eq.outputSymbol ?? ''}
                  outputUnit={outField?.unit ?? null}
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
      <ApprovalBar instanceId={instance.id} status={instance.status} locale={locale} />
    </article>
  );
}
