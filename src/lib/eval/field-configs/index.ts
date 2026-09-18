/**
 * Plan 3 — slug → field-config module (dynamic import, so the app bundle never
 * pulls a standard's config data in; only the emitter CLI resolves it).
 * Each standard task appends exactly one line. Slugs per the Plan-3
 * conventions: a138, din1989_1, a262e, m277e, m1200_1, m1200_3, fll_gar,
 * fll_naturteich, m820_3, din18130_1, m205, m187, din276, a178, din16941_2,
 * m1200_2, din1989_2, m820_1, m820_2, iso5667_10, iso59020, iso46001,
 * iso5667_6, vsme, din14021, iso14046, atv_a704e, iso5667_1, iso59004.
 */
import type { FieldConfigModule } from './types';

export type { FieldConfigEntry, SectionVisibilityEntry, EquationEntry, FieldConfigModule, EquationModule, FieldConfigEnumValue } from './types';

export const FIELD_CONFIG_MODULES: Record<string, () => Promise<FieldConfigModule>> = {
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
  iso14046: () => import('./iso14046'),
  // Plan-3 tasks append one line each, e.g. atv_a704e: () => import('./atv_a704e'),
};
