# Gl. 31 (A138-20) — Q_MUE Muldenüberlauf-Abfluss

`Q_MUE = A_C · 10⁻⁴ · r_MUE − A_VA · k_i · 1000` — §6.5.2 / §6.6.2.

| Input | Value | Unit |
|---|---:|---|
| A_C | 1000 | m² |
| r_MUE | 130 | l/(s·ha) |
| A_VA | 50 | m² |
| k_i | 5×10⁻⁵ | m/s |

```
A_C·10⁻⁴·r_MUE         = 1000·10⁻⁴·130   = 13.000 l/s
A_VA·k_i·1000          = 50·5×10⁻⁵·1000  = 2.500 l/s
Q_MUE                  = 13.000 − 2.500  = 10.500 l/s
```

**Ref Q_MUE = 10.500 l/s.** Sibling-unit check: l/s, matches Q_MUE field on A138-20.

- A_C·10⁻⁴·r_MUE: A in m² · 10⁻⁴ (ha) · l/(s·ha) → l/s ✓
- A_VA·k_i·1000: m² · m/s = m³/s · 1000 = l/s ✓

Same factor pattern as Gl. 3 (Q_zu) on the first term and Gl. 4 (Q_S) on the second. Internally consistent.
