'use client';

/**
 * WIDGETS registry — the ONE renderer path of `worksheet-form.tsx` (Plan 2b, Task 3).
 *
 * Every field renders through `renderWidget(f, ctx)` = `WIDGETS[effectiveWidget(f)]`:
 * - `effectiveWidget` = `field.widget` (DB, authoritative when non-null) else
 *   `inferWidget(dataType, hasEnumValues)` — so a `widget IS NULL` row renders
 *   exactly as before Plan 2b: scalar / select_one / attestation via
 *   `DynamicField` (the form's `renderDynamic` factory), json + enumValues via
 *   the DynamicField json-checklist branch, json without any config via the
 *   "Mehrzeilige Eingabe — Phase 2" placeholder.
 * - `register` resolves its config through `resolveRegisterConfig` (DB wins;
 *   TS fallbacks while widget IS NULL) and renders the generic `RegisterEditor`,
 *   unless a BESPOKE editor claims the field (`ui_config.editor`, or — while
 *   widget IS NULL — the symbol table below: KOSTRA rainfall tables, risk
 *   register, mitigation plan, and the Task-6 hand-off rainfall_table_ref).
 *   pollutant_register (VSME-B04.100) renders through the generic editor since
 *   Task 4 — its three per-medium sums are the Plan 2a fallback-equation states.
 * - Placement (`widgetPlacement`): registers follow `registerPlacement(cfg)`
 *   (undefined ⇒ bottom — the Plan-1 selection migrations carry no placement
 *   key); bespoke editors sit at the bottom under today's h2 titles; a legacy
 *   TS checklist stays at the bottom, a DB-configured select_many renders in
 *   its section (spec §6); everything else renders in its section.
 *
 * Visibility is NOT decided here: the form drops `visibility.hiddenFieldIds`
 * before dispatch (a hidden register renders nothing, like the old `shown()`).
 */
import { Fragment, type ReactNode } from 'react';
import { inferWidget, type Widget, type RegisterUiConfig } from '@/lib/eval/field-config';
import { resolveRegisterConfig } from '@/lib/eval/register-configs';
import { resolveSelectionConfig, type ChecklistConfig } from '@/lib/eval/selection-fields';
import { normalizeRainfallCarrier } from '@/lib/eval/rainfall-tables';
import type { EvalState } from '@/lib/eval/formula';
import type { Value } from '@/lib/expr';
import type { DynamicField } from './dynamic-field';
import { RegisterEditor, registerPlacement, type FooterState } from './register-editor';
import { ChecklistEditor } from './checklist-editor';
import { RainfallTablesEditor } from './rainfall-tables-editor';
import { RainfallTableSelector } from './rainfall-table-selector';
import { RiskRegisterEditor } from './risk-register-editor';
import { MitigationPlanEditor } from './mitigation-plan-editor';
import { EditorErrorBoundary } from './editor-error-boundary';

/** The form's field row: DynamicField's field + section/order/active + the inherited marker. */
export type WorksheetFormField = Parameters<typeof DynamicField>[0]['field'] & {
  sectionId: string | null;
  orderIndex: number;
  active: boolean;
  inheritedFromWorksheet?: string;
};

/** Mirrors the store's FieldValue (private there). */
export type WidgetFieldValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown };

export type WidgetContext = {
  standardCode: string;
  locale: 'de' | 'en';
  projectId: string;
  readOnly: boolean;
  fieldBySymbol: ReadonlyMap<string, WorksheetFormField>;
  values: Readonly<Record<string, WidgetFieldValue | undefined>>;
  setField: (id: string, v: WidgetFieldValue) => void;
  symbolLookup: (sym: string) => Value | undefined;
  engineStates: Readonly<Record<string, EvalState>>;
  /** The engine's equation list (DB rows + Plan 2a fallback register equations) — footer symbols resolve by outputSymbol. */
  equations: ReadonlyArray<{ id: string; outputSymbol: string | null; inputSymbols: string[] | null }>;
  computedSymbols: ReadonlySet<string>;
  serverComputedSet: ReadonlySet<string>;
  /** Bespoke RainfallTablesEditor input (unchanged). */
  rainfallDesignReturnPeriod: number | null;
  /** Today's `<DynamicField …/>` factory, owned by the form (computedHint, statusReason, override pill …). */
  renderDynamic: (f: WorksheetFormField) => ReactNode;
};

export type BespokeEditorKey =
  | 'rainfall_tables'
  | 'risk_register'
  | 'risk_mitigation_plan'
  /** Plan 2b Task 6 hand-off: the per-facility table-id picker stays on RainfallTableSelector until the `reference` widget lands. */
  | 'rainfall_table_ref';

/** Symbol-keyed bespoke editors — consulted ONLY while `widget IS NULL`. */
export const BESPOKE_BY_SYMBOL = {
  r_D_n_table: 'rainfall_tables',
  risk_register: 'risk_register',
  risk_mitigation_plan: 'risk_mitigation_plan',
  rainfall_table_ref: 'rainfall_table_ref',
} as const satisfies Record<string, BespokeEditorKey>;

/** Today's bottom-section h2 strings (worksheet-form.tsx before Plan 2b Task 3). */
export const BESPOKE_TITLES: Readonly<Record<BespokeEditorKey, string>> = {
  rainfall_tables: 'Regenspendentabellen (für V_VA nach Gl. 8)',
  risk_register: 'Risikoanalyse (Anhang A — Tab. A.1)',
  risk_mitigation_plan: 'Risiko-Maßnahmenplan (Anhang A — Tab. A.2)',
  rainfall_table_ref: 'Verwendete Regenspendentabelle',
};

export function effectiveWidget(f: WorksheetFormField): Widget {
  return (f.widget as Widget | null | undefined) ?? inferWidget(f.dataType, (f.enumValues?.length ?? 0) > 0);
}

/** `ui_config.editor` when set; else the symbol table while `widget IS NULL`; unknown keys never dispatch. */
export function resolveBespokeEditor(f: WorksheetFormField, cfg: RegisterUiConfig | null): BespokeEditorKey | null {
  const key = cfg?.editor ?? (f.widget == null ? BESPOKE_BY_SYMBOL[f.symbol as keyof typeof BESPOKE_BY_SYMBOL] : undefined);
  return key != null && Object.hasOwn(BESPOKE_TITLES, key) ? (key as BespokeEditorKey) : null;
}

const asDb = (f: WorksheetFormField) => ({
  symbol: f.symbol,
  dataType: f.dataType,
  enumValues: f.enumValues,
  widget: f.widget ?? null,
  uiConfig: f.uiConfig,
  lookup: f.lookup,
  visibleWhen: f.visibleWhen ?? null,
});

/** Checklist config for a select_many field — or, while `widget IS NULL`, the legacy TS checklist behind a json field
 * WITHOUT enum_values (`applicable_legal_bases` & co. infer to `register` but are checklists in SELECTION_CONFIGS). */
function resolveChecklist(f: WorksheetFormField): ChecklistConfig | null {
  const w = effectiveWidget(f);
  if (w !== 'select_many' && !(w === 'register' && f.widget == null)) return null;
  const sel = resolveSelectionConfig(asDb(f));
  return sel?.kind === 'checklist' ? sel : null;
}

/** Register config + bespoke key for a field (bespoke keys apply to any widget while `widget IS NULL`). A json field
 * WITH enum_values infers to select_many, but while `widget IS NULL` a symbol-keyed register config still wins over the
 * json-checklist branch — the pre-2b precedence (dedicated editor > selection config > grid). */
function resolveRegister(f: WorksheetFormField): { cfg: RegisterUiConfig | null; bespoke: BespokeEditorKey | null } {
  const w = effectiveWidget(f);
  const cfg = w === 'register' || (w === 'select_many' && f.widget == null) ? resolveRegisterConfig(asDb(f)) : null;
  return { cfg, bespoke: resolveBespokeEditor(f, cfg) };
}

export type Placement = 'section' | 'bottom';

export function widgetPlacement(f: WorksheetFormField): { placement: Placement; title: string | null } {
  const { cfg, bespoke } = resolveRegister(f);
  if (bespoke) return { placement: 'bottom', title: BESPOKE_TITLES[bespoke] };
  if (cfg) return { placement: registerPlacement(cfg), title: cfg.title };
  const checklist = resolveChecklist(f);
  // Legacy TS checklist ⇒ bottom (today); DB-configured select_many ⇒ its section (spec §6).
  if (checklist) return { placement: f.widget == null ? 'bottom' : 'section', title: checklist.title };
  return { placement: 'section', title: null };
}

/** Footer symbol → engine state of the equation producing it (+ label/unit from the field list). */
export function footerStatesFor(cfg: RegisterUiConfig, ctx: WidgetContext): Record<string, FooterState> {
  const out: Record<string, FooterState> = {};
  for (const sym of cfg.footer ?? []) {
    const eq = ctx.equations.find((e) => e.outputSymbol === sym);
    const field = ctx.fieldBySymbol.get(sym);
    out[sym] = { label: field?.labelDe ?? sym, unit: field?.unit ?? null, state: eq ? ctx.engineStates[eq.id] : undefined };
  }
  return out;
}

/** Task 6 hand-off: the per-facility selector picks a TABLE id of the (inherited) KOSTRA carrier — never a raw text input. */
function RainfallTableRef({ f, ctx }: { f: WorksheetFormField; ctx: WidgetContext }) {
  const kostraField = ctx.fieldBySymbol.get('r_D_n_table');
  const kostraValue = kostraField ? ctx.values[kostraField.id] : undefined;
  const tables = normalizeRainfallCarrier(kostraValue?.type === 'json' ? kostraValue.value : undefined).tables;
  const v = ctx.values[f.id];
  const value = (v?.type === 'text' || v?.type === 'enum') && typeof v.value === 'string' ? v.value : null;
  return (
    <RainfallTableSelector
      tables={tables}
      value={value}
      onSelect={(id) => ctx.setField(f.id, { type: 'text', value: id })}
      readOnly={ctx.readOnly}
    />
  );
}

function renderBespoke(key: BespokeEditorKey, f: WorksheetFormField, ctx: WidgetContext): ReactNode {
  switch (key) {
    case 'rainfall_tables':
      return <RainfallTablesEditor fieldId={f.id} readOnly={ctx.readOnly} designReturnPeriod={ctx.rainfallDesignReturnPeriod} />;
    case 'risk_register':
      return (
        <EditorErrorBoundary label="Risikoregister">
          <RiskRegisterEditor fieldId={f.id} readOnly={ctx.readOnly} />
        </EditorErrorBoundary>
      );
    case 'risk_mitigation_plan':
      return (
        <EditorErrorBoundary label="Risiko-Maßnahmenplan">
          <MitigationPlanEditor fieldId={f.id} readOnly={ctx.readOnly} />
        </EditorErrorBoundary>
      );
    case 'rainfall_table_ref':
      return <RainfallTableRef f={f} ctx={ctx} />;
  }
}

/** Scalar-shaped widgets: a symbol-keyed bespoke editor (rainfall_table_ref) wins while widget IS NULL, else DynamicField. */
const dynamicOrBespoke = (f: WorksheetFormField, ctx: WidgetContext): ReactNode => {
  const bespoke = resolveBespokeEditor(f, null);
  return bespoke ? renderBespoke(bespoke, f, ctx) : ctx.renderDynamic(f);
};

const checklistOrDynamic = (f: WorksheetFormField, ctx: WidgetContext): ReactNode => {
  const checklist = resolveChecklist(f);
  if (!checklist) return ctx.renderDynamic(f);
  return (
    <EditorErrorBoundary label={checklist.title}>
      <ChecklistEditor fieldId={f.id} config={checklist} readOnly={ctx.readOnly} />
    </EditorErrorBoundary>
  );
};

export const WIDGETS: Record<Widget, (f: WorksheetFormField, ctx: WidgetContext) => ReactNode> = {
  scalar: dynamicOrBespoke,
  select_one: dynamicOrBespoke,
  attestation: dynamicOrBespoke,
  derived: dynamicOrBespoke,
  // No standalone grid renderer in Plan 2b (grid ships as a register COLUMN, Task 9) — json placeholder as today.
  grid: dynamicOrBespoke,
  // widget IS NULL ⇒ same precedence as the register branch (symbol-keyed register/bespoke config wins, then the TS
  // checklist); json + enumValues without any config ⇒ dynamic-field.tsx json-checklist branch (unchanged).
  select_many: (f, ctx) => (f.widget == null ? WIDGETS.register(f, ctx) : checklistOrDynamic(f, ctx)),
  register: (f, ctx) => {
    const { cfg, bespoke } = resolveRegister(f);
    if (bespoke) return renderBespoke(bespoke, f, ctx);
    // Legacy TS checklist behind a json field, else json without any config ⇒
    // "Mehrzeilige Eingabe — Phase 2" placeholder (dynamic-field.test.tsx pin).
    if (!cfg) return checklistOrDynamic(f, ctx);
    return (
      <EditorErrorBoundary label={cfg.title}>
        <RegisterEditor
          fieldId={f.id}
          symbol={f.symbol}
          config={cfg}
          standardCode={ctx.standardCode}
          readOnly={ctx.readOnly}
          footerStates={footerStatesFor(cfg, ctx)}
          symbolLookup={ctx.symbolLookup}
        />
      </EditorErrorBoundary>
    );
  },
  // Plan 2b Task 6 (`reference`) / Task 7 (`lookup_fill`) replace these stubs; no prod row carries either widget yet.
  reference: (f, ctx) => ctx.renderDynamic(f),
  lookup_fill: (f, ctx) => ctx.renderDynamic(f),
};

/** The form's single dispatch: `WIDGETS[effectiveWidget(f)]`. */
export function renderWidget(f: WorksheetFormField, ctx: WidgetContext): ReactNode {
  return <Fragment key={f.id}>{WIDGETS[effectiveWidget(f)](f, ctx)}</Fragment>;
}
