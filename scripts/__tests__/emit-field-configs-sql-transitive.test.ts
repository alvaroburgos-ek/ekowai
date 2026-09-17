/**
 * Plan 3 Task 3 fix round 1 — the TRANSITIVE producer guard: a field or
 * section `visible_when` is refused when it would hide a symbol that feeds a
 * same-worksheet equation whose output (directly, or through further
 * same-worksheet equations) is a field another worksheet consumes. Walked over
 * the captured `prior.equations`; the message names the chain. A legacy prior
 * without `equations` degrades to the direct rule.
 */
import { describe, it, expect } from 'vitest';
import { emitFieldConfigSql, assertPriorSnapshot, producerChain, type PriorSnapshot, type PriorFieldRow } from '../regulation-tables/emit-field-configs-sql';

const row = (over: Partial<PriorFieldRow> = {}): PriorFieldRow => ({ enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: null, section_code: 'B', section_id_is_null: false, section_path: ['B'], ...over });
const base = { standard: 'DWA-A-262E', worksheet: 'A262-06', verification_quote: 'q' };
const field = (symbol: string) => ({ ...base, symbol, widget: 'scalar' as const, visible_when: "sewer_system_type == 'combined_sewer'" });
const section = (section_code: string) => ({ standard: 'DWA-A-262E', worksheet: 'A262-06', section_code, visible_when: "sewer_system_type == 'combined_sewer'", verification_quote: 'q' });

/** The real A262-06 shape (capture 2026-09-17): m_T_aM → Gl.10 Q_F_d_aM (consumed by A262-09) → Gl.9 Q_T_d_aM (consumed by four worksheets). */
const a26206: PriorSnapshot = {
  'A262-06 m_T_aM': row(),
  'A262-06 f_S_QM': row(),
  'A262-06 Q_Dr_RU': row(),
  'A262-06 Q_F_d_aM': row({ consumer_worksheets: ['A262-09'], section_code: 'D', section_path: ['D'] }),
  'A262-06 Q_T_d_aM': row({ consumer_worksheets: ['A262-07', 'A262-09', 'A262-27', 'A262-28'], section_code: 'F', section_path: ['F'] }),
  'A262-06 Q_M': row({ consumer_worksheets: ['A262-07', 'A262-09'], section_code: 'F', section_path: ['F'] }),
  'A262-06 loose': row({ section_code: 'C', section_path: ['C'] }),
  sections: { 'A262-06 B': { visible_when: null }, 'A262-06 C': { visible_when: null }, 'A262-06 D': { visible_when: null }, 'A262-06 F': { visible_when: null } },
  equations: {
    'A262-06 10': { id: 'e10', output_symbol: 'Q_F_d_aM', input_symbols: ['m_T_aM', 'Q_S_d_aM'] },
    'A262-06 9': { id: 'e9', output_symbol: 'Q_T_d_aM', input_symbols: ['Q_S_d_aM', 'Q_F_d_aM'] },
    'A262-06 6': { id: 'e6', output_symbol: 'Q_M', input_symbols: ['f_S_QM', 'Q_S_d_aM', 'Q_F'] },
    'A262-06 8': { id: 'e8', output_symbol: 'Q_M', input_symbols: ['Q_Dr_RU', 'Q_krit'] },
  },
};

describe('transitive producer guard (Task 3 fix round 1)', () => {
  it('direct producer: still refused, chain names the symbol only', () => {
    expect(producerChain(a26206, 'A262-06', 'Q_F_d_aM')).toBe('Q_F_d_aM (consumed by A262-09)');
    expect(() => emitFieldConfigSql('x', [field('Q_F_d_aM')], [], a26206)).toThrow(/A262-06 Q_F_d_aM: visible_when on a symbol consumed by another worksheet — hides Q_F_d_aM \(consumed by A262-09\)/);
  });
  it('one-hop chain: an input of an equation whose output is consumed is refused and named', () => {
    expect(producerChain(a26206, 'A262-06', 'f_S_QM')).toBe('f_S_QM → Gl.6 Q_M (consumed by A262-07, A262-09)');
    expect(() => emitFieldConfigSql('x', [field('f_S_QM')], [], a26206)).toThrow(/hides f_S_QM → Gl\.6 Q_M \(consumed by A262-07, A262-09\)/);
  });
  it('two-hop chain: m_T_aM → Gl.10 Q_F_d_aM (consumed) — the FIRST consumed output ends the chain; a deeper walk reaches Gl.9 when the hop is not consumed', () => {
    expect(producerChain(a26206, 'A262-06', 'm_T_aM')).toBe('m_T_aM → Gl.10 Q_F_d_aM (consumed by A262-09)');
    const twoHop: PriorSnapshot = { ...a26206, 'A262-06 Q_F_d_aM': row({ consumer_worksheets: null, section_code: 'D', section_path: ['D'] }) };
    expect(producerChain(twoHop, 'A262-06', 'm_T_aM')).toBe('m_T_aM → Gl.10 Q_F_d_aM → Gl.9 Q_T_d_aM (consumed by A262-07, A262-09, A262-27, A262-28)');
    expect(() => emitFieldConfigSql('x', [field('m_T_aM')], [], twoHop)).toThrow(/hides m_T_aM → Gl\.10 Q_F_d_aM → Gl\.9 Q_T_d_aM \(consumed by A262-07, A262-09, A262-27, A262-28\)/);
  });
  it('a chain broken by a symbol with no consumers is NOT refused; a symbol feeding nothing is NOT refused', () => {
    const broken: PriorSnapshot = {
      ...a26206,
      'A262-06 Q_F_d_aM': row({ consumer_worksheets: null, section_code: 'D', section_path: ['D'] }),
      'A262-06 Q_T_d_aM': row({ consumer_worksheets: [], section_code: 'F', section_path: ['F'] }),
    };
    expect(producerChain(broken, 'A262-06', 'm_T_aM')).toBeNull();
    expect(emitFieldConfigSql('x', [field('m_T_aM')], [], broken).up).toContain("f.symbol = 'm_T_aM'");
    expect(producerChain(a26206, 'A262-06', 'loose')).toBeNull();
    expect(emitFieldConfigSql('x', [field('loose')], [], a26206).up).toContain("f.symbol = 'loose'");
  });
  it('section rule: refused through the chain of any field in the section tree; a section without such fields passes', () => {
    expect(() => emitFieldConfigSql('x', [], [section('B')], a26206)).toThrow(/section A262-06 B: .*m_T_aM → Gl\.10 Q_F_d_aM \(consumed by A262-09\); f_S_QM → Gl\.6 Q_M \(consumed by A262-07, A262-09\); Q_Dr_RU → Gl\.8 Q_M \(consumed by A262-07, A262-09\)/);
    expect(emitFieldConfigSql('x', [], [section('C')], a26206).up).toContain("ws.code = 'C'");
  });
  it('an equation output that is the hidden symbol itself does not loop (cycle-safe); an equation on ANOTHER worksheet is ignored', () => {
    const cyc: PriorSnapshot = {
      'S-01 a': row(), 'S-01 b': row(),
      equations: { 'S-01 1': { output_symbol: 'b', input_symbols: ['a'] }, 'S-01 2': { output_symbol: 'a', input_symbols: ['b'] }, 'S-02 3': { output_symbol: 'c', input_symbols: ['a'] } },
      'S-02 c': row({ consumer_worksheets: ['S-03'] }),
    };
    expect(producerChain(cyc, 'S-01', 'a')).toBeNull();
  });
  it('the Plan-2a rewrite remap is honoured: a register symbol reaches a bridged A138-07 producer even when the stored input_symbols lack it', () => {
    const prior: PriorSnapshot = {
      'A138-07 surface_inventory': row(),
      'A138-07 A_C': row({ consumer_worksheets: ['A138-10', 'A138-13'] }),
      equations: { 'A138-07 2': { id: 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0', output_symbol: 'A_C', input_symbols: ['A_E_i', 'C_i'] } },
    };
    expect(producerChain(prior, 'A138-07', 'surface_inventory')).toBe('surface_inventory → Gl.2 A_C (consumed by A138-10, A138-13)');
    expect(producerChain(prior, 'A138-07', 'A_E_i')).toBe('A_E_i → Gl.2 A_C (consumed by A138-10, A138-13)');
  });
  it('legacy prior without `equations`: the guard degrades to the direct rule (the transitive case passes)', () => {
    const legacy: PriorSnapshot = { ...a26206 };
    delete legacy.equations;
    expect(producerChain(legacy, 'A262-06', 'm_T_aM')).toBeNull();
    expect(emitFieldConfigSql('x', [field('m_T_aM')], [], legacy).up).toContain("f.symbol = 'm_T_aM'");
    expect(() => emitFieldConfigSql('x', [field('Q_F_d_aM')], [], legacy)).toThrow(/hides Q_F_d_aM \(consumed by A262-09\)/);
  });
  it('(a) symbols match through normalizeSymbol: a stored input "r_D(n)" reaches the hidden field r_D_n and vice versa', () => {
    const prior: PriorSnapshot = {
      'A138-21 r_D_n': row(), 'A138-21 k_f_FS': row(),
      'A138-21 h_S': row({ consumer_worksheets: ['A138-23', 'A138-24'] }),
      equations: { 'A138-21 40': { id: 'e40', output_symbol: 'h_S', input_symbols: ['A_C', 'r_D(n)', 'd_i', 'k_f_FS', 'D', 'f_Z'] } },
    };
    expect(producerChain(prior, 'A138-21', 'r_D_n')).toBe('r_D_n → Gl.40 h_S (consumed by A138-23, A138-24)');
    expect(producerChain(prior, 'A138-21', 'r_D(n)')).toBe('r_D(n) → Gl.40 h_S (consumed by A138-23, A138-24)');
    expect(producerChain(prior, 'A138-21', 'k_f_FS')).toBe('k_f_FS → Gl.40 h_S (consumed by A138-23, A138-24)');
    // a function-like OUTPUT is found under its normalised field key too
    const fn: PriorSnapshot = { 'S-01 a': row(), 'S-01 f_x': row({ consumer_worksheets: ['S-02'] }), equations: { 'S-01 1': { output_symbol: 'f(x)', input_symbols: ['a'] } } };
    expect(producerChain(fn, 'S-01', 'a')).toBe('a → Gl.1 f(x) (consumed by S-02)');
  });
  it('(b) a CREATED field with visible_when runs the chain walk (it may complete a dangling input of a consumed equation); its own consumers are not checked', () => {
    const prior: PriorSnapshot = {
      'A262-24 B_CSB_KomKA': row({ consumer_worksheets: ['A262-21'] }),
      equations: { 'A262-24 A262-24-D1': { output_symbol: 'B_CSB_KomKA', input_symbols: ['EZ', 'B_CSB'] } },
      sections: { 'A262-24 D': { visible_when: null } },
    };
    const create = { section_code: 'D', label_de: 'L', data_type: 'number' as const, clause_reference: '§1', description: 'Plan 3: x' };
    const entry = { standard: 'DWA-A-262E', worksheet: 'A262-24', symbol: 'B_CSB', widget: 'scalar' as const, visible_when: 'x == 1', verification_quote: 'q', create };
    expect(producerChain(prior, 'A262-24', 'B_CSB', { skipDirect: true })).toBe('B_CSB → A262-24-D1 B_CSB_KomKA (consumed by A262-21)');
    expect(() => emitFieldConfigSql('x', [entry], [], prior)).toThrow(/A262-24 B_CSB: visible_when on a symbol consumed by another worksheet — hides B_CSB → A262-24-D1 B_CSB_KomKA \(consumed by A262-21\)/);
    // skipDirect: a created symbol that happens to share a key with a consumed prior row is not refused on the direct rule alone
    expect(producerChain({ 'S-01 n': row({ consumer_worksheets: ['S-02'] }) }, 'S-01', 'n', { skipDirect: true })).toBeNull();
    expect(emitFieldConfigSql('x', [{ ...entry, symbol: 'loose', worksheet: 'A262-24' }], [], prior).up).toContain("'loose'");
  });
  it('(c) a chain whose only consumer is the owner worksheet itself is still refused and says so', () => {
    const prior: PriorSnapshot = {
      'DIN-1989-1-04 A_A': row(), 'DIN-1989-1-04 E_R': row({ consumer_worksheets: ['DIN-1989-1-04'] }),
      equations: { 'DIN-1989-1-04 1': { output_symbol: 'E_R', input_symbols: ['A_A', 'e', 'h_N', 'eta'] } },
    };
    expect(producerChain(prior, 'DIN-1989-1-04', 'A_A')).toBe('A_A → Gl.1 E_R (consumed only by itself (DIN-1989-1-04) — prod data oddity)');
    expect(producerChain(prior, 'DIN-1989-1-04', 'E_R')).toBe('E_R (consumed only by itself (DIN-1989-1-04) — prod data oddity)');
    const mixed: PriorSnapshot = { ...prior, 'DIN-1989-1-04 E_R': row({ consumer_worksheets: ['DIN-1989-1-04', 'DIN-1989-1-02'] }) };
    expect(producerChain(mixed, 'DIN-1989-1-04', 'A_A')).toBe('A_A → Gl.1 E_R (consumed by DIN-1989-1-04, DIN-1989-1-02)');
  });
  it('assertPriorSnapshot validates the equations map shape', () => {
    const bad = (equations: unknown) => ({ ...a26206, equations }) as unknown as PriorSnapshot;
    expect(() => assertPriorSnapshot(bad({ 'nospace': { output_symbol: 'x', input_symbols: [] } }))).toThrow(/keys are "<worksheet> <equation_number>"/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 1': null }))).toThrow(/row must be an object/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 1': { output_symbol: '', input_symbols: [] } }))).toThrow(/output_symbol must be a non-empty string/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 1': { output_symbol: 'x', input_symbols: 'a,b' } }))).toThrow(/input_symbols must be a string array/);
    expect(() => assertPriorSnapshot(bad({ 'S-01 1': { id: 7, output_symbol: 'x', input_symbols: ['a'] } }))).toThrow(/id must be a string\/null/);
    expect(() => assertPriorSnapshot(a26206)).not.toThrow();
  });
});
