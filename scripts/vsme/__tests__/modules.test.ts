import { describe, it, expect } from 'vitest';
import { parseRoles, moduleCodeToOwner, conceptModuleMap } from '../modules';
import { TAXONOMY_DIR } from '../_setup';

describe('moduleCodeToOwner', () => {
  it('environment B03-B07 -> ekowai_env', () => {
    for (const c of ['B03', 'B04', 'B05', 'B06', 'B07'])
      expect(moduleCodeToOwner(c)).toBe('ekowai_env');
  });
  it('social/governance -> client_supplied', () => {
    for (const c of ['B08', 'B09', 'B10', 'B11', 'C05', 'C09'])
      expect(moduleCodeToOwner(c)).toBe('client_supplied');
  });
  it('general info -> general', () => {
    for (const c of ['B01', 'B02', 'C01', 'D99'])
      expect(moduleCodeToOwner(c)).toBe('general');
  });
});

describe('parseRoles', () => {
  it('includes the energy module B03.000 with its title', () => {
    const roles = parseRoles(TAXONOMY_DIR);
    const r = roles.find((x) => x.code === 'B03.000');
    expect(r).toBeDefined();
    expect(r!.title.toLowerCase()).toContain('energy');
  });
});

describe('conceptModuleMap', () => {
  it('assigns a known water concept to B06', () => {
    const m = conceptModuleMap(TAXONOMY_DIR);
    // at least one concept maps to a B06 (water) module
    expect([...m.values()].some((v) => v.startsWith('B06'))).toBe(true);
  });
});
