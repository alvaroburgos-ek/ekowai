import { describe, it, expect } from 'vitest';
import { projectOverviewSections } from '../project-overview-sections';

// Regression guard for the VSME-overview bug (2026-06-27): a project that links
// the VSME standard must NOT short-circuit past the guidelines. The standards/
// guidelines list is ALWAYS part of the project overview; VSME is an ADDITIONAL
// section, never a replacement. A project with both VSME and 138 shows BOTH,
// each enterable as its own section.
describe('projectOverviewSections', () => {
  it('always includes the standards/guidelines list (non-VSME project)', () => {
    expect(projectOverviewSections({ isVsme: false })).toContain('standards');
  });

  it('still includes the standards list when the project ALSO has VSME (no short-circuit)', () => {
    const sections = projectOverviewSections({ isVsme: true });
    expect(sections).toContain('standards');
    expect(sections).toContain('vsme-report');
  });

  it('renders the standards/guidelines list FIRST — guidelines are the primary section', () => {
    expect(projectOverviewSections({ isVsme: true })[0]).toBe('standards');
  });

  it('omits the VSME section when the project has no VSME standard', () => {
    expect(projectOverviewSections({ isVsme: false })).not.toContain('vsme-report');
  });
});
