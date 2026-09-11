import { describe, it, expect } from 'vitest';
import {
  computeMarginGuard,
  CASH_COST_FLOOR_EUR_H,
  FLOOR_WARN_FACTOR,
} from '../margin-guard';

// The concept's own example: Bundle sold at €8,010.
const BASE = { festpreisEur: 8010, externalTotal: 0, estimatedHours: 84 };

describe('computeMarginGuard', () => {
  it('idle before any hours are logged (never a fake green)', () => {
    const r = computeMarginGuard({ ...BASE, actualHours: 0 });
    expect(r.status).toBe('idle');
    expect(r.liveRateEurPerHour).toBeNull();
    expect(r.remainingHoursAtFloor).toBeCloseTo(8010 / 80, 5);
  });

  it('green at €200/h (40 h logged on €8,010)', () => {
    const r = computeMarginGuard({ ...BASE, actualHours: 40 });
    expect(r.liveRateEurPerHour).toBeCloseTo(200.25, 2);
    expect(r.status).toBe('green');
    expect(r.reasons).toEqual([]);
  });

  it('amber at €89/h (90 h logged) — approaching the floor AND hours overrun', () => {
    const r = computeMarginGuard({ ...BASE, actualHours: 90 });
    expect(r.liveRateEurPerHour).toBeCloseTo(89, 0);
    expect(r.status).toBe('amber');
    expect(r.hoursOverrun).toBe(true);
    expect(r.reasons.length).toBe(2);
  });

  it('red below the €80/h floor', () => {
    const r = computeMarginGuard({ ...BASE, actualHours: 110 });
    expect(r.liveRateEurPerHour).toBeLessThan(CASH_COST_FLOOR_EUR_H);
    expect(r.status).toBe('red');
  });

  it('externals reduce the net fee before the rate is computed', () => {
    // €8,010 − €2,010 lab costs = €6,000 net; 30 h → €200/h green.
    const r = computeMarginGuard({ ...BASE, externalTotal: 2010, actualHours: 30 });
    expect(r.liveRateEurPerHour).toBeCloseTo(200, 5);
    expect(r.status).toBe('green');
    expect(r.remainingHoursAtFloor).toBeCloseTo(6000 / 80 - 30, 5);
  });

  it('red with explicit reason when externals eat the whole Festpreis', () => {
    const r = computeMarginGuard({ festpreisEur: 1000, externalTotal: 1200, estimatedHours: 10, actualHours: 5 });
    expect(r.status).toBe('red');
    expect(r.remainingHoursAtFloor).toBeNull();
    expect(r.reasons[0]).toContain('Externe Kosten');
  });

  it('hours overrun alone flips green to amber even at a high rate', () => {
    // 10 h Soll, 12 h Ist, but rate still €500/h.
    const r = computeMarginGuard({ festpreisEur: 6000, externalTotal: 0, estimatedHours: 10, actualHours: 12 });
    expect(r.liveRateEurPerHour).toBe(500);
    expect(r.status).toBe('amber');
    expect(r.hoursOverrun).toBe(true);
  });

  it('warn band is floor × factor', () => {
    const justUnderWarn = computeMarginGuard({ festpreisEur: 99 * FLOOR_WARN_FACTOR * 80 / 100, externalTotal: 0, estimatedHours: 0, actualHours: 1 });
    expect(justUnderWarn.status).toBe('amber');
    const atWarn = computeMarginGuard({ festpreisEur: 80 * FLOOR_WARN_FACTOR, externalTotal: 0, estimatedHours: 0, actualHours: 1 });
    expect(atWarn.status).toBe('green');
  });

  it('honors a custom floor', () => {
    // 82 h (< 84 h Soll, no overrun): ≈€97.68/h — amber at the €80 floor
    // (warn band up to €100), green when the floor is €42 (warn €52.50).
    const atDefault = computeMarginGuard({ ...BASE, actualHours: 82 });
    expect(atDefault.status).toBe('amber');
    const r = computeMarginGuard({ ...BASE, actualHours: 82, floorEurPerHour: 42 });
    expect(r.status).toBe('green');
    expect(r.floorEurPerHour).toBe(42);
  });
});
