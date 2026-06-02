# `data/norm-text/`

Raw markdown of the DWA standards, used by the split-view norm-text reader
(`<NormTextPane>` / `getNormSection`). Each file is a pandoc/LaTeX dump where
headings appear as `\section*{N Title}`, `\subsection*{N.M Title}` etc.

The mapping from `standards.code` (DB) → in-repo filename lives in
`src/lib/norm-text/source-map.ts`. When a new standard's markdown is added
here, register it in `NORM_TEXT_SOURCE_MAP` so the reader picks it up.

## Provenance

| In-repo file        | Source                                                      | Drop date  |
| ------------------- | ----------------------------------------------------------- | ---------- |
| `DWA-A-138-1.md`    | `~/Desktop/Guidelines/DWA-A-138-1/DWA-A_138-1_WD (5).md`    | 2026-05-31 |

These are the same source files referenced by the audit campaign in
`audit-reports/DWA-A-138-1/` (28 worksheet reports). They were re-dropped here
so the reader can resolve `clause_reference` chips (e.g. `§5.3.3.5`) to the
exact normative text without requiring engineers to keep the original PDFs
open in a second window.

## Read-only

Never edit these files by hand. If the upstream source updates, re-drop
the file from Nacho's `~/Desktop/Guidelines/` folder. Drift here vs the
upstream source would silently mislead engineers about what the standard
actually says.
