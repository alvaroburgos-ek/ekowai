// @vitest-environment node
import '../../db/__tests__/_setup-env';
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { resolveFactor } from '../emission-factors';

describe('resolveFactor (local seeded factors)', () => {
  it('resolves the German grid electricity factor', async () => {
    const f = await resolveFactor(db, '05_20_01_001_01', 'v2.1');
    expect(f).not.toBeNull();
    expect(f!.scope).toContain('Scope 2');
    expect(f!.unit).toBe('kWh');
    expect(f!.kgCo2e).toBeGreaterThan(0.3);
    expect(f!.kgCo2e).toBeLessThan(0.5);
    expect(typeof f!.kgCo2e).toBe('number');
  });
  it('returns null for an unknown factor', async () => {
    expect(await resolveFactor(db, 'NOPE', 'v2.1')).toBeNull();
  });
});
