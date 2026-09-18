/**
 * Plan 3 Task 12c — the GATE-AWARE guard of the field-config emitter: a field or
 * section `visible_when` is refused when a hidden symbol is read by a SAME-worksheet
 * `compliance_requirements.condition` (captured `prior.gates[…].symbols`) — a hidden
 * symbol is `null` for the engine and the gate silently stops enforcing (an
 * enforcement change ⇒ sign-off G-block, never an emitted default). The one
 * exemption: a gate `IF <driver> <op> <value> THEN …` whose guard is exactly the
 * rule's `visible_when`. A `parse_error` gate (symbols unknown) refuses
 * conservatively; a legacy prior without `gates` degrades with a CLI warning;
 * `gate_guard: 'warn'` turns refusals into `GATE-REFUSAL` warnings with identical SQL.
 */
import { describe, it, expect } from 'vitest';
import {
  emitFieldConfigSql, assertPriorSnapshot, gateReaders, guardExempts, priorSnapshotWarnings, parseHeaderArgs,
  type PriorSnapshot, type PriorFieldRow, type PriorGateRow,
} from '../regulation-tables/emit-field-configs-sql';

const row = (over: Partial<PriorFieldRow> = {}): PriorFieldRow => ({ enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: null, section_code: 'B', section_id_is_null: false, section_path: ['B'], ...over });
const gate = (condition: string, symbols: string[], severity = 'block'): PriorGateRow => ({ condition, severity, symbols });
const base = { standard: 'DWA-A-138-1', worksheet: 'A138-12', verification_quote: 'q' };
const DRIVER = "shaft_type == 'typ_B'";
const field = (symbol: string, visible_when: string = DRIVER) => ({ ...base, symbol, widget: 'scalar' as const, visible_when });
const section = (section_code: string, visible_when: string = DRIVER) => ({ ...base, section_code, visible_when });

/** A138-12 shape: A_min read by an unguarded block gate, d_S by a matching IF-guarded gate, k_f by a gate guarded on another driver. */
const prior: PriorSnapshot = {
  'A138-12 A_min': row(),
  'A138-12 max_d': row(),
  'A138-12 d_S': row(),
  'A138-12 k_f': row(),
  'A138-12 loose': row({ section_code: 'C', section_path: ['C'] }),
  'A138-12 nested': row({ section_code: 'B.1', section_path: ['B', 'B.1'] }),
  'A138-13 A_min': row(),
  sections: { 'A138-12 B': { visible_when: null }, 'A138-12 B.1': { visible_when: null, parent_code: 'B' }, 'A138-12 C': { visible_when: null } },
  equations: {},
  gates: {
    'A138-12 CR-01': gate('max_d IS NOT NULL AND A_min IS NOT NULL', ['A_min', 'max_d']),
    'A138-12 CR-02': gate("IF shaft_type == 'typ_B' THEN d_S >= 1", ['d_S', 'shaft_type'], 'warn'),
    'A138-12 CR-03': gate("IF method == 'manual' THEN k_f > 0", ['k_f', 'method']),
    'A138-12 CR-04': gate('nested >= 2', ['nested']),
    'A138-13 CR-01': gate('A_min > 0', ['A_min']),
  },
};

describe('gate-aware guard (Task 12c)', () => {
  it('unguarded gate: a visible_when hiding a symbol the gate reads is REFUSED, naming the gate code, severity and condition', () => {
    expect(gateReaders(prior, 'A138-12', 'A_min', DRIVER).map((r) => r.code)).toEqual(['CR-01']);
    expect(() => emitFieldConfigSql('x', [field('A_min')], [], prior)).toThrow(
      'A138-12 A_min: visible_when hides A_min read by gate CR-01 (block: "max_d IS NOT NULL AND A_min IS NOT NULL") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block',
    );
    // a gate on ANOTHER worksheet reading the same symbol name is not this worksheet's gate
    expect(gateReaders(prior, 'A138-13', 'A_min', DRIVER).map((r) => r.code)).toEqual(['CR-01']);
    expect(gateReaders(prior, 'A138-12', 'loose', DRIVER)).toEqual([]);
    expect(emitFieldConfigSql('x', [field('loose')], [], prior).up).toContain("f.symbol = 'loose'");
  });
  it('IF-guarded gate with the SAME driver / op / literal as the rule is exempt (the gate never fires while the field is hidden)', () => {
    expect(guardExempts("IF shaft_type == 'typ_B' THEN d_S >= 1", DRIVER)).toBe(true);
    expect(gateReaders(prior, 'A138-12', 'd_S', DRIVER)).toEqual([]);
    expect(emitFieldConfigSql('x', [field('d_S')], [], prior).up).toContain("f.symbol = 'd_S'");
  });
  it('IF-guarded gate on a DIFFERENT driver (or op, literal, quotedness, compound guard, non-IF) is refused', () => {
    expect(guardExempts("IF method == 'manual' THEN k_f > 0", DRIVER)).toBe(false);
    expect(() => emitFieldConfigSql('x', [field('k_f')], [], prior)).toThrow(/A138-12 k_f: visible_when hides k_f read by gate CR-03 \(block: "IF method == 'manual' THEN k_f > 0"\)/);
    expect(guardExempts("IF shaft_type != 'typ_B' THEN d_S >= 1", DRIVER)).toBe(false); // op
    expect(guardExempts("IF shaft_type == 'typ_A' THEN d_S >= 1", DRIVER)).toBe(false); // literal
    expect(guardExempts('IF shaft_type == typ_B THEN d_S >= 1', DRIVER)).toBe(false); // bare vs quoted
    expect(guardExempts("IF shaft_type == 'typ_B' AND k_f > 0 THEN d_S >= 1", DRIVER)).toBe(false); // compound guard
    expect(guardExempts('IF shaft_type IS NOT NULL THEN d_S >= 1', 'shaft_type IS NOT NULL')).toBe(false); // exists guard — compare only
    expect(guardExempts("shaft_type == 'typ_B' AND d_S >= 1", DRIVER)).toBe(false); // not an IF guard
    expect(guardExempts("IF shaft_type == 'typ_B' THEN d_S >= 1", "shaft_type == 'typ_B' AND x > 1")).toBe(false); // rule is compound
    expect(guardExempts('Engineer attestation', DRIVER)).toBe(false);
    // the exemption is per rule: a rule on a different driver hits CR-02 again
    expect(gateReaders(prior, 'A138-12', 'd_S', "method == 'manual'").map((r) => r.code)).toEqual(['CR-02']);
  });
  it('section rule: a DESCENDANT field read by a gate refuses the section; a section without gated fields passes', () => {
    expect(() => emitFieldConfigSql('x', [], [section('B')], prior)).toThrow(
      /section A138-12 B: visible_when on a section \(or a descendant of it\) hides A_min read by gate CR-01 \(block: "max_d IS NOT NULL AND A_min IS NOT NULL"\); hides max_d read by gate CR-01 \(block: "max_d IS NOT NULL AND A_min IS NOT NULL"\); hides k_f read by gate CR-03 \(block: "IF method == 'manual' THEN k_f > 0"\); hides nested read by gate CR-04 \(block: "nested >= 2"\) — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block/,
    );
    // d_S sits in B too but its gate is IF-guarded on the same driver — not named
    expect(() => emitFieldConfigSql('x', [], [section('B')], prior)).not.toThrow(/hides d_S/);
    expect(() => emitFieldConfigSql('x', [], [section('B.1')], prior)).toThrow(/section A138-12 B\.1: .*hides nested read by gate CR-04/);
    expect(emitFieldConfigSql('x', [], [section('C')], prior).up).toContain("ws.code = 'C'");
  });
  it('legacy prior without `gates`: accepted, and the CLI warning names the missing map', () => {
    const legacy: PriorSnapshot = { ...prior };
    delete legacy.gates;
    expect(gateReaders(legacy, 'A138-12', 'A_min', DRIVER)).toEqual([]);
    expect(emitFieldConfigSql('x', [field('A_min')], [section('B')], legacy).up).toContain("f.symbol = 'A_min'");
    expect(priorSnapshotWarnings('a138', legacy)).toEqual([expect.stringMatching(/^warning: a138\.prior\.json carries no "gates" map — the gate-aware guard \(Task 12c\) is OFF/)]);
    expect(priorSnapshotWarnings('a138', prior)).toEqual([]);
    const neither: PriorSnapshot = { ...legacy };
    delete neither.equations;
    expect(priorSnapshotWarnings('a138', neither).map((w) => w.split(' — ')[0])).toEqual(['warning: a138.prior.json carries no "equations" map', 'warning: a138.prior.json carries no "gates" map']);
  });
  it('parse_error gate: its symbols are unknown, so EVERY hidden symbol of that worksheet is refused, naming parse_error', () => {
    const p: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'A138-12 CR-09': { condition: 'Engineer attestation', severity: 'block', symbols: [], parse_error: true } } };
    expect(gateReaders(p, 'A138-12', 'loose', DRIVER)).toEqual([{ code: 'CR-09', gate: p.gates!['A138-12 CR-09'], reason: 'parse_error' }]);
    expect(() => emitFieldConfigSql('x', [field('loose')], [], p)).toThrow('A138-12 loose: visible_when hides loose read by gate CR-09 (block: "Engineer attestation" — parse_error, symbols unknown) — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block');
    // the IF-exemption never applies to a parse_error gate; the section rule on C is refused through it too
    expect(() => emitFieldConfigSql('x', [], [section('C')], p)).toThrow(/section A138-12 C: .*hides loose read by gate CR-09 .*parse_error/);
  });
  it('create entries run the same check (uniformity): a created symbol that a captured gate happens to read is refused', () => {
    const create = { section_code: 'B', label_de: 'L', data_type: 'number' as const, clause_reference: '§1', description: 'Plan 3: x' };
    const p: PriorSnapshot = { ...prior };
    delete (p as Record<string, unknown>)['A138-12 A_min'];
    expect(() => emitFieldConfigSql('x', [{ ...field('A_min'), create }], [], p)).toThrow(/A138-12 A_min: visible_when hides A_min read by gate CR-01/);
    expect(emitFieldConfigSql('x', [{ ...field('new_sym'), create }], [], p).up).toContain("'new_sym'");
  });
  it('gate_guard: "warn" turns every refusal into a GATE-REFUSAL warning; the SQL is byte-identical to a legacy-prior emit', () => {
    const legacy: PriorSnapshot = { ...prior };
    delete legacy.gates;
    const entries = [field('A_min'), field('d_S'), field('k_f'), field('loose')];
    const warn = emitFieldConfigSql('x', entries, [section('B'), section('C')], prior, { gate_guard: 'warn' });
    const ref = emitFieldConfigSql('x', entries, [section('B'), section('C')], legacy);
    expect(warn.up).toBe(ref.up);
    expect(warn.down).toBe(ref.down);
    expect(warn.warnings.map((w) => w.split(':')[0])).toEqual(['GATE-REFUSAL (warn mode) A138-12 A_min', 'GATE-REFUSAL (warn mode) A138-12 k_f', 'GATE-REFUSAL (warn mode) section A138-12 B']);
    expect(warn.warnings[0]).toContain('read by gate CR-01 (block: "max_d IS NOT NULL AND A_min IS NOT NULL") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block');
    // the producer guard is NOT relaxed by warn mode
    const producer: PriorSnapshot = { ...prior, 'A138-12 loose': row({ consumer_worksheets: ['A138-13'], section_code: 'C', section_path: ['C'] }) };
    expect(() => emitFieldConfigSql('x', [field('loose')], [], producer, { gate_guard: 'warn' })).toThrow(/consumed by A138-13/);
    expect(parseHeaderArgs(['--gate-guard=warn'])).toEqual({ gate_guard: 'warn' });
    expect(parseHeaderArgs(['--gated', 'a138-G-9', '--gate-guard=refuse'])).toEqual({ gated: 'a138-G-9', gate_guard: 'refuse' });
    expect(() => parseHeaderArgs(['--gate-guard=off'])).toThrow(/--gate-guard takes warn\|refuse/);
  });
  it('symbols match through normalizeSymbol (r_D(n) ↔ r_D_n), like the producer walk', () => {
    const p: PriorSnapshot = { 'A138-21 r_D_n': row(), gates: { 'A138-21 CR-05': gate('r_D(n) > 0', ['r_D(n)']) } };
    expect(gateReaders(p, 'A138-21', 'r_D_n', DRIVER).map((r) => r.code)).toEqual(['CR-05']);
    expect(gateReaders(p, 'A138-21', 'r_D(n)', DRIVER).map((r) => r.code)).toEqual(['CR-05']);
  });
  it('assertPriorSnapshot validates the gates map shape', () => {
    const bad = (gates: unknown) => ({ ...prior, gates }) as unknown as PriorSnapshot;
    expect(() => assertPriorSnapshot(bad({ nospace: gate('x > 0', ['x']) }))).toThrow(/keys are "<worksheet> <req_code>"/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': null }))).toThrow(/row must be an object/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': { condition: 1, severity: 'block', symbols: [] } }))).toThrow(/condition must be a string/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': { condition: 'x > 0', severity: null, symbols: [] } }))).toThrow(/severity must be a string/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': { condition: 'x > 0', severity: 'block', symbols: 'x' } }))).toThrow(/symbols must be a string array/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': { condition: 'x > 0', severity: 'block', symbols: [], parse_error: false } }))).toThrow(/parse_error must be true or absent/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': { condition: 'x > 0', severity: 'block', symbols: ['x'], parse_error: true } }))).toThrow(/a parse_error row carries no symbols/);
    expect(() => assertPriorSnapshot(prior)).not.toThrow();
  });
});
