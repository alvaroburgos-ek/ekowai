# FLL D-1 — Schema-first DIAGNOSTIC (Option A)

**Task:** STEP 1 / 1a of the reasoning-map program. Diagnose only; propose fixes; apply NOTHING.
**Gates:** task 1b (the schema fix).
**Prod (READ-ONLY):** Supabase `vadsmshzebefjreqcicl`, via Supabase MCP `execute_sql`. No writes performed.
**Doctrine:** `docs/verification-doctrine.md` (SR-1/2/3, data_class, findings-over-fixes, prod read-only, secrets never printed). Followed.
**Sources read:** `fll-m2-report.md`, `fll-m2-ledger.md`, detail JSONs `fll-m2/FLL-Naturteich__FLLNT-10/11/13.json`, `src/lib/actions/worksheet.ts` (saveWorksheet), `tests/harness/seed-fll-naturteich.ts`, live prod `information_schema` + `fields`.

---

## 0. FRAMING DISCREPANCY — the brief's premises do not match the M2 artifacts (surfaced per doctrine, not guessed)

The brief asks me to pull, **from the M2 report**, three things that **do not exist in it**. Stated explicitly rather than fabricated:

| Brief asks for | What the M2 report/ledger actually contains |
|---|---|
| "the **51 worksheets** figure" | **No "51".** M2 coverage is **65 / 65** worksheets (GAR 29 + Naturteich 15 + RHZ 21). The only "51" anywhere is a page/TOC number inside the Naturteich PDF extraction. There is no 51-worksheet figure. |
| "the exact wording of finding **F-8** (the browser-save question)" | **No finding named F-8.** M2 findings are numbered **per-worksheet** (`GAR-01/F1`, `FLLNT-03/F1`, `RHZ-18/F1`, …). There is no global F-1…F-8 sequence and no item labelled "the browser-save question." The nearest real artifact is the **R-seeder** residue class (§4 of the M2 report) + the per-JSON `save.ok=true` live-save probes. I answer the *substance* of "would a browser save also fail?" in §3 below and label it **[F-8-equivalent]**. |
| worksheets "whose chains were **un-runnable or returned 500 / save-errors**" | **No chain returned a 500 or a save-error.** The M2 report states verbatim: *"Nothing was written to prod in this run"* and every live `saveWorksheet` probe logged **`save.ok=true`**. The 9-chain shortfall (137 attempted → 128 run) is **un-runnable**, never errored — cause is **0-equation worksheets** (nothing to compute) and **un-seeded gate drivers** (harness fixture omits a field), both logged as residue, never a 500. |

**Consequence for the diagnostic:** the real, in-scope defect surface the brief is pointing at is the **R-seeder residue class** (`fll-m2-report.md` §4 "R-seeder — un-seeded gate drivers (fixture gaps, not prod defects)") plus the **FLLNT-10 SCHEMA-DRIFT** item. I diagnose that surface schema-first below. If the brief intended a *different* prior run (one that did produce 500s / an F-8 / a 51-count), that run is **not in `.superpowers/sdd/`** — I did not invent one.

---

## 1. The affected worksheets (from the M2 R-seeder / chain-shortfall residue)

Chains-not-run (M2 §1): GAR-17 (0/1); FLLNT-01, -03, -04, -08, -14 (0/1), FLLNT-06 (3/4), FLLNT-09 (2/3), FLLNT-13 (1/2). RHZ = 0 shortfall.

Of these, the ones the residue attributes to a **missing/un-seeded field driver** (the "missing-column" candidates) are the **R-seeder** set (M2 §4):

| Worksheet | Standard | Driver symbol the harness could not seed | Referenced by |
|---|---|---|---|
| FLLNT-10 | FLL-Naturteich | `F_filter`, `h_filter` | equation EQ-02 |
| FLLNT-11 | FLL-Naturteich | `swimming_area_m2` (topology divergence: prod on FLLNT-11, seeder on FLLNT-10) | equation EQ-04 |
| FLLNT-12 | FLL-Naturteich | `attest_fllnt_12_req_25` | gate REQ-25 |
| FLLNT-13 | FLL-Naturteich | `attest_fllnt_13_req_28` | gate REQ-28 |
| FLLNT-01 | FLL-Naturteich | `attest_fllnt_01_req_03`, `attest_fllnt_01_req_04` (same class, noted in FLLNT-13 JSON F1) | gates REQ-03/04 |

The remaining chain-shortfall worksheets (GAR-17, FLLNT-04, -08, FLLNT-06) are **0-equation / cross-worksheet** cases (R-noeq), **not** missing-field — nothing to classify as missing-column.

---

## 2. Schema-first classification table (RAW `information_schema` + `fields` evidence)

**Architectural fact that determines every class (RAW, prod):** `saveWorksheet` (src/lib/actions/worksheet.ts) writes to **`project_parameters`**, which is a **fixed key-value table**, not a per-symbol wide table. Live `information_schema.columns` for `project_parameters`:

```
id (uuid) · project_id (uuid) · field_id (uuid) · source_worksheet_instance_id (uuid)
value_number (numeric) · value_text (text) · value_enum (text) · value_date (date)
value_boolean (boolean) · value_json (jsonb) · source_type (text) · citation_source (jsonb)
entered_by (uuid) · entered_at (timestamptz) · is_stale (boolean) · citation_sources (jsonb)
```

There is **no column per field symbol**. A value is stored as a ROW keyed `(project_id, field_id)`, with the value landing in the one typed column matching the field's `data_type` (worksheet.ts L284-303). **Therefore "a missing field" can NEVER be a missing SQL column — it is a missing ROW in `fields` (and hence in `project_parameters`).** The class "missing-column" is structurally impossible here for a field driver.

Given that, each affected worksheet classifies as **OTHER (seed/fixture)**, proven by the fields existing on prod:

| Worksheet | Standard | Failure signature | Class | Evidence (RAW) |
|---|---|---|---|---|
| FLLNT-10 | FLL-Naturteich | EQ-02 chain un-runnable in harness; `evaluateFormula kind=manual_required missing=[F_filter,h_filter]` | **OTHER (seeder gap / schema-drift)** — NOT missing-column | Prod `fields`: `F_filter` (number, order_index 160, active, section_id **null**), `h_filter` (number, 170, active, null). Prod FLLNT-10 **active_fields = 17**; seeder ships **15** (seed-fll-naturteich.ts L318-341 omits both). No missing column: `project_parameters` has no per-symbol column at all. |
| FLLNT-11 | FLL-Naturteich | EQ-04 driven by writing output directly; `swimming_area_m2` on prod FLLNT-11 but seeded on FLLNT-10 | **OTHER (seeder topology divergence)** | Prod `fields`: `swimming_area_m2` = FLLNT-11 field (number, order_index 100, active, section_id null). Seeder L238 places `swimming_area_m2` on FLLNT-06/10. Field exists on prod; only the seeder's owning-worksheet differs. |
| FLLNT-12 | FLL-Naturteich | REQ-25 gate fired against synthetic lookup, not real save | **OTHER (seeder omits attest field)** | Prod `fields`: `attest_fllnt_12_req_25` (boolean, order_index 0, active, section_id null). Seeder references it in REQ-25 (L385) but does not seed the field. |
| FLLNT-13 | FLL-Naturteich | REQ-28 gate fired against synthetic lookup, not real save | **OTHER (seeder omits attest field)** | Prod `fields`: `attest_fllnt_13_req_28` (boolean, 0, active, null). Seeder FLLNT-13 fields (4) omit it; REQ-28 (L399) references it. |
| FLLNT-01 | FLL-Naturteich | REQ-03/04 attest gates | **OTHER (seeder omits attest fields)** | Same class; seeder L129-130 references `attest_fllnt_01_req_03/_04` in conditions. (Fields not queried this run — same pattern, flagged for 1b to confirm.) |

**Global missing-column-in-prod test (RAW, all 3 FLL standards):** cross-checked every FLL equation `output_symbol` + `input_symbols` against the set of active `fields.symbol` in the same standard. **Result: `[]` (zero)** — no equation references a symbol that lacks a backing prod field. **There is NO missing-column-class defect on prod for FLL.** (Gate-condition symbols not machine-parsed this run — flagged as a residual check for 1b, but the R-seeder set above is already resolved: all 5 attest/driver symbols exist on prod.)

---

## 3. [F-8-equivalent] Would a REAL browser save also fail? — per case, with code-trace evidence

**Answer: NO. None of these are product bugs a user hits. Every one is a harness-only artifact.** Trace:

**Code trace (saveWorksheet, src/lib/actions/worksheet.ts):**
- The browser sends `values` keyed by **field_id** (SaveWorksheetInput, L63-66). On prod those field rows **exist** (proven §2), so the browser has real field_ids to send.
- `fieldMetas` loads metadata for exactly the submitted, template-owned field ids (L186-196). A field the template owns resolves normally.
- The per-field loop (L255-267): if a submitted field id is not in `fieldMetas` it is **`warnings.push('Field … skipped')` and `continue`** — a *skip*, **never a throw / 500**. There is no code path where a missing field id produces a save-error; the save returns `ok:true` with a warning.
- Values persist via one `onConflictDoUpdate` UPSERT into `project_parameters` (L592-611) keyed `(project_id, field_id)`.

**Why the harness could not run these chains (the actual cause):** the **test seeder** (`seed-fll-naturteich.ts`) omits the field ROWS, so in the disposable embedded-PG the equation's input symbol has no field/parameter to resolve → `evaluateFormula` returns `manual_required` (FLLNT-10 JSON chain "EQ-02 with F_filter/h_filter absent": `kind=manual_required missing=[F_filter,h_filter]`). On **prod** those rows exist, so the browser has the field to fill and the chain resolves. The seeder's own header comment (L30-33) claims F_filter/h_filter are *"NOT fields on the standard … missing exactly as on prod"* — **this comment is STALE/WRONG**: live prod shows both are active FLLNT-10 fields. The detail JSON (prod 17, seeder 15) is correct; the seeder comment is not. That mismatch is itself a finding.

**Per-case verdict:**

| Case | Real browser save fails? | Product finding? | Evidence |
|---|---|---|---|
| FLLNT-10 `F_filter`/`h_filter` | **No** | **No** — harness-only | Fields active on prod; browser sends real field_ids; save UPSERTs normally. Harness `manual_required` is purely the seeder omission. |
| FLLNT-11 `swimming_area_m2` | **No** | **No** — harness-only | Field active on prod FLLNT-11; only the seeder's owning-worksheet diverges. |
| FLLNT-12/13/01 attest fields | **No** | **No** — harness-only | Attest booleans active on prod; gates fire off a real field. Harness used a synthetic lookup only because the seeder omits the row. |

**No item flips to a PRODUCT FINDING.** All ship as **seeder/fixture fixes** (harness code), not prod migrations.

**Separately surfaced (real, but NOT a save-failure and NOT part of the missing-column question):** all five driver fields have **`section_id = null`** on prod (unsectioned). That is a real data-quality quirk (they render section-less), independently confirmed live, but it does not cause a save error and is not a missing-column defect. Logged for the 1b batch as a data-quality decision, not a fix-ships item.

---

## 4. Proposed fix PLAN (written-not-applied; unambiguous vs needs-ratification)

None applied. Per doctrine: findings-over-fixes; prod read-only.

### 4.A UNAMBIGUOUS (schema-attested → ships in 1b) — all are HARNESS/fixture fixes, NOT prod migrations

1. **FLLNT-10 seeder — add the 2 drifted fields.** Add to `seed-fll-naturteich.ts` FLLNT-10 `fields[]`:
   `{ symbol:'F_filter', label_de:'Filterquerschnitt', data_type:'number', unit:'m²', order_index:160 }` and
   `{ symbol:'h_filter', label_de:'Filterhöhe', data_type:'number', unit:'m', order_index:170 }`
   (mirror prod: active, unsectioned). **Rationale (schema-attested):** prod `fields` shows both active on FLLNT-10 (order_index 160/170); seeder must match prod to run EQ-02 end-to-end. **Rollback:** revert the two array entries. **Not a prod migration** (prod already correct).
2. **FLLNT-10 seeder header comment — correct the stale claim.** Replace the L30-33 assertion that F_filter/h_filter are "NOT fields on the standard … missing exactly as on prod" with the verified truth (both are active prod fields; seeder previously under-seeded). **Rollback:** git revert. Doc-only.
3. **FLLNT-11 seeder — move `swimming_area_m2` to FLLNT-11.** Seed it on FLLNT-11 (order_index 100) to match prod ownership, not FLLNT-10. **Rollback:** move back. Harness-only.
4. **FLLNT-12 / -13 / -01 seeder — add the omitted attest fields** (`attest_fllnt_12_req_25`, `attest_fllnt_13_req_28`, `attest_fllnt_01_req_03/_04`) as `boolean, order_index 0` so REQ-25/28/03/04 drive through the real `saveWorksheet` instead of a synthetic lookup. **Rollback:** remove entries. Harness-only. (Matches staged decisions FLLNT-13/D1, FLLNT-12/F2 in the detail JSONs.)

### 4.B NEEDS RATIFICATION (→ Alvaro's batch)

5. **Prod data-quality: `section_id = null` on all 5 driver fields (+ likely more).** These fields render section-less. **Decision needed:** assign each to its correct section (C for the FLLNT-10 filter geometry inputs; C for the attest booleans) via a gated importer re-run or migration, **or** accept unsectioned. This IS a prod change → **not auto-applied**; batch to Alvaro. Migration would be `UPDATE fields SET section_id=<sec> WHERE id=…` per field, rollback `SET section_id=NULL`. **SR-1 note:** section assignment is an encoding-structure choice, not a source-quoted numeric value; still routed to ratification because it writes prod.
6. **Residual completeness check for 1b (not a fix):** machine-parse **gate-condition** symbols (not just equation symbols) across all 3 FLL standards against the prod field set, to confirm zero missing-column there too. Equation symbols are already clean (`[]`); the R-seeder attest symbols are confirmed present; this closes the last corner before 1b.

**Nothing here is a prod-schema (DDL) migration.** The `project_parameters` / `fields` schema is correct and complete; the only prod-write candidate (4.B-5, section_id) is a data-value update, ratification-gated.

---

## 5. Bottom line

- **Missing-column class: EMPTY.** `project_parameters` is key-value; a missing field is a missing ROW, and the global equation-symbol-vs-prod-field check returns `[]`. No prod schema is missing anything for FLL.
- **The entire "missing-column / un-seeded driver" residue is OTHER (harness seeder gaps).** All 5 driver fields are **active on prod** (F_filter/h_filter order_index 160/170; swimming_area_m2 100; attest_* 0).
- **[F-8-equivalent] answer: a real browser save does NOT 500** on any of these — a missing field id is *skipped with a warning*, never errored, and on prod the fields aren't even missing. **Zero product findings; zero fixes ship to prod.**
- **1b work is all in the harness** (seeder parity + stale comment), plus one ratification-gated prod data-quality item (`section_id=null`).
- **Honest residue of THIS diagnostic:** the brief's "51 worksheets", "F-8", and "500/save-error" premises are not present in the M2 artifacts in `.superpowers/sdd/` (§0). I diagnosed the real R-seeder surface instead of inventing a run to match those premises. Gate-condition-symbol parse (4.B-6) and FLLNT-01 field existence not machine-confirmed this run — flagged for 1b.
