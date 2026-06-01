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
import { KostraTableEditor } from './kostra-table-editor';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { visibleFields } from './visible-fields';

/**
 * Whitelist of (worksheetCode, equationNumber) the new mathjs evaluator
 * handles. Everything else falls through to the legacy naive sum-evaluator
 * below. Keep this VERY small until each entry has a hand-calc reference and
 * a unit test.
 */
const FORMULA_ENGINE_WHITELIST = new Set<string>([
  'A138-10:2',
  'A138-13:8',
  'A138-18:21',
  // §6.x.y batch
  'A138-12:4',
  'A138-12:7',
  'A138-16:11',
  'A138-16:12',
  'A138-17:16',
  'A138-18:17',
  // 'A138-18:18' — DELIBERATELY NOT WIRED. The DB formula omits the ×10³
  // factor that Gl. (4) has for the same physical quantity Q_S (l/s with
  // m, m², m/s inputs), so the literal evaluation returns m³/s — a 1000×
  // magnitude trap. The profile + notes + _eval-reference-Gl18.md remain
  // in place documenting the open question; the engine renders no result
  // on the form (manual_required) rather than a wrong-magnitude number.

  // Batch-2: Mulde + Rigole Speichervolumen (Gl. 14, 15, 19, 20, 22, 23)
  'A138-17:14', // V_M required (primary)
  'A138-17:15', // V_M geometric (displayOnly)
  'A138-18:19', // V_R required (primary)
  'A138-18:20', // V_R geometric (displayOnly)
  'A138-18:22', // s_R thin-wall (displayOnly)
  'A138-18:23', // L_R required (displayOnly)

  // Batch-3: §6.4.2 Rigole rest + §6.5.2 MRE + §6.6.2 MRS + §6.7.2 Schacht + §6.8.2 Becken
  'A138-18:24', // q_VS Versickerrohr Wasseraustritt
  'A138-18:25', // condition L_VS·q_VS ≥ r_5(n)·A_C·10⁻⁴
  'A138-19:26', // V_MR = V_M + V_R (displayOnly)
  'A138-19:27', // V_R = V_MR − V_M (displayOnly)
  'A138-19:28', // V_MR required MRE (primary)
  'A138-19:29', // L_R required MRE (displayOnly)
  'A138-20:30', // V_MUE Muldenüberlauf-Volumen
  'A138-20:31', // Q_MUE Muldenüberlauf-Abfluss
  'A138-20:32', // L_R MRS (displayOnly)
  'A138-20:33', // Q_Dr mean
  'A138-21:34', // A_S Schacht
  'A138-21:35', // V_S required (primary)
  'A138-21:36', // V_S geometric (displayOnly)
  'A138-21:37', // h_S required (primary)
  'A138-21:38', // condition Filterleistung
  'A138-21:39', // erf_k_f_FS minimum
  'A138-21:40', // h_S filter form (displayOnly)
  'A138-22:41', // V_VA Becken
  // 'A138-26:10' — PARKED. Gl. (10) V_Rück (flood check) uses SUM over flood-
  // sub-areas with flood-event runoff coefficient C_S. Requires a sub-areas
  // carrier with per-row C_S, which doesn't exist on A138-26 yet. Tracked
  // in _OPEN-ITEMS.md.
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
  ambiguousSymbols,
  prefillSourceByFieldId,
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

  // Engine wiring lives in a shared hook so the integration test renders
  // EXACTLY the production code path (not a copy of it).
  const { engineEquationIds, engineStates } = useEquationEngine({
    worksheetCode: worksheet.template.code,
    fields,
    equations: sortedEquations,
    engineWhitelist: FORMULA_ENGINE_WHITELIST,
    ambiguousSymbols,
  });

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
          />
        </div>,
      );
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

  // A138-10 sub-areas: render the editor only when the worksheet declares the
  // carrier field. The hook handles the rest.
  const subAreasField = fields.find((f) => f.symbol.startsWith('sub_areas_'));
  // A138-04 KOSTRA table: same pattern. The carrier field has symbol
  // `r_D_n_table` and data_type='json'; the engine reads it from the store.
  const kostraField = fields.find((f) => f.symbol === 'r_D_n_table');

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
        prefillSource={prefillSourceByFieldId?.[f.id]}
        inlineEngineCard={engineCardsByOutputFieldId.get(f.id)}
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
                  : '—';
              const label = locale === 'de' ? f.labelDe : (f.labelEn ?? f.labelDe);
              return (
                <li
                  key={f.id}
                  data-symbol={f.symbol}
                  data-inherited-from={f.inheritedFromWorksheet}
                  className="border-b border-hairline last:border-b-0 py-1 flex items-baseline justify-between gap-2"
                >
                  <div>
                    <div className="text-ink">
                      <code className="font-mono text-xs mr-2">{f.symbol}</code>
                      {label}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-subtext">
                      ← {f.inheritedFromWorksheet}
                      {f.unit && <span className="ml-2 text-ink-2">{f.unit}</span>}
                    </div>
                  </div>
                  <div className="font-mono tabular-nums text-ink">{display}</div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

      {kostraField && (
        <section className="border-t border-hairline pt-6 mt-8 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
            KOSTRA-Tabelle (für V_VA nach Gl. 8)
          </h2>
          <KostraTableEditor fieldId={kostraField.id} />
        </section>
      )}

      <EquationsBlock equations={equations} />

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
      <ApprovalBar instanceId={instance.id} status={instance.status} locale={locale} />
    </article>
  );
}
