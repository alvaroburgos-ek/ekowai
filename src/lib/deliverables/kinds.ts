/**
 * Deliverable-register kinds (roadmap Stage 10, AGB §3(2)) — pure module,
 * importable from client components and tests (no db / server-only imports).
 *
 * `kind` is plain text in the DB (deliverables.kind); this list is the
 * app-side vocabulary, mirroring the monitoring-core category pattern.
 */
export const DELIVERABLE_KINDS = [
  'bericht',
  'konformitaetserklaerung',
  'wertetabelle',
  'einreichungs_checkliste',
  'pruefmemo',
  'angebot',
  'kostenschaetzung',
  'vsme_export',
  'projektbericht',
] as const;

export type DeliverableKind = (typeof DELIVERABLE_KINDS)[number];

/** German display labels (UI-only — never stored). */
export const DELIVERABLE_KIND_LABELS: Record<DeliverableKind, string> = {
  bericht: 'Bericht',
  konformitaetserklaerung: 'Konformitätserklärung',
  wertetabelle: 'Wertetabelle',
  einreichungs_checkliste: 'Einreichungs-Checkliste',
  pruefmemo: 'Prüf-Memo',
  angebot: 'Angebot',
  kostenschaetzung: 'Kostenschätzung',
  vsme_export: 'VSME-Export',
  projektbericht: 'Projektbericht',
};

/** Label for a stored kind — falls back to the raw value for unknown rows. */
export function deliverableKindLabel(kind: string): string {
  return DELIVERABLE_KIND_LABELS[kind as DeliverableKind] ?? kind;
}
