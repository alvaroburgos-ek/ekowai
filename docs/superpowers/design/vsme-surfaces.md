# VSME Front-End Surfaces — Design

Three surfaces for the VSME (Voluntary SME sustainability reporting) module of the
EKOWAI Wizard, plus one shared atom. All four render with **mock/static data** in this
task (no DB wiring). They reuse the existing house style: soft paper-toned cards
(`rounded-2xl border border-hairline bg-paper shadow-soft`), Poppins display headings,
tabular engineering numbers, hairline dividers, Lucide icons, brand green/blue accents.

## Design principles (matched to the existing Wizard)

- **Calm engineering aesthetic.** Light `--paper` backdrop, structure carried by
  hairlines (`--hairline`) rather than heavy shadows. No new colors are introduced —
  everything maps onto the existing token set.
- **Ownership is the organising idea.** The VSME story is "who is responsible for which
  data point": `ekowai_env` (EKOWAI produces it from its environmental engine),
  `client_supplied` (the customer must gather it), and `general` (shared / metadata).
  A single coloured pill — `OwnerBadge` — encodes this everywhere so the three
  surfaces read consistently.
- **Numbers are first-class.** tCO₂e figures, factor citations and progress counts use
  tabular numerals (`.num` / `tabular-nums`) so columns align like a datasheet.
- **Bilingual.** Every surface takes `locale: 'de' | 'en'`; German is the default prose
  language. Labels are chosen at render time from `labelDe` / `labelEn`.

## Colour mapping for ownership

| owner            | meaning                | token family                           | pill style                              |
|------------------|------------------------|----------------------------------------|-----------------------------------------|
| `ekowai_env`     | EKOWAI produces        | brand green (`--eko-green`/`--success`)| green text on `--success-soft`          |
| `client_supplied`| Customer must deliver  | accent blue (`--accent`)               | accent text on `--accent-soft`          |
| `general`        | Shared / metadata      | neutral (`--subtext`/`--paper-2`)      | subtext on `--paper-2`, hairline border |

---

## Surface 1 — Report Overview (`report-overview.tsx`)

A dashboard summarising the whole VSME report for a project.

```
┌──────────────────────────────────────────────────────────────────────┐
│  VSME-Bericht · Überblick                                              │
│                                                                        │
│  ┌───────────────┐  ┌───────────────┐ ┌───────────────┐ ┌──────────┐  │
│  │   �add ring     │  │ Scope 1       │ │ Scope 2 (loc) │ │ Gesamt   │  │
│  │     68 %       │  │ 12,40 tCO₂e   │ │  8,10 tCO₂e   │ │ 20,5 t   │  │
│  │ 34/50 Felder   │  └───────────────┘ └───────────────┘ └──────────┘  │
│  └───────────────┘                                                     │
│                                                                        │
│  Datenverantwortung                                                    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐          │
│  │ ●EKOWAI         │ │ ●Kunde liefert  │ │ ●Allgemein      │          │
│  │ 18/20 Felder    │ │ 11/22 Felder    │ │  5/8 Felder     │          │
│  │ ▓▓▓▓▓▓▓░ 90%    │ │ ▓▓▓▓░░░░ 50%    │ │ ▓▓▓▓▓▓░ 63%     │          │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘          │
└──────────────────────────────────────────────────────────────────────┘
```

- A **completion card** with an SVG progress ring showing `completionPct` and
  `filledFields / totalFields`.
- Three **emissions summary cards** — Scope 1, Scope 2 (location-based), Total —
  big tabular numbers, "tCO₂e" unit, small icon.
- An **ownership-split** row of three cards, one per owner, each with an `OwnerBadge`,
  `filled/total` count and a thin progress bar in the owner's colour.

## Surface 2 — Worklist (`worklist.tsx`)

The data-gathering surface: two ownership columns + a general section.

```
┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│ ●EKOWAI produziert      18/20 ▓▓▓ │ │ ●Kunde liefert         11/22 ▓░░ │
│ ────────────────────────────────  │ │ ────────────────────────────────  │
│ Energieverbrauch  ●EKOWAI  ✓ 1240 │ │ Mitarbeiterzahl  ●Kunde   ✓ 42    │
│ E_ges             kWh             │ │ N_emp                             │
│ Wasserentnahme    ●EKOWAI  ✓ 320  │ │ Frauenanteil     ●Kunde   ○ offen │
│ ...                               │ │ ...                               │
└──────────────────────────────────┘ └──────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│ ●Allgemein                                                    5/8 ▓▓░  │
│ Berichtsjahr      ●Allgemein   ✓ 2025      Rechtsform ●Allgemein ○ ... │
└──────────────────────────────────────────────────────────────────────┘
```

- Two side-by-side cards on desktop (stack on mobile): **EKOWAI produziert** (left,
  green header) and **Kunde liefert** (right, accent header). Each header shows a
  per-column progress count + thin bar.
- Each **row** = field symbol + label, an `OwnerBadge`, and a value/status:
  filled rows show a green check + the value; empty rows show a neutral "offen / open"
  status dot. Rows use hairline dividers (`divide-y divide-hairline`) like
  `reports-history.tsx`.
- A full-width **general** section below for `general`-owned fields, two columns inside.

## Surface 3 — CO₂ activity table (`co2-activity-table.tsx`)

The emissions calculation worksheet.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  THG-Aktivitäten                                       [ Neu berechnen ↻ ] │
│  Kategorie / Unterkat.   Menge    Einheit   Faktor (UBA)        tCO₂e       │
│  ──────────────────────────────────────────────────────────────────────── │
│  S1 Erdgas / Heizung     4.200    kWh       UBA-2024-NG-0182     0,84       │
│  S1 Diesel / Fuhrpark    1.100    l         UBA-2024-DSL-0091    2,95       │
│  S2 Strom / Netzbezug   18.500    kWh       UBA-2024-EL-LOC-22   7,38       │
│  ──────────────────────────────────────────────────────────────────────── │
│  Scope 1  3,79 t   ·   Scope 2 (loc) 7,38 t   ·   Gesamt 11,17 tCO₂e (3)   │
└──────────────────────────────────────────────────────────────────────────┘
```

- A **table** of activity lines: a scope chip (S1/S2), category / subcategory,
  amount + unit (tabular), the `factorUbaId` as a `.citation` provenance tag, and the
  computed `tCO₂e` right-aligned. Unsettled lines (`computedTco2e === null`) show "—".
- A **"Neu berechnen"** button (outline, RotateCw icon) — no-op in this task.
- A **footer** band summarising Scope 1, Scope 2 (location), and Total from `totals`,
  with the line count.
- On mobile the table scrolls horizontally (`overflow-x-auto scrollbar-hide`).

## Shared atom — `OwnerBadge` (`owner-badge.tsx`)

A small rounded pill (`text-[11px]`, dot + label) coloured per the table above. It is the
single source of truth for ownership colour/label and is consumed by all three surfaces.

## Prop contracts (frozen for later tasks)

```ts
OwnerBadge({ owner }: { owner: 'ekowai_env'|'client_supplied'|'general' }): JSX.Element

Worklist({ projectId, locale, fieldsByOwner }: {
  projectId: string; locale: 'de'|'en';
  fieldsByOwner: Record<string, Array<{
    fieldId:string; symbol:string; labelDe:string; labelEn:string|null;
    owner:string; dataType:string; valueText:string|null; valueNumber:string|null;
    hasValue:boolean;
  }>>;
}): JSX.Element

Co2ActivityTable({ projectId, worksheetInstanceId, locale, lines, totals }: {
  projectId:string; worksheetInstanceId:string; locale:'de'|'en';
  lines: Array<{ id:string; scope:string; category:string; subcategory:string|null;
    amount:string; unit:string; factorUbaId:string; computedTco2e:string|null }>;
  totals: { scope1:number; scope2Location:number; totalLocation:number; lineCount:number };
}): JSX.Element

ReportOverview({ projectId, locale, summary }: {
  projectId:string; locale:'de'|'en';
  summary: { totalFields:number; filledFields:number; completionPct:number;
    scope1:number; scope2Location:number; totalLocation:number;
    ownerSplit: Record<'ekowai_env'|'client_supplied'|'general', {total:number; filled:number}>;
  };
}): JSX.Element
```

All four components are `'use client'`. They render the props they are given and fall back
to inline mock data only when used standalone in a preview; later tasks (3–5) pass real
DB-derived data through the exact same prop shapes.
