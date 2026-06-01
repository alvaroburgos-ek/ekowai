'use server';

import ExcelJS from 'exceljs';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requirePlatformEngineer } from '@/lib/auth/platform-engineer';
import { parseWorkbookSync } from '../../../scripts/_pass3c-parsers';
import { validateWorkbook } from '../../../scripts/_pass3c-validate';
import { applyImportWithDb, type ImportCounts } from '../../../scripts/_pass3c-db';
import { computeImportDiff, type ImportDiff } from '../../../scripts/_pass3c-diff';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export type PreviewResult =
  | { ok: true; diff: ImportDiff; filename: string }
  | { ok: false; error: string; validationErrors?: Array<{ sheet: string; row: number; message: string }> };

async function readFileToWorkbook(file: File): Promise<ExcelJS.Workbook> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Datei zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
  }
  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  return wb;
}

/** Parse + validate the uploaded .xlsx and compute a diff against the
 * current DB state. Does NOT write to the DB. Returns the diff so the UI
 * can show the engineer exactly what would change before they confirm. */
export async function previewWorkbookImport(formData: FormData): Promise<PreviewResult> {
  await requirePlatformEngineer();

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'Keine Datei übermittelt' };
  }
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return { ok: false, error: 'Bitte eine .xlsx-Datei hochladen' };
  }

  let wb: ExcelJS.Workbook;
  try {
    wb = await readFileToWorkbook(file);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Datei konnte nicht gelesen werden' };
  }

  let parsed;
  try {
    parsed = parseWorkbookSync(wb);
  } catch (e) {
    return { ok: false, error: `Parser-Fehler: ${e instanceof Error ? e.message : String(e)}` };
  }

  const errors = validateWorkbook(parsed);
  if (errors.length > 0) {
    return {
      ok: false,
      error: `${errors.length} Validierungsfehler im Workbook`,
      validationErrors: errors.slice(0, 100),
    };
  }

  const diff = await computeImportDiff(db, parsed);
  return { ok: true, diff, filename: file.name };
}

export type ExecuteResult =
  | { ok: true; counts: ImportCounts; standardCode: string }
  | { ok: false; error: string };

/** Parse + validate + actually write to DB. The user has already seen the
 * preview from previewWorkbookImport — this is the "confirm" step. */
export async function executeWorkbookImport(formData: FormData): Promise<ExecuteResult> {
  await requirePlatformEngineer();

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'Keine Datei übermittelt' };
  }

  let wb: ExcelJS.Workbook;
  try {
    wb = await readFileToWorkbook(file);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Datei konnte nicht gelesen werden' };
  }

  let parsed;
  try {
    parsed = parseWorkbookSync(wb);
  } catch (e) {
    return { ok: false, error: `Parser-Fehler: ${e instanceof Error ? e.message : String(e)}` };
  }

  const errors = validateWorkbook(parsed);
  if (errors.length > 0) {
    return { ok: false, error: `${errors.length} Validierungsfehler — bitte korrigieren und neu hochladen.` };
  }

  let counts: ImportCounts;
  try {
    counts = await applyImportWithDb(db, parsed);
  } catch (e) {
    return { ok: false, error: `Import-Fehler: ${e instanceof Error ? e.message : String(e)}` };
  }

  revalidatePath(`/[locale]/standards`, 'page');
  revalidatePath(`/[locale]/standards/${parsed.standard.standard_code}`, 'page');
  return { ok: true, counts, standardCode: parsed.standard.standard_code };
}
