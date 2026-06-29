/**
 * Whitelist single-source-of-truth guard.
 *
 * Three invariants:
 *
 *   1. Every FORMULA_ENGINE_WHITELIST entry is a well-formed
 *      `Axxx-NN:M[a-z]?` key. Catches typos / drift on the runtime
 *      whitelist itself.
 *
 *   2. Every per-test ad-hoc whitelist key in
 *      `src/components/worksheet/__tests__/engine-wiring-*.test.tsx`
 *      (and `inheritance-*.test.tsx`) is also present in the
 *      production whitelist. Catches the "test wires X, production
 *      forgot to whitelist X" drift the integration-health sweep
 *      flagged — tests bypass `FORMULA_ENGINE_WHITELIST` by passing
 *      their own per-test set; if the production set drops an entry
 *      that a test still uses, no other test catches it.
 *
 *   3. Reverse direction is intentionally NOT enforced: an entry can be
 *      in the production whitelist without a dedicated wiring test
 *      (the formula-Gl* unit tests cover those separately).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  FORMULA_ENGINE_WHITELIST,
  ENGINE_WHITELIST_KEY_RE,
} from '../engine-whitelist';

// Collect every `new Set<string>(['Axxx-NN:M', ...])` literal from the
// engine-wiring + inheritance test files.
const TESTS_DIR = join(__dirname, '..', '..', '..', 'components', 'worksheet', '__tests__');

function collectAdHocWhitelistKeys(): { file: string; keys: string[] }[] {
  const out: { file: string; keys: string[] }[] = [];
  for (const file of readdirSync(TESTS_DIR)) {
    if (!/^(engine-wiring|inheritance)-.*\.test\.tsx$/.test(file)) continue;
    const path = join(TESTS_DIR, file);
    const content = readFileSync(path, 'utf-8');
    const keys: string[] = [];
    // Match `new Set<...>([ 'A...', 'A...', ... ])` exactly once per
    // engineWhitelist construction. Tolerant to whitespace / trailing
    // commas.
    const setRe = /engineWhitelist:\s*new Set<string>\(\s*\[([^\]]+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = setRe.exec(content))) {
      const inner = m[1];
      const keyRe = /'([^']+)'|"([^"]+)"/g;
      let k: RegExpExecArray | null;
      while ((k = keyRe.exec(inner))) {
        keys.push(k[1] ?? k[2]);
      }
    }
    if (keys.length > 0) out.push({ file, keys });
  }
  return out;
}

describe('FORMULA_ENGINE_WHITELIST single-source-of-truth', () => {
  it('every entry is a well-formed key', () => {
    const bad = [...FORMULA_ENGINE_WHITELIST].filter((k) => !ENGINE_WHITELIST_KEY_RE.test(k));
    expect(bad).toEqual([]);
  });

  it('whitelist has at least 28 entries (regression guard against accidental clearing)', () => {
    expect(FORMULA_ENGINE_WHITELIST.size).toBeGreaterThanOrEqual(28);
  });

  it('A138-10:3 (Gl.3 Q_zu) is in the production whitelist — prevents naive-sum fallback', () => {
    // Q_zu = r_D(n)·(A_C+A_VA)·10⁻⁴ must be evaluated by the real arithmetic
    // engine. Without this entry the legacy naive-sum evaluator would sum the
    // input symbols instead, producing a grossly wrong result.
    expect(FORMULA_ENGINE_WHITELIST.has('A138-10:3')).toBe(true);
  });

  it('every ad-hoc per-test whitelist key is present in the production whitelist', () => {
    const adHoc = collectAdHocWhitelistKeys();
    expect(adHoc.length).toBeGreaterThan(0); // sanity — tests exist
    const drift: { file: string; key: string }[] = [];
    for (const { file, keys } of adHoc) {
      for (const key of keys) {
        if (!FORMULA_ENGINE_WHITELIST.has(key)) {
          drift.push({ file, key });
        }
      }
    }
    expect(drift).toEqual([]);
  });
});
