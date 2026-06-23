/**
 * Presentational renderer for a source-form layout (see ./types).
 *
 * Mirrors the source's section order, field order, grouping, repeating-row grids,
 * and sign-off block. It is a TEMPLATE / preview surface only — it performs no DB
 * writes and does not gate compliance. Fields the encoding does not capture
 * (`encodedSymbol === null`) render as an explicit GAP marker rather than a bound
 * input, so a missing field is never silently presented as captured.
 */
import type {
  FormTemplateSpec,
  SectionSpec,
  FormFieldSpec,
  RepeatingGridSpec,
} from './types';

function GapMarker() {
  return (
    <span
      data-testid="gap-marker"
      className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
      title="Field present in the source form but not captured in the DB encoding"
    >
      — not captured in encoding —
    </span>
  );
}

function FieldRow({ field }: { field: FormFieldSpec }) {
  const isGap = field.encodedSymbol === null;
  if (field.kind === 'checkbox-group') {
    return (
      <div className="py-1" data-testid="field">
        <span className="font-medium">{field.label}</span>
        {isGap && <GapMarker />}
        <div role="group" aria-label={field.label} className="mt-1 flex flex-wrap gap-3">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="inline-flex items-center gap-1 text-sm">
              <input type="checkbox" role="checkbox" disabled aria-label={opt} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        {field.remapNote && <p className="text-xs text-slate-500">remap: {field.remapNote}</p>}
      </div>
    );
  }
  if (field.kind === 'signature') {
    return (
      <div className="py-1" data-testid="field">
        <span className="font-medium">{field.label}</span>
        <span className="ml-2 inline-block w-48 border-b border-slate-400 align-bottom">&nbsp;</span>
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-2 py-1" data-testid="field">
      <span className="font-medium">{field.label}{field.unit ? ` (${field.unit})` : ''}:</span>
      {isGap ? (
        <GapMarker />
      ) : (
        <span className="min-w-[8rem] flex-1 border-b border-dotted border-slate-400">&nbsp;</span>
      )}
      {field.remapNote && <span className="text-xs text-slate-500">remap: {field.remapNote}</span>}
    </div>
  );
}

function Grid({ grid }: { grid: RepeatingGridSpec }) {
  const blankRows = 3;
  if (grid.orientation === 'columns-x-rows') {
    // fixed columns × N repeating rows (e.g. preservation log)
    return (
      <div data-testid="repeating-grid">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {grid.members.map((m) => (
                <th key={m.label} className="border px-2 py-1 text-left">
                  {m.label}{m.encodedSymbol === null ? ' *' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: blankRows }).map((_, r) => (
              <tr key={r}>
                {grid.members.map((m) => (
                  <td key={m.label} className="border px-2 py-3">&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {grid.note && <p className="text-xs text-slate-500">{grid.note}</p>}
      </div>
    );
  }
  // fixed parameter rows × N sample columns (e.g. on-site measurements)
  const cols = 3;
  return (
    <div data-testid="repeating-grid">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-1 text-left">Parameter</th>
            {Array.from({ length: cols }).map((_, c) => (
              <th key={c} className="border px-2 py-1 text-left">Sample {c + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.members.map((m) => (
            <tr key={m.label} data-testid="grid-row">
              <th scope="row" className="border px-2 py-1 text-left font-normal">
                {m.label}{m.unit ? ` (${m.unit})` : ''}{m.encodedSymbol === null ? ' *' : ''}
              </th>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="border px-2 py-1">&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {grid.note && <p className="text-xs text-slate-500">{grid.note}</p>}
    </div>
  );
}

function Section({ section }: { section: SectionSpec }) {
  return (
    <section className="mb-4" data-testid="section">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-700">
        {section.title}
      </h3>
      {section.fields?.map((f, i) => <FieldRow key={`${f.label}-${i}`} field={f} />)}
      {section.grid && <Grid grid={section.grid} />}
    </section>
  );
}

export function FormTemplate({ spec }: { spec: FormTemplateSpec }) {
  return (
    <article data-testid="form-template" data-standard={spec.standardCode} className="space-y-3">
      <header>
        <h2 className="text-lg font-bold">{spec.title}</h2>
        <p className="text-xs text-slate-500" data-testid="source-location">
          Source: {spec.sourceLocation}
        </p>
        {spec.note && <p className="text-xs text-slate-500">{spec.note}</p>}
        {spec.informative && (
          <p
            role="note"
            data-testid="informative-banner"
            className="mt-1 rounded bg-sky-100 px-2 py-1 text-xs text-sky-900"
          >
            Recommended / informative layout — this template does not gate compliance.
          </p>
        )}
      </header>

      {spec.sections.map((s, i) => <Section key={`${s.title}-${i}`} section={s} />)}

      {spec.signoff && spec.signoff.length > 0 && (
        <footer className="mt-4 border-t pt-2" data-testid="signoff">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Sign-off
          </h3>
          {spec.signoff.map((f, i) => <FieldRow key={`signoff-${i}`} field={f} />)}
        </footer>
      )}
    </article>
  );
}
