/**
 * Coerces the loosely-typed value a model supplies into the tagged union
 * `saveWorksheet` expects, using the field's declared dataType as the
 * authority. A model will happily send "12.5" for a numeric field; accepting
 * that string as text would write a value the calculation engine cannot use.
 */
export function toFieldValue(dataType: string, raw: unknown) {
  if (raw === null || raw === undefined || raw === '') {
    switch (dataType) {
      case 'number': return { type: 'number' as const, value: null };
      case 'boolean': return { type: 'boolean' as const, value: null };
      case 'date': return { type: 'date' as const, value: null };
      case 'enum': return { type: 'enum' as const, value: null };
      default: return { type: 'text' as const, value: null };
    }
  }

  switch (dataType) {
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
      if (!Number.isFinite(n)) {
        throw new Error(
          `Wert "${String(raw)}" ist keine Zahl, das Feld erwartet aber einen numerischen Wert.`,
        );
      }
      return { type: 'number' as const, value: n };
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return { type: 'boolean' as const, value: raw };
      const s = String(raw).toLowerCase();
      if (['true', 'ja', 'yes', '1'].includes(s)) return { type: 'boolean' as const, value: true };
      if (['false', 'nein', 'no', '0'].includes(s)) return { type: 'boolean' as const, value: false };
      throw new Error(`Wert "${String(raw)}" ist kein Ja/Nein-Wert.`);
    }
    case 'date':
      return { type: 'date' as const, value: String(raw) };
    case 'enum':
      return { type: 'enum' as const, value: String(raw) };
    case 'json': {
      // A JSON carrier (register rows, KOSTRA table) arrives through the tool schema as a
      // STRING. Postgres accepted the raw text as jsonb, but the same-batch derivation
      // (surface inventory → A_C, C_m, sums) saw a string and wrote nulls (readiness run
      // 2026-09-30, TEST-A138-Rigole). Parse it here so the save path sees the object.
      // FLL run 2026-10-05 (Naturteich D8): a bare array of rows is a register carrier the model forgot to wrap —
      // saved as-is the register reads "Keine vollständigen Zeilen". Wrap it into the canonical { rows: [...] }.
      const wrapRows = (v: unknown): unknown => (Array.isArray(v) ? { rows: v } : v);
      if (typeof raw === 'string') {
        try {
          return { type: 'json' as const, value: wrapRows(JSON.parse(raw)) };
        } catch {
          throw new Error('Wert ist kein gültiges JSON, das Feld erwartet aber einen JSON-Träger (z. B. {"rows":[…]}).');
        }
      }
      return { type: 'json' as const, value: wrapRows(raw) };
    }
    default:
      return { type: 'text' as const, value: String(raw) };
  }
}
