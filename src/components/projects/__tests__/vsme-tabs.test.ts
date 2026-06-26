import { describe, it, expect } from 'vitest';
import { buildProjectTabs } from '../project-tabs';

const t = (k: string) => k;

describe('buildProjectTabs', () => {
  it('non-VSME: base tabs only (no worklist/emissions)', () => {
    const tabs = buildProjectTabs('/de/projects/X', t, false);
    expect(tabs.some((x) => x.href.endsWith('/vsme/worklist'))).toBe(false);
    expect(tabs.some((x) => x.href.endsWith('/vsme/emissions'))).toBe(false);
  });

  it('VSME: includes Worklist + Emissions tabs', () => {
    const tabs = buildProjectTabs('/de/projects/X', t, true);
    expect(tabs.some((x) => x.href.endsWith('/vsme/worklist'))).toBe(true);
    expect(tabs.some((x) => x.href.endsWith('/vsme/emissions'))).toBe(true);
  });

  it('VSME: worklist and emissions appear after overview (index 1 and 2)', () => {
    const tabs = buildProjectTabs('/de/projects/X', t, true);
    const overviewIdx = tabs.findIndex((x) => x.href === '/de/projects/X');
    const worklistIdx = tabs.findIndex((x) => x.href.endsWith('/vsme/worklist'));
    const emissionsIdx = tabs.findIndex((x) => x.href.endsWith('/vsme/emissions'));
    expect(worklistIdx).toBe(overviewIdx + 1);
    expect(emissionsIdx).toBe(overviewIdx + 2);
  });

  it('non-VSME: returns exactly 3 base tabs', () => {
    const tabs = buildProjectTabs('/de/projects/X', t, false);
    expect(tabs).toHaveLength(3);
  });

  it('VSME: returns 5 tabs total', () => {
    const tabs = buildProjectTabs('/de/projects/X', t, true);
    expect(tabs).toHaveLength(5);
  });
});
