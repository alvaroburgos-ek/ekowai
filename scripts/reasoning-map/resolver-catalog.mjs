/** @typedef {{located_clause?:string, clause_ref?:string, modal_verb?:string, threshold_in_source?:string,
 *  printed_value?:string|null, enum_domain_coverage?:string|null, field_type?:string,
 *  provenance_grade?:'VA'|'VC', edition?:string, source_quote?:string,
 *  source_enum_members?:string[], all_members_verbatim?:boolean}} Evidence */
/** @typedef {{id:string, severity?:string, condition?:string, clause_reference?:string,
 *  formula?:string, output_symbol?:string}} Target */
/** @typedef {{column:string, before:any, after:any}} Change */
/** @typedef {{id:string, kind:'gate'|'equation', risk:'zero'|'low'|'med'|'high',
 *  detector:(ev:Evidence,t:Target)=>boolean, escalateIf?:(ev:Evidence,t:Target)=>boolean,
 *  resolve:(ev:Evidence,t:Target)=>Change}} Rule */

/** @type {Rule[]} */
export const RULES = [
  {
    id: 'R-CLAUSEREF', kind: 'gate', risk: 'zero',
    detector: (ev, t) => !!ev.located_clause && ev.located_clause !== ev.clause_ref,
    resolve: (ev, t) => ({ column: 'clause_reference', before: t.clause_reference, after: ev.located_clause }),
  },
  {
    id: 'R-MODAL-SEVERITY', kind: 'gate', risk: 'med',
    detector: (ev, t) => t.severity === 'block' &&
      ['soll','sollte','should','empfohlen','bevorzugt','present-indicative'].includes(ev.modal_verb),
    escalateIf: (ev) => ev.modal_verb === 'mixed',
    resolve: (ev, t) => ({ column: 'severity', before: t.severity, after: 'warn' }),
  },
  {
    id: 'R-THRESH-EXAMPLE', kind: 'gate', risk: 'med',
    detector: (ev, t) => t.severity === 'block' && ['example','approximate'].includes(ev.threshold_in_source),
    resolve: (ev, t) => ({ column: 'severity', before: t.severity, after: 'warn' }),
  },
  {
    id: 'R-THRESH-UNSUPPORTED', kind: 'gate', risk: 'high',
    detector: (ev, t) => t.severity === 'block' && ev.threshold_in_source === 'false',
    resolve: (ev, t) => ({ column: 'severity', before: t.severity, after: 'warn' }),
  },
  {
    id: 'R-ENUM-FULLDOMAIN', kind: 'gate', risk: 'med',
    detector: (ev, t) => ev.enum_domain_coverage === 'full' && /([\w.]+)\s+IN\s*\{/.test(t.condition || ''),
    resolve: (ev, t) => {
      const sym = t.condition.match(/([\w.]+)\s+IN\s*\{/)[1];
      return { column: 'condition', before: t.condition, after: `${sym} IS NOT NULL` };
    },
  },
  {
    id: 'R-ENUM-UNDERINCLUSIVE', kind: 'gate', risk: 'med',
    detector: (ev, t) => ev.enum_domain_coverage === 'partial',
    escalateIf: (ev) => ev.all_members_verbatim === false,
    resolve: (ev, t) => ({ column: 'condition', before: t.condition,
      after: `${t.condition.match(/([\w.]+)\s+IN\s*\{/)[1]} IN {${ev.source_enum_members.join(',')}}` }),
  },
];
