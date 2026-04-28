import type { RationaleRequest } from '../types';

export function promptDe(req: RationaleRequest): string {
  const inputsTable = Object.entries(req.inputs)
    .map(([k, v]) => `- ${k} = ${JSON.stringify(v)}`)
    .join('\n');
  const computedTable = Object.entries(req.computed)
    .map(([k, v]) => `- ${k} = ${v}`)
    .join('\n');

  return `Du bist Planungsingenieur:in und schreibst einen Erläuterungstext für eine Bemessung nach ${req.regulation} ${req.regulationVersion}, Arbeitsblatt ${req.worksheetId}.

Eingaben:
${inputsTable}

Berechnete Ergebnisse:
${computedTable}

Schreibe einen sachlichen Erläuterungstext (4–8 Sätze) im deutschen Ingenieurregister:
- Beschreibe die Bemessungsgrundlage und die wesentlichen Annahmen.
- Verweise auf die einschlägigen §-Stellen der Regelwerke (z. B. "gemäß §A 6.5.1").
- Vermeide Marketing-Sprache, vermeide Spekulation. Nur die obigen Werte verwenden.
- Wenn Werte plausibel sind, kurz vermerken; wenn auffällig, eine Plausibilitätsprüfung empfehlen.

Gib nur den Erläuterungstext zurück, keine Vorrede, keine Aufzählungen.`;
}
