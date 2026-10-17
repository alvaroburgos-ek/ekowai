import type { ReportParameter } from '@/lib/eval/evaluate-for-report';
import type { ScenarioValue } from './types';
import { fmtNum } from './format';

type ParamCols = {
  valueNumber: unknown; valueText: string | null; valueEnum: string | null;
  valueBoolean: boolean | null; valueDate: string | null; valueJson: unknown;
};

export function paramToFieldValue(dataType: string, p: ParamCols | null | undefined): ScenarioValue | null {
  if (!p) return null;
  switch (dataType) {
    case 'number': return p.valueNumber == null ? null : { type: 'number', value: Number(p.valueNumber) };
    case 'text': return p.valueText == null ? null : { type: 'text', value: p.valueText };
    case 'enum': return p.valueEnum == null ? null : { type: 'enum', value: p.valueEnum };
    case 'boolean': return p.valueBoolean == null ? null : { type: 'boolean', value: p.valueBoolean };
    case 'date': return p.valueDate == null ? null : { type: 'date', value: p.valueDate };
    case 'json': return p.valueJson == null ? null : { type: 'json', value: p.valueJson };
    default: return null;
  }
}

export function fieldValueToParameter(fieldId: string, v: ScenarioValue): ReportParameter {
  const p: ReportParameter = { fieldId, valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null };
  switch (v.type) {
    case 'number': p.valueNumber = v.value; break;
    case 'text': p.valueText = v.value; break;
    case 'enum': p.valueEnum = v.value; break;
    case 'boolean': p.valueBoolean = v.value; break;
    case 'date': p.valueDate = v.value; break;
    case 'json': p.valueJson = v.value ?? null; break;
  }
  return p;
}

export function scalarOfParameter(dataType: string, p: ReportParameter | undefined): number | string | boolean | null {
  if (!p) return null;
  switch (dataType) {
    case 'number': return p.valueNumber == null ? null : Number(p.valueNumber);
    case 'text': return p.valueText;
    case 'enum': return p.valueEnum;
    case 'boolean': return p.valueBoolean;
    case 'date': return p.valueDate;
    default: return null;
  }
}

export function numbersEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b)) || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
}

export function fieldValueEqual(a: ScenarioValue | null, b: ScenarioValue | null): boolean {
  if (a == null || b == null) return a == null && b == null;
  if (a.type !== b.type) return false;
  if (a.type === 'number' && b.type === 'number') {
    if (a.value == null || b.value == null) return a.value == null && b.value == null;
    return numbersEqual(a.value, b.value);
  }
  if (a.type === 'json') return JSON.stringify(a.value ?? null) === JSON.stringify(b.value ?? null);
  return a.value === b.value;
}

export function formatScenarioValue(v: ScenarioValue | null, locale: 'de' | 'en'): string {
  if (v == null || v.value == null) return '—';
  switch (v.type) {
    case 'number': return fmtNum(v.value, locale);
    case 'boolean': return v.value ? (locale === 'en' ? 'Yes' : 'Ja') : (locale === 'en' ? 'No' : 'Nein');
    case 'json': {
      const rows = (v.value as { rows?: unknown[] })?.rows;
      return Array.isArray(rows) ? (locale === 'en' ? `${rows.length} rows` : `${rows.length} Zeilen`) : 'JSON';
    }
    default: return String(v.value);
  }
}
