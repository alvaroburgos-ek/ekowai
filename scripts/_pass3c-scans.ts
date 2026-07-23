// Import-time defect scans (encode-time, non-blocking). Companions to the
// faithfulness gate `computeWorkbookGateDenyKeys` — they surface candidate
// defects for the deep audit / fix campaign so every future encoding is
// triaged. Register classes: ES-1 → S1/S7, inverted-tag → S12, twin → S3/S4.
// Corpus baseline + method: vault 2026-07-15-audit-scan-inventory.md.
//
// Pure / DB-free — operate on the ParsedWorkbook (one standard) before write.
import type { ParsedWorkbook, FieldRow } from './_pass3c-types';
import { normalizeSymbol } from '../src/lib/eval/normalize-formula';

/** input_symbols is a comma-(or pipe-)separated string in the workbook. */
function splitSymbols(raw: string | null): string[] {
  return (raw ?? '').split(/[|,]/).map((s) => s.trim()).filter(Boolean);
}
/** first worksheet code from a comma-separated used_in_worksheet cell. */
function firstWorksheet(used: string): string {
  return used.split(',')[0]?.trim() ?? '';
}
/** b is a `_`-boundary extension of a, e.g. isPrefixTwin('A','A_einzugsflaeche'). */
function isPrefixTwin(a: string, b: string): boolean {
  return b.length > a.length && b.slice(0, a.length + 1) === a + '_';
}
/** ES-1 signature: an inequality operator appears before any assignment `=`
 *  (a check masquerading as a producer). Correctly ignores `check = x >= y`. */
function isInequalityProducer(formula: string): boolean {
  return /^[^=]*[<>≤≥]/.test(formula);
}

export type Es1Finding = { key: string; outputSymbol: string; harmful: boolean; formula: string };
export type InvertedTagFinding = { worksheet: string; decoy: string; tag: string; consumedTwin: string };
export type TwinFinding = { worksheet: string; base: string; twin: string };
export type WorkbookScanFindings = {
  es1: Es1Finding[];
  invertedTag: InvertedTagFinding[];
  twin: TwinFinding[];
};

/** ES-1 (S1/S7): equations with an output_symbol whose formula's primary
 *  relation is an inequality → producer-collision-blank risk. `harmful` when the
 *  output is a real number field or is multi-produced (the FLL-GAR-22:2b shape);
 *  otherwise it's likely a benign boolean-check output. */
export function computeEs1Candidates(wb: ParsedWorkbook): Es1Finding[] {
  const numberFields = new Set(
    wb.fields.filter((f) => f.data_type === 'number').map((f) => f.symbol),
  );
  const producerCount = new Map<string, number>();
  for (const e of wb.equations) {
    if (e.output_symbol) producerCount.set(e.output_symbol, (producerCount.get(e.output_symbol) ?? 0) + 1);
  }
  const out: Es1Finding[] = [];
  for (const e of wb.equations) {
    if (!e.output_symbol) continue;
    if (!isInequalityProducer(e.formula)) continue;
    const harmful = numberFields.has(e.output_symbol) || (producerCount.get(e.output_symbol) ?? 0) > 1;
    out.push({ key: `${firstWorksheet(e.used_in_worksheet)}:${e.equation_number}`, outputSymbol: e.output_symbol, harmful, formula: e.formula });
  }
  return out;
}

/** Inverted clause tag (S12): a field tagged to a `Gl.` formula that NO equation
 *  consumes or produces, WITH a consumed same-quantity prefix-twin on the same
 *  worksheet → wrong-field-entry risk (the FLL-GAR-27 A/C shape). Source-verify
 *  each before dedup — a `_ref`/`_min` companion may be an intended reference field. */
export function computeInvertedTagCandidates(wb: ParsedWorkbook): InvertedTagFinding[] {
  const consumed = new Set<string>();
  for (const e of wb.equations) for (const s of splitSymbols(e.input_symbols)) consumed.add(normalizeSymbol(s));
  const produced = new Set(wb.equations.map((e) => e.output_symbol).filter((s): s is string => !!s));
  const byWorksheet = new Map<string, FieldRow[]>();
  for (const f of wb.fields) {
    if (!byWorksheet.has(f.origin_worksheet)) byWorksheet.set(f.origin_worksheet, []);
    byWorksheet.get(f.origin_worksheet)!.push(f);
  }
  const out: InvertedTagFinding[] = [];
  for (const f of wb.fields) {
    if (!/gl/i.test(f.regulation_reference ?? '')) continue; // must claim a formula clause
    if (consumed.has(f.symbol) || produced.has(f.symbol)) continue; // wired → not a decoy
    const siblings = byWorksheet.get(f.origin_worksheet) ?? [];
    const twin = siblings.find(
      (t) => t.symbol !== f.symbol && consumed.has(t.symbol)
        && (isPrefixTwin(f.symbol, t.symbol) || isPrefixTwin(t.symbol, f.symbol)),
    );
    if (twin) out.push({ worksheet: f.origin_worksheet, decoy: f.symbol, tag: f.regulation_reference ?? '', consumedTwin: twin.symbol });
  }
  return out;
}

/** Twin fields #15b (S3/S4): symbol-prefix same-quantity fields on one worksheet.
 *  LOW precision (legit subscripted variants dominate) → review surface-area only,
 *  never rank on it; the actionable subset is `computeInvertedTagCandidates`. */
export function computeTwinCandidates(wb: ParsedWorkbook): TwinFinding[] {
  const byWorksheet = new Map<string, FieldRow[]>();
  for (const f of wb.fields) {
    if (!byWorksheet.has(f.origin_worksheet)) byWorksheet.set(f.origin_worksheet, []);
    byWorksheet.get(f.origin_worksheet)!.push(f);
  }
  const out: TwinFinding[] = [];
  for (const [ws, fs] of byWorksheet) {
    for (const a of fs) for (const b of fs) {
      if (a !== b && isPrefixTwin(a.symbol, b.symbol)) out.push({ worksheet: ws, base: a.symbol, twin: b.symbol });
    }
  }
  return out;
}

/** Run all three import-time scans over one parsed workbook. */
export function computeWorkbookScanFindings(wb: ParsedWorkbook): WorkbookScanFindings {
  return {
    es1: computeEs1Candidates(wb),
    invertedTag: computeInvertedTagCandidates(wb),
    twin: computeTwinCandidates(wb),
  };
}
