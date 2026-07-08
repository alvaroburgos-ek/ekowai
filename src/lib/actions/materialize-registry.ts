/**
 * Materialize registry — producer-side reactive recompute.
 *
 * GENERAL MECHANISM (framework):
 * --------------------------------
 * Each materialize entry declares:
 *   - `id`            — stable string key for the materialize block.
 *   - `inputSymbols`  — the set of field symbols whose value changes should
 *                       trigger this materialize (producer-side firing condition).
 *   - `ownerTrigger`  — a predicate over the saved template's equations that
 *                       identifies the "home" worksheet (consumer-side topology trigger,
 *                       the existing condition). Must remain independent so adding a new
 *                       materialize doesn't require touching the dispatch loop.
 *   - `consumerTemplateCode` — the worksheet_template.code that OWNS the output fields.
 *                              When a producer worksheet fires this materialize, the
 *                              block must resolve field ids against THIS template, not
 *                              the saved (producer) template.
 *
 * Dispatch rule (in saveWorksheet):
 *   Fire materialize M when:
 *   (a) ownerTrigger(templateEquations) is true  [existing topology trigger], OR
 *   (b) changedSymbols ∩ M.inputSymbols ≠ ∅       [new producer-side trigger]
 *   … but NOT twice — if both (a) and (b) are true, run once.
 *
 * 138-SPECIFIC DATA (flagged below):
 * ------------------------------------
 * The concrete symbol lists (inputSymbols) and equation-id owner triggers are
 * 138-specific. When encoding a different standard:
 *   1. Add a new entry to MATERIALIZE_REGISTRY below.
 *   2. Provide its inputSymbols (cross-worksheet inputs the block reads).
 *   3. Provide its ownerTrigger (equation-id on the consumer worksheet).
 *   4. Provide consumerTemplateCode so producer-side firings resolve the right fields.
 *   Never touch the dispatch loop in worksheet.ts — only registry entries change.
 *
 * To generalise further (fully consumer_worksheets-driven map), the registry could
 * be loaded from the DB at runtime: each equation row would carry an
 * `inputs_symbols` array and `consumer_template_code`; the dispatch loop stays
 * identical. That migration is NOT a rewrite — replace the static array below with
 * a DB query and keep the MaterializeEntry type contract unchanged.
 */

// ---- 138-SPECIFIC: equation ids used as owner-trigger identifiers ----
import { BASIN_GL8_EQUATION_ID } from '@/lib/eval/governing-duration';
import { A138_12_ASM_EQUATION_ID } from '@/lib/eval/tab6-loading';

// ---- BASIN lookup symbols (kept in sync with worksheet.ts BASIN_LOOKUP_SYMBOLS) ----
// 138-SPECIFIC: these are the cross-worksheet scalar / carrier symbols that
// A138-13's basin Gl.8 iteration reads.
const BASIN_LOOKUP_SYMBOLS = ['A_C', 'A_VA', 'Q_S', 'Q_Dr', 'f_Z', 'f_A', 'n', 'T_n', 'rainfall_table_ref'] as const;

// ---- 138-SPECIFIC: loading-check cross-worksheet inputs ----
const LOADING_CHECK_CROSS_SYMBOLS = ['A_C', 'flaechengruppe', 'bbz_thickness'] as const;
// A_S_m is LOCAL to A138-12 (not cross-worksheet), so the producer-side trigger
// activates only when an external input symbol changes on a DIFFERENT worksheet.
// An A138-12 save always fires via ownerTrigger, so A_S_m need not be in inputSymbols.

// ---- Type (general — no 138 references) ----
export type MaterializeEntry = {
  /** Stable identifier for this materialize block. */
  id: string;
  /**
   * Field symbols that, when changed on ANY worksheet, should trigger this
   * materialize to fire (producer-side condition). Keep this to cross-worksheet
   * inputs — own-worksheet inputs are covered by the ownerTrigger.
   */
  inputSymbols: ReadonlySet<string>;
  /**
   * Identifies the "home" worksheet for this materialize by its equation topology.
   * Returns true when the saved template owns the identifying equation.
   * — 138-SPECIFIC values (equation ids) live in the registry entries below,
   *   not in the dispatch loop.
   */
  ownerTrigger: (templateEquations: ReadonlyArray<{ id: string }>) => boolean;
  /**
   * worksheet_templates.code for the worksheet whose field ids the block must
   * resolve outputs against. When producer-fired (from a DIFFERENT worksheet),
   * saveWorksheet uses this code to look up the consumer template id — ensuring
   * derived rows land on the CONSUMER's field ids, not the producer's.
   *
   * For surface: producer == consumer (surface_inventory is on A138-07 itself),
   * so this is still the saved template code. The consumer-template resolution
   * is a no-op in that case, but the field is required for structural consistency.
   *
   * — 138-SPECIFIC codes ('A138-12', 'A138-13') live here; the dispatch loop
   *   only sees `consumerTemplateCode` as an opaque string.
   */
  consumerTemplateCode: string;
};

/**
 * Registry of all materialize blocks that participate in producer-side reactive
 * recompute. ORDER is stable but not semantically significant (each entry is
 * evaluated independently).
 *
 * Add new entries here when onboarding additional materializes. Do NOT modify the
 * dispatch loop in worksheet.ts — extend the registry only.
 *
 * 138-SPECIFIC: the three entries below are DWA-A 138 specific.
 *   Loading entry:  A138-06 → A138-12 (flaechengruppe/bbz_thickness → ac_as_ratio*)
 *   Basin  entry:   A138-08/10/12 → A138-13 (scalars → r_D_n/D_min)
 *   Surface entry:  A138-07 self  (surface_inventory -> A_C, C_m, A_E_ba, A_E_nba, A_C_sealed, A_C_unsealed)
 *
 * GENERAL: for any other standard, push additional entries here with a different
 * consumerTemplateCode, inputSymbols, and ownerTrigger.
 */
export const MATERIALIZE_REGISTRY: ReadonlyArray<MaterializeEntry> = [
  // ── Loading check (A138-12) ──────────────────────────────────────────────
  // 138-SPECIFIC data: inputSymbols + ownerTrigger equation-id + consumerTemplateCode.
  // GENERAL mechanism: if any saved field's symbol ∈ {A_C, flaechengruppe, bbz_thickness},
  // fire the loading materialize even when the SAVED worksheet is NOT A138-12.
  {
    id: 'loading',
    // 138-SPECIFIC: cross-worksheet inputs the A138-12 loading-check reads.
    // A_S_m is LOCAL to A138-12 and is covered by ownerTrigger; not listed here
    // so that an A138-12 save that changes only A_S_m doesn't double-count.
    inputSymbols: new Set<string>(LOADING_CHECK_CROSS_SYMBOLS),
    // 138-SPECIFIC: the A_S_m equation lives on A138-12; its id identifies A138-12 saves.
    ownerTrigger: (eqs) => eqs.some((e) => e.id === A138_12_ASM_EQUATION_ID),
    // 138-SPECIFIC: outputs land on A138-12 field ids.
    consumerTemplateCode: 'A138-12',
  },

  // ── Basin governing (A138-13) ────────────────────────────────────────────
  // 138-SPECIFIC data: inputSymbols + ownerTrigger equation-id + consumerTemplateCode.
  // GENERAL mechanism: if any saved field's symbol ∈ BASIN_LOOKUP_SYMBOLS, fire the
  // basin materialize even when the SAVED worksheet is NOT A138-13.
  {
    id: 'basin',
    // 138-SPECIFIC: scalars + rainfall-reference symbols A138-13 Gl.8 reads cross-worksheet.
    // r_D_n_table (carrier) is read cross-worksheet by the block via DB lookup, not from
    // the save batch — omitting it here means a carrier-only change on A138-04 won't
    // trigger the basin block producer-side. This is intentional: basin should only
    // refire when the governing scalar inputs change; the carrier is not in BASIN_LOOKUP_SYMBOLS.
    // (Adding 'r_D_n_table' here would be the correct extension if A138-04 carrier changes
    // should also trigger basin recompute — flagged for future evaluation.)
    inputSymbols: new Set<string>(BASIN_LOOKUP_SYMBOLS),
    // 138-SPECIFIC: the Gl.8 equation lives on A138-13; its id identifies A138-13 saves.
    ownerTrigger: (eqs) => eqs.some((e) => e.id === BASIN_GL8_EQUATION_ID),
    // 138-SPECIFIC: outputs (r_D_n, D_min) land on A138-13 field ids.
    consumerTemplateCode: 'A138-13',
  },

  // ── Surface outputs (A138-07) ────────────────────────────────────────────
  // Surface is self-referential: the producer IS the consumer (surface_inventory
  // lives on A138-07, and the outputs A_C/C_m/A_E_* are on A138-07 too).
  // ownerTrigger is covered by the surface_inventory presence check in the save
  // batch — we express it here for registry completeness, but the dispatch loop
  // does NOT use this entry to fire the surface block (it has its own in-batch check).
  // The surface entry is included so the registry is complete and a future generic
  // dispatch loop can handle it uniformly.
  // 138-SPECIFIC: 'surface_inventory' is the A138-07-specific carrier symbol.
  {
    id: 'surface',
    inputSymbols: new Set<string>(['surface_inventory']),
    // Surface fires when surface_inventory is in the save batch — ownerTrigger
    // approximated as "always false" here because the dispatch loop handles
    // surface via its own in-batch presence check (not via this registry entry).
    // If the dispatch loop is ever unified, replace with:
    //   ownerTrigger: (eqs) => eqs.some((e) => e.outputSymbol === 'surface_inventory'),
    ownerTrigger: () => false,
    // 138-SPECIFIC: outputs land on A138-07 field ids.
    consumerTemplateCode: 'A138-07',
  },
] as const;

/**
 * Given the set of changed symbols in this save batch, return the subset of
 * registry entries whose inputSymbols overlap with the changed set.
 *
 * GENERAL: no 138-specific logic here — works for any standard.
 * The `alreadyFiredByOwner` set prevents double-firing when a save is BOTH the
 * owner-trigger AND has a changed input symbol.
 *
 * @param changedSymbols   Symbols whose value actually changed in this save.
 * @param alreadyFiredIds  Registry entry ids already scheduled to fire via ownerTrigger.
 * @returns Registry entries that should fire as producers (not already firing).
 */
export function producerFiredEntries(
  changedSymbols: ReadonlySet<string>,
  alreadyFiredIds: ReadonlySet<string>,
): ReadonlyArray<MaterializeEntry> {
  return MATERIALIZE_REGISTRY.filter((entry) => {
    if (alreadyFiredIds.has(entry.id)) return false; // already firing via ownerTrigger
    for (const sym of changedSymbols) {
      if (entry.inputSymbols.has(sym)) return true;
    }
    return false;
  });
}
