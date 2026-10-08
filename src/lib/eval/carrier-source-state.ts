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
   * DWA-M-820 / FLL-NT) gets the plain "nicht erfasst." / "noch nicht freigegeben (n/m …)." Default true (the A138-07
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
  // A5 (2026-09-30): the state is "not yet approved" (rows incomplete and/or the owner
  // worksheet not engineer-approved/final) — "nicht final" read as "provisional" and misled.
  return {
    state: 'incomplete',
    complete,
    total,
    message: `Quelle ${opts.ownerLabel} noch nicht freigegeben (${complete}/${total} Zeilen vollständig)${suffix}`,
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

/** U-4 (UX pass 820, 2026-10-08): one consumed register's banner input — its state from `carrierSourceState`, the
 * register's display label, whether the OWNER field is required and whether this consumer withholds values for it. */
export type SourceBannerInput = {
  ownerCode: string;
  /** Register label (owner field label in the viewer's locale; caller falls back to config title / symbol). */
  label: string;
  state: CarrierSourceState | null;
  /** Owner field `is_required`; anything but `true` is an OPTIONAL register. */
  isRequired?: boolean | null;
  /** Does this consumer withhold derived values while the source is not ok (`carrierSourceState` opts.withholds)? */
  withholds?: boolean;
};

export type GroupedSourceBanner = {
  ownerCode: string;
  /** The grouped states (not `ok`, not suppressed), in input order. */
  states: CarrierSourceState[];
  message: string;
};

/** U-4 rule 2: an OPTIONAL register (`isRequired !== true`) with state `missing` (no rows, no null-report) is not a
 * defect — no banner. Exception: when this consumer WITHHOLDS derived values for it, the banner is the only place the
 * missing values are explained, so it stays. `incomplete` / `ok` are unchanged. */
export function suppressOptionalMissing(input: SourceBannerInput): CarrierSourceState | null {
  const st = input.state;
  if (!st) return null;
  if (st.state === 'missing' && input.isRequired !== true && !input.withholds) return null;
  return st;
}

/**
 * U-4 rule 3: ONE upstream banner per source sheet (owner code) instead of one per consumed register. A group with a
 * single register keeps `carrierSourceState`'s own message verbatim; a group with several lists them by label:
 *   „Quelle 820-2-04 noch nicht freigegeben — Geltende DIN-Normen (5/5 Zeilen vollständig), Geltende DWA-Regelwerke (5/5 Zeilen vollständig)."
 *   „Quelle X nicht erfasst — A, B." (every grouped register missing)
 * The „— abgeleitete Werte ausgeblendet" suffix appears once when any grouped register withholds. Groups are returned
 * in first-appearance order of their owner code. Pure.
 */
export function groupSourceBanners(inputs: readonly SourceBannerInput[], locale: string = 'de'): GroupedSourceBanner[] {
  const de = locale !== 'en';
  const groups = new Map<string, Array<{ input: SourceBannerInput; state: CarrierSourceState }>>();
  for (const input of inputs) {
    const state = suppressOptionalMissing(input);
    if (!state || state.state === 'ok' || !state.message) continue;
    const arr = groups.get(input.ownerCode) ?? [];
    arr.push({ input, state });
    groups.set(input.ownerCode, arr);
  }
  const out: GroupedSourceBanner[] = [];
  for (const [ownerCode, items] of groups) {
    const states = items.map((i) => i.state);
    const withholds = items.some((i) => i.input.withholds);
    if (items.length === 1) {
      // DE: `carrierSourceState`'s own message verbatim. EN (cluster-B review): the same sentence in English, built
      // from the state (`carrierSourceState` itself has no locale and other callers keep its German text).
      const st = items[0].state;
      const enSuffix = withholds ? ' — derived values hidden.' : '.';
      const message = de
        ? (st.message as string)
        : st.state === 'missing'
          ? `Source ${ownerCode} not recorded${enSuffix}`
          : `Source ${ownerCode} not yet approved (${st.complete}/${st.total} rows complete)${enSuffix}`;
      out.push({ ownerCode, states, message });
      continue;
    }
    const suffix = withholds ? (de ? ' — abgeleitete Werte ausgeblendet.' : ' — derived values hidden.') : '.';
    const allMissing = items.every((i) => i.state.state === 'missing');
    if (allMissing) {
      const head = de ? `Quelle ${ownerCode} nicht erfasst` : `Source ${ownerCode} not recorded`;
      out.push({ ownerCode, states, message: `${head} — ${items.map((i) => i.input.label).join(', ')}${suffix}` });
      continue;
    }
    const parts = items.map(({ input, state }) =>
      state.state === 'missing'
        ? `${input.label} (${de ? 'nicht erfasst' : 'not recorded'})`
        : `${input.label} (${state.complete}/${state.total} ${de ? 'Zeilen vollständig' : 'rows complete'})`,
    );
    const head = de ? `Quelle ${ownerCode} noch nicht freigegeben` : `Source ${ownerCode} not yet approved`;
    out.push({ ownerCode, states, message: `${head} — ${parts.join(', ')}${suffix}` });
  }
  return out;
}
