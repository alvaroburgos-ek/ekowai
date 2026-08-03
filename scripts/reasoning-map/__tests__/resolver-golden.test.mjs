// scripts/reasoning-map/__tests__/resolver-golden.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolve } from '../resolver-engine.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(join(__dir, './fixtures/signoff-golden.json'), 'utf-8'));

describe('golden set (PROVENANCE-RULINGS-SIGNOFF.md)', () => {
  for (const c of golden) {
    it(c.name, () => {
      const d = resolve(c.evidence, c.evidence.target);
      expect(d.action).toBe(c.expect_action);
      expect(d.action === 'stage' ? d.rule_id : d.reason).toBe(c.expect);
    });
  }
});
