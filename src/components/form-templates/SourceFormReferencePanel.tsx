/**
 * Read-only source-form reference panel for a worksheet page.
 *
 * Shows the source document's fillable-form / report layout (a FORM_TEMPLATE)
 * ALONGSIDE the worksheet form, purely for traceability. It is NOT the primary
 * input surface and it does NOT gate compliance. Fields the DB encoding does not
 * capture render as explicit GAP markers (see FormTemplate) — never fabricated.
 *
 * Presentational only: no hooks, no DB, no store. Renders nothing for standards
 * that have no source FORM_TEMPLATE. Collapsed by default so it stays out of the
 * way of data entry.
 */
import { FormTemplate } from './FormTemplate';
import { formTemplateSpecs } from './specs';

const CHROME = {
  de: {
    summary: 'Quellformular-Referenz',
    description:
      'Schreibgeschützte Referenz des Formular-Layouts aus dem Quelldokument — nur zur Nachvollziehbarkeit. Dies ist keine Eingabefläche und ist nicht compliance-relevant; im Encoding nicht erfasste Felder sind als Lücken markiert.',
  },
  en: {
    summary: 'Source form reference',
    description:
      "Read-only reference of the source document's form layout — for traceability only. This is reference only, not an input surface, and does not gate compliance; fields not captured by the encoding are marked as gaps.",
  },
} as const;

export function SourceFormReferencePanel({
  standardCode,
  locale,
}: {
  standardCode: string;
  locale: 'de' | 'en';
}) {
  const specs = formTemplateSpecs[standardCode];
  if (!specs || specs.length === 0) return null;

  const chrome = CHROME[locale];

  return (
    <section
      className="border border-hairline rounded p-4"
      data-testid="source-form-reference-panel"
    >
      <details>
        <summary
          className="cursor-pointer text-xs uppercase tracking-[0.25em] text-subtext select-none"
          data-testid="source-form-reference-summary"
        >
          {chrome.summary}
        </summary>
        <p className="mt-2 text-[11px] text-subtext">{chrome.description}</p>
        <div className="mt-4 space-y-8">
          {specs.map((spec, i) => (
            <FormTemplate key={`${spec.standardCode}-${i}`} spec={spec} />
          ))}
        </div>
      </details>
    </section>
  );
}
