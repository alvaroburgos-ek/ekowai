/**
 * VSME-B04.100 pollutant-register carrier: row shape, normalizer, and the
 * per-medium sums. The normalizer is the single shared parse path used by
 * BOTH the editor and the saveWorksheet materialization block, so they can
 * never diverge (same contract as ./surface-inventory for A138-07).
 *
 * VSME para 32: "it shall disclose the pollutants it emits to air, water and
 * soil in its own operations, with the respective amount for each pollutant."
 * The register carries the per-pollutant facts; the three scalar fields
 * (AmountOfEmissionToAir/Water/Soil) become derived per-medium sums.
 */
import { lookupPollutant } from '@/lib/vsme/pollutants';

export const POLLUTANT_MEDIA = ['air', 'water', 'soil'] as const;
export type PollutantMedium = (typeof POLLUTANT_MEDIA)[number];

export type PollutantRow = {
  id: string;
  /** Free-text source description — which installation/process the emission stems from. */
  label: string;
  /** E-PRTR member value from src/lib/vsme/pollutants.ts; null ⇒ engineer must select. */
  pollutant: string | null;
  medium: PollutantMedium | null;
  /** Mass in tonnes (t) — the unit of the three scalar B04.100 fields. */
  amount_t: number | null;
};

export type PollutantRegisterCarrier = {
  /** Explicit "no pollutants subject to reporting" (e.g. not E-PRTR-obligated).
   * true ⇒ per-medium sums are 0 (a statement), rows are ignored.
   * false + empty rows ⇒ sums are null ("fehlend" — nothing asserted yet). */
  not_applicable: boolean;
  rows: PollutantRow[];
};

/** Field symbols of the derived per-medium scalar outputs on VSME-B04.100. */
export const POLLUTANT_OUTPUT_SYMBOLS: Readonly<Record<PollutantMedium, string>> = {
  air: 'AmountOfEmissionToAir',
  water: 'AmountOfEmissionToWater',
  soil: 'AmountOfEmissionToSoil',
};

/** Carrier field symbol on VSME-B04.100. */
export const POLLUTANT_REGISTER_SYMBOL = 'pollutant_register';

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newPollutantRow(): PollutantRow {
  return { id: genId(), label: '', pollutant: null, medium: null, amount_t: null };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function normalizeRow(raw: unknown): PollutantRow {
  if (!raw || typeof raw !== 'object') return newPollutantRow();
  const r = raw as Record<string, unknown>;
  const pollutant =
    typeof r.pollutant === 'string' && lookupPollutant(r.pollutant) ? r.pollutant : null;
  const medium = POLLUTANT_MEDIA.includes(r.medium as PollutantMedium)
    ? (r.medium as PollutantMedium)
    : null;
  return {
    id: typeof r.id === 'string' && r.id.length > 0 ? r.id : genId(),
    label: typeof r.label === 'string' ? r.label : '',
    pollutant,
    medium,
    amount_t: num(r.amount_t),
  };
}

export function normalizePollutantCarrier(value: unknown): PollutantRegisterCarrier {
  if (!value || typeof value !== 'object') return { not_applicable: false, rows: [] };
  const v = value as { not_applicable?: unknown; rows?: unknown };
  return {
    not_applicable: v.not_applicable === true,
    rows: Array.isArray(v.rows) ? v.rows.map(normalizeRow) : [],
  };
}

export function pollutantRowComplete(row: PollutantRow): boolean {
  return (
    row.pollutant != null &&
    row.medium != null &&
    row.amount_t != null &&
    Number.isFinite(row.amount_t) &&
    row.amount_t >= 0
  );
}

export type PollutantSummary = {
  /** Per-medium sums in t. null when nothing is asserted for that medium
   * (no complete rows and not_applicable=false). 0 when not_applicable=true
   * or when complete rows exist overall but none hit this medium. */
  air: number | null;
  water: number | null;
  soil: number | null;
  complete: number;
  total: number;
};

/** Single source of the B04 per-medium sums. Operates only on COMPLETE rows. */
export function summarizePollutants(carrier: PollutantRegisterCarrier): PollutantSummary {
  if (carrier.not_applicable) {
    return { air: 0, water: 0, soil: 0, complete: 0, total: carrier.rows.length };
  }
  const sums: Record<PollutantMedium, number> = { air: 0, water: 0, soil: 0 };
  let complete = 0;
  for (const r of carrier.rows) {
    if (!pollutantRowComplete(r)) continue;
    complete++;
    sums[r.medium as PollutantMedium] += r.amount_t as number;
  }
  if (complete === 0) {
    return { air: null, water: null, soil: null, complete: 0, total: carrier.rows.length };
  }
  return { ...sums, complete, total: carrier.rows.length };
}
