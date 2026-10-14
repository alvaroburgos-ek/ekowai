/**
 * C-9 (2026-10-14): the „Noch nicht erreichte Phasen — nicht geprüft" section is rendered on the conformity declaration
 * and the checklist (ConformityData) and on the report / Prüf-Memo (StandardReportData); absent when nothing is open.
 */
import { describe, it, expect } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { ConformityDocument } from '@/components/pdf/conformity-document';
import { ChecklistDocument } from '@/components/pdf/checklist-document';
import { PruefmemoDocument } from '@/components/pdf/pruefmemo-document';
import { StandardReportDocument } from '@/components/pdf/standard-report-document';
import type { ConformityData } from '@/lib/pdf/load-conformity';
import { assembleStandardReport, type AssemblerInput } from '@/lib/pdf/assemble-standard-report';
import type { PhaseDeferral } from '@/lib/compliance/phase-deferral';
import { pageContents, decodeHexStrings } from './_pdf-text';

const DEFERRALS: PhaseDeferral[] = [
  {
    worksheetCode: '820-2-22',
    symbol: 'phase_inbetriebnahme_erreicht',
    labelDe: 'Phase Inbetriebnahme erreicht',
    labelEn: 'Phase commissioning reached',
    gates: [{ worksheetCode: '820-2-23', code: 'REQ-48', titleDe: 'Betriebsanweisungen vollstaendig', titleEn: 'Operating manuals complete', severity: 'block' }],
    skippedElsewhere: [],
  },
];

const conformity = (phaseDeferrals?: PhaseDeferral[]): ConformityData => ({
  eligible: true,
  konform: true,
  blocking: [],
  notApplicable: [],
  project: { id: 'p', name: 'P', projectCode: 'C1', clientName: null, location: null },
  standard: { code: 'DWA-M-820-2', titleDe: 'QS', version: '2026-02', issuedYear: 2026 },
  worksheets: [{ code: '820-2-22', titleDe: 'Inbetriebnahme', status: 'engineer_approved', failingBlockCodes: [] }],
  snapshots: [],
  clientSuppliedFields: [],
  letterhead: null,
  generatedAt: '2026-10-14T12:00:00.000Z',
  ...(phaseDeferrals ? { phaseDeferrals } : {}),
});

async function text(el: React.ReactElement): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = await renderToBuffer(el as any);
  return (await pageContents(buf)).map(decodeHexStrings).join('\n');
}

function reportData(withDeferrals: boolean) {
  const input = {
    project: { id: 'p', name: 'P', projectCode: 'C1', clientName: null, location: null, siteProfile: null, createdAt: '2026-10-01T00:00:00.000Z' },
    org: null,
    standard: { id: 's', code: 'DWA-M-820-2', titleDe: 'QS', version: '2026-02' },
    templates: [], instances: [], sections: [], fields: [], equations: [], compliance: [], parameters: [],
    documents: [], approvals: [], audits: [], now: new Date('2026-10-14T12:00:00.000Z'),
  } as AssemblerInput;
  const d = assembleStandardReport(input);
  return withDeferrals ? { ...d, phaseDeferrals: DEFERRALS } : d;
}

describe('PhaseDeferralsSection in the documents', () => {
  it('conformity declaration lists the phase and the unchecked duty (DE + EN)', async () => {
    const t = await text(<ConformityDocument data={conformity(DEFERRALS)} />);
    expect(t).toContain('Phases not reached yet');
    expect(t).toContain('820-2-23 REQ-48');
    expect(t).toContain('not checked');
  });

  it('conformity declaration without open phases: no section', async () => {
    expect(await text(<ConformityDocument data={conformity()} />)).not.toContain('Phases not reached yet');
    expect(await text(<ConformityDocument data={conformity([])} />)).not.toContain('Phases not reached yet');
  });

  it('checklist lists it too', async () => {
    expect(await text(<ChecklistDocument data={conformity(DEFERRALS)} />)).toContain('820-2-23 REQ-48');
  });

  it('standard report and Pruef-Memo list it; absent without deferrals', async () => {
    expect(await text(<StandardReportDocument data={reportData(true)} />)).toContain('820-2-23 REQ-48');
    expect(await text(<PruefmemoDocument data={reportData(true)} />)).toContain('820-2-23 REQ-48');
    expect(await text(<StandardReportDocument data={reportData(false)} />)).not.toContain('Phases not reached yet');
  });
});
