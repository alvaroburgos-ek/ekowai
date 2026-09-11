# Engine-gap re-scan — 2026-08-01

**Trigger.** This morning `src/lib/eval/arithmetic.ts` (commit `8067c7a`) gained the 1-arg
functions `ln, log10, sqrt, exp, abs`. Before it, only `min` / `max` were supported (verified in
git: prior `SUPPORTED_FUNCTIONS = new Set(['min','max'])`). This re-scan replays the **real**
engine-entry path over every prod `equations` row to find which formulas flipped from
engine-gap to computable.

**Method (execution, not static reasoning).** All 730 prod equation rows were pulled read-only via
Supabase MCP (`equations ⋈ worksheet_templates ⋈ standards`) into
`scripts/engine-rescan-data/chunk-*.json`. A vitest file,
`scripts/__tests__/engine-rescan.test.ts`, imports the **actual** engine modules
(`evalExpression`, `SUPPORTED_FUNCTIONS`, `normalizeFormula`, `normalizeSymbols`,
`equationProfiles`, `aggregators`, `rewriteRules`) and, per row: applies the same RHS-extraction
regex `formula.ts` uses, `normalizeFormula`, then `evalExpression` against a synthetic scope where
**every input symbol = 2.0** (plus any profile constants such as `pi`). Aggregator-backed ids are
reported separately because the real engine bypasses arithmetic for them. Results JSON:
`scripts/engine-rescan-2026-08-01.results.json`.

**A row FLIPPED** iff it computes to a finite value now **and** its normalized RHS calls one of the
five new functions as a real call — those calls provably threw `Funktionsaufruf … nicht
unterstützt` before commit `8067c7a`.

> **CAVEAT — parseability, not correctness.** A `COMPUTES` verdict means the engine can *parse and
> evaluate* the expression, **not** that the number is right. All inputs are a placeholder 2.0.
> Domain edges (`ln(0)`, division by zero) under this synthetic scope surface as non-finite; those
> are counted separately as `nonfinite` (parseable) and are **not** claimed as computed.

---

## Totals (730 rows)

| verdict | count |
|---|--:|
| COMPUTES (finite) | 616 |
| COMPUTES — non-finite under synthetic scope (parseable) | 11 |
| MANUAL — missing function (`Funktionsaufruf`) | 39 |
| MANUAL — other (parse chars, chained compares, comma decimals, undefined symbols) | 53 |
| AGGREGATOR path (DWA-A-138-1, bypasses arithmetic) | 11 |
| **FLIPPED (engine-gap → computable this morning)** | **21** |

---

## Flipped equations — 21 across 9 standards

| standard | Gl. | function that unblocked it | formula |
|---|---|---|---|
| DIN-18130-1 | 9 | `ln` | `k = (a * l_0) / (A * t) * ln(h_1 / h_2)` |
| DWA-A-102-2 | REG-Bild4 | `ln` | `q_A_Bem = -8.333 * ln(eta_ges) - 1.6629` |
| DWA-A-131 | 47 | `sqrt` | `G = sqrt(P_E / (mu * V_E))` |
| DWA-M-102-4 | A.2 | `ln` | `a_F = 0.9115 + … - 0.2063*ln(Sp + 1)` |
| DWA-M-102-4 | A.3 | `ln` | `a_F = 0.8658 + … - 0.1542*ln(Sp + 1)` |
| DWA-M-102-4 | A.5 | `ln` | `a_F = 0.9231 + … - 0.1472*ln(Sp + 1)` |
| DWA-M-102-4 | A.6 | `ln` | `a_F = 0.0800734*ln(P) - …` |
| DWA-M-102-4 | A.7 | `ln` | `a_F = 0.05912*ln(P) - …` |
| DWA-M-102-4 | A.8 | `ln`, `exp` | `a_F = … - 0.005116*ln(Sp) … + 0.01753*exp(4.576/k_f)` |
| DWA-M-102-4 | A.10 | `ln` | `a_F = 0.00004517*P - 0.03454*ln(Sp) + …` |
| DWA-M-102-4 | B.2 | `ln` | `a_A = 0.004264 + 0.001121*ln(P) - 0.002757*ln(f_S_F)` |
| DWA-M-102-4 | B.4 | `ln` | `a_A = … + 0.007684*ln(P) … + 0.004161*ln(k_f / f_S_M)` |
| DWA-M-102-4 | B.5 | `ln` | `a_A = 0.8112 + … - 0.4389*ln(k_f + 1)` |
| DWA-M-1200-2 | Gl. 1 | `log10` | `log10_reduktion = log10(c_zulauf / c_ablauf)` |
| DWA-M-1200-2 | Gl. C.2-3 | `log10` | `lrv_i = log10(x_i / y_i)` |
| DWA-M-179-1 | 1 | `exp` | `r_krit = 0.1201 * exp(0.0655 * eta_hyd)` |
| DWA-M-179-1 | Bild 4 regression | `exp` | `eta_BV = regression_a_AFS63 * exp(-regression_b_AFS63 * q_A_max)` |
| DWA-M-363 | Gl(k-half) | `ln` | `k_abbau = -ln(0.5) / t_half` |
| DWA-M-363 | Gl(k-half) (dup row) | `ln` | `k_abbau = -ln(0.5) / t_half` |
| ISO-5667-1 | 2 | `sqrt` | `L = 2 * K * sigma / sqrt(n)` |
| ISO-5667-13 | 3 | `sqrt` | `n_sp = sqrt(V) / 2` |

**Masked flips (parseable but non-finite under the 2.0 scope).** `DWA-M-102-4` **A.4** and **A.9**
also use the new `ln` and are now parseable, but with all inputs = 2.0 they contain
`ln(WK_max - WP) = ln(0) → -∞`, so they land in the `nonfinite` bucket rather than `COMPUTES`. They
are engine-unblocked too; they just need real inputs to yield a finite value.

---

## Per-standard movement (flips per standard)

| standard | scorecard manual(gap)† | rescan computes | rescan manual-fn | rescan manual-other | flipped |
|---|--:|--:|--:|--:|--:|
| DWA-M-102-4 | 13 | 24 | 5 | 0 | **10** (+2 masked) |
| DWA-M-1200-2 | 1 | 3 | 0 | 1 | **2** |
| DWA-M-179-1 | 0 | 6 | 0 | 0 | **2** |
| DWA-M-363 | 8 | 14 | 0 | 8 | **2** |
| DWA-A-102-2 | 6 | 57 | 1 | 2 | **1** |
| DWA-A-131 | 2 | 75 | 0 | 2 | **1** |
| DIN-18130-1 | 0 | 8 | 0 | 0 | **1** |
| ISO-5667-1 | 2 | 2 | 1 | 0 | **1** |
| ISO-5667-13 | 1 | 3 | 0 | 0 | **1** |

† `ready-to-use-scorecard.md` (snapshot 2026-08-01T10:20Z), column `manual(gap)`.

**Honest reconciliation caveat.** The prior scorecard is **not** 1:1 reconcilable with this rescan.
It was produced by the reasoning-map harness, not by the real arithmetic engine, and its
per-standard `computed` / `manual(gap)` tallies already credit some `ln`/`exp`/`sqrt` equations as
computed (e.g. DWA-M-179-1 shows 0 gaps yet has two `exp` equations that provably threw in the
pre-`8067c7a` engine). So a naive column-subtraction against the scorecard understates or
contradicts the true engine movement. The **21 flips above are grounded in the engine code itself**
(git-verified absence of the five functions before this morning), which is the defensible number.

---

## Remaining top missing functions (non-computing rows) — next engine ruling, data-driven

Two families dominate and both need real semantics, not a 1-arg wrapper:

| function family | ~refs | where | nature |
|---|--:|---|---|
| `SUM` / `sum` / `Sum` / `SUM_over_i` / `SUM_k` / `SUM_Q_krit` / `median` | ~17 | ATV-704E, DWA-A-102-2 (B.5/B.17/4/26), DWA-A-178 (2,3), DWA-A-262E (8), DWA-M-102-4 (B.7/C.2–C.4), DWA-M-277E (Eq.1,2), DWA-M-1200-2 (C.2-2 `median`), ISO-14044/14046/14067/14064-1/14064-2 | **aggregation over a set** — needs carrier data / an aggregator, not a scalar fn |
| `RBF_0…RBF_5` / `RBF_k` / `RBF_kplus1` | ~17 | DWA-M-816 (present-value annuity recurrence) | **recurrence factor** — needs a registered helper; whole standard blocked on it |

Quick, cheap engine wins (aliases / case-folding):

| token | refs | fix |
|---|--:|---|
| `EXP`, `SQRT` (uppercase) | 2 | DWA-M-229-1 `ps`, `Qv` — engine is case-sensitive; add case-fold or aliases → both compute immediately |
| `lg` | 2 | VDI-3477 B1/B4 — `lg` = base-10 log; alias `lg → log10` |
| `e^(…)` (Euler's number as symbol) | 4 | DWA-M-363 Gl(4a/4b/5/7) — `e` is read as an undefined symbol; but these rows **also** have symbol-name mismatches (`G_e` vs `g_e`, `C_ab`, `DDOC_ma_…`), so they are a data-fix, not purely an engine gap |

Non-arithmetic constructs (out of scope for a scalar engine — will always be MANUAL): `lookup(…)`
(DWA-M-1200-1), `valid_for` / set-membership `in {…}` and `if … then …` (DWA-A-272E, DWA-M-102-4
B.6), `integral(…)` (DWA-A-222 Gl.16), and chained/interval comparisons `a <= x <= b` (DWA-M-205
range rows, DWA-A-178 Gl.9, DWA-M-187, DWA-A-272E RULE-9) plus comma-decimal source rows (ISO-5667-6
A.1 `0,13`, VDI-3477 Gl.6 `0,95`, DWA-M-732 `0.60 .. 0.70`).

---

## Files

- Report: `C:\Users\Ekowai\_wt-usability\scripts\engine-rescan-2026-08-01.md`
- Rescan test (uses the real engine): `C:\Users\Ekowai\_wt-usability\scripts\__tests__\engine-rescan.test.ts`
- Results JSON: `C:\Users\Ekowai\_wt-usability\scripts\engine-rescan-2026-08-01.results.json`
- Pulled equation data: `C:\Users\Ekowai\_wt-usability\scripts\engine-rescan-data\chunk-00..12.json`
