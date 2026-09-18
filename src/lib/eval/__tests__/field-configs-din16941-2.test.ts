/**
 * Plan 3 Task 15 — DIN-EN-16941-2 field configs: every entry parses through
 * the zod contract, the key-string equality rule (G-A3) holds against the
 * captured prod enums and the seeded tables, lookup_fills sit on the worksheet
 * of their keys, visibility never lands on a consumed producer or a gate-read
 * symbol (pinned against the capture, incl. the refusals that went to STAGED),
 * the multi-select carrier is NOT emitted (S-1 — the enum/json mismatch would
 * lose data), and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, DIFFERENZIERT, VEREINFACHT, SPRUEH, ERTRAG_ROW_EXPR, STATUS_MAX_EXPR } from '../field-configs/din16941_2';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric, quotedComparisonLiterals, parseExpression } from '@/lib/expr';
import { din169412SeedTables, RICHTWERT_SPALTEN, GL1_QUELLEN, TABA3_BEDARF } from '../regulation-tables-seed-din16941_2';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/din16941_2.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'DIN-EN-16941-2';
const W = (n: string) => `DIN-EN-16941-2-0${n}`;
const q = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });
const tables = din169412SeedTables();
const tableByCode = (code: string) => tables.find((t) => t.table_code === code)!;

describe('DIN-EN-16941-2 field configs (Plan 3 Task 15)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote, `${e.symbol} quote carries an unresolved Q key`).not.toContain('undefined');
      if (e.widget === 'register') {
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 43 field entries (38 create, 5 UPDATE), widgets by kind; grauwasser_herkunft / behandlungsstufen are NOT re-bound (S-1)', () => {
    expect(FIELD_CONFIGS).toHaveLength(43);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(38);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual([
      `${W('2')} zugang_oeffnung_mm`, `${W('2')} warnsystem_ventilzulauf`, `${W('2')} pumpensteuerung_handnot`, `${W('4')} legionella_kbe`, `${W('4')} truebung_ntu`,
    ]);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual([`${W('2')} speichereinrichtungen`, `${W('3')} grauwasserquellen_16941`, `${W('3')} bedarfsstellen`, `${W('4')} probenahmen`]);
    expect(byWidget('select_one')).toEqual([`${W('2')} speicher_lage`, `${W('2')} nachspeisung_medium_16941`, `${W('4')} richtwert_spalte`]);
    expect(byWidget('select_many')).toEqual([]); // S-1: the carrier change enum → json is STAGED, the widget alone would lose selections on reload
    expect(byWidget('lookup_fill')).toEqual([
      `${W('1')} anlagentyp_beschreibung`, `${W('1')} anlagentyp_nutzungsbeschraenkung`,
      `${W('4')} e_coli_G`, `${W('4')} enterokokken_G`, `${W('4')} legionella_G`, `${W('4')} coliforme_G`, `${W('4')} truebung_G`, `${W('4')} ph_G`, `${W('4')} rest_chlor_G`, `${W('4')} rest_brom_G`,
    ]);
    expect(byWidget('attestation')).toEqual([
      `${W('1')} direktnutzung_scope_bestaetigt`, `${W('2')} personenzugang`, `${W('2')} geruchsverschluss_nachspeisung`, `${W('2')} ventilgesteuerte_zulaeufe`, `${W('2')} warnsystem_ventilzulauf`, `${W('2')} pumpensteuerung_handnot`, `${W('3')} wohngebaeude_bestaetigt`,
    ]);
    expect(byWidget('scalar')).toEqual([`${W('2')} zugang_oeffnung_mm`, `${W('2')} D_zulauf`, `${W('4')} legionella_kbe`, `${W('4')} truebung_ntu`]);
    expect(byWidget('derived')).toHaveLength(15);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual([
      `${W('1')} anlagentyp_nutzungsbeschraenkung`, `${W('1')} direktnutzung_scope_bestaetigt`,
      `${W('2')} zugang_oeffnung_mm`, `${W('2')} nachspeisung_medium_16941`, `${W('2')} geruchsverschluss_nachspeisung`, `${W('2')} D_zulauf`, `${W('2')} freier_auslauf_A_min`, `${W('2')} warnsystem_ventilzulauf`, `${W('2')} pumpensteuerung_handnot`,
      `${W('3')} wohngebaeude_bestaetigt`, `${W('3')} Y_G_vereinfacht`, `${W('3')} grauwasserquellen_16941`, `${W('3')} Y_G_rows`, `${W('3')} quellen_count`, `${W('3')} D_G_vereinfacht`, `${W('3')} bedarfsstellen`, `${W('3')} D_G_rows`, `${W('3')} bedarfsstellen_count`,
      `${W('4')} legionella_G`, `${W('4')} legionella_kbe`, `${W('4')} truebung_ntu`,
    ]);
    expect(FIELD_CONFIGS.some((e) => e.symbol === 'grauwasser_herkunft' || e.symbol === 'behandlungsstufen')).toBe(false);
  });

  it('G-A3 key-string equality: TABA2 / GL1_LEGENDE keys ⊆ prod grauwasser_herkunft, ANHANGB keys = prod anlagentyp, TABD1 / TABD2 keys = the created richtwert_spalte options, TABA3 keys = the register lookup_key rows, the register quelle options = GL1_LEGENDE keys', () => {
    const herkunft = enumValues(`${W('1')} grauwasser_herkunft`);
    expect(tableByCode('GL1_LEGENDE').rows.map((r) => r.keys.quelle)).toEqual(herkunft);
    for (const r of tableByCode('TABA2').rows) expect(herkunft).toContain(r.keys.quelle);
    expect(tableByCode('ANHANGB').rows.map((r) => r.keys.anlagentyp)).toEqual(enumValues(`${W('1')} anlagentyp`));
    const spalte = byKey(W('4'), 'richtwert_spalte');
    expect((spalte.enum_values as Array<{ value: string }>).map((v) => v.value)).toEqual(RICHTWERT_SPALTEN.map((s) => s.value));
    expect(tableByCode('TABD1').rows.map((r) => r.keys.nutzung)).toEqual(RICHTWERT_SPALTEN.map((s) => s.value));
    expect(tableByCode('TABD2').rows.map((r) => r.keys.nutzung)).toEqual(RICHTWERT_SPALTEN.map((s) => s.value));
    const quellen = registerCfg(W('3'), 'grauwasserquellen_16941').columns.find((c) => c.key === 'quelle')!;
    expect(quellen.type).toBe('enum');
    expect(quellen.options).toEqual(GL1_QUELLEN.map((s) => s.value));
    const bedarf = registerCfg(W('3'), 'bedarfsstellen').columns.find((c) => c.key === 'bedarf')!;
    expect(bedarf.type).toBe('lookup_key');
    expect(bedarf.lookup?.table_code).toBe('TABA3');
    expect(tableByCode('TABA3').rows.map((r) => r.keys.bedarf)).toEqual(TABA3_BEDARF.map((b) => b.value));
    const werkstoff = registerCfg(W('2'), 'speichereinrichtungen').columns.find((c) => c.key === 'werkstoff')!;
    expect(werkstoff.options).toEqual(enumValues(`${W('2')} speicher_werkstoff`));
    // drivers as captured
    expect(enumValues(`${W('3')} berechnungsverfahren`)).toEqual(['vereinfacht', 'differenziert']);
    expect(enumValues(`${W('2')} rueckflusssicherung_typ`)).toEqual(['AA', 'AB']);
    expect(priorRow(`${W('2')} pumpe_erforderlich`).data_type).toBe('boolean');
    expect(priorRow(`${W('2')} nachspeisung_vorhanden`).data_type).toBe('boolean');
    expect(DIFFERENZIERT).toBe("berechnungsverfahren == 'differenziert'");
    expect(VEREINFACHT).toBe("berechnungsverfahren == 'vereinfacht'");
    expect(SPRUEH).toBe("richtwert_spalte == 'sprueh'");
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns, value column exists, data_type text (amendment C), keys live on the fill worksheet (own or created there)', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      const t = tableByCode(e.lookup!.table_code);
      expect(e.lookup!.keys.map((k) => k.column)).toEqual(t.key_columns);
      expect(t.value_columns.map((c) => c.name)).toContain(e.lookup!.value);
      expect(e.create?.data_type).toBe('text');
      for (const k of e.lookup!.keys) {
        const own = priorRow(`${e.worksheet} ${k.from_symbol}`);
        const created = FIELD_CONFIGS.find((c) => c.worksheet === e.worksheet && c.symbol === k.from_symbol && c.create);
        expect(own ?? created, `${e.symbol} key ${k.from_symbol} on ${e.worksheet}`).toBeDefined();
      }
    }
    expect(byKey(W('4'), 'e_coli_G').lookup).toEqual({ table_code: 'TABD1', role: 'limit', keys: [{ column: 'nutzung', from_symbol: 'richtwert_spalte' }], value: 'e_coli_text' });
    expect(byKey(W('4'), 'rest_brom_G').lookup).toEqual({ table_code: 'TABD2', role: 'limit', keys: [{ column: 'nutzung', from_symbol: 'richtwert_spalte' }], value: 'rest_brom_text' });
    expect(byKey(W('1'), 'anlagentyp_beschreibung').lookup).toEqual({ table_code: 'ANHANGB', role: 'value', keys: [{ column: 'anlagentyp', from_symbol: 'anlagentyp' }], value: 'beschreibung' });
  });

  it('registers: Grauwasserquellen switch Q·t·u / V·u per row on the legend table (t_x only for flow-based sources, hints from Tab. A.2 never limits); Bedarfsstellen = V·u per person; Probenahmen carry one status per parameter and the worst; footers = the created outputs', () => {
    const gw = registerCfg(W('3'), 'grauwasserquellen_16941');
    expect(gw.columns.map((c) => c.key)).toEqual(['quelle', 'mit_dauer', 'hint', 'q_or_v', 't_x', 'u_x', 'ertrag_row', 'in_hint']);
    expect(gw.columns.find((c) => c.key === 't_x')).toMatchObject({ type: 'number', required: true, visible_when: 'mit_dauer == 1' });
    expect(gw.columns.find((c) => c.key === 'ertrag_row')?.expr).toBe(ERTRAG_ROW_EXPR);
    expect(ERTRAG_ROW_EXPR).toBe('if(mit_dauer == 1, q_or_v * t_x * u_x, q_or_v * u_x)');
    expect(gw.columns.find((c) => c.key === 'in_hint')).toMatchObject({ type: 'derived', display: 'badge' });
    expect(gw.override).toBeUndefined(); // hints are shown, not filled — nothing to override
    expect(gw.footer).toEqual(['Y_G_rows', 'quellen_count']);
    const bd = registerCfg(W('3'), 'bedarfsstellen');
    expect(bd.columns.map((c) => c.key)).toEqual(['bezeichnung', 'bedarf', 'hint', 'v_x', 'u_x', 'bedarf_row', 'in_hint']);
    expect(bd.columns.find((c) => c.key === 'bedarf_row')?.expr).toBe('v_x * u_x');
    expect(bd.override).toBeUndefined();
    expect(bd.footer).toEqual(['D_G_rows', 'bedarfsstellen_count']);
    const sp = registerCfg(W('2'), 'speichereinrichtungen');
    expect(sp.columns.map((c) => c.key)).toEqual(['bezeichnung', 'werkstoff', 'nennkapazitaet_l']);
    expect(sp.footer).toEqual(['nennkapazitaet_sum', 'speicher_count']);
    const pr = registerCfg(W('4'), 'probenahmen');
    expect(pr.columns.map((c) => c.key)).toEqual([
      'datum', 'ecoli', 'enterokokken', 'legionella', 'coliforme', 'truebung', 'ph', 'rest_chlor', 'rest_brom',
      'status_ecoli', 'status_enterokokken', 'status_legionella', 'status_coliforme', 'status_truebung', 'status_ph', 'status_chlor', 'status_brom', 'status_max',
    ]);
    expect(pr.columns.find((c) => c.key === 'legionella')).toMatchObject({ required: true, visible_when: SPRUEH });
    expect(pr.columns.find((c) => c.key === 'truebung')).toMatchObject({ required: true, visible_when: "richtwert_spalte != 'gartenbewaesserung'" });
    expect(pr.columns.find((c) => c.key === 'status_max')).toMatchObject({ type: 'derived', display: 'badge', expr: STATUS_MAX_EXPR });
    expect(pr.footer).toEqual(['probenahmen_count', 'probenahmen_rot', 'probenahmen_gelb', 'status_letzte_probe']);
  });

  it('string-literal rule (Task 13b): no quoted literal in any expression is a register column key or a symbol of its worksheet', () => {
    const symbolsOf = (ws: string) => new Set([
      ...Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1)),
      ...FIELD_CONFIGS.filter((e) => e.worksheet === ws).map((e) => e.symbol),
    ]);
    let checked = 0;
    for (const e of FIELD_CONFIGS) {
      const syms = symbolsOf(e.worksheet);
      const exprs: Array<[string, Set<string>]> = [];
      if (e.visible_when) exprs.push([e.visible_when, syms]);
      if (e.widget === 'register') {
        const cols = new Set((e.ui_config as RegisterUiConfig).columns.map((c) => c.key));
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          if (c.expr) exprs.push([c.expr, new Set([...syms, ...cols])]);
          if (c.visible_when) exprs.push([c.visible_when, new Set([...syms, ...cols])]);
        }
      }
      for (const [src, scope] of exprs) {
        const node = parseExpression(src);
        expect(node, src).not.toBeNull();
        for (const lit of quotedComparisonLiterals(node!)) expect(scope.has(lit), `${e.symbol}: literal '${lit}' collides`).toBe(false);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(30);
  });

  it('visibility never lands on a consumed producer or a gate-read symbol; the refused targets are pinned (G-2 / G-3 / G-7); the key facts behind D-2 / G-3 are pinned', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const row = priorRow(`${e.worksheet} ${e.symbol}`);
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect(row.consumer_worksheets ?? []).toEqual([]);
      expect(gateReaders(prior, e.worksheet, e.symbol, e.visible_when!)).toEqual([]);
      expect(producerChain(prior, e.worksheet, e.symbol)).toBeNull();
    }
    // rueckflusssicherung_typ (-02) is read by CR-08 → G-2 (gate-aware guard)
    expect(gateReaders(prior, W('2'), 'rueckflusssicherung_typ', "nachspeisung_medium_16941 == 'trinkwasser'").map((r) => [r.code, r.gate.condition])).toEqual([['DIN-EN-16941-2-CR-08', 'rueckflusssicherung_typ IN {AA,AB}']]);
    expect(() => emitFieldConfigSql('din16941_2', [q(W('2'), 'rueckflusssicherung_typ', "nachspeisung_medium_16941 == 'trinkwasser'")], [], prior)).toThrow(/read by gate DIN-EN-16941-2-CR-08 .* STAGE as a G-block/);
    // pumpe_trockenlaufschutz (-02) is read by CR-09 → G-7
    expect(() => emitFieldConfigSql('din16941_2', [q(W('2'), 'pumpe_trockenlaufschutz', 'pumpe_erforderlich == true')], [], prior)).toThrow(/pumpe_trockenlaufschutz read by gate DIN-EN-16941-2-CR-09/);
    // abstand_wurzeln_m (-04) is read by CR-13 → G-3 (and speicher_lage is created on -02, not inherited on -04)
    expect(() => emitFieldConfigSql('din16941_2', [q(W('4'), 'abstand_wurzeln_m', "speicher_lage == 'unterirdisch'")], [], prior)).toThrow(/abstand_wurzeln_m read by gate DIN-EN-16941-2-CR-13/);
    // bewertung_status (-04) is consumed by -05 and read by CR-17 → D-1 stays a manual field
    expect(priorRow(`${W('4')} bewertung_status`).consumer_worksheets).toEqual([W('5')]);
    expect(prior.gates![`${W('4')} DIN-EN-16941-2-CR-17`].symbols).toEqual(['bewertung_status', 'probenahmestelle_im_verteilsystem']);
    // vorgesehene_nutzung (-01) reaches -02 / -03 but NOT -04 → richtwert_spalte is a created select on -04 (D-2 / C-1)
    expect(priorRow(`${W('1')} vorgesehene_nutzung`).consumer_worksheets).toEqual([W('2'), W('3')]);
    // the Gl.-1 / Gl.-2 inputs are consumer-free but feed Y_G / D_G that CR-12 reads → hiding them under vereinfacht is G-9 (not emitted)
    expect(priorRow(`${W('3')} Q_S`).consumer_worksheets).toBeNull();
    expect(prior.gates![`${W('3')} DIN-EN-16941-2-CR-12`].symbols).toEqual(['D_G', 'Y_G', 'bemessungswert_massgebend']);
    expect(prior.equations![`${W('3')} 1`].input_symbols).toContain('Q_S');
    // the multi-select carriers: grauwasser_herkunft is consumed by -02 (a widget switch is not fail-safe), both are enum with non-null prod enum_values (D-1)
    expect(priorRow(`${W('1')} grauwasser_herkunft`)).toMatchObject({ data_type: 'enum', consumer_worksheets: [W('2')] });
    expect(priorRow(`${W('2')} behandlungsstufen`)).toMatchObject({ data_type: 'enum', consumer_worksheets: null });
    expect(enumValues(`${W('2')} behandlungsstufen`)).toHaveLength(6);
    // no gate carries an empty / prose condition; no self-consumer entries; anlagen_id carries the "ALL" token (X-1)
    expect(Object.values(prior.gates!).filter((g) => g.parse_error)).toEqual([]);
    const self = Object.entries(prior).filter(([k, v]) => k.includes(' ') && (v as Row).consumer_worksheets?.some((w) => k.startsWith(`${w} `))).map(([k]) => k);
    expect(self).toEqual([]);
    expect(priorRow(`${W('1')} anlagen_id`).consumer_worksheets).toEqual(['ALL']);
    // created fields sit in captured sections
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no lint warning)', () => {
    const { up, down, warnings } = emitFieldConfigSql('din16941_2', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('din16941_2', '20260917101510');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(5);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(38);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
