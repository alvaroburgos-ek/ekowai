/**
 * Plan 3 (encode the 29 standards) — the DATA shapes every per-standard
 * module exports (`src/lib/eval/field-configs/<slug>.ts`,
 * `src/lib/eval/equations/<slug>.ts`). The emitters under
 * `scripts/regulation-tables/` turn them into WRITTEN-NOT-APPLIED migrations;
 * nothing here is read at runtime by the app.
 *
 * The types are the Plan-3 conventions section verbatim, with the Plan 2a/2b
 * closures reflected (controller amendment B, 2026-09-17):
 *   - `ui_config` is the zod contract of `field-config.ts` — `RegisterUiConfig`
 *     already carries `flags` (2b Task 1; gap G-8 closed), `catalog`, `grid`
 *     columns, `override`, `footer`; no TS-side workaround map exists any more.
 *   - the equation function set is `src/lib/expr/functions.ts` — math incl.
 *     `round`/`ceil`/`floor` (G-11 closed), row `sum_rows count_rows max_rows
 *     min_rows mean_rows stdev_rows median_rows percentile_rows last_rows`
 *     (G-3 closed) with a trailing condition argument on every aggregate
 *     (G-16 closed), logic `if lookup contains cell flag`. A formula naming
 *     anything else is refused by `emitEquationsSql`.
 *   - `lookup_fill` (amendment C): the field's `data_type` must be
 *     `number | text | enum` (importer rule, 2b fix wave) — enforced on
 *     `create` by the emitter; a re-keyed existing field is checked by the
 *     per-standard test against prod's `data_type`. Key strings in the seeded
 *     table must equal the driving `select_one`'s enum `value` strings
 *     exactly (G-A3) — pinned per standard in `field-configs-<slug>.test.ts`.
 */
import type { LookupBinding, RegisterUiConfig, SelectManyUiConfig, Widget } from '../field-config';

export type FieldConfigEnumValue = { value: string; label_de: string; order_index: number; label_en?: string | null };

export type FieldConfigEntry = {
  standard: string; worksheet: string; symbol: string;
  widget: Widget;                                  // from field-config.ts WIDGETS
  ui_config?: RegisterUiConfig | SelectManyUiConfig | Record<string, unknown> | null;
  lookup?: LookupBinding | null;                  // lookup_fill only
  visible_when?: string | null;
  enum_values?: FieldConfigEnumValue[] | 'keep_prod';  // 'keep_prod' = D-1
  verification_quote: string;                      // the §7 cue sentence, lifted, with transcript line
  create?: { section_code: string | null; label_de: string; data_type: 'json' | 'enum' | 'number' | 'text' | 'boolean'; unit?: string | null; clause_reference: string; description: string /* starts 'Plan 3:' */ };
  // `create` = ADDITIVE new field (register carrier, missing select_one driver, lookup_fill limit target). Emitted as INSERT … WHERE NOT EXISTS;
  // is_required=false, verification_status='imported_unverified', order_index = max(order_index)+1 of the worksheet. Retiring the scalars it replaces is STAGED.
};

export type SectionVisibilityEntry = { standard: string; worksheet: string; section_code: string; visible_when: string; verification_quote: string };

export type EquationEntry = {
  standard: string; worksheet: string; equation_number: string;  // printed "Gl. 4" | "Eq. (2)" | "<WS>-D<n>" for text-only derivations
  formula: string;                                                // 'out = expr' in the Plan-2a language
  input_symbols: string[]; output_symbol: string; output_unit?: string | null;
  clause_reference: string; description: string;                  // description starts with 'Plan 3:' (rollback selector)
  verification_quote: string | null;                              // printed formula/sentence lifted, or null ⇒ sign-off entry
};

// ---- prior snapshot (`<slug>.prior.json`, written by scripts/regulation-tables/build-prior-snapshot.mjs) ----

/** One captured `fields` row (active fields of the standard), keyed `"<worksheet> <symbol>"`. */
export type PriorFieldRow = {
  enum_values: unknown; widget: string | null; ui_config: unknown; lookup: unknown; visible_when: string | null;
  consumer_worksheets: string[] | null;
  /** Optional in the capture; when present, the amendment-C data_type rule is checked for lookup_fill entries. */
  data_type?: string;
  /** `worksheet_sections.code` of the field's own section (null when the section has no code or the field is orphaned). */
  section_code?: string | null;
  /** `fields.section_id IS NULL` — an orphan field is never hidden by a section rule. */
  section_id_is_null?: boolean;
  /**
   * Codes of the field's section ancestors root → own section (a null-coded section in the chain is `null`;
   * `[]` for an orphan). The section-level producer guard walks this chain because the runtime hides every
   * descendant of a hidden section (`src/lib/compliance/visibility.ts`).
   */
  section_path?: Array<string | null>;
};
/** Field-row key: `${worksheet} ${symbol}` (always contains a space, so it never collides with `sections` / `_meta`). */
export type PriorFieldKey = `${string} ${string}`;
/** One captured coded section, keyed `"<worksheet> <section_code>"`. */
export type PriorSectionRow = {
  visible_when: string | null;
  /** Code of the parent section; null at root or when the parent has no code. */
  parent_code?: string | null;
};
export type PriorSnapshot = { [key: PriorFieldKey]: PriorFieldRow }
  & { sections?: Record<string, PriorSectionRow>; _meta?: Record<string, unknown> };

/** What one `src/lib/eval/field-configs/<slug>.ts` module exports. */
export type FieldConfigModule = { FIELD_CONFIGS: FieldConfigEntry[]; SECTION_VISIBILITY: SectionVisibilityEntry[] };
/** What one `src/lib/eval/equations/<slug>.ts` module exports. */
export type EquationModule = { EQUATIONS: EquationEntry[] };
