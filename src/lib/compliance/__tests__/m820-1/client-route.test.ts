/**
 * DWA-M 820-1 client route — the SHIPPED gate conditions and visible_when rules of the staged migration
 * scripts/migrations/20261005120000_m820_1_client_route.sql, read out of the file and evaluated with the REAL engine
 * (`evaluateCondition`, `computeVisibility`). Nothing is applied anywhere.
 *
 * Client cases (owner 2026-10-05 + amendment): public client · private client WITH public funding · private client WITHOUT
 * funding who applies the procedure voluntarily (Yes) · private client without funding who does not (No) · private client
 * without funding who has not answered yet. Sources ([Q1] § 7.2 L766 PDF p. 31, [Q3] § 8.7 L874 PDF p. 36, [Q4] Anh. B.2.3
 * L1325 PDF p. 52, [Q5] § 8.10.2.3 L965 PDF p. 40, [Q6] § 8.10.3.6 L1064 PDF p. 44) are quoted in the migration header.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateCondition } from '../../evaluate';
import { computeVisibility } from '../../visibility';
import { conditionFromSql, insertedFieldVisibleWhen, visibleWhenFromSql } from './sql-condition';

const FILE = resolve(__dirname, '../../../../../scripts/migrations/20261005120000_m820_1_client_route.sql');
const md5 = (s: string) => createHash('md5').update(s).digest('hex');

type V = string | number | boolean;
const lk = (vals: Record<string, V | undefined>) => (sym: string) => vals[sym];

// The live conditions of the 2026-10-05 prod dump (vault _baseline/2026-10-05_prod_DWA-M-820-1.encoding.json), verbatim.
const BASELINE: Record<string, string> = {
  'REQ-07': "(IF estimated_engineering_fee >= eu_threshold_value THEN threshold_status == 'oberschwellig') AND (IF threshold_status == 'oberschwellig' THEN estimated_engineering_fee >= eu_threshold_value)",
  'REQ-08': "IF oberschwellig_check == true THEN procurement_procedure == 'vgv_f'",
  'REQ-10': 'exclusion_123_gwb_checked == true',
  'REQ-22': 'information_letters_sent == true AND ((electronic_transmission == true AND standstill_period_days >= 10) OR (electronic_transmission == false AND standstill_period_days >= 15))',
  'REQ-26': 'information_letters_sent == true AND contract_invalidity_135_gwb_risk == false',
};
const G = "(client_organization_type != 'privat_ohne_foerderung' OR vergaberecht_freiwillig_angewendet == true)";
const EXPECTED: Record<string, string> = {
  'REQ-07': `IF ${G} THEN (${BASELINE['REQ-07']})`,
  'REQ-08': `IF ${G} THEN (${BASELINE['REQ-08']})`,
  'REQ-10': `IF ${G} AND procurement_procedure == 'vgv_f' THEN (${BASELINE['REQ-10']})`,
  'REQ-22': `IF ${G} AND threshold_status == 'oberschwellig' THEN (${BASELINE['REQ-22']})`,
  'REQ-26': `IF ${G} AND threshold_status == 'oberschwellig' THEN (${BASELINE['REQ-26']})`,
};
const shipped = (code: string) => conditionFromSql(FILE, code);

/** The five client situations. `bound` = the procurement checks must apply. */
const CLIENTS = {
  public: { client_organization_type: 'municipality', bound: true },
  private_funded: { client_organization_type: 'privat_mit_foerderung', bound: true },
  private_voluntary_yes: { client_organization_type: 'privat_ohne_foerderung', vergaberecht_freiwillig_angewendet: true, bound: true },
  private_no: { client_organization_type: 'privat_ohne_foerderung', vergaberecht_freiwillig_angewendet: false, bound: false },
} as const;
const clientVals = (c: (typeof CLIENTS)[keyof typeof CLIENTS]) => {
  const { bound: _b, ...rest } = c;
  void _b;
  return rest as Record<string, V>;
};

describe('M820-1 client route — the file ships exactly the guarded bodies', () => {
  it('each SET condition = IF <guard> THEN (<live body>) and its md5 guard is the md5 of the live body', () => {
    const sql = readFileSync(FILE, 'utf8');
    for (const code of Object.keys(BASELINE)) {
      expect(shipped(code), code).toBe(EXPECTED[code]);
      expect(sql.includes(`md5(cr.condition) = '${md5(BASELINE[code])}'`), `${code} md5 ${md5(BASELINE[code])}`).toBe(true);
    }
  });
  it('the new field is visible only for a private client without funding', () => {
    expect(insertedFieldVisibleWhen(FILE, 'vergaberecht_freiwillig_angewendet')).toBe("client_organization_type == 'privat_ohne_foerderung'");
  });
  it('the three VgV-F-only fields carry G AND procurement_procedure == vgv_f', () => {
    for (const s of ['publication_date', 'required_standstill_days', 'standstill_period_days']) {
      expect(visibleWhenFromSql(FILE, s), s).toBe(`${G} AND procurement_procedure == 'vgv_f'`);
    }
  });
});

describe('BROKEN BEFORE — the live gates block a private client without funding (S-01/S-02/S-03)', () => {
  const v = (code: string, vals: Record<string, V>) => evaluateCondition(BASELINE[code], lk(vals)).kind;
  it('REQ-10 fails for a direct award that ran no § 123 check', () => {
    expect(v('REQ-10', { exclusion_123_gwb_checked: false })).toBe('fail');
  });
  it('REQ-22 / REQ-26 fail when no information letters were sent (single bidder, below threshold)', () => {
    expect(v('REQ-22', { information_letters_sent: false, electronic_transmission: true, standstill_period_days: 0 })).toBe('fail');
    expect(v('REQ-26', { information_letters_sent: false, contract_invalidity_135_gwb_risk: false })).toBe('fail');
  });
});

describe('REQ-07 / REQ-08 — client guard only', () => {
  const req07Violating = { estimated_engineering_fee: 250000, eu_threshold_value: 214000, threshold_status: 'unterschwellig' };
  const req07Ok = { estimated_engineering_fee: 250000, eu_threshold_value: 214000, threshold_status: 'oberschwellig' };
  const req08Violating = { oberschwellig_check: true, procurement_procedure: 'direktvergabe' };
  const req08Ok = { oberschwellig_check: true, procurement_procedure: 'vgv_f' };
  for (const [name, c] of Object.entries(CLIENTS)) {
    it(`${name}: ${c.bound ? 'body decides (fail when violated, pass when met)' : 'pass regardless of the body'}`, () => {
      const base = clientVals(c);
      const r07v = evaluateCondition(shipped('REQ-07'), lk({ ...base, ...req07Violating })).kind;
      const r07o = evaluateCondition(shipped('REQ-07'), lk({ ...base, ...req07Ok })).kind;
      const r08v = evaluateCondition(shipped('REQ-08'), lk({ ...base, ...req08Violating })).kind;
      const r08o = evaluateCondition(shipped('REQ-08'), lk({ ...base, ...req08Ok })).kind;
      console.log(`[M820-1 unit] ${name} REQ-07 violating=${r07v} ok=${r07o} · REQ-08 violating=${r08v} ok=${r08o}`);
      expect([r07v, r07o, r08v, r08o]).toEqual(c.bound ? ['fail', 'pass', 'fail', 'pass'] : ['pass', 'pass', 'pass', 'pass']);
    });
  }
});

describe('REQ-10 — client guard AND procurement_procedure == vgv_f ([Q3])', () => {
  for (const [name, c] of Object.entries(CLIENTS)) {
    it(`${name}: vgv_f ${c.bound ? 'fail/pass by the body' : 'pass'}; suchverfahren / direktvergabe pass`, () => {
      const base = clientVals(c);
      const r = (procurement_procedure: string, exclusion_123_gwb_checked: boolean) =>
        evaluateCondition(shipped('REQ-10'), lk({ ...base, procurement_procedure, exclusion_123_gwb_checked })).kind;
      const got = [r('vgv_f', false), r('vgv_f', true), r('suchverfahren', false), r('direktvergabe', false)];
      console.log(`[M820-1 unit] ${name} REQ-10 vgv_f(unchecked/checked)=${got[0]}/${got[1]} such=${got[2]} direkt=${got[3]}`);
      expect(got).toEqual(c.bound ? ['fail', 'pass', 'pass', 'pass'] : ['pass', 'pass', 'pass', 'pass']);
    });
  }
});

describe('REQ-22 / REQ-26 — client guard AND threshold_status == oberschwellig ([Q4])', () => {
  const v22 = { information_letters_sent: true, electronic_transmission: true, standstill_period_days: 5 };
  const o22 = { information_letters_sent: true, electronic_transmission: false, standstill_period_days: 15 };
  const v26 = { information_letters_sent: false, contract_invalidity_135_gwb_risk: false };
  const o26 = { information_letters_sent: true, contract_invalidity_135_gwb_risk: false };
  for (const [name, c] of Object.entries(CLIENTS)) {
    it(`${name}: above the threshold ${c.bound ? 'the body decides' : 'pass'}; below the threshold pass`, () => {
      const base = clientVals(c);
      const r = (code: string, ts: string, vals: Record<string, V>) =>
        evaluateCondition(shipped(code), lk({ ...base, threshold_status: ts, ...vals })).kind;
      const got = [
        r('REQ-22', 'oberschwellig', v22), r('REQ-22', 'oberschwellig', o22), r('REQ-22', 'unterschwellig', v22),
        r('REQ-26', 'oberschwellig', v26), r('REQ-26', 'oberschwellig', o26), r('REQ-26', 'unterschwellig', v26),
      ];
      console.log(`[M820-1 unit] ${name} REQ-22 ober(viol/ok)=${got[0]}/${got[1]} unter=${got[2]} · REQ-26 ober(viol/ok)=${got[3]}/${got[4]} unter=${got[5]}`);
      expect(got).toEqual(c.bound ? ['fail', 'pass', 'pass', 'fail', 'pass', 'pass'] : ['pass', 'pass', 'pass', 'pass', 'pass', 'pass']);
    });
  }
});

describe('unanswered decision — no silent pass', () => {
  it('private without funding, decision not entered: every guarded gate is pending on vergaberecht_freiwillig_angewendet', () => {
    const vals = {
      client_organization_type: 'privat_ohne_foerderung', procurement_procedure: 'vgv_f', threshold_status: 'oberschwellig',
      exclusion_123_gwb_checked: false, information_letters_sent: false, contract_invalidity_135_gwb_risk: true,
      electronic_transmission: true, standstill_period_days: 0, oberschwellig_check: true,
      estimated_engineering_fee: 250000, eu_threshold_value: 214000,
    };
    for (const code of Object.keys(EXPECTED)) {
      const r = evaluateCondition(shipped(code), lk(vals));
      console.log(`[M820-1 unit] unanswered ${code} → ${JSON.stringify(r)}`);
      expect(r.kind, code).toBe('pending');
      expect(r.kind === 'pending' && r.missingSymbols, code).toEqual(['vergaberecht_freiwillig_angewendet']);
    }
  });
  it('client type not entered: pending on client_organization_type (a public client is never waved through by a blank)', () => {
    const r = evaluateCondition(shipped('REQ-10'), lk({ procurement_procedure: 'vgv_f', exclusion_123_gwb_checked: false }));
    expect(r.kind).toBe('pending');
  });
  it('a public client needs no answer to the hidden decision (OR short-circuits on the client type)', () => {
    const r = evaluateCondition(shipped('REQ-10'), lk({ client_organization_type: 'utility', procurement_procedure: 'vgv_f', exclusion_123_gwb_checked: false }));
    expect(r.kind).toBe('fail');
  });
});

describe('visible_when — the decision field and the VgV-F-only fields (real computeVisibility)', () => {
  const field = (id: string, symbol: string, visibleWhen: string) => ({ id, symbol, sectionId: null, visibleWhen });
  const hidden = (rule: string, vals: Record<string, V>) =>
    computeVisibility([field('f', 'x', rule)], [], lk(vals)).hiddenFieldIds.has('f');
  const decision = insertedFieldVisibleWhen(FILE, 'vergaberecht_freiwillig_angewendet');
  const vgvf = visibleWhenFromSql(FILE, 'standstill_period_days');

  it('the decision field shows only for privat_ohne_foerderung', () => {
    expect(hidden(decision, { client_organization_type: 'privat_ohne_foerderung' })).toBe(false);
    expect(hidden(decision, { client_organization_type: 'privat_mit_foerderung' })).toBe(true);
    expect(hidden(decision, { client_organization_type: 'municipality' })).toBe(true);
  });
  it('VgV-F-only fields: shown for a bound / voluntary client in VgV-F, hidden otherwise', () => {
    const rows: Array<[string, Record<string, V>, boolean]> = [
      ['public vgv_f', { client_organization_type: 'municipality', procurement_procedure: 'vgv_f' }, false],
      ['public suchverfahren', { client_organization_type: 'municipality', procurement_procedure: 'suchverfahren' }, true],
      ['public direktvergabe', { client_organization_type: 'municipality', procurement_procedure: 'direktvergabe' }, true],
      ['private funded vgv_f', { client_organization_type: 'privat_mit_foerderung', procurement_procedure: 'vgv_f' }, false],
      ['private yes vgv_f', { client_organization_type: 'privat_ohne_foerderung', vergaberecht_freiwillig_angewendet: true, procurement_procedure: 'vgv_f' }, false],
      ['private no vgv_f', { client_organization_type: 'privat_ohne_foerderung', vergaberecht_freiwillig_angewendet: false, procurement_procedure: 'vgv_f' }, true],
      ['private no direktvergabe', { client_organization_type: 'privat_ohne_foerderung', vergaberecht_freiwillig_angewendet: false, procurement_procedure: 'direktvergabe' }, true],
      ['private unanswered vgv_f (fail-safe visible)', { client_organization_type: 'privat_ohne_foerderung', procurement_procedure: 'vgv_f' }, false],
    ];
    for (const [label, vals, expectHidden] of rows) {
      const h = hidden(vgvf, vals);
      console.log(`[M820-1 unit] visible_when ${label} → ${h ? 'hidden' : 'visible'}`);
      expect(h, label).toBe(expectHidden);
    }
  });
  it('gate effect of the hiding: REQ-22 loses only the standstill atoms; REQ-18 loses only publication_date (no gate wholly n.a.)', () => {
    // public client, above the threshold, Direktvergabe (§ 8.8 L916) — standstill_period_days is hidden on M820-23
    const base = { client_organization_type: 'municipality', threshold_status: 'oberschwellig', electronic_transmission: true };
    const opts = { hiddenSymbols: new Set(['standstill_period_days']) };
    const ok = evaluateCondition(shipped('REQ-22'), lk({ ...base, information_letters_sent: true }), opts).kind;
    const bad = evaluateCondition(shipped('REQ-22'), lk({ ...base, information_letters_sent: false }), opts).kind;
    const req18 = "IF procurement_procedure == 'vgv_f' THEN (publication_date IS NOT NULL AND ted_notice_id IS NOT NULL)";
    const r18 = evaluateCondition(req18, lk({ procurement_procedure: 'vgv_f', ted_notice_id: 'TED-1' }), { hiddenSymbols: new Set(['publication_date']) }).kind;
    console.log(`[M820-1 unit] REQ-22 with standstill hidden: letters sent=${ok}, not sent=${bad} · REQ-18 with publication_date hidden, TED id given=${r18}`);
    expect([ok, bad, r18]).toEqual(['pass', 'fail', 'pass']);
  });
});
