#!/usr/bin/env node
/**
 * Convert the double-verified DWA-M-102-4 table transcriptions (workflow wf_58c8546a-9f0)
 * into a regulation_tables migration — deterministically, from the verified JSON.
 *
 * No hand re-typing: a third transcription would reintroduce the error channel the
 * double-transcription just closed. This script only RESHAPES cells that two independent
 * agents read identically from the rendered pages.
 *
 * Pipe-pack per pattern-rules.md: `|` delimiter, dimension and value order-aligned, axis
 * names from the guideline's own headers, one row per composite-key × cell. Blank printed
 * cells are materialized explicitly (value_text = '') — silent omission would make "no
 * value printed" indistinguishable from "row never captured".
 *
 * Keying below is REPRESENTATION (which printed columns are axes), read directly off each
 * header — not physics. Wiring these rows into fields/equations is ruling G-D1 and is NOT
 * done here; nothing in the product reads these rows for this standard yet, so applying
 * them changes no computed value and no enforcement behaviour.
 *
 * Usage: node scripts/m1024-tables-to-sql.mjs <workflow-output.json> > migration.sql
 */
import { readFileSync } from 'node:fs';

const raw = readFileSync(process.argv[2], 'utf8').replace(/^﻿/, '');
// The task output file wraps the JSON result; find the outermost object.
const start = raw.indexOf('{');
const doc = JSON.parse(raw.slice(start));
const result = doc.result ?? doc; // tolerate either shape
const full = (result.full ?? doc.full);
if (!Array.isArray(full)) throw new Error('no `full` array found in workflow output');

// Per-table representation config, read off the printed headers:
//   keyCols  = indices of axis columns (forward-filled when vertically merged in print,
//              per each transcription's own merged-cell notes)
//   groupBands = rows whose value cells are all blank act as a group axis (A.4 style)
const CFG = {
  'A.1': { keys: [0, 1], ffill: [0], clause: 'Anhang A, Tabelle A.1 (PDF p.29 = gedruckt S.27)' },
  'A.4': { keys: [0], groupBands: true, clause: 'Anhang A.4, Begrünungsfaktor-Tabelle, unnummeriert (PDF p.31 = gedruckt S.29)' },
  'B.1': { keys: [0, 1], ffill: [0], clause: 'Anhang B, Tabelle B.1 (PDF p.35 = gedruckt S.33)' },
  'C.3': { keys: [0, 1], ffill: [0], clause: 'Anhang C, Tabelle C.3 (PDF p.43-44 = gedruckt S.41-42)' },
  'C.4': { keys: [0], clause: 'Anhang C, Tabelle C.4 (PDF p.45 = gedruckt S.43)' },
  'C.5': { keys: [0], clause: 'Anhang C, Tabelle C.5 (PDF p.46 = gedruckt S.44)' },
  'C.6': { keys: [0], clause: 'Anhang C, Tabelle C.6 (PDF p.47 = gedruckt S.45); Zellgeometrie mit vertikal verbundenen Zellen — siehe Migrationskopf', noFfillValues: true },
  'C.7': { keys: [0, 1], ffill: [0], clause: 'Anhang C.5, Tabelle C.7 (PDF p.48 = gedruckt S.46)' },
};

const esc = (s) => String(s).replace(/'/g, "''");
const numRe = /^-?\d+(,\d+)?$/;
// A pack SEGMENT may not contain the pack delimiter. The transcribers flattened
// multi-row headers with " | ", so segments would otherwise embed pipes and make the
// pack ambiguous. Em-dash inside segments, bare pipe only between segments.
const seg = (s) => String(s).replace(/\s*\|\s*/g, ' — ');

const values = [];
let skippedTables = [];

for (const entry of full) {
  const t = entry.table;
  const cfg = CFG[t];
  const tr = entry.transcription;
  const ver = entry.verification;
  if (!cfg) { skippedTables.push(t + ' (no config)'); continue; }
  if (!tr.complete || !ver || !ver.match) { skippedTables.push(t + ' (not verified clean)'); continue; }

  const cols = tr.columns;
  const keyIdx = cfg.keys;
  const valIdx = cols.map((_, i) => i).filter((i) => !keyIdx.includes(i));
  const dimNames = keyIdx.map((i) => cols[i]);
  if (cfg.groupBands) dimNames.unshift('Gruppe');

  // forward-fill state for vertically merged key columns
  const ffill = {};
  let group = '';
  let rowNo = 0;

  for (const row of tr.rows) {
    // group band: a row whose every value cell is blank AND whose key cell is non-empty
    if (cfg.groupBands && valIdx.every((i) => (row[i] ?? '') === '')) {
      group = row[keyIdx[0]];
      continue;
    }
    for (const i of (cfg.ffill ?? [])) {
      if ((row[i] ?? '') !== '') ffill[i] = row[i];
    }
    rowNo++;
    const keyVals = keyIdx.map((i) => ((row[i] ?? '') !== '' ? row[i] : (ffill[i] ?? '')));
    if (cfg.groupBands) keyVals.unshift(group);

    for (const vi of valIdx) {
      const cell = row[vi] ?? '';
      const dim = [...dimNames, 'Spalte'].map(seg).join('|');
      const val = [...keyVals, cols[vi]].map(seg).join('|');
      const numeric = numRe.test(cell.trim()) ? cell.trim().replace(',', '.') : null;
      values.push(
        `('${esc(t)}', '${esc(tr.caption || tr.table_id)}', ${rowNo}, '${esc(dim)}', '${esc(val)}', '${esc(cell)}', ${numeric === null ? 'NULL' : numeric}, '${esc(cfg.clause)}')`,
      );
    }
  }
}

const header = `-- GAP 1 — DWA-M-102-4: populate regulation_tables from the 8 printed lookup tables
--
-- Source: DWA-M_102-4.pdf, transcribed row-by-row from RENDERED pages by workflow
-- wf_58c8546a-9f0 with INDEPENDENT DOUBLE-TRANSCRIPTION: agent A transcribed each table
-- from its own renders, agent B re-rendered and re-transcribed blind, cell-level diff.
-- All 8 tables matched with ZERO cell diffs (incl. C.3 across the rotated landscape page,
-- both agents reading rotated rasters). Generated deterministically from that verified
-- JSON by scripts/m1024-tables-to-sql.mjs — no third transcription exists.
--
-- Blank printed cells are materialized with value_text = '' (silent omission would make
-- "no value printed" indistinguishable from "never captured"). value_numeric is parsed
-- only for plain decimal cells; ranges, formula references f(...), and text stay text.
-- Tabelle C.6 carries vertically merged cells whose span semantics are an ENCODING
-- decision (ruling G-D1); cells are anchored to the rows chosen by both transcribers
-- identically (divider above Straßenbegleitgrün; see wave-4 report).
--
-- per-row source_quote is left NULL deliberately: rule-10 philosophy — the provenance
-- lives HERE (run id + generator + rollback), not in a per-row label claiming itself.
--
-- BEHAVIOUR: nothing in the product reads regulation_tables for this standard yet
-- (0 rows before this migration), so applying it changes NO computed value and NO
-- enforcement. Wiring is ruling G-D1. Idempotent: guarded on 0 existing rows.
-- Rollback: scripts/rollback-20260727170000-m1024-tables.sql

DO $$
DECLARE
  v_std uuid;
  v_existing int;
  v_inserted int;
BEGIN
  SELECT id INTO v_std FROM standards WHERE code = 'DWA-M-102-4';
  IF v_std IS NULL THEN RAISE EXCEPTION 'standard DWA-M-102-4 not found'; END IF;

  SELECT count(*) INTO v_existing FROM regulation_tables WHERE standard_id = v_std;
  IF v_existing > 0 THEN
    RAISE NOTICE 'GAP1 M-102-4: % rows already present — skipping (idempotent)', v_existing;
    RETURN;
  END IF;

  INSERT INTO regulation_tables
    (standard_id, table_id, table_name, row_number, variant_dimension, variant_value,
     value_text, value_numeric, clause_reference, source_file, verification_status)
  SELECT v_std, t.table_id, t.table_name, t.row_number, t.variant_dimension, t.variant_value,
         t.value_text, t.value_numeric, t.clause_reference, 'DWA-M_102-4.pdf', 'imported_unverified'
  FROM (VALUES
`;

const footer = `
  ) AS t(table_id, table_name, row_number, variant_dimension, variant_value, value_text, value_numeric, clause_reference);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE 'GAP1 M-102-4: % regulation_tables rows inserted', v_inserted;
END $$;
`;

if (skippedTables.length) console.error('SKIPPED: ' + skippedTables.join(', '));
console.error(`rows generated: ${values.length}`);
// Write the file from node — a PowerShell `>` redirect adds a BOM and re-encodes via the
// console codepage, either of which can corrupt the SQL (umlauts) or choke the API (BOM).
const outPath = process.argv[3];
if (!outPath) throw new Error('usage: m1024-tables-to-sql.mjs <workflow-output> <out.sql>');
const { writeFileSync } = await import('node:fs');
writeFileSync(outPath, header + '    ' + values.join(',\n    ') + footer, 'utf8');
console.error(`wrote ${outPath}`);
