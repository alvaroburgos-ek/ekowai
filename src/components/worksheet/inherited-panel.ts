/**
 * U-3 (UX pass 820, 2026-10-08): the „Vorgelagerte Werte" panel lists the sheet-specific upstream values first and the
 * project identity / metadata values (repeated on almost every sheet) at the end under „Projektdaten". Pure.
 */
export const PROJECT_IDENTITY_SYMBOLS: ReadonlySet<string> = new Set([
  'project_name',
  'project_name_short',
  'project_number',
  'client_name',
  'project_location',
  'registration_date',
  'client_contact_person',
  'client_address',
]);

/** Split the panel's fields into sheet-specific (input order kept) and identity (in PROJECT_IDENTITY_SYMBOLS order). */
export function splitInheritedForPanel<T extends { symbol: string }>(fields: readonly T[]): { specific: T[]; identity: T[] } {
  const specific: T[] = [];
  const identity: T[] = [];
  for (const f of fields) (PROJECT_IDENTITY_SYMBOLS.has(f.symbol) ? identity : specific).push(f);
  const order = [...PROJECT_IDENTITY_SYMBOLS];
  identity.sort((a, b) => order.indexOf(a.symbol) - order.indexOf(b.symbol));
  return { specific, identity };
}

/** localStorage key remembering the panel's open state per worksheet. */
export function upstreamPanelStorageKey(standardCode: string, worksheetCode: string): string {
  return `ekowai.upstreamPanel.${standardCode}.${worksheetCode}`;
}
