/**
 * Plan 3 Task 12c — the GATE-AWARE guard of the field-config emitter: a field or
 * section `visible_when` is refused when a hidden symbol is read by a SAME-worksheet
 * `compliance_requirements.condition` (captured `prior.gates[…].symbols`) — a hidden
 * symbol is `null` for the engine and the gate silently stops enforcing (an
 * enforcement change ⇒ sign-off G-block, never an emitted default). The one
 * exemption: a gate `IF <driver> <op> <value> THEN …` whose guard is exactly the
 * rule's `visible_when` (round 2: a bare literal equals a quoted one when no field of
 * that name exists on the worksheet). A `parse_error` gate (symbols unknown) refuses
 * conservatively (round 2: an EMPTY condition is `manual` and never refuses); a legacy
 * prior without `gates` degrades with a CLI warning; `gate_guard: 'warn'` turns refusals
 * into `GATE-REFUSAL` warnings with identical SQL.
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
    expect(guardExempts('IF shaft_type == typ_B THEN d_S >= 1', DRIVER)).toBe(false); // bare vs quoted — conservative default without a prior (round 2 test below covers the equivalence)
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
  it('round 2: an EMPTY (or whitespace) condition is `manual` whatever is hidden — captured as parse_error, but never a refusal', () => {
    const empty = (condition: string): PriorSnapshot => ({ ...prior, gates: { ...prior.gates, 'A138-12 CR-08': { condition, severity: 'warn', symbols: [], parse_error: true } } });
    for (const cond of ['', '   ', '\n\t']) {
      expect(gateReaders(empty(cond), 'A138-12', 'loose', DRIVER)).toEqual([]);
      expect(emitFieldConfigSql('x', [field('loose')], [section('C')], empty(cond)).up).toContain("f.symbol = 'loose'");
      expect(emitFieldConfigSql('x', [field('loose')], [], empty(cond), { gate_guard: 'warn' }).warnings).toEqual([]);
    }
    // a prose parse_error still refuses (the rule above), and an empty gate never masks a real reader on the same worksheet
    expect(() => emitFieldConfigSql('x', [field('A_min')], [], empty(''))).toThrow(/read by gate CR-01 /);
    expect(() => emitFieldConfigSql('x', [field('A_min')], [], empty(''))).not.toThrow(/CR-08/);
  });
  it('round 2: bare ↔ quoted literal equivalence in the IF-guard — equal when NO field of that name exists on the worksheet, refused when one does', () => {
    const bareGate = 'IF shaft_type == typ_B THEN d_S >= 1';
    // library default (no prior): conservative — the bare token is assumed resolvable ⇒ not exempt
    expect(guardExempts(bareGate, DRIVER)).toBe(false);
    expect(guardExempts(bareGate, DRIVER, () => false)).toBe(true); // no such field ⇒ same literal
    expect(guardExempts(bareGate, DRIVER, (tok) => tok === 'typ_B')).toBe(false); // a field typ_B exists ⇒ resolves ⇒ refuse
    // vice versa: quoted gate literal, bare rule literal
    expect(guardExempts("IF shaft_type == 'typ_B' THEN d_S >= 1", 'shaft_type == typ_B', () => false)).toBe(true);
    expect(guardExempts("IF shaft_type == 'typ_B' THEN d_S >= 1", 'shaft_type == typ_B', () => true)).toBe(false);
    // both bare (same token) is the same literal regardless of fields; a different token never is
    expect(guardExempts(bareGate, 'shaft_type == typ_B')).toBe(true);
    expect(guardExempts(bareGate, "shaft_type == 'typ_A'", () => false)).toBe(false);
    // through the prior: A138-12 has no field `typ_B` ⇒ exempt; add one ⇒ refused, naming the gate
    const p: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'A138-12 CR-02': gate(bareGate, ['d_S', 'shaft_type'], 'warn') } };
    expect(gateReaders(p, 'A138-12', 'd_S', DRIVER)).toEqual([]);
    expect(emitFieldConfigSql('x', [field('d_S')], [], p).up).toContain("f.symbol = 'd_S'");
    const withField: PriorSnapshot = { ...p, 'A138-12 typ_B': row() };
    expect(gateReaders(withField, 'A138-12', 'd_S', DRIVER).map((r) => r.code)).toEqual(['CR-02']);
    expect(() => emitFieldConfigSql('x', [field('d_S')], [], withField)).toThrow(/A138-12 d_S: visible_when hides d_S read by gate CR-02 \(warn: "IF shaft_type == typ_B THEN d_S >= 1"\)/);
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
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': { condition: 'x > 0', severity: 7, symbols: [] } }))).toThrow(/severity must be a string\/null/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': { condition: 'x > 0', severity: null, symbols: [] } }))).not.toThrow(); // round 3: null tolerated (prod has none)
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': { condition: 'x > 0', severity: 'block', symbols: 'x' } }))).toThrow(/symbols must be a string array/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': { condition: 'x > 0', severity: 'block', symbols: [], parse_error: false } }))).toThrow(/parse_error must be true or absent/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 CR-01': { condition: 'x > 0', severity: 'block', symbols: ['x'], parse_error: true } }))).toThrow(/a parse_error row carries no symbols/);
    expect(() => assertPriorSnapshot(prior)).not.toThrow();
  });
  it('round 3: a gate reads the hidden symbol through a BARE-ident == / != RHS too (the runtime pre-check hiddenReferences) — refused when that ident is a field the rule hides, not a reader otherwise', () => {
    // FLL-GAR-10 shape: the gate compares a driver against a bare token that is ALSO a field of the worksheet
    const p: PriorSnapshot = {
      'S-01 x': row(), 'S-01 y': row(), 'S-01 z': row({ section_code: 'C', section_path: ['C'] }),
      sections: { 'S-01 B': { visible_when: null }, 'S-01 C': { visible_when: null } },
      gates: { 'S-01 CR-01': gate('x == y', ['x']), 'S-01 CR-02': gate("x == 'y'", ['x']), 'S-01 CR-03': gate('x != y AND z > 0', ['x', 'z']) },
    };
    const rule = (symbol: string) => ({ standard: 'S', worksheet: 'S-01', symbol, widget: 'scalar' as const, visible_when: DRIVER, verification_quote: 'q' });
    // y is a field and the rule hides it: CR-01 (bare RHS) and CR-03 (bare RHS in a conjunction) read it; the quoted CR-02 does not
    expect(gateReaders(p, 'S-01', 'y', DRIVER).map((r) => r.code)).toEqual(['CR-01', 'CR-03']);
    expect(() => emitFieldConfigSql('x', [rule('y')], [], p)).toThrow(/S-01 y: visible_when hides y read by gate CR-01 \(block: "x == y"\), CR-03 \(block: "x != y AND z > 0"\)/);
    expect(() => emitFieldConfigSql('x', [rule('y')], [], p)).not.toThrow(/CR-02/);
    // hiding another symbol: the bare RHS is not about it — not a reader (CR-03 reads z via its captured symbols only)
    expect(gateReaders(p, 'S-01', 'z', DRIVER).map((r) => r.code)).toEqual(['CR-03']);
    expect(gateReaders(p, 'S-01', 'x', DRIVER).map((r) => r.code)).toEqual(['CR-01', 'CR-02', 'CR-03']);
    // a gate whose bare RHS names a token that is NOT a field of the worksheet reads nothing through it
    const q: PriorSnapshot = { ...p, gates: { 'S-01 CR-09': gate('x == other', ['x']) } };
    expect(gateReaders(q, 'S-01', 'y', DRIVER)).toEqual([]);
    expect(emitFieldConfigSql('x', [rule('y')], [], q).up).toContain("f.symbol = 'y'");
    // the section rule over B (x, y) is refused through y's bare-RHS readers
    expect(() => emitFieldConfigSql('x', [], [{ standard: 'S', worksheet: 'S-01', section_code: 'B', visible_when: DRIVER, verification_quote: 'q' }], p)).toThrow(/section S-01 B: .*hides y read by gate CR-01/);
  });
  it('round 3: the bare-literal rule sees this batch\'s CREATED fields and INHERITED fields, not only the captured rows of the worksheet', () => {
    const bareGate = 'IF shaft_type == typ_B THEN d_S >= 1';
    const p: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'A138-12 CR-02': gate(bareGate, ['d_S', 'shaft_type'], 'warn') } };
    const create = { section_code: 'B', label_de: 'L', data_type: 'number' as const, clause_reference: '§1', description: 'Plan 3: x' };
    // captured rows only ⇒ exempt (round 2)
    expect(emitFieldConfigSql('x', [field('d_S')], [], p).up).toContain("f.symbol = 'd_S'");
    // the same batch CREATES a field typ_B on A138-12 ⇒ the bare token resolves ⇒ not the same literal ⇒ refused
    const createdTypB = { ...base, symbol: 'typ_B', widget: 'scalar' as const, verification_quote: 'q', create };
    expect(() => emitFieldConfigSql('x', [field('d_S'), createdTypB], [], p)).toThrow(/A138-12 d_S: visible_when hides d_S read by gate CR-02 \(warn: "IF shaft_type == typ_B THEN d_S >= 1"\)/);
    expect(gateReaders(p, 'A138-12', 'd_S', DRIVER, new Set(['A138-12 typ_B'])).map((r) => r.code)).toEqual(['CR-02']);
    expect(gateReaders(p, 'A138-12', 'd_S', DRIVER, new Set(['A138-13 typ_B']))).toEqual([]); // a create on another worksheet does not resolve here
    // a field typ_B owned by A138-13 and INHERITED by A138-12 (consumer_worksheets) resolves too ⇒ refused
    const inherited: PriorSnapshot = { ...p, 'A138-13 typ_B': row({ consumer_worksheets: ['A138-12'] }) };
    expect(gateReaders(inherited, 'A138-12', 'd_S', DRIVER).map((r) => r.code)).toEqual(['CR-02']);
    const notInherited: PriorSnapshot = { ...p, 'A138-13 typ_B': row({ consumer_worksheets: ['A138-14'] }) };
    expect(gateReaders(notInherited, 'A138-12', 'd_S', DRIVER)).toEqual([]);
  });
  it('round 3: a section rule also covers the batch\'s CREATED fields landing in the hidden section tree (a created field read through a bare-ident RHS)', () => {
    const p: PriorSnapshot = {
      'S-01 status': row({ section_code: 'A', section_path: ['A'] }),
      sections: { 'S-01 A': { visible_when: null }, 'S-01 B': { visible_when: null }, 'S-01 B.1': { visible_when: null, parent_code: 'B' }, 'S-01 C': { visible_when: null } },
      gates: { 'S-01 CR-01': gate('status == neu', ['status']) },
    };
    const mk = (section_code: string) => ({ standard: 'S', worksheet: 'S-01', symbol: 'neu', widget: 'scalar' as const, verification_quote: 'q', create: { section_code, label_de: 'L', data_type: 'number' as const, clause_reference: '§1', description: 'Plan 3: x' } });
    const sec = (section_code: string) => ({ standard: 'S', worksheet: 'S-01', section_code, visible_when: DRIVER, verification_quote: 'q' });
    // created `neu` lands in B.1 (descendant of B): hiding B hides it, and CR-01 reads it through the bare RHS ⇒ refused
    expect(() => emitFieldConfigSql('x', [mk('B.1')], [sec('B')], p)).toThrow(/section S-01 B: visible_when on a section \(or a descendant of it\) hides neu read by gate CR-01 \(block: "status == neu"\)/);
    expect(() => emitFieldConfigSql('x', [mk('B.1')], [sec('B.1')], p)).toThrow(/section S-01 B\.1: .*hides neu read by gate CR-01/);
    // created in C: hiding B does not touch it; without the create the bare token is not a field and B passes
    expect(emitFieldConfigSql('x', [mk('C')], [sec('B')], p).up).toContain("ws.code = 'B'");
    expect(emitFieldConfigSql('x', [], [sec('B')], p).up).toContain("ws.code = 'B'");
  });
});
