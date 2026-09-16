# Guideline → Tool — Plan 2b (Phases 3–4, editor half: generic `RegisterEditor`, `surface_inventory` + `pollutant_register` onto it, `reference` and `lookup_fill` renderers, one renderer path in `worksheet-form.tsx`, risk register → register + grid column) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three hand-written carrier editors (A138-07 surface inventory, VSME-B04 pollutant register, the `StructuredRegisterEditor` for the 36 TS selection registers) and the symbol-keyed wiring in `worksheet-form.tsx` with ONE `RegisterEditor` driven by the Plan-1 `register` `ui_config` contract, add the two missing scalar renderers (`reference`, `lookup_fill`), and make `renderField(f)` dispatch every field through a `WIDGETS` registry keyed on `f.widget ?? inferWidget(f)` — so a guideline encoded as data (Plan 3) renders without a line of TypeScript, and the editor never computes a guideline value (it displays engine states from Plan 2a).

**Architecture:** (1) `src/components/worksheet/register-editor.tsx` — one row editor whose cells are typed by `RegisterColumn.type` (`text | number | boolean | enum | date | lookup_key | lookup_value | derived`, plus the new `grid` type for Task 9); it reads the carrier through Plan 2a's `prepareRegisterRows` (legacy replay, refill, derived cells, completeness) and writes back stored cells only (`{ rows: [...], <flags> }`); footer values are engine states looked up by `ui_config.footer` symbols, never sums computed in the editor. (2) `src/components/worksheet/widgets.tsx` — the `WIDGETS` registry (`select_one | select_many | lookup_fill | register | grid | reference | derived | attestation | scalar`) plus `resolveBespokeEditor` for the three editors spec §5.3 keeps bespoke (KOSTRA rainfall tables, risk register until Task 9, mitigation plan); `worksheet-form.tsx` renders a field by calling `WIDGETS[effectiveWidget(f)]`, in its section or in the bottom strip per `ui_config.placement`. (3) `reference-field.tsx` and `lookup-fill-field.tsx` — scalar renderers over another carrier's rows / over a `regulation_tables` row; the `lookup_fill` override sidecar is realised as *derived* `{table_value, override}` (the table is the single source, never copied) plus the existing `recordManualOverride` audit-log path for the reason. (4) Migrations (WRITTEN, NOT APPLIED) that set `fields.widget/ui_config/lookup` for `surface_inventory`, `pollutant_register`, `rainfall_table_ref` and `ac_as_ratio_limit`, emitted by a script from the TS fallback configs with a freshness pin — code behaves identically with none of them applied (TS fallback while `widget IS NULL`).

**Tech Stack:** Next.js 16 / React 19, zustand store (`src/lib/state/worksheet-store.ts`), Drizzle (schema only), raw SQL data migrations under `scripts/migrations/` with rollbacks, zod 4 (`src/lib/eval/field-config.ts`), vitest (`pnpm test` = unit project, happy-dom; render tests with `@testing-library/react` + `userEvent`).

**Spec:** `docs/superpowers/specs/2026-09-11-guideline-to-tool-generic-fields-design.md` §4 (shapes 3, 4, 5, 6 + discriminator note), §5.3 (what stays bespoke), §6 ("One renderer path", inheritance unchanged), §7 (override policies), §8 phases 3–4, §9 risks 4/5, §11 render tests. Evidence: `docs/superpowers/specs/2026-09-11-guideline-to-tool/ARCH-PROPOSAL-fable.md` §2 (worked example A: the `surface_inventory` `ui_config`), §3 (runtime architecture, "Removed / retired", "Must remain bespoke"). Plan 1 = `docs/superpowers/plans/2026-09-11-guideline-to-tool-plan-1-schema-tables-configs.md` (Tasks 2, 7, 9 interfaces consumed here). Plan 2a = `docs/superpowers/plans/2026-09-16-guideline-to-tool-plan-2a-expression-language-visibility-materialiser.md` — **this plan starts only after Plan 2a Tasks 1–11 are committed**; every 2a interface it consumes is named in the task's Interfaces block. Every `file:line` below was read on `4c3355b` (2a Task 1 landed) — line numbers in files 2a modifies (`worksheet-form.tsx`, `dynamic-field.tsx`, `page.tsx`, `field-config.ts`) may shift by 2a's edits; the executor re-locates by the quoted code, not the number.

**Branch / worktree:** `feat/guideline-to-tool` in `C:\Users\Ekowai\_wt-g2t`. Run every command from that directory. Commit as Alvaro (`git config user.email` = `alvaro.burgos@ekowai.com`). Never run `scripts/apply-migration.mjs`, `drizzle-kit`, `vercel`, or any DB write from an assistant session; `node scripts/verification/prod-query.mjs` (read-only) is allowed.

## Global Constraints

- Single-source derivation invariant: the editor DISPLAYS engine states and table rows; it never computes a symbol. The only arithmetic left in an editor is the legacy `sum_column` footer display (Plan-1 contract, display-only, never persisted — sign-off D-2b-5 retires it). Derived cells (`RegisterColumn.type === 'derived'`) come from Plan 2a's `prepareRegisterRows` (which calls `evalValue`), are rendered read-only and are NEVER written into the carrier.
- SR-1 never-invent: no table value, option or threshold is typed into a component or a config in this plan. Every option list a `lookup_key` select shows comes from `regulation_table_rows` (registry → Plan-1 seed builders); the pollutant list comes from `src/lib/vsme/pollutants.ts` (already the single source); enum column options come from `ui_config.columns[].options`. The A138 `ac_as_ratio_limit` binding names the TAB6 table only — the limit values stay in the table.
- Calculations untouched: the six A138-07 outputs (`A_C 4826.43`, `C_m 0.9`, `A_E_ba 5362.7`, sealed/unsealed 90/60) and the three VSME-B04 sums are produced by Plan 2a's formula strings; this plan only changes where the engineer types the rows. `engine-wiring-a138-07*.test.tsx` stay byte-identical.
- Zero visual change for `widget IS NULL` fields that are not one of the four carriers named in this plan: `scalar | select_one | attestation` fields still render through `DynamicField` exactly as today; the json+`enumValues` checklist branch in `dynamic-field.tsx` stays; the "Mehrzeilige Eingabe — Phase 2" placeholder stays for a json field with neither `enumValues` nor a register config (pin: `dynamic-field.test.tsx:202-213`). For the four carriers, every deliberate visual delta is listed in Task 10 Step 2 (register title strings now come from the config, optgroup label for TAB9 group 2 is the seed's `'Teildurchlässige / schwach ableitende Flächen'`, bottom-strip order is `orderIndex`).
- Every existing render test stays green or is MOVED with a `// Plan 2b:` note naming the new file and the reason (a component was deleted). No assertion is weakened; testids/aria-labels are preserved or mapped explicitly — the mapping table is in Task 2 (`c_i-readonly` → `lookup-value-c_i`, `kind-badge` → `derived-badge-kind`, `tab9-original` → `lookup-original`, `total-paved` → `footer-A_E_ba`, `total-unpaved` → `footer-A_E_nba`, `sum-air` → `footer-AmountOfEmissionToAir`, `pollutant-na-toggle` → `flag-not_applicable`, `surface-inventory-editor` / `pollutant-register-editor` / `structured-register-editor` → `register-editor` + `data-symbol`). aria-labels `Oberflächentyp`, `Fläche`, `C_i (abweichend)`, `C_s (abweichend)`, `Zeile entfernen`, `Schadstoff`, `Medium`, `Menge (t)` are preserved verbatim through the column `label` (or `aria_label`) of the fallback configs.
- Deploy-before-migration safety (hard constraint, `docs/superpowers/guideline-to-tool-playbook.md` "Apply order"): every migration in this plan is WRITTEN, NOT APPLIED; the code renders identically with none of them applied because `resolveRegisterConfig` / `resolveReferenceConfig` / `resolveLookupFillBinding` fall back to TS constants while `widget IS NULL`. Each fallback carries a comment naming the migration whose application retires it. The `ac_as_ratio_limit` migration is additionally GATED on sign-off D-2b-3 (its key symbols do not exist yet) — the file header says so.
- Owner-stamped: applying any migration to `vadsmshzebefjreqcicl` is the owner's step; the ledger records the apply order (Task 10).
- D-1 (owner ruling 2026-09-11) stays: no `enum_values` is written by this plan.
- Gates and visibility: Plan 2a's `computeVisibility` / `hiddenSymbols` plumbing in `worksheet-form.tsx` is kept exactly as 2a leaves it; a register column's own `visible_when` is evaluated in ROW scope (row values shadow worksheet symbols) with the same `evaluateCondition`; `fail` ⇒ the cell is hidden and stored as `null` (text: `''`) on the next write; `pending | manual | not_applicable` ⇒ shown.
- Decision items found while executing go to `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-2b.md` with evidence — never auto-applied, never blocking (D-2b-1 … D-2b-6 are pre-listed in Task 10).
- Every commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/eval/field-config.ts` (modify) | additive zod: `registerUi.flags`, `registerColumn` gains `grid` type + `grid`, `option_labels`, `sort_by_label`, `display`, `value_labels`, `aria_label`, `max` (if 2a did not add it); `referenceUi`, `lookupFillUi` schemas replace `anyUi.nullable()` for `reference` / `lookup_fill` |
| `src/lib/eval/register-configs.ts` (modify) | `resolveRegisterConfig` also serves the 36 TS selection registers via `toDbShape` while `widget IS NULL`; `registerFlagKeys(symbol, ui?)` reads `ui_config.flags` first; pollutant fallback gains `option_labels`, `flags`, `footer`; surface fallback gains `footer`, `display/value_labels` on `kind` |
| `src/lib/eval/reference-configs.ts` (create) | `REFERENCE_CONFIGS_FALLBACK` (`rainfall_table_ref`), `CARRIER_NORMALISERS`, `resolveReferenceConfig`, `resolveReferenceRows` |
| `src/lib/eval/lookup-fill.ts` (create) | `LOOKUP_BINDINGS_FALLBACK` (`ac_as_ratio_limit`), `resolveLookupFillBinding`, `tableLabel`, `resolveLookupFill` (pure: keys → row → value + state) |
| `src/components/worksheet/register-editor.tsx` (create) | generic `RegisterEditor` + `ReadOnlyRegisterTable` |
| `src/components/worksheet/widgets.tsx` (create) | `WIDGETS` registry, `effectiveWidget`, `widgetPlacement`, `resolveBespokeEditor`, `WidgetContext` |
| `src/components/worksheet/reference-field.tsx` (create) | `reference` widget renderer |
| `src/components/worksheet/lookup-fill-field.tsx` (create) | `lookup_fill` widget renderer (source badge, policy-driven override, reason via `recordManualOverride`) |
| `src/components/worksheet/worksheet-form.tsx` (modify) | one renderer path; symbol-keyed carrier lookups removed; `registerSources` prop replaces `surfaceSource`; exports `WorksheetFormField` |
| `src/components/worksheet/surface-inventory-editor.tsx`, `pollutant-register-editor.tsx`, `structured-register-editor.tsx`, `rainfall-table-selector.tsx` (delete) | replaced by the generic editors |
| `src/components/worksheet/surface-source-banner.tsx` (modify) | prop type widens to `CarrierSourceState` (2a Task 9); text unchanged |
| `src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx` (modify) | `registerSources` (typed), `as never` at `:367` closed with `WorksheetFormField` |
| `src/lib/db/queries/worksheet.ts` (modify) | `loadSurfaceSource` result gains `symbol: 'surface_inventory'` (query unchanged) |
| `src/components/worksheet/__tests__/register-editor.test.tsx`, `register-editor-a138-07.test.tsx`, `register-editor-vsme-b04.test.tsx`, `reference-field.test.tsx`, `lookup-fill-field.test.tsx`, `widgets-dispatch.test.tsx` (create) | the pins, moved + new |
| `scripts/regulation-tables/emit-widget-configs-sql.ts` (create) | emits the four widget migrations + one rollback from the TS fallbacks |
| `scripts/migrations/20260916130000_a138_07_surface_inventory_widget.sql`, `20260916140000_vsme_b04_pollutant_register_widget.sql`, `20260916150000_a138_rainfall_table_ref_reference.sql`, `20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql` + `scripts/rollback-20260916130000-widget-configs.sql` (create, generated) | written-not-applied |
| `scripts/__tests__/widget-configs-sql-freshness.test.ts` (create) | committed SQL equals a fresh emitter call; `ui_config` round-trips through `parseFieldConfig` to the fallback |
| `src/components/worksheet/risk-register-editor.tsx` (delete, Task 9 only) | risk register → `register` + `grid` column |
| `docs/superpowers/guideline-to-tool-playbook.md` (modify), `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-2b.md` (create) | close-out |

**Task dependency graph (for parallel dispatch):** T1 → T2 → T3 → {T4, T6, T7}; {T3, T4, T6, T7} → T5; {T4, T6, T7} → T8; T8 → T9 (optional, needs the 2a amendment named in T9); T10 last. Parallel groups: after T3: {T4, T6, T7} · after those: {T5, T8} · T9 alone · T10.

---

### Task 1: Contract extensions — `field-config.ts` (additive) and `register-configs.ts` (legacy registry + flags + labels)

**Files:**
- Modify: `src/lib/eval/field-config.ts:15-37` (`columnLookup`, `registerColumn`, `registerUi`), `:52-55` (`UI_BY_WIDGET`)
- Modify: `src/lib/eval/register-configs.ts` (2a Task 5 file: `REGISTER_CONFIGS_FALLBACK`, `REGISTER_FLAG_KEYS`, `registerFlagKeys`, `resolveRegisterConfig`)
- Test: `src/lib/eval/__tests__/field-config.test.ts` (extend), `src/lib/eval/__tests__/register-configs.test.ts` (extend)
- Reference: `src/lib/eval/selection-fields.ts:690-727` (`toDbShape` — already emits a `RegisterUiConfig`), `:734-737` (`resolveSelectionConfig`), `src/lib/vsme/pollutants.ts` (`POLLUTANTS[].value/labelEn`)

**Interfaces:**
- Consumes: Plan 1 Task 2 (`parseFieldConfig`, `RegisterColumn`, `RegisterUiConfig`, `Widget`), Plan 2a Task 5 (`REGISTER_CONFIGS_FALLBACK`, `resolveRegisterConfig`, `registerFlagKeys`, `RegisterFieldLike`), `toDbShape` + `SELECTION_CONFIGS` (Plan 1 Task 7).
- Produces:
  ```ts
  // field-config.ts (additive; every new key optional)
  export type RegisterColumn = /* Plan 1 */ & {
    type: 'text'|'number'|'boolean'|'enum'|'date'|'lookup_key'|'lookup_value'|'derived'|'grid';
    max?: number;                                  // 2a Task 5 added min/max; keep if present
    aria_label?: string;                           // input aria-label when it must differ from the header label
    option_labels?: Record<string, string>;        // enum: display label per option value
    sort_by_label?: boolean;                       // enum: sort options by option_labels (localeCompare)
    display?: 'cell' | 'badge';                    // derived: badge = small uppercase text under the key column
    value_labels?: Record<string, string>;         // derived/enum: display label per value
    grid?: { rows: Array<{ key: string; label: string }>; cols: Array<{ key: string; label: string; min?: number; max?: number; step?: number; options?: string[] }> }; // Task 9
  };
  export type RegisterFlag = { key: string; label: string; note?: string; disables_rows?: boolean };
  export type RegisterUiConfig = /* Plan 1 */ & { flags?: RegisterFlag[]; footer?: string[]; catalog?: { group_column: string; item_column: string; groups: Array<{ label: string; items: string[] }>; add_custom_label?: string } };
  export type ReferenceUiConfig = { title?: string; aria_label?: string; carrier_symbol: string; rows_path: string; id_key: string; label_key: string; badge_key?: string; badge_labels?: Record<string, string>; empty_label?: string };
  export type LookupFillUiConfig = { source_label?: string; reason_min_length?: number } | null;
  // UI_BY_WIDGET: reference → referenceUi (REQUIRED, like register), lookup_fill → lookupFillUi.nullable()
  // register-configs.ts
  export function resolveRegisterConfig(f: RegisterFieldLike & { enumValues?: unknown }): RegisterUiConfig | null;
  //   DB (widget==='register') → parse; widget IS NULL → REGISTER_CONFIGS_FALLBACK[symbol] ?? (SELECTION_CONFIGS[symbol]?.kind==='register' ? { ...toDbShape(symbol, cfg).ui_config, placement: 'bottom' } : null)
  export function registerFlagKeys(symbol: string, ui?: RegisterUiConfig | null): readonly string[]; // ui?.flags?.map(f => f.key) ?? REGISTER_FLAG_KEYS[symbol] ?? []
  ```

- [ ] **Step 1: Extend the two tests**

```ts
// append to src/lib/eval/__tests__/field-config.test.ts
describe('Plan 2b additive keys', () => {
  it('register ui_config accepts flags, footer, option_labels, display/value_labels and a grid column', () => {
    const ui = {
      title: 'Schadstoffregister', flags: [{ key: 'not_applicable', label: 'Keine berichtspflichtigen Schadstoffemissionen', disables_rows: true }],
      footer: ['AmountOfEmissionToAir'],
      columns: [
        { key: 'medium', type: 'enum', label: 'Medium', options: ['air', 'water', 'soil'], option_labels: { air: 'Luft', water: 'Wasser', soil: 'Boden' } },
        { key: 'kind', type: 'derived', label: 'befestigt/unbefestigt', expr: "lookup('TAB9', k, 'kind')", display: 'badge', value_labels: { paved: 'befestigt', unpaved: 'unbefestigt' } },
        { key: 'ratings', type: 'grid', label: 'Bewertung (0–10)', grid: { rows: [{ key: 'bauherr', label: 'Bauherr' }], cols: [{ key: 'probability', label: 'Eintretenswahrsch.', min: 0, max: 10, step: 1 }] } },
      ],
    };
    const cfg = parseFieldConfig({ widget: 'register', uiConfig: ui, lookup: null, visibleWhen: null });
    expect((cfg.ui as { flags: unknown[] }).flags).toHaveLength(1);
  });
  it('a grid column without grid is rejected', () => {
    expect(() => parseFieldConfig({ widget: 'register', uiConfig: { title: 't', columns: [{ key: 'g', type: 'grid', label: 'g' }] }, lookup: null, visibleWhen: null })).toThrow(/columns\.0\.grid/);
  });
  it('reference requires carrier_symbol/rows_path/id_key/label_key; lookup_fill ui may be null', () => {
    const ok = parseFieldConfig({ widget: 'reference', uiConfig: { carrier_symbol: 'r_D_n_table', rows_path: 'tables', id_key: 'id', label_key: 'name' }, lookup: null, visibleWhen: null });
    expect((ok.ui as { carrier_symbol: string }).carrier_symbol).toBe('r_D_n_table');
    expect(() => parseFieldConfig({ widget: 'reference', uiConfig: null, lookup: null, visibleWhen: null })).toThrow(/carrier_symbol|ui_config invalid for reference/);
    const lf = parseFieldConfig({ widget: 'lookup_fill', uiConfig: null, lookup: { table_code: 'TAB6', role: 'limit', keys: [{ column: 'tier', from_symbol: 'tab6_tier' }], value: 'max' }, visibleWhen: null });
    expect(lf.ui).toBeNull();
  });
});
```

```ts
// append to src/lib/eval/__tests__/register-configs.test.ts
import { SELECTION_CONFIGS, toDbShape } from '../selection-fields';
describe('Plan 2b: resolveRegisterConfig serves the TS selection registers while widget IS NULL', () => {
  it('bewertungskommission_members resolves to its toDbShape ui_config with placement bottom', () => {
    const cfg = resolveRegisterConfig({ symbol: 'bewertungskommission_members', dataType: 'json', widget: null });
    expect(cfg).toEqual({ ...toDbShape('bewertungskommission_members', SELECTION_CONFIGS.bewertungskommission_members).ui_config, placement: 'bottom' });
  });
  it('a checklist symbol is not a register', () => {
    expect(resolveRegisterConfig({ symbol: 'applicable_legal_bases', dataType: 'json', widget: null })).toBeNull();
  });
  it('registerFlagKeys prefers ui_config.flags, falls back to the symbol table', () => {
    expect(registerFlagKeys('pollutant_register')).toEqual(['not_applicable']);
    expect(registerFlagKeys('x', { title: 't', columns: [{ key: 'a', type: 'text', label: 'A' }], flags: [{ key: 'done', label: 'Fertig' }] })).toEqual(['done']);
  });
  it('fallback configs carry the Plan 2b display keys and still validate', () => {
    const p = REGISTER_CONFIGS_FALLBACK.pollutant_register;
    expect(p.flags?.[0].key).toBe('not_applicable');
    expect(p.footer).toEqual(['AmountOfEmissionToAir', 'AmountOfEmissionToWater', 'AmountOfEmissionToSoil']);
    expect(p.columns.find((c) => c.key === 'medium')?.option_labels).toEqual({ air: 'Luft', water: 'Wasser', soil: 'Boden' });
    expect(REGISTER_CONFIGS_FALLBACK.surface_inventory.footer).toEqual(['A_E_ba', 'A_E_nba', 'A_C']);
    for (const ui of Object.values(REGISTER_CONFIGS_FALLBACK)) expect(() => parseFieldConfig({ widget: 'register', uiConfig: ui, lookup: null, visibleWhen: null })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run → FAIL** — `pnpm vitest run --project unit src/lib/eval/__tests__/field-config.test.ts src/lib/eval/__tests__/register-configs.test.ts` (unknown keys are stripped by zod today, so `flags` comes back `undefined`; `grid` is not in the enum).

- [ ] **Step 3: Implement `field-config.ts`**

Replace `registerColumn` / `registerUi` (`:15-37`) with:

```ts
const columnLookup = z.object({ table_code: z.string().min(1), key_column: z.string().optional(), value: z.string().optional(), group_by: z.string().optional() });
const gridSpec = z.object({
  rows: z.array(z.object({ key: z.string().min(1), label: z.string().min(1) })).min(1),
  cols: z.array(z.object({ key: z.string().min(1), label: z.string().min(1), min: z.number().optional(), max: z.number().optional(), step: z.number().optional(), options: z.array(z.string()).optional() })).min(1),
});
const registerColumn = z.object({
  key: z.string().min(1), label: z.string().min(1),
  type: z.enum(['text','number','boolean','enum','date','lookup_key','lookup_value','derived','grid']),
  required: z.boolean().optional(), options: z.array(z.string()).optional(), datalist: z.array(z.string()).optional(),
  unit: z.string().optional(), min: z.number().optional(), max: z.number().optional(), placeholder: z.string().optional(), width: z.string().optional(),
  discriminator: z.boolean().optional(), visible_when: z.string().optional(), lookup: columnLookup.optional(), expr: z.string().optional(),
  // Plan 2b (display-only keys; no guideline value lives here)
  aria_label: z.string().optional(), option_labels: z.record(z.string(), z.string()).optional(), sort_by_label: z.boolean().optional(),
  display: z.enum(['cell', 'badge']).optional(), value_labels: z.record(z.string(), z.string()).optional(), grid: gridSpec.optional(),
}).superRefine((c, ctx) => {
  if ((c.type === 'lookup_key' || c.type === 'lookup_value') && !c.lookup) ctx.addIssue({ code: 'custom', path: ['lookup'], message: `${c.type} column needs lookup` });
  if (c.type === 'lookup_value' && !c.lookup?.key_column) ctx.addIssue({ code: 'custom', path: ['lookup'], message: 'lookup_value needs lookup.key_column' });
  if (c.type === 'derived' && !c.expr) ctx.addIssue({ code: 'custom', path: ['expr'], message: 'derived column needs expr' });
  if (c.type === 'grid' && !c.grid) ctx.addIssue({ code: 'custom', path: ['grid'], message: 'grid column needs grid' });
});
export type RegisterColumn = z.infer<typeof registerColumn>;
const registerFlag = z.object({ key: z.string().min(1), label: z.string().min(1), note: z.string().optional(), disables_rows: z.boolean().optional() });
export type RegisterFlag = z.infer<typeof registerFlag>;
const registerUi = z.object({
  title: z.string().min(1), subtitle: z.string().optional(), add_label: z.string().optional(), note: z.string().optional(),
  placement: z.enum(['section', 'bottom']).optional(), columns: z.array(registerColumn).min(1),
  sum_column: z.object({ key: z.string(), label: z.string(), unit: z.string().optional() }).optional(),
  override: z.object({ flag_key: z.string(), applies_to: z.array(z.string()).min(1), policy: z.enum(['anhaltswert','kann','messwert']) }).optional(),
  legacy_map: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  footer: z.array(z.string()).optional(), editor: z.string().optional(),
  flags: z.array(registerFlag).optional(),                                                       // Plan 2b
  catalog: z.object({ group_column: z.string().min(1), item_column: z.string().min(1), groups: z.array(z.object({ label: z.string().min(1), items: z.array(z.string()).min(1) })).min(1), add_custom_label: z.string().optional() }).optional(), // Plan 2b Task 9
});
export type RegisterUiConfig = z.infer<typeof registerUi>;
const referenceUi = z.object({
  title: z.string().optional(), aria_label: z.string().optional(), carrier_symbol: z.string().min(1), rows_path: z.string().min(1),
  id_key: z.string().min(1), label_key: z.string().min(1), badge_key: z.string().optional(), badge_labels: z.record(z.string(), z.string()).optional(), empty_label: z.string().optional(),
});
export type ReferenceUiConfig = z.infer<typeof referenceUi>;
const lookupFillUi = z.object({ source_label: z.string().optional(), reason_min_length: z.number().int().min(1).optional() });
export type LookupFillUiConfig = z.infer<typeof lookupFillUi>;
```
and in `UI_BY_WIDGET`: `lookup_fill: lookupFillUi.nullable(), reference: referenceUi` (reference REQUIRED — a reference without a carrier binding cannot render; no prod row carries `widget='reference'` today, verified by `select widget, count(*) from fields where widget is not null group by 1` in the playbook's verification query — run it read-only via `node scripts/verification/prod-query.mjs` and paste the raw output into the task report). Update the comment above `UI_BY_WIDGET` accordingly. If 2a Task 5 already added `max`, keep its line and do not duplicate.

- [ ] **Step 4: Implement `register-configs.ts` changes**

```ts
import { SELECTION_CONFIGS, toDbShape } from './selection-fields';
// … existing SURFACE_INVENTORY / POLLUTANT_REGISTER constants — apply these edits:
// SURFACE_INVENTORY.columns 'kind' gains: display: 'badge', value_labels: { paved: 'befestigt', unpaved: 'unbefestigt' }
// SURFACE_INVENTORY.columns 'area_m2' gains: aria_label: 'Fläche'      (today's <input aria-label="Fläche">, surface-inventory-editor.tsx:200)
// SURFACE_INVENTORY gains: footer: ['A_E_ba', 'A_E_nba', 'A_C']       (Σ befestigt · Σ unbefestigt · A_C-Vorschau, editor :283-287)
// POLLUTANT_REGISTER.columns 'pollutant' gains: aria_label: 'Schadstoff', option_labels: Object.fromEntries(POLLUTANTS.map((p) => [p.value, p.labelEn])), sort_by_label: true
// POLLUTANT_REGISTER.columns 'medium' gains: option_labels: { air: 'Luft', water: 'Wasser', soil: 'Boden' }
// POLLUTANT_REGISTER.columns 'amount_t' gains: aria_label: 'Menge (t)'
// POLLUTANT_REGISTER gains:
//   flags: [{ key: 'not_applicable', label: 'Keine berichtspflichtigen Schadstoffemissionen', note: 'Explizite Null-Meldung (z. B. keine E-PRTR-Berichtspflicht) — setzt alle drei Summen auf 0 t. Ohne diese Bestätigung bleiben leere Summen „fehlend“.', disables_rows: true }],
//   footer: ['AmountOfEmissionToAir', 'AmountOfEmissionToWater', 'AmountOfEmissionToSoil'],
//   title: 'Schadstoffregister (E-PRTR)', subtitle: 'VSME Abs. 32 — je Schadstoff und Medium (Luft / Wasser / Boden)'   // today's header, pollutant-register-editor.tsx:66-68
// (2a's register-configs.test pins `title === 'Flächenverzeichnis'` for surface_inventory — leave that title; the pollutant title is not pinned by 2a — verify with grep before changing.)

export function registerFlagKeys(symbol: string, ui?: RegisterUiConfig | null): readonly string[] {
  if (ui?.flags?.length) return ui.flags.map((f) => f.key);
  return REGISTER_FLAG_KEYS[symbol] ?? [];
}
export function resolveRegisterConfig(f: RegisterFieldLike): RegisterUiConfig | null {
  if (f.widget != null) {
    if (f.widget !== 'register') return null;
    try { return parseFieldConfig({ widget: 'register', uiConfig: f.uiConfig ?? null, lookup: null, visibleWhen: null }).ui as RegisterUiConfig; } catch { return null; }
  }
  if (f.dataType !== 'json') return null;
  const own = REGISTER_CONFIGS_FALLBACK[f.symbol];
  if (own) return own;
  // Plan 2b: the 36 TS selection configs (Plan 1 Task 7) — registers only; checklists stay on resolveSelectionConfig.
  // Retired per standard by the 20260911120000_selection_configs_<STD>.sql migrations (widget becomes non-null).
  const legacy = SELECTION_CONFIGS[f.symbol];
  if (legacy?.kind === 'register') return { ...(toDbShape(f.symbol, legacy).ui_config as RegisterUiConfig), placement: 'bottom' };
  return null;
}
```
Every caller of `registerFlagKeys(sym)` in 2a (`use-equation-engine.ts`, `evaluate-for-report.ts`, `materialize-derived.ts`, `carrier-source-state.ts`) is updated to pass the resolved config as the second argument (`registerFlagKeys(f.symbol, cfg)`) so a DB-configured register's flags reach `flag()` — grep `registerFlagKeys(` and change each call.

- [ ] **Step 5: Run → PASS**: `pnpm vitest run --project unit src/lib/eval && pnpm -s typecheck`. `selection-fields-db-parity.test.ts` must be untouched and green (toDbShape unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/lib/eval/field-config.ts src/lib/eval/register-configs.ts src/lib/eval/__tests__/field-config.test.ts src/lib/eval/__tests__/register-configs.test.ts src/lib/eval/use-equation-engine.ts src/lib/eval/evaluate-for-report.ts src/lib/eval/materialize-derived.ts src/lib/eval/carrier-source-state.ts
git commit -m "feat(field-config): register flags/labels/badge/grid keys, reference + lookup_fill ui contracts; resolveRegisterConfig serves the TS selection registers"
```

---

### Task 2: Generic `RegisterEditor` + `ReadOnlyRegisterTable` (every `RegisterColumn` type, override policy, flags, footer from engine states)

**Files:**
- Create: `src/components/worksheet/register-editor.tsx`
- Test: `src/components/worksheet/__tests__/register-editor.test.tsx` (create — generic behaviours with the A138 fallback config as fixture; the A138 and VSME pins move in Tasks 3/4)
- Reference (read, then delete in Task 3/4): `src/components/worksheet/surface-inventory-editor.tsx:28-90` (store wiring, `selectType`, `toggleOverride`, totals), `:130-278` (cell markup, badges, testids), `src/components/worksheet/structured-register-editor.tsx:25-159` (generic cells, `slug`, datalists, footer), `src/components/worksheet/pollutant-register-editor.tsx:56-97` (flag toggle), `:99-104` (flag hides the table), `src/lib/eval/selection-fields.ts:626-636` (`newRegisterRow` defaults)

**Interfaces:**
- Consumes: Plan 2a Task 5 (`prepareRegisterRows(carrierRaw, columns, ctx, opts)`, `RegisterRowsCtx`, `makeTableLookup`, `makeTableRows`, `resolveRegulationTable`), Plan 2a Task 2 (`PreparedRegister`, `PreparedRow`, `RowValues`, `Value`), Plan 2a Task 3 (`evaluateCondition(cond, lookup, opts)`), Plan 2a Task 6 (`EvalState` from `src/lib/eval/formula.ts`), Task 1 (`RegisterUiConfig`, `RegisterColumn`, `RegisterFlag`, `registerFlagKeys`), `useWorksheetStore` (`values[fieldId]`, `setField`), `recordManualOverride` is NOT used here (register overrides are per-row, audited by the `override.flag_key` cell + visible table pair, as today).
- Produces:
  ```ts
  export type FooterState = { label: string; unit: string | null; state: EvalState | undefined };
  export type RegisterEditorProps = {
    fieldId: string;
    symbol: string;                       // data-symbol attribute + registerFlagKeys fallback
    config: RegisterUiConfig;
    standardCode: string;                 // table lookups (makeTableLookup / makeTableRows)
    readOnly?: boolean;
    /** ui_config.footer symbols → engine state of the equation producing that symbol (built by the form from useEquationEngine). */
    footerStates?: Record<string, FooterState>;
    /** worksheet-symbol lookup for column visible_when (row values shadow it). */
    symbolLookup?: (sym: string) => Value | undefined;
  };
  export function RegisterEditor(props: RegisterEditorProps): JSX.Element;
  export function ReadOnlyRegisterTable(props: { config: RegisterUiConfig; carrier: unknown; standardCode: string; symbol: string }): JSX.Element;
  export function tableLabel(tableCode: string): string;     // 'TAB9' → 'Tab. 9', 'TAB22' → 'Tab. 22', else the code verbatim
  export function storedRows(prepared: PreparedRegister, columns: readonly RegisterColumn[], hiddenCells: (rowId: string, key: string) => boolean): Array<{ id: string } & Record<string, Value>>;  // stored cells only (no derived), hidden ⇒ null / ''
  ```
  Testids (data-testid): root `register-editor` (+ `data-symbol`), row `register-row`, `cell-<key>` on every `<td>`, `lookup-value-<key>` (read-only lookup cell), `lookup-original` (the table pair while overridden), `derived-<key>` / `derived-badge-<key>`, `flag-<key>`, `footer-<symbol>`, `rows-complete`, `reselect-<key>` (warning), `mismatch-<key>`. aria-labels: inputs use `col.aria_label ?? col.label`; overridden lookup inputs `${col.label} (abweichend)`; remove button `Zeile entfernen`; flag checkbox `flag.label`. German strings: add button = `config.add_label ?? '+ Zeile hinzufügen'`; empty state `Noch keine Einträge. „${addLabel}“ fügt eine Zeile hinzu.`; select placeholder `— wählen —`; reselect warning `⚠ ${col.label} neu wählen (${tableLabel})` (lookup_key) / `⚠ ${col.label} wählen` (enum required); override buttons `abweichend wählen` / `${tableLabel} übernehmen`; original pair `${tableLabel}: v1 / v2`; mismatch `${col.label} weicht von ${tableLabel} ab`; range warning `${col.label} muss ≥ ${min} sein`; footer `${complete} Einträge · <rows-complete>{complete}/{total}</rows-complete> vollständig`, then ` · ${label}: ${value} ${unit}` per footer symbol (`—` when the state is not `computed`, `title` = the state's reason), then the legacy ` · ${sum_column.label}: ${sum} ${unit}` when `sum_column` is set.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/worksheet/__tests__/register-editor.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor, ReadOnlyRegisterTable, storedRows, tableLabel } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { REGISTER_CONFIGS_FALLBACK } from '@/lib/eval/register-configs';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';
import type { RegisterUiConfig } from '@/lib/eval/field-config';

const FIELD_ID = 'fixture-register';
const surface = REGISTER_CONFIGS_FALLBACK.surface_inventory;
const STD = 'DWA-A-138-1';

function initStore(value?: unknown) {
  act(() => { useWorksheetStore.getState().init('fixture-instance', value !== undefined ? { [FIELD_ID]: { type: 'json', value } } : {}, {}, {}); });
}
function stored(): { rows: Array<Record<string, unknown>> } & Record<string, unknown> {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? (v.value as { rows: Array<Record<string, unknown>> }) : { rows: [] };
}
beforeEach(() => initStore());

describe('RegisterEditor — lookup_key / lookup_value / derived (A138 fallback config as fixture)', () => {
  it('selecting a lookup_key fills the lookup_value cells from the table, resets the override flag, shows the derived badge', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    await user.click(screen.getByRole('button', { name: '+ Zeile hinzufügen' }));
    await user.selectOptions(screen.getByLabelText('Oberflächentyp'), 'park_flach');
    const row = stored().rows[0];
    expect(row).toMatchObject({ tab9_value: 'park_flach', c_i: 0.1, c_s: 0.2, coeff_override: false });
    expect(row).not.toHaveProperty('kind');                    // derived cells are never stored
    expect(row).not.toHaveProperty('a_c_i');
    expect(screen.getByTestId('lookup-value-c_i')).toHaveTextContent('0,1');
    expect(screen.getByTestId('lookup-value-c_s')).toHaveTextContent('0,2');
    expect(screen.getByTestId('derived-badge-kind')).toHaveTextContent('unbefestigt');
  });
  it('the lookup_key select groups rows by lookup.group_by with the table row label as option text', () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    act(() => { useWorksheetStore.getState().setField(FIELD_ID, { type: 'json', value: { rows: [{ id: 'r', label: '', tab9_value: null, area_m2: null, c_i: null, c_s: null, coeff_override: false }] } }); });
    const select = screen.getByLabelText('Oberflächentyp') as HTMLSelectElement;
    const groups = [...select.querySelectorAll('optgroup')].map((g) => g.label);
    expect(groups).toEqual(['Wasserundurchlässige Flächen', 'Teildurchlässige / schwach ableitende Flächen', 'Durchlässige Flächen']);
    expect(screen.getByRole('option', { name: 'Schwarzdecken (Asphalt)' })).toBeInTheDocument();
    expect(screen.getByTestId('reselect-tab9_value')).toHaveTextContent('⚠ Oberflächentyp neu wählen (Tab. 9)');
  });
  it('"abweichend wählen" makes the applies_to cells editable, sets the flag, keeps the table pair visible; "Tab. 9 übernehmen" reverts', async () => {
    const user = userEvent.setup();
    initStore({ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    await user.click(screen.getByRole('button', { name: 'abweichend wählen' }));
    const ci = screen.getByLabelText('C_i (abweichend)');
    await user.clear(ci);
    await user.type(ci, '0.75');
    expect(stored().rows[0]).toMatchObject({ coeff_override: true, c_i: 0.75, tab9_value: 'schwarzdecke_asphalt' });
    expect(screen.getByTestId('lookup-original')).toHaveTextContent('Tab. 9: 0,9 / 1');
    expect(screen.getByTestId('mismatch-c_i')).toHaveTextContent('C_i weicht von Tab. 9 ab');
    await user.click(screen.getByRole('button', { name: 'Tab. 9 übernehmen' }));
    expect(stored().rows[0]).toMatchObject({ coeff_override: false, c_i: 0.9, c_s: 1 });
  });
  it('replays a legacy carrier through prepareRegisterRows and persists the replayed shape on the first edit', async () => {
    const user = userEvent.setup();
    initStore({ rows: [
      { id: 'g', label: 'Gewächshausdach', surface_type: 'dach', area_m2: 3786.8, c_i: 0.9, c_s: 1.0 },
      { id: 'p', label: 'Parkplatz', surface_type: 'asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0 },
    ] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} />);
    expect(screen.getByTestId('reselect-tab9_value')).toBeInTheDocument();        // Gewächshausdach ⇒ reselection
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('1/2');
    await user.type(screen.getAllByLabelText('Bezeichnung')[1], '!');
    expect(stored().rows[1]).toMatchObject({ tab9_value: 'schwarzdecke_asphalt', coeff_override: false, label: 'Parkplatz!' });
    expect(stored().rows[0]).toMatchObject({ tab9_value: null });
  });
  it('footer renders engine states by symbol, never a locally computed sum', () => {
    initStore({ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD}
      footerStates={{ A_E_ba: { label: 'Σ Fläche befestigt', unit: 'm²', state: { kind: 'computed', value: 100, formulaEvaluated: 'x', substituted: [] } as never },
                      A_E_nba: { label: 'unbefestigt', unit: 'm²', state: { kind: 'manual_required', reason: 'Keine vollständigen Zeilen' } as never } }} />);
    expect(screen.getByTestId('footer-A_E_ba')).toHaveTextContent('100');
    expect(screen.getByTestId('footer-A_E_nba')).toHaveTextContent('—');
    expect(screen.getByTestId('footer-A_C')).toHaveTextContent('—');        // no state supplied ⇒ dash, no arithmetic
  });
  it('readOnly disables every control', () => {
    initStore({ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="surface_inventory" config={surface} standardCode={STD} readOnly />);
    expect(screen.getByRole('button', { name: '+ Zeile hinzufügen' })).toBeDisabled();
    expect(screen.getByLabelText('Oberflächentyp')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zeile entfernen' })).toBeDisabled();
  });
});

const GENERIC: RegisterUiConfig = {
  title: 'Proben', add_label: '+ Probe',
  flags: [{ key: 'not_applicable', label: 'Keine Proben', disables_rows: true }],
  columns: [
    { key: 'name', type: 'text', label: 'Name', required: true },
    { key: 'typ', type: 'enum', label: 'Typ', options: ['a', 'b'], option_labels: { a: 'Alpha', b: 'Beta' }, discriminator: true, required: true },
    { key: 'menge', type: 'number', label: 'Menge', unit: 't', min: 0, visible_when: "typ == 'a'" },
    { key: 'datum', type: 'date', label: 'Datum' },
    { key: 'ok', type: 'boolean', label: 'Geprüft' },
  ],
};

describe('RegisterEditor — generic columns, flags, discriminator + column visible_when', () => {
  it('enum shows option labels; number/date/boolean cells store typed values; text stays a string', async () => {
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="samples" config={GENERIC} standardCode="X" />);
    await user.click(screen.getByRole('button', { name: '+ Probe' }));
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Typ'), 'a');
    await user.type(screen.getByLabelText('Menge'), '2');
    await user.type(screen.getByLabelText('Datum'), '2026-09-16');
    await user.click(screen.getByLabelText('Geprüft'));
    await user.type(screen.getByLabelText('Name'), 'P1');
    expect(stored().rows[0]).toEqual({ id: expect.any(String), name: 'P1', typ: 'a', menge: 2, datum: '2026-09-16', ok: true });
  });
  it('a column whose visible_when fails for the row is hidden and nulled on write; a negative number shows the range warning', async () => {
    const user = userEvent.setup();
    initStore({ rows: [{ id: 'r', name: 'P', typ: 'b', menge: 5, datum: '', ok: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="samples" config={GENERIC} standardCode="X" />);
    expect(screen.queryByLabelText('Menge')).toBeNull();
    await user.selectOptions(screen.getByLabelText('Typ'), 'a');
    expect(stored().rows[0].menge).toBeNull();                       // hidden ⇒ null on that write
    await user.type(screen.getByLabelText('Menge'), '-1');
    expect(screen.getByTestId('cell-menge')).toHaveTextContent('Menge muss ≥ 0 sein');
    expect(screen.getByTestId('rows-complete')).toHaveTextContent('0/1');
  });
  it('a flag writes carrier[key]; disables_rows hides the table and the add button while set', async () => {
    const user = userEvent.setup();
    initStore({ not_applicable: false, rows: [{ id: 'r', name: 'P', typ: 'a', menge: 1, datum: '', ok: false }] });
    render(<RegisterEditor fieldId={FIELD_ID} symbol="samples" config={GENERIC} standardCode="X" />);
    await user.click(screen.getByTestId('flag-not_applicable'));
    expect(stored()).toMatchObject({ not_applicable: true, rows: [{ id: 'r', name: 'P' }] });
    expect(screen.queryByTestId('register-row')).toBeNull();
    expect(screen.getByRole('button', { name: '+ Probe' })).toBeDisabled();
  });
  it('the written carrier is exactly { rows, <flags> } — no derived keys, no unknown keys', () => {
    const prepared = prepareRegisterRows({ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false, junk: 1 }] },
      surface.columns, { table: makeTableLookup(STD), tableRows: makeTableRows(STD) }, { legacyMap: surface.legacy_map, overrideFlagKey: 'coeff_override' });
    expect(storedRows(prepared, surface.columns, () => false)).toEqual([{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1, coeff_override: false }]);
  });
  it('tableLabel', () => { expect(tableLabel('TAB9')).toBe('Tab. 9'); expect(tableLabel('TAB22')).toBe('Tab. 22'); expect(tableLabel('Table 1')).toBe('Table 1'); });
});

describe('ReadOnlyRegisterTable', () => {
  it('renders the table row label for lookup keys, omits the override flag column, formats numbers de-DE', () => {
    render(<ReadOnlyRegisterTable config={surface} symbol="surface_inventory" standardCode={STD}
      carrier={{ rows: [{ id: 'r', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false }] }} />);
    expect(screen.getByText('Schwarzdecken (Asphalt)')).toBeInTheDocument();
    expect(screen.getByText('1.575,9')).toBeInTheDocument();
    expect(screen.queryByText('abweichend')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('empty carrier ⇒ "Keine Zeilen erfasst."', () => {
    render(<ReadOnlyRegisterTable config={surface} symbol="surface_inventory" standardCode={STD} carrier={null} />);
    expect(screen.getByText('Keine Zeilen erfasst.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run → FAIL** — `pnpm vitest run --project unit src/components/worksheet/__tests__/register-editor.test.tsx` (`Cannot find module '../register-editor'`).

- [ ] **Step 3: Implement `register-editor.tsx`**

```tsx
'use client';
import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { registerFlagKeys } from '@/lib/eval/register-configs';
import { makeTableLookup, makeTableRows } from '@/lib/eval/regulation-tables-fallback';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import type { RegisterColumn, RegisterUiConfig } from '@/lib/eval/field-config';
import type { EvalState } from '@/lib/eval/formula';
import type { PreparedRegister, PreparedRow, Value } from '@/lib/expr';
import type { RegulationRow } from '@/lib/eval/regulation-tables';

export type FooterState = { label: string; unit: string | null; state: EvalState | undefined };
export type RegisterEditorProps = { fieldId: string; symbol: string; config: RegisterUiConfig; standardCode: string; readOnly?: boolean; footerStates?: Record<string, FooterState>; symbolLookup?: (sym: string) => Value | undefined };

const NUM = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 });
export function fmt(v: Value): string { return typeof v === 'number' && Number.isFinite(v) ? NUM.format(v) : v == null || v === '' ? '—' : String(v); }
export function tableLabel(code: string): string { const m = /^TAB(\d+[A-Za-z]?)$/.exec(code); return m ? `Tab. ${m[1]}` : code; }
const cellInput = 'block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60';
function slug(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function genId(): string { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

/** Stored cells only: every non-derived, non-grid-derived column; hidden cells nulled. Port of the write side of
 *  surface-inventory-editor.tsx:41-44 / structured-register-editor.tsx:33-36, generalised. */
export function storedRows(prepared: PreparedRegister, columns: readonly RegisterColumn[], hiddenCells: (rowId: string, key: string) => boolean): Array<{ id: string } & Record<string, Value>> {
  return prepared.rows.map((r) => {
    const out: { id: string } & Record<string, Value> = { id: r.id };
    for (const c of columns) {
      if (c.type === 'derived') continue;
      const hidden = hiddenCells(r.id, c.key);
      const v = r.values[c.key];
      out[c.key] = hidden ? (c.type === 'text' ? '' : null) : (v === undefined ? (c.type === 'text' ? '' : c.type === 'boolean' ? false : null) : v);
    }
    return out;
  });
}
function newRow(columns: readonly RegisterColumn[]): Record<string, unknown> {   // selection-fields.ts:626-630 defaults + the surface newSurfaceRow() shape
  const row: Record<string, unknown> = { id: genId() };
  for (const c of columns) { if (c.type === 'derived') continue; row[c.key] = c.type === 'boolean' ? false : c.type === 'text' ? '' : c.type === 'grid' ? {} : null; }
  return row;
}
function groupRows(rows: readonly RegulationRow[], groupBy: string | undefined): Array<{ label: string | null; rows: RegulationRow[] }> {
  if (!groupBy) return [{ label: null, rows: [...rows] }];
  const out: Array<{ label: string | null; rows: RegulationRow[] }> = [];
  for (const r of rows) {
    const label = groupBy === 'group_label' ? r.group_label : (r.values[groupBy] == null ? null : String(r.values[groupBy]));
    const g = out.find((x) => x.label === label); if (g) g.rows.push(r); else out.push({ label, rows: [r] });
  }
  return out;
}

export function RegisterEditor({ fieldId, symbol, config, standardCode, readOnly = false, footerStates, symbolLookup }: RegisterEditorProps) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const table = useMemo(() => makeTableLookup(standardCode), [standardCode]);
  const tableRows = useMemo(() => makeTableRows(standardCode), [standardCode]);
  const flagKeys = useMemo(() => registerFlagKeys(symbol, config), [symbol, config]);
  const opts = useMemo(() => ({ legacyMap: config.legacy_map, flagKeys, overrideFlagKey: config.override?.flag_key }), [config, flagKeys]);
  const prepared = useMemo(() => prepareRegisterRows(raw?.type === 'json' ? raw.value : null, config.columns, { table, tableRows, symbol: symbolLookup }, opts), [raw, config.columns, table, tableRows, symbolLookup, opts]);
  const columns = config.columns;
  const keyCols = columns.filter((c) => c.type === 'lookup_key');

  // Column visibility in ROW scope: row values shadow worksheet symbols; only `fail` hides (2a semantics).
  const cellHidden = (row: PreparedRow, c: RegisterColumn): boolean => {
    if (!c.visible_when) return false;
    const lookup = (s: string) => (s in row.values ? row.values[s] : symbolLookup?.(s));
    return evaluateCondition(c.visible_when, lookup).kind === 'fail';
  };
  const hiddenCells = (rowId: string, key: string) => { const r = prepared.rows.find((x) => x.id === rowId); const c = columns.find((x) => x.key === key); return !!r && !!c && cellHidden(r, c); };

  function write(rows: Array<Record<string, unknown>>, flags: Record<string, boolean> = prepared.flags) {
    if (readOnly) return;
    setField(fieldId, { type: 'json', value: { ...flags, rows } });
  }
  const currentRows = () => storedRows(prepared, columns, hiddenCells) as Array<Record<string, unknown>>;
  function addRow() { write([...currentRows(), newRow(columns)]); }
  function removeRow(id: string) { write(currentRows().filter((r) => r.id !== id)); }
  function patchRow(id: string, patch: Record<string, unknown>) { write(currentRows().map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  function setFlag(key: string, on: boolean) { write(currentRows(), { ...prepared.flags, [key]: on }); }
  /** lookup_key change: refill every lookup_value bound to this key from the table, reset the override flag (surface-inventory-editor.tsx:57-62). */
  function selectKey(id: string, kc: RegisterColumn, value: string) {
    const row = table(kc.lookup!.table_code, [value]); if (!row) return;
    const patch: Record<string, unknown> = { [kc.key]: value };
    for (const vc of columns) if (vc.type === 'lookup_value' && vc.lookup?.key_column === kc.key && vc.lookup.value) patch[vc.key] = row[vc.lookup.value] ?? null;
    if (config.override) patch[config.override.flag_key] = false;
    patchRow(id, patch);
  }
  /** override toggle (surface-inventory-editor.tsx:63-74): on ⇒ flag only; off ⇒ flag false + applies_to refilled from the table. */
  function toggleOverride(r: PreparedRow, on: boolean) {
    const ov = config.override!; const patch: Record<string, unknown> = { [ov.flag_key]: on };
    if (!on) for (const key of ov.applies_to) { const vc = columns.find((c) => c.key === key); const k = vc?.lookup?.key_column ? r.values[vc.lookup.key_column] : null;
      patch[key] = vc?.lookup?.value && k != null ? (table(vc.lookup.table_code, [k])?.[vc.lookup.value] ?? null) : null; }
    patchRow(r.id, patch);
  }
  const overridden = (r: PreparedRow) => !!config.override && r.values[config.override.flag_key] === true;
  const tableValue = (r: PreparedRow, vc: RegisterColumn): Value | undefined => { const k = vc.lookup?.key_column ? r.values[vc.lookup.key_column] : null; return vc.lookup?.value && k != null ? (table(vc.lookup.table_code, [k])?.[vc.lookup.value] as Value | undefined) : undefined; };

  const complete = prepared.rows.filter((r) => r.complete).length;
  const rowsDisabled = config.flags?.some((f) => f.disables_rows && prepared.flags[f.key]) ?? false;
  const addLabel = config.add_label ?? '+ Zeile hinzufügen';
  const legacySum = useMemo(() => { if (!config.sum_column) return null; let t = 0; for (const r of prepared.rows) { const v = r.values[config.sum_column.key]; if (typeof v === 'number') t += v; } return t; }, [prepared, config.sum_column]);

  return (
    <div className="space-y-3" data-testid="register-editor" data-symbol={symbol}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div><div className="text-sm font-medium text-ink">{config.title}</div>{config.subtitle && <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">{config.subtitle}</div>}</div>
        <button type="button" onClick={addRow} disabled={readOnly || rowsDisabled} className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-40 disabled:cursor-not-allowed">{addLabel}</button>
      </div>
      {config.flags?.map((f) => (
        <label key={f.key} className="flex items-start gap-2 text-xs text-ink cursor-pointer">
          <input type="checkbox" checked={prepared.flags[f.key] === true} disabled={readOnly} onChange={(e) => setFlag(f.key, e.target.checked)} className="mt-0.5" data-testid={`flag-${f.key}`} aria-label={f.label} />
          <span>{f.label}{f.note && <span className="block text-[11px] text-subtext">{f.note}</span>}</span>
        </label>
      ))}
      {columns.filter((c) => c.datalist?.length).map((c) => (<datalist key={c.key} id={`reg-${slug(config.title)}-${c.key}`}>{c.datalist!.map((o) => <option key={o} value={o} />)}</datalist>))}
      {rowsDisabled ? null : prepared.rows.length === 0 ? (
        <p className="text-xs text-subtext italic">Noch keine Einträge. „{addLabel}“ fügt eine Zeile hinzu.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext"><tr>
              {columns.map((c) => <th key={c.key} className={`font-normal pb-1 pr-2 ${c.type === 'number' || c.type === 'lookup_value' || (c.type === 'derived' && c.display !== 'badge') ? 'text-right' : 'text-left'} ${c.width ?? ''}`}>{c.label}{c.unit ? ` (${c.unit})` : ''}</th>)}
              <th aria-hidden="true" className="w-8" />
            </tr></thead>
            <tbody>
              {prepared.rows.map((r) => (
                <tr key={r.id} data-testid="register-row" className="border-t border-hairline align-top">
                  {columns.map((c) => (
                    <td key={c.key} data-testid={`cell-${c.key}`} className={`py-1.5 pr-2 ${c.type === 'number' || c.type === 'lookup_value' ? 'text-right tabular-nums' : ''}`}>
                      {cellHidden(r, c) ? null : (
                        <Cell col={c} row={r} readOnly={readOnly} listId={c.datalist?.length ? `reg-${slug(config.title)}-${c.key}` : undefined}
                          overridden={overridden(r)} tableValue={tableValue(r, c)} tableRows={c.lookup ? tableRows(c.lookup.table_code) ?? [] : []}
                          isApplies={!!config.override?.applies_to.includes(c.key)}
                          onChange={(v) => patchRow(r.id, { [c.key]: v })} onSelectKey={(v) => selectKey(r.id, c, v)} />
                      )}
                      {c.type === 'lookup_key' && config.override && r.values[c.key] != null && keyCols[0]?.key === c.key && (
                        <>
                          <button type="button" disabled={readOnly} onClick={() => toggleOverride(r, !overridden(r))} className="text-[10px] text-accent hover:underline mt-1 block">
                            {overridden(r) ? `${tableLabel(c.lookup!.table_code)} übernehmen` : 'abweichend wählen'}
                          </button>
                          {overridden(r) && (
                            <div data-testid="lookup-original" className="text-[10px] text-subtext mt-0.5">
                              {tableLabel(c.lookup!.table_code)}: {config.override.applies_to.map((k) => fmt(tableValue(r, columns.find((x) => x.key === k)!) ?? null)).join(' / ')}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  ))}
                  <td className="py-1.5 pl-1 text-right"><button type="button" onClick={() => removeRow(r.id)} disabled={readOnly} aria-label="Zeile entfernen" className="text-subtext hover:text-error text-lg leading-none px-1 disabled:opacity-40">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {config.note ? <p className="text-[11px] text-subtext">{config.note}</p> : null}
      <div className="text-[11px] text-subtext border-t border-hairline-strong pt-2">
        <span className="font-mono">{complete}</span> Einträge · <span data-testid="rows-complete">{complete}/{prepared.rows.length}</span> vollständig
        {config.footer?.map((sym) => { const f = footerStates?.[sym]; const st = f?.state; const ok = st?.kind === 'computed';
          return <span key={sym}> · {f?.label ?? sym}: <span data-testid={`footer-${sym}`} className="font-mono" title={!ok && st && 'reason' in st ? String(st.reason) : undefined}>{ok ? fmt(st.value) : '—'}</span>{ok && f?.unit ? ` ${f.unit}` : ''}</span>; })}
        {config.sum_column && legacySum != null ? <> · {config.sum_column.label}: <span className="font-mono">{new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(legacySum)}</span>{config.sum_column.unit ? ` ${config.sum_column.unit}` : ''}</> : null}
      </div>
    </div>
  );
}
```

`Cell` (same file) — one branch per column type, aria-label = `col.aria_label ?? col.label`:

```tsx
function Cell({ col, row, readOnly, listId, overridden, tableValue, tableRows, isApplies, onChange, onSelectKey }: {
  col: RegisterColumn; row: PreparedRow; readOnly: boolean; listId?: string; overridden: boolean; tableValue: Value | undefined; tableRows: readonly RegulationRow[]; isApplies: boolean;
  onChange: (v: Value) => void; onSelectKey: (v: string) => void;
}) {
  const v = row.values[col.key]; const aria = col.aria_label ?? col.label;
  switch (col.type) {
    case 'boolean': return <input type="checkbox" checked={v === true} disabled={readOnly} aria-label={aria} onChange={(e) => onChange(e.target.checked)} className="mt-1" />;
    case 'number': return (<>
      <input type="number" inputMode="decimal" step="any" min={col.min} max={col.max} value={typeof v === 'number' ? v : ''} disabled={readOnly} aria-label={aria} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className={`${cellInput} text-right tabular-nums`} />
      {typeof v === 'number' && col.min !== undefined && v < col.min && <div className="text-[10px] text-warning mt-1">{col.label} muss ≥ {col.min} sein</div>}
    </>);
    case 'date': return <input type="date" value={typeof v === 'string' ? v : ''} disabled={readOnly} aria-label={aria} onChange={(e) => onChange(e.target.value || null)} className={cellInput} />;
    case 'enum': {
      const opts = (col.options ?? []).map((o) => ({ value: o, label: col.option_labels?.[o] ?? col.value_labels?.[o] ?? o }));
      if (col.sort_by_label) opts.sort((a, b) => a.label.localeCompare(b.label));
      return (<>
        <select value={typeof v === 'string' ? v : ''} disabled={readOnly} aria-label={aria} onChange={(e) => onChange(e.target.value || null)} className={cellInput}>
          <option value="" disabled={!!col.required}>— wählen —</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {col.required && v == null && <div data-testid={`reselect-${col.key}`} className="text-[10px] text-warning mt-1">⚠ {col.label} wählen</div>}
      </>);
    }
    case 'lookup_key': {
      const tl = tableLabel(col.lookup!.table_code);
      return (<>
        <select aria-label={aria} value={typeof v === 'string' ? v : ''} disabled={readOnly} onChange={(e) => onSelectKey(e.target.value)} className={cellInput}>
          <option value="" disabled>— wählen —</option>
          {groupRows(tableRows, col.lookup!.group_by).map((g) => g.label == null
            ? g.rows.map((r) => <option key={r.row_key} value={r.row_key}>{r.label_de}</option>)
            : <optgroup key={g.label} label={g.label}>{g.rows.map((r) => <option key={r.row_key} value={r.row_key}>{r.label_de}</option>)}</optgroup>)}
        </select>
        {v == null && <div data-testid={`reselect-${col.key}`} className="text-[10px] text-warning mt-1">⚠ {col.label} neu wählen ({tl})</div>}
      </>);
    }
    case 'lookup_value': {
      const tl = tableLabel(col.lookup!.table_code); const mismatch = typeof v === 'number' && typeof tableValue === 'number' && v !== tableValue;
      return (<>
        {overridden && isApplies
          ? <input type="number" inputMode="decimal" step="any" min={col.min} max={col.max} aria-label={`${col.label} (abweichend)`} value={typeof v === 'number' ? v : ''} disabled={readOnly} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className={`${cellInput} text-right tabular-nums`} />
          : <span data-testid={`lookup-value-${col.key}`} className="font-mono text-ink">{fmt(v ?? null)}</span>}
        {mismatch && <div data-testid={`mismatch-${col.key}`} className="text-[10px] text-warning">{col.label} weicht von {tl} ab</div>}
      </>);
    }
    case 'derived': {
      const label = v == null ? null : (col.value_labels?.[String(v)] ?? fmt(v));
      return col.display === 'badge'
        ? (label ? <div data-testid={`derived-badge-${col.key}`} className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-1">{label}</div> : null)
        : <span data-testid={`derived-${col.key}`} className="font-mono text-sm text-ink">{label ?? <span className="text-subtext">—</span>}</span>;
    }
    case 'grid': return <GridCell col={col} row={row} readOnly={readOnly} onChange={onChange} />;   // Task 9; until then: render null and `data-testid="grid-pending"`
    default: return <input type="text" value={typeof v === 'string' ? v : ''} disabled={readOnly} aria-label={aria} list={listId} placeholder={col.placeholder} onChange={(e) => onChange(e.target.value)} className={cellInput} />;
  }
}
```
Until Task 9 lands, `GridCell` is `function GridCell() { return <span data-testid="grid-pending" className="text-subtext">—</span>; }` with a `// Plan 2b Task 9` comment. Where a `derived` column has `display: 'badge'` the badge renders in ITS OWN `<td>` (`cell-kind`); the surface header for `kind` therefore appears as a column — today's badge sat under the type select. Accepted delta (Task 10 list); the pin only asserts text.

`ReadOnlyRegisterTable` (port of `worksheet-form.tsx:1003-1038`): `prepareRegisterRows(carrier, config.columns, { table, tableRows }, { legacyMap, overrideFlagKey })`; columns shown = `config.columns.filter(c => c.key !== config.override?.flag_key && !(c.type === 'derived' && c.display === 'badge'))`; a `lookup_key` cell shows `tableRows(code)?.find(r => r.row_key === v)?.label_de ?? '—'`; numbers via `fmt`; booleans `Ja`/`Nein`; empty ⇒ `<p className="text-sm text-subtext">Keine Zeilen erfasst.</p>`.

- [ ] **Step 4: Run → PASS**: `pnpm vitest run --project unit src/components/worksheet/__tests__/register-editor.test.tsx && pnpm -s typecheck`. If `evaluateCondition` in row scope returns `manual` for `typ == 'a'` because `typ` is unset (new row), the cell is VISIBLE — that is the fail-safe rule; the test's `b` row yields `fail` ⇒ hidden.

- [ ] **Step 5: Commit**

```bash
git add src/components/worksheet/register-editor.tsx src/components/worksheet/__tests__/register-editor.test.tsx
git commit -m "feat(editor): generic RegisterEditor + ReadOnlyRegisterTable over the register ui_config contract (lookup/derived/flags/footer from engine states)"
```

---

### Task 3: `WIDGETS` registry + one renderer path in `worksheet-form.tsx`; `surface_inventory` (A138-07) onto the generic editor

**Files:**
- Create: `src/components/worksheet/widgets.tsx`, `src/components/worksheet/__tests__/widgets-dispatch.test.tsx`, `src/components/worksheet/__tests__/register-editor-a138-07.test.tsx`
- Modify: `src/components/worksheet/worksheet-form.tsx:16-31` (imports), `:105-110` (`FieldDef` → exported `WorksheetFormField`), `:175-178` (`surfaceSource` prop → `registerSources`), `:485-526` (kostra/rainfall/surface/risk/mitigation `fields.find` lookups), `:528-555` (`selectionFields`, `pollutantRegisterField`), `:563-565` (`srcState`), `:580-606` (`fieldsBySectionId` exclusions), `:652-733` (`renderField`), `:774` (banner), `:861-952` (bottom sections), `:996-1038` (`ReadOnlySurfaceTable` — delete)
- Modify: `src/components/worksheet/surface-source-banner.tsx` (prop type), `src/lib/db/queries/worksheet.ts:389-421` (`loadSurfaceSource` returns `symbol`), `src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx:130-131, 240-244, 341-367, 409`
- Delete: `src/components/worksheet/surface-inventory-editor.tsx`, `src/components/worksheet/structured-register-editor.tsx`, `src/components/worksheet/__tests__/surface-inventory-editor.test.tsx` (moved)
- Modify (tests): `src/components/worksheet/__tests__/selection-editors.test.tsx:54-98` (three `StructuredRegisterEditor` blocks → `RegisterEditor` with `resolveRegisterConfig`), the eight test files carrying `vi.mock('../surface-inventory-editor', …)` (list in Step 5)
- Test (existing, must stay green untouched): `src/lib/eval/__tests__/engine-wiring-a138-07.test.tsx`, `engine-wiring-a138-07-sealed.test.tsx`, `src/components/worksheet/__tests__/surface-source-banner.test.tsx`, `dynamic-field.test.tsx`, `selection-dispatch-form-render.test.tsx`, `pollutant-register.test.tsx` (until Task 4), `visible-fields.test.tsx`

**Interfaces:**
- Consumes: Task 2 (`RegisterEditor`, `ReadOnlyRegisterTable`, `FooterState`), Task 1 (`resolveRegisterConfig`, `RegisterUiConfig`), Plan 1 (`inferWidget`, `Widget`, `resolveSelectionConfig`), Plan 2a Task 7 (`useEquationEngine({ …, standardCode })`, `engineStates`, `withFallbackRegisterEquations`), Plan 2a Task 9 (`carrierSourceState`, `carrierWithholdFieldIds`, `CarrierSourceState`), Plan 2a Task 10 (`computeVisibility`, `makeSymbolLookup` in `symbol-lookup.ts`, `hiddenSymbols` plumbing — kept), `DynamicField`, `ChecklistEditor`, `RainfallTablesEditor`, `RiskRegisterEditor`, `MitigationPlanEditor`, `EditorErrorBoundary`.
- Produces:
  ```ts
  // widgets.tsx
  export type WorksheetFormField = Parameters<typeof DynamicField>[0]['field'] & { sectionId: string | null; orderIndex: number; active: boolean; inheritedFromWorksheet?: string };
  export type WidgetContext = {
    standardCode: string; locale: 'de' | 'en'; projectId: string; readOnly: boolean;
    fieldBySymbol: ReadonlyMap<string, WorksheetFormField>;
    values: Record<string, FieldValue>; setField: (id: string, v: FieldValue) => void;
    symbolLookup: (sym: string) => Value | undefined;
    engineStates: Record<string, EvalState>; equations: ReadonlyArray<{ id: string; outputSymbol: string | null; inputSymbols: string[] | null }>;
    computedSymbols: ReadonlySet<string>; serverComputedSet: ReadonlySet<string>;
    rainfallDesignReturnPeriod: number | null;                   // bespoke RainfallTablesEditor input (unchanged)
    renderDynamic: (f: WorksheetFormField) => React.ReactNode;   // today's <DynamicField …/> factory, owned by the form
  };
  export type BespokeEditorKey = 'rainfall_tables' | 'risk_register' | 'risk_mitigation_plan';
  export const BESPOKE_BY_SYMBOL: Readonly<Record<string, BespokeEditorKey>>;   // { r_D_n_table: 'rainfall_tables', risk_register: 'risk_register', risk_mitigation_plan: 'risk_mitigation_plan' } — used while widget IS NULL
  export const BESPOKE_TITLES: Readonly<Record<BespokeEditorKey, string>>;      // today's h2 strings, worksheet-form.tsx:874, 911, 921
  export function effectiveWidget(f: WorksheetFormField): Widget;               // f.widget ?? inferWidget(f.dataType, (f.enumValues?.length ?? 0) > 0)
  export function resolveBespokeEditor(f: WorksheetFormField, cfg: RegisterUiConfig | null): BespokeEditorKey | null; // cfg?.editor as key, else BESPOKE_BY_SYMBOL[symbol] while widget == null
  export type Placement = 'section' | 'bottom';
  export function widgetPlacement(f: WorksheetFormField, ctx: Pick<WidgetContext, 'fieldBySymbol'>): { placement: Placement; title: string | null };
  //   register: cfg.placement ?? 'section' (bespoke ⇒ 'bottom' with BESPOKE_TITLES); select_many via legacy SELECTION_CONFIGS checklist ⇒ 'bottom' (today); everything else 'section'
  export const WIDGETS: Record<Widget, (f: WorksheetFormField, ctx: WidgetContext) => React.ReactNode>;
  export function footerStatesFor(cfg: RegisterUiConfig, ctx: WidgetContext): Record<string, FooterState>;  // footer symbol → engine state of the equation whose outputSymbol matches (+ label/unit from fieldBySymbol)
  // worksheet-form.tsx
  export type { WorksheetFormField };
  // Props: `surfaceSource` REMOVED; `registerSources?: Array<{ symbol: string; ownerCode: string; status: string; carrier: unknown }>` ADDED
  ```

- [ ] **Step 1: Move the A138-07 editor pins and write the dispatch test**

`register-editor-a138-07.test.tsx` — header comment `// Plan 2b: moved from surface-inventory-editor.test.tsx (component deleted); same carrier shape, same assertions, testids mapped per Plan 2b Task 2.` Render `RegisterEditor` with `REGISTER_CONFIGS_FALLBACK.surface_inventory`, `symbol="surface_inventory"`, `standardCode="DWA-A-138-1"`, store helper identical to the old file (`initStore`, `storedCarrier` typed as `{ rows: SurfaceRow[] }` — import `SurfaceRow` type from `@/lib/eval/surface-inventory` which stays for the engine shim). The three cases, assertion by assertion:

```tsx
it('selecting an Oberflächentyp auto-fills C_i/C_s read-only and derives kind', async () => {
  // … click '+ Zeile hinzufügen', selectOptions(getByLabelText('Oberflächentyp'), 'park_flach')
  expect(row.tab9_value).toBe('park_flach'); expect(row.c_i).toBe(0.1); expect(row.c_s).toBe(0.2); expect(row.coeff_override).toBe(false);
  expect(screen.getByTestId('lookup-value-c_i')).toHaveTextContent('0,1');     // was c_i-readonly
  expect(screen.getByTestId('lookup-value-c_s')).toHaveTextContent('0,2');     // was c_s-readonly
  expect(screen.getByTestId('derived-badge-kind')).toHaveTextContent('unbefestigt'); // was kind-badge
});
it('"abweichend wählen" makes C_i/C_s editable, flags override, keeps the Tab. 9 pair visible', async () => {
  // identical to surface-inventory-editor.test.tsx:49-69 with getByTestId('lookup-original') for 'tab9-original'; expected text 'Tab. 9: 0,9 / 1'
});
it('migrates legacy rows on load: Gewächshausdach drops to reselection; footer totals come from the engine (form-level test below)', () => {
  // identical store init (surface_type rows); expect(screen.getByText(/Oberflächentyp neu wählen/i)); expect(getByTestId('rows-complete')).toHaveTextContent('1/2');
});
```
The two footer assertions of the old third case (`total-paved` `1.575,9`, `total-unpaved` `0`) become a FORM-level case in the same file because the totals are engine states now (single-source): render `<WorksheetForm>` with the mock list and `baseProps` shape from `pollutant-register.test.tsx:13-72` (drop the `vi.mock('../surface-inventory-editor')` / `'../rainfall-table-selector'` lines — the modules no longer exist), `standardCode: 'DWA-A-138-1'`, fields = `surface_inventory` (json, `orderIndex 0`) + `A_E_ba`, `A_E_nba`, `A_C` (number, units m²), `equations` = the six rows from `engine-wiring-a138-07.test.tsx:41-70` + `-sealed.test.tsx:41-56` (prod UUIDs, Σ formulas — the 2a bridge rewrites them), `initialValues` = the legacy two-row carrier. Assert `getByTestId('footer-A_E_ba')` has text `1.575,9`, `footer-A_E_nba` has `0`, `getByTestId('register-editor').dataset.symbol === 'surface_inventory'`, and `queryByText('Mehrzeilige Eingabe — Phase 2')` is null. (The engine write-back runs synchronously in happy-dom — `engine-wiring-a138-07.test.tsx:125-131`.)

```tsx
// src/components/worksheet/__tests__/widgets-dispatch.test.tsx
import { describe, it, expect } from 'vitest';
import { effectiveWidget, widgetPlacement, resolveBespokeEditor, BESPOKE_TITLES } from '../widgets';
import { resolveRegisterConfig } from '@/lib/eval/register-configs';
const base = { id: 'f', labelDe: 'x', labelEn: null, unit: null, isRequired: false, enumValues: null, validationRules: null, clauseReference: null, verificationStatus: 'x', description: null, sectionId: 's1', orderIndex: 0, active: true, widget: null, uiConfig: null, lookup: null, visibleWhen: null } as const;
describe('effectiveWidget / placement / bespoke', () => {
  it('NULL widget infers from data_type exactly like inferWidget', () => {
    expect(effectiveWidget({ ...base, symbol: 'n', dataType: 'number' })).toBe('scalar');
    expect(effectiveWidget({ ...base, symbol: 'e', dataType: 'enum', enumValues: [{ value: 'a', label_de: 'a', label_en: null }] })).toBe('select_one');
    expect(effectiveWidget({ ...base, symbol: 'b', dataType: 'boolean' })).toBe('attestation');
    expect(effectiveWidget({ ...base, symbol: 'j', dataType: 'json' })).toBe('register');
    expect(effectiveWidget({ ...base, symbol: 'j', dataType: 'json', enumValues: [{ value: 'a', label_de: 'a', label_en: null }] })).toBe('select_many');
    expect(effectiveWidget({ ...base, symbol: 'n', dataType: 'number', widget: 'lookup_fill' })).toBe('lookup_fill');
  });
  it('surface_inventory (widget NULL) is a register placed at the bottom (fallback pins placement bottom)', () => {
    const f = { ...base, symbol: 'surface_inventory', dataType: 'json' as const };
    expect(widgetPlacement(f, { fieldBySymbol: new Map() })).toEqual({ placement: 'bottom', title: 'Flächenverzeichnis' });
  });
  it('the three bespoke editors resolve by symbol while widget IS NULL and by ui_config.editor when set', () => {
    expect(resolveBespokeEditor({ ...base, symbol: 'r_D_n_table', dataType: 'json' }, null)).toBe('rainfall_tables');
    expect(resolveBespokeEditor({ ...base, symbol: 'risk_register', dataType: 'json' }, null)).toBe('risk_register');
    expect(resolveBespokeEditor({ ...base, symbol: 'anything', dataType: 'json', widget: 'register' }, { title: 't', columns: [{ key: 'a', type: 'text', label: 'A' }], editor: 'risk_mitigation_plan' })).toBe('risk_mitigation_plan');
    expect(resolveBespokeEditor({ ...base, symbol: 'risk_register', dataType: 'json', widget: 'register' }, { title: 't', columns: [{ key: 'a', type: 'text', label: 'A' }] })).toBeNull(); // DB register config wins ⇒ generic editor (Task 9 path)
    expect(BESPOKE_TITLES.rainfall_tables).toBe('Regenspendentabellen (für V_VA nach Gl. 8)');
  });
  it('a legacy TS selection register resolves to a bottom-placed register config', () => {
    const f = { ...base, symbol: 'bewertungskommission_members', dataType: 'json' as const };
    expect(resolveRegisterConfig(f)?.placement).toBe('bottom');
    expect(widgetPlacement(f, { fieldBySymbol: new Map() }).placement).toBe('bottom');
  });
});
```

- [ ] **Step 2: Run → FAIL** (`Cannot find module '../widgets'`; old editor tests still pass until Step 4 deletes the files).

- [ ] **Step 3: Implement `widgets.tsx`**

```tsx
'use client';
import type { ReactNode } from 'react';
import { inferWidget, type Widget, type RegisterUiConfig } from '@/lib/eval/field-config';
import { resolveRegisterConfig } from '@/lib/eval/register-configs';
import { resolveSelectionConfig } from '@/lib/eval/selection-fields';
import { RegisterEditor, type FooterState } from './register-editor';
import { ChecklistEditor } from './checklist-editor';
import { RainfallTablesEditor } from './rainfall-tables-editor';
import { RiskRegisterEditor } from './risk-register-editor';
import { MitigationPlanEditor } from './mitigation-plan-editor';
import { EditorErrorBoundary } from './editor-error-boundary';
import { ReferenceField } from './reference-field';       // Task 6 — until then export a stub from reference-field.tsx that renders ctx.renderDynamic(f)
import { LookupFillField } from './lookup-fill-field';    // Task 7 — same stub rule
// … WorksheetFormField, WidgetContext types as in Interfaces

export const BESPOKE_BY_SYMBOL = { r_D_n_table: 'rainfall_tables', risk_register: 'risk_register', risk_mitigation_plan: 'risk_mitigation_plan' } as const satisfies Record<string, BespokeEditorKey>;
export const BESPOKE_TITLES: Record<BespokeEditorKey, string> = {
  rainfall_tables: 'Regenspendentabellen (für V_VA nach Gl. 8)',
  risk_register: 'Risikoanalyse (Anhang A — Tab. A.1)',
  risk_mitigation_plan: 'Risiko-Maßnahmenplan (Anhang A — Tab. A.2)',
};
export function effectiveWidget(f: WorksheetFormField): Widget { return (f.widget as Widget | null | undefined) ?? inferWidget(f.dataType, (f.enumValues?.length ?? 0) > 0); }
export function resolveBespokeEditor(f: WorksheetFormField, cfg: RegisterUiConfig | null): BespokeEditorKey | null {
  const key = cfg?.editor ?? (f.widget == null ? BESPOKE_BY_SYMBOL[f.symbol as keyof typeof BESPOKE_BY_SYMBOL] : undefined);
  return key && key in BESPOKE_TITLES ? (key as BespokeEditorKey) : null;
}
const asDb = (f: WorksheetFormField) => ({ symbol: f.symbol, dataType: f.dataType, enumValues: f.enumValues, widget: f.widget ?? null, uiConfig: f.uiConfig, lookup: f.lookup, visibleWhen: f.visibleWhen ?? null });
export function widgetPlacement(f: WorksheetFormField): { placement: Placement; title: string | null } {
  const w = effectiveWidget(f);
  if (w === 'register') {
    const cfg = resolveRegisterConfig(asDb(f)); const bespoke = resolveBespokeEditor(f, cfg);
    if (bespoke) return { placement: 'bottom', title: BESPOKE_TITLES[bespoke] };
    if (cfg) return { placement: cfg.placement ?? 'section', title: cfg.title };
    return { placement: 'section', title: null };
  }
  if (w === 'select_many') { const cfg = resolveSelectionConfig(asDb(f)); if (cfg?.kind === 'checklist') return { placement: f.widget == null ? 'bottom' : 'section', title: cfg.title }; }
  return { placement: 'section', title: null };
}
export function footerStatesFor(cfg: RegisterUiConfig, ctx: WidgetContext): Record<string, FooterState> {
  const out: Record<string, FooterState> = {};
  for (const sym of cfg.footer ?? []) {
    const eq = ctx.equations.find((e) => e.outputSymbol === sym); const field = ctx.fieldBySymbol.get(sym);
    out[sym] = { label: field?.labelDe ?? sym, unit: field?.unit ?? null, state: eq ? ctx.engineStates[eq.id] : undefined };
  }
  return out;
}
export const WIDGETS: Record<Widget, (f: WorksheetFormField, ctx: WidgetContext) => ReactNode> = {
  scalar: (f, ctx) => ctx.renderDynamic(f),
  select_one: (f, ctx) => ctx.renderDynamic(f),
  attestation: (f, ctx) => ctx.renderDynamic(f),
  derived: (f, ctx) => ctx.renderDynamic(f),
  grid: (f, ctx) => ctx.renderDynamic(f),               // no standalone grid renderer in Plan 2b (grid ships as a register COLUMN, Task 9) — json placeholder as today
  select_many: (f, ctx) => { const cfg = resolveSelectionConfig(asDb(f)); return cfg?.kind === 'checklist'
    ? <EditorErrorBoundary label={cfg.title}><ChecklistEditor fieldId={f.id} config={cfg} readOnly={ctx.readOnly} /></EditorErrorBoundary>
    : ctx.renderDynamic(f); },                            // json + enumValues without a config ⇒ dynamic-field.tsx json-checklist branch (unchanged)
  register: (f, ctx) => {
    const cfg = resolveRegisterConfig(asDb(f)); const bespoke = resolveBespokeEditor(f, cfg);
    if (bespoke === 'rainfall_tables') return <RainfallTablesEditor fieldId={f.id} readOnly={ctx.readOnly} designReturnPeriod={ctx.rainfallDesignReturnPeriod} />;
    if (bespoke === 'risk_register') return <EditorErrorBoundary label="Risikoregister"><RiskRegisterEditor fieldId={f.id} readOnly={ctx.readOnly} /></EditorErrorBoundary>;
    if (bespoke === 'risk_mitigation_plan') return <EditorErrorBoundary label="Risiko-Maßnahmenplan"><MitigationPlanEditor fieldId={f.id} readOnly={ctx.readOnly} /></EditorErrorBoundary>;
    if (!cfg) return ctx.renderDynamic(f);                // json without any config ⇒ "Mehrzeilige Eingabe — Phase 2" placeholder (dynamic-field.test.tsx:202 pin)
    return <EditorErrorBoundary label={cfg.title}><RegisterEditor fieldId={f.id} symbol={f.symbol} config={cfg} standardCode={ctx.standardCode} readOnly={ctx.readOnly} footerStates={footerStatesFor(cfg, ctx)} symbolLookup={ctx.symbolLookup} /></EditorErrorBoundary>;
  },
  reference: (f, ctx) => <ReferenceField field={f} ctx={ctx} />,
  lookup_fill: (f, ctx) => <LookupFillField field={f} ctx={ctx} />,
};
```

- [ ] **Step 4: Rewire `worksheet-form.tsx`**

1. Imports: remove `RainfallTableSelector`, `SurfaceInventoryEditor`, `RiskRegisterEditor`, `MitigationPlanEditor`, `ChecklistEditor`, `StructuredRegisterEditor`, `resolveSelectionConfig`/`SelectionConfig`, `PollutantRegisterEditor` (Task 4 removes the last pollutant lines; keep them compiling here), `surfaceSourceState`, `normalizeSurfaceCarrier`, `lookupTab9`, `RainfallTablesEditor`; add `import { WIDGETS, effectiveWidget, widgetPlacement, type WorksheetFormField, type WidgetContext } from './widgets'; import { ReadOnlyRegisterTable } from './register-editor'; import { resolveRegisterConfig } from '@/lib/eval/register-configs'; import { carrierSourceState, carrierWithholdFieldIds } from '@/lib/eval/carrier-source-state';` (2a T9 — `carrierWithholdFieldIds` only if the form uses it; the page does).
2. `type FieldDef = …` (`:105-110`) becomes `export type WorksheetFormField = …` (same members) and `type FieldDef = WorksheetFormField` for the rest of the file.
3. Props: delete `surfaceSource` (`:175-178`); add `registerSources?: Array<{ symbol: string; ownerCode: string; status: string; carrier: unknown }>`.
4. Delete `:490-501` (`kostraField`, `rainfallRefField`, `rainfallRefValue`, `rainfallTableRef`, `kostraValue`, `rainfallTables`) except keep `rainfallDesignReturnPeriod` (`:506-514`, feeds the bespoke editor through the context). Delete `:516-526` (`surfaceInventoryField`, `riskRegisterField`, `mitigationPlanField`), `:533-552` (`selectionFields`, `selectionFieldIds`), `:565` (`srcState`).
5. `fieldsBySectionId` (`:580-606`): the loop keeps `visibleFields(fields)`, the inherited skip and 2a's `visibility.hiddenFieldIds` skip; delete the five symbol/selection `continue`s (`:584-596`); add `if (widgetPlacement(f).placement === 'bottom') { bottom.push(f); continue; }` with `const bottom: FieldDef[] = []` collected in the same memo and returned as `{ map, bottom: bottom.sort((a, b) => a.orderIndex - b.orderIndex) }`. (`visibleSectionIds` reads `map`.)
6. Register sources (consumer worksheets): 
   ```ts
   const registerSourceStates = useMemo(() => (registerSources ?? []).map((src) => {
     const f = fieldBySymbol.get(src.symbol); const cfg = f ? resolveRegisterConfig({ symbol: f.symbol, dataType: f.dataType, widget: f.widget ?? null, uiConfig: f.uiConfig }) : null;
     const state = cfg ? carrierSourceState(src.carrier, cfg.columns, src.status, { ownerLabel: src.ownerCode, standardCode, legacyMap: cfg.legacy_map, overrideFlagKey: cfg.override?.flag_key, flagKeys: registerFlagKeys(src.symbol, cfg) }) : null;
     return { ...src, cfg, state };
   }), [registerSources, fieldBySymbol, standardCode]);
   ```
   `:774` → `{registerSourceStates.map((s) => s.state && <SurfaceSourceBanner key={s.symbol} state={s.state} />)}`; `:861-868` → for each source with `cfg && state && state.state !== 'missing'`: `<section …><h2>{cfg.title} (aus {ownerCode} — schreibgeschützt)</h2><ReadOnlyRegisterTable config={cfg} carrier={carrier} symbol={symbol} standardCode={standardCode} /></section>`. (`SurfaceSourceBanner`'s prop type becomes `CarrierSourceState` — the 2a shim keeps `SurfaceSourceState` structurally identical, so `surface-source-banner.test.tsx` is untouched.)
7. `renderField` (`:652-733`): rename the existing body into `const renderDynamic = (f: FieldDef) => (<DynamicField …same props… />)` (it already computes `computedHint`, `statusReason`, override pill per field — keep verbatim). Then:
   ```tsx
   const widgetCtx: WidgetContext = { standardCode, locale, projectId, readOnly: locked, fieldBySymbol, values, setField, symbolLookup, engineStates, equations: sortedEquations, computedSymbols, serverComputedSet, rainfallDesignReturnPeriod, renderDynamic };
   const renderField = (sectionId: string | null) => (fieldsBySectionId.map.get(sectionId) ?? []).map((f) => <div key={f.id}>{WIDGETS[effectiveWidget(f)](f, widgetCtx)}</div>);
   ```
   (`symbolLookup` is 2a Task 10's `makeSymbolLookup(fields, values)` memo — already in the form after 2a.)
8. Bottom strip (`:870-952`): replace the seven hand-written sections with
   ```tsx
   {fieldsBySectionId.bottom.map((f) => { const { title } = widgetPlacement(f); return (
     <section key={f.id} className="border-t border-hairline pt-6 mt-8 space-y-4" data-testid={`bottom-${f.symbol}`}>
       {title && <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">{title}</h2>}
       {WIDGETS[effectiveWidget(f)](f, widgetCtx)}
     </section>); })}
   ```
   The old `data-testid="rainfall-table-ref-section"` is replaced by `bottom-rainfall_table_ref` only until Task 6 moves the reference field into its section — grep tests for the old id (none exist as of `4c3355b`).
9. Delete `ReadOnlySurfaceTable` (`:996-1038`) and `NUM_FMT/fmt` if unused.
10. Keep `computedHint` for VSME pollutant sums keyed on `pollutantRegisterField` for now (Task 4 generalises it).

`page.tsx`: `surfaceSource={surfaceSource}` (`:409`) → `registerSources={surfaceSource ? [surfaceSource] : []}` after `loadSurfaceSource` returns `{ …, symbol: 'surface_inventory' }` (`queries/worksheet.ts:420`: add `symbol: 'surface_inventory' as const`); `:240-244` switch to `carrierSourceState` + `carrierWithholdFieldIds` from 2a T9 with `REGISTER_CONFIGS_FALLBACK.surface_inventory.columns` (or keep the 2a shim `surfaceSourceState` — either is correct; prefer the generic). The `as never` at `:367` is closed in Task 8 (needs `dataType` narrowing done there).

- [ ] **Step 5: Delete the replaced components and move their tests**

`git rm` `surface-inventory-editor.tsx`, `structured-register-editor.tsx`, `__tests__/surface-inventory-editor.test.tsx`. In `selection-editors.test.tsx:54-98` replace `StructuredRegisterEditor fieldId config={commission}` with `<RegisterEditor fieldId={FIELD_ID} symbol="bewertungskommission_members" config={resolveRegisterConfig({ symbol: 'bewertungskommission_members', dataType: 'json', widget: null })!} standardCode="DWA-M-820-1" />` (same for `change_orders` / `award_criteria_list`), `getByTestId('structured-register-editor')` → `getByTestId('register-editor')`, and add `// Plan 2b: StructuredRegisterEditor deleted — the generic RegisterEditor renders the TS selection registers via resolveRegisterConfig (Task 1).` The `change_orders` case must still find `/2\s*Einträge/`, `/Volumen/`, `/1\.500/` (legacy `sum_column` footer kept). Remove the `vi.mock('../surface-inventory-editor', …)` line (and, in Task 6, `'../rainfall-table-selector'`) from: `engine-wiring-suppress-a138-17.test.tsx:85`, `pollutant-register.test.tsx:35`, `render-a138-17-asm-inherited-prod-signal.test.tsx:86`, `render-a138-17-asm-inherited.test.tsx:85`, `render-a138-23-recommendation-readonly.test.tsx:63`, `render-computed-symbols-isComputed.test.tsx:46`, `render-vsme-derived-readonly.test.tsx:61`, `selection-dispatch-form-render.test.tsx:33` — each with `// Plan 2b: module deleted (generic RegisterEditor)`. A `vi.mock` of a non-existent module fails module resolution in vitest, so this is not optional.

- [ ] **Step 6: Run** `pnpm test && pnpm -s typecheck && pnpm -s lint` → PASS. Expected movements: `surface-inventory-editor.test.tsx` (3 cases) → `register-editor-a138-07.test.tsx` (4 cases); `selection-editors.test.tsx` count unchanged; `selection-dispatch-form-render.test.tsx` unchanged (its DB-widget select_many field renders through `WIDGETS.select_many` at the bottom exactly as before because `widget != null` ⇒ placement `section` — WAIT: that test asserts the DB field is NOT in the grid; with placement `section` it now renders IN the grid slot. Read the test's assertions (`:60-63` "nicht im Grid erwartet"): if it asserts absence from the grid by label lookup, the assertion moves from "absent" to "present once, rendered by ChecklistEditor" with a `// Plan 2b: DB-configured select_many renders in its section (spec §6)` note. This is the one deliberate pin text change of this task; record it in Task 10.)

- [ ] **Step 7: Commit**

```bash
git add src/components/worksheet/widgets.tsx src/components/worksheet/worksheet-form.tsx src/components/worksheet/surface-source-banner.tsx src/components/worksheet/__tests__ src/lib/db/queries/worksheet.ts "src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx"
git rm -q src/components/worksheet/surface-inventory-editor.tsx src/components/worksheet/structured-register-editor.tsx src/components/worksheet/__tests__/surface-inventory-editor.test.tsx
git commit -m "feat(form): WIDGETS registry + one renderer path; surface_inventory and the TS selection registers render through the generic RegisterEditor (bespoke editors dispatched by key)"
```

---

### Task 4: `pollutant_register` (VSME-B04.100) onto the generic editor — sums from Plan 2a's equations

**Files:**
- Delete: `src/components/worksheet/pollutant-register-editor.tsx`
- Modify: `src/components/worksheet/worksheet-form.tsx` (`POLLUTANT_REGISTER_SYMBOL` / `POLLUTANT_OUTPUT_SYMBOLS` imports `:27`, `VSME_POLLUTANT_SUM_SYMBOLS` `:202`, `pollutantRegisterField` `:555`, the `computedHint` branch `:675-680`), `src/lib/eval/pollutant-register.ts` (keep the carrier types + `POLLUTANT_REGISTER_SYMBOL`/`POLLUTANT_OUTPUT_SYMBOLS` exports — 2a's materialiser and `eval/__tests__/pollutant-register.test.ts` still import `normalizePollutantCarrier`/`summarizePollutants`; add a header line "Plan 2b: the editor no longer uses this module; it remains the engine-side parity reference for `eval/__tests__/pollutant-register.test.ts`")
- Modify (tests): `src/components/worksheet/__tests__/pollutant-register.test.tsx` → `register-editor-vsme-b04.test.tsx` (moved; the WorksheetForm cases stay, the two `PollutantRegisterEditor` cases become `RegisterEditor` / form cases)
- Test (existing, untouched): `src/lib/eval/__tests__/pollutant-register.test.ts`, `render-vsme-derived-readonly.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`REGISTER_CONFIGS_FALLBACK.pollutant_register` with `flags`, `footer`, `option_labels`), Task 3 (`WIDGETS.register`, `footerStatesFor`), Plan 2a Task 5/7 (`FALLBACK_REGISTER_EQUATIONS['VSME-B04.100']`, `withFallbackRegisterEquations` already applied to the engine's equation list in the form).
- Produces: generic `computedHint` for register outputs — `registerOutputHint(symbol): { label } | undefined` in the form: for every register field `r` (any field with a non-null `resolveRegisterConfig`), the output symbols of equations (DB + fallback) whose `inputSymbols` contain `r.symbol` get `{ label: isServerComputed ? \`Summe aus dem Register „${cfg.title}“ (${placement === 'bottom' ? 'unten auf dieser Seite' : 'in diesem Abschnitt'}).\` : \`Wird beim Speichern aus dem Register „${cfg.title}“ berechnet.\` }`. The string contains the register title, so the existing assertion `textContent.includes('Schadstoffregister')` holds (fallback title `Schadstoffregister (E-PRTR)`).

- [ ] **Step 1: Move the tests**

Create `register-editor-vsme-b04.test.tsx` from `pollutant-register.test.tsx` (`git mv`), header `// Plan 2b: PollutantRegisterEditor deleted; the VSME-B04 carrier renders through the generic RegisterEditor and the sums are Plan 2a equation states.` Keep the mock list minus the two deleted-module lines (Step 5 of Task 3 already removed one). Changes:
- `:100` `getByTestId('pollutant-register-editor')` → `expect(getByTestId('register-editor').dataset.symbol).toBe('pollutant_register')`.
- `:172-198` "sums complete rows per medium in the footer" becomes a FORM case: render `<WorksheetForm {...baseProps} worksheet={{ template: { code: 'VSME-B04.100', … } }} fields={b04Fields} initialValues={{ [REG_ID]: { type: 'json', value: { not_applicable: false, rows: [ …the three rows… ] } } }} />` (equations `[]` — the form adds the fallback equations via `withFallbackRegisterEquations`, 2a Task 7) and assert `getByTestId('footer-AmountOfEmissionToAir').textContent === '0,4'`, `footer-AmountOfEmissionToWater` `'0,25'`, `footer-AmountOfEmissionToSoil` `'0'`, `rows-complete` `'2/3'`. (`0` for soil: the fallback formula `sum_rows(..., if(medium == 'soil', amount_t, 0))` over 2 complete rows returns 0 — `summarizePollutants` parity, `eval/__tests__/pollutant-register.test.ts:83-98`.)
- `:200-211` N/A toggle: render `<RegisterEditor fieldId={REG_ID} symbol="pollutant_register" config={REGISTER_CONFIGS_FALLBACK.pollutant_register} standardCode="VSME" />`, `fireEvent.click(getByTestId('flag-not_applicable'))`, assert stored `not_applicable === true` and `rows` preserved.
- Add one case: `not_applicable ⇒ the three footer states are 0` (form-level, `initialValues` with `not_applicable: true, rows: []`, expect all three `footer-*` to be `'0'`).

- [ ] **Step 2: Run → FAIL** (`pollutant-register-editor` testid still rendered by the old branch; `footer-*` absent).

- [ ] **Step 3: Implement**

In `worksheet-form.tsx`: delete the `PollutantRegisterEditor` import, `POLLUTANT_REGISTER_SYMBOL`/`POLLUTANT_OUTPUT_SYMBOLS` import (`:27`), `VSME_POLLUTANT_SUM_SYMBOLS` (`:202`), `pollutantRegisterField` (`:555`), the pollutant bottom section (already gone in Task 3's rewrite — verify), and replace the `computedHint` chain (`:667-683`) with:
```ts
const registerOutputHints = useMemo(() => {
  const m = new Map<string, { title: string; placement: 'section' | 'bottom' }>();
  for (const r of fields) { const cfg = resolveRegisterConfig({ symbol: r.symbol, dataType: r.dataType, widget: r.widget ?? null, uiConfig: r.uiConfig }); if (!cfg) continue;
    for (const eq of withFallbackRegisterEquations(worksheet.template.code, sortedEquations)) if (eq.outputSymbol && (eq.inputSymbols ?? []).includes(r.symbol)) m.set(eq.outputSymbol, { title: cfg.title, placement: cfg.placement ?? 'section' }); }
  return m;
}, [fields, sortedEquations, worksheet.template.code]);
// inside renderDynamic:
const regHint = registerOutputHints.get(f.symbol);
const computedHint = isVsme && VSME_CO2_ENGINE_SYMBOLS.has(f.symbol) ? { …unchanged… }
  : regHint ? { label: isServerComputed ? `Summe aus dem Register „${regHint.title}“ (${regHint.placement === 'bottom' ? 'unten auf dieser Seite' : 'in diesem Abschnitt'}).` : `Wird beim Speichern aus dem Register „${regHint.title}“ berechnet.` }
  : isServerComputed ? { label: 'Serverseitig berechneter Wert.' } : undefined;
```
Note the A138-07 six outputs now also get this hint (label "Flächenverzeichnis") — they were hint-less before; accepted delta, listed in Task 10. The `isVsme &&` guard on the register hint is dropped deliberately (generic).

- [ ] **Step 4: Run** `pnpm test && pnpm -s typecheck` → PASS; `git rm` the editor.

- [ ] **Step 5: Commit** — `git commit -m "feat(form): VSME-B04 pollutant register renders through the generic RegisterEditor; sums are engine states; register-output hint generalised"`

---

### Task 5: Widget migrations emitted from the TS fallbacks (written-not-applied) + freshness pin

**Files:**
- Create: `scripts/regulation-tables/emit-widget-configs-sql.ts`, `scripts/__tests__/widget-configs-sql-freshness.test.ts`
- Create (generated by the script, committed): `scripts/migrations/20260916130000_a138_07_surface_inventory_widget.sql`, `scripts/migrations/20260916140000_vsme_b04_pollutant_register_widget.sql`, `scripts/migrations/20260916150000_a138_rainfall_table_ref_reference.sql`, `scripts/migrations/20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql`, `scripts/rollback-20260916130000-widget-configs.sql`
- Reference: `scripts/regulation-tables/emit-selection-configs-sql.ts:20-21,53-60` (quoting helpers + UPDATE shape), `scripts/__tests__/generated-sql-freshness.test.ts` (pin style), `scripts/migrations/20260911120000_selection_configs_DWA_A_138_1.sql` (the UPDATE join)

**Interfaces:**
- Consumes: Task 1 (`REGISTER_CONFIGS_FALLBACK`), Task 6 (`REFERENCE_CONFIGS_FALLBACK`), Task 7 (`LOOKUP_BINDINGS_FALLBACK`), `parseFieldConfig`.
- Produces:
  ```ts
  export type WidgetEntry = { file: string; standard: string; symbol: string; widget: 'register' | 'reference' | 'lookup_fill'; ui_config: unknown; lookup?: unknown; gated?: string /* sign-off id that must be ratified before apply */ };
  export const WIDGET_MIGRATION_ENTRIES: readonly WidgetEntry[];   // the four entries, in apply order
  export function emitWidgetConfigSql(entries: readonly WidgetEntry[]): Map<string /*file*/, string /*sql*/>;
  export function emitWidgetRollbackSql(entries: readonly WidgetEntry[]): string;
  ```
  Each `up` file:
  ```sql
  -- Generated by scripts/regulation-tables/emit-widget-configs-sql.ts from the TS fallback config (Plan 2b). Regenerate, do not hand-edit.
  -- Retires: <fallback constant> (src/lib/eval/<file>.ts) once applied. Apply AFTER 20260911100000_guideline_to_tool_schema.sql.
  [-- GATED: do not apply before sign-off <id> is RATIFIED (see SIGN-OFF-plan-2b.md).]
  BEGIN;
  UPDATE fields f SET widget = 'register', ui_config = '<json>'::jsonb[, lookup = '<json>'::jsonb] FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.symbol = '<symbol>' AND s.code = '<standard>' AND f.worksheet_template_id = w.id AND f.widget IS NULL;
  COMMIT;
  ```
  Rollback (one file, reverse order): `UPDATE fields f SET widget = NULL, ui_config = NULL, lookup = NULL FROM … WHERE f.symbol = '<symbol>' AND s.code = '<standard>' AND f.worksheet_template_id = w.id AND f.widget = '<widget>';` — restore target is NULL because none of the four symbols is among the 36 Plan-1 selection entries (verify: `grep -c "'surface_inventory'\|'pollutant_register'\|'rainfall_table_ref'\|'ac_as_ratio_limit'" scripts/regulation-tables/selection-config-entries.json` must print `0`; paste the raw output into the task report).

- [ ] **Step 1: Write the freshness pin**

```ts
// scripts/__tests__/widget-configs-sql-freshness.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { emitWidgetConfigSql, emitWidgetRollbackSql, WIDGET_MIGRATION_ENTRIES } from '../regulation-tables/emit-widget-configs-sql';
import { parseFieldConfig } from '../../src/lib/eval/field-config';
import { REGISTER_CONFIGS_FALLBACK } from '../../src/lib/eval/register-configs';
import { REFERENCE_CONFIGS_FALLBACK } from '../../src/lib/eval/reference-configs';
import { LOOKUP_BINDINGS_FALLBACK } from '../../src/lib/eval/lookup-fill';

const ROOT = join(__dirname, '..', '..');
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const read = (rel: string) => norm(readFileSync(join(ROOT, rel), 'utf8'));

describe('widget-config migrations — committed files equal a fresh emitter call (Plan 2b)', () => {
  it('four entries, apply order by timestamp', () => {
    expect(WIDGET_MIGRATION_ENTRIES.map((e) => e.file)).toEqual([
      '20260916130000_a138_07_surface_inventory_widget', '20260916140000_vsme_b04_pollutant_register_widget',
      '20260916150000_a138_rainfall_table_ref_reference', '20260916160000_a138_12_ac_as_ratio_limit_lookup_fill',
    ]);
  });
  it('every migration file matches the emitter byte-for-byte', () => {
    for (const [file, sql] of emitWidgetConfigSql(WIDGET_MIGRATION_ENTRIES)) expect(norm(sql)).toBe(read(`scripts/migrations/${file}.sql`));
    expect(norm(emitWidgetRollbackSql(WIDGET_MIGRATION_ENTRIES))).toBe(read('scripts/rollback-20260916130000-widget-configs.sql'));
  });
  it('the embedded ui_config / lookup round-trip through parseFieldConfig to the TS fallback (deploy-before-migration parity)', () => {
    const json = (sql: string, col: 'ui_config' | 'lookup') => JSON.parse(new RegExp(`${col} = '((?:[^']|'')*)'::jsonb`).exec(sql)![1].replace(/''/g, "'"));
    const files = emitWidgetConfigSql(WIDGET_MIGRATION_ENTRIES);
    const surf = json(files.get('20260916130000_a138_07_surface_inventory_widget')!, 'ui_config');
    expect(parseFieldConfig({ widget: 'register', uiConfig: surf, lookup: null, visibleWhen: null }).ui).toEqual(REGISTER_CONFIGS_FALLBACK.surface_inventory);
    const poll = json(files.get('20260916140000_vsme_b04_pollutant_register_widget')!, 'ui_config');
    expect(parseFieldConfig({ widget: 'register', uiConfig: poll, lookup: null, visibleWhen: null }).ui).toEqual(REGISTER_CONFIGS_FALLBACK.pollutant_register);
    const ref = json(files.get('20260916150000_a138_rainfall_table_ref_reference')!, 'ui_config');
    expect(parseFieldConfig({ widget: 'reference', uiConfig: ref, lookup: null, visibleWhen: null }).ui).toEqual(REFERENCE_CONFIGS_FALLBACK.rainfall_table_ref);
    const lf = files.get('20260916160000_a138_12_ac_as_ratio_limit_lookup_fill')!;
    expect(parseFieldConfig({ widget: 'lookup_fill', uiConfig: null, lookup: json(lf, 'lookup'), visibleWhen: null }).lookup).toEqual(LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit);
    expect(lf).toMatch(/^-- GATED: do not apply before sign-off D-2b-3/m);
  });
  it('no stray 20260916[1-6]… widget migration exists beyond the entries', () => {
    const files = readdirSync(join(ROOT, 'scripts/migrations')).filter((f) => /^202609161[3-6]0000_/.test(f));
    expect(files.sort()).toEqual(WIDGET_MIGRATION_ENTRIES.map((e) => `${e.file}.sql`).sort());
  });
});
```

- [ ] **Step 2: Run → FAIL** (module missing).

- [ ] **Step 3: Implement the emitter and generate the files**

```ts
// scripts/regulation-tables/emit-widget-configs-sql.ts
import { writeFileSync } from 'node:fs';
import { REGISTER_CONFIGS_FALLBACK } from '../../src/lib/eval/register-configs';
import { REFERENCE_CONFIGS_FALLBACK } from '../../src/lib/eval/reference-configs';
import { LOOKUP_BINDINGS_FALLBACK } from '../../src/lib/eval/lookup-fill';
export type WidgetEntry = { file: string; standard: string; symbol: string; widget: 'register' | 'reference' | 'lookup_fill'; ui_config: unknown; lookup?: unknown; retires: string; gated?: string };
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const j = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
export const WIDGET_MIGRATION_ENTRIES: readonly WidgetEntry[] = [
  { file: '20260916130000_a138_07_surface_inventory_widget', standard: 'DWA-A-138-1', symbol: 'surface_inventory', widget: 'register', ui_config: REGISTER_CONFIGS_FALLBACK.surface_inventory, retires: 'REGISTER_CONFIGS_FALLBACK.surface_inventory (src/lib/eval/register-configs.ts)' },
  { file: '20260916140000_vsme_b04_pollutant_register_widget', standard: 'VSME', symbol: 'pollutant_register', widget: 'register', ui_config: REGISTER_CONFIGS_FALLBACK.pollutant_register, retires: 'REGISTER_CONFIGS_FALLBACK.pollutant_register + REGISTER_FLAG_KEYS (src/lib/eval/register-configs.ts)' },
  { file: '20260916150000_a138_rainfall_table_ref_reference', standard: 'DWA-A-138-1', symbol: 'rainfall_table_ref', widget: 'reference', ui_config: REFERENCE_CONFIGS_FALLBACK.rainfall_table_ref, retires: 'REFERENCE_CONFIGS_FALLBACK.rainfall_table_ref (src/lib/eval/reference-configs.ts)' },
  { file: '20260916160000_a138_12_ac_as_ratio_limit_lookup_fill', standard: 'DWA-A-138-1', symbol: 'ac_as_ratio_limit', widget: 'lookup_fill', ui_config: null, lookup: LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit, retires: 'LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit (src/lib/eval/lookup-fill.ts)', gated: 'D-2b-3' },
];
export function emitWidgetConfigSql(entries: readonly WidgetEntry[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of entries) {
    const sets = [`widget = ${q(e.widget)}`, `ui_config = ${e.ui_config == null ? 'NULL' : j(e.ui_config)}`];
    if (e.lookup !== undefined) sets.push(`lookup = ${j(e.lookup)}`);
    const lines = [
      '-- Generated by scripts/regulation-tables/emit-widget-configs-sql.ts from the TS fallback config (Plan 2b). Regenerate, do not hand-edit.',
      `-- Retires: ${e.retires} once applied. Apply AFTER 20260911100000_guideline_to_tool_schema.sql.`,
      ...(e.gated ? [`-- GATED: do not apply before sign-off ${e.gated} is RATIFIED (docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-2b.md).`] : []),
      'BEGIN;',
      `UPDATE fields f SET ${sets.join(', ')} FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.symbol = ${q(e.symbol)} AND s.code = ${q(e.standard)} AND f.worksheet_template_id = w.id AND f.widget IS NULL;`,
      'COMMIT;',
    ];
    out.set(e.file, lines.join('\n') + '\n');
  }
  return out;
}
export function emitWidgetRollbackSql(entries: readonly WidgetEntry[]): string {
  const lines = ['-- Generated rollback for the Plan 2b widget migrations (reverse apply order). Restores widget/ui_config/lookup to NULL — none of these symbols carries a Plan-1 selection config.', 'BEGIN;'];
  for (const e of [...entries].reverse()) lines.push(`UPDATE fields f SET widget = NULL, ui_config = NULL, lookup = NULL FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.symbol = ${q(e.symbol)} AND s.code = ${q(e.standard)} AND f.worksheet_template_id = w.id AND f.widget = ${q(e.widget)};`);
  lines.push('COMMIT;');
  return lines.join('\n') + '\n';
}
if (process.argv[1]?.endsWith('emit-widget-configs-sql.ts')) {
  for (const [file, sql] of emitWidgetConfigSql(WIDGET_MIGRATION_ENTRIES)) writeFileSync(`scripts/migrations/${file}.sql`, sql);
  writeFileSync('scripts/rollback-20260916130000-widget-configs.sql', emitWidgetRollbackSql(WIDGET_MIGRATION_ENTRIES));
  console.log('wrote 4 widget migrations + rollback');
}
```
Run: `pnpm tsx scripts/regulation-tables/emit-widget-configs-sql.ts` → `wrote 4 widget migrations + rollback`. (If `pnpm tsx` is broken in this shell as the CLAUDE.md notes for WSL, run `pnpm vitest run --project unit scripts/__tests__/widget-configs-sql-freshness.test.ts` first — it fails naming the missing files — then generate with `node --import tsx scripts/regulation-tables/emit-widget-configs-sql.ts`.)

- [ ] **Step 4: Run → PASS**: `pnpm vitest run --project unit scripts/__tests__/ && pnpm -s typecheck`. Also `git diff --stat` must list exactly the 5 SQL files as new.

- [ ] **Step 5: Commit**

```bash
git add scripts/regulation-tables/emit-widget-configs-sql.ts scripts/__tests__/widget-configs-sql-freshness.test.ts scripts/migrations/2026091613*.sql scripts/migrations/2026091614*.sql scripts/migrations/2026091615*.sql scripts/migrations/2026091616*.sql scripts/rollback-20260916130000-widget-configs.sql
git commit -m "feat(migrations): widget/ui_config/lookup for surface_inventory, pollutant_register, rainfall_table_ref, ac_as_ratio_limit — emitted from TS fallbacks, written-not-applied, freshness-pinned"
```

---

### Task 6: `reference` widget — `rainfall_table_ref` selects a row of another carrier

**Files:**
- Create: `src/lib/eval/reference-configs.ts`, `src/components/worksheet/reference-field.tsx`, `src/components/worksheet/__tests__/reference-field.test.tsx`
- Delete: `src/components/worksheet/rainfall-table-selector.tsx`, `src/components/worksheet/__tests__/rainfall-table-selector.test.tsx` (moved)
- Modify: `src/components/worksheet/widgets.tsx` (replace the Task-3 stub import), the seven test files still carrying `vi.mock('../rainfall-table-selector', …)` (Task 3 Step 5 list)
- Reference: `src/components/worksheet/rainfall-table-selector.tsx:5-46` (labels, badge map, option text `${t.name} · ${badge}`), `worksheet-form.tsx:490-501` (the carrier resolution: `normalizeRainfallCarrier(kostraValue).tables`), `:885-897` (write `{ type: 'text', value: id }`), `src/lib/eval/rainfall-tables.ts:35-49,178` (`RainfallTable`, `normalizeRainfallCarrier`)

**Interfaces:**
- Consumes: Task 1 (`ReferenceUiConfig`, `parseFieldConfig`), Task 3 (`WidgetContext`, `WorksheetFormField`), `normalizeRainfallCarrier`.
- Produces:
  ```ts
  // reference-configs.ts
  export const REFERENCE_CONFIGS_FALLBACK: Readonly<Record<string, ReferenceUiConfig>>; // rainfall_table_ref — retired by 20260916150000
  export const CARRIER_NORMALISERS: Readonly<Record<string, (raw: unknown) => unknown>>; // { r_D_n_table: normalizeRainfallCarrier } — legacy 1-D carriers become { tables } before rows_path is read
  export function resolveReferenceConfig(f: { symbol: string; widget?: string | null; uiConfig?: unknown }): ReferenceUiConfig | null; // DB (widget==='reference') wins; fallback only while widget IS NULL
  export type ReferenceRow = { id: string; label: string; badge: string | null };
  export function resolveReferenceRows(ui: ReferenceUiConfig, carrierRaw: unknown): ReferenceRow[];
  // reference-field.tsx
  export function ReferenceField(props: { field: WorksheetFormField; ctx: WidgetContext }): JSX.Element;
  ```
  Markup: `<label className="block space-y-1"><span class="text-[10px] uppercase …">{ui.title ?? field.labelDe}</span><select aria-label={ui.aria_label ?? ui.title ?? field.labelDe} data-testid="reference-select">` — first option `ui.empty_label ?? '— wählen —'` ONLY when the stored value is null (today `:37`); options `${label}${badge ? ` · ${badge}` : ''}`; write `setField(field.id, { type: field.dataType === 'enum' ? 'enum' : 'text', value: id })`; `disabled={ctx.readOnly}`. When the carrier symbol has no field on this worksheet (not inherited yet) the list is empty and a `<p data-testid="reference-empty">` says `Keine Einträge in „${carrier_symbol}“ — zuerst im vorgelagerten Arbeitsblatt erfassen.` — never a raw text input (`worksheet-form.tsx:880-884` rule).

- [ ] **Step 1: Move + extend the test**

`reference-field.test.tsx` — `// Plan 2b: moved from rainfall-table-selector.test.tsx (component deleted); rendered through ReferenceField with the rainfall_table_ref fallback config.` Render helper builds a `WidgetContext` with `fieldBySymbol` = `{ r_D_n_table: {…json field id 'f-kostra'…} }`, `values` = `{ 'f-kostra': { type: 'json', value: { tables: TABLES } }, 'f-ref': { type: 'text', value: 'k1' } }` (TABLES from the old file `:7-10`), `setField: vi.fn()`, other members as no-ops. Cases:
1. `lists one option per table and selecting one calls setField with its id` — `getByRole('combobox')`, options `/KOSTRA Krefeld/` and `/Lokal 531/`, `fireEvent.change(select, { target: { value: 'l1' } })` ⇒ `setField` called with `('f-ref', { type: 'text', value: 'l1' })`.
2. `never renders an r_D(n) value input` — `queryByRole('spinbutton')` null.
3. `is disabled when readOnly`.
4. NEW `badge labels come from ui_config.badge_labels` — option text `KOSTRA Krefeld · KOSTRA`, `Lokal 531 · DWA-A 531`.
5. NEW `a legacy 1-D r_D_n_table carrier is normalised through CARRIER_NORMALISERS before rows_path` — value `{ rows: [{ D: 10, r_D_n: 100 }] }` (whatever `normalizeRainfallCarrier` accepts as 1-D legacy per `rainfall-tables.test.ts` — copy one legacy fixture from there) yields ≥ 1 option.
6. NEW `resolveReferenceConfig: DB wins, fallback only while widget IS NULL, null otherwise`.

- [ ] **Step 2: Run → FAIL**.

- [ ] **Step 3: Implement**

```ts
// src/lib/eval/reference-configs.ts
import { parseFieldConfig, type ReferenceUiConfig } from './field-config';
import { normalizeRainfallCarrier } from './rainfall-tables';
export const REFERENCE_CONFIGS_FALLBACK: Readonly<Record<string, ReferenceUiConfig>> = {
  // Retired by scripts/migrations/20260916150000_a138_rainfall_table_ref_reference.sql. Strings = rainfall-table-selector.tsx:5-9,24-26,30,37.
  rainfall_table_ref: { title: 'Regenspendentabelle (Quelle für r_D(n))', aria_label: 'Regenspendentabelle wählen', carrier_symbol: 'r_D_n_table', rows_path: 'tables', id_key: 'id', label_key: 'name',
    badge_key: 'source', badge_labels: { 'KOSTRA-DWD-2020': 'KOSTRA', 'DWA-A-531-local': 'DWA-A 531', engineer: 'Ingenieur' }, empty_label: '— Tabelle wählen —' },
};
/** Bespoke carrier shapes that need a normaliser before `rows_path` is read (spec §5.3: the KOSTRA grid stays bespoke). */
export const CARRIER_NORMALISERS: Readonly<Record<string, (raw: unknown) => unknown>> = { r_D_n_table: (raw) => normalizeRainfallCarrier(raw) };
export function resolveReferenceConfig(f: { symbol: string; widget?: string | null; uiConfig?: unknown }): ReferenceUiConfig | null {
  if (f.widget != null) { if (f.widget !== 'reference') return null; try { return parseFieldConfig({ widget: 'reference', uiConfig: f.uiConfig ?? null, lookup: null, visibleWhen: null }).ui as ReferenceUiConfig; } catch { return null; } }
  return REFERENCE_CONFIGS_FALLBACK[f.symbol] ?? null;
}
export type ReferenceRow = { id: string; label: string; badge: string | null };
export function resolveReferenceRows(ui: ReferenceUiConfig, carrierRaw: unknown): ReferenceRow[] {
  const carrier = (CARRIER_NORMALISERS[ui.carrier_symbol] ?? ((x) => x))(carrierRaw);
  const rows = carrier && typeof carrier === 'object' ? (carrier as Record<string, unknown>)[ui.rows_path] : undefined;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((r) => { if (!r || typeof r !== 'object') return []; const o = r as Record<string, unknown>; const id = o[ui.id_key]; if (typeof id !== 'string' || !id) return [];
    const badgeRaw = ui.badge_key ? o[ui.badge_key] : undefined; const badge = badgeRaw == null ? null : (ui.badge_labels?.[String(badgeRaw)] ?? String(badgeRaw));
    return [{ id, label: String(o[ui.label_key] ?? id), badge }]; });
}
```
`reference-field.tsx`: `const ui = resolveReferenceConfig(field); if (!ui) return ctx.renderDynamic(field);` (a `reference` field without a config falls back to today's text input — logged, never silent: render `<p data-testid="reference-unconfigured">Referenz nicht konfiguriert (ui_config fehlt)</p>` above the input); `const carrierField = ctx.fieldBySymbol.get(ui.carrier_symbol); const raw = carrierField ? ctx.values[carrierField.id] : undefined; const rows = resolveReferenceRows(ui, raw?.type === 'json' ? raw.value : undefined); const v = ctx.values[field.id]; const current = (v?.type === 'text' || v?.type === 'enum') && typeof v.value === 'string' ? v.value : null;` then the markup from Interfaces. `widgets.tsx`: import the real `ReferenceField`. `git rm` the selector + its test; remove the seven `vi.mock('../rainfall-table-selector', …)` lines.

The `rainfall_table_ref` field is a normal `text` field in its section today, skipped from the grid and rendered at the bottom; after this task it renders IN ITS SECTION (placement `section` for `reference`) — spec §6 intent; listed in Task 10 deltas. `dynamic-field.tsx:168` comment mentioning `rainfall_table_ref` is updated to "(handled by the reference widget since Plan 2b)".

- [ ] **Step 4: Run** `pnpm test && pnpm -s typecheck` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(widgets): reference renderer (select over another carrier's rows); rainfall_table_ref through it, RainfallTableSelector deleted"`

---

### Task 7: `lookup_fill` widget — read-only table value with source badge, policy-driven override; A138 `ac_as_ratio_limit` as the first instance (display-only, server-owned)

**Files:**
- Create: `src/lib/eval/lookup-fill.ts`, `src/lib/eval/__tests__/lookup-fill.test.ts`, `src/components/worksheet/lookup-fill-field.tsx`, `src/components/worksheet/__tests__/lookup-fill-field.test.tsx`
- Modify: `src/components/worksheet/widgets.tsx` (replace the Task-3 stub import)
- Reference (read first — the server path that owns `ac_as_ratio_limit` today): `src/lib/eval/tab6-loading.ts:62-86` (`tab6Limit`: `lookupRow('DWA-A-138-1', undefined, 'TAB6', { tier, bbz_band })`, band = `bbzThicknessM >= 0.30 ? 'thick' : 'thin'`), `:201-252` (`flaechengruppeToTier` via TAB5), `src/lib/eval/materialize-tab6-loading.ts:67-103` (four outputs incl. `ac_as_ratio_limit`), `src/lib/actions/worksheet.ts:1235-1260, 1338-1357, 1515-1535, 2036-2056, 2277-2297` (five call sites that UPSERT `ac_as_ratio_limit` as `source_type='derived'` on A138-12 saves, producer saves, clears and chained re-fires), `worksheet-form.tsx:51-56` (`LOADING_CHECK_SYMBOLS` ⇒ `computedSymbols` ⇒ read-only), `dynamic-field.tsx:280-293` (`ac-as-ratio-limit-null` label `— (kein Tab.6-Grenzwert)`), `src/components/worksheet/manual-override-pill.tsx:47-60` + `src/lib/actions/overrides.ts:24-29,47` (`recordManualOverride({ projectId, fieldId, equationNumber, reason ≥ 10 chars })` → `audit_log` `action='manual_override'`)

**Ownership decision (settled here, from the code read above):** the `lookup_fill` widget NEVER writes a value that a server materialiser owns. Ownership is declared by the form's existing `computedSymbols` set (`LOADING_CHECK_SYMBOLS` ⇒ `ac_as_ratio_limit` is computed) or `serverComputedSet`: for such a field the widget is in **display mode** — the stored number is shown read-only with the source badge, no client-side write, no override control, and the five `materializeLoadingCheck` sites stay the single producer (`materialize-tab6-loading.ts` untouched). For a field nobody else owns (DIN-1989-1 `e`, FLL-GAR `nahtbreite_min_mm` — Plan 3 instances) the widget is in **fill mode**: on every render where all key symbols resolve to a table row and the stored value is `null` (or the keys changed and no override is recorded), it writes `{ type: 'number', value: table_value }` into the store (the `selectType` semantics of `surface-inventory-editor.tsx:57-62` lifted to a scalar). One producer per value in both modes — no double ownership.

**Sidecar decision (settled here):** spec §4 row 3 says "scalar + sidecar `{table_value, override, reason}`". `table_value` is re-derivable from the table (edition-pinned) and `override` is `stored !== table_value`; persisting either would COPY a table cell into `project_parameters` — the exact duplication the single-source invariant forbids. So the sidecar is realised as: `table_value`/`override` DERIVED at render (`resolveLookupFill`), `reason` PERSISTED through the existing `recordManualOverride` action (`audit_log`, `equationNumber = 'lookup:<TABLE_CODE>'`), exactly like engine-output overrides today. No schema change, no new `FieldValue` variant. Ratification item D-2b-2 (the spec's wording reads as a stored sidecar; if the owner wants it stored, it goes to `project_parameters.value_json` on the same row — a follow-up plan, because `saveWorksheet`/`page.tsx` map one column per `dataType`).

**Interfaces:**
- Consumes: Plan 1 (`LookupBinding`, `parseFieldConfig`), Plan 2a Task 5 (`resolveRegulationTable`, `makeTableLookup`), Task 1 (`LookupFillUiConfig`), Task 2 (`tableLabel`, `fmt`), Task 3 (`WidgetContext`), `recordManualOverride`, `useFocusTrap` not needed (inline textarea, no modal).
- Produces:
  ```ts
  // lookup-fill.ts (pure)
  export const LOOKUP_BINDINGS_FALLBACK: Readonly<Record<string, LookupBinding>>;   // ac_as_ratio_limit — retired by 20260916160000 (GATED D-2b-3)
  export function resolveLookupFillBinding(f: { symbol: string; widget?: string | null; lookup?: unknown }): LookupBinding | null; // DB (widget==='lookup_fill') wins; fallback only while widget IS NULL — NOTE: the fallback is consulted only when f.widget == null AND the symbol is in the fallback; today ac_as_ratio_limit therefore renders via lookup_fill in display mode immediately (no migration needed for the render; the migration just makes it data)
  export type LookupFillState =
    | { kind: 'resolved'; tableValue: number | string | boolean | null; row: RegulationRow; policy: RegulationTable['override_policy']; label: string }
    | { kind: 'keys_missing'; missing: string[]; label: string }
    | { kind: 'no_row'; keys: Value[]; label: string }
    | { kind: 'no_table'; label: string };
  export function resolveLookupFill(binding: LookupBinding, standardCode: string, symbolLookup: (sym: string) => Value | undefined): LookupFillState;
  export function isOverridden(state: LookupFillState, stored: number | null): boolean;   // resolved && stored != null && stored !== tableValue
  // lookup-fill-field.tsx
  export function LookupFillField(props: { field: WorksheetFormField; ctx: WidgetContext }): JSX.Element;
  ```
  Markup/testids: `lookup-fill` (root, `data-mode="display"|"fill"`), `lookup-source` badge — `${label}: ${fmt(tableValue)}` + ` (Grenzwert)` when `role === 'limit'`; `keys_missing` ⇒ `${label}: — (Schlüssel fehlt: a, b)`; `no_row` ⇒ `${label}: — (keine Zeile für [k1, k2])`; `no_table` ⇒ `${label}: — (Tabelle nicht geladen)`; value control: display mode ⇒ read-only formatted number `data-testid="lookup-fill-value"` (`— (kein ${label}-Grenzwert)` when null and role limit — keeps today's `ac-as-ratio-limit-null` wording generic); fill mode not overridden ⇒ the same read-only span; overridden ⇒ `<input type="number" aria-label="${labelDe} (abweichend)">`; policy `locked` ⇒ `data-testid="lookup-locked"` text `nach ${label} festgelegt — keine Abweichung (Dokumentierte Abweichung: eigener Workflow)`; `anhaltswert | kann | messwert` in fill mode ⇒ button `abweichend wählen` / `${label} übernehmen`, textarea `aria-label="Begründung der Abweichung"`, button `Abweichung begründen` (disabled < `ui.reason_min_length ?? 10` chars) → `recordManualOverride({ projectId, fieldId, equationNumber: \`lookup:${table_code}\`, reason })`, confirmation `✓ Abweichung begründet`; `kann` additionally restricts the editable input to the table's `value_columns[value].values` when present (printed alternatives only — spec §7); `messwert` labels the input `${labelDe} (Messwert)` and requires the reason (provenance). Row-level quote: `title={row.verbatim_quote}` on the badge.

- [ ] **Step 1: Write the pure test and the render test**

```ts
// src/lib/eval/__tests__/lookup-fill.test.ts
import { describe, it, expect } from 'vitest';
import { resolveLookupFill, resolveLookupFillBinding, isOverridden, LOOKUP_BINDINGS_FALLBACK } from '../lookup-fill';
const STD = 'DWA-A-138-1';
describe('resolveLookupFill against the A138 seed tables', () => {
  it('resolves TAB6 (tier2, thick) to the seeded max with policy locked', () => {
    const b = { table_code: 'TAB6', role: 'limit' as const, keys: [{ column: 'tier', from_symbol: 'tab6_tier' }, { column: 'bbz_band', from_symbol: 'bbz_band' }], value: 'max' };
    const s = resolveLookupFill(b, STD, (sym) => ({ tab6_tier: 'tier2', bbz_band: 'thick' } as Record<string, string>)[sym]);
    expect(s.kind).toBe('resolved');
    if (s.kind !== 'resolved') return;
    expect(s.policy).toBe('locked'); expect(s.label).toBe('Tab. 6');
    expect(s.tableValue).toBe(50);   // pinned to tab6Limit('tier2', 0.30).max — same accessor family (tab6-loading.ts:79); NOT a typed constant: assert equality with tab6Limit instead of a literal if the seed changes
  });
  it('reports missing keys by symbol and a missing row by key values', () => {
    const b = LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit;
    expect(resolveLookupFill(b, STD, () => undefined)).toMatchObject({ kind: 'keys_missing', missing: ['tab6_tier', 'bbz_band'] });
    expect(resolveLookupFill(b, STD, (s) => (s === 'tab6_tier' ? 'tier9' : 'thin'))).toMatchObject({ kind: 'no_row', keys: ['tier9', 'thin'] });
    expect(resolveLookupFill({ ...b, table_code: 'TAB99' }, STD, () => 'x')).toMatchObject({ kind: 'no_table' });
  });
  it('binding resolution: DB wins, fallback only while widget IS NULL', () => {
    expect(resolveLookupFillBinding({ symbol: 'ac_as_ratio_limit', widget: null })).toEqual(LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit);
    expect(resolveLookupFillBinding({ symbol: 'ac_as_ratio_limit', widget: 'scalar' })).toBeNull();
    expect(resolveLookupFillBinding({ symbol: 'e', widget: 'lookup_fill', lookup: { table_code: 'TAB3', role: 'value', keys: [{ column: 'auffangflaechen_art', from_symbol: 'auffangflaechen_art' }], value: 'e' } })?.table_code).toBe('TAB3');
  });
  it('isOverridden is derived, never stored', () => {
    const s = { kind: 'resolved' as const, tableValue: 0.8, row: {} as never, policy: 'anhaltswert' as const, label: 'Tab. 3' };
    expect(isOverridden(s, 0.8)).toBe(false); expect(isOverridden(s, 0.6)).toBe(true); expect(isOverridden(s, null)).toBe(false);
  });
});
```
Replace the literal `50` with `expect(s.tableValue).toBe((tab6Limit('tier2', 0.3) as { max: number }).max)` importing `tab6Limit` — the pin is accessor parity, not a typed figure (SR-1).

```tsx
// src/components/worksheet/__tests__/lookup-fill-field.test.tsx
// Mocks: vi.mock('@/lib/actions/overrides', () => ({ recordManualOverride: vi.fn(async () => ({ ok: true })) })); next/navigation, next-intl as in pollutant-register.test.tsx.
// Helper makeCtx(values, computedSymbols) builds a WidgetContext with fieldBySymbol from a fields array, setField: vi.fn() that also mutates `values`, standardCode 'DWA-A-138-1', renderDynamic: () => null.
describe('LookupFillField — display mode (server-owned symbol)', () => {
  it('ac_as_ratio_limit (widget NULL ⇒ fallback binding) renders the stored value read-only with the Tab. 6 badge and no override control', () => {
    // fields: ac_as_ratio_limit (number), values: { 'f-lim': { type: 'number', value: 30 } }, computedSymbols: new Set(['ac_as_ratio_limit'])
    expect(getByTestId('lookup-fill').dataset.mode).toBe('display');
    expect(getByTestId('lookup-fill-value')).toHaveTextContent('30');
    expect(getByTestId('lookup-source')).toHaveTextContent('Tab. 6: — (Schlüssel fehlt: tab6_tier, bbz_band) (Grenzwert)');   // keys are not fields today — sign-off D-2b-3
    expect(queryByRole('button', { name: 'abweichend wählen' })).toBeNull();
    expect(setField).not.toHaveBeenCalled();
  });
  it('null stored value + role limit ⇒ "— (kein Tab. 6-Grenzwert)"', () => { /* value null ⇒ getByTestId('lookup-fill-value') text '— (kein Tab. 6-Grenzwert)' */ });
});
describe('LookupFillField — fill mode (client-owned scalar, DB binding, policy from the table)', () => {
  // A synthetic binding against TAB9 (policy anhaltswert, key surface_type, value cm) on a number field `c_test` with widget 'lookup_fill' and lookup in the field row; sibling enum field `surface_type` = 'schwarzdecke_asphalt'.
  it('fills the store from the table when the stored value is null', () => { /* expect(setField).toHaveBeenCalledWith('f-c', { type: 'number', value: 0.9 }); badge 'Tab. 9: 0,9' */ });
  it('anhaltswert: "abweichend wählen" exposes the input + reason; "Abweichung begründen" records the reason via recordManualOverride with equationNumber lookup:TAB9', async () => {
    // click 'abweichend wählen' → type 0.75 into getByLabelText('c_test (abweichend)') → setField called with 0.75 → type 'Örtliche Messung 2026' into getByLabelText('Begründung der Abweichung') → click 'Abweichung begründen'
    // expect(recordManualOverride).toHaveBeenCalledWith({ projectId: 'p', fieldId: 'f-c', equationNumber: 'lookup:TAB9', reason: 'Örtliche Messung 2026' }); expect(getByText('✓ Abweichung begründet'))
    // the badge still reads 'Tab. 9: 0,9' (original visible)
  });
  it('locked policy (TAB6 binding on a client-owned field) renders lookup-locked and no button', () => { /* getByTestId('lookup-locked') has text /keine Abweichung/ */ });
  it('"Tab. 9 übernehmen" writes the table value back', () => { /* stored 0.75 ⇒ overridden ⇒ button present ⇒ click ⇒ setField('f-c', { type: 'number', value: 0.9 }) */ });
});
```

- [ ] **Step 2: Run → FAIL**.

- [ ] **Step 3: Implement `lookup-fill.ts`**

```ts
import { parseFieldConfig, type LookupBinding } from './field-config';
import { resolveRegulationTable, makeTableLookup } from './regulation-tables-fallback';
import type { RegulationRow, RegulationTable } from './regulation-tables';
import type { Value } from '@/lib/expr';
export function tableLabel(code: string): string { const m = /^TAB(\d+[A-Za-z]?)$/.exec(code); return m ? `Tab. ${m[1]}` : code; }   // move here from register-editor.tsx and re-export there
/** Retired by scripts/migrations/20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql (GATED D-2b-3: `tab6_tier` / `bbz_band` are not fields
 *  yet — until they exist the widget renders in display mode with a keys_missing badge and the server materialiser stays the producer). */
export const LOOKUP_BINDINGS_FALLBACK: Readonly<Record<string, LookupBinding>> = {
  ac_as_ratio_limit: { table_code: 'TAB6', role: 'limit', keys: [{ column: 'tier', from_symbol: 'tab6_tier' }, { column: 'bbz_band', from_symbol: 'bbz_band' }], value: 'max' },
};
export function resolveLookupFillBinding(f: { symbol: string; widget?: string | null; lookup?: unknown }): LookupBinding | null {
  if (f.widget != null) { if (f.widget !== 'lookup_fill') return null; try { return parseFieldConfig({ widget: 'lookup_fill', uiConfig: null, lookup: f.lookup ?? null, visibleWhen: null }).lookup; } catch { return null; } }
  return LOOKUP_BINDINGS_FALLBACK[f.symbol] ?? null;
}
export type LookupFillState = /* as in Interfaces */;
export function resolveLookupFill(binding: LookupBinding, standardCode: string, symbolLookup: (sym: string) => Value | undefined): LookupFillState {
  const label = tableLabel(binding.table_code);
  const t = resolveRegulationTable(standardCode, binding.table_code); if (!t) return { kind: 'no_table', label };
  const missing = binding.keys.filter((k) => { const v = symbolLookup(k.from_symbol); return v === undefined || v === null || v === ''; }).map((k) => k.from_symbol);
  if (missing.length) return { kind: 'keys_missing', missing, label };
  const keys = binding.keys.map((k) => symbolLookup(k.from_symbol) as Value);
  const rowValues = makeTableLookup(standardCode)(binding.table_code, keys); if (!rowValues) return { kind: 'no_row', keys, label };
  const rk = keys.map(String).join('|'); const row = t.rows.find((r) => r.row_key === rk)!;
  return { kind: 'resolved', tableValue: (rowValues[binding.value] ?? null) as number | string | boolean | null, row, policy: t.override_policy, label };
}
export function isOverridden(state: LookupFillState, stored: number | null): boolean { return state.kind === 'resolved' && stored != null && stored !== state.tableValue; }
```
(`makeTableLookup` matches keys in `key_columns` order — 2a Task 5 — so `binding.keys` must be listed in the table's `key_columns` order; the importer already validates `lookup` shape; add to `scripts/_pass3c-validate.ts` a check "lookup.keys[].column equals the table's key_columns in order when the table is registered" — one function `validateLookupKeysOrder(binding, table)` + one test line in `pass3c-validate-field-config.test.ts`; skip silently when the table is not registered at import time.)

`lookup-fill-field.tsx`: `const binding = resolveLookupFillBinding(field); if (!binding) return ctx.renderDynamic(field);` `const state = resolveLookupFill(binding, ctx.standardCode, ctx.symbolLookup); const v = ctx.values[field.id]; const stored = v?.type === 'number' ? v.value : null; const owned = ctx.computedSymbols.has(field.symbol) || ctx.serverComputedSet.has(field.id); const mode = owned ? 'display' : 'fill';` — fill mode `useEffect`: `if (mode === 'fill' && !ctx.readOnly && state.kind === 'resolved' && stored == null && typeof state.tableValue === 'number') ctx.setField(field.id, { type: 'number', value: state.tableValue });` (runs once per key change because the dependency array is `[state.kind, state.kind === 'resolved' ? state.row.row_key : null, stored]`). Render the label block like `DynamicField` (labelDe, unit, clause chip is NOT reproduced — keep it minimal: label + description), then the badge/value/override controls from Interfaces. `widgets.tsx`: import the real `LookupFillField`.

Guard for the existing pins: `a138-12-loading-readonly.test.tsx` renders `DynamicField` directly with `widget` undefined — unaffected. The FORM path for A138-12 now renders `ac_as_ratio_limit` via `WIDGETS.lookup_fill` (fallback binding) — `render-computed-symbols-isComputed.test.tsx` and friends: grep them for `ac_as_ratio_limit`; if one asserts the `ac-as-ratio-limit-null` testid through `WorksheetForm`, map it to `lookup-fill-value` with a `// Plan 2b:` note.

- [ ] **Step 4: Run** `pnpm test && pnpm -s typecheck` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(widgets): lookup_fill renderer (source badge, policy-driven override with audited reason, display mode for server-owned symbols); A138 ac_as_ratio_limit as first instance"`

---

### Task 8: Form close-out — no symbol-keyed carrier lookup left, `page.tsx` cast closed, dead code removed

**Files:**
- Modify: `src/components/worksheet/worksheet-form.tsx` (whole-file audit), `src/app/[locale]/(app)/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]/page.tsx:341-367`, `src/components/worksheet/dynamic-field.tsx:98-107` (comment), `src/lib/eval/surface-inventory.ts` (header comment: editor no longer imports it), `src/lib/eval/selection-fields.ts:653-659` (`registerRowFilled` — delete if no caller remains)
- Test: `src/components/worksheet/__tests__/worksheet-form-no-symbol-wiring.test.ts` (create — a source-level guard)

**Interfaces:**
- Consumes: Tasks 3–7.
- Produces: `worksheet-form.tsx` contains no `fields.find((f) => f.symbol === '…')` for a carrier and no `f.symbol === '<carrier>'` grid exclusion; `page.tsx` passes `fields={…}` typed as `WorksheetFormField[]` without `as never`.

- [ ] **Step 1: Write the guard test**

```ts
// src/components/worksheet/__tests__/worksheet-form-no-symbol-wiring.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const src = readFileSync(join(__dirname, '..', 'worksheet-form.tsx'), 'utf8');
const page = readFileSync(join(__dirname, '..', '..', '..', 'app', '[locale]', '(app)', 'projects', '[id]', 'standards', '[standardCode]', 'worksheets', '[worksheetCode]', 'page.tsx'), 'utf8');
describe('Plan 2b: one renderer path', () => {
  it('worksheet-form.tsx has no symbol-keyed carrier wiring left', () => {
    for (const sym of ['surface_inventory', 'rainfall_table_ref', 'r_D_n_table', 'risk_register', 'risk_mitigation_plan', 'pollutant_register', 'POLLUTANT_REGISTER_SYMBOL', 'SELECTION_CONFIGS'])
      expect(src.includes(`'${sym}'`) || src.includes(sym + ')'), sym).toBe(false);
    expect(src).not.toMatch(/fields\.find\(\(f\) => f\.symbol ===/);
    expect(src).toMatch(/WIDGETS\[effectiveWidget\(f\)\]\(f, widgetCtx\)/);
  });
  it('the ASM method/provenance symbols stay (they feed DynamicField props, not carrier dispatch)', () => {
    expect(src).toMatch(/'a_s_m_determination_method'/);   // asmMethod for DynamicField (worksheet-form.tsx:355) — unchanged
  });
  it('page.tsx no longer casts the field list to never', () => {
    expect(page).not.toMatch(/\}\) as never\}\s*\n\s*equations=/);
    expect(page).toMatch(/WorksheetFormField/);
  });
});
```

- [ ] **Step 2: Run → FAIL** (the ASM lines pass already; `SELECTION_CONFIGS`/`'surface_inventory'` may still appear in comments — the test checks quoted literals and calls only; clean the comments too).

- [ ] **Step 3: Implement**

1. Read `worksheet-form.tsx` top to bottom; delete every leftover of the symbol-keyed era: the `LOADING_CHECK_SYMBOLS` block stays (it is a `computedSymbols` contribution, not dispatch); `BASIN_GOVERNING_SYMBOLS`, `PHASE4_READONLY_SYMBOLS` stay; comments at `:485-489`, `:516-526`, `:553-555`, `:584-596`, `:870-884` go.
2. `page.tsx:341-367`: `import type { WorksheetFormField } from '@/components/worksheet/worksheet-form';` and `fields={mergedFields.map((f): WorksheetFormField => ({ …same members…, inheritedFromWorksheet: f.inheritedFromWorksheet ?? undefined }))}` — delete the `// TODO(guideline-to-tool)` line and `as never`. If tsc complains about `enumValues` (`label_de: string | null` vs the DynamicField type) or `dataType`, narrow with the SAME casts already present at `:348-351` (they are per-member, not `never`).
3. `selection-fields.ts:653-659` `registerRowFilled`: `grep -rn registerRowFilled src` — if only the deleted `StructuredRegisterEditor` used it, delete it and its test lines (`selection-fields.test.ts` — extend-only rule: leave the test if it tests the function; then keep the function. Decide by grep, record in the report).
4. `dynamic-field.tsx:104-107` comment: "carrier/register symbols … worksheet-form dispatches them" → "register widgets are dispatched by WIDGETS (Plan 2b); a json field reaches this branch only when no register config resolves".

- [ ] **Step 4: Run** `pnpm test && pnpm -s typecheck && pnpm -s lint` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "refactor(form): remove the last symbol-keyed carrier wiring; page.tsx field list typed as WorksheetFormField (no as-never)"`

---

### Task 9 (LAST; optional if over budget — skip and record in Task 10 if the 2a amendment below is not merged): Risk register → `register` with a `grid` column + derived M-Wert / S-Abw

**Blocking prerequisite (Plan 2a amendment, requested in the controller reply):** Plan 2a's function set has no per-row grid reducers. The printed Tab. A.1 needs, per register ROW, the mean and sample stdev over the three assessors of (a) probability, (b) impact, (c) the per-assessor PRODUCT `probability * impact` (`risk-register.ts:371-378` — mean of the products, never the product of the means). Required additions to `src/lib/expr/functions.ts` / `evaluate.ts`: `grid_mean(gridCell, expr)`, `grid_stdev(gridCell, expr)` (sample, n−1, ≥ 2 values else error), `grid_count(gridCell[, cond])`, where `gridCell` is a row value shaped `Record<rowKey, Record<colKey, Value>>` and `expr` is evaluated once per GRID ROW with the grid row's columns as symbols (shadowing the register row, which shadows the worksheet). Without them the derived columns below cannot be expressed and the risk register stays bespoke (spec §5.3 allows exactly that).

**Files:**
- Modify: `src/components/worksheet/register-editor.tsx` (`GridCell` real implementation; `catalog` section), `src/lib/eval/register-configs.ts` (`RISK_REGISTER` fallback config), `src/lib/eval/register-rows.ts` (2a file: `coerce` for `grid` = `Record<string, Record<string, number|string|boolean|null>>` — additive branch, one test line in `register-rows.test.ts`), `src/components/worksheet/widgets.tsx` (`BESPOKE_BY_SYMBOL` loses `risk_register`)
- Delete: `src/components/worksheet/risk-register-editor.tsx`, `__tests__/risk-register-editor.test.tsx`, `__tests__/risk-register-editor.ssr.test.tsx` (moved to `register-editor-m820-risk.test.tsx`)
- Keep untouched: `src/lib/eval/risk-register.ts` + `src/lib/eval/__tests__/risk-register.test.ts` (17 cases — the guideline data module and stats functions stay as the engine-side parity reference; `RISK_GROUPS`, anchors, `sampleStats` are imported by the config and by the parity test)
- Create: `scripts/migrations/20260916170000_m820_risk_register_widget.sql` via `WIDGET_MIGRATION_ENTRIES` (Task 5 emitter; entry `standard: 'DWA-M-820-1', symbol: 'risk_register'` — NOTE prod has a second `risk_register` on DWA-M-820-2 (`20260801290000_m820_2_10_risk_register.sql`); add a second entry for `'DWA-M-820-2'` after reading that migration's field row)

**Interfaces:**
- Consumes: the 2a amendment (`grid_mean`, `grid_stdev`, `grid_count`), Task 1 (`grid` column, `catalog`), Task 2.
- Produces: `REGISTER_CONFIGS_FALLBACK.risk_register`:
  ```ts
  {
    title: 'Risikoregister — Katalog wählen, je Risiko durch Bauherr/Planer/Betrieb bewerten', subtitle: 'Anhang A · Tab. A.1 · Risiko = Eintretenswahrscheinlichkeit × Schaden · M-Wert / S-Abweichung je Dimension', placement: 'bottom',
    add_label: '+ Projektspezifisches Risiko',
    catalog: { group_column: 'group', item_column: 'risk', groups: RISK_GROUPS.map((g) => ({ label: g.group, items: [...g.examples] })), add_custom_label: '+ Projektspezifisches Risiko' },
    columns: [
      { key: 'group', type: 'enum', label: 'Risikogruppe', options: [...RISK_GROUP_LABELS], required: true },
      { key: 'risk', type: 'text', label: 'Risiko (Kurzname)', required: true, placeholder: 'Risiko benennen' },
      { key: 'description', type: 'text', label: 'Beschreibung (optional)', placeholder: 'Risiko projektspezifisch beschreiben' },
      { key: 'ratings', type: 'grid', label: 'Bewertung (0–10)', grid: { rows: ASSESSORS.map((a) => ({ key: a, label: ASSESSOR_LABELS[a] })), cols: [
          { key: 'probability', label: 'Eintretenswahrscheinlichkeit', min: PROBABILITY_MIN, max: PROBABILITY_MAX, step: 1 },
          { key: 'impact', label: 'Schaden', min: IMPACT_MIN, max: IMPACT_MAX, step: 1 } ] } },
      { key: 'p_mean', type: 'derived', label: 'M-Wert W', expr: 'grid_mean(ratings, probability)' },
      { key: 'p_sdev', type: 'derived', label: 'S-Abw. W', expr: 'grid_stdev(ratings, probability)' },
      { key: 'i_mean', type: 'derived', label: 'M-Wert S', expr: 'grid_mean(ratings, impact)' },
      { key: 'i_sdev', type: 'derived', label: 'S-Abw. S', expr: 'grid_stdev(ratings, impact)' },
      { key: 'r_mean', type: 'derived', label: 'Risiko M-Wert', expr: 'grid_mean(ratings, probability * impact)' },
      { key: 'r_sdev', type: 'derived', label: 'Risiko S-Abw.', expr: 'grid_stdev(ratings, probability * impact)' },
      { key: 'migratedFromSingle', type: 'boolean', label: 'Aus Einzelbewertung übernommen' },
    ],
    footer: ['risk_count', 'risk_max_mean', 'risk_mean_of_means', 'risk_max_sdev'],   // four equation rows on M820-06 (fallback equations in FALLBACK_REGISTER_EQUATIONS['M820-06'] until a migration adds them):
    // risk_count = count_rows(risk_register); risk_max_mean = max_rows(risk_register, r_mean); risk_mean_of_means = mean_rows(risk_register, r_mean); risk_max_sdev = max_rows(risk_register, r_sdev)
  }
  ```
  `GridCell`: a `<table>` with one row per `grid.rows` and one `<select aria-label={`${col.label} ${row.label}`}>` per `grid.cols` (integer options `min..max` step `step`; `options` when given) — aria-labels `Eintretenswahrscheinlichkeit Bauherr`, `Schaden Planer` … exactly the strings the moved test uses (`risk-register-editor.test.tsx:85-90`); writes `{ ...cells, [rowKey]: { ...cells[rowKey], [colKey]: n } }` and sets `migratedFromSingle` false on the same row (editor rule `risk-register-editor.tsx:92-104`). `catalog` block: accordion per group (`<button aria-expanded>` with the group label and `${chosen}/${items.length}`), a checkbox per item that adds `{ group, risk }` rows / removes the matching row (`toggleCatalog`, `:109-117`), the custom-add button, the printed note `Der Katalog ist ein Beispiel und in der Praxis um projektspezifische Risiken zu ergänzen (Tab. A.1, S. 44).`; rows whose `(group, risk)` is a catalog item render the name read-only, others render the `group` select + `risk` input (`:248-278`). Rows are ordered by `r_mean` desc (`:136-143`) when the config has a derived column named in `ui_config.sort_by` (add `sort_by?: { key: string; dir: 'asc' | 'desc' }` to `registerUi` — additive). The divergence note (`:396-401`) renders when any `*_sdev > 0`; the `migratedFromSingle` warning (`:302-307`) when that cell is true. Legacy single-value rows: `legacy_map` cannot express "replicate to three assessors"; add a `CARRIER_NORMALISERS['risk_register'] = normalizeRiskCarrier` hook (Task 6 registry, applied by `RegisterEditor` before `prepareRegisterRows` when present) so `risk-register.ts:271-313` remains the single legacy parser.

- [ ] **Step 1: Move the 8 + 2 render tests** into `register-editor-m820-risk.test.tsx` (`// Plan 2b: RiskRegisterEditor deleted; generic RegisterEditor + grid column`); assertions unchanged except `screen.getAllByText('8,3')` etc. now find the derived cells (`derived-p_mean` → `8,3`, `derived-p_sdev` → `0,6`, `derived-r_mean` → `16,7`, `derived-r_sdev` → `1,2` — the `fmt` formatter must use ONE decimal for these columns: add `decimals?: number` to `registerColumn` (additive) and set `decimals: 1` on the six derived columns; `fmt` honours it). The SSR pair renders `RegisterEditor` through `renderToString`.
- [ ] **Step 2: Run → FAIL**. **Step 3: Implement** as specified. **Step 4:** `pnpm test && pnpm -s typecheck` → PASS (the 17 `risk-register.test.ts` cases untouched). Regenerate the widget migrations (Task 5 emitter) and the freshness pin's expected file list. **Step 5: Commit** — `git commit -m "feat(editor): risk register as register + grid column with grid_mean/grid_stdev derived cells; bespoke editor deleted (25 pins kept)"`

---

### Task 10: Close-out — full verification, visual-delta list, playbook, sign-off sheet, ledger

**Files:**
- Modify: `docs/superpowers/guideline-to-tool-playbook.md` ("What Plan 2a added" → add "What Plan 2b added (2026-09-16)"; Step 3 of the recipe now says the register renders generically; apply order extended)
- Create: `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-2b.md`

- [ ] **Step 1: Whole-branch verification**

```bash
pnpm test && pnpm -s typecheck && pnpm -s lint
pnpm vitest run --project unit src/components/worksheet src/lib/eval scripts/__tests__   # counts per folder for the report
git status --short   # must be empty
git log --oneline <2a-close-out-sha>..HEAD
grep -rn "surface-inventory-editor\|pollutant-register-editor\|structured-register-editor\|rainfall-table-selector" src tests   # must print nothing
```
Record raw counts (tests, files, duration) — R-1: the command, not the claim. If a browser pass is possible (`pnpm dev` against a dev DB per `reference_wizard_local_dev`), open A138-07, A138-13 (rainfall ref), VSME-B04.100 and one M820 register and paste what rendered; if not possible, write "render spot-check NOT run (no dev DB in session)" — never imply it was.

- [ ] **Step 2: Visual-delta list (goes into the playbook AND the sign-off sheet header)**

1. Register section headings now equal `ui_config.title` — A138-07 bottom heading reads `Flächenverzeichnis` (was `Flächenverzeichnis (Tab. 9 — C_i für Gl. 2 und C_s für Gl. 10)`; the editor's own subtitle carries the Tab. 9 text). 2. TAB9 optgroup for group 2 reads the seed's `Teildurchlässige / schwach ableitende Flächen` (was `Teildurchlässige Flächen`). 3. The `kind` badge is its own column (was under the type select). 4. Bottom-strip order is `orderIndex` (was: consumer table, rainfall tables, rainfall ref, surface, risk, mitigation, selection registers, pollutant). 5. `rainfall_table_ref` renders inside its section (was a bottom section). 6. DB-configured `select_many`/`register` fields render inside their section (TS-fallback ones stay at the bottom). 7. A138-07's six outputs carry the register hint. 8. `C_i`/`C_s` override inputs no longer carry HTML `min=0 max=1` (no column min/max in the config — not a validation change, the attributes were never enforced). 9. Footer of every register shows `n Einträge · n/m vollständig`.

- [ ] **Step 3: Playbook**

Add "What Plan 2b added (2026-09-16)": the `WIDGETS` registry and `effectiveWidget`; how to encode a register (columns, `flags`, `footer` = the symbols of the equation rows whose `input_symbols` name the register, `placement`), a reference (`carrier_symbol/rows_path/id_key/label_key`), a lookup_fill (binding + the ownership rule: a symbol in `computedSymbols`/server-computed is display-only; otherwise the widget fills it; override = derived, reason via `recordManualOverride`); the bespoke escape hatch `ui_config.editor` (`rainfall_tables | risk_register | risk_mitigation_plan`); Step 3 of the recipe: "write one render test with a 2-row fixture through `RegisterEditor`". Apply order: after 2a's steps 4–6 add 7 `20260916130000_a138_07_surface_inventory_widget.sql` → 8 `20260916140000_vsme_b04_pollutant_register_widget.sql` → 9 `20260916150000_a138_rainfall_table_ref_reference.sql` → 10 `20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql` (GATED D-2b-3) [→ 11 `20260916170000_m820_risk_register_widget.sql` if Task 9 ran]; rollback = `scripts/rollback-20260916130000-widget-configs.sql` (all at once, reverse order inside) before 2a's rollbacks. Post-apply cleanup list: delete `REGISTER_CONFIGS_FALLBACK.surface_inventory/.pollutant_register`, `REGISTER_FLAG_KEYS`, `REFERENCE_CONFIGS_FALLBACK`, `LOOKUP_BINDINGS_FALLBACK`, `BESPOKE_BY_SYMBOL` entries whose rows now carry `ui_config.editor`, and the `SELECTION_CONFIGS`-register branch of `resolveRegisterConfig` once every `20260911120000_selection_configs_*.sql` is applied.

- [ ] **Step 4: Sign-off sheet** `SIGN-OFF-plan-2b.md` — one block per decision, evidence, `☐ RATIFIED ☐ REJECTED ☐ DEFER`:
  - D-2b-1 Register title/heading strings come from the config (visual deltas 1–9 above).
  - D-2b-2 `lookup_fill` sidecar realised as derived `{table_value, override}` + `audit_log` reason (spec §4 wording "sidecar {table_value, override, reason}" read as semantics, not storage); alternative = `project_parameters.value_json` on the same row (needs a `FieldValue` variant + save/page/snapshot changes).
  - D-2b-3 `ac_as_ratio_limit` binding keys: `tab6_tier` / `bbz_band` do not exist as fields; options (a) two derived scalar fields + two equation rows (`tab6_tier = lookup('TAB5', flaechengruppe, 'tier')`, `bbz_band = if(bbz_thickness >= 0.30, 'thick', 'thin')` — the `0.30` is `THICK_BAND_M` from `tab6-loading.ts:45`, quote §5.2.3.2 Tab. 6 needed), (b) a `from_expr` key on `LookupBinding` (zod extension), (c) leave the widget in display mode with the keys_missing badge and the server materialiser as producer (current state). Migration `20260916160000` is written and GATED on this ruling.
  - D-2b-4 `reference` ui_config is REQUIRED (importer rejects a `reference` row without it) — no prod row affected (raw query output pasted).
  - D-2b-5 Legacy `sum_column` footer stays a display-only client sum for the TS selection registers (`change_orders` Volumen pin) — retire per register when an equation row exists.
  - D-2b-6 Bottom-strip order by `orderIndex` and in-section rendering for DB-configured selection widgets.
  - D-2b-7 (only if Task 9 ran) DWA-M-820-2 `risk_register` second instance migrated with the same config; `sort_by` r_mean desc.

- [ ] **Step 5: Commit** — `git commit -m "docs(guideline-to-tool): Plan 2b close-out — playbook widget recipe + apply order, visual deltas, sign-off sheet"`

---

## Self-review (run by the plan author before execution)

**Spec coverage (§4, §5.3, §6, §8 phases 3–4):** shape 4 `register` with typed columns, per-row lookup cells, add/remove, footer with derived outputs (footer = engine states) → T2; row-type discriminator + per-column `visible_when` (row scope) → T2; shape 6 `reference` → T6; shape 3 `lookup_fill` with source badge, policy-driven "abweichend", original stays visible, role `value | limit` → T7 (+ §7 policies: `locked` no toggle, `anhaltswert` reason, `kann` printed alternatives only, `messwert` provenance); shape 5 `grid` as a register column + multi-party assessment pattern → T9 (gated on the 2a amendment); §6 "one renderer path": `renderField(f)` dispatches on `f.widget ?? inferWidget(f)`, symbol lookups and grid exclusions removed, `ui_config.placement` with A138 pinned `bottom`, registers inherit as read-only tables (`ReadOnlyRegisterTable`), `reference` resolves against inherited carriers → T3, T6, T8; §8 phase 3 pins: every `surface-inventory-editor` assertion + PLT-HS-01 Gewächshausdach case → T3 (`register-editor-a138-07.test.tsx`), B04 tests → T4, `rainfall_table_ref` → T6; phase 4 `ac_as_ratio_limit` → TAB6 lookup role limit → T7 (display mode; data migration gated D-2b-3); risk register → register + grid column with its 25 tests → T9; §5.3 bespoke list (KOSTRA grid, basin, ASM, VSME CO₂) untouched — the KOSTRA editor and the mitigation plan dispatch through `ui_config.editor` / `BESPOKE_BY_SYMBOL`; §11 "generic RegisterEditor with the A138 fixture reproduces every current surface-inventory-editor assertion" → T3 Step 1. Deploy-before-migration: T5 fallbacks retire on apply; `widget IS NULL` path pinned by `widgets-dispatch.test.tsx` and `dynamic-field.test.tsx`.

**Placeholder scan:** every task carries runnable test code and implementation code or an exact port instruction with file:line ranges; the only deliberately underspecified item is Task 9's `GridCell`/`catalog` markup, which is gated on a Plan 2a amendment and marked optional; T7's fill-mode render tests are given as comment-specified cases with the exact aria-labels, testids and expected calls — the executor writes the bodies from the spec lines above them. No TBD/TODO remains.

**Type consistency:** `RegisterUiConfig` (T1) is the single config type consumed by `RegisterEditor` (T2), `resolveRegisterConfig` (T1), `WIDGETS.register` and `widgetPlacement` (T3), `carrierSourceState` (2a T9, via `cfg.columns`), the emitter (T5) and the freshness pin (T5 round-trips it through `parseFieldConfig`). `FooterState.state` is 2a's `EvalState` (T2 ↔ T3 `footerStatesFor`). `WidgetContext` (T3) is what `ReferenceField` (T6) and `LookupFillField` (T7) receive; both fall back to `ctx.renderDynamic(f)` when unconfigured, so the `DynamicField` path is never bypassed for unmigrated fields. `registerFlagKeys(symbol, ui)` (T1) is called with the same resolved config by the editor (T2) and by every 2a engine caller (T1 Step 4). `WorksheetFormField` (T3) is the type `page.tsx` builds (T8).
