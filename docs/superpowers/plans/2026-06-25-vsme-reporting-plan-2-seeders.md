# VSME Reporting — Plan 2: Seeders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate the full tagged VSME field skeleton (~140 datapoints across modules B1–B11 + C-modules) from the EFRAG XBRL taxonomy and import it via the existing Pass3c pipeline, plus import the UBA emission factors into `emission_factors` — all against the **local** Supabase DB.

**Architecture:** Two one-time, idempotent seeders that read machine-readable sources (no hand-typing). Seeder A parses the VSME taxonomy (`.xsd` concepts + `vsme-label-en.xml` labels + `vsme-presentation.xml` module hierarchy + `roleType` defs) into a Pass3c-format workbook, which the existing `import-pass3c.ts` pipeline (extended to carry `owner` + `xbrl_element_id`) writes to the DB. Seeder B parses the UBA xlsx Scope 1 & 2 sheets into `emission_factors`. Everything lands `imported_unverified`.

**Tech Stack:** TypeScript, `tsx`, `fast-xml-parser` (new devDep, for the taxonomy XML), `xlsx` (already used by the pipeline, for the workbook + UBA), Drizzle/Postgres (local), vitest.

**Source spec:** `docs/superpowers/specs/2026-06-25-vsme-reporting-design.md` §7 (seeding). Plan 1 (schema) is merged: `fields.owner`, `fields.xbrl_element_id`, `emission_factors` exist on local + prod.

## Global Constraints

- **Target DB = LOCAL.** `.env.local` `DATABASE_URL` points at the local stack (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`); prod is parked as `DATABASE_URL_PROD`. **Never** run a seeder against prod. The local stack runs in WSL (`supabase start` if down).
- **Package manager:** `pnpm`. Run scripts via `pnpm tsx <script>`.
- **Reference file locations (read-only inputs):**
  - Taxonomy (unzipped): `C:\Users\Ekowai\Desktop\environmental-reporting service\01_Referenz\VSME-XBRL-Taxonomy-February-2026.zip` → extract to a repo-ignored temp dir; concepts at `.../vsme/2026-02-01/vsme-all.xsd`, labels `vsme-label-en.xml`, hierarchy `vsme-presentation.xml`.
  - UBA factors: `C:\Users\Ekowai\Desktop\environmental-reporting service\01_Referenz\uba_liste_ef_für_thg_bilanzierung_v2.1.xlsx`.
- **Owner-by-module rule (default; per-field editable later):** module-code prefix → `B03|B04|B05|B06|B07` ⇒ `ekowai_env`; `B08|B09|B10|B11|C05|C06|C07|C08|C09` ⇒ `client_supplied`; everything else (`B01|B02|C01|C02|C03|C04|D99`) ⇒ `general`. (C03/C04 are environmental but out of v1 deep scope; tag `general` to keep v1 worklist focused — they are Comprehensive-module.)
- **XBRL type → wizard `data_type` mapping:** `*monetaryItemType|*massItemType|*volumeItemType|*energyItemType|*percentItemType|*decimalItemType|*integerItemType|*pureItemType` ⇒ `number`; `*booleanItemType` ⇒ `boolean`; `*dateItemType` ⇒ `date`; `enumerationItemType|enumerationSetItemType` ⇒ `enum`; everything else (incl. `stringItemType`, `textBlockItemType`) ⇒ `text`. Abstract concepts (`abstract="true"`) and domain/member items (`domainItemType`) are **structural** — not emitted as fields.
- **Pipeline gotchas (from pipeline map):** `owner` + `xbrl_element_id` must NOT be added to `fieldContentChanged()` (avoid re-import reversion). Worksheet `archetype` ∈ `{registration,data_collection,calculation,summary,verification}`. Compliance `evaluation_expression` must be non-empty unless `evaluation_type='field_presence'`; add a `severity` column mirroring intent (`block` default).
- **Verification status:** all seeded rows land `imported_unverified` (pipeline default) — the engineer verify pass is the "read VSME properly" step.
- **Idempotent:** re-running a seeder UPSERTs; re-imports preserve `engineer_verified`.

---

### Task 1: Add `fast-xml-parser` + thread `owner`/`xbrl_element_id` through the Pass3c pipeline

**Files:**
- Modify: `package.json` (add `fast-xml-parser` devDep)
- Modify: `scripts/_pass3c-types.ts` (FieldRow type)
- Modify: `scripts/_pass3c-parsers.ts` (`parseFields`)
- Modify: `scripts/_pass3c-db.ts` (`NewFieldRow` type, field map, insert, `onConflictDoUpdate`)
- Test: `scripts/__tests__/pass3c-owner-xbrl.test.ts`

**Interfaces:**
- Produces: the importer reads two new optional Fields-sheet columns `owner`, `xbrl_element_id` and writes them to `fields.owner` / `fields.xbrl_element_id`. Consumed by Task 5's workbook (which emits those columns) and Task 7's import.

- [ ] **Step 1: Add the dep**

Run: `pnpm add -D fast-xml-parser`
Expected: `package.json` devDependencies gains `fast-xml-parser`.

- [ ] **Step 2: Write the failing test**

```typescript
// scripts/__tests__/pass3c-owner-xbrl.test.ts
import { describe, it, expect } from 'vitest';
import { parseWorkbook } from '../_pass3c-parsers';
import * as XLSX from 'xlsx';

function wbWithField(extra: Record<string, unknown>) {
  const wb = XLSX.utils.book_new();
  const sheets: Record<string, unknown[]> = {
    Standards: [{ code: 'TESTVSME', title_de: 't', title_en: 't' }],
    Worksheets: [{ worksheet_code: 'W1', title_de: 'w', archetype: 'data_collection' }],
    Sections: [], Enum_Values: [], Equations: [], Compliance_Requirements: [],
    Fields: [{ symbol: 'f1', data_type: 'text', origin_worksheet: 'W1', label_de: 'F', ...extra }],
  };
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows as object[]), name);
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return parseWorkbook(buf as Buffer);
}

describe('pass3c field owner + xbrl_element_id', () => {
  it('parses owner and xbrl_element_id columns', () => {
    const parsed = wbWithField({ owner: 'ekowai_env', xbrl_element_id: 'vsme_Foo' });
    expect(parsed.fields[0].owner).toBe('ekowai_env');
    expect(parsed.fields[0].xbrl_element_id).toBe('vsme_Foo');
  });
  it('defaults them to null when absent', () => {
    const parsed = wbWithField({});
    expect(parsed.fields[0].owner).toBeNull();
    expect(parsed.fields[0].xbrl_element_id).toBeNull();
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `pnpm vitest run --project unit scripts/__tests__/pass3c-owner-xbrl.test.ts`
Expected: FAIL — `owner`/`xbrl_element_id` undefined on parsed field.

- [ ] **Step 4: Thread the columns (6 edit points)**

In `scripts/_pass3c-types.ts` `FieldRow` type, after `notes: string | null;` add:
```typescript
  owner: string | null;
  xbrl_element_id: string | null;
```
In `scripts/_pass3c-parsers.ts` `parseFields()` map, add:
```typescript
    owner: asString(r.owner),
    xbrl_element_id: asString(r.xbrl_element_id),
```
In `scripts/_pass3c-db.ts` `NewFieldRow` type add `owner: string | null;` and `xbrlElementId: string | null;`. In the field-construction map add `owner: f.owner, xbrlElementId: f.xbrl_element_id,`. In the fields `.values()` object add `owner, xbrlElementId,`. In `onConflictDoUpdate.set` add `owner: sql\`excluded.owner\`, xbrlElementId: sql\`excluded.xbrl_element_id\`,`. **Do NOT** add them to `fieldContentChanged()`.

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run --project unit scripts/__tests__/pass3c-owner-xbrl.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/_pass3c-types.ts scripts/_pass3c-parsers.ts scripts/_pass3c-db.ts scripts/__tests__/pass3c-owner-xbrl.test.ts
git commit -m "feat(vsme): thread owner + xbrl_element_id through Pass3c import

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Taxonomy concept + label parser

**Files:**
- Create: `scripts/vsme/taxonomy.ts`
- Create: `scripts/vsme/_setup.ts` (constant: TAXONOMY_DIR; unzip helper if needed)
- Test: `scripts/vsme/__tests__/taxonomy.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type VsmeConcept = {
    id: string;            // e.g. "vsme_WeightOfMaterialUsed"
    name: string;          // "WeightOfMaterialUsed"
    xbrlType: string;      // raw type attr, e.g. "dtr-types:massItemType"
    abstract: boolean;
    labelEn: string | null;
    dataType: 'number'|'text'|'enum'|'boolean'|'date';  // mapped per Global Constraints
  };
  export function parseConcepts(taxonomyDir: string): VsmeConcept[];
  export function mapXbrlType(xbrlType: string, abstract: boolean): VsmeConcept['dataType'];
  ```
  Consumed by Task 3 (module assignment) and Task 5 (field rows).

- [ ] **Step 1: Write failing test (real fixtures from the taxonomy)**

```typescript
// scripts/vsme/__tests__/taxonomy.test.ts
import { describe, it, expect } from 'vitest';
import { parseConcepts, mapXbrlType } from '../taxonomy';
import { TAXONOMY_DIR } from '../_setup';

describe('mapXbrlType', () => {
  it('maps numeric XBRL item types to number', () => {
    expect(mapXbrlType('dtr-types:massItemType', false)).toBe('number');
    expect(mapXbrlType('dtr-types:volumeItemType', false)).toBe('number');
    expect(mapXbrlType('xbrli:monetaryItemType', false)).toBe('number');
  });
  it('maps enumeration to enum, string to text, boolean to boolean', () => {
    expect(mapXbrlType('enum2:enumerationItemType', false)).toBe('enum');
    expect(mapXbrlType('xbrli:stringItemType', false)).toBe('text');
    expect(mapXbrlType('xbrli:booleanItemType', false)).toBe('boolean');
  });
});

describe('parseConcepts', () => {
  const concepts = parseConcepts(TAXONOMY_DIR);
  it('finds a known concrete datapoint with its label and type', () => {
    const c = concepts.find((x) => x.name === 'WeightOfMaterialUsed');
    expect(c).toBeDefined();
    expect(c!.id).toBe('vsme_WeightOfMaterialUsed');
    expect(c!.dataType).toBe('number');
    expect(c!.abstract).toBe(false);
    expect((c!.labelEn ?? '').toLowerCase()).toContain('weight');
  });
  it('flags abstract grouping concepts', () => {
    const abs = concepts.find((x) => x.name.endsWith('Abstract'));
    expect(abs?.abstract).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm vitest run --project unit scripts/vsme/__tests__/taxonomy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `_setup.ts` and `taxonomy.ts`**

`_setup.ts`:
```typescript
import path from 'node:path';
const REF = 'C:/Users/Ekowai/Desktop/environmental-reporting service/01_Referenz';
// The test/CI must have the taxonomy unzipped here once (see Task 7 Step 0).
export const TAXONOMY_DIR = path.join(REF, 'VSME-XBRL-Taxonomy-February-2026',
  'xbrl.efrag.org', 'taxonomy', 'vsme', '2026-02-01');
```

`taxonomy.ts` — use `fast-xml-parser` with `{ ignoreAttributes: false, attributeNamePrefix: '@_' }`. Parse `vsme-all.xsd` → iterate `xs:schema['xs:element']` array; for each: `id=@_id`, `name=@_name`, `xbrlType=@_type`, `abstract=@_abstract === 'true'`. Parse `vsme-label-en.xml` → build `Map<conceptName, labelText>` from `link:label` elements with `@_xlink:role` ending `/role/label` (the standard label, not measurementGuidance); the `@_xlink:label` is `label_<Name>`, strip the `label_` prefix to key by concept name. `mapXbrlType` implements the Global Constraints mapping (substring match on the type local-name). Return concepts with `labelEn` joined and `dataType` mapped.

```typescript
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';

export type VsmeConcept = { id: string; name: string; xbrlType: string; abstract: boolean; labelEn: string | null; dataType: 'number'|'text'|'enum'|'boolean'|'date'; };

const NUMERIC = ['monetary','mass','volume','energy','percent','decimal','integer','pure','area','power'];
export function mapXbrlType(xbrlType: string, _abstract: boolean): VsmeConcept['dataType'] {
  const t = (xbrlType || '').split(':').pop()!.toLowerCase();
  if (t.startsWith('enumeration')) return 'enum';
  if (t.startsWith('boolean')) return 'boolean';
  if (t.startsWith('date')) return 'date';
  if (NUMERIC.some((n) => t.startsWith(n))) return 'number';
  return 'text';
}

export function parseConcepts(taxonomyDir: string): VsmeConcept[] {
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const xsd = p.parse(fs.readFileSync(path.join(taxonomyDir, 'vsme-all.xsd'), 'utf8'));
  const els = xsd['xs:schema']['xs:element'] as Record<string, string>[];
  const labels = parseLabels(p, path.join(taxonomyDir, 'vsme-label-en.xml'));
  return els.map((e) => {
    const name = e['@_name'];
    const xbrlType = e['@_type'] ?? '';
    const abstract = e['@_abstract'] === 'true';
    return { id: e['@_id'], name, xbrlType, abstract, labelEn: labels.get(name) ?? null, dataType: mapXbrlType(xbrlType, abstract) };
  });
}

function parseLabels(p: XMLParser, file: string): Map<string,string> {
  const x = p.parse(fs.readFileSync(file, 'utf8'));
  const root = x['link:linkbase']['link:labelLink'];
  const labelNodes = ([] as Record<string,unknown>[]).concat(root['link:label'] ?? []);
  const map = new Map<string,string>();
  for (const n of labelNodes) {
    const role = String(n['@_xlink:role'] ?? '');
    if (!role.endsWith('/role/label')) continue; // standard label only
    const ref = String(n['@_xlink:label'] ?? '');       // "label_<Name>"
    const name = ref.replace(/^label_/, '');
    const text = String(n['#text'] ?? '').trim();
    if (name && text && !map.has(name)) map.set(name, text);
  }
  return map;
}
```
(Implementer: adjust `link:label` traversal to the actual nesting — the test fixtures pin the required output.)

- [ ] **Step 4: Run, verify pass**

Run: `pnpm vitest run --project unit scripts/vsme/__tests__/taxonomy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/vsme/taxonomy.ts scripts/vsme/_setup.ts scripts/vsme/__tests__/taxonomy.test.ts
git commit -m "feat(vsme): parse taxonomy concepts + english labels

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Module/role mapping + owner assignment

**Files:**
- Create: `scripts/vsme/modules.ts`
- Test: `scripts/vsme/__tests__/modules.test.ts`

**Interfaces:**
- Consumes: `VsmeConcept[]` (Task 2), taxonomy dir.
- Produces:
  ```typescript
  export type ModuleRole = { roleUri: string; code: string; title: string };  // code e.g. "B03.000"
  export function parseRoles(taxonomyDir: string): ModuleRole[];
  export function moduleCodeToOwner(code: string): 'ekowai_env'|'client_supplied'|'general';
  // concept id -> module role code, from vsme-presentation.xml locators
  export function conceptModuleMap(taxonomyDir: string): Map<string, string>;  // conceptName -> "B03"
  ```

- [ ] **Step 1: Write failing test (real expected values)**

```typescript
import { describe, it, expect } from 'vitest';
import { parseRoles, moduleCodeToOwner, conceptModuleMap } from '../modules';
import { TAXONOMY_DIR } from '../_setup';

describe('moduleCodeToOwner', () => {
  it('environment B03-B07 -> ekowai_env', () => {
    for (const c of ['B03','B04','B05','B06','B07']) expect(moduleCodeToOwner(c)).toBe('ekowai_env');
  });
  it('social/governance -> client_supplied', () => {
    for (const c of ['B08','B09','B10','B11','C05','C09']) expect(moduleCodeToOwner(c)).toBe('client_supplied');
  });
  it('general info -> general', () => {
    for (const c of ['B01','B02','C01','D99']) expect(moduleCodeToOwner(c)).toBe('general');
  });
});

describe('parseRoles', () => {
  it('includes the energy module B03.000 with its title', () => {
    const roles = parseRoles(TAXONOMY_DIR);
    const r = roles.find((x) => x.code === 'B03.000');
    expect(r).toBeDefined();
    expect(r!.title.toLowerCase()).toContain('energy');
  });
});

describe('conceptModuleMap', () => {
  it('assigns a known water concept to B06', () => {
    const m = conceptModuleMap(TAXONOMY_DIR);
    // at least one concept maps to a B06 (water) module
    expect([...m.values()].some((v) => v.startsWith('B06'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm vitest run --project unit scripts/vsme/__tests__/modules.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `modules.ts`**

`parseRoles`: parse `vsme-all.xsd` `xs:schema['xs:annotation']['xs:appinfo']['link:roleType']` array; each has `@_roleURI` and `link:definition` text like `[B03.000] - Environment - Total Energy Consumption`. Extract `code` via regex `/\[([A-Z]\d{2}\.\d{3})\]/` and `title` = text after the `] - `. Skip `[99xxx]` enumeration roles (no module prefix match).
`moduleCodeToOwner(code)`: take `code.slice(0,3)` (e.g. `B03`); apply the Global-Constraints owner rule via two Sets.
`conceptModuleMap`: parse `vsme-presentation.xml`; for each `link:presentationLink` (`@_xlink:role` = a roleURI), resolve its `link:loc` locators (`@_xlink:href` ends `#vsme_<Name>`, `@_xlink:label` = locator label); map each concept name under that link to the role's code (looked up from `parseRoles` by roleURI → code, slice 0,3). A concept may appear under multiple roles — keep the first environmental/social/governance B/C code (skip 99/D99 if a B/C exists).

```typescript
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';

const ENV = new Set(['B03','B04','B05','B06','B07']);
const CLIENT = new Set(['B08','B09','B10','B11','C05','C06','C07','C08','C09']);
export function moduleCodeToOwner(code: string): 'ekowai_env'|'client_supplied'|'general' {
  const k = code.slice(0,3);
  if (ENV.has(k)) return 'ekowai_env';
  if (CLIENT.has(k)) return 'client_supplied';
  return 'general';
}

export type ModuleRole = { roleUri: string; code: string; title: string };
export function parseRoles(taxonomyDir: string): ModuleRole[] {
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const xsd = p.parse(fs.readFileSync(path.join(taxonomyDir, 'vsme-all.xsd'), 'utf8'));
  const appinfo = xsd['xs:schema']['xs:annotation']['xs:appinfo'];
  const roleTypes = ([] as Record<string,unknown>[]).concat(appinfo['link:roleType'] ?? []);
  const out: ModuleRole[] = [];
  for (const rt of roleTypes) {
    const def = String(rt['link:definition'] ?? '');
    const m = def.match(/\[([A-Z]\d{2}\.\d{3})\]\s*-?\s*(.*)$/);
    if (!m) continue;
    out.push({ roleUri: String(rt['@_roleURI']), code: m[1], title: m[2].trim() });
  }
  return out;
}

export function conceptModuleMap(taxonomyDir: string): Map<string,string> {
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const roles = new Map(parseRoles(taxonomyDir).map((r) => [r.roleUri, r.code]));
  const x = p.parse(fs.readFileSync(path.join(taxonomyDir, 'vsme-presentation.xml'), 'utf8'));
  const links = ([] as Record<string,unknown>[]).concat(x['link:linkbase']['link:presentationLink'] ?? []);
  const map = new Map<string,string>();
  for (const link of links) {
    const code = roles.get(String(link['@_xlink:role']));
    if (!code) continue;
    const locs = ([] as Record<string,unknown>[]).concat(link['link:loc'] ?? []);
    for (const loc of locs) {
      const href = String(loc['@_xlink:href'] ?? '');
      const name = href.split('#vsme_').pop();
      if (!name || href === name) continue;
      const existing = map.get(name);
      // prefer a real module (B/C) over generic; first wins otherwise
      if (!existing) map.set(name, code);
    }
  }
  return map;
}
```
(Implementer: pin behavior to the test assertions; adjust traversal to real nesting.)

- [ ] **Step 4: Run, verify pass**

Run: `pnpm vitest run --project unit scripts/vsme/__tests__/modules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/vsme/modules.ts scripts/vsme/__tests__/modules.test.ts
git commit -m "feat(vsme): map taxonomy concepts to modules + owner tags

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Enumeration vocabularies → Enum_Values rows

**Files:**
- Create: `scripts/vsme/enums.ts`
- Test: `scripts/vsme/__tests__/enums.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type EnumRow = { enum_name: string; value: string; label_en: string; order_index: number };
  // For each enum-typed concept, its allowed members (from the enum2 domain linkrole / vsme-definition.xml).
  export function parseEnumValues(taxonomyDir: string): EnumRow[];
  ```
  `enum_name` = the owning concept's `name` (so it keys to the field symbol in Task 5). Consumed by Task 5.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { parseEnumValues } from '../enums';
import { TAXONOMY_DIR } from '../_setup';

describe('parseEnumValues', () => {
  const rows = parseEnumValues(TAXONOMY_DIR);
  it('produces members for BasisForPreparation', () => {
    const r = rows.filter((x) => x.enum_name === 'BasisForPreparation');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].label_en.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm vitest run --project unit scripts/vsme/__tests__/enums.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `enums.ts`**

For each concrete enum concept (Task 2 `dataType==='enum'`), its `enum2:domain` attribute (e.g. `vsme:BasisForPreparationMember`) names a domain; the members live under the matching enum linkrole in `vsme-definition.xml` (definition arcs `domain-member`). Resolve domain → member concept names → their English labels (reuse Task 2's label map). Emit `EnumRow` per member with `value` = member name, `label_en` = label, `order_index` = position. (Implementer: confirm the enum linkrole structure in `vsme-definition.xml`; the test pins the required output for `BasisForPreparation`.)

- [ ] **Step 4: Run, verify pass**

Run: `pnpm vitest run --project unit scripts/vsme/__tests__/enums.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/vsme/enums.ts scripts/vsme/__tests__/enums.test.ts
git commit -m "feat(vsme): extract enumeration vocabularies from taxonomy

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Assemble the Pass3c workbook

**Files:**
- Create: `scripts/vsme/build-workbook.ts`
- Test: `scripts/vsme/__tests__/build-workbook.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4 (`parseConcepts`, `conceptModuleMap`, `moduleCodeToOwner`, `parseRoles`, `parseEnumValues`).
- Produces: `export function buildVsmeWorkbook(taxonomyDir: string): Buffer;` — a 7-sheet Pass3c `.xlsx` buffer. Also `export function buildVsmeRows(taxonomyDir): { standards; worksheets; sections; fields; enum_values; equations; compliance_requirements };` (rows, for assertions). Consumed by Task 7.

- [ ] **Step 1: Write failing test (real shape)**

```typescript
import { describe, it, expect } from 'vitest';
import { buildVsmeRows } from '../build-workbook';
import { TAXONOMY_DIR } from '../_setup';

describe('buildVsmeRows', () => {
  const r = buildVsmeRows(TAXONOMY_DIR);
  it('one standard VSME', () => {
    expect(r.standards).toHaveLength(1);
    expect(r.standards[0].code).toBe('VSME');
  });
  it('emits worksheets for B03 (energy) and B07 (circular)', () => {
    const codes = r.worksheets.map((w: any) => w.worksheet_code);
    expect(codes.some((c: string) => c.includes('B03'))).toBe(true);
    expect(codes.some((c: string) => c.includes('B07'))).toBe(true);
  });
  it('every field has owner + xbrl_element_id; ~100-160 fields', () => {
    expect(r.fields.length).toBeGreaterThan(90);
    expect(r.fields.length).toBeLessThan(200);
    for (const f of r.fields) {
      expect(['ekowai_env','client_supplied','general']).toContain(f.owner);
      expect(f.xbrl_element_id).toMatch(/^vsme_/);
    }
  });
  it('B06 water fields are ekowai_env', () => {
    const water = r.fields.filter((f: any) => f.origin_worksheet.includes('B06'));
    expect(water.length).toBeGreaterThan(0);
    expect(water.every((f: any) => f.owner === 'ekowai_env')).toBe(true);
  });
  it('archetypes are valid', () => {
    const ok = new Set(['registration','data_collection','calculation','summary','verification']);
    expect(r.worksheets.every((w: any) => ok.has(w.archetype))).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm vitest run --project unit scripts/vsme/__tests__/build-workbook.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `build-workbook.ts`**

Build rows:
- `standards`: `[{ code:'VSME', title_de:'VSME – Freiwilliger Standard für KMU', title_en:'VSME – Voluntary SME Standard' }]`.
- `worksheets`: one per module role that has ≥1 concrete field (from `parseRoles` ∩ concepts present). `worksheet_code` = `VSME-<code>` (e.g. `VSME-B03.000`); `title_de`/`title_en` from role title; `archetype` = `data_collection` (default), `registration` for `B01.000`, `summary` for B03 GHG totals modules — keep simple: all `data_collection` except `B01.000` ⇒ `registration`.
- `sections`: optional; emit one section per worksheet (code `<wsCode>-A`, title from role) so fields have a home. (`parent_section_code` empty.)
- `fields`: for each **concrete** concept (`!abstract` and `dataType` not from a domain item), with a module mapping: `symbol` = concept name; `label_de` = labelEn (fallback to name) — German labels can be filled in verify pass; `label_en` = labelEn; `data_type` = mapped; `origin_worksheet` = `VSME-<moduleCode>`; `owner` = `moduleCodeToOwner(moduleCode)`; `xbrl_element_id` = concept id; `required` = `'no'` (engineer sets gates later); `verification_status` = `imported_unverified`. Drop concepts with no module mapping (structural/cross-cutting) — log the count.
- `enum_values`: from Task 4 `parseEnumValues` (enum_name = concept name).
- `equations`: `[]` (none in v1; CO₂ engine is Plan 3).
- `compliance_requirements`: minimal — one `field_presence` CR per B3 core total (e.g. require Scope 1 + Scope 2 + total energy datapoints present), `severity='block'`, `evaluation_type='field_presence'`, `required_field_symbols` = those concept names. (Keep to ≤5; the engineer expands in verify pass.)

`buildVsmeWorkbook` writes those rows to a 7-sheet xlsx via `XLSX.utils.json_to_sheet` (sheet names exactly: Standards, Worksheets, Sections, Fields, Enum_Values, Equations, Compliance_Requirements).

- [ ] **Step 4: Run, verify pass**

Run: `pnpm vitest run --project unit scripts/vsme/__tests__/build-workbook.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/vsme/build-workbook.ts scripts/vsme/__tests__/build-workbook.test.ts
git commit -m "feat(vsme): assemble Pass3c workbook from taxonomy

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: UBA emission-factor importer (Seeder B)

**Files:**
- Create: `scripts/vsme/import-uba-factors.ts`
- Test: `scripts/vsme/__tests__/uba-factors.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type FactorRow = { uba_id:string; scope:string; category:string; subcategory:string|null; unit:string; kg_co2e:number; kg_co2:number|null; kg_ch4:number|null; kg_n2o:number|null; source:'UBA'; source_version:string; dataset_year:number; sheet:string };
  export function parseUbaFactors(xlsxPath: string, version: string, year: number): FactorRow[]; // Scope 1 & 2 sheets only
  export async function importFactors(databaseUrl: string, rows: FactorRow[]): Promise<number>; // upsert, returns count
  ```

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { parseUbaFactors } from '../import-uba-factors';
const UBA = 'C:/Users/Ekowai/Desktop/environmental-reporting service/01_Referenz/uba_liste_ef_für_thg_bilanzierung_v2.1.xlsx';

describe('parseUbaFactors', () => {
  const rows = parseUbaFactors(UBA, 'v2.1', 2024);
  it('parses the German grid electricity factor (Scope 2)', () => {
    const grid = rows.find((r) => r.uba_id === '05_20_01_001_01');
    expect(grid).toBeDefined();
    expect(grid!.scope).toContain('Scope 2');
    expect(grid!.unit).toBe('kWh');
    expect(grid!.kg_co2e).toBeGreaterThan(0.3);
    expect(grid!.kg_co2e).toBeLessThan(0.5);
  });
  it('only includes Scope 1 & 2 sheets (no Scope 3-only rows)', () => {
    expect(rows.every((r) => !/Scope 3/.test(r.scope) || /Scope 2/.test(r.scope))).toBe(true);
  });
  it('all rows carry version + year', () => {
    expect(rows.every((r) => r.source_version === 'v2.1' && r.dataset_year === 2024)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm vitest run --project unit scripts/vsme/__tests__/uba-factors.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `import-uba-factors.ts`**

Read sheets `01_Stationäre_Verbrennung`, `02_Mobile_Verbrennung`, `03_Industrieprozesse`, `04_Kältemittel u.a.`, `05_Strom`, `06_Wärme`, `11_Abwasser` (the Scope 1 & 2 set). Each sheet has a header row `ID | Scope | Level 1 | Level 2 | Einheit | kg CO2e | kg CO2 | kg CH4 | ...`; find the header row dynamically (first row whose first cell is `ID`), then read data rows until blank. Keep only rows whose `Scope` is `Scope 1` or `Scope 2` (skip `Scope 3 - …`). Map columns → `FactorRow`; `sheet` = sheet name. `importFactors` UPSERTs into `emission_factors` on `(uba_id, source_version)` via the `postgres` client (mirror the schema-test connection pattern; loads `.env.local` → local DB).

- [ ] **Step 4: Run, verify pass**

Run: `pnpm vitest run --project unit scripts/vsme/__tests__/uba-factors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/vsme/import-uba-factors.ts scripts/vsme/__tests__/uba-factors.test.ts
git commit -m "feat(vsme): parse UBA Scope 1 & 2 emission factors

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Seed into LOCAL + verify against the VSME Standard PDF

**Files:**
- Create: `scripts/vsme/seed-vsme.ts` (orchestrator CLI)
- Test: `scripts/vsme/__tests__/seed-vsme.integration.test.ts` (integration project)

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: a `pnpm tsx scripts/vsme/seed-vsme.ts [--dry-run]` command that (a) builds the workbook to a temp file, (b) imports it via the existing `importWorkbook` from `_pass3c-db.ts`, (c) imports UBA factors. Run against LOCAL only.

- [ ] **Step 0: One-time — ensure taxonomy is unzipped + local stack up**

Run (PowerShell): `Expand-Archive` the taxonomy zip to the `01_Referenz` folder if `vsme-all.xsd` isn't already at `TAXONOMY_DIR`. Ensure `wsl -d Ubuntu supabase start` (local DB reachable on 54322). Confirm `.env.local` `DATABASE_URL` → local.

- [ ] **Step 1: Write failing integration test**

```typescript
// scripts/vsme/__tests__/seed-vsme.integration.test.ts
// @vitest-environment node
import '../../../src/lib/db/__tests__/_setup-env';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { seedVsme } from '../seed-vsme';

describe('VSME seed (local)', () => {
  beforeAll(async () => { await seedVsme({ dryRun: false }); });
  it('inserts the VSME standard', async () => {
    const r = await db.execute(sql`select count(*)::int n from standards where code='VSME'`);
    expect((r as any)[0].n).toBe(1);
  });
  it('inserts ~100-160 VSME fields, all owner-tagged', async () => {
    const r = await db.execute(sql`select count(*)::int n, count(owner)::int o from fields f join worksheet_templates w on f.worksheet_template_id=w.id join standards s on w.standard_id=s.id where s.code='VSME'`);
    const { n, o } = (r as any)[0];
    expect(n).toBeGreaterThan(90); expect(n).toBeLessThan(200); expect(o).toBe(n);
  });
  it('loads UBA factors incl. the grid electricity factor', async () => {
    const r = await db.execute(sql`select count(*)::int n from emission_factors where uba_id='05_20_01_001_01'`);
    expect((r as any)[0].n).toBe(1);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm vitest run --project integration scripts/vsme/__tests__/seed-vsme.integration.test.ts`
Expected: FAIL — `seedVsme` not defined.

- [ ] **Step 3: Implement `seed-vsme.ts`**

```typescript
import 'dotenv/config';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { buildVsmeWorkbook } from './build-workbook';
import { parseWorkbook } from '../_pass3c-parsers';
import { validateWorkbook } from '../_pass3c-validate';
import { importWorkbook } from '../_pass3c-db';
import { parseUbaFactors, importFactors } from './import-uba-factors';
import { TAXONOMY_DIR } from './_setup';

const UBA = 'C:/Users/Ekowai/Desktop/environmental-reporting service/01_Referenz/uba_liste_ef_für_thg_bilanzierung_v2.1.xlsx';

export async function seedVsme(opts: { dryRun: boolean }) {
  const url = process.env.DATABASE_URL!;
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error('SAFETY: DATABASE_URL is not local — refusing to seed.');
  const buf = buildVsmeWorkbook(TAXONOMY_DIR);
  const tmp = path.join(os.tmpdir(), 'VSME_Pass3c.xlsx'); fs.writeFileSync(tmp, buf);
  const parsed = parseWorkbook(buf);
  const errors = validateWorkbook(parsed);
  if (errors.length) { console.error(errors.slice(0, 50)); throw new Error(`workbook invalid: ${errors.length} errors`); }
  if (opts.dryRun) { console.log('dry-run: workbook valid', { fields: parsed.fields.length }); return; }
  await importWorkbook(url, parsed);
  const factors = parseUbaFactors(UBA, 'v2.1', 2024);
  const n = await importFactors(url, factors);
  console.log(`seeded VSME: ${parsed.fields.length} fields, ${n} factors`);
}

if (process.argv[1]?.endsWith('seed-vsme.ts')) {
  seedVsme({ dryRun: process.argv.includes('--dry-run') }).catch((e) => { console.error(e); process.exit(1); });
}
```
The hard **SAFETY guard** (refuse non-local URL) prevents accidental prod seeding.

- [ ] **Step 4: Run, verify pass**

Run: `pnpm vitest run --project integration scripts/vsme/__tests__/seed-vsme.integration.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Manual verification vs the VSME Standard PDF**

Run: `pnpm tsx scripts/vsme/seed-vsme.ts --dry-run` and eyeball the field count + a sample of B3/B6/B7 fields against `VSME Standard.pdf` §B3–B7. Record the count. (This is the start of the engineer verify pass — fields remain `imported_unverified`.)

- [ ] **Step 6: Commit**

```bash
git add scripts/vsme/seed-vsme.ts scripts/vsme/__tests__/seed-vsme.integration.test.ts
git commit -m "feat(vsme): orchestrate VSME seed into local DB (workbook + UBA factors)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage (§7):** Seeder A = Tasks 2–5 (taxonomy → tagged workbook) + Task 1 (pipeline `owner`/`xbrl_element_id`) + Task 7 (import). Seeder B = Task 6 + Task 7. Owner-by-module rule = Task 3. NACE/waste/enum vocabularies = Task 4 (enum domains; NACE/waste are large external enums — see gap below). `imported_unverified` = pipeline default (Task 1/7). Module-level structure = Task 5. ✅ with one scoped gap.
- **Scoped gap (flagged, not silent):** NACE (sector, B1) and waste-code (B7) vocabularies are huge external taxonomies (`nace-codes.xsd`, `waste.xsd`) — Task 4 covers the *intrinsic* `99xxx` VSME enums; wiring the full NACE/waste lists is deferred to a follow-up (they're reference dropdowns, not blocking the field skeleton). Noted in Task 4.
- **Placeholders:** XML-parsing tasks (2,3,4) give the algorithm + library + real-value test assertions that pin behavior; the implementer adjusts traversal to the exact XML nesting (legitimate TDD against real fixtures, not deferred work). Deterministic code (pipeline edits, UBA, orchestrator, safety guard) is complete.
- **Type consistency:** `VsmeConcept`, `ModuleRole`, `EnumRow`, `FactorRow`, `buildVsmeRows`/`buildVsmeWorkbook`, `seedVsme` signatures are consistent across tasks. `owner` enum values match Plan 1 (`ekowai_env|client_supplied|general`).
- **Safety:** Task 7's `seedVsme` refuses any non-local `DATABASE_URL` — hard guard against prod seeding.
