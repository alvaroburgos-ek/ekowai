import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { defineTool, unwrap } from '../define-tool';
import {
  listScenarios, createScenario, setScenarioOverrides, archiveScenario, getScenarioResults,
} from '@/lib/actions/scenarios';
import { compactRun } from '@/lib/scenarios/compact';

const overrideSchema = z.object({
  fieldId: z.string().uuid().describe('Eingabefeld aus get_worksheet (keine berechneten Felder)'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Fallwert in der Einheit des Feldes'),
  note: z.string().min(1).describe('Herkunft der Annahme, z. B. „Feldversuch ausstehend, Tabellenwert"'),
});

export function registerScenarioTools(server: McpServer) {
  defineTool(server, 'list_scenarios', {
    title: 'Fälle auflisten', readOnly: true,
    description: 'Listet die Was-wäre-wenn-Fälle eines Projekts (höchstens 6 aktive) mit ihren geänderten Eingabewerten, dem Realwert und einer Drift-Warnung, wenn sich der Realwert seit dem Anlegen geändert hat. Fälle sind Annahmen, nie Teil des Nachweises.',
    inputSchema: z.object({ projectId: z.string().uuid(), includeArchived: z.boolean().optional() }),
  }, async ({ projectId, includeArchived }) => unwrap(await listScenarios(projectId, { includeArchived })));

  defineTool(server, 'create_scenario', {
    title: 'Fall anlegen',
    description: 'Legt einen Was-wäre-wenn-Fall an (z. B. „K5 – Feldversuch k_f 1e-5") und setzt optional sofort Eingabewerte. Nur Eingabefelder sind erlaubt; berechnete Werte (k_i, A_S,m, V_VA …) werden über ihre Eingaben verändert. Höchstens 6 aktive Fälle je Projekt.',
    inputSchema: z.object({
      projectId: z.string().uuid(), name: z.string().min(1), reason: z.string().optional(),
      overrides: z.array(overrideSchema).optional(),
    }),
  }, async ({ projectId, name, reason, overrides }) => {
    const created = unwrap(await createScenario({ projectId, name, reason: reason ?? null }));
    if (!overrides || overrides.length === 0) return created;
    return unwrap(await setScenarioOverrides(created.scenario.id, overrides));
  });

  defineTool(server, 'set_scenario_overrides', {
    title: 'Fallwerte setzen',
    description: 'Setzt oder ändert Eingabewerte eines Falls (alle oder keiner). Abgelehnt werden berechnete Felder, unzulässige Auswahlwerte, Werte außerhalb des Feldbereichs und fehlende Notizen — die Fehlermeldung nennt den Grund.',
    inputSchema: z.object({ scenarioId: z.string().uuid(), overrides: z.array(overrideSchema).min(1) }),
  }, async ({ scenarioId, overrides }) => unwrap(await setScenarioOverrides(scenarioId, overrides)));

  defineTool(server, 'archive_scenario', {
    title: 'Fall archivieren',
    description: 'Archiviert einen Fall (kein Löschen). Danach ist sein Farbplatz für einen neuen Fall frei.',
    inputSchema: z.object({ scenarioId: z.string().uuid() }),
  }, async ({ scenarioId }) => unwrap(await archiveScenario(scenarioId)));

  defineTool(server, 'get_scenario_results', {
    title: 'Fallergebnisse berechnen', readOnly: true,
    description: 'Rechnet Real und die aktiven Fälle einer Norm im Speicher durch (nichts wird gespeichert, Freigaben und Nachweis bleiben unberührt) und liefert je Arbeitsblatt Ergebnis oder „nicht berechnet: Grund", Prüfergebnis je Anforderung und die maßgebende Dauerstufe je Iteration (Gl. 8, Gl. 10 bei T = 30/100 a, Gl. 16).',
    inputSchema: z.object({
      projectId: z.string().uuid(), standardCode: z.string().min(1),
      scenarioIds: z.array(z.string().uuid()).optional(), includePerDuration: z.boolean().optional(),
    }),
  }, async ({ projectId, standardCode, scenarioIds, includePerDuration }) => {
    const r = unwrap(await getScenarioResults(projectId, standardCode, scenarioIds));
    const per = includePerDuration === true;
    return {
      available: r.available, standardCode: r.standardCode, ignoredScenarioIds: r.ignoredScenarioIds,
      real: r.real ? compactRun(r.real, per) : null,
      cases: r.cases.map((c) => ({ id: c.scenario.id, name: c.scenario.name, slot: c.scenario.slot, ...compactRun(c.run, per) })),
    };
  });
}
