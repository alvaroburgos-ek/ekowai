/**
 * C-9 (2026-10-14): documents list the phases not reached yet (phase drivers answered „Nein") and the duties (gates)
 * that were therefore not checked. Rule: a phase driver is a BOOLEAN field whose symbol matches
 * `phase_<name>_erreicht` (the encoding convention of block 20261008100000, ruling R-11); a gate counts as „not checked
 * because of" a driver when its verdict is a guard-skipped pass and the skipping guard reads that driver.
 */
import { describe, it, expect } from 'vitest';
import { collectPhaseDeferrals, isPhaseDriver, phaseDeferralLines } from '../phase-deferral';

const D = (symbol: string, value: unknown, extra: Partial<{ hidden: boolean; dataType: string; worksheetCode: string }> = {}) => ({
  worksheetCode: extra.worksheetCode ?? '820-2-20',
  symbol,
  labelDe: `Phase ${symbol}`,
  labelEn: `Phase ${symbol} (EN)`,
  dataType: extra.dataType ?? 'boolean',
  value,
  hidden: extra.hidden ?? false,
});
const G = (code: string, skippedBy: string[], worksheetCode = '820-2-20', readsSymbols: string[] = skippedBy, severity = 'block') =>
  ({ worksheetCode, code, titleDe: `Titel ${code}`, severity, skippedBy, readsSymbols });

describe('isPhaseDriver', () => {
  it('boolean + phase_<name>_erreicht only', () => {
    expect(isPhaseDriver({ symbol: 'phase_ausfuehrung_erreicht', dataType: 'boolean' })).toBe(true);
    expect(isPhaseDriver({ symbol: 'phase_gewaehrleistung_erreicht', dataType: 'boolean' })).toBe(true);
    expect(isPhaseDriver({ symbol: 'phase_ausfuehrung_erreicht', dataType: 'enum' })).toBe(false);
    expect(isPhaseDriver({ symbol: 'bauleistungen_vergeben', dataType: 'boolean' })).toBe(false);
    expect(isPhaseDriver({ symbol: 'pz_62_1_status', dataType: 'enum' })).toBe(false);
  });
});

describe('collectPhaseDeferrals', () => {
  it('lists every driver answered false with the gates its guard skipped; true / unanswered / hidden drivers are not listed', () => {
    const out = collectPhaseDeferrals(
      [
        D('phase_ausfuehrung_erreicht', false),
        D('phase_inbetriebnahme_erreicht', false, { worksheetCode: '820-2-22' }),
        D('phase_gewaehrleistung_erreicht', true, { worksheetCode: '820-2-24' }),
        D('phase_x_erreicht', null),
        D('phase_y_erreicht', false, { hidden: true }),
      ],
      [
        G('REQ-43', ['phase_ausfuehrung_erreicht']),
        G('REQ-47', ['phase_inbetriebnahme_erreicht'], '820-2-22'),
        G('REQ-48', ['phase_inbetriebnahme_erreicht'], '820-2-23'),
        G('REQ-44', []),
        G('REQ-46', ['bauleistungen_vergeben'], '820-2-22'),
      ],
    );
    expect(out.map((d) => d.symbol)).toEqual(['phase_ausfuehrung_erreicht', 'phase_inbetriebnahme_erreicht']);
    expect(out[0].gates.map((g) => g.code)).toEqual(['REQ-43']);
    expect(out[1].gates.map((g) => `${g.worksheetCode} ${g.code}`)).toEqual(['820-2-22 REQ-47', '820-2-23 REQ-48']);
  });

  it('a driver read on two sheets (820-2-20 and 820-2-21) is listed once', () => {
    const out = collectPhaseDeferrals([D('phase_ausfuehrung_erreicht', false), D('phase_ausfuehrung_erreicht', false, { worksheetCode: '820-2-21' })], []);
    expect(out).toHaveLength(1);
    expect(out[0].worksheetCode).toBe('820-2-20');
    expect(out[0].gates).toEqual([]);
  });

  it('no drivers ⇒ [] (every other standard unchanged)', () => {
    expect(collectPhaseDeferrals([D('bauleistungen_vergeben', false)], [G('REQ-46', ['bauleistungen_vergeben'])])).toEqual([]);
  });
});

describe('phaseDeferralLines (DE / EN document text)', () => {
  it('heading, driver line and duty list in both languages', () => {
    const t = phaseDeferralLines(collectPhaseDeferrals([D('phase_ausfuehrung_erreicht', false)], [G('REQ-43', ['phase_ausfuehrung_erreicht'])]));
    expect(t.headingDe).toBe('Noch nicht erreichte Phasen — nicht geprüft');
    expect(t.headingEn).toBe('Phases not reached yet — not checked');
    expect(t.items[0].de).toBe('820-2-20 · Phase phase_ausfuehrung_erreicht = Nein — nicht geprüft: 820-2-20 REQ-43 (blockierend) Titel REQ-43');
    expect(t.items[0].en).toBe('820-2-20 · Phase phase_ausfuehrung_erreicht (EN) = No — not checked: 820-2-20 REQ-43 (blocking) Titel REQ-43');
  });

  it('severity labels: warn → Warnung / warning; no raw token in the sentence', () => {
    const t = phaseDeferralLines(collectPhaseDeferrals([D('phase_ausfuehrung_erreicht', false)], [G('REQ-47', ['phase_ausfuehrung_erreicht'], '820-2-22', undefined, 'warn')]));
    expect(t.items[0].de).toContain('REQ-47 (Warnung)');
    expect(t.items[0].en).toContain('REQ-47 (warning)');
    expect(t.items[0].de).not.toMatch(/((warn|block))/);
  });

  it('tied gates skipped by an OUTER guard: named with the outer condition, never „keine daran gebundene Prüfung“', () => {
    const labels = new Map([['bauleistungen_vergeben', { labelDe: 'Bauleistungen vergeben', labelEn: 'Construction works awarded' }]]);
    const out = collectPhaseDeferrals(
      [D('phase_gewaehrleistung_erreicht', false, { worksheetCode: '820-2-24' })],
      [G('REQ-52', ['bauleistungen_vergeben'], '820-2-24', ['verantwortung_lph9', 'bauleistungen_vergeben', 'phase_gewaehrleistung_erreicht', 'defect_tracking_active'])],
      labels,
    );
    expect(out[0].gates).toEqual([]);
    expect(out[0].skippedElsewhere).toEqual([
      { worksheetCode: '820-2-24', code: 'REQ-52', titleDe: 'Titel REQ-52', titleEn: null, severity: 'block', by: [{ symbol: 'bauleistungen_vergeben', labelDe: 'Bauleistungen vergeben', labelEn: 'Construction works awarded' }] },
    ]);
    const t = phaseDeferralLines(out);
    expect(t.items[0].de).not.toContain('keine daran gebundene Prüfung');
    expect(t.items[0].de).toBe('820-2-24 · Phase phase_gewaehrleistung_erreicht = Nein — keine Prüfung durch diese Phase ausgesetzt; 820-2-24 REQ-52 (blockierend) Titel REQ-52 entfällt bereits wegen „Bauleistungen vergeben“ (bauleistungen_vergeben)');
    expect(t.items[0].en).toBe('820-2-24 · Phase phase_gewaehrleistung_erreicht (EN) = No — no check deferred by this phase; 820-2-24 REQ-52 (blocking) Titel REQ-52 is already skipped because of “Construction works awarded” (bauleistungen_vergeben)');
  });

  it('a driver without a tied gate says so', () => {
    const t = phaseDeferralLines(collectPhaseDeferrals([D('phase_ausfuehrung_erreicht', false)], []));
    expect(t.items[0].de).toContain('keine daran gebundene Prüfung');
    expect(t.items[0].en).toContain('no check tied to it');
  });
});
