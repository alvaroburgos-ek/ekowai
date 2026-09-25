import { describe, it, expect } from 'vitest';
import { POOL_OPTIONS } from '../pool-options';

/** Supabase session-mode pooler client limit observed on prod (pool_size). */
const POOLER_CLIENT_LIMIT = 15;

describe('POOL_OPTIONS (prod pooler saturation, 2026-09-19)', () => {
  it('closes idle connections instead of pinning pooler clients forever', () => {
    expect(POOL_OPTIONS.idle_timeout).toBeGreaterThan(0);
    expect(POOL_OPTIONS.idle_timeout).toBeLessThanOrEqual(60);
  });

  it('keeps several warm instances under the session-pool client limit', () => {
    expect(POOL_OPTIONS.max).toBeGreaterThanOrEqual(1);
    expect(POOL_OPTIONS.max * 4).toBeLessThanOrEqual(POOLER_CLIENT_LIMIT);
  });

  it('fails fast on a saturated pooler and stays pooler-compatible', () => {
    expect(POOL_OPTIONS.connect_timeout).toBeLessThanOrEqual(15);
    expect(POOL_OPTIONS.prepare).toBe(false);
  });
});
