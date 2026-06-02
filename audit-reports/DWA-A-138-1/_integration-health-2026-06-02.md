# DWA-A 138-1 — Integration Health Sweep (2026-06-02)

**Scope:** four defect classes, full coverage, no fixes — report only.

**Baseline:** `main` at commit `c2903fb` (post-PR #31). PR #30 and PR #31
SQL files (Pile-9, Pile-10) are committed to the repo but **NOT applied
to production**. The findings below describe live production behaviour;
"post-Pile-10" notes indicate what the pending SQL would fix when applied.

---

## Class 1 — Compliance conditions: parses vs dead-gate

Every DWA-A-138-1 condition replayed through the actual
`evaluateCondition` parser with a sympathetic lookup (returns plausible
values for every referenced symbol). A condition that returns `manual`
under sympathetic inputs is a **dead gate** — it does not block, does
not show as failing in any UI count, does not appear in any sign-off.

**Summary:** 30 conditions · **11 parse to a definite verdict** · **19 dead-gate** (return `manual`).

| Code | Worksheet | Condition | Verdict | Defect class |
|---|---|---|---|---|
| A138-REQ-01 | A138-01 | `a138_applicable == TRUE` | ✓ PARSES | — |
| A138-REQ-02 | A138-01 | `feasibility_determination IN ('Feasible','Conditional')` | ✗ DEAD | IN paren syntax + case mismatch |
| A138-REQ-03 | A138-04 | `k_f IS NOT NULL AND permeability_test_method IS NOT NULL` | ✓ PARSES | — |
| A138-REQ-04 | A138-04 | `gw_clearance >= 1.0` | ✓ PARSES | — |
| A138-REQ-05 | A138-04 | `r_D_n_table IS NOT NULL AND kostra_grid_cell IS NOT NULL` | ✓ PARSES | — |
| A138-REQ-06 | A138-04 | `surface_inventory IS NOT NULL` | ✓ PARSES | — |
| A138-REQ-07 | A138-04 | `belastungskategorie IS NOT NULL` | ✓ PARSES | — |
| A138-REQ-08 | A138-04 | `n IN Tab8_values` | ✗ DEAD | `IN` expects `{brace}`; bare ident not accepted; `Tab8_values` is a placeholder |
| A138-REQ-09 | A138-04 | `phase_2_gate_result IN ('PASS','CONDITIONAL')` | ✗ DEAD | IN paren syntax |
| A138-REQ-10 | A138-10 | `verify Gl. 2` | ✗ DEAD | natural-language placeholder |
| A138-REQ-11 | A138-10 | `verify Gl. 3` | ✗ DEAD | natural-language placeholder |
| A138-REQ-12 | A138-10 | `verify Gl. 5/6` | ✗ DEAD | natural-language placeholder |
| A138-REQ-13 | A138-10 | `verify Gl. 4` | ✗ DEAD | natural-language placeholder |
| A138-REQ-14 | A138-10 | `verify Gl. 8 iterated` | ✗ DEAD | natural-language placeholder |
| A138-REQ-15 | A138-10 | `q_S_AC >= 2 AND (q_S_AC > 5 OR f_Z == 1.2)` | ✓ PARSES | — |
| A138-REQ-16 | A138-10 | `phase_3_gate_result IN ('PASS','CONDITIONAL')` | ✗ DEAD | IN paren syntax |
| A138-REQ-17 | A138-15 | `facility_type_selected IS NOT NULL` | ✓ PARSES | — |
| A138-REQ-18 | A138-15 | `engineer-verified` | ✗ DEAD | natural-language placeholder |
| A138-REQ-19 | A138-15 | `phase_4_gate_result IN ('PASS','CONDITIONAL')` | ✗ DEAD | IN paren syntax |
| A138-REQ-20 | A138-24 | `engineer-verified` | ✗ DEAD | natural-language placeholder |
| A138-REQ-21 | A138-24 | `design_adequacy_result == 'PASS'` | ✓ PARSES | — |
| A138-REQ-22 | A138-26 | `if flood_check_trigger == TRUE then V_Rueck present` | ✗ DEAD | `V_Rueck present` is not a parseable predicate |
| A138-REQ-23 | A138-26 | `flood_check_result IN ('PASS','N/A')` | ✗ DEAD | IN paren syntax + slash mismatch |
| A138-REQ-24 | A138-26 | `engineer-verified` | ✗ DEAD | natural-language placeholder |
| A138-REQ-25 | A138-01 | `engineer-verified` | ✗ DEAD | natural-language placeholder |
| A138-REQ-26 | A138-26 | `engineer-verified` | ✗ DEAD | natural-language placeholder |
| A138-REQ-27 | A138-01 | `if authority_coordination_required then evidence_attached` | ✓ PARSES | — |
| A138-REQ-28 | A138-04 | `engineer-verified` | ✗ DEAD | natural-language placeholder |
| A138-REQ-29 | A138-01 | `engineer-verified` | ✗ DEAD | natural-language placeholder |
| A138-REQ-30 | A138-26 | `final_compliance_verdict IS NOT NULL` | ✓ PARSES | — |

**Dead-gate breakdown:**
- 5 `IN paren syntax` (REQ-02, 09, 16, 19, 23) — **Pile-10 SQL fixes these.**
- 1 `IN bare-ident + placeholder list` (REQ-08).
- 5 `verify Gl. X` natural-language (REQ-10, 11, 12, 13, 14).
- 7 `engineer-verified` natural-language (REQ-18, 20, 24, 25, 26, 28, 29).
- 1 `V_Rueck present` malformed predicate (REQ-22).

**Remaining after Pile-10 applied: 14 dead-gates.**

Note: the 12 natural-language placeholders (REQ-10..14 + REQ-18, 20, 24, 25, 26, 28, 29) are *intentionally* manual today — they represent "engineer attestation" gates that the wizard renders as a "?" badge. The parser returns `manual` correctly. The defect is that the badge is the same colour as a non-existent value rather than a clear "needs sign-off" affordance. Out of evaluator scope; UI/affordance change.

The two real dead-gate findings beyond Pile-10:
- **REQ-08** `n IN Tab8_values` — silently fails. `n` is a number, the RHS is a placeholder for "the n values from Tab. 8". Needs either a parseable `n IN {0.2, 0.1, 0.033, …}` rewrite OR removal/replacement with the Tab. 8 lookup elsewhere.
- **REQ-22** `if flood_check_trigger == TRUE then V_Rueck present` — `V_Rueck present` is not parseable. Engineer's intent was `IS NOT NULL`; would need rewrite to `IF flood_check_trigger == TRUE THEN V_Rueck IS NOT NULL`.

---

## Class 2 — Enum integrity + exact-match against condition references

Two checks: (a) is the field's `enum_values` jsonb populated? (b) for every string literal a condition tests against a symbol, does that string exist in the symbol's enum?

### 2a — `enum_values` population (current production state)

| WS | Symbol | is_required | enum state | Defect |
|---|---|---|---|---|
| A138-01 | `water_protection_zone` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-02 | `building_clearance_status` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-02 | `contaminated_land_status` | TRUE | **NULL** | DEAD — Pile-9 populates (PR #30 not applied) |
| A138-02 | `feasibility_determination` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-02 | `geotech_hazards` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-03 | `data_completeness` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-03 | `permeability_test_method` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-06 | `belastungskategorie` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-09 | `data_quality_assessment` | TRUE | **NULL** | DEAD — Pile-10 populates (wizard-internal default) |
| A138-09 | `phase_2_gate_result` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-14 | `phase_3_gate_result` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-15 | `facility_type_selected` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-23 | `phase_4_gate_result` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-24 | `design_basis_final` | TRUE | **NULL** | DEAD — Pile-10 populates (mirrors `design_method`) |
| A138-24 | `facility_type_final` | TRUE | **NULL** | DEAD — Pile-10 populates (mirrors `facility_type`) |
| A138-25 | `design_adequacy_result` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-26 | `flood_check_result` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-27 | `design_review_status` | TRUE | **NULL** | DEAD — Pile-10 populates (wizard-internal default) |
| A138-28 | `final_compliance_verdict` | TRUE | **NULL** | DEAD — Pile-10 populates |
| A138-01 | `design_method` | TRUE | 2 values | ✓ |
| A138-01 | `planning_phase` | FALSE | 4 values | ✓ |
| A138-01 | `project_type` | TRUE | 4 values | ✓ |
| A138-02 | `slope_risk` | TRUE | 3 values | ✓ |
| A138-17 | `boeschungsneigung` | TRUE | 3 values | ✓ |
| A138-21 | `shaft_type` | TRUE | 2 values | ✓ |

**Current state: 19 of 25 enum fields are NULL in production.** Of those 19, **18 are addressed by Pile-9 (1) + Pile-10 (18) SQL — neither pile applied.**

### 2b — exact-match: every value referenced by a condition vs enum

Only conditions that test against string literals are listed (boolean / IS NOT NULL / numeric tests have no value to match).

| Condition (post-Pile-10) | Literal | Target enum (post-Pile-10) | Match? |
|---|---|---|---|
| REQ-02 `feasibility_determination IN {feasible, conditional}` | `feasible`, `conditional` | `feasible`, `conditional`, `not_feasible` | ✓ exact |
| REQ-09 `phase_2_gate_result IN {PASS, CONDITIONAL}` | `PASS`, `CONDITIONAL` | `PASS`, `CONDITIONAL`, `FAIL` | ✓ exact |
| REQ-16 `phase_3_gate_result IN {PASS, CONDITIONAL}` | same | same | ✓ exact |
| REQ-19 `phase_4_gate_result IN {PASS, CONDITIONAL}` | same | same | ✓ exact |
| REQ-21 `design_adequacy_result == 'PASS'` | `PASS` | `PASS`, `FAIL`, `NA` | ✓ exact |
| REQ-23 `flood_check_result IN {PASS, NA}` | `PASS`, `NA` | `PASS`, `FAIL`, `NA` | ✓ exact |
| COV-01 `water_protection_zone != zone_I` (Pile-7) | `zone_I` | `none`, `zone_I`, `zone_II`, `zone_III` | ✓ exact |
| COV-04a..d (Pile-7) `belastungskategorie == BK_II` / `BK_III` | `BK_II`, `BK_III` | `BK_I`, `BK_II`, `BK_III` | ✓ exact |
| COV-06a..f (Pile-7) `belastungskategorie == BK_I` / `II` / `III` | `BK_I`, `BK_II`, `BK_III` | same | ✓ exact |

**Post-Pile-10 + Pile-7: every condition-tested string maps to a real enum value.** No mismatches remaining.

Pre-Pile-10 mismatches (live in production today): REQ-02 capitalization, REQ-23 slash — both Pile-10-fixed.

---

## Class 3 — Whitelist single-source-of-truth audit

### 3a — Form-side whitelist

`src/components/worksheet/worksheet-form.tsx:22` — `FORMULA_ENGINE_WHITELIST: Set<string>`. The runtime form path passes this to `useEquationEngine`. **One definition, one consumer.**

Whitelist members (28 entries): A138-10:2, A138-12:4, A138-12:7, A138-13:8, A138-16:11, A138-16:12, A138-17:14, A138-17:15, A138-17:16, A138-18:17, A138-18:18, A138-18:19, A138-18:20, A138-18:21, A138-18:22, A138-18:23, A138-18:24, A138-18:25, A138-19:26, A138-19:27, A138-19:28, A138-19:29, A138-20:30, A138-20:31, A138-20:32, A138-20:33, A138-21:34, A138-21:35, A138-21:36, A138-21:37, A138-21:38, A138-21:39, A138-21:40, A138-22:41, A138-26:10.

### 3b — Test-side whitelists

| Test file | Whitelist used |
|---|---|
| `engine-wiring-A138-10.test.tsx:50` | `new Set(['A138-10:2'])` |
| `engine-wiring-A138-13.test.tsx:68` | `new Set(['A138-13:8'])` |
| `engine-wiring-A138-18.test.tsx:67` | `new Set(['A138-18:21'])` |
| `inheritance-A138-13.test.tsx:104` | `new Set(['A138-13:8'])` |

**Each test defines its own single-key whitelist.** None imports `FORMULA_ENGINE_WHITELIST`. The tests prove "this equation works *if* whitelisted" — they do NOT prove "this equation IS in the production whitelist." Removing `A138-13:8` from the production set would not fail any existing test.

### 3c — Report-generating path (PDF)

`src/lib/pdf/build-report.tsx` → `src/lib/pdf/sections/{cover, grundlagen, decisions, inputs, computed, compliance, approvals, footer}.tsx`.

| PDF section | Reads engine? | Reads compliance? |
|---|---|---|
| InputsSection | — | — |
| **ComputedSection** | **NO — literal stub: "Phase 2 — automatische Berechnung folgt."** | — |
| **ComplianceSection** | — | **NO — literal stub: "Phase 2 — Compliance-Auswertung folgt."** |
| ApprovalsSection | — | — |
| Cover / Grundlagen / Decisions / Footer / Watermark | — | — |

**Both engine-relevant report sections are TODO placeholders. The PDF report does not surface any engine-computed values OR any compliance results today.**

### 3d — Verdict

- **One whitelist source of truth in the runtime form path** (worksheet-form.tsx). ✓
- **Tests bypass it** — they don't verify whitelist membership. A drift is invisible to CI.
- **The PDF report does not consume the whitelist at all** — entire engine and compliance sections are stubs. The "report a filled project" path silently omits everything the wizard computed.

The "report shows nicht geprüft" scenario the user was worried about doesn't apply because there is no report-side rendering at all — the gap is one layer deeper: the engine output is never reached by the PDF.

---

## Class 4 — Required-field wiring (input-control liveness)

Iterates every `is_required = TRUE AND active = TRUE` field. Flags those whose DynamicField branch is dead.

**Summary:** 183 required fields · 19 enum-NULL dead (same set as Class 2a) · 1 json-stub dead (custom editor missing).

| WS | Symbol | data_type | Defect |
|---|---|---|---|
| (19 enum fields) | — | enum | enum_values NULL → SegmentedControl renders 0 buttons. Same set as Class 2a. Pile-10 populates. |
| A138-04 | `r_D_n_table` | json | ✓ wired via `KostraTableEditor` (custom editor, symbol-exact match in worksheet-form.tsx:296). **NOT a stub.** |
| A138-07 | `surface_inventory` | json | **DEAD — falls through to DynamicField's default json branch: "Mehrzeilige Eingabe — Phase 2" disabled placeholder.** No custom editor matches this symbol. Required input for A138-07 (surface-inventory worksheet) is unreachable. |
| (sub_areas_* fields) | — | json | ✓ wired via `SubAreasEditor` (prefix match `startsWith('sub_areas_')`). |

The json-stub finding is real and standalone — `surface_inventory` is an A138-07 required input that the engineer cannot fill. Not addressed by any pending Pile SQL. **Needs either a custom editor or the field re-modeled as a structured set of sub-fields.**

---

## Net remaining-defect picture

If Pile-9 (PR #30 SQL) + Pile-10 (PR #31 SQL) are applied to production:

| Class | Pre-Pile state | Post-Pile state | Beyond Pile remaining |
|---|---|---|---|
| **1 dead conditions** | 19 / 30 | 14 / 30 | REQ-08 (`Tab8_values` placeholder), REQ-22 (`V_Rueck present` malformed), 12 intentional manual placeholders (UX affordance, not parser) |
| **2 enums** | 19 / 25 NULL | 0 / 25 NULL | none |
| **2 value-references** | 2 mismatches (REQ-02, REQ-23) | 0 mismatches | none |
| **3 whitelist** | 1 runtime source, tests bypass it, PDF has no engine integration | unchanged | Tests should assert whitelist membership; PDF ComputedSection + ComplianceSection are TODO stubs |
| **4 required-field wiring** | 19 enum-NULL + 1 json-stub (`surface_inventory`) | 1 json-stub remains | `surface_inventory` needs a custom JSON editor |

## Recommended scope to bring 138 to "complete" state

A single follow-up slice covering:

1. **Apply Pile-9 + Pile-10 SQL to production** (resolves Class 2a + 2b + Class 4 enum part).
2. **Fix REQ-08 and REQ-22** condition rewrites (Class 1 real bugs).
3. **Decide affordance for the 12 intentional `engineer-verified` / `verify Gl. X` placeholders** — likely a separate `requires_attestation` boolean column on `compliance_requirements` so the UI badge is unambiguous; out of scope for any 138-only fix.
4. **Wire `surface_inventory` editor on A138-07** (Class 4 json-stub) — analogous to `KostraTableEditor` / `SubAreasEditor` but for the Tab. 9 C_m/C_S surface inventory.
5. **Build the PDF report's ComputedSection and ComplianceSection** (Class 3) — currently stubs. This is the largest piece; it surfaces engine output and compliance verdicts in the deliverable PDF.
6. **Add a whitelist-membership test** that asserts every `FORMULA_ENGINE_WHITELIST` entry corresponds to an equation that has a profile registered in `equation-profiles.ts` AND that every per-test ad-hoc whitelist key is present in the production whitelist (Class 3 drift guard).

Items 1–2 are small. Items 4–5 are real feature work. Item 3 is a design call. Item 6 is one test.
