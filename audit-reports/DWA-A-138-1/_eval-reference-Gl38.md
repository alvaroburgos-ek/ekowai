# Gl. 38 (A138-21) — ≥-condition: Filterleistung ≥ Schacht-Versickerungsleistung


> **NOTE — fixture-output framing.** The numeric output shown below (e.g. V_VA = … m³) is the engine's output for the **specific example inputs in this file** (a Heinsberg-like reference fixture). It is **NOT** a normative constant of DWA-A 138-1. The standard defines only the formula; the number changes when the engineer enters different project inputs.

`A_S,FS · k_f,FS ≥ A_S,Schacht · k_i` — §6.7.2.

Condition aggregator: computed = LHS − RHS (slack).

| Input | Value | Unit |
|---|---:|---|
| A_S,FS | 0.5027 | m² (= π·d_i²/4 mit d_i=0.8) |
| k_f,FS | 1×10⁻³ | m/s (Filterschicht) |
| A_S,Schacht | 7.147 | m² (Gl. 34) |
| k_i | 5×10⁻⁵ | m/s |

LHS = 0.5027 · 1×10⁻³ = **5.027×10⁻⁴ m³/s**
RHS = 7.147 · 5×10⁻⁵ = **3.574×10⁻⁴ m³/s**
**Slack = +1.454×10⁻⁴ m³/s** → Filter ist ausreichend durchlässig.

Sibling-unit check: beide Seiten m³/s. ✓
