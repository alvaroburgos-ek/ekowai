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
const registerColumn = z.object({
  key: z.string().min(1), label: z.string().min(1),
  type: z.enum(['text','number','boolean','enum','date','lookup_key','lookup_value','derived','grid']),
  required: z.boolean().optional(), options: z.array(z.string()).optional(), datalist: z.array(z.string()).optional(),
  unit: z.string().optional(), min: z.number().optional(), max: z.number().optional(), placeholder: z.string().optional(), width: z.string().optional(),
  discriminator: z.boolean().optional(), visible_when: z.string().optional(), lookup: columnLookup.optional(), expr: z.string().optional(),
}).superRefine((c, ctx) => {
  if ((c.type === 'lookup_key' || c.type === 'lookup_value') && !c.lookup) ctx.addIssue({ code: 'custom', path: ['lookup'], message: `${c.type} column needs lookup` });
  if (c.type === 'lookup_value' && !c.lookup?.key_column) ctx.addIssue({ code: 'custom', path: ['lookup'], message: 'lookup_value needs lookup.key_column' });
  if (c.type === 'derived' && !c.expr) ctx.addIssue({ code: 'custom', path: ['expr'], message: 'derived column needs expr' });
});
export type RegisterColumn = z.infer<typeof registerColumn>;

const registerUi = z.object({
  title: z.string().min(1), subtitle: z.string().optional(), add_label: z.string().optional(), note: z.string().optional(),
  placement: z.enum(['section', 'bottom']).optional(), columns: z.array(registerColumn).min(1),
  sum_column: z.object({ key: z.string(), label: z.string(), unit: z.string().optional() }).optional(),
  override: z.object({ flag_key: z.string(), applies_to: z.array(z.string()).min(1), policy: z.enum(['anhaltswert','kann','messwert']) }).optional(),
  legacy_map: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  footer: z.array(z.string()).optional(), editor: z.string().optional(),
  /** Register-level boolean flags stored on the carrier (e.g. `not_applicable`), read by `flag()`. */
  flags: z.array(z.object({ key: z.string().min(1), label: z.string().optional() })).optional(),
});
export type RegisterUiConfig = z.infer<typeof registerUi>;

const selectManyUi = z.object({
  title: z.string().min(1), subtitle: z.string().optional(), note: z.string().optional(), allow_custom: z.boolean().optional(),
  groups: z.array(z.object({ label: z.string(), options: z.array(z.string()) })).optional(),
});
export type SelectManyUiConfig = z.infer<typeof selectManyUi>;

const anyUi = z.record(z.string(), z.unknown());
// Every widget has a schema here (none is the JS value `null`) — select_many
// and register are REQUIRED (non-nullable): a select_many/register row with
// a null ui_config has no `title` to render and must be rejected by
// parseFieldConfig, not silently pass through as a title-less config (C-2,
// fix round: fromDbField's catch then returns null instead of fabricating
// `{title: undefined, ...}`). The rest stay optional-object-or-null.
const UI_BY_WIDGET: Record<Widget, z.ZodTypeAny> = {
  select_one: anyUi.nullable(), select_many: selectManyUi, lookup_fill: anyUi.nullable(), register: registerUi,
  grid: anyUi.nullable(), reference: anyUi.nullable(), derived: anyUi.nullable(), attestation: anyUi.nullable(), scalar: anyUi.nullable(),
};

export type FieldConfig = { widget: Widget | null; ui: RegisterUiConfig | SelectManyUiConfig | Record<string, unknown> | null; lookup: LookupBinding | null; visibleWhen: string | null };
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
