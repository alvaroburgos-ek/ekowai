# Standing rules (orchestrator-enforced)

## SR-1 — Verbatim source before apply (2026-07-23)

A numeric/data correction is **not ready to apply** unless its target value is quoted
**verbatim from the standard's own text or table, in the same session it is applied**.

- Internal logs, prior conversations, bring-up "expected" values, and another engineer's
  recollection are **NEVER** acceptable sources.
- The **orchestrator** catches this class itself — a fix without a same-session verbatim
  source quote is rejected before it reaches the user. This is the orchestrator's job, not
  the user's.
- A proven computation is **not** a proven input. A harness that shows
  `IF C=0,82 THEN Q_NOT=5,274728` proves the math; it does **not** prove 0,82 is the correct
  abflussbeiwert. Both are required before apply.
- If a standard **defers** to another (e.g. FLL-GAR → DIN 1986-100 for runoff coefficients),
  the referenced standard becomes the governing table: quote **its** row, and confirm the
  surface-type/row actually maps to the value.
- If no verbatim source reads the target value → **STOP**, surface the discrepancy, do not apply.

**First catch:** FLL-GAR-27 `C`. The FLL-GAR PDF does not tabulate C (defers to DIN 1986-100;
its only Anhang-1 worked example uses C=1). The target 0,82 is a DIN 1986-100 coefficient, not
an FLL value → held for the user's provenance ruling instead of auto-applied.

## Harness discipline addendum
Fold SR-1 into every harness proof: `GREEN computation + missing source quote = NOT READY`.
The integration test asserting the corrected value must be accompanied by the verbatim source
citation for the corrected **input**, not only the expected **output**.
