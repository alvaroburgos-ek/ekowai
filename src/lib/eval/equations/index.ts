/**
 * Plan 3 — slug → equations module (dynamic import; emitter CLI only).
 * Each standard task with derived values appends exactly one line; same slug
 * set as `src/lib/eval/field-configs/index.ts`.
 */
import type { EquationModule } from '../field-configs/types';

export const EQUATION_MODULES: Record<string, () => Promise<EquationModule>> = {
  a138: () => import('./a138'),
  din1989_1: () => import('./din1989_1'),
  // Plan-3 tasks append one line each, e.g. a262e: () => import('./a262e'),
};
