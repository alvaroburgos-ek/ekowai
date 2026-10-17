import { describe, it, expect } from 'vitest';
import { buildProjectTabs } from '../project-tabs';
const t = (k: string) => k;
describe('Fälle tab', () => {
  it('is absent by default (existing callers unchanged) and present when asked, before the report history', () => {
    expect(buildProjectTabs('/de/projects/X', t, false).some((x) => x.href.endsWith('/scenarios'))).toBe(false);
    const tabs = buildProjectTabs('/de/projects/X', t, false, { scenarios: true });
    const i = tabs.findIndex((x) => x.href === '/de/projects/X/scenarios');
    expect(tabs[i].label).toBe('projects.tabs.scenarios');
    expect(tabs[i + 1].href).toBe('/de/projects/X/reports');
  });
});
