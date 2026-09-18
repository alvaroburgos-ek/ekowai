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
  fll_naturteich: () => import('./fll_naturteich'),
  m820_3: () => import('./m820_3'),
  din18130_1: () => import('./din18130_1'),
  m205: () => import('./m205'),
  m187: () => import('./m187'),
  din276: () => import('./din276'),
  a178: () => import('./a178'),
  din16941_2: () => import('./din16941_2'),
  m1200_2: () => import('./m1200_2'),
  din1989_2: () => import('./din1989_2'),
  m820_1: () => import('./m820_1'),
  m820_2: () => import('./m820_2'),
  iso5667_10: () => import('./iso5667_10'),
  iso59020: () => import('./iso59020'),
  iso46001: () => import('./iso46001'),
  iso5667_6: () => import('./iso5667_6'),
  vsme: () => import('./vsme'),
  din14021: () => import('./din14021'),
  // Plan-3 tasks append one line each, e.g. iso14046: () => import('./iso14046'),
};
