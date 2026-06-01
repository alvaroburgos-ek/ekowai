# Gl. 25 (A138-18) — ≥-condition: hydraulic capacity of Vollsickerrohre

`L_VS · q_VS ≥ r_5(n) · A_C · 10⁻⁴` — §6.4.2.

Condition aggregator: computed = LHS − RHS (slack).

| Input | Value | Unit |
|---|---:|---|
| L_VS | 400 | m (engineer-chosen total length) |
| q_VS | 0.1 | l/(s·m) (Gl. 24) |
| r_5(n) | 300 | l/(s·ha) (KOSTRA D=5 min) |
| A_C | 1000 | m² |

LHS = 400 · 0.1 = 40 l/s
RHS = 300 · 1000 · 10⁻⁴ = 30 l/s
**Slack = +10 l/s** → condition holds (Vollsickerrohre können den D=5-Stoßregen abführen).

Sibling-unit check: both sides l/s. RHS is "Q_zu für D=5 min" form (same factor as Gl. 3 but with r_5(n) instead of r_D(n)). Consistent.

### Negative case
With L_VS = 200 m: LHS = 20 l/s, RHS = 30 l/s, slack = −10 → condition fails. Engineer increases L_VS.
