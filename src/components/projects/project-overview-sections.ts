/** Ordered sections the project overview renders. */
export type OverviewSection =
  | 'standards'
  | 'vsme-report'
  | 'effort'
  | 'offers'
  | 'cost-estimates'
  | 'audit';

/**
 * Decide the project overview's section composition.
 *
 * The standards/guidelines list is ALWAYS the first, primary section — VSME
 * must never short-circuit past it (the 2026-06-27 regression). When the
 * project also links the VSME standard, the VSME report is surfaced as an
 * ADDITIONAL section; VSME's own worksheets remain enterable both from the
 * standards list and via the dedicated VSME tabs (see buildProjectTabs).
 */
export function projectOverviewSections(opts: { isVsme: boolean }): OverviewSection[] {
  const sections: OverviewSection[] = ['standards'];
  if (opts.isVsme) sections.push('vsme-report');
  // Effort logging (roadmap v2 §2.9) — additional section, always shown.
  sections.push('effort');
  // Angebots-Engine (Slice E1) — internal-only panel next to Aufwandserfassung.
  sections.push('offers');
  // Parametrische Kostenschätzung (Slice E2) — the client's build cost,
  // a deliverable; rendered AFTER Angebote (the two must stay separate).
  sections.push('cost-estimates');
  sections.push('audit');
  return sections;
}
