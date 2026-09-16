/**
 * TS fallback register configs + fallback register equations.
 *
 * The DB (`worksheet_fields.widget = 'register'` + `ui_config`) is the
 * source of truth once the guideline-to-tool migrations are applied. Until
 * then (deploy-before-seed) the two hand-built registers of the legacy
 * pages — A138 `surface_inventory` and VSME `pollutant_register` — are
 * described here in the SAME zod contract, so the generic engine renders
 * and computes them identically with an empty DB. A fallback is used ONLY
 * while a field's `widget` is NULL; any non-null widget is authoritative.
 */
import { parseFieldConfig, type RegisterUiConfig } from './field-config';
import { POLLUTANTS } from '@/lib/vsme/pollutants';

/** Register-level boolean flag (e.g. pollutant_register.not_applicable), read by `flag()`. */
export type RegisterFlag = { key: string; label?: string };

// Required set = byte-for-byte rowComplete() in surface-inventory.ts:45-52
// (label NOT required; tab9_value/area_m2/c_i/c_s required). Do not "improve" it.
const SURFACE_INVENTORY: RegisterUiConfig = {
  title: 'Flächenverzeichnis', subtitle: 'Tab. 9 — C_i für Gl. 2 und C_s für Gl. 10', add_label: '+ Zeile hinzufügen', placement: 'bottom',
  columns: [
    { key: 'label', type: 'text', label: 'Bezeichnung', placeholder: 'z.B. Hauptdach' },
    { key: 'tab9_value', type: 'lookup_key', label: 'Oberflächentyp', required: true, lookup: { table_code: 'TAB9', group_by: 'group_label' } },
    { key: 'area_m2', type: 'number', label: 'A', unit: 'm²', required: true, min: 0 },
    { key: 'c_i', type: 'lookup_value', label: 'C_i', required: true, lookup: { table_code: 'TAB9', key_column: 'tab9_value', value: 'cm' } },
    { key: 'c_s', type: 'lookup_value', label: 'C_s', required: true, lookup: { table_code: 'TAB9', key_column: 'tab9_value', value: 'cs' } },
    { key: 'coeff_override', type: 'boolean', label: 'abweichend' },
    { key: 'kind', type: 'derived', label: 'befestigt/unbefestigt', expr: "lookup('TAB9', tab9_value, 'kind')" },
    { key: 'a_c_i', type: 'derived', label: 'A·C_i', expr: 'area_m2 * c_i' },
  ],
  override: { flag_key: 'coeff_override', applies_to: ['c_i', 'c_s'], policy: 'anhaltswert' },
  legacy_map: { surface_type: { asphalt: 'schwarzdecke_asphalt', rasen: 'park_flach' } },
};

// Required set + min:0 = pollutantRowComplete() in pollutant-register.ts:88-94.
const POLLUTANT_REGISTER: RegisterUiConfig = {
  title: 'Schadstoffregister', subtitle: 'Emissionen je Schadstoff (VSME Abs. 32)', add_label: '+ Schadstoff',
  columns: [
    { key: 'label', type: 'text', label: 'Quelle / Anlage' },
    { key: 'pollutant', type: 'enum', label: 'Schadstoff (E-PRTR)', required: true, options: POLLUTANTS.map((p) => p.value) },
    { key: 'medium', type: 'enum', label: 'Medium', required: true, options: ['air', 'water', 'soil'] },
    { key: 'amount_t', type: 'number', label: 'Menge', unit: 't', required: true, min: 0 },
  ],
  flags: [{ key: 'not_applicable', label: 'Keine meldepflichtigen Schadstoffe' }],
  note: 'not_applicable = keine meldepflichtigen Schadstoffe (Summen = 0).',
};

export const REGISTER_CONFIGS_FALLBACK: Readonly<Record<string, RegisterUiConfig>> = { surface_inventory: SURFACE_INVENTORY, pollutant_register: POLLUTANT_REGISTER };

/** Symbol-keyed fallback for registers whose config carries no `flags` (legacy DB rows / callers without a config). */
const REGISTER_FLAG_KEYS: Readonly<Record<string, readonly string[]>> = { pollutant_register: ['not_applicable'] };

/** Register-level boolean flags read by `flag()`: `ui.flags` when present (DB-configured register), else the symbol-keyed fallback. */
export function registerFlagKeys(symbol: string, ui?: { flags?: readonly RegisterFlag[] }): readonly string[] {
  if (ui?.flags) return ui.flags.map((f) => f.key);
  return REGISTER_FLAG_KEYS[symbol] ?? [];
}

export type RegisterFieldLike = { symbol: string; dataType: string; widget?: string | null; uiConfig?: unknown };

/** DB config (widget === 'register') wins; the TS fallback applies only while `widget` is NULL and the field is json. */
export function resolveRegisterConfig(f: RegisterFieldLike): RegisterUiConfig | null {
  if (f.widget != null) {
    if (f.widget !== 'register') return null;
    try { return parseFieldConfig({ widget: 'register', uiConfig: f.uiConfig ?? null, lookup: null, visibleWhen: null }).ui as RegisterUiConfig; } catch { return null; }
  }
  if (f.dataType !== 'json') return null;
  return REGISTER_CONFIGS_FALLBACK[f.symbol] ?? null;
}

export type FallbackEquation = { id: string; equationNumber: string; formula: string; inputSymbols: string[]; outputSymbol: string; clauseReference: string | null; description: string | null };

const B04 = (medium: 'air' | 'water' | 'soil', out: string): FallbackEquation => ({
  id: `fallback-vsme-b04-${medium}`, equationNumber: `B04.100-${medium}`,
  formula: `${out} = if(flag(pollutant_register, 'not_applicable'), 0, sum_rows(pollutant_register, if(medium == '${medium}', amount_t, 0)))`,
  inputSymbols: ['pollutant_register'], outputSymbol: out, clauseReference: 'VSME para 32',
  description: `Summe ${medium} aus dem Schadstoffregister (Plan 2a fallback, bis Migration 20260916110000 angewandt ist)`,
});

/** Keyed by worksheet_templates.code. */
export const FALLBACK_REGISTER_EQUATIONS: Readonly<Record<string, readonly FallbackEquation[]>> = {
  'VSME-B04.100': [B04('air', 'AmountOfEmissionToAir'), B04('water', 'AmountOfEmissionToWater'), B04('soil', 'AmountOfEmissionToSoil')],
};

/** Appends a fallback equation only when no equation of the worksheet already outputs that symbol. */
export function withFallbackRegisterEquations<E extends { outputSymbol: string | null }>(worksheetCode: string, equations: E[]): Array<E | FallbackEquation> {
  const fb = FALLBACK_REGISTER_EQUATIONS[worksheetCode];
  if (!fb) return equations;
  const have = new Set(equations.map((e) => e.outputSymbol));
  return [...equations, ...fb.filter((e) => !have.has(e.outputSymbol))];
}
