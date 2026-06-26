// @vitest-environment node
import '../../__tests__/_setup-env';
import { describe, it, expect } from 'vitest';
import { loadWorklist } from '@/lib/db/queries/vsme-worklist';

const NON_EXISTENT_PROJECT = '00000000-0000-0000-0000-000000000000';

describe('loadWorklist (integration)', () => {
  it('returns an object with ekowai_env and client_supplied groups (even for a non-existent project)', async () => {
    const result = await loadWorklist(NON_EXISTENT_PROJECT);
    // Fields are template-level; a non-existent projectId yields null values — fine.
    expect(result).toHaveProperty('ekowai_env');
    expect(result).toHaveProperty('client_supplied');
  });

  it('returns rows in ekowai_env group', async () => {
    const result = await loadWorklist(NON_EXISTENT_PROJECT);
    expect(Array.isArray(result.ekowai_env)).toBe(true);
    expect(result.ekowai_env.length).toBeGreaterThan(0);
  });

  it('returns rows in client_supplied group', async () => {
    const result = await loadWorklist(NON_EXISTENT_PROJECT);
    expect(Array.isArray(result.client_supplied)).toBe(true);
    expect(result.client_supplied.length).toBeGreaterThan(0);
  });

  it('includes a field matching TotalEnergyConsumption symbol under ekowai_env', async () => {
    const result = await loadWorklist(NON_EXISTENT_PROJECT);
    const ekowaiFields = result.ekowai_env ?? [];
    const found = ekowaiFields.find((f) => f.symbol.includes('TotalEnergyConsumption'));
    expect(found).toBeDefined();
  });

  it('WorklistRow shape has required fields with correct types', async () => {
    const result = await loadWorklist(NON_EXISTENT_PROJECT);
    const allRows = Object.values(result).flat();
    expect(allRows.length).toBeGreaterThan(0);
    const row = allRows[0];
    expect(typeof row.fieldId).toBe('string');
    expect(typeof row.symbol).toBe('string');
    expect(typeof row.labelDe).toBe('string');
    expect(typeof row.owner).toBe('string');
    expect(typeof row.dataType).toBe('string');
    expect(typeof row.hasValue).toBe('boolean');
    // For a non-existent project, hasValue should be false everywhere
    expect(row.hasValue).toBe(false);
  });
});
