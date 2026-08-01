/**
 * Angebots-Engine pure core (Slice E1 — margin-first, internal-only).
 *
 * Margin math + zod validation without any DB or session dependency, so the
 * rules are unit-testable (mirrors the effort-core pure/DB split). The
 * `'use server'` module (`src/lib/actions/offers.ts`) wraps these with auth
 * + persistence. NOTHING computed here may ever reach a client document —
 * the offer PDF renders positions + Festpreis only.
 */
import { z } from 'zod';

// =============================================================================
// Margin computation
// =============================================================================

export type MarginVerdict = 'red' | 'amber' | 'green';

export type OfferPositionInput = {
  estimatedHours: number;
  externalCostEur: number;
  /**
   * Resolved role rate (rate_roles) for this position — overrides the org
   * rate in the internal-cost math. null/absent → fall back to the org rate.
   */
  hourlyRateEur?: number | null;
};

export type OfferMarginInput = {
  festpreisEur: number;
  positions: ReadonlyArray<OfferPositionInput>;
  /** Org calibration — null when never set (→ amber, never a silent 0). */
  internalHourlyRate: number | null;
  targetMarginPct: number | null;
};

export type OfferMarginResult = {
  /**
   * Σ estimated hours × (position role rate ?? org internal rate).
   * Positions with neither rate contribute 0 — and flag the offer amber.
   */
  internalCost: number;
  /** Σ external costs — passed through, never marked up. */
  externalTotal: number;
  /** Festpreis − internalCost − externalTotal. */
  margin: number;
  /** margin / Festpreis × 100 (0 when Festpreis is 0). */
  marginPct: number;
  /** Σ estimated hours across positions. */
  totalHours: number;
  /** Effective €/h = (Festpreis − externals) / hours; null when hours = 0. */
  effectiveHourlyRate: number | null;
  verdict: MarginVerdict;
  /** German, human-readable — the panel shows these verbatim. */
  reasons: string[];
};

/** Coerce a Drizzle numeric-column string (or number) to a finite number. */
export function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Margin-first verdict:
 * - red   — marginPct strictly below the target margin (rates resolvable).
 * - amber — some position has NEITHER a role rate NOR an org rate
 *           ("Stundensatz nicht kalibriert"), targetMarginPct unset, or any
 *           position has estimatedHours <= 0 — the number on screen is not
 *           yet trustworthy.
 * - green — calibrated, plausible hours, margin at or above target.
 * Internal cost is per position: hours × (position role rate ?? org rate).
 * Red wins over amber: a known-bad margin outranks a stale input.
 */
export function computeOfferMargin(input: OfferMarginInput): OfferMarginResult {
  const { festpreisEur, positions, internalHourlyRate, targetMarginPct } = input;

  const totalHours = positions.reduce(
    (sum, p) => sum + (Number.isFinite(p.estimatedHours) ? p.estimatedHours : 0),
    0,
  );
  const externalTotal = positions.reduce(
    (sum, p) => sum + (Number.isFinite(p.externalCostEur) ? p.externalCostEur : 0),
    0,
  );
  /** Position rate wins; org rate is the fallback; neither → 0 (+ amber). */
  const resolveRate = (p: OfferPositionInput): number | null => {
    const rate = p.hourlyRateEur ?? internalHourlyRate;
    return rate !== null && Number.isFinite(rate) ? rate : null;
  };
  const internalCost = positions.reduce((sum, p) => {
    const hours = Number.isFinite(p.estimatedHours) ? p.estimatedHours : 0;
    const rate = resolveRate(p);
    return sum + (rate !== null ? hours * rate : 0);
  }, 0);
  const margin = festpreisEur - internalCost - externalTotal;
  const marginPct = festpreisEur > 0 ? (margin / festpreisEur) * 100 : 0;
  const effectiveHourlyRate =
    totalHours > 0 ? (festpreisEur - externalTotal) / totalHours : null;

  // Amber only when some position resolves to NO rate at all — a position
  // role rate satisfies calibration even while the org rate is unset.
  const rateMissing = positions.some((p) => resolveRate(p) === null);

  const amberReasons: string[] = [];
  if (rateMissing) {
    amberReasons.push('Stundensatz nicht kalibriert');
  }
  if (targetMarginPct === null) {
    amberReasons.push('Zielmarge nicht gesetzt');
  }
  if (positions.some((p) => !(p.estimatedHours > 0))) {
    amberReasons.push('Mindestens eine Position ohne Stundenschätzung (≤ 0 h)');
  }

  const redReasons: string[] = [];
  if (
    !rateMissing
    && targetMarginPct !== null
    && marginPct < targetMarginPct
  ) {
    redReasons.push(
      `Marge ${marginPct.toFixed(1)} % unter Zielmarge ${targetMarginPct.toFixed(1)} %`,
    );
  }

  const verdict: MarginVerdict =
    redReasons.length > 0 ? 'red' : amberReasons.length > 0 ? 'amber' : 'green';

  return {
    internalCost,
    externalTotal,
    margin,
    marginPct,
    totalHours,
    effectiveHourlyRate,
    verdict,
    reasons: [...redReasons, ...amberReasons],
  };
}

// =============================================================================
// Gründungsreferenz-Leck
// =============================================================================

/** Warn when the effective rate sits within ±15 % of the founding reference. */
export const FOUNDING_RATE_BAND = 0.15;

/**
 * The founding discount was a decision; repeating it should never be an
 * accident. Returns a German warning string when `effectiveRate` is within
 * 15 % of `referenceRate`, else null. `referenceRate` is caller-supplied
 * (nothing is stored — YAGNI); null/absent reference → no warning.
 */
export function foundingRateWarning(
  effectiveRate: number | null,
  referenceRate: number | null,
): string | null {
  if (effectiveRate === null || referenceRate === null) return null;
  if (!Number.isFinite(effectiveRate) || !Number.isFinite(referenceRate)) return null;
  if (referenceRate <= 0) return null;
  const deviation = Math.abs(effectiveRate - referenceRate) / referenceRate;
  if (deviation > FOUNDING_RATE_BAND) return null;
  return (
    `Gründungsreferenz-Leck: effektiver Stundensatz ${effectiveRate.toFixed(2)} €/h `
    + `liegt innerhalb von 15 % der Gründungsreferenz (${referenceRate.toFixed(2)} €/h)`
  );
}

// =============================================================================
// Zod schemas (parsed by the server actions)
// =============================================================================

const uuidSchema = z.string().uuid();

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format JJJJ-MM-TT vorliegen')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Ungültiges Datum');

const eurSchema = z
  .number('Betrag muss eine Zahl sein')
  .finite()
  .min(0, 'Betrag darf nicht negativ sein')
  .max(10_000_000, 'Betrag unplausibel hoch');

export const createOfferSchema = z.object({
  projectId: uuidSchema,
  title: z.string().trim().min(1, 'Titel erforderlich').max(200),
  festpreisEur: eurSchema,
  validUntil: isoDateSchema.optional(),
  bearbeitungszeit: z.string().trim().max(200).optional(),
});
export type CreateOfferInput = z.infer<typeof createOfferSchema>;

export const updateOfferSchema = z.object({
  offerId: uuidSchema,
  title: z.string().trim().min(1, 'Titel erforderlich').max(200).optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional(),
  festpreisEur: eurSchema.optional(),
  /** null clears the date. */
  validUntil: isoDateSchema.nullable().optional(),
  bearbeitungszeit: z.string().trim().max(200).nullable().optional(),
});
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;

export const addOfferPositionSchema = z.object({
  offerId: uuidSchema,
  position: z.string().trim().min(1, 'Position erforderlich').max(200),
  estimatedHours: z
    .number('Stunden müssen eine Zahl sein')
    .finite()
    .min(0, 'Stunden dürfen nicht negativ sein')
    .max(10_000, 'Stunden unplausibel hoch'),
  externalCostEur: eurSchema.optional(),
  /** Optional rate_roles id — the server verifies it belongs to the org. */
  roleId: uuidSchema.optional(),
  note: z.string().trim().max(1000).optional(),
});
export type AddOfferPositionInput = z.infer<typeof addOfferPositionSchema>;

export const setOrgRatesSchema = z.object({
  orgId: uuidSchema,
  internalHourlyRate: z
    .number('Stundensatz muss eine Zahl sein')
    .finite()
    .gt(0, 'Stundensatz muss größer als 0 sein')
    .max(10_000, 'Stundensatz unplausibel hoch')
    .nullable(),
  targetMarginPct: z
    .number('Zielmarge muss eine Zahl sein')
    .finite()
    .min(0, 'Zielmarge darf nicht negativ sein')
    .max(100, 'Zielmarge über 100 % ist unplausibel')
    .nullable(),
});
export type SetOrgRatesInput = z.infer<typeof setOrgRatesSchema>;

// --- Role-based rates (rate_roles) ------------------------------------------

const roleNameSchema = z
  .string()
  .trim()
  .min(1, 'Rollenname erforderlich')
  .max(100, 'Rollenname zu lang');

const roleRateSchema = z
  .number('Stundensatz muss eine Zahl sein')
  .finite()
  .gt(0, 'Stundensatz muss größer als 0 sein')
  .max(10_000, 'Stundensatz unplausibel hoch');

export const addRateRoleSchema = z.object({
  orgId: uuidSchema,
  name: roleNameSchema,
  hourlyRateEur: roleRateSchema,
});
export type AddRateRoleInput = z.infer<typeof addRateRoleSchema>;

export const updateRateRoleSchema = z
  .object({
    roleId: uuidSchema,
    name: roleNameSchema.optional(),
    hourlyRateEur: roleRateSchema.optional(),
  })
  .refine(
    (v) => v.name !== undefined || v.hourlyRateEur !== undefined,
    'Nichts zu ändern',
  );
export type UpdateRateRoleInput = z.infer<typeof updateRateRoleSchema>;

export const deactivateRateRoleSchema = z.object({
  roleId: uuidSchema,
});
export type DeactivateRateRoleInput = z.infer<typeof deactivateRateRoleSchema>;
