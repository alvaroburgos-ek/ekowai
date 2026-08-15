# Task-5 Report — Phase-4 Compliance Gates (A138-REQ-20/21/22)

**Date:** 2026-07-17  
**Author:** Alvaro Burgos <alvaro.burgos@ekowai.com>  
**Status:** DONE — 3 SQL artifacts written, NOT applied

---

## 1. Symbol verification (no dead gates)

### REQ-20 — A138-16 (Fläche) §6.2.2 Gl.(13)

| Symbol | Location | Status |
|---|---|---|
| `k_i` | A138-11 (owner), `consumer_worksheets` includes `A138-16` | LIVE — resolves cross-worksheet via project-wide fallback |
| `r_D_n_used` | A138-16 local field, `data_type=number`, `verification_status=verified_against_standard` | LIVE |

No plain `k_i` field exists on A138-16 itself. Only `k_i_ge_r_check` (boolean) is local. The gate uses the cross-worksheet `k_i` via the approval-gate fallback lookup (`approval-gate.ts` `makeGateLookup`): symbols not in `localSymbols` resolve from the project-wide conflict-free map. Confirmed `consumer_worksheets` on `k_i@A138-11` includes `A138-16`.

**Encoded condition:** `k_i > r_D_n_used * 0.0000001`

### REQ-21 — A138-18 (Rigole) §6.4.2 Gl.(25)

| Symbol | Location | Status |
|---|---|---|
| `L_VS` | A138-18 local, `data_type=number`, `unit=m`, verified | LIVE |
| `q_VS` | A138-18 local, `data_type=number`, `unit=l/(s·m)`, verified | LIVE |
| `r_5_n` | A138-18 local, `data_type=number`, `unit=l/(s·ha)`, verified | LIVE |
| `A_C` | A138-07 (owner), `consumer_worksheets` includes `A138-18` | LIVE — cross-worksheet |

No `A_C` field on A138-18 itself (confirmed with zero-result query). Resolves cross-worksheet from A138-07.

**Encoded condition:** `L_VS * q_VS >= r_5_n * A_C * 0.0001`

### REQ-22 — A138-21 (Schacht) §6.7.2 Gl.(38)

| Symbol | Location | Status |
|---|---|---|
| `shaft_type` | A138-21 local enum, values `typ_A` / `typ_B` (confirmed from `enum_values` JSONB) | LIVE |
| `A_S_FS` | A138-21 local, `data_type=number`, `unit=m²`, verified | LIVE |
| `k_f_FS` | A138-21 local, `data_type=number`, `unit=m/s`, verified | LIVE |
| `A_S_Schacht` | A138-21 local, `data_type=number`, `unit=m²`, verified | LIVE |
| `k_i` | A138-11 (owner), `consumer_worksheets` includes `A138-21` | LIVE — cross-worksheet |

Note: `k_i_FS` is a separate local field (Filterschicht-Infiltrationsrate). REQ-22 requires the general soil infiltration rate `k_i` from A138-11, not `k_i_FS`. Cross-worksheet resolution confirmed.

**Schacht-type selector:** `shaft_type` with enum values `typ_A` and `typ_B`.

**Encoded condition:** `IF shaft_type == typ_B THEN A_S_FS * k_f_FS >= A_S_Schacht * k_i`

---

## 2. Grammar findings (evaluate.ts)

**Supported forms verified:**
- Arithmetic `acompare`: `L_VS * q_VS >= r_5_n * A_C * 0.0001` — parses as `acompare` node (both sides contain `*`, triggers arithmetic path)
- Comparison: `k_i > r_D_n_used * 0.0000001` — LHS is `aref`, RHS is `abin(aref, *, anum)` → `acompare`
- IF/THEN guard: `IF shaft_type == typ_B THEN ...` — supported (`guard` node, `parseAtom` checks for `IF` keyword)
- AND, OR: supported
- `IN {a, b}` membership: supported (brace syntax only, paren syntax → manual — Pile-10 lesson)
- Enum equality: `shaft_type == typ_B` — `compare` node (simple operand RHS → string literal compare)

**Absent-input behaviour (critical for applicability):**
- An `aref` whose symbol is missing → `evalArith` adds to `st.missing` and returns `null`
- `acompare` with `l === null || r === null` → returns `'missing'`
- Final result: `{ kind: 'pending', missingSymbols: [...] }` — **non-blocking**
- IF/THEN guard with `g === 'missing'` → propagates missing symbols → `pending` (non-blocking)
- IF/THEN guard with `g === 'false'` (shaft_type != typ_B) → returns `'true'` (vacuous PASS)

---

## 3. Applicability mechanisms

### REQ-21 — absent-input-pending gives applicability for free
When a Vollsickerrohr is not planned, the engineer does not enter `L_VS`. The evaluator then:
1. Cannot resolve `L_VS` → `st.missing.add('L_VS')`
2. `acompare` left side is `null` → returns `'missing'`
3. Gate result: `{ kind: 'pending' }` — non-blocking (approval gate only blocks on `fail`)

This faithfully implements "only when Vollsickerrohr exists (L_VS present/nonzero)" WITHOUT any explicit guard, using only the grammar's natural absent-input handling. Documented in the SQL comment, not encoded as a separate clause.

### REQ-22 — explicit IF/THEN guard for Typ-B
The IF/THEN guard is the correct and faithful mechanism:
- `shaft_type == typ_B` is false for Typ-A → vacuous PASS → gate does not fire
- `shaft_type == typ_B` is true for Typ-B → body is evaluated → gate enforces Gl.(38)
- `shaft_type` absent → guard `pending` → gate `pending` (non-blocking until type is selected)

This is superior to relying on absent Typ-B-only fields because Typ-A and Typ-B share `A_S_Schacht` and `k_i`, so absent-input alone would not correctly distinguish the two types.

---

## 4. ON CONFLICT target

Unique index confirmed: `compliance_requirements_worksheet_template_id_code_key (worksheet_template_id, code)`  
Matches `_pass3c-db.ts` line 593. SQL uses `ON CONFLICT (worksheet_template_id, code) DO UPDATE SET` — correct.

`audit_status` is NOT in the INSERT values (defaults to NULL on new rows) and NOT in the ON CONFLICT SET clause (preserved for existing rows under review).

---

## 5. SQL artifacts

- `scripts/phase4/20260717_a138_phase4_compliance_gates.sql` — forward migration (DO block, idempotent)
- `scripts/phase4/rollback-20260717_a138_phase4_compliance_gates.sql` — DELETE by code
- `scripts/phase4/verify-20260717_a138_phase4_compliance_gates.sql` — SELECT proofs

---

## 6. No TS touched

`tsc` count unchanged at 28. No TypeScript files modified.
