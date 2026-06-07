'use client';
import type { ReactNode } from 'react';

type Section = {
  id: string;
  code: string | null;
  titleDe: string;
  titleEn: string | null;
  orderIndex: number;
  parentSectionId: string | null;
};

type Props = {
  section: Section;
  allSections: Section[];
  /** Ids of sections that hold a visible field (directly or via a descendant).
   * Sections absent from this set are empty scaffold headers and are hidden. */
  visibleSectionIds: Set<string>;
  renderField: (sectionId: string | null) => ReactNode;
  locale: 'de' | 'en';
};

export function SectionGroup({ section, allSections, visibleSectionIds, renderField, locale }: Props) {
  // Empty scaffold section — nothing to collect here, so don't render a header.
  if (!visibleSectionIds.has(section.id)) return null;

  const childSections = allSections
    .filter((s) => s.parentSectionId === section.id && visibleSectionIds.has(s.id))
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const title = locale === 'de' ? section.titleDe : section.titleEn ?? section.titleDe;

  return (
    <fieldset className="space-y-6 border-l border-hairline pl-4">
      <legend className="text-xs uppercase tracking-[0.2em] text-subtext px-1">
        {section.code ? `${section.code} · ${title}` : title}
      </legend>
      <div className="space-y-4">{renderField(section.id)}</div>
      {childSections.map((child) => (
        <SectionGroup
          key={child.id}
          section={child}
          allSections={allSections}
          visibleSectionIds={visibleSectionIds}
          renderField={renderField}
          locale={locale}
        />
      ))}
    </fieldset>
  );
}
