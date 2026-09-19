import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects, standards, worksheetTemplates, worksheetInstances, fields, equations, projectParameters } from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { BackLink } from '@/components/ui/back-link';
import { buildInputMap, type InputClass } from '@/lib/eval/input-map';

const CLASS_LABEL: Record<InputClass, { de: string; en: string; cls: string }> = {
  engine: { de: 'Engine berechnet', en: 'engine-computed', cls: 'bg-ink/10 text-ink' },
  twin: { de: 'vorbefüllt (Zwilling)', en: 'prefilled (twin)', cls: 'bg-accent/15 text-accent' },
  attestation: { de: 'Bestätigung', en: 'attestation', cls: 'bg-paper-2 text-subtext' },
  manual: { de: 'Eingabe', en: 'input', cls: 'bg-accent-2/15 text-accent-2' },
};

/**
 * "Eingabe-Steckbrief" — every field of the standard on this project,
 * classified by where its value comes from (engine / twin pre-fill /
 * attestation / genuine input) with filled status and the practical source.
 * Read-only; the numbers are the same the sidebar counters use.
 */
export default async function InputMapPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; standardCode: string }>;
}) {
  const { locale, id, standardCode } = await params;
  const de = locale !== 'en';
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();
  const [std] = await db.select().from(standards).where(eq(standards.code, standardCode)).limit(1);
  if (!std) notFound();

  const wsRows = await db
    .select({
      id: worksheetTemplates.id, code: worksheetTemplates.code, titleDe: worksheetTemplates.titleDe,
      phase: worksheetTemplates.phase, status: worksheetInstances.status,
    })
    .from(worksheetTemplates)
    .leftJoin(worksheetInstances, and(eq(worksheetInstances.worksheetTemplateId, worksheetTemplates.id), eq(worksheetInstances.projectId, id)))
    .where(eq(worksheetTemplates.standardId, std.id))
    .orderBy(worksheetTemplates.orderIndex);
  if (wsRows.length === 0) notFound();
  const tplIds = wsRows.map((w) => w.id);
  const codeByTpl = new Map(wsRows.map((w) => [w.id, w.code]));

  const [fieldRows, eqRows] = await Promise.all([
    db
      .select({
        id: fields.id, worksheetTemplateId: fields.worksheetTemplateId, symbol: fields.symbol, labelDe: fields.labelDe,
        unit: fields.unit, dataType: fields.dataType, isRequired: fields.isRequired, clauseReference: fields.clauseReference,
        orderIndex: fields.orderIndex,
      })
      .from(fields)
      .where(and(inArray(fields.worksheetTemplateId, tplIds), eq(fields.active, true)))
      .orderBy(fields.orderIndex),
    db
      .select({ worksheetTemplateId: equations.worksheetTemplateId, outputSymbol: equations.outputSymbol })
      .from(equations)
      .where(inArray(equations.worksheetTemplateId, tplIds)),
  ]);

  const fieldIds = fieldRows.map((f) => f.id);
  const filled = new Set<string>();
  if (fieldIds.length > 0) {
    const pRows = await db
      .select({ fieldId: projectParameters.fieldId })
      .from(projectParameters)
      .where(and(
        eq(projectParameters.projectId, id),
        inArray(projectParameters.fieldId, fieldIds),
        sql`(${projectParameters.valueNumber} IS NOT NULL OR ${projectParameters.valueText} IS NOT NULL OR ${projectParameters.valueEnum} IS NOT NULL OR ${projectParameters.valueDate} IS NOT NULL OR ${projectParameters.valueBoolean} IS NOT NULL OR ${projectParameters.valueJson} IS NOT NULL)`,
      ));
    for (const p of pRows) filled.add(p.fieldId);
  }

  const map = buildInputMap({
    standardCode,
    worksheets: wsRows.map((w) => ({ code: w.code, titleDe: w.titleDe, phase: w.phase, status: w.status ?? null })),
    fields: fieldRows.map((f) => ({
      id: f.id, worksheetCode: codeByTpl.get(f.worksheetTemplateId) ?? '?', symbol: f.symbol, labelDe: f.labelDe,
      unit: f.unit, dataType: f.dataType, isRequired: f.isRequired, clauseReference: f.clauseReference,
    })),
    equations: eqRows.map((e) => ({ worksheetCode: codeByTpl.get(e.worksheetTemplateId) ?? '?', outputSymbol: e.outputSymbol })),
    filledFieldIds: filled,
  });

  const t = map.totals;
  return (
    <div className="space-y-6">
      <BackLink href={`/${locale}/projects/${id}/standards/${standardCode}`} label={de ? 'Zurück zu den Arbeitsblättern' : 'Back to the worksheets'} />
      <header className="space-y-1">
        <div className="text-[10px] uppercase tracking-[0.25em] text-subtext">{standardCode}</div>
        <h1 className="text-2xl font-medium text-ink">{de ? 'Eingabe-Steckbrief' : 'Input map'}</h1>
        <p className="text-sm text-subtext max-w-3xl">
          {de
            ? 'Woher jeder Wert kommt: Engine-Berechnung, Vorbefüllung aus einem vorgelagerten Arbeitsblatt (gleiche Größe, anderes Symbol), Bestätigung oder eigene Eingabe. Offen = noch kein Wert im Projekt.'
            : 'Where every value comes from: engine, pre-fill from an upstream worksheet (same quantity, other symbol), attestation or your own input. Open = no value in the project yet.'}
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm" data-testid="input-map-totals">
        {([
          [de ? 'Felder' : 'fields', t.fields],
          [CLASS_LABEL.manual[de ? 'de' : 'en'], t.manual],
          [de ? 'davon offen' : 'of which open', t.openManual],
          [CLASS_LABEL.twin[de ? 'de' : 'en'], t.twin],
          [CLASS_LABEL.engine[de ? 'de' : 'en'], t.engine],
          [CLASS_LABEL.attestation[de ? 'de' : 'en'], t.attestation],
        ] as Array<[string, number]>).map(([label, n]) => (
          <div key={label} className="rounded border border-hairline bg-paper-2/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-subtext">{label}</div>
            <div className="tabular-nums text-lg text-ink">{n}</div>
          </div>
        ))}
      </section>

      {map.worksheets.map((w) => (
        <section key={w.code} className="space-y-2" data-testid={`input-map-${w.code}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-1">
            <h2 className="text-sm font-medium text-ink">
              <Link href={`/${locale}/projects/${id}/standards/${standardCode}/worksheets/${w.code}`} className="hover:text-accent">
                {w.code} · {w.titleDe}
              </Link>
              {w.status === 'deactivated' && <span className="ml-2 text-xs text-subtext">({de ? 'nicht zutreffend' : 'not applicable'})</span>}
            </h2>
            <div className="text-xs text-subtext tabular-nums">
              {de ? 'Eingabe' : 'input'} {w.counts.manual} · {de ? 'offen' : 'open'} {w.counts.openManual} · {de ? 'vorbefüllt' : 'twin'} {w.counts.twin} · Engine {w.counts.engine}
            </div>
          </div>
          {w.rows.length === 0 ? (
            <p className="text-xs text-subtext italic">{de ? 'Keine eigenen Felder.' : 'No own fields.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
                  <tr>
                    <th className="text-left font-normal pb-1 pr-2">Symbol</th>
                    <th className="text-left font-normal pb-1 pr-2">{de ? 'Bezeichnung' : 'Label'}</th>
                    <th className="text-left font-normal pb-1 pr-2">{de ? 'Herkunft' : 'Class'}</th>
                    <th className="text-left font-normal pb-1 pr-2">{de ? 'Quelle in der Praxis' : 'Practical source'}</th>
                    <th className="text-left font-normal pb-1 pr-2">§</th>
                    <th className="text-right font-normal pb-1">{de ? 'Status' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {w.rows.map((r) => (
                    <tr key={r.id} className="border-t border-hairline/60">
                      <td className="py-1 pr-2 font-mono whitespace-nowrap">{r.symbol}{r.isRequired ? <span className="text-accent-2">*</span> : null}</td>
                      <td className="py-1 pr-2">{r.labelDe}{r.unit ? <span className="text-subtext"> [{r.unit}]</span> : null}</td>
                      <td className="py-1 pr-2 whitespace-nowrap">
                        <span className={`inline-block rounded px-1.5 py-0.5 ${CLASS_LABEL[r.klass].cls}`}>{CLASS_LABEL[r.klass][de ? 'de' : 'en']}</span>
                        {r.twinSource ? <span className="ml-1 text-subtext">← {r.twinSource}</span> : null}
                      </td>
                      <td className="py-1 pr-2 text-subtext">{r.sourceHint ?? ''}</td>
                      <td className="py-1 pr-2 text-subtext whitespace-nowrap">{r.clauseReference ?? ''}</td>
                      <td className="py-1 text-right whitespace-nowrap">
                        {r.filled
                          ? <span className="text-success">{de ? 'vorhanden' : 'set'}</span>
                          : r.klass === 'engine'
                            ? <span className="text-subtext">{de ? 'Engine' : 'engine'}</span>
                            : <span className={r.isRequired ? 'text-error' : 'text-subtext'}>{de ? 'offen' : 'open'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
