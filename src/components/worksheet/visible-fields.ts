/**
 * Filter the form's field list down to those that should render.
 *
 * Pile-2's deprecation pass set `active=false` on rows with no source basis
 * and no code consumer (e.g. `a138_k_f_geo`, `a138_korrekturfaktor`,
 * `a138_speichertyp`, `a138_A_u`). Those rows are retained in the DB and
 * in the engine's input set so saved values aren't lost and any equation
 * that still references the symbol fails loud — but they must not render
 * as authoritative inputs in the worksheet form anymore.
 */
export function visibleFields<F extends { active: boolean }>(fields: F[]): F[] {
  return fields.filter((f) => f.active);
}
