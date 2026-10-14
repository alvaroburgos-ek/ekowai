/** Postgres `undefined_table` (42P01) — the staged case tables are not applied on this database yet. */
export function isMissingRelationError(err: unknown): boolean {
  let e: unknown = err;
  for (let i = 0; i < 5 && e != null && typeof e === 'object'; i++) {
    if ((e as { code?: unknown }).code === '42P01') return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

export const SCENARIOS_UNAVAILABLE: Record<'de' | 'en', string> = {
  de: 'Fälle sind auf dieser Datenbank noch nicht eingerichtet (Migration 20261014120000 fehlt).',
  en: 'Cases are not set up on this database yet (migration 20261014120000 missing).',
};
