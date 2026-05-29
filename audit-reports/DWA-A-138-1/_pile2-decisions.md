# Pile-2 Decision Worksheet — Engineer Sign-off Required

**Scope:** 8 rows that cannot be fixed by a simple anchor UPDATE. Six concept-review fields + two unit-mismatch fields.
**Source:** `DWA-A_138-1_WD (5).md` (Mathpix LaTeX)
**Status:** Decisions drafted, **NO DB or code change executed.**
**Author:** `claude-code-2026-05-29`

---

## Step 1 — Live runtime behaviour (read-only investigation)

Two questions to answer empirically before recommending anything:

### Q1: Does the wizard currently auto-derive a "design k_f" anywhere?

**Answer: NO. The wizard does not compute any k_f value.**

Grepped the entire source tree. The string `k_f_geo` / `k_f_design` / `k_f_min` / `geometric` / `geomean` / `geometrisch` appears only in audit reports and SQL dumps — **no production TypeScript references them.**

The only runtime calc engine for DB equations lives in `src/components/worksheet/worksheet-form.tsx:161-195`:

```ts
useEffect(() => {
  const numBySymbol: Record<string, number> = {};
  for (const f of fields) {
    const v = values[f.id];
    if (v?.type === 'number' && v.value != null && Number.isFinite(v.value)) {
      numBySymbol[f.symbol] = v.value;
    }
  }
  for (const eq of sortedEquations) {
    const outSym = eq.outputSymbol;
    if (!outSym) continue;
    const outField = fieldBySymbol.get(outSym);
    if (!outField) continue;
    const inputs = eq.inputSymbols ?? [];
    let sum = 0;
    let hasInput = false;
    for (const s of inputs) {
      const n = numBySymbol[s];
      if (n !== undefined) { sum += n; hasInput = true; }
    }
    const computed = hasInput ? sum : null;
    if (computed !== null) numBySymbol[outSym] = computed;
    const current = values[outField.id];
    const currentNum = current?.type === 'number' ? current.value : null;
    if (currentNum !== computed) {
      setField(outField.id, { type: 'number', value: computed });
    }
  }
}, [values, fields, sortedEquations, fieldBySymbol, setField]);
```

This is a **naive sum-only evaluator** — it ignores `formula` entirely and just adds every value in `input_symbols`. It was built for DIN-276 cost-stage roll-ups (see the comment at line 134-140) and works there because every DIN-276 equation is `KG3 = KG3-01 + KG3-02 + …`.

The compliance condition evaluator (`src/lib/compliance/evaluate.ts`) does parse expressions, but only the comparison/membership/existence forms — it has no arithmetic. A grep for `condition ILIKE '%k_f_design%'` / `'%k_f_geo%'` / `'%k_f_min%'` returns **0 rows**.

A DB query confirms there is **no equation row with `output_symbol IN ('k_f_design','k_f_geo','k_f_min')`** anywhere in DWA-A-138-1.

**Net effect on k_f_geo, k_f_design, k_f_min:** the wizard renders them as free-input number form fields. Engineers type whatever value they want. No automated derivation, no compliance gate. The semantics implied by the field names (`_geo` = geometric mean, `_min` = minimum, `_design` = result) exist only in the labels, not in any executable rule.

The source explicitly mandates the **minimum**, on the safe side, at L1354 of the source MD:

> "Im Einfachen Verfahren wird die bemessungsrelevante Infiltrationsrate vereinfachend konstant angenommen. **Auf der sicheren Seite liegend wird die minimale Infiltrationsrate als k_f-Wert verwendet.**" (§5.3.3.6)

The geometric mean is on the un-safe side relative to the minimum (geo-mean ≥ minimum for any non-degenerate sample). So a field called "k_f_geo" wired into a "design k_f" decision violates the source's safety principle — but only insofar as the *engineer* uses it that way. Today there is no automated wire.

### Q2: For d_a / d_i in A138-18 (Rigole) — what unit do the running equations actually use? Is there a ×10⁻³ conversion?

**Answer: NO conversion present in any equation string. AND — the audit's "mismatch" classification was wrong.**

DB equation rows that consume d_a or d_i (queried):

| WS | Gl. | formula (verbatim DB) |
|---|---|---|
| A138-18 | 21 | `s_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi/4) * ((d_i^2/s_F) - d_a^2))` |
| A138-18 | 22 | `s_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d^2/4) * ((1/s_F) - 1))` |
| A138-18 | 23 | `L_R = (A_C * 10^-7 * r_D(n) - b_R * h_R * k_i - Q_Dr * 10^-3) / (b_R * h_R * s_R / (D * 60 * f_Z) + (b_R + h_R) * k_i)` |
| A138-21 | 34 | `A_S = pi * d_a^2 / 4 + pi * d_a * h_S / 2` |
| A138-21 | 36 | `V_S = pi * d_i^2 / 4 * h_S` |
| A138-21 | 37 | `h_S = (A_C * 10^-7 * r_D(n) - (pi * d_a^2 / 4) * k_i) / (pi * d_i^2 / (4 * D * 60 * f_Z) + d_a * pi * k_i / 2)` |
| A138-21 | 39 | `erf_k_f_FS >= ((d_a^2 + 2 * h_S * d_a) / d_i^2) * k_i` |
| A138-21 | 40 | `h_S = (A_C * 10^-7 * r_D(n) - (pi * d_i^2 / 4) * k_f_FS) * 4 * D * 60 * f_Z / (d_i^2 * pi)` |

There is **no `· 10^-3` or `· 1000` conversion on d_a / d_i** in any of these formulas. They are used raw, mixed dimensionally with b_R, h_R, L_R, h_S — all of which Tab. 2 defines as `m`.

The runtime evaluator (sum-only) doesn't care about units — it would compute `s_R ≈ s_F + b_R + h_R + az + d_i + d_a`, which is meaningless regardless of unit. So **today the d_a/d_i unit has no runtime effect at all.**

But the source-fidelity question stands: **is the DB unit `m` correct against the source?**

Re-reading the source at the relevant variable lists:

> **§6.4.2 Rigole, under Gl. (21), source L1825–L1834:**
> ```
> | s_R | -  | Speicherkoeffizient der Rigole
> | s_F | -  | Speicherkoeffizient des Füllmaterials/Fertigteils der Rigole
> | b_R | m  | Breite der Rigole
> | h_R | m  | Höhe der Rigole
> | az  | -  | Anzahl gleichartiger Versickerrohre im Querschnitt der Rigole
> | d_i | m  | Innendurchmesser des Versickerrohrs       ← m, not mm
> | d_a | m  | Außendurchmesser des Versickerrohrs       ← m, not mm
> ```

> **§6.7.2 Schacht, source L2108–L2143:**
> ```
> | d_a | m  | Außendurchmesser des Schachts
> | d_i | m  | Innendurchmesser des Schachts
> ```

> **Tab. 2 universal, source L580–L581:**
> ```
> | d_a | mm | Außendurchmesser, z.B. eines Versickerrohrs in einer Rigole oder eines Sickerschachts
> | d_i | mm | Innendurchmesser, z.B. eines Versickerrohrs in einer Rigole oder eines Sickerschachts
> ```

**Audit-report A138-18 conclusion was wrong.** It treated Tab. 2 as authoritative for the Rigole context. But §6.4.2's local variable list **explicitly redefines d_a/d_i as `m`** for use in Gl. (21) — exactly as §6.7.2 does for Schacht. The DB unit `m` is source-correct in both contexts; **Tab. 2's `mm` is itself the source inconsistency**, and the local §6.x.y override is what the equations actually rely on (the dimensional consistency with b_R, h_R in m confirms this).

So the recommendation will be: **revert the audit_status from "mismatch" to "match"** with updated audit_notes explaining the §6.4.2 local override, not change unit or equation.

---

## Step 2 — Per-row decision blocks

### Row 1 — `a138_k_f_geo` (id `7af2b6e8-18ce-443e-942f-6a1de3b8895f`, WS A138-11)

**Field + current state**
- Symbol: `a138_k_f_geo`, unit `m/s`, current `clause_reference = §4.5` (invalid anchor).
- Live behaviour: free-input number field. **No equation row uses it as input or output.** No compliance condition references it. The wizard does not auto-derive any value into this field, and nothing downstream consumes it.

**What the standard says**
- §5.3.3.6, source L1354 (verbatim):
  > "Im Einfachen Verfahren wird die bemessungsrelevante Infiltrationsrate vereinfachend konstant angenommen. Auf der sicheren Seite liegend wird die minimale Infiltrationsrate als k_f-Wert verwendet."
- §5.3.3.6 also defines f_K (Gl. 6 + Tab. 10/11) for site/method corrections, but nowhere endorses geometric averaging of multiple k_f samples.

**The discrepancy**
- The field name encodes a *statistical rule* (geometric mean) that the standard explicitly does not adopt. The standard mandates the minimum.
- Geometric mean of any spread of k_f measurements is **strictly ≥ the minimum** → using a `k_f_geo` value as the design k_f produces an un-safe-side result.

**Options**

| Option | Consequence |
|---|---|
| A. Remove the field | Engineers can no longer record a geometric-mean intermediate; if they were doing this off-the-record, they lose the slot. Wizard becomes more source-faithful. No equation breaks (nothing consumes it). |
| B. Keep field, rename to `a138_k_f_sample_n` (one of multiple raw samples) | Slot retained as raw data, not a design input. Decoupled from "design k_f" semantics. Engineer can still record geo-mean elsewhere. |
| C. Keep field as-is and add clause_reference `§5.3.3.6` | Anchors the row, but **misleads** future readers — the standard does *not* sanction geo-mean. Anchor-fix becomes a false certification of compliance. |
| D. Replace the trio (`k_f_geo`, `k_f_min`, `k_f_design`) with a single `k_f` field + `permeability_test_method` selector + a derived `k_i = k_f · f_K` per Gl. 5 (which already exists as `k_i`) | Cleanest. Source-aligned. Largest scope. |

**Recommendation (engineer to confirm)**
- **Option A** — remove `a138_k_f_geo`. Reasoning: the standard explicitly rejects geometric averaging for design k_f; the field is unconsumed; keeping it invites un-safe-side use. Engineers who want to log a raw sample have `k_f` (Tab. 2 universal symbol) for that.

**SQL if approved (not executed):**
```sql
-- Remove the field. Cascade will not fire because nothing references it.
DELETE FROM fields WHERE id = '7af2b6e8-18ce-443e-942f-6a1de3b8895f';
```

---

### Row 2 — `a138_korrekturfaktor` (id `52b6f9cb-0821-448e-85e5-1aca402f11a7`, WS A138-11)

**Field + current state**
- Symbol: `a138_korrekturfaktor`, unit `1` (dimensionless), current `clause_reference = §4.5` (invalid anchor).
- Live behaviour: free-input number field. No equation references it. No compliance condition references it.

**What the standard says**
- §5.3.3.6, source L1358-1367 + Tab. 10/11:
  > "f_K = f_Ort · f_Methode ≤ 1   (Gl. 6)"
- The source defines **exactly two** site-correction factors: `f_Ort` (Tab. 10) and `f_Methode` (Tab. 11). The resultant is `f_K` (Gl. 6, ≤ 1 cap). There is **no "Schichtung-Korrekturfaktor"** in the source.

**The discrepancy**
- The field encodes a "Schichtung" (soil-layering) correction factor not defined by the standard.
- The conceptual slot for site corrections is already filled by `f_K` (which exists in A138-11 as `a138_f_K` per the audit). `a138_korrekturfaktor` is a **duplicate / undefined-concept** field.

**Options**

| Option | Consequence |
|---|---|
| A. Remove the field; collapse intent into existing `f_K` | Source-aligned. Engineer who wants to record a layering judgement does it inside `f_Ort` (Tab. 10 covers "Variabilität der Bodenverhältnisse"). No equation breaks. |
| B. Keep field, anchor to §5.3.3.6 with note "Wizard-internal, no source basis" | Preserves slot but pollutes the standard's f_K hierarchy. |
| C. Rename to `a138_f_Schichtung_note` (text field, advisory only) | Keeps engineer commentary, removes the false-numeric-factor impression. |

**Recommendation (engineer to confirm)**
- **Option A** — remove. Reasoning: source defines exactly 2 correction factors; engineers needing to record layering judgement should write it into `f_Ort` rationale per Tab. 10 ("Variabilität der Bodenverhältnisse"). Keeping a parallel undefined factor risks mis-stacking with f_K.

**SQL if approved (not executed):**
```sql
DELETE FROM fields WHERE id = '52b6f9cb-0821-448e-85e5-1aca402f11a7';
```

---

### Row 3 — `a138_speichertyp` (id `3a327d2d-8013-464c-be6f-112402e8904b`, WS A138-13)

**Field + current state**
- Symbol: `a138_speichertyp`, type enum (text), no unit, current `clause_reference = §4.6` (invalid).
- Live behaviour: free-input enum. No equation consumes it. No compliance condition references it.

**What the standard says**
- The standard treats the *storage type* implicitly via the facility-type choice (§6.x.y): V_M (Mulde, §6.3), V_R (Rigole, §6.4), V_MR (MRE, §6.5), V_MRS (MRS, §6.6), V_S (Schacht, §6.7), V_VA (Becken, §6.8).
- There is no single field called "Speichertyp" in the source; the storage type is fully determined by `facility_type_selected` (A138-15).

**The discrepancy**
- This is a **duplicate of `facility_type_selected`** (A138-15), recorded on the wrong worksheet (general-calc phase A138-13 vs facility-pick phase A138-15).

**Options**

| Option | Consequence |
|---|---|
| A. Remove field; rely on `facility_type_selected` | Removes duplication. A138-13's V_VA-calculation worksheet no longer carries a redundant type slot. |
| B. Keep field, derive from `facility_type_selected` via the new naive evaluator (would need engine extension to copy-symbol) | Maintains slot but adds a derivation path the engine doesn't currently support. |
| C. Keep as free-input, anchor to §5.3.3.7 | Anchor is wrong; this field is about storage-type, not Gl. 8. |

**Recommendation (engineer to confirm)**
- **Option A** — remove. Reasoning: pure duplicate with `facility_type_selected`. Removing eliminates a conflicting source of truth.

**SQL if approved (not executed):**
```sql
DELETE FROM fields WHERE id = '3a327d2d-8013-464c-be6f-112402e8904b';
```

---

### Row 4 — `a138_V_Sp_vorhanden` (id `0c5051cd-c992-4287-a8b1-187eb3af9393`, WS A138-13)

**Field + current state**
- Symbol: `a138_V_Sp_vorhanden`, unit `m³`, current `clause_reference = §4.6` (invalid).
- Live behaviour: free-input number. No equation consumes it. No compliance condition references it.

**What the standard says**
- The standard defines V_VA (Gl. 8, §5.3.3.7) as the **required** storage volume — a single number, not "required vs available".
- §6.x.y define the facility-specific available volume implicitly as the computed dimension (V_M, V_R, V_S, V_VA).

**The discrepancy**
- The field encodes a "vorhanden" (available) volume separate from the calculated V_VA. This is a **wizard-internal engineer comparison check** — useful operationally (engineer ticks "is the geometry I chose actually big enough?") but not a source-defined data point.

**Options**

| Option | Consequence |
|---|---|
| A. Keep as Wizard-internal field; set clause_reference to NULL; mark with `verification_status = 'inferred_from_worksheet'` | Honest: preserves an engineering convenience without claiming source basis. |
| B. Remove field | Engineer loses the explicit "is geometry sufficient?" slot. They would need to back-figure from `V_R_dimensioned` (or similar) ≥ V_VA in their head. |
| C. Replace with a derived field `V_geometry_check` that equals `facility_volume_chosen - V_VA` and require ≥ 0 | Adds value but requires real arithmetic in the engine (not just sum). |

**Recommendation (engineer to confirm)**
- **Option A** — keep as Wizard-internal with NULL clause_reference. Reasoning: the field has operational value (helps engineers gut-check geometry vs requirement), but the concept itself isn't in the source. NULL-anchor is the most honest classification.

**SQL if approved (not executed):**
```sql
UPDATE fields
SET clause_reference = NULL,
    verification_status = 'inferred_from_worksheet'
WHERE id = '0c5051cd-c992-4287-a8b1-187eb3af9393';
```

---

### Row 5 — `a138_anlagentyp_kandidaten` (id `d52ed064-0a8f-47da-a2e1-e9fa40eae0a9`, WS A138-15)

**Field + current state**
- Symbol: `a138_anlagentyp_kandidaten`, type list/text, no unit, current `clause_reference = §4.7` (invalid).
- Live behaviour: free-input text. No equation consumes it. No compliance condition references it.

**What the standard says**
- §6.1 Bild 7 is a decision tree for facility-type selection but does not enumerate "Kandidaten" as a recorded data point.
- The standard's view: there is one chosen facility type, determined by site constraints + Tab. 5/6/7 admissibility + Bild 7 logic.

**The discrepancy**
- "Kandidaten" (candidates) is a Wizard-internal short-list capturing engineer reasoning before final choice. Not source-defined.

**Options**

| Option | Consequence |
|---|---|
| A. Keep as Wizard-internal with NULL clause_reference + `verification_status = 'inferred_from_worksheet'` | Preserves the reasoning-trail for audit/review. |
| B. Remove field | Loses the engineer's "I considered X and Y but picked Z" record — possibly forensically useful. |
| C. Anchor to §6.1 Bild 7 with caveat | Misleading: Bild 7 is a flowchart, not a "candidates" register. |

**Recommendation (engineer to confirm)**
- **Option A** — keep as Wizard-internal, NULL anchor. Reasoning: useful for the design-review trail in A138-27; honest about non-source-status.

**SQL if approved (not executed):**
```sql
UPDATE fields
SET clause_reference = NULL,
    verification_status = 'inferred_from_worksheet'
WHERE id = 'd52ed064-0a8f-47da-a2e1-e9fa40eae0a9';
```

---

### Row 6 — `a138_A_u` (id `77c7461c-26d9-4db2-acef-df975d34decf`, WS A138-16)

**Field + current state**
- Symbol: `a138_A_u`, unit `m²`, current `clause_reference = §4.8` (invalid).
- Live behaviour: free-input number. No equation consumes it as input or output. No compliance condition references it.

**What the standard says**
- Tab. 2 does not define `A_u`. The closest defined area concepts are:
  - `A_E,b,a` — befestigte und angeschlossene Teilfläche (impervious + connected) — A138-10
  - `A_C` (or AC) — Rechenwert für Bemessung = Σ(A_E,b,a · C) — Gl. 2, §5.3.3.5
  - `A_S` — Versickerungsfläche, Gl. 12 (Flächenversickerung), Gl. 17 (Rigole), Gl. 34 (Schacht)
- "A_u" might stand for "undurchlässig" (impervious) or "abflusswirksam" — ambiguous. Neither is a Tab. 2 symbol.

**The discrepancy**
- Symbol not in source, concept ambiguous between two existing source symbols (A_E,b,a vs A_C).

**Options**

| Option | Consequence |
|---|---|
| A. Remove field, rely on A_E,b,a (A138-10) and A_C (A138-10) | Source-aligned. Forces engineers to use the precise symbols. |
| B. Rename to `a138_A_u_engineer_note` (free-text comment, not numeric) | Captures any engineer commentary without implying a numeric source-defined quantity. |
| C. Keep as free-input, anchor to §5.3.3.5 with note | Anchor lie; misleads. |

**Recommendation (engineer to confirm)**
- **Option A** — remove. Reasoning: the symbol is not in Tab. 2 and the concept is fully covered by A_E,b,a + A_C. Removing forces source-faithful naming.

**SQL if approved (not executed):**
```sql
DELETE FROM fields WHERE id = '77c7461c-26d9-4db2-acef-df975d34decf';
```

---

### Row 7 — `d_a` (id `37eb0b5f-d412-442c-9b8e-d8b7b4a3f91d`, WS A138-18)

**Field + current state**
- Symbol: `d_a`, DB unit `m`, current `clause_reference = §6.4.2`.
- Live behaviour: free-input number. Consumed as `input_symbol` in Gl. 21, 22 (s_R) and Gl. 23 (L_R). With the naive sum-evaluator, this term contributes additively to an arithmetic sum that does not represent the real algebraic formula in any way (i.e. the runtime output for `s_R` and `L_R` is already wrong, independent of unit). Engineers reading the displayed formula do hand calcs.

**What the standard says**
- **§6.4.2 Rigole, source L1825-1834**: under Gl. (21) the local variable list reads `d_a | m | Außendurchmesser des Versickerrohrs`. **Explicit local override to `m`.**
- **Tab. 2 universal, source L580**: `d_a | mm`. Universal default.
- **§6.7.2 Schacht, source L2110**: `d_a | m`. Explicit local override.

**The discrepancy**
- **The audit report A138-18 was wrong.** It flagged a mismatch against Tab. 2's `mm` without spotting that §6.4.2 locally redefines `d_a` as `m` (parallel to §6.7.2). The DB unit `m` is **correct in the Rigole context**, and aligns dimensionally with b_R, h_R, L_R, all in `m`.
- The real source inconsistency is **inside the standard**: Tab. 2 says mm universally, but every §6.x.y that actually uses d_a (§6.4.2, §6.7.2) overrides to m. This is a DWA-A 138-1 internal table-vs-text mismatch, not a wizard error.

**Options**

| Option | Consequence |
|---|---|
| A. Reclassify audit_status from `mismatch` → `match` with updated audit_notes citing §6.4.2 L1831 local override | Audit truth restored. No data change. Recommends the engineer document the table-vs-text inconsistency as a known standard quirk. |
| B. Change DB unit to `mm` to match Tab. 2 | Source-incorrect for §6.4.2's local override. Would also require inserting ·10⁻³ scaling in the equation strings if a real evaluator is ever wired. Worse outcome than A. |
| C. Leave audit_status = `mismatch`, document in `_PROGRESS.md` as ambiguous | Leaves a misleading mismatch in the audit record. Bad. |

**Recommendation (engineer to confirm)**
- **Option A** — reclassify to `match`. Reasoning: §6.4.2 explicitly defines d_a/d_i as `m` for Rigole (L1831-1832), exactly as §6.7.2 does for Schacht (L2110-2142). The audit treated Tab. 2 as authoritative without seeing the local override; that was an audit error, not a wizard error.

**SQL if approved (not executed):**
```sql
UPDATE fields
SET audit_status = 'match',
    source_anchor = '§6.4.2 (Rigole, Gl. 21 lokale Variablenliste L1831: d_a in m, überschreibt Tab. 2 mm — parallel zu §6.7.2 Schacht)',
    audit_notes = 'KORREKTUR der ursprünglichen Audit-Klassifikation: §6.4.2 definiert d_a unter Gl.(21) explizit als m (Source L1831-1832), parallel zur §6.7.2-Schacht-Definition. Tab. 2 mm ist die universale Default-Definition, wird aber in §6.x.y systematisch auf m überschrieben. DB-Unit m ist source-konform und dimensional konsistent mit b_R, h_R, L_R (alle in m). Engineer-Notiz: Tab.2-vs-§6.x-Inkonsistenz ist ein bekannter Standard-internal Quirk.',
    audited_at = NOW()
WHERE id = '37eb0b5f-d412-442c-9b8e-d8b7b4a3f91d';
```

---

### Row 8 — `d_i` (id `fdd0e2fe-c67c-4cce-ba6b-d0a6206fa743`, WS A138-18)

**Field + current state**
- Symbol: `d_i`, DB unit `m`, current `clause_reference = §6.4.2`.
- Live behaviour: same as d_a — consumed in Gl. 21, 23. Naive sum-evaluator produces meaningless output regardless of unit. Engineers do hand calcs.

**What the standard says**
- **§6.4.2 Rigole, source L1831**: `d_i | m | Innendurchmesser des Versickerrohrs`. Explicit local override.
- **Tab. 2 universal, source L581**: `d_i | mm`.
- **§6.7.2 Schacht, source L2142**: `d_i | m`. Explicit local override.

**The discrepancy**
- Same as d_a. Audit treated Tab. 2 as authoritative without spotting §6.4.2's local override.

**Options**
- Same three as d_a.

**Recommendation (engineer to confirm)**
- **Option A** — reclassify to `match`. Same reasoning as d_a.

**SQL if approved (not executed):**
```sql
UPDATE fields
SET audit_status = 'match',
    source_anchor = '§6.4.2 (Rigole, Gl. 21 lokale Variablenliste L1831: d_i in m, überschreibt Tab. 2 mm — parallel zu §6.7.2 Schacht)',
    audit_notes = 'KORREKTUR der ursprünglichen Audit-Klassifikation: §6.4.2 definiert d_i unter Gl.(21) explizit als m (Source L1831). Tab. 2 mm ist universale Default-Definition; §6.x.y systematisch m. DB-Unit m source-konform.',
    audited_at = NOW()
WHERE id = 'fdd0e2fe-c67c-4cce-ba6b-d0a6206fa743';
```

---

## Step 3 — Summary table for sign-off

| # | id (short) | symbol | recommendation | action class |
|---|---|---|---|---|
| 1 | 7af2b6e8 | a138_k_f_geo | Remove field | DELETE |
| 2 | 52b6f9cb | a138_korrekturfaktor | Remove field | DELETE |
| 3 | 3a327d2d | a138_speichertyp | Remove field (duplicate of facility_type_selected) | DELETE |
| 4 | 0c5051cd | a138_V_Sp_vorhanden | Keep as Wizard-internal, NULL anchor + inferred_from_worksheet | UPDATE |
| 5 | d52ed064 | a138_anlagentyp_kandidaten | Keep as Wizard-internal, NULL anchor + inferred_from_worksheet | UPDATE |
| 6 | 77c7461c | a138_A_u | Remove field | DELETE |
| 7 | 37eb0b5f | d_a | Reclassify mismatch→match (audit error, §6.4.2 overrides Tab. 2) | UPDATE audit fields |
| 8 | fdd0e2fe | d_i | Reclassify mismatch→match (same as 7) | UPDATE audit fields |

**Key cross-cutting finding (for engineer):** The wizard has **no real algebraic equation evaluator today**. The only runtime calc in `worksheet-form.tsx:161-195` is a naive sum over `input_symbols`, designed for DIN-276 cost roll-ups. For DWA-A-138-1 facility-design equations (Gl. 11–41), the wizard currently *displays* the formula and *sums the inputs*, which produces meaningless numbers for any equation that isn't a literal sum. Engineers must do hand calcs from the rendered formula today. This is independent of the 8 decisions above, but explains why fixing units in d_a/d_i has no immediate runtime effect — and why building a real evaluator should be a separate workstream.

**Awaiting sign-off.** No DB or code change has been made.
