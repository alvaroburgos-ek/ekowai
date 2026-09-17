/**
 * Generic upstream-cause gate for register carriers (Plan 2a Task 9).
 *
 * Generalises `surface-source-state.ts` (the A138-07 → A138-10 gate) to any
 * register: completeness comes from `prepareRegisterRows` under the register's
 * own `RegisterColumn[]` contract, so the gate and the engine can never
 * disagree about what "complete" means. `ok` requires every row complete AND
 * the source instance approved/final; the messages are parameterised by the
 * owner label so a consumer banner names the real source worksheet.
 */
import { prepareRegisterRows } from './register-rows';
import { makeTableLookup, makeTableRows } from './regulation-tables-fallback';
import type { RegisterColumn, RegisterFlag } from './field-config';
import type { Value } from '@/lib/expr';

const READY_STATUSES = new Set(['engineer_approved', 'final']);

export type CarrierSourceState = {
  state: 'missing' | 'incomplete' | 'ok';
  complete: number;
  total: number;
  message: string | null;
};

export type CarrierSourceOpts = {
  /** Worksheet code of the producing (owner) worksheet, named in the messages, e.g. 'A138-07'. */
  ownerLabel: string;
  /** Standard whose regulation tables resolve lookups + legacy replay, e.g. 'DWA-A-138-1'. */
  standardCode: string;
  legacyMap?: Record<string, Record<string, string>>;
  overrideFlagKey?: string;
  overrideAppliesTo?: readonly string[];
  flagKeys?: readonly string[];
  /** The register's flag declarations: a flag with `disables_rows` that is ON is an explicit null-report —
   * zero rows then count as complete (final-review minor), matching the editor (rows hidden) and the engine. */
  flags?: readonly RegisterFlag[];
  /** Worksheet-symbol lookup for column `visible_when` / derived expressions in row scope (unknown ⇒ undefined). */
  symbol?: (sym: string) => Value | undefined;
  /** Round 2 (final review): does a not-`ok` source actually WITHHOLD values on this consumer (the page deletes
   * inherited produced symbols — `carrierWithholdFieldIds`)? Only then may the message say
   * "— abgeleitete Werte ausgeblendet"; a register nothing is derived from (the TS selection registers on
   * DWA-M-820 / FLL-NT) gets the plain "nicht erfasst." / "nicht final (n/m …)." Default true (the A138-07
   * surface shim always withholds). */
  withholds?: boolean;
};

/** Decide whether a consumer's inherited derived values should render or blank-with-cause. */
export function carrierSourceState(
  carrierRaw: unknown,
  columns: readonly RegisterColumn[],
  sourceStatus: string | null,
  opts: CarrierSourceOpts,
): CarrierSourceState {
  const { rows, flags } = prepareRegisterRows(
    carrierRaw,
    columns,
    { table: makeTableLookup(opts.standardCode), tableRows: makeTableRows(opts.standardCode), symbol: opts.symbol },
    { legacyMap: opts.legacyMap, flagKeys: opts.flagKeys, overrideFlagKey: opts.overrideFlagKey, overrideAppliesTo: opts.overrideAppliesTo },
  );
  const total = rows.length;
  const nullReport = opts.flags?.some((f) => f.disables_rows && flags[f.key] === true) ?? false;
  const suffix = (opts.withholds ?? true) ? ' — abgeleitete Werte ausgeblendet.' : '.';
  if (total === 0 && !nullReport) {
    return { state: 'missing', complete: 0, total: 0, message: `Quelle ${opts.ownerLabel} nicht erfasst${suffix}` };
  }
  const complete = rows.filter((r) => r.complete).length;
  const ready = complete === total && sourceStatus != null && READY_STATUSES.has(sourceStatus);
  if (ready) return { state: 'ok', complete, total, message: null };
  return {
    state: 'incomplete',
    complete,
    total,
    message: `Quelle ${opts.ownerLabel} nicht final (${complete}/${total} Zeilen vollständig)${suffix}`,
  };
}

/** Field ids a CONSUMER worksheet must withhold (drop from its seeded values)
 * when the source isn't `ok`: the symbols the owner PRODUCES from the carrier,
 * inherited FROM that owner. Gates by the field's own `inheritedFromWorksheet`
 * (set on every inherited field by mergeInheritedFields), NOT by how the value
 * was seeded — the materialized producer row is loaded by field id and seeded
 * via the local-param path, which never sets inheritedFromBySymbol, so gating
 * on that map missed it (the "value shows above a 'hidden' banner" bug).
 * Atomic inputs inherited from the owner are NOT withheld — only produced values.
 * Returns [] when ready or owner unknown. */
export function carrierWithholdFieldIds(
  fields: ReadonlyArray<{ id: string; symbol: string; inheritedFromWorksheet?: string | null }>,
  ownerCode: string | null,
  state: CarrierSourceState['state'],
  producedSymbols: ReadonlySet<string>,
): string[] {
  if (state === 'ok' || !ownerCode) return [];
  return fields
    .filter((f) => f.inheritedFromWorksheet === ownerCode && producedSymbols.has(f.symbol))
    .map((f) => f.id);
}
