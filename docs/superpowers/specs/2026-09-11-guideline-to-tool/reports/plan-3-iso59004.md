# Plan 3 Task 29 — ISO-59004 (slug `iso59004`) — the LAST of the 29 standards

- **Status:** DONE_WITH_CONCERNS (every concern is a sign-off block; none blocks the task)
- **Worktree / branch:** `C:\Users\Ekowai\_wt-g2t`, `feat/guideline-to-tool`, base `224a38e` (Task 28 fix round)
- **Model:** Claude Fable 5.1 (effort as dispatched)
- **Nothing applied to prod.** No `apply-migration`, no `drizzle-kit`, no `vercel`, no DB write. The only prod access was the two READ-ONLY capture scripts and one READ-ONLY `information_schema` query through `prod-query.mjs`. `.env.local` was never read or printed.
- **The scratchpad extraction is NOT committed** (it is a derivative of a licensed PDF).

---

## 0. The headline decisions, first

| # | Decision | Why |
|---|---|---|
| 1 | **Table 1 is NOT seeded** (`iso59004-U-1`) | it prints **Action \| Description** and **no category column**, so under controller resolution (2) every row fails; and its two printed columns interleave in the extraction, so the Description cells cannot be lifted without reconstruction. `actions.category` is an engineer-entered enum; this standard emits **no** `lookup_fill` and **no** lookup register column. |
| 2 | **One table IS seeded — `S5_2`**, the six §5.2 principles | cleanly printed, one paragraph per sub-clause heading; keys are the six prod `selected_principle` tokens byte-for-byte. Its consumer is the verification: the `principles` checklist's option set is asserted equal to the seeded rows, and each row's printed English title is asserted equal to the prod option's `label_en`. |
| 3 | **The five `implementation_stage` visibility rules are WITHHELD** (`iso59004-J-4`) | §7.1.4 prints "NOTE The sequence of stages can differ and can also occur at the same time or in parallel." Hiding four fifths of -06 on one selected stage contradicts the standard and would make six gates unsatisfiable. Independently the gate guard refuses 8 of the 11 candidates — pinned through the emitter. |
| 4 | **`ISO-59004-04-D1` (`all_principles_considered_code`) is WITHHELD** (`iso59004-F-1`) | blocked **twice**: the `AND`-chain of `contains()` calls does not even parse (new finding, `iso59004-I-2`), and the nested-`if` rewrite that does parse has no `carriers` path. |
| 5 | **The brief's `life_cycle_note` rule is REFUTED** (`iso59004-J-3`) | the token `recover` does not exist in prod (failing grep, exit 1) and §6.7's first sentence applies the life-cycle perspective to **every** action. The column is always visible. |
| 6 | **`goals_with_targets` uses `IS NOT NULL`, not `!= ''`** (`iso59004-J-5`) | probed: the `!= ''` form parses but returns `manual_required`; `IS NOT NULL` computes and already treats a stored empty string as absent. |

---

## 1. Counts

| item | count | detail |
|---|---|---|
| seeded tables | **1** | `S5_2` — six §5.2 principle rows, keys = prod `selected_principle`, value columns `clause` / `title` / `text`, policy `locked`, status `imported_unverified` |
| seeded rows | **6** | 6/6 PASS in `verify-regulation-tables.ts` |
| tables NOT seeded | 1 | Table 1 (`iso59004-U-1`) |
| registers | **3** | `actions` (-05, 7 columns), `goals` (-06, 4), `indicators_59004` (-06, 3) |
| `select_many` checklists | **2** | `principles` (-04, 6 options), `circularity_aspects` (-02, 5 options + `allow_custom`) |
| `select_one` re-binds of existing enums | **6** | `selected_principle`, `selected_action`, `action_category`, `implementation_stage`, `implementation_level`, `feasibility_dimension` — all `keep_prod` (D-1) |
| `lookup_fill` | **0** | consequence of U-1 |
| created fields | **14** | 3 register carriers + 2 checklists + 6 derived outputs + `life_cycle_justification` + `operates_across_multiple_levels` + `level_relationships` |
| field `visible_when` emitted | **2** | `life_cycle_justification ← repair_before_remanufacture_before_recycle == false`; `level_relationships ← operates_across_multiple_levels == true` |
| field `visible_when` withheld | **11** | the `implementation_stage` candidates (8 refused by the guard, 3 accepted and withheld on §7.1.4) |
| section `visible_when` | **0** | no printed sentence makes a whole section conditional |
| equations emitted | **6** | `ISO-59004-05-D1/D2/D3`, `ISO-59004-06-D1/D2/D3` |
| equations withheld | **1** | `ISO-59004-04-D1` (`iso59004-F-1`) |
| sign-off blocks | **31** | J-1/J-2/J-3/J-4/J-5/J-6, G-1…G-4 (+G-5 folded into J-4), S-1, D-1…D-11, U-1…U-4, F-1, I-1…I-3, X-1 |
| migrations (WRITTEN, NOT APPLIED) | **3 + 3 rollbacks** | `20260917102900` / `…10` / `…20` |
| tests added | **26 in 4 files** | seed 7, field-configs 10, equations 7, register render 2 |
| prod writes | **0** | — |

Migration statement counts (asserted as freshness pins): seed **6** `INSERT INTO regulation_table_rows` + 1 table INSERT, rollback 1 `DELETE FROM regulation_tables`; field configs **14** `INSERT INTO fields` + **6** `UPDATE fields`, 0 `UPDATE worksheet_sections`; equations **6** `ON CONFLICT … DO NOTHING`.

---

## 2. Source: the extraction, its counts and the page-mapping method

There is **no** markdown/text transcript for ISO-59004. The source is the standard's own PDF, extracted **in this session** into the scratchpad (not the repo, not the commit):

```
$ "/c/Users/Ekowai/scoop/shims/pdftotext.exe" -layout \
    "C:/Users/Ekowai/Desktop/Ciruclar economy, sustanability and water test/ISO 59004/ISO_FDIS_59004_N.pdf" \
    "C:/Users/Ekowai/AppData/Local/Temp/claude/C--Users-Ekowai/a8fd8ea2-12c9-413f-8347-f836fdcc15d2/scratchpad/iso59004.txt"
EXIT=0
```

Counts of the produced file (all re-executable):

```
$ wc -c < iso59004.txt                      241700      (bytes)
$ wc -l < iso59004.txt                        4588      (lines)
$ tr -cd '\014' < iso59004.txt | wc -c          62      (form feeds ⇒ 62 pages)
$ tr -d ' \t\n\r\014' < iso59004.txt | wc -c 150010      (non-whitespace characters)
```

62 pages matches the page count the existing harness fixture already records for this PDF ("62 pp.", `tests/harness/seed-iso59004.ts`) — an independent corroboration written before this task.

**Page-mapping method.** A form feed ENDS a page, so the page of the text on line *i* is `1 + (form feeds strictly before line i) + (form feeds leading line i itself)`. The trailing term matters: `pdftotext` puts the break at the START of the first line of the new page, so line 409 (`\fFINAL DRAFT International Standard …`) is on PDF **p.8**, not p.7. The generator `gen-iso59004-quotes.mjs` computes this and prints the mapping for every span.

**Check against the printed footer.** Every body page prints `© ISO 2024 – All rights reserved` and, two lines below it, the page number. Walking those gives: extraction pages 3–7 print `iii, iv, v, vi, vii`; extraction page 8 prints `1` and the sequence runs unbroken to extraction page 62 printing `55`. So **printed = PDF − 7** throughout the body.

**Independent check against prod.** Prod's own `fields.verification_quote` cells already record both numbers for nine fields (written before this task, by the original encoder). Every one agrees with the mapping computed here:

| prod field | prod cell says | this session computes |
|---|---|---|
| `circularity_aspect` §3.6.1 | printed p.13 = PDF p.20 | L1414–L1417 ⇒ PDF p.20, printed 13 ✓ |
| `selected_principle` §5.1/§5.2 | printed pp.15-16 = PDF pp.22-23 | L1588 ⇒ p.22/15; L1601–L1635 ⇒ p.23/16 ✓ |
| `all_principles_considered` §5.3.2 | printed p.16 = PDF p.23 | L1658–L1660 ⇒ p.23, printed 16 ✓ |
| `preliminary_action_refuse_rethink` §6.1 | printed p.18 = PDF p.25 | L1780 ⇒ p.25, printed 18 ✓ |
| `life_cycle_perspective_applied` §6.7 | printed p.27 = PDF p.34 | L2537–L2540 ⇒ p.34, printed 27 ✓ |
| `repair_before_remanufacture…` §6.7 | printed p.28 = PDF p.35 | L2561–L2563 ⇒ p.35, printed 28 ✓ |
| `implementation_level` §7.1.3 | printed p.29 = PDF p.36 | L2702–L2718 ⇒ p.36, printed 29 ✓ |
| `implementation_stage` §7.1.4 | printed p.30 = PDF p.37 | L2731–L2736 ⇒ p.37, printed 30 ✓ |
| `ce_goals` §7.3.2 / `pilot_project` §7.4.7 / `selected_circularity_indicator` §7.6 | printed 33 / 35 / 36 = PDF 40 / 42 / 43 | L2937 ⇒ 40/33; L3110 ⇒ 42/35; L3229 ⇒ 43/36 ✓ |

**Spans are generated, never retyped.** `regulation-tables-quotes-iso59004.ts` is written mechanically by line range with `JSON.stringify` per span (30 spans), by the scratchpad script `gen-iso59004-quotes.mjs`. `SENTENCE_5_3_2` is a byte-exact SUBSTRING of `Q.L1658_1660`, produced by slicing the span at the index of "Considering the integration" (that span begins mid-line because the previous sentence ends on the same printed line).

**Row-by-row quote proof:**

```
$ npx tsx scripts/regulation-tables/verify-regulation-tables.ts iso59004 "<scratchpad>/iso59004.txt"
PASS  S5_2  systems_thinking
PASS  S5_2  value_creation
PASS  S5_2  value_sharing
PASS  S5_2  resource_stewardship
PASS  S5_2  resource_traceability
PASS  S5_2  ecosystem_resilience
6/6 quotes verbatim in .../iso59004.txt
```

### `iso59004-J-1` — the source is a FINAL DRAFT

Stated plainly, as the brief requires: **every quote produced by this task comes from an FDIS.** The exact status string read from the cover/first body page:

> [PDF p.8 (printed p.1), running header, VA] `FINAL DRAFT International Standard                                                     ISO/FDIS 59004:2024(en)`

> [PDF p.1 (IMANOR cover, French), VA] `La présente norme est identique à l’ISO/FDIS 59004:2024.`

Prod agrees: `standards.version` = `FDIS 2024 (ISO/FDIS 59004:2024)`. The seed builder's edition token is `'FDIS 2024'`, so a future published-edition seed lands as a new edition row and supersedes nothing by accident. **Whether the corpus may be encoded against a draft at all is the owner's ruling** — `iso59004-J-1` gates every other Task-29 block and the three migrations. Nothing the FDIS marks as under change was seeded; the document carries no "under change" markers on the clauses used here (the only draft marker is the status header itself, and there is exactly **one** occurrence of the word "shall" in all 62 pages — the patent-disclaimer boilerplate — which is why a warn-heavy encoding is correct and no enforcement was invented).

### `iso59004-J-2` — the status token

`S5_2` ships `imported_unverified`. `md_verified` would be factually wrong (no markdown transcript); a third token is not introduced unilaterally. The block proposes `pdf_verified` with the exact `UPDATE`/rollback and **cross-references Task 28's identical proposal (`iso5667_1-J-2`) so the owner rules once for both.**

### `iso59004-U-2` — the watermark

The PDF carries a diagonal "Projet de Norme Marocaine" overlay. `pdftotext` emits its glyph runs as extra lines between body lines, and occasionally glues a fragment to the front of a body word (`deGenerate` L2629, `ojnongovernmental` L2711). Every stored `verbatim_quote` is the **raw** span. A build-time normaliser (`collapseNoWatermark`) drops only whole watermark-ONLY lines, by the explicit token list `['Pr','oj','et','de','N','or','m','M','e','ar','oc','ai','n']`, for (a) the `inSpan` containment guard and (b) quotes rendered as prose. Where a fragment is glued inside a word, no helper can clean it and the entry uses a different clean span instead (`implementation_level` uses `Q.L2702` + `Q.L2717_2718` instead of the full level list; `feasibility_dimension` uses `Q.L3044_3045` instead of the reordered bullet block — `iso59004-U-4`).

The field-config module AND the equations module both bind their local `norm` to that one exported normaliser, and both test files assert `not.toMatch(/ (et|oj|Pr|ar oc|ai n|or m) /)` over every stored quote — the assertion was added after a first emit of `20260917102920` leaked an `oj` into `ISO-59004-05-D1`'s `verification_quote` (the equations module had its own plain collapse). Caught by reading the emitted SQL, fixed, re-emitted, and now pinned in both suites.

---

## 3. Every quote used, with its PDF page

| span | PDF p. (printed) | clause | text (whitespace-collapsed; watermark-only lines dropped for readability — the stored span is raw) |
|---|---|---|---|
| `L27_29` | 1 (cover) | — | "La présente norme est identique à l’ISO/FDIS 59004:2024." |
| `L409` | 8 (1) | header | "FINAL DRAFT International Standard   ISO/FDIS 59004:2024(en)" |
| `L1414_1415` | 20 (13) | §3.6.1 | "element of an organization’s (3.4.1) activities or solutions (3.2.1) that interacts with the circular economy (3.1.1)" |
| `L1417` | 20 (13) | §3.6.1 EXAMPLE | "Durability, recyclability, reusability, repairability, recoverability." |
| `L1588_1589` | 22 (15) | §5.1 | "The set of principles given in 5.2, which are interlinked and complementary, should be considered by an organization to transition towards a circular economy." |
| `L1601_1604` | 23 (16) | §5.2.1 | "5.2.1 Systems thinking — Organizations take a life cycle perspective and apply a long-term approach when considering their impacts on environmental, social and economic systems." |
| `L1606_1609` | 23 (16) | §5.2.2 | "5.2.2 Value creation — Organizations recover, retain or add value by providing effective solutions that contribute to socio-economic and environmental value, and use resources in an efficient way." |
| `L1610_1617` | 23 (16) | §5.2.3 | "5.2.3 Value sharing — Organizations collaborate with interested parties along the value chain or value network in an inclusive and equitable way, for the benefit and well-being of society, by sharing the value created with the provision of a solution." |
| `L1619_1624` | 23 (16) | §5.2.4 | "5.2.4 Resource stewardship — Organizations manage stocks and flows in a sustainable way including by closing, slowing and narrowing resource flows to contribute to resource accessibility and continued availability for present and future generations and to reduce risks associated with dependence on virgin resources." |
| `L1626_1629` | 23 (16) | §5.2.5 | "5.2.5 Resource traceability — Organizations collect and maintain data to enable tracking of resources through their value chains and are accountable for sharing relevant information with interested parties." |
| `L1631_1635` | 23 (16) | §5.2.6 | "5.2.6 Ecosystem resilience — Organizations develop and implement practices and strategies that protect and contribute to the resilience and regeneration of ecosystems and their biodiversity, including preventing harmful losses and releases and taking into account planetary boundaries." |
| `L1658_1660` / `SENTENCE_5_3_2` | 23 (16) | §5.3.2 | "Considering the integration of all the circular economy principles is important, as focusing on only one or two principles can undermine the achievements that would otherwise occur if all the principles were considered." |
| `L1780` | 25 (18) | §6.1 | "Organizations should consider refuse and rethink as preliminary actions." |
| `L2537_2540` | 34 (27) | §6.7 | "This resource management guidance is intended to help organizations prioritize actions to increase circularity performance. A life cycle perspective should guide the organization in the identification of the best action for their value creation model and to avoid unwanted trade-offs." |
| `L2541_2551` | 34 (27) | §6.7 | the R-strategy narrative: "The guidance (see Table 1) suggests organizations can begin by determining if there is a need to be satisfied and if the need can be met without additional resource use (refuse). … (rethink, reduce) … (source). Organizations should seek to extend the life of solutions … (repair, reuse, refurbish, remanufacture, repurpose) … Finally, organizations should look to use resources in multiple cycles (cascade, recycle), recover the energy if the resource cannot be used again (energy recovery) or source resources from landfills (re-mine)." |
| `L2561_2563` | 35 (28) | §6.7 | "In general, products should be repaired before they are remanufactured, and remanufactured before they are recycled. However, in cases where applying this guidance does not lead to the best outcome, organizations should consider applying a life cycle perspective to determine the best action." |
| `L2570_2631` | 35 (28) | Table 1 | the whole table AS EXTRACTED — committed as evidence for `iso59004-U-1`, **not** seeded |
| `L2702` | 36 (29) | §7.1.3 | "This guidance is applicable to organizations operating at all system levels, as follows:" |
| `L2702_2716` | 36 (29) | §7.1.3 | the four printed levels (carries the glued `ojnongovernmental` — evidence only) |
| `L2717_2718` | 36 (29) | §7.1.3 | "Organizations that interact or operate across more than one system level should consider the relationships and interactions within and between the other system levels to achieve a circular economy." |
| `L2731_2736` | 37 (30) | §7.1.4 | "The guidance is structured to allow for an iterative process. The stages of implementation can be altered and adapted … The proposed stages … are discussed in 7.2 to 7.6. NOTE The sequence of stages can differ and can also occur at the same time or in parallel." |
| `L2736` | 37 (30) | §7.1.4 NOTE | "NOTE The sequence of stages can differ and can also occur at the same time or in parallel." |
| `L2937_2940` | 40 (33) | §7.3.2 | "The organization should develop goals with an aim to create structured and lasting change and identify pathways and key actions to achieve their vision for a circular economy. Intermediate targets should be established to allow for circularity assessments of progress from the reference situation towards the longer-term goals." |
| `L2998_2999` | 40 (33) | §7.4.4 | "The organization should align its actions with the strategy and address identified opportunities to create value and have a value creation model in place that is aligned with the circular economy." |
| `L3044_3045` | 41 (34) | §7.4.5 | "To assess the feasibility of the adoption of a circular economy and its associated circular economy value creation models, actions should be assessed against the following dimensions:" |
| `L3044_3068` | 41 (34) | §7.4.5 | the six bullets (reordered by pdftotext — evidence only, `iso59004-U-4`) |
| `L3110_3117` | 42 (35) | §7.4.7 | "Prior to formal implementation some organizations can consider a preliminary pilot application of a specific circular economy practice or for a specific segment of the organization to ensure the application works as planned and any specific risk or barriers are addressed before wider implementation. …" |
| `L3229_3234` | 43 (36) | §7.6 | "As part of its action plan for a circular economy (see 7.1.4), the organization should choose circularity indicators to assess the effectiveness and efficiency of the interventions adopted and monitor the progress. The circularity indicators should be determined with the circular economy principles in mind, as well as the circularity goals and strategic priorities established by the organization. Guidance on how to measure and assess circularity performance is provided by ISO 59020." |
| `L3251_3254` | 44 (37) | §7.6 | "Review of the circularity indicators and circularity performance should set the basis for continual improvement and, therefore, can include milestones and targets for the next period. …" |

---

## 4. `iso59004-U-1` in full — why Table 1 is not seedable

The extracted table, verbatim (this is `Q.L2570_2631`, abridged here only by removing watermark-only lines; the untouched span is committed):

```
                         Table 1 — Guidance for resource management actions
Refuse
Rethink
        Action                                                    Description
                   Make solutions redundant by abandoning its function or by offering the same function with a
                   radically different solution.
                   Reconsider design and manufacturing decisions. Make service use more intensive (e.g. through
Source
Reduce
                   sharing or by putting multi-functional products on the market).
                   Select recovered or renewable, sustainably sourced or produced resources. …
                   Increase efficiency in product manufacture or use by consuming fewer natural resources and
                   materials.
Repair             Restore a defective or damaged product so that it can be used in its original function.
Re-use
Refurbish
                   Re-use a discarded product which is still in working condition and fulfils its original function.
                   Restore to a useful condition during expected service life with similar quality and performance
                   characteristics.
Remanufacture
                   Return an item, through an industrial process, to a like-new condition …
Repurpose
Cascade
                   Adapt a product or its parts for use in a different function than it was originally intended …
                   Shift recovered materials from one loop to another … and safe return of the
Recycle
                   material to the environment.
                   Recover and process material to obtain the same (high grade) or lower (low grade) quality …
Recover energy
Re-mine          deGenerate useful energy from recovered resources.
                   Mining or extraction from landfills and waste plants can be possible in some cases if mining or
                   extraction activities are sustainably managed.
```

**Reason 1 — there is no category column.** The printed header is `Action` (L2575) and `Description` (L2577). The word "category" does not occur anywhere in the span, and none of the five prod `action_category` tokens does either. Both absences are **asserted** in `regulation-tables-seed-iso59004.test.ts` against the committed span, so they are re-executable rather than asserted in prose. Under controller resolution (2), a row whose category cell is not physically unambiguous is not seeded — that is every row, and `actions.category` stays an engineer-entered enum from the prod tokens.

**Reason 2 — the two printed columns interleave.** Four of the thirteen description cells are not contiguous: `Rethink`'s runs over the `Source`/`Reduce` label lines; `Cascade`'s has the `Recycle` label sitting inside it; and `Recover energy`'s description is printed **on the `Re-mine` label line** with a watermark `de` glued to its first word. Re-associating them is reconstruction, which SR-3 / amendment F forbid. Two of these are asserted in the test (`'Re-mine deGenerate useful energy from recovered resources.'` and `'Recycle material to the environment.'`).

**What IS settled** and is reported as a positive finding: the thirteen Action labels each stand alone on their own line, in the printed order *Refuse · Rethink · Source · Reduce · Repair · Re-use · Refurbish · Remanufacture · Repurpose · Cascade · Recycle · Recover energy · Re-mine*, and they match the thirteen prod `selected_action` tokens one-for-one **in order** (the printed order is asserted in the test). The ENUM is therefore PDF-verified even though the TABLE is not seedable — which is, in practice, most of the value the brief wanted from Table 1.

**Consequence for the brief:** `lookup_fill` count 1 → **0**; `category derived expr "lookup('TABLE1', action, 'category')"` → engineer-entered enum, exactly the fallback controller resolution (2) names.

---

## 5. Absence claims — every grep with its exit code

| claim | command (run in this session) | output | exit |
|---|---|---|---|
| the brief's action token `recover` does not exist in prod (`iso59004-J-3`) | `grep -nE '"value": ?"recover"' src/lib/eval/field-configs/iso59004.prior.json` | *(empty)* | **1** |
| …while `recover_energy` does | `grep -nE '"value": ?"recover_energy"' src/lib/eval/field-configs/iso59004.prior.json` | `647:        "value": "recover_energy",` | 0 |
| `implementation_level` has no multi-level token (`iso59004-J-6`) | `grep -oE '"value":"[a-z_]*(multi\|across\|more_than)[a-z_]*"' src/lib/eval/field-configs/iso59004.prior.json` | *(empty)* | **1** |
| no gate condition reads `defined_term` (`iso59004-S-1`) | `node -e "…t.requirements.filter(r=>(r.condition\|\|'').includes('defined_term'))…"` | `gates naming defined_term: 0` | 0 |
| Table 1 prints no category cue (`iso59004-U-1`) | asserted in the seed test: `expect(t1.toLowerCase()).not.toContain('category')` and `not.toContain(<each of the 5 tokens>)` | test passes | 0 |
| the standard has exactly one "shall" | `grep -nc "shall" iso59004.txt` | `1` | 0 |

**Count correction (amendment O).** The inventory says "22 of 44 requirements have empty conditions". The read-only capture counts **24** (`node -e "…keys.filter(k=>!g[k].condition).length"` ⇒ `24`). The capture is the authority (R-4); the report and the STAGED file use 24 and name all 24.

---

## 6. §5 top-wins walk (inventory `ISO-59004.md`)

| # | inventory win | verdict | what shipped |
|---|---|---|---|
| 1 | Principles checklist (six rows) with `all_principles_considered` derived | **partially encoded** | the `select_many` checklist over the six prod tokens IS created (-04 section C) and its option set is asserted equal to the seeded `S5_2` rows. The DERIVED code is **withheld** (`iso59004-F-1`) — blocked by the formula grammar AND by the missing `carriers`; the prod hand boolean (is_required, CR-013) is untouched and keeps enforcing. |
| 2 | Actions register (R-strategy → category derived, feasibility dimensions, pilot flag) | **partially encoded** | the register IS created with all six columns the brief names + a §6.1 `preliminary` badge + three equations. `category` is **engineer-entered, not derived** (`iso59004-U-1`), and `feasibility_dimensions` is text-with-datalist because no register column type is a multi-select (`iso59004-I-1`). |
| 3 | Inherit `system_in_focus` / `circularity_aspect` / indicators from ISO-59020 | **deferred with reason** | Phase 6 (`iso59004-X-1`). `indicators_59004.indicator` is deliberately free text and not a `lookup_key` into ISO-59020's `TABLE3` — the governing table belongs to that standard and is seeded under ITS task (constraint 3(d)). |
| 4 | Goals register with intermediate targets (§7.3.2) | **encoded** | register + `goals_count` + `goals_with_targets`; the counting form is `IS NOT NULL` after the probe (`iso59004-J-5`). |
| 5 | Drop `defined_term` from data entry | **deferred-STAGED** | `iso59004-S-1`. Field deactivation is structural; the field is not touched at all, not even its widget. |

---

## 7. Step-by-step against the brief

**Step 2 (tables).** `TABLE1` → not seeded (§4 above). `S5_2` → seeded, 6 rows, `locked` + the §5.1 override quote, `imported_unverified` (J-2). The brief's `anhaltswert` policy and its cue ("should"; "unless a life cycle perspective indicates a better outcome") belonged to `TABLE1`; since Table 1 is unseeded the cue instead governs the STAGED CR-028 rewrite (`iso59004-G-1`), where it is quoted in full.

**Step 3 (registers + checklists).** All five created as specified, with these deviations, each with a block:
- `actions.action` is a plain `enum` + `discriminator` (not a `lookup_key`) — U-1.
- `actions.category` is a plain `enum` over the prod tokens (not `derived lookup(...)`) — U-1.
- `actions.life_cycle_note` has no `visible_when` — J-3.
- `actions.feasibility_dimensions` is `text` + `datalist` — I-1 (the brief's own shape; the gap is now recorded as a [CODE] item).
- No register column is keyed `id` (amendment P) and none shadows a prod symbol of its own worksheet — both asserted.

**Step 4 (conditionals).** Two rules emitted (`life_cycle_justification`, `level_relationships`); the five stage rules withheld with eleven pinned emitter verdicts (J-4); `defined_term` deactivation STAGED (S-1); the 24 empty-condition CRs handled in G-4 — **one** proposal (CR-038), 23 reasoned refusals, no invented enforcement.

The brief's `level_relationships visible_when "implementation_level == '<multi token>'"` could not be emitted because no such token exists (J-6, failing grep exit 1). Rather than drop the rule, a **source-grounded** boolean `operates_across_multiple_levels` was created from §7.1.3's own sentence and drives it. Unset ⇒ `pending` ⇒ visible, so the fail-safe still holds.

**Step 5 (derived).**

| equation | formula | inputs | clause |
|---|---|---|---|
| `ISO-59004-05-D1` | `actions_count = count_rows(actions)` | `actions` | §6.7 |
| `ISO-59004-05-D2` | `refuse_rethink_first = count_rows(actions, action IN {'refuse', 'rethink'})` | `actions` | §6.1 |
| `ISO-59004-05-D3` | `pilot_actions_count = count_rows(actions, pilot == true)` | `actions` | §7.4.7 |
| `ISO-59004-06-D1` | `goals_count = count_rows(goals)` | `goals` | §7.3.2 |
| `ISO-59004-06-D2` | `goals_with_targets = count_rows(goals, intermediate_target IS NOT NULL)` | `goals` | §7.3.2 |
| `ISO-59004-06-D3` | `indicators_59004_count = count_rows(indicators_59004)` | `indicators_59004` | §7.6 |
| ~~`ISO-59004-04-D1`~~ | **withheld** — `iso59004-F-1` | `principles` | §5.3.2 |

All six are register-fed and materialise on save (register-scoped materialiser), so the "scalar-only equations are not server-materialised" note does not bite here. No figure is typed into any formula (asserted).

---

## 8. Engine probes run in this session (raw)

All four are pinned in the committed tests, so each is re-executable.

```
# 1. the brief's empty-string comparison (iso59004-J-5)
parseNumeric("count_rows(goals, intermediate_target != '')")
  ⇒ {"ok":true,"node":{"kind":"call","name":"count_rows",…,"op":"!=","rhs":{"kind":"lit","value":"","quoted":true}}]}
evaluateFormula("n = count_rows(goals, intermediate_target != '')")  over 3 complete rows
  ⇒ {"kind":"manual_required","reason":"Fehlende Eingabe für count_rows(): intermediate_target"}
evaluateFormula("n = count_rows(goals, intermediate_target IS NOT NULL)")  over the SAME rows
  ⇒ {"kind":"computed","value":1}          # row 1 "2030: 50 %…", row 2 "" (NOT counted), row 3 absent

# 2. the IN / OR / boolean forms used by -05-D2 / -D3
count_rows(goals, action IN {refuse, rethink})      ⇒ computed 2
count_rows(goals, action IN {'refuse','rethink'})   ⇒ computed 2     # the emitted form
count_rows(goals, action == 'refuse' OR action == 'rethink') ⇒ computed 2
count_rows(goals, pilot == true)                    ⇒ computed 2
empty register: every count                         ⇒ computed 0      # never a phantom pass

# 3. the withheld -04-D1 (iso59004-F-1 / I-2)
parseNumeric("if(contains(principles,'a') AND contains(principles,'b'), 1, 0)")
  ⇒ {"ok":false,"message":"Ausdruck erwartet."}        # AND combines COMPARISONS, not CALLS — new finding
parseNumeric("if(contains(principles,'a'), 1, 0)")     ⇒ {"ok":true,…}
parseNumeric("if(x == 1 AND y == 2, 1, 0)")            ⇒ {"ok":true,…}
parseNumeric(<the nested-if rewrite over the six tokens>) ⇒ {"ok":true,…}
evaluateFormula(<that nested-if form>, inputs:[{symbol:"principles",…}])
  ⇒ {"kind":"manual_required","reason":"Unbekanntes Symbol \"principles\" im Ausdruck."}   # no carriers path

# 4. the gate-condition grammar (iso59004-I-3)
parseCondition("contains(principles, 'systems_thinking')")  ⇒ null
parseCondition("principles IS NOT NULL")                    ⇒ parses; evalCondition over ['systems_thinking','value_creation'] ⇒ pass
parseCondition("IF repair_before_remanufacture_before_recycle == false THEN life_cycle_justification IS NOT NULL") ⇒ parses; fail on the escape-without-justification state
parseCondition("implementation_level IS NOT NULL AND (IF operates_across_multiple_levels == true THEN level_relationships IS NOT NULL)") ⇒ parses; fail on multi-level-without-relationships
parseCondition("IF actions_count >= 1 THEN refuse_rethink_first >= 1") ⇒ parses; fail when 2 actions and 0 preliminary
```

## 9. The eleven withheld `implementation_stage` rules — the emitter's own verdicts

Captured by feeding each candidate through `emitFieldConfigSql` with the captured prior; pinned in `field-configs-iso59004.test.ts`.

```
REFUSED   ISO-59004-06 reference_situation_assessed: visible_when hides reference_situation_assessed read by gate CR-032 (warn: "reference_situation_assessed == true AND baseline_circularity_assessment == true") — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block
REFUSED   ISO-59004-06 baseline_circularity_assessment: … gate CR-032 … STAGE as a G-block
REFUSED   ISO-59004-06 ce_purpose_mission_vision: … gate CR-034 (warn: "ce_purpose_mission_vision IS NOT NULL") … STAGE as a G-block
REFUSED   ISO-59004-06 ce_goals: … gate CR-035 (warn: "ce_goals IS NOT NULL") … STAGE as a G-block
REFUSED   ISO-59004-06 ce_strategy: … gate CR-036 (warn: "ce_strategy IS NOT NULL") … STAGE as a G-block
REFUSED   ISO-59004-06 ce_action_plan: … gate CR-039 (warn: "ce_action_plan IS NOT NULL") … STAGE as a G-block
REFUSED   ISO-59004-06 value_creation_model: … gate CR-037 (warn: "value_creation_model IS NOT NULL") … STAGE as a G-block
REFUSED   ISO-59004-06 monitoring_review_process: … gate CR-042 (warn: "monitoring_review_process == true") … STAGE as a G-block
ACCEPTED  feasibility_dimension
ACCEPTED  pilot_project
ACCEPTED  selected_circularity_indicator
```

The three ACCEPTED ones are recorded deliberately: the withholding rests on the printed §7.1.4 NOTE, not on the guard, and hiding those three would have been possible. Saying so keeps the decision a judgment rather than a guard artefact.

---

## 10. Verification (raw output)

```
$ pnpm -s typecheck
(no output)   TYPECHECK_EXIT=0
```

```
$ pnpm test
 Test Files  360 passed | 1 skipped (361)
      Tests  3157 passed | 1 expected fail | 1 skipped (3159)
   Duration  61.57s
```
(3131 → 3157: +26 new tests, no regressions.)

```
$ pnpm vitest run --project unit \
    src/lib/eval/__tests__/regulation-tables-seed-iso59004.test.ts \
    src/lib/eval/__tests__/field-configs-iso59004.test.ts \
    src/lib/eval/__tests__/equations-iso59004.test.ts \
    src/components/worksheet/__tests__/register-iso59004-actions.test.tsx
 Test Files  4 passed (4)
      Tests  26 passed (26)
```

```
$ pnpm vitest run --project integration tests/harness/iso59004-verify.integration.test.ts
 Test Files  1 passed (1)
      Tests  14 passed (14)
```
(The harness drives the standard's single live BLOCK gate CR-015 both ways through the real `saveWorksheet` → `checkApprovalGate` chain. Nothing in this task touches that gate; the run is the regression proof.)

```
$ npx eslint <the 11 touched TS/TSX files>
(no output)   ESLINT_EXIT=0
```

```
$ npx tsx scripts/regulation-tables/verify-regulation-tables.ts iso59004 "<scratchpad>/iso59004.txt"
6/6 quotes verbatim
```

**Freshness pins.** All three migrations and all three rollbacks are asserted byte-equal to a fresh emit inside the tests, so a hand-edit or a stale file fails `pnpm test`.

---

## 11. Files

**Created**
- `src/lib/eval/regulation-tables-quotes-iso59004.ts` — 30 generated spans + `SENTENCE_5_3_2`
- `src/lib/eval/regulation-tables-seed-iso59004.ts` — `S5_2`, the watermark normaliser, the U-1 rationale
- `src/lib/eval/field-configs/iso59004.ts` — 20 entries + the withheld rules as exported data
- `src/lib/eval/equations/iso59004.ts` — 6 entries
- `src/lib/eval/field-configs/iso59004.prior.json`, `…text.prior.json` — read-only prod captures
- `src/lib/eval/__tests__/regulation-tables-seed-iso59004.test.ts` (7), `field-configs-iso59004.test.ts` (10), `equations-iso59004.test.ts` (7)
- `src/components/worksheet/__tests__/register-iso59004-actions.test.tsx` (2)
- `scripts/migrations/20260917102900_regulation_tables_seed_iso59004.sql` + rollback
- `scripts/migrations/20260917102910_field_configs_iso59004.sql` + rollback
- `scripts/migrations/20260917102920_equations_iso59004.sql` + rollback
- `scripts/verification/iso59004-STAGED-plan3-rulings.sql` — 528 lines, **100 % SQL comments** (verified: `grep -vnE "^(--|$)"` is empty), 31 blocks

**Modified (shared registries only)**
- `src/lib/eval/regulation-tables-seed-index.ts`, `src/lib/eval/field-configs/index.ts`, `src/lib/eval/equations/index.ts` — one line each
- `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` — 31 blocks appended
- `docs/superpowers/guideline-to-tool-playbook.md` — one new trap block (9 traps)

No other standard's files were touched (amendment G).

---

## 12. Honest residue

1. **The whole encoding rests on a DRAFT** (`iso59004-J-1`). If the owner rejects draft-sourcing, all three migrations and all 31 blocks fall together. This is the largest open item and it is deliberately the first block.
2. **Table 1 is not encoded** (`iso59004-U-1`). The R-strategy descriptions — genuinely useful text for an engineer choosing an action — are not available in the tool, and the action→category mapping the brief wanted is engineer judgment. The unblock path is a published-edition text layer.
3. **No completeness code over either checklist** (`iso59004-F-1` + `I-2` + `I-3`). The `principles` and `circularity_aspects` checklists are data-entry improvements only; nothing computes from them and no gate can read them per item. Three [CODE] items would close this (`carriers` in the production evaluator call, `AND` over calls, `contains` in the condition grammar) and they are the same three that block `din14021-F-1` and `iso14046-F-2`.
4. **23 of the 24 empty-condition requirements stay empty** (`iso59004-G-4`). That is the honest state of a vocabulary/principles guidance standard written almost entirely in "should" prose with exactly one "shall" in 62 pages — but it means most of this standard's compliance layer is advisory text, and the report says so rather than inventing enforcement.
5. **`feasibility_dimensions` is free text** (`iso59004-I-1`). The printed rule asks for an assessment against all six dimensions; the encoding can only offer the six as suggestions and a presence check.
6. **Cross-standard measurement is deferred** (`iso59004-X-1`). §7.6 hands measurement to ISO 59020, whose `TABLE3` IS seeded in this corpus — the two are not yet wired, and ISO 59010 (§7.4.4) is not in the library at all (NR, acquisition list).
7. **Nothing is applied.** Every migration is written-not-applied; the workflow metric for ISO-59004 is unchanged by this task, and the harness run above is a regression proof, not a claim that the new registers were driven through a deployed build.
