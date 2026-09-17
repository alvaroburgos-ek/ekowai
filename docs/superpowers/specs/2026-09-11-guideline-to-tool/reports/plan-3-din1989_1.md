# Plan 3 — DIN-1989-1 (`din1989_1`) — Task 2 report

- **Status:** DONE_WITH_CONCERNS (every concern is a sign-off block; nothing blocks Task 3)
- **Model / effort:** Claude Opus 5 (`claude-opus-5[1m]`), effort as dispatched · **CLI:** claude 2.1.260 (no update taken — user declines updates) · **Date:** 2026-09-17
- **Branch:** `feat/guideline-to-tool`, worktree `C:\Users\Ekowai\_wt-g2t`, base `9485df2`
- **Nothing applied to prod.** No `apply-migration`, `drizzle-kit`, `vercel`, or DB write. Prod was read ONLY by `node scripts/regulation-tables/build-prior-snapshot.mjs DIN-1989-1 din1989_1` (read-only tx) and `node scripts/verification/prod-query.mjs --sql "<SELECT …>"` (worksheet/section titles, the 4 equation rows, the 14 gate rows, `standards.version`, column lists). `.env.local` never printed; confirmed gitignored.
- **SR-1 source:** every seeded value and every cue was read in this session from `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\DIN-1989-1.md` (1127 lines); the inventory was used for line pointers only (all its pointers were correct).

## 1. Counts table

| slug | tables | rows lifted | rows unreadable | registers | select_one | select_many | lookup_fill | field visible_when | section visible_when | equations new | equations staged | sign-off entries | tokens in | minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `din1989_1` | 7 | 42 (42/42 verbatim) | 0 skipped; 4 tables kept `imported_unverified` for OCR/blank/truncated cells (TAB4_PERSON U-1, TAB4_FLAECHE U-2, TAB1 U-3, TAB2 U-4, TAB5 U-6 — fix round 1) + 1 label cell (U-5) | 5 (all `create`) | 2 (1 UPDATE `keep_prod`, 1 `create`) | 1 (`create`, 15 lifted options) | 1 (`create`, text) | 5 (2 UPDATE + 3 on created fields) | 1 (`DIN-1989-1-04 B`) | 9 | 2 (R-1 Gl. 1 rewrite, R-2 BW_a merge) + 3 gates (G-1…G-3) | 18 (+4 observations) | ≈ 0.45 M (tool-marker delta 15.00 M → 14.56 M at report time) | ≈ 45 |

Field entries: 21 = 18 `create` (abdeckung_klasse, speicher_behaelter, nennvolumen, speicher_einzelvolumen_sum, speicheroeffnung_min_erf, auffangflaechen, verbraucher, bewaesserungsflaechen, sum_a_e, bw_person, bw_flaeche, bw_a_total, tagesbedarf, verkuerzt_band_beachtet, kanalart, inbetriebnahme_pruefpunkte, wartungsplan, wartungsplan_rows) + 3 UPDATE (belastungsklasse visible_when + `keep_prod`, versickerung_bemessung_a138, whg_erlaubnis). Derived-output fields (`widget='derived'`): 9 — one per equation.

## 2. Raw test output

`pnpm test` (after all changes):
```
 Test Files  249 passed | 1 skipped (250)
      Tests  2420 passed | 1 expected fail | 1 skipped (2422)
   Start at  17:24:33
   Duration  38.12s (transform 9.25s, setup 41.97s, import 82.15s, tests 33.45s, environment 164.69s)
```
(+27 cases from this task: seed-din1989-1 9, field-configs-din1989-1 6, equations-din1989-1 9, register-din1989-1 3; the shared `regulation-tables-seed-index` / `generated-sql-freshness` pins now iterate the new slug too.)

`pnpm -s typecheck` → first run: 1 error (`equations-din1989-1.test.ts(13,32): TS2305 … no exported member 'EvalResult'` — my slip, the type is `EvalState`); fixed → exit 0. `pnpm -s eslint <10 touched .ts/.tsx files>` → exit 0, no output.

`pnpm vitest run --project integration tests/harness/din1989-1-verify.integration.test.ts` (embedded PG; run at baseline BEFORE any change and again after):
```
 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  17:24:27
   Duration  5.11s (transform 438ms, setup 0ms, import 3.64s, tests 1.29s, environment 0ms)
```
The harness seeds prod's 4 equations / 14 gates; the new rows are not in it by construction — it proves the 14 block gates still enforce both ways on this branch.

**TDD evidence.** Seed test written first → RED (`Failed to resolve import "../regulation-tables-seed-din1989_1"`); seed builder written → the LaTeX token `${ }` inside `String.raw` was a template interpolation (`Unexpected "}"` at L38) → my `String.replace` patch with `${'$'}{ }` expanded `$'` and duplicated the file to 1257 lines (the a138 incident, repeated) → file deleted and rewritten from the transcript lines with `${'$'}{ }` in place (266 lines); verifier 42/42; seed test 8/9 (the Euler-shadowing pin expected "keine Zahl", the evaluator reports a null cell as `Unbekanntes Symbol "e"` — still never 2,718; pin re-targeted) → 9/9. Field-config test + module: emitter accepted 21 + 1 on the first run; 6/6 green. Equations test + module: 9/9 green first run (every printed rule computed through the real `evaluateFormula` over rows prepared by the register contract). Render test 3/3 first run.

## 3. Transcript verification

`pnpm -s tsx scripts/regulation-tables/verify-regulation-tables.ts din1989_1 "C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\DIN-1989-1.md"` → **`42/42 quotes verbatim`**, exit 0. PASS list (table · rows):

- TAB3 (7): geneigtes_hartdach, flachdach_unbekiest, flachdach_bekiest, gruendach_intensiv, gruendach_extensiv, pflasterflaeche, asphaltbelag (L837–L843)
- TAB4_PERSON (3): toilette_haushalt, toilette_buero, toilette_schule (L881–L883)
- TAB4_WASCHMASCHINE (1): waschmaschine (L892)
- TAB4_FLAECHE (4): garten (L884), sportanlage (L886), gruenland_leicht, gruenland_schwer (one merged span L887–L890)
- TAB1 (6): 1 … 6 (L470–L478)
- TAB2 (4): oberirdisch|le3000, oberirdisch|gt3000, unterirdisch|dom_le450, unterirdisch|dom_gt450 (L493–L496)
- TAB5 (17): dachablaeufe … kennzeichnung (L1002–L1056)

Status per table: `md_verified` — TAB3, TAB4_WASCHMASCHINE, TAB5 (every row lifted, every cell legible). `imported_unverified` — TAB4_PERSON (U-1: "V" for "l" L882/L883), TAB4_FLAECHE (U-2: merged Grünland row + "V" L890), TAB1 (U-3: blank class-number cells L471/L473/L475), TAB2 (U-4: "I" for "l" L493/L494).

## 4. Prior capture / emit commands (re-executable)

```
node scripts/regulation-tables/build-prior-snapshot.mjs DIN-1989-1 din1989_1
  → wrote src\lib\eval\field-configs\din1989_1.prior.json: 60 field rows (0 orphan), 36 coded sections of 36;
    optional columns present: {"fields":{"widget":false,"ui_config":false,"lookup":false,"visible_when":false},"worksheet_sections":{"visible_when":false}}
pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts din1989_1
  → wrote seed + rollback for din1989_1 -> scripts/migrations/20260917100200_regulation_tables_seed_din1989_1.sql scripts/rollback-20260917100200-regulation-tables-seed-din1989-1.sql
pnpm -s tsx scripts/regulation-tables/emit-field-configs-sql.ts din1989_1 20260917100210
  → wrote 21 field entries + 1 section entries for din1989_1 -> scripts/migrations/20260917100210_field_configs_din1989_1.sql scripts/rollback-20260917100210-field-configs-din1989-1.sql
pnpm -s tsx scripts/regulation-tables/emit-equations-sql.ts din1989_1 20260917100220
  → wrote 9 equations for din1989_1 -> scripts/migrations/20260917100220_equations_din1989_1.sql scripts/rollback-20260917100220-equations-din1989-1.sql
```
All three migrations are byte-pinned against a fresh emit (`generated-sql-freshness.test.ts` auto-pins the seed via `SEED_BUILDERS`; `field-configs-din1989-1.test.ts` / `equations-din1989-1.test.ts` pin the other two against the committed `din1989_1.prior.json`). The seed migration carries 42 row upserts and 3 `verification_status` upgrades (`imported_unverified → md_verified` for TAB3/TAB4_WASCHMASCHINE/TAB5, never the reverse); its rollback deletes the seven tables (no earlier DIN-1989-1 seed to re-emit). The field-config rollback restores the three UPDATE rows to the captured NULLs and deletes only the 18 `Plan 3:` rows. Apply order (owner, after the schema migration): `20260917100200` → `20260917100210` → `20260917100220`; rollback in reverse. Every file touches `DIN-1989-1` rows only.

## 5. What was encoded

**Tables (7)** — `src/lib/eval/regulation-tables-seed-din1989_1.ts`, builder `din19891SeedTables()`, edition `'2002'` (prod `standards.version`; the title page prints no date — see §8):

| table | keys | values | policy (cue) | rows | status |
|---|---|---|---|---|---|
| TAB3 | auffangflaechen_art (= prod enum, 7) | e | anhaltswert (L830 "können … verwendet werden" — L844 footnote a) | 7 | md_verified (J-3 notes the "%" header) |
| TAB4_PERSON | verbraucher_typ | p_d [l/(Person·d)] | anhaltswert (L891 footnote a — L911) | 3 | imported_unverified (U-1) |
| TAB4_WASCHMASCHINE | zusatz | p_d_zusatz [l/(Person·d)] = 10 | locked (L892) | 1 | md_verified |
| TAB4_FLAECHE | bewaesserungs_typ | bs_a_min, bs_a_max [l/m²] (single values stored in both) | anhaltswert (L873 "kann" — L885) | 4 | imported_unverified (U-2; J-1 range) |
| TAB1 | belastungsklasse (= prod enum '1'…'6') | bezeichnung, verkehrslast_beispiele, abdeckung_din_en_124 (strings; class 6 null) | locked (L461 "müssen … entsprechen") | 6 | imported_unverified (U-3; J-4 no numeric column) |
| TAB2 | aufstellung × groesse_band | oeffnung_min_mm [mm], dom_aufweitung_min_mm [mm] | locked (L486 "dürfen … nicht unterschreiten") | 4 | imported_unverified (U-4) |
| TAB5 | anlagenteil (17 tokens) | inspektion_intervall, inspektion_umfang, wartung_intervall, wartung_umfang, hinweis (strings, nullable) | anhaltswert (L1067) | 17 | md_verified (J-2 representation) |

**Registers / selections / lookup_fill / visibility** — `src/lib/eval/field-configs/din1989_1.ts`:
- `speicher_behaelter` (-02 D, create json): label, werkstoff, `aufstellung` enum (oberirdisch|unterirdisch, discriminator), einzelvolumen_l, domhoehe_mm (row `visible_when aufstellung == 'unterirdisch'`), derived `groesse_band` (the Tab. 2 row head thresholds 3000 l / 450 mm, string badge), derived `oeffnung_min_mm = lookup('TAB2', aufstellung, groesse_band, 'oeffnung_min_mm')` (two-key), oeffnung_ist_mm, derived `oeffnung_ok` badge; footer D2/D3; note L420.
- `auffangflaechen` (-04 B, create json): the brief's six columns (art lookup_key TAB3 → e lookup_value; `e_override` anhaltswert; derived a_e); footer `sum_a_e` (D1) instead of the legacy `sum_column` (playbook D-2b-5: an equation row exists).
- `verbraucher` (-04 B): typ lookup_key TAB4_PERSON → p_d; n; waschmaschine boolean; derived `p_d_eff = p_d + if(waschmaschine, lookup('TAB4_WASCHMASCHINE', 'waschmaschine', 'p_d_zusatz'), 0)`; derived bw_row; override anhaltswert on p_d; footer bw_person.
- `bewaesserungsflaechen` (-04 B): typ lookup_key TAB4_FLAECHE → bs_a_min/bs_a_max; `bs_a` engineer pick (SR-2); derived `bs_in_range` badge (numeric `if(…,1,0)`, per the brief's note); derived bw_row; footer bw_flaeche.
- `wartungsplan` (-06 C): anlagenteil lookup_key TAB5 → inspektion/wartung lookup_values; erledigt_am date; bemerkung; footer wartungsplan_rows.
- `kanalart` (-05 C, create enum) select_one (mischwasser/regenwasser, labels L667); `abdeckung_klasse` (-02 D, create text) lookup_fill TAB1·abdeckung_din_en_124 keyed on `belastungsklasse`; `inbetriebnahme_pruefpunkte` (-05 D, create json) select_many over the 15 Anhang B rows (L1094–L1108); `verkuerzt_band_beachtet` (-04 E, create boolean) attestation with the L802/L808 bands as label.
- Field `visible_when`: `belastungsklasse` + `abdeckung_klasse` ← `speicher_aufstellung == 'unterirdisch'` (L461); `versickerung_bemessung_a138`, `whg_erlaubnis` ← `ueberlauf_versickerung == true` (L653/L659/L661); `verkuerzt_band_beachtet` ← `bemessungsverfahren == 'verkuerzt'`. Section `visible_when`: `DIN-1989-1-04 B` ← `bemessungsverfahren != 'verkuerzt'` (L796) — hides the eight Gl. 1–4 inputs and the three registers (all consumer-free in the capture). Refused by the guard and STAGED: `sicherungseinrichtung_typ` (consumed by -05, C-1).

**Equations (9 new)** — `src/lib/eval/equations/din1989_1.ts`: `-04-D1 sum_a_e = sum_rows(auffangflaechen, a_a * e)` · `-04-D2 bw_person = sum_rows(verbraucher, p_d_eff * n * 365)` · `-04-D3 bw_flaeche = sum_rows(bewaesserungsflaechen, a_bew * bs_a)` · `-04-D4 bw_a_total = bw_person + bw_flaeche` · `-04-D5 tagesbedarf = bw_a_total / 365` · `-02-D1 nennvolumen = mindestwasservolumen + V_n` · `-02-D2 speicher_einzelvolumen_sum = sum_rows(speicher_behaelter, einzelvolumen_l)` · `-02-D3 speicheroeffnung_min_erf = max_rows(speicher_behaelter, oeffnung_min_mm)` · `-06-D1 wartungsplan_rows = count_rows(wartungsplan)`. None outputs E_R / BW_a / V_n (single-source: prod Gl. 1–4 keep their producers; the rewrites are R-1/R-2). Pinned values (unit test through `evaluateFormula` + `prepareRegisterRows` on the TS fallback tables): 100·0,8 + 50·0,6 + 40·0,3 = 122; (24+10)·4·365 + 12·10·365 + 6·200·365 = 531 440; 100·60 + 500·150 + 200·160 = 113 000; 55 640 / 365; 300 + 4000 = 4300; Σ 11 000 l; max(600, 200, 200) = 600; count 2.

## 6. Inventory §5 top-wins walk

1. Auffangflächen as repeatable rows (type → e from Tab. 3, Σ A·e feeding Gl. 1) → **encoded** (`auffangflaechen`, TAB3, `sum_a_e`); the Gl. 1 switch is STAGED (R-1); sharing the rows with A138-07 is X-1.
2. Verbraucher rows (Tab. 4 → P_d/BS_a filled, +10 l Waschmaschine) summed into one BW_a → **encoded** as `bw_person` / `bw_flaeche` / `bw_a_total`; the replacement of the two same-output BW_a rows is STAGED (R-2).
3. Derive V_n / Nennvolumen / Hybrid limit chain; hide the calc under verkürzt and show the bands → **encoded**: `nennvolumen` (-02-D1), `tagesbedarf` (-04-D5), section B of -04 hidden under `verkuerzt`, attestation with the 25–50 l/m² / 800–1000 l bands; the Hybrid gate is STAGED (G-2 + C-2); V_n itself stays Gl. 4 (prod).
4. Tab. 2 minimum opening per tank + Tab. 1 cover class; fix CR-04 (200 vs 600) → **encoded** (per-row `oeffnung_min_mm`, `speicheroeffnung_min_erf`, `abdeckung_klasse` lookup_fill); the CR-04 re-point is STAGED (G-3).
5. Rückstau logic (Kanalart × Aufstellung → allowed set) → **partially**: `kanalart` created; the CR-12 guard (Mischwasser ⇒ no Rückstauverschluss) is STAGED (G-1).

## 7. Files changed

Modified: `src/lib/eval/regulation-tables-seed-index.ts` (`din1989_1` line), `src/lib/eval/field-configs/index.ts`, `src/lib/eval/equations/index.ts` (din1989_1 lines), `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` (+18 blocks, +4 observations), `docs/superpowers/guideline-to-tool-playbook.md` ("Quote-lifting traps" paragraph).
Created: `src/lib/eval/regulation-tables-seed-din1989_1.ts`, `src/lib/eval/field-configs/din1989_1.ts`, `src/lib/eval/field-configs/din1989_1.prior.json` (captured), `src/lib/eval/equations/din1989_1.ts`, `src/lib/eval/__tests__/regulation-tables-seed-din1989-1.test.ts`, `src/lib/eval/__tests__/field-configs-din1989-1.test.ts`, `src/lib/eval/__tests__/equations-din1989-1.test.ts`, `src/components/worksheet/__tests__/register-din1989-1.test.tsx`, `scripts/verification/din1989_1-STAGED-plan3-rulings.sql`, `scripts/migrations/20260917100200_regulation_tables_seed_din1989_1.sql` + `scripts/rollback-20260917100200-regulation-tables-seed-din1989-1.sql`, `scripts/migrations/20260917100210_field_configs_din1989_1.sql` + `scripts/rollback-20260917100210-field-configs-din1989-1.sql`, `scripts/migrations/20260917100220_equations_din1989_1.sql` + `scripts/rollback-20260917100220-equations-din1989-1.sql`, this report (+ the copy at `.superpowers/sdd/…/task-2-report.md`).
Untouched: every a138 file; the Plan-1/2 migrations.

## 8. Discrepancies vs the brief (codebase / transcript / reality won)

1. **Edition string:** the brief says "from the title page" — the transcript's title page (L1–L14) prints no date; `'2002'` from prod `standards.version` "2002 (DIN 1989-1)" (read in-session). The harness header's "2002-04" is another session's scan read (R-2) — observation on the sheet.
2. **TAB1 `pruefkraft_kn` (number)** not seeded: the printed column has no unit/sub-header (L469) and prints two vehicles per class; kept as the string `verkehrslast_beispiele` + `bezeichnung` (J-4).
3. **`lookup_fill` count 1, not 2:** a scalar `speicheroeffnung_dn_min` needs a band key symbol that does not exist and prod `speicher_aufstellung` has `keller` (no Tab. 2 row) — replaced by the per-row derived column + `speicheroeffnung_min_erf` (I-1, G-3).
4. **`sum_column` dropped** on `auffangflaechen` in favour of `footer: ['sum_a_e']` (playbook D-2b-5: a display-only client sum next to an equation row would be a second producer).
5. **Speicher register `aufstellung` options** are the two printed Tab. 2 kinds (oberirdisch|unterirdisch), labels from L493/L495, not prod's three-value `speicher_aufstellung` (the register column is new; the scalar field is untouched).
6. **Section rule instead of six field rules** for the verkürzt case (`DIN-1989-1-04 B`, amendment C): brief estimated "field 6 / section 0"; built field 5 / section 1. `sicherungseinrichtung_typ` refused (C-1) as amendment B foresaw.
7. **Equations 9 new** (brief: 6 + 1 staged): D3 `speicheroeffnung_min_erf` (needed by G-3), D2 `speicher_einzelvolumen_sum` and D1 `nennvolumen` on -02 as the brief listed under "Derived", plus the brief's five -04 rows and -06-D1. The staged replacements are two (R-1, R-2), not one.
8. **TAB5:** 17 rows with FIVE value columns (the printed Durchführung text lifted into `*_umfang`, footnotes into `hinweis`), Hebeanlage in one cell (J-2) — `md_verified` (all cells legible); the brief left it open.
9. **TAB2 / TAB1 / TAB4_* stay `imported_unverified`** (U-1…U-4) although 42/42 quotes verify — OCR/blank cells per the doctrine's unreadable-cell rule and the a138 precedent (U-5/U-6).
10. **Sign-off ids:** the brief's names kept where given (R-1/R-2 = equation rewrites, J-1/J-2, G-1…G-3, U-1, X-1); `din1989_1-E-1` (TAB3 token mismatch) did not occur (7 prod tokens = 7 printed rows, same order); extra items use skeleton letters (U-2…U-5, J-3/J-4, C-1/C-2, I-1).
11. **Anhang B** 15 rows used for the select_many (the brief's choice); §17.2's 13 Probelauf bullets are the widget note.

## 9. Self-review

- Every `verbatim_quote` passes the verifier (42/42); every cue in `field-configs/din1989_1.ts`, `equations/din1989_1.ts`, the STAGED file and the 18 sign-off blocks was read from the transcript in this session at the cited line; prod facts (equation ids, gate texts, enum tokens, section codes) come from the in-session capture/queries quoted in §4 and the STAGED header.
- Incident: the `String.replace` `$'` trap duplicated the seed file (1257 lines) — deleted and rewritten from the transcript lines (266 lines); verified by the verifier, 9 seed tests, typecheck, eslint. Playbook now names the trap and the `${'$'}{ }` escape.
- The emitter guards accepted the module first time because the section rule and the two visibility UPDATEs were chosen from the capture's `consumer_worksheets` BEFORE emitting (the test pins that every field of `-04 B` is consumer-free and that `sicherungseinrichtung_typ` is consumed).
- G-A3 key-string equality pinned: TAB3 keys = prod `auffangflaechen_art` tokens in prod order; TAB1 keys = prod `belastungsklasse` tokens; TAB2 first key ⊆ prod `speicher_aufstellung` and = the register column options; register lookup pairs bind the seeded tables; the select_many options = the 15 lifted rows.
- Row-scope `e` shadows the Euler fallback (pinned); boolean drivers use `== true` like the prod gates; `lookup()` with two keys resolves positionally (pinned through `makeTableLookup`).
- `git checkout -- scripts/reasoning-map/` run before staging (no churn present); `.env.local` confirmed gitignored; one commit; author `alvaro.burgos@ekowai.com` verified before committing.
- Reviewed the unified diff of every modified file; the only non-DIN-1989-1 changes are the three registry lines, the sign-off section and the playbook paragraph.

## 10. Concerns (for the controller)

1. **Two same-output `BW_a` rows in prod (R-2)** are the standard's biggest correctness gap — today Gl. 4 reads whichever `BW_a` wins the first-in-list rule; `bw_a_total` is visible but nothing downstream reads it until R-2 is ratified.
2. **Edition token `'2002'`** is a unique-key component of the seeded tables; if the owner confirms "2002-04" on the PDF cover the seed must be re-emitted BEFORE the migration is applied (a later change would orphan the rows).
3. **`keller` tanks** have no Tab. 2 row; the register's own `aufstellung` column offers only the two printed kinds — the owner may want a mapping rule (I-1).
4. **Four tables `imported_unverified`** for OCR reasons — a 5-minute PDF look flips them (U-1…U-4).
5. **Bundle growth:** TAB5's lifted Durchführung text (~6 KB) rides in the client bundle via the seed fallback (Task-0 observation; Task 30 measures).
6. **Token/time:** ≈ 0.45 M tokens in, ≈ 45 min wall-clock — below Task 1's 0.55 M / 75 min (the worked example and the emitter guards paid off; the seed-file incident cost ≈ 5 min).

## 11. Residue (what the guideline demands that the worksheets still do not ask)

Pumpen as rows (§8, DIN 1988-5 sizing, Reservepumpe); Filter position above/below Rückstauebene → Hebeanlage sizing on r_5,100 (L671, a DIN 1986-100 reference); Vorlagebehälter mit freiem Auslauf for öffentliche Einrichtungen (L567); Vorreinigung when a separate-discharge filter feeds an underground infiltration system (L657); Kleintiersperre for Mulden (L655); Gründach ≈ 50 % Abfluss note (L366); the differenziertes Verfahren's 5–10-year simulation (L934); `nachspeisung_volumenstrom ≥ Spitzendurchfluss DIN 1988-3` (L561, external). Each is a bare reference or a text rule without printed values and stays outside this encoding (content-boundary rule).

---

# Fix round 1 (review verdict on `f6c3e5d`: APPROVED with one Important item)

- **Commit:** see the reply (one commit, Fable trailer; `git checkout -- scripts/reasoning-map/` before staging; tree clean after).
- **Nothing applied to prod.** The three migrations were regenerated by the Task 0 emitters only.

## REQUIRED

1. **TAB5 `imported_unverified` + `din1989_1-U-6`** (`regulation-tables-seed-din1989_1.ts`): the Systemsteuerung Wartung cell is printed truncated — L1030 "- Nachspeisung (Magnetventil" is followed directly by L1031 "\end{tabular} & 1 Jahr \\", so the closing parenthesis and any further Probelauf items are not in the source. Cell stored as printed; table status set to `imported_unverified` (the seed migration now carries 2 status upgrades instead of 3 — TAB3 and TAB4_WASCHMASCHINE); sign-off block U-6 added (line, printed text, what is missing, the PDF-read repair). Seed test re-pinned (`wartung_umfang` ends in "(Magnetventil"; status `imported_unverified`). Seed migration + rollback re-emitted; freshness pin green; verifier still 42/42.

## MINOR

2. **Edition `'2002'` → numbered block `din1989_1-I-2`** (UNIQUE-key component; title page L1–L14 prints no date; the read-only query `select code, title_de, version, issued_year, valid_from from standards where code='DIN-1989-1'` → `version = '2002 (DIN 1989-1)'`, `issued_year`/`valid_from` null is quoted; owner confirms before apply; the post-apply repair UPDATE is named). The observation line now points at the block.
3. **CR-10 under `verkuerzt`:** one line under the section-rule observation — prod CR-10 (`V_n IS NOT NULL AND E_R IS NOT NULL AND BW_a IS NOT NULL`) stays satisfiable only by hand-typing E_R/BW_a on the manual path while section B is hidden; a guard would be a gate change and is not proposed.
4. **`speicher_behaelter.domhoehe_mm` stays optional:** Tab. 2 keys its buried-tank rows by Domhöhe (L495 "unterirdischen Speicher bis Domhöhe ≤ 450 mm", L496 "ab Domhöhe > 450 mm …") but no sentence makes the value a mandatory input — quoted in the column comment; per-row hint added as the input `placeholder` "für Tab.-2-Zeile nötig" and the register `note` now says that without Domhöhe the tank's Tab.-2 row and the D3 maximum stay empty.
5. **L420 quote** restored with its leading "- " (`field-configs/din1989_1.ts`, `equations/din1989_1.ts` D2, the register note); the `speicher_behaelter` four-fragment `verification_quote` is joined with " — " (L459 — L420 — L486 — L490). Field-config + equations migrations re-emitted (verification_quote text only).
6. **"60 ta" note** under U-3 (and the seed comment on L477): printed "Schwerlastfahrzeug 60 ta" read as "60 t" + footnote mark "a" (L479) — an interpretation inside the string `verkehrslast_beispiele`.

## Raw output

```
pnpm -s tsx scripts/regulation-tables/verify-regulation-tables.ts din1989_1 "C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\DIN-1989-1.md"
 42/42 quotes verbatim in C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\DIN-1989-1.md
pnpm vitest run --project unit <seed-din1989-1, field-configs-din1989-1, equations-din1989-1, register-din1989-1, generated-sql-freshness>
 Test Files  5 passed (5) · Tests  32 passed (32)
pnpm test
 Test Files  249 passed | 1 skipped (250)
      Tests  2420 passed | 1 expected fail | 1 skipped (2422)
 Start at  17:38:58 · Duration  42.94s
pnpm -s typecheck → exit 0 · pnpm -s eslint <4 touched .ts files> → exit 0
```
Re-emit check: seed (`-1 status upgrade line`), field configs (2 quote lines), equations (1 quote line) changed; rollbacks byte-identical. TDD note: the re-pinned seed test first failed on an unescaped `(` in the regex (`/(Magnetventil$/` → `/\(Magnetventil$/`), then 9/9. Sign-off blocks for DIN-1989-1: 20 (+U-6, +I-2) plus the two notes.
