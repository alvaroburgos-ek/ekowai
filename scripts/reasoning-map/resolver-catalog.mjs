/** @typedef {{located_clause?:string, clause_ref?:string, modal_verb?:string, threshold_in_source?:string,
 *  printed_value?:string|null, enum_domain_coverage?:string|null, field_type?:string,
 *  provenance_grade?:'VA'|'VC', edition?:string, source_quote?:string,
 *  source_enum_members?:string[], all_members_verbatim?:boolean,
 *  declared_symbols?:string[]}} Evidence */
/** @typedef {{id:string, severity?:string, condition?:string, clause_reference?:string,
 *  formula?:string, output_symbol?:string}} Target */
/** @typedef {{column:string, before:any, after:any, table?:string}} Change */
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
      ['soll','sollte','should','empfohlen','bevorzugt','present-indicative','mixed'].includes(ev.modal_verb),
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
    resolve: (ev, t) => ({ column: 'condition', before: t.condition,
      after: t.condition.replace(/([\w.]+)\s+IN\s*\{[^}]*\}/, '$1 IS NOT NULL') }),
  },
  {
    id: 'R-ENUM-UNDERINCLUSIVE', kind: 'gate', risk: 'med',
    detector: (ev, t) => ev.enum_domain_coverage === 'partial' && /([\w.]+)\s+IN\s*\{/.test(t.condition || ''),
    escalateIf: (ev) => ev.all_members_verbatim === false,
    resolve: (ev, t) => ({ column: 'condition', before: t.condition,
      after: t.condition.replace(/([\w.]+)\s+IN\s*\{[^}]*\}/, `$1 IN {${ev.source_enum_members.join(', ')}}`) }),
  },
  {
    id: 'R-EQ-GL13', kind: 'equation', risk: 'low',
    detector: (ev, t) => {
      const toks = new Set((t.formula || '').match(/[A-Za-z_][A-Za-z0-9_]*/g) || []);
      const decl = ev.declared_symbols || [];
      return [...toks].some(tok => !decl.includes(tok) && decl.some(d => d.toLowerCase() === tok.toLowerCase()));
    },
    escalateIf: (ev, t) => {
      const toks = (t.formula || '').match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
      const decl = ev.declared_symbols || [];
      return toks.some(tok => !decl.includes(tok) &&
        decl.filter(d => d.toLowerCase() === tok.toLowerCase()).length > 1);
    },
    resolve: (ev, t) => {
      const decl = ev.declared_symbols || [];
      let after = t.formula;
      for (const tok of new Set(t.formula.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [])) {
        if (decl.includes(tok)) continue;
        const match = decl.find(d => d.toLowerCase() === tok.toLowerCase());
        if (match) after = after.replace(new RegExp(`\\b${tok}\\b`, 'g'), match);
      }
      return { column: 'formula', before: t.formula, after, table: 'equations' };
    },
  },
];
