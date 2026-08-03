# Reasoning-Map Resolver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic resolver that turns reasoning-map "rulings" into staged, owner-approvable migrations by applying catalog rules to agent-extracted PDF evidence.

**Architecture:** A declarative rule **catalog** (data) + a pure **engine** (`resolve(evidence, target, catalog) → Decision`) + a CLI (`resolve.mjs`) that emits WRITTEN-NOT-APPLIED migrations and a decision ledger. The agent supplies structured evidence; the catalog decides; nothing touches prod until the owner applies a batch.

**Tech Stack:** Node ESM `.mjs` modules (NOT `.ts` via tsx — tsx is broken in this WSL per CLAUDE.md), Vitest for tests, existing Management-API apply path for eventual owner application.

## Global Constraints
- All new resolver code is plain ESM `.mjs` with JSDoc types. Tests are `*.test.mjs` run by `pnpm vitest run <path>`.
- **Never delete a source value.** The unsupported-threshold class sets `severity='warn'` + a quarantine marker; it never removes a number or a condition.
- Every resolution is emitted as a **WRITTEN-NOT-APPLIED** SQL migration + a matching rollback; idempotent (`WHERE id=…`).
- Enforcement-changing resolutions require `provenance_grade === 'VA'` AND `edition ∈ {weissdruck, published}`; otherwise **escalate**. Zero-risk (metadata) resolutions may proceed on VC evidence.
- Ambiguous rulings (pick-a-value / pick-a-range / scope) are never resolved — engine returns `action:'escalate'`.
- The engine is **pure** (no I/O, no DB, no fs) — all I/O lives in `resolve.mjs`.
- Git identity: `Alvaro Burgos <alvaro.burgos@ekowai.com>`. Commit after every task.

---

### Task 1: Types + catalog skeleton with the zero-risk rule (`R-CLAUSEREF`)

**Files:**
- Create: `scripts/reasoning-map/resolver-catalog.mjs`
- Test: `scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`

**Interfaces:**
- Produces: `RULES` (array of Rule). A `Rule` = `{ id: string, kind: 'gate'|'equation', risk: 'zero'|'low'|'med'|'high', detector: (ev, target) => boolean, escalateIf?: (ev, target) => boolean, resolve: (ev, target) => {column: string, before: any, after: any} }`. An `Evidence` and `Target` are plain objects (shapes in the spec).

- [ ] **Step 1: Write the failing test**
```js
// scripts/reasoning-map/__tests__/resolver-catalog.test.mjs
import { describe, it, expect } from 'vitest';
import { RULES } from '../resolver-catalog.mjs';

const rule = (id) => RULES.find(r => r.id === id);

describe('R-CLAUSEREF', () => {
  it('detects a clause-reference mismatch and resolves to the located clause', () => {
    const r = rule('R-CLAUSEREF');
    const ev = { located_clause: '§5.1', clause_ref: '§4.2' };
    const target = { id: 'g1', clause_reference: '§4.2' };
    expect(r.detector(ev, target)).toBe(true);
    expect(r.resolve(ev, target)).toEqual({ column: 'clause_reference', before: '§4.2', after: '§5.1' });
  });
  it('does not fire when located clause equals clause_reference', () => {
    const r = rule('R-CLAUSEREF');
    expect(r.detector({ located_clause: '§4.2', clause_ref: '§4.2' }, {})).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`
Expected: FAIL — cannot resolve `../resolver-catalog.mjs`.

- [ ] **Step 3: Write minimal implementation**
```js
// scripts/reasoning-map/resolver-catalog.mjs
/** @typedef {{located_clause?:string, clause_ref?:string, modal_verb?:string, threshold_in_source?:string,
 *  printed_value?:string|null, enum_domain_coverage?:string|null, field_type?:string,
 *  provenance_grade?:'VA'|'VC', edition?:string, source_quote?:string,
 *  source_enum_members?:string[]}} Evidence */
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
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add scripts/reasoning-map/resolver-catalog.mjs scripts/reasoning-map/__tests__/resolver-catalog.test.mjs
git -c user.name='Alvaro Burgos' -c user.email='alvaro.burgos@ekowai.com' commit -m "feat(resolver): catalog skeleton + R-CLAUSEREF rule (zero-risk metadata)"
```

---

### Task 2: `R-MODAL-SEVERITY` rule (soll/should/present-indicative → warn; escalate on mixed)

**Files:**
- Modify: `scripts/reasoning-map/resolver-catalog.mjs` (append rule to `RULES`)
- Test: `scripts/reasoning-map/__tests__/resolver-catalog.test.mjs` (append describe block)

**Interfaces:**
- Consumes: `RULES`, `Evidence.modal_verb`, `Target.severity`.
- Produces: rule `R-MODAL-SEVERITY` (risk `med`).

- [ ] **Step 1: Write the failing test** (append)
```js
describe('R-MODAL-SEVERITY', () => {
  const r = rule('R-MODAL-SEVERITY');
  it('fires on a block gate governed by a soft modal', () => {
    for (const m of ['soll','sollte','should','empfohlen','bevorzugt','present-indicative']) {
      expect(r.detector({ modal_verb: m }, { severity: 'block' })).toBe(true);
    }
    expect(r.resolve({ modal_verb: 'sollte' }, { severity: 'block' }))
      .toEqual({ column: 'severity', before: 'block', after: 'warn' });
  });
  it('does not fire on muss/shall or on a warn gate', () => {
    expect(r.detector({ modal_verb: 'muss' }, { severity: 'block' })).toBe(false);
    expect(r.detector({ modal_verb: 'sollte' }, { severity: 'warn' })).toBe(false);
  });
  it('escalates when the modal is mixed', () => {
    expect(r.escalateIf({ modal_verb: 'mixed' }, { severity: 'block' })).toBe(true);
    expect(r.escalateIf({ modal_verb: 'sollte' }, { severity: 'block' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`
Expected: FAIL — `r` is undefined (rule not found).

- [ ] **Step 3: Write minimal implementation** (append to `RULES`)
```js
  {
    id: 'R-MODAL-SEVERITY', kind: 'gate', risk: 'med',
    detector: (ev, t) => t.severity === 'block' &&
      ['soll','sollte','should','empfohlen','bevorzugt','present-indicative'].includes(ev.modal_verb),
    escalateIf: (ev) => ev.modal_verb === 'mixed',
    resolve: (ev, t) => ({ column: 'severity', before: t.severity, after: 'warn' }),
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add scripts/reasoning-map/resolver-catalog.mjs scripts/reasoning-map/__tests__/resolver-catalog.test.mjs
git -c user.name='Alvaro Burgos' -c user.email='alvaro.burgos@ekowai.com' commit -m "feat(resolver): R-MODAL-SEVERITY (soft-modal block gate -> warn; escalate on mixed)"
```

---

### Task 3: Threshold rules — `R-THRESH-EXAMPLE` + `R-THRESH-UNSUPPORTED` (quarantine, never delete)

**Files:**
- Modify: `scripts/reasoning-map/resolver-catalog.mjs`
- Test: `scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`

**Interfaces:**
- Consumes: `Evidence.threshold_in_source` (`'true'|'false'|'approximate'|'example'`), `Target.severity`.
- Produces: `R-THRESH-EXAMPLE` (med), `R-THRESH-UNSUPPORTED` (high). `R-THRESH-UNSUPPORTED.resolve` returns `{column:'severity', before, after:'warn'}` — it does NOT touch `condition`.

- [ ] **Step 1: Write the failing test** (append)
```js
describe('threshold rules', () => {
  it('R-THRESH-EXAMPLE: illustrative value (z.B./ca.) on a block gate -> warn', () => {
    const r = rule('R-THRESH-EXAMPLE');
    expect(r.detector({ threshold_in_source: 'example' }, { severity: 'block' })).toBe(true);
    expect(r.detector({ threshold_in_source: 'approximate' }, { severity: 'block' })).toBe(true);
    expect(r.detector({ threshold_in_source: 'true' }, { severity: 'block' })).toBe(false);
    expect(r.resolve({ threshold_in_source: 'example' }, { severity: 'block' }))
      .toEqual({ column: 'severity', before: 'block', after: 'warn' });
  });
  it('R-THRESH-UNSUPPORTED: value absent from source -> warn, condition untouched', () => {
    const r = rule('R-THRESH-UNSUPPORTED');
    expect(r.risk).toBe('high');
    expect(r.detector({ threshold_in_source: 'false' }, { severity: 'block' })).toBe(true);
    const change = r.resolve({ threshold_in_source: 'false' }, { severity: 'block', condition: 'x >= 50000' });
    expect(change).toEqual({ column: 'severity', before: 'block', after: 'warn' });
    expect(change.column).not.toBe('condition'); // never rewrites/deletes the number
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`
Expected: FAIL — rules not found.

- [ ] **Step 3: Write minimal implementation** (append to `RULES`)
```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add scripts/reasoning-map/resolver-catalog.mjs scripts/reasoning-map/__tests__/resolver-catalog.test.mjs
git -c user.name='Alvaro Burgos' -c user.email='alvaro.burgos@ekowai.com' commit -m "feat(resolver): R-THRESH-EXAMPLE + R-THRESH-UNSUPPORTED (quarantine to warn, never delete the value)"
```

---

### Task 4: Enum rules — `R-ENUM-FULLDOMAIN` + `R-ENUM-UNDERINCLUSIVE`

**Files:**
- Modify: `scripts/reasoning-map/resolver-catalog.mjs`
- Test: `scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`

**Interfaces:**
- Consumes: `Evidence.enum_domain_coverage` (`'exact'|'partial'|'full'`), `Evidence.source_enum_members` (string[] printed in source), `Target.condition`.
- Produces: `R-ENUM-FULLDOMAIN` (med, rewrites `IN {…}` → `IS NOT NULL`), `R-ENUM-UNDERINCLUSIVE` (med, escalates if any source member is unverifiable).

- [ ] **Step 1: Write the failing test** (append)
```js
describe('enum rules', () => {
  it('R-ENUM-FULLDOMAIN: IN over whole domain -> IS NOT NULL', () => {
    const r = rule('R-ENUM-FULLDOMAIN');
    const t = { condition: "x IN {a,b,c}" };
    expect(r.detector({ enum_domain_coverage: 'full' }, t)).toBe(true);
    expect(r.detector({ enum_domain_coverage: 'partial' }, t)).toBe(false);
    expect(r.resolve({ enum_domain_coverage: 'full' }, t))
      .toEqual({ column: 'condition', before: "x IN {a,b,c}", after: 'x IS NOT NULL' });
  });
  it('R-ENUM-UNDERINCLUSIVE: fires on partial coverage, escalates on unverifiable member', () => {
    const r = rule('R-ENUM-UNDERINCLUSIVE');
    expect(r.detector({ enum_domain_coverage: 'partial' }, {})).toBe(true);
    expect(r.escalateIf({ source_enum_members: ['a','b'], all_members_verbatim: true }, {})).toBe(false);
    expect(r.escalateIf({ source_enum_members: ['a','b'], all_members_verbatim: false }, {})).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation** (append to `RULES`)
```js
  {
    id: 'R-ENUM-FULLDOMAIN', kind: 'gate', risk: 'med',
    detector: (ev, t) => ev.enum_domain_coverage === 'full' && /\bIN\s*\{/.test(t.condition || ''),
    resolve: (ev, t) => {
      const sym = (t.condition.match(/^\s*(\w+)\s+IN\s*\{/) || [,'value'])[1];
      return { column: 'condition', before: t.condition, after: `${sym} IS NOT NULL` };
    },
  },
  {
    id: 'R-ENUM-UNDERINCLUSIVE', kind: 'gate', risk: 'med',
    detector: (ev, t) => ev.enum_domain_coverage === 'partial',
    escalateIf: (ev) => ev.all_members_verbatim === false,
    resolve: (ev, t) => ({ column: 'condition', before: t.condition,
      after: `${(t.condition.match(/^\s*(\w+)\s+IN/)||[,'value'])[1]} IN {${ev.source_enum_members.join(',')}}` }),
  },
```
> Note: `resolver-catalog.mjs` gains one JSDoc field on Evidence: `all_members_verbatim?: boolean`. Add it to the `@typedef` comment.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add scripts/reasoning-map/resolver-catalog.mjs scripts/reasoning-map/__tests__/resolver-catalog.test.mjs
git -c user.name='Alvaro Burgos' -c user.email='alvaro.burgos@ekowai.com' commit -m "feat(resolver): R-ENUM-FULLDOMAIN (->IS NOT NULL) + R-ENUM-UNDERINCLUSIVE (add source members, escalate if unverifiable)"
```

---

### Task 5: The pure engine `resolve()` with safety invariants

**Files:**
- Create: `scripts/reasoning-map/resolver-engine.mjs`
- Test: `scripts/reasoning-map/__tests__/resolver-engine.test.mjs`

**Interfaces:**
- Consumes: `RULES` from `resolver-catalog.mjs`; `Evidence`, `Target`.
- Produces: `resolve(ev, target, rules=RULES) => Decision` where `Decision = { target_id:string, action:'stage'|'escalate', rule_id?:string, risk?:string, change?:Change, evidence_quote?:string, reason:string }`.

- [ ] **Step 1: Write the failing test**
```js
// scripts/reasoning-map/__tests__/resolver-engine.test.mjs
import { describe, it, expect } from 'vitest';
import { resolve } from '../resolver-engine.mjs';

const base = { target_id: 'g1', provenance_grade: 'VA', edition: 'weissdruck', source_quote: 'Q' };

describe('resolve() engine', () => {
  it('stages a met, VA, non-draft rule', () => {
    const d = resolve({ ...base, modal_verb: 'sollte' }, { id: 'g1', severity: 'block' });
    expect(d.action).toBe('stage');
    expect(d.rule_id).toBe('R-MODAL-SEVERITY');
    expect(d.change).toEqual({ column: 'severity', before: 'block', after: 'warn' });
    expect(d.evidence_quote).toBe('Q');
  });
  it('escalates when no rule matches', () => {
    const d = resolve({ ...base, modal_verb: 'muss' }, { id: 'g1', severity: 'block' });
    expect(d).toMatchObject({ action: 'escalate', reason: 'no-rule' });
  });
  it('escalates a draft edition even when a rule matches', () => {
    const d = resolve({ ...base, edition: 'gelbdruck', modal_verb: 'sollte' }, { id: 'g1', severity: 'block' });
    expect(d).toMatchObject({ action: 'escalate', reason: 'draft-edition' });
  });
  it('escalates an enforcement-changing rule on VC evidence', () => {
    const d = resolve({ ...base, provenance_grade: 'VC', modal_verb: 'sollte' }, { id: 'g1', severity: 'block' });
    expect(d).toMatchObject({ action: 'escalate', reason: 'vc-evidence' });
  });
  it('allows a zero-risk rule on VC evidence', () => {
    const d = resolve({ ...base, provenance_grade: 'VC', located_clause: '§5.1', clause_ref: '§4.2' },
                      { id: 'g1', clause_reference: '§4.2' });
    expect(d).toMatchObject({ action: 'stage', rule_id: 'R-CLAUSEREF' });
  });
  it('honours rule.escalateIf (mixed modal)', () => {
    const d = resolve({ ...base, modal_verb: 'mixed' }, { id: 'g1', severity: 'block' });
    expect(d).toMatchObject({ action: 'escalate', reason: 'rule-escalate' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-engine.test.mjs`
Expected: FAIL — cannot resolve `../resolver-engine.mjs`.

- [ ] **Step 3: Write minimal implementation**
```js
// scripts/reasoning-map/resolver-engine.mjs
import { RULES } from './resolver-catalog.mjs';

const DRAFT = new Set(['gelbdruck', 'dis', 'fdis']);

/** Pure: evidence + target -> Decision. No I/O. */
export function resolve(ev, target, rules = RULES) {
  const rule = rules.find(r => r.detector(ev, target));
  if (!rule) return { target_id: ev.target_id, action: 'escalate', reason: 'no-rule' };
  if (rule.escalateIf && rule.escalateIf(ev, target))
    return { target_id: ev.target_id, action: 'escalate', rule_id: rule.id, reason: 'rule-escalate' };
  if (rule.risk !== 'zero') {
    if (DRAFT.has(ev.edition))
      return { target_id: ev.target_id, action: 'escalate', rule_id: rule.id, reason: 'draft-edition' };
    if (ev.provenance_grade !== 'VA')
      return { target_id: ev.target_id, action: 'escalate', rule_id: rule.id, reason: 'vc-evidence' };
  }
  return {
    target_id: ev.target_id, action: 'stage', rule_id: rule.id, risk: rule.risk,
    change: rule.resolve(ev, target), evidence_quote: ev.source_quote, reason: 'resolved',
  };
}
```
> Order matters: draft-check is evaluated before VC-check (a draft escalates regardless of grade). Zero-risk rules skip both.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-engine.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**
```bash
git add scripts/reasoning-map/resolver-engine.mjs scripts/reasoning-map/__tests__/resolver-engine.test.mjs
git -c user.name='Alvaro Burgos' -c user.email='alvaro.burgos@ekowai.com' commit -m "feat(resolver): pure resolve() engine — first-match + safety invariants (draft/VC escalation, zero-risk exemption)"
```

---

### Task 6: Migration + rollback + ledger emitters

**Files:**
- Create: `scripts/reasoning-map/resolver-emit.mjs`
- Test: `scripts/reasoning-map/__tests__/resolver-emit.test.mjs`

**Interfaces:**
- Consumes: `Decision` (from Task 5), and a `standardCode` string.
- Produces: `toMigrationSql(decisions) => {up:string, down:string}` and `toLedgerRows(standardCode, decisions) => string` (markdown table rows). Only `action:'stage'` decisions produce SQL; escalations produce a ledger row marked ESCALATED with no SQL.

- [ ] **Step 1: Write the failing test**
```js
// scripts/reasoning-map/__tests__/resolver-emit.test.mjs
import { describe, it, expect } from 'vitest';
import { toMigrationSql, toLedgerRows } from '../resolver-emit.mjs';

const staged = { target_id: 'g1', action: 'stage', rule_id: 'R-MODAL-SEVERITY', risk: 'med',
  change: { column: 'severity', before: 'block', after: 'warn' }, evidence_quote: 'Q1' };
const escalated = { target_id: 'g2', action: 'escalate', rule_id: 'R-MODAL-SEVERITY', reason: 'rule-escalate' };

describe('emitters', () => {
  it('generates idempotent UPDATE + inverse rollback, quoting text values', () => {
    const { up, down } = toMigrationSql([staged]);
    expect(up).toContain("UPDATE compliance_requirements SET severity = 'warn' WHERE id = 'g1';");
    expect(down).toContain("UPDATE compliance_requirements SET severity = 'block' WHERE id = 'g1';");
    expect(up).toContain('-- R-MODAL-SEVERITY');
  });
  it('emits no SQL for escalations', () => {
    expect(toMigrationSql([escalated]).up.trim()).toBe('');
  });
  it('ledger rows carry rule, action, before->after, quote', () => {
    const md = toLedgerRows('DWA-M-820-2', [staged, escalated]);
    expect(md).toContain('| DWA-M-820-2 | g1 | R-MODAL-SEVERITY | stage | severity: block → warn |');
    expect(md).toContain('| DWA-M-820-2 | g2 | R-MODAL-SEVERITY | escalate (rule-escalate) |');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-emit.test.mjs`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**
```js
// scripts/reasoning-map/resolver-emit.mjs
const q = (v) => (typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

export function toMigrationSql(decisions) {
  const staged = decisions.filter(d => d.action === 'stage');
  const up = staged.map(d =>
    `-- ${d.rule_id} (risk ${d.risk})\nUPDATE compliance_requirements SET ${d.change.column} = ${q(d.change.after)} WHERE id = ${q(d.target_id)};`
  ).join('\n');
  const down = staged.map(d =>
    `UPDATE compliance_requirements SET ${d.change.column} = ${q(d.change.before)} WHERE id = ${q(d.target_id)};`
  ).join('\n');
  return { up, down };
}

export function toLedgerRows(standardCode, decisions) {
  return decisions.map(d => {
    if (d.action === 'stage') {
      const c = d.change;
      return `| ${standardCode} | ${d.target_id} | ${d.rule_id} | stage | ${c.column}: ${c.before} → ${c.after} | ${(d.evidence_quote||'').slice(0,80)} |`;
    }
    return `| ${standardCode} | ${d.target_id} | ${d.rule_id||'—'} | escalate (${d.reason}) | — | — |`;
  }).join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-emit.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add scripts/reasoning-map/resolver-emit.mjs scripts/reasoning-map/__tests__/resolver-emit.test.mjs
git -c user.name='Alvaro Burgos' -c user.email='alvaro.burgos@ekowai.com' commit -m "feat(resolver): migration/rollback/ledger emitters (idempotent UPDATEs, escalations logged not SQL'd)"
```

---

### Task 7: `resolve.mjs` CLI — wire evidence + targets → files

**Files:**
- Create: `scripts/reasoning-map/resolve.mjs`
- Test: `scripts/reasoning-map/__tests__/resolve-cli.test.mjs`

**Interfaces:**
- Consumes: `resolve` (Task 5), `toMigrationSql`/`toLedgerRows` (Task 6). Input: an evidence JSON file `[{...Evidence, target:{...Target}, standard_code}]`.
- Produces: `runResolve(records) => { migrations: {standard_code, className, up, down}[], ledger: string, escalations: Decision[] }` (pure, no fs — the fs wrapper is a thin `main()` guarded by `import.meta.url`). Migration `className` = the rule id lowercased.

- [ ] **Step 1: Write the failing test**
```js
// scripts/reasoning-map/__tests__/resolve-cli.test.mjs
import { describe, it, expect } from 'vitest';
import { runResolve } from '../resolve.mjs';

describe('runResolve', () => {
  it('splits staged vs escalated and groups migrations by standard+rule', () => {
    const records = [
      { target_id: 'g1', standard_code: 'DWA-M-820-2', provenance_grade: 'VA', edition: 'weissdruck',
        source_quote: 'Q', modal_verb: 'sollte', target: { id: 'g1', severity: 'block' } },
      { target_id: 'g2', standard_code: 'DWA-M-820-2', provenance_grade: 'VA', edition: 'weissdruck',
        source_quote: 'Q', modal_verb: 'muss', target: { id: 'g2', severity: 'block' } },
    ];
    const out = runResolve(records);
    expect(out.migrations).toHaveLength(1);
    expect(out.migrations[0]).toMatchObject({ standard_code: 'DWA-M-820-2', className: 'r-modal-severity' });
    expect(out.migrations[0].up).toContain("severity = 'warn' WHERE id = 'g1'");
    expect(out.escalations).toHaveLength(1);
    expect(out.escalations[0].target_id).toBe('g2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolve-cli.test.mjs`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**
```js
// scripts/reasoning-map/resolve.mjs
import { resolve } from './resolver-engine.mjs';
import { toMigrationSql, toLedgerRows } from './resolver-emit.mjs';

export function runResolve(records) {
  const decisions = records.map(rec => ({ rec, d: resolve(rec, rec.target) }));
  const staged = decisions.filter(x => x.d.action === 'stage');
  const escalations = decisions.filter(x => x.d.action === 'escalate').map(x => ({ ...x.d, standard_code: x.rec.standard_code }));

  // group staged by standard_code + rule_id
  const groups = new Map();
  for (const { rec, d } of staged) {
    const key = `${rec.standard_code}::${d.rule_id}`;
    if (!groups.has(key)) groups.set(key, { standard_code: rec.standard_code, className: d.rule_id.toLowerCase(), ds: [] });
    groups.get(key).ds.push(d);
  }
  const migrations = [...groups.values()].map(g => {
    const { up, down } = toMigrationSql(g.ds);
    return { standard_code: g.standard_code, className: g.className, up, down };
  });

  const ledger = decisions.map(x => toLedgerRows(x.rec.standard_code, [x.d])).join('\n');
  return { migrations, ledger, escalations };
}

// fs wrapper — only when run directly, keeps runResolve pure/testable
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const records = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = runResolve(records);
  const stamp = process.argv[3] || 'run'; // caller passes a fixed stamp (no Date.now — WSL/reproducibility)
  for (const m of out.migrations) {
    const base = `scripts/migrations/${stamp}_resolve_${m.standard_code.replace(/[^A-Za-z0-9]/g,'')}_${m.className}`;
    fs.writeFileSync(`${base}.sql`, `-- WRITTEN-NOT-APPLIED — owner one-click apply\n${m.up}\n`);
    fs.writeFileSync(`scripts/rollback-${path.basename(base)}.sql`, `${m.down}\n`);
  }
  fs.appendFileSync('.superpowers/sdd/RESOLVER-DECISIONS.md', out.ledger + '\n');
  console.log(`migrations=${out.migrations.length} escalations=${out.escalations.length}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolve-cli.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add scripts/reasoning-map/resolve.mjs scripts/reasoning-map/__tests__/resolve-cli.test.mjs
git -c user.name='Alvaro Burgos' -c user.email='alvaro.burgos@ekowai.com' commit -m "feat(resolver): resolve.mjs CLI — group staged migrations by standard+rule, log escalations, fs wrapper guarded"
```

---

### Task 8: Golden-set regression from the sign-off sheet

**Files:**
- Create: `scripts/reasoning-map/__tests__/fixtures/signoff-golden.json`
- Test: `scripts/reasoning-map/__tests__/resolver-golden.test.mjs`

**Interfaces:**
- Consumes: `resolve` (Task 5). Fixture: an array of `{ name, evidence(+target), expect_action, expect_rule_or_reason }` transcribed from `.superpowers/sdd/PROVENANCE-RULINGS-SIGNOFF.md`.

- [ ] **Step 1: Write the fixture** (transcribe representative items from each sign-off section A–G)
```json
[
  { "name": "M-732 CR-01 unsupported 50000 tonnage",
    "evidence": { "target_id": "m732-01", "provenance_grade": "VA", "edition": "weissdruck",
      "source_quote": "gelten in der Regel fuer mittelstaendische und Grossbrauereien",
      "threshold_in_source": "false", "target": { "id": "m732-01", "severity": "block", "condition": "ausstoss_jahr >= 50000" } },
    "expect_action": "stage", "expect": "R-THRESH-UNSUPPORTED" },
  { "name": "ISO-14002-2 CR-005 should-text block gate",
    "evidence": { "target_id": "iso14002-05", "provenance_grade": "VA", "edition": "published",
      "source_quote": "should review and consider", "modal_verb": "should",
      "target": { "id": "iso14002-05", "severity": "block" } },
    "expect_action": "stage", "expect": "R-MODAL-SEVERITY" },
  { "name": "ISO-14019-1 CR-024 full-domain enum no-op",
    "evidence": { "target_id": "iso14019-24", "provenance_grade": "VA", "edition": "published",
      "source_quote": "assurance opinions shall be provided", "enum_domain_coverage": "full",
      "target": { "id": "iso14019-24", "severity": "block", "condition": "assurance_conclusion IN {unmodified,qualified,adverse,disclaimed}" } },
    "expect_action": "stage", "expect": "R-ENUM-FULLDOMAIN" },
  { "name": "FLL-GAR REQ-29 z.B. example-as-threshold",
    "evidence": { "target_id": "fllgar-29", "provenance_grade": "VA", "edition": "published",
      "source_quote": "in regelmaessigen Abstaenden (z. B. mindestens einmal im Jahr)", "threshold_in_source": "example",
      "target": { "id": "fllgar-29", "severity": "block", "condition": "inspektion_intervall_jahr <= 1" } },
    "expect_action": "stage", "expect": "R-THRESH-EXAMPLE" },
  { "name": "M-179-1 REQ-01 draft edition escalates",
    "evidence": { "target_id": "m179-01", "provenance_grade": "VC", "edition": "gelbdruck",
      "source_quote": "ueblicherweise bis 5.000 m2", "threshold_in_source": "approximate",
      "target": { "id": "m179-01", "severity": "block", "condition": "A_b_a <= 5000" } },
    "expect_action": "escalate", "expect": "draft-edition" },
  { "name": "M-820-1 REQ-16 clause-ref fix (metadata, zero-risk)",
    "evidence": { "target_id": "m8201-16", "provenance_grade": "VA", "edition": "published",
      "source_quote": "Doppelbewertungsverbot", "located_clause": "§8.10.2.4", "clause_ref": "§8.7",
      "target": { "id": "m8201-16", "clause_reference": "§8.7" } },
    "expect_action": "stage", "expect": "R-CLAUSEREF" }
]
```

- [ ] **Step 2: Write the failing test**
```js
// scripts/reasoning-map/__tests__/resolver-golden.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from '../resolver-engine.mjs';

const golden = JSON.parse(readFileSync(new URL('./fixtures/signoff-golden.json', import.meta.url)));

describe('golden set (PROVENANCE-RULINGS-SIGNOFF.md)', () => {
  for (const c of golden) {
    it(c.name, () => {
      const d = resolve(c.evidence, c.evidence.target);
      expect(d.action).toBe(c.expect_action);
      expect(d.action === 'stage' ? d.rule_id : d.reason).toBe(c.expect);
    });
  }
});
```

- [ ] **Step 3: Run test to verify it fails/passes**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-golden.test.mjs`
Expected: PASS (rules from Tasks 1–5 already implemented). If any case fails, the catalog/engine has a gap — fix the rule, not the fixture.

- [ ] **Step 4: Commit**
```bash
git add scripts/reasoning-map/__tests__/fixtures/signoff-golden.json scripts/reasoning-map/__tests__/resolver-golden.test.mjs
git -c user.name='Alvaro Burgos' -c user.email='alvaro.burgos@ekowai.com' commit -m "test(resolver): golden-set regression transcribed from PROVENANCE-RULINGS-SIGNOFF.md (A–G representatives)"
```

---

### Task 9: Reproduction-check note + audit-brief evidence contract + pipeline wiring

**Files:**
- Modify: `C:\Users\Ekowai\.claude\skills\regulatory-audit-fix-campaign\references\subagent-brief.md` (append the Evidence-record contract)
- Create: `scripts/reasoning-map/RESOLVER-README.md`
- Modify: `scripts/reasoning-map/validate.mjs` (append a documented call-out to `resolve.mjs` as the next stage — do NOT auto-run prod writes)

**Interfaces:**
- Consumes: everything above. Produces: the documented pipeline hand-off + the agent contract that populates the evidence records.

- [ ] **Step 1: Append the evidence contract to the subagent brief**

Add a section "## Evidence record (for the resolver)" listing the exact `Evidence` fields from `resolver-catalog.mjs` and instructing the agent to emit one JSON record per gate/equation it audits (modal_verb read from the governing clause; threshold_in_source ∈ true/false/approximate/example; enum_domain_coverage; field_type; provenance_grade; edition; located_clause; source_quote).

- [ ] **Step 2: Write `RESOLVER-README.md`**

Document: how to run (`node scripts/reasoning-map/resolve.mjs <evidence.json> <stamp>`), the safety invariants, that migrations are WRITTEN-NOT-APPLIED, the owner apply flow (`node scratchpad/apply_mgmt.mjs scripts/migrations/<file>.sql`), and that each staged migration should be driven through an existing `tests/harness/<std>-verify` run to prove broken-before→fixed-after BEFORE applying.

- [ ] **Step 3: Add the pipeline call-out to `validate.mjs`**

At the end of `validate.mjs`, print: `console.log('Next: node scripts/reasoning-map/resolve.mjs <evidence.json> <stamp> — stages resolver migrations (WRITTEN-NOT-APPLIED)')`. No prod write.

- [ ] **Step 4: Run the full resolver test suite**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/`
Expected: PASS (all resolver tests green).

- [ ] **Step 5: Commit**
```bash
git add scripts/reasoning-map/RESOLVER-README.md scripts/reasoning-map/validate.mjs
git -c user.name='Alvaro Burgos' -c user.email='alvaro.burgos@ekowai.com' commit -m "docs(resolver): evidence-record contract in audit brief + README + validate.mjs pipeline hand-off"
# subagent-brief.md lives under ~/.claude (outside repo) — note it changed but do not git-add it
```

---

### Task 10: `R-EQ-GL13` — equation symbol/case fix (the source-settled class)

**Files:**
- Modify: `scripts/reasoning-map/resolver-catalog.mjs`
- Test: `scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`

**Interfaces:**
- Consumes: `Evidence.declared_symbols` (string[] — the equation's own declared field symbols) and `Target.formula`, `Target.output_symbol`.
- Produces: `R-EQ-GL13` (kind `equation`, risk `low`). Detector: a symbol used in `formula` differs only in case from a declared symbol (e.g. `E_E` vs declared `e_E`). Resolve: rewrite the formula token to the declared casing. Escalate if more than one declared symbol case-matches the token (ambiguous).

- [ ] **Step 1: Write the failing test** (append)
```js
describe('R-EQ-GL13', () => {
  const r = rule('R-EQ-GL13');
  it('fires on a case-only symbol mismatch vs a declared field', () => {
    const ev = { declared_symbols: ['e_E', 'V_dot', 'A'] };
    const t = { formula: 'w_P = V_dot/(A*E_E)' };
    expect(r.kind).toBe('equation');
    expect(r.detector(ev, t)).toBe(true);
    expect(r.resolve(ev, t)).toEqual({ column: 'formula', before: 'w_P = V_dot/(A*E_E)', after: 'w_P = V_dot/(A*e_E)' });
  });
  it('does not fire when all formula symbols match declared casing', () => {
    expect(r.detector({ declared_symbols: ['e_E'] }, { formula: 'x = e_E' })).toBe(false);
  });
  it('escalates when two declared symbols case-collide with the token', () => {
    expect(r.escalateIf({ declared_symbols: ['e_e', 'E_E'] }, { formula: 'x = e_E' })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`
Expected: FAIL — rule not found.

- [ ] **Step 3: Write minimal implementation** (append to `RULES`; add `declared_symbols?: string[]` to the Evidence typedef)
```js
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
      return { column: 'formula', before: t.formula, after };
    },
  },
```
> Note: the emitter (Task 6) writes `UPDATE equations SET formula = … WHERE id = …` for equation-kind targets. Add a `table` field to the change (`compliance_requirements` for gate rules, `equations` for R-EQ-GL13) and have `toMigrationSql` read `d.change.table ?? 'compliance_requirements'`. Update the Task 6 emitter + its test accordingly when implementing this task.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run scripts/reasoning-map/__tests__/resolver-catalog.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add scripts/reasoning-map/resolver-catalog.mjs scripts/reasoning-map/__tests__/resolver-catalog.test.mjs
git -c user.name='Alvaro Burgos' -c user.email='alvaro.burgos@ekowai.com' commit -m "feat(resolver): R-EQ-GL13 equation symbol/case fix (source-settled class), table-aware emitter"
```

---

## Self-review notes
- **Spec coverage:** Evidence record (Task 1 typedef + Task 9 brief), all 7 catalog classes (Tasks 1–4 gate classes + Task 10 R-EQ-GL13 equation class), safety invariants (Task 5), output+ledger (Tasks 6–7 + Task 10's table-aware note), golden set (Task 8), pipeline+brief (Task 9). No spec requirement left without a task.
- **Placeholder scan:** none — all steps carry real code.
- **Type consistency:** `Decision`, `Change`, `Evidence`, `Rule` names consistent across Tasks 1/5/6/7; `runResolve` output shape matches Task 7 test.
- **No `Date.now()`:** the CLI takes an explicit `stamp` arg (WSL/reproducibility constraint from CLAUDE.md).
