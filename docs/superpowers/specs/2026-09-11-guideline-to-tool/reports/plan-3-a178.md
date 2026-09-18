# Plan 3 — DWA-A-178 (`a178`) — Task 14 report

- **Status:** DONE_WITH_CONCERNS (every concern is a sign-off block; nothing blocks Task 15)
- **Model provenance:** per the commit trailer (`Co-Authored-By: Claude Fable 5.1`, controller ruling); the subagent session ran on Opus 5 (`claude-opus-5[1m]`), effort as dispatched · **CLI:** claude 2.1.260 (no update taken — user declines updates) · **Date:** 2026-09-18
- **Branch:** `feat/guideline-to-tool`, worktree `C:\Users\Ekowai\_wt-g2t`, base `9b52f99`
- **Nothing applied to prod.** No `apply-migration`, `drizzle-kit`, `vercel`, or DB write. Prod was read ONLY by `node scripts/regulation-tables/build-prior-snapshot.mjs DWA-A-178 a178` (read-only tx) and `node scripts/verification/prod-query.mjs --sql "<SELECT …>"` (the `standards` row incl. `version`, the 19 worksheet titles + field counts, the section codes / titles / field counts of eight worksheets, the 13 equation rows with ids / formulas / md5 / status, the 28 compliance rows with ids / severities / md5(condition) / conditions, the labels / units / `is_required` / `validation_rules` of 49 fields, the `information_schema` column lists of `equations` / `compliance_requirements` / `fields`). `.env.local` never printed.
- **SR-1 source:** every seeded value and every cue was read in this session from `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-178\DWA-A_178.md` (1379 lines; read at L1–L60 title/imprint, L286–L380 definitions + symbols, L439–L475 §5.2, L500–L680 §6.1, L680–L980 §6.2, L980–L1140 §6.2.2.4–§8.3). The 76 quote spans were lifted mechanically by line number (a throwaway generator in the scratchpad, `JSON.stringify` per span) and every seeded cell is asserted inside its span at build time (`inSpan`); the 58 quoted fragments on the sign-off sheet and the 35 in the STAGED file were machine-checked against their cited lines (58/58, 35/35). The inventory was used for pointers only — its cue "kann b_R,a = 530 angesetzt werden" is refuted by L716 (a178-O-2, R-5 reversal). The `.pdf` was not opened; no worked numeric example is printed (Anhang A is a flowchart).

## 1. Counts table

| slug | tables | rows lifted | rows unreadable | registers | select_one | select_many | lookup_fill | field visible_when | section visible_when | equations new | equations staged | sign-off entries | tokens in | minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `a178` | 7 | 51 (51/51 verbatim) | 0 rows skipped; the Tab.-1 η_VS cell prints `$0^{11}$` (OCR footnote marker, value 0 encoded — U-1) and both captions print "GI. (5) bis GL. (7)" (U-2) → TABELLE1 `imported_unverified`; 6 tables `md_verified` | 4 (all `create`: `teilflaechen_178` -04, `frachtpfade` -13, `iterationen` / `betriebsbefunde` -18) | 1 (`create`: `vorstufe_typ` -13) + 3 attestations (`create`: `spezifische_ziele_formuliert`, `leichtfluessigkeitsfang_vorgesehen` -02, `fremdwasser_massnahmen_geprueft` -05) | 0 | 2 (`create`: `h_FK_min_tab` -02 ← S6_1_4_5 by `system_type`, `eta_VS_tab1` -13 ← TABELLE1_VS by `vorstufe_typ`) | 8 (3 UPDATE on consumer-free existing inputs `v_spez_grobstoff` / `V_RRL` / `t_RR_E_n1` + 5 on created fields) | 0 (every Nachweis section holds a consumed producer, drivers not inherited — C-4) | 17 (-04 D1…D3, -07 D1…D3, -10 D1, -11 D1, -13 D1…D4, -18 D1…D5) | 4 replacements (R-1 Gl. 2/3, R-2 Gl. 5/6/7, R-3 η_F circularity, R-4 Gl. 11) + 2 re-binds (E-1 / E-2) + 7 gate blocks (G-1 … G-7) + 11 D-pairs | 55 (+3 observations) | ≈ 0.62 M (tool-marker delta 15.00 M → 14.38 M at report time) | ≈ 60 |

Field entries: 32 = 29 `create` + 3 UPDATE. Migration `20260917101410`: 29 `INSERT … WHERE NOT EXISTS`, 3 `UPDATE fields`, 0 `UPDATE worksheet_sections`; the rollback restores the 3 UPDATE rows to the captured NULLs and deletes only the 29 `Plan 3:` rows. Derived-output fields (`widget='derived'`): 17 — one per equation. No `enum_values` is written by any UPDATE (D-1; the only select is a `create`). The emitter printed no lint warning (quoted literals `'misch'` / `'trenn'` / `'strasse'` / `'zone_none'` / `'durchlauf'` / `'dr_rbf'` / `'fue'` / `'dr_rrl'` collide with no column key or worksheet symbol — pinned) and 11 `NOTICE: prod data oddity — self-consumer ignored` lines (X-5).

## 2. Raw test output

`pnpm test` (after all changes):
```
 Test Files  302 passed | 1 skipped (303)
      Tests  2803 passed | 1 expected fail | 1 skipped (2805)
   Start at  10:12:17
   Duration  51.37s (transform 15.86s, setup 52.85s, import 122.05s, tests 51.82s, environment 210.03s)
```
(2773 at `9b52f99` + 30 from this task: seed-a178 9, field-configs-a178 8, equations-a178 10, register-a178-teilflaechen 3; the shared `regulation-tables-seed-index` / `generated-sql-freshness` / `emit-seed-sql` pins iterate the new slug.)

`pnpm -s typecheck` → exit 0 (`TYPECHECK exit=0`; one RED before the equations module existed — `equations/index.ts` "Cannot find module './a178'" — expected ordering). `pnpm -s eslint <10 touched .ts/.tsx files>` → exit 0, no output.

Integration harness (embedded PG; no engine change on this task):
```
pnpm vitest run --project integration tests/harness/a178-verify.integration.test.ts
 Test Files  1 passed (1)
      Tests  27 passed (27)
   Start at  10:13:29
   Duration  5.93s (transform 731ms, setup 0ms, import 4.07s, tests 1.69s, environment 0ms)
```
The harness seeds prod's fields / equations / gates (`tests/harness/seed-a178.ts`); the new rows are not in it by construction — it proves the branch still drives every DWA-A-178 chain and gate the harness covers. **The A-178 workflow metric stays "14 of 19 UNPROVEN"** per the repo doctrine — this task adds DATA rows written-not-applied and claims no execution proof beyond the unit pins below.

**TDD evidence.** Runtime facts were established BEFORE the pins with two scratch scripts through the real `prepareRegisterRows` / `evaluateFormula` on ad-hoc tables (`scripts/_probe_a178.ts`, `_probe2_a178.ts`, deleted): a row-scope `if(system_type == 'misch', …)` reads the inherited enum, hides the `e_0_i` column and computes Gl. 2 vs Gl. 3 per row; a MISSING `system_type` leaves `b_row` null → the Σ is `manual_required` ("Unbekanntes Symbol b_row"); a ZERO-input equation `x = lookup('S6_LIMITS', 'b_krit', 'wert')` computes (7); `V_RR + lookup(…)/100 * V_FK` → 1060; the paths register's nested `if(pfad == …, lookup('TABELLE1', 'f', …), …)` fills 0,95 / 0,50 / 0,60; `if(rrl_vorhanden == true, 1, 0)` / `becken_typ == 'durchlauf'` on worksheet-scope boolean / enum compute in row scope, a missing driver makes the badge null and `count_rows(reg, zulaessig == 0)` `manual_required` naming the column; `count_rows` over an empty register is 0, `sum_rows(last_rows(reg, 1), a_f)` on an empty register `manual_required`; a two-key `lookup_key` cannot refill (`refillLookupValues` passes ONE positional key) → TABELLE2 is single-key (`befund`) with `group_label` for the optgroup. Seed builder: all 7 tables built first run with every cell `inSpan`; seed test 9/9 first run; verifier **51/51** on its first run. Field-config test: 8/8 first run (the refusals — `e_0` consumed, `VQ_FU → Gl.6 b_F`, `eta_RRL → Gl.7 b_F`, `B_RRL → Gl.11 B_RBFA_ab`, `n_RBF read by gate REQ-22` — were asserted, not discovered; the emitter accepted all 32 entries and 17 equations first time). Equations test: 10/10 first run (pins from the probes; the Gl. 5 / 6 / 7 parity 4,75 / 5,25 / 5,55 kg/(m²·a) and the mass balance 5550 + 950 = 6500 kg/a). Render test: one RED — the badge test-id is `derived-badge-<key>` (rendered under the row), not `derived-<key>` → 3/3.

## 3. Transcript verification

`pnpm -s tsx scripts/regulation-tables/verify-regulation-tables.ts a178 "C:\Users\Ekowai\Desktop\Guidelines\DWA-A-178\DWA-A_178.md"` → **`51/51 quotes verbatim`**, exit 0. PASS list (table · rows · lines):

- TABELLE1 (4): vs / f / rr / rrl — the five-line span L869–L873 (header, body row, Anmerkung, footnote) as every row's quote
- TABELLE1_VS (4): rkb_le10 / rueb_db / stauraum_unten / sonstige — L869–L873
- S6_1_4_5 (3): misch L590 · trenn L591 · strasse L591
- S6_LIMITS (17): b_krit L689 · b_f_min L884 · v_spez_min L677 · e_0_max L671 · n_entlastungen_min L673 · t_rr_e_n1_max L979 · n_rbf_min L979 · h_rr_min / h_rr_max L575 · q_dr_rbf_max L639 · kdb_min_mm L635 · u_max / feinanteil_max / ueberkorn_max L606 · caco3_min L608 · deckschicht_cm L583 · langzeitsimulation_min_a L792
- S6_2_RECHENWERTE (4): b_r_a L716 · porenvolumen_pct L775 · a_f_strasse_m2_ha L782 · h_rr_min_strasse L783
- S6_2_ANHALT (4): q_dr_rbf_vorbemessung L767 · pflanzdichte_min / max L619 · feststoffeintrag_ueblich_max L461
- TABELLE2 (15): L1085–L1094 (Schilf, Bodenfilteroberfläche), L1104–L1108 (Ablaufbauwerk)

Status per table: `md_verified` — TABELLE1_VS, S6_1_4_5, S6_LIMITS, S6_2_RECHENWERTE, S6_2_ANHALT, TABELLE2 (every printed row lifted, every cell legible). `imported_unverified` — TABELLE1 (U-1: `$0^{11}$`; U-2: "GI." / "GL." in the captions).

## 4. Prior capture / emit commands (re-executable)

```
node scripts/regulation-tables/build-prior-snapshot.mjs DWA-A-178 a178
  → wrote src\lib\eval\field-configs\a178.prior.json: 118 field rows (55 orphan), 190 coded sections of 190, 13 equations, 28 gates (8 unparseable — symbols: [] + parse_error; the emitter refuses conservatively on those worksheets);
    optional columns present: {"fields":{"widget":false,"ui_config":false,"lookup":false,"visible_when":false},"worksheet_sections":{"visible_when":false}}
pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts a178
  → wrote seed + rollback for a178 -> scripts/migrations/20260917101400_regulation_tables_seed_a178.sql scripts/rollback-20260917101400-regulation-tables-seed-a178.sql
pnpm -s tsx scripts/regulation-tables/emit-field-configs-sql.ts a178 20260917101410
  → NOTICE: prod data oddity — self-consumer ignored: A178-12 VQ_RBFA_zu, A178-13 eta_RR, eta_RRL, eta_VS, VQ_Dr_RBF, VQ_Dr_RRL, VQ_FU, A178-14 B_Dr_RBF, B_FU, B_RRL, B_VS
  → wrote 32 field entries + 0 section entries for a178 -> scripts/migrations/20260917101410_field_configs_a178.sql scripts/rollback-20260917101410-field-configs-a178.sql
pnpm -s tsx scripts/regulation-tables/emit-equations-sql.ts a178 20260917101420
  → wrote 17 equations for a178 -> scripts/migrations/20260917101420_equations_a178.sql scripts/rollback-20260917101420-equations-a178.sql
```
(The 8 "unparseable" gates are all EMPTY conditions — `manual` at runtime, never a refusal per the round-2 ruling; no prose gate exists on A-178.) All three migrations are byte-pinned against a fresh emit (`generated-sql-freshness.test.ts` auto-pins the seed via `SEED_BUILDERS`; `field-configs-a178.test.ts` / `equations-a178.test.ts` pin the other two against the committed `a178.prior.json`). The seed migration carries 51 row upserts (`ON CONFLICT (table_id, row_key)`) and 6 `verification_status` upgrades (`imported_unverified → md_verified`, never the reverse); its rollback deletes the seven tables (no earlier DWA-A-178 table seed exists — nothing superseded). The equations rollback deletes the 17 `Plan 3:` rows. Apply order (owner, after the schema migration incl. plan1-D-3-1): `20260917101400` → `20260917101410` → `20260917101420`; rollback in reverse. Every file touches `DWA-A-178` rows only. Scalar-only rows (`b_krit_tab`, `q_Dr_RBF_vorgabe`, `v_spez_grobstoff_min`, `A_F_strasse`, `V_RBF_calc`, `b_F_calc`, `C_RBF_zu_calc`) are not server-materialised (amendment D — expected, noted once here and as I-2); the ten register-fed rows materialise on save.

## 5. What was encoded

**Tables (7)** — `src/lib/eval/regulation-tables-seed-a178.ts`, builder `a178SeedTables()`, edition `'2019-06'` (title page L7 / L17 "Juni 2019", imprint L42 "korrigierte Fassung Oktober 2019" = prod `standards.version` 'Juni 2019 (korrigierte Fassung Oktober 2019)' — I-1). The Arbeitsblatt prints ONE value table (Tab. 1), ONE text table (Tab. 2) and every other figure as a sentence — the DWA-M-187 "text-limit" pattern (one sentence per row, `wert / unit / comparator / modal / text`), split by the ONE policy a table carries:

| table | keys | values | policy (cue) | rows | status |
|---|---|---|---|---|---|
| TABELLE1 | `komponente` vs / f / rr / rrl (transposed body row L870) | `eta_afs63` 0 / 0,95 / 0,50 / 0,60, `eta_alt` (0,2 on vs), `bedingung` (the footnote on vs) | locked (L867 caption "Rechenwerte … zur Anwendung in GI. (5) bis GL. (7)" — O-1) | 4 | imported_unverified (U-1 / U-2) |
| TABELLE1_VS | `vorstufe_typ` = the created select's tokens | `eta_vs` 0,2 / 0,2 / 0 / 0 with `values: ['0', '0.2']` | kann (L873 footnote — spec §7 row 3; O-4) | 4 | md_verified |
| S6_1_4_5 | `system_type` = prod tokens | `h_fk_min_m` 0,75 / 0,50 / 0,50 | locked (L589 "beträgt", "≥") | 3 | md_verified |
| S6_LIMITS | `parameter` | 17 printed "muss / festgesetzt / festgelegt / ≥ ≤" figures | locked (L689) | 17 | md_verified |
| S6_2_RECHENWERTE | `parameter` | b_R,a 530 · Porenvolumen 15 % · A_F Straße 100 m²/ha · h_RR Straße 0,5 m | locked (L716 "wird … angesetzt" — O-2) | 4 | md_verified |
| S6_2_ANHALT | `parameter` | q_Dr,RBF 0,05 (Vorbemessung) · Pflanzdichte 4 / 8 · Frachtaufkommen 1.000 | anhaltswert (L767 "kann … angesetzt werden" — O-3) | 4 | md_verified |
| TABELLE2 | `befund` (this task's tokens, J-3; `group_label` = Bereich) | `bereich`, `befund_text`, `hinweis` — the 15 printed indicator rows | anhaltswert (L1078) | 15 | md_verified |

**Registers / selections / lookup_fill / visibility** — `src/lib/eval/field-configs/a178.ts`:
- `teilflaechen_178` (A178-04 C, create json): `label`, `a_e_b_a_i` ha (required), `b_r_a_i` kg/(ha·a) (required, placeholder "Rechenwert 530"), derived `b_r_a_rechenwert` (S6_2_RECHENWERTE), badge `abw_rechenwert`, `e_0_i` % (required, `visible_when system_type == 'misch'` — row scope, the driver IS inherited on -04), derived `b_row = if(system_type == 'misch', A·b·e_0/100, A·b)` (Gl. 3 / Gl. 2); footer `A_E_b_a_calc`, `B_RBF_zu_calc`, `teilflaechen_count`; note L716 + L739.
- `frachtpfade` (A178-13 C, create json): `pfad` enum dr_rbf / fue / dr_rrl (labels from L799 / L801 / L802), `vq_m3` m³/a (required), derived `eta_tab1` (Tab. 1 by path, locked), badge `zulaessig` (FÜ only for Durchlauf, RRL drain only with `rrl_vorhanden` — from the inherited -07 drivers), derived `b_ab = VQ · C_RBFA_zu · (1 − eta_VS) · (1 − η) / 1000`; footer `b_F_calc`, `B_RBF_ab_calc`, `frachtpfade_unzulaessig`; no `override` block (O-1 / J-4).
- `iterationen` (A178-18 C): `schritt`, `a_f` (required), `h_rr`, `v_rbf`, `b_f` (required), `konvergiert` boolean; footer `iteration_count_calc`, `A_F_last`, `b_F_last`, `iterationen_konvergiert`; note L983 + the entry-order rule.
- `betriebsbefunde` (A178-18 C): `datum`, `befund` lookup_key TABELLE2 (`group_by: group_label`), `bereich` / `hinweis` lookup_value, `bemerkung`; footer `befunde_count`.
- Selects / attestations (create): `vorstufe_typ` (A178-13 B, 4 options — J-1); `spezifische_ziele_formuliert` (A178-02 B, `visible_when system_type == 'strasse'`, L781 / L794); `leichtfluessigkeitsfang_vorgesehen` (A178-02 B, `system_type == 'strasse' AND wasserschutzgebiet != 'zone_none'`, L683 — `wasserschutzgebiet` IS inherited on -02); `fremdwasser_massnahmen_geprueft` (A178-05 B, `fremdwasser_relevant == true`, L451).
- lookup_fill (both created): `h_FK_min_tab` (A178-02 B, role limit) ← S6_1_4_5 by `system_type` — beside its key, works today; `eta_VS_tab1` (A178-13 B, role value) ← TABELLE1_VS by `vorstufe_typ`. The existing `h_FK_required` / `eta_VS` keep their inputs (E-1 / E-2).
- Created inputs: `V_RR`, `V_FK` (A178-11 C, m³) for the Schritt-4 volume.
- Field `visible_when` on existing fields (3, all consumer-free, no same-worksheet gate reads them): A178-07 `v_spez_grobstoff` ← `system_type IN {'trenn', 'strasse'}` (L677 / L683); A178-11 `V_RRL` ← `rrl_vorhanden == true` (L777 / L663); A178-17 `t_RR_E_n1` ← `system_type == 'misch'` (L806 / L979). All three are `pending` (visible, inert) until C-1 — their drivers are not inherited on those worksheets (pinned). Refused / withheld: `e_0` (consumed by -09, C-2), `VQ_FU` / `eta_RR` / `VQ_Dr_RRL` / `eta_RRL` / `B_RRL` (transitive producers through Gl. 6 / 7 / 11, C-3), `n_RBF` (gate REQ-22, G-1). Section rules: none (C-4).

**Equations (17 new)** — `src/lib/eval/equations/a178.ts`: `A178-04-D1 A_E_b_a_calc = sum_rows(teilflaechen_178, a_e_b_a_i)` · `-D2 B_RBF_zu_calc = sum_rows(teilflaechen_178, b_row)` (Gl. 2 / 3 switched per row) · `-D3 teilflaechen_count` · `A178-07-D1 b_krit_tab = lookup('S6_LIMITS', 'b_krit', 'wert')` · `-D2 q_Dr_RBF_vorgabe` · `-D3 v_spez_grobstoff_min` · `A178-10-D1 A_F_strasse = lookup(…'a_f_strasse_m2_ha'…) * A_E_b_a` · `A178-11-D1 V_RBF_calc = V_RR + lookup(…'porenvolumen_pct'…) / 100 * V_FK` · `A178-13-D1 b_F_calc = sum_rows(frachtpfade, vq_m3 * eta_tab1) * C_RBFA_zu * (1 - eta_VS) / (A_F * 1000)` (Gl. 5 / 6 / 7) · `-D2 C_RBF_zu_calc = C_RBFA_zu * (1 - eta_VS)` · `-D3 B_RBF_ab_calc = sum_rows(frachtpfade, b_ab)` · `-D4 frachtpfade_unzulaessig = count_rows(frachtpfade, zulaessig == 0)` · `A178-18-D1 iteration_count_calc` · `-D2 A_F_last = sum_rows(last_rows(iterationen, 1), a_f)` · `-D3 b_F_last` · `-D4 iterationen_konvergiert = count_rows(iterationen, konvergiert == true)` · `-D5 befunde_count`. No prod symbol is re-produced (Gl. 1–13 keep their rows); existing inputs are bound by their prod symbols (`A_E_b_a`, `C_RBFA_zu`, `eta_VS`, `A_F`). **Pinned values** (unit test through `evaluateFormula` + `prepareRegisterRows` on the TS fallback tables; hand-derived — no printed example): Trenn 2 ha · 530 + 1 ha · 600 → **3 ha / 1660 kg/a**; Misch 2 ha · 530 · 40 % + 1 ha · 600 · 50 % → **724 kg/a**, a row without e_0 incomplete, missing `system_type` → `manual_required`; b_krit 7 / q_Dr 0,05 / v_spez 0,5; 3,5 ha → **350 m²**; 1000 + 0,15 · 400 → **1060 m³**; paths 50 000 / 10 000 / 5 000 m³/a with C_RBFA,zu 125 mg/l, η_VS 0,2, A_F 1000 m² → **5,55** (Gl. 7) / **5,25** (Gl. 6) / **4,75** (Gl. 5) kg/(m²·a) = the prod Gl. 7 text on the same scalars; C_RBF,zu **100 mg/l** (125 with η_VS = 0); per-path loads 250 / 500 / 200 → **950 kg/a** and the mass balance 5550 + 950 = 6500; Fang without RRL flags FÜ + RRL rows (**2**); iterations 2 → count 2, last A_F 1200 / b_F 6,5, konvergiert 1, empty → 0 / `manual_required`; Befunde 2 with Bereich / Hinweis filled from Tab. 2.

## 6. Inventory §5 top-wins walk

1. Repeatable Teilflächen rows with live Σ → `A_E_b_a` and `B_RBF_zu` → **encoded** (`teilflaechen_178`, `A_E_b_a_calc`, `B_RBF_zu_calc`, Gl. 2 / 3 switched per row); replacing the single `A_E_b_a_i`, the typed `A_E_b_a` and the two prod Gl. 2 / 3 rows is STAGED (D-1 / R-1); the four A178-08 summary copies are X-2.
2. `system_type` as master switch → **partially**: `e_0_i` column hides outside Misch (row scope, works today); `h_FK_min_tab` fills 0,75 / 0,50 beside the switch (works today); `v_spez_grobstoff` / `v_spez_grobstoff_min` / `t_RR_E_n1` / `A_F_strasse` rules are emitted but `pending` until C-1; `e_0` (C-2) and `n_RBF` (G-1) refused; the Straße simplification is `A_F_strasse` + `spezifische_ziele_formuliert` with the gate (G-4) and the Nachweis waiver (C-4) STAGED.
3. Vorstufentyp selector → η_VS and `C_RBF_zu = C_RBFA_zu · (1 − η_VS)` → **encoded as twins**: `vorstufe_typ` → `eta_VS_tab1` (kann, 0 / 0,2), `C_RBF_zu_calc` (A178-13-D2); the re-bind of `eta_VS` (E-2) and the typed `C_RBF_zu` on -12 (D-6) STAGED.
4. `becken_typ` + `rrl_vorhanden` pick one b_F formula and reveal only the relevant rows → **encoded in the register** (`frachtpfade`: a row per path the plant has, the `zulaessig` badge + `frachtpfade_unzulaessig` from the two drivers, ONE Σ reproducing Gl. 5 / 6 / 7 with the Tab.-1 η per path); the scalar-level switch (R-2), the scalar hiding (C-3), the gates (G-5) and the η override (O-1 / J-4) are STAGED. ✓ (switch STAGED, as the brief foresaw)
5. `V_RBF = V_RR + 0,15 · V_FK` and the per-path load equations → **encoded**: `V_RBF_calc` with created `V_RR` / `V_FK` (F-3, D-8); per-path `b_ab` + `B_RBF_ab_calc` (F-2, D-7); `B_RBFA_ab = Σ + B_VS` cannot live on -13 (B_VS not inherited) → R-4; the iteration values are the `iterationen` register (D-9).

Data-quality gaps of the inventory: `eta_F` circular → R-3 (rename the Gl. 13 output); REQ-19 literal 7 → G-2; three verdict triplets → X-3; `einzugsgebiet_typ` → X-4; 8 empty gate conditions → I-3 / G-7 (REQ-05); Tab. 2 now has a field target (`betriebsbefunde`); the "GI. (5)" OCR → U-2.

## 7. Files changed

Modified: `src/lib/eval/regulation-tables-seed-index.ts` (`a178` line), `src/lib/eval/field-configs/index.ts`, `src/lib/eval/equations/index.ts` (a178 lines), `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` (+55 blocks, +3 observations, inserted before "Plan 3 tooling rulings"), `docs/superpowers/guideline-to-tool-playbook.md` ("Encoding traps (Plan 3 Task 14)" paragraph).
Created: `src/lib/eval/regulation-tables-seed-a178.ts` (43 KB incl. the 76 lifted spans `Q`), `src/lib/eval/field-configs/a178.ts`, `src/lib/eval/field-configs/a178.prior.json` (captured), `src/lib/eval/equations/a178.ts`, `src/lib/eval/__tests__/regulation-tables-seed-a178.test.ts`, `src/lib/eval/__tests__/field-configs-a178.test.ts`, `src/lib/eval/__tests__/equations-a178.test.ts`, `src/components/worksheet/__tests__/register-a178-teilflaechen.test.tsx`, `scripts/verification/a178-STAGED-plan3-rulings.sql` (24 ☐ blocks, every line a comment), `scripts/migrations/20260917101400_regulation_tables_seed_a178.sql` + `scripts/rollback-20260917101400-regulation-tables-seed-a178.sql`, `scripts/migrations/20260917101410_field_configs_a178.sql` + `scripts/rollback-20260917101410-field-configs-a178.sql`, `scripts/migrations/20260917101420_equations_a178.sql` + `scripts/rollback-20260917101420-equations-a178.sql`, this report (+ the copy at `.superpowers/sdd/…/task-14-report.md`).
Untouched: every other standard's file; the A-178 harness files; `scripts/reasoning-map/` (churn from the unit run reverted with `git checkout --` before staging); the probes deleted; the generator / checkers live in the scratchpad.

## 8. Discrepancies vs the brief (codebase / transcript / reality won)

1. **Tables 7, not 4**: one `override_policy` per table forces the split of Tab. 1 (locked η vs `kann` η_VS) and of the text rows by modal (locked / locked-Rechenwerte / anhaltswert) — the m187 precedent; the brief's `S6_2_TEXT` "policy per row" is not expressible.
2. **The Teilflächen Σ live on A178-04** (D1 / D2), not the brief's `A178-09-D1`: a register-fed equation must live on its register's worksheet (m277e trap 2); `b_R_a` / `e_0` are per-row columns because -04 inherits neither (J-2). **`B_RBFA_ab_calc` (brief `A178-14-D1`) is not emitted**: the register lives on -13 and `B_VS` (-14) is not inherited there → `B_RBF_ab_calc` (Σ paths) + R-4.
3. **`lookup_fill` 2 (brief 5)**: `h_FK_required` and `eta_VS` are not re-bound (amendment J — twins `h_FK_min_tab` / `eta_VS_tab1` + E-1 / E-2); `b_krit`, `q_Dr_RBF_default`, `v_spez_grobstoff_min` are zero-input derived twins (a constant needs no key — the brief's G-12 / J-1 alternative), not fills.
4. **`h_FK_min_tab` sits on A178-02** beside `system_type` (a262e trap 1; the brief's A178-07 placement would read "Schlüssel fehlt" until C-1).
5. **`frachtpfade` has no `eta_override` / `eta_used` columns**: Tab. 1's η_F / η_RR / η_RRL are locked by their own words (O-1); a plain number column would bypass the policy without an audit (J-4). `b_ab` reads `C_RBFA_zu * (1 - eta_VS)` inline (the scalar-only `C_RBF_zu_calc` is not a stored symbol in row scope).
6. **Field `visible_when`: 8 (brief 8 targets, different set)**: `e_0` / `n_RBF` / the four -13 scalars / `B_RRL` are refused (C-2 / C-3 / G-1); the brief's `fremdwasser_*` and `leichtfluessigkeitsfang` fields do not exist in prod → created attestations on -05 / -02 carry the rules. **Section rules 0** (C-4).
7. **Equations 17 (brief 6 new + 3 staged)**: the counts / last-step / badge twins and the three constant twins are added; the brief's `A178-18-D1 A_F_last` kept; `V_RR` / `V_FK` are created inputs (no prod field carries them).
8. **`b_R_a` cue refuted**: L716 prints "wird … angesetzt", not "kann … angesetzt werden" (O-2, R-5); `q_Dr,RBF = 0,05` is printed twice with different modals (L639 limit, L767 default) — seeded as two rows in two tables.
9. **`vorstufe_typ` has 4 options** incl. `stauraum_unten` (L671, own gate G-6) — the brief's list plus the token the standard singles out.
10. **Sign-off ids 55 (brief ≈ 10)**: the brief's ids kept where they exist (G-12 → the zero-input twins, R-1 / R-2 / R-3, X-1 / X-2 → X-2 / X-3, J-1, G-1 / G-2 → G-1 … G-7 by order of appearance); every refused / withheld / read item got its own block.
11. **Prod facts**: 28 compliance rows as stated, 8 with EMPTY conditions (not 6 — REQ-17 and REQ-28 too); 55 orphan fields; REQ-09 / -10 / -12 / -21 read symbols their worksheet never inherits (X-1); 11 self-consumer entries (X-5).

## 9. Self-review

- Every `verbatim_quote` passes the verifier (51/51); every seeded cell is asserted inside its span at build time (`inSpan`); the 58 quoted fragments on the sheet and the 35 in the STAGED file were machine-checked against the transcript (two slips of mine caught and fixed before commit: an `\mathrm{~b}` typed from L737 into an L915 quote, and the `\\` line ends of the L967–L970 span — the latter twice, because the Bash heredoc collapsed `\\` (playbook trap 8)).
- The emitter guards accepted all 32 entries and 17 equations first time because the rule set was planned against the capture (consumer lists, the 13 equations, the 28 gates, section codes); the field-config test pins the five refusals, the consumer facts behind every `pending` rule, the X-1 gate oddity, the 8 empty gates, the 11 self-consumers, G-A3 and the string-literal walk (15 expressions, 0 collisions).
- The runtime facts were established through the real register contract before the pins; the render test drives the Teilflächen register through `RegisterEditor` (Trenn / Misch column switch, badge, footer Σ through `evaluateFormula`).
- Prod facts used in the STAGED file (13 equation ids + md5, 28 gate ids + md5, column lists, `standards.version`, labels, `validation_rules`) come from the in-session read-only queries; no long cell was retyped (archive pattern).
- No `String.replace` with a replacement string on any repo file: the seed module was assembled from a body file and the generated quote block with `split/join`; every later edit used `split/join` with a presence check that throws before writing, or the Write tool.
- `git checkout -- scripts/reasoning-map/` run before staging; `.env.local` never read; one commit; author `alvaro.burgos@ekowai.com` verified before committing.
- Reviewed the diff of every modified shared file: only the three registry lines, the sign-off section and the playbook paragraph.

## 10. Concerns (for the controller)

1. **C-1 is the single most valuable ratification for A-178**: `system_type` reaches -04 / -06 / -09 only, so four prod gates (REQ-09 / -10 / -12 / -21) are `pending` forever and five emitted rules are inert until one UPDATE.
2. **The Frachtpfade register duplicates three typed scalars** (D-4) and reads Tab. 1 by lookup while prod's `eta_RR` / `eta_RRL` / `eta_F` are typed — two b_F values can differ on screen until R-2 / D-5.
3. **η_F circularity (R-3)**: Gl. 13 overwrites the Tab.-1 design input on -15 — an existing prod defect this task only names.
4. **Scalar-only twins (I-2)**: `b_F_calc`, `C_RBF_zu_calc`, `B_RBF_ab_calc` and the constants evaluate on the form / report only; the STAGED gates G-5 / R-4 that read them need the materialisation workstream.
5. **TABELLE1 not `md_verified`** because of the OCR footnote marker (U-1) — a one-cell PDF look flips it.
6. **The `kann` select on `eta_VS_tab1` offers 0,2 for every Vorstufe type** (O-4, mechanism: alternatives come from the value column).
7. **Token/time:** ≈ 0.62 M tokens in, ≈ 60 min wall-clock — in the Task 10–12 range.

## 11. Residue (what the guideline demands that the worksheets still do not ask)

§5.2.1 the Umsetzbarkeit checks (Bild 1 flow, L413–L457) as a checklist; §5.2.4 the five Feststoffeintrag measures (L463–L468); §6.1.3.1 ATV-A 128 Regenüberläufe not suitable as Vorstufe (L537); §6.1.4.2 Verteilerrinnen / alternierende Beschickung (L569–L571); §6.1.4.4 Deckschicht 2–8 mm (seeded 5 cm only); §6.1.4.8 Dränmaterial 2/8 mm, 70 / 30 Massen-% (L625 — no field); §6.1.4.10 zweistufige Drossel / Probenahme / Durchflussmessung (L641–L645); §6.1.4.12 / .13 Notumlauf / Notentleerung as attestations; §6.2.3 RRL sizing per DWA-A 117 (reference only); §7 Ausschreibung items (L995–L1034); §8.1 Inbetriebnahme steps (L1042–L1046), §8.3.2 hydraulic Betriebsgrößen incl. k_f,b < 10⁻⁶ m/s as a Kolmation indicator (L1121 — prod `k_f_b` exists on A178-17 without a gate), §8.3.3 Depotuntersuchungen 5-jährlich (L1127–L1134); Anhang A flowchart (image). Each is listed here with its line.
