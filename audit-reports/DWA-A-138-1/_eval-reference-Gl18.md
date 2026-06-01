# Eval-Reference — DWA-A 138-1, A138-18, Gl. 18 (Q_S Rigole)

> **RESOLVED 2026-05-29 (Pile-6):** Source §6.4.2 L1778 reads verbatim:
> *"Die Versickerungsleistung Q_S (in m³/s) der Rigole ergibt sich nach
> GL. (18) zu:"* — the standard genuinely uses m³/s here (unlike Gl. (4) on
> A138-12, which has the ×10³ factor to produce l/s). Pile-6 SQL
> (`_pile6-A138-18-Q_S-field.sql`) adds the Q_S field on A138-18 with unit
> `m³/s`. Gl. 18 is now in `FORMULA_ENGINE_WHITELIST`. The 1000× trap from
> the earlier audit is closed.

`Q_S = ((b_R + h_R) · L_R + b_R · h_R) · k_i` — Versickerungsleistung Rigole, §6.4.2.

| Input | Value | Unit |
|---|---:|---|
| b_R | 1.0 | m |
| h_R | 1.0 | m |
| L_R | 10 | m |
| k_i | 5 × 10⁻⁵ | m/s |

A_S,m (Gl. 17) = 21 m².
Q_S = 21 · 5×10⁻⁵ = **1.050 × 10⁻³ m³/s** (≡ 1.05 l/s in Gl. 4's convention).

### Unit decision

With (m, m, m, m/s) inputs the formula is dimensionally m³/s. Gl. (4) on
A138-12 has the matching `·10³` factor that converts m³/s → l/s for the
flat-surface case. **Gl. (18) does not** — and the source (L1778) explicitly
states m³/s. So:

- The Q_S **field on A138-18** is labelled `m³/s` (Pile-6 INSERT).
- The Q_S **field on A138-12** remains labelled `l/s` (Gl. (4) output).
- Two producers exist for symbol Q_S in the project. The cross-worksheet
  inheritance ambiguity guard (`mergeInheritedFields`) refuses silent
  re-use whenever a downstream consumer pulls both into scope. If a
  consumer profile lists `expectedUnits: { Q_S: 'l/s' }`, the per-input
  unit guard fires on the m³/s value — proved end-to-end in
  `formula-Gl18-Q_S.test.ts`.

### Unit guard (per profile)

b_R, h_R, L_R: `m`; k_i: `m/s`. Mismatch → manual_required with unitConflicts.

### Test coverage

`src/lib/eval/__tests__/formula-Gl18-Q_S.test.ts`:

- Hand-calc reproduction (1.05×10⁻³ m³/s).
- 1000× trap documented numerically (m³/s · 1000 = l/s value).
- Per-input unit guard (b_R as mm, k_i as mm/s).
- Downstream m³/s→l/s collision: synthetic consumer with
  `expectedUnits: { Q_S: 'l/s' }` consuming a m³/s Q_S → manual_required
  with explicit unit conflict. Counter-test confirms matching units pass.
