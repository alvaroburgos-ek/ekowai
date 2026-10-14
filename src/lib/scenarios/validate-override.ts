/**
 * Spec §2: only INPUT fields can be overridden; the value is validated with the field's own rules
 * (data type, enum values, register column keys, validation_rules). Pure.
 */
import { toFieldValue } from '@/lib/eval/field-value-coerce';
import { derivedOutputSymbols } from '@/lib/eval/derived-output-symbols';
import { resolveRegisterConfig } from '@/lib/eval/register-configs';
import type { ScenarioValue } from './types';

/** Symbols written by saveWorksheet's server materialisations (worksheet.ts producer blocks), not by an equation. */
export const SERVER_MATERIALISED_SYMBOLS: readonly string[] = [
  // basin Gl. 8 governing pair (materialize-basin-governing.ts)
  'r_D_n', 'D_min',
  // A_S,m single source + Tab. 6 loading check (asm / loading blocks)
  'A_S_m', 'a_s_m_needs_reconfirmation', 'ac_as_ratio', 'ac_as_ratio_limit', 'ac_as_ratio_check', 'ac_as_ratio_check_reason',
  // facility governing volumes + swale/trench/shaft sweeps (materialize-asm.ts)
  'V_M', 'V_R', 'V_MR', 'V_S', 'V_B', 'k_i_Mulde', 'k_i_BBZ', 'V_M_erf', 'D_used_M', 'r_D_n_used_M',
  'D_used_R', 'r_D_n_used_R', 'h_S', 'V_MUE', 'Q_MUE', 'r_MUE',
  // Phase-4 summary (A138-23)
  'facility_type_dimensioned', 'facility_specific_volume_m3', 'facility_footprint_m2', 'facility_meets_qsac',
  'facility_specific_dimensioning_complete', 'recommended_phase_4_gate', 'phase_4_recommendation_reasons',
];

export type OverrideFieldMeta = {
  id: string;
  symbol: string;
  labelDe: string;
  dataType: string;
  active: boolean;
  widget: string | null;
  uiConfig: unknown;
  enumValues: Array<{ value: string }> | null;
  validationRules: { min?: number; max?: number; maxLength?: number; extensible?: boolean } | null;
};

export function overrideRefusal(
  field: OverrideFieldMeta,
  templateEquations: ReadonlyArray<{ id: string; outputSymbol: string | null }>,
  storedSourceType: string | null,
): string | null {
  const name = `${field.labelDe} (${field.symbol})`;
  if (!field.active) return `${name} ist deaktiviert.`;
  if (field.widget === 'lookup_fill') return `${name} wird aus einer Tabelle des Regelwerks gesetzt — kein Eingabewert.`;
  if (derivedOutputSymbols(templateEquations).has(field.symbol)) {
    return `${name} wird berechnet (Gleichungsergebnis) — ein Fall ändert nur Eingabewerte.`;
  }
  if (SERVER_MATERIALISED_SYMBOLS.includes(field.symbol)) {
    return `${name} wird vom Werkzeug berechnet — ein Fall ändert nur Eingabewerte.`;
  }
  if (storedSourceType === 'derived' || storedSourceType === 'computed') {
    return `${name} ist ein abgeleiteter Wert — ein Fall ändert nur Eingabewerte.`;
  }
  return null;
}

type Result = { ok: true; value: ScenarioValue } | { ok: false; error: string };

export function coerceOverrideValue(field: OverrideFieldMeta, raw: unknown): Result {
  const name = `${field.labelDe} (${field.symbol})`;
  if (raw === null || raw === undefined || raw === '') return { ok: false, error: `${name}: ein Fall braucht einen Wert.` };
  let v: ScenarioValue;
  try {
    v = toFieldValue(field.dataType, raw) as ScenarioValue;
  } catch (e) {
    return { ok: false, error: `${name}: ${e instanceof Error ? e.message : String(e)}` };
  }
  const rules = field.validationRules ?? {};
  switch (v.type) {
    case 'number': {
      if (v.value == null || !Number.isFinite(v.value)) return { ok: false, error: `${name}: keine gültige Zahl.` };
      if (typeof rules.min === 'number' && v.value < rules.min) return { ok: false, error: `${name}: ${v.value} liegt unter dem zulässigen Minimum ${rules.min}.` };
      if (typeof rules.max === 'number' && v.value > rules.max) return { ok: false, error: `${name}: ${v.value} liegt über dem zulässigen Maximum ${rules.max}.` };
      break;
    }
    case 'enum': {
      const allowed = (field.enumValues ?? []).map((o) => o.value);
      if (allowed.length > 0 && !allowed.includes(String(v.value)) && rules.extensible !== true) {
        return { ok: false, error: `${name}: „${v.value}" ist keine zulässige Auswahl (${allowed.join(', ')}).` };
      }
      break;
    }
    case 'text': {
      if (typeof rules.maxLength === 'number' && String(v.value ?? '').length > rules.maxLength) {
        return { ok: false, error: `${name}: höchstens ${rules.maxLength} Zeichen.` };
      }
      break;
    }
    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v.value ?? ''))) return { ok: false, error: `${name}: Datum im Format JJJJ-MM-TT erwartet.` };
      break;
    }
    case 'json': {
      const cfg = resolveRegisterConfig({ symbol: field.symbol, dataType: field.dataType, widget: field.widget, uiConfig: field.uiConfig });
      if (cfg) {
        const rows = (v.value as { rows?: unknown } | null)?.rows;
        if (!Array.isArray(rows)) return { ok: false, error: `${name}: Register erwartet {"rows":[…]}.` };
        const keys = new Set(['id', ...cfg.columns.map((c) => c.key)]);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row == null || typeof row !== 'object' || Array.isArray(row)) return { ok: false, error: `${name}: Zeile ${i + 1} ist kein Objekt.` };
          const bad = Object.keys(row as object).filter((k) => !keys.has(k));
          if (bad.length > 0) {
            return { ok: false, error: `${name}: Zeile ${i + 1}: unbekannte Spalte(n) ${bad.join(', ')} — erlaubt: ${[...keys].join(', ')}.` };
          }
        }
      } else if (v.value == null || typeof v.value !== 'object') {
        return { ok: false, error: `${name}: JSON-Objekt erwartet.` };
      }
      break;
    }
    case 'boolean':
      break;
  }
  return { ok: true, value: v };
}
