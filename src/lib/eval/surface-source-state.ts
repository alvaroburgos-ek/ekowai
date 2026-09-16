/**
 * A138-07 surface-inventory gate — a shim over the generic
 * `carrier-source-state.ts` (Plan 2a Task 9). Exports unchanged; behaviour
 * pinned by `__tests__/surface-source-state.test.ts`. Completeness now comes
 * from the `surface_inventory` register config (byte-for-byte the legacy
 * rowComplete set, see register-configs.ts) instead of `summarizeSurfaces`.
 */
import { carrierSourceState, carrierWithholdFieldIds, type CarrierSourceState } from './carrier-source-state';
import { REGISTER_CONFIGS_FALLBACK } from './register-configs';

export type SurfaceSourceState = CarrierSourceState;

const SURFACE_CFG = REGISTER_CONFIGS_FALLBACK.surface_inventory;

/** Decide whether A138-10's inherited A_C/C_m should render or blank-with-cause.
 * `ok` requires every row complete AND the source instance approved/final. */
export function surfaceSourceState(carrierRaw: unknown, sourceStatus: string | null): SurfaceSourceState {
  return carrierSourceState(carrierRaw, SURFACE_CFG.columns, sourceStatus, {
    ownerLabel: 'A138-07',
    standardCode: 'DWA-A-138-1',
    legacyMap: SURFACE_CFG.legacy_map,
    overrideFlagKey: SURFACE_CFG.override?.flag_key,
    overrideAppliesTo: SURFACE_CFG.override?.applies_to,
  });
}

/** The surface-DERIVED output symbols A138-07 produces (Gl. 2 + C_m + area
 * totals). Used to gate the VALUE (not just the banner): when the source isn't
 * `ok`, these must be withheld from a consumer so the engine never computes off
 * an unapproved value and the displayed value matches the banner.
 * Pinned equal to `Object.values(A138_07_REGISTER_FORMULAS).map(r => r.outputSymbol)`
 * (rewrites.ts) by the surface test. */
export const SURFACE_DERIVED_SYMBOLS = ['A_C', 'C_m', 'A_E_ba', 'A_E_nba', 'A_C_sealed', 'A_C_unsealed'] as const;

const SURFACE_DERIVED_SET: ReadonlySet<string> = new Set<string>(SURFACE_DERIVED_SYMBOLS);

/** Field ids a CONSUMER worksheet must withhold when the surface source isn't
 * `ok`: the surface-DERIVED symbols inherited FROM the source owner. See
 * `carrierWithholdFieldIds` for the gating rule. */
export function surfaceWithholdFieldIds(
  fields: ReadonlyArray<{ id: string; symbol: string; inheritedFromWorksheet?: string | null }>,
  ownerCode: string | null,
  state: SurfaceSourceState['state'],
): string[] {
  return carrierWithholdFieldIds(fields, ownerCode, state, SURFACE_DERIVED_SET);
}
