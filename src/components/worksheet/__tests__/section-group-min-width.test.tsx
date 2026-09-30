// UI-1 regression (fix wave 2026-09-30): the section <fieldset> must not keep the browser default
// min-inline-size: min-content — otherwise a wide register table grows the section past the content
// column and the register's own overflow-x-auto box never scrolls (seen on the served FLLNT-04:
// fieldset 4027 px wide inside a 768 px article).
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SectionGroup } from '../section-group';

describe('SectionGroup fieldset width (UI-1)', () => {
  it('carries min-w-0 so a wide register scrolls inside its own box instead of widening the column', () => {
    const section = { id: 's1', code: 'C', titleDe: 'Inhalt', titleEn: null, orderIndex: 0, parentSectionId: null };
    const { container } = render(
      <SectionGroup
        section={section}
        allSections={[section]}
        visibleSectionIds={new Set(['s1'])}
        renderField={() => <div data-testid="field">x</div>}
        locale="de"
      />,
    );
    const fieldset = container.querySelector('fieldset');
    expect(fieldset).not.toBeNull();
    expect(fieldset!.className.split(/\s+/)).toContain('min-w-0');
  });
});
