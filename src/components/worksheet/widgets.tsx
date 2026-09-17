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
 *   register, mitigation plan). pollutant_register (VSME-B04.100) renders
 *   through the generic editor since Task 4 — its three per-medium sums are
 *   the Plan 2a fallback-equation states.
 * - `reference` renders `ReferenceField` (Task 6): a select over another
 *   carrier's rows storing the row ID. While `widget IS NULL`, a scalar-shaped
 *   field whose symbol is in REFERENCE_CONFIGS_FALLBACK (rainfall_table_ref)
 *   renders it too — RainfallTableSelector is deleted.
 * - `lookup_fill` renders `LookupFillField` (Task 7): one regulation-table
 *   row's value with a source badge; display mode when the form owns the
 *   symbol server-side, fill mode + policy-driven audited override otherwise.
 *   While `widget IS NULL`, a scalar-shaped field whose symbol is in
 *   LOOKUP_BINDINGS_FALLBACK (ac_as_ratio_limit) renders it too.
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
import type { FieldValue } from '@/lib/state/worksheet-store';
import { inferWidget, type Widget, type RegisterUiConfig } from '@/lib/eval/field-config';
import { resolveRegisterConfig } from '@/lib/eval/register-configs';
import { resolveSelectionConfig, type ChecklistConfig } from '@/lib/eval/selection-fields';
import { resolveReferenceConfig } from '@/lib/eval/reference-configs';
import { resolveLookupFillBinding } from '@/lib/eval/lookup-fill';
import type { EvalState } from '@/lib/eval/formula';
import type { Value } from '@/lib/expr';
import type { DynamicField } from './dynamic-field';
import { RegisterEditor, registerPlacement, type FooterState } from './register-editor';
import { ChecklistEditor } from './checklist-editor';
import { RainfallTablesEditor } from './rainfall-tables-editor';
import { ReferenceField } from './reference-field';
import { LookupFillField } from './lookup-fill-field';
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

export type WidgetContext = {
  standardCode: string;
  locale: 'de' | 'en';
  projectId: string;
  readOnly: boolean;
  fieldBySymbol: ReadonlyMap<string, WorksheetFormField>;
  values: Readonly<Record<string, FieldValue | undefined>>;
  setField: (id: string, v: FieldValue) => void;
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
  | 'risk_mitigation_plan';

/** Symbol-keyed bespoke editors — consulted ONLY while `widget IS NULL`. */
export const BESPOKE_BY_SYMBOL = {
  r_D_n_table: 'rainfall_tables',
  risk_register: 'risk_register',
  risk_mitigation_plan: 'risk_mitigation_plan',
} as const satisfies Record<string, BespokeEditorKey>;

/** Today's bottom-section h2 strings (worksheet-form.tsx before Plan 2b Task 3). */
export const BESPOKE_TITLES: Readonly<Record<BespokeEditorKey, string>> = {
  rainfall_tables: 'Regenspendentabellen (für V_VA nach Gl. 8)',
  risk_register: 'Risikoanalyse (Anhang A — Tab. A.1)',
  risk_mitigation_plan: 'Risiko-Maßnahmenplan (Anhang A — Tab. A.2)',
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
  }
}

const reference = (f: WorksheetFormField, ctx: WidgetContext): ReactNode => <ReferenceField field={f} ctx={ctx} />;
const lookupFill = (f: WorksheetFormField, ctx: WidgetContext): ReactNode => <LookupFillField field={f} ctx={ctx} />;

/** Scalar-shaped widgets: while widget IS NULL a symbol in REFERENCE_CONFIGS_FALLBACK (rainfall_table_ref — a `text`
 * field, so it infers to scalar) renders the reference widget, and a symbol in LOOKUP_BINDINGS_FALLBACK
 * (ac_as_ratio_limit — a `number` field) renders the lookup_fill widget (Task 7; display mode there, because the form's
 * LOADING_CHECK_SYMBOLS marks it server-owned); else DynamicField. */
const dynamicOrReference = (f: WorksheetFormField, ctx: WidgetContext): ReactNode => {
  if (f.widget != null) return ctx.renderDynamic(f);
  if (resolveReferenceConfig(f)) return reference(f, ctx);
  if (resolveLookupFillBinding(f)) return lookupFill(f, ctx);
  return ctx.renderDynamic(f);
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
  scalar: dynamicOrReference,
  select_one: dynamicOrReference,
  attestation: dynamicOrReference,
  derived: dynamicOrReference,
  // No standalone grid renderer in Plan 2b (grid ships as a register COLUMN, Task 9) — json placeholder as today.
  grid: dynamicOrReference,
  // widget IS NULL ⇒ same precedence as the register branch (symbol-keyed register/bespoke config wins, then the TS
  // checklist); json + enumValues without any config ⇒ dynamic-field.tsx json-checklist branch (unchanged).
  select_many: (f, ctx) => (f.widget == null ? WIDGETS.register(f, ctx) : checklistOrDynamic(f, ctx)),
  register: (f, ctx) => {
    const { cfg, bespoke } = resolveRegister(f);
    if (bespoke) return renderBespoke(bespoke, f, ctx);
    // A DB `register` whose ui_config fails parseFieldConfig: visible notice + today's dynamic input, never silent
    // (mirror of `reference-unconfigured`, final-review minor).
    if (!cfg && f.widget === 'register') {
      return (
        <div className="space-y-1">
          <p data-testid="register-unconfigured" className="text-[11px] text-warning">Register nicht konfiguriert (ui_config ungültig)</p>
          {ctx.renderDynamic(f)}
        </div>
      );
    }
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
          projectId={ctx.projectId}
        />
      </EditorErrorBoundary>
    );
  },
  reference,
  // Task 7: table value with source badge + policy-driven override (display mode for server-owned symbols).
  lookup_fill: lookupFill,
};

/** The form's single dispatch: `WIDGETS[effectiveWidget(f)]`. An out-of-enum DB `widget` string (schema.ts types the
 * column as text; the CHECK constraint lives in an unapplied migration) falls back to the scalar renderer, never a blank —
 * own-key check, so a prototype name like 'toString' never resolves to a function (Task 3 re-review). */
export function renderWidget(f: WorksheetFormField, ctx: WidgetContext): ReactNode {
  const w = effectiveWidget(f);
  const render = Object.hasOwn(WIDGETS, w) ? WIDGETS[w] : WIDGETS.scalar;
  return <Fragment key={f.id}>{render(f, ctx)}</Fragment>;
}
