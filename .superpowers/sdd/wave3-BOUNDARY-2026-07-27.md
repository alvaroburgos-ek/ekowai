# WAVE BOUNDARY — 2026-07-27

Model `claude-opus-5` · CLI `2.1.218` · effort high/max · branch `feat/fll-revision`
· prod `vadsmshzebefjreqcicl`.

## A-178 equation sweep (16-agent workflow, adversarial refute stage, 848k subagent tokens)

Closed my own admitted residue that only 3 of 13 equations had been checked against the page.
**All 13 verified symbol-by-symbol against the rendered PDF.**

- **11 FAITHFUL** · **1 refuted away** (Gl.3) · **1 STANDARD-DEFECT** (Gl.13)
- **0 SOURCE-SETTLED FIXES.** A-178 has no source-settled defect at the equation layer.
  Nothing was applied. Under the zero-interpretation test that is the correct outcome, not a
  failure to find work.

### Three reversals of my own Wave-3 findings — all toward MORE severe

**R1 — F-2's mechanism was wrong.** `SUM_over_i` throwing is *specified intent*:
`arithmetic.ts` header, its own test at `arithmetic.test.ts:45`, and
`engine-eligibility.ts` `SURVIVING_FN_CALL`. `formula.ts:232-250` catches the throw by name
and returns `kind:'manual_required'` — an actionable badge, by design. Gl.3's claimed
ENCODING-DEFECT was refuted on exactly this basis.

**R2 — F-2's conclusion was wrong, and understated the damage.** I wrote that the chain
"degrades to hand-entry rather than an outage". It does not. `B_RBF_zu` **cannot be typed
in**: `computeComputedSymbols` marks it `isComputed`, `dynamic-field.tsx:288` locks the
input, and `use-equation-engine.ts:524-541` sets the field to `null` on every render.
Proven by driving the real hook — entering `B_RBF_zu=2000` left the store at
`{"type":"number","value":null}`. Same lock hits `A_F`, `Q_Dr_RBF`, `b_F`, `eta_F`.

**R3 — F-4 (multi-producer) is the ACTUAL root blocker, and it is FAITHFUL encoding.**
The standard genuinely prints configuration alternates — Gl.2 Trennsystem / Gl.3 Mischsystem
(printed p.27), Gl.5 Fangfilterbecken / Gl.6 Durchlauffilterbecken / Gl.7 mit
Regenrückhaltelamelle (p.29-30) — and **the selector data is already encoded**
(`system_type` on A178-02, `becken_typ` + `rrl_vorhanden` on A178-07). What is missing is an
*engine mechanism* to pick a variant, which makes it a RULING, not a source-settled fix.
Proven: Gl.5/6/7 all return `mehrere aktive Produzenten für b_F`; a single-writer control
with the identical formula and inputs computed `1.28`.

> **Consequence that reframes the repair strategy:** `SUM_over_i` and `VQ_DR_RBF_zu` are each
> *sufficient* blockers but **neither is necessary**. Fixing either alone changes nothing.
> A findings list, unexecuted, could never have told us this.

## WORKFLOW METRIC — A-178, first ever measured

**14 of 19 worksheets runnable today · 5 blocked.** The blocked five are the design spine:
**A178-09** (`B_RBF_zu`) → **A178-10** (`A_F`) → **A178-11** (`Q_Dr_RBF`), plus **A178-13**
(`b_F`) and **A178-15** (`eta_F`). Only three equations actually compute in prod: Gl.8
(`C_RBFA_zu`), Gl.11 (`B_RBFA_ab`), Gl.12 (`eta_RBF_hyd`).

New findings from the metric run:
- **A178-14 silent trap.** `B_RRL` is `is_required=false` but Gl.11 needs it. Blank →
  `manual_required` → required output `B_RBFA_ab` stays empty → approval blocked. The
  engineer must enter `B_RRL = 0` when there is no Regenrückhaltelamelle.
- **Display/enforcement asymmetry (new defect class).** On A178-12 seven `block` CRs render
  pending (○) in the form — `compliance-block.tsx` builds its lookup from own+inherited
  fields only — while the server gate resolves them via a project-wide fallback
  (`approval-gate.ts:169-205`). Display and enforcement disagree.
- **`pending` never blocks approval.** REQ-19 sits pending forever; what actually stops
  approval on A178-13 is `b_F` being required with no value.

## Map write-back applied retroactively

**51 nodes stamped** — `provenance` lifted to VA (earned: a PDF page now backs them),
`provenance_date`, `verification_method: re-executed`, `source_page` from the migration's own
anchor, and a `fixed::` entry. Manifest is read from the **database**
(`dump-fix-manifest.mjs`), never from a chat transcript.

**Idempotency bug caught by re-running, not by exit code.** The first guard looked for
`fixed:: <ref>` while the written shape backticks the ref after the date — so it never
matched and silently appended a duplicate on every re-run. Found by re-running and reading
the node. De-duplicated 51 lines across 51 nodes, fixed the guard, re-verified:
`updated 0, already-stamped 51`. **Second time this session a wrong guard looked exactly
like a satisfied one** (the `LIKE`-escape no-op was the first). Verify effects, never exit
codes.

**30 of 81 fixes have no map node — all of DIN-14021** (17 map nodes for 50 CRs). Reported,
never silently dropped; it is the `2.cr-db-has-node` orphan class (1274 corpus-wide).

## Corpus state

`TOTAL 3978 · ERRORS 3345 · WARNINGS 1033` · rule 10a = **0** · rule 10b = **4**.
Sign-off sheet: **39 open** (vault `reasoning-maps/_RATIFICATION-BATCH.md`).

## RESUME POINTER — next session starts here

1. **A178-D8** — backfill 6 NULL-quote CRs (REQ-07/14/17/19/20/22). Printed forms for
   Gl.1/9/10 are transcribed in the workflow journal; §5.2.4 already sliced. PRE-AUTHORIZED.
2. **New validator rule** for the display/enforcement asymmetry class (cycle rule 1), then
   re-run corpus-wide. `[CODE]`, PRE-AUTHORIZED.
3. **Build DIN-14021's missing CR nodes** (30 of 50 absent) so its fixes can be written back.
4. **Then DWA-M-102-4** (2 live errors) — re-rank on live errors first.

**A-178 is NOT closed.** Its 9 judgment items are on the sheet; its 5 blocked worksheets need
**E-D2** (SUM representation) and **E-D4** (multi-producer selector) — both engine-mechanism
rulings, both owner-only.
