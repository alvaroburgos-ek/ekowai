# Design — A138-07 single-source surfaces + Tabelle 9 coefficient picker

- **Date:** 2026-06-25
- **Standard:** DWA-A 138-1 (Oktober 2024)
- **Worksheets:** A138-07 (Flächenverzeichnis / Surface Inventory & Runoff Coefficients) is the
  single source for surface data (`a138-07-singlesrc`). A138-10 consumes it.
- **Status:** Approved (design). Next: implementation plan via writing-plans.

## Standing invariant (rationale — applies beyond this change)

This change is the reference implementation of a **codebase-wide invariant**, not a one-off:

1. **Single owner per datum.** Every coefficient, area, or derived value is owned and produced by
   exactly ONE worksheet — the one where the underlying data is entered. No value is entered or
   computed in two places.
2. **Inherit by reference, never re-enter or recompute.** Any worksheet that needs a value it does
   not own inherits it by reference from the owner (existing same-symbol / `consumer_worksheets`
   inheritance). It must never re-type it or run a second copy of the math.
3. **Blank with an upstream-cause when the source is not final.** A downstream-displayed derived
   value blanks out — showing *why* (source missing / source not final, with completeness) — rather
   than showing a stale or independently-recomputed number.
4. **Reference values come from the standard's tables via an accessor, never free-typed.** Tabular
   constants (e.g. Tab. 9 runoff coefficients) are read through a single accessor keyed to the
   standard + edition; engineers select a row, they do not free-type the constant. Deviations are an
   explicit, audited override that keeps the original tabular value visible.
5. **Mirror the standard's structure.** Equation cards, symbols, and clause references follow the
   guideline's own numbering (Gl. 2, Gl. 3, §5.3.3.5, Tab. 9) so the encoded form is traceable to
   the source.

Future features MUST be held to this line. (Supersedes/strengthens the earlier
"single-source derivation invariant" note.)

## Problem

Today A138-07's `surface_inventory` carrier holds the surfaces (free-typed `c_i`/`c_s`, coarse
hardcoded surface types) but **feeds no computation**. A138-10 has its own, always-empty
`sub_areas_A138_10` carrier whose Gl. 2 aggregator produces `A_C`. Result: duplicated surface entry,
no Tab. 9 enforcement, and `A_C`/`C_m` not actually derived from the single source.

## Decisions (locked with the user)

- **Derivation site:** `A_C` and `C_m` are **produced on A138-07** and inherited by reference into
  A138-10 (read-only, blanked-with-upstream-cause when A138-07 isn't final). `Q_zu` stays computed on
  A138-10 from inherited `A_C` + local `A_VA` + `r_D(n)`.
- **Retire `sub_areas_A138_10`** carrier and its Gl. 2 aggregator entirely (task 4). Exactly one Gl. 2
  computation (A138-07) and one editable surface table (A138-07's Flächenverzeichnis).
- **Tab. 9 storage:** a TS constant module behind a single accessor (`getTab9Entries()`,
  `lookupTab9(value)`), entries tagged `standard:'DWA-A 138-1', edition:'2024-10'`. When a
  `regulation_tables` DB table later lands, only the accessor body changes; no caller moves.
- **Row migration:** auto-map only explicit pairs + exact-coefficient matches; everything else is
  flagged for reselection with values preserved. Never silently change a stored `c_i`.

## §1 — Tab. 9 lookup module (`src/lib/eval/tab9.ts`)

```ts
type Tab9Entry = {
  value: string;        // stable key, e.g. 'schwarzdecke_asphalt'
  label: string;        // verbatim German label
  cm: number;           // C_m (= C_i, design event)
  cs: number;           // C_s (flood event)
  kind: 'paved' | 'unpaved';
  group: 1 | 2 | 3;
  standard: 'DWA-A 138-1';
  edition: '2024-10';
};
export function getTab9Entries(): readonly Tab9Entry[];
export function lookupTab9(value: string): Tab9Entry | undefined;
```

Callers (picker, C_s backfill, kind derivation, migration) use **only** the accessors — never the
array. Group 1 & 2 ⇒ `kind:'paved'`; Group 3 ⇒ `kind:'unpaved'`.

### Entries (verbatim, DWA-A 138-1:2024) — [key, label, C_m/C_i, C_s, kind, group]

Group 1 — Wasserundurchlässige Flächen (paved):
- `dach_schraeg_metall` — Dach Schrägdach – Metall/Glas/Schiefer/Faserzement — 0.9 / 1.0
- `dach_schraeg_ziegel` — Dach Schrägdach – Ziegel/Abdichtungsbahnen — 0.9 / 1.0
- `dach_flach_metall` — Dach Flachdach ≤3° – Metall/Glas/Faserzement — 0.9 / 1.0
- `dach_flach_abdichtung` — Dach Flachdach ≤3° – Abdichtungsbahnen — 0.9 / 1.0
- `dach_flach_kies` — Dach Flachdach ≤3° – Kiesschüttung — 0.8 / 0.8
- `gruendach_extensiv_steil` — Gründach – Extensivbegrünung >5° — 0.4 / 0.7
- `gruendach_intensiv` — Gründach – Intensivbegrünung ≥30cm ≤5° — 0.1 / 0.2
- `gruendach_extensiv_10` — Gründach – Extensivbegrünung ≥10cm ≤5° — 0.2 / 0.4
- `gruendach_extensiv_unter10` — Gründach – Extensivbegrünung <10cm — 0.3 / 0.5
- `beton` — Betonflächen — 0.9 / 1.0
- `schwarzdecke_asphalt` — Schwarzdecken (Asphalt) — 0.9 / 1.0
- `pflaster_fugenverguss` — Pflaster mit Fugenverguss / Fugendichtung — 0.8 / 1.0
- `gleis_feste_fahrbahn` — Oberirdische Gleisanlage, feste Fahrbahn — 0.9 / 1.0
- `rampe_zum_gebaeude` — Rampen mit Neigung zum Gebäude — 1.0 / 1.0
- `kunststoff_sportplatz` — Kunststoffflächen von Sportplätzen — 0.5 / 1.0

Group 2 — Teildurchlässige/schwach ableitende Flächen (paved):
- `betonsteinpflaster_sand` — Betonsteinpflaster in Sand/Schlacke, Platten — 0.7 / 0.9
- `pflaster_fuge_15` — Pflaster Fugenanteil >15% / fester Kiesbelag — 0.6 / 0.7
- `wassergebunden` — Wassergebundene Flächen — 0.7 / 0.9
- `kiesbelag_locker` — Lockerer Kiesbelag, Schotterrasen — 0.2 / 0.3
- `verbundstein_sickerfuge` — Verbundsteine mit Sickerfugen, Sicker-/Dränsteine — 0.25 / 0.4
- `rasengitter_verkehr` — Rasengittersteine mit häufiger Verkehrsbelastung — 0.2 / 0.4
- `rasengitter_ohne_verkehr` — Rasengittersteine ohne häufige Verkehrsbelastung — 0.1 / 0.2
- `gleis_schotter_durchlaessig` — Gleisanlage Schotterbau, durchlässiger Unterbau — 0.1 / 0.2
- `gleis_schotter_schwach` — Gleisanlage Schotterbau, schwach durchl. Unterbau — 0.4 / 0.6
- `sport_draen_kunststoff` — Sportfläche Dränung – Kunststoff/Kunststoffrasen — 0.1 / 0.1
- `sport_draen_tenne` — Sportfläche Dränung – Tenne (Hart/Asche/Schlacke) — 0.3 / 0.3
- `sport_draen_rasen` — Sportfläche Dränung – Rasenfläche — 0.1 / 0.1

Group 3 — Durchlässige Flächen (unpaved):
- `park_flach` — Parkanlagen/Rasen/Gärten – flaches Gelände — 0.1 / 0.2
- `park_steil` — Parkanlagen/Rasen/Gärten – steiles Gelände — 0.2 / 0.3
- `wasserflaeche_eingestaut` — Dauerhaft eingestaute Wasserflächen — 1.0 / 1.0

(30 entries total.)

## §2 — Surface row shape + normalizer

```ts
type SurfaceRow = {
  id: string;
  label: string;
  tab9_value: string | null;   // selected Tab.9 key; null ⇒ "neu wählen"
  area_m2: number | null;
  c_i: number | null;          // effective design coeff
  c_s: number | null;          // effective flood coeff
  coeff_override: boolean;      // true ⇒ "abweichend gewählt"
};
type SurfaceInventoryCarrier = { rows: SurfaceRow[] };
```

**Derived, never stored** (single-source invariant):
- `kind` = `lookupTab9(tab9_value)?.kind`
- original Tab. 9 pair (audit) = `lookupTab9(tab9_value)?.{cm,cs}`
- `mismatch` = `tab9_value != null && c_i !== lookupTab9(tab9_value)?.cm`
- row `complete` = `area_m2 != null && tab9_value != null && c_i != null && c_s != null`

`normalizeSurfaceCarrier(raw): SurfaceInventoryCarrier` — used by **both** the editor and the engine
(single shared parse/migration path; they can never diverge). Idempotent; runs lazily on load and
persists on next save:
- old `surface_type:'asphalt'` → `tab9_value:'schwarzdecke_asphalt'`; old `'rasen'` → `'park_flach'`.
- backfill `c_s` from the matched entry only when stored `c_s` is null.
- if stored `c_i` ≠ matched `cm` → set `coeff_override:true` (keep stored `c_i`; the Tab. 9 pair stays
  visible for confirmation). Never overwrite a stored `c_i`.
- any old row whose `(c_i,c_s)` **uniquely** matches exactly one entry's `(cm,cs)` → map to that entry.
  If the pair matches **more than one** entry (e.g. `0.9/1.0` matches ~6 entries) it is **ambiguous**
  → it does NOT auto-map; it drops to reselection (next bullet).
- otherwise — unmapped type (`dach`, `pflaster`, `pflaster_offen`, `kies`, `sonstige`, …) **or**
  an ambiguous coefficient pair: `tab9_value:null`, `coeff_override:false`, **keep** `c_i`/`c_s`;
  the row renders the badge "⚠ Oberflächentyp neu wählen (Tab. 9)" and is **not** complete.
- rows already in the new shape pass through unchanged.

**Migration is coefficient-preserving and Final-preserving for clean rows.** A clean migration
(explicit label map, or unique exact-coefficient match) never changes a stored `c_i`, so each cleanly
migrated row's `A·C_i` contribution — and therefore `A_C` and the worksheet's Final status — is
**unchanged**. Only rows whose type is unmappable/ambiguous go incomplete. In the live PLT-HS-01
data this means exactly **one** row legitimately drops: `Gewächshausdach` (old generic `dach`,
0.9/1.0 → ambiguous), which goes to "Oberflächentyp neu wählen". `Parkplatz` (`asphalt`→Schwarzdecken,
clean) and `Testfläche` (`rasen`→Parkanlagen-flach, C_s backfilled) migrate clean and complete. While
`Gewächshausdach` is unresolved, A138-07 is **not Final** and `A_C` excludes it; once the engineer
reselects its precise 0.9/1.0 roof type, the two-surface baseline `A_C = 4826.43`, `C_m = 0.9` holds
unchanged (no coefficient was ever silently altered).

## §3 — A138-07 editor (the picker)

`SurfaceInventoryEditor` columns: Bezeichnung · **Oberflächentyp** · A (m²) · C_i · C_s · A·C_i · 🗑.
- Oberflächentyp is a grouped `<select>` (optgroup per Tab. 9 group) sourced from `getTab9Entries()`.
- Selecting a type auto-fills `c_i=cm`, `c_s=cs` and renders **C_i and C_s read-only**.
- Per-row "abweichend wählen" toggle (§5.3.3.5 permits adjusting C for permeable surfaces by soil
  permeability/slope): makes C_i/C_s editable, sets `coeff_override:true`, tags the row
  "engineer-adjusted", and shows the original Tab. 9 pair inline ("Tab. 9: 0.9 / 1.0") for audit.
  **The override edits `c_i`/`c_s` ONLY — it never changes `tab9_value` or the derived `kind`.**
  The selected Oberflächentyp (and thus its group/`kind`) is fixed by the picker; deviation adjusts
  the coefficient pair against that fixed type, so `kind` and the audited Tab. 9 baseline stay intact.
- A complete row cannot have C_s blank.
- `kind` badge (befestigt/unbefestigt) is shown, derived, never an input.
- Footer: Σ Fläche · A_C-Vorschau · A_E,b,a / A_E,nb,a preview · `n/m Zeilen vollständig`.

## §4 — Derivation produced on A138-07

A single shared helper is the only place the sums live:
```ts
summarizeSurfaces(carrier): {
  A_C: number | null;          // Σ(area·c_i) over complete rows  (Gl. 2 — math unchanged)
  A_C_sealed: number | null;   // Σ(area·c_i) where kind==='paved'   (Gl. 2 split — Σ befestigt)
  A_C_unsealed: number | null; // Σ(area·c_i) where kind==='unpaved' (Gl. 2 split — Σ unbefestigt)
  A_E_ba: number | null;       // Σ area where kind==='paved'
  A_E_nba: number | null;      // Σ area where kind==='unpaved'
  C_m: number | null;          // A_C / Σarea (complete rows); null when Σarea==0
  complete: number; total: number;
}
```
Invariant: `A_C === A_C_sealed + A_C_unsealed`.

**Produced on A138-07** as persisted fields, each via one registered equation that delegates to
`summarizeSurfaces` (mirrors today's `sub_areas` aggregator path):
- `A_C` (Gl. 2), `A_E,b,a (total)`, `A_E,nb,a (total)`, `C_m`.

The split sums `A_C_sealed` / `A_C_unsealed` are **card-display** values surfaced in the A138-07 Gl. 2
substituted map ("Σ befestigt" / "Σ unbefestigt") — derived by the same helper (single source), not
separately persisted. A138-10 shows them read-only via the inherited Gl. 2 card.

Engine change: add a `surfaceInventory` aggregator path keyed to the A138-07 equation ids, reading
the `surface_inventory` carrier via `normalizeSurfaceCarrier`. One equation → one output (existing
write-back).

**DB reality (verified 2026-06-25) — this is a consolidation, not a greenfield seed:**
- A138-07 **already** has Gl. 2 → `A_C_preliminary` (eq `b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0`,
  input `surface_inventory`), but it is **not** in `FORMULA_ENGINE_WHITELIST`, so it never computes.
  This is the documented "A_C produced twice" violation. We **repurpose** it to output the canonical
  `A_C` (retiring `A_C_preliminary`).
- A138-10 **already** has Gl. 2→`A_C` (`1a48af79…`, whitelisted, but its aggregator wrongly reads the
  empty `sub_areas_A138_10`), Gl. 2a→`A_C_sealed` (`d1a38110…0001`), Gl. 2b→`A_C_unsealed`
  (`…0002`), Gl. 2c→`C_m` (`…0003`), Gl. 3→`Q_zu` (`b39dda00…`). Only Gl. 2 is whitelisted; 2a/2b/2c
  never compute today.
- New fields needed on A138-07: `A_C`, `C_m`, `A_E_ba`, `A_E_nba` (symbols), each with a one-output
  equation delegating to `summarizeSurfaces`. Seeded via a `supabase/migrations/` SQL file
  (consistent with existing `_fix-138` / pass4-overlay practice).

## §5 — A138-10 becomes a pure consumer

- A138-07 becomes the **sole producer** of `A_C` and `C_m`. Its `A_C`/`C_m` fields declare
  `consumer_worksheets` covering **every** current `A_C` consumer (the 9 worksheets A138-10, -13, -16,
  -17, -18, -19, -20, -21, -22, -26 — the full set today held on A138-10's `A_C` field), so no
  downstream sheet loses its source.
- A138-10's `A_C`/`C_m` production is **retired** so the symbols are produced once (else `A_C` is
  ambiguous → blanks everywhere): remove `A138-10:2` from the whitelist, deactivate A138-10's Gl. 2/2a/
  2b/2c equations, drop the `A138_10_GL2_ID` aggregator path, and retire `sub_areas_A138_10`
  (`active=false`, `SubAreasEditor` removed). (= task 4)
- A138-10 inherits `A_C`/`C_m` **by reference** (existing inherited-fields path), read-only, in
  "Vorgelagerte Werte". The Flächenverzeichnis is **mirrored read-only** on A138-10.
- `A_C_sealed`/`A_C_unsealed` move to A138-07's Gl. 2 card display (Σ befestigt/unbefestigt) via
  `summarizeSurfaces`.
- `Q_zu` stays computed on A138-10 from inherited `A_C` + local `A_VA` + `r_D(n)` — math unchanged.

**Cross-worksheet delivery depends on the engine-output-materialization gap.** For the 9 consumers to
actually read A138-07's `A_C`, the derived value must persist (today engine outputs are in-memory
only). Closing that gap for `A_C`/`C_m` is part of Plan 3.

## Implementation decomposition (3 sequential plans)

Full consolidation is split into independently-testable plans:
- **Plan 1 — Foundation (no DB/engine):** `tab9.ts` accessor module, `SurfaceRow` shape +
  `normalizeSurfaceCarrier` (migration), and the A138-07 `SurfaceInventoryEditor` picker (override,
  derived kind, footer totals). Pure client + pure functions; fully unit-testable.
- **Plan 2 — A138-07 production + A138-10 consumer:** `summarizeSurfaces` helper, `surfaceInventory`
  aggregator wired to A138-07's Gl. 2 (output → `A_C`), new A138-07 fields/equations (`C_m`,
  `A_E_ba`, `A_E_nba`) via migration, whitelist updates, retire A138-10 Gl. 2/2a/2b/2c + `sub_areas`,
  A138-10 read-only mirror + inherited values + the 3-state upstream-cause message.
- **Plan 3 — Consumer re-pointing + materialization:** re-point the 9 `A_C` consumers to A138-07,
  persist derived `A_C`/`C_m` (engine-output-materialization) so downstream reads resolve.

## §6 — Upstream-cause message (3 states)

`surfaceSourceState(carrier, sourceInstanceStatus): 'missing' | 'incomplete' | 'ok'`, consumed by
A138-10's inherited `A_C`, `A_C_sealed`, `A_C_unsealed`, `C_m`, `Q_zu` and the Gl. 2/2a/2b/2c/3 cards
— replacing the generic "Keine Teilflächen erfasst.":
- `missing` (no carrier / zero rows): "Quelle A138-07 nicht erfasst — abgeleitete Werte ausgeblendet."
- `incomplete` (rows exist but not all complete, **or** source instance status is `draft`):
  "Quelle A138-07 nicht final (n/m Zeilen vollständig) — abgeleitete Werte ausgeblendet."
- `ok`: value renders.

**"Not final" rule:** source is `ok` only when every row is complete **and** the A138-07 instance
status is `engineer_approved` or `final`. Editing/reopening A138-07 returns it to `draft`, which flips
A138-10 to the `incomplete` message (matches the acceptance criterion). A138-10's page loads the
A138-07 instance status for this check.

## §7 — Tests (TDD), mapped to acceptance criteria

- `tab9.ts`: all 30 entries present; `kind` correct by group; `lookupTab9` round-trips; the two
  migration anchors (`schwarzdecke_asphalt` 0.9/1.0, `park_flach` 0.1/0.2) exist.
- `normalizeSurfaceCarrier`:
  - explicit label maps: `asphalt`→Schwarzdecken (clean, complete); `rasen`→Parkanlagen-flach with
    C_s backfilled 0.2 (clean, complete);
  - **unique** exact-coefficient match → auto-maps; **ambiguous** pair (e.g. `0.9/1.0`, ~6 entries)
    → does NOT auto-map, drops to reselection;
  - unmapped type `dach` 0.9/1.0 → reselection (`tab9_value:null`, `c_i`/`c_s` preserved, not complete);
  - never mutates a stored `c_i`; idempotent on already-new rows.
- override: setting `coeff_override` edits `c_i`/`c_s` only; `tab9_value` and derived `kind` unchanged.
- `summarizeSurfaces`: Gewächshausdach 3786.8/0.9 + Parkplatz 1575.9/0.9 (both cleanly typed) → A_C
  4826.43, C_m 0.9, A_E,b,a 5362.7, A_E,nb,a 0; test row `park_flach` A=100 → c_i 0.1, c_s 0.2,
  kind unpaved, A·C_i 10, row complete.
- Engine: A138-07 produces A_C/C_m/A_E,b,a/A_E,nb,a; A138-10 inherits A_C/C_m; blanks with the right
  cause when A138-07 is draft or has incomplete rows.
- A138-10 renders no editable sub-area input; Flächenverzeichnis is read-only there.
- Migration regression (clean rows preserve A_C): a dataset of only clean exact/label-mapped rows
  migrates with **no** coefficient change and stays Final — A_C unchanged.
- Live PLT-HS-01 migration: exactly one row (`Gewächshausdach`, ambiguous `dach`) drops to
  reselection → A138-07 not Final, A_C excludes it; after reselecting a 0.9/1.0 roof type the
  two-surface baseline A_C 4826.43 / C_m 0.9 holds.

## Out of scope

- The `regulation_tables` DB table (deferred; the accessor seam is the forward hook).
- Changing the verified `A_C = Σ(A_E,i · C_i)` math.
- `Q_zu` math itself (only its source for `A_C` changes to the inherited value).
