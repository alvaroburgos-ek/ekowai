'use client';

import { useEffect } from 'react';
import { useCalculatorStore } from '@/lib/state/calculator-store';
import type { Worksheet, InputValues } from '@/lib/engine';
import type { InputSource } from '@/lib/engine/inputs-reader';
import type { projectDocuments } from '@/lib/db/schema';

type Doc = typeof projectDocuments.$inferSelect;
import { WorksheetSection } from './worksheet-section';
import { ResultsPanel } from './results-panel';
import { ComplianceBadge } from './compliance-badge';
import { OfflineBadge } from './offline-badge';
import { SaveStatus } from './save-status';
import { RationaleBox } from './rationale-box';
import { DecisionBanner } from './decision-banner';
import { StatusBanner } from './status-banner';
import { SubmitButton } from './submit-button';
import { ApprovalActions } from './approval-actions';
import { CrossReferencePanel, type CrossReference } from './cross-reference-panel';
import { ComplianceSummary } from './compliance-summary';

interface RecordedDecision {
  decisionPointId: string;
  choice: string;
  rationale: string | null;
}

interface DerivedSource {
  worksheetId: string;
  calcName: string;
}

export function CalculatorShell(props: {
  locale: 'de' | 'en';
  calcId: string;
  projectId: string;
  name: string;
  worksheet: Worksheet;
  initialInputs: InputValues;
  derivedValues: Record<string, number | string | boolean | null>;
  derivedSources: Record<string, DerivedSource>;
  inputSources: Record<string, InputSource | undefined>;
  docs: Doc[];
  lastSavedAt: string;
  initialDraft: string | null;
  initialFinal: string | null;
  initialDecisions: RecordedDecision[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'changes_requested';
  lastApprovalComment: string | null;
  canReview: boolean;
  crossRefs: CrossReference[];
}) {
  const init = useCalculatorStore((s) => s.init);

  useEffect(() => {
    // Derived values take precedence over saved inputs — engineer can't
    // freeze a stale upstream value.
    const merged: InputValues = { ...props.initialInputs, ...props.derivedValues };
    init({
      calcId: props.calcId,
      worksheet: props.worksheet,
      inputs: merged,
      lastSavedAt: props.lastSavedAt,
      derivedSources: props.derivedSources,
      inputSources: props.inputSources,
      docs: props.docs,
    });
  }, [
    init,
    props.calcId,
    props.worksheet,
    props.initialInputs,
    props.derivedValues,
    props.derivedSources,
    props.inputSources,
    props.docs,
    props.lastSavedAt,
  ]);

  const recordedIds = new Set(props.initialDecisions.map((d) => d.decisionPointId));

  const inputSection = props.worksheet.sections.find((s) => s.id === 'inputs');
  const resultSection = props.worksheet.sections.find((s) => s.id !== 'inputs');

  return (
    <article className="space-y-10">
      <header className="border-b border-hairline pb-8 space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="text-xs text-subtext flex items-baseline gap-2 flex-wrap">
            <span>
              {props.worksheet.regulation} · {props.worksheet.regulationVersion} ·{' '}
              Arbeitsblatt {props.worksheet.id}
              <span className="mx-2 text-hairline-strong">/</span>
              {props.worksheet.sourceCitation}
            </span>
            {props.worksheet.status === 'preview' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium text-warning bg-warning-soft/60">
                Vorschau
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ComplianceBadge locale={props.locale} />
            <OfflineBadge />
            <SaveStatus locale={props.locale} />
            <a
              href={`/api/calculations/${props.calcId}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext hover:text-accent underline"
            >
              Bericht herunterladen
            </a>
            {(props.status === 'draft' || props.status === 'changes_requested') && (
              <SubmitButton calcId={props.calcId} resubmit={props.status === 'changes_requested'} recordedDecisionIds={recordedIds} />
            )}
          </div>
        </div>
        {props.worksheet.status === 'preview' && (
          <div
            role="note"
            className="border-l-2 border-warning bg-warning-soft/40 px-4 py-3"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] mb-0.5 text-warning">
              Vorschau-Arbeitsblatt
            </p>
            <p className="text-sm text-ink-2 leading-relaxed">
              Die Schwellwerte und Berechnungsformeln dieses Arbeitsblatts sind noch
              nicht kanonisch gegen DWA-A-201 v3.2 validiert. Ergebnisse sind beratend;
              finale Bemessung nach Validierung der Worksheet-JSON aus dem EKOWAI-Agent (IB-7).
            </p>
          </div>
        )}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-ink tracking-tight mb-2">
            {props.name}
          </h1>
          <p className="text-lg text-ink-2 italic">
            {props.locale === 'de' ? props.worksheet.titleDe : props.worksheet.titleEn}
          </p>
        </div>
      </header>

      <StatusBanner status={props.status} lastApprovalComment={props.lastApprovalComment} />

      <DecisionBanner locale={props.locale} initialDecisions={props.initialDecisions} />

      <ComplianceSummary locale={props.locale} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {inputSection && (
          <div>
            <WorksheetSection locale={props.locale} section={inputSection} editable />
          </div>
        )}
        {resultSection && (
          <div>
            <ResultsPanel locale={props.locale} section={resultSection} />
          </div>
        )}
      </div>

      <RationaleBox
        initialDraft={props.initialDraft}
        initialFinal={props.initialFinal}
        locale={props.locale}
      />

      <CrossReferencePanel crossRefs={props.crossRefs} />

      {props.canReview && props.status === 'submitted' && (
        <ApprovalActions calcId={props.calcId} />
      )}
    </article>
  );
}
