/**
 * Surface-type catalogue for the A138-07 Flächenverzeichnis (surface
 * inventory).
 *
 * Each profile carries the engineer-facing label, the runoff coefficients
 * the standard's Tab. 9 publishes per surface family, the paved/unpaved
 * classification (befestigt / nicht befestigt) used by Gl. 2 + Gl. 10,
 * and the clause reference for the citation badge.
 *
 * No Tab. 9 wording is reproduced here — this is a logic-only encoding.
 * The labels are common German engineering terms; the numeric C_i / C_s
 * defaults are reference values an engineer would routinely use when
 * sizing per DWA-A 138-1. The engineer can always override per row;
 * the "← Tab. 9" badge on a row indicates the default is still in use.
 *
 * C_i — design-event Abflussbeiwert (Bemessungsregen). Feeds Gl. 2:
 *        A_C = Σ (A_E,i · C_i)
 * C_s — flood-event Abflussbeiwert (Flutereignis). Feeds Gl. 10's V_Rück
 *        flood-check on A138-26 and is captured here so the engineer
 *        sources both coefficients from the same Tab. 9 row.
 *
 * Engineers can override any default. The mapping is the suggestion
 * surface, NOT a constraint — the carrier stores whatever the engineer
 * chooses, and the verdict surfaces the chosen value.
 */

export type SurfaceTypeId =
  | 'dach'
  | 'asphalt'
  | 'pflaster'
  | 'pflaster_offen'
  | 'kies'
  | 'rasen'
  | 'sonstige';

export type SurfaceTypeProfile = {
  /** Engineer-facing label (de-DE). Used in the dropdown. */
  labelDe: string;
  /** Default Abflussbeiwert for the design event (Bemessungsregen). */
  C_i_default: number | null;
  /** Default Abflussbeiwert for the flood event. */
  C_s_default: number | null;
  /** True when the surface counts as befestigt for §5.3.3.5 row-splitting
   *  in A138-10's Gl. 2 aggregator. Lawn / meadow / gravel are unbefestigt. */
  paved: boolean;
  /** Citation reference — pointer only, no Tab. 9 wording. */
  clauseRef: 'Tab. 9';
};

export const SURFACE_TYPE_PROFILES: Record<SurfaceTypeId, SurfaceTypeProfile> = {
  dach: {
    labelDe: 'Dachfläche',
    C_i_default: 0.9,
    C_s_default: 1.0,
    paved: true,
    clauseRef: 'Tab. 9',
  },
  asphalt: {
    labelDe: 'Asphalt / Beton (dicht)',
    C_i_default: 0.9,
    C_s_default: 1.0,
    paved: true,
    clauseRef: 'Tab. 9',
  },
  pflaster: {
    labelDe: 'Pflaster (dichte Fugen)',
    C_i_default: 0.7,
    C_s_default: 0.9,
    paved: true,
    clauseRef: 'Tab. 9',
  },
  pflaster_offen: {
    labelDe: 'Pflaster (offene Fugen)',
    C_i_default: 0.5,
    C_s_default: 0.7,
    paved: true,
    clauseRef: 'Tab. 9',
  },
  kies: {
    labelDe: 'Kies',
    C_i_default: 0.3,
    C_s_default: 0.5,
    paved: false,
    clauseRef: 'Tab. 9',
  },
  rasen: {
    labelDe: 'Rasen / Gartenfläche',
    C_i_default: 0.1,
    C_s_default: 0.3,
    paved: false,
    clauseRef: 'Tab. 9',
  },
  sonstige: {
    labelDe: 'Sonstige (manuell)',
    // No default — engineer must enter both coefficients manually and
    // provide their own citation. Prevents accidental zero-runoff
    // assumptions for unknown surface types.
    C_i_default: null,
    C_s_default: null,
    paved: true,
    clauseRef: 'Tab. 9',
  },
};

/** Ordered list for the dropdown. Stable display order independent of the
 *  Record key iteration order. */
export const SURFACE_TYPE_OPTIONS: ReadonlyArray<{
  value: SurfaceTypeId;
  label: string;
}> = (
  ['dach', 'asphalt', 'pflaster', 'pflaster_offen', 'kies', 'rasen', 'sonstige'] as const
).map((id) => ({ value: id, label: SURFACE_TYPE_PROFILES[id].labelDe }));

/** Coerce an arbitrary string to a known SurfaceTypeId; falls back to
 *  'sonstige' for legacy/unknown values so the carrier never crashes
 *  on stale persisted data. */
export function asSurfaceTypeId(v: unknown): SurfaceTypeId {
  if (typeof v !== 'string') return 'sonstige';
  if (v in SURFACE_TYPE_PROFILES) return v as SurfaceTypeId;
  return 'sonstige';
}

/** Did the engineer leave the coefficient at the type's default? Used to
 *  drive the "← Tab. 9" badge and to decide whether a type change should
 *  refresh the values (yes) or preserve them (no — the engineer customised). */
export function isDefaultForType(
  type: SurfaceTypeId,
  c_i: number | null,
  c_s: number | null,
): { c_i: boolean; c_s: boolean } {
  const p = SURFACE_TYPE_PROFILES[type];
  return {
    c_i: c_i === p.C_i_default,
    c_s: c_s === p.C_s_default,
  };
}

/**
 * Carrier shape persisted by A138-07's surface-inventory editor and read
 * by the Gl. 2 preliminary aggregator. Defined in this module so the
 * aggregator (engine code) and editor (UI code) share one source of
 * truth without introducing a UI → engine import cycle.
 */
export type SurfaceInventoryRow = {
  id: string;
  label: string;
  surface_type: SurfaceTypeId;
  area_m2: number | null;
  c_i: number | null;
  c_s: number | null;
};

export type SurfaceInventoryCarrier = {
  rows: SurfaceInventoryRow[];
};
