# Inventory brief (read-only task; write ONLY into the scratchpad inventory folder)

Context: EKOWAI-Wizard (Next.js + Supabase) renders one worksheet per guideline chapter. Today most fields are generic single inputs. The owner wants every guideline to follow the DWA-A-138-1 surface-inventory pattern: (a) the engineer SELECTS a category and the dependent values are FILLED from the guideline's own table (with an audited override), (b) groups of fields that describe "one of N things" (areas, systems, tanks, filters, sampling points, plants, cost items…) become REPEATABLE rows with a "+" and aggregated totals, (c) later fields/values depend on EARLIER selections (conditional visibility, which table applies, class-dependent limits), (d) derived values are computed by registered equations and inherited by downstream worksheets, never re-typed.

Inputs available:
- Prod field dump per standard: /c/Users/Ekowai/AppData/Local/Temp/claude/C--Users-Ekowai/b0ed49d0-b781-438c-ae8a-cce3fbf91b7e/scratchpad/std/<CODE>.json — {standard, worksheets[{code,title_de,fields[{symbol,label_de,data_type,unit,enum_values,validation_rules,clause_reference,description,consumer_worksheets,default_value,verification_quote,section_code}],equations[],requirements[{requirement_code,condition,severity,clause_reference,description}]}]}
- Guideline transcripts (markdown, verbatim source; SR-1 rule: table values are quoted from here, never invented):
  - C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\*.md
  - C:\Users\Ekowai\Desktop\Guidelines\<CODE>\*.md
  - C:\Users\Ekowai\Desktop\Batch guidelines 01072026\, C:\Users\Ekowai\Desktop\Batch guidelines 21082126\, C:\Users\Ekowai\Desktop\FLL Guidelines PDF\
  - Obsidian vault C:\Users\Ekowai\Obsidian\SecondBrain\ has per-standard reasoning maps (search for a folder named reasoning-maps) — useful for structure, but transcripts win for values.
  Use Grep/Glob to find the transcript for each code; if none exists, say so and classify from the prod dump only (descriptions/verification_quote often quote tables).

For EACH standard in your group, write /c/Users/Ekowai/AppData/Local/Temp/claude/C--Users-Ekowai/b0ed49d0-b781-438c-ae8a-cce3fbf91b7e/scratchpad/inventory/<CODE>.md with EXACTLY these sections:

## 0. Sources used
transcript path(s) or "NO TRANSCRIPT"; worksheet count; field count.

## 1. Table-lookup candidates (category → predetermined values)
One row per candidate: | worksheet | selector field (symbol, current data_type, enum_values present?) | dependent fields filled (symbols) | guideline table ref (e.g. "Tab. 3 §5.2") | override allowed per guideline? (quote) | table contents available in transcript? (yes: quote the table verbatim in a fenced block, max ~30 rows; no: "VALUES NOT IN TRANSCRIPT") |
Also list tables in the transcript that give values by class but have NO selector field in prod yet (missing-field gaps).

## 2. Repeatable-group candidates (one of N)
One row per group: | worksheet | the thing (e.g. "Teilfläche", "Behälter", "Messstelle") | member fields (symbols) | how currently modelled (single scalar / _1 _2 suffixes / count field / json) | aggregation needed (sum/max/min/weighted/none) + consumer symbols |

## 3. Conditional dependencies (value or visibility depends on earlier input)
One row per dependency: | worksheet | driver field | affected field(s) | rule in words + verbatim guideline quote | currently encoded? (requirement condition text / equation / nothing) |

## 4. Derived values (equations) + inheritance
List equations (number → output symbol ← inputs) and, for each output, whether any other worksheet consumes it (consumer_worksheets or same symbol elsewhere). Flag re-typed duplicates (same physical quantity entered twice).

## 5. Summary
Counts: table-lookup candidates / repeatable groups / conditionals / equations. Then the TOP 5 UX wins for this standard, each one sentence, ordered by engineer time saved. Then any data-quality gaps you noticed (enum_values missing, table values absent from prod, unit inconsistencies).

Rules: be factual; every table value quoted verbatim from a transcript with the file name; never invent numbers; if unsure whether a table is normative or informative, quote the wording. Keep each file under ~2500 words. Do not modify any repo file. When done, reply with a 10-line summary per standard (counts + top win).
