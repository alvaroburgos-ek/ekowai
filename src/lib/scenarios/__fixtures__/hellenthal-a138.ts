/**
 * TEST FIXTURE ONLY — anonymised A 138 chain shaped like case C4 (TEST-M820-C4-Hellenthal, ledger 2026-10-14).
 * KOSTRA-DWD-2020 cell 151093, exact DWD rN values (l/(s·ha)), columns T = 5 / 30 / 100 a.
 * Never import from app/UI code.
 */
import type { ScenarioBaseline, BaselineField, BaselineSheet, BaselineSection, StoredParameter, ScenarioOverrideInput } from '../baseline';
import type { ScenarioValue } from '../types';
import { fieldValueToParameter } from '../values';

export const KOSTRA_151093 = {
  D: [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 540, 720, 1080, 1440, 2880, 4320, 5760, 7200, 8640, 10080],
  T5: [340, 221.7, 171.1, 140.8, 107.2, 81.1, 66.1, 49.8, 40.7, 30.6, 24.9, 18.7, 14.0, 11.4, 8.5, 6.9, 4.2, 3.2, 2.6, 2.2, 1.9, 1.7],
  T30: [500, 328.3, 252.2, 208.3, 158.3, 119.6, 97.8, 73.7, 60.1, 45.1, 36.8, 27.5, 20.6, 16.8, 12.6, 10.3, 6.3, 4.7, 3.8, 3.3, 2.9, 2.6],
  T100: [630, 413.3, 317.8, 261.7, 198.9, 150.4, 123.1, 92.6, 75.6, 56.7, 46.3, 34.7, 26, 21.2, 15.8, 12.9, 7.9, 5.9, 4.8, 4.1, 3.6, 3.2],
} as const;

/** 1-D column as the iteration consumes it. */
export function rows(T: 5 | 30 | 100): Array<{ D_min: number; r_D_n: number }> {
  const col = T === 5 ? KOSTRA_151093.T5 : T === 30 ? KOSTRA_151093.T30 : KOSTRA_151093.T100;
  return KOSTRA_151093.D.map((d, i) => ({ D_min: d, r_D_n: col[i] }));
}

/** Native 2-D rainfall carrier (rainfall-tables.ts) as stored on A138-04 r_D_n_table. */
export function rainfallCarrier() {
  return {
    tables: [{
      id: 'kostra-151093', name: 'KOSTRA-DWD-2020 151093', source: 'KOSTRA-DWD-2020', gridCell: '151093',
      columns: [5, 30, 100],
      rows: KOSTRA_151093.D.map((d, i) => ({ D_min: d, r: { '5': KOSTRA_151093.T5[i], '30': KOSTRA_151093.T30[i], '100': KOSTRA_151093.T100[i] } })),
    }],
  };
}

/** Equation ids: the prod UUIDs where an aggregator / profile / suppression is keyed by id, synthetic otherwise. */
export const EQ = {
  GL6: 'a1380000-0000-4000-8000-000000001106',
  GL5: 'a1380000-0000-4000-8000-000000001105',
  GL7: '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac',
  GL4: 'a1380000-0000-4000-8000-000000001204',
  GL8: '69f31e6e-a755-4246-af10-ae46668b5c86',
  GL9: 'a1380000-0000-4000-8000-000000001309',
  GL16: '14999c2a-cdeb-42c1-98fd-fcdec65123da',
  GL15: '44fd56a8-b473-441a-be21-297d9f501226',
  GL10: '8e3c7e22-e3c7-449a-b267-928332c89306',
} as const;

export type FixtureField = {
  symbol: string; dataType: 'number' | 'enum' | 'json' | 'text' | 'boolean'; unit?: string;
  consumers?: string[]; visibleWhen?: string; enumValues?: string[];
};
export type FixtureSheet = {
  code: string; phase: number; order: number; fields: FixtureField[];
  equations: Array<{ id: string; number: string; formula: string; inputs: string[]; output: string }>;
  compliance: Array<{ code: string; condition: string; severity: 'block' | 'warn' }>;
};

export const FIXTURE_SHEETS: FixtureSheet[] = [
  { code: 'A138-03', phase: 2, order: 3, fields: [{ symbol: 'f_methode', dataType: 'number', consumers: ['A138-11'] }], equations: [], compliance: [] },
  { code: 'A138-04', phase: 2, order: 4, fields: [{ symbol: 'r_D_n_table', dataType: 'json', consumers: ['A138-12', 'A138-13', 'A138-17', 'A138-26'] }], equations: [], compliance: [] },
  { code: 'A138-05', phase: 2, order: 5, fields: [{ symbol: 'k_f', dataType: 'number', unit: 'm/s', consumers: ['A138-11'] }], equations: [], compliance: [] },
  { code: 'A138-07', phase: 2, order: 7, fields: [{ symbol: 'A_C', dataType: 'number', unit: 'm²', consumers: ['A138-12', 'A138-13', 'A138-17'] }], equations: [], compliance: [] },
  {
    code: 'A138-08', phase: 2, order: 8, equations: [], compliance: [],
    fields: [
      { symbol: 'n', dataType: 'number', consumers: ['A138-12', 'A138-13', 'A138-17'] },
      { symbol: 'f_Z', dataType: 'number', consumers: ['A138-10', 'A138-13', 'A138-17'] },
      { symbol: 'f_A', dataType: 'number', consumers: ['A138-13'] },
      { symbol: 'f_ort', dataType: 'number', consumers: ['A138-11'] },
    ],
  },
  {
    code: 'A138-10', phase: 3, order: 10, equations: [],
    fields: [{ symbol: 'A_VA', dataType: 'number', unit: 'm²', consumers: ['A138-13', 'A138-17', 'A138-26'], visibleWhen: "facility_type_selected != 'flaeche'" }],
    // REQ-15 sits on A138-10 in prod and reads q_S_AC (A138-13) + f_Z (A138-08) cross-sheet (spec gap G-5).
    compliance: [{ code: 'A138-REQ-15', condition: 'q_S_AC >= 2 AND (q_S_AC > 5 OR f_Z == 1.2)', severity: 'block' }],
  },
  {
    code: 'A138-11', phase: 3, order: 11, compliance: [],
    fields: [{ symbol: 'f_K', dataType: 'number' }, { symbol: 'k_i', dataType: 'number', unit: 'm/s', consumers: ['A138-12', 'A138-13', 'A138-17'] }],
    equations: [
      { id: EQ.GL6, number: '6', formula: 'f_K = min(f_ort * f_methode, 1)', inputs: ['f_ort', 'f_methode'], output: 'f_K' },
      { id: EQ.GL5, number: '5', formula: 'k_i = k_f * f_K', inputs: ['k_f', 'f_K'], output: 'k_i' },
    ],
  },
  {
    code: 'A138-12', phase: 3, order: 12, compliance: [],
    fields: [
      { symbol: 'a_s_m_determination_method', dataType: 'enum', enumValues: ['direct', 'geometry', 'soil_estimate', 'manual'] },
      { symbol: 'A_S_min', dataType: 'number', unit: 'm²', visibleWhen: "a_s_m_determination_method == 'direct'" },
      { symbol: 'A_S_max', dataType: 'number', unit: 'm²', visibleWhen: "a_s_m_determination_method == 'direct'" },
      { symbol: 'A_S_m', dataType: 'number', unit: 'm²', consumers: ['A138-13', 'A138-17'] },
      { symbol: 'A_S', dataType: 'number', unit: 'm²' },
      { symbol: 'Q_S', dataType: 'number', unit: 'l/s', consumers: ['A138-13'] },
    ],
    equations: [
      { id: EQ.GL7, number: '7', formula: 'A_S_m = (A_S_min + A_S_max) / 2', inputs: ['A_S_min', 'A_S_max'], output: 'A_S_m' },
      { id: EQ.GL4, number: '4', formula: 'Q_S = k_i * A_S * 10^3', inputs: ['k_i', 'A_S'], output: 'Q_S' },
    ],
  },
  {
    code: 'A138-13', phase: 3, order: 13, compliance: [],
    fields: [
      { symbol: 'V_VA', dataType: 'number', unit: 'm³', consumers: ['A138-26'] },
      { symbol: 'r_D_n', dataType: 'number', unit: 'l/(s·ha)' },
      { symbol: 'D_min', dataType: 'number', unit: 'min' },
      { symbol: 'q_S_AC', dataType: 'number', unit: 'l/(s·ha)' },
      { symbol: 't_E', dataType: 'number', unit: 'h' },
    ],
    equations: [
      { id: EQ.GL8, number: '8', formula: 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3', inputs: ['Q_zu', 'Q_S', 'Q_Dr', 'D', 'f_Z', 'f_A'], output: 'V_VA' },
      { id: EQ.GL9, number: '9', formula: 'q_S_AC = (k_i * A_S_m * 1000 + Q_Dr) / A_C * 10^4', inputs: ['k_i', 'A_S_m', 'Q_Dr', 'A_C'], output: 'q_S_AC' },
    ],
  },
  {
    code: 'A138-15', phase: 4, order: 15, equations: [], compliance: [],
    fields: [{ symbol: 'facility_type_selected', dataType: 'enum', consumers: ['A138-10', 'A138-12', 'A138-17'], enumValues: ['flaeche', 'mulde', 'rigole', 'MRE', 'MRS', 'schacht', 'becken'] }],
  },
  {
    code: 'A138-17', phase: 4, order: 17, compliance: [],
    fields: [
      { symbol: 'h_M', dataType: 'number', unit: 'm' },
      { symbol: 'k_i_Mulde', dataType: 'number', unit: 'm/s' },
      { symbol: 'V_M_erf', dataType: 'number', unit: 'm³' },
      { symbol: 'D_used_M', dataType: 'number', unit: 'min' },
      { symbol: 'r_D_n_used_M', dataType: 'number', unit: 'l/(s·ha)' },
      { symbol: 'V_M', dataType: 'number', unit: 'm³' },
    ],
    equations: [
      { id: EQ.GL16, number: '16', formula: 'A_S_m = (A_C * 10^-7 * r_D(n)) / (h_M / (D * 60 * f_Z) + k_i)', inputs: ['A_C', 'r_D_n', 'h_M', 'D', 'f_Z', 'k_i'], output: 'A_S_m' },
      { id: EQ.GL15, number: '15', formula: 'V_M = A_S_m * h_M', inputs: ['A_S_m', 'h_M'], output: 'V_M' },
    ],
  },
  {
    code: 'A138-26', phase: 5, order: 26, compliance: [],
    fields: [
      { symbol: 'A_C_s_flood', dataType: 'number', unit: 'm²' },
      { symbol: 'Q_S', dataType: 'number', unit: 'l/s' },
      { symbol: 'T_n_Ue', dataType: 'number', unit: 'a' },
      { symbol: 'r_D_30', dataType: 'number', unit: 'l/(s·ha)' },
      { symbol: 'V_Rueck', dataType: 'number', unit: 'm³' },
    ],
    equations: [{
      id: EQ.GL10, number: '10',
      formula: 'V_Rueck = ((r_D(T_n_Ue) * (SUM(A_E_b_a * C_S) + A_VA) / 10000) - (Q_S + Q_Dr)) * D * 60 / 1000 - V_VA >= 0',
      inputs: ['r_D_T_n_Ue', 'A_E_b_a', 'C_S', 'A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA'], output: 'V_Rueck',
    }],
  },
];

/** Record state of C4 on 2026-10-14 (entered values only; ledger steps 1–6 + A138-26). */
export const ENTERED: Record<string, ScenarioValue> = {
  'A138-03:f_methode': { type: 'number', value: 0.1 },
  'A138-04:r_D_n_table': { type: 'json', value: rainfallCarrier() },
  'A138-05:k_f': { type: 'number', value: 1e-6 },
  'A138-07:A_C': { type: 'number', value: 526.2105 },
  'A138-08:n': { type: 'number', value: 0.2 },
  'A138-08:f_Z': { type: 'number', value: 1.2 },
  'A138-08:f_A': { type: 'number', value: 1.0 },
  'A138-08:f_ort': { type: 'number', value: 0.3 },
  'A138-10:A_VA': { type: 'number', value: 50 },
  'A138-12:a_s_m_determination_method': { type: 'enum', value: 'direct' },
  'A138-12:A_S_min': { type: 'number', value: 40 },
  'A138-12:A_S_max': { type: 'number', value: 50 },
  'A138-12:A_S': { type: 'number', value: 50 },
  'A138-15:facility_type_selected': { type: 'enum', value: 'mulde' },
  'A138-17:h_M': { type: 'number', value: 0.3 },
  'A138-26:A_C_s_flood': { type: 'number', value: 602.161 },
  'A138-26:Q_S': { type: 'number', value: 0.0015 },
  'A138-26:T_n_Ue': { type: 'number', value: 100 },
};

/** Field-test cases expressed as INPUT overrides (spec gap G-3): k_i = k_f · min(f_Ort · f_Methode, 1). */
export const K5: Record<string, ScenarioValue> = {
  'A138-05:k_f': { type: 'number', value: 1e-5 },
  'A138-03:f_methode': { type: 'number', value: 1 },
  'A138-08:f_ort': { type: 'number', value: 1 },
  'A138-12:a_s_m_determination_method': { type: 'enum', value: 'geometry' },
};
export const K6: Record<string, ScenarioValue> = { ...K5, 'A138-05:k_f': { type: 'number', value: 1e-6 } };
/** K6 sized by Gl. 9 instead of Gl. 16: A_S,m = 2·A_C/(k_i·10⁷) = 105.2421 m² via the direct method. */
export const K6_GL9: Record<string, ScenarioValue> = {
  'A138-05:k_f': { type: 'number', value: 1e-6 },
  'A138-03:f_methode': { type: 'number', value: 1 },
  'A138-08:f_ort': { type: 'number', value: 1 },
  'A138-12:A_S_min': { type: 'number', value: 105.2421 },
  'A138-12:A_S_max': { type: 'number', value: 105.2421 },
};

export const fid = (code: string, symbol: string) => `f:${code}:${symbol}`;

export function overridesFor(entries: Record<string, ScenarioValue>): ScenarioOverrideInput[] {
  return Object.entries(entries).map(([k, value]) => {
    const [code, symbol] = k.split(':');
    return { fieldId: fid(code, symbol), value };
  });
}

export function buildFixtureBaseline(opts?: {
  entered?: Record<string, ScenarioValue>;
  storedDerived?: Record<string, ScenarioValue>;
}): ScenarioBaseline {
  const sheets: BaselineSheet[] = [];
  const fields: BaselineField[] = [];
  const sections: BaselineSection[] = [];
  for (const s of FIXTURE_SHEETS) {
    const templateId = `t:${s.code}`;
    sections.push({ id: `s:${s.code}`, templateId, parentSectionId: null, visibleWhen: null });
    for (const f of s.fields) {
      fields.push({
        id: fid(s.code, f.symbol), templateId, templateCode: s.code, symbol: f.symbol, labelDe: f.symbol, labelEn: null,
        unit: f.unit ?? null, dataType: f.dataType, isRequired: false, sectionId: `s:${s.code}`, visibleWhen: f.visibleWhen ?? null,
        widget: null, uiConfig: null, consumerWorksheets: f.consumers ?? null,
        enumValues: f.enumValues ? f.enumValues.map((v) => ({ value: v, label_de: v, label_en: v })) : null,
        validationRules: null,
      });
    }
    sheets.push({
      instanceId: `i:${s.code}`, templateId, code: s.code, titleDe: s.code, titleEn: null, phase: s.phase, orderIndex: s.order,
      equations: s.equations.map((e) => ({ id: e.id, equationNumber: e.number, formula: e.formula, inputSymbols: e.inputs, outputSymbol: e.output, outputUnit: null })),
      compliance: s.compliance.map((c) => ({ id: `c:${c.code}`, code: c.code, titleDe: c.code, condition: c.condition, severity: c.severity, description: null, requiresAttestation: false })),
    });
  }
  const stored: Record<string, StoredParameter> = {};
  const put = (entries: Record<string, ScenarioValue>, sourceType: string) => {
    for (const [k, v] of Object.entries(entries)) {
      const [code, symbol] = k.split(':');
      const id = fid(code, symbol);
      stored[id] = { ...fieldValueToParameter(id, v), sourceType };
    }
  };
  put(opts?.entered ?? ENTERED, 'entered');
  put(opts?.storedDerived ?? {}, 'derived');
  return { projectId: 'p:c4', standardId: 'std:a138', standardCode: 'DWA-A-138-1', sheets, fields, sections, stored };
}
