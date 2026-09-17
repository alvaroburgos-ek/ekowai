/**
 * Plan 3 — slug → equations module (dynamic import; emitter CLI only).
 * Each standard task with derived values appends exactly one line; same slug
 * set as `src/lib/eval/field-configs/index.ts`.
 */
import type { EquationModule } from '../field-configs/types';

export const EQUATION_MODULES: Record<string, () => Promise<EquationModule>> = {
  a138: () => import('./a138'),
  din1989_1: () => import('./din1989_1'),
  a262e: () => import('./a262e'),
  m277e: () => import('./m277e'),
  m1200_1: () => import('./m1200_1'),
  m1200_3: () => import('./m1200_3'),
  fll_gar: () => import('./fll_gar'),
  // Plan-3 tasks append one line each, e.g. fll_naturteich: () => import('./fll_naturteich'),
};
