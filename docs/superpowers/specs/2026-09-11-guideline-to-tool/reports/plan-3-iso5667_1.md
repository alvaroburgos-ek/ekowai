# Plan 3 Task 28 — ISO-5667-1 (`iso5667_1`)

- **Standard:** ISO 5667-1 — *Water quality — Sampling — Part 1: Guidance on the design of sampling programmes*, **1980 edition**, read through NTC-ISO 5667-1:1995 (the ICONTEC / Colombian adoption, Spanish).
- **Worktree / branch:** `C:\Users\Ekowai\_wt-g2t`, `feat/guideline-to-tool`, base `bffcd55` (Task 27 fix round).
- **Nothing applied to prod.** No `apply-migration`, no `drizzle-kit`, no `vercel`, no DB write. Prod was touched READ-ONLY twice: `build-prior-snapshot.mjs` and `capture-text.mjs` (both committed), plus four `information_schema` reads through `prod-query.mjs`. `.env.local` was never read or printed.
- **Migrations WRITTEN, NOT APPLIED**, all three emitter-generated, each with a rollback.

## 1. Counts

| Item | Count | Note |
|---|---|---|
| Tables seeded | **4** | `S16_4_K` (7 rows), `S21` (24 rows), `S8_6` (1), `S12_1_2` (1) — **33 rows**, all quotes PDF-derived |
| Registers created | **4** | `determinands` (-02), `sites_1` (-05), `historical_results` (-07), `flow_measurements` (-08) |
| `lookup_fill` | **1** | `K_table` (-07) ← `S16_4_K` by `confidence_level` (a TWIN; prod's `K` is untouched — amendment J, `iso5667_1-E-1`) |
| `select_one` re-binds | **3** | `cooling_system_type`, `confidence_level`, `flow_direction` — all three keep prod's enums (`keep_prod`, D-1); two of them also carry a rule |
| Field `visible_when` emitted | **10** | see §4 |
| Section `visible_when` | **0** | the standard prints no whole-worksheet applicability rule — **amendment-O evidence below the table** |
| Fields created (`create`) | **15** | 4 register carriers + 7 derived outputs + `K_table` + 3 drivers/notes (`determinand_volatile`, `abnormal_conditions`, `sampling_time_note`) |
| Fields updated | **10** | widget / visibility only; no `data_type`, no `is_required`, no `enum_values` written |
| Equations emitted | **7** | `-02-D1/D2`, `-05-D1`, `-07-D1/D2/D3`, `-08-D1` |
| Equations WITHHELD | **2** | `n_required_calc` (prod Gl. 3 owns it — `R-1`); the replacement of Gl. 1 (`R-2`) |
| Visibility rules WITHHELD | **8** | refused by the emitter's guards → `G-1` / `G-2` / `G-3` / `C-1` / `C-2` |
| Sign-off blocks | **39** | G 3 · C 2 · E 1 · R 2 · D 23 · F 1 · J 4 · U 2 · X 1 |
| STAGED file | 910 lines | 100 % SQL comments (asserted by the generator) |

Files: `scripts/migrations/20260917102800_regulation_tables_seed_iso5667_1.sql` (148 lines) · `…102810_field_configs_iso5667_1.sql` (144) · `…102820_equations_iso5667_1.sql` (74) + the three `scripts/rollback-…` files (6 / 28 / 10) · `scripts/verification/iso5667_1-STAGED-plan3-rulings.sql` (910).

### Amendment-O evidence for "Section `visible_when` 0 — the standard prints no whole-worksheet applicability rule"

Re-executed in the Task-30b absence pass, 2026-09-24, against a **fresh in-session extraction** of the PDF named in the plan's source table (`C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-1\ISO-5667-1.pdf`, NTC-ISO 5667-1:1995, Spanish). The extraction lives in the scratchpad only and is **not committed**:

```
$ "/c/Users/Ekowai/scoop/shims/pdftotext.exe" -layout \
    "C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-1\ISO-5667-1.pdf" \
    "<scratchpad>/t30b-iso5667_1.txt"
exit=0
$ wc -l "<scratchpad>/t30b-iso5667_1.txt"
1140 <scratchpad>/t30b-iso5667_1.txt          ← identical line count to the Task-28 extraction
```

This is a "no such rule is printed" claim, so it cannot rest on one empty grep; it was tested with two exhaustive Spanish cue sweeps over the whole extraction, and **every hit is printed in full and classified** (no `cut`, no truncation):

```
$ grep -n -iE "aplicab|se aplica|no aplica|aplicará|alcance|campo de aplicación" t30b-iso5667_1.txt
exit=0 — 5 hits, none a clause-level applicability rule:
  L307  (§8.3 CARÁCTER DEL FLUJO)  "debe inducir la turbulencia. Esto no se aplica a la recolección de muestras
        para la determinación de gases disueltos y materiales volátiles, cuya"  → a one-sentence FIELD-level caveat
        inside §8.3, and it is exactly the rule already emitted as the field rule `volatiles_minimal_suction`
        (driver `determinand_volatile`); it does not switch a clause on or off.
  L428  (§9.4.1 Flujo)  "En general, se aplican las consideraciones para los ríos y los torrentes, pero los
        siguientes factores exigen atención especial."   → a cross-reference, not a condition.
  L481  (§9.7)  "Muchos factores importantes en el muestreo de aguas, tales como el uso de botes, también se
        aplican al muestreo de depósitos del fondo."     → a cross-reference, not a condition.
  L788  "media aritmética; se supone que se aplica la distribución normal. …"   → a statistical assumption (§16).
  L875  "Por ejemplo, si se aplica la distribución normal, de acuerdo con lo anterior, el intervalo de confianza L …"
                                                                                  → a statistical assumption (§16).

$ grep -n -iE "sólo se|solamente se|únicamente se|sólo aplica|no es aplicable|esta sección|este numeral (sólo|no)" t30b-iso5667_1.txt
exit=0 — 6 hits, none a condition:
  L79   "El propósito de esta sección es destacar los factores más importantes …"      → scope prose
  L228  "En esta sección se tratan las diversas situaciones que se pueden encontrar …"  → scope prose
  L936  "… En esta sección se indican los principios de flujos que se deben considerar …" → scope prose
  L777 / L856 / L912 — inside the §16 statistical prose (sampling times, σ vs s, incremented frequency).

$ grep -n -iE "no se requiere|no es necesario|se omite|se puede omitir|no se necesita|excepto cuando|salvo" t30b-iso5667_1.txt
exit=0 — 1 hit, not a condition:
  L211  (§5.1) "sistemas o cerca de éstas, salvo que las condiciones sean de interés especial."  → a sampling-LOCATION
        caveat inside §5.1, not an applicability switch for any clause.
```

**Verdict: the claim HOLDS.** Not one printed sentence makes a whole clause of ISO 5667-1 conditionally applicable; every conditional the standard prints is scoped to a single field or a single sampling decision — which is why all ten emitted rules are field rules and the section count is 0. Stated honestly for the reader: this is a reasoned negative over a full-document cue sweep with every hit shown, not a single empty grep, because "no rule of kind X exists" cannot be proven by one pattern.

## 2. Source: the in-session PDF extraction (the one VA-grade task of this wave)

There is no md/txt transcript for this standard, but the PDF **is** text-readable. Extraction command, run in this session:

```
"/c/Users/Ekowai/scoop/shims/pdftotext.exe" -layout \
  "C:/Users/Ekowai/Desktop/Ciruclar economy, sustanability and water test/ISO 5667-1/ISO-5667-1.pdf" \
  "<scratchpad>/iso5667-1.txt"
```

Raw result (`exit=0`):

```
exit=0
-rw-r--r-- 1 Ekowai 197121 74428 Sep 24 14:17 <scratchpad>/iso5667-1.txt
--- bytes:   74428
--- lines:   1140
--- formfeeds: 17
--- non-whitespace chars: 55467
```

74 428 bytes over 17 pages, 55 467 non-whitespace characters — fully usable prose plus one readable numeric table. (Contrast Task 27, where the same command on the ATV-A-704E scan returned 37 bytes / 0 non-whitespace characters.)

**Page-mapping method.** `pdftotext` emits a form feed at the END of each page, so for a 1-based line number *n*:

```
page(n) = 1 + (number of \f characters in lines 1 … n−1)
```

The form feeds sit at lines 37, 110, 183, 256, 329, 402, 475, 548, 621, 694, 767, 851, 924, 997, 1070, 1106, 1141 (17 of them = 17 pages). The document prints its own page number at the foot of each page, and that number is **PDF page − 1** throughout (PDF page 2 carries the printed "1", PDF page 13 carries the printed "12"). Both numbers are recorded on every span. The mapping is implemented once, in the scratchpad generator, and never typed per quote.

**Cross-check against prod's own quotes (independent confirmation).** Prod's `equations.verification_quote` cells already carry "printed p.11 / PDF p.12" for §16.4 and "printed p.12 / PDF p.13" for §16.5 — the same mapping this session derived from the form-feed count. (One prod `source_quote` disagrees with its own `verification_quote` by one page — recorded as `iso5667_1-X-1`, not corrected here.)

**Quote module.** `src/lib/eval/regulation-tables-quotes-iso5667_1.ts` holds **58 spans** lifted MECHANICALLY by line range (`JSON.stringify` per span, generated by the scratchpad script `gen-iso5667_1-quotes.mjs`, never hand-edited, never retyped). Each key names the first/last line; each doc comment names the PDF page and the printed page. **The extraction itself is NOT committed** (it is a derivative of a licensed PDF).

**Row-by-row verification** (`scripts/regulation-tables/verify-regulation-tables.ts iso5667_1 "<extraction>"`), re-run after the last edit:

```
PASS  S16_4_K  99 … PASS  S16_4_K  50           (7)
PASS  S21  direction|drogue … PASS  S21  discharge|dilution_gauging   (24)
PASS  S8_6  heterogeneous
PASS  S12_1_2  sludge_pipe
33/33 quotes verbatim in <scratchpad>/iso5667-1.txt
```

## 3. Tables

### `S16_4_K` — §16.4, PDF p.12 (printed p.11) — the standard's ONE printed numeric table

```
       Nivel de confianza              99                 98               95               90        80              68              50
                K                     2,58              2,33              1,96              1,64     1,28            1,00            0,67
```

Seven rows keyed `confidence_level`, value `k` (+ `k_printed` as the printed decimal-comma string). The key tokens are prod's `confidence_level` `enum_values` **byte-identical** (`99 98 95 90 80 68 50`) — pinned in the field-config test against the captured prior.

The printed table is **column-oriented** (a header line of levels over a line of K values), so a seeded ROW corresponds to a printed COLUMN and there is no per-row line to quote: every row's `verbatim_quote` is the whole printed table span (L844–L846), and a build-time `inSpan` guard asserts that the row's level token AND its K value both occur inside it. Recorded here because it is a deliberate departure from "one row = one printed line".

Policy `locked`, `override_quote` = §16.4 L837–L840:

> "Cuando n es grande (véase el numeral 16.1), s difiere poco del valor verdadero σ, y el intervalo de confianza de X , calculado a partir de algún número de resultados n, es X ± K/n, **donde K tiene el valor dado en la siguiente tabla, dependiendo del nivel de confianza adoptado**." *(PDF p.12)*
> [EN] "…where K has the value given in the following table, depending on the confidence level adopted."

SR-2 is preserved: the ENGINEER selects `confidence_level`; the table only supplies the K that follows from that choice. No confidence level and no K is auto-picked anywhere.

### `S21` — §21.2 / §21.3 / §21.4, PDF pp.15–16 (printed pp.14–15) — the flow-method catalogue

24 rows keyed **(`aspect`, `method`)**, value `valid = 1` (+ `printed_item`, `via_cross_reference`). `aspect` tokens are prod's `flow_aspect` enum (`direction` / `velocity` / `discharge` — §19.1 prints exactly three aspects); `method` tokens are prod's `flow_measurement_method` enum, all 15 covered.

| aspect | rows | printed source |
|---|---|---|
| `direction` | 5 | §21.2 a)–e) — "La dirección **y la velocidad** se pueden medir utilizando" |
| `velocity` | 9 | the same §21.2 a)–e) + §21.3 a)–d) "La velocidad **también** se puede medir utilizando" |
| `discharge` | 10 | §21.4 b)–e) + d)1)–4); plus 2 via the a) cross-reference (see `J-4`) |

Policy `kann` (`se pueden medir` / `se puede determinar` — printed alternatives). No `override` sidecar is wired on the register: the `method` enum column IS the choice among the printed alternatives (gap G-1).

Two `discharge` rows — `current_meter` and `pneumatic` — come from §21.4 a) ("Mediciones de la velocidad, tales como las mencionadas en el numeral 21.3 efectuadas en un canal cuya área de sección transversal sea conocida"), a cross-reference **inside the same document**. They carry `via_cross_reference: true` so a single `DELETE` removes them; recorded as `iso5667_1-J-4` with the reasoning for seeding them (a missing row prints a BLANK verdict, i.e. a false alarm, next to a method the standard does allow). The two §21.3 methods that are genuinely repeated for discharge (`electromagnetic`, `ultrasonic`) are seeded from §21.4 d) 4) and are **not** flagged.

### `S8_6` / `S12_1_2` — the two printed sentence rules

| table | figure | policy | printed cue (PDF page) |
|---|---|---|---|
| `S8_6` | `min_nominal_bore_mm = 25` | **anhaltswert** | §8.6, p.5: "tubos de tamaño adecuado (**por ejemplo**, al muestrear líquidos heterogéneos, de conducto nominal mínimo de 25 mm)" |
| `S12_1_2` | `min_diameter_mm = 50` | **locked** | §12.1.2, p.10: "el conducto del muestreo **debe** tener al menos 50 mm de diámetro" |

The asymmetry is the standard's own: one figure is printed as an example, the other as a duty. Prod enforces **both** as `block` gates (CR-012 / CR-017). The 50 mm matches; the 25 mm does not, and that mismatch is `iso5667_1-J-3` (severity is always an owner ruling — nothing was changed).

`S12_1_2` is read by the `sites_1` row badge `sludge_pipe_ok` so the 50 mm is never typed into an expression; `S8_6` is seeded but not yet read by any expression (the §8.6 check lives in CR-012, which this task does not touch).

### `verification_status` — all four tables ship `imported_unverified` (`iso5667_1-J-2`)

The corpus vocabulary is `md_verified` (every row lifted from a **markdown** transcript, grade VC) and `imported_unverified`. There is no markdown transcript here, so `md_verified` would be factually false, and the controller's ruling stands: a third token is not introduced unilaterally. The fail-safe lower token ships, and `J-2` proposes `pdf_verified` with the exact `UPDATE` + rollback. The honest consequence is that the evidence is **under**-stated: every row here is PDF-derived with a page reference, which SR-3 grades **VA** — strictly stronger than the `md_verified` rows elsewhere in this wave.

## 4. Registers, conditionals and the refusals

### Registers (all `create`d, `json` carriers)

| register | worksheet · section | columns | derived |
|---|---|---|---|
| `determinands` | -02 · B | `kennung` · `parameter`* · `variability`(3) · `objective` · `target_statistic`(3) · `sampling_times_relevant` (row-rule `variability == 'wide_rapid'`) · `n_required` | — |
| `sites_1` | -05 · A | `kennung`* · `situation_type`(16, discriminator)* · `location_identified` · `flow_character`(3) · `weather` · + 8 situation-specific columns | `sludge_pipe_ok` (badge, reads `S12_1_2`) |
| `historical_results` | -07 · B | `kennung` · `datum` · `x_value`* | Σ footer + `n_hist` / `x_mean_calc` / `s_calc` |
| `flow_measurements` | -08 · E | `kennung`* · `aspect`(3, discriminator)* · `method`(15)* · `mode`(2) · `velocity_measured` · `discharge_measured` | `method_ok` (badge, reads `S21`) |

(`*` = required column.) Every enum column's options equal the prod enum byte-for-byte (pinned).

**Amendment P** is honoured: no column is keyed `id` (it would collide with the row identity `prepareRegisterRows` reads from `r.id`). The row label column is `kennung` throughout. Additionally **no column shadows a prod symbol of its own worksheet** (the corpus invariant) — hence `situation_type` / `depth_below_ground_m` / `well_purged` / `cooling_type` / `sludge_pipe_dn_mm` / `x_value` / `variability` / `aspect` rather than the prod spellings. Each pair is a `D-` block (§6).

The first emit produced three Task-13b lint warnings because the columns were keyed `velocity` / `discharge` while `'velocity'` / `'discharge'` are also `flow_aspect` literals. They were renamed `velocity_measured` / `discharge_measured`; the final emit has **zero warnings** (pinned: `expect(warnings).toEqual([])`).

### Emitted `visible_when` (10)

| symbol | worksheet | rule | printed basis (PDF page) |
|---|---|---|---|
| `volatiles_minimal_suction` | -04 | `determinand_volatile == true` | §8.10, p.6 |
| `cooling_system_type` | -05 | `water_situation_type == 'cooling_system'` | §10.2.4, p.9 (the three printed types) |
| `manhole_sampled_without_entry` | -05 | `… == 'commercial_effluent'` | §11.1, p.10 — prod's own clause_reference is §11.1 |
| `composite_multipoint_sample` | -05 | `… == 'wastewater'` | §12.1.1, p.10 |
| `upstream_downstream_sampling` | -05 | `… == 'river_stream'` | §9.3.2, p.7 |
| `control_limits` | -06 | `programme_type == 'quality_control'` | §15.1, p.11 |
| `sampling_time_note` (created) | -06 | `variability_profile == 'wide_rapid'` | §16.5, p.13 |
| `flow_direction` | -08 | `flow_aspect == 'direction'` | §19.2, p.14 |
| `flow_velocity` | -08 | `flow_aspect IN {'velocity','discharge'}` | §19.3, p.14 |
| `discharge_rate` | -08 | `flow_aspect == 'discharge'` | §19.4, p.14 |

Every driver resolves on its rule's worksheet (same worksheet, or inherited via `consumer_worksheets` — asserted in the test).

### Refusals, asserted through the emitter (not claimed)

Every withheld rule was run through `emitFieldConfigSql` and the **exact refusal string is pinned** in `src/lib/eval/__tests__/field-configs-iso5667-1.test.ts`:

```
REFUSED  ISO-5667-1-04 pipe_nominal_bore: visible_when hides pipe_nominal_bore read by gate CR-012 (block: "pipe_nominal_bore >= 25") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block
REFUSED  ISO-5667-1-04 isokinetic_sampling: … gate CR-013 (warn: "isokinetic_sampling IS NOT NULL") …
REFUSED  ISO-5667-1-05 groundwater_purged: … gate CR-016 (block: "groundwater_purged IS NOT NULL AND sampling_depth IS NOT NULL") …
REFUSED  ISO-5667-1-05 sampling_depth: … gate CR-016 …
REFUSED  ISO-5667-1-05 sludge_pipe_diameter: … gate CR-017 (block: "sludge_pipe_diameter >= 50") …
REFUSED  ISO-5667-1-05 automatic_sampler_protection: … gate CR-018 (warn: "automatic_sampler_protection IS NOT NULL") …
REFUSED  ISO-5667-1-05 flow_proportional_sampling: visible_when on a symbol consumed by another worksheet — hides flow_proportional_sampling (consumed by ISO-5667-1-08) …
REFUSED  ISO-5667-1-06 abnormal_frequency_increase: … gate CR-022 (warn: "abnormal_frequency_increase IS NOT NULL") …
REFUSED  ISO-5667-1-06 target_statistic: visible_when on a symbol consumed by another worksheet — hides target_statistic (consumed by ISO-5667-1-07) …
REFUSED  ISO-5667-1-07 sigma: visible_when on a symbol consumed by another worksheet — hides sigma → Gl.3 n (consumed by ISO-5667-1-06) …
ACCEPTED ISO-5667-1-07 x_i   (no consumer, no gate — an accepted control)
ACCEPTED ISO-5667-1-06 control_limits   (the rule that IS emitted — an accepted control)
```

The brief anticipated CR-012/013 → `G-1` and CR-016/017/019 → `G-2`; the live capture adds **CR-018** to `G-2`, moves CR-019 to its own block (`C-2`, because the producer guard fires on it first) and adds `G-3` for CR-022. The last line is the **transitive** guard (amendment H) working: `sigma` has no consumers of its own but feeds prod Gl. 3, whose `n` is consumed by -06.

## 5. Equations

| # | worksheet | formula | clause |
|---|---|---|---|
| `ISO-5667-1-02-D1` | -02 | `determinands_count = count_rows(determinands)` | §3 |
| `ISO-5667-1-02-D2` | -02 | `n_programme = max_rows(determinands, n_required)` | §15.2, §16.5 |
| `ISO-5667-1-05-D1` | -05 | `sites_count = count_rows(sites_1)` | §8.1, §8.2 |
| `ISO-5667-1-07-D1` | -07 | `x_mean_calc = mean_rows(historical_results, x_value)` | §16.4 |
| `ISO-5667-1-07-D2` | -07 | `n_hist = count_rows(historical_results)` | §16.4 |
| `ISO-5667-1-07-D3` | -07 | `s_calc = stdev_rows(historical_results, x_value)` | §16.4 |
| `ISO-5667-1-08-D1` | -08 | `flow_measurements_count = count_rows(flow_measurements)` | §19.1 |

No figure appears in any formula (asserted). No emitted equation re-produces a prod output symbol (`s`, `L`, `n`, `x_mean`, `K`, `sigma` are excluded, asserted).

### The `stdev_rows` form, probed before it was pinned

The brief required a probe rather than an assumption. Run in this session against the real engine:

```
rows=0 s = stdev_rows(hr, x_i) -> {"kind":"manual_required","reason":"Keine vollständigen Zeilen in \"hr\"."}
rows=1 s = stdev_rows(hr, x_i) -> {"kind":"manual_required","reason":"stdev_rows(): mindestens 2 vollständige Zeilen erforderlich."}
rows=2 (10,20)      -> 7.0710678118654755      = √(50/1)   sample
rows=3 (10,20,30)   -> 10                      = √(200/2)  sample
```

`stdev_rows` is therefore the **sample (n − 1)** form (the population forms would be 5 and 8.165). The standard **prints the same divisor**:

> "Para cierto número de resultados n, tomados al azar, las estimaciones de la media aritmética verdadera X y la desviación estándar, σ, son la media aritmética, X , y s respectivamente de acuerdo con la siguiente fórmula: … S = … / **n −1** … Donde xi representa los valores individuales." *(PDF p.12, printed p.11, §16.4)*

Gap G-4 therefore does **not** bite: no silent switch, the printed definition and the engine agree, and nothing was faked. The pin in `equations-iso5667-1.test.ts` asserts √(500/3) **and** asserts it is NOT √(500/4), so a later engine change to the population form fails the test.

### `^` and the printed worked example

`^` is supported by the parser (`src/lib/expr/parser.ts`, right-associative `power` production). The printed §16.5 worked example reproduces **end-to-end** through the seeded K and prod's own stored equations:

```
K = table('S16_4_K', ['95']).k                  -> 1.96
n = (2 * K * sigma / L)^2   [prod Gl. 3]        -> 61.46560000000001   → round = 61   (printed "n ≈ 61")
L = 2 * K * sigma / sqrt(n) [prod Gl. 2]        -> 10.000000000000002              (the printed input)
```

with σ = 20 % and L = 10 % of the mean, as the standard sets the example up. That is the strongest single confirmation in this task: the seeded K, the stored equations and the printed result all agree.

### Withheld equations

- **`iso5667_1-R-1`** — the brief's `n_required_calc = (2*K*sigma/L)^2` is **NOT emitted**: prod Gl. 3 (`8b5fc076-…`, `verified_against_standard`) already produces exactly that, and it computes. A second equation for one quantity violates the single-source derivation invariant. What the brief actually wanted (K from the table instead of typed) is delivered by the `K_table` twin now and by `E-1` on ratification, **without touching Gl. 3** — the equation reads the field `K`.
- **`iso5667_1-R-2`** — prod Gl. 1 `s = sqrt( SUM((x_i - x_mean)^2) / (n - 1) )` can never compute (`SUM()` is not in the engine's function set; the harness records it as NR). The working form ships as the distinct `s_calc`; replacing a `verified_against_standard` equation is a ruling and is STAGED with an archive + md5 guard and a 22-column explicit re-INSERT rollback.

### `iso5667_1-F-1` — the engine gap this standard exposes

`method_ok` is `if(lookup('S21', aspect, method, 'valid') == 1, 1, 0)`. Probed in this session through the real path:

```
rows                (discharge, venturi)  (velocity, current_meter)  (direction, venturi)
                     — both printed in §21 —                        NOT printed in §21.2
method_ok           1                     1                          null
reg.diagnostics     []                    (a lookup miss is a RECOVERABLE ExprError — silent by design)
count_rows(flow_measurements, method_ok == 0)
                 -> {"kind":"manual_required","reason":"Fehlende Eingabe für count_rows(): method_ok"}
count_rows(flow_measurements)
                 -> {"kind":"computed","value":3}
```

A missing row yields a **blank** cell, not 0, and any aggregate over that column goes `manual_required`. Consequence: the §21 check can be a per-row badge but **never** a worksheet-level count — so `method_ok` ships as a badge and **no equation is emitted over it** (`-08-D1` counts rows, not verdicts). Fail-safe (never a phantom pass) but never a verdict either. Proposed engine addition for the final [CODE] wave: `lookup_default(table, keys…, column, default)` or `has_row(table, keys…)`.

**Amendment D note (recorded once):** all seven equations are register-fed and materialise on save on their own worksheet; there is no scalar-only row in this module, so the "scalar-only equations are not server-materialised" caveat does not apply here.

## 6. Amendment K — register column ↔ prod scalar pairs

21 pairs, one `D-` block each (`D-2` … `D-22`), plus `D-23` for the two derived twins and `D-1` for the missing enum token. In every block **both** stay: the register column is the N-instances shape, the prod scalar keeps every consumer and every gate it has today, and **no second equation is emitted for a quantity an existing input already carries**. Each block names the prod field id, its `data_type` / `is_required` / `consumer_worksheets`, the printed reason the N-instances shape exists, and a guarded `active = false` deactivation with a `fields_archive_iso5667_1` rollback. Three blocks carry an explicit extra warning (the symbol is inherited, or `is_required = true`).

`D-23` states plainly that **`n` must not be retired** — it is both the OUTPUT of Gl. 3 and an input of Gl. 1 / Gl. 2, and -06's CR-023 (`n > 0`, block) reads it across the worksheet boundary — and that `n_hist` is a different quantity (results on the sheet vs results required). The `x_mean` deactivation is deliberately guarded to be a NO-OP until `R-2` has replaced Gl. 1.

## 7. Absence claims (amendment O) — every one with its command and exit code

The brief named four tokens / fields that do not exist. Each was greped against the read-only prior capture; `grep` exit 1 = no match, no output:

```
$ grep -o '"cyclic"' src/lib/eval/field-configs/iso5667_1.prior.json            ; echo exit=$?
exit=1
$ grep -o '"heterogeneous"' src/lib/eval/field-configs/iso5667_1.prior.json     ; echo exit=$?
exit=1
$ grep -o '"sewer"' src/lib/eval/field-configs/iso5667_1.prior.json             ; echo exit=$?
exit=1
$ grep -o 'determinand_volatile' src/lib/eval/field-configs/iso5667_1.prior.json ; echo exit=$?
exit=1
$ grep -oE '"[^"]* abnormal_conditions"' src/lib/eval/field-configs/iso5667_1.prior.json ; echo exit=$?
exit=1
$ grep -o 'sampling_time_note' src/lib/eval/field-configs/iso5667_1.prior.json  ; echo exit=$?
exit=1
$ grep -oE '"[^"]* (n_required|x_mean_calc|s_calc|n_hist|sites_count|n_programme|determinands_count|flow_measurements_count|K_table)"' src/lib/eval/field-configs/iso5667_1.prior.json ; echo exit=$?
exit=1
```

Consequences, each recorded rather than invented:

- **`cyclic`** — §16.5 *does* print cyclic variation ("Las variaciones sistemáticas pueden ser tendencias o variaciones cíclicas"), but `variability_profile`'s prod enum has only `stable / slow / wide_rapid` and D-1 forbids overwriting a non-null enum. The emitted §16.5 rule is therefore `variability_profile == 'wide_rapid'` only; `iso5667_1-D-1` proposes the token with the jsonb `||` UPDATE and the widened rule.
- **`heterogeneous`** — not a `flow_character` token (prod: `turbulent_well_mixed / laminar_pipe / reverse_flow`). `flow_character` is therefore **not** used as the §8.6 driver at all: its printed meaning (§8.3/§8.4) is the character of the flow, not whether a pipe is sampled. `G-1` creates a purpose-built `pipe_sampling` boolean instead.
- **`sewer`** — not a `water_situation_type` token. Prod's own `clause_reference` for `manhole_sampled_without_entry` is **§11.1**, which is EFLUENTES COMERCIALES, and the printed manhole sentence is there; the rule therefore drives off `water_situation_type == 'commercial_effluent'`, not an invented `sewer`.
- the six created symbols did not exist and are additive `create`s.

## 8. §5 top-wins walk (inventory)

| # | win | status |
|---|---|---|
| 1 | `confidence_level` → `K` looked up instead of typed; `n` computed | **partially** — the §16.4 table IS seeded from the PDF and the `K_table` fill IS emitted, but prod's `K` itself is not re-bound (amendment J: a `locked` table hides the input, and `K` is required → `E-1`). `n` was already computed by prod Gl. 3 and is confirmed computing (worked example reproduced). The push to ISO-5667-10 `number_of_samples` is cross-standard → Phase 6, `X`-class. |
| 2 | historical results as `x_i` rows → x̄ / n / s computed | **encoded** — `historical_results` + `-07-D1/D2/D3`; the printed n − 1 divisor matches the engine's `stdev_rows`, probed and pinned. The retirement of the three typed statistics is `D-17` / `D-23`, the Gl. 1 replacement `R-2`. |
| 3 | sites as rows whose `water_situation_type` shows only the relevant §9–13 checks | **encoded** — `sites_1` with a 16-token discriminator and 8 situation-specific columns + the §12.1.2 badge; rendered and pinned (groundwater vs stormwater vs sludge vs commercial effluent). The SCALAR sheet keeps every check visible → `G-2` / `C-2`. |
| 4 | `flow_aspect` filters `flow_measurement_method` to the §21 subset | **partially** — the full §21 catalogue is seeded keyed (aspect, method) and the register shows a per-row §21 badge; a worksheet-level verdict is not expressible today (`F-1`). The scalar `flow_measurement_method` is not filtered (a `visible_when` can hide a field, not narrow an option list). |
| 5 | `programme_type` switches control-limit vs target-statistic fields | **partially** — `control_limits` hides under `quality_control` (emitted); `target_statistic` is refused by the producer guard (`C-1`), and the per-determinand statistic is delivered by the `determinands` register instead. |

Inventory data-quality gaps, each answered: 1980 edition → `J-1`; no md transcript → replaced by the PDF extraction (this is now the wave's only VA source); `K` typed → `E-1` + the `K_table` twin; `x_mean` / `n` typed → `D-23`; CR-016/017/019 fire regardless of situation → `G-2` / `C-2`; cooling enum differs from ISO-5667-10 → cross-standard, Phase 6; unit `-` on enums/booleans → prod hygiene, untouched; `parameter_list` free text → replaced by the `determinands` register (`D-2`).

## 9. Verification (raw)

```
$ pnpm test            # vitest run --project unit
 Test Files  356 passed | 1 skipped (357)
      Tests  3130 passed | 1 expected fail | 1 skipped (3132)
   Duration  58.30s

$ pnpm -s typecheck    # tsc --noEmit
typecheck exit=0        (no output)

$ npx eslint <the 11 touched src files>
eslint exit=0           (no output)

$ npx vitest run --project integration tests/harness/iso5667-1-verify.integration.test.ts
 Test Files  1 passed (1)
      Tests  24 passed (24)
   Duration  5.71s

$ npx tsx scripts/regulation-tables/verify-regulation-tables.ts iso5667_1 "<scratchpad>/iso5667-1.txt"
33/33 quotes verbatim
```

The harness was **not** modified: its 24 tests (13 block gates both ways, the 14 warn gates never blocking, the 3 equations through the real `evaluateFormula`) pass unchanged, which is the expected result — every Plan-3 migration is written-not-applied, so the harness's view of prod is untouched. No stale pin needed correcting.

New tests added (all in the unit project):

| file | tests | what it pins |
|---|---|---|
| `src/lib/eval/__tests__/regulation-tables-seed-iso5667-1.test.ts` | 6 | shape, key uniqueness, the 7 K values + the 7 prod tokens, the 24 S21 rows per aspect + all 15 method tokens + the 2 cross-reference flags, the two sentence figures and their policies, the seed-migration freshness pin (33 row INSERTs, 4 DELETEs, no status upgrade), the optional transcript substring check |
| `src/lib/eval/__tests__/field-configs-iso5667-1.test.ts` | 8 | zod parse, no `id` column, no column shadowing a prod symbol, the 25/15/10 counts, the exact 10-rule list, D-1 on every existing enum, the 9 exported token lists equal to prod, G-A3 on the table keys, the `K_table` binding + `K` untouched, driver resolution, **the 10 emitter refusals verbatim**, the field-config migration freshness pin |
| `src/lib/eval/__tests__/equations-iso5667-1.test.ts` | 6 | 7 entries with created outputs, no prod output re-produced, no figure typed, `n_required_calc` absent, the equations freshness pin, x̄/n/s over 4 results with the sample-vs-population assertion, the empty / one-row / incomplete-row edge cases, the printed §16.5 worked example end-to-end, the F-1 behaviour |
| `src/components/worksheet/__tests__/register-iso5667-1-results.test.tsx` | 2 | `sites_1` through the generic `RegisterEditor`: groundwater vs stormwater columns, the other situations' columns on neither row, switching to sludge reveals the §12.1.2 badge which flips at the seeded 50 mm, a new row without `kennung` is incomplete and never counts, `-05-D1` through the real `evaluateFormula` |

## 10. Residue — what an engineer can and cannot do today

**Can, with the three migrations applied and nothing ratified:** enter determinands one per row with their variability and target statistic; enter sampling sites one per row and see only the §9–13 checks their situation prints, with a live §12.1.2 ≥ 50 mm badge; enter historical results one per row and get x̄, n and s computed with the standard's own n − 1 divisor; enter flow measurements per station with a §21 badge; get `control_limits` and the §16.5 note only when the programme type / variability profile call for them; get the §19 flow fields only for the aspect being measured; and read the printed K beside the K they type.

**Cannot yet:** have prod's `K` filled from the table (`E-1`); have the SCALAR §9–13 / §8.6 / §8.9 / §17 checks disappear when they do not apply — those gates still fire on every project (`G-1`, `G-2`, `G-3`, `C-2`), which for CR-012 / CR-016 / CR-017 means a **block** gate demanding an answer the project has no reason to give; record a cyclic variability profile (`D-1`); get a worksheet-level §21 verdict (`F-1`); or have `s` computed by the stored Gl. 1 (`R-2` — it is `s_calc` that computes today).

**Not encoded, with reason:** the cross-standard push of `n` into ISO-5667-10 `number_of_samples` (Phase 6, spec §8); §7's eleven safety clauses beyond the four booleans prod already carries (no printed values, prose duties already covered by CR-007/008/009); §§4, 6, 14, 18, 20 (descriptive/justificatory text, no normative value or closed list to encode).

**The one thing a reader should not miss:** this encoding is dated. Every clause number in it, and every clause number already in prod, is a **1980** clause number. `iso5667_1-J-1` asks whether that is acceptable or whether the standard must be re-sourced before any of it reaches a client deliverable.

## 11. Fix round 1 (2026-09-24) — reviewer verdict "Approved with minors", 0 Critical / 0 Important

The reviewer made its own `pdftotext` extraction and independently confirmed 58/58 spans, 58/58 page
citations, the R-1 refutation (61,4656 → 61), E-1 from the component source, F-1 through the register
path, and all three absence greps. Three minors were raised; all three are applied below. **No
migration content changed** — the three minors touch the STAGED rulings file, the sign-off sheet and
one test only, so nothing was re-emitted:

```
$ git diff --quiet -- scripts/migrations scripts/rollback-2026091710280*.sql scripts/rollback-2026091710281*.sql scripts/rollback-2026091710282*.sql
YES — no migration content changed, nothing to re-emit
```

### Minor 1 — the `J-1` cover-page evidence was not verbatim

**Was:** `"NORMA TÉCNICA NTC- COLOMBIANA 5667-1 | 1995-05-10 | GESTIÓN AMBIENTAL. …"` — it dropped `ISO`
from the designator (the printed token is `NTC-ISO`, split across two lines by the column layout),
flattened the two printed columns with an inserted `|`, and appended the title line, which is printed
further down the same page (L10–L11) and is **not** part of the L1–L5 span at all.

**Now:** both the STAGED block and the sheet carry the committed span `Q.L1_5` **byte-exactly**,
JSON-escaped so the column padding and the CR line endings survive, followed by a clearly-labelled
*Reading (NOT a quote)* that spells out how the two columns combine. Checked mechanically:

```
STAGED contains the byte-exact JSON-escaped span: true
sheet  contains the byte-exact JSON-escaped span: true
old flattened string gone (both files):           true
```

Two mistakes were found and fixed while doing this, both worth recording because both would have
silently re-introduced the defect:

1. The STAGED generator's `wrap()` helper hard-wraps by splitting on spaces and rejoining with single
   spaces — it **collapsed the column padding** on the first regeneration. That evidence line is now
   emitted unwrapped through `w()`, with a comment saying why it must never be wrapped.
2. In the sign-off generator the escaped span was first baked into a JS **single-quoted source
   literal**, where `\r\n` is an escape sequence and became a real CR/LF, breaking both the byte
   match and the markdown bullet. Both generators now parse `Q` out of the committed TS module and
   call `JSON.stringify` at **generate** time, so the escaping can no longer be lost in transit.

**The 1980 edition claim is unchanged**, and both files now say what it rests on: the byte-exact
L1099–L1100 span (`"…Geneva, 1980, 16 pp. (ISO 5667/1, 1980)."`) together with prod
`standards.version = '1980 (ISO 5667/1:1980; adopted as NTC-ISO 5667-1:1995)'` — **not** the cover
page, which carries only the NTC designator and the 1995 ICONTEC ratification date.

### Minor 2 — the two evidence lines that linearise displayed math are now annotated in place

Both now carry `[reflowed from the displayed formula — iso5667_1-U-1]` immediately after the closing
quotation mark, in the STAGED file and on the sheet, at each point of use:

- §16.5 worked example — `"… entonces: 10 = 2 x 1,96 x 20 / n … y por consiguiente n = 7,84 y n ≈ 61."`
  (blocks `R-1`, and the sheet's `R-1`);
- §16.4 s-formula — `"… de acuerdo con la siguiente fórmula: […] S = […] / n −1 […] Donde xi representa
  los valores individuales."` (blocks `R-2`, and the sheet's `R-2`).

The `U-1` block already carried the prose; the annotation puts the editorial step where the reader
meets the quote instead of one block away.

### Minor 3 — compound `IF … THEN` bodies are parenthesised

Every `IF … THEN` rewrite in the STAGED file now runs through one generated helper:

```js
const isCompound = (c) => /\s(AND|OR)\s/.test(c);
const ifBody    = (c) => (isCompound(c) ? `(${c})` : c);
```

The decision is taken from the **captured** condition, never by hand, so a future capture with a
different body is wrapped automatically. **All seven** proposed rewrites in the file were checked, not
just CR-016; exactly one is compound:

```
IF pipe_sampling == true THEN pipe_nominal_bore >= 25
IF suspended_solids_determined == true THEN isokinetic_sampling IS NOT NULL
IF water_situation_type == 'groundwater' THEN (groundwater_purged IS NOT NULL AND sampling_depth IS NOT NULL)   ← the only compound body
IF water_situation_type == 'wastewater_sludge' THEN sludge_pipe_diameter >= 50
IF water_situation_type IN {'wastewater', 'stormwater'} THEN automatic_sampler_protection IS NOT NULL
IF abnormal_conditions == true THEN abnormal_frequency_increase IS NOT NULL
IF water_situation_type == 'stormwater' THEN flow_proportional_sampling IS NOT NULL
```

Parse check and three-state evaluation, run through the engine's own `parseCondition` /
`evalCondition`:

```
BARE  parseCondition -> ok
PAREN parseCondition -> ok
river_stream (guard false)   bare={"kind":"pass"} paren={"kind":"pass"} same=true
groundwater, both null       bare={"kind":"fail"} paren={"kind":"fail"} same=true
groundwater, both set        bare={"kind":"pass"} paren={"kind":"pass"} same=true
groundwater, one set         bare={"kind":"fail"} paren={"kind":"fail"} same=true
```

Both forms parse and the verdicts are identical on every state — the parentheses are cosmetic, as
expected. The check is not a throwaway: it is now a **permanent pin** in
`src/lib/eval/__tests__/field-configs-iso5667-1.test.ts` that reads the seven conditions back out of
the committed STAGED file, asserts each one parses, asserts the parenthesisation matches
compoundness **both ways** (compound ⇒ parenthesised, simple ⇒ bare), names CR-016 as the single
compound body, and re-runs the four-state equivalence. The sheet's `G-2` block was regenerated from
the same generator, so it mirrors the parenthesised form.

### Fix-round verification (raw)

```
$ npx vitest run --project unit \
    src/lib/eval/__tests__/regulation-tables-seed-iso5667-1.test.ts \
    src/lib/eval/__tests__/field-configs-iso5667-1.test.ts \
    src/lib/eval/__tests__/equations-iso5667-1.test.ts \
    src/components/worksheet/__tests__/register-iso5667-1-results.test.tsx
 Test Files  4 passed (4)
      Tests  23 passed (23)          # was 22 — the new IF-body pin

$ npx tsx scripts/regulation-tables/verify-regulation-tables.ts iso5667_1 "<scratchpad>/iso5667-1.txt"
33/33 quotes verbatim

$ pnpm test            # vitest run --project unit
 Test Files  356 passed | 1 skipped (357)
      Tests  3131 passed | 1 expected fail | 1 skipped (3133)

$ pnpm -s typecheck
typecheck exit=0
```

One typecheck error was introduced and fixed inside this round: the new pin first used the regex
`dotAll` flag (`/…/s`), which this `tsconfig` target rejects (`TS1501`); it is now `[\s\S]`. The three
migration freshness pins are green and byte-identical, which is the mechanical confirmation that no
emitted SQL moved.

Sign-off sheet: still **39 blocks**, ids unchanged and still identical to the STAGED file's; the
section was regenerated in place (stripped and re-appended from the patched generator), not edited by
hand. STAGED file 909 → 915 lines (`wc -l`; the added *Reading* line, the two annotations and the
generator's own comment); still 100 % SQL comments, asserted by the generator before it writes.
