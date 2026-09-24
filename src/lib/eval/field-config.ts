import { z } from 'zod';

export const WIDGETS = ['select_one','select_many','lookup_fill','register','grid','reference','derived','attestation','scalar'] as const;
export type Widget = (typeof WIDGETS)[number];

const lookupBinding = z.object({
  table_code: z.string().min(1),
  edition: z.string().optional(),
  role: z.enum(['value', 'limit']),
  keys: z.array(z.object({ column: z.string().min(1), from_symbol: z.string().min(1) })).min(1),
  value: z.string().min(1),
});
export type LookupBinding = z.infer<typeof lookupBinding>;

const columnLookup = z.object({ table_code: z.string().min(1), key_column: z.string().optional(), value: z.string().optional(), group_by: z.string().optional() });
/** Plan 2b Task 9: a `grid` column is a rows×cols matrix of small inputs stored as `row[key][rowKey][colKey]`. */
const gridSpec = z.object({
  rows: z.array(z.object({ key: z.string().min(1), label: z.string().min(1) })).min(1),
  cols: z.array(z.object({ key: z.string().min(1), label: z.string().min(1), min: z.number().optional(), max: z.number().optional(), step: z.number().optional(), options: z.array(z.string()).optional() })).min(1),
});
export type GridSpec = z.infer<typeof gridSpec>;
const labelMap = z.record(z.string(), z.string());
const registerColumn = z.object({
  key: z.string().min(1), label: z.string().min(1),
  type: z.enum(['text','number','boolean','enum','date','lookup_key','lookup_value','derived','grid']),
  required: z.boolean().optional(), options: z.array(z.string()).optional(), datalist: z.array(z.string()).optional(),
  unit: z.string().optional(), min: z.number().optional(), max: z.number().optional(), placeholder: z.string().optional(), width: z.string().optional(),
  discriminator: z.boolean().optional(), visible_when: z.string().optional(), lookup: columnLookup.optional(), expr: z.string().optional(),
  // Plan 2b — display-only keys (no guideline value lives here; option/value
  // labels are presentation for values that already exist in `options` / the
  // derived expr's result set).
  /** Input aria-label when it must differ from the header label (e.g. header "A", aria "Fläche"). */
  aria_label: z.string().optional(),
  /** enum: display label per option value. */
  option_labels: labelMap.optional(),
  /** enum: sort the options by their option_labels (localeCompare) instead of declaration order. */
  sort_by_label: z.boolean().optional(),
  /** derived: `badge` renders as small uppercase text under the key column instead of its own cell. */
  display: z.enum(['cell', 'badge']).optional(),
  /** derived/enum: display label per computed/selected value. */
  value_labels: labelMap.optional(),
  /** grid: the rows×cols spec (Task 9). Optional at the contract level — Plan 2a already accepts a bare grid column. */
  grid: gridSpec.optional(),
}).superRefine((c, ctx) => {
  if ((c.type === 'lookup_key' || c.type === 'lookup_value') && !c.lookup) ctx.addIssue({ code: 'custom', path: ['lookup'], message: `${c.type} column needs lookup` });
  if (c.type === 'lookup_value' && !c.lookup?.key_column) ctx.addIssue({ code: 'custom', path: ['lookup'], message: 'lookup_value needs lookup.key_column' });
  if (c.type === 'derived' && !c.expr) ctx.addIssue({ code: 'custom', path: ['expr'], message: 'derived column needs expr' });
});
export type RegisterColumn = z.infer<typeof registerColumn>;

/** Register-level boolean flag stored on the carrier (e.g. `not_applicable`), read by `flag()`. */
const registerFlag = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
  /** Help text rendered under the flag's checkbox. */
  note: z.string().optional(),
  /** When true, the row table is disabled while the flag is on (explicit null-report). */
  disables_rows: z.boolean().optional(),
});
export type RegisterFlag = z.infer<typeof registerFlag>;

const registerUi = z.object({
  title: z.string().min(1), subtitle: z.string().optional(), add_label: z.string().optional(), note: z.string().optional(),
  placement: z.enum(['section', 'bottom']).optional(), columns: z.array(registerColumn).min(1),
  sum_column: z.object({ key: z.string(), label: z.string(), unit: z.string().optional() }).optional(),
  override: z.object({ flag_key: z.string(), applies_to: z.array(z.string()).min(1), policy: z.enum(['anhaltswert','kann','messwert']) }).optional(),
  legacy_map: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  /**
   * Plan 3 final wave B (defect 5, `iso59020-F-2`; Plan-2c backlog 7) — the column keys that
   * together identify a row. Two rows agreeing on ALL of them are duplicates: the editor says
   * so, visibly and non-blockingly, and changes nothing (never drops, merges or renumbers an
   * engineer's row). Without it a duplicate row silently inflates every `count_rows` gate —
   * ISO-59020 had to rewrite its G-4 as six per-token clauses to close the hole.
   */
  unique_by: z.array(z.string().min(1)).min(1).optional(),
  /** Symbols whose engine values are shown as a footer line under the table (Σ previews). */
  footer: z.array(z.string()).optional(), editor: z.string().optional(),
  /** Register-level boolean flags stored on the carrier (e.g. `not_applicable`), read by `flag()`. */
  flags: z.array(registerFlag).optional(),
  /** Plan 2b Task 9: grouped catalog picker that pre-fills `group_column`/`item_column` of a new row. */
  catalog: z.object({
    group_column: z.string().min(1), item_column: z.string().min(1),
    groups: z.array(z.object({ label: z.string().min(1), items: z.array(z.string()).min(1) })).min(1),
    add_custom_label: z.string().optional(),
  }).optional(),
}).superRefine((ui, ctx) => {
  // Plan 2b Task 5 (controller amendment): the editor's "abweichend" toggle
  // writes `row[override.flag_key]`, and the stored-cells projection keeps
  // only declared columns — so a flag_key that is not a `boolean` column
  // would be written by the toggle and silently dropped on save. Reject at
  // parse time instead.
  if (!ui.override) return;
  const col = ui.columns.find((c) => c.key === ui.override!.flag_key);
  if (!col || col.type !== 'boolean') {
    ctx.addIssue({ code: 'custom', path: ['override', 'flag_key'], message: `override.flag_key "${ui.override.flag_key}" must name a boolean column` });
  }
});
export type RegisterUiConfig = z.infer<typeof registerUi>;

/** `reference` widget: pick one row of another carrier (e.g. a KOSTRA table) by id and store the id. */
const referenceUi = z.object({
  title: z.string().optional(), aria_label: z.string().optional(),
  carrier_symbol: z.string().min(1), rows_path: z.string().min(1),
  id_key: z.string().min(1), label_key: z.string().min(1),
  badge_key: z.string().optional(), badge_labels: labelMap.optional(), empty_label: z.string().optional(),
});
export type ReferenceUiConfig = z.infer<typeof referenceUi>;

/** `lookup_fill` widget presentation (the data binding lives in `lookup`, not here). */
const lookupFillUi = z.object({ source_label: z.string().optional(), reason_min_length: z.number().int().min(10).optional() });
export type LookupFillUiConfig = z.infer<typeof lookupFillUi>;

const selectManyUi = z.object({
  title: z.string().min(1), subtitle: z.string().optional(), note: z.string().optional(), allow_custom: z.boolean().optional(),
  groups: z.array(z.object({ label: z.string(), options: z.array(z.string()) })).optional(),
});
export type SelectManyUiConfig = z.infer<typeof selectManyUi>;

const anyUi = z.record(z.string(), z.unknown());
// Every widget has a schema here (none is the JS value `null`) — select_many,
// register and reference are REQUIRED (non-nullable): a select_many/register
// row with a null ui_config has no `title` to render and must be rejected by
// parseFieldConfig, not silently pass through as a title-less config (C-2,
// fix round: fromDbField's catch then returns null instead of fabricating
// `{title: undefined, ...}`); a reference without its carrier binding
// (carrier_symbol/rows_path/id_key/label_key) cannot render at all (Plan 2b —
// no prod row carries widget='reference' before the Plan 2b migrations).
// lookup_fill is typed-object-or-null (Plan 2b); the rest stay
// optional-object-or-null.
const UI_BY_WIDGET: Record<Widget, z.ZodTypeAny> = {
  select_one: anyUi.nullable(), select_many: selectManyUi, lookup_fill: lookupFillUi.nullable(), register: registerUi,
  grid: anyUi.nullable(), reference: referenceUi, derived: anyUi.nullable(), attestation: anyUi.nullable(), scalar: anyUi.nullable(),
};

export type FieldConfig = { widget: Widget | null; ui: RegisterUiConfig | SelectManyUiConfig | ReferenceUiConfig | LookupFillUiConfig | Record<string, unknown> | null; lookup: LookupBinding | null; visibleWhen: string | null };
export class FieldConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FieldConfigError';
  }
}

function formatIssues(issues: z.core.$ZodIssue[]): string {
  return issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ');
}

export function parseFieldConfig(row: { widget: string | null; uiConfig: unknown; lookup: unknown; visibleWhen: string | null }): FieldConfig {
  if (row.widget == null) return { widget: null, ui: null, lookup: null, visibleWhen: row.visibleWhen ?? null };
  if (!(WIDGETS as readonly string[]).includes(row.widget)) throw new FieldConfigError(`unknown widget "${row.widget}"`);
  const widget = row.widget as Widget;
  const ui = UI_BY_WIDGET[widget].safeParse(row.uiConfig ?? null);
  if (!ui.success) throw new FieldConfigError(`ui_config invalid for ${widget}: ${formatIssues(ui.error.issues)}`);
  let lookup: LookupBinding | null = null;
  if (widget === 'lookup_fill') {
    const l = lookupBinding.safeParse(row.lookup);
    if (!l.success) throw new FieldConfigError(`lookup binding required for lookup_fill: ${formatIssues(l.error.issues)}`);
    lookup = l.data;
  } else if (row.lookup != null) {
    // A `lookup` binding only means anything for lookup_fill — every other
    // widget's data binding (if any) lives inside ui_config.columns[].lookup
    // (register lookup_key/lookup_value columns). A non-null top-level
    // `lookup` on any other widget is either stale data or a config-author
    // mistake; reject loudly rather than silently ignore it.
    throw new FieldConfigError('lookup binding only valid for lookup_fill');
  }
  return { widget, ui: (ui.data as FieldConfig['ui']) ?? null, lookup, visibleWhen: row.visibleWhen ?? null };
}

export function inferWidget(dataType: string, hasEnumValues: boolean): Widget {
  switch (dataType) {
    case 'enum': return 'select_one';
    case 'boolean': return 'attestation';
    case 'json': return hasEnumValues ? 'select_many' : 'register';
    default: return 'scalar';
  }
}
