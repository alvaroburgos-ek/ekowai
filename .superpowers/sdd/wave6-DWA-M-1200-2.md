# Wave-6 — DWA-M-1200-2 (Wasserwiederverwendung Teil 2, GELBDRUCK Juli 2025) — audit complete

**Ledger header** — model `claude-fable-5` · effort max · 2026-07-28 · run `wf_251c1479-b7f`
(9 agents, 691k tokens) · **read-only, 0 prod writes** · DRAFT DOCTRINE: fixes STAGED for
the Weißdruck. Full structured results: `tasks/wzpxkig89.output` + journal.
Standard `89c47ec6-...` — 19 ws / 84 fields / 4 eq / 15 CRs / 130 table rows · SOURCE 100pp.

## Offset = 0, high confidence (11 footers across 100pp + TOC cross-check). Body PDF 10.

## Tables — VERIFIED strong (the good news)
130 rows cover all 8 numbered printed tables (Tab.1-6, B.1, B.2) + §8.2 inline cost list.
**50+ cells spot-checked cell-by-cell, safety-critical log-reduction tables prioritised (T3
Leistungsziele, TB1 documented-plant p61, TB2 indicative p72-73) — ALL FAITHFUL.** No
M-187-style schema-broken rows. **One missing table: E.1** (Anhang E reference plant, p85)
— but it is explicitly provisional ("wird im Weißdruck ergänzt"), so low priority.

## The findings — enforcement + engine layer, all STAGED
1. **F1 SEV-1 SAFETY — Tabelle 3 quality LIMITS are not enforced.** REQ-02, the only CR on
   them, has a **prose condition** ("alle Parameter <= Klassen-Grenzwert", parse-dead) AND
   **severity=warn** (never blocks). The measured fields (E.coli, Legionella, …) are never
   compared to the stored T3 limits by an enforcing gate. The values are captured and
   faithful; nothing gates them. For a *water-reuse* standard this is the core defect.
2. **F2 SEV-1 ENGINE — 3 of 4 equations engine-dead.** Gl.1 `log10(C_Zulauf/C_Ablauf)` (the
   standard's **core log-reduction formula**), Gl.C.2-2 `median()`, Gl.C.2-3 `log10()` all
   use functions outside `{min,max}` → manual_required by design. Only the linear
   10th-percentile eq (C.2-1) runs. Same engine-capability class tracked corpus-wide.
3. **F3 SEV-1 — §3.3.3 acceptance rule incomplete.** REQ-05 checks only `probenanzahl>=16`;
   the safety-critical **15-of-16 (Klasse A) / 8-of-16 binomial pass rule** with 1,0/2,0-log
   tolerances is not encoded. REQ-05 also mis-cites clause 3.3.4.
4. **F4 SEV-2 OVER-STRICT — REQ-07 rejects compliant designs.** Blocks unless
   `probennahme_typ==mischprobe_24h`, but §3.3.4 only *"bevorzugt"* 24h-Mischproben and
   explicitly permits Stichproben alternatives.
5. **F5 — grammar/collision risks:** REQ-06 chains two IF..THEN in one condition
   (vacuous-pass risk); unquoted enum literals; `log10_reduktion`/`perzentil_10_log10` exist
   as **both field and equation output** (multi-producer collision candidate — engine probe
   owed at the Weißdruck wave); change-triggers/Störfallpläne/Monte-Carlo ungated.

## Verdict
**Table/data layer is the strongest of any standard this campaign — 50+ safety-critical
cells verified faithful, zero schema breaks.** But **NOT ready-to-use as a compliance gate**:
the quality limits and the binomial acceptance rule — the two things that make water-reuse
*safe* — are not enforced. Every repair is one Weißdruck signature away.

## Seven-element status (draft)
Bidirectional walk ✅ · equations ✅ (4/4, engine-deadness proven) · tables ✅ verified
(strongest yet) · gates both-ways ✅ · fixes STAGED (draft) · map write-back owed at
Weißdruck wave · deployed harness — shared backlog.
