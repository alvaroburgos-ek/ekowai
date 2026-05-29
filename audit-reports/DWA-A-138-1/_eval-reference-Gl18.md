# Eval-Reference — DWA-A 138-1, A138-18, Gl. 18 (Q_S Rigole)

`Q_S = ((b_R + h_R) · L_R + b_R · h_R) · k_i` — Versickerungsleistung Rigole, §6.4.2.

| Input | Value | Unit |
|---|---:|---|
| b_R | 1.0 | m |
| h_R | 1.0 | m |
| L_R | 10 | m |
| k_i | 5 × 10⁻⁵ | m/s |

A_S,m (Gl. 17) = 21 m².
Q_S = 21 · 5×10⁻⁵ = **1.050 × 10⁻³** (per literal DB formula).

### ⚠ Documented unit discrepancy
With (m, m, m, m/s) inputs the formula produces **m³/s**, but the wizard's Q_S field is labelled `l/s`. Gl. (4) on A138-12 has the matching `·10³` factor that converts m³/s → l/s; **Gl. (18) does not**. So the engine returns 1.05 × 10⁻³, which is **dimensionally m³/s** but lives in a l/s field — a 1000× magnitude trap for engineers who compare Q_S across worksheets.

The engine returns the literal value. Per project rules the DB formula is NOT modified. Flagged in the equation profile's `notes` and in the per-PR description so an audit pass can decide whether to:

1. Treat the discrepancy as expected (m³/s output, change the field unit) — OR
2. Patch the formula to add `·10³` in a future Pass3c re-import.

Same fail-loud principle: the value the engine surfaces is what the formula literally says, with the unit metadata + notes making the discrepancy visible.

### Unit guard (per profile)
b_R, h_R, L_R: `m`; k_i: `m/s`. Mismatch → manual_required.
